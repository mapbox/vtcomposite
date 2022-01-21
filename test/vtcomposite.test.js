const test = require('tape');
const vt = require('../lib/index.js');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const vtinfo = require('./test-utils.js').vtinfo;
const vt1infoValid = require('./test-utils.js').vt1infoValid;
const tilebelt = require('@mapbox/tilebelt');

const bufferSF = fs.readFileSync(path.resolve(__dirname+'/../node_modules/@mapbox/mvt-fixtures/real-world/sanfrancisco/15-5238-12666.mvt'));
const composite = vt.composite;
const internationalize = vt.internationalize;

test('[composite] success: buffer size stays the same when no compositing needed', function(assert) {
  const tiles = [
    {buffer: bufferSF, z:15, x:5238, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length, bufferSF.length, 'same size');
    assert.end();
  });
});

test('[composite] success compositing - same layer name, same features, same zoom', function(assert) {
  const singlePointBuffer = mvtFixtures.get('017').buffer;

  const tiles = [
    {buffer: singlePointBuffer, z:15, x:5238, y:12666},
    {buffer: singlePointBuffer, z:15, x:5238, y:12666}
  ];

  const expectedLayerName = 'hello';

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);

    assert.ok(outputInfo.layers.hello, 'hello', 'expected layer name');
    assert.equal(Object.keys(outputInfo.layers).length, 1, 'expected number of layers');
    assert.equal(outputInfo.layers.hello.length, 1, 'expected number of features');
    assert.end();
  });
});

test('[composite] success compositing - same layer name, different features, same zoom', function(assert) {
  const buffer1 = mvtFixtures.get('059').buffer; // mud lake
  const buffer2 = mvtFixtures.get('060').buffer; // crater lake

  const tiles = [
    {buffer: buffer1, z:15, x:5238, y:12666}, // this layer wins
    {buffer: buffer2, z:15, x:5238, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);

    assert.ok(outputInfo.layers.water, 'returns layer water');
    assert.equal(Object.keys(outputInfo.layers).length, 1, 'return 1 layers');
    assert.equal(outputInfo.layers.water.length, 1, 'only has one feature');
    assert.equal(outputInfo.layers.water.feature(0).properties.name, 'mud lake', 'expected feature');
    assert.end();
  });
});

const gzipped_bufferSF = zlib.gzipSync(bufferSF);

test('[composite] success: compositing single gzipped VT', function(assert) {
  const tiles = [
    {buffer: gzipped_bufferSF, z:15, x:5238, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length, zlib.gunzipSync(gzipped_bufferSF).length, 'same size');
    assert.end();
  });
});

test('[composite] success: gzipped output', function(assert) {
  const tiles = [
    {buffer: bufferSF, z:15, x:5238, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {compress:true}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length, bufferSF.length, 'same size');
    assert.end();
  });
});

// TEST - check vt is within target

test('[composite] failure: discards layer that is not within target', function(assert) {

  const buffer1 = mvtFixtures.get('017').buffer;
  const buffer2 = mvtFixtures.get('053').buffer;

  const tiles = [
    {buffer: buffer1, z:15, x:5238, y:12666},
    {buffer: buffer2, z:15, x:5239, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.ok(err);
    assert.equal(err.message, 'Invalid tile composite request: SOURCE(15,5239,12666) TARGET(15,5238,12666)');
    assert.end();
  });
});

test('[composite] failure: tile does not intersect target zoom level ', function(assert) {
  // TBD whether it's a failure or silently discards the tile that isn't in the target
  const buffer1 = mvtFixtures.get('017').buffer;
  const buffer2 = mvtFixtures.get('053').buffer;

  const tiles = [
    {buffer: buffer1, z:7, x:19, y:44},
    {buffer: buffer2, z:6, x:10, y:22} //this tile does not intersect target zoom level
  ];

  const zxy = {z:7, x:19, y:44};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.ok(err);
    assert.equal(err.message, 'Invalid tile composite request: SOURCE(6,10,22) TARGET(7,19,44)');
    assert.end();
  });
});

