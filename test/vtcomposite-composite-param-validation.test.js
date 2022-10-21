'use strict';

const test = require('tape');
const vt = require('../lib/index.js');

const composite = vt.composite;

test('[composite] failure: fails without callback function', (assert) => {
  try {
    composite();
  } catch (err) {
    assert.ok(/last argument must be a callback function/.test(err.message), 'expected error message');
    assert.end();
  }
});

test('[composite] failure: buffers is not an array', (assert) => {
  composite('i am not an array', { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'first arg \'tiles\' must be an array of tile objects');
    assert.end();
  });
});

test('[composite] failure: buffers array is empty', (assert) => {
  const buffs = [];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'tiles\' array must be of length greater than 0');
    assert.end();
  });
});

test('[composite] failure: item in buffers array is not an object', (assert) => {
  const buffs = [
    'not an object'
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'items in \'tiles\' array must be objects');
    assert.end();
  });
});

test('[composite] failure: buffer value does not exist', (assert) => {
  const buffs = [
    {
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a buffer value');
    assert.end();
  });
});

test('[composite] failure: buffer value is null', (assert) => {
  const buffs = [
    {
      buffer: null,
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'buffer value in \'tiles\' array item is null or undefined');
    assert.end();
  });
});

test('[composite] failure: buffer value is not a buffer', (assert) => {
  const buffs = [
    {
      buffer: 'not a buffer',
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'buffer value in \'tiles\' array item is not a true buffer');
    assert.end();
  });
});

test('[composite] failure: buffer object missing z value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      // z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'z\' value');
    assert.end();
  });
});

test('[composite] failure: buffer object missing x value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      // x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'x\' value');
    assert.end();
  });
});

test('[composite] failure: buffer object missing y value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      // y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'y\' value');
    assert.end();
  });
});

test('[composite] failure: buffer object z value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 'zero',
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object x value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 'zero',
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object y value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 'zero'
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: buffer object z value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: -10,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: buffer object x value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: -5,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: buffer object y value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: -4
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: layers option is not an array', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: 'not an array'
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'layers\' value in the \'tiles\' array must be an array');
    assert.end();
  });
});

test('[composite] failure: layers option is an empty array', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: []
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'layers\' array must be of length greater than 0');
    assert.end();
  });
});

test('[composite] failure: layers option is an array with invalid types (not strings)', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0,
      layers: [1, 2, 3, 'correct']
    }
  ];
  composite(buffs, { z:3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'items in \'layers\' array must be strings');
    assert.end();
  });
});

// TESTS FOR ZXY MAP REQUEST!

test('[composite] failure: map request zxy missing z value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'z\' value');
    assert.end();
  });
});

test('[composite] failure: map request zxy missing x value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'x\' value');
    assert.end();
  });
});

test('[composite] failure: map request zxy missing y value', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, 'item in \'tiles\' array does not include a \'y\' value');
    assert.end();
  });
});

test('[composite] failure: map request zxy z value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:'zero', x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy x value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:'zero', y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy y value is not an int32', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:'zero' }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value in \'tiles\' array item is not an int32');
    assert.end();
  });
});

test('[composite] failure: map request zxy z value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 10,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:-3, x:1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'z\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: map request zxy x value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:-1, y:0 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'x\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: map request zxy y value is negative', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:3, x:1, y:-4 }, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'y\' value must not be less than zero');
    assert.end();
  });
});

test('[composite] failure: map request zxy is not an object', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, true, {}, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'zxy_maprequest\' must be an object');
    assert.end();
  });
});

test('[composite] failure: compress must be a boolean', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:0, x:0, y:0 }, { compress:'hi' }, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'compress\' must be a boolean');
    assert.end();
  });
});

test('[composite] failure: options must be an object', (assert) => {
  const buffs = [
    {
      buffer: Buffer.from('hey'),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:0, x:0, y:0 }, true, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'options\' arg must be an object');
    assert.end();
  });
});

test('[composite] failure: buffer size is not int32', (assert) => {
  const buffs = [
    {
      buffer: new Buffer.alloc(10),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:0, x:0, y:0 }, { buffer_size:'hi' }, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'buffer_size\' must be an int32');
    assert.end();
  });
});

test('[composite] failure: buffer size is not positive int32', (assert) => {
  const buffs = [
    {
      buffer: new Buffer.alloc(10),
      z: 0,
      x: 0,
      y: 0
    }
  ];
  composite(buffs, { z:0, x:0, y:0 }, { buffer_size:-10 }, (err) => {
    assert.ok(err);
    assert.equal(err.message, '\'buffer_size\' must be a positive int32');
    assert.end();
  });
});
