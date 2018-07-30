"use strict";

/**
 * @name vtcomposite
 *
 * @param {Array<Object>} tiles an array of tile objects with `buffer`, `z`, `x`, and `y` values
 * @param {Array<Object>}  `z`, `x`, and `y` values of a map request 
 * @param {Object} [options]
 * @param {Boolean} [options.compress=false] a boolean value indicating whether or not to return a compressed buffer. Default is to return a uncompressed buffer.
 * @param {Number} [options.buffer_size=0] the buffer size of a tile, indicating the tile extent that should be composited and/or clipped. Default is `buffer_size=0`.
 *
 * @example
 * const vtcomposite = require('@mapbox/vtcomposite');
 * const fs = require('fs');
 *
 * const tiles = [
 *   { buffer: fs.readFileSync('./path/to/tile.mvt'), z: 15, x: 5238, y: 12666 },
 *   { buffer: fs.readFileSync('./path/to/tile.mvt'), z: 15, x: 5238, y: 12666 }
 * ];
 *
 * const options = {
 *   compress: true,
 *   buffer_size: 0
 * };
 *
 * const zxy = {z:5, x:5, y:12};
 *
 * vtcomposite(tiles, zxy, options, function(err, result) {
 *   if (err) throw err;
 *   console.log(result); // tile buffer
 * });
 */

module.exports = require('./binding/vtcomposite.node').composite;
