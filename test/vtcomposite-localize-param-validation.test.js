'use strict';

const test = require('tape');
const vt = require('../lib/index.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');

const localize = vt.localize;

test('[localize] success with all parameters', (assert) => {
  localize({
    buffer: mvtFixtures.get('064').buffer,
    languages: ['en'],
    language_property: 'lang',
    language_prefix: 'blah',
    worldviews: ['US'],
    worldview_property: 'wv',
    worldview_prefix: 'whatever',
    class_property: 'klass',
    class_prefix: 'sth',
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

test('[localize] params.languages', (assert) => {
  localize({
    buffer: Buffer.from('hi'),
    languages: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: 1
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: '' // empty string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: 'hi'
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: []
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: [1, 2, 3]
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: ['hi', null]
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: [undefined, 'hi']
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('hi'),
    languages: ['hi', '']
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.languages must be an array of non-empty strings', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language_property', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_property: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_property: null // null value
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_property: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_property: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_property must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.language_prefix', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_prefix: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_prefix: null // null value
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_prefix: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    languages: ['es'],
    language_prefix: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.language_prefix must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldviews', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldviews: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: 1 // not an array
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: 'US'
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: []
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be a non-empty array', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: [1, 2, 3]
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['hi', null]
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: [undefined, 'howdy']
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be an array of non-empty strings', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['howdy', '']
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldviews must be an array of non-empty strings', 'expected error message');
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
    assert.equal(err.message, 'params.worldview_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_property: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_property: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_property: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_property must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldview_prefix', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_prefix: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_prefix: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_prefix: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldviews: ['US'],
    worldview_prefix: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_prefix must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.worldview_default', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    worldview_default: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_default must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldview_default: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_default must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldview_default: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_default must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    worldview_default: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.worldview_default must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.class_property', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    class_property: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_property: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_property: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_property must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_property: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_property must be a non-empty string', 'expected error message');
  });

  assert.end();
});

test('[localize] params.class_prefix', (assert) => {
  localize({
    buffer: Buffer.from('howdy'),
    class_prefix: 1 // not a string
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_prefix: null
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_prefix: undefined
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_prefix must be a non-empty string', 'expected error message');
  });

  localize({
    buffer: Buffer.from('howdy'),
    class_prefix: ''
  }, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'params.class_prefix must be a non-empty string', 'expected error message');
  });

  assert.end();
});

// test('[localize] params.compress', (assert) => {
//   localize({
//     buffer: Buffer.from('howdy'),
//     compress: 1 // not a boolean
//   }, (err) => {
//     assert.ok(err);
//     assert.equal(err.message, 'params.compress must be a boolean', 'expected error message');
//   });
//
//   assert.end();
// });
