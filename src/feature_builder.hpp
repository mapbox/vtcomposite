#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
// vtzero
#include <vtzero/builder.hpp>
//#include <vtzero/vector_tile.hpp>
// boost
#include <boost/core/ignore_unused.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
#include <boost/geometry/algorithms/intersection.hpp>

//BOOST_GEOMETRY_REGISTER_POINT_2D(mapbox::geometry::point<int>, int, boost::geometry::cs::cartesian, x, y)
// ^ Uncomment to enable coordinate_type = int ^

namespace vtile { namespace detail {

template <typename CoordinateType>
struct point_handler
{
    using geom_type = mapbox::geometry::multi_point<CoordinateType>;
    point_handler(geom_type& geom, int dx, int dy, int zoom_factor)
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor)
    {}

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
    {}

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
struct polygon_ring
{

    polygon_ring()
        : ring(), type(vtzero::ring_type::invalid)
    {
    }

    mapbox::geometry::linear_ring<CoordinateType> ring;
    vtzero::ring_type type;
};

template <typename CoordinateType>
struct polygon_handler
{
    using geom_type = std::vector<polygon_ring<CoordinateType>>;
    polygon_handler(geom_type& geom, int dx, int dy, int zoom_factor )
        : geom_(geom),
          dx_(dx),
          dy_(dy),
          zoom_factor_(zoom_factor) {}

    void ring_begin(std::uint32_t count)
    {
        geom_.emplace_back();
        geom_.back().ring.reserve(count);
    }

    void ring_point(vtzero::point const& pt)
    {
        CoordinateType x = pt.x * zoom_factor_ - dx_;
        CoordinateType y = pt.y * zoom_factor_ - dy_;
        geom_.back().ring.emplace_back(x, y);
    }

    void ring_end(vtzero::ring_type type)
    {
        geom_.back().type = type;
    }

    geom_type& geom_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

}

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
        feature.for_each_property([&builder](vtzero::property const& p) {
            builder.add_property(p);
            return true;
        });
        builder.commit();
    }

    void apply_geometry_point(vtzero::feature const& feature)
    {
        mapbox::geometry::multi_point<CoordinateType> multi_point;
        vtzero::decode_point_geometry(feature.geometry(), detail::point_handler<coordinate_type>(multi_point, dx_, dy_, zoom_factor_));
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature.has_id()) feature_builder.set_id(feature.id());
        std::vector<mapbox::geometry::point<coordinate_type>> result;
        for (auto const& pt : multi_point)
        {
            if (boost::geometry::intersects(pt, bbox_))
            {
                result.push_back(pt);
            }
        }
        if (!result.empty())
        {
            feature_builder.add_points(static_cast<unsigned>(result.size()));
            for (auto const& pt : result)
            {
                feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
            }
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
        if (feature.has_id()) feature_builder.set_id(feature.id());
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
        std::vector<detail::polygon_ring<CoordinateType>> rings;
        vtzero::decode_polygon_geometry(feature.geometry(), detail::polygon_handler<CoordinateType>(rings, dx_, dy_, zoom_factor_));

        std::vector<mapbox::geometry::polygon<coordinate_type>> result;
        vtzero::polygon_feature_builder feature_builder{layer_builder_};
        if (feature.has_id()) feature_builder.set_id(feature.id());
        bool valid = false;

        mapbox::geometry::multi_polygon<CoordinateType> mp;
        mp.reserve(rings.size());
        for (auto&& r : rings)
        {
            if (r.type == vtzero::ring_type::outer)
            {
                mp.emplace_back();
                mp.back().push_back(std::move(r.ring));
            }
            else if (!mp.empty() && r.type == vtzero::ring_type::inner)
            {
                mp.back().push_back(std::move(r.ring));
            }
        }

        for (auto const& poly : mp)
        {
            auto extent = mapbox::geometry::envelope(poly);
            if (!boost::geometry::intersects(extent, bbox_)) continue;
            boost::geometry::intersection(poly, bbox_, result);
            for (auto const& p : result)
            {
                for (auto const& ring : p)
                {
                    if (ring.size() > 3)
                    {
                        valid = true;
                        feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                        for (auto const& pt : ring)
                        {
                            feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                        }
                    }
                }
            }
        }
        if (valid) finalize(feature_builder, feature);
    }

