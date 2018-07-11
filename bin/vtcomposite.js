#!/usr/bin/env node

'use strict';

var mapnik = require('mapnik');
var fs = require('fs');
var composite = require('../');
var path = require('path');
var diff = require('jest-diff');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

var vt = new mapnik.VectorTile(0,0,0);

var input_file = process.argv[2];

if (!input_file) {
  console.error('please provide a path to a GeoJSON file');
  process.exit(-1)
}

if (!fs.existsSync(input_file)) {
  console.error('please provide a path to a GeoJSON file');
  process.exit(-1)
}

vt.addGeoJSON(fs.readFileSync(process.argv[2]).toString(),'polygon')

var tiles = [
  { buffer:vt.getData(), z:0, x:0, y:0 }
];

fs.writeFileSync('input.mvt',vt.getData());

const zxy = {z:0, x:0, y:0};
var options = {buffer_size:0, reencode: true};

var geojson_in = vt.toGeoJSON('__all__');
//fs.writeFileSync('expected.json',JSON.stringify(JSON.parse(geojson_in),null,1))

var target_vt = new mapnik.VectorTile(zxy.z, zxy.x, zxy.y);
var source_tiles = new Array(tiles);
for (var i = 0; i < tiles.length; ++i)
{
    var vt = new mapnik.VectorTile(tiles[i].z,tiles[i].x,tiles[i].y);
    vt.addDataSync(tiles[i].buffer);
    source_tiles[i] = vt;
}

composite(tiles, zxy, options, function(err, buf) {
    if (err) throw err;
    var vt2 = new mapnik.VectorTile(zxy.z,zxy.x,zxy.y);
    vt2.addData(buf);
    var geojson_out = vt2.toGeoJSON('__all__');
    console.log('vtcomposite',diff(JSON.parse(geojson_in),JSON.parse(geojson_out)));
    //fs.writeFileSync('actual-vt.json',JSON.stringify(JSON.parse(geojson_out),null,1))
    target_vt.composite(source_tiles, options, function(err, vt2) {
        if (err) throw err;
        var geojson_out2 = vt2.toGeoJSON('__all__');
        console.log('node-mapnik',diff(JSON.parse(geojson_in),JSON.parse(geojson_out2)));
        //fs.writeFileSync('actual-mapnik.json',JSON.stringify(JSON.parse(geojson_out2),null,1))
    });
});
