#pragma once
#include <napi.h>

namespace utils {

inline Napi::Value CallbackError(std::string const& message, Napi::CallbackInfo const& info)
{
    Napi::Object obj = Napi::Object::New(info.Env());
    obj.Set("message", message);
    auto func = info[info.Length() - 1].As<Napi::Function>();
    return func.Call({obj});
}
} // namespace utils
