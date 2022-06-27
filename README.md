# vtcomposite

[![Build Status](https://travis-ci.com/mapbox/vtcomposite.svg?branch=master)](https://travis-ci.com/mapbox/vtcomposite)
[![codecov](https://codecov.io/gh/mapbox/vtcomposite/branch/master/graph/badge.svg)](https://codecov.io/gh/mapbox/vtcomposite)
[![node-cpp-skel](https://raw.githubusercontent.com/mapbox/cpp/master/assets/node-cpp-skel-badge_blue.svg)](https://github.com/mapbox/node-cpp-skel)


```shell
npm install @mapbox/vtcomposite --save
```

vtcomposite is a tool to combine multiple [vector tiles](https://github.com/mapbox/vector-tile-spec) into a single tile. It allows you to ...

- **Merge tiles.** Combine 2 or more tiles into a single tile at the same zoom level.
- **Overzoom tiles.** For displaying data at a higher zoom level than that the tile's original zoom level.
- **Clip tiles.** Clips the extraneous buffer of a tile that’s been overzoomed to match a tile's extent or to retain data beyond the extent.
- **Drop layers.** Remove any layers from a tile.
- **Localize.** Modify localization-related features and properties such as language and worldview properties.

You can learn more about compositing in [TUTORIAL.md](/TUTORIAL.md). This module is a [Node.js Addon](https://nodejs.org/api/addons.html) and will install prebuilt binaries for your version of Node.js and computer architecture. Uncommon setups will build from source when installed via NPM.

# Usage

### `composite`

Combine multiple vector tiles from different zooms into a single tile at one zoom. This function will overzoom geometries to match the extent of the destination zoom.

#### Parameters

- `tiles` **Array(Object)** an array of tile objects
    - `buffer` **Buffer** a vector tile buffer, gzip compressed or not
    - `z` **Number** z value of the input tile buffer
    - `x` **Number** x value of the input tile buffer
    - `y` **Number** y value of the input tile buffer
    - `layers` **Array** an array of layer names to keep in the final tile. An empty array is invalid. (optional, default keep all layers)
- `zxy` **Object** the output tile zxy location, used to determine if the incoming tiles need to overzoom their data
    - `z` **Number** z value of the output tile buffer
    - `x` **Number** x value of the output tile buffer
    - `y` **Number** y value of the output tile buffer
- `options` **Object**
  - `options.compress` **Boolean** a boolean value indicating whether or not to return a compressed buffer. Default is to return a uncompressed buffer. (optional, default `false`)
  - `options.buffer_size` **Number** the buffer size of a tile, indicating the tile extent that should be composited and/or clipped. Default is `buffer_size=0`. (optional, default `0`)
- `callback` **Function** callback function that returns `err`, and `buffer` parameters

#### Example

```js
const { composite } = require('@mapbox/vtcomposite');
const fs = require('fs');

const tiles = [
  { buffer: fs.readFileSync('./path/to/tile.mvt'), z: 15, x: 5238, y: 12666 },
  { buffer: fs.readFileSync('./path/to/tile.mvt'), z: 15, x: 5238, y: 12666, layers: ['building'] }
];

const zxy = { z: 5, x: 5, y: 12 };

const options = {
  compress: true,
  buffer_size: 0
};

composite(tiles, zxy, options, function(err, result) {
  if (err) throw err;
  console.log(result); // tile buffer
});
```

### `localize`

Modify a tile's features and properties to support localized languages and worldviews. This function requires the input vector tiles to match a specific schema for language translation and worldviews.

#### Parameters

- `params` **Object**
  - `params.buffer` **Buffer** a vector tile buffer, gzip compressed or not
  - `params.compress` **Boolean** a boolean value indicating whether or not to return a compressed buffer. Default is to return an uncompressed buffer. (optional, default `false`)
  - `params.language` **String** the IETF BCP 47 language code.
  - `params.worldview` **String** ISO 3166-1 alpha-2 country code to only include features that match the given worldview.
    - If a feature matches the requested worldview the feature is cloned and `worldview: XX` is added to the feature's properties and the `params.worldview_property` property is dropped. If the original feature contains a `worldview` property, it is overwritten.
    - If a feature has a worldview value of `all` it is considered a match and `worldview: all` is added to the feature's properties and the `params.worldview_property` property is dropped. If the original feature contains a `worldview` property, it is ovewritten.
    - If a feature does not match the request worldview the entire feature is dropped.
    - If a feature does not have a `params.worldview_property` property it is retained.
  - `params.worldview_property` **String** property that specifies which worldview a feature belongs. The property must contain a comma-separated string of ISO 3166-1 alpha-2 country codes that define which worldviews the feature represents (example: `US,RU,IN`). Default value: `_mbx_worldview`.
  - `params.worldview_defaults` **Array<String>** if `worldview` is set to `null`, fallback to the given set of worldviews. A single worldview feature (defined by `worldview_property`) may be split into multiple features if it represents multiple worldviews. Default value: `['US', 'CN', 'IN', 'JP']`
- `callback` **Function** callback function that returns `err` and `buffer` parameters

#### Example

```js
const { localize } = require('@mapbox/vtcomposite');

const params = {
  // REQUIRED
  buffer: require('fs').readFileSync('./path/to/tile.mvt'),
  // OPTIONAL (defaults)
  language: null,
  worldview: null,
  worldview_property: null,
  worldview_defaults: ['US', 'CN', 'IN', 'JP'],
  compress: true
};

localize(params, function(err, result) {
  if (err) throw err;
  console.log(result); // tile buffer
});
```

# Contributing & License

- [LICENSE](https://github.com/mapbox/vtcomposite/blob/master/LICENSE.md)
- [CONTRIBUTING](https://github.com/mapbox/vtcomposite/blob/master/CONTRIBUTING.md)
- [CODE OF CONDUCT](https://github.com/mapbox/vtcomposite/blob/master/CODE_OF_CONDUCT.md)

This project is based off the node-cpp-skel framework, which is licensed under [CC0](https://creativecommons.org/share-your-work/public-domain/cc0/). [![node-cpp-skel](https://raw.githubusercontent.com/mapbox/cpp/master/assets/node-cpp-skel-badge_blue.svg)](https://github.com/mapbox/node-cpp-skel)