var express = require('express');
var handleb = require('express-handlebars').create({defaultLayout:'main'});
var request = require('request');

//Application Settings
var helloCloud = express();
helloCloud.set('port', process.env.PORT || 3001);

//Rendering Engine
helloCloud.engine('handlebars', handleb.engine);
helloCloud.set('view engine', 'handlebars');

//Supporting Content Folders
helloCloud.use('/public/scripts', express.static(__dirname + '/public/scripts'));
helloCloud.use('/public/styles', express.static(__dirname + '/public/styles'));

helloCloud.get('/', function(req, res){
	request('http://localhost:3001/getTime', function(err, resp, bod){
		if(!err && resp.statusCode >= 200 && resp.statusCode < 400){
			var c = {};
			c.curTime = bod;
			res.render('helloCloud', c);
		} else {
			var c = {};
			c.curTime = "Error Retrieving Time.";
			res.render('helloCloud', c);
		}
	});
});

helloCloud.get('/getTime', function(req, res){
	var date = new Date();
	var hours = date.getHours() >= 7 ? (date.getHours() - 7) % 12 : (date.getHours() + 17) % 12
	var curTime = hours + ':';
	curTime += (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + ':';
	curTime += (date.getSeconds() < 10 ? "0" : "") + date.getSeconds();
	curTime += ((date.getHours() /  12) >= 1 ? " AM" : " PM");
	res.send(curTime);
});

helloCloud.use("/", function(inr, outr){
	outr.status(404);
	outr.send("404");
});

helloCloud.listen(helloCloud.get('port'), function(){console.log("RUNNING");});
