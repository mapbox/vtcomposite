'use strict';

const localize = require('../lib/index.js').localize;
const { vtinfo } = require('./test-utils.js');
const mvtFixtures = require('@mapbox/mvt-fixtures');
const test = require('tape');

/******************************************************************************
 * TEST SET 1:
 *  - request non-localized tile
 *  - layer has worldview
 *  - layer has class vs. _mbx_class differentiation
 ******************************************************************************/
test('[localize class] requesting non-localized tile; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // worldview
              1, 1, // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ 'worldview', 'class' ],
        values: [
          { string_value: 'all' },
          { string_value: 'fancy_affogato' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting non-localized tile
  };

    localize(params, (err, vtBuffer) => {
      assert.ifError(err);
      const tile = vtinfo(vtBuffer);
      assert.ok('admin' in tile.layers, 'has admin layer');
      assert.equal(tile.layers.admin.length, 1, 'has one feature');
      assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', class: 'fancy_affogato' }, 'expected properties');
      assert.end();
    });
});

test('[localize class] requesting non-localized tile; feature with compatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // worldview
              1, 1, // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ 'worldview', 'class' ],
        values: [
          { string_value: 'US' },
          { string_value: 'fancy_affogato' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting non-localized tile
  };

    localize(params, (err, vtBuffer) => {
      assert.ifError(err);
      const tile = vtinfo(vtBuffer);
      assert.ok('admin' in tile.layers, 'has admin layer');
      assert.equal(tile.layers.admin.length, 1, 'has one feature');
      assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US', class: 'fancy_affogato' }, 'expected properties');
      assert.end();
    });
});

