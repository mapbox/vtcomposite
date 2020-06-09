#pragma once

#include <cmath>
#include <tuple>

namespace vtile {

template <typename T>
inline bool within_target(T const& vt, std::uint32_t z, std::uint32_t x, std::uint32_t y)
{
    if (vt.z > z)
    {
        return false;
    }
    auto dz = static_cast<std::size_t>(z - vt.z);
    return ((x >> dz) == vt.x) && ((y >> dz) == vt.y);
}

inline std::tuple<std::uint32_t, std::uint32_t> displacement(std::uint32_t source_z, std::uint32_t tile_size, std::uint32_t z, std::uint32_t x, std::uint32_t y)
{
    std::uint32_t half_tile = tile_size >> 1U;
    std::uint32_t dx = 0;
    std::uint32_t dy = 0;
    std::uint32_t delta_z = z - source_z;
    for (std::uint32_t zi = delta_z; zi > 0; --zi)
    {
        half_tile <<= 1U;
        if ((x & 1) != 0)
        {
            dx += half_tile;
        }
        if ((y & 1) != 0)
        {
            dy += half_tile;
        }
        x >>= 1U;
        y >>= 1U;
    }
    return std::make_tuple(dx, dy);
}

} // namespace vtile
