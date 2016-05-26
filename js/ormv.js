  var casualtyjson = {}; // Global var to contain JSON...async grossness
  var casualtyFilters = {
    // bytime: function() { return true; },
    bytime: function(d) { return d.casdate <= casualtyFilters.filterDate; },
    filterDate: (new Date(1962,1,1)),
    allCasualties: [],
    bycounty: function() { return true; },
    bystate: function() { return true; },
    byphoto: function() { return true; },
  };
$( function() {

  var remaining = 3; // Global var to trigger post-load processing
  var casboxTimeout;
  var width = 712,
      height = 400;

  var defaultImage = "searching.jpg";
  var defaulttext = "Mouse over a county or personnel node to see its name.  Click a personnel node to see photos associated with that node.";
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
    .scale(7000)
    .translate([width/2,height*0.9])

  var path = d3.geo.path()
      .projection(projection);

  var svg = d3.select("#mdmap")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 600 400");

  svg.append("g").attr("id","geo");

  $("#slider").slider({
      value: 12*(1968-1962),
      min: 0,
      max: 12*(1989-1962),
      step: 1,
      slide: function( event, ui ) {
        var numvisible = filterCasualties().size();
      }
    });

  animateCasualties = function() {
    d3.timer( function(t) {
      var dt,numsteps;
      dt = 50;
      numsteps = 27*12;
      if (t > dt*numsteps) {
        filterCasualties(numsteps); // Last call ensures deterministic end state
        return true;
      }
      $("#slider").slider("value",Math.floor(t/dt));
      filterCasualties(Math.floor(t/dt));
    });
  };

  filterCasualties = function(monthoffset) {
    var sliderVal, filters, casualtiesToShow;
    if (typeof(monthoffset) !== "undefined") {
      sliderVal = monthoffset;
    } else {
      sliderVal = $("#slider").slider("value");
    }
    // TODO: change 1962 from hardcoded to query against slider.min property
    casualtyFilters.filterDate = (new Date(1962 + Math.floor(sliderVal/12),sliderVal%12 + 1,1));
    filters = d3.values(casualtyFilters);
    casualtiesToShow = casualtyFilters.allCasualties;
    for(var i=0; i<filters.length; i++) {
      if (typeof(filters[i]) !== "function") {
        continue;
      }
      casualtiesToShow = casualtiesToShow.filter( function(d) { return filters[i](d); } );
    }
    // TODO: fade
    d3.selectAll("circle")
      .style("visibility", function(d) {
        if (elementInArray(this,casualtiesToShow[0])) {
          return "visible";
        } else {
          return "hidden";
        }
      })
      // .transition()
      // .duration(150)
      .style("opacity", function(d) {
        if (elementInArray(this,casualtiesToShow[0])) {
          return 1.0;
        } else {
          return 0.0;
        }
      });
    // casualtiesToShow.style("visibility", "visible");
    $("#year").text("Showing casualties on or before " + casualtyFilters.filterDate.toDateString() + " (" + casualtiesToShow.size() + " total)");
    return casualtiesToShow;
  }

  function toBottomOfParent(el) {
    // SVG z-layering is just draw order, so move to bottom of parentNode
    // TODO: check if this isn't an SVG element, by crawling upwards in the DOM
    el.parentNode.appendChild(el);
  }

  function isZoomed(el) {
    return d3.select(el).attr("zoom") > 1;
  }

  function elementInArray(el,arr) {
    for(var i=0; i < arr.length; i++) {
      if(arr[i] === el) {
        return true;
      }
    }
    return false;
  }

  function zoomCounty(d) {
    toBottomOfParent(this.parentNode);
    t = d3.select(this);
    countyid = d.properties.COUNTYFP;
    stateid = d.properties.STATEFP;
    zoomfactor = 4
    // select this element and its name container sibling
    if (isZoomed(this)) {
      casualtyFilters.bycounty = function(d) { return true };
      casualtyFilters.bystate = function(d) { return true; };
    } else {
      casualtyFilters.bycounty = function(d) { return zeroFill(d.countyid,3) === zeroFill(countyid,3); };
      casualtyFilters.bystate = function(d) { return d.stateid === stateid; };
    }
    filterCasualties();
    var names = d3.select(".namescontainer > g[stateid='" + stateid + "'] > .countynames[countyid='" + countyid + "']");
    t.push( names[0] );
    c = path.centroid(d);
    c.x = c[0];
    c.y = c[1];
    t.each(function() { toBottomOfParent(this); });
    t.attr("zoom", (isZoomed(this) ? 1 : zoomfactor))
    .each( function(d) {
      d3.select(this).selectAll("circle")
        .attr("zoom", function() { return isZoomed(this) ? 1 : zoomfactor })
        .transition()
        .duration(500)
        // .attr("r", function(d) { // make circle fill size zoom-invariant (stroke width still varies?)
        //   return d3.select(this).attr("r") * (isZoomed(this) ? 1/zoomfactor : zoomfactor);
        // });
    })
    .transition()
    .duration(500)
    // This would be simpler than translating twice, but I can't get it to work...
    // .attr("transform-origin", [c.x,c.y].join(' '))
    // transform applied right-to-left. So, translate to origin, scale, translate back.
    // pretty sure the operators are aliases for the matrix transform, which explains this
    // TODO: circles get larger with this scaling, but this is not terribly desireable (transition r to r/zoomfactor to compensate?)
    .attr("transform", "translate(" + (c.x) + "," + (c.y) +") " +
      "scale(" + t.attr("zoom") +") " +
      "translate(" + [-c.x,-c.y].join(',') + ") "
    )
    //
    // z-index cleanup - after a zoom finishes, all circles should be on top
    // might also be helpful to use Node.insertBefore() ?
    // TODO: this can be interrupted, but there should only ever be one zoomed county anyway!
    .each("end", function() { if (!isZoomed(this)) {
      d3.selectAll(".names").each( function() { toBottomOfParent(this);} );
    }})
  }

  d3.json("json/MD.json", function(error, mapdata) {
    svg.select("#geo")
      .append("g").attr("id","MD")
      .selectAll("path")
      .data(topojson.feature(mapdata, mapdata.objects.out).features)
      .enter()
      .append("g")
      .classed("countygeom",true)
      .attr("countyid", function(d) { return d.properties.COUNTYFP; })
      .attr("stateid", function(d) { return d.properties.STATEFP; })
      .attr("zoom", 1)
      .on('click', zoomCounty)
      .append("path")
      .attr("d", path)
      .attr("zoom", 1)
      .on('mouseover', function(d,i) {
        toBottomOfParent(this.parentNode);
        var countyid = this.parentNode.getAttribute("countyid");
        d3.select("#curr").text(
          d.properties.NAME + ", casualties: " +
          d3.selectAll(".countynames[countyid='" + countyid + "'] > circle").size()
        )
      })
      .on('mouseout', function(d,i) { d3.select("#curr").text(defaulttext) })
    if(!--remaining) {
      doCasualties(casualtyjson);
    }
  });

  d3.json("json/DC.json", function(error, mapdata) {
    svg.select("#geo")
      .append("g")
      .attr("id","DC")
      .selectAll("path")
      .data(topojson.feature(mapdata, mapdata.objects.out).features)
      .enter()
      .append("g")
      .attr("countyid", function(d) { return d.properties.COUNTYFP; })
      .attr("stateid", function(d) { return d.properties.STATEFP; })
      .attr("zoom", 1)
      .on('click', zoomCounty)
      .classed("DCgeom",true)
      .append("path")
      .attr("d", path)
      .attr("zoom", 1)
    if(!--remaining) {
      doCasualties(casualtyjson);
    }
  });
  function showCasualties() {
    var showtype = d3.selectAll("input[name='showtype']").filter(function(d){
        return this.checked
      }).node().value;
    casualtyFilters.byphoto = function(d) {
      if(showtype === false) {
        return false;
      } else if(showtype === "all") {
        return true;
      } else {
        return showtype === "withphoto" ? d.hasphoto : !d.hasphoto;
      }
    };
    filterCasualties();
  }

  d3.selectAll("input[name='showtype']").on("change", function() {
    showCasualties();
  });


  d3.json("json/flatdb.json", function(e,json) {
      casualtyjson = json;
      if (e) console.log(e)
      if(!--remaining) {
          doCasualties(casualtyjson);
      }
  });

  function setCasualtyImg(cas) {
    var url = ( cas.hasphoto && cas.photo ? cas.photo : defaultImage );
    setImg(url);
  }
  function setImg(url) {
    url = String(url);
    d3.select("#caspic > img")
      .attr("src", "img/" + url);
  }

  function hoverCircle(d){
    var e,casbox, casdate;
    d3.select("#curr")
      .text(d.lname + ", " + d.fname +
        "  ; HOMETOWN: " + d.hometown +
        " (county: " + d.county + " )"
      );
    e = d3.event;
    clearTimeout(casboxTimeout);
    casbox = d3.select(".casbox")
      .style({ display: "inline" })
      .transition()
      .duration(500)
      .style({
        left: e.clientX + 30 + "px",
        top: e.clientY + "px",
        opacity: 1.0
      });

    casdate = d.casdate !== null ? (new Date(d.casdate)).toLocaleDateString("en-us") : "Casualty date unknown";
    casbox.select("#casname").text(function(){ return d.fname + ' ' + d.lname; });
    setCasualtyImg(d);
    casbox.select("#casdate").text(casdate);
    casbox.select("#hometown").text(function(){ return d.hometown });
  }

  function clickCircle(d) {
  }

  function createCircle(d) {
    // Using createElementNS is necessary, <circle> is not meaningful in the HTML namespace
    elem = d3.select(document.createElementNS("http://www.w3.org/2000/svg", "circle"))
      .classed("name", true)
      .classed("missingphoto", function() {
        if(typeof(d.hasphoto) === "boolean") {
          return !d.hasphoto;
        } else {
          return false;
        }
      })
      // .classed("badloc", function() { return d.badloc })
      .attr("recid", d.recid)
      .attr("zoom", 1)
      .attr("r", 3)
      .attr("transform", function() {
        var lat,lon;
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
      .on("mouseout", function(d,i) {
        d3.select("#curr").text(defaulttext);
        casboxTimeout = setTimeout( function() {
          d3.select(".casbox")
            .transition()
            .duration(500)
            .style({ opacity: 0.0 })
            .transition()
            .style({ display: "none" });
        }, 1000);
      })
      .on("click", clickCircle);
    return elem.node();
  }
  function doCasualties(casualtyjson) {
    reshape = d3.nest()
      .key(function(d){ return d.stateid })
      .key(function(d) { return d.countyid })
      .entries(casualtyjson);
    svg.append("g").classed("namescontainer",true)
      .selectAll("g")
      .data(reshape)
      .enter()
      .append("g")
      .attr("stateid", function(d,i) { return d.key; })
      .each( function(d,i) {
        var stateid = d.key;
        d3.select(this)
        .selectAll(".countynames")
        .data(d3.values(d.values))
        .enter()
        .append("g")
        .classed("countynames", true)
        .attr("countyid", function(d) { return zeroFill(d.key,3) })
        .each( function(d,i) {
          d3.select(this)
          .selectAll(".names")
          .data(d.values)
          .enter()
          .append(createCircle)
        })
      });
    d3.select(".controls")
      .append("input")
      .attr("type","button")
      .attr("value","Animate")
      .on("click", animateCasualties);
    casualtyFilters.allCasualties = d3.selectAll("circle.name");
    filterCasualties();
  }

  d3.select(self.frameElement).style("height", height + "px");
});
