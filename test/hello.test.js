var test = require('tape');
var module = require('../lib/index.js');


test('[composite] composites two tiles at same zoom level successfully', function(t) {
  var vtileSourceBuffers = [
    {buffer: Buffer(), z:3, x:1, y:0}, 
    {buffer: Buffer(), z:3, x:1, y:1}
  ];
  
  var zxy_ofmaprequest = {z:3, x:0, y:1}; 

  var options = {}; 

  module.composite(vtileSourceBuffers, zxy_ofmaprequest, options, function(err, vtBuffer){
    // console.log(vtBuffer); 
    // t.equal(vtBuffer, 'mocked output buffer', 'returned single buffer');
  });
  t.end();
});

