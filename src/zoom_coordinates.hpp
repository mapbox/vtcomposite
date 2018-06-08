#pragma once

namespace vtile {
namespace detail {

template <typename Point>
struct zoom_coordinates
{
    using coordinate_type = typename Point::coordinate_type;
    explicit zoom_coordinates(coordinate_type factor, coordinate_type dx, coordinate_type dy)
        : factor_{factor},
          dx_{dx},
          dy_{dy} {}

    inline void operator()(Point& p) const
    {
        p.x *= factor_;
        p.y *= factor_;
        p.x -= dx_;
        p.y -= dy_;
    }
    coordinate_type factor_;
    coordinate_type dx_;
    coordinate_type dy_;
};
} // namespace detail

} // namespace vtile
