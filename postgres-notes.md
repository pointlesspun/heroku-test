user: postgres
pwd: admin
createdb -U postgres sessions // create db for user postgres called sessions
psql -U postgres sessions // login to sessions 

start server, can be run from anywhere as the postgres bin is in the path
pg_ctl -D "C:\Program Files\PostgreSQL\12\data" start // start server 
pg_ctl -D "C:\Program Files\PostgreSQL\12\data" stop // stop server
pg_ctl -D "C:\Program Files\PostgreSQL\12\data" restart // restart server

Add "postgres install folder"/ bin to path

Install heroku, follow the getting started guide
https://devcenter.heroku.com/articles/getting-started-with-nodejs#provision-a-database

Heroku works off a github repository for deployment.
To push "git push heroku master"
To start 
To follow log "heroku logs --tail"
