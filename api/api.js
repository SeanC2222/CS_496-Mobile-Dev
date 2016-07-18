var exp = require('express');
var router = exp.Router();
var han = require('express-handlebars').create({defaultLayout:'main'});
var session = require('express-session');
var request = require('request');
var parse = require('body-parser');
var mongodb = require('mongodb').MongoClient;
var mongodbParent = require('mongodb');

var apivars = require('./apivars');

//Application Settings
var api = exp();
api.set('port', process.env.PORT || 3003);

//Rendering Engine
api.engine('handlebars', han.engine);
api.set('view engine', 'handlebars');

//Body Parser
api.use(parse.urlencoded({ extended: false }));
api.use(parse.json());

//Database Setup
var url = "mongodb://localhost:27017/api";

//Session Setup
api.use(session({secret: apivars.sessionPass}));

api.post('/createUser', function(req, res){
	var context = {};
	
	var user = req.body.adminUser;
	var pass = req.body.adminPass;
	if(user != apivars.userAdmin.user || pass != apivars.userAdmin.pass){
		context.status = false;
		context.msg = "\"api: Admin user/password combination incorrect\"";
		res.render('status', context);
		return;
	}
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');
	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					res.render('status', context);
				} else {
					var search = {'user': req.body.user};
					db.collection("users").find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error with user database\"";
							res.render('status', context);
						} else {
							if(docs.length){
								context.status = false;
								context.msg = "\"api: User name exists already\"";
								res.render('status', context);
							} else {
								var newUserObj = {};
								newUserObj.user = req.body.user;
								newUserObj.password = req.body.password;
								newUserObj.groups = [];
								if(req.body.email){
									newUserObj.email = req.body.email;
								} else {
									newUserObj.email = "";
								}
								newUserObj.friends = [];
								newUserObj.lastActivity = Date();
								newUserObj.dateCreated = newUserObj.lastActivity;
								db.collection("users").insertOne(newUserObj, function(err, result){
									if(err){
										context.status = false;
										context.msg = "\"api: Failed to add new user\"";
									} else {
										context.status = true;
										context.msg = "\"api: User added successfully\"";
									}
									res.render('status', context);
								});
							}
						}
					});
				}
			});
		}
	});
});

api.post('/login', function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\""
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					res.render('status', context);
				} else {
					var login = {"user": req.body.user, "password": req.body.password};
					db.collection("users").find(login).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error logging in\"";
							if(req.session.user){
								req.session.destroy();
							}
							res.render('status', context);
						} else {
							if(docs.length){
								context.status = true;
								if(JSON.stringify(req.session.user) == JSON.stringify(login)){
									context.msg = "\"api: Currently logged in.\"";
								} else {
									login = docs[0];
									req.session.user = login;
									context.msg = "\"api: Logged in Successfully\"";
								}
								res.render('status', context);
							} else {
								context.status = false;
								if(req.session.user){
									req.session.destroy();
								}
								context.msg = "\"api: False username/password combination\"";
								res.render('status', context);
							}

						}
					});
				}
			});
		}
	});
});

api.post('/logout', function(req, res){
	var context = {};
	res.setHeader('Content-type', 'application/json');
	if(req.session){
		req.session.destroy();
		context.status = true;
		context.msg = "\"api: Successfully logged out\"";
	} else {
		context.status = false;
		context.msg = "\"api: No user currently logged in\"";
	}
	res.render('status', context);
});

function authenticate(req, res, next){
	if(!req.session.user){
		var context = {};
		context.status = false;
		context.msg = "\"api: Not logged in\"";
		res.render('status', context);
	} else {
		next();
	}
}

api.get('/groups/:group/items/:key/:value', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var search = {"group":req.params.group};
					db.collection("groups").find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error retrieving group item\"";
							res.render('status', context);
						} else {
							context.status = true;
							context.total = docs.length;
							context.length = 1;
							context.start = 0;
							context.data = [];
							for(i = 0; i < docs[0].items.length; i++){
								if(docs[0].items[i][req.params.key] == req.params.value){
									context.data.push(JSON.stringify(docs[0].items[i]));
								}
							}
							if(context.data.length != context.length){
								context.length = context.data.length;
							}
							res.render('get', context);
						}
					});
				}
			});
		}
	});

});

api.get('/groups/:group/items/:name', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var search = {"group":req.params.group};
					db.collection("groups").find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error retrieving group item\"";
							res.render('status', context);
						} else {
							context.status = true;
							context.total = docs.length;
							context.length = 1;
							context.start = 0;
							context.data = [];
							context.data.push(docs[0].items[{"name":req.params.name}]);
							res.render('get', context);
						}
					});
				}
			});
		}
	});

});

