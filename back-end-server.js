
var UserCredentials = require("./user-credentials.js");
var WebOperation = require("./web-operation.js");
var LoginResponse = require("./login-response.js");

var util = require("./util.js");

// string length of a token
const maxTokenLength = 8;

// web operation names
const loginOperation = "login";
const getUserOrdersOperation = "get-user-orders";

// token can only live for 5 minutes
const maxTokenAge = 60 * 5;

var _userCredentials = {};
var _loggedInUsers = {};

// how often do we flush the read/write quuees 
var _flushTimeout = 1000;

// queue containing write ops
var _writeQueue = [];

// queue containing read ops
var _readQueue = [];

// currently active queue (either _readQueue or _writeQueue)
var _activeQueue;

var _logger;
var _sessionDb;

var _admin;

/**
 * Configure the back-end server. The config is required to contain a 'database' and optionally a 'logger'
 * and 'timeout' setting. Although this approach provides the start of decoupling the database implementation from
 * its use in this class, the current implementation still very much assumes its using SQLite3.  
 */
exports.config = function (config) {
	if (config) {	
		_logger = config.logger || {
			info : (str) => {},
			error : (str) => {}
		};
		_sessionDb = config.database;
		_flushTimeout = config.timeout || 1000;
		_admin = (config.admin && config.admin.name && config.admin.password) || { name : "admin", password : "__default" };
	}
}

/**
 * Start the back end server
 */
exports.start = function() {
	_activeQueue = _readQueue;
	setTimeout(updateQueues, 2000);
}

/**
 * Replies with a default webpage to render on a get.
 * @param response 
 */
exports.renderDefaultWebPage = function (response)  {
	response.send('Laurette - Server, thesis pre-alpha, 6/5/2020'
				+ '<br> ' + Object.keys(_userCredentials).length + ' users logged in.');
}

/** 
 * Logs the user in based off a user and password (plain text -- we're _really_ not expecting the game to
 * be hacked) 
 * @param request httpRequest made by the client, must contain a body.user and body.password
 * @param reponse httpResponse object used to respond to the client.
 */
exports.login = function (request, response) {	
	_readQueue.push( new WebOperation(loginOperation,  request,  response ));
}

/** 
 * Logs the user out, removing its credits directly. Sends an empty response.
 * @param request httpRequest made by the client, must contain a body.token 
 * @param reponse httpResponse object used to respond to the client.
 */
exports.logout = function (request, response) {

	var origin = util.getOrigin(request);
	var credentials = _userCredentials[request.body.token];

	if (credentials && credentials.origin === origin) {
		delete _userCredentials[credentials.token];
		delete _loggedInUsers[credentials.userName];
	} 

	response.end();
}

/*
 * Handle a order post. The request body should have a token provided by the login calls a timestamp
 * (to ack), a session id and items.
 */
exports.postOrder = function (request, response) {

	var origin = util.getOrigin(request);
	
	var credentials  = _userCredentials[request.body.token];
	
	if (request && request.body && credentials && credentials.origin === origin) {
		// get the age of the token and see if it is still valid
		var now = new Date();
		var credentialsAge = (now.getTime() - credentials.date.getTime()) / 1000;
		
		if (credentialsAge < maxTokenAge) {
			
			// update the token's life
			_userCredentials[request.body.token].date = now;

			var valuesErrors = validateOrderProperties(request.body.scene, request.body.timeStamp, request.body.items);

			if (!valuesErrors) {
				if (request.body.items && request.body.items.length > 0) {
					_writeQueue.push(new WebOperation("insert-order", request, response));
				} else {
					// empty array - don't bother inserting empty sets
					sendAck(response, request.body.ackId);
				}
			} else {
				sendErr(request, response, "post order with invalid values " + valuesErrors, 400);
			}

		} else {
			sendErr(request, response, "post order with outdated token, credentials=" + JSON.stringify(credentials), 400);
			delete _userCredentials[request.body.token];
		}
	} else {
		sendErr(request, response, "invalid request or token provided (token="+ request.body.token +").", 400);
	}
}

/**
 * Send by the user to keep the token alive as well as to check the server status
 */
exports.heartbeat = function(request, response) {
	const origin = util.getOrigin(request); 

	var credentials = _userCredentials[request.body.token];

	if (credentials && credentials.origin === origin) {
		// update the token's life
		_userCredentials[request.body.token].date = new Date();

		sendAck(response);
	} else {
		sendErr(request, response, `no user with token ${request.body.token}/${origin} logged in.`, 400);
	}
}

/** 
 * Requests the data from a specific user 
 */
exports.getUserOrders = function(request, response) {
	var adminName = request.body.adminName;
	var password = request.body.password;

	if (adminName === _admin.name && password === _admin.password) {
		_readQueue.push( new WebOperation(getUserOrdersOperation,  request,  response ));
	} else {
		sendErr(request, response, "credentials incorrect", 400);
	}
}

// --- PRIVATE FUNCTIONS ----------------------------------------------------------------------------------------------

/** 
 * The back-end server has two queues, a read queue and a write queue. The read queue contains all read operations 
 * (ie. only select at this point), the write queue contains all the write operations (ie insert). The seperation of 
 * read and write queues were originally used to get around specific db locks and optimize operations. 
 */
function updateQueues() {

	if (_activeQueue === _readQueue) {
		var temp = _readQueue;
		_readQueue = [];
		flushReadQueue(temp, () => {
			_activeQueue = _writeQueue;
			setTimeout(updateQueues, _flushTimeout );
		});
	} else {
		var temp = _writeQueue;
		_writeQueue = [];
		flushWriteQueue(temp, () => {
			_activeQueue = _readQueue;
			setTimeout(updateQueues, _flushTimeout );
		});
	}
}

