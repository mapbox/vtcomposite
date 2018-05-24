const express = require('express')
const mvtFixtures = require('@mapbox/mvt-fixtures');
const app = express();
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const vtcomposite = require('../lib/index.js');

app.use((req, res, next) => {
  //* is where you can specify domains to allow requests from
  res.set({
    'Content-Type': 'application/vnd.mapbox-vector-tile',
    'Content-Encoding': 'gzip',
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
  });
  next();
});

app.get('/tiles/:z(\\d+)/:x(\\d+)/:y(\\d+).mvt', (req, res) => {
  // mapbox gl requries of tilejson spec, therefore requires url to zxy in it
  const z = parseInt(req.params.z);
  const x = parseInt(req.params.x);
  const y = parseInt(req.params.y);

  console.log(`${z}/${x}/${y}`);

  const tile = zlib.gzipSync(getTile('sanfrancisco', '15-5239-12666.mvt'));

  if(z === 6 && x === 10 && y === 22){
    return res.send(tile);
  }

  if (z === 7 && x === 20 && y === 44) {
    vtcomposite([{buffer:tile,z:6, x:10, y:22}], {z:z, x:x, y:y}, {buffer_size:128}, function(e, vtBuffer){
      console.log('vtcomposite errors', e);
      console.log(vtBuffer, 'buffer');
      return res.send(zlib.gzipSync(vtBuffer));
    });
  }else{
    return res.status(404).send("Sorry can't find that!");
  }


  // you can make your tile server available on a network - everyone going to a webpage requesting from a single IP
});

function getTile(name, file) {
  return fs.readFileSync(path.join(__dirname, '..', 'node_modules', '@mapbox', 'mvt-fixtures', 'real-world', name, file))
}

app.listen(3000, () => console.log('Example app listening on port 3000!'));
