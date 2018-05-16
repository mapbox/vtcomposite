#pragma once

// geometry.hpp
#include <mapbox/geometry/geometry.hpp>
#include <mapbox/geometry/for_each_point.hpp>
// boost
//#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
//#include <boost/geometry/algorithms/for_each.hpp>

namespace vtile {
namespace detail {

template <typename Point>
struct zoom_coordinates
{
    using coordinate_type = typename Point::coordinate_type;
    explicit zoom_coordinates(coordinate_type factor)
        : factor_(factor) {}

    inline void operator()(Point& p) const
    {
        p.x *= factor_;
        p.y *= factor_;
    }
    coordinate_type factor_;
};
} // namespace detail

} // namespace vtile
