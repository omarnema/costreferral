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
    function drawProcedurePlot(clear) {
        goToPane("ProcedurePlot");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#ProcedurePlot .card .card-body");
        if (clear) {div.html("")}
        
        var thisData = data.MajorNest;
   
        var width = .8*$("#ProcedurePlot .card .card-body").width();
        var height = .9*$("#ProcedurePlot .card .card-body").height();

        
        var svg = div.append('svg').style('height', height+'px').style('width', width+'px')
        
        .attr('class','main')
        .style('margin-left',  '10%');
        //.style('margin-top','3%');
        
        
        console.log(thisData);
//        
        var xMax = d3.max(data.CostData.map(function(x){
            return x.CostPerEvent;
        }));
        var yMax = data.MaxEvtPer1000; //270 ish
        
        var xScale = d3.scale.log().base(10).range([0,width]).domain([.1, xMax]);
        var yScale = d3.scale.linear().range([height, 0]).domain([0, yMax]);
        var xAxis = d3.svg.axis().scale(xScale).orient('bottom');
        var yAxis = d3.svg.axis().scale(yScale).orient('left');
        
        svg.append('g').attr('class', 'x axis').attr("transform", "translate(0," + height + ")").call(xAxis);
         svg.append("g").attr("class", "y axis")
             .attr("transform", "translate(0," + 0 + ")")
             .call(yAxis);
        var majors = svg.selectAll('.major').data(thisData);
        majors.enter().append('g').attr('class', 'major')
        ;
        
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
        majors.exit().remove();
        minors = majors.selectAll('.minor').data(function(d){return d.Minors});
        minors.enter().append('g').attr('class', 'minor') .append('polygon')
//        .attr('points', function(d){return generatePointArray(d.PercentilesPCP)}).attr('class', 'minor-blob')    
        ;
        minors.exit().remove();
        
        //object of objects not gonna be recognized

        minorPoints = minors.selectAll('.minor-point').data(function(d){console.log(d.PercentilesPCP);return d.PercentilesPCP});
        minorPoints.enter().append('circle').attr('class', 'minor-point').attr('r', 2)
            .attr('cx', function(d){return  xScale(Math.max(0, d.CostPerEvent)) })
            .attr('cy', function(d){return yScale(d.EventsPer1000)})
     ;
        minorPoints.exit().remove();
      
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