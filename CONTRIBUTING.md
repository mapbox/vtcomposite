# Contributing

Thanks for getting involved and contributing to vt-composite :tada: Below are a few things to setup when submitting a PR.

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

* Note for MacOS: if you're having issue building on MacOS, try commenting out [`make_global_settings` in binding.gyp](https://github.com/mapbox/vtcomposite/blob/main/binding.gyp#L5-L9) (for more info see [this](https://github.com/mapbox/node-cpp-skel/pull/169#issuecomment-1068127191)).

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

# Code comments

If adding new code, be sure to include relevant code comments. Code comments are a great way for others to learn from your code. This is especially true within the skeleton, since it is made for learning.

# Update Documentation

Be sure to update any documentation relevant to your change. This includes updating the [CHANGELOG.md](https://github.com/mapbox/node-cpp-skel/blob/master/CHANGELOG.md).

# [Code Formatting](/docs/extended-tour.md#clang-tools)

We use [this script](/scripts/clang-format.sh#L20) to install a consistent version of [`clang-format`](https://clang.llvm.org/docs/ClangFormat.html) to format the code base. The format is automatically checked via a Travis CI build as well. Run the following script locally to ensure formatting is ready to merge:

    make format

We also use [`clang-tidy`](https://clang.llvm.org/extra/clang-tidy/) as a C++ linter. Run the following command to lint and ensure your code is ready to merge:

	make tidy

These commands are set from within [the Makefile](./Makefile).

# Releasing

In short, you'll need to push a commit with the log line containing `[publish binary]` to build the binary, followed by an `npm publish`. See [node-cpp-skel](https://github.com/mapbox/node-cpp-skel/blob/d2848ed5bcc5a798ff39a2ac139b70844043ff11/docs/publishing-binaries.md) for all the details.
