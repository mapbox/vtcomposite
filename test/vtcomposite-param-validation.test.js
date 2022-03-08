var test = require('tape');
var vt = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var mvtFixtures = require('@mapbox/mvt-fixtures');

const composite = vt.composite;
const internationalize = vt.internationalize;

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
      buffer: new Buffer(10),
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
      buffer: new Buffer(10),
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

test('[internationalize] failure: not enough arguments', assert => {
  try {
    internationalize();
  } catch(err) {
    assert.ok(err);
    assert.equal(err.message, 'expected buffer, language, worldview, options and callback arguments', 'expected error message');
    assert.end();
  }
});

test('[internationalize] failure: too many arguments', assert => {
  try {
    internationalize(Buffer.from('hello world'), 'en', null, { compress: false }, 4, function (err, result) { });
  } catch(err) {
    assert.ok(err);
    assert.equal(err.message, 'expected buffer, language, worldview, options and callback arguments', 'expected error message');
    assert.end();
  }
});

test('[internationalize] failure: callback is not a function', assert => {
  try {
    internationalize(Buffer.from('hello world'), 'en', 'AD', { compress: false }, 4);
  } catch(err) {
    assert.ok(err);
    assert.ok(/last argument must be a callback function/.test(err.message), 'expected error message');
    assert.end();
  }
});

test('[internationalize] failure: buffer is not an object', assert => {
  internationalize(1, 'en', 'AD', { compress: false }, function (err, result) {
    assert.ok(err);
    assert.ok(/first argument must be Buffer object/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: buffer is null', assert => {
  internationalize(null, 'en', 'AD', { compress: false }, function (err, result) {
    assert.ok(err);
    assert.ok(/first argument must be Buffer object/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: buffer is undefined', assert => {
  internationalize(undefined, 'en', 'AD', { compress: false }, function (err, result) {
    assert.ok(err);
    assert.ok(/first argument must be Buffer object/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: buffer is not a true buffer', assert => {
  internationalize('not a buffer', 'en', 'AD',{ compress: false },function(err, result) {
    assert.ok(err);
    assert.ok(/first argument must be Buffer object/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: language is an integer', assert => {
  internationalize(Buffer.from('hello world'), 1, 'AD', { compress: false }, function (err, result) {
    assert.ok(err);
    assert.ok(/language value must be null or a string/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: language is an empty string', assert => {
  internationalize(Buffer.from('hello world'), '', 'AD', { compress: false }, function (err, result) {
    assert.ok(err);
    assert.ok(/language value is an empty string/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: options is not an object', assert => {
  internationalize(Buffer.from('hello world'), 'en', 'AD', 1, function (err, result) {
    assert.ok(err);
    assert.ok(/'options' arg must be an object/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] failure: options.compress is not a boolean', assert => {
  internationalize(Buffer.from('hello world'), 'en', 'AD', { compress: 1 }, function (err, result) {
    assert.ok(err);
    assert.ok(/'compress' must be a boolean/.test(err.message), 'expected error message');
    assert.end();
  });
});

test('[internationalize] success: options may be omitted', assert => {
  internationalize(mvtFixtures.get('002').buffer, 'en', 'AD', function (err, result) {
    assert.notOk(err);
    assert.end();
  });
});

test('[internationalize] success: options may be empty', assert => {
  internationalize(mvtFixtures.get('002').buffer, 'en', 'AD', { }, function (err, result) {
    assert.notOk(err);
    assert.end();
  });
});

test('[internationalize] success: worldview is not 2 characters long', assert => {
  assert.plan(6);
  internationalize(mvtFixtures.get('002').buffer, 'en', '', function (err) {
    assert.ok(err);
    assert.equal(err.message, 'worldview must be a string 2 characters long');
  });

  internationalize(mvtFixtures.get('002').buffer, 'en', 'z', function (err) {
    assert.ok(err);
    assert.equal(err.message, 'worldview must be a string 2 characters long');
  });

  internationalize(mvtFixtures.get('002').buffer, 'en', 'abc', function (err) {
    assert.ok(err);
    assert.equal(err.message, 'worldview must be a string 2 characters long');
  });
});

test('[internationalize] success: worldview is not a string', assert => {
  internationalize(mvtFixtures.get('002').buffer, 'en', 100, function (err) {
    assert.ok(err);
    assert.equal(err.message, 'worldview value must be null or a 2 character string');
    assert.end();
  });
});