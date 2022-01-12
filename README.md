[![Build Status](https://travis-ci.com/mapbox/vtcomposite.svg?branch=master)](https://travis-ci.com/mapbox/vtcomposite)
[![codecov](https://codecov.io/gh/mapbox/vtcomposite/branch/master/graph/badge.svg)](https://codecov.io/gh/mapbox/vtcomposite)
[![node-cpp-skel](https://raw.githubusercontent.com/mapbox/cpp/master/assets/node-cpp-skel-badge_blue.svg)](https://github.com/mapbox/node-cpp-skel)

Combine multiple [vector tiles](https://github.com/mapbox/vector-tile-spec) into a single tile. For a more in depth explanation about how compositing works, see the [tutorial](#tutorial).

```shell
npm install @mapbox/vtcomposite
```

vtcomposite is made possible with node-cpp-skel, vtzero, geometry.hpp, spatial-algorithms, gzip-hpp and boost geometry.

# Usage

```js
const vtcomposite = require('@mapbox/vtcomposite');
const fs = require('fs');

const tiles = [
  { buffer: fs.readFileSync('./path/to/tile.mvt'), z: 15, x: 5238, y: 12666 },
  { buffer: fs.readFileSync('./path/to/another.mvt'), z: 15, x: 5238, y: 12666, layers: ['building'] }
];

const zxy = { z: 5, x: 5, y: 12 };

const options = {
  compress: true,
  buffer_size: 0
};

vtcomposite(tiles, zxy, options, function(err, result) {
  if (err) throw err;
  console.log(result); // tile buffer
});
```

### Parameters

property | required | type | description
---|---|---|---
`tiles` | x | Array[Object] | array of tile objects to manipulate and composite
`tiles[n].buffer` | x | Buffer | a vector tile buffer, gzip compressed or nottiles[n].
`tiles[n].z` | x | Number | z value of the input tile buffer
`tiles[n].x` | x | Number | x value of the input tile buffer
`tiles[n].y` | x | Number | y value of the input tile buffer
`tiles[n].layers` | | Array | an array of layer names to keep in the final tile. An empty array is invalid. (default: keep all layers). Read more about [layer dropping](#layer-inclusion).
`tiles[n].feature_filter` | | Object | an object used to filter entire features based on property key/values. See example below for more details. Read more about [feature dropping](#feature-dropping).
`tiles[n].drop_properties` | | Array[String] | an array of property keys to remove from features. Read more about [property dropping](#property-dropping).
`zxy` | x | Object | the output tile zxy location, used to determine if the incoming tiles need to overzoom their data
`zxy.z` | x | Number | z value of the output tile buffer
`zxy.x` | x | Number | x value of the output tile buffer
`zxy.y` | x | Number | y value of the output tile buffer
`options` | x | Object | options object. An empty object is required even if no options are necessary.
`options.compress` | | Boolean | a boolean value indicating whether or not to return a compressed buffer. Default is to return a uncompressed buffer. (optional, default `false`)
`options.buffer_size` | | Number | the buffer size of a tile, indicating the tile extent that should be composited and/or clipped. Default is `buffer_size=0`. (optional, default `0`)
`callback` | x | Function | callback function that returns `err`, and `buffer` parameters

### Layer dropping

```json
[
  "building",
  "road"
]
```

Include the `layer` parameter to **keep** layers specified in the array of strings. In the example above the resulting tile will only include layers "building" and "road" but will drop any other layers in the original tile.

### Feature dropping

```json
{
  "type": ["park", "playground"]
}
```

Include the `feature_filter` parameter for a specific buffer as a simple means of filtering features by values of properties. This is only valid for properties of `str` type. The example above specifies to **keep** any feature with a `type` property that includes values of "park" OR "playground". The expression will perform a partial search. For example a feature with "city park" and another with just "park" will both be kept in the final composited tile. The search is case sensitive, so a feature with "Park" will be filtered out. Any features _without_ a `type` property will be kept in the final tile.

### Property dropping

```JSON
[
  "name_es",
  "name_fr"
]
```

Include the `drop_properties` parameter to exclude properties from all features across all layers. In the example above all features will drop the "name_es" and "name_fr" properties in the final tile.


# Installation

Each `make` command is specified in [`Makefile`](./Makefile)

```bash
git clone git@github.com:mapbox/vtcomposite.git
cd vtcomposite

# Build binaries. This looks to see if there were changes in the C++ code. This does not reinstall deps.
make

# Run tests
make test

# Cleans your current builds and removes potential cache
make clean

# Cleans everything, including the things you download from the network in order to compile (ex: npm packages).
# This is useful if you want to nuke everything and start from scratch.
# For example, it's super useful for making sure everything works for Travis, production, someone else's machine, etc
make distclean

# This skel uses documentation.js to auto-generate API docs.
# If you'd like to generate docs for your code, you'll need to install documentation.js,
# and then add your subdirectory to the docs command in package.json
npm install -g documentation
npm run docs
```

# Benchmarks

Benchmarks can be run with the bench/bench.js script to test vtcomposite against common real-world fixtures (provided by mvt-fixtures) and to test vtcomposite against its predecessor compositing library node-mapnik. When making changes in a pull request, please provide the benchmarks from the master branch and the HEAD of your current branch.  You can control the `concurrency`, `iterations`, and `package` of the benchmarks with the following command:

    node bench/bench.js --iterations 1000 --concurrency 5 --package vtcomposite

And the output will show how many times the library was able to execute per second, per fixture:

    1: single tile in/out ... 16667 runs/s (3ms)
    2: two different tiles at the same zoom level, zero buffer ... 4167 runs/s (12ms)
    3: two different tiles from different zoom levels (separated by one zoom), zero buffer ... 633 runs/s (79ms)
    4: two different tiles from different zoom levels (separated by more than one zoom), zero buffer ... 1429 runs/s (35ms)
    5: tiles completely made of points, overzooming, no properties ... 3846 runs/s (13ms)
    6: tiles completely made of points, same zoom, no properties ... 50000 runs/s (1ms)
    7: tiles completely made of points, overzoooming, lots of properties ... 3333 runs/s (15ms)
    8: tiles completely made of points, same zoom, lots of properties ... 50000 runs/s (1ms)
    9: buffer_size 128 - tiles completely made of points, same zoom, lots of properties ... 50000 runs/s (1ms)
    10: tiles completely made of linestrings, overzooming and lots of properties ... 1163 runs/s (43ms)
    11: tiles completely made of polygons, overzooming and lots of properties ... 254 runs/s (197ms)
    12: tiles completely made of points and linestrings, overzooming and lots of properties ... 10000 runs/s (5ms)
    13: returns compressed buffer - tiles completely made of points and linestrings, overzooming and lots of properties ... 5556 runs/s (9ms)
    14: buffer_size 128 - tiles completely made of points and linestrings, overzooming and lots of properties ... 12500 runs/s (4ms)
    15: tiles completely made of points and linestrings, overzooming (2x) and lots of properties ... 16667 runs/s (3ms)
    16: tiles completely made of polygons, overzooming and lots of properties ... 1042 runs/s (48ms)
    17: tiles completely made of polygons, overzooming (2x) and lots of properties ... 2174 runs/s (23ms)
    18: return compressed buffer - tiles completely made of polygons, overzooming (2x) and lots of properties ... 2083 runs/s (24ms)
    19: buffer_size 4096 - tiles completely made of polygons, overzooming (2x) and lots of properties ... 1087 runs/s (46ms)

# Viz

The viz/ directory contains a small node application that is helpful for visual QA of vtcomposite results. It requests a single Mapbox street tile at z6 and uses the `composite` function to overzoom the tile at `z7`. In order to request tiles, you'll need a `MapboxAccessToken` environment variable and you'll need to run both a local tile server and a simple server for your `viz` application.

```shell
cd viz
npm install
MapboxAccessToken={token} node app.js
# localhost:3000

#in a separate terminal tab, run a simple server on a port of your choosing
#navigate to this port in your browser
python -m SimpleHTTPServer x000
```

# Tutorial

## What is compositing?

Compositing is a tool to combine multiple vector tiles into a single tile. Compositing allows a user to:

- **Merge tiles.** Merges 2 or more tiles into a single tile at the same zoom level.
- **Overzoom tiles.** Displays data at a higher zoom level than that the tileset max zoom.
- **Clip tiles.** Clips the extraneous portion of a tile that’s been overzoomed.


## Compositing: Merging 2+ Tiles

Let’s say you have two tiles at `z5` - `santacruz.mvt` & `losangeles.mvt`. Each tile contains a single point that corresponds to one of the two cities. You could generate a single tile, `santa_cruz_plus_la-5-5-12.mvt` that contains both points by compositing the two tiles.

## Source Tiles

`santacruz.mvt` - single point

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946395305_sc.png)


`losangeles.mvt` - single point

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946414805_la.png)


## Output Tile

**Composited Tile:** `santa_cruz_plus_la-5-5-12.mvt`


![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946439263_scla.png)


**`vtcomposite` code:**


    const santaCruzBuffer = fs.readFileSync('/santacruz.mvt');
    const losAngelesBuffer = fs.readFileSync('/losangeles.mvt');

    const tiles = [
      {buffer: santaCruzBuffer, z:5, x:5, y:12},
      {buffer: losAngelesBuffer, z:5, x:5, y:12}
    ];

    const zxy = {z:5, x:5, y:12};

    composite(tiles, zxy, {}, (err, vtBuffer) => {
      fs.writeFileSync('/santa_cruz_plus_la-5-5-12.mvt', vtBuffer);
    });


## Compositing: Overzooming & Clipping Tiles
![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946439263_scla.png)



Let’s say we want to display our composited tile: `santa_cruz_plus_la-5-5-12.mvt` at `z6`.

We know that as zoom levels increase, each tile divides into four smaller tiles. We can calculate each the `zxy` of the z6 tiles using the formula outlined below. There are also libraries, such as [*mapbox/tilebelt*](http://github.com/mapbox/tilebelt) that calculate the parent or children tiles for you, as well as other tile math calculations.



If the `zxy` is `5/5/12`, the `z6` children tiles are located at:

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1532040176336_Screen+Shot+2018-07-19+at+3.42.16+PM.png)


**`vtcomposite` code:**


    const santaCruzAndLABuffer = fs.readFileSync('/santa_cruz_plus_la-5-5-12.mvt');

    const tiles = [
      {buffer: santaCruzAndLABuffer, z:5, x:5, y:12}
    ];

    //map request
    const zxy = {z:6, x:10, y:24};

    composite(tiles, zxy, {}, (err, vtBuffer) => {
      fs.writeFileSync('/santa_cruz_plus_la-6-10-24.mvt', vtBuffer);
    });

In this example, the tile being requested is at z6, but our source tile is a z5 tile. In this scenario, we must **overzoom**.

Each zoom level scales geometries by a power of 2. Thus, you can calculate coordinates at each zoom level knowing the original geometry and the (over)zoom factor.


      // original geometry = Santa Cruz tile coordinate at 5/5/12
      const originalGeometry = {x:637, y:1865};
      let x = originalGeometry.x;
      let y = originalGeometry.y;

      //increasing geometry size by a zoom factor of 1
      const zoom_factor = 1;

      const scale = Math.pow(2,zoom_factor); //1 << 1

      //scale x and y geometries by the zoom_factor
      let xScale = x*scale;
      let yScale = y*scale;

      //divide the scaled geometries by the tile extent (4096) to see the point moves to another tile
      let xtileOffset = Math.floor(xScale/4096);
      let ytileOffset = Math.floor(yScale/4096);

      //subtract the difference between the x and y tileoffsets.
      let xOffset = xScale - (xtileOffset * 4096);
      let yOffset = yScale - (ytileOffset * 4096);

      //the xOffset and yOffset will be the x,y point at z6


Based off these equations, we know that resulting `(x,y)` point geometries for Santa Cruz and Los Angeles overzoomed at `z6` are:


    Santa Cruz point = [1274, 3730] at zxy 6/10/24
    Los Angeles point = [90, 2318] at zxy 6/11/25


## Clipping

Wait a second…! Los Angeles isn’t the tile we requested - `{z:6, x:10, y:24}` - it’s in `{z:6, x:11, y:25}`.

That means we need to **clip** the overzoomed geometries to only include the point(s) we need for tile  `{z:6, x:10, y:24}`. Since Santa Cruz is the only geometry in `{z:6, x:10, y:24}`, we **clip** extraneous data, which means we remove any geometries that are not included in the `z6` tile, but *are* included in the parent tile that’s been overzoomed - `{z:5, x:5, y:12}`. See ya Los Angeles!

## Clipping with a `buffer_size`

In the example above, we clipped geometries based on the default tile boundaries (4096X4096). However, the `composite` function always us to have control over which geometries we include/exclude outside the requested tile when clipping. By passing in a `buffer_size` to the compositing function, we are able to explicitly state if we want to keep geometries outside the tile extent when overzooming.

# Contributing and License

This project is based off the node-cpp-skel framework. Node-cpp-skel is licensed under [CC0](https://creativecommons.org/share-your-work/public-domain/cc0/).

[![node-cpp-skel](https://raw.githubusercontent.com/mapbox/cpp/master/assets/node-cpp-skel-badge_blue.svg)](https://github.com/mapbox/node-cpp-skel)

For more about vtcomposite contributing and licensing, see:
- vtcomposite [license](https://github.com/mapbox/vtcomposite/blob/master/LICENSE.md)
- vtcomposite [contribution docs](https://github.com/mapbox/vtcomposite/blob/master/CONTRIBUTING.md)



