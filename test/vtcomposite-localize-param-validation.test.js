'use strict';

const test = require('tape');
const vt = require('../lib/index.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');

const localize = vt.localize;

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

test('[localize] params.buffer', (assert) => {
  localize({
    // buffer: // not defined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer is required', 'expected error message');
  });

  localize({
    buffer: 1, // not a buffer
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: null, // set to "null"
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: undefined, // set to "undefined"
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer must be a Buffer', 'expected error message');
  });

  localize({
    buffer: Object(), // not a true buffer
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.buffer is not a true Buffer', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    language: 1
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language must be null or a string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    language: '' // empty string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language cannot be an empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language_property', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    language: 'es',
    language_property: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    language: 'es',
    language_property: null // null value
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language_prefix', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    language: 'es',
    language_prefix: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    language: 'es',
    language_prefix: null // null value
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldviews', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldviews: 1 // not an array
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview must be an array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: [1, 2, 3] // array with non-strings
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview must be an array of strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['USA'] // array with >2 char strings
  }, (err) => {
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
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_property must be a string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.compress', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    compress: 1 // not a boolean
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.compress must be a boolean', 'expected error message');
  });

  assert.end();
});
