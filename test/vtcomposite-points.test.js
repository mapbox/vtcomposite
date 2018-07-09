var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var mvtFixtures = require('@mapbox/mvt-fixtures');
var geoData = require('./fixtures/four-points.js');
var vtinfo = require('./test-utils.js');

// can replace long2tile and lat2tile with existing lib 

function long2tile(lon,zoom) { 
  return (((lon+180)/360*Math.pow(2,zoom))); 
}

function lat2tile(lat,zoom)  { 
  return (((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); 
}

test('[composite] success compositing - different layer name, different features, same zoom, no buffer', function(assert) {
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

test('[composite] success overzooming - different zooms between two tiles, no buffer', function(assert) {
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

test('[composite] overzooming success - overzooming zoom factor of 4 between two tiles, no buffer', function(assert) {
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
