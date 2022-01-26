const test = require('tape');
const internationalize = require('../lib/index.js').internationalize;
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const vtinfo = require('./test-utils.js').vtinfo;
const vt1infoValid = require('./test-utils.js').vt1infoValid;
const tilebelt = require('@mapbox/tilebelt');

const bufferSF = fs.readFileSync(path.resolve(__dirname+'/../node_modules/@mapbox/mvt-fixtures/real-world/sanfrancisco/15-5238-12666.mvt'));

test('[internationalize] success: buffer size stays the same when no changes needed', function(assert) {

  internationalize(bufferSF, 'piglatin', {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length, bufferSF.length, 'same size');
    assert.end();
  });
});

const gzipped_bufferSF = zlib.gzipSync(bufferSF);

test('[internationalize] success: single gzipped VT', function(assert) {

  internationalize(gzipped_bufferSF, 'piglatin', {}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length, zlib.gunzipSync(gzipped_bufferSF).length, 'same size');
    assert.end();
  });
});

test('[internationalize] success: gzipped output', function(assert) {

  internationalize(bufferSF, 'piglatin', {compress:true}, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length, bufferSF.length, 'same size');
    assert.end();
  });
});

test('[internationalize] success - same layer names, same features, same extents, reduced buffer size', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const numLayers = Object.keys(initialOutputInfo.layers).length;
  const numFeaturesTopLayer = initialOutputInfo.layers.top.length;
  const topLayerExtent = initialOutputInfo.layers.top.extent;
  const numFeaturesBottomLayer = initialOutputInfo.layers.bottom.length;
  const bottomLayerExtent = initialOutputInfo.layers.bottom.extent;

  internationalize(initialBuffer, 'es', {}, (err, internationalizedBuffer) => {
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
    assert.ok(internationalizedBuffer.length < initialBuffer.length, 'expected reduced buffer size')
    assert.end();
  });
});

test('[internationalize] success - feature without name_ or _mbx prefixed properties has same properties', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const initialFeature = initialOutputInfo.layers.top.feature(0);

  internationalize(initialBuffer, 'es', {}, (err, vtBuffer) => {
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
    "name":"Germany",
    "name_local":"Germany",
    "name_en": "Germany",
    "name_fr": "Allemagne",
    "population": 20
  };
  const internationalizedProperties = {
    "name":"Allemagne",
    "name_local":"Germany",
    "name_en": "Germany",
    "name_fr": "Allemagne",
    "population": 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(1);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'fr', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected new name property, dropped hidden property');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in _mbx_name_{language} property', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    "name":"Germany",
    "name_local":"Germany",
    "_mbx_name_fr": "Allemagne",
    "_mbx_name_gr": "Deutschland",
    "population": 20
  };
  const internationalizedProperties = {
    "name":"Deutschland",
    "name_local":"Germany",
    "population": 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(2);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'gr', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(2);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected new name property, dropped hidden property');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in both name_{language} and _mbx_name_{language} properties', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    "name":"Germany",
    "name_local":"Germany",
    "name_en":"Germany",
    "name_fr":"Allemagne",
    "_mbx_name_fr": "Allemagne",
    "_mbx_name_gr": "Deutschland",
    "_mbx_other": "Alemania",
    "population": 20
  };
  const internationalizedProperties = {
    "name":"Allemagne",
    "name_local":"Germany",
    "name_en":"Germany",
    "name_fr":"Allemagne",
    "population": 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(initialBuffer, 'fr', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected new name property, dropped hidden property');
    assert.end();
  });
});

test('[internationalize] success - _mbx prefixed property keys removed from all layers', function(assert) {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const topLayerKeys = ["population"];
  const bottomLayerKeys = [
      'name',
      'name_local',
      'name_en',
      'name_fr',
      '_mbx_name_fr',
      '_mbx_name_gr',
      '_mbx_other',
      'population'
    ];
  const topLayerKeysExpected = topLayerKeys;
  const bottomLayerKeysExpected = [ 'name_local', 'name_en', 'name_fr', 'name', 'population' ];

  const initialOutputInfo = vtinfo(initialBuffer);
  assert.deepEqual(initialOutputInfo.layers.top._keys, topLayerKeys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.bottom._keys, bottomLayerKeys, 'expected initial keys');

  internationalize(initialBuffer, 'gr', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.deepEqual(outputInfo.layers.top._keys, topLayerKeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.bottom._keys, bottomLayerKeysExpected, 'expected dropped keys');
    assert.end();
  });
});
