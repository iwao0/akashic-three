const fs = require("fs");
const Config = require("./Config");
const GameJson = require("./GameJson");
const AkashicThreeJson = require("./AkashicThreeJson");

class AddonManager {
	/**
	 *
	 * @param {string[]} names
	 * @returns {boolean}
	 */
	static addAddonsToGameJson(names) {
		if (names == null || names.length <= 0) {
			return false;
		}
		const threeJson = AkashicThreeJson.load(Config.akashicThreeJsonPath);
		for (const name of names) {
			threeJson.addToAdded(name);
		}
		threeJson.save();
		const addonPaths = AddonManager.getAddonPaths();
		if (addonPaths == null) {
			return true;
		}
		const json = GameJson.load(Config.gameJsonPath);
		json.removeThreeAddonPathsFromGlobalScripts();
		json.addGlobalScripts(addonPaths);
		json.save();
		return false;
	}

	/**
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	static addAddonToGameJson(name) {
		if (AddonManager._addAddonToAkashicThreeJson(name)) {
			return true;
		}
		const addonPaths = AddonManager.getAddonPaths();
		if (addonPaths == null) {
			return true;
		}
		const json = GameJson.load(Config.gameJsonPath);
		json.removeThreeAddonPathsFromGlobalScripts();
		json.addGlobalScripts(addonPaths);
		json.save();
		return false;
	}

	/**
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	static removeAddonFromGameJson(name) {
		if (name === "all") {
			AddonManager.removeAllAddonsFromGameJson();
			return false;
		}
		if (AddonManager._removeAddonFromAkashicThreeJson(name)) {
			return true;
		}
		const addonPaths = AddonManager.getAddonPaths();
		const json = GameJson.load(Config.gameJsonPath);
		json.removeThreeAddonPathsFromGlobalScripts();
		if (addonPaths != null) {
			json.addGlobalScripts(addonPaths);
		}
		json.save();
		return false;
	}

	static removeAllAddonsFromGameJson() {
		const threeJson = AkashicThreeJson.load(Config.akashicThreeJsonPath);
		threeJson.clearAdded();
		threeJson.save();

		const gameJson = GameJson.load(Config.gameJsonPath);
		gameJson.removeThreeAddonPathsFromGlobalScripts();
		gameJson.save();
	}

	/**
	 *
	 * @returns {boolean}
	 */
	static copyAddonsToGameJson() {
		const addonPaths = AddonManager.getAddonPaths();
		if (addonPaths == null) {
			return false;
		}
		const json = GameJson.load(Config.gameJsonPath);
		if (json == null) {
			return true;
		}
		json.removeThreeAddonPathsFromGlobalScripts();
		json.addGlobalScripts(addonPaths);
		json.save();
		return false;
	}

	/**
	 *
	 * @returns
	 */
	static getAddonPaths() {
		const json = AkashicThreeJson.load(Config.akashicThreeJsonPath);
		const addonPaths = json.getAddedAddonPaths();
		if (addonPaths.length <= 0) {
			return null;
		}
		return addonPaths;
	}

	/**
	 *
	 * @param {string} name
	 * @returns {boolean}
	 */
	static _addAddonToAkashicThreeJson(name) {
		const json = AkashicThreeJson.load(Config.akashicThreeJsonPath);
		if (json.isAdded(name)) {
			console.error("すでに追加されているアドオンです", name);
			return true;
		}
		if (!json.hasAddon(name)) {
			console.error("アドオンが見つかりません", name);
			name = name.substring(0, 4);
			name = json.findAddon(name);
			if (name) {
				console.error("もしかして", name);
			}
			return true;
		}
		json.addToAdded(name);
		json.save();
		return false;
	}

	/**
	 *
	 * @param {string} name
	 * @returns
	 */
	static _removeAddonFromAkashicThreeJson(name) {
		const json = AkashicThreeJson.load(Config.akashicThreeJsonPath);
		if (!json.isAdded(name)) {
			console.error("追加されていないアドオンです", name);
			return true;
		}
		json.removeFromAdded(name);
		json.save();
		return false;
	}
}

module.exports = AddonManager;
