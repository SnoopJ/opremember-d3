$( function() {
  var remaining = 3; // Global var to trigger post-load processing
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

  $("#slider").slider({
      value:1950,
      min: 1955,
      max: 1975,
      step: 1,
      slide: function( event, ui ) {
        var numvisible = 0;
        d3.selectAll("circle")
          .transition()
          .duration(200)
          .style("opacity", function(d,i) {
            var show = (new Date(d.casdate)).getUTCFullYear() >= ui.value;
            if(show) {
              numvisible++;
              d3.select(this).style("visibility","visible");
              return 1;
            } else {
              return 0;
            }
          })
          .each("end", function() {
            d3.select(this).style("visibility", function(d,i) { return (new Date(d.casdate)).getUTCFullYear() >= ui.value ? "visible" : "hidden"; })
          })
        // var numvisible = d3.selectAll("circle").filter( function() { return d3.select(this).style("visibility") == "visible" } ).size(); // probably not ideally performant
        $("#year").text("Showing casualties on or after " + ui.value + " ("+numvisible+" total)");
      }
    });
    $("#year").text("Showing casualties on or after " + $("#slider").slider("value"));
  d3.json("/json/MD.json", function(error, mapdata) {
    svg.append("g").attr("id","MDgeo")
      .selectAll("path")
      .data(topojson.feature(mapdata, mapdata.objects.out).features)
      .enter()
      .append("g")
      .classed("countygeom",true)
      .attr("countyid", function(d) { return d.properties.COUNTYFP; })
      .append("path")
      .attr("d", path)
      .on('mouseover', function(d,i) {
        var countyid = this.parentNode.getAttribute("countyid");
        d3.select("#curr").text(
          d.properties.NAME + ", casualties: " +
          casualtyjson.filter(function(d) { return d.countyid == countyid })[0].casualties.length
        )
      })
      .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })
    // console.log("Geometry loaded, "+(remaining-1)+" remaining things to do...");
    if(!--remaining) {
      doCasualties(casualtyjson);
    }
  });

  d3.json("/json/DC.json", function(error, mapdata) {
    svg.append("g").attr("id","DCgeo")
      .selectAll("path")
      .data(topojson.feature(mapdata, mapdata.objects.out).features)
      .enter()
      .append("g")
      .classed("DCgeom",true)
      .append("path")
      .attr("d", path)
    if(!--remaining) {
      doCasualties(casualtyjson);
    }
  });
  function showCasualties() {
    var showtype = d3.select("#showcasualties").node().checked && d3.selectAll("input[name='showtype']").filter(function(d){ return this.checked }).node().value;
    d3.selectAll("circle").style("visibility","hidden");
    d3.selectAll("circle").filter(function(d,i) {
      return (showtype === "all") || (showtype === "withphoto" && d.hasphoto) || (showtype === "withoutphoto" && !d.hasphoto) ;
    }).style("visibility","visible")
  }
  d3.select("#showcasualties").on("change",function() { showCasualties() });
  d3.select("#choropleth").on("change",function() {
    if (d3.select("#choropleth").node().checked) {
      doChoropleth();
    } else {
      d3.selectAll(".countygeom,.DCgeom").style("fill", null);
      d3.select(".legendQuant").style("visibility","hidden");
    }
  });

  d3.selectAll("input[name='showtype']").on("change", function() {
    d3.select("#showcasualties").node().checked = true;
    showCasualties();
  });


  d3.json("/json/bycounty.json", function(e,json) {
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
    d3.selectAll("#casualtyinfo>.row>div.text-left").text("")
    d3.select("#cas-name").text(d.fname + " " + d.lname);
    if (d.hasphoto && d.photo) {
      d3.select("#cas-pic").select("img").attr("src","img/"+d.photo);
    } else {
      d3.select("#cas-pic").select("img").attr("src","img/1111.png");
    }
    d3.select("#COUNTY").text(d.county);
    var casdate = d.casdate !== null ? (new Date(d.casdate)).toLocaleDateString("en-us") : "Casualty date unknown";
    d3.select("#CASDATE").text(casdate);
    // animate a slide-in
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
        if ( d.badloc && d.longitude == -78 ) {
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
      .attr("countyid",function(d,i) { return zeroFill(d.countyid,3) } )
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
    d3.selectAll(".name").filter( function(d) { return d.hasphoto && d.photo }).style("fill","#00ea2e");
    d3.selectAll(".badloc").style("fill","red") // color bad locations red, for now
  }

  var colorscale;
  function doChoropleth() {
    colorscale = d3.scale.threshold()
      .domain([0,5,10,20,50,100,1046])
      .range(['#feedde','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#8c2d04'])
    d3.selectAll(".countynames>g")
      .each( function(d) {
        d3.select(".countygeom[countyid='"+zeroFill(d.countyid,3) +"']")
          .style("fill",function() {
            return colorscale(d.casualties.length);
          });
      });
    var DCcas = casualtyjson.filter( function(d) { return d.casualties[0].hometown == "WASHINGTON DC" })[0].casualties.length;
    d3.select(".DCgeom")
    .style("fill",function() {
      return colorscale(DCcas);
    });
    var legend = d3.legend.color()
      .labelFormat(d3.format(".2f"))
      .useClass(true)
      .scale(colorscale);
    svg.select(".legendQuant")
      .style("visibility","visible")
      .call(legend);
    d3.selectAll("rect.swatch").style("fill", function(d) { return d }); // something kinda screwy with the legend library so that this is necessary
  }

    svg.append("g")
      .attr("class", "legendQuant")
      .attr("transform", "translate(20,200)")
      .style("visibility","hidden");

  d3.select(self.frameElement).style("height", height + "px");
});
