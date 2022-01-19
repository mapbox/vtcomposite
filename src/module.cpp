#include "vtcomposite.hpp"
#include <napi.h>

Napi::Object init(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "composite"), Napi::Function::New(env, vtile::composite));
    exports.Set(Napi::String::New(env, "internationalize"), Napi::Function::New(env, vtile::internationalize));
    return exports;
}

NODE_API_MODULE(module, init) // NOLINT
