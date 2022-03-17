#pragma once
#include <napi.h>
#include <algorithm>
#include <string>
#include <utility>
#include <vector>

namespace utils {

inline Napi::Value CallbackError(std::string const& message, Napi::CallbackInfo const& info)
{
    Napi::Object obj = Napi::Object::New(info.Env());
    obj.Set("message", message);
    auto func = info[info.Length() - 1].As<Napi::Function>();
    return func.Call({obj});
}

// splits a string by comma
inline std::vector<std::string> split(std::string const& input)
{
    std::vector<std::string> values;
    std::stringstream s_stream(input);
    while (s_stream.good())
    {
        std::string substr;
        std::getline(s_stream, substr, ',');
        values.push_back(substr);
    }
    return values;
}

// finds the intersection of two vectors of strings
// and assigns the intersection to a new vector passed by reference
// results are returned in alphabetically ascending order
// {"CN", "RU", "US"} + {"RU", "US"} => {"US", "RU"}
void inline intersection(
    std::vector<std::string> & v1,
    std::vector<std::string> & v2,
    std::vector<std::string> & result)
{
    std::sort(v1.begin(), v1.end());
    std::sort(v2.begin(), v2.end());
    std::set_intersection(v1.begin(), v1.end(),
                            v2.begin(), v2.end(),
                            std::back_inserter(result));
}
} // namespace utils