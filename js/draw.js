function start(error, costData, providerData) {
    
    // GET CORE DATASET
    var data = prepData(costData, providerData);

    console.log(data);
    
    // PAGE INITIATLIZATION
    var lastId = "ProcedurePlot";
    function initializePage() {
        $("#provider-start").click(function(){drawPCPComparison();});
        $("#procedure-start").click(function(){drawProcedurePlot();});
        drawPCPComparison(true);
    }
    initializePage();
    
    // NAV FUNCTION
    function goToPane(id) {
        d3.select("#main").selectAll(".row.primary-pane").each(function(d,i){
            var thisId = d3.select(this).attr("id");
            if (!d3.select(this).classed("hidden")) {
                lastId = thisId;
            }
            d3.select(this)
                .classed("hidden",id!=thisId);
        });
    }
    
    // DRAW FUNCTIONS
    function drawProcedurePlot(clear, xMinInput, yMinInput) {
        goToPane("ProcedurePlot");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#ProcedurePlot .card .card-body");
        if (clear) {div.html("")}
        var tooltip = div.append('div').attr('class', 'tooltip');
        var thisData = data.MajorNest;
        console.log(thisData);
        
   
        var width = .8*$("#ProcedurePlot .card .card-body").width();
        var height = .85*$("#ProcedurePlot .card .card-body").height();
        var svg = div.append('svg').style('height', height+'px').style('width', width+'px').attr('class','main').style('margin-left',  '4%');

        
        var xMax = d3.max(data.CostData.map(function(x){
            return x.CostPerEvent;
        }));
        var yMax = data.MaxEvtPer1000; //270 ish
        
        //SEPARATE SCALE FOR MAKING BLOB SIZE (variability)
        //cX + xBandScale(variability coefficient) to get outside band values
        var multiplier = .2;
        var xBandScale = d3.scale.linear().range([-width*multiplier, width*multiplier]).domain([-10, 10]);
        var yBandScale = 
        d3.scale.linear().range([height*multiplier, -height*multiplier]).domain([-10, 10]);
        
        //abstract axis plotting and scaling
        //
//        function plotAxes(init, xscale, yscale, xTickvalues, yTickvalues, xRange, yRange){
//            
//            //bind data to axis
//            
//            if (init){
//
//            }
//            else {
//                
//                d3.svg.axis().scale(xScale).orient('bottom');
//                d3.svg.axis().scale(yScale).orient('left');
//            }
//
//
//        };
        
        //change data - only included minor, everything else removed
        //xScale changed..
        
                var xScale = d3.scale.pow().exponent(.39).range([0,width]).domain([.01, 2000]);        
                var yScale = d3.scale.pow().exponent(.005).range([height, 0]).domain([.1, 10]);
                var xAxis = d3.svg.axis().scale(xScale).orient('bottom').tickValues([0, 10, 100, 500, 1000, 2000]);
                var yAxis = d3.svg.axis().scale(yScale).orient('left').tickValues([0,  1, 2, 4, 6, 10]);
                svg.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
                svg.append("g").attr("class", "y axis").call(yAxis); 
        
        
            ///
        
//        plotAxes(true);
  
        //min / max determined by 10th and 90th percentiles vals

        var majors = svg.selectAll('.major').data(thisData);
        majors.enter().append('g').attr('class', 'major');

        majors.exit().remove();
        minors = majors.selectAll('.minor').data(function(d){return d.Minors});
        minors.enter().append('g').attr('class', 'minor') ;
        minors.exit().remove();
        
        var leftOffset = $('.main').offset().left ;
        var topOffset = $('.main').offset().top ;
        
        //ADD IN ALL PCP PTS AND HIDE - only show when expanding single Minor
        pcpPoints = minors.selectAll('.pcp-point').data(function(d){
           return d.PCPNest ;
        });
        pcpPoints.enter().append('circle').attr('class', 'pcp-point')
            .attr('r', 1)
            .attr('cx', function(d){
            return  xScale(Math.min(Math.max(.1, d.CostPerEvent), 2000)) })
            .attr('cy', function(d){return yScale(Math.min(60,d.EventsPer1000)) });
        pcpPoints.exit().remove();
        
        //ADD IN MEDIAN POINT
        minorPoints = minors.selectAll('.minor-point.median').data(function(d){ return [d.PercentileBands]});
        var minorPointEnter = minorPoints.enter().append('circle').attr('class', 'minor-point median')
            .attr('r', 1)
            .attr('cx', function(d){
            return  xScale(Math.min(Math.max(.1, d.Median.CostPerEvent), 2000)) })
            .attr('cy', function(d){return yScale(Math.min(60,d.Median.EventsPer1000)) });
        minorPoints.exit().remove();  
        
        var innerline = d3.svg.line()
                .x(function(d){return  xBandScale(Math.min(d.x), 10)+ 
                xScale( Math.min(Math.max(.1, d.Median.CostPerEvent), 2000) )  })
                .y(function(d){return yBandScale(Math.min(10,d.y)) +  yScale(Math.min(10,d.Median.EventsPer1000))
                              })
            .interpolate('basis-closed') ;    
     
        var minorBands = minors.selectAll('.minor-point.band').data(function(d){return d.PercentileBands.Bands});
        
        var enterband = minorBands.enter().append('path').attr('class', 'inner-band') 
            .attr("d", innerline)
            .on('mouseover', function(d){
                //cancel hover interaction from tooltip
                tooltip.style('visibility', 'visible').html('Events Per 1000: ' + Math.round(d[0].Median.EventsPer1000) + '<br>Variability: ' + '<br> Cost Per Event: $'+ Math.round(d[0].Median.CostPerEvent) + '<br>Variability:')
                .style("left", -30+(d3.event.pageX)-leftOffset + "px")
                .style("top", -40+(d3.event.pageY)-topOffset+ "px"); 
            })
            .on('mouseleave', function(){
                tooltip.style('visibility', 'hidden');         
            })  
        ;                   
        minorBands.exit().remove();

    }
    
    function drawPCPComparison(clear) {
        goToPane("PCPComparison");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#PCPComparison .card .card-body .col");
        if (clear) {div.html("")}
        
        var thisData = data.PCPNest;
        
    }
    
    function drawPCPProcedures(PCPID, clear) {
        goToPane("PCPProcedures");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#PCPProcedures .card .card-body .col");
        if (clear) {div.html("")}
        
        var thisData = data.PCPNest.filter(function(d){return +d.key == +PCPID});
        console.log(thisData);
        
    }
    
    function drawReferralMap(Procedure, PCPID, clear) {
        goToPane("ReferralMap");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#ReferralMap .card .card-body .col");
        if (clear) {div.html("")}
        
        var thisData = getNetworkMapData(data,Procedure);
        console.log(thisData);
    }
    
}




        

        

                
//        enterband.selectAll('.minor-circle')
//            .data(function(d){return d})
//            .enter()
//            .append('circle')
//            .attr('class', 'band-pt')
//            .attr('r',1).attr('cx', function(d){
//                return  xBandScale(d.x)+ 
//                xScale( Math.min(Math.max(.1, d.Median.CostPerEvent), 2000) )        
//            })
//            .attr('cy', function(d){
//                return yBandScale(d.y) +  yScale(Math.min(10,d.Median.EventsPer1000)) ;
//                                   
//            })
//        ;
            
 //        
//            .attr('r', 1)
//            .attr('cx', function(d,i){
//        console.log(d);
//            return 0;

//        })       
                
        //percentile bands more like 
        // {medianX: , medianY: , bands: [band1, band2]}
//        
//        var bands = minorPoints.selectAll('.band').data(function(d){console.log('newd: ', d); return d});    
        
//        function generatePointArray(minorPCPNest){
//            var polygonHolder = [];
//            var ptHolder = [];
//            minorPCPNest.forEach(function(d){
//                ptHolder = [xScale(Math.max(.1, d.CostPerEvent)), Math.min( Math.max(.1, yScale(d.EventsPer1000)), yMax) || 0];
//                polygonHolder.push(ptHolder);
//            });
//            return polygonHolder;
//        };            
//        

        //band1, band2, median
        //minor: [band1: [10: x,y, 90: x,y,], band2 :, median]

            
            
//            .attr('r', 2)
//            .attr('cx', function(d){return  xScale(Math.max(0, d.CostPerEvent)) })
//            .attr('cy', function(d){return yScale(d.EventsPer1000)})