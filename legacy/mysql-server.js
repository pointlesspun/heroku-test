/**
 * Configures & runs the Mysql based Express server against the application specific back-end server. 
 * Run with node postgres
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const { MESSAGE } = require("triple-beam");
const databaseAdapter = require('./mysql-adapter');
const backendServerLogic = require('./back-end-server');
const os = require('os');
const util = require("./util.js");

const tryInvoke = util.tryInvoke;

const _hostName = os.hostname();
const _isLocalHost = _hostName.indexOf("local") > -1 || _hostName.indexOf("DESKTOP") > -1;
	
// configure the Winston loggger
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
	  new winston.transports.File({ filename: 'laurette-server.log' }),
	  new winston.transports.Console({
		  log(info, callback) {
			  setImmediate(() => this.emit("logged", info));
  
			  console.log(info[MESSAGE]);
		  
			  if (callback) {
				  callback();
			  }
		  }
		})
	]
  });

  /**
   * Returns the database string depending on whether or not we're running off the local host 
   * on in the cloud
   */
function getDatabaseString(isLocalHost) {
	var connectionString = "";
	
	if(isLocalHost) {		
		connectionString = 'mysql://mla256:admin_mla256@localhost:3306/laurette_db';
	} else {
		connectionString = process.env.DATABASE_URL;
	}

	return connectionString; 
}

// configure the back-end logic
var connectionString = getDatabaseString(_isLocalHost);
logger.info(`@${_hostName} Connecting to db via ${connectionString}`);

backendServerLogic.config({
	// note that the database connection is not tracked - if the connection fails somehow, the server
	// will simply crash
	database: databaseAdapter.connect(connectionString, logger),
	logger: logger,
	admin: { name: process.env.GAME_ADMIN, password: process.env.GAME_ADMIN_PASSWORD }
});

// configure cross origin resource sharing
const whitleListDomain = ['http://localhost:8080'];

logger.info(`configuring CORS`);

const corsSetup = cors({
	origin: function(origin, callback){
	  	if(!origin) return callback(null, true);
	  	if(whitleListDomain.indexOf(origin) === -1){
			var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
			return callback(new Error(msg), false);
		  }
	
		return callback(null, true);
	}
  });


// Create Express app
const app = express();

const jsonParser = bodyParser.json({limit: '1mb'});

// setup Cross Domain calls - this is only relevant (at the time of writing) for the local host build
// the Heroku build doesn't need this
if (_isLocalHost) {
	app.use(corsSetup);
}

app.get('/', (req, res) => 
	tryInvoke(logger, "render default page", () => {
		backendServerLogic.renderDefaultWebPage(res);
	})
);	

app.post('/login', jsonParser, (req, res) =>
	tryInvoke(logger, "login", () =>  {
		logger.info(util.getOrigin(req) + " logging in as " + req.body.user + ", " + req.body.password); 	
		backendServerLogic.login(req, res);
	})
);

app.post('/logout', jsonParser, (req, res) =>
	 tryInvoke(logger, "logout", () => {
		logger.info(`${util.getOrigin(req)} logging out with ${req.body.token}`); 
		backendServerLogic.logout(req, res);
	 })
);

app.post('/post-order', jsonParser, (req, res) => 
	tryInvoke(logger, "post order", () => {
		logger.info(`${util.getOrigin(req)}  post order with token = ${req.body.token}`); 
		backendServerLogic.postOrder(req, res);
	})
);

app.post('/heartbeat', jsonParser, (req, res) => 
	tryInvoke(logger, "heartbeat", () => {
		logger.info(`${util.getOrigin(req)} heartbeat = ${req.body.token}.`); 
		backendServerLogic.heartbeat(req, res);
	})
);

app.post('/get-user-orders', jsonParser, (req, res) =>
	tryInvoke(logger, "get user orders", () => {
		logger.info( `${util.getOrigin(req)} get user data with of user ${req.body.userId},`
					 + `credentials = ${req.body.adminName}/${req.body.password}`); 
		backendServerLogic.getUserOrders(req, res);
	})
);

app.post('/refresh_db', jsonParser, (req, res) =>
	tryInvoke(logger, "refresh_db", () => {
		backendServerLogic.refresh_db(req, res);
	})
);


// start the server logic
backendServerLogic.start();

// start express
app.set( 'port', ( process.env.PORT || 3000 ));
app.listen(app.get( 'port' ), () => logger.info('Server running on port ' + app.get( 'port' )));


