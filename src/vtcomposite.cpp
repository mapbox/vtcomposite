#include "vtcomposite.hpp"
#include "module_utils.hpp"
#include <mapbox/geometry/geometry.hpp>
#include <vtzero/builder.hpp>
#include <vtzero/vector_tile.hpp>

namespace vtile {

/// an intermediate representation of a tile buffer and its necessary components
struct TileObject
{
    TileObject(std::uint32_t z0,
               std::uint32_t x0,
               std::uint32_t y0,
               v8::Local<v8::Object> buffer)
        : z{z0},
          x{x0},
          y{y0},
          data{node::Buffer::Data(buffer), node::Buffer::Length(buffer)},
          buffer_ref{}
    {
        buffer_ref.Reset(buffer.As<v8::Object>());
    }

    // explicitly use the destructor to clean up
    // the persistent buffer ref by Reset()-ing
    ~TileObject()
    {
        buffer_ref.Reset();
    }

    // guarantee that objects are not being copied by deleting the
    // copy and move definitions

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
    Nan::Persistent<v8::Object> buffer_ref;
};

/// the baton of data to be passed from the v8 thread into the cpp threadpool
struct BatonType
{
    explicit BatonType(std::uint32_t num_tiles)
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
    std::vector<std::unique_ptr<TileObject>> tiles {};
    std::uint32_t z {};
    std::uint32_t x {};
    std::uint32_t y {};
};

struct CompositeWorker : Nan::AsyncWorker
{
    using Base = Nan::AsyncWorker;
    // ask carol about const&
    CompositeWorker(std::unique_ptr<BatonType> baton_data, Nan::Callback* cb)
        : Base{cb},
          baton_data_{std::move(baton_data)},
          output_buffer_{} {}

    // The Execute() function is getting called when the worker starts to run.
    // - You only have access to member variables stored in this worker.
    // - You do not have access to Javascript v8 objects here.
    void Execute() override
    {
        // The try/catch is critical here: if code was added that could throw an
        // unhandled error INSIDE the threadpool, it would be disasterous
        try
        {
            vtzero::tile_builder builder;
            std::unordered_map<std::string, std::unique_ptr<vtzero::layer_builder>> builders;
            std::clog << baton_data_->z << "z" << std::endl;
            std::clog << baton_data_->x << "x" << std::endl;
            std::clog << baton_data_->y << "y" << std::endl;

            for (auto const& tile_obj : baton_data_->tiles)
            {
                std::cerr << tile_obj->z << ":" << tile_obj->x << ":" << tile_obj->y << std::endl;
                vtzero::vector_tile tile{tile_obj->data};
                while (auto layer = tile.next_layer())
                {
                    std::string name{layer.name()};
                    auto result = builders.emplace(name, std::make_unique<vtzero::layer_builder>(builder, layer));
                    if (std::get<1>(result)) // check if layer (with the same name) exists
                    {
                        auto const& lb = std::get<0>(result)->second;
                        layer.for_each_feature([&lb](vtzero::feature const& feature) {
                            vtzero::geometry_feature_builder feature_builder{*lb};
                            if (feature.has_id())
                            {
                                feature_builder.set_id(feature.id());
                            }
                            feature_builder.set_geometry(feature.geometry());
                            feature.for_each_property([&feature_builder](vtzero::property const& p) {
                                feature_builder.add_property(p);
                                return true;
                            });
                            feature_builder.commit(); // temp work around for vtzero 1.0.1 regression
                            return true;
                        });
                    }
                }
            }
            builder.serialize(output_buffer_);
            std::cerr << "VT Size:" << output_buffer_.size() << std::endl;
        }
        catch (std::exception const& e)
        {
            SetErrorMessage(e.what());
        }
    }

