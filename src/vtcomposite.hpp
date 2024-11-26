#pragma once

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wsign-conversion"
#include <napi.h>
#pragma GCC diagnostic pop

namespace vtile {

Napi::Value composite(const Napi::CallbackInfo& info);
Napi::Value localize(const Napi::CallbackInfo& info);

} // namespace vtile
