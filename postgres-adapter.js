const postgres = require('pg');

var _database;
var _logger;
var _userTableName;
var _gameDataTableName;

exports.connect = function(connectionString, logger, userTableName, dataTableName) {
	
	_userTableName = userTableName ? userTableName : "users";
	_gameDataTableName = dataTableName ? dataTableName : "gameData";

	_logger = logger || {
		info : (str) => console.log(str),
		error : (str) => console.log(str)
	};
	try {
		_logger.info(`connecting to : "${connectionString}".`);
		_database = new postgres.Pool({connectionString:connectionString});
		_database.connect();
	
		_database.query('select NOW()', (err, res) => {
			if (err) {
				_logger.error(`cannot connect to database. error: ${err}`);
			} else {
				_logger.info(`connection to database established at: ${res.rows[0].now}`);
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
	const sqlStatement = `select userId from ${_userTableName} where name = '${userName}' and password = '${password}'`;

	_database.query(sqlStatement, (err, res) => {
		if (err ) {
			callback( -1, "db error (err=" + err+ ")." );
		} else if (!res || res.rows.length === 0) {
			callback();
		}  else {	
			callback( 0, res.rows[0].userid);
		}
	});
}

exports.getMaxScene = function(userId, callback) {
    // get the last scene the user was working on
    const sqlStatement = `select max(scene) from ${_gameDataTableName} where userId = ${userId}`;

	_database.query(sqlStatement, (err, result) => {
		if (err) {
			callback( -1, "error while retrieving max scene (err=" + err + ")." );
		} else { 
			callback(0, result.rows[0].max);
		} 
	});
}


exports.getMaxTimeStamp = function(userId, maxScene, callback) {
    const sqlStatement = `select max(timeStamp) from  ${_gameDataTableName} where userId = ${userId} and scene = ${maxScene}`;
    
    _database.query(sqlStatement, (err, result) => {
			if (err) {
				callback( -1, "error while retrieving max timestamp (err=" + err + ")." );
			} else {
				callback( 0, result.rows[0].max);
			}
		}
	);
}

/*
 * Insert the properties in a slot for the given user id.
 */
exports.insertValues = function(valuesCollection, callback) {	
	const sqlCall = `insert into  ${_gameDataTableName} values ${valuesCollection}`;
    
    _database.query(sqlCall, (err) => {
		if (err) {
			callback(-1, "error while inserting values (err="+err +").");
		} else { 
			callback(0, "ok");
		} 
	});
}

exports.getUserOrders = function(userId, callback) {
	const sqlCall = `select * from  ${_gameDataTableName} where userId = ${userId}`;
    
    _database.query(sqlCall, (err, result) => {
		if (err) {
			callback(-1, "error while inserting values (err=" + err +").");
		} else { 
			callback(0, result.rows);
		} 
	});
}