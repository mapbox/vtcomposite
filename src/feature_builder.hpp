#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
// vtzero
#include <vtzero/builder.hpp>
#include <vtzero/vector_tile.hpp>
// boost
#include <boost/core/ignore_unused.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
#include <boost/geometry/algorithms/intersection.hpp>

//BOOST_GEOMETRY_REGISTER_POINT_2D(mapbox::geometry::point<std::int32_t>, std::int32_t, boost::geometry::cs::cartesian, x, y)
// ^ Uncomment to enable coordinate_type = std::int32_t ^

namespace vtile {

template <typename CoordinateType>
struct feature_builder_visitor
{
    using coordinate_type = CoordinateType;
    feature_builder_visitor(vtzero::layer_builder& layer_builder,
                            mapbox::geometry::box<coordinate_type> const& bbox,
                            vtzero::feature const& feature)
        : layer_builder_{layer_builder},
          bbox_{bbox},
          feature_{feature} {}

    template <typename FeatureBuilder>
    void finalize(FeatureBuilder& builder)
    {
        // add properties
        feature_.for_each_property([&builder](vtzero::property const& p) {
            builder.add_property(p);
            return true;
        });
        builder.commit();
    }

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
        boost::geometry::intersection(mpoly, bbox_, result);
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

    template <typename T>
    void operator()(T const& geom)
    {
        boost::ignore_unused(geom);
    }

    vtzero::layer_builder& layer_builder_;
    mapbox::geometry::box<coordinate_type> const& bbox_;
    vtzero::feature const& feature_;
};

} // namespace vtile
