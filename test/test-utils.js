const vt = require('@mapbox/vector-tile').VectorTile;
const pbf = require('pbf');
const mapnik = require('mapnik');

function vtinfo(buffer) {
  const tile = new vt(new pbf(buffer));
  return tile;
}

const getFeatureById = (layer, id) => {
  for (let fidx = 0; fidx < layer.length; fidx++) {
    if (layer.feature(fidx).id === id) {
      return layer.feature(fidx);
    }
  }

  return null;
};

function vt1infoValid(buffer) {
  const tile = new vt(new pbf(buffer));
  var vtt = new mapnik.VectorTile(4,8,5);
  vtt.addData(buffer);
  vtt.toGeoJSON('__all__');
  return tile;
}

module.exports = { vtinfo, getFeatureById, vt1infoValid }