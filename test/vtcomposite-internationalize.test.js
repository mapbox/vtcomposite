'use strict';

const internationalize = require('../lib/index.js').internationalize;
const { vtinfo, getFeatureById } = require('./test-utils.js');

const mvtFixtures = require('@mapbox/mvt-fixtures');

const test = require('tape');
const zlib = require('zlib');

test('[internationalize] success: buffer size stays the same when no changes needed', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;

  internationalize(singlePointBuffer, 'piglatin', null, (err, vtBuffer) => {
    assert.notOk(err);

    const tile = vtinfo(vtBuffer);
    assert.equal(tile.layers.hello.feature(0).id, undefined, 'ID should not be added to feature that does not have one');
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: single gzipped VT', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  internationalize(gzipped_buffer, 'piglatin', null, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: gzipped output', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  internationalize(singlePointBuffer, 'piglatin', null, { compress: true }, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success: gzipped input and output', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  internationalize(gzipped_buffer, 'piglatin', null, { compress: true }, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[internationalize] success - same layer names, same features, same extents', (assert) => {
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

test('[internationalize] success - feature without name_ or _mbx prefixed properties has same properties', (assert) => {
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

test('[internationalize] success - feature with specified language in name_{language} property', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Espana',
    '_mbx_name_de': 'Spanien',
    'name_fr': 'Espagne',
    '_mbx_name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
  };
  const internationalizedProperties = {
    'name': 'Spain',
    'name_local': 'Espana',
    'name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(1);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  internationalize(initialBuffer, 'en', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in _mbx_name_{language} property', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
    '_mbx_name_fr': 'La Allemagne',
    '_mbx_name_de': 'Deutschland',
    '_mbx_other': 'Alemania'
  };
  const internationalizedProperties = {
    'name': 'Deutschland',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  internationalize(initialBuffer, 'de', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - feature with specified language in both name_{language} and _mbx_name_{language} properties', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
    '_mbx_name_fr': 'La Allemagne',
    '_mbx_name_de': 'Deutschland',
    '_mbx_other': 'Alemania'
  };
  const internationalizedProperties = {
    'name': 'Allemagne',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne', // choosing first encountered property in (name_fr, _mbx_name_fr)
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  internationalize(initialBuffer, 'fr', null, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const internationalizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(internationalizedFeature.properties, internationalizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[internationalize] success - _mbx prefixed property keys removed from all layers', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const topLayerKeys = ['population'];
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
  const bottomLayerKeysExpected = ['name_en', 'name_fr', 'name_local', 'name', 'population'];

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

test('[internationalize] success - no language specified', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const topLayerKeys = ['population'];
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
  const bottomLayerKeysExpected = ['name', 'name_en', 'name_fr', 'name_local', 'population'];

  const internationalizedProperties0 = {
    'name': 'Germany',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
  };
  const internationalizedProperties1 = {
    'name': 'Espana',
    'name_local': 'Espana',
    'name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
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

test('[internationalize] worldview - no worldview specified, legacy worldviews split into distinct features', (assert) => {
  // input buffer has a singl features with _mbx_worldview: US,CN,IN,JP
  const buffer = mvtFixtures.get('065').buffer;
  internationalize(buffer, null, null, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 4, 'has four features');
    assert.equal(tile.layers.admin.feature(0).properties.worldview, 'CN', 'expected CN worldview');
    assert.equal(tile.layers.admin.feature(1).properties.worldview, 'IN', 'expected IN worldview');
    assert.equal(tile.layers.admin.feature(2).properties.worldview, 'JP', 'expected JP worldview');
    assert.equal(tile.layers.admin.feature(3).properties.worldview, 'US', 'expected US worldview');
    assert.end();
  });
});

test('[internationalize] worldview - worldview specified, legacy value', (assert) => {
  // input buffer has a single feature with _mbx_worldview: US,CN,IN,JP
  const buffer = mvtFixtures.get('065').buffer;
  internationalize(buffer, null, 'US', (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US',
      name: 'All legacy worldviews',
      name_local: 'All legacy worldviews'
    }, 'expected properties');
    assert.end();
  });
});

test('[internationalize] worldview - no worldview specified, does not create new features for new worldview values', (assert) => {
  // input buffer has a single feature with _mbx_worldview: US,CN,JP,IN,RU,TR,AR,MA
  const buffer = mvtFixtures.get('066').buffer;
  internationalize(buffer, null, null, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 4, 'has four features');
    assert.equal(tile.layers.admin.feature(0).properties.worldview, 'CN', 'expected CN worldview');
    assert.equal(tile.layers.admin.feature(1).properties.worldview, 'IN', 'expected IN worldview');
    assert.equal(tile.layers.admin.feature(2).properties.worldview, 'JP', 'expected JP worldview');
    assert.equal(tile.layers.admin.feature(3).properties.worldview, 'US', 'expected US worldview');
    assert.end();
  });
});

test('[internationalize] worldview - worldview: null specified, feature with _mbx_worldview: "all" is retained', (assert) => {
  // input buffer has a single feature with _mbx_worldview: all
  const buffer = mvtFixtures.get('067').buffer;
  internationalize(buffer, null, null, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'all',
      name: 'Represents all worldviews',
      name_local: 'Represents all worldviews'
    });
    assert.end();
  });
});

test('[internationalize] worldview - worldview: US specified, feature with _mbx_worldview: "all" is retained', (assert) => {
  // input buffer has a single feature with _mbx_worldview: all
  const buffer = mvtFixtures.get('067').buffer;
  internationalize(buffer, null, 'US', (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'all',
      name: 'Represents all worldviews',
      name_local: 'Represents all worldviews'
    });
    assert.end();
  });
});

test('[internationalize] worldview - _mbx_worldview has non-string value, feature is dropped', (assert) => {
  // input buffer has a single feature with _mbx_worldview: 100
  const buffer = mvtFixtures.get('069').buffer;
  internationalize(buffer, null, 'US', (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.equal(Object.keys(tile.layers).length, 0, 'no feature or layers retained');
    assert.end();
  });
});

test('[internationalize] worldview - feature with _mbx_worldview and worldview properties reassigns worldview', (assert) => {
  // input buffer has a single feature with _mbx_worldview: US and worldview: RU
  const buffer = mvtFixtures.get('070').buffer;
  internationalize(buffer, null, 'US', (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US',
      name: 'Conflicting feature',
      name_local: 'Conflicting feature'
    });
    assert.end();
  });
});

test('[internationalize] worldview - worldview is specified but feature has no worldview property, feature is retained', (assert) => {
  const buffer = mvtFixtures.get('017').buffer;
  internationalize(buffer, null, 'US', (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('hello' in tile.layers, 'has admin layer');
    assert.deepEqual(tile.layers.hello.feature(0).properties, {
      hello: 'world'
    }, 'expected properties retained');
    assert.end();
  });
});