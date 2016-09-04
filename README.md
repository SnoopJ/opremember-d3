# opremember-d3
interactive map for Operation Remember using d3.js, viewable at http://snoopjedi.github.io/opremember-d3/

Operation Remember is an effort to recover a photograph of each of the 1046 Sons of Maryland that died in the Vietnam War.
https://ormv.wordpress.com/

All source code is available for re-use under the terms of the MIT License (see LICENSE file), and **all rights to casualty photos remain with the family and friends who generously provided them to the project**.

### Sources used:
Populated place database from US.txt, via [GeoNames.org](http://www.geonames.org/export/)

TopoJSON file generated using [ogr2ogr](http://www.gdal.org/ogr2ogr.html) and [TopoJSON](https://github.com/mbostock/topojson):

Cartographic data from [census.gov](http://www.census.gov/geo/maps-data/data/cbf/cbf_counties.html) cartographic county boundary shapefiles for the US (1:500,000 resolution)

TopoJSON files prepared with these settings, where STATEFP is the [FIPS code](https://en.wikipedia.org/wiki/FIPS_county_code) for the state of interest:
```
ogr2ogr -f GeoJSON out.json -t_srs crs:84 -select STATEFP,COUNTYFP,NAME -where "STATEFP = '24'" cb_2015_us_county_500k.shp
topojson -o md.json -p -- out.json
```

Choropleth color scale created with help from [Colorbrewer.org](http://colorbrewer2.org/)
