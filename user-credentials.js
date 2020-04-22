module.exports = class UserCredentials {
	constructor(name, id, origin, token, date) {
		this.userName = name;
		this.id = id;
		this.origin = origin;
		this.token = token;
		this.date = date;
	}
}