'use strict'

var test = require('tape');
var module = require('../lib/index.js');

test('failure: fails without callback function', assert => {
  try {
    module.composite();
  } catch(err) {
    assert.ok(/last argument must be a callback function/.test(err.message), 'expected error message');
    assert.end();
  }
});
