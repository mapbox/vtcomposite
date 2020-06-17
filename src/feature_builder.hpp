#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
// vtzero
#include <vtzero/builder.hpp>
#include <vtzero/property_mapper.hpp>
// boost
#include <boost/geometry/algorithms/intersection.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
// stl
#include <algorithm>
//BOOST_GEOMETRY_REGISTER_POINT_2D(mapbox::geometry::point<int>, int, boost::geometry::cs::cartesian, x, y)
// ^ Uncomment to enable coordinate_type = int ^

namespace vtile {
namespace detail {

template <typename CoordinateType>
struct point_handler
{
    using geom_type = mapbox::geometry::multi_point<CoordinateType>;
    point_handler(geom_type& geom, std::uint32_t dx, std::uint32_t dy, std::uint32_t zoom_factor, mapbox::geometry::box<CoordinateType> const& bbox)
        : geom_(geom),
          bbox_(bbox),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor)
    {
    }

    void points_begin(std::uint32_t /*unused*/)
    {
    }

    void points_point(vtzero::point const& pt)
    {
        CoordinateType x = pt.x * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dx_);
        CoordinateType y = pt.y * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dy_);
        mapbox::geometry::point<CoordinateType> pt0{x, y};
        if (boost::geometry::covered_by(pt0, bbox_))
        {
            geom_.push_back(std::move(pt0));
        }
    }

    void points_end() {}

    geom_type& geom_;
    mapbox::geometry::box<CoordinateType> const& bbox_;
    std::uint32_t const dx_;
    std::uint32_t const dy_;
    std::uint32_t const zoom_factor_;
};

template <typename CoordinateType>
struct line_string_handler
{
    using geom_type = mapbox::geometry::multi_line_string<CoordinateType>;

    line_string_handler(geom_type& geom, std::uint32_t dx, std::uint32_t dy, std::uint32_t zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor)
    {
    }

    void linestring_begin(std::uint32_t count)
    {
        first_ = true;
        geom_.emplace_back();
        geom_.back().reserve(count);
    }

    void linestring_point(vtzero::point const& pt)
    {
        if (first_ || pt.x != cur_x_ || pt.y != cur_y_)
        {
            CoordinateType x = pt.x * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dx_);
            CoordinateType y = pt.y * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dy_);
            geom_.back().emplace_back(x, y);
            cur_x_ = pt.x;
            cur_y_ = pt.y;
            first_ = false;
        }
    }

    void linestring_end() {}

    geom_type& geom_;
    std::uint32_t const dx_;
    std::uint32_t const dy_;
    std::uint32_t const zoom_factor_;
    CoordinateType cur_x_ = 0;
    CoordinateType cur_y_ = 0;
    bool first_ = true;
};

template <typename CoordinateType>
using annotated_ring = std::pair<mapbox::geometry::linear_ring<CoordinateType>, vtzero::ring_type>;

template <typename CoordinateType>
struct polygon_handler
{
    using geom_type = std::vector<annotated_ring<CoordinateType>>;
    polygon_handler(geom_type& geom, std::uint32_t dx, std::uint32_t dy, std::uint32_t zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor) {}

    void ring_begin(std::uint32_t count)
    {
        first_ = true;
        geom_.emplace_back();
        geom_.back().first.reserve(count);
    }

    void ring_point(vtzero::point const& pt)
    {
        if (first_ || pt.x != cur_x_ || pt.y != cur_y_)
        {
            CoordinateType x = pt.x * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dx_);
            CoordinateType y = pt.y * static_cast<std::int32_t>(zoom_factor_) - static_cast<std::int32_t>(dy_);
            geom_.back().first.emplace_back(x, y);
            cur_x_ = pt.x;
            cur_y_ = pt.y;
            first_ = false;
        }
    }

    void ring_end(vtzero::ring_type type)
    {
        geom_.back().second = type;
    }

    geom_type& geom_;
    std::uint32_t const dx_;
    std::uint32_t const dy_;
    std::uint32_t const zoom_factor_;
    CoordinateType cur_x_ = 0;
    CoordinateType cur_y_ = 0;
    bool first_ = true;
};

} // namespace detail

template <typename CoordinateType>
struct overzoomed_feature_builder
{
    using coordinate_type = CoordinateType;
    overzoomed_feature_builder(vtzero::layer_builder& layer_builder,
                               vtzero::property_mapper& mapper,
                               mapbox::geometry::box<coordinate_type> const& bbox,
                               std::uint32_t dx, std::uint32_t dy, std::uint32_t zoom_factor)
        : layer_builder_{layer_builder},
          mapper_{mapper},
          bbox_{bbox},
          dx_{dx},
          dy_{dy},
          zoom_factor_{zoom_factor} {}

