#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
// vtzero
#include <vtzero/builder.hpp>
// boost
#include <boost/core/ignore_unused.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
#include <boost/geometry/algorithms/intersection.hpp>
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
    point_handler(geom_type& geom, int dx, int dy, int zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor)
    {
    }

    void points_begin(std::uint32_t count)
    {
        geom_.reserve(count);
    }

    void points_point(vtzero::point const& pt)
    {
        CoordinateType x = pt.x * zoom_factor_ - dx_;
        CoordinateType y = pt.y * zoom_factor_ - dy_;
        geom_.emplace_back(x, y);
    }

    void points_end() {}

    geom_type& geom_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

template <typename CoordinateType>
struct line_string_handler
{
    using geom_type = mapbox::geometry::multi_line_string<CoordinateType>;

    line_string_handler(geom_type& geom, int dx, int dy, int zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor)
    {
    }

    void linestring_begin(std::uint32_t count)
    {
        geom_.emplace_back();
        geom_.back().reserve(count);
    }

    void linestring_point(vtzero::point const& pt)
    {
        CoordinateType x = pt.x * zoom_factor_ - dx_;
        CoordinateType y = pt.y * zoom_factor_ - dy_;
        geom_.back().emplace_back(x, y);
    }

    void linestring_end() {}

    geom_type& geom_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

template <typename CoordinateType>
using annotated_ring = std::pair<mapbox::geometry::linear_ring<CoordinateType>, vtzero::ring_type>;

template <typename CoordinateType>
struct polygon_handler
{
    using geom_type = std::vector<annotated_ring<CoordinateType>>;
    polygon_handler(geom_type& geom, int dx, int dy, int zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor) {}

    void ring_begin(std::uint32_t count)
    {
        geom_.emplace_back();
        geom_.back().first.reserve(count);
    }

    void ring_point(vtzero::point const& pt)
    {
        CoordinateType x = pt.x * zoom_factor_ - dx_;
        CoordinateType y = pt.y * zoom_factor_ - dy_;
        geom_.back().first.emplace_back(x, y);
    }

    void ring_end(vtzero::ring_type type)
    {
        geom_.back().second = type;
    }

    geom_type& geom_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

} // namespace detail

template <typename CoordinateType>
struct overzoomed_feature_builder
{
    using coordinate_type = CoordinateType;
    overzoomed_feature_builder(vtzero::layer_builder& layer_builder,
                               mapbox::geometry::box<coordinate_type> const& bbox,
                               int dx, int dy, int zoom_factor)
        : layer_builder_{layer_builder},
          bbox_{bbox},
          dx_{dx},
          dy_{dy},
          zoom_factor_{zoom_factor} {}

    template <typename FeatureBuilder>
    void finalize(FeatureBuilder& builder, vtzero::feature const& feature)
    {
        // add properties
        builder.copy_properties(feature);
        builder.commit();
    }

    void apply_geometry_point(vtzero::feature const& feature)
    {
        mapbox::geometry::multi_point<CoordinateType> multi_point;
        vtzero::decode_point_geometry(feature.geometry(), detail::point_handler<coordinate_type>(multi_point, dx_, dy_, zoom_factor_));
        vtzero::point_feature_builder feature_builder{layer_builder_};
        feature_builder.copy_id(feature); 
        multi_point.erase(std::remove_if(multi_point.begin(), multi_point.end(), [this](auto const& pt) {
                              return !boost::geometry::within(pt, bbox_);
                          }),
                          multi_point.end());

        if (!multi_point.empty())
        {
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
        bool valid = false;
        vtzero::linestring_feature_builder feature_builder{layer_builder_};
        feature_builder.copy_id(feature); 

        for (auto const& l : result)
        {
            if (l.size() > 1)
            {
                valid = true;
                feature_builder.add_linestring(static_cast<unsigned>(l.size()));
                for (auto const& pt : l)
                {
                    feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                }
            }
        }
        if (valid) finalize(feature_builder, feature);
    }
    void apply_geometry_polygon(vtzero::feature const& feature)
    {
        std::vector<detail::annotated_ring<CoordinateType>> rings;
        vtzero::decode_polygon_geometry(feature.geometry(), detail::polygon_handler<CoordinateType>(rings, dx_, dy_, zoom_factor_));
        vtzero::polygon_feature_builder feature_builder{layer_builder_};
        feature_builder.copy_id(feature); 

        bool valid = false;
        bool process = false;
        for (auto& r : rings)
        {
            if (r.second == vtzero::ring_type::outer)
            {
                auto extent = mapbox::geometry::envelope(r.first);
                process = boost::geometry::intersects(extent, bbox_);
            }
            if (process)
            {
                std::vector<mapbox::geometry::polygon<coordinate_type>> result;
                if (r.second == vtzero::ring_type::inner) boost::geometry::reverse(r.first);
                // ^^ reverse inner rings before clipping as we're dealing with a disassembled polygon
                boost::geometry::intersection(r.first, bbox_, result);
                for (auto const& p : result)
                {
                    for (auto const& ring : p)
                    {
                        if (ring.size() > 3)
                        {
                            valid = true;
                            feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                            if (r.second == vtzero::ring_type::outer)
                            {
                                std::for_each(ring.begin(), ring.end(), [&feature_builder](auto const& pt) { feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y)); });
                            }
                            else
                            {
                                // apply points in reverse to preserve original winding order of inner rings
                                std::for_each(ring.rbegin(), ring.rend(), [&feature_builder](auto const& pt) { feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y)); });
                            }
                        }
                    }
                }
            }
        }
        if (valid) finalize(feature_builder, feature);
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
    mapbox::geometry::box<coordinate_type> const& bbox_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

} // namespace vtile
