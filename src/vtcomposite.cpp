// vtcomposite
#include "vtcomposite.hpp"
#include "feature_builder.hpp"
#include "module_utils.hpp"
#include "zxy_math.hpp"
// gzip-hpp
#include <gzip/compress.hpp>
#include <gzip/decompress.hpp>
#include <gzip/utils.hpp>
// vtzero
#include <utility>

#include <vtzero/builder.hpp>
#include <vtzero/property_value.hpp>
#include <vtzero/vector_tile.hpp>
// geometry.hpp
#include <mapbox/geometry/box.hpp>
#include <mapbox/geometry/for_each_point.hpp>
#include <mapbox/geometry/point.hpp>
// stl
#include <algorithm>

namespace vtile {

static constexpr std::uint32_t MVT_VERSION_1 = 1U;

struct TileObject
{
    TileObject(std::uint32_t z0,
               std::uint32_t x0,
               std::uint32_t y0,
               Napi::Buffer<char> const& buffer,
               std::vector<std::string> layers0)
        : z{z0},
          x{x0},
          y{y0},
          data{buffer.Data(), buffer.Length()},
          buffer_ref{Napi::Persistent(buffer)},
          layers{std::move(layers0)}
    {
    }

    ~TileObject() noexcept
    {
        try
        {
            buffer_ref.Reset();
        }
        catch (...)
        {
        }
    }

    // non-copyable
    TileObject(TileObject const&) = delete;
    TileObject& operator=(TileObject const&) = delete;
    // non-movable
    TileObject(TileObject&&) = delete;
    TileObject& operator=(TileObject&&) = delete;

    std::uint32_t z;
    std::uint32_t x;
    std::uint32_t y;
    vtzero::data_view data;
    Napi::Reference<Napi::Buffer<char>> buffer_ref;
    std::vector<std::string> layers;
};

struct BatonType
{
    explicit BatonType(std::size_t num_tiles)
    {
        tiles.reserve(num_tiles);
    }

    ~BatonType() = default;
    // non-copyable
    BatonType(BatonType const&) = delete;
    BatonType& operator=(BatonType const&) = delete;
    // non-movable
    BatonType(BatonType&&) = delete;
    BatonType& operator=(BatonType&&) = delete;

    // members
    std::vector<std::unique_ptr<TileObject>> tiles{};
    std::uint32_t z{};
    std::uint32_t x{};
    std::uint32_t y{};
    int buffer_size = 0;
    bool compress = false;
};

namespace {

template <typename FeatureBuilder>
struct build_feature_from_v1
{
    explicit build_feature_from_v1(FeatureBuilder& builder)
        : builder_(builder) {}

    bool operator()(vtzero::feature const& feature)
    {
        try
        {
            builder_.apply(feature);
        }
        catch (vtzero::geometry_exception const& ex)
        {
            std::cerr << "Skipping feature with malformed geometry (v1): " << ex.what() << std::endl;
        }
        return true;
    }
    FeatureBuilder& builder_;
};

template <typename FeatureBuilder>
struct build_feature_from_v2
{
    explicit build_feature_from_v2(FeatureBuilder& builder)
        : builder_(builder) {}

    bool operator()(vtzero::feature const& feature)
    {
        builder_.apply(feature);
        return true;
    }
    FeatureBuilder& builder_;
};

} // namespace

// convert vtzero::data_view into std::string
struct to_string_visitor {

    template <typename T>
    std::string operator()(T value) {
        return std::to_string(value);
    }

    std::string operator()(vtzero::data_view value) {
        return std::string(value);
    }
};

struct CompositeWorker : Napi::AsyncWorker
{
    using Base = Napi::AsyncWorker;

    CompositeWorker(std::unique_ptr<BatonType>&& baton_data, Napi::Function& cb)
        : Base(cb),
          baton_data_{std::move(baton_data)},
          output_buffer_{std::make_unique<std::string>()} {}

