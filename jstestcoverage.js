var JSCOVERAGESERVER_URL = "http://localhost/jstestcoverage-server/test";

function submitReport(result){
	require(["dojo/_base/xhr"],	function(xhr) {		

		// Execute a HTTP GET request		
		xhr.get({
			// The URL to request
			url: JSCOVERAGESERVER_URL + "?action=test_result&result=" + result,
			// The method that handles the request's successful result
			// Handle the response any way you'd like!
			load: function(result) {
				
			}
		});		
			
	});
}

var isTestFinished = false;

function startRunner(doc){
	var iframeElement = doc.getElementById("doh-runner");
	var testUrl = getParameterByName("testUrl");
	iframeElement.contentWindow.location = testUrl;
	//iframeElement.reload();
	//alert(testUrl);
	isTestFinished = isFinished(doc);

	
}

function reportResult(resultText){
	var pattern = "\/(\\d+) error";	
	var reg = new RegExp(pattern,"i");	
	//var error = reg.test("/137 errors");
	var myArray = reg.exec(resultText);
	
	if(myArray != null && myArray.length === 2){
		var errorNum = myArray[1];
		if(errorNum > 0){
			window.console.log("Error: " + errorNum);	
			submitReport("error");
		} else {
			window.console.log("No Error");
			submitReport("pass");
		}		
	}
}

function isFinished(doc){
	var interval = setInterval(function() {
		var iframeElement = doc.getElementById("doh-runner");
		var innerDoc = (iframeElement.contentDocument) ? iframeElement.contentDocument : iframeElement.contentWindow.document;
		
		var resultElement = innerDoc.getElementsByTagName("tfoot");		
		if(resultElement != null && resultElement.length === 1){
			window.console.log("Done.");
			isTestFinished = true;
			clearInterval(interval);
			reportResult(resultElement[0].innerText);
		} else {
			window.console.log("Not done. ");
		}
	},2000);		
}

function isErrorTest(){
	var errorCase = iframeElement.getElementByClass("failure")[0];
	var erroNum = errorCase.InnerText;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
