queue()
	.defer(d3.csv, '/data/cost-data.csv')
	.defer(d3.csv, '/data/pcp-data.csv')
	.await(start);

// ON PAGE LOAD
(function($){
    $(function(){
        // put any scripts to execute after the document is ready
        $('.tooltipped').tooltip({delay: 50});

    }); // end of document ready
})(jQuery); // end of jQuery name space