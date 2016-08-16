var exp = require('express');
var han = require('express-handlebars').create({defaultLayout:'main'});
var request = require('request');
var parse = require('body-parser');
var mongodb = require('mongodb').MongoClient;
var mongodbParent = require('mongodb');

//Application Settings
var dynRev = exp();
dynRev.set('port', process.env.PORT || 3002);

//Rendering Engine
dynRev.engine('handlebars', han.engine);
dynRev.set('view engine', 'handlebars');

//Body Parser
dynRev.use(parse.urlencoded({ extended: false }));
dynRev.use(parse.json());

//Database Setup
var url = "mongodb://localhost:27017/dynRev";

//Supporting Content Folders
dynRev.use('/public/scripts', exp.static(__dirname + '/public/scripts'));
dynRev.use('/public/styles', exp.static(__dirname + '/public/styles'));

dynRev.get('/', function(req, res){
	var context = {};
	mongodb.connect(url, function(err, db){
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		} else {
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				if(err){
					context.items = "Can't authenticate with database";
					console.log(context.items);
					res.render('viewDocs', context);
				} else {
					db.collection("saveItems").find().toArray(function(err, docs){
						if(err){
							context.items = "Can't get items";
							console.log(context.items);
							res.render('viewDocs', context);
						} else {
							context.items = {};
							for(var i = 0; i < docs.length; i++){
								context.items[i] = docs[i];
							}
							res.render('viewDocs', context);
						}
					});
				}
			});
		}
	});
});

dynRev.post('/addItem', function(req, res){
	var item = req.body;
	var loc = item.uri.indexOf("://");
	if(item.uri.substring(0,loc) != "http" &&
	   item.uri.substring(0,loc) != "https" &&
	   item.uri.substring(0,loc) != "ftp" &&
	   item.uri.substring(0,loc) != "mailto"){

		if(parseInt(loc) > 0){
			item.uri = "http://" + item.uri.substring(parseInt(loc)+3, item.uri.length);
		} else {
			item.uri = "http://" + item.uri.substring(loc, item.uri.length);
		}
	}

	mongodb.connect(url, function(err, db){
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		} else {
			var state = "";
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				} else {
					db.collection('saveItems').insert(item, function(err, results){
						var response = {};
						if(!err){
							stat = "Added";
							console.log(stat);
							response = {"response":true};
						} else {
							stat = "failed...";
							console.log(stat);
							response = {"response":false};
						}
						res.send(response);
					});
				}
			});

		}
	});
});

dynRev.post('/updateItem', function(req, res){
	var item = req.body;
	var loc = item.uri.indexOf("://");
	if(item.uri.substring(0,loc) != "http" &&
	   item.uri.substring(0,loc) != "https" &&
	   item.uri.substring(0,loc) != "ftp" &&
	   item.uri.substring(0,loc) != "mailto"){

		if(parseInt(loc) > 0){
			item.uri = "http://" + item.uri.substring(parseInt(loc)+3, item.uri.length);
		} else {
			item.uri = "http://" + item.uri.substring(loc, item.uri.length);
		}
	}

	mongodb.connect(url, function(err, db){
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		} else {
			var state = "";
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				} else {
					var id = item._id;
					delete item._id;
					db.collection('saveItems').update({"_id": new mongodbParent.ObjectID(id)}, item, function(err, results){
						var response = {};
						if(!err){
							stat = "Updated " + item.name;
							console.log(stat);
							response = {"response":true};
						} else {
							stat = "Failed...";
							console.log(stat);
							console.log(item);
							response = {"response":false};
						}
						res.send(response);
					});
				}
			});

		}
	});
});

dynRev.post('/dynRevDelItem', function(req, res){
	var item = req.body;
	mongodb.connect(url, function(err, db){
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		} else {
			var state = "";
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				} else {
					console.log(item);
					db.collection('saveItems').remove({"_id": new mongodbParent.ObjectID(item._id)}, item, function(err, results){
						var response = {};
						if(!err){
							stat = "Deleted " + item._id;
							console.log(stat);
							response = {"response":true};
						} else {
							stat = "Failed...";
							console.log(stat);
							response = {"response":false};
						}
						res.send(response);
					});
				}
			});

		}
	});
});

dynRev.use('/', function(req, res){
	res.status(404);
	res.send("404");
});

dynRev.listen(dynRev.get('port'), function(){
	console.log("dynRev.js up and running on port: " + dynRev.get('port'));
});

