# Tutorial

## What is compositing?

Compositing is a tool to combine multiple vector tiles into a single tile. Compositing allows a user to:

- **Merge tiles.** Merges 2 or more tiles into a single tile at the same zoom level.
- **Overzoom tiles.** Displays data at a higher zoom level than that the tileset max zoom.
- **Clip tiles.** Clips the extraneous portion of a tile that’s been overzoomed.

## Compositing: Merging 2+ Tiles

Let’s say you have two tiles at `z5` - `santacruz.mvt` & `losangeles.mvt`. Each tile contains a single point that corresponds to one of the two cities. You could generate a single tile, `santa_cruz_plus_la-5-5-12.mvt` that contains both points by compositing the two tiles.

## Source Tiles

`santacruz.mvt` - single point

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946395305_sc.png)


`losangeles.mvt` - single point

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946414805_la.png)


## Output Tile

**Composited Tile:** `santa_cruz_plus_la-5-5-12.mvt`


![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946439263_scla.png)


**`vtcomposite` code:**


    const santaCruzBuffer = fs.readFileSync('/santacruz.mvt');
    const losAngelesBuffer = fs.readFileSync('/losangeles.mvt');

    const tiles = [
      {buffer: santaCruzBuffer, z:5, x:5, y:12},
      {buffer: losAngelesBuffer, z:5, x:5, y:12}
    ];

    const zxy = {z:5, x:5, y:12};

    composite(tiles, zxy, {}, (err, vtBuffer) => {
      fs.writeFileSync('/santa_cruz_plus_la-5-5-12.mvt', vtBuffer);
    });


## Compositing: Overzooming & Clipping Tiles
![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1531946439263_scla.png)



Let’s say we want to display our composited tile: `santa_cruz_plus_la-5-5-12.mvt` at `z6`.

We know that as zoom levels increase, each tile divides into four smaller tiles. We can calculate each the `zxy` of the z6 tiles using the formula outlined below. There are also libraries, such as [*mapbox/tilebelt*](http://github.com/mapbox/tilebelt) that calculate the parent or children tiles for you, as well as other tile math calculations.



If the `zxy` is `5/5/12`, the `z6` children tiles are located at:

![](https://d2mxuefqeaa7sj.cloudfront.net/s_04E22B61D71C1B99F8EBA3C41F5DDF0F28DDD0F66171831E6A32600C9DBCD6E9_1532040176336_Screen+Shot+2018-07-19+at+3.42.16+PM.png)


**`vtcomposite` code:**


    const santaCruzAndLABuffer = fs.readFileSync('/santa_cruz_plus_la-5-5-12.mvt');

    const tiles = [
      {buffer: santaCruzAndLABuffer, z:5, x:5, y:12}
    ];

    //map request
    const zxy = {z:6, x:10, y:24};

    composite(tiles, zxy, {}, (err, vtBuffer) => {
      fs.writeFileSync('/santa_cruz_plus_la-6-10-24.mvt', vtBuffer);
    });

In this example, the tile being requested is at z6, but our source tile is a z5 tile. In this scenario, we must **overzoom**.

Each zoom level scales geometries by a power of 2. Thus, you can calculate coordinates at each zoom level knowing the original geometry and the (over)zoom factor.


      // original geometry = Santa Cruz tile coordinate at 5/5/12
      const originalGeometry = {x:637, y:1865};
      let x = originalGeometry.x;
      let y = originalGeometry.y;

      //increasing geometry size by a zoom factor of 1
      const zoom_factor = 1;

      const scale = Math.pow(2,zoom_factor); //1 << 1

      //scale x and y geometries by the zoom_factor
      let xScale = x*scale;
      let yScale = y*scale;

      //divide the scaled geometries by the tile extent (4096) to see the point moves to another tile
      let xtileOffset = Math.floor(xScale/4096);
      let ytileOffset = Math.floor(yScale/4096);

      //subtract the difference between the x and y tileoffsets.
      let xOffset = xScale - (xtileOffset * 4096);
      let yOffset = yScale - (ytileOffset * 4096);

      //the xOffset and yOffset will be the x,y point at z6


Based off these equations, we know that resulting `(x,y)` point geometries for Santa Cruz and Los Angeles overzoomed at `z6` are:


    Santa Cruz point = [1274, 3730] at zxy 6/10/24
    Los Angeles point = [90, 2318] at zxy 6/11/25


## Clipping

Wait a second…! Los Angeles isn’t the tile we requested - `{z:6, x:10, y:24}` - it’s in `{z:6, x:11, y:25}`.

That means we need to **clip** the overzoomed geometries to only include the point(s) we need for tile  `{z:6, x:10, y:24}`. Since Santa Cruz is the only geometry in `{z:6, x:10, y:24}`, we **clip** extraneous data, which means we remove any geometries that are not included in the `z6` tile, but *are* included in the parent tile that’s been overzoomed - `{z:5, x:5, y:12}`. See ya Los Angeles!

## Clipping with a `buffer_size`

In the example above, we clipped geometries based on the default tile boundaries (4096X4096). However, the `composite` function always us to have control over which geometries we include/exclude outside the requested tile when clipping. By passing in a `buffer_size` to the compositing function, we are able to explicitly state if we want to keep geometries outside the tile extent when overzooming.

