const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const { MESSAGE } = require("triple-beam");
const databaseAdapter = require('./postgres-adapter');
const backendServerLogic = require('./back-end-server');
const os = require('os');

const _hostName = os.hostname();
const _isLocalHost = _hostName.indexOf("local") > -1 || _hostName.indexOf("DESKTOP") > -1;
	
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
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



function getDatabaseString() {
	var connectionString = "";
	
	if(_isLocalHost) {		
		connectionString = 'postgresql://postgres:admin@localhost:5432/sessions';
	} else {
		connectionString = process.env.DATABASE_URL;
	}

	logger.info(`@${_hostName} Connecting to db via ${connectionString}`);

	return connectionString; 
}

// configure the back-end logic
logger.info(`connecting to database`);

backendServerLogic.config({
	database: databaseAdapter.connect(getDatabaseString(), logger),
	logger: logger
})

const whitleListDomain = ['http://localhost:8080', '213.127.49.114'];

logger.info(`configuring CORS`);

const corsSetup = cors({
	origin: function(origin, callback){
		logger.info(`origin check against ${origin}`);


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

app.get('/', (req, res) => backendServerLogic.renderDefaultWebPage(res)); 

app.post('/login', jsonParser, (req, res) => backendServerLogic.login(req, res));

app.post('/logout', jsonParser, (req, res) => backendServerLogic.logout(req, res));

app.post('/post-order', jsonParser, (req, res) => backendServerLogic.postOrder(req, res));

app.post('/heartbeat', jsonParser, (req, res) => backendServerLogic.heartbeat(req, res));

app.post('/get-user-orders', jsonParser, (req, res) => backendServerLogic.getUserOrders(req, res));

// start the server logic
backendServerLogic.start();

// start express
app.set( 'port', ( process.env.PORT || 3000 ));
app.listen(app.get( 'port' ), () => logger.info('Server running on port ' + app.get( 'port' )));