    template <typename FeatureBuilder>
    void finalize(FeatureBuilder& builder, vtzero::feature const& feature)
    {
        // add properties
        builder.copy_properties(feature, mapper_);
        builder.commit();
    }

    void apply_geometry_point(vtzero::feature const& feature)
    {
        mapbox::geometry::multi_point<CoordinateType> multi_point;
        vtzero::decode_point_geometry(feature.geometry(), detail::point_handler<coordinate_type>(multi_point, dx_, dy_, zoom_factor_, bbox_));
        if (!multi_point.empty())
        {
            vtzero::point_feature_builder feature_builder{layer_builder_};
            feature_builder.copy_id(feature);
            feature_builder.add_points_from_container(multi_point);
            finalize(feature_builder, feature);
        }
    }

    void apply_geometry_linestring(vtzero::feature const& feature)
    {
        mapbox::geometry::multi_line_string<CoordinateType> multi_line;
        vtzero::decode_linestring_geometry(feature.geometry(), detail::line_string_handler<coordinate_type>(multi_line, dx_, dy_, zoom_factor_));
        std::vector<mapbox::geometry::line_string<coordinate_type>> result;
        boost::geometry::intersection(multi_line, bbox_, result);
        if (!result.empty())
        {
            vtzero::linestring_feature_builder feature_builder{layer_builder_};
            feature_builder.copy_id(feature);
            bool valid = false;
            for (auto const& l : result)
            {
                if (l.size() > 1)
                {
                    feature_builder.add_linestring(static_cast<unsigned>(l.size()));
                    auto itr = l.cbegin();
                    auto last_pt = *itr++;
                    feature_builder.set_point(static_cast<int>(last_pt.x), static_cast<int>(last_pt.y));
                    for (auto const& end = l.end(); itr != end; ++itr)
                    {
                        if (*itr != last_pt)
                        {
                            valid = true;
                            feature_builder.set_point(static_cast<int>(itr->x), static_cast<int>(itr->y));
                            last_pt = *itr;
                        }
                    }
                }
            }
            if (valid)
            {
                finalize(feature_builder, feature);
            }
        }
    }
    void apply_geometry_polygon(vtzero::feature const& feature)
    {
        std::vector<detail::annotated_ring<CoordinateType>> rings;
        vtzero::decode_polygon_geometry(feature.geometry(), detail::polygon_handler<CoordinateType>(rings, dx_, dy_, zoom_factor_));
        std::vector<mapbox::geometry::polygon<CoordinateType>> polygons;
        bool process = false;
        for (auto const& r : rings)
        {
            if (r.second == vtzero::ring_type::outer)
            {
                auto extent = mapbox::geometry::envelope(r.first);
                process = boost::geometry::intersects(extent, bbox_);
                if (process)
                {
                    polygons.emplace_back(); // start new polygon
                }
            }
            if (process && r.first.size() > 3)
            {
                polygons.back().push_back(std::move(r.first));
            }
        }
        if (!polygons.empty())
        {
            vtzero::polygon_feature_builder feature_builder{layer_builder_};
            feature_builder.copy_id(feature);
            bool valid = false;
            for (auto const& poly : polygons)
            {
                std::vector<mapbox::geometry::polygon<coordinate_type>> result;
                boost::geometry::intersection(poly, bbox_, result);
                for (auto const& p : result)
                {
                    for (auto const& ring : p)
                    {
                        if (ring.size() > 3)
                        {
                            valid = true;
                            feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                            std::for_each(ring.begin(), ring.end(),
                                          [&feature_builder](auto const& pt) { feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y)); });
                        }
                    }
                }
            }
            if (valid)
            {
                finalize(feature_builder, feature);
            }
        }
    }

    void apply(vtzero::feature const& feature)
    {
        switch (feature.geometry_type())
        {
        case vtzero::GeomType::POINT:
            apply_geometry_point(feature);
            break;
        case vtzero::GeomType::LINESTRING:
            apply_geometry_linestring(feature);
            break;
        case vtzero::GeomType::POLYGON:
            apply_geometry_polygon(feature);
            break;
        default:
            // LCOV_EXCL_START
            break;
            // LCOV_EXCL_STOP
        }
    }
    vtzero::layer_builder& layer_builder_;
    vtzero::property_mapper& mapper_;
    mapbox::geometry::box<coordinate_type> const& bbox_;
    std::uint32_t dx_;
    std::uint32_t dy_;
    std::uint32_t zoom_factor_;
};

} // namespace vtile
