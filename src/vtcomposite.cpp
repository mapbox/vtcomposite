#include "vtcomposite.hpp"
#include "module_utils.hpp"

namespace  vtile {

NAN_METHOD(composite) {
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
        Nan::ThrowError("first arg 'tiles' must be an array of tile objects");
        return;//utils::CallbackError("first arg 'tiles' must be an array of tile objects", callback);
    }

    v8::Local<v8::Array> tiles = info[0].As<v8::Array>();
    unsigned num_tiles = tiles->Length();

    if (num_tiles <= 0)
    {
        Nan::ThrowError("'tiles' array must be of length greater than 0");
        return;// utils::CallbackError("'tiles' array must be of length greater than 0", callback);
    }

    //info.GetReturnValue().Set(
    //    Nan::New<v8::String>("hello world").ToLocalChecked());

}

} // ns vtile
