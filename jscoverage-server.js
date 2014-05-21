var http = require('http');
var url = require('url');
var xmlToJson = require('xmltojson');
var querystring = require('querystring');
var async = require('async');


var pg = require('pg');
var conString = 'postgres://jstestcoverage:1234@localhost/jscoverage';
var client = new pg.Client(conString);	

var jscoverage_url = "http://localhost/jstestcoverage-server/test?";
var currentTestStatus = "idle";
var currentTestResult = "";
var currentIteration = "";
var currentFunctName = "";
var currentTestId = "";

var errorHTML = "<html><body>Error</body></html>";

http.createServer(function (request, response) {
	var qString = querystring.parse(url.parse(request.url).query);
	response.writeHead(200, {'Content-Type': 'text/html'});
	if(!qString.iteration){
		qString.iteration = "0";
	}
	var res;	

	if(qString.action == "cover_func"){
		console.log('Start cover func: ' + qString.testId + " " + qString.funcName + " " +  qString.lines + " " +  qString.parameters + " " + qString.iteration);
		res = storeCoverFunc(qString.testId, qString.funcName, qString.lines, qString.parameters, qString.iteration);
	} else if (qString.action == "cover_line"){
		//console.log('Start cover line: ' + qString.testId + " " + qString.funcName + " " +  qString.line + " " + iteration);
		res = storeCoverLine(qString.testId, qString.funcName, qString.line, qString.iteration);
	} else if(qString.action=="test_start"){
		currentTestStatus = "running";
		currentIteration = qString.iteration;
		currentFunctName = qString.funcName;
		currentTestId = qString.testId;
		res = currentTestStatus;
		console.log("Test start");
	} else if(qString.action=="test_end"){
		currentTestStatus = "idle";
		res = currentTestStatus;
		console.log("Test end");
	} else if(qString.action=="test_result"){
		currentTestResult = qString.result;
		
		if(qString.result=="error"){
			storeError( currentTestId, currentFunctName, qString.result, currentIteration);
			currentTestStatus = "idle";
			res = currentTestStatus;
		}
		
		console.log("Result: " + qString.result);
	} else if(qString.action=="get_result"){
		res = currentTestResult;
		console.log("Get result: " + currentTestResult);
	} else if(qString.action=="get_status"){
		res = currentTestStatus;
		console.log("Get status: " + currentTestStatus);
	} else if(qString.action =="get_coverage"){
		console.log("Get coverage for "+ qString.funcName);
		checkCoverage(qString.testId, qString.funcName, qString.percent, function(coverPct){		
			console.log("Coverage for " + qString.funcName + " = " + coverPct);
			response.end(""+coverPct);
		});
	} else if(qString.action == "get_report_list"){
		console.log("Get report list");
		getReportList(function(report){
			response.end(""+report);
		});
	} else if(qString.action == "get_report_summary"){
		console.log("Get report summary: " + qString.testId);
		getReportSummary(qString.testId, function(report){
			response.end(""+report);
		});
	} else if(qString.action == "get_report_detail"){
		console.log("Get report detail: " + qString.testId + " " + qString.funcName);
		getReportDetail(qString.testId, qString.funcName, function(report){
			response.end(""+report);
		});
	}

	if(qString.action == "get_coverage" || qString.action == "get_report_summary" || qString.action == "get_report_detail" || qString.action == "get_report_list"){
		
	} else {
		response.end(res);
	}
}).listen(11112);
console.log('======= Start server =======');	
client.connect(function(err) {		
	if(err) {
		return console.error('could not connect to postgres', err);
	}
});
console.log("PG database connected.");




function storeError(testId, funcName, line, iteration){
	//INSERT INTO test_result(id,test_id,function_name,iteration,line_cover) VALUES (3,'ABCDEFG123','htmlDecode',1,'1,2,3,4,5,6,7,11,12,14');
	//INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param1,param2,param3,param4,param5,param6) VALUES ('ABCDEFG123','htmlDecode',1,16,now(),'param1','param2','param3','param4','param5','param6');
	
	var sql = "INSERT INTO cover_line(test_id,function_name,line,iteration) VALUES ('" + testId + "','" + funcName +"','" + line + "','" + iteration + "');";
	//console.log(sql);
	client.query(sql, function(err, result) {
		if(err) {
			return console.error('storeError - error running query', err + " \n" + sql);
		}			
		return result;
	});
}