    void Execute() override
    {
        try
        {
            vtzero::tile_builder builder;
            std::vector<vtzero::data_view> names;

            int const buffer_size = baton_data_->buffer_size;
            std::uint32_t const target_z = baton_data_->z;
            std::uint32_t const target_x = baton_data_->x;
            std::uint32_t const target_y = baton_data_->y;

            std::vector<std::unique_ptr<std::vector<char>>> buffer_cache;

            for (auto const& tile_obj : baton_data_->tiles)
            {
                if (vtile::within_target(*tile_obj, target_z, target_x, target_y))
                {
                    vtzero::data_view tile_view{};
                    if (gzip::is_compressed(tile_obj->data.data(), tile_obj->data.size()))
                    {
                        buffer_cache.push_back(std::make_unique<std::vector<char>>());
                        gzip::Decompressor decompressor;
                        decompressor.decompress(*buffer_cache.back(), tile_obj->data.data(), tile_obj->data.size());
                        tile_view = protozero::data_view{buffer_cache.back()->data(), buffer_cache.back()->size()};
                    }
                    else
                    {
                        tile_view = tile_obj->data;
                    }

                    std::uint32_t zoom_factor = 1U << (target_z - tile_obj->z);
                    std::vector<std::string> include_layers = tile_obj->layers;
                    vtzero::vector_tile tile{tile_view};
                    while (auto layer = tile.next_layer())
                    {
                        vtzero::data_view const name = layer.name();
                        std::uint32_t const version = layer.version();
                        if (std::find(std::begin(names), std::end(names), name) == std::end(names))
                        {
                            names.push_back(name);

                            // should we keep this layer?
                            // if include_layers is empty, keep all layers
                            // if include_layers is not empty, keep layer if we can find its name in the vector
                            std::string sname(name);
                            if (include_layers.empty()
                                || std::find(std::begin(include_layers), std::end(include_layers), sname) != std::end(include_layers))
                            {
                                std::uint32_t extent = layer.extent();
                                if (zoom_factor == 1)
                                {
                                    builder.add_existing_layer(layer);
                                }
                                else
                                {
                                    using coordinate_type = std::int64_t;
                                    using feature_builder_type = vtile::overzoomed_feature_builder<coordinate_type>;
                                    vtzero::layer_builder layer_builder{builder, name, version, extent};
                                    vtzero::property_mapper mapper{layer, layer_builder};
                                    std::uint32_t dx = 0;
                                    std::uint32_t dy = 0;
                                    std::tie(dx, dy) = vtile::displacement(tile_obj->z, extent, target_z, target_x, target_y);
                                    mapbox::geometry::box<coordinate_type> bbox{{-buffer_size, -buffer_size},
                                                                                {static_cast<int>(extent) + buffer_size,
                                                                                static_cast<int>(extent) + buffer_size}};
                                    feature_builder_type f_builder{layer_builder, mapper, bbox, dx, dy, zoom_factor};
                                    if (version == MVT_VERSION_1)
                                    {
                                        layer.for_each_feature(build_feature_from_v1<feature_builder_type>(f_builder));
                                    }
                                    else
                                    {
                                        layer.for_each_feature(build_feature_from_v2<feature_builder_type>(f_builder));
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    std::ostringstream os;
                    os << "Invalid tile composite request: SOURCE("
                       << tile_obj->z << "," << tile_obj->x << "," << tile_obj->y << ")"
                       << " TARGET(" << target_z << "," << target_x << "," << target_y << ")";
                    SetError(os.str());
                    return;
                }
            }
            std::string& tile_buffer = *output_buffer_;
            if (baton_data_->compress)
            {
                std::string temp;
                builder.serialize(temp);
                tile_buffer = gzip::compress(temp.data(), temp.size());
            }
            else
            {
                builder.serialize(tile_buffer);
            }
        }
        // LCOV_EXCL_START
        catch (std::exception const& e)
        {
            SetError(e.what());
        }
        // LCOV_EXCL_STOP
    }
    std::vector<napi_value> GetResult(Napi::Env env) override
    {
        if (output_buffer_)
        {
            std::string& tile_buffer = *output_buffer_;
            auto buffer = Napi::Buffer<char>::New(
                env,
                tile_buffer.empty() ? nullptr : &tile_buffer[0],
                tile_buffer.size(),
                [](Napi::Env env_, char* /*unused*/, std::string* str_ptr) {
                    if (str_ptr != nullptr)
                    {
                        Napi::MemoryManagement::AdjustExternalMemory(env_, -static_cast<std::int64_t>(str_ptr->size()));
                    }
                    delete str_ptr;
                },
                output_buffer_.release());
            Napi::MemoryManagement::AdjustExternalMemory(env, static_cast<std::int64_t>(tile_buffer.size()));
            return {env.Null(), buffer};
        }
        return Base::GetResult(env); // returns an empty vector (default)
    }

    std::unique_ptr<BatonType> const baton_data_;
    std::unique_ptr<std::string> output_buffer_;
};

Napi::Value composite(Napi::CallbackInfo const& info)
{
    // validate callback function
    std::size_t length = info.Length();
    if (length == 0)
    {
        Napi::Error::New(info.Env(), "last argument must be a callback function").ThrowAsJavaScriptException();
        return info.Env().Null();
    }
    Napi::Value callback_val = info[length - 1];
    if (!callback_val.IsFunction())
    {
        Napi::Error::New(info.Env(), "last argument must be a callback function").ThrowAsJavaScriptException();
        return info.Env().Null();
    }

    Napi::Function callback = callback_val.As<Napi::Function>();

    // validate tiles
    if (!info[0].IsArray())
    {
        return utils::CallbackError("first arg 'tiles' must be an array of tile objects", info);
    }

    Napi::Array tiles = info[0].As<Napi::Array>();
    std::uint32_t num_tiles = tiles.Length();

    if (num_tiles <= 0)
    {
        return utils::CallbackError("'tiles' array must be of length greater than 0", info);
    }

    std::unique_ptr<BatonType> baton_data = std::make_unique<BatonType>(num_tiles);

    for (std::uint32_t t = 0; t < num_tiles; ++t)
    {
        Napi::Value tile_val = tiles.Get(t);
        if (!tile_val.IsObject())
        {
            return utils::CallbackError("items in 'tiles' array must be objects", info);
        }

        Napi::Object tile_obj = tile_val.As<Napi::Object>();
        // check buffer value
        if (!tile_obj.Has(Napi::String::New(info.Env(), "buffer")))
        {
            return utils::CallbackError("item in 'tiles' array does not include a buffer value", info);
        }
        Napi::Value buf_val = tile_obj.Get(Napi::String::New(info.Env(), "buffer"));
        if (buf_val.IsNull() || buf_val.IsUndefined())
        {
            return utils::CallbackError("buffer value in 'tiles' array item is null or undefined", info);
        }

        Napi::Object buffer_obj = buf_val.As<Napi::Object>();
        if (!buffer_obj.IsBuffer())
        {
            return utils::CallbackError("buffer value in 'tiles' array item is not a true buffer", info);
        }

        Napi::Buffer<char> buffer = buffer_obj.As<Napi::Buffer<char>>();
        // z value
        if (!tile_obj.Has(Napi::String::New(info.Env(), "z")))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'z' value", info);
        }
        Napi::Value z_val = tile_obj.Get(Napi::String::New(info.Env(), "z"));
        if (!z_val.IsNumber())
        {
            return utils::CallbackError("'z' value in 'tiles' array item is not an int32", info);
        }

        int z = z_val.As<Napi::Number>().Int32Value();
        if (z < 0)
        {
            return utils::CallbackError("'z' value must not be less than zero", info);
        }

        // x value
        if (!tile_obj.Has(Napi::String::New(info.Env(), "x")))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'x' value", info);
        }
        Napi::Value x_val = tile_obj.Get(Napi::String::New(info.Env(), "x"));
        if (!x_val.IsNumber())
        {
            return utils::CallbackError("'x' value in 'tiles' array item is not an int32", info);
        }

        int x = x_val.As<Napi::Number>().Int32Value();
        if (x < 0)
        {
            return utils::CallbackError("'x' value must not be less than zero", info);
        }

        // y value
        if (!tile_obj.Has(Napi::String::New(info.Env(), "y")))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'y' value", info);
        }
        Napi::Value y_val = tile_obj.Get(Napi::String::New(info.Env(), "y"));
        if (!y_val.IsNumber())
        {
            return utils::CallbackError("'y' value in 'tiles' array item is not an int32", info);
        }

        int y = y_val.As<Napi::Number>().Int32Value();
        if (y < 0)
        {
            return utils::CallbackError("'y' value must not be less than zero", info);
        }

        // layers array value
        // does the layers key exist?
        std::vector<std::string> layers;
        if (tile_obj.Has(Napi::String::New(info.Env(), "layers")))
        {
            Napi::Value layers_val = tile_obj.Get(Napi::String::New(info.Env(), "layers"));

            // is the layers property an array?
            if (!layers_val.IsArray())
            {
                return utils::CallbackError("'layers' value in the 'tiles' array must be an array", info);
            }

            Napi::Array layers_array = layers_val.As<Napi::Array>();
            std::uint32_t num_layers = layers_array.Length();
            // does the layers array have length > 0?
            if (num_layers <= 0)
            {
                return utils::CallbackError("'layers' array must be of length greater than 0", info);
            }
            layers.reserve(num_layers);

            // create std::vector of std::strings to pass to baton
            // validate each value is a string before emplacing it
            for (std::uint32_t l = 0; l < num_layers; ++l)
            {
                Napi::Value layer_val = layers_array.Get(l);
                // is the layers array filled with strings?
                if (!layer_val.IsString())
                {
                    return utils::CallbackError("items in 'layers' array must be strings", info);
                }

                // create string and emplace into layer vector
                std::string layer_name = layer_val.As<Napi::String>();
                layers.emplace(layers.end(), layer_name);
            }
        }

        baton_data->tiles.push_back(std::make_unique<TileObject>(z, x, y, buffer, layers));
    }

    //validate zxy maprequest object
    if (!info[1].IsObject())
    {
        return utils::CallbackError("'zxy_maprequest' must be an object", info);
    }
    Napi::Object zxy_maprequest = info[1].As<Napi::Object>();

    // z value of map request object
    if (!zxy_maprequest.Has(Napi::String::New(info.Env(), "z")))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'z' value", info);
    }
    Napi::Value z_val_maprequest = zxy_maprequest.Get(Napi::String::New(info.Env(), "z"));
    if (!z_val_maprequest.IsNumber())
    {
        return utils::CallbackError("'z' value in 'tiles' array item is not an int32", info);
    }

    int z_maprequest = z_val_maprequest.As<Napi::Number>().Int32Value();
    if (z_maprequest < 0)
    {
        return utils::CallbackError("'z' value must not be less than zero", info);
    }
    baton_data->z = static_cast<std::uint32_t>(z_maprequest);

    // x value of map request object
    if (!zxy_maprequest.Has(Napi::String::New(info.Env(), "x")))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'x' value", info);
    }
    Napi::Value x_val_maprequest = zxy_maprequest.Get(Napi::String::New(info.Env(), "x"));
    if (!x_val_maprequest.IsNumber())
    {
        return utils::CallbackError("'x' value in 'tiles' array item is not an int32", info);
    }