    // The HandleOKCallback() is getting called when Execute() successfully
    // completed.
    // - In case Execute() invoked SetErrorMessage("") this function is not
    // getting called.
    // - You have access to Javascript v8 objects again
    // - You have to translate from C++ member variables to Javascript v8 objects
    // - Finally, you call the user's callback with your results
    void HandleOKCallback() override
    {
        Nan::HandleScope scope;
        const auto argc = 2u;
        v8::Local<v8::Value> argv[argc] = {
            // this is where the vector tile buffer will go the "output_buffer_"
            Nan::Null(), Nan::New<v8::String>(output_buffer_).ToLocalChecked()};

        // Static cast done here to avoid 'cppcoreguidelines-pro-bounds-array-to-pointer-decay' warning with clang-tidy
        callback->Call(argc, static_cast<v8::Local<v8::Value>*>(argv), async_resource);
    }

    std::unique_ptr<BatonType> const baton_data_;
    std::string output_buffer_;
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
        if (!z_val->IsNumber())
        {
            return utils::CallbackError("'z' value in 'tiles' array item is not a number", callback);
        }
        std::int64_t z = z_val->IntegerValue();
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
        if (!x_val->IsNumber())
        {
            return utils::CallbackError("'x' value in 'tiles' array item is not a number", callback);
        }
        std::int64_t x = x_val->IntegerValue();
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
        if (!y_val->IsNumber())
        {
            return utils::CallbackError("'y' value in 'tiles' array item is not a number", callback);
        }
        std::int64_t y = y_val->IntegerValue();
        if (y < 0)
        {
            return utils::CallbackError("'y' value must not be less than zero", callback);
        }

        std::unique_ptr<TileObject> tile{new TileObject{static_cast<std::uint32_t>(z),
                                                        static_cast<std::uint32_t>(x),
                                                        static_cast<std::uint32_t>(y),
                                                        buffer}};
        baton_data->tiles.push_back(std::move(tile));
    }

    //validate zxy maprequest object

    v8::Local<v8::Array> zxy_maprequest = info[1].As<v8::Array>();

    // z value of map request object
    if (!zxy_maprequest->Has(Nan::New("z").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'z' value", callback);
    }
    v8::Local<v8::Value> z_val_maprequest = zxy_maprequest->Get(Nan::New("z").ToLocalChecked());
    if (!z_val_maprequest->IsNumber())
    {
        return utils::CallbackError("'z' value in 'tiles' array item is not a number", callback);
    }
    std::int64_t z_maprequest = z_val_maprequest->IntegerValue();
    if (z_maprequest < 0)
    {
        return utils::CallbackError("'z' value must not be less than zero", callback);
    }
    baton_data->z = static_cast<std::uint32_t>(z_maprequest);

    // x value of map request object
    if (!zxy_maprequest->Has(Nan::New("x").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'x' value", callback);
    }
    v8::Local<v8::Value> x_val_maprequest = zxy_maprequest->Get(Nan::New("x").ToLocalChecked());
    if (!x_val_maprequest->IsNumber())
    {
        return utils::CallbackError("'x' value in 'tiles' array item is not a number", callback);
    }
    std::int64_t x_maprequest = x_val_maprequest->IntegerValue();
    if (x_maprequest < 0)
    {
        return utils::CallbackError("'x' value must not be less than zero", callback);
    }

    baton_data->x = static_cast<std::uint32_t>(x_maprequest);

    // y value of maprequest object
    if (!zxy_maprequest->Has(Nan::New("y").ToLocalChecked()))
    {
        return utils::CallbackError("item in 'tiles' array does not include a 'y' value", callback);
    }
    v8::Local<v8::Value> y_val_maprequest = zxy_maprequest->Get(Nan::New("y").ToLocalChecked());
    if (!y_val_maprequest->IsNumber())
    {
        return utils::CallbackError("'y' value in 'tiles' array item is not a number", callback);
    }
    std::int64_t y_maprequest = y_val_maprequest->IntegerValue();
    if (y_maprequest < 0)
    {
        return utils::CallbackError("'y' value must not be less than zero", callback);
    }

    baton_data->y = static_cast<std::uint32_t>(y_maprequest);

    // enter the threadpool, then done in the callback function call the threadpool
    auto* worker = new CompositeWorker{std::move(baton_data), new Nan::Callback{callback}};
    Nan::AsyncQueueWorker(worker);
}

} // namespace vtile
