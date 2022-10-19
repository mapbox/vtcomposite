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
#include <vtzero/builder.hpp>
#include <vtzero/property_value.hpp>
#include <vtzero/vector_tile.hpp>
// geometry.hpp
#include <mapbox/geometry/box.hpp>
#include <mapbox/geometry/for_each_point.hpp>
#include <mapbox/geometry/point.hpp>
// stl
#include <algorithm>
#include <string>
#include <utility>
#include <vector>

namespace vtile {

static constexpr std::uint32_t MVT_VERSION_1 = 1U;
static const std::uint32_t LOCALIZE_FUNCTION_ARGS = 2;

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

struct LocalizeBatonType
{
    LocalizeBatonType(Napi::Buffer<char> const& buffer,
                      std::vector<std::string> languages_,
                      std::string language_property_,
                      std::string language_prefix_,
                      std::vector<std::string> worldviews_,
                      std::string worldview_property_,
                      std::string worldview_prefix_,
                      std::string class_property_,
                      std::string class_prefix_,
                      bool compress_)
        : data{buffer.Data(), buffer.Length()},
          buffer_ref{Napi::Persistent(buffer)},
          languages{std::move(languages_)},
          language_property{std::move(language_property_)},
          language_prefix{std::move(language_prefix_)},
          worldviews{std::move(worldviews_)},
          worldview_property{std::move(worldview_property_)},
          worldview_prefix{std::move(worldview_prefix_)},
          class_property{std::move(class_property_)},
          class_prefix{std::move(class_prefix_)},
          compress{compress_}
    {
    }

    ~LocalizeBatonType() noexcept
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
    LocalizeBatonType(LocalizeBatonType const&) = delete;
    LocalizeBatonType& operator=(LocalizeBatonType const&) = delete;
    // non-movable
    LocalizeBatonType(LocalizeBatonType&&) = delete;
    LocalizeBatonType& operator=(LocalizeBatonType&&) = delete;

