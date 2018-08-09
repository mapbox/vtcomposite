const vt = require('@mapbox/vector-tile').VectorTile;
const pbf = require('pbf');
const mapnik = require('mapnik');

function vtinfo(buffer) {
  const tile = new vt(new pbf(buffer));
  return tile;
}

function vt1infoValid(buffer) {
  const tile = new vt(new pbf(buffer));
  var vtt = new mapnik.VectorTile(4,8,5);
  vtt.addData(buffer);
  vtt.toGeoJSON('__all__');
  return tile;
}

module.exports = {vtinfo:vtinfo, vt1infoValid:vt1infoValid}