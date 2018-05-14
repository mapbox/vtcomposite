#pragma once

#include <cmath>
#include <ostream>
#include <mapbox/geometry/point.hpp>
#include <mapbox/geometry/box.hpp>

namespace vtile {

inline mapbox::geometry::box<double> mercator_extent(std::uint32_t z, std::uint32_t x, std::uint32_t y)
{
    static constexpr double EARTH_RADIUS = 6378137.0;
    static constexpr double half_of_equator = M_PI * EARTH_RADIUS;
    const double tile_size = 2.0 * half_of_equator / (1ul << z);
    double minx = -half_of_equator + x * tile_size;
    double miny = half_of_equator - (y + 1.0) * tile_size;
    double maxx = -half_of_equator + (x + 1.0) * tile_size;
    double maxy = half_of_equator - y * tile_size;
    return mapbox::geometry::box<double>(mapbox::geometry::point<double>(minx, miny),
                                         mapbox::geometry::point<double>(maxx, maxy));
}

template <typename T>
inline bool same(T const& a, T const& b)
{
    return  (a.z == b.z) && (a.x == b.x) && (a.y == b.y);
}

template <typename T>
inline bool same_zxy(T const& vt, std::uint32_t z, std::uint32_t x, std::uint32_t y)
{
    return  (vt.z == z) && (vt.x == x) && (vt.y == y);
}

}

template <typename T>
std::ostream& operator<<(std::ostream & out, mapbox::geometry::box<T> const& b)
{
    out.setf(std::ios_base::fixed);
    out << '(' << b.min.x << ',' << b.min.y
        << ',' << b.max.x << ',' << b.max.y << ')';
    return out;
}