    // members
    vtzero::data_view data;
    Napi::Reference<Napi::Buffer<char>> buffer_ref;
    std::vector<std::string> languages;
    std::string language_property;
    std::string language_prefix;
    std::vector<std::string> worldviews;
    std::string worldview_property;
    std::string worldview_prefix;
    std::string class_property;
    std::string class_prefix;
    bool return_localized_tile = (languages.isArray() || worldviews.isArray());
    bool compress;
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
                        if (std::find(names.begin(), names.end(), name) == names.end())
                        {
                            // should we keep this layer?
                            // if include_layers is empty, keep all layers
                            // if include_layers is not empty, keep layer if we can find its name in the vector
                            std::string sname(name);
                            if (include_layers.empty() || std::find(include_layers.begin(), include_layers.end(), sname) != include_layers.end())
                            {
                                names.push_back(name);
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

                // If the serialized buffer is an empty string, do not
                // gzip compress it. This will lead to a non-zero byte string
                // which can be perceived as a valid vector tile.
                //
                // Instead do nothing and return an empty, non-gzip-compressed buffer.
                // If the user wants to handle empty tiles separately from non-empty
                // tiles, they must check "buffer.length > 0" in the resulting callback.
                if (!temp.empty())
                {
                    tile_buffer = gzip::compress(temp.data(), temp.size());
                }
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
            if (num_layers == 0)
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

    // validate zxy maprequest object
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

struct LocalizeWorker : Napi::AsyncWorker
{
    using Base = Napi::AsyncWorker;

    LocalizeWorker(std::unique_ptr<LocalizeBatonType>&& baton_data, Napi::Function& cb)
        : Base(cb),
          baton_data_{std::move(baton_data)},
          output_buffer_{std::make_unique<std::string>()} {}

    // create a feature with new properties from a template feature
    static void create_new_feature(
      vtzero::feature const& template_feature,
      std::vector<std::pair<std::string, vtzero::property_value>> const& properties,
      vtzero::layer_builder& lbuilder)
    {
        vtzero::geometry_feature_builder fbuilder{lbuilder};
        fbuilder.copy_id(template_feature); // TODO: deduplicate this (vector tile spec says SHOULD be unique)
        fbuilder.set_geometry(template_feature.geometry());

        // add property to feature
        for (auto const& property : properties) {
          fbuilder.add_property(property.first, property.second);
        }

        fbuilder.commit();
    }

    void Execute() override
    {
        try
        {
            std::string incompatible_worldview_key;
            std::string compatible_worldview_key;
            std::string incompatible_class_key;
            std::string compatible_class_key;
            if (baton_data_->return_localized_tile) {
                incompatible_worldview_key = baton_data_->worldview_property;
                compatible_worldview_key = baton_data_->worldview_prefix + baton_data_->worldview_property;
                incompatible_class_key = baton_data_->class_property;
                compatible_class_key = baton_data_->class_prefix + baton_data_->class_property;
            } else {
                incompatible_worldview_key = baton_data_->worldview_prefix + baton_data_->worldview_property;
                compatible_worldview_key = baton_data_->worldview_property;
                incompatible_class_key = baton_data_->class_prefix + baton_data_->class_property;
                compatible_class_key = baton_data_->class_property;
            }

            vtzero::tile_builder tbuilder;
            std::string language_key;
            std::string language_key_prefixed;
            if (!baton_data_->language.empty())
            {
                // {language_property}_{language} -> retain
                language_key = baton_data_->language_property + "_" + baton_data_->language;
                // {language_prefix}{language_property}_{language} -> drop
                language_key_prefixed = baton_data_->language_prefix + language_key;
            }
            std::vector<char> buffer_cache;
            vtzero::data_view tile_view{};
            if (gzip::is_compressed(baton_data_->data.data(), baton_data_->data.size()))
            {
                gzip::Decompressor decompressor;
                decompressor.decompress(buffer_cache, baton_data_->data.data(), baton_data_->data.size());
                tile_view = protozero::data_view{buffer_cache.data(), buffer_cache.size()};
            }
            else
            {
                tile_view = baton_data_->data;
            }

            vtzero::vector_tile tile{tile_view};

            while (auto layer = tile.next_layer())
            {
                // TODO short circuit if hidden attributes not present? (call vtzero's add_existing_layer)
                vtzero::layer_builder lbuilder{tbuilder, layer.name(), layer.version(), layer.extent()};
                while (auto feature = layer.next_feature())
                {
                    bool skip_feature = false;
                    bool name_was_set = false;
                    vtzero::property_value name_value;

                    // collect final properties
                    std::vector<std::pair<std::string, vtzero::property_value>> properties;
                    while (auto property = feature.next_property())
                    {
                        // if already know we'll be skipping this feature, don't need to comb through its properties
                        if (skip_feature) continue;

                        std::string property_key = property.key().to_string();

                        // skip feature only if the value of incompatible worldview key is not 'all'
                        if (property_key == incompatible_worldview_key) {
                            if (property.value().type() == vtzero::property_value_type::string_value) {
                                if (property.value() == "all") {
                                    // do nothing – keep this feature but don't need to preserve this property
                                    continue;
                                } else {
                                    skip_feature = true;
                                    continue;
                                }
                            } else {
                                skip_feature = true;
                                continue;
                            }
                        }

                        // keep feature and retain its compatible worldview value
                        // if it is in the selected worldview or 'all' worldview;
                        // skip otherwise
                        else if (property_key == compatible_worldview_key) {
                            if (property.value().type() == vtzero::property_value_type::string_value) {
                                if (property.value() == "all") {
                                    properties.emplace_back(baton_data_->worldview_property, property.value());
                                    continue;
                                } else if (property.value().contains(baton_data_->worldviews[0])) {
                                    properties.emplace_back(baton_data_->worldview_property, baton_data_->worldviews[0]);
                                    continue;
                                } else {
                                    skip_feature = true;
                                    continue;
                                }
                            } else {
                                skip_feature = true;
                                continue;
                            }
                        }

                        // drop incompatible class property
                        else if (property_key == incompatible_class_key) {
                            // do nothing – keep this feature but don't need to retain this property
                            continue;
                        }

                        // collect class value
                        else if (property_key == compatible_class_key) {
                            properties.emplace_back(baton_data_->class_property, property.value());
                            continue;
                        }

                        // preserve original params.language_property value
                        if (property_key == baton_data_->language_property)
                        {
                            name_value = property.value();

                            // if no language was specified, we want the name value to be constant
                            if (baton_data_->language.empty())
                            {
                                properties.emplace_back(baton_data_->language_property, property.value());
                                name_was_set = true;
                            }
                            continue;
                        }
                        // set name to value from {prefix}{language_property}_{language}, if existing
                        if (!baton_data_->language.empty() && !name_was_set && language_key_prefixed == property_key)
                        {
                            properties.emplace_back(baton_data_->language_property, property.value());
                            name_was_set = true;
                            continue;
                        }
                        // remove any properties that starts with the given params.language_prefix value
                        if (property_key.find(baton_data_->language_prefix) == 0) // NOLINT(abseil-string-find-startswith)
                        {
                            continue;
                        }
                        // set name to {language_property}_{language}, if existing
                        // and keep these legacy properties on the feature
                        if (!baton_data_->language.empty() && !name_was_set && language_key == property_key)
                        {
                            properties.emplace_back(baton_data_->language_property, property.value());
                            name_was_set = true;
                        }

                        properties.emplace_back(property_key, property.value());

                    } // end of properties loop

                    // if skip feature, proceed to next feature
                    if (skip_feature) continue;

                    if (name_value.valid())
                    {
                        std::string preserved_key = baton_data_->language_property + "_local";
                        properties.emplace_back(preserved_key, name_value);

                        if (!name_was_set)
                        {
                            properties.emplace_back(baton_data_->language_property, name_value);
                        }
                    }

                    create_new_feature(feature, properties, lbuilder);

                } // end of features loop
            } // end of layers loop

            std::string& tile_buffer = *output_buffer_;
            if (baton_data_->compress)
            {
                std::string temp;
                tbuilder.serialize(temp);

                // If the serialized buffer is an empty string, do not
                // gzip compress it. This will lead to a non-zero byte string
                // which can be perceived as a valid vector tile.
                //
                // Instead do nothing and return an empty, non-gzip-compressed buffer.
                // If the user wants to handle empty tiles separately from non-empty
                // tiles, they must check "buffer.length > 0" in the resulting callback.
                if (!temp.empty())
                {
                    tile_buffer = gzip::compress(temp.data(), temp.size());
                }
            }
            else
            {
                tbuilder.serialize(tile_buffer);
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

    std::unique_ptr<LocalizeBatonType> const baton_data_;
    std::unique_ptr<std::string> output_buffer_;
};

Napi::Value localize(Napi::CallbackInfo const& info)
{
    std::size_t length = info.Length();
    if (length != LOCALIZE_FUNCTION_ARGS)
    {
        Napi::Error::New(info.Env(), "expected params and callback arguments").ThrowAsJavaScriptException();
        return info.Env().Null();
    }

    // validate callback function
    Napi::Value callback_val = info[1];
    if (!callback_val.IsFunction())
    {
        Napi::Error::New(info.Env(), "second argument must be a callback function").ThrowAsJavaScriptException();
        return info.Env().Null();
    }
    Napi::Function callback = callback_val.As<Napi::Function>();

    // mandatory params
    Napi::Buffer<char> buffer;

    // default param values
    std::vector<std::string> languages;  // default is undefined
    std::string language_property = "name";
    std::string language_prefix = "_mbx_";
    std::vector<std::string> worldviews;  // default is undefined
    std::string worldview_property = "worldview";
    std::string worldview_prefix = "_mbx_";
    std::string class_property = "class";
    std::string class_prefix = "_mbx_";
    bool compress = false;

    // validate params object
    Napi::Value params_val = info[0];
    if (!params_val.IsObject())
    {
        Napi::Error::New(info.Env(), "first argument must be an object").ThrowAsJavaScriptException();
        return info.Env().Null();
    }
    Napi::Object params = info[0].As<Napi::Object>();

    // params.buffer (required)
    if (!params.Has(Napi::String::New(info.Env(), "buffer")))
    {
        return utils::CallbackError("params.buffer is required", info);
    }
    Napi::Value buffer_val = params.Get(Napi::String::New(info.Env(), "buffer"));
    if (!buffer_val.IsObject() || buffer_val.IsNull() || buffer_val.IsUndefined())
    {
        return utils::CallbackError("params.buffer must be a Buffer", info);
    }
    Napi::Object buffer_obj = buffer_val.As<Napi::Object>();
    if (!buffer_obj.IsBuffer())
    {
        return utils::CallbackError("params.buffer is not a true Buffer", info);
    }
    buffer = buffer_obj.As<Napi::Buffer<char>>();

    // params.languages (optional)
    if (params.Has(Napi::String::New(info.Env(), "languages")))
    {
        Napi::Value language_val = params.Get(Napi::String::New(info.Env(), "languages"));
        if (!language_val.IsArray() && !language_val.IsNull() && !language_val.IsUndefined())
        {
            return utils::CallbackError("params.languages must be an array or null", info);
        }

        if (language_val.IsArray()) {
            Napi::Array language_array = language_val.As<Napi::Array>();
            std::uint32_t num_languages = language_array.Length();
            languages.reserve(num_languages);

            for (std::uint32_t lg = 0; lg < num_languages; ++lg)
            {
                Napi::Value language_item_val = language_array.Get(lg);
                if (!language_item_val.IsString())
                {
                    return utils::CallbackError("params.languages must be an array of strings", info);
                }
                std::string language_item = language_item_val.As<Napi::String>();
                languages.push_back(language_item);
            }
        }
    }

    // params.language_property (optional)
    if (params.Has(Napi::String::New(info.Env(), "language_property")))
    {
        Napi::Value language_property_val = params.Get(Napi::String::New(info.Env(), "language_property"));
        if (!language_property_val.IsString())
        {
            return utils::CallbackError("params.language_property must be a string", info);
        }
        language_property = language_property_val.As<Napi::String>();
    }

    // params.language_prefix (optional)
    if (params.Has(Napi::String::New(info.Env(), "language_prefix")))
    {
        Napi::Value language_prefix_val = params.Get(Napi::String::New(info.Env(), "language_prefix"));
        if (!language_prefix_val.IsString())
        {
            return utils::CallbackError("params.language_prefix must be a string", info);
        }
        language_prefix = language_prefix_val.As<Napi::String>();
    }

    // params.worldviews (optional)
    if (params.Has(Napi::String::New(info.Env(), "worldviews")))
    {
        Napi::Value worldview_val = params.Get(Napi::String::New(info.Env(), "worldviews"));
        if (!worldview_val.IsArray() && !worldview_val.IsNull() && !worldview_val.IsUndefined())
        {
            return utils::CallbackError("params.worldviews must be an array or null", info);
        }

        if (worldview_val.IsArray()) {
            Napi::Array worldview_array = worldview_val.As<Napi::Array>();
            std::uint32_t num_worldviews = worldview_array.Length();
            worldviews.reserve(num_worldviews);

            for (std::uint32_t wv = 0; wv < num_worldviews; ++wv)
            {
                Napi::Value worldview_item_val = worldview_array.Get(wv);
                if (!worldview_item_val.IsString())
                {
                    return utils::CallbackError("params.worldviews must be an array of strings", info);
                }
                std::string worldview_item = worldview_item_val.As<Napi::String>();
                worldviews.push_back(worldview_item);
            }
        }
    }

    // params.worldview_property (optional)
    if (params.Has(Napi::String::New(info.Env(), "worldview_property")))
    {
        Napi::Value worldview_property_val = params.Get(Napi::String::New(info.Env(), "worldview_property"));
        if (!worldview_property_val.IsString())
        {
            return utils::CallbackError("params.worldview_property must be a string", info);
        }
        worldview_property = worldview_property_val.As<Napi::String>();
    }

    // params.worldview_prefix (optional)
    if (params.Has(Napi::String::New(info.Env(), "worldview_prefix")))
    {
        Napi::Value worldview_prefix_val = params.Get(Napi::String::New(info.Env(), "worldview_prefix"));
        if (!worldview_prefix_val.IsString())
        {
            return utils::CallbackError("params.worldview_prefix must be a string", info);
        }
        worldview_prefix = worldview_prefix_val.As<Napi::String>();
    }

    // params.class_property (optional)
    if (params.Has(Napi::String::New(info.Env(), "class_property")))
    {
        Napi::Value class_property_val = params.Get(Napi::String::New(info.Env(), "class_property"));
        if (!class_property_val.IsString())
        {
            return utils::CallbackError("params.class_property must be a string", info);
        }
        class_property = class_property_val.As<Napi::String>();
    }

    // params.class_prefix (optional)
    if (params.Has(Napi::String::New(info.Env(), "class_prefix")))
    {
        Napi::Value class_prefix_val = params.Get(Napi::String::New(info.Env(), "class_prefix"));
        if (!class_prefix_val.IsString())
        {
            return utils::CallbackError("params.class_prefix must be a string", info);
        }
        class_prefix = class_prefix_val.As<Napi::String>();
    }

    // params.compress (optional)
    if (params.Has(Napi::String::New(info.Env(), "compress")))
    {
        Napi::Value comp_value = params.Get(Napi::String::New(info.Env(), "compress"));
        if (!comp_value.IsBoolean())
        {
            return utils::CallbackError("params.compress must be a boolean", info);
        }
        compress = comp_value.As<Napi::Boolean>().Value();
    }

    std::unique_ptr<LocalizeBatonType> baton_data = std::make_unique<LocalizeBatonType>(
        buffer,
        languages,
        language_property,
        language_prefix,
        worldviews,
        worldview_property,
        worldview_prefix,
        class_property,
        class_prefix,
        compress);

    auto* worker = new LocalizeWorker{std::move(baton_data), callback};
    worker->Queue();
    return info.Env().Undefined();
}
} // namespace vtile
