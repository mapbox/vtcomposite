// vtcomposite
#include "vtcomposite.hpp"
#include "module_utils.hpp"
#include "zxy_math.hpp"
#include "feature_builder.hpp"
// gzip-hpp
#include <gzip/compress.hpp>
#include <gzip/decompress.hpp>
#include <gzip/utils.hpp>
// vtzero
#include <vtzero/builder.hpp>
#include <vtzero/vector_tile.hpp>
// geometry.hpp
#include <mapbox/geometry/for_each_point.hpp>
#include <mapbox/geometry/point.hpp>
#include <mapbox/geometry/box.hpp>
// stl
#include <algorithm>

namespace vtile {

static constexpr unsigned MVT_VERSION_1 = 1u;

struct TileObject
{
    TileObject(int z0,
               int x0,
               int y0,
               v8::Local<v8::Object>& buffer)
        : z{z0},
          x{x0},
          y{y0},
          data{node::Buffer::Data(buffer), node::Buffer::Length(buffer)},
          buffer_ref{}
    {
        buffer_ref.Reset(buffer.As<v8::Object>());
    }

    ~TileObject()
    {
        buffer_ref.Reset();
    }

    // non-copyable
    TileObject(TileObject const&) = delete;
    TileObject& operator=(TileObject const&) = delete;

    // non-movable
    TileObject(TileObject&&) = delete;
    TileObject& operator=(TileObject&&) = delete;

    int z;
    int x;
    int y;
    vtzero::data_view data;
    Nan::Persistent<v8::Object> buffer_ref;
};

struct BatonType
{
    explicit BatonType(std::size_t num_tiles)
    {
        tiles.reserve(num_tiles);
    }

    // non-copyable
    BatonType(BatonType const&) = delete;
    BatonType& operator=(BatonType const&) = delete;

    // non-movable
    BatonType(BatonType&&) = delete;
    BatonType& operator=(BatonType&&) = delete;

    // members
    std::vector<std::unique_ptr<TileObject>> tiles{};
    int z{};
    int x{};
    int y{};
    int buffer_size = 0;
    bool compress = false;
};

namespace {

template <typename FeatureBuilder>
struct build_feature_from_v1
{
    build_feature_from_v1(FeatureBuilder& builder)
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
    build_feature_from_v2(FeatureBuilder& builder)
        : builder_(builder) {}

    bool operator()(vtzero::feature const& feature)
    {
        builder_.apply(feature);
        return true;
    }
    FeatureBuilder& builder_;
};

} // namespace

struct CompositeWorker : Nan::AsyncWorker
{
    using Base = Nan::AsyncWorker;

    CompositeWorker(std::unique_ptr<BatonType>&& baton_data, Nan::Callback* cb)
        : Base(cb, "skel:standalone-async-worker"),
          baton_data_{std::move(baton_data)},
          output_buffer_{std::make_unique<std::string>()} {}

