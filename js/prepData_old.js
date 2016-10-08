function prepData(costData, providerData) {
    
    // MAP PCP FREQUENCY
    var memberMonthsMap = {};
    providerData.forEach(function(d){ memberMonthsMap[d.ProviderID] = +d.MemberMonths; });
    
    // PREP DATA
    var numFields = ["Cost","Frequency","InNetwork","PCPID","ProviderID","RiskAdjustedCost","MemberMonths"];
    function prepGrainData() {
        numFields.forEach(function(dd){
            costData.forEach(function(d){
                d[dd] = +d[dd];    
            });
        });
        costData.forEach(function(d){
            d.MemberMonths = memberMonthsMap[d.PCPID];
            d.CostPerEvent = d.Cost/d.Frequency;
            d.EventsPer1000 = d.Frequency*1000/d.MemberMonths;
            d.PCPName = toTitleCase(d.PCPName);
            d.ServiceProviderName = toTitleCase(d.ServiceProviderName);
        });
    };
    
    // BUILD NESTS
    var nestLevels = [
        {field:"Minor",name:"Procedure"}
        ,{field:"PCPID",name:"PCP"}
        ,{field:"ServiceProviderID",name:"ServiceProvider"}
    ];
    
    function buildNests() {
        var nestOutput = {};
        nestLevels.forEach(function(lvl){
            var nest = d3.nest().key(function(d){return d[lvl.field]}).entries(costData);
            nest.forEach(function(d){ d = dataCalc(d,lvl.name); }); 
            nest.sort(function(a,b){return d3.descending(a.Frequency, b.Frequency)});
            nestOutput[lvl.name] = nest;
        });
        
        for (thisLvl in nestOutput) {
            nestOutput[thisLvl].forEach(function(d){
                nestLevels.forEach(function(lvl){
                    if (lvl.name != thisLvl) {
                        var nest = d3.nest().key(function(dd){return dd[lvl.field]}).entries(d.values);
                        nest.forEach(function(dd){ dd = dataCalc(dd,lvl.name); }); 
                        d[lvl.name+"Nest"] = nest;
                        d[lvl.name+"Pcts"] = pctCalc(nest);
                    }
                });  
            });
        }
        
        function dataCalc(d,lvl) {
            
            d.Cost = d3.sum(d.values, function(n){return n.Cost});
            d.CostInNetwork = d3.sum(d.values, function(n){return n.InNetwork>0?n.Cost:0});
            d.RiskAdjustedCost = d3.sum(d.values, function(n){return n.RiskAdjustedCost});
            d.PctCostInNetwork = d.Cost>0?(d.CostInNetwork/d.Cost):0;
            d.Frequency = d3.sum(d.values, function(n){return n.Frequency});
            d.CostPerEvent = d.Cost/d.Frequency;
            
            if (lvl=="PCP") {
                d.PCPName = d.values[0].PCPName;
                d.PCPSpecialty = d.values[0].PCPSpecialty;
                d.MemberMonths = memberMonthsMap[d.values[0].PCPID];
                d.CostPerMember = d.Cost/d.MemberMonths;
                d.RiskAdjCostPerMember = d.RiskAdjustedCost/d.MemberMonths;
                d.EventsPer1000 = d.Frequency*1000/d.MemberMonths;
            }
            if (lvl=="Procedure") {
                d.Major = d.values[0].Major;
                d.Minor = d.values[0].Minor;
            }
            if (lvl=="ServiceProvider") {
                d.ServiceProviderName = d.values[0].PCPName;
            }
            
            return d;
        }
        
        return nestOutput;
    }
    
    prepGrainData();
    return buildNests();
    
}


var pcts = [10,25,50,75,90];
var stats = ["Cost","EventsPer1000","CostPerEvent"];
        
function pctCalc(d) {
    var nestPct = {};
    pcts.forEach(function(p){
        nestPct[p] = {};
        stats.forEach(function(s){
            d.sort(function(a,b){return d3.ascending(a[s],b[s])});
            nestPct[p][s] = d[Math.floor((d.length-1)*p/100)][s]; 
        });      
    });
    return nestPct;
}

function getMinorAggregatePlotData(data) {
    var output = [];
    var inclFields = ["Frequency","PCPNest","PCPPcts","Major","Minor"]
    data.Minor.forEach(function(d,i){
        var thisObj = {};
        inclFields.forEach(function(n){thisObj[n]=d[n]});
        thisObj["numServiceProviders"] = d.ServiceProviderNest.length;
        output.push(thisObj)
    });
    output.sort(function(a,b){return d3.descending(a.Frequency, b.Frequency)});
    return output;
}

function getPCPAggregatePlotData(data) {
    var output = [];
    data.PCP.forEach(function(pcp){
        pcp.ProcedureNest.forEach(function(minor){
            minor["Pct"] = pctCalc(minor.values);
            minor["PctDiff"] = {};
            pcts.forEach(function(pct){
                var o = {};
                stats.forEach(function(field){
                    var tgt = data.Procedure.filter(function(d){return d.Minor==minor.Minor})[0].PCPPcts["50"][field];
                    o[field] = (minor["Pct"][pct][field]-tgt)/tgt;
                });
                minor["PctDiff"][pct] = o;
            });
        });
        pcp.PctDiffFromAverage={};
        pcts.forEach(function(pct){
            var o = {};
            var theseStats = ["CostPerEvent"]
            theseStats.forEach(function(field){         
                o[field] = d3.sum(pcp.ProcedureNest, function(minor){
                    var tgt = data.Procedure.filter(function(d){return d.Minor==minor.Minor})[0].PCPPcts["50"][field];
                    var cur = minor["Pct"][pct][field];
                    return minor.Frequency*(cur-tgt)/tgt;
                })/pcp.Frequency;
            });
            o["EventsPer1000"] = d3.sum(pcp.ProcedureNest, function(minor){
                var tgt = data.Procedure.filter(function(d){return d.Minor==minor.Minor})[0].PCPPcts["50"]["EventsPer1000"];
                var cur = minor.Frequency/pcp.MemberMonths;
                return minor.Frequency*(cur-tgt)/tgt;
            })/pcp.Frequency;
            pcp.PctDiffFromAverage[pct] = o; 
        });
        var thisOutput = {};
        var inclFields = ["Frequency","Cost","CostPerEvent","CostPerMember","RiskAdjCostPerMember","PCPName","PCPSpecialty","ProcedureNest","ServiceProviderNest","PctDiffFromAverage","MemberMonths"];
        inclFields.forEach(function(n){thisOutput[n]=pcp[n]});
        output.push(thisOutput);
        
    });
    
    return output;
}

function getNetworkMapData(inputData, Minor, PCPName) {
    console.log(inputData);
    var data = inputData.Procedure.filter(function(d){return d.Minor==Minor})[0].values;
    
    var forceData = {nodes: {}, links: {}};
    var pcpList = data.input
    
    
    return data;
}
