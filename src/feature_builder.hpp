#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
// vtzero
#include <vtzero/builder.hpp>
#include <vtzero/vector_tile.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
#include <boost/geometry/algorithms/intersection.hpp>

BOOST_GEOMETRY_REGISTER_POINT_2D (mapbox::geometry::point<std::int32_t>, std::int32_t, boost::geometry::cs::cartesian, x, y)

namespace vtile {

template <typename CoordinateType>
struct feature_builder
{
    using coordinate_type = CoordinateType;
    feature_builder(vtzero::layer_builder& layer_builder,
                     mapbox::geometry::box<coordinate_type> const& bbox,
                     vtzero::feature const& feature)
        : layer_builder_{layer_builder},
          bbox_{bbox},
          feature_{feature} {}

    void operator() (mapbox::geometry::point<coordinate_type> const& pt)
    {
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool empty = true;
        if (boost::geometry::intersects(pt, bbox_))
        {
            empty = false;
            feature_builder.add_point(static_cast<int>(pt.x),
                                      static_cast<int>(pt.y));
        }
        if (!empty)
        {
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
        else
        {
            feature_builder.rollback();
        }
    }

    void operator() (mapbox::geometry::multi_point<coordinate_type> const& mpt)
    {
        std::vector<mapbox::geometry::point<coordinate_type>> result;
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool empty = true;
        for (auto const& pt :  mpt)
        {
            if (boost::geometry::intersects(pt, bbox_))
            {
                empty = false;
                feature_builder.add_point(static_cast<int>(pt.x),
                                          static_cast<int>(pt.y));
            }
        }

        if (!empty)
        {
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
        else
        {
            feature_builder.rollback();
        }
    }

    void operator() (mapbox::geometry::line_string<coordinate_type> const& line)
    {
        std::vector<mapbox::geometry::line_string<coordinate_type>> result;
        boost::geometry::intersection(line, bbox_, result);
        if (!result.empty())
        {
            vtzero::linestring_feature_builder feature_builder{layer_builder_};
            if (feature_.has_id()) feature_builder.set_id(feature_.id());
            for (auto const& l : result)
            {
                feature_builder.add_linestring(static_cast<unsigned>(l.size()));
                for (auto const& pt : l)
                {
                    feature_builder.set_point(static_cast<int>(pt.x),
                                              static_cast<int>(pt.y));
                }
            }
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
    }

    void operator() (mapbox::geometry::multi_line_string<coordinate_type> const& line)
    {
        std::vector<mapbox::geometry::line_string<coordinate_type>> result;
        boost::geometry::intersection(line, bbox_, result);
        if (!result.empty())
        {
            vtzero::linestring_feature_builder feature_builder{layer_builder_};
            if (feature_.has_id()) feature_builder.set_id(feature_.id());
            for (auto const& l : result)
            {
                feature_builder.add_linestring(static_cast<unsigned>(l.size()));
                for (auto const& pt : l)
                {
                    feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                }
            }
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
    }
    void operator() (mapbox::geometry::polygon<coordinate_type> const& poly)
    {
        std::vector<mapbox::geometry::polygon<coordinate_type>> result;
        boost::geometry::intersection(poly, bbox_, result);
        //for_each(result.begin(), result.end(), [](auto const& p) {
        //        std::cerr << boost::geometry::wkt(p) << std::endl;
        //   });
        if (!result.empty())
        {
            vtzero::polygon_feature_builder feature_builder{layer_builder_};
            if (feature_.has_id()) feature_builder.set_id(feature_.id());
            for (auto const& p : result)
            {
                for (auto const& ring : p)
                {
                    feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                    for (auto const& pt : ring)
                    {
                        feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                    }
                }
            }
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
    }

    void operator() (mapbox::geometry::multi_polygon<coordinate_type> const& mpoly)
    {

        std::vector<mapbox::geometry::polygon<coordinate_type>> result;
        boost::geometry::intersection(mpoly, bbox_, result);
        if (!result.empty())
        {
            vtzero::polygon_feature_builder feature_builder{layer_builder_};
            if (feature_.has_id()) feature_builder.set_id(feature_.id());
            for (auto const& p : result)
            {
                for (auto const& ring : p)
                {
                    feature_builder.add_ring(static_cast<unsigned>(ring.size()));
                    for (auto const& pt : ring)
                    {
                        feature_builder.set_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
                    }
                }
            }
            // add properties
            feature_.for_each_property([&feature_builder](vtzero::property const& p) {
                    feature_builder.add_property(p);
                    return true;
                });
            feature_builder.commit();
        }
    }

    template <typename T>
    void operator() (T const& geom)
    {
        std::cerr << "FIXME:" << typeid(geom).name() << std::endl;
    }

    vtzero::layer_builder & layer_builder_;
    mapbox::geometry::box<coordinate_type> const& bbox_;
    vtzero::feature const& feature_;


};

}
