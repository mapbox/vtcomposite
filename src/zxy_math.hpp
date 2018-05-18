#pragma once
// geometry
#include <mapbox/geometry/box.hpp>
#include <mapbox/geometry/point.hpp>
// stl
#include <cmath>
#include <tuple>
#include <ostream>

namespace vtile {

inline mapbox::geometry::box<double> mercator_extent(unsigned z, unsigned x, unsigned y)
{
    static constexpr double EARTH_RADIUS = 6378137.0;
    static constexpr double half_of_equator = M_PI * EARTH_RADIUS;
    const double tile_size = 2.0 * half_of_equator / static_cast<double>(1ul << z);
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
    return (a.z == b.z) && (a.x == b.x) && (a.y == b.y);
}

template <typename T>
inline bool same_zxy(T const& vt, unsigned z, unsigned x, unsigned y)
{
    return (vt.z == z) && (vt.x == x) && (vt.y == y);
}

inline std::tuple<unsigned, unsigned, unsigned> zoom_out(unsigned z, unsigned x, unsigned y)
{
    return std::make_tuple(z - 1, x >> 1, y >> 1);
}

template <typename T>
inline bool within_target(T const& vt, unsigned z, unsigned x, unsigned y)
{
    if (vt.z > z) return false;
    unsigned dz = z - vt.z;
    return ((x >> dz) == vt.x) && ((y >> dz) == vt.y);
}

inline std::tuple<int, int> displacement(unsigned source_z, unsigned tile_size, unsigned z, unsigned x, unsigned y)
{
    unsigned half_tile = tile_size >> 1;
    int dx = 0;
    int dy = 0;
    unsigned delta_z = z - source_z;
    for (unsigned zi = delta_z; zi > 0; --zi)
    {
        half_tile <<= 1;
        if (x & 1) dx += half_tile;
        if (y & 1) dy += half_tile;
        x >>= 1;
        y >>= 1;
    }
    return std::make_tuple(dx, dy);
}

} // namespace vtile

template <typename T>
std::ostream& operator<<(std::ostream& out, mapbox::geometry::box<T> const& b)
{
    out.setf(std::ios_base::fixed);
    out << '(' << b.min.x << ',' << b.min.y
        << ',' << b.max.x << ',' << b.max.y << ')';
    return out;
}
