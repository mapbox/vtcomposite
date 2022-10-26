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

A filtering function for modifying a tile's features and properties to support localized languages and worldviews. This function requires the input vector tiles to match a specific schema for language translation and worldviews.

#### Parameters

- `params` **Object**
  - `params.buffer` **Buffer** a vector tile buffer, gzip compressed or not.
  - `params.compress` **Boolean** a boolean value indicating whether or not to return a compressed buffer.
    - Default value: `false` (i.e. return an uncompressed buffer).
  - `params.languages` **Array<String>** array of IETF BCP 47 language codes used to search for matching translations available in a feature's properties.
    - Optional parameter.
    - All language-related properties must match the following format: `{language_prefix}{language_property}_{language}`.
    - Default properties are `_mbx_name_{language}`; for example, the `_mbx_name_jp` property contains the Japanese translation for the value in `name`.
  - `params.language_property` **String** the primary property in features that identifies the feature in a language.
    - Default value: `name`.
    - This values is used to search for additional translations that match the following format `{language_property}_{language}`.
  - `params.language_prefix` **String** prefix for any additional translation properties.
    - Default value: `_mbx_`.
    - The value is used to search for additional translations that match the following format: `{language_prefix}{language_property}_{language}`.
  - `params.worldviews` **Array<String>** array of ISO 3166-1 alpha-2 country codes used to filter out features of different worldviews.
    - Optional parameter.
    - For now, only the first item in the array will be processed; the rest are discarded. (*TODO in the future*: expand support for more than one worldviews.)
  -`params.worldview_property` **String** the name of the property that specifies in which worldview a feature belongs.
    - Default value: `worldview`.
    - The vector tile encoded property must contain a single ISO 3166-1 alpha-2 country code or a comma-separated string of country codes that define which worldviews the feature represents (for example: `JP`, `IN,RU,US`).
  - `params.worldview_prefix` **String** prefix for the worldview property.
    - Default value: `_mbx_`.
  - `params.worldview_default` **String** default worldview to assume when `params.worldviews` is not provided.
    - Default value: `US`.
  - `params.class_property` **String** the name of the property that specifies the class category of a feature.
    - Default value: `class`.
  - `params.class_prefix` **String** prefix for the class property.
    - Default value: `_mbx_`.
- `callback` **Function** callback function that returns `err` and `buffer` parameters

The existence of the parameters `params.languages` and `params.worldviews` determines the type of features that will be returned:

- Non-localized feature: when `params.languages` and `params.worldviews` both do not exist.
  - No new language property.
  - The property `{language_property}` retains its original value.
  - Properties like `{language_property}_{language}` are kept.
  - Properties like `{language_prefix}{language_property}_{language}` are dropped.
  - All features with `{worldview_property}` are kept.
  - All features with `{worldview_prefix}{worldview_property}` are dropped except for those that have the value `all`.
  - Property `{class_property}` retains its original value.
  - Property `{class_prefix}{class_property}` is dropped.

- Localized feature: when either `params.languages` or `params.worldviews` exists.
  - A new `{language_property}_local` property is created to keep the original value of `{language_property}`
  - The value of `{language_property}` is replaced with the first translation found by looping through `params.languages`.
    - First searches for `{language_property}_{language}` and then `{language_prefix}{language_property}_{language}` before moving on to the next language in `params.languages`.
  - Properties like `{language_property}_{language}` are dropped.
  - Properties like `{language_prefix}{language_property}_{language}` are dropped.
  - All features with `{worldview_property}` are dropped except for those that have the value `all`.
  - Features with `{worldview_prefix}{worldview_property}` are kept if their `{worldview_prefix}{worldview_property}` value is
    - `all`, or
    - a comma-separated list that contains the first item of `parmas.worldviews`, in which case the value of `{worldview_prefix}{worldview_property}` is replaced by that one single worldview country code.
  - If `{class_prefix}{class_property}` exists,
    - Property `{class_property}` is replaced with the value in `{class_prefix}{class_property}`.
    - Property `{class_prefix}{class_property}` is dropped.

#### Example

Example 1: a tile of non-localized features

```js
const { localize } = require('@mapbox/vtcomposite');

const params = {
  // REQUIRED
  buffer: require('fs').readFileSync('./path/to/tile.mvt'),
};

localize(params, function(err, result) {
  if (err) throw err;
  console.log(result); // tile buffer
});
```

Example 2: a tile of localized features in Japan worldview

```js
const { localize } = require('@mapbox/vtcomposite');

const params = {
  // REQUIRED
  buffer: require('fs').readFileSync('./path/to/tile.mvt'),
  // OPTIONAL (defaults)
  languages: ['ja']
  worldviews: ['JP'],
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
