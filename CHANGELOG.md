# 2.1.0

- Add lanuage code "local" [#133](https://github.com/mapbox/vtcomposite/pull/133)

# 2.0.2

- Fixes a bug in `localize` where the class and worldview key prefixes were true for soft matches, which unintentionally filters out features where `class = class*`. Now the logic uses an exact match so `class != classes`. [#134](https://github.com/mapbox/vtcomposite/pull/134)

# 2.0.1

- Fixes a bug in `localize` function that throws an error when languages or worldviews is an empty array [#131](https://github.com/mapbox/vtcomposite/pull/131)

# 2.0.0

- Updates the `localize` function to return features with either all properties localized or features with no properties localized; nothing in between [#129](https://github.com/mapbox/vtcomposite/pull/129).

# 1.1.0

- Updates the `localize` function to translate `_mbx_class` to `class` when `_mbx_worldview` is provided along with matching worldview filtering


# 1.0.0

**BREAKING** Module now returns an object with two functions [#127](https://github.com/mapbox/vtcomposite/pull/127)

```js
const { composite, localize } = require('@mapbox/vtcomposite');
```

- Adds a new function `localize` which finds and removes unused translations and worldviews from features.
- Update mvt-fixtures@3.9.0
- Update tape@4.15.1
- Move tutorial from README.md into TUTORIAL.md
- Move benchmarking from README.md into CONTRIBUTING.md


# 0.6.1
- Build binaries with node v16 -> works at runtime with node v8 -> v16 (and likely others)
- Remove `-D_GLIBCXX_USE_CXX11_ABI=0` build flag
- Upgrade dependencies [#119](https://github.com/mapbox/vtcomposite/pull/119)
  - `node-addon-api` ^4.3.0
  - `@mapbox/node-pre-gyp` ^1.0.8
  - `@mapbox/cloudfriend` ^5.1.0
  - `@mapbox/mvt-fixtures` ^3.7.0
  - `@mapbox/sphericalmercator` ^1.2.0
  - `@mapbox/tilebelt` ^1.0.2
  - `aws-sdk` ^2.1074.0
  - `bytes` ^3.1.2
  - `d3-queue` ^3.0.
  - `mapnik` ^4.5.9
  - `pbf` ^3.2.1
  - `tape` ^4.5.2

# 0.6.0

- Return empty `Buffer` if a composite operation results in a empty tile, even if `compress: true` is set. This can happen if a tile is overzoomed and results in no layers, but the resulting buffer was gzipped, which leads to a non-empty gzipped buffer with no data, specifically: `<Buffer 1f 8b 08 00 00 00 00 00 00 13 03 00 00 00 00 00 00 00 00 00>`. The result of this change is that users should check the response `buffer.length > 0` if they need to handle empty tiles separately from non-empty tiles.

# 0.5.1

- Bugfix for v0.5.0 to fix an issue where compositing multiple tiles with specific layers included would drop same-named layers [#114](https://github.com/mapbox/vtcomposite/pull/114)

# 0.5.0

- Add `buffers[n].layers` array to allow keeping of specific layers during compositing [#113](https://github.com/mapbox/vtcomposite/pull/113)
- Remove copied documentation from node-cpp-skel [#113](https://github.com/mapbox/vtcomposite/pull/113)

# 0.4.0

- Upgrade to use `@mapbox/node-pre-gyp` >= v1.0.0 [#108](https://github.com/mapbox/vtcomposite/pull/108)
- Upgrade to use `node-addon-api` >= v3.1.0 [#108](https://github.com/mapbox/vtcomposite/pull/108)
- Upgrade to use `node-mapnik` >= 4.5.6 [#108](https://github.com/mapbox/vtcomposite/pull/108)
- Check `tile_buffer` is not empty before accessing internal data [info](https://github.com/mapbox/vtcomposite/pull/108#discussion_r580344270)

# 0.3.0

- Now supporting node v12/v14 by switching to "universal" binaries that work across all major node major versions that support N-API. Binaries were built using node v12, but work at runtime with node v8 -> v14 (and likely others)
- Upgraded dependencies including node-addon-api, node-pre-gyp, boost, geometry.hpp, protozero, variant and vtzero
- Binaries are now compiled with clang 10.x

# 0.2.1

- Revert polygon decoding PR that snuck into 0.2.0 release [#91](https://github.com/mapbox/vtcomposite/pull/91)
- Remove `valid=false`, which fixes a linestring clipping bug [#98](https://github.com/mapbox/vtcomposite/pull/98)
- Polygon clipping fix [#101](https://github.com/mapbox/vtcomposite/pull/101)

# 0.2.0

- Upgrade to use N-API and remove nan/node-pre-gyp deps
- Fix issue with comparison operators in feature builder [942a560](https://github.com/mapbox/vtcomposite/commit/942a560bbb2152ea9fc98b0ac970bdcec498429a)

# 0.1.3

- Upgrade nan and node-pre-gyp

# 0.1.2

- Reduced the package size
- Upgraded to latest @mapbox/mvt-fixtures and @mapbox/mason-js

# 1/9/2018

* Add memory stats option to bench tests

# 1/4/2018

* Add doc note about remote vs local coverage using `LCOV`

# 11/17/2017

* Add liftoff script, setup docs, and more contributing details per https://github.com/mapbox/node-cpp-skel/pull/87

# 10/31/2017

* Add [sanitzer flag doc](https://github.com/mapbox/node-cpp-skel/pull/84)
* Add [sanitizer script](hhttps://github.com/mapbox/node-cpp-skel/pull/85) and enable [leak sanitizer](https://github.com/mapbox/node-cpp-skel/commit/725601e4c7df6cb8477a128f018fb064a9f6f9aa)
*

# 10/20/2017

* Add [code of conduct](https://github.com/mapbox/node-cpp-skel/pull/82)
* Add [CC0 license](https://github.com/mapbox/node-cpp-skel/pull/82)
* Point to [cpp glossary](https://github.com/mapbox/node-cpp-skel/pull/83)

# 10/12/2017

* Update compiler flags per best practices per https://github.com/mapbox/cpp/issues/37
  - https://github.com/mapbox/node-cpp-skel/pull/80
  - https://github.com/mapbox/node-cpp-skel/pull/78
  - https://github.com/mapbox/node-cpp-skel/pull/77

# 09/10/2017

* [Sanitize update](https://github.com/mapbox/node-cpp-skel/pull/74)

# 08/24/2017

* Clang tidy updates
  - https://github.com/mapbox/node-cpp-skel/pull/68
  - https://github.com/mapbox/node-cpp-skel/issues/65
  - https://github.com/mapbox/node-cpp-skel/pull/64
  - https://github.com/mapbox/node-cpp-skel/pull/66

# 08/15/2017

* Add [bench scripts](https://github.com/mapbox/node-cpp-skel/pull/61) for async examples

# 08/09/2017

* Add comments about "new" allocation

# 08/08/2017

* Add [clang-format](https://github.com/mapbox/node-cpp-skel/pull/56)

# 08/04/2017

* Use Nan's safer and high performance `Nan::Utf8String` when accepting string args per https://github.com/mapbox/node-cpp-skel/pull/55

# 08/3/2017

* Reorganize [documentation](https://github.com/mapbox/node-cpp-skel/pull/53)

# 07/21/2017

* Add [object_async example](https://github.com/mapbox/node-cpp-skel/pull/52)

# 07/11/2017

* Add [build docs](https://github.com/mapbox/node-cpp-skel/pull/51)

* It begins
