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
        var div = d3.select("#ProcedurePlot .card .card-body .col");
        if (clear) {div.html("")}
        
        var thisData = data.ProcedureNest;
        console.log(thisData);
    }
    
    function drawPCPComparison(clear) {
        goToPane("PCPComparison");
        clear=typeof clear =='undefined'?false:clear;
        var div = d3.select("#PCPComparison .card .card-body .col");
        if (clear) {div.html("")}
        
        var thisData = data.PCPNest;
        console.log(thisData);
        
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