'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo } = require('./test-utils.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const test = require('tape');

test('[localize class] _mbx_class is assigned to class when worldview filtering is provided', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // _mbx_worldview
                1, 1  // _mbx_class
              ],
              type: 1, // point
              geometry: [ 9, 55, 38 ]
            }
          ],
          keys: [ '_mbx_worldview', '_mbx_class' ],
          values: [
            { string_value: 'US' },
            { string_value: 'affogato' },
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldviews: ['US']
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US',
      class: 'affogato'
    }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] _mbx_class is assigned to class when worldview is `all`', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // _mbx_worldview
                1, 1  // _mbx_class
              ],
              type: 1, // point
              geometry: [9, 54, 38]
            }
          ],
          keys: ['_mbx_worldview', '_mbx_class'],
          values: [
            { string_value: 'all' },
            { string_value: 'affogato' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldviews: []
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'all',
      class: 'affogato'
    });
    assert.end();
  });
});

test('[localize class] _mbx_class is assigned to class when multiple worldviews are provided', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // _mbx_worldview
                1, 1  // _mbx_class
              ],
              type: 1, // point
              geometry: [ 9, 55, 38 ]
            }
          ],
          keys: [ '_mbx_worldview', '_mbx_class' ],
          values: [
            { string_value: 'US,CN' },
            { string_value: 'affogato' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldviews: ['US', 'CN'],
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'CN',
      class: 'affogato'
    }, 'expected properties');
    assert.deepEqual(tile.layers.admin.feature(1).properties, {
      worldview: 'US',
      class: 'affogato'
    }, 'expected properties');
    assert.end();
  });
});

test('[localize class] _mbx_class is dropped with no worldview filtering', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [ 0, 0 ], // _mbx_worldview
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            },
            {
              id: 11,
              tags: [ 1, 1 ], // _mbx_class
              type: 1, // point
              geometry: [ 9, 55, 38 ]
            }
          ],
          keys: [ '_mbx_worldview', '_mbx_class' ],
          values: [
            { string_value: 'US' },
            { string_value: 'affogato' },
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldviews: []
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {}, 'expected properties');
    assert.end();
  });
});

test('[localize class] _mbx_class is assigned to class when language is provided and there is no worldview filtering', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // name
                1, 1, // _mbx_name_de
                2, 2,  // _mbx_class
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [ 'name', '_mbx_name_de', '_mbx_class' ],
          values: [
            { string_value: 'France' },
            { string_value: 'Frankreich' },
            { string_value: 'affogato' },
          ],
          extent: 4096
        }
      ]
    }).buffer,
    language: 'de',
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      name: 'Frankreich',
      name_local: 'France',
      class: 'affogato'
    }, 'expected properties');
    assert.end();
  });
});

test('[localize class] Invalid _mbx_class value should be dropped', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [
                0, 0, // _mbx_worldview
                1, 1  // _mbx_class
              ],
              type: 1, // point
              geometry: [ 9, 55, 38 ]
            }
          ],
          keys: [ '_mbx_worldview', '_mbx_class' ],
          values: [
            { string_value: 'US' },
            { int_value: 42 },
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldviews: ['US']
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US',
    }, 'expected properties');
    assert.end();
  });
});
