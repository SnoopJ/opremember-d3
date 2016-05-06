var remaining = 2; // Global var to trigger post-load processing
var casualtyjson = {}; // Global var to contain JSON...async grossness
var fakeImages = false; // Global var, fake images or real ones?

var width = 712,
    height = 400;

var defaulttext = "Mouse over a county or personnel node to see its name.  Click a personnel node to see photos associated with that node."
d3.select("#curr").text(defaulttext)

// Thanks to StackOverflow user Peter Bailey for this nice little diddy
// http://stackoverflow.com/a/1267338
// Fills a number (e.g. 33) to a fixed width string by padding with leading zeroes ("033")
function zeroFill( number, width ) {
  width -= number.toString().length;
  if ( width > 0 ) {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

var projection = d3.geo.mercator()
  .center([-77,37+50/60])
    // TODO: scale with svg...somehow.
  .scale(7000)
  .translate([width/2,height*0.9])

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#mdmap")
  // .attr("width", width)
  // .attr("height", height)
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox", "0 0 600 400")

d3.json("md.json", function(error, mapdata) {
  svg.selectAll("path")
    .data(topojson.feature(mapdata, mapdata.objects.out).features)
    .enter()
    .append("g")
    .classed("countygeom",true)
    .attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
    .append("path")
    .attr("d", path)
    .on('mouseover', function(d,i) { d3.select("#curr").text(d.properties.GEODESC) })
    .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })
  // console.log("Geometry loaded, "+(remaining-1)+" remaining things to do...");
  if(!--remaining) {
    // console.log("call doCasualties()");
    doCasualties(casualtyjson);
  }
});

function createInfobox(d,c) {
    d3.select("#mapcontainer")
      .append("div")
      .classed("infobox",true)
      .attr("id", "infobox"+d.countyid)
      .attr("countyid", d.countyid)
      .style({
        'visibility':'hidden',
        'left':c[0]+'px',
        'top':c[1]+'px'
      })
}

// d3.json("ormvdb.json", function(e,json) {
d3.json("bycounty.json", function(e,json) {
    casualtyjson = json;
    // console.log("Casualties loaded, "+(remaining-1)+" remaining things to do...");
    if (e) console.log(e)
    if(!--remaining) {
        // console.log("call doCasualties()");
        doCasualties(casualtyjson);
    }
})

function hoverCircle(d){
  d3.select("#curr")
    .text(d.lname + ", " + d.fname +
      "  ; HOMETOWN: " + d.hometown +
      " (county: " + d.county + " )" )
}

function clickCircle(d) {
  d3.selectAll(".infobox").style("visibility", "hidden")

  infobox = d3.select("#infobox"+d.countyid)
  infobox.style("visibility", "visible")

  // animate a slide-in
  pos = d3.transform( d3.select(this).attr("transform") ).translate
  infobox.style({ "left": pos[0]+20+"px", "top": pos[1]+30+"px" })
  //infobox.transition().duration(100).style({"left": pos[0]+"px", "top": pos[1]+"px"})
}

function createCircle(d) {
  // Using createElementNS is necessary, <circle> is not meaningful in the HTML namespace
  elem = d3.select(document.createElementNS("http://www.w3.org/2000/svg","circle"))
    .classed("name",true)
    .classed("badloc",function() { return d.badloc })
    .attr("recid", d.recid)
    .attr("r",3)
    .attr("transform", function() {
      var lat,lon;
      // "latitude": 38.40481, "longitude": -75.56508
      if ( d.badloc && d.longitude == -78.6122 ) {
        console.log([d.longitude,d.latitude]);
        d.longitude = -78.69971 + Math.random(); // randomly spread out the badlocs that are other states/etc.
        d.latitude = 39 - Math.random();
      }
      lat = d.latitude;
      lon = d.longitude;

      proj = projection([lon,lat])
      return "translate("+ proj[0] +"," + proj[1] + ")"
    })
    .on("mouseover",hoverCircle)
    .on("mouseout", function(d,i) { d3.select("#curr").text(defaulttext) })
    .on("click", clickCircle)
  // console.log("Creating circle for record "+d.recid+" with lat/lon ("+d.latitude+","+d.longitude+")")
  return elem.node()
}
function doCasualties(casualtyjson) {
  svg.append("g").classed("countynames",true)
    .selectAll("g")
    .data(casualtyjson)
    .enter()
    .append("g")
    .attr("countyid",function(d,i) { return d.countyid } )
    .each( function(d,i) {
      var countyid = d.countyid;
      var countycas = d.casualties;
      d3.select(this)
      .selectAll(".names")
      .data(countycas)
      .enter()
      .append(createCircle)
    })
    .data(casualtyjson)
    .enter( function(d,i) {
      var cty = zeroFill(d.countyid,3);
      return cty;
    })
  d3.selectAll(".badloc").style("fill","red") // color bad locations red, for now
}

d3.select(self.frameElement).style("height", height + "px");
