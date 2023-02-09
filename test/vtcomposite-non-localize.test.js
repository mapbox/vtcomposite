'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo } = require('./test-utils.js');

const mvtFixtures = require('@mapbox/mvt-fixtures');

const test = require('tape');
const zlib = require('zlib');


test('[localize] no localization param, feature in all worldview', (assert) => {
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
                0, 0,
                1, 1,
                2, 2,
                3, 3,
                4, 4,
                5, 5,
                6, 6,
                7, 7,
                8, 8,
                9, 9,
                10, 10,
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            },
          ],
          keys: [ '_mbx_worldview', 'worldview', 'worldview_type', '_mbx_class', 'class', 'class_type', 'name', 'name_script', 'name_zh-Hant', 'name_en', '_mbx_fi'],
          values: [
            { string_value: 'all' },
            { string_value: 'all' },
            { string_value: 'multiple' },
            { string_value: 'city' },
            { string_value: 'city' },
            { string_value: 'single' },
            { string_value: '你好' },
            { string_value: 'Han' },
            { string_value: 'Nǐ hǎo' },
            { string_value: 'hello' },
            { string_value: 'moi' },
          ],
          extent: 4096
        }
      ]
    }).buffer
  };

  localize(params, (err, buffer) => {
    assert.notOk(err);
    const info = vtinfo(buffer);
    assert.equal(info.layers.places.length, 1, 'expected number of features');  // feature is retained when _mbx_worldview is all
    assert.deepEqual(info.layers.places.feature(0).properties, {
      worldview: 'all',
      worldview_type: 'multiple',  // fields that starst with `worldview*` are not modified
      class: 'city',
      class_type: 'single',  // fields that starst with `class*` are not modified
      // name* fields are not modified
      name: '你好',
      name_script: 'Han',
      'name_zh-Hant': 'Nǐ hǎo',
      name_en: 'hello'
      // _mbx_* fields are dropped out
    }, 'expected properties');
    assert.end();
  });
});


test('[localize] no localization param, feature without _mbx_worldview', (assert) => {
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
                0, 0,
                1, 1,
                2, 2,
                3, 3,
                4, 4,
                5, 5,
                6, 6,
                7, 7,
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            },
          ],
          keys: [ 'worldview', 'worldview_type', 'class', 'class_type', 'name', 'name_script', 'name_en', '_mbx_fi'],
          values: [
            { string_value: 'CN,JP,US' },
            { string_value: 'multiple' },
            { string_value: 'disputed_city' },
            { string_value: 'single' },
            { string_value: '你好' },
            { string_value: 'Han' },
            { string_value: 'hello' },
            { string_value: 'moi' },
          ],
          extent: 4096
        }
      ]
    }).buffer
  };

  localize(params, (err, buffer) => {
    assert.notOk(err);
    const info = vtinfo(buffer);
    assert.equal(info.layers.places.length, 1, 'expected number of features');
    assert.deepEqual(info.layers.places.feature(0).properties, {
      worldview: 'CN,JP,US',
      worldview_type: 'multiple',
      class: 'disputed_city',
      class_type: 'single',
      name: '你好',
      name_script: 'Han',
      name_en: 'hello'
    }, 'expected properties');
    assert.end();
  });
});


test('[localize] no localization param, feature with _mbx_worldview', (assert) => {
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
                0, 0,
                1, 1,
                2, 2,
                3, 3,
                4, 4,
                5, 5,
                6, 6,
                7, 7,
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            },
          ],
          keys: [ '_mbx_worldview', 'worldview_type', '_mbx_class', 'class_type', 'name', 'name_script', 'name_en', '_mbx_fi'],
          values: [
            { string_value: 'CN,JP,US' },
            { string_value: 'multiple' },
            { string_value: 'city' },
            { string_value: 'single' },
            { string_value: '你好' },
            { string_value: 'Han' },
            { string_value: 'hello' },
            { string_value: 'moi' },
          ],
          extent: 4096
        }
      ]
    }).buffer
  };

  localize(params, (err, buffer) => {
    assert.notOk(err);
    const info = vtinfo(buffer);
    assert.deepEqual(info.layers, {}, 'expected number of features');  // feature is dropped when _mbx_worldview is not all
    assert.end();
  });
});
