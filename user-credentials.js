module.exports = class UserCredentials {
	constructor(id, origin, token, date) {
		this.id = id;
		this.origin = origin;
		this.token = token;
		this.date = date;
	}
}