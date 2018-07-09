"use strict";

const argv = require('minimist')(process.argv.slice(2));
if (!argv.iterations || !argv.concurrency) {
  console.error('Please provide desired iterations, concurrency');
  console.error('Example: \nnode bench/node-mapnik.bench.js --iterations 50 --concurrency 10');
  process.exit(1);
}

// This env var sets the libuv threadpool size.
// This value is locked in once a function interacts with the threadpool
// Therefore we need to set this value either in the shell or at the very
// top of a JS file (like we do here)
process.env.UV_THREADPOOL_SIZE = argv.concurrency;

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Queue = require('d3-queue').queue;
const vtquery = require('../lib/index.js');
const rules = require('./rules');
let ruleCount = 1;
const mapnik = require('mapnik');

const track_mem = argv.mem ? true : false;
const runs = 0;
const memstats = {
  max_rss:0,
  max_heap:0,
  max_heap_total:0
};


// run each rule synchronously
const ruleQueue = Queue(1);
rules.forEach(function(rule) {
  ruleQueue.defer(runRule, rule);
});

ruleQueue.awaitAll(function(err, res) {
  if (err) throw err;
  process.stdout.write('\n');
});

function runRule(rule, ruleCallback) {

  process.stdout.write(`\n${ruleCount}: ${rule.description} ... `);

  let runs = 0;
  let runsQueue = Queue();

  function run(cb) {
    if (rule.tiles.length > 0) {
      var target_vt = new mapnik.VectorTile(rule.zxy.z, rule.zxy.x, rule.zxy.y);

      var source_tiles = new Array(rule.tiles.length);
      for (var i = 0; i < rule.tiles.length; ++i)
      {
        var vt = new mapnik.VectorTile(rule.tiles[i].z,rule.tiles[i].x,rule.tiles[i].y);
        vt.addDataSync(rule.tiles[i].buffer);
        source_tiles[i] = vt;
      }

      // http://mapnik.org/documentation/node-mapnik/3.6/#VectorTile.composite
      target_vt.composite(source_tiles, rule.options, function(err, result) {
        if (err) {
          return cb(err);
        }
        ++runs;
        if (track_mem && runs % 1000) {
          var mem = process.memoryUsage();
          if (mem.rss > memstats.max_rss) memstats.max_rss = mem.rss;
          if (mem.heapTotal > memstats.max_heap_total) memstats.max_heap_total = mem.heapTotal;
          if (mem.heapUsed > memstats.max_heap) memstats.max_heap = mem.heapUsed;
        }
        return cb();
      });
    } else {
      return cb();
    }
  }

  // Start monitoring time before async work begins within the defer iterator below.
  // AsyncWorkers will kick off actual work before the defer iterator is finished,
  // and we want to make sure we capture the time of the work of that initial cycle.
  var time = +(new Date());

  for (var i = 0; i < argv.iterations; i++) {
    runsQueue.defer(run);
  }

  runsQueue.awaitAll(function(error) {
    if (error) throw error;
    if (runs != argv.iterations) {
      throw new Error(`Error: did not run as expected - ${runs} != ${argv.iterations}`);
    }
    // check rate
    time = +(new Date()) - time;

    if (time == 0) {
      console.log("Warning: ms timer not high enough resolution to reliably track rate. Try more iterations");
    } else {
    // number of milliseconds per iteration
      var rate = runs/(time/1000);
      process.stdout.write(rate.toFixed(0) + ' runs/s (' + time + 'ms)');
    }

    // There may be instances when you want to assert some performance metric
    //assert.equal(rate > 1000, true, 'speed not at least 1000/second ( rate was ' + rate + ' runs/s )');
    ++ruleCount;
    return ruleCallback();
  });
}

function log(message) {
  if (argv.output && argv.output === 'json') {
    // handle JSON output
  } else {
    process.stdout.write(message);
  }
}
