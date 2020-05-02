# Laurette van Zanten Thesis Back-end

This directory contains the back-end code for Laurette van Zanten's thesis experiment. The experiment is based on a game which communicates the results to a back-end server. The back-end server is a Node.Js/Express stack with a MySQL/SQLite or Postgres database. 

## Dependencies & Configuration

The following steps need to be taken in order to run the back-end server:

* To run the back end make sure node-js, npm, mysql and/or postgres are installed. 

* Perform an NPM install in the root directory of the project.

* To create a database run the `createmysqldb.sql` script (in case of MySQL installation). This script will drop any existing 'laurette_db' databases.

* You might need give additional credentials to your local mysql user by invoking from the mysql server commandline: `ALTER USER 'your-user-name' IDENTIFIED WITH mysql_native_password BY 'your-password';`

* Define the following environment variables (set VARNAME=xxx on the windows command line):
  * process.env.PORT: if not defined the default port 3000 will be used
  * process.env.DATABASE_URL: set the connection string for the database
  * process.env.GAME_ADMIN: admin name for back-end game admin functions
  * process.env.GAME_ADMIN_PASSWORD: admin password for back-end game admin functions
  
## Running the server

Both the Postgres and MySQL server are stand-alone implementations, the SQLite server has the code support but is not set up as a similar stand-alone implementation. To run the server and assuming all dependencies are in place (npm, node, mysql or postgres) type on the commandline:

```node postgres-server.js``` 

or 

```node mysql-server.js```

In the case of the latter, if succesfull the following will be output on std out (passwords, machine names.

```
{"message":"@MACHINE-NAME Connecting to db via mysql://mysql-user:mysql-password@localhost:3306/laurette_db","level":"info"}
{"message":"connecting to : \"mysql://mysql-user:mysql-password@localhost:3306/laurette_db\".","level":"info"}
{"message":"configuring CORS","level":"info"}
{"message":"Server running on port 3000","level":"info"}
{"message":"connection to database established at: Sat May 02 2020 14:39:32 GMT+0200 (Central European Summer Time)","level":"info"}
```
