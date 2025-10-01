const fs = require("fs");

class AkashicThreeJson {
	/** @type string */
	path;
	/** @type object */
	json;

	/**
	 *
	 * @param {string} path
	 * @returns {AkashicThreeJson | null}
	 */
	static load(path) {
		if (!fs.existsSync(path)) {
			return null;
		}
		return new AkashicThreeJson(path);
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
		if (!json.added) {
			json.added = [];
		}
		if (!json.modules) {
			json.modules = {};
		}
		this.json = json;
	}

	save() {
		fs.writeFileSync(
			this.path,
			JSON.stringify(this.json, null, "\t")
		);
	}

	/**
	 *
	 * @param {string} name
	 */
	addToAdded(name) {
		this.json.added.push(name);
	}

	/**
	 *
	 * @param {string} name
	 */
	removeFromAdded(name) {
		const index = this.json.added.indexOf(name);
		if (index < 0) {
			return;
		}
		this.json.added.splice(index, 1);
	}

	clearAdded() {
		this.json.added.splice(0);
	}

	/**
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	isAdded(name) {
		return this.json.added.indexOf(name) >= 0;
	}

	/**
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	hasAddon(name) {
		return this.json.modules.hasOwnProperty(name);
	}

	/**
	 *
	 * @param {string} name
	 * @returns {string | null}
	 */
	findAddon(name) {
		name = name.toUpperCase();
		for (const key in this.json.modules) {
			if (key.toUpperCase().indexOf(name) < 0) {
				continue;
			}
			return key;
		}
		return null;
	}

	/**
	 *
	 * @returns {string[]}
	 */
	getAddedAddonPaths() {
		const paths = [];
		this._getAddonPaths(this.json.added, paths);
		return paths;
	}

	/**
	 *
	 * @param {string[]} names
	 * @returns {string[]}
	 */
	getAddonPaths(names) {
		const paths = [];
		this._getAddonPaths(names, paths);
		return paths;
	}

	_getAddonPaths(names, paths) {
		for (const name of names) {
			if (!this.json.modules.hasOwnProperty(name)) {
				continue;
			}
			const module = this.json.modules[name];
			const keys = [];
			for (const key in module) {
				if (!paths.includes(module[key])) {
					paths.push(module[key]);
				}
				if (key !== ".") {
					keys.push(key);
				}
			}
			if (keys.length > 0) {
				this._getAddonPaths(keys, paths);
			}
		}
	}
}

module.exports = AkashicThreeJson;
