var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var vtinfo = require('./test-utils.js').vtinfo;

test('[composite] composite success polygons - same zoom, different features, without and without buffer', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-buildings-sf-15-5239-12666.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-hillshade-sf-15-5239-12666.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/points-poi-sf-15-5239-12666.mvt')}
  ]
  const zxy = { z: 15, x: 5239, y: 12666}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.building.length, 1718);
  assert.equal(info1.layers.hillshade.length, 17);
  assert.equal(info2.layers.poi_label.length, 14);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.building.length, 1718);
    assert.equal(outputInfo.layers.hillshade.length, 17);
    assert.equal(outputInfo.layers.poi_label.length, 14);

    composite(tiles, zxy, {buffer_size:128}, (err, vtBuffer) => {
      const outputInfoWithBuffer = vtinfo(vtBuffer);
      assert.equal(outputInfo.layers.building.length, 1718);
      assert.equal(outputInfo.layers.hillshade.length, 17);
      assert.equal(outputInfo.layers.poi_label.length, 14);
      assert.end();
    });
  });
});

test('[composite] composite and overzooming success polygons - overzooming zoom factor of 2 between two tiles, buffer_size & no buffer_size', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-buildings-sf-15-5239-12666.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-hillshade-sf-15-5239-12666.mvt')},
    { z: 16, x: 10478, y: 25332, buffer: fs.readFileSync('./test/fixtures/points-poi-sf-15-5239-12666.mvt')}
  ]
  const zxy = { z: 16, x: 10478, y: 25332}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.building.length, 1718);
  assert.equal(info1.layers.hillshade.length, 17);
  assert.equal(info2.layers.poi_label.length, 14);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.building.length, 238);
    assert.equal(outputInfo.layers.hillshade.length, 11);
    assert.equal(outputInfo.layers.poi_label.length, 14);

    composite(tiles, zxy, {buffer_size:128}, (err, vtBuffer) => {
      const outputInfoWithBuffer = vtinfo(vtBuffer);

      assert.equal(outputInfoWithBuffer.layers.building.length, 275);
      assert.end();
    });
  });
});

test('[composite] composite and overzooming success polygons - overzooming multipolygon with large buffer', function(assert) {
  const zxy = { z:16, x:12210, y:25447 };
  const parent = { z:15, x:6105, y:12723 };

  const tiles = [
    { buffer: fs.readFileSync('./test/fixtures/mapbox-vector-terrain-v2-hillshade-15-6105-12723.mvt'),  z: parent.z, x: parent.x, y: parent.y }
  ];

  const ogOutputInfo = vtinfo(tiles[0].buffer);
  assert.equal(ogOutputInfo.layers.hillshade.length, 1);
  var hillshade = ogOutputInfo.layers.hillshade;
  var feature = hillshade.feature(0);
  var geojson = feature.toGeoJSON(zxy.x,zxy.y,zxy.z);
  var coords = geojson.geometry.coordinates;
  assert.equal(coords.length, 23);

  composite(tiles, zxy, {buffer_size: 5000}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.hillshade.length, 1);
    var hillshade = outputInfo.layers.hillshade;
    var feature = hillshade.feature(0);
    var geojson = feature.toGeoJSON(zxy.x,zxy.y,zxy.z);
    var coords = geojson.geometry.coordinates;
    assert.equal(coords.length, 23);
    assert.end();
  });
});


test('[composite] composite and overzooming success polygons - overzooming polygon with hole', function(assert) {
  const zxy = { z:1, x:0, y:0 };
  const parent = { z:0, x:0, y:0 };

  const tiles = [
    { buffer: fs.readFileSync('./test/fixtures/polygon-with-hole.mvt'),  z: parent.z, x: parent.x, y: parent.y }
  ];

  const ogOutputInfo = vtinfo(tiles[0].buffer);
  assert.equal(ogOutputInfo.layers.polygon.length, 1);
  var polygon_layer = ogOutputInfo.layers.polygon;
  var feature = polygon_layer.feature(0);
  var geojson = feature.toGeoJSON(zxy.x,zxy.y,zxy.z);
  var coords = geojson.geometry.coordinates;
  assert.equal(coords.length, 2);

  composite(tiles, zxy, {buffer_size: 0}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.polygon.length, 1);
    var polygon_layer = outputInfo.layers.polygon;
    var feature = polygon_layer.feature(0);
    var geojson = feature.toGeoJSON(zxy.x,zxy.y,zxy.z);
    var coords = geojson.geometry.coordinates;
    assert.equal(coords.length, 2);
    assert.end();
  });
});
