const express = require('express')
const mvtFixtures = require('@mapbox/mvt-fixtures');
const app = express(); 
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const vtcomposite = require('../lib/index.js');
const ejs = require('ejs');
const bodyParser = require('body-parser');

app.engine('html', require('ejs').renderFile);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  let layer;
  let typeStyling = 'line';
  let paintStyling = {
    "line-opacity": 0.6,
    "line-color": "rgb(53, 175, 109)",
    "line-width": 2
  }
  let layout = {
    "line-cap": "round",
    "line-join": "round"
  };

  let paintStylingCopy = Object.assign({}, paintStyling);
  paintStylingCopy["line-color"] = "rgb(255, 0, 0)";


  switch(req.query.type){
    case 'points':
      layer = 'poi_label';
      paintStyling = {
        "circle-radius": 10,
        "circle-color": "#007cbf"
      };
      typeStyling = 'circle';
      layout = {};
      let colorCopy = Object.assign({}, paintStyling);
      colorCopy["circle-color"] = "rgb(255, 0, 0)";
      paintStylingCopy = colorCopy;
      break;
    case 'lines':
      layer = 'road';
      break; 
    case 'polygons':
      layer = 'building';
      break;
    default:
      layer = 'lines';
      break 
  }

  return res.render('./index.html', {type:req.query.type, 
    layer:layer, 
    typeStyling:typeStyling, 
    paintStyling:JSON.stringify(paintStyling),
    layout:JSON.stringify(layout), 
    paintStylingCopy: JSON.stringify(paintStylingCopy)
  });
});


app.get('/:type/:z(\\d+)/:x(\\d+)/:y(\\d+).mvt', (req, res) => {  
  //* is where you can specify domains to allow requests from
  res.set({
    'Content-Type': 'application/vnd.mapbox-vector-tile',
    'Content-Encoding': 'gzip', 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept" 
  });
  // mapbox gl requries of tilejson spec, therefore requires url to zxy in it 
  const z = parseInt(req.params.z);
  const x = parseInt(req.params.x);
  const y = parseInt(req.params.y);  

  console.log(`${z}/${x}/${y}`);

  const type = req.params.type;

  console.log('path', type, path.join(__dirname, 'fixtures', `${type}.mvt`));
  
  if(z === 6 && x === 10 && y === 22){
    const tile = fs.readFileSync(path.join(__dirname, 'fixtures', `${type}.mvt`));
    return res.send(zlib.gzipSync(tile));
  }

  if (z === 7 && x === 20 && y === 44) {
    const tile = fs.readFileSync(path.join(__dirname, 'fixtures', `${type}.mvt`));

    vtcomposite([{buffer:zlib.gzipSync(tile),z:6, x:10, y:22}], {z:z, x:x, y:y}, {}, function(e, vtBuffer){
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