function storeCoverFunc(testId, funcName, lines, parameters, iteration){
	//INSERT INTO test_result(id,test_id,function_name,iteration,line_cover) VALUES (3,'ABCDEFG123','htmlDecode',1,'1,2,3,4,5,6,7,11,12,14');
	//INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param1,param2,param3,param4,param5,param6) VALUES ('ABCDEFG123','htmlDecode',1,16,now(),'param1','param2','param3','param4','param5','param6');
	
	var paramJson = "";
	
	if(parameters.trim()!=""){
		//console.log(parameters);
		var paramList = new Array();
		paramList = parameters.split("\|");
		//console.log(paramList.length + ": " + paramList);
		var xml = "<parameters>"
		for(var i=0; i < paramList.length; i++){
			var items = paramList[i].split(":");
			xml += "<parameter>";
			xml += "<name>"+ items[0] +"</name>";
			xml += "<type>" + items[1] + "</type>";
			xml += "<value>" + items[2] + "</value>";
			xml += "</parameter>"; 
		}
		xml += "</parameters>";
		
		var parseString = require('xml2js').parseString;		
		parseString(xml, function (err, result) {
			//console.dir(JSON.stringify(result));
			paramJson = JSON.stringify(result);
		});
	}	
	
	var sql = "INSERT INTO cover_function(test_id,function_name,lines,created_time,parameters, iteration) VALUES ('" + testId + "','" + funcName +"','" + lines + "',now(),'" + paramJson + "','" + iteration + "');";
	//console.log(sql);
	
	client.query(sql, function(err, result) {		
		if(err) {			
			return console.error('StoreCoverFunc - error running query', err + " \n" + sql);
		}		
		return result;
	});
}

function storeCoverLine(testId, funcName, line, iteration){
	//INSERT INTO test_result(id,test_id,function_name,iteration,line_cover) VALUES (3,'ABCDEFG123','htmlDecode',1,'1,2,3,4,5,6,7,11,12,14');
	//INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param1,param2,param3,param4,param5,param6) VALUES ('ABCDEFG123','htmlDecode',1,16,now(),'param1','param2','param3','param4','param5','param6');
	
	if(iteration!="0") {
		var sql = "INSERT INTO cover_line(test_id,function_name,line,iteration) VALUES ('" + testId + "','" + funcName +"','" + line + "','" + iteration + "');";
		//console.log(sql);
		client.query(sql, function(err, result) {
			if(err) {
				return console.error('StoreCoverLine - error running query', err + " \n" + sql);
			}			
			return result;
		});
	}
}



