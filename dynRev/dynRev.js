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

//View Current Listing of Documents
dynRev.get('/', function(req, res){
	var context = {};
	//Connect To database
	mongodb.connect(url, function(err, db){
		//Handle connection error
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		//Else connected
		} else {
			//Authenticate with DB priveleges to access docs
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				//Handle authentication error(s)
				if(err){
					context.items = "Can't authenticate with database";
					console.log(context.items);
					res.render('viewDocs', context);
				//Else authenticated
				} else {
					//Retrieve all current docs from "saveItems" DB, and return as array
					db.collection("saveItems").find().toArray(function(err, docs){
						//Handle retrieval error(s)
						if(err){
							context.items = "Can't get items";
							console.log(context.items);
							res.render('viewDocs', context);
						//Else store docs in context, and render view
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

//Post new item into DB
dynRev.post('/addItem', function(req, res){
	var item = req.body;
	var loc = item.uri.indexOf("://");
	//Validate basic URI protocols
	if(item.uri.substring(0,loc) != "http" &&
	   item.uri.substring(0,loc) != "https" &&
	   item.uri.substring(0,loc) != "ftp" &&
	   item.uri.substring(0,loc) != "mailto"){
		//If no basic URL protocols exist, insert "http://" at beginning of URI
		if(parseInt(loc) > 0){
			item.uri = "http://" + item.uri.substring(parseInt(loc)+3, item.uri.length);
		//Else, replace protocol with "http://"
		} else {
			item.uri = "http://" + item.uri.substring(loc, item.uri.length);
		}
	}
	//Connect to DB
	mongodb.connect(url, function(err, db){
		//Handle connection error(s)
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat); 
		//Else connected
		} else {
			var state = "";
			//Authenticate with credentials for R/W
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				//Handle authentication error(s)
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				//Else authenticated
				} else {
					//Insert new "item" as doc into "saveItems"
					db.collection('saveItems').insert(item, function(err, results){
						var response = {}; //Simple JSON response object
						//If no errors adding item into "saveItems", respond TRUE
						if(!err){
							stat = "Added";				//DEBUG
							console.log(stat);			//DEBUG
							response = {"response":true};
						//Else error occured, respond FALSE
						} else {
							stat = "failed...";			//DEBUG
							console.log(stat);			//DEBUG
							response = {"response":false};
						}
						//Send response
						res.send(response);
					});
				}
			});

		}
	});
});

//Post update to items        --9/9/16 Should be "PUT" 
dynRev.post('/updateItem', function(req, res){
	var item = req.body;
	var loc = item.uri.indexOf("://");
	//Validate Basic URI protocols
	if(item.uri.substring(0,loc) != "http" &&
	   item.uri.substring(0,loc) != "https" &&
	   item.uri.substring(0,loc) != "ftp" &&
	   item.uri.substring(0,loc) != "mailto"){
		//If no basic URL protocols exist, insert "http://" at beginning of URI
		if(parseInt(loc) > 0){
			item.uri = "http://" + item.uri.substring(parseInt(loc)+3, item.uri.length);
		//Else, replace protocol with "http://"
		} else {
			item.uri = "http://" + item.uri.substring(loc, item.uri.length);
		}
	}

	//Connect to DB
	mongodb.connect(url, function(err, db){
		//Handle error(s)
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		//Else connected
		} else {
			var state = "";
			//Authenticate with R/W credentials
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				//Handle error(s)
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				//Else authenticated
				} else {
					var id = item._id;
					//Delete _id from item object (it's the primary key and SHOULDN'T be edited)
					delete item._id;
					//Update item(s) with _id == id (i.e. update all docs with primary key _id)
					db.collection('saveItems').update({"_id": new mongodbParent.ObjectID(id)}, item, function(err, results){
						var response = {};
						//If no errors, respond TRUE
						if(!err){
							stat = "Updated " + item.name;		//DEBUG
							console.log(stat);			//DEBUG
							response = {"response":true};
						//Else errors, respond FALSE
						} else {
							stat = "Failed...";			//DEBUG
							console.log(stat);			//DEBUG
							console.log(item);			//DEBUG
							response = {"response":false};
						}
						res.send(response);
					});
				}
			});

		}
	});
});

//Post delete request 		--9/9/16 Should be "DELETE" 
dynRev.post('/dynRevDelItem', function(req, res){
	var item = req.body;
	//Connect to DB
	mongodb.connect(url, function(err, db){
		//Handle error(s)
		if(err){
			var stat = "Server: Database Error - Not Connected to database";
			console.log(stat);
			res.send(stat);
		//Else connected
		} else {
			var state = "";
			//Authenticate with R/W credentials
			db.authenticate("dynRev", "dynamicReview", function(err, result){
				//Handle error(s)
				if(err){
					var response = {"response":false};
					res.send(JSON.stringify(response));
				//Else authenticated
				} else {
					console.log(item);		//DEBUG
					//Remove item with _id == id (i.e. remove item with primary key id)
					db.collection('saveItems').remove({"_id": new mongodbParent.ObjectID(item._id)}, item, function(err, results){
						var response = {};
						//If no errors, respond TRUE
						if(!err){
							stat = "Deleted " + item._id;
							console.log(stat);			//DEBUG
							response = {"response":true};
						//Else errors, respond FALSE
						} else {
							stat = "Failed...";
							console.log(stat);			//DEBUG
							response = {"response":false};
						}
						//Send Response
						res.send(response);
					});
				}
			});

		}
	});
});

//404 fallback function
dynRev.use('/', function(req, res){
	res.status(404);
	res.send("404");
});

//Listen on port 'port' (defined above)
dynRev.listen(dynRev.get('port'), function(){
	console.log("dynRev.js up and running on port: " + dynRev.get('port'));
});