    void apply(vtzero::feature const& feature)
    {
        switch(feature.geometry_type())
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
            break;
        }
    }
/*
    void operator()(mapbox::geometry::point<coordinate_type> const& pt)
    {
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        if (boost::geometry::intersects(pt, bbox_))
        {
            feature_builder.add_point(static_cast<int>(pt.x),
                                      static_cast<int>(pt.y));
            finalize(feature_builder);
        }
    }

    void operator()(mapbox::geometry::multi_point<coordinate_type> const& mpt)
    {
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        std::vector<mapbox::geometry::point<coordinate_type>> result;
        for (auto const& pt : mpt)
        {
            if (boost::geometry::intersects(pt, bbox_))
            {
                result.push_back(pt);
            }
        }
        if (!result.empty()) finalize(feature_builder);
    }

    void operator()(mapbox::geometry::line_string<coordinate_type> const& line)
    {
        std::vector<mapbox::geometry::line_string<coordinate_type>> result;
        boost::geometry::intersection(line, bbox_, result);
        vtzero::linestring_feature_builder feature_builder{layer_builder_};
        bool valid = false;
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        for (auto const& l : result)
        {
            if (l.size() > 1)
            {
                feature_builder.add_linestring(static_cast<unsigned>(l.size()));
                for (auto const& pt : l)
                {
                    valid = true;
                    feature_builder.set_point(static_cast<int>(pt.x),
                                              static_cast<int>(pt.y));
                }
            }
        }

        if (valid) finalize(feature_builder);
    }

    void operator()(mapbox::geometry::multi_line_string<coordinate_type> const& line)
    {
        std::vector<mapbox::geometry::line_string<coordinate_type>> result;
        boost::geometry::intersection(line, bbox_, result);
        bool valid = false;

        vtzero::linestring_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
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
        if (valid) finalize(feature_builder);
    }

    void operator()(mapbox::geometry::polygon<coordinate_type> const& poly)
    {
        auto extent = mapbox::geometry::envelope(poly);
        if (!boost::geometry::intersects(extent, bbox_)) return;
        std::vector<mapbox::geometry::polygon<coordinate_type>> result;
        boost::geometry::intersection(poly, bbox_, result);
        vtzero::polygon_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool valid = false;
        for (auto const& p : result)
        {
            for (auto const& ring : p)
            {
                if (ring.size() > 3)
                {
                    valid = true;
                    feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                    for (auto const& pt : ring)
                    {
                        feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                    }
                }
            }
        }
        if (valid) finalize(feature_builder);
    }

    void operator()(mapbox::geometry::multi_polygon<coordinate_type> const& mpoly)
    {
        std::vector<mapbox::geometry::polygon<coordinate_type>> result;
        vtzero::polygon_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool valid = false;

        for (auto const& poly : mpoly)
        {
            auto extent = mapbox::geometry::envelope(poly);
            if (!boost::geometry::intersects(extent, bbox_)) continue;
            boost::geometry::intersection(poly, bbox_, result);
            for (auto const& p : result)
            {
                for (auto const& ring : p)
                {
                    if (ring.size() > 3)
                    {
                        valid = true;
                        feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                        for (auto const& pt : ring)
                        {
                            feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                        }
                    }
                }
            }
        }
        if (valid) finalize(feature_builder);
    }

    template <typename T>
    void operator()(T const& geom)
    {
        boost::ignore_unused(geom);
    }
*/
    vtzero::layer_builder& layer_builder_;
    mapbox::geometry::box<coordinate_type> const& bbox_;
    //vtzero::feature const& feature_;
    int dx_;
    int dy_;
    int zoom_factor_;
};

} // namespace vtile
