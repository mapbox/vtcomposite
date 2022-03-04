const test = require('tape');
const internationalize = require('../lib/index.js').internationalize;
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const vtinfo = require('./test-utils.js').vtinfo;
const vt1infoValid = require('./test-utils.js').vt1infoValid;
const tilebelt = require('@mapbox/tilebelt');


test('[internationalize] success: buffer size stays the same when no changes needed', function(assert) {
  const singlePointBuffer = mvtFixtures.get('002').buffer;

  internationalize(singlePointBuffer, 'piglatin', null, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: single gzipped VT', function(assert) {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  internationalize(gzipped_buffer, 'piglatin', null, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: gzipped output', function(assert) {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  internationalize(singlePointBuffer, 'piglatin', null, {compress:true}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: gzipped input and output', function(assert) {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  internationalize(gzipped_buffer, 'piglatin', null, {compress:true}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success - same layer names, same features, same extents', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const numLayers = Object.keys(initialOutputInfo.layers).length;
  const numFeaturesTopLayer = initialOutputInfo.layers.top.length;
  const topLayerExtent = initialOutputInfo.layers.top.extent;
  const numFeaturesBottomLayer = initialOutputInfo.layers.bottom.length;
  const bottomLayerExtent = initialOutputInfo.layers.bottom.extent;

  internationalize(initialBuffer, 'es', null, (err, internationalizedBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(internationalizedBuffer);
    assert.equal(Object.keys(outputInfo.layers).length, numLayers, 'expected number of layers');
    // first layer
    assert.ok(outputInfo.layers.top, 'top', 'expected top name');
    assert.ok(outputInfo.layers.top.extent, topLayerExtent, 'expected top extent');
    assert.equal(outputInfo.layers.top.length, numFeaturesTopLayer, 'expected number of features in top');
    // second layer
    assert.ok(outputInfo.layers.bottom, 'bottom', 'expected bottom name');
    assert.ok(outputInfo.layers.bottom.extent, bottomLayerExtent, 'expected bottom extent');
    assert.equal(outputInfo.layers.bottom.length, numFeaturesBottomLayer, 'expected number of features in bottom');
    assert.end();
  });
});

test('[internationalize] success - feature without name_ or _mbx prefixed properties has same properties', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const initialFeature = initialOutputInfo.layers.top.feature(0);

  internationalize(initialBuffer, 'es', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.top.feature(0);
    assert.deepEqual(initialFeature.properties, internationalizedFeature.properties, 'expected unchanged properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in name_{language} property', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    "name":"Espana",
    "_mbx_name_de": "Spanien",
    "name_fr": "Espagne",
    "_mbx_name_fr": "Espagne",
    "name_en": "Spain",
    "population": 20
  };
  const internationalizedProperties = {
    "name":"Spain",
    "name_local":"Espana",
    "name_fr": "Espagne",
    "name_en": "Spain",
    "population": 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(1);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'en', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in _mbx_name_{language} property', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    "name":"Germany",
    "name_en":"Germany",
    "name_fr": "Allemagne",
    "_mbx_name_fr": "La Allemagne",
    "_mbx_name_de": "Deutschland",
    "_mbx_other": "Alemania"
  };
  const internationalizedProperties = {
    "name":"Deutschland",
    "name_local":"Germany",
    "name_en":"Germany",
    "name_fr": "Allemagne",
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'de', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in both name_{language} and _mbx_name_{language} properties', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    "name": "Germany",
    "name_en": "Germany",
    "name_fr": "Allemagne",
    "_mbx_name_fr": "La Allemagne",
    "_mbx_name_de": "Deutschland",
    "_mbx_other": "Alemania"
  };
  const internationalizedProperties = {
    "name": "Allemagne",
    "name_local": "Germany",
    "name_en": "Germany",
    "name_fr": "Allemagne",
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'fr', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - _mbx prefixed property keys removed from all layers', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const topLayerKeys = ["population"];
  const bottomLayerKeys = [
      'name',
      'name_en',
      'name_fr',
      '_mbx_name_fr',
      '_mbx_name_de',
      '_mbx_other',
      'population'
    ];
  const topLayerKeysExpected = topLayerKeys;
  const bottomLayerKeysExpected = [ 'name_en', 'name_fr', 'name_local', 'name', 'population' ];

  const initialOutputInfo = vtinfo(initialBuffer);
  assert.deepEqual(initialOutputInfo.layers.top._keys, topLayerKeys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.bottom._keys, bottomLayerKeys, 'expected initial keys');

  internationalize(initialBuffer, 'gr', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.deepEqual(outputInfo.layers.top._keys, topLayerKeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.bottom._keys, bottomLayerKeysExpected, 'expected added name_local, dropped _mbx keys');
    assert.end();
  });
});

test('[internationalize] success - no language specified', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const topLayerKeys = ["population"];
  const bottomLayerKeys = [
      'name',
      'name_en',
      'name_fr',
      '_mbx_name_fr',
      '_mbx_name_de',
      '_mbx_other',
      'population'
    ];
  const topLayerKeysExpected = topLayerKeys;
  const bottomLayerKeysExpected = [ 'name', 'name_en', 'name_fr', 'name_local', 'population' ];

  const internationalizedProperties0 = {
    "name": "Germany",
    "name_local": "Germany",
    "name_en": "Germany",
    "name_fr": "Allemagne",
  };
  const internationalizedProperties1 = {
    "name":"Espana",
    "name_local":"Espana",
    "name_fr": "Espagne",
    "name_en": "Spain",
    "population": 20
  };

  const initialOutputInfo = vtinfo(initialBuffer);
  assert.deepEqual(initialOutputInfo.layers.top._keys, topLayerKeys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.bottom._keys, bottomLayerKeys, 'expected initial keys');

  internationalize(initialBuffer, null, null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature0 = outputInfo.layers.bottom.feature(0);
    const internationalizedFeature1 = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(internationalizedFeature0.properties, internationalizedProperties0, 'expected same name, dropped _mbx properties');
    assert.deepEqual(internationalizedFeature1.properties, internationalizedProperties1, 'expected same name, dropped _mbx properties');
    assert.deepEqual(outputInfo.layers.top._keys, topLayerKeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.bottom._keys, bottomLayerKeysExpected, 'expected dropped _mbx keys');
    assert.end();
  });
});
