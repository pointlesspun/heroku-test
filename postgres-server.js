const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const { MESSAGE } = require("triple-beam");
const databaseAdapter = require('./postgres-adapter');
const backendServerLogic = require('./back-end-server');
var os = require('os');

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
	const hostName = os.hostname();
	
	if(hostName.indexOf("local") > -1 || hostName.indexOf("DESKTOP") > -1) {		
		connectionString = 'postgresql://postgres:admin@localhost:5432/sessions';
	} else {
		connectionString = process.env.DATABASE_URL;
	}

	logger.info(`@${hostName} Connecting to db via ${connectionString}`);

	return connectionString; 
}

// configure the back-end logic
backendServerLogic.config({
	database: databaseAdapter.connect(getDatabaseString()),
	logger: logger
})

const whitleListDomain = ['http://localhost:8080', '213.127.49.114'];

const corsSetup = cors({
	origin: function(origin, callback){
	  // allow requests with no origin 
	  // (like mobile apps or curl requests)
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

// setup Cross Domain calls 
app.use(corsSetup);


app.get('/', (req, res) => backendServerLogic.renderDefaultWebPage( res)); 

app.post('/login', jsonParser, (req, res) => backendServerLogic.login(req, res));

app.post('/logout', jsonParser, (req, res) => backendServerLogic.logout(req, res));

app.post('/post-order', jsonParser, (req, res) => backendServerLogic.postOrder(req, res));


// start the server logic
backendServerLogic.start();

// start express
app.listen(3000, () => console.log('Server running on port 3000!'));

