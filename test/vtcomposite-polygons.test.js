var test = require('tape');
var composite = require('../lib/index.js');
var fs = require('fs');
var path = require('path');
var vtinfo = require('./test-utils.js');


test('[composite] composite and overzooming success polygons - overzooming zoom factor of 2 between two tiles, buffer_size & no buffer_size', function(assert) {
  const tiles = [
    { z: 15, x: 5239, y: 12666, buffer:  fs.readFileSync('./test/fixtures/polygons-buildings-sf-15-5239-12666.mvt')},
    { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-hillshade-sf-15-5239-12666.mvt')},
    { z: 16, x: 10478, y: 25332, buffer: fs.readFileSync('./test/fixtures/points-poi-sf-15-5239-12666.mvt')}
  ]
  const zxy = { z: 16, x: 10478, y: 25332}

  const info0 = vtinfo(tiles[0].buffer);
  const info1 = vtinfo(tiles[1].buffer);
  const info2 = vtinfo(tiles[2].buffer);

  assert.equal(info0.layers.building.length, 1718);
  assert.equal(info1.layers.hillshade.length, 17);
  assert.equal(info2.layers.poi_label.length, 14);
  
  composite(tiles, zxy, {}, (err, vtBuffer) => {
    const outputInfo = vtinfo(vtBuffer);
    assert.equal(outputInfo.layers.building.length, 238);
    assert.equal(outputInfo.layers.hillshade.length, 11);
    assert.equal(outputInfo.layers.poi_label.length, 14);

    composite(tiles, zxy, {buffer_size:128}, (err, vtBuffer) => {
      const outputInfoWithBuffer = vtinfo(vtBuffer);

      assert.equal(outputInfoWithBuffer.layers.building.length, 275);
      assert.end();
    });
  });
});




