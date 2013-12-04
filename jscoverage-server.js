var http = require('http');
var url = require('url');
var querystring = require('querystring');
var pg = require('pg');
var conString = 'postgres://jstestcoverage:1234@localhost/jscoverage';

http.createServer(function (request, response) {
	var qString = querystring.parse(url.parse(request.url).query);
	response.writeHead(200, {'Content-Type': 'text/plain'});
	var res;
	if(qString.action === "cover_func"){
		console.log('Start cover func: ' + qString.testId + " " + qString.funcName + " " +  qString.lines + " " +  qString.parameters);
		//res = storeTest(qString.testId, qString.funcName, qString.lineStart, qString.lineEnd, qString.parameters);
	} else if (qString.action === "cover_line"){
		console.log('Start cover line: ' + qString.testId + " " + qString.funcName + " " +  qString.line);
		
		//res = storeResult();
	}
	
	//res= 'TestID:' + qString.testID + ' | ID:'+qString.id + ' | Function Name: ' + qString.funcName + ' | Parameters:' + qString.parameters + ' | PATH:' + qString.path;
	
	response.end("OK");
}).listen(11112);
console.log('======= Start server =======');	

function storeTest(testId, funcName, lineStart, lineEnd, paramList){
	//INSERT INTO test_result(id,test_id,function_name,iteration,line_cover) VALUES (3,'ABCDEFG123','htmlDecode',1,'1,2,3,4,5,6,7,11,12,14');
	//INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param1,param2,param3,param4,param5,param6) VALUES ('ABCDEFG123','htmlDecode',1,16,now(),'param1','param2','param3','param4','param5','param6');
	
	
	var client = new pg.Client(conString);
	var result;
	var param = paramList.split("||");
	
	
	
	client.connect(function(err) {
		if(err) {
			return console.error('could not connect to postgres', err);
		}
		var sql = "INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param_list) VALUES ('" + testId + "','" + funcName +"'," + lineStart +", " + lineEnd+ ",now(),'" + paramList+ "');";
		console.log(sql);
		
		client.query(sql, function(err, result) {
		
			if(err) {
			  return console.error('error running query', err);
			}		
			client.end();
		});
		
	});
	return result;

}

function storeResult(testID, funcName, path){
	//INSERT INTO test_result(id,test_id,function_name,iteration,line_cover) VALUES (3,'ABCDEFG123','htmlDecode',1,'1,2,3,4,5,6,7,11,12,14');
	//INSERT INTO test(test_id,function_name,line_start,line_end,created_time,param1,param2,param3,param4,param5,param6) VALUES ('ABCDEFG123','htmlDecode',1,16,now(),'param1','param2','param3','param4','param5','param6');
	
	
	var client = new pg.Client(conString);
	client.connect(function(err) {
		if(err) {
			return console.error('could not connect to postgres', err);
		}
		client.query('SELECT NOW() AS "theTime"', function(err, result) {
		if(err) {
		  return console.error('error running query', err);
		}
		console.log(result.rows[0].theTime);
		//output: Tue Jan 15 2013 19:12:47 GMT-600 (CST)
		client.end();
		});
	});

}