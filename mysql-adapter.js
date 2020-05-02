const mysql = require('mysql');

var _database;
var _logger;

exports.connect = function(connectionString, logger) {
	
	_logger = logger || {
		info : (str) => console.log(str),
		error : (str) => console.log(str)
	};
	try {
		// note need to add execute in mysql:
		// mysql> ALTER USER 'your user login' IDENTIFIED WITH mysql_native_password BY 'your password';
		// otherwise you may end up ER_NOT_SUPPORTED_AUTH_MODE
		_logger.info(`connecting to : "${connectionString}".`);
		_database = mysql.createConnection(connectionString);
		_database.connect();
	
		_database.query('select NOW()', (err, res, fields) => {
			if (err) {
				_logger.error(`cannot connect to database. error: ${err}`);
			} else {
				const resultObj= res[0];
				_logger.info(`connection to database established at: ${resultObj["NOW()"]}`);
			}
		});
	}
	catch (exception) {
		_logger.info(`cannot connect to database. caught exception: ${exception}`);
	}

	return exports;
}

/*
 * Login to the back-end using the given user name and password
 */
exports.login = function(userName, password, callback) {

	// login the user
	const sqlStatement = `select userId from users where name = '${userName}' and password = '${password}'`;

	_database.query(sqlStatement, (err, res, fields) => {
		if (err ) {
			callback( -1, "db error (err=" + err+ ")." );
		} else if (!res || res.length === 0) {
			callback( -1, "user or password " + userName + " not found." );
		}  else {	
			callback( 0, res[0].userId);
		}
	});
}

exports.getMaxSession = function(userId, callback) {
    // get the last session the user was working on
    const sqlStatement = `select max(session) from sessions where userId = ${userId}`;

	_database.query(sqlStatement, (err, result, fields) => {
		if (err) {
			callback( -1, "error while retrieving max session (err=" + err + ")." );
		} else { 
			callback(0, result[0]["max(session)"]);
		} 
	});
}


exports.getMaxTimeStamp = function(userId, maxSession, callback) {
    const sqlStatement = `select max(timeStamp) from sessions where userId = ${userId} and session = ${maxSession}`;
    
    _database.query(sqlStatement, (err, result, fields) => {
			if (err) {
				callback( -1, "error while retrieving max timestamp (err=" + err + ")." );
			} else {
				callback( 0, result[0]["max(timeStamp)"]);
			}
		}
	);
}

/*
 * Insert the properties in a slot for the given user id.
 */
exports.insertValues = function(valuesCollection, callback) {	
	const sqlCall = `insert into sessions values ${valuesCollection}`;
    
    _database.query(sqlCall, (err, results, fields) => {
		if (err) {
			callback(-1, "error while inserting values (err="+err +").");
		} else { 
			callback(0, "ok");
		} 
	});
}

exports.getUserOrders = function(userId, callback) {
	const sqlCall = `select * from sessions where userId = ${userId}`;
    
    _database.query(sqlCall, (err, result, fields) => {
		if (err) {
			callback(-1, "error while inserting values (err=" + err +").");
		} else { 
			callback(0, result);
		} 
	});
}