api.get('/groups/:group/items', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var search = {"group":req.params.group};
					db.collection("groups").find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error retrieving group item\"";
							res.render('status', context);
						} else {
							context.status = true;
							context.total = docs.length;
							context.length = docs[0].items.length;
							context.start = 0;
							context.data = [];
							for(i = 0; i < docs[0].items.length; i++){
								context.data.push(JSON.stringify(docs[0].items[i]));
							}
							if (context.length > context.data.length){
								context.length = context.data.length;
							}
							res.render('get', context);
						}
					});
				}
			});
		}
	});

});


api.get('/:db/:entity', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var search;
					if(req.params.db == "users"){
						search = {"user": req.params.entity};
					} else if (req.params.db == "groups"){
						search = {"group": req.params.entity};
					} else {
						context.status = false;
						context.msg = "\"api: Nonexistant database";
						res.render('status', context);
					}
					db.collection(req.params.db).find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error retrieving entity\"";
							res.render('status', context);
						} else {
							context.status = true;
							context.total = docs.length;
							context.length = docs.length;
							context.start = 0;
							context.data = [];
							for(i = 0; i < docs.length; i++){
								delete docs[i].password;
								context.data.push(JSON.stringify(docs[i]));
							}
							if (context.length > context.data.length){
								context.length = context.data.length;
							}
							res.render('get', context);
						}
					});
				}
			});
		}
	});
});

api.get('/:db', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	var query = req.query;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					db.collection(req.params.db).find().toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error retrieving entity\"";
							res.render('status', context);
						} else {
							context.status = true;
							context.total = docs.length;
							context.data = [];
							var length = (query.length) ? query.length : 10;
							context.length = length;
							var start = (query.start) ? query.start : 0;
							context.start = start;
							for(i = start; i < docs.length && i < parseInt(start) + parseInt(length); i++){
								delete docs[i].password;
								context.data.push(JSON.stringify(docs[i]));
							}
							if (context.length > context.data.length){
								context.length = context.data.length;
							}
							res.render('get', context);
						}
					});
				}
			});
		}
	});
});

api.post('/:db/:entity', authenticate, function(req, res){
	
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var newEntity = {};
					if(req.params.db == "users"){
						newEntity.user = req.params.entity;
						db.collection(req.params.db).find({"user":newEntity.user}).toArray(function(err, docs){
							if(docs.length){
								context.status = false;
								context.msg = "\"api: User already exists\"";
								res.render('status', context);
							} else {
								if(req.body.password){
									newEntity.password = req.body.password;
								} else {
									context.status = false;
									context.msg = "\"api: New user needs password\"";
									res.render('status', context);
									return;
								}
								newEntity.groups = [];
								if(req.body.email){
									newEntity.email = req.body.email;
								} else {
									newEntity.email = "";
								}
								newEntity.friends = [];
								newEntity.lastActivity = Date();
								newEntity.dateCreated = newEntity.lastActivity;
								if(!validUserStruct(newEntity)){
									context.status = false;
									context.msg = "\"api: Invalid user information posted\"";
									res.render('status', context);
									return;
								}
								db.collection(req.params.db).insertOne(newEntity, function(err, result){
									if(err){
										context.status = false;
										context.msg = "\"api: Error creating entity\"";
										res.render('status', context);
									} else {
										delete newEntity.password;
										if(result.insertedCount == 1){
											context.status = true;
											context.entity = JSON.stringify(newEntity);
											res.render('post', context);
										} else {
											context.status = false;
											context.entity = JSON.stringify(newEntity);
											res.render('post', context);
										}
									}
								});

							}
						});
					} else if (req.params.db == "groups"){
						newEntity.group = req.params.entity;
						db.collection(req.params.db).find({"group":newEntity.group}).toArray(function(err, docs){
							if(docs.length){
								context.status = false;
								context.msg = "\"api: Group already exists\"";
								res.render('status', context);
							} else {
								if(req.body.items){
									newEntity.items = req.body.items;
								}
								newEntity.lastActivity = Date();
								newEntity.dateCreated = newEntity.lastActivity;
								newEntity.createdBy = req.session.user.user;
								if(!validGroupStruct(newEntity)){
									context.status = false;
									context.msg = "\"api: Invalid group information posted\"";
									res.render('status', context);
									return;
								}
								db.collection(req.params.db).insertOne(newEntity, function(err, result){
									if(err){
										context.status = false;
										context.msg = "\"api: Error creating entity\"";
										res.render('status', context);
									} else {
										if(result.insertedCount == 1){
											context.status = true;
											context.entity = JSON.stringify(newEntity);
											res.render('post', context);
										} else {
											context.status = false;
											context.entity = JSON.stringify(newEntity);
											res.render('post', context);
										}
									}
								});

							}
						});
					} else {
						context.status = false;
						context.msg = "\"api: Nonexistant database";
						res.render('status', context);
					}

				}
			});
		}
	});


});