test('[composite] failure: tile with zoom level higher than requested zoom is discarded', function(assert) {
  const buffer1 = mvtFixtures.get('017').buffer;
  const buffer2 = mvtFixtures.get('053').buffer;

  const tiles = [
    {buffer: buffer2, z:7, x:10, y:22},
    {buffer: buffer2, z:6, x:10, y:22}
  ];

  const zxy = {z:6, x:10, y:22};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.ok(err);
    assert.equal(err.message, 'Invalid tile composite request: SOURCE(7,10,22) TARGET(6,10,22)');
    assert.end();
  });
});

test('[composite] underzooming generates out of bounds error', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/four-points-quadrants.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 4);

  const tiles = [
    {buffer: buffer1, z:3, x:1, y:1}
  ];

  const zxy = {z:0, x:0, y:0};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.ok(err);
    assert.equal(err.message, 'Invalid tile composite request: SOURCE(3,1,1) TARGET(0,0,0)')
    assert.end();
  });
});

test('[composite] huge overzoom z0 - z14', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/four-points-quadrants.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 4);

  const tiles = [
    {buffer: buffer1, z:0, x:0, y:0}
  ];

  const zoom = 14;
  const coords = require('./fixtures/four-points.js')['features'][0]['geometry']['coordinates'];
  const overzoomedZXY = tilebelt.pointToTile(coords[0], coords[1], zoom);
  const zxy = {z:overzoomedZXY[2], x:overzoomedZXY[0], y:overzoomedZXY[1]};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.quadrants.length, 1);
    assert.end();
  });
});

test('[composite] huge overzoom z15 - z27', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/points-poi-sf-15-5239-12666.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.poi_label.length, 14);

  const tiles = [
    {buffer: buffer1, z:15, x:5239, y:12666}
  ];

  const zoom = 27;
  const coords = require('./fixtures/points-poi-sf-15-5239-12666.js')['features'][0]['geometry']['coordinates'];
  const overzoomedZXY = tilebelt.pointToTile(coords[0], coords[1], zoom);
  const zxy = {z:overzoomedZXY[2], x:overzoomedZXY[0], y:overzoomedZXY[1]};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.poi_label.length, 1);
    assert.end();
  });
});

test('[composite] processing V1 tiles with malformed geometries', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/0.mvt');
  const buffer2 = fs.readFileSync(__dirname + '/fixtures/1.mvt');
  const buffer3 = fs.readFileSync(__dirname + '/fixtures/2.mvt');

  const tiles = [
    {buffer: buffer1, z:14, x:4396, y:6458},
    {buffer: buffer2, z:14, x:4396, y:6458},
    {buffer: buffer3, z:12, x:1099, y:1614}
  ];

  const zxy = {z:14, x:4396, y:6458};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    var count = 0;
    for (var name in outputInfo.layers)
    {
      count += outputInfo.layers[name].length;
    }
    assert.equal(count, 567, 'v1 tiles with polygons composite successfully');
    assert.end();
  });
});

test('[composite] resolves zero length linestring error for overzoomed V1 tiles with polygons', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/3.mvt');
  const buffer2 = fs.readFileSync(__dirname + '/fixtures/4.mvt');
  const buffer3 = fs.readFileSync(__dirname + '/fixtures/5.mvt');

  const tiles = [
    {buffer: buffer1, z:14, x:5088, y:5937},
    {buffer: buffer2, z:14, x:5088, y:5937},
    {buffer: buffer3, z:12, x:1272, y:1484}
  ];

  const zxy = {z:14, x:5088, y:5937};

  composite(tiles, zxy, {buffer_size:4080}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(Object.keys(outputInfo.layers).length, 11, 'v1 tiles with polygons composite successfully');
    assert.end();
  });
});

