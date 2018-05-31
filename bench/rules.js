'use strict';

const fs = require('fs');
const path = require('path');
const mvtFixtures = require('@mapbox/mvt-fixtures');

module.exports = [
  // {
  //   description: 'single tile in/out',
  //   options: { },
  //   tiles: [
  //     { z: 15, x: 5239, y: 12666, buffer: getTile('sanfrancisco', '15-5239-12666.mvt')}
  //   ],
  //   zxy: { z: 15, x: 5239, y: 12666}
  // },
  {
    description: 'two different tiles at the same zoom level, zero buffer',
    options: { },
    tiles: [
      { z: 15, x: 5239, y: 12666, buffer: getTile('sanfrancisco', '15-5239-12666.mvt')},
      { z: 15, x: 5239, y: 12666, buffer: getTile('osm-qa-astana', '12-2861-1368.mvt')}
    ],
    zxy: { z: 15, x: 5239, y: 12666}
  },
  {
    description: 'two different tiles from different zoom levels (separated by one zoom), zero buffer',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer: getTile('sanfrancisco', '15-5239-12666.mvt')},
      { z: 1, x: 0, y: 0, buffer: getTile('osm-qa-astana', '12-2861-1368.mvt')}
    ],
    zxy: { z: 1, x: 0, y: 0}
  },
  {
    description: 'two different tiles from different zoom levels (separated by more than one zoom), zero buffer',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer: getTile('sanfrancisco', '15-5239-12666.mvt')},
      { z: 10, x: 0, y: 0, buffer: getTile('osm-qa-astana', '12-2861-1368.mvt')}
    ],
    zxy: { z: 10, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of points, overzooming, no properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/points-16-10498-22872.mvt')},
      { z: 1, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/points-16-10498-22872.mvt')}
    ],
    zxy: { z: 1, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of points, same zoom, no properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/points-16-10498-22872.mvt')},
      { z: 0, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/points-16-10498-22872.mvt')}
    ],
    zxy: { z: 0, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of points, overzoooming, lots of properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/points-properties-16-10498-22872.mvt')},
      { z: 1, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/points-properties-16-10498-22872.mvt')}
    ],
    zxy: { z: 1, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of points, same zoom, lots of properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/points-properties-16-10498-22872.mvt')},
      { z: 0, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/points-properties-16-10498-22872.mvt')}
    ],
    zxy: { z: 0, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of linestrings, overzooming and lots of properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/linestrings-properties-16-10498-22872.mvt')},
      { z: 0, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/linestrings-properties-16-10498-22872.mvt')}
    ],
    zxy: { z: 1, x: 0, y: 0}
  },
  {
    description: 'tiles completely made of polygons, overzooming and lots of properties',
    options: { },
    tiles: [
      { z: 0, x: 0, y: 0, buffer:  fs.readFileSync('./test/fixtures/polygons-properties-16-10498-22872.mvt')},
      { z: 0, x: 0, y: 0, buffer: fs.readFileSync('./test/fixtures/polygons-properties-16-10498-22872.mvt')}
    ],
    zxy: { z: 1, x: 0, y: 0}
  }, 
  { 
    description: 'tiles completely made of points and linestrings, overzooming and lots of properties',
    options: { },
    tiles: [
      { z: 15, x: 5239, y: 12666, buffer:  fs.readFileSync('./test/fixtures/points-poi-sf-15-5239-12666.mvt')},
      { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/linestrings-sf-15-5239-12666.mvt')}
    ], 
    zxy: { z: 16, x: 10478, y: 25332}
  }, 
  { 
    description: 'tiles completely made of polygons, overzooming and lots of properties',
    options: { },
    tiles: [
      { z: 15, x: 5239, y: 12666, buffer:  fs.readFileSync('./test/fixtures/polygons-buildings-sf-15-5239-12666.mvt')},
      { z: 15, x: 5239, y: 12666, buffer: fs.readFileSync('./test/fixtures/polygons-water-sf-15-5239-12666.mvt')}
    ], 
    zxy: { z: 16, x: 10478, y: 25332}
  }
];

function getTile(name, file) {
  return fs.readFileSync(path.join(__dirname, '..', 'node_modules', '@mapbox', 'mvt-fixtures', 'real-world', name, file))
}

// get all tiles
function getTiles(name) {
  let tiles = [];
  let dir = `./node_modules/@mapbox/mvt-fixtures/real-world/${name}`;
  var files = fs.readdirSync(dir);
  files.forEach(function(file) {
    let buffer = fs.readFileSync(path.join(dir, '/', file));
    file = file.replace('.mvt', '');
    let zxy = file.split('-');
    tiles.push({ buffer: buffer, z: parseInt(zxy[0]), x: parseInt(zxy[1]), y: parseInt(zxy[2]) });
  });
  return tiles;
}
