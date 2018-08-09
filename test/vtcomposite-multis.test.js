var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var mvtFixtures = require('@mapbox/mvt-fixtures');
var vtinfo = require('./test-utils.js').vtinfo;

test('[composite] composite success multi geometries - different layer name, different features, same zoom, no buffer', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multipoint.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multiline.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multipolygon.mvt')}
  ]
  const zxy = { z: 15, x: 5239, y: 12666}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.hello.length, 1);
  assert.equal(info1.layers.goodbye.length, 1);
  assert.equal(info2.layers.seeya.length, 1);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.goodbye.length, 1);
    assert.equal(outputInfo.layers.seeya.length, 1);
    assert.equal(outputInfo.layers.hello.length, 1);
    assert.end();
  });
});

test('[composite] composite success multi geometries - different layer name, different features, same zoom, no buffer', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/v1-multipoint.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multiline.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multipolygon.mvt')}
  ]
  const zxy = { z: 15, x: 5239, y: 12666}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.saucy.version, 1);
  assert.equal(info0.layers.saucy.length, 1);
  assert.equal(info1.layers.goodbye.length, 1);
  assert.equal(info2.layers.seeya.length, 1);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(vtBuffer.length, 171);
    assert.equal(outputInfo.layers.goodbye.length, 1);
    assert.equal(outputInfo.layers.seeya.length, 1);
    assert.equal(outputInfo.layers.saucy.length, 1);
    assert.end();
  });
});

test('[composite] composite and overzooming success multi geometries - different layer name, different features, zoom factor 2, with and without buffer', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multipoint.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multiline.mvt')},
    { z: 16, x: 10479, y: 25332, buffer: fs.readFileSync('./test/fixtures/multipolygon.mvt')}
  ]
  const zxy = {  z: 16, x: 10479, y: 25332}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.hello.length, 1);
  assert.equal(info1.layers.goodbye.length, 1);
  assert.equal(info2.layers.seeya.length, 1);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(Object.keys(outputInfo.layers).length, 1);

    composite(tiles, zxy, {'buffer_size': 4096}, (err, vtBuffer) => {
      const outputInfo = vtinfo(vtBuffer);
      assert.equal(vtBuffer.length, 181);
      assert.equal(Object.keys(outputInfo.layers).length, 3);
      assert.end();
    });
  });
});

test('[composite] composite and overzooming success multi geometries with v1 tile - different layer name, different features, zoom factor 2, with and without buffer', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/v1-multipoint.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/multiline.mvt')},
    { z: 16, x: 10479, y: 25332, buffer: fs.readFileSync('./test/fixtures/multipolygon.mvt')}
  ]
  const zxy = {  z: 16, x: 10479, y: 25332}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.saucy.version, 1);
  assert.equal(info0.layers.saucy.length, 1);
  assert.equal(info1.layers.goodbye.length, 1);
  assert.equal(info2.layers.seeya.length, 1);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(Object.keys(outputInfo.layers).length, 1);

    composite(tiles, zxy, {'buffer_size': 4096}, (err, vtBuffer) => {
      const outputInfo = vtinfo(vtBuffer);
      assert.equal(vtBuffer.length, 181);
      assert.equal(Object.keys(outputInfo.layers).length, 3);
      assert.end();
    });
  });
});
