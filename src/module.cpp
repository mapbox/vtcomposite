#include <nan.h>
// #include "your_code.hpp"
// artem imports his library here

namespace standalone {
NAN_METHOD(composite) {
    // "info" comes from the NAN_METHOD macro, which returns differently
    // according to the version of node
    info.GetReturnValue().Set(
        Nan::New<v8::String>("hello world").ToLocalChecked());
}
} // namespace standalone
// "target" is a magic var that nodejs passes into a module's scope.
// When you write things to target, they become available to call from
// Javascript world.
NAN_MODULE_INIT(init)
{
    Nan::SetMethod(target, "composite", standalone::composite);
}

NODE_MODULE(module, init) // NOLINT
