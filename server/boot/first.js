var httpreq = require('httpreq');

function zapros(){
	httpreq.post('http://localhost:3000/api/Accounts/queryWithAllNotF', function (err, res){
		if (err){
			console.log(err);
		}else{
			console.log(res.body);
		}
	});
}
//zapros();