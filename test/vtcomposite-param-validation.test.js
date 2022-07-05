var test = require('tape');
var vt = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var mvtFixtures = require('@mapbox/mvt-fixtures');

const composite = vt.composite;
const localize = vt.localize;

test('[composite] failure: fails without callback function', assert => {
  try {
    composite();
  } catch(err) {
    assert.ok(/last argument must be a callback function/.test(err.message), 'expected error message');
    assert.end();
  }
});

test('[composite] failure: buffers is not an array', assert => {
  composite('i am not an array', {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'first arg \'tiles\' must be an array of tile objects');
    assert.end();
  });
});

test('[composite] failure: buffers array is empty', assert => {
  const buffs = [];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'tiles\' array must be of length greater than 0');
    assert.end();
  });
});

test('[composite] failure: item in buffers array is not an object', assert => {
  const buffs = [
    'not an object'
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'items in \'tiles\' array must be objects');
    assert.end();
  });
});

test('[composite] failure: buffer value does not exist', assert => {
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

test('[composite] failure: buffer value is null', assert => {
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

test('[composite] failure: buffer value is not a buffer', assert => {
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

test('[composite] failure: buffer object missing z value', assert => {
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

test('[composite] failure: buffer object missing x value', assert => {
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

test('[composite] failure: buffer object missing y value', assert => {
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

test('[composite] failure: buffer object z value is not an int32', assert => {
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
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object x value is not an int32', assert => {
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
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object y value is not an int32', assert => {
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
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object z value is negative', assert => {
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

test('[composite] failure: buffer object x value is negative', assert => {
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

test('[composite] failure: buffer object y value is negative', assert => {
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

test('[composite] failure: layers option is not an array', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: 'not an array'
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'layers\' value in the \'tiles\' array must be an array');
    assert.end();
  });
});

test('[composite] failure: layers option is an empty array', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: []
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'layers\' array must be of length greater than 0');
    assert.end();
  });
});

test('[composite] failure: layers option is an array with invalid types (not strings)', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: [1, 2, 3, 'correct']
    }
  ];
  composite(buffs, {z:3, x:1, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'items in \'layers\' array must be strings');
    assert.end();
  });
});

// TESTS FOR ZXY MAP REQUEST!

test('[composite] failure: map request zxy missing z value', assert => {
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

test('[composite] failure: map request zxy missing x value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, y:0}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'x\' value');
    assert.end();
  });
});

test('[composite] failure: map request zxy missing y value', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:3, x:1}, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'y\' value');
    assert.end();
  });
});

test('[composite] failure: map request zxy z value is not an int32', assert => {
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
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy x value is not an int32', assert => {
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
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy y value is not an int32', assert => {
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
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy z value is negative', assert => {
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

test('[composite] failure: map request zxy x value is negative', assert => {
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

test('[composite] failure: map request zxy y value is negative', assert => {
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

test('[composite] failure: map request zxy is not an object', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, true, {}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'zxy_maprequest\' must be an object');
    assert.end();
  });
});

test('[composite] failure: compress must be a boolean', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:0, x:0, y:0}, {compress:'hi'}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'compress\' must be a boolean');
    assert.end();
  });
});

test('[composite] failure: options must be an object', assert => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:0, x:0, y:0}, true, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'options\' arg must be an object');
    assert.end();
  });
});

test('[composite] failure: buffer size is not int32', assert => {
  const buffs = [
    {
      buffer: new Buffer.alloc(10),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:0, x:0, y:0}, {buffer_size:'hi'}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'buffer_size\' must be an int32');
    assert.end();
  });
});

test('[composite] failure: buffer size is not positive int32', assert => {
  const buffs = [
    {
      buffer: new Buffer.alloc(10),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, {z:0, x:0, y:0}, {buffer_size:-10}, function(err, result) {
    assert.ok(err);
    assert.equal(err.message, '\'buffer_size\' must be a positive int32');
    assert.end();
  });
});

test('[localize] success with all parameters', (assert) => {
  localize({
    buffer: mvtFixtures.get('064').buffer,
    language: 'en',
    worldviews: ['US'],
    worldview_property: '_mbx_worldview',
    compress: true
  }, (err, buffer) => {
    assert.ifError(err);
    assert.ok(buffer);
    assert.end();
  });
});

test('[localize] parameter validation', (assert) => {
  assert.throws(() => {
    localize();
  }, /expected params and callback arguments/);
  assert.throws(() => {
    localize(Object(), Function(), 'something extra');
  }, /expected params and callback arguments/);
  assert.throws(() => {
    localize('not an object', Function());
  }, /first argument must be an object/);
  assert.throws(() => {
    localize(Object(), 'not a function');
  }, /second argument must be a callback function/);
  assert.end();
});

test('[localize] params.buffer', assert => {
  localize({
    // buffer: // not defined
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer is required', 'expected error message');
  });

  localize({
    buffer: 1, // not a buffer
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: null, // set to "null"
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: undefined, // set to "undefined"
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: Object(), // not a true buffer
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer is not a true Buffer', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    language: 1
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.language must be null or a string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    language: '' // empty string
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.language cannot be an empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldviews', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldviews: 1 // not an array
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview must be an array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: [1, 2, 3] // array with non-strings
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview must be an array of strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['USA'] // array with >2 char strings
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview items must be strings of 2 characters', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldview_property', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_property: 1 // not a string
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_property must be a string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.compress', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    compress: 1 // not a boolean
  }, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'params.compress must be a boolean', 'expected error message');
  });

  assert.end();
});