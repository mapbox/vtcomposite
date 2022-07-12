'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo, getFeatureById } = require('./test-utils.js');

const mvtFixtures = require('@mapbox/mvt-fixtures');

const test = require('tape');
const zlib = require('zlib');

test('[localize] success: buffer size stays the same when no changes needed', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const params = {
    buffer: singlePointBuffer,
    language: 'piglatin'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const tile = vtinfo(vtBuffer);
    assert.equal(tile.layers.hello.feature(0).id, undefined, 'ID should not be added to feature that does not have one');
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[localize] success: single gzipped VT', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  const params = {
    buffer: gzipped_buffer,
    language: 'piglatin'
  };
  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(vtBuffer.length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[localize] success: gzipped output', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const params = {
    buffer: singlePointBuffer,
    language: 'piglatin',
    compress: true
  };
  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[localize] success: gzipped input and output', (assert) => {
  const singlePointBuffer = mvtFixtures.get('002').buffer;
  const gzipped_buffer = zlib.gzipSync(singlePointBuffer);
  const params = {
    buffer: gzipped_buffer,
    language: 'piglatin',
    compress: true
  };
  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    assert.equal(zlib.gunzipSync(vtBuffer).length - 3, singlePointBuffer.length, 'same size (with expected 3 byte difference due to explicit 4096 extent in output)');
    assert.end();
  });
});

