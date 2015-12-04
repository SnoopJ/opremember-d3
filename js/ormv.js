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
function zeroFill( number, width )
{
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
  .attr("width", width)
  .attr("height", height)

d3.json("md.json", function(error, md) {
  svg.selectAll("path")
    .data(md.features)
    .enter()
    .append("g")
    .attr("class", "countygeom")
    .attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
    .append("path")
    .attr("d", path)
    .on('mouseover', function(d,i) { d3.select("#curr").text(d.properties.GEODESC) })
    .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })
    .each(function createSibling (d){ 
      svg.append("g")
      .attr("class", "names")
      .attr("countyid", d.properties.CNTY00) 
    })
  console.log("Geometry loaded, "+(remaining-1)+" remaining things to do...");
  if(!--remaining) {
    console.log("call doCasualties()");
    doCasualties(casualtyjson);
  }
});

function createInfobox(d,c) { 
    d3.select("#mapcontainer")
      .append("div")
      .attr("class", "infobox")
      .attr("id", "infobox"+d.countyid)
      .attr("countyid", d.countyid) 
      .style({
        'visibility':'hidden', 
        'left':c[0]+'px', 
        'top':c[1]+'px' 
      })
}

// should probably be factored into a sort() function and a create() function
function sortDataByCounty( data ) {
  dataByCounty = {};
  data.map(function (d) { 
    console.log("Recid " + d.recid + " with lat/lon (" + d.latitude + "," + d.longitude + ")" )
    if (d.countyid === 999) { 
      console.log( "Rec " + d.recid + " is marked county 999, skipping")
      return
    }
    sel = "g.countygeom[countyid=\""+zeroFill(d.countyid,3)+"\"]"
    g = d3.select(sel)
    if ( g.empty() ) {
      console.log( "Rec " + d.recid + " g.countygeom selector ("+sel+") came back empty, skipping!" )
      return
    }
    if (!Array.isArray(dataByCounty[d.countyid])) { 
      if ( typeof(d.countyid) == 'undefined' ) { 
        console.log( "Rec " + d.recid + " has no defined countyid, skipping!" )
        return 
      }
      c = path.centroid( g.datum() )
      createInfobox(d,c)
      dataByCounty[d.countyid]=[]
    }
// TODO: resolve null lat/lon pairs to centroid of parent (and color or something)
    if ( d.latitude === null ) {
        console.log("Null lat for record " + d.recid + ", using parent centroid")
        c = projection.invert(path.centroid( g.datum() ))
        console.log("Parent centroid is " + c)
        d.latitude = c[1]
        d.longitude = c[0]
    }
    dataByCounty[d.countyid].push(d)
  })
  d3.selectAll(".infobox")
    .selectAll("p")
    .data( function getCountyCasualties() { 
      p = d3.select(this.parentNode)
      cty = p.attr("countyid")
      return dataByCounty[cty]
    })
  .enter()
  .append("p")
  .text(function(d) { return "Casualty: " + d.fname + " " + d.lname } )
  .append("img").attr("src",function(d) { 
    if (!d.hasphoto || d.photo === null ) { return "" }
    if ( fakeImages ) { return "img/1111.png" }
    //return "img/"+d.recid+".png" 
    return "img/"+d.photo 
  })
  return dataByCounty
}

// Handler for the data() call binding casualties to circles
// 'this' corresponds to the <circle> in question, so the parentNode is a .names <g>
function getCasualties() { 
    countyid = d3.select(this.parentNode).attr("countyid")
//    console.log("Getting casualties for "+countyid)
    d=casualtiesbycounty[parseInt(countyid)]
    if (d === undefined) {
        return []
    }
    return [].concat(d)
}

d3.json("ormvdb.json", function(e,json) {
    casualtyjson = json;
    console.log("Casualties loaded, "+(remaining-1)+" remaining things to do...");
    if (e) console.log(e)
    if(!--remaining) {
        console.log("call doCasualties()");
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
    .attr("class", "name")
    .attr("recid", d.recid)
    .attr("r",5)
    .attr("transform", function() { 
      proj = projection([d.longitude,d.latitude])
      return "translate("+ proj[0] +"," + proj[1] + ")"
    })
    .on("mouseover",hoverCircle)
    .on("mouseout", function(d,i) { d3.select("#curr").text(defaulttext) })
    .on("click", clickCircle)
  if (d.badloc) { 
    elem.style({fill:'black', hover:'blue'}) 
  }
  console.log("Creating circle for record "+d.recid+" with lat/lon ("+d.latitude+","+d.longitude+")")
  return elem.node()
}
function doCasualties(casualtyjson) {
  casualtiesbycounty = sortDataByCounty(casualtyjson);
  // casualty circles
  circleSelector = svg.selectAll(".names").selectAll("circle")
  circleSelector.data(getCasualties)
    .enter()
    .append(createCircle)
}

d3.select(self.frameElement).style("height", height + "px");