/**
 * Start all the (async) read operations.
 * @param queue an array of http operations 
 * @param onCompleteCallback a callback when all operations are complete with the signature void op()
 */
function flushReadQueue(queue, onCompleteCallback) {

	if (queue.length > 0) {
		var outstandingOperations = queue.length;

		for (var i = 0; i < queue.length; i++) {
			const request = queue[i].request;
			const response = queue[i].response;
			const operationName = queue[i].name; 

			var operationCallback = (errCode, message) => {
				if (errCode === 0) {
					response.send(message);
				} else {
					sendErr(request, response, message, errCode);
				}
				outstandingOperations--;

				if (outstandingOperations <= 0) {
					onCompleteCallback();
				}
			};

			if (operationName === loginOperation) {
				loginUser(request.body.user, request.body.password, util.getOrigin(request), operationCallback);
			} else if (operationName === getUserOrdersOperation) {
				retrieveUserOrders(request.body.userId, operationCallback);
			}
		}
	} else {
		onCompleteCallback();
	}
}

/**
 * start all the write operations. 
 * @param queue an array of http operations 
 * @param onCompleteCallback a callback when all operations are complete with the signature void op()
 */
function flushWriteQueue(queue, onCompleteCallback) {
	if (queue.length === 0) {
		onCompleteCallback();
	}
	else {
		var valuesCollection = [];
		
		// combine all insert operations so we can do with only one insert call
		for (var i = 0; i < queue.length; i++) {
			var msgBody =  queue[i].request.body;
			var itemList = JSON.stringify(msgBody.items);
			var credentials = _userCredentials[msgBody.token];

			valuesCollection.push("(" + credentials.id + "," + msgBody.scene + "," + msgBody.timeStamp + ",'" + itemList + "')");			 
		}

		_sessionDb.insertValues(valuesCollection.join(), (err, msg) => {
			for (var i = 0; i < queue.length; i++) {
				var msg = queue[i];

				var res = msg.response;
				var req = msg.request;
				
				if (err) {
					sendErr(req, res, '{"message": "' + err + '"}');
				} else {
					sendAck(res);
				}
			}
			
			onCompleteCallback();
		});
	}
}

/**
 * Send standardize error message via the response
 * @param {*} request 
 * @param {*} response 
 * @param {*} message 
 */
function sendErr(request, response, message, statusCode) {
	_logger.error(util.getOrigin(request) + ", error " + message);
			
	response.statusMessage = message;
	response.status(statusCode || 400).end();
}

/**
 * Send standardize ack message via the response
 * @param {*} response 
 */
function sendAck(response) {
	response.send( '{"message": "ack"}' );
}

/** Check if the properties of the order are valid. If valid returns an empty string and a non-empty string otherwise */
function validateOrderProperties( scene, timeStamp, itemList) {

	return util.testIsInteger(scene, "sceneId") 
			+ util.testIsNumber(timeStamp, "timeStamp") 
			+ util.testIsNullOrArray(itemList, "itemList");
}

/*
 * Login to the back-end using the given user name and password
 */
function loginUser(name, password, origin, callback) {

	_sessionDb.login(name, password, (err, userId) => {
		if (err) {
			callback( 500, `db error (err=${err}).`);
		} else if (!userId) {
			callback( 400, `user or password ${name} not found.` );
		}  else {	
			if (_loggedInUsers[name]) {
				// deal with a double log in. We're assuming that if someone has the correct user/pwd
				// we can erase the old credentials. 
				const oldCredentials = _loggedInUsers[name];

				if (_userCredentials[oldCredentials.token]) {
					delete _userCredentials[oldCredentials.token];
				}
				
				delete _loggedInUsers[name];
			}
		
			const token = util.generateToken(maxTokenLength, userId, name, password);
			const credentials = new UserCredentials(name, userId, origin, token, new Date());
			_logger.info(`assigning token ${token} to ${name}`);	
					
			_userCredentials[token] = credentials;
			_loggedInUsers[name] = credentials;
		
			tryRetrieveSceneAndTimeStamp(userId, token, callback);
		}
	});
}

function tryRetrieveSceneAndTimeStamp(userId, userToken, callback) {
	// get the last scene the user was working on
	_sessionDb.getMaxScene(userId, (err, maxScene) => {
		if (err) {
			callback( -1, `error while retrieving max scene (err= ${err} ).` );
		} else { 
			// does the user have a previously started scene ?
			if (maxScene) {
				// try to retrieve the last timestamp 
				tryToRetrieveTimeStamp(userId, userToken, maxScene, callback);
			} else {
				callback( 0, JSON.stringify( new LoginResponse(userToken, -1, -1 )));
			}
		} 
	});
}

function tryToRetrieveTimeStamp(userId, userToken, maxScene, callback) {
	_sessionDb.getMaxTimeStamp(userId, maxScene, (err, maxTimeStamp) => {
		if (err) {
			callback( 500, "error while retrieving max timestamp (err=" +err + ")." );
		} else {
			if (maxTimeStamp) {
				callback( 0, JSON.stringify( new LoginResponse(userToken, maxScene, maxTimeStamp )));
			} else {
				callback( 0, JSON.stringify( new LoginResponse(userToken, maxScene, -1 )));
			}
		}
	});
}

function retrieveUserOrders(userId, callback) {

	_sessionDb.getUserOrders(userId, (err, orders) => {
		if (err) {
			callback( 500, `db error (err=${err}).`);
		}  else {
			callback( 0, JSON.stringify(orders));	
		}
	});
}