test('[localize] success - same layer names, same features, same extents', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const numLayers = Object.keys(initialOutputInfo.layers).length;
  const numFeaturesTopLayer = initialOutputInfo.layers.top.length;
  const topLayerExtent = initialOutputInfo.layers.top.extent;
  const numFeaturesBottomLayer = initialOutputInfo.layers.bottom.length;
  const bottomLayerExtent = initialOutputInfo.layers.bottom.extent;
  const params = {
    buffer: initialBuffer,
    language: 'es'
  };

  localize(params, (err, localizedBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(localizedBuffer);
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

test('[localize] success - feature without name_ or _mbx prefixed properties has same properties', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialOutputInfo = vtinfo(initialBuffer);
  const initialFeature = initialOutputInfo.layers.top.feature(0);
  const params = {
    buffer: initialBuffer,
    language: 'es'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const localizedFeature = outputInfo.layers.top.feature(0);
    assert.deepEqual(initialFeature.properties, localizedFeature.properties, 'expected unchanged properties');
    assert.end();
  });
});

test('[localize] success - feature with specified language in name_{language} property', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Espana',
    '_mbx_name_de': 'Spanien',
    'name_fr': 'Espagne',
    '_mbx_name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
  };
  const localizedProperties = {
    'name': 'Spain',
    'name_local': 'Espana',
    'name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(1);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  const params = {
    buffer: initialBuffer,
    language: 'en'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const localizedFeature = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(localizedFeature.properties, localizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[localize] success - feature with specified language in _mbx_name_{language} property', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
    '_mbx_name_fr': 'La Allemagne',
    '_mbx_name_de': 'Deutschland',
    '_mbx_other': 'Alemania'
  };
  const localizedProperties = {
    'name': 'Deutschland',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  const params = {
    buffer: initialBuffer,
    language: 'de'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const localizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(localizedFeature.properties, localizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[localize] success - feature with specified language in both name_{language} and _mbx_name_{language} properties', (assert) => {
  const initialBuffer = mvtFixtures.get('063').buffer;
  const initialProperties = {
    'name': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
    '_mbx_name_fr': 'La Allemagne',
    '_mbx_name_de': 'Deutschland',
    '_mbx_other': 'Alemania'
  };
  const localizedProperties = {
    'name': 'Allemagne',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne', // choosing first encountered property in (name_fr, _mbx_name_fr)
  };
  const initialOutputInfo = vtinfo(initialBuffer);
  const feature = initialOutputInfo.layers.bottom.feature(0);
  assert.deepEqual(feature.properties, initialProperties, 'expected initial properties');

  const params = {
    buffer: initialBuffer,
    language: 'fr'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const localizedFeature = outputInfo.layers.bottom.feature(0);
    assert.deepEqual(localizedFeature.properties, localizedProperties, 'expected name_local, updated name, dropped _mbx properties');
    assert.end();
  });
});

test('[localize] success - _mbx prefixed property keys removed from all layers', (assert) => {
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

  const params = {
    buffer: initialBuffer,
    language: 'gr'
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    assert.deepEqual(outputInfo.layers.top._keys, topLayerKeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.bottom._keys, bottomLayerKeysExpected, 'expected added name_local, dropped _mbx keys');
    assert.end();
  });
});

test('[localize] success - no language specified', (assert) => {
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

  const localizedProperties0 = {
    'name': 'Germany',
    'name_local': 'Germany',
    'name_en': 'Germany',
    'name_fr': 'Allemagne',
  };
  const localizedProperties1 = {
    'name': 'Espana',
    'name_local': 'Espana',
    'name_fr': 'Espagne',
    'name_en': 'Spain',
    'population': 20
  };

  const initialOutputInfo = vtinfo(initialBuffer);
  assert.deepEqual(initialOutputInfo.layers.top._keys, topLayerKeys, 'expected initial keys');
  assert.deepEqual(initialOutputInfo.layers.bottom._keys, bottomLayerKeys, 'expected initial keys');

  const params = {
    buffer: initialBuffer,
    language: null
  };

  localize(params, (err, vtBuffer) => {
    assert.notOk(err);
    const outputInfo = vtinfo(vtBuffer);
    const localizedFeature0 = outputInfo.layers.bottom.feature(0);
    const localizedFeature1 = outputInfo.layers.bottom.feature(1);
    assert.deepEqual(localizedFeature0.properties, localizedProperties0, 'expected same name, dropped _mbx properties');
    assert.deepEqual(localizedFeature1.properties, localizedProperties1, 'expected same name, dropped _mbx properties');
    assert.deepEqual(outputInfo.layers.top._keys, topLayerKeysExpected, 'expected same keys');
    assert.deepEqual(outputInfo.layers.bottom._keys, bottomLayerKeysExpected, 'expected dropped _mbx keys');
    assert.end();
  });
});

test('[localize language] custom params.language_property and params.language_prefix properties', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'places',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // language: hello
                1, 1, // _drop_me_language_jp: kon'nichiwa
                2, 2  // language_es: hola
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [ 'language', '_drop_me_language_jp', 'language_es' ],
          values: [
            { string_value: 'hello' },
            { string_value: 'kon\'nichiwa' },
            { string_value: 'hola' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    language: 'jp',
    language_property: 'language',
    language_prefix: '_drop_me_'
  };

  localize(params, (err, buffer) => {
    assert.notOk(err);
    const info = vtinfo(buffer);
    assert.equal(info.layers.places.length, 1, 'expected number of features');
    assert.deepEqual(info.layers.places.feature(0).properties, {
      language: 'kon\'nichiwa',
      language_es: 'hola',
      language_local: 'hello'
    }, 'expected properties');
    assert.end();
  });
});

test('[localize language] language codes >2 characters are viable translations', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'places',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // language: hello
                1, 1, // _pre_language_zh-Hant: Nǐ hǎo
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [ 'language', '_pre_language_zh-Hant' ],
          values: [
            { string_value: 'hello' },
            { string_value: 'Nǐ hǎo' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    language: 'zh-Hant',
    language_property: 'language',
    language_prefix: '_pre_'
  };

  localize(params, (err, buffer) => {
    assert.notOk(err);
    const info = vtinfo(buffer);
    assert.equal(info.layers.places.length, 1, 'expected number of features');
    assert.deepEqual(info.layers.places.feature(0).properties, {
      language: 'Nǐ hǎo',
      language_local: 'hello'
    }, 'expected properties');
    assert.end();
  });
});