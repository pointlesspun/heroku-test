
module.exports = class LoginResponse {
	constructor(token, sceneId, timeStamp){
		this.token = token;
		this.scene = sceneId;
		this.timeStamp = timeStamp;
	}
}