api.post('/groups/:group/items/:item', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');
	if(!validItemStruct(req.body.item)){
		context.status = false;
		context.msg = "\"api: Invalid item data form\"";
		res.render('status', context);
		return;
	}

	if(!req.session.user.groups[req.params.group]){
		context.status = false;
		context.msg = "\"api: Invalid item data form\"";
		res.render('status', context);
		return;
	}

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					db.collection("groups").find({"group":req.params.group, "items": [{"item":req.params.item}]}).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error interacting with database";
							res.render('status', context);
						} else {
							if(docs.length){
								context.status = false;
								context.msg = "\"api: Item by that name already exists\"";
								res.render('status', context);
							} else {
								var newItem = req.body.item;
								newItem.name = req.params.item;
								newItem.modifiedBy = req.session.user.user;
								newItem.modified = Date();
								db.collection("groups").updateOne({"group":req.params.group}, {
									$addToSet: {"items": newItem}}, function(err, results){
										context.status = true;
										context.msg = "\"api: Item added to group\"";
										res.render('status', context);
								});
							}
						}
					});
				}
			});
		}
	});
					
});

api.put('/:db/:entity', authenticate, function(req, res){
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var updEntity = {};
					if(req.params.db == "users"){
						if(req.session.user.user != req.params.entity){
							context.status = false;
							context.msg = "\"api: Can't update other users\"";
							res.render('status', context);
							return;
						}
							
						updEntity.user = req.params.entity;
						db.collection(req.params.db).find().toArray(function(err, docs){
							var oldUser;
							for(i = 0; i < docs.length; i++){
								if(docs[i].user == updEntity.user){
									oldUser = docs[i];
									break;
								}
							}
							if(req.body.password){
								updEntity.password = req.body.password;
							} else {
								updEntity.password = oldUser.password;
							}
							if(req.body.groups){
								db.collection("groups").find().toArray(function(err, gdocs){
									var remove = [];
									var add = [];
									for(i = 0; i < req.body.groups.length; i++){
										for(j = 0; j < gdocs.length; j++){
											if(validGroupNameObject(req.body.groups[i])){
												if(req.body.groups[i].group == gdocs[j].group){
													add.push(req.body.groups[i]);
												}
												if(req.body.groups[i].remove == gdocs[j].group){
													remove.push(req.body.groups[i]);
												}
											}
										}
									}
									updEntity.groups = oldUser.groups;
									for(i = 0; i < remove.length; i++){
										for(j = 0; j < updEntity.groups.length; j++){
											if(remove[i].remove == updEntity.groups[j].group){
												updEntity.groups.splice(j,1);
												break;
											}
										}
									}
									for(i = 0; i < add.length; i++){
										var exists = 0;
										for(j = 0; j < updEntity.groups.length; j++){
											if(add[i].group == updEntity.groups[j].group){
												exists = 1;
												break;
											}
										}
										if(!exists){
											updEntity.groups.push(add[i]);
										}
									}
									if(req.body.email){
										updEntity.email = req.body.email;
									} else {
										updEntity.email = oldUser.email;
									}
									if(req.body.friends){
										var remove = [];
										var add = [];
										for(i = 0; i < req.body.friends.length; i++){
											for(j = 0; j < docs.length; j++){
												if(validFriendNameObject(req.body.friends[i])){
													if(req.body.friends[i].user == docs[j].user){
														add.push(req.body.friends[i]);
													}
													if(req.body.friends[i].remove == docs[j].user){
														remove.push(req.body.friends[i]);
													}
												}
											}
										}
										updEntity.friends = oldUser.friends;
										for(i = 0; i < remove.length; i++){
											for(j = 0; j < updEntity.friends.length; j++){
												if(remove[i].remove == updEntity.friends[j].user){
													updEntity.friends.splice(j,1);
													break;
												}
											}
										}
										for(i = 0; i < add.length; i++){
											var exists = 0;
											for(j = 0; j < updEntity.friends.length; j++){
												if(add[i].user == updEntity.friends[j].user){
													exists = 1;
													break;
												}
											}
											if(!exists){
												updEntity.friends.push(add[i]);
											}
										}
									} else {
										updEntity.friends = oldUser.friends;
									}
									
									updEntity.lastActivity = Date();
									updEntity.dateCreated = oldUser.dateCreated;
									var search = {"user":req.params.entity};
									if(!validUserStruct(updEntity)){
										context.status = false;
										context.msg = "\"api: Invalid user information posted\"";
										res.render('status', context);
										return;
									}
									db.collection(req.params.db).updateOne(search,updEntity, function(err, result){
										if(err){
											context.status = false;
											context.msg = "\"api: Error updating entity\"";
											res.render('status', context);
										} else {
											delete updEntity.password;
											if(result.modifiedCount == 1){
												context.status = true;
												context.entity = JSON.stringify(updEntity);
												res.render('post', context);
											} else {
												context.status = false;
												context.entity = JSON.stringify(updEntity);
												res.render('post', context);
											}
										}
									});
								});
							} else {
								updEntity.groups = oldUser.groups;
								if(req.body.email){
									updEntity.email = req.body.email;
								} else {
									updEntity.email = oldUser.email;
								}
								if(req.body.friends){
									var remove = [];
									var add = [];
									for(i = 0; i < req.body.friends.length; i++){
										for(j = 0; j < docs.length; j++){
											if(validFriendNameObject(req.body.friends[i])){
												if(req.body.friends[i].user == docs[j].user){
													add.push(req.body.friends[i]);
												}
												if(req.body.friends[i].remove == docs[j].user){
													remove.push(req.body.friends[i]);
												}
											}
										}
									}
									updEntity.friends = oldUser.friends;
									for(i = 0; i < remove.length; i++){
										for(j = 0; j < updEntity.friends.length; j++){
											if(remove[i].remove == updEntity.friends[j].user){
												updEntity.friends.splice(j,1);
												break;
											}
										}
									}
									for(i = 0; i < add.length; i++){
										var exists = 0;
										for(j = 0; j < updEntity.friends.length; j++){
											if(add[i].user == updEntity.friends[j].user){
												exists = 1;
												break;
											}
										}
										if(!exists){
											updEntity.friends.push(add[i]);
										}
									}
								} else {
									updEntity.friends = oldUser.friends;
								}
								
								updEntity.lastActivity = Date();
								updEntity.dateCreated = oldUser.dateCreated;
								var search = {"user":req.params.entity};
								if(!validUserStruct(updEntity)){
									context.status = false;
									context.msg = "\"api: Invalid user information posted\"";
									res.render('status', context);
									return;
								}
								db.collection(req.params.db).updateOne(search,updEntity, function(err, result){
									if(err){
										context.status = false;
										context.msg = "\"api: Error updating entity\"";
										res.render('status', context);
									} else {
										delete updEntity.password;
										if(result.modifiedCount == 1){
											context.status = true;
											context.entity = JSON.stringify(updEntity);
											res.render('post', context);
										} else {
											context.status = false;
											context.entity = JSON.stringify(updEntity);
											res.render('post', context);
										}
									}
								});

							}
						});
					} else if (req.params.db == "groups"){
						if(!req.session.user.groups[req.params.entity]){
							context.status = false;
							context.msg = "\"api: Not a member of group\"";
							res.render('status', context);
							return;
						}
						updEntity.group = req.params.entity;
						db.collection(req.params.db).find({"group":updEntity.group}).toArray(function(err, docs){
							if(docs.length != 1){
								context.status = false;
								context.msg = "\"api: Group doesn't exist\"";
								res.render('status', context);
							} else {
								if(req.body.items){
									for(i = 0; i < req.body.items.length; i++){
										docs[0].items.push(req.body.items[i]);
									}
								}
								updEntity.items = docs[0].items;
								updEntity.lastActivity = Date();
								updEntity.dateCreated = docs[0].dateCreated;
								var search = {"group":req.params.entity};
								if(!validGroupStruct(updEntity)){
									context.status = false;
									context.msg = "\"api: Invalid group information posted\"";
									res.render('status', context);
									return;
								}
								db.collection(req.params.db).updateOne(search,updEntity, function(err, result){
									if(err){
										context.status = false;
										context.msg = "\"api: Error creating entity\"";
										res.render('status', context);
									} else {
										if(result.modifiedCount == 1){
											context.status = true;
											context.entity = JSON.stringify(updEntity);
											res.render('post', context);
										} else {
											context.status = false;
											context.entity = JSON.stringify(updEntity);
											res.render('post', context);
										}
									}
								});

							}
						});
					} else {
						context.status = false;
						context.msg = "\"api: Nonexistant database";
						res.render('status', context);
					}

				}
			});
		}
	});
});