test('[composite] check all geometries are clipped to the tile extent', function(assert) {

  const buffer = require('fs').readFileSync('./test/fixtures/clipping-test-tile.mvt');
  const tiles = [
    {buffer: buffer, z:1, x:1, y:1},
  ];

  const zxy = {z:4, x:10, y:14};
  const options = { compress: false, buffer_size: 4080 };
  var tile_extent = [ -4080, -4080, 4096 + 4080, 4096 + 4080 ];
  composite(tiles, zxy, options, (err, output_buffer) => {
    assert.notOk(err);
    const info = vtinfo(output_buffer);
    for (var name in info.layers)
    {
      var layer = info.layers[name];
      for (var index = 0; index < layer.length; ++index)
      {
        var bbox = layer.feature(index).bbox();
        var within = (bbox[0] >= tile_extent[0] &&
                      bbox[1] >= tile_extent[1] &&
                      bbox[2] <= tile_extent[2] &&
                      bbox[3] <= tile_extent[3]);
        assert.ok(within);
      }
    }
    assert.end();
  });
});

// These tiles are invalid v2 tiles such that boost::geometry can't handle some zero-area polygons
// and results in unsigned integer overflow. So, we skip this test for the sanitize job
// This should be able to be enabled again after upgrading to https://github.com/boostorg/geometry/pull/505
if (!process.env.ASAN_OPTIONS) {
  test('[composite] resolves polygon clockwise error in overzoomed V1 tiles', function(assert) {
    const buffer1 = fs.readFileSync(__dirname + '/fixtures/v1-6.mvt'); // note this tile uses zlib coding rather than gzip
    const buffer2 = fs.readFileSync(__dirname + '/fixtures/v1-7.mvt');
    const buffer3 = fs.readFileSync(__dirname + '/fixtures/v1-8.mvt');

    const tiles = [
      {buffer: buffer1, z:3, x:4, y:2},
      {buffer: buffer2, z:3, x:4, y:2},
      {buffer: buffer3, z:2, x:2, y:1}
    ];

    const zxy = {z:4, x:8, y:5};

    composite(tiles, zxy, {buffer_size:4080}, (err, vtBuffer) => {
      assert.notOk(err);
      const outputInfo = vt1infoValid(vtBuffer);
      assert.equal(Object.keys(outputInfo.layers).length, 7, 'v1 tiles with polygons composite successfully');
      assert.end();
    });
  });
}

test('[composite] success: drop layers if "layers" array is in tiles object', function(assert) {
  const tiles = [
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['building', 'poi_label'] }
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.deepEqual(Object.keys(vtinfo(vtBuffer).layers), ['building', 'poi_label'], 'expected layers');
    assert.notEqual(vtBuffer.length, bufferSF.length, 'buffer is not of the same size');
    assert.end();
  });
});

test('[composite] success: composite and drop layers', function(assert) {
  const tiles = [
    { buffer: mvtFixtures.get('059').buffer, z:15, x:5238, y:12666 },
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['building', 'poi_label'] }
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.deepEqual(Object.keys(vtinfo(vtBuffer).layers), ['water', 'building', 'poi_label'], 'expected layers');
    assert.end();
  });
});

test('[composite] success: composite and drop same layer names', function(assert) {
  const tiles = [
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['building'] },
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['poi_label'] }
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.deepEqual(Object.keys(vtinfo(vtBuffer).layers), ['building', 'poi_label'], 'expected layers');
    assert.end();
  });
});

test('[composite] success: composite and drop same layer names reversed', function(assert) {
  const tiles = [
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['poi_label'] },
    { buffer: bufferSF, z:15, x:5238, y:12666, layers: ['building'] }
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.deepEqual(Object.keys(vtinfo(vtBuffer).layers), ['poi_label', 'building'], 'expected layers');
    assert.end();
  });
});

test('[composite] success: empty overzoomed tile returns empty buffer even if compress: true is set', function(assert) {
  const buffer = fs.readFileSync(path.resolve(__dirname+'/fixtures/empty-overzoom-8-33-63.mvt'));
  const tiles = [
    { buffer, z: 8, x: 33, y: 63 }
  ];

  const zxy = { z: 12, x: 543, y: 1019 };

  composite(tiles, zxy, {compress: true}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length, 0, 'zero length buffer');
    assert.end();
  });
});
