function draw(error, costData, pcpData) {
    var mbrMonthMap = {};
    pcpData.forEach(function(d){
        mbrMonthMap[+d.PCPID] = +d.memberMonths;
    });
    
    costData.forEach(function(d){
        var numFields = ["Cost","Frequency","InNetwork","PCPID","RiskAdjustedCost"];
        numFields.forEach(function(dd){
            d[dd] = +d[dd];
        });
        d.PCP = toTitleCase(d.PCP);
        d.ServiceProvider = toTitleCase(d.ServiceProvider);
    });

    var minorPCPStats = {};
    
    var minorNest = d3.nest().key(function(d){return d.Minor}).entries(costData);
    minorNest.forEach(function(d,i){
        d.Frequency = d3.sum(d.values, function(n){return n.Frequency});
        d.Cost = d3.sum(d.values, function(n){return n.Cost});
        d.RiskAdjustedCost = d3.sum(d.values, function(n){return n.RiskAdjustedCost});
        d.Major = d.values[0].Major;
        minorPCPStats[d.key] = {};
        minorPCPStats[d.key]["pcp"] = [];
    });
    
    var pcpNest = d3.nest().key(function(d){return d.PCPID}).entries(costData);
    pcpNest.forEach(function(d,i){
        d.key = +d.key;
        d.PCPName = d.values[0].PCP;
        d.PCPSpecialty = d.values[0].PCPSpecialty;
        d.memberMonths = mbrMonthMap[d.key];
        d.Cost = d3.sum(d.values, function(n){return n.Cost});
        d.Frequency = d3.sum(d.values, function(n){return n.Frequency});
        d.RiskAdjustedCost = d3.sum(d.values, function(n){return n.RiskAdjustedCost});
        d.CostPerMember = d.Cost/d.memberMonths;
        d.RiskAdjCostPerMember = d.RiskAdjustedCost/d.memberMonths;
        d.EventsPer1000 = d.Frequency*1000/d.memberMonths;
        d.minorNest = d3.nest().key(function(dd){return dd.Minor}).entries(d.values);
        
        d.majorNest = d3.nest().key(function(dd){return dd.Major}).entries(d.values);
        d.majorNest.forEach(function(dd){dd.minors=[]});
        
        d.minorNest.forEach(function(dd){
            dd.Minor = dd.key;
            dd.Frequency = d3.sum(dd.values, function(n){return n.Frequency});
            dd.Cost = d3.sum(dd.values, function(n){return n.Cost});
            dd.RiskAdjustedCost = d3.sum(dd.values, function(n){return n.RiskAdjustedCost});
            dd.CostPerMember = dd.Cost/d.memberMonths;
            dd.CostPerEvent = dd.Cost/dd.Frequency;
            dd.RiskAdjCostPerMember = dd.RiskAdjustedCost/d.memberMonths;
            dd.EventsPer1000 = dd.Frequency*1000/d.memberMonths;
            dd.Major = dd.values[0].Major;
            dd.values.forEach(function(n){
                n.CostPerEvent = n.Cost/n.Frequency;
                n.EventsPer1000 = n.Frequency*1000/d.memberMonths;
            });
            
            dd.pct={};
            var pcts = [1,25,50,75,99];
            var stats = ["Cost","EventsPer1000","CostPerEvent"];

            pcts.forEach(function(p){
                dd.pct[p] = {};
                stats.forEach(function(s){
                    dd.values.sort(function(a,b){return d3.ascending(a[s],b[s])});
                    dd.pct[p][s] = dd.values[Math.floor((dd.values.length-1)*p/100)][s]; 
                });      
            });

            minorPCPStats[dd.Minor]["pcp"].push(
                {PCP: d.key
                 , Cost: dd.Cost
                 , EventsPer1000: dd.EventsPer1000
                 , CostPerEvent: dd.CostPerEvent
                }
            );
            
            d.majorNest.filter(function(n){return n.key == dd.Major;})[0].minors.push(
                {Major: dd.Major, Minor: dd.Minor, Frequency: dd.Frequency, pct: dd.pct});            
        });
    });
    
    pcpNest.sort(function(a,b){return a.memberMonths, b.memberMonths});
    
    var majorMap = {}, minorMap = {};
    var majorNest = d3.nest().key(function(d){return d.Major}).entries(costData);
    majorNest.forEach(function(d,i){majorMap[d.key]=i});
    minorNest.forEach(function(d,i){minorMap[d.key]=i});
    
    minorNest.forEach(function(d,i){
        d.pct={};
        var pcts = [1,25,50,75,99];
        var stats = ["Cost","EventsPer1000","CostPerEvent"];
        
        pcts.forEach(function(p){
            d.pct[p] = {};
            stats.forEach(function(s){
                minorPCPStats[d.key].pcp.sort(function(a,b){return d3.ascending(a[s],b[s])});
                d.pct[p][s] = minorPCPStats[d.key].pcp[Math.floor((minorPCPStats[d.key].pcp.length-1)*p/100)][s]; 
            });      
        });
        
        minorPCPStats[d.key]["pct"] = d.pct;
            
        stats.forEach(function(s){
            d["Max"+s] = d3.max(minorPCPStats[d.key].pcp, function(dd){return dd[s]});
            d["Min"+s] = d3.min(minorPCPStats[d.key].pcp, function(dd){return dd[s]});
        });
    });
    
    pcpNest.forEach(function(d,i){
        var pcts = [1,25,50,75,99];
        var stats = ["Cost","EventsPer1000","CostPerEvent"];
        
        d.majorNest.forEach(function(dd){
            dd.pct={};
            pcts.forEach(function(p){
            dd.pct[p] = {};
            dd.Frequency = d3.sum(dd.minors, function(n){return n.Frequency});
            dd.EventsPer1000 = d3.sum(dd.minors, function(n){return n.Frequency})*1000/d.memberMonths;
            stats.forEach(function(s){
                dd.pct[p][s] = d3.sum(dd.minors, function(n){
                    
                    return n.Frequency*((n.pct[p][s]-minorPCPStats[n.Minor].pct["50"][s])/minorPCPStats[n.Minor].pct["50"][s])
                })/d3.sum(dd.minors, function(n){return n.Frequency});
                });      
            });
        });
    });
    
    drawMinor();
    drawPCP();
    
    function drawMinor() {
        var mH = 20, pH = 4, mW = $("#byMinor .col.bullet").width();
        
        var metric = "CostPerEvent";
//        minorNest.sort(function(a,b){return d3.descending(a.pct["50"][metric],b.pct["50"][metric])});
        minorNest.sort(function(a,b){return d3.descending(a.Frequency,b.Frequency)});
        
        var xScale = d3.scale.pow().exponent(.2)
            .range([0,mW])
            .domain([0, d3.max(minorNest, function(d){return d["Max"+metric]})])
            .domain([0,5000]);
        
        minorNest.forEach(function(d,i){
            var thisContainer = d3.select("#byMinor .lg-container").append("div").attr("class","row indiv-container clickable");
            thisContainer.append("div").attr("class","col s1 label").text(d.Frequency);
            var label = thisContainer.append("div").attr("class","col s3 label").text(d.key);
            var vizHolder = thisContainer.append("div").attr("class","col s8 tooltipped")
                .attr("data-tooltip", function(){
                    return d.key + "\n\n" + metric + ": \n"
                     + formatCurrency(d.pct["25"][metric]) + " (25th Percentile) \n"
                     + formatCurrency(d.pct["50"][metric]) + " (50th Percentile) \n"
                     + formatCurrency(d.pct["75"][metric]) + " (75th Percentile) \n";
                });
            var g = vizHolder.append("svg").style("height",(mH+pH)+"px").style("width",mW+"px");
            
            g.append("line").attr("class","extent-path")
                .attr("y1",mH/2+pH).attr("y2",mH/2+pH)
                .attr("x1", xScale(d.pct["1"][metric]))
                .attr("x2",xScale(d.pct["99"][metric]));
            
            g.append("line").attr("class","extent-path extent-path-wide")
                .attr("y1",mH/2+pH).attr("y2",mH/2+pH)
                .attr("x1", xScale(d.pct["25"][metric]))
                .attr("x2",xScale(d.pct["75"][metric]));
            
            g.append("circle").attr("class","mid-marker")
                .attr("cy",mH/2+pH).attr("cx",xScale(d.pct["50"][metric])).attr("r",mH/3)
                .on("mouseover", function(){
                    d3.select(this).transition().attr("r",mH/2);
                    console.log(d);
                })
                .on("mouseout", function(){d3.select(this).transition().attr("r",mH/3)}); 
        });
    }
    
    function drawPCP() {
        var mH = 20, pH = 4, mW = $("#byPCP .col.bullet").width(), cW = $("#byPCP .col.procedures").width();
        var metric = "CostPerEvent";
        var xScale = d3.scale.pow().exponent(1)
            .range([0,mW])
            .domain([-1.5,1.5]);
        
        pcpNest.sort(function(a,b){return d3.descending(a.memberMonths, b.memberMonths)});
        console.log(pcpNest);
        pcpNest.forEach(function(d,i){
            d.minorNest.forEach(function(dd){
                if (minorPCPStats[dd.key].pct["50"][metric]>0) {
                    dd[metric+"Diff"] = ((dd[metric]-minorPCPStats[dd.key].pct["50"][metric])/minorPCPStats[dd.key].pct["50"][metric])*dd.Frequency;    
                    dd[metric+"Diff25"] = ((dd.pct["25"][metric]-minorPCPStats[dd.key].pct["50"][metric])/minorPCPStats[dd.key].pct["50"][metric])*dd.Frequency;    
                    dd[metric+"Diff75"] = ((dd.pct["75"][metric]-minorPCPStats[dd.key].pct["50"][metric])/minorPCPStats[dd.key].pct["50"][metric])*dd.Frequency;    
                } else {
                    dd[metric+"Diff"] = 0;
                    dd[metric+"Diff25"] = 0;
                    dd[metric+"Diff75"] = 0;
                }
            });
            d[metric+"Diff"] = 
                d3.sum(d.minorNest, function(dd){return dd[metric+"Diff"]})/d3.sum(d.minorNest, function(dd){return dd.Frequency});
            d[metric+"Diff25"] = 
                d3.sum(d.minorNest, function(dd){return dd[metric+"Diff25"]})/d3.sum(d.minorNest, function(dd){return dd.Frequency});
            d[metric+"Diff75"] = 
                d3.sum(d.minorNest, function(dd){return dd[metric+"Diff75"]})/d3.sum(d.minorNest, function(dd){return dd.Frequency});
                
            var thisContainer = d3.select("#byPCP .lg-container").append("div").attr("class","row indiv-container clickable")
                .on("click", function(){drawPcpBreakout(d)});
            thisContainer.append("div").attr("class","col s1 label").text(d.memberMonths);
                var label = thisContainer.append("div").attr("class","col s2 label").text(d.PCPName);
                var vizHolder = thisContainer.append("div").attr("class","col s2 tooltipped")
                    .attr("data-tooltip", function() {
                        return d.PCPName + "\n \n" + metric + ": " + formatPct(d[metric+"Diff"]) + " against average"
                    });
                var g = vizHolder.append("svg").style("height",(mH+pH)+"px").style("width",mW+"px");
                var catHolder = thisContainer.append("div").attr("class","col s7");
                var catG = catHolder.append("svg").style("height",(mH+pH)+"px").style("width",cW+"px");

            g.append("circle").attr("class","mid-marker")
                    .attr("cy",mH/2+pH).attr("cx",xScale(d[metric+"Diff"])).attr("r",mH/3)
                    .style("fill", d[metric+"Diff"]>0?"#ef9a9a":"#90caf9");
            
            g.append("line").attr("class","extent-path extent-path-very-wide")
                .attr("y1",mH/2+pH).attr("y2",mH/2+pH)
                .attr("x1", xScale(d[metric+"Diff25"]))
                .attr("x2",xScale(d[metric+"Diff75"]))
                .style("stroke", d[metric+"Diff"]>0?"#ef9a9a":"#90caf9");
            
            g.append("line").attr("class","mid-marker")
                    .attr("y1",pH).attr("y2",mH+pH)
                    .attr("x1",xScale(0)).attr("x2",xScale(0));
            
            var catR = mH/2;
            var catXScale = d3.scale.linear()
                .range([catR,cW-catR])
                .domain([0,majorNest.length-1]);
            var catRScale = d3.scale.pow().exponent(.1)
                .range([0,catR])
                .domain([0,100]);
            var catCScale = d3.scale.linear()
                .range(["#81d4fa","#ef5350"])
                .domain([-1.5,1.5]);
            
            d.majorNest.forEach(function(dd){
                catG.append("circle").attr("class","cat-marker tooltipped")
                .attr("cx", catXScale(majorMap[dd.key]))
                .attr("cy",mH/2+pH/2)
                .attr("r",catRScale(dd.EventsPer1000))
                .style("fill", catCScale(dd.pct["50"][metric]))
                .attr("data-tooltip", function(){
                    return d.PCPName + "\n" + dd.key + "\n\n"
                        + metric + ": " + formatPct(dd.pct["50"][metric]) + " against average";
                });
            }); 
        });
    }
    
    function drawPcpBreakout(pcpData, majorName) {
         d3.select("#modal1 .modal-header").html("").append("h3").text(pcpData.PCPName);
         $('#modal1').openModal(); 
        var radius = 200, w = $(window).height()*.8, h = $(window).height()*.6;
        var svg = d3.select("#modal1 .modal-body").append("svg")
            .style("width",w+"px").style("height",h+"px");
        
        var costScale = d3.scale.pow().exponent(.7)
            .range([radius*.2, radius])
            .domain([-1.5,1.5]);
        var costCScale = d3.scale.linear()
            .range(["#81d4fa","#ef5350"])
            .domain(costScale.domain());
        
        svg.append("circle").attr("class","radial-line")
            .attr("cx", w/2).attr("cy",h/2).attr("r",costScale(0));
        
        pcpData.minorNest.sort(function(a,b){return d3.ascending(a.Major, b.Major)});
        
        pcpData.minorNest.forEach(function(d,i){
            
            var freqScale = d3.scale.pow().exponent(.7)
                .range([0,10])
                .domain([0,d3.max(d.values, function(dd){return dd.Frequency})]);
            
            svg.append("line").attr("class","radial-line")
                .attr("x1", w/2)
                .attr("y1", h/2)
                .attr("x2", w/2+radius*(Math.sin(i*(2 * Math.PI)/pcpData.minorNest.length)))
                .attr("y2", h/2+radius*(Math.cos(i*(2 * Math.PI)/pcpData.minorNest.length)));
            
            var metric = "CostPerEvent";
            
            d.values.forEach(function(dd){
                var metricDiff = (dd[metric] - minorPCPStats[d.key].pct["50"][metric])/minorPCPStats[d.key].pct["50"][metric];
                
                svg.append("circle").attr("class","target-prov clickable tooltipped")
                    .attr("cx", w/2+(costScale(metricDiff))*(Math.sin(i*(2 * Math.PI)/pcpData.minorNest.length)))
                    .attr("cy", h/2+(costScale(metricDiff))*(Math.cos(i*(2 * Math.PI)/pcpData.minorNest.length)))
                    .attr("r",freqScale(dd.Frequency))
                    .style("fill",costCScale(metricDiff))
                    .attr("data-tooltip", function(){
                        return d.Major + "\n" + d.Minor + "\n" + dd.ServiceProvider + "\n\n"
                            + metric + ": " + formatCurrency(dd[metric]) + "\n(" + formatPct(metricDiff) + " from average)\n"
                            + "(" + d.Frequency + " events)";
                    });
            });  
        });
        
        d3.selectAll("#modal1 .tooltipped").attr("data-position","top");
        $('#modal1 .tooltipped').tooltip({delay: 50});
    }
    
    
    d3.selectAll(".tooltipped").attr("data-position","top");
    $('.tooltipped').tooltip({delay: 50});
    
}