api.delete('/:db/:entity', authenticate, function(req, res){
	
	var context = {};
	var user = apivars.userAdmin.user;
	var pass = apivars.userAdmin.pass;
	res.setHeader('Content-type', 'application/json');

	mongodb.connect(url, function(err, db){
		if(err){
			context.status = false;
			context.msg = "\"api: Database Error - Not Connected to database\"";
			res.render('status', context);
		} else {
			db.authenticate(user, pass, function(err, result){
				if(err){
					context.status = false;
					context.msg = "\"api: Error with database\"";
					res.render('status', context);
				} else {
					var search, other;
					if(req.params.db == "users"){
						search = {"user": req.params.entity};
					} else if (req.params.db == "groups"){
						search = {"group": req.params.entity};
					} else {
						context.status = false;
						context.msg = "\"api: Nonexistant database";
						res.render('status', context);
					}

					db.collection(req.params.db).find(search).toArray(function(err, docs){
						if(err){
							context.status = false;
							context.msg = "\"api: Error deleting entity\"";
							res.render('status', context);
						} else {
							if(docs.length && (req.session.user.user == docs[0].createdBy || req.session.user.user == docs[0].user)){
							
								db.collection(req.params.db).deleteOne(docs[0]);
								req.session.destroy();
								var stat = false;
								db.collection(req.params.db).find(docs[0]).toArray(function(err, deldocs){
									if(err || deldocs.length){
										stat = false;
									} else {
										stat = true;
									}
									if(req.params.db == "users"){
										db.collection("users").find().toArray(function(err,udocs){
											for(i = 0; i < udocs.length; i++){
												for(j = 0; j < udocs[i].friends.length; j++){
													if(udocs[i].friends[j].user == req.params.entity){
														udocs[i].friends.splice(j,1);
														db.collection("users").updateOne({"user":udocs[i].user}, udocs[i]);
														break;
													}
												}
											}
											context.status = stat;
											delete docs[0].password;
											context.entity = [JSON.stringify(docs[0])];
											res.render('delete', context);
										});
									} else {
										context.status = stat;
										delete docs[0].password;
										context.entity = [JSON.stringify(docs[0])];
										res.render('delete', context);
									}
								});
								db.collection("users").find({"groups": [{"group":req.params.entity}]}).toArray(function(err, docs){
									for(i = 0; i < docs; i++){
										delete docs[i].groups[{"group":req.params.entity}];
										db.collection("users").updateOne({"user":docs[i].user}, docs[i]);
									}
								});
							} else {
								context.status = false;
								context.msg = "\"api: Entity not found or not authorized to delete\"";
								res.render('status', context);
							}
								
						}
					});
				}
			});
		}
	});

});