function checkCoverage(testId, funcName, percent, cb){		

		var sql = "SELECT DISTINCT ON (cover_line.line) line, cover_function.test_id, cover_function.function_name, cover_function.parameters, cover_function.lines, cover_line.iteration" 
				+ " FROM public.cover_function INNER JOIN public.cover_line ON (cover_function.iteration = cover_line.iteration) "
				+ " WHERE cover_function.test_id='" + testId + "' AND cover_line.function_name='" + funcName + "' AND cover_line.function_name=cover_function.function_name  ORDER BY cover_line.line;";
					//console.log(sql);

		client.query(sql, function(err, result) {
			if(err) {			
				return console.error('CheckCovereage - error running query', err + " \n" + sql);
			}			
			
			
			if(result.rows.length == 0){
				return;
			}
			
			var lines = result.rows[0].lines;
			var linesArray = lines.split(":");
			var linesTable = new Object();
			
			for(var i=0; i < linesArray.length; i++){
				linesTable[linesArray[i]] = 0;
			}
			
			for(var i=0; i < result.rows.length; i++){
				linesTable[result.rows[i].line] = 1;
				//result.rows[i].lines;
			}
			
			var totalLine = 0;
			var coverLine = 0;
			// calculate percent
			for (var line in linesTable) {
				// use hasOwnProperty to filter out keys from the Object.prototype
				if (linesTable.hasOwnProperty(line)) {
					totalLine++;
					if(linesTable[line] == 1){
						coverLine++;
					}
				}
			}
			var pctCover = 0;
			pctCover =(coverLine/totalLine)*100;
			
			//console.log("Coverage: " + pctCover + " , Expected: "+percent);
			cb(pctCover);
		});			
					
		/*
		async.waterfall(
			[
				function(callback){					
					client.connect(function(err) {
						if(err) {
							console.error('could not connect to postgres', err);
							return 0;
						}											
						callback(null, client);
					});
				},
				// i. check if headers.txt exists
				function(client, callback) {
					var sql = "SELECT DISTINCT ON (cover_line.line) line, cover_function.test_id, cover_function.function_name, cover_function.parameters, cover_function.lines, cover_line.iteration, cover_function.iteration" 
						+ " FROM public.cover_function INNER JOIN public.cover_line ON (cover_function.iteration = cover_line.iteration) "
						+ " WHERE cover_function.test_id='" + testId + "' AND cover_line.function_name='" + funcName + "' ORDER BY cover_line.line;";
					//console.log(sql);

					client.query(sql, function(err, result) {
						if(err) {
						  return console.error('CheckCovereage - error running query', err + " \n" + sql);
						}			
						
						
						var lines = result.rows[0].lines;
						var linesArray = lines.split(":");
						var linesTable = {};
						
						for(var i=0; i < linesArray.length; i++){
							linesTable[linesArray[i]] = 0;
						}
						
						for(var i=0; i < result.rows.length; i++){
							linesTable[result.rows[i].line] = 1;
							//result.rows[i].lines;
						}
						
						console.log(linesTable);
						
						var totalLine = 0;
						var coverLine = 0;
						// calculate percent
						for (var line in linesTable) {
							// use hasOwnProperty to filter out keys from the Object.prototype
							if (linesTable.hasOwnProperty(line)) {
								totalLine++;
								if(linesTable[line] == 1){
									coverLine++;
								}
							}
						}
						var pctCover = 0;
						pctCover =(coverLine/totalLine)*100;
						
						console.log("Coverage: " + pctCover + " , Expected: "+percent);
						callback(null, pctCover);
					});
				},
				
				// ii. fetch the HTTP headers
				function(pctCover, callback) {
					console.log("return pctcover");					
					cb(pctCover);
					callback(null);
				}
			],
			
			// the bonus final callback function
			function(err, status) {
				console.log("Error checkCoverage " + status);
			}
		);
		
		*/
		
}

