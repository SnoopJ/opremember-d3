var exposedvar;

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

//svg.append("g").attr("id", "map")
//svg.append("g").attr("id", "names")

var g;
d3.json("md.json", function(error, md) {
  g = md;

  svg
    //.select("#map")
    .selectAll("path")
	.data(md.features)
           .enter()
	   .append("g")
        // create a sibling under #names which will hold personnel nodes
       .each(function(d){ 
            svg.append("g")
            .attr("class", "names")
            .attr("countyid", d.properties.CNTY00) 
       } )
	   .attr("class", "countygeom")
	   .attr("zoom", 1)
	   .attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
       .append("path")
	   //.attr("countyid", function(d) { return d.properties.CNTY2010.substr(2,3) })
       .attr("d", path)
	   .attr("fill", "hsl(81,50%,45%)")
	   .on('mouseover', function(d,i) { d3.select("#curr").text(d.properties.GEODESC) })
           .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })

	d3.selectAll("g.countygeom")
		.on('click',function(d) {
          t = d3.select(this)
          cty = t.attr("countyid")
          zoomfactor = 2
          // select this element and its name container sibling
		  t.push( d3.selectAll(".names[countyid=\""+cty+"\"]")[0] )
		  c = path.centroid(d)
		  zoomed = (t.attr("zoom") == 1)
 		  c.x = (zoomed? (1-zoomfactor)*c[0] : 0)
		  c.y = (zoomed? (1-zoomfactor)*c[1] : 0)
          t.each( function() { this.parentNode.appendChild(this) } )
		  t.attr("zoom", (zoomed? zoomfactor : 1))
		  .transition()
		  .duration(500)
		  .attr("transform",
			"translate(" + c.x + "," + c.y +")scale(" + t.attr("zoom") +")"
			)
        // z-index cleanup - after a zoom finishes, all circles should be on top
        // might also be helpful to use Node.insertBefore() ?
        // TODO: this can be interrupted, but there should only ever be one zoomed county anyway!
          .each("end", function() { if (zoomed == false) {
            d3.selectAll(".names").each( function() { this.parentNode.appendChild(this) } )
          } } )
 		} )
});

function zoom(obj,scale,trans) {
  obj.transition().duration(400).attr("transform", "translate(" + trans + ")scale(" + scale + ")");
}

function sortDataByCounty( data ) {
    //ret = {};
    ret = [];
    data.map( function(d) { 
        
        if (!Array.isArray(ret[d.countyid])) { 
            g = d3.select("g.countygeom[countyid=\""+d.countyid+"\"]")
            c = path.centroid( g.datum() )
           // casualty info box
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
            ret[d.countyid]=[] 
        } 
        ret[d.countyid].push(d) 

        
    })
    d3.selectAll(".infobox")
        .selectAll("p")
        .data( function() { 
            p = d3.select(this.parentNode)
            cty = p.attr("countyid")
            return ret[cty]
        } )
        .enter()
        .append("p")
        .text(function(d) { return "Casualty: " + d.fname + " " + d.lname } )
        .append("img").attr("src",function(d) { 
            if (!d.hasphoto) { return "" }
            return "img/"+d.recid+".png" 
        })
    return ret
}


function getCasualties() { 
    countyid = d3.select(this.parentNode).attr("countyid")
    d=casualtiesbycounty[countyid]
    if (d === undefined) {
        return []
    }
    return [].concat(d)
}

d3.json("ormvdb.json", function(e,json) {
    casualtiesbycounty = sortDataByCounty(json);
    // casualty circles
	svg.selectAll(".names")
        .selectAll("circle")
        .data(getCasualties)
        .enter()
        .append("circle")
		.attr("class", "name")
        .attr("fill", function(d) { if (d.fname=="Fake") { return "rgb(0,255,255)"; } return "rgb(1,0,0)" })
		.attr("r",5)
		.attr("transform", function(d) { 
            pc = this.parentNode.getBBox() 
            proj = projection([d.longitude,d.latitude])
            x=proj[0]
            y=proj[1]
            return "translate("+ x +"," + y + ")"
        })
		.on("mouseover",function(d){ d3.select("#curr").text(d.lname + ", " + d.fname + "  ; HOMETOWN: " + d.hometown + " (county: " + d.county + " )" ) })
	    .on("mouseout", function(d,i) { d3.select("#curr").text(defaulttext) })
	    .on("click", function(d,i) { 
            d3.selectAll(".infobox").style("visibility", "hidden") 
            infobox = d3.select("#infobox"+d.countyid)
            infobox.style("visibility", "visible") 
            // TODO: does not take parent's transform into account
            pos = d3.transform( d3.select(this).attr("transform") ).translate
            infobox.style({
                "left": pos[0]+20+"px", 
                "top": pos[1]+30+"px"
            }) 
            infobox.transition().duration(100)
           // .ease("elastic", 100, 10)
            .style({"left": pos[0]+"px", "top": pos[1]+"px"}) 
        })
})

d3.select(self.frameElement).style("height", height + "px");

