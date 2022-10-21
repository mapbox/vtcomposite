'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo } = require('./test-utils.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const test = require('tape');


/** ****************************************************************************
 * TEST SET 1:
 *  - request non-localized tile
 *  - layer has worldview
 ******************************************************************************/
test('[localize worldview] requesting nonlocalized tiles; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0], // worldview: all
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting nonlocalized tiles
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting nonlocalized tiles; feature with compatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting nonlocalized tiles
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting nonlocalized tiles; feature with an incompatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // _mbx_worldview,
              1, 1  // worldview
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview', 'worldview'],
        values: [
          { string_value: 'all' },
          { string_value: 'every' }  // use a different value from _mbx_worldview to test that localize indeed returns this value
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting nonlocalized tiles
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'every' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting nonlocalized tiles; feature with an incompatible worldview key in several worldviews', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'CN,JP,US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting nonlocalized tiles
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting nonlocalized tiles; feature with no worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['whatever'],
        values: [
          { string_value: 'blah' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting nonlocalized tiles
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { whatever: 'blah' }, 'expected properties');
    assert.end();
  });
});

/** ****************************************************************************
 * TEST SET 2:
 *  - request localized worldview
 *  - layer has worldview
 ******************************************************************************/
test('[localize worldview] requesting localized worldview; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0], // _mbx_worldview: all
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with compatible worldview key in several worldviews', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'CN,JP,TR,US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with compatible worldview key an irrelevant worldview (test partial matching)', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'USSR' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with incompatible worldview key in "all" worldviews', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0,  // _mbx_worldview
              1, 0   // worldview
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview', 'worldview'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with incompatible worldview key in the requested worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with incompatible worldview key in an irrelevant worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['JP']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature with no worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['whatever'],
        values: [
          { string_value: 'blah' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { whatever: 'blah' }, 'expected properties');
    assert.end();
  });
});


/** ****************************************************************************
 * TEST SET 3:
 *  - request localized language
 *  - layer has worldview
 ******************************************************************************/
test('[localize worldview] requesting localized language; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0], // _mbx_worldview: all
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized langauge; feature with compatible worldview key in several worldviews', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'CN,JP,TR,US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en']
    // worldivew_default is US
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized language; feature with incompatible worldview key in "all" worldviews', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0,  // _mbx_worldview
              1, 0   // worldview
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview', 'worldview'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized language; feature with incompatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized language; feature with no worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['whatever'],
        values: [
          { string_value: 'blah' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { whatever: 'blah' }, 'expected properties');
    assert.end();
  });
});

/** ****************************************************************************
 * TEST SET 4:
 *  - custom worldview_property and worldview_prefix
 ******************************************************************************/
test('[localize worldview] requesting non-localized tile; feature has custom worldview property key and prefix and is in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0,
              1, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww', 'wwoorrllddvviieeww'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_'
    // no languages or worldviews = request non-localized tile
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { wwoorrllddvviieeww: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting non-localized tile; feature has custom worldview property key and prefix and is in a worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['wwoorrllddvviieeww'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_'
    // no languages or worldviews = request non-localized tile
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { wwoorrllddvviieeww: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting non-localized tile; feature has custom worldview property key and prefix but has an incompatible worldview key', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0,
              1, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww', 'wwoorrllddvviieeww'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_'
    // no languages or worldviews = request non-localized tile
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature has custom worldview property key and prefix and is in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww'],
        values: [
          { string_value: 'all' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_',
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { wwoorrllddvviieeww: 'all' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature has custom worldview property key and prefix and is the requested worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww'],
        values: [
          { string_value: 'JP,US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_',
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { wwoorrllddvviieeww: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature has custom worldview property key and prefix and is in a irrelevant worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww'],
        values: [
          { string_value: 'CN,TR' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_',
    worldviews: ['US']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature has custom worldview property key and prefix but has an incompatible worldview key', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0,
              1, 0
            ],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['mmbbxx_wwoorrllddvviieeww', 'wwoorrllddvviieeww'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_property: 'wwoorrllddvviieeww',
    worldview_prefix: 'mmbbxx_',
    worldviews: ['JP']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

/** ****************************************************************************
 * TEST SET 5:
 *  - custom worldview_default
 ******************************************************************************/
test('[localize worldview] requesting non-localized tiles; feature in the default worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_default: 'US'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting non-localized tiles; feature in a worldview other than the default worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['worldview'],
        values: [
          { string_value: 'JP' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldview_default: 'US'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'JP' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localize worldview; feature in the default worldview but not in the reqeusted worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'US' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['JP'],
    worldview_default: 'US'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature not in the default worldview but in the reqeusted worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'JP' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['JP'],
    worldview_default: 'US'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'JP' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized worldview; feature in the default worldview and in the reqeusted worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'JP' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['JP'],
    worldview_default: 'JP'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'JP' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localized language; feature in the default worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'JP' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en'],
    worldview_default: 'JP'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'JP' }, 'expected properties');
    assert.end();
  });
});

test('[localize worldview] requesting localize langauge; feature not in the default worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [0, 0],
            type: 1, // point
            geometry: [9, 54, 38]
          }
        ],
        keys: ['_mbx_worldview'],
        values: [
          { string_value: 'JP' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['en'],
    worldview_default: 'US'
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});