    void Execute() override
    {
        try
        {
            vtzero::tile_builder builder;
            std::vector<vtzero::data_view> names;

            int const buffer_size = baton_data_->buffer_size;
            int const target_z = baton_data_->z;
            int const target_x = baton_data_->x;
            int const target_y = baton_data_->y;

            std::vector<std::string> buffer_cache;
            gzip::Decompressor decompressor;
            gzip::Compressor compressor;

            for (auto const& tile_obj : baton_data_->tiles)
            {
                if (vtile::within_target(*tile_obj, target_z, target_x, target_y))
                {
                    vtzero::data_view tile_view{};
                    if (gzip::is_compressed(tile_obj->data.data(), tile_obj->data.size()))
                    {
                        buffer_cache.emplace_back();
                        std::string& buf = buffer_cache.back();
                        decompressor.decompress(buf, tile_obj->data.data(), tile_obj->data.size());
                        tile_view = vtzero::data_view{buf};
                    }
                    else
                    {
                        tile_view = tile_obj->data;
                    }

                    int zoom_factor = 1 << (target_z - tile_obj->z);
                    vtzero::vector_tile tile{tile_view};
                    while (auto layer = tile.next_layer())
                    {
                        vtzero::data_view const name = layer.name();
                        unsigned const version = layer.version();
                        if (std::find(std::begin(names), std::end(names), name) == std::end(names))
                        {
                            names.push_back(name);
                            unsigned extent = layer.extent();
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
                                int dx, dy;
                                std::tie(dx, dy) = vtile::displacement(tile_obj->z, static_cast<int>(extent), target_z, target_x, target_y);
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
                else
                {
                    std::ostringstream os;
                    os << "Invalid tile composite request: SOURCE("
                       << tile_obj->z << "," << tile_obj->x << "," << tile_obj->y << ")"
                       << " TARGET(" << target_z << "," << target_x << "," << target_y << ")";
                    throw std::invalid_argument(os.str());
                }
            }
            std::string& tile_buffer = *output_buffer_.get();
            if (baton_data_->compress)
            {
                std::string temp;
                builder.serialize(temp);
                compressor.compress(tile_buffer, temp.data(), temp.size());
            }
            else
            {
                builder.serialize(tile_buffer);
            }
        }
        // LCOV_EXCL_START
        catch (std::exception const& e)
        {
            SetErrorMessage(e.what());
        }
        // LCOV_EXCL_STOP
    }

    void HandleOKCallback() override
    {
        std::string& tile_buffer = *output_buffer_.get();
        Nan::HandleScope scope;
        const auto argc = 2u;
        v8::Local<v8::Value> argv[argc] = {
            Nan::Null(),
            Nan::NewBuffer(&tile_buffer[0],
                           static_cast<unsigned int>(tile_buffer.size()),
                           [](char*, void* hint) {
                               delete reinterpret_cast<std::string*>(hint);
                           },
                           output_buffer_.release())
                .ToLocalChecked()};

        // Static cast done here to avoid 'cppcoreguidelines-pro-bounds-array-to-pointer-decay' warning with clang-tidy
        callback->Call(argc, static_cast<v8::Local<v8::Value>*>(argv), async_resource);
    }

    std::unique_ptr<BatonType> const baton_data_;
    std::unique_ptr<std::string> output_buffer_;
};

NAN_METHOD(composite)
{
    // validate callback function
    v8::Local<v8::Value> callback_val = info[info.Length() - 1];
    if (!callback_val->IsFunction())
    {
        Nan::ThrowError("last argument must be a callback function");
        return;
    }

    v8::Local<v8::Function> callback = callback_val.As<v8::Function>();

    // validate tiles
    if (!info[0]->IsArray())
    {
        return utils::CallbackError("first arg 'tiles' must be an array of tile objects", callback);
    }

    v8::Local<v8::Array> tiles = info[0].As<v8::Array>();
    unsigned num_tiles = tiles->Length();

    if (num_tiles <= 0)
    {
        return utils::CallbackError("'tiles' array must be of length greater than 0", callback);
    }

    std::unique_ptr<BatonType> baton_data = std::make_unique<BatonType>(num_tiles);

    for (unsigned t = 0; t < num_tiles; ++t)
    {
        v8::Local<v8::Value> tile_val = tiles->Get(t);
        if (!tile_val->IsObject())
        {
            return utils::CallbackError("items in 'tiles' array must be objects", callback);
        }
        v8::Local<v8::Object> tile_obj = tile_val->ToObject();

        // check buffer value
        if (!tile_obj->Has(Nan::New("buffer").ToLocalChecked()))
        {
            return utils::CallbackError("item in 'tiles' array does not include a buffer value", callback);
        }
        v8::Local<v8::Value> buf_val = tile_obj->Get(Nan::New("buffer").ToLocalChecked());
        if (buf_val->IsNull() || buf_val->IsUndefined())
        {
            return utils::CallbackError("buffer value in 'tiles' array item is null or undefined", callback);
        }
        v8::Local<v8::Object> buffer = buf_val->ToObject();
        if (!node::Buffer::HasInstance(buffer))
        {
            return utils::CallbackError("buffer value in 'tiles' array item is not a true buffer", callback);
        }

        // z value
        if (!tile_obj->Has(Nan::New("z").ToLocalChecked()))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'z' value", callback);
        }
        v8::Local<v8::Value> z_val = tile_obj->Get(Nan::New("z").ToLocalChecked());
        if (!z_val->IsInt32())
        {
            return utils::CallbackError("'z' value in 'tiles' array item is not an int32", callback);
        }
        int z = z_val->Int32Value();
        if (z < 0)
        {
            return utils::CallbackError("'z' value must not be less than zero", callback);
        }

        // x value
        if (!tile_obj->Has(Nan::New("x").ToLocalChecked()))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'x' value", callback);
        }
        v8::Local<v8::Value> x_val = tile_obj->Get(Nan::New("x").ToLocalChecked());
        if (!x_val->IsInt32())
        {
            return utils::CallbackError("'x' value in 'tiles' array item is not an int32", callback);
        }
        int x = x_val->Int32Value();
        if (x < 0)
        {
            return utils::CallbackError("'x' value must not be less than zero", callback);
        }

        // y value
        if (!tile_obj->Has(Nan::New("y").ToLocalChecked()))
        {
            return utils::CallbackError("item in 'tiles' array does not include a 'y' value", callback);
        }
        v8::Local<v8::Value> y_val = tile_obj->Get(Nan::New("y").ToLocalChecked());
        if (!y_val->IsInt32())
        {
            return utils::CallbackError("'y' value in 'tiles' array item is not an int32", callback);
        }
        int y = y_val->Int32Value();
        if (y < 0)
        {
            return utils::CallbackError("'y' value must not be less than zero", callback);
        }
        baton_data->tiles.push_back(std::make_unique<TileObject>(z, x, y, buffer));
    }

    //validate zxy maprequest object
    if (!info[1]->IsObject())
    {
        return utils::CallbackError("'zxy_maprequest' must be an object", callback);
    }
    v8::Local<v8::Object> zxy_maprequest = v8::Local<v8::Object>::Cast(info[1]);

    // z value of map request object
    if (!zxy_maprequest->Has(Nan::New("z").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'z' value", callback);
    }
    v8::Local<v8::Value> z_val_maprequest = zxy_maprequest->Get(Nan::New("z").ToLocalChecked());
    if (!z_val_maprequest->IsInt32())
    {
        return utils::CallbackError("'z' value in 'tiles' array item is not an int32", callback);
    }
    int z_maprequest = z_val_maprequest->Int32Value();
    if (z_maprequest < 0)
    {
        return utils::CallbackError("'z' value must not be less than zero", callback);
    }
    baton_data->z = z_maprequest;

    // x value of map request object
    if (!zxy_maprequest->Has(Nan::New("x").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'x' value", callback);
    }
    v8::Local<v8::Value> x_val_maprequest = zxy_maprequest->Get(Nan::New("x").ToLocalChecked());
    if (!x_val_maprequest->IsInt32())
    {
        return utils::CallbackError("'x' value in 'tiles' array item is not an int32", callback);
    }
    int x_maprequest = x_val_maprequest->Int32Value();
    if (x_maprequest < 0)
    {
        return utils::CallbackError("'x' value must not be less than zero", callback);
    }

    baton_data->x = x_maprequest;

    // y value of maprequest object
    if (!zxy_maprequest->Has(Nan::New("y").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'y' value", callback);
    }
    v8::Local<v8::Value> y_val_maprequest = zxy_maprequest->Get(Nan::New("y").ToLocalChecked());
    if (!y_val_maprequest->IsInt32())
    {
        return utils::CallbackError("'y' value in 'tiles' array item is not an int32", callback);
    }
    int y_maprequest = y_val_maprequest->Int32Value();
    if (y_maprequest < 0)
    {
        return utils::CallbackError("'y' value must not be less than zero", callback);
    }

    baton_data->y = y_maprequest;

    if (info.Length() > 3) // options
    {
        if (!info[2]->IsObject())
        {
            return utils::CallbackError("'options' arg must be an object", callback);
        }
        v8::Local<v8::Object> options = info[2]->ToObject();
        if (options->Has(Nan::New("buffer_size").ToLocalChecked()))
        {
            v8::Local<v8::Value> bs_value = options->Get(Nan::New("buffer_size").ToLocalChecked());
            if (!bs_value->IsInt32())
            {
                return utils::CallbackError("'buffer_size' must be an int32", callback);
            }

            int buffer_size = bs_value->Int32Value();
            if (buffer_size < 0)
            {
                return utils::CallbackError("'buffer_size' must be a positive int32", callback);
            }
            baton_data->buffer_size = buffer_size;
        }
        if (options->Has(Nan::New("compress").ToLocalChecked()))
        {
            v8::Local<v8::Value> comp_value = options->Get(Nan::New("compress").ToLocalChecked());
            if (!comp_value->IsBoolean())
            {
                return utils::CallbackError("'compress' must be a boolean", callback);
            }
            baton_data->compress = comp_value->BooleanValue();
        }
    }
    // enter the threadpool, then done in the callback function call the threadpool
    auto* worker = new CompositeWorker{std::move(baton_data), new Nan::Callback{callback}};
    Nan::AsyncQueueWorker(worker);
}

} // namespace vtile