function getReportList(cb){
	
	async.waterfall(
	[
		// i. Retrieve list of functions in this test id
		function(callback) {		
			
			var sql = "SELECT DISTINCT ON (cover_function.test_id) test_id FROM cover_function;";	
			
			//console.log(sql);
			client.query(sql, function(err, result) {
				if(err) {
				  callback(null);
				  return 0;
				}			
				//console.log(result);
				var testIdTable = new Array();
								
				for(var i=0; i < result.rows.length; i++){
					testIdTable.push(result.rows[i].test_id);
				}						
				
				callback(null, testIdTable);				
				
			});		
			
		},
		// Generate HTML result
		function(testIdTable, callback){
			//console.log(testIdTable);
			var html = "<html>" 
				+ "<head>"
				+ "<title>JSTest Coverage - Reports List</title>"
				+ "<style>"
				+ "#wrap {"
				+ "	width: 900px;"
				+ "	margin: 0 auto;		"
				+ "	background-color: #FFFFFF;		"				
				+ "	border-radius: 10px; "	
				+ "	box-shadow: 7px 7px 10px #888888;"
				+ "	box-sizing: content-box;"
				+ "	border-color: rgb(179, 179, 179);"
				+ "	border-width: 1px;"
				+ "	border-style: solid;"
				+ "}"
				+ "#wrap-content {"
				+ "	padding-left: 50px;"
				+ "	padding-right: 50px;"
				+ "	padding-bottom: 150px;"
				+ "}"
				+ "#banner {"
				+ "	background-color: rgb(125, 190, 125);"
				+ "	font-size: 2em;		"
				+ "	padding-left: 50px;		"
				+ "	padding-top: 20px;		"
				+ "	padding-bottom: 20px;		"
				+ "	border-top-left-radius: 7px; "
				+ "	border-top-right-radius: 7px; "
				+ "}"
				+ "#summary {"				
				+ "	margin-top: 50px;		"
				+ "	margin-bottom: 25px;		"
				+ "	font-size: 1.2em;		"
				+ "}"
				+ "table {"				
				+ "	border-width: 0px;		"
				+ "	border-spacing: 0px;		"
				+ "	border-collapse: collapse;  "
				+ "	border-style: none;  "
				+ "}"
				+ ".cell {"				
				+ "	border-bottom-style: solid;		"
				+ " border-bottom-width: 1px;	"
				+ " padding: 5px;	"
				+ "}"
				+ ".header {"				
				+ "	border-bottom-width: 2px;		"
				+ "	border-bottom-style: solid;  "
				+ " padding: 5px;	"
				+ " text-align: left;	"
				+ "}"
				+ ".number {"				
				+ "	text-align: right;		"				
				+ "}"
				+ "</style>"
				+ "</head>";
			html += "<body style=\"background-color: #F6F4F0;\">";
			html += "<div id=\"wrap\">";
			html += "<div id=\"banner\">Reports List</div>";
			html += "<div id=\"wrap-content\">";
			html += "<div id=\"summary\"><span style=\"font-weight: bold;\"> </span></div>";
			html += "<div id=\"content\">";
			var table = "<table>";
			for (var i=0; i< testIdTable.length; i++) {		
				var summaryUrl= jscoverage_url + "action=get_report_summary&testId=" + testIdTable[i];
				table +="<tr><td class=\"cell\"><a href=\""+ summaryUrl + "\">" + testIdTable[i] +"</a></td></tr>";
			
			}
			table += "</table>";
			html += table;
			html += "</div>";
			html += "</div>";
			html += "</div>";
			html += "</body></html>";
			//console.log(html);
			callback(null, html);
		}
	],
	
	// Return report list
	function(err, html) {		
		if(err){
			console.log("Error Get Report List ");
			return false;
		}
		cb(html);		
		return html;
	});

}



