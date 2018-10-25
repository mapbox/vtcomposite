#pragma once
#include <napi.h>
#include <uv.h>

namespace vtile {

Napi::Value composite(const Napi::CallbackInfo& info);

} // namespace vtile
