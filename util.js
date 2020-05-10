
const seedrandom = require('seedrandom');


/**
 * Try to extract the source of request  
 * @param {*} request 
 */
exports.getOrigin = function(request) {
	
	// this returned the most reliable information on heroku
	var originSource = request.headers['x-forwarded-for'];

	if (!originSource && request.connection) {
		originSource = request.connection.remoteAddress;
	}

	// in express this would return the ip
	if (!originSource && request.ip) {
		return request.ip;
	}

	return originSource ? originSource : "unknown";
}

exports.testIsNullOrArray = function (array, propertyName) {

	if (array) {
		if (!Array.isArray(array)) {
			return propertyName + " is not a valid array";
		}
	}

	return "";
}

/*
 * Test if the given value is an integer, if not return a string representing containing the error.
 */
exports.testIsInteger = function(value, propertyName) {
	if (value === undefined) {
		return "No " + propertyName + " provided.";
	} else if (typeof(value) !== 'number') {
		return propertyName + " is not a number.";
	} else if (value % 1 !== 0) {
		return propertyName + "  is not an integer.";
	}
	return "";
}

/*
 * Test if the given value is a number, if not return a string representing containing the error.
 */
exports.testIsNumber = function(value, propertyName) {
	if (value === undefined) {
		return "No " + propertyName + " provided.";
	} else if (typeof(value) !== 'number') {
		return propertyName + " is not a number.";
	} 
	return "";
}


/** Generates a unique randomized token off the user id a*/
exports.generateToken = function(length, id, user, password) {
	var seed = id + "-" + user + "-" + password + "-" + new Date().getMilliseconds();
	var rng = seedrandom(seed);
	var token = "" + id;

	for (var i = 0; i < length; i++) {
		token += Math.floor(rng() * 10);	
	}
	return id + "-" + token;
}

/**
 * Utility function to invoke a method can catch the exception for cases where the server should just ignore and continue.
 * @param {*} description 
 * @param {*} func 
 */
exports.tryInvoke = function(logger, description, func) {
	try {
		func();
	} catch ( exception ) {
		logger.error(`${description} caught exception: ${exception}.` );
	}
}