function getReportSummary(testId, cb){
	
	async.waterfall(
	[
		// i. Retrieve list of functions in this test id
		function(callback) {		
			
			var sql = "SELECT DISTINCT ON (cover_function.function_name) function_name"
				+ " FROM cover_function"
				+ " WHERE test_id='" + testId +"'";	
			
			//console.log(sql);
			client.query(sql, function(err, result) {
				if(err) {
				  callback(null);
				  return 0;
				}			
				//console.log(result);
				var funcTable = {};
								
				for(var i=0; i < result.rows.length; i++){
					funcTable[result.rows[i].function_name] = "";
				}						
				
				callback(null, funcTable);				
				
			});		
			
		},
		
		// ii. Get coverage and path of each params
		function(funcTable, callback) {
			//console.log(funcTable);
			var funcCount = 0;
			var funcDone = 0;
			var funcList = new Array();
			var summaryTable = new Object();
			
			for (var funcName in funcTable) {
				// use hasOwnProperty to filter out keys from the Object.prototype
				if (funcTable.hasOwnProperty(funcName)) {
					funcCount++;
					funcList.push(funcName);
					summaryTable[funcName] = "";
				}
			}							

			for(var i=0; i<funcList.length;i++){										
				
				var sql = "SELECT DISTINCT ON (cover_line.line) line, cover_function.test_id, cover_function.function_name, cover_function.parameters, cover_function.lines, cover_line.iteration" 
					+ " FROM public.cover_function INNER JOIN public.cover_line ON (cover_function.iteration = cover_line.iteration) "
					+ " WHERE cover_function.test_id='" + testId + "' AND cover_line.function_name='" + funcList[i] + "' AND cover_line.function_name=cover_function.function_name  ORDER BY cover_line.line;";
				
				client.query(sql, function(err, result) {
					if(err) {
						console.error('getReportSummary - error running query', err + " \n" + sql);
						callback(null);
						return 0;
					}			
					
					var resultFunc = new Object();

					var lines = result.rows[0].lines;
					var linesArray = lines.split(":");
					
					var linesTable = {};
					var funcName = result.rows[0].function_name;
					
					for(var i=0; i < linesArray.length; i++){
						linesTable[linesArray[i]] = 0;
					}
					
					var isError = false; 
					resultFunc["error"] = false;
					for(var i=0; i < result.rows.length; i++){
						linesTable[result.rows[i].line] = 1;
						if(!isError && result.rows[i].line=="error"){
							resultFunc["error"] = true;
							isError = true;
						} 
					}
										
					var totalLine = 0;
					var coverLine = 0;
					var uncoverLine = new Array();
					// calculate percent
					for (var line in linesTable) {
						// use hasOwnProperty to filter out keys from the Object.prototype
						if (linesTable.hasOwnProperty(line)) {
							totalLine++;
							if(linesTable[line] == 1){
								coverLine++;
							}
						}
					}
					
					for (var line in linesTable) {
						// use hasOwnProperty to filter out keys from the Object.prototype
						if (linesTable.hasOwnProperty(line)) {					
							if(linesTable[line] == 0){
								uncoverLine.push(line);
							}
						}
					}			

						
					
					var pctCover = 0;
					pctCover =(coverLine/totalLine)*100;
					
					
					resultFunc["pctCover"] = pctCover;
					resultFunc["uncoverLine"] = uncoverLine.join();
					summaryTable[funcName] = resultFunc;
					funcDone++;

					if(funcDone==funcCount){
						console.log(summaryTable);
						callback(null, summaryTable);
					}
				});
			}
			
		},
		// Generate HTML result
		function(summaryTable, callback){
			//console.log(summaryTable);
			var html = "<html>" 
				+ "<head>"
				+ "<title>JSTest Coverage - Summary Report</title>"
				+ "<style>"
				+ "#wrap {"
				+ "	width: 900px;"
				+ "	margin: 0 auto;		"
				+ "	border-radius: 10px; "	
				+ "	box-shadow: 7px 7px 10px #888888;"
				+ "	box-sizing: content-box;"
				+ "	border-color: rgb(179, 179, 179);"
				+ "	border-width: 1px;"
				+ "	border-style: solid;"
				+ "}"
				+ "#wrap-content {"
				+ "	padding-left: 50px;"
				+ "	padding-right: 50px;"
				+ "	padding-bottom: 150px;"
				+ "}"
				+ "#banner {"
				+ "	background-color: rgb(125, 190, 125);"
				+ "	font-size: 2em;		"
				+ "	padding-left: 50px;		"
				+ "	padding-top: 20px;		"
				+ "	padding-bottom: 20px;		"
				+ "	border-top-left-radius: 7px; "
				+ "	border-top-right-radius: 7px; "
				+ "}"
				+ "#summary {"				
				+ "	margin-top: 50px;		"
				+ "	margin-bottom: 25px;		"
				+ "	font-size: 1.2em;		"
				+ "}"
				+ "table {"				
				+ "	border-width: 0px;		"
				+ "	border-spacing: 0px;		"
				+ "	border-collapse: collapse;  "
				+ "	border-style: none;  "
				+ "	width: 500px;  "
				+ "}"
				+ ".cell {"				
				+ "	border-bottom-style: solid;		"
				+ " border-bottom-width: 1px;	"
				+ " padding: 5px;	"
				+ "}"
				+ ".errorCell {"				
				+ "	background-color: pink; "
				+ "}"				
				+ ".header {"				
				+ "	border-bottom-width: 2px;		"
				+ "	border-bottom-style: solid;  "
				+ " padding: 5px;	"
				+ " text-align: left;	"
				+ "}"
				+ ".number {"				
				+ "	text-align: right;		"				
				+ "}"
				+ "</style>"
				+ "</head>";
			html += "<body style=\"background-color: #FFFFFF;\">";
			html += "<div id=\"wrap\">";
			html += "<div id=\"banner\">Summary Report</div>";
			html += "<div id=\"wrap-content\">";
			html += "<div id=\"summary\"><span style=\"font-weight: bold;\">Test ID</span>:<span style=\"margin-left: 10px;\">" + testId + "</span></div>";
			html += "<div id=\"content\">";
			var table = "<table>";
			table += "<tr><th class=\"header\">Function</th><th class=\"header\">% Coverage</th><th class=\"header\">Uncovered line</th></tr>";
			
			for (var funcName in summaryTable) {				

				if (summaryTable.hasOwnProperty(funcName)) {
					var cssCell = "cell";
					var errTxt = "";
					if(summaryTable[funcName]["error"]===true){
						cssCell = cssCell + " errorCell";
						errTxt = "error";
					}
					var detailUrl= jscoverage_url + "action=get_report_detail&testId=" + testId + "&funcName=" + funcName;
					table +="<tr><td class=\"" + cssCell + "\"><a href=\""+ detailUrl + "\">" + funcName +"</a><span style='color: red; font-size: 0.8em; margin-left: 10px;'>" + errTxt + "</span></td>"
						+ "<td class=\"" + cssCell + "\">" + summaryTable[funcName]['pctCover'].toFixed(1) + "</td>"
						+ "<td class=\"" + cssCell + "\">" + summaryTable[funcName]['uncoverLine'] + "</td></tr>";
				}
			}
			table += "</table>";
			html += table;
			html += "</div>";
			html += "</div>";
			html += "</div>";
			html += "</body></html>";
			callback(null, html);
		}
	],
	
	// Return summary result
	function(err, html) {		
		if(err){
			console.log("Error Get Report Summary ");
			return false;
		}
		cb(html);		
		return html;
	});

}

