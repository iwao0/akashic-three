const path = require("path");

const Config = {
	threeDir: "node_modules/three/",
	typesDir: "node_modules/@types/three/",
	logFilePath: path.join(
		path.dirname(__filename),
		"../akashic-three.log"
	),
	akashicThreeJsonPath: "./akashic-three.json",
	akashicThreeJsonBackupPath: path.join(
		path.dirname(__filename),
		"../akashic-three.json"
	),
	gameJsonPath: "./game.json"
};
Object.freeze(Config);

module.exports = Config;