function validUserStruct(user){
	if(!user.user)return false;
	else if(typeof(user.user) != "string")return false;
	if(!user.password)return false;
	else if(typeof(user.password) != "string") return false;
	return true;
}

function validGroupStruct(group){
	if(!group.group)return false;
	if(!group.items)return false;
	for(i = 0; i < group.items.length; i++){
		if(!validItemStruct(group.items[i])) return false;
	}
	return true;
}

function validFriendNameObject(friendName){
	if(!friendName.user && !friendName.remove) return false;
	else if (typeof(friendName.user) != "string" && typeof(friendName.remove) != "string") return false;
	return true;
}

function validGroupNameObject(groupName){
	if(!groupName.group && !groupName.remove) return false;
	else if(typeof(groupName.group) != "string" && typeof(groupName.remove) != "string") return false;
	return true;
}

function validItemStruct(item){
	if(!item.favorite) return false;
	else if(typeof(item.favorite) != "boolean") return false;
	if(!item.name)return false;
	else if(typeof(item.name) != "string") return false;
	if(!item.type)return false;
	else if( (item.type != "image") && 
		 (item.type != "video") && 
		 (item.type != "gif")   && 
		 (item.type != "link")  && 
		 (item.type != "other")) return false;
	if(!item.uri)return false;
	else if (typeof(item.uri) != "string") return false;
	if(!item.color)return false;
	else if( (item.color != "red")    &&
	  	 (item.color != "blue")   &&
		 (item.color != "yellow") &&
		 (item.color != "orange") &&
		 (item.color != "purple") &&
		 (item.color != "green")) return false;
	//else
	return true;
}
api.use('/', function(req, res){
	res.status(404);
	res.send("404");
});

api.listen(api.get('port'), function(){
	console.log("api.js up and running on port: " + api.get('port'));
});