function getReportDetail(testId, funcName, cb){
	async.waterfall(
	[
		// i. Retrieve list of iterations of this function
		function(callback) {		
			
			var sql = "SELECT cover_function.function_name, cover_line.iteration, cover_function.parameters, cover_line.line, cover_function.lines"
				+ " FROM cover_line INNER JOIN cover_function ON (cover_function.iteration = cover_line.iteration)"
				+ " WHERE cover_line.test_id='" + testId + "' AND cover_function.function_name='" + funcName + "'  AND cover_line.function_name=cover_function.function_name ORDER BY cover_line.iteration,cover_line.line;";	
				
			
			//console.log(sql);
			client.query(sql, function(err, result) {
				if(err) {
				  callback(null);
				}			
				console.log(result);
				var resultTable = new Object();
				
				var cvLines = new Array();
				var currentIt = "";
				var previousIt = result.rows[0].iteration;
				//console.log(previousIt);
				// remove duplicated lines
				var totalLines = result.rows[0].lines;						
				var linesArray = totalLines.split(":");
				linesArray = uniqueArray(linesArray);						
				totalLines = linesArray.join(":");
				//console.log("Parameters: "+result.rows[0].parameters);
				var paramArray = new Array();

				if(result.rows[0].parameters!=""){
					var params = result.rows[0].parameters;	
					var paramsJSON = JSON.parse(params);
					//console.log(paramsJSON.parameters.parameter.length);
					for(var i=0; i < paramsJSON.parameters.parameter.length; i++){
						var param = paramsJSON.parameters.parameter[i];
						//console.log("Name: " + param.name + " Type: " + param.type + " Value: " + param.value );					
						paramArray.push(param.name + " Type: " + param.type);
					}				
				}
				
				var itNum = 1;
				for(var i=0; i < result.rows.length; i++){
					
					
					currentIt = result.rows[i].iteration;
					
					if(currentIt.trim() != previousIt.trim()){
						// remove duplicated cover lines					
						itNum++;						
						cvLines = uniqueArray(cvLines);						
						cvLines.sort();
						

						resultTable[previousIt] = { 
							params: result.rows[i-1].parameters,
							coverLines: cvLines.join(":")
						};
						
						previousIt = currentIt;
						cvLines = new Array();
					}
									
					cvLines.push(result.rows[i].line);
					//console.log(cvLines);
					previousIt = currentIt;					
				}						
				
				
				// ** add last iteration to table
				cvLines = uniqueArray(cvLines);						
				cvLines.sort();

				resultTable[currentIt] = { 
					params: result.rows[i-1].parameters,
					coverLines: cvLines.join(":")
				};
				
				
				//console.log(resultTable);
				callback(null, resultTable, totalLines, paramArray);
				
			});		
			
		},
		
		// ii. Generate HTML
		function(resultTable, totalLines, paramArray, callback) {
			var html = "<html>" 
				+ "<head>"
				+ "<title>JSTest Coverage - Details Report</title>"
				+ "<style>"
				+ "#wrap {"
				+ "	width: 900px;"
				+ "	margin: 0 auto;		"
				+ "	background-color: #FFFFFF;		"
				+ "	border-radius: 10px; "	
				+ "	box-shadow: 7px 7px 10px #888888;"
				+ "	box-sizing: content-box;"
				+ "	border-color: rgb(179, 179, 179);"
				+ "	border-width: 1px;"
				+ "	border-style: solid;"
				+ "}"
				+ "#wrap-content {"
				+ "	padding-left: 50px;"
				+ "	padding-right: 50px;"
				+ "	padding-bottom: 150px;"
				+ "}"
				+ "#banner {"
				+ "	background-color: rgb(125, 190, 125);"
				+ "	font-size: 2em;		"
				+ "	padding-left: 50px;		"
				+ "	padding-top: 20px;		"
				+ "	padding-bottom: 20px;		"
				+ "	border-top-left-radius: 7px; "
				+ "	border-top-right-radius: 7px; "
				+ "}"
				+ "#summary {"				
				+ "	margin-top: 50px;		"
				+ "	margin-bottom: 25px;		"
				+ "	font-size: 1.2em;		"
				+ "}"
				+ "table {"				
				+ "	border-width: 0px;		"
				+ "	border-spacing: 0px;		"
				+ "	border-collapse: collapse;  "
				+ "	border-style: none;  "
				+ "	width: 650px;  "
				+ "}"
				+ ".cell {"				
				+ "	border-bottom-style: solid;		"
				+ " border-bottom-width: 1px;	"
				+ " padding: 5px;	"
				+ "}"
				+ ".errorCell {"				
				+ "	background-color: pink; "
				+ "}"
				+ ".header {"				
				+ "	border-bottom-width: 2px;		"
				+ "	border-bottom-style: solid;  "
				+ " padding: 5px;	"
				+ " text-align: left;	"
				+ "}"
				+ ".number {"				
				+ "	text-align: right;		"				
				+ "}"
				+ "</style>"
				+ "</head>";
			html += "<body style=\"background-color: #F6F4F0;\">";
			html += "<div id=\"wrap\">";
			html += "<div id=\"banner\">Details Report</div>";
			html += "<div id=\"wrap-content\">";			
			html += "<div id=\"content\">";
			html += "<div id=\"summary\"><span style=\"font-weight: bold;\">Function:</span><span style=\"margin-left: 10px;\">" + funcName + "</span><br/>";
			html += "<span style=\"font-weight: bold;\">Lines:</span><span style=\"margin-left: 10px;\">" + totalLines.replace(/:/g,",") + "</span><br/><span style=\"font-weight: bold;\">";
			var tableArg = "";
			for(var i=0; i< paramArray.length;i++){
				if(i==0){
					html += "Parameter:</span><span style=\"margin-left: 10px;\">" + paramArray[i].replace(" Type: ","(") +")";
				} else {
					html += ", Parameter:</span><span style=\"margin-left: 10px;\">" + paramArray[i].replace(" Type: ","(") +")";
				}
				tableArg +="<th class=\"header\">" + paramArray[i].replace(" Type: ","(") +")" + "</th>";
			}
			html += "</span></div>";
			//console.log(resultTable);
			
			var table = "<table>";
			
			if(paramArray.length!=0){
				table += "<tr><th  class=\"header\" rowspan=\"2\">Covered Lines</th>";
			} else {
				table += "<tr><th class=\"header\">Covered Lines</th>";
			}
			if(paramArray.length!=0){
				table += "<th class=\"cell\" colspan=\""+ paramArray.length +"\">Arguments</th>";
			}
			table += "</tr>";
			
			if(paramArray.length!=0){
				table += "<tr>" + tableArg + "</tr>";
			}
			
			
			//console.log(resultTable);
			
			var firstIt = firstChild(resultTable);
			//console.log("First It = " + firstIt.coverLines);
			var previousCoverLines = firstIt['coverLines'];
			var currentCoverLines = "";		
				
			//console.log(resultTable);
			var currentRow = 0;
			var coverageTable = new Object();
			for (var it in resultTable) {	
				
				if (resultTable.hasOwnProperty(it)) {							
					if(!coverageTable.hasOwnProperty(resultTable[it].coverLines)) {
						coverageTable[resultTable[it].coverLines] = [];
					}
					if(paramArray.length!=0){
						coverageTable[resultTable[it].coverLines].push(resultTable[it].params);
					}
				}				
				
			}
			
			for(var coverLines in coverageTable){
				if (coverageTable.hasOwnProperty(coverLines)) {
					var argJSON = new Object();
					var argArray = new Array();
					var cssCell = "cell";
					if(coverLines.indexOf("error") != -1){
						cssCell = cssCell + " errorCell";
					}
					if(paramArray.length!=0){			
						// get array of parameters
						argArray = coverageTable[coverLines];
						argArray = uniqueArray(argArray);
						
						table += "<tr><td class=\"" + cssCell + "\" rowspan=\"" + argArray.length + "\">" + coverLines.replace(/:/g,",") + "</td>";
					} else {
						table += "<tr><td class=\"" + cssCell + "\">" + coverLines.replace(/:/g,",") + "</td>"; 
					}
					
					var arg = "";
					for(var a=0; a< argArray.length; a++){
						var tmpArr = new Array();
						var tmpJSON = JSON.parse(argArray[a]);
						for(var k=0; k<tmpJSON.parameters.parameter.length; k++){
							tmpArr.push(tmpJSON.parameters.parameter[k].value);
						}
						argArray[a] = tmpArr;
					}
					
					//console.log(argArray);
					
					if(paramArray.length!=0){
						for(var i=0; i < paramArray.length; i++){
							
							//console.log(argArray[i].value);
							table += "<td class=\"" + cssCell + "\">" + argArray[0][i] + "</td>";
						}			
					}
					table += "</tr>";
					
					
					if(paramArray.length!=0){
						for(var i=1; i < argArray.length; i++){								
							table += "<tr>";
							for(var j=0; j<argArray[i].length; j++){
								table += "<td class=\"" + cssCell + "\">" + argArray[i][j] + "</td>";
							}
												
							table += "</tr>";
						}
					}
					
				}
			}
			
			//console.log(coverageTable);
			
			
			table += "</table>";
			html += table;
			
			
			
			
			html += "</div>";
			html += "</div>";
			html += "</div>";
			html += "</body></html>";
			callback(null, html);
		}
	],
	
	// Return summary result
	function(err, html) {		
		if(err){
			console.log("Error Get Report Summary ");
			cb(errorHTML);
			return false;
		}
		cb(html);		
		return html;
	});
}





// ============ Utility functions ===============

function pushArray(obj, key, value){
	var arr = new Array();
	
	if( Object.prototype.toString.call( obj[key] ) === '[object Array]' ) {
		arr = obj[key];		
	}	
	arr.push(value);
	var newObj = new Object();
	newObj = obj;
	newObj[key] = arr;
	return newObj;
}

function uniqueArray(arr) {
	var i, j, cur, found;
    for (i = arr.length - 1; i >= 0; i--) {
        cur = arr[i];
        found = false;
        for (j = i - 1; !found && j >= 0; j--) {
            if (cur === arr[j]) {
                if (i !== j) {
                    arr.splice(i, 1);
                }
                found = true;
            }
        }
    }
    return arr;
}

function firstChild(obj) {
    for (var a in obj) {
		if (obj.hasOwnProperty(a)) {
			return obj[a];
		}
	}
}