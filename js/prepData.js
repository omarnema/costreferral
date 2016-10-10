var pcts = [10,25,50,75,90];
var stats = ["Cost","EventsPer1000","CostPerEvent"];

function prepData(costData, providerData) {
    console.log([costData,providerData]);
    var maxEvt= 0;
    
    
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
    

    function notDiagnostic(value) {
        var forbidden = ['Evaluation and Therapeutic Procedures', 'Other diagnostic procedures (interview, evaluation, consultation)', 'Other diagnostic procedures (interview, evaluation, consultation)','Psychological and psychiatric evaluation and therapy', 'Other diagnostic procedures (interview, evaluation, consultation)', 'Psychological and psychiatric evaluation and therapy', 'Ancillary Services'];
        return forbidden.indexOf(value.Minor) == -1 && value.CostPerEvent > 0 && value.Major!='Evaluation and Therapeutic Procedures';       
    }
    
    costData = costData.filter(notDiagnostic);
        
    // NEST BY PROCEDURE - changed to major
    var ProcedureNestByMajor = d3.nest().key(function(d){return d.Major}).key(function(d){return d.Minor}).entries(costData);  

    ProcedureNestByMajor.forEach(function(d){
    d.Major = d.key;
    d.Minors = d.values;
        d.Minors.forEach(function (d2){
            d2.Minor = d2.key;            
            d2.PCPNest = d3.nest().key(function(d){return d.PCPID}).entries(d2.values);
            d2.PCPNest.forEach(function(dd){
                dd.PCPID = +dd.key;
                dd.CostPerEvent = 
                    d3.sum(dd.values, function(n){return +n.Cost})/d3.sum(dd.values, function(n){return n.Frequency});
                dd.EventsPer1000 =
                    d3.sum(dd.values, function(n){return +n.Frequency})*1000/ProviderMap[+dd.key].MemberMonths;
                if (dd.CostPerEvent>0){
                    maxEvt = Math.max(maxEvt, dd.EventsPer1000);
                }
            });  
              
        d2.PercentilesPCP = pctCalc(d2.PCPNest,["EventsPer1000","CostPerEvent"],pcts);

        var median = d2.PercentilesPCP[50];        
        d2.PercentileBands = {
            Median: median,
            Bands:[[{x: (d2.PercentilesPCP[25].CostPerEvent-median.CostPerEvent)/(median.CostPerEvent), y: 0, Median: median},
            {x: 0, y: (d2.PercentilesPCP[25].EventsPer1000-median.EventsPer1000)/(median.EventsPer1000), Median: median},
            {x: (d2.PercentilesPCP[75].CostPerEvent-median.CostPerEvent)/(median.CostPerEvent), y: 0, Median: median},
            {x: 0, y: (d2.PercentilesPCP[75].EventsPer1000-median.EventsPer1000)/(median.EventsPer1000), Median: median}],  
                   [
                       
                {x: (d2.PercentilesPCP[10].CostPerEvent-median.CostPerEvent)/(median.CostPerEvent), y: 0, Median: median},
                {x: 0, y: (d2.PercentilesPCP[10].EventsPer1000-median.EventsPer1000)/(median.EventsPer1000), Median: median},
                {x: (d2.PercentilesPCP[90].CostPerEvent-median.CostPerEvent)/(median.CostPerEvent), y: 0, Median: median},
                {x: 0, y: (d2.PercentilesPCP[90].EventsPer1000-median.EventsPer1000)/(median.EventsPer1000), Median: median}
 
                   ] ]
        };
            
        d2.PercentileArray =[d2.PercentilesPCP[50]];        
            
        d.UniqueServiceProviders = d3.nest().key(function(dd){return dd.ServiceProviderID}).entries(d.values).length; 
            
            //FILTER OUT MINORS WITH ZERO COST AMONG ALL PROVS
        if (d2.PercentilesPCP[90].CostPerEvent==0 ||    d2.PercentilesPCP[90].EventsPer1000==0 ){
            function filterZero(val) {
                return val.key != d2.key;
            };
            d.Minors.filter(filterZero);
        };
            
        }); 
        
   
//        var noZeroPCP = function(value){
//            return value.PercentilesPCP[90].CostPerEvent > 0
//        };
    });    
    

    var ProcedureNest = d3.nest().key(function(d){return d.Minor}).entries(costData);
    ProcedureNest.forEach(function(d){
        d.Minor = d.key;
        d.Major = minorMajorMap[d.Minor];
        d.PCPNest = d3.nest().key(function(d){return d.PCPID}).entries(d.values);
        d.PCPNest.forEach(function(dd){
            dd.CostPerEvent = 
                d3.sum(dd.values, function(n){return n.Cost})/d3.sum(dd.values, function(n){return n.Frequency});
            //store a max here
            dd.EventsPer1000 =
                d3.sum(dd.values, function(n){return n.Frequency})*1000/ProviderMap[+dd.key].MemberMonths || 0;
        });
        var noZeroCostPlease = function(value){
            return value.CostPerEvent > 0;
        };
        d.PCPNest.filter(noZeroCostPlease);
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
    
    return {ProviderMap: ProviderMap, ProcedureNest: ProcedureNest, PCPNest: PCPNest, CostData:costData, MajorNest: ProcedureNestByMajor, MaxEvtPer1000: maxEvt}
    
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
       