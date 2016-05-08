# opremember-d3
interactive map for Operation Remember using d3.js, viewable at http://snoopjedi.github.io/opremember-d3/

Operation Remember is an effort to recover a photograph of each of the 1046 Sons of Maryland that died in the Vietnam War.
https://ormv.wordpress.com/

### Sources used:
Populated place database from US.txt, via [GeoNames.org](http://www.geonames.org/export/)

MD geo data from [2010 census boundary maps (county-level)](http://www.mdp.state.md.us/msdc/S5_Map_GIS.shtml), TopoJSON file generated using [ogr2ogr](http://www.gdal.org/ogr2ogr.html) and [TopoJSON](https://github.com/mbostock/topojson):

DC geo data from [opendata.dc.gov](http://opendata.dc.gov/datasets/af488e80c4cc47b8ad788571b7566f2b_13)

TopoJSON files prepared with these settings:
`# ogr2ogr and topojson need to be in PATH`  
`ogr2ogr -f GeoJSON -t_srs crs:84 out.json cnty2010.shp`  
` topojson -o MD.json -p --simplify-proportion 2e-2 -- out.json`

`ogr2ogr -f GeoJSON -t_srs crs:84 DC.json cnty2010.shp`  
` topojson -o DC.json -p --simplify-proportion 2e-3 -- DC.json`

Choropleth color scale created with help from [Colorbrewer.org](http://colorbrewer2.org/)
