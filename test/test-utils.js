const vt = require('@mapbox/vector-tile').VectorTile;
const pbf = require('pbf');

function vtinfo(buffer) {
  const tile = new vt(new pbf(buffer));
  return tile;
}

module.exports = vtinfo;