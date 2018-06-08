const test = require('tape');
const composite = require('../lib/index.js');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const vtinfo = require('./test-utils.js');

const bufferSF = fs.readFileSync(path.resolve(__dirname+'/../node_modules/@mapbox/mvt-fixtures/real-world/sanfrancisco/15-5238-12666.mvt'));

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
    const outputInfo = vtinfo(vtBuffer);

    assert.ok(outputInfo.layers.hello, 'hello', 'expected layer name');
    assert.equal(Object.keys(outputInfo.layers).length, 1, 'expected number of layers');
    assert.equal(outputInfo.layers.hello.length, 1, 'expected number of features');
    assert.notOk(err);
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
    const outputInfo = vtinfo(vtBuffer);

    assert.ok(outputInfo.layers.water, 'returns layer water');
    assert.equal(Object.keys(outputInfo.layers).length, 1, 'return 1 layers');
    assert.equal(outputInfo.layers.water.length, 1, 'only has one feature');
    assert.equal(outputInfo.layers.water.feature(0).properties.name, 'mud lake', 'expected feature');
    assert.notOk(err);
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









