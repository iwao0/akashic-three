const fs = require("fs");

class GameJson {
	/** @type string */
	path;
	/** @type object */
	json;

	/**
	 *
	 * @param {string} path
	 * @returns {GameJson | null}
	 */
	static load(path) {
		if (!fs.existsSync(path)) {
			return null;
		}
		return new GameJson(path);
	}

	/**
	 *
	 * @param {string} path
	 */
	constructor(path) {
		this.path = path;
		const json = JSON.parse(
			fs.readFileSync(path, "utf8")
		);
		if (!json.globalScripts) {
			json.globalScripts = [];
		}
		if (!json.moduleMainScripts) {
			json.moduleMainScripts = {};
		}
		this.json = json;
	}

	save() {
		fs.writeFileSync(
			this.path,
			JSON.stringify(this.json, null, "\t")
		);
	}

	removeAllThreePathsFromGlobalScripts() {
		const globalScripts = [];
		for (const script of this.json.globalScripts) {
			if (script.indexOf("node_modules/three") >= 0) {
				continue;
			}
			globalScripts.push(script);
		}
		this.json.globalScripts = globalScripts;
	}

	removeThreeAddonPathsFromGlobalScripts() {
		const globalScripts = [];
		for (const script of this.json.globalScripts) {
			if (script.indexOf("node_modules/three/build/") >= 0) {
				globalScripts.push(script);
				continue;
			}
			if (script.indexOf("node_modules/three") >= 0) {
				continue;
			}
			globalScripts.push(script);
		}
		this.json.globalScripts = globalScripts;
	}

	/**
	 *
	 * @param {string} path
	 */
	addGlobalScript(path) {
		if (path == null || path === "") {
			return;
		}
		this.json.globalScripts.push(path);
	}

	/**
	 *
	 * @param {string[]} paths
	 * @returns
	 */
	addGlobalScripts(paths) {
		if (paths == null || paths.length <= 0) {
			return;
		}
		this.json.globalScripts.push(...paths);
	}

	/**
	 *
	 * @param {string} name
	 * @param {string} path
	 */
	setModuleMainScript(name, path) {
		if (name == null || name === "") {
			return;
		}
		if (path == null || path === "") {
			return;
		}
		this.json.moduleMainScripts[name] = path;
	}
};

module.exports = GameJson;
