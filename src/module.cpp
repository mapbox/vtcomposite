#include "vtcomposite.hpp"
#include <nan.h>

NAN_MODULE_INIT(init)
{
    Nan::SetMethod(target, "composite", vtile::composite);
}

NODE_MODULE(module, init) // NOLINT
