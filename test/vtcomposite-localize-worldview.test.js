'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo, getFeatureById } = require('./test-utils.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const test = require('tape');

const fixtureDefaults = mvtFixtures.create({
  layers: [
    {
      version: 2,
      name: 'admin',
      features: [
        {
          id: 10,
          tags: [ 0, 0 ], // _mbx_worldview: US,CN,JP,IN
          type: 1, // point
          geometry: [ 9, 54, 38 ]
        }
      ],
      keys: [ '_mbx_worldview' ],
      values: [
        { string_value: 'US,CN,JP,IN' }
      ],
      extent: 4096
    }
  ]
}).buffer;

const fixtureWithAll = mvtFixtures.create({
  layers: [
    {
      version: 2,
      name: 'admin',
      features: [
        {
          id: 10,
          tags: [ 0, 0 ], // _mbx_worldview: all
          type: 1, // point
          geometry: [ 9, 54, 38 ]
        }
      ],
      keys: [ '_mbx_worldview' ],
      values: [
        { string_value: 'all' }
      ],
      extent: 4096
    }
  ]
}).buffer;

test('[localize worldview] defaults - worldview: US specified, only US created', (assert) => {
  const params = {
    buffer: fixtureDefaults,
    worldview: ['US'],
    // worldview_property: '_mbx_worldview'
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US'
    }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] no worldview specified, feature with "all" value is retained', (assert) => {
  const params = {
    buffer: fixtureWithAll,
    worldview: []
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'all'
    });
    assert.end();
  });
});

test('[localize worldview] worldview: US specified, feature with _mbx_worldview: "all" is retained', (assert) => {
  const params = {
    buffer: fixtureWithAll,
    worldview: ['US']
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'all'
    });
    assert.end();
  });
});

test('[localize worldview] property with non-string value, feature is dropped', (assert) => {
  const params = {
    buffer: mvtFixtures.create({
      layers: [
        {
          version: 2,
          name: 'admin',
          features: [
            {
              id: 10,
              tags: [ 0, 0 ], // _mbx_worldview: 100
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [ '_mbx_worldview' ],
          values: [
            { int_value: 100 }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldview: ['US']
  }
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.equal(Object.keys(tile.layers).length, 0, 'no feature or layers retained');
    assert.end();
  });
});

test('[localize worldview] feature with _mbx_worldview and worldview properties reassigns worldview', (assert) => {
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
                0, 0, // _mbx_worldview: US
                1, 1  // worldview: RU <-- this is overwritten
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [
            '_mbx_worldview',
            'worldview'
          ],
          values: [
            { string_value: 'US' },
            { string_value: 'RU' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldview: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US'
    });
    assert.end();
  });
});

test('[localize worldview] custom worldview_property', (assert) => {
  const tile = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [ 0, 0 ], // custom_worldview: US
            type: 1, // point
            geometry: [ 9, 54, 38 ]
          },
          {
            id: 20,
            tags: [ 0, 1 ], // custom_worldview: RU
            type: 1, // point
            geometry: [ 9, 56, 38 ]
          }
        ],
        keys: [
          'custom_worldview'
        ],
        values: [
          { string_value: 'US' },
          { string_value: 'RU' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: tile,
    worldview: ['US'],
    worldview_property: 'custom_worldview'
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'expected number of features');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'US'
    }, 'expected properties retained');
    assert.end();
  });
});

test('[localize worldview] feature split into multiple worldviews', (assert) => {
  const params = {
    buffer: fixtureDefaults,
    worldview: ['CN', 'IN', 'JP', 'US'],
    worldview_property: '_mbx_worldview'
  };
  localize(params, (err, vtBuffer) => {
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

test('[localize worldview] worldviews not specified are not split into features', (assert) => {
  const params = {
    buffer: fixtureDefaults,
    worldview: ['US', 'JP'],
    worldview_property: '_mbx_worldview'
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 2, 'has two features');
    assert.equal(tile.layers.admin.feature(0).properties.worldview, 'JP', 'expected JP worldview');
    assert.equal(tile.layers.admin.feature(1).properties.worldview, 'US', 'expected US worldview');
    assert.end();
  });
});

test('[localize worldview] custom worldview_defaults array', (assert) => {
  const tile = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [ 0, 0 ], // custom_worldview: US
            type: 1, // point
            geometry: [ 9, 54, 38 ]
          },
          {
            id: 20,
            tags: [ 0, 1 ], // custom_worldview: RU
            type: 1, // point
            geometry: [ 9, 56, 38 ]
          }
        ],
        keys: [ 'custom_worldview' ],
        values: [
          { string_value: 'US' },
          { string_value: 'RU' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: tile,
    worldview: ['RU'],
    worldview_property: 'custom_worldview'
  };
  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'expected number of features');
    assert.deepEqual(tile.layers.admin.feature(0).properties, {
      worldview: 'RU'
    }, 'expected properties retained');
    assert.end();
  });
});

test('[localize worldview] partial matching worldviews are not considered matches, only perfect matches after splitting by comma', (assert) => {
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
                0, 0, // name: Some place
                1, 1 // _mbx_worldview: USAAAA,CN,JP,INdia
              ],
              type: 1, // point
              geometry: [ 9, 54, 38 ]
            }
          ],
          keys: [
            'name',
            '_mbx_worldview'
          ],
          values: [
            { string_value: 'Some place' },
            { string_value: 'USAAAA,CN,JP,INdia' }
          ],
          extent: 4096
        }
      ]
    }).buffer,
    worldview: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.equal(Object.keys(tile.layers).length, 0, 'no feature or layers retained since US does not match USAAAA');
    assert.end();
  });
});