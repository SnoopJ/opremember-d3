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
	.attr("width", width)
        .attr("height", height)
    	.attr("position", "absolute")

var svg = div.append("svg")
    .attr("width", width)
    .attr("height", height)

svg.append("g").attr("id", "map")
svg.append("g").attr("id", "names")

var g;
d3.json("md.json", function(error, md) {
  g = md;
  //console.log(g)

  svg.select("#map").selectAll("path")
	.data(md.features)
           .enter()
	   .append("g")
	   .attr("class", "countygeom")
	   .attr("zoom", 1)
	   .attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
           .append("path")
	   .attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
           .attr("d", path)
	   .attr("fill", function(){ return "hsl(" + (46+Math.random()*35) + ","+(50+(Math.random()*10-5))+"%,45%)"})
	   .on('mouseover', function(d,i) { d3.select("#curr").text(d.properties.GEODESC) })
           .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })
  //console.log("You should see the data now...")

	d3.selectAll("g.countygeom")
		.on('click',function(d) {
		  this.parentNode.appendChild(this)
		  t = d3.select(this)
		  c = path.centroid(d)
		  zoomed = (t.attr("zoom") == 1)
 		  c.x = (zoomed? (1-4)*c[0] : 0)
		  c.y = (zoomed? (1-4)*c[1] : 0)
		  col = function(){ return "hsl(" + (46+Math.random()*55) + ","+(50+(Math.random()*20-10))+"%,45%)"}
		  t.select("path").transition().duration(500).attr("fill",zoomed? "black" : col )
		  t.attr("zoom", (zoomed? 4 : 1))
		  .transition()
		  .duration(500)
		  .attr("transform",
			"translate(" + c.x + "," + c.y +")scale(" + t.attr("zoom") +")"
			)
		  console.log(this)
 		} )
});

function zoom(obj,scale,trans) {
  obj.transition().duration(400).attr("transform", "translate(" + trans + ")scale(" + scale + ")");
}

d3.json("ormvdb.json", function(e,json) {
//d3.json("personnel.json", function(e,json) {
	console.log(json)
	svg.select("#names").selectAll("c")
		.data(json)
		.enter()
//		.append("text")
		.append("circle")
		.attr("class", "name")
		.attr("r",5)
		//.attr("transform", function(d) {return "translate("+ projection([-77+(Math.random()-0.5)*2,39+(Math.random()-0.5)*2])+")"})
		.attr("transform", function(d) {return "translate("+ projection([d.longitude,d.latitude])+")"})
		.on("mouseover",function(d){ d3.select("#curr").text(d.lname + ", " + d.fname + "  ; HOMETOWN: " + d.hometown + " (county: " + d.county + " )" ) })
	        .on("mouseout", function(d,i) { d3.select("#curr").text(defaulttext) })
})

function colorTransition() { d3.selectAll("path").transition().attr("fill", function(){ return "hsl(" + (46+Math.random()*55) + ","+(50+(Math.random()*20-10))+"%,45%)"}).duration(1000) }
d3.select(self.frameElement).style("height", height + "px");

d3.csv("MD-pop-data.csv", function(d) { 
	csvdata=d; 
	d.forEach(function(dt){console.log(dt.GEOID - 2400000)})
})

