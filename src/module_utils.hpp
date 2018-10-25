#pragma once
#include <napi.h>
#include <uv.h>

namespace utils {

/*
* This is an internal function used to return callback error messages instead of
* throwing errors.
* Usage:
*
* Napi::Function callback;
* return CallbackError("error message", callback);
*/

inline Napi::Value CallbackError(std::string const& message, Napi::CallbackInfo const& info, Napi::Function const& func)
{
    Napi::Object obj = Napi::Object::New(info.Env());
    obj.Set("message", message);
    return func.Call({obj});
}
} // namespace utils
