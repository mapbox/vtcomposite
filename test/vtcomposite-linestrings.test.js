var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var mvtFixtures = require('@mapbox/mvt-fixtures');
var vtinfo = require('./test-utils.js');

test('[composite] overzooming success (linestring), no buffer - different zooms between two tiles', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/simple-line.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 1);
  const originalGeometryLineStringPoint1 = info.layers.quadrants.feature(0).loadGeometry()[0][0];
  const originalGeometryLineStringPoint2 = info.layers.quadrants.feature(0).loadGeometry()[0][1];

  const tiles = [
    {buffer: buffer1, z:0, x:0, y:0}
  ];

  const zxy = {z:1, x:0, y:0};

  composite(tiles, zxy, {buffer_size:128}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);

    assert.deepEqual(
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][0], 
      { x: 784, y: 1848 }, 
      'first feature scales as expected'
    );

    assert.deepEqual(
      { x: 4224, y: 3398 }, 
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][1],
      'check that new coordinates shifted properly (since zoom factor is 3)'
    ); 

    assert.end();
  });
});

test('[composite] overzooming success (linestring), with buffer - different zooms between two tiles', function(assert) {
  const buffer1 = fs.readFileSync(__dirname + '/fixtures/simple-line.mvt');
  const info = vtinfo(buffer1);
  assert.equal(info.layers.quadrants.length, 1);
  const originalGeometryLineStringPoint1 = info.layers.quadrants.feature(0).loadGeometry()[0][0];
  const originalGeometryLineStringPoint2 = info.layers.quadrants.feature(0).loadGeometry()[0][1];

  const tiles = [
    {buffer: buffer1, z:0, x:0, y:0}
  ];

  const zxy = {z:1, x:0, y:0};

  composite(tiles, zxy, {buffer_size:128}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);

    assert.deepEqual(
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][0], 
      { x: 784, y: 1848 }, 
      'first feature scales as expected'
    );

    assert.deepEqual(
      { x: 4224, y: 3398 }, 
      outputInfo.layers.quadrants.feature(0).loadGeometry()[0][1],
      'check that new coordinates shifted properly (since zoom factor is 3)'
    ); 

    assert.end();
  });
});