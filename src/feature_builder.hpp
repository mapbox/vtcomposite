#pragma once

// geometry.hpp
#include <mapbox/geometry.hpp>
// vtzero
#include <vtzero/builder.hpp>
#include <vtzero/vector_tile.hpp>
#include <mapbox/geometry/algorithms/detail/boost_adapters.hpp>
#include <boost/geometry/algorithms/intersects.hpp>
#include <boost/geometry/algorithms/intersection.hpp>

namespace vtile {

struct feature_builder
{
    feature_builder(vtzero::layer_builder& layer_builder,
                     mapbox::geometry::box<std::int64_t> const& bbox,
                     vtzero::feature const& feature)
        : layer_builder_{layer_builder},
          bbox_{bbox},
          feature_{feature} {}

    void operator() (mapbox::geometry::point<std::int64_t> const& pt)
    {
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool empty = true;
        if (boost::geometry::intersects(pt, bbox_))
        {
            empty = false;
            feature_builder.add_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
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

    void operator() (mapbox::geometry::multi_point<std::int64_t> const& mpt)
    {
        std::vector<mapbox::geometry::point<std::int64_t>> result;
        vtzero::point_feature_builder feature_builder{layer_builder_};
        if (feature_.has_id()) feature_builder.set_id(feature_.id());
        bool empty = true;
        for (auto const& pt :  mpt)
        {
            if (boost::geometry::intersects(pt, bbox_))
            {
                empty = false;
                feature_builder.add_point(static_cast<int>(pt.x), static_cast<int>(pt.y));
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

    void operator() (mapbox::geometry::line_string<std::int64_t> const& line)
    {
        std::vector<mapbox::geometry::line_string<std::int64_t>> result;
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

    void operator() (mapbox::geometry::multi_line_string<std::int64_t> const& line)
    {
        std::vector<mapbox::geometry::line_string<std::int64_t>> result;
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
    void operator() (mapbox::geometry::polygon<std::int64_t> const& poly)
    {
        std::vector<mapbox::geometry::polygon<std::int64_t>> result;
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

    void operator() (mapbox::geometry::multi_polygon<std::int64_t> const& mpoly)
    {

        std::vector<mapbox::geometry::polygon<std::int64_t>> result;
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
    mapbox::geometry::box<std::int64_t> const& bbox_;
    vtzero::feature const& feature_;


};

}
