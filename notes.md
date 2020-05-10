user: postgres
pwd: admin
createdb -U postgres laurette_db // create db for user postgres called sessions
psql -U postgres laurette_db // login to sessions 

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

install new users
log in to the database from terminal 'heroku pg:psql'
'delete from users;'

mysql -u mla256 -p
mla256 admin_mla256
mysql -u mla256 -p < "C:\Code\js\heroku-test\createmysqldb.sql"


args for debugging with postgres
"args": ["./postgres-adapter", "postgresql://postgres:admin@localhost:5432/laurette_db"]

args for debugging with mysql