#include "vtcomposite.hpp"
#include <napi.h>
#include <uv.h>

Napi::Object init(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "composite"), Napi::Function::New(env, vtile::composite));
    return exports;
}

NODE_API_MODULE(module, init) // NOLINT
