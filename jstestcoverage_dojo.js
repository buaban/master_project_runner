define(["dojo/_base/xhr"], function(xhr) {
	var jsTestCoverage = {};
	// Execute a HTTP GET request
	jsTestCoverage.submitReport = function(){ 
		xhr.get({
			// The URL to request
			url: "http://localhost/website/runner.txt",
			// The method that handles the request's successful result
			// Handle the response any way you'd like!
			load: function(result) {
				alert("The message is: " + result);
			}
		});
	};

	jsTestCoverage.isTestFinished = false;

	


	jsTestCoverage.startRunner = function(doc){
		var iframeElement = doc.getElementById("doh-runner");
		var testUrl = getParameterByName("testUrl");
		iframeElement.contentWindow.location = testUrl;
		//iframeElement.reload();
		
		isTestFinished = isFinished(doc);

		
	};

	jsTestCoverage.reportResult = function(resultText){
		var pattern = "\/(\\d+) error";	
		var reg = new RegExp(pattern,"i");	
		//var error = reg.test("/137 errors");
		var myArray = reg.exec(resultText);
		
		if(myArray != null && myArray.length === 2){
			var errorNum = myArray[1];
			if(errorNum > 0){
				window.console.log("Error: " + errorNum);			
			} else {
				window.console.log("No Error");
			}
			submitReport();
		}
	};

	jsTestCoverage.isFinished = function(doc){
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
	};

	jsTestCoverage.isErrorTest = function(){
		var errorCase = iframeElement.getElementByClass("failure")[0];
		var erroNum = errorCase.InnerText;
	};

	return jsTestCoverage;
});

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	results = regex.exec(location.search);
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
