var pcts = [10,25,50,75,90];
var stats = ["Cost","EventsPer1000","CostPerEvent"];

function prepData(costData, providerData) {
    console.log([costData,providerData]);
    
    // BASIC PROVIDER DATA CLEANSE
    providerData = convertNumFields(providerData, ["MemberMonths","ProviderID"]);
    var ProviderMap = {};
    providerData.forEach(function(d){
        d.FullName = toTitleCase(d.FullName);
        ProviderMap[d.ProviderID] = d;
    });
    
    // BASIC COST DATA CLEANSE
    var numFields = ["Cost","Frequency","InNetwork","PCPID","ProviderID","RiskAdjustedCost","ServiceProviderID"];
    costData = convertNumFields(costData, numFields);
    costData.forEach(function(d){
        d.CostPerEvent = d.Cost/d.Frequency;
    });
    var minorMajorMap = {};
    d3.nest().key(function(d){return d.Minor}).entries(costData).forEach(function(d){minorMajorMap[d.key] = d.values[0].Major});
    
    // NEST BY PROCEDURE
    var ProcedureNest = d3.nest().key(function(d){return d.Minor}).entries(costData);
    ProcedureNest.forEach(function(d){
        d.Minor = d.key;
        d.Major = minorMajorMap[d.Minor];
        d.PCPNest = d3.nest().key(function(d){return d.PCPID}).entries(d.values);
        d.PCPNest.forEach(function(dd){
            dd.CostPerEvent = 
                d3.sum(dd.values, function(n){return n.Cost})/d3.sum(dd.values, function(n){return n.Frequency});
            dd.EventsPer1000 =
                d3.sum(dd.values, function(n){return n.Frequency})*1000/ProviderMap[+dd.key].MemberMonths;
        });
        d.PercentilesPCP = pctCalc(d.PCPNest,["EventsPer1000","CostPerEvent"],pcts);
        d.UniqueServiceProviders = d3.nest().key(function(dd){return dd.ServiceProviderID}).entries(d.values).length;
    });
    
    // NEST BY PCP
    var PCPNest = d3.nest().key(function(d){return d.PCPID}).entries(costData);
    PCPNest.forEach(function(d){
        d.PCPID = +d.key;
        d.ProcedureNest = d3.nest().key(function(d){return d.Minor}).entries(d.values);
        d.ProcedureNest.forEach(function(dd){
            dd.Frequency = d3.sum(dd.values, function(n){return n.Frequency});
            dd.Cost = d3.sum(dd.values, function(n){return n.Cost});
            dd.CostPerEvent = dd.Cost/dd.Frequency;
            dd.EventsPer1000 = dd.Frequency*1000/ProviderMap[+d.key].MemberMonths;
            
            // GET DIFFERENCE FROM MEDIAN
            var pct50Ref = ProcedureNest.filter(function(n){return n.key == dd.key})[0].PercentilesPCP["50"];
            dd.DiffFromMedian = {
                EventsPer1000: (dd.EventsPer1000-pct50Ref.EventsPer1000)/pct50Ref.EventsPer1000
                , CostPerEvent: (dd.CostPerEvent-pct50Ref.CostPerEvent)/pct50Ref.CostPerEvent
            };
            dd.UniqueServiceProviders = d3.nest().key(function(n){return n.ServiceProviderID}).entries(dd.values).length;
        });
        d.DiffFromMedian = {
            EventsPer1000: 
                d3.sum(d.ProcedureNest, function(dd){return dd.DiffFromMedian.EventsPer1000*dd.Cost})/d3.sum(d.ProcedureNest, function(dd){return dd.Cost})
            , CostPerEvent:
                d3.sum(d.ProcedureNest, function(dd){return dd.DiffFromMedian.CostPerEvent*dd.Cost})/d3.sum(d.ProcedureNest, function(dd){return dd.Cost})
        }
        
    });
    
    return {ProviderMap: ProviderMap, ProcedureNest: ProcedureNest, PCPNest: PCPNest, CostData:costData}
    
}

function getNetworkMapData(data, Procedure) {
    var forceData = {nodes: [], links: []}
    var thisData = data.CostData.filter(function(d){return d.Minor == Procedure});
    
    // ADD NODES
    var ProviderAdded = {};
    var PCPFreq = {};
    d3.nest().key(function(d){return d.PCPID}).entries(thisData).forEach(function(d){
        var f = d3.sum(d.values, function(n){return n.Frequency});
        forceData.nodes.push({
            id: +d.key
            , ProviderType: "PCP"
            , Frequency: f
            , CostPerEvent: d3.sum(d.values, function(n){return n.Cost})/f
        });
        ProviderAdded[+d.key] = true;
        PCPFreq[+d.key] = f;
    });
    d3.nest().key(function(d){return d.ServiceProviderID}).entries(thisData).forEach(function(d){
        if (typeof ProviderAdded[+d.key] == 'undefined') {
            forceData.nodes.push({
                id: +d.key
                , ProviderType: "ServiceProvider"
                , Frequency: d3.sum(d.values, function(n){return n.Frequency})
                , CostPerEvent: d3.sum(d.values, function(n){return n.Cost})/d3.sum(d.values, function(n){return n.Frequency})
            });    
        }
        ProviderAdded[+d.key] = true;
    });
    
    // ADD LINKS
    thisData.forEach(function(d){
        forceData.links.push({
            source: d.PCPID
            , target: d.ServiceProviderID
            , value: d.Frequency/PCPFreq[+d.PCPID]
        });
    });
    
    return forceData;
}
       