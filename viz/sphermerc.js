// var SphericalMercator = require('sphericalmercator');

// var merc = new SphericalMercator({
//     size: 256
// });

// var bbox = [ -123.74999999999999, 72.39570570653261, -123.74999999999999, 72.39570570653261];
// var zoom = 12; 

// var zxy = merc.xyz(bbox, zoom);
// console.log(zxy);

// var tilebelt = require('@mapbox/tilebelt');

// var zxy = tilebelt.pointToTile(-123.74999999999999, 72.39570570653261, 22);
// console.log(zxy);

const vt2geojson = require('@mapbox/vt2geojson');
const fs = require('fs');
// local file
vt2geojson({
    uri: './test/fixtures/points-poi-sf-15-5239-12666.mvt',
    layer: 'poi_label',
    z: 15,
    x: 5239,
    y: 12666
}, function (err, result) {
    if (err) throw err;
    console.log(err);
    console.log(result); // => GeoJSON FeatureCollection
    fs.writeFileSync('./test/fixtures/points-poi-sf-15-5239-12666.geojson', JSON.stringify(result));
});