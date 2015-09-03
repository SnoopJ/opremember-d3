var remaining = 2; // Global var to trigger post-load processing

var width = 960,
    height = 900;

var defaulttext = "Mouse over a county or personnel node to see its name.  Click a county to enlarge it."
d3.select("#curr").text(defaulttext)

var projection = d3.geo.mercator()
  .center([-77,37+50/60])
  .scale(10000)
  .translate([width/2,height*0.6])

var path = d3.geo.path()
    .projection(projection);

var div = d3.select("body")
  .append("div")
  .attr("id", "mapcontainer")
  .attr("width", width)
  .attr("height", height)
  .attr("position", "absolute")

var svg = div.append("svg")
  .attr("width", width)
  .attr("height", height)

// Object for containing casualty information
function casualty(j) {
  this.json = j
}

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
  if(!--remaining) doCasualties();
});

function createInfobox(d) { 
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
    if (!Array.isArray(dataByCounty[d.countyid])) { 
      g = d3.select("g.countygeom[countyid=\""+d.countyid+"\"]")
      c = path.centroid( g.datum() )
      // casualty info box
      createInfobox(d)
      dataByCounty[d.countyid]=[]
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
    if (!d.hasphoto) { return "" }
    return "img/"+d.recid+".png" 
  })
  return dataByCounty
}

// Handler for the data() call binding casualties to circles
// 'this' corresponds to the <circle> in question, so the parentNode is a .names <g>
function getCasualties() { 
    countyid = d3.select(this.parentNode).attr("countyid")
    d=casualtiesbycounty[countyid]
    if (d === undefined) {
        return []
    }
    return [].concat(d)
}

d3.json("ormvdb.json", function(e,json) {
    if(!--remaining) {
        console.log(remaining);
        doCasualties(json);
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
    .attr("r",5)
    .attr("transform", function() { 
      proj = projection([d.longitude,d.latitude])
      return "translate("+ proj[0] +"," + proj[1] + ")"
    })
    .on("mouseover",hoverCircle)
    .on("mouseout", function(d,i) { d3.select("#curr").text(defaulttext) })
    .on("click", clickCircle)
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

