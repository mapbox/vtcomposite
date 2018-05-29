var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var mvtFixtures = require('@mapbox/mvt-fixtures');
var vt = require('@mapbox/vector-tile').VectorTile;
var pbf = require('pbf');
var geoData = require('./fixtures/four-points.js');


function long2tile(lon,zoom) { 
  return (((lon+180)/360*Math.pow(2,zoom))); 
}

function lat2tile(lat,zoom)  { 
  return (((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); 
}

function vtinfo(buffer) {
  var tile = new vt(new pbf(buffer));
  return tile;
}

var bufferSF = fs.readFileSync(path.resolve(__dirname+'/../node_modules/@mapbox/mvt-fixtures/real-world/sanfrancisco/15-5238-12666.mvt'));


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

test('[composite] success compositing - different layer name, different features, same zoom', function(assert) {
  const buffer1 = mvtFixtures.get('017').buffer;
  const buffer2 = mvtFixtures.get('053').buffer;

  const tiles = [
    {buffer: buffer1, z:15, x:5238, y:12666},
    {buffer: buffer2, z:15, x:5238, y:12666}
  ];

  const zxy = {z:15, x:5238, y:12666};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);

    assert.ok(outputInfo.layers.hello, 'expected layer name');
    assert.ok(outputInfo.layers['clipped-square'], 'expected layer name');
    assert.equal(Object.keys(outputInfo.layers).length, 2, 'expected number of layers');
    assert.notOk(err);
    assert.end();
  });
});

var gzipped_bufferSF = zlib.gzipSync(bufferSF);

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

// FUNCTION PARAM VALIDATION

test('failure: fails without callback function', assert => {
  try {

composite();
  } catch(err) {
    assert.ok(/last argument must be a callback function/.test(err.message), 'expected error message');
    assert.end();
  }
});

// TESTS FOR BUFFER OBJECT!

test('failure: buffers is not an array', assert => {
  composite('i am not an array', {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'first arg \'tiles\' must be an array of tile objects');
    assert.end();
  });
});

test('failure: buffers array is empty', assert => {
  const buffs = [];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'tiles\' array must be of length greater than 0');
    assert.end();
  });
});

test('failure: item in buffers array is not an object', assert => {
  const buffs = [
    'not an object'
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'items in \'tiles\' array must be objects');
    assert.end();
  });
});

test('failure: buffer value does not exist', assert => {
  const buffs = [
    {
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a buffer value');
    assert.end();
  });
});

test('failure: buffer value is null', assert => {
  const buffs = [
    {
      buffer: null,
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'buffer value in \'tiles\' array item is null or undefined');
    assert.end();
  });
});

test('failure: buffer value is not a buffer', assert => {
  const buffs = [
    {
      buffer: 'not a buffer',
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'buffer value in \'tiles\' array item is not a true buffer');
    assert.end();
  });
});

test('failure: buffer object missing z value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      // z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'z\' value');
    assert.end();
  });
});

test('failure: buffer object missing x value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      // x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'x\' value');
    assert.end();
  });
});

test('failure: buffer object missing y value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      // y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'y\' value');
    assert.end();
  });
});

test('failure: buffer object z value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 'zero',
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: buffer object x value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 'zero',
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: buffer object y value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 'zero'
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: buffer object z value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: -10,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value must not be less than zero');
    assert.end();
  });
});

test('failure: buffer object x value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: -5,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value must not be less than zero');
    assert.end();
  });
});

test('failure: buffer object y value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: -4
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value must not be less than zero');
    assert.end();
  });
});

// TESTS FOR ZXY MAP REQUEST!

test('failure: map request zxy missing z value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'z\' value');
    assert.end();
  });
});

test('failure: map request zxy missing x value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      // x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'x\' value');
    assert.end();
  });
});

test('failure: map request zxy missing y value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      // y: 0
    }
  ];
  composite(buffs, {z:3, x:1}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'y\' value');
    assert.end();
  });
});

test('failure: map request zxy z value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:'zero', x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: map request zxy x value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:'zero', y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: map request zxy y value is not a number', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:'zero'}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not a number');
    assert.end();
  });
});

test('failure: map request zxy z value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 10,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:-3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value must not be less than zero');
    assert.end();
  });
});

test('failure: map request zxy x value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:-1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value must not be less than zero');
    assert.end();
  });
});

test('failure: map request zxy y value is negative', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1, y:-4}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value must not be less than zero');
    assert.end();
  });
});

// TEST OVERZOOMING

// TEST 1
// overzooming success test - different zooms between two tiles. use a single buffer - don't need to composite two buffers at all.
//pass one in - put in 0/0/0 tile and ask for 1/0/0 --> assume got rid of 3/4 of data, have one point in each quadrant -- assert output has a single point


test('[composite] overzooming success - different zooms between two tiles', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/four-points-quadrants.mvt');

  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 4);
  const originalGeometry = info.layers.quadrants.feature(0).loadGeometry()[0][0];

  const tiles = [
    {buffer: buffer1, z:0, x:0, y:0}
  ];

  const zxy = {z:1, x:0, y:0};

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.quadrants.length, 1,'clips all but one feature when overzooming');
    assert.deepEqual(
      outputInfo.layers.quadrants.feature(0).loadGeometry(),
      [ [ { x: 1280, y: 1664 } ] ],
      'first feature scales as expected'
    );

    assert.deepEqual(
      {x:originalGeometry.x *2, y:originalGeometry.y *2},
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][0],
      'check that new coordinates are 2x original coordinates (since zoom factor is 2)'
    );

    assert.end();
  });
});

test('[composite] overzooming success points - overzooming zoom factor of 4 between two tiles', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/four-points-quadrants.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 4);
  
  const originalGeometry = info.layers.quadrants.feature(0).loadGeometry()[0][0];
  const tiles = [
    {buffer: buffer1, z:0, x:0, y:0}
  ];

  const zxy = {z:3, x:1, y:1};

  const long = geoData.features[0].geometry.coordinates[0];
  const lat = geoData.features[0].geometry.coordinates[1];
  const longInt = Math.round(parseFloat('.' + (long2tile(long,zxy.z)).toString().split('.')[1])*4096);
  const latInt = Math.round(parseFloat('.' + (lat2tile(lat,zxy.z)).toString().split('.')[1])*4096);

  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);

    assert.equal(outputInfo.layers.quadrants.length, 1,'clips all but one feature when overzooming');

    assert.deepEqual(
      outputInfo.layers.quadrants.feature(0).loadGeometry(), 
      [ [ { x: 1024, y: 2560  } ] ], 
      'first feature scales as expected'
    );

    assert.deepEqual(
      {x:longInt, y:latInt}, 
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][0],
      'check that new coordinates shifted properly (since zoom factor is 3)'
    ); 

    assert.end();
  });
});