    int x_maprequest = x_val_maprequest.As<Napi::Number>().Int32Value();
    if (x_maprequest < 0)
    {
        return utils::CallbackError("'x' value must not be less than zero", info);
    }

    baton_data->x = static_cast<std::uint32_t>(x_maprequest);

    // y value of maprequest object
    if (!zxy_maprequest.Has(Napi::String::New(info.Env(), "y")))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'y' value", info);
    }
    Napi::Value y_val_maprequest = zxy_maprequest.Get(Napi::String::New(info.Env(), "y"));
    if (!y_val_maprequest.IsNumber())
    {
        return utils::CallbackError("'y' value in 'tiles' array item is not an int32", info);
    }

    int y_maprequest = y_val_maprequest.As<Napi::Number>().Int32Value();
    if (y_maprequest < 0)
    {
        return utils::CallbackError("'y' value must not be less than zero", info);
    }

    baton_data->y = static_cast<std::uint32_t>(y_maprequest);

    if (info.Length() > 3) // options
    {
        if (!info[2].IsObject())
        {
            return utils::CallbackError("'options' arg must be an object", info);
        }

        Napi::Object options = info[2].As<Napi::Object>();
        if (options.Has(Napi::String::New(info.Env(), "buffer_size")))
        {
            Napi::Value bs_value = options.Get(Napi::String::New(info.Env(), "buffer_size"));
            if (!bs_value.IsNumber())
            {
                return utils::CallbackError("'buffer_size' must be an int32", info);
            }

            int buffer_size = bs_value.As<Napi::Number>().Int32Value();
            if (buffer_size < 0)
            {
                return utils::CallbackError("'buffer_size' must be a positive int32", info);
            }
            baton_data->buffer_size = buffer_size;
        }
        if (options.Has(Napi::String::New(info.Env(), "compress")))
        {
            Napi::Value comp_value = options.Get(Napi::String::New(info.Env(), "compress"));
            if (!comp_value.IsBoolean())
            {
                return utils::CallbackError("'compress' must be a boolean", info);
            }

            baton_data->compress = comp_value.As<Napi::Boolean>().Value();
        }
    }
    auto* worker = new CompositeWorker{std::move(baton_data), callback};
    worker->Queue();
    return info.Env().Undefined();
}
} // namespace vtile