test('[localize class] requesting non-localized tile; feature with incompatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // _mbx_worldview
              1, 1, // worldview,
              2, 2  // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ '_mbx_worldview', 'worldview', 'class' ],
        values: [
          { string_value: 'all' },
          { string_value: 'every_wv' },  // use a different value from _mbx_worldview to test that localize indeed returns this one
          { string_value: 'fancy_affogato' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting non-localized tile
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'every_wv', class: 'fancy_affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting non-localized tile; feature with incompatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
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
        keys: [ '_mbx_worldview', '_mbx_class'],
        values: [
          { string_value: 'US' },
          { string_value: 'affogato' },
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature
    // no languages or worldviews = requesting non-localized tile
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});


/******************************************************************************
 * TEST SET 2:
 *  - request localized worldview
 *  - layer has worldview
 *  - layer has class vs. _mbx_class differentiation
 ******************************************************************************/
test('[localize class] requesting localized worldview; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
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
          { string_value: 'all' },
          { string_value: 'affogato' },
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
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', class: 'affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting localized worldview; feature with compatible worldview key in the requested worldview', (assert) => {
  const feature = mvtFixtures.create({
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
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'US', class: 'affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting localized worldview; feature with compatible worldview key in an irrelevant worldview', (assert) => {
  const feature = mvtFixtures.create({
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

test('[localize class] requesting localized worldview; feature with incompatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // _mbx_worldview
              1, 1, // _mbx_class
              2, 0, // worldview
              3, 2  // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ '_mbx_worldview', '_mbx_class', 'worldview', 'class' ],
        values: [
          { string_value: 'all' },
          { string_value: 'affogato' },
          { string_value: 'fancy_affogato' }
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
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', class: 'affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting localized worldview; feature with incompatible worldview key in the requested worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // worldview
              1, 1  // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ 'worldview', 'class' ],
        values: [
          { string_value: 'US' },
          { string_value: 'fancy_affogato' }
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

test('[localize class] requesting localized worldview; feature with incompatible worldview key in an irrelevant worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // worldview
              1, 1  // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ 'worldview', 'class' ],
        values: [
          { string_value: 'US' },
          { string_value: 'fancy_affogato' }
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

/******************************************************************************
 * TEST SET 3:
 *  - request localized language
 *  - layer has worldview
 *  - layer has class vs. _mbx_class differentiation
 ******************************************************************************/
test('[localize class] requesting localized language; feature with compatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
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
          { string_value: 'all' },
          { string_value: 'affogato' },
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
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', class: 'affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting localized languages; feature with compatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
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
  }).buffer;

  const params = {
    buffer: feature,
    worldviews: ['en']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has no feature');
    assert.end();
  });
});

test('[localize class] requesting localized language; feature with incompatible worldview key in "all" worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // _mbx_worldview
              1, 1, // _mbx_class
              2, 0, // worldview
              3, 2  // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ '_mbx_worldview', '_mbx_class', 'worldview', 'class' ],
        values: [
          { string_value: 'all' },
          { string_value: 'affogato' },
          { string_value: 'fancy_affogato' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['ja']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.ok('admin' in tile.layers, 'has admin layer');
    assert.equal(tile.layers.admin.length, 1, 'has one feature');
    assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', class: 'affogato' }, 'expected properties');
    assert.end();
  });
});

test('[localize class] requesting localized language; feature with incompatible worldview key in a worldview', (assert) => {
  const feature = mvtFixtures.create({
    layers: [
      {
        version: 2,
        name: 'admin',
        features: [
          {
            id: 10,
            tags: [
              0, 0, // worldview
              1, 1 // class
            ],
            type: 1, // point
            geometry: [ 9, 55, 38 ]
          }
        ],
        keys: [ 'worldview', 'class' ],
        values: [
          { string_value: 'US' },
          { string_value: 'fancy_affogato' }
        ],
        extent: 4096
      }
    ]
  }).buffer;

  const params = {
    buffer: feature,
    languages: ['ja']
  };

  localize(params, (err, vtBuffer) => {
    assert.ifError(err);
    const tile = vtinfo(vtBuffer);
    assert.deepEqual(tile.layers, {}, 'has one feature');
    assert.end();
  });
});

/******************************************************************************
 * TEST SET 4:
 *   - layer has no worldview
 *   - layer has no class vs. _mbx_class differentiation
 ******************************************************************************/
 test('[localize class] requesting non-localized tile; feature has class', (assert) => {
   const feature = mvtFixtures.create({
     layers: [
       {
         version: 2,
         name: 'admin',
         features: [
           {
             id: 10,
             tags: [
               0, 0 // class
             ],
             type: 1, // point
             geometry: [ 9, 55, 38 ]
           }
         ],
         keys: [ 'class' ],
         values: [
           { string_value: 'affogato' }
         ],
         extent: 4096
       }
     ]
   }).buffer;

   const params = {
     buffer: feature
     // no languages or worldviews = requesting non-localized tile
   };

   localize(params, (err, vtBuffer) => {
     assert.ifError(err);
     const tile = vtinfo(vtBuffer);
     assert.ok('admin' in tile.layers, 'has admin layer');
     assert.equal(tile.layers.admin.length, 1, 'has one feature');
     assert.deepEqual(tile.layers.admin.feature(0).properties, { class: 'affogato' }, 'expected properties');
     assert.end();
   });
 });

 test('[localize class] requesting localized worldview; feature has class', (assert) => {
   const feature = mvtFixtures.create({
     layers: [
       {
         version: 2,
         name: 'admin',
         features: [
           {
             id: 10,
             tags: [
               0, 0 // class
             ],
             type: 1, // point
             geometry: [ 9, 55, 38 ]
           }
         ],
         keys: [ 'class' ],
         values: [
           { string_value: 'affogato' }
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
     assert.deepEqual(tile.layers.admin.feature(0).properties, { class: 'affogato' }, 'expected properties');
     assert.end();
   });
 });

 test('[localize class] requesting localized language; feature has class', (assert) => {
   const feature = mvtFixtures.create({
     layers: [
       {
         version: 2,
         name: 'admin',
         features: [
           {
             id: 10,
             tags: [
               0, 0 // class
             ],
             type: 1, // point
             geometry: [ 9, 55, 38 ]
           }
         ],
         keys: [ 'class' ],
         values: [
           { string_value: 'affogato' }
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
     assert.deepEqual(tile.layers.admin.feature(0).properties, { class: 'affogato' }, 'expected properties');
     assert.end();
   });
 });

 /******************************************************************************
  * TEST SET 5:
  *  - test custom class_property and class_prefix
  ******************************************************************************/
 test('[localize class] requesting non-localized tile; feature with custom class property and prefix but compatible worldview key in "all" worldview', (assert) => {
   const feature = mvtFixtures.create({
     layers: [
       {
         version: 2,
         name: 'admin',
         features: [
           {
             id: 10,
             tags: [
               0, 0, // worldview
               1, 1, // ccllaassss
             ],
             type: 1, // point
             geometry: [ 9, 55, 38 ]
           }
         ],
         keys: [ 'worldview', 'ccllaassss' ],
         values: [
           { string_value: 'all' },
           { string_value: 'fancy_affogato' }
         ],
         extent: 4096
       }
     ]
   }).buffer;

   const params = {
     buffer: feature,
     class_property: "ccllaassss",
     class_prefix: "mmbbxx_"
     // no languages or worldviews = requesting non-localized tile
   };

     localize(params, (err, vtBuffer) => {
       assert.ifError(err);
       const tile = vtinfo(vtBuffer);
       assert.ok('admin' in tile.layers, 'has admin layer');
       assert.equal(tile.layers.admin.length, 1, 'has one feature');
       assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', ccllaassss: 'fancy_affogato' }, 'expected properties');
       assert.end();
     });
 });

 test('[localize class] requesting localized language; feature with custom class property and prefix but incompatible worldview key in "all" worldview', (assert) => {
   const feature = mvtFixtures.create({
     layers: [
       {
         version: 2,
         name: 'admin',
         features: [
           {
             id: 10,
             tags: [
               0, 0, // _mbx_worldview
               1, 1, // mmbbxx_ccllaassss
               2, 0, // worldview
               3, 2  // ccllaassss
             ],
             type: 1, // point
             geometry: [ 9, 55, 38 ]
           }
         ],
         keys: [ '_mbx_worldview', 'mmbbxx_ccllaassss', 'worldview', 'ccllaassss' ],
         values: [
           { string_value: 'all' },
           { string_value: 'affogato' },
           { string_value: 'fancy_affogato' }
         ],
         extent: 4096
       }
     ]
   }).buffer;

   const params = {
     buffer: feature,
     class_property: 'ccllaassss',
     class_prefix: 'mmbbxx_',
     languages: ['ja']
   };

   localize(params, (err, vtBuffer) => {
     assert.ifError(err);
     const tile = vtinfo(vtBuffer);
     assert.ok('admin' in tile.layers, 'has admin layer');
     assert.equal(tile.layers.admin.length, 1, 'has one feature');
     assert.deepEqual(tile.layers.admin.feature(0).properties, { worldview: 'all', ccllaassss: 'affogato' }, 'expected properties');
     assert.end();
   });
 });
