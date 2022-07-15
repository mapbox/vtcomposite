#pragma once
#include <napi.h>

namespace vtile {

Napi::Value composite(const Napi::CallbackInfo& info);
Napi::Value localize(const Napi::CallbackInfo& info);

} // namespace vtile
