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

const bufferEurope = fs.readFileSync(path.resolve(__dirname+'/../../Downloads/i18n-unzipped-3-4-2.mvt'));

test('[internationalize] success - same layer name, same features, same extent, reduced buffer size', function(assert) {
  const initialOutputInfo = vtinfo(bufferEurope);
  const numLayers = Object.keys(initialOutputInfo.layers).length;
  const numFeaturesLayer0 = initialOutputInfo.layers.layer0.length;
  const layer0extent = initialOutputInfo.layers.layer0.extent;
  const numFeaturesLayer1 = initialOutputInfo.layers.layer1.length;
  const layer1extent = initialOutputInfo.layers.layer1.extent;
  const numFeaturesLayer2 = initialOutputInfo.layers.layer2.length;
  const layer2extent = initialOutputInfo.layers.layer2.extent;

  internationalize(bufferEurope, 'es', {}, (err, internationalizedBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(internationalizedBuffer);
    assert.equal(Object.keys(outputInfo.layers).length, numLayers, 'expected number of layers');
    assert.ok(outputInfo.layers.layer0, 'layer0', 'expected layer0 name');
    assert.ok(outputInfo.layers.layer0.extent, layer0extent, 'expected layer0 extent');
    assert.equal(outputInfo.layers.layer0.length, numFeaturesLayer0, 'expected number of features in layer0');
    assert.ok(outputInfo.layers.layer1, 'layer1', 'expected layer1 name');
    assert.ok(outputInfo.layers.layer1.extent, layer1extent, 'expected layer1 extent');
    assert.equal(outputInfo.layers.layer1.length, numFeaturesLayer1, 'expected number of features in layer1');
    assert.ok(outputInfo.layers.layer2, 'layer2', 'expected layer2 name');
    assert.ok(outputInfo.layers.layer2.extent, layer2extent, 'expected layer2 extent');
    assert.equal(outputInfo.layers.layer2.length, numFeaturesLayer2, 'expected number of features in layer2');
    assert.ok(internationalizedBuffer.length < bufferEurope.length, 'expected reduced buffer size')
    assert.end();
  });
});

test('[internationalize] success - feature without name_ or _mbx prefixed properties has same properties', function(assert) {
  const initialOutputInfo = vtinfo(bufferEurope);
  const feature = initialOutputInfo.layers.layer0.feature(0);

  internationalize(bufferEurope, 'es', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.layer0.feature(0);
    assert.deepEqual(feature.properties, internationalizedFeature.properties, 'expected unchanged properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in name_{language} property', function(assert) {
  const initialProperties = {
    "name":"Austria",
    "name_es":"Austria en espanol",
    "name_local":"AUT",
    "_mbx_field_whatever":"dropme"
  };
  const interntationalizedProperties = {
    "name":"Austria en espanol",
    "name_es":"Austria en espanol",
    "name_local":"AUT"
  };
  const initialOutputInfo = vtinfo(bufferEurope);
  const feature = initialOutputInfo.layers.layer1.feature(1);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(bufferEurope, 'es', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.layer1.feature(1);
    assert.deepEqual(internationalizedFeature.properties, interntationalizedProperties, 'expected new name property, dropped hidden property');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in _mbx_name_{language} property', function(assert) {
  const initialProperties = {
    "name":"Denmark",
    "_mbx_name_es":"Denmarkenespanol",
    "name_local":"DNK"
  };
  const interntationalizedProperties = {
    "name":"Denmarkenespanol",
    "name_local":"DNK"
  };
  const initialOutputInfo = vtinfo(bufferEurope);
  const feature = initialOutputInfo.layers.layer2.feature(3);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties')

  internationalize(bufferEurope, 'es', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.layer2.feature(3);
    assert.deepEqual(internationalizedFeature.properties, interntationalizedProperties, 'expected new name property, dropped hidden property');
    assert.end();
  });
});

test('[internationalize] success - _mbx prefixed property keys removed from all layers', function(assert) {
  const layer0Keys = ["ISO_A3","ADMIN","ISO_A2"];
  const layer1Keys = ["name_local","name","_mbx_name_ef","name_es","_mbx_name_ex","_mbx_field_whatever"];
  const layer2Keys = ["name_local","name","_mbx_name_other","_mbx_name_es","name_es","_mbx_other"];
  const layer0KeysExpected = layer0Keys;
  const layer1KeysExpected = ["name_local","name","name_es"];
  const layer2KeysExpected = ["name_local","name","name_es"];

  const initialOutputInfo = vtinfo(bufferEurope);
  assert.deepEqual(initialOutputInfo.layers.layer0._keys, layer0Keys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.layer1._keys, layer1Keys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.layer2._keys, layer2Keys, 'expected initial keys');

  internationalize(bufferEurope, 'es', {}, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.deepEqual(outputInfo.layers.layer0._keys, layer0KeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.layer1._keys, layer1KeysExpected, 'expected dropped keys');
    assert.deepEqual(outputInfo.layers.layer2._keys, layer2KeysExpected, 'expected dropped keys');
    assert.end();
  });
});
