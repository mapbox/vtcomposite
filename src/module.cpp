#include <nan.h>
#include "vtcomposite.hpp"

NAN_MODULE_INIT(init)
{
    Nan::SetMethod(target, "composite", vtile::composite);
}

NODE_MODULE(module, init) // NOLINT
