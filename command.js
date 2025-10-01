#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const log4js = require("log4js");

const Config = require("./cli/Config");
const ESModuleConverter = require("./cli/ESModuleConverter");
const GameJson = require("./cli/GameJson");
const AddonManager = require("./cli/AddonManager");

log4js.configure({
	appenders: {
		out: {
			type: "stdout"
		},
		file: {
			type: "file",
			filename: Config.logFilePath
		}
	},
	categories: {
		default: {
			appenders: ["file"],
			level: "all"
		}
	}
});

const logger = log4js.getLogger();
logger.level = "all";

class Main {
	/** @type ESModuleConverter */
	converter = null;
	imports = {};

	constructor() {
		this.converter = new ESModuleConverter(logger);
	}

	build() {
		logger.log("[build start]");
		logger.log("[three]");
		this.imports = {
			added: [],
			modules: {}
		}
		if (this._enumerateFiles(Config.threeDir, this._onFile)) {
			return;
		}
		fs.writeFileSync(
			Config.akashicThreeJsonPath,
			JSON.stringify(this.imports, null, "\t")
		);
		fs.copyFileSync(
			Config.akashicThreeJsonPath,
			Config.akashicThreeJsonBackupPath
		);

		logger.log("[@types/three]");
		fs.copyFileSync(
			path.join(path.dirname(__filename), "./webgpu.d.ts"),
			path.join(Config.typesDir, "webgpu.d.ts")
		);

		logger.log("[game.json]");
		this._addGameJsonEntry();

		logger.log("[build end]");
	}

	_enumerateFiles(dirPath, callback) {
		let files;
		try {
			files = fs.readdirSync(dirPath);
		} catch (err) {
			console.error("ディレクトリの読み取りに失敗しました", dirPath, err);
			logger.error("ディレクトリの読み取りに失敗しました", dirPath, err);
			return true;
		}
		for (const file of files) {
			const filePath = path.join(dirPath, file);
			const stats = fs.statSync(filePath);
			if (stats.isDirectory()) {
				if (this._enumerateFiles(filePath, callback)) {
					return true;
				}
			} else {
				if (callback(dirPath, file)) {
					break;
				}
			}
		}
		return false;
	}

	_onFile = (dirPath, filePath) => {
		switch (filePath) {
			case "LICENSE":
			case "README.md":
			case "package.json":
				return false;
		}
		const srcPath = path.join(
			dirPath,
			filePath
		).replaceAll("\\", "/");
		const dstPath = srcPath;

		if (srcPath.indexOf("/build") >= 0 ||
			srcPath.indexOf("/src") >= 0 ||
			srcPath.indexOf("Addons.js") >= 0 ||
			srcPath.indexOf("demuxer_mp4.js") >= 0 ||
			path.parse(srcPath).ext !== ".js") {
			return false;
		}

		logger.log(srcPath);

		const converted = this.converter.convert(srcPath);
		if (converted == null) {
			return true;
		}
		fs.writeFileSync(dstPath, converted.text);

		if (dirPath.indexOf("examples") >= 0) {
			const name = path.parse(filePath).name;
			this.imports.modules[name] = converted.imports;
		}
		return false;
	}

	_addGameJsonEntry() {
		const json = GameJson.load(Config.gameJsonPath);
		if (json == null) {
			return;
		}
		json.removeAllThreePathsFromGlobalScripts();
		const mainFilePath = path.join(
			Config.threeDir,
			"build/three.cjs"
		).replaceAll("\\", "/");
		json.addGlobalScript(mainFilePath);
		json.setModuleMainScript("three", mainFilePath);
		json.save();
	}
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.length == 0) {
	// コマンドライン引数なし
	if (!fs.existsSync(Config.akashicThreeJsonBackupPath)) {
		// node_modules以下にakashic-three.jsonが存在しない
		let addonPaths = null;
		if (fs.existsSync(Config.akashicThreeJsonPath)) {
			addonPaths = AddonManager.getAddonPaths();
		}
		const main = new Main();
		main.build();
		AddonManager.addAddonsToGameJson(addonPaths);
		console.log("正常に終了しました");
	}
	else if (fs.existsSync(Config.akashicThreeJsonPath)) {
		// node_modules以下にakashic-three.jsonが存在する
		// akashic-three.jsonが存在する
		AddonManager.copyAddonsToGameJson();
		console.log("正常に終了しました");
	}
	else {
		// node_modules以下にakashic-three.jsonが存在する
		// akashic-three.jsonが存在しない
		fs.copyFileSync(
			Config.akashicThreeJsonBackupPath,
			Config.akashicThreeJsonPath
		);
		console.log("正常に終了しました");
	}
}
else {
	const name = args[1];
	//　コマンドライン引数あり
	switch (args[0]) {
		case "add":
			if (name == null ||
				name === "" ||
				!fs.existsSync(Config.gameJsonPath)) {
				console.log("game.jsonにThree.jsのアドオンを追加します");
				console.log("使い方: npx @iwao0/akashic-three add [追加するアドオン名]");
				console.log("例: npx @iwao0/akashic-three add OBJLoader");
			}
			else if (!fs.existsSync(Config.akashicThreeJsonPath)) {
				console.error("設定ファイルが見つかりません");
				console.error(Config.akashicThreeJsonPath);
				console.error("最初に引数なしで実行してください");
				console.error("npx @iwao0/akashic-three");
			}
			else {
				if (!AddonManager.addAddonToGameJson(name)) {
					console.log("正常に終了しました");
				}
			}
			break;
		case "remove":
			if (name == null ||
				name === "" ||
				!fs.existsSync(Config.gameJsonPath)) {
				console.log("game.jsonからThree.jsのアドオンを削除します");
				console.log("使い方: npx @iwao0/akashic-three remove [削除するアドオン名]");
				console.log("例: npx @iwao0/akashic-three remove OBJLoader");
			}
			else if (!fs.existsSync(Config.akashicThreeJsonPath)) {
				console.error("設定ファイルが見つかりません");
				console.error(Config.akashicThreeJsonPath);
				console.error("最初に引数なしで実行してください");
				console.error("npx @iwao0/akashic-three");
			}
			else {
				if (!AddonManager.removeAddonFromGameJson(name)) {
					console.log("正常に終了しました");
				}
			}
			break;
		default:
			console.error("使用可能なコマンド");
			console.error("  add: アドオンを追加します");
			console.error("  remove: アドオンを削除します");
			console.error("  remove all: 全てのアドオンを削除します");
			break;
	}
}
