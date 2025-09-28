#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const astravel = require("astravel");
const astring = require("astring");
const log4js = require("log4js");

const threeDir = "node_modules/three/";
const typesDir = "node_modules/@types/three/";
const logFilePath = path.join(
	path.dirname(__filename),
	"./akashic-three.log"
);
const akashicThreeJsonPath = "./akashic-three.json";
const gameJsonPath = "./game.json";

log4js.configure({
	appenders: {
		out: {
			type: "stdout"
		},
		file: {
			type: "file",
			filename: logFilePath
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

class ESModuleConverter {
	importNode = {
		type: "VariableDeclaration",
		kind: "const",
		declarations: [
			{
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: ""
				},
				init: {
					type: "CallExpression",
					callee: {
						type: "Identifier",
						name: "require"
					},
					arguments: [
						{
							type: "Literal",
							value: ""
						}
					],
					optional: false
				}
			}
		]
	};

	importSpecifierNode = {
		type: "VariableDeclaration",
		kind: "const",
		declarations: [
			{
				type: "VariableDeclarator",
				id: {
					type: "Identifier",
					name: ""
				},
				init: {
					type: "MemberExpression",
					object: {
						type: "Identifier",
						name: ""
					},
					property: {
						type: "Identifier",
						name: ""
					},
					computed: false,
					optional: false
				}
			}
		]
	};

	exportNode = {
		type: "ExpressionStatement",
		expression: {
			type: "AssignmentExpression",
			operator: "=",
			left: {
				type: "MemberExpression",
				object: {
					type: "Identifier",
					name: "exports"
				},
				property: {
					type: "Identifier",
					name: ""
				},
				computed: false,
				optional: false
			},
			right: {
				type: "Identifier",
				name: ""
			}
		}
	};

	constructor() {
	}

	convert(filePath) {
		if (!fs.existsSync(filePath)) {
			logger.error("ファイルが見つかりません", filePath);
			return null;
		}
		const imports = {};
		imports["."] = filePath;
		const file = fs.readFileSync(filePath, "utf8");
		const comments = [];
		let esTree;
		try {
			esTree = acorn.parse(file, {
				ecmaVersion: 2022,
				sourceType: "module",
				locations: true,
				allowAwaitOutsideFunction: true,
				onComment: comments
			});
		}
		catch (err) {
			logger.error(err);
			return null;
		}
		try {
			astravel.attachComments(esTree, comments);
		}
		catch (err) {
			logger.error(err);
		}
		//fs.writeFileSync("./test/ast.txt", JSON.stringify(esTree, null, "\t"))

		for (let i = 0; i < esTree.body.length; i++) {
			const node = esTree.body[i];
			if (node.type === "ImportDeclaration") {
				const nodes = this.convertImportDeclaration(
					filePath,
					imports,
					node
				);
				esTree.body.splice(i, 1, ...nodes);
				continue;
			}
			if (node.type === "ExportNamedDeclaration") {
				const nodes = this.convertExportNamedDeclaration(node);
				esTree.body.splice(i, 1, ...nodes);
				continue;
			}
		}
		const text = astring.generate(esTree, {
			comments: true
		});
		return {
			text,
			imports
		};
	}

	convertImportDeclaration(filePath, imports, node) {
		const nodes = [];
		const importNode = structuredClone(this.importNode);
		const sourcePath = path.parse(node.source.value);
		let id = sourcePath.name;
		if (id === "three") {
			id = "THREE"
		}
		else {
			id = id.replaceAll("-", "_");
			id = id.replaceAll(".", "_");
			id = "_" + id;

			const importPath = path.join(
				path.dirname(filePath),
				node.source.value
			).replaceAll("\\", "/");
			imports[path.parse(importPath).name] = importPath;
		}
		importNode.declarations[0].id.name = id;
		importNode.declarations[0].init.arguments[0].value = node.source.value;
		nodes.push(importNode);

		if (node.specifiers.length === 1) {
			const s = node.specifiers[0];
			const specifierNode = structuredClone(this.importSpecifierNode);
			if (s.imported == null) {
       			if (s.local.name.toUpperCase() !== "THREE") {
					specifierNode.declarations[0].id.name = s.local.name;
					specifierNode.declarations[0].init.object.name = id;
					specifierNode.declarations[0].init.property.name = s.local.name;
					nodes.push(specifierNode);
				}
			}
			else {
				specifierNode.declarations[0].id.name = s.imported.name;
				specifierNode.declarations[0].init.object.name = id;
				specifierNode.declarations[0].init.property.name = s.imported.name;
				nodes.push(specifierNode);
			}
		}
		else {
			for (const s of node.specifiers) {
				if (s.type !== "ImportSpecifier") {
					continue;
				}
				const specifierNode = structuredClone(this.importSpecifierNode);
				specifierNode.declarations[0].id.name = s.imported.name;
				specifierNode.declarations[0].init.object.name = id;
				specifierNode.declarations[0].init.property.name = s.imported.name;
				nodes.push(specifierNode);
			}
		}
		return nodes;
	}

	convertExportNamedDeclaration(node) {
		const nodes = [];
		for (const s of node.specifiers) {
			if (s.type !== "ExportSpecifier") {
				continue;
			}
			const exportNode = structuredClone(this.exportNode);
			exportNode.expression.left.property.name = s.exported.name;
			exportNode.expression.right.name = s.exported.name;
			nodes.push(exportNode);
		}
		return nodes;
	}
}

class Builder {
	converter = null;
	targetDir = "";
	imports = {};

	constructor() {
		this.converter = new ESModuleConverter();
	}

	build() {
		logger.log("[build start]");
		logger.log("[three]");
		this.targetDir = threeDir;
		this.imports = {
			added: [],
			modules: {}
		}
		if (this.enumerateFiles(threeDir, this.onFile)) {
			return;
		}
		fs.writeFileSync(
			akashicThreeJsonPath,
			JSON.stringify(this.imports, null, "\t")
		);

		logger.log("[@types/three]");
		fs.copyFileSync(
			path.join(path.dirname(__filename), "./webgpu.d.ts"),
			path.join(typesDir, "webgpu.d.ts")
		);

		logger.log("[game.json]");
		this.addGameJsonEntry();

		logger.log("[build end]");
	}

	enumerateFiles(dirPath, callback) {
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
				if (this.enumerateFiles(filePath, callback)) {
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

	makeDir(dirPath) {
		if (fs.existsSync(dirPath)) {
			return;
		}
		fs.mkdirSync(dirPath, { recursive: true });
	}

	onFile = (dirPath, filePath) => {
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

	addGameJsonEntry() {
		if (!fs.existsSync(gameJsonPath)) {
			return;
		}
		const json = JSON.parse(
			fs.readFileSync(gameJsonPath, "utf8")
		);
		if (!json.globalScripts) {
			json.globalScripts = [];
		}
		if (!json.moduleMainScripts) {
			json.moduleMainScripts = {};
		}
		const globalScripts = [];
		for (const script of json.globalScripts) {
			if (script.indexOf("node_modules/three") >= 0) {
				continue;
			}
			globalScripts.push(script);
		}
		const mainFilePath = path.join(
			threeDir,
			"build/three.cjs"
		).replaceAll("\\", "/");
		globalScripts.push(mainFilePath);
		json.globalScripts = globalScripts;
		json.moduleMainScripts["three"] = mainFilePath;
		fs.writeFileSync(gameJsonPath, JSON.stringify(json, null, "\t"));
	}
}

function findThreeModulePaths(json, moduleNames, resultArray) {
	for (const name of moduleNames) {
		if (!json.modules.hasOwnProperty(name)) {
			continue;
		}
		const module = json.modules[name];
		const keys = [];
		for (const key in module) {
			if (!resultArray.includes(module[key])) {
				resultArray.push(module[key]);
			}
			if (key !== ".") {
				keys.push(key);
			}
		}
		if (keys.length > 0) {
			findThreeModulePaths(json, keys, resultArray);
		}
	}
}

function findAndAddThreeModules(name) {
	const json = JSON.parse(
		fs.readFileSync(akashicThreeJsonPath, "utf8")
	);
	if (!json.added) {
		json.added = [];
	}
	if (!json.modules) {
		json.modules = {};
	}

	for (const key of json.added) {
		if (key !== name) {
			continue;
		}
		console.error("すでに追加されているアドオンです", name);
		return null;
	}

	let found = false;
	for (const key in json.modules) {
		if (key === name) {
			found = true;
			break;
		}
	}
	if (!found) {
		console.error("アドオンが見つかりません", name);
		name = name.substring(0, 4).toUpperCase();
		for (const key in json.modules) {
			if (key.toUpperCase().indexOf(name) >= 0) {
				console.error("もしかして", key);
				break;
			}
		}
		return null;
	}

	json.added.push(name);

	const modulePaths = [];
	findThreeModulePaths(json, json.added, modulePaths);
	if (modulePaths.length <= 0) {
		console.error("エラー", name);
		return null;
	}

	fs.writeFileSync(
		akashicThreeJsonPath,
		JSON.stringify(json, null, "\t")
	);
	return modulePaths;
}

function findThreeModules() {
	const json = JSON.parse(
		fs.readFileSync(akashicThreeJsonPath, "utf8")
	);
	if (!json.added) {
		json.added = [];
	}
	if (!json.modules) {
		json.modules = {};
	}

	const modulePaths = [];
	findThreeModulePaths(json, json.added, modulePaths);
	return modulePaths;
}

function copyModulesToGameJson() {
	const modules = findThreeModules();
	const json = JSON.parse(
		fs.readFileSync(gameJsonPath, "utf8")
	);
	if (!json.globalScripts) {
		json.globalScripts = [];
	}
	const globalScripts = [];
	for (const script of json.globalScripts) {
		if (script.indexOf("node_modules/three/build/") >= 0) {
			globalScripts.push(script);
			continue;
		}
		if (script.indexOf("node_modules/three") >= 0) {
			continue;
		}
		globalScripts.push(script);
	}
	globalScripts.push(...modules);
	json.globalScripts = globalScripts;
	fs.writeFileSync(
		gameJsonPath,
		JSON.stringify(json, null, "\t")
	);
	console.log("正常に終了しました");
}

function addModuleToGameJson(name) {
	if (name == null ||
		name === "" ||
		!fs.existsSync(gameJsonPath)) {
		console.log("game.jsonにThree.jsのアドオンを追加します");
		console.log("使い方: npx @iwao0/akashic-three add [追加するアドオン名]");
		console.log("例: npx @iwao0/akashic-three add OBJLoader");
		return;
	}
	if (!fs.existsSync(akashicThreeJsonPath)) {
		console.error("設定ファイルが見つかりません");
		console.error(akashicThreeJsonPath);
		console.error("最初に引数なしで実行してください");
		console.error("npx @iwao0/akashic-three");
		return;
	}
	const modules = findAndAddThreeModules(name);
	if (modules == null) {
		return;
	}

	const json = JSON.parse(
		fs.readFileSync(gameJsonPath, "utf8")
	);
	if (!json.globalScripts) {
		json.globalScripts = [];
	}
	const globalScripts = [];
	for (const script of json.globalScripts) {
		if (script.indexOf("node_modules/three/build/") >= 0) {
			globalScripts.push(script);
			continue;
		}
		if (script.indexOf("node_modules/three") >= 0) {
			continue;
		}
		globalScripts.push(script);
	}
	globalScripts.push(...modules);
	json.globalScripts = globalScripts;
	fs.writeFileSync(
		gameJsonPath,
		JSON.stringify(json, null, "\t")
	);
	console.log("正常に終了しました");
}

function removeAllThreeModules() {
	{
		const json = JSON.parse(
			fs.readFileSync(akashicThreeJsonPath, "utf8")
		);
		if (!json.added) {
			json.added = [];
		}
		if (!json.modules) {
			json.modules = {};
		}
		json.added.splice(0);
		fs.writeFileSync(
			akashicThreeJsonPath,
			JSON.stringify(json, null, "\t")
		);
	}

	{
		const json = JSON.parse(
			fs.readFileSync(gameJsonPath, "utf8")
		);
		if (!json.globalScripts) {
			json.globalScripts = [];
		}
		const globalScripts = [];
		for (const script of json.globalScripts) {
			if (script.indexOf("node_modules/three/build/") >= 0) {
				globalScripts.push(script);
				continue;
			}
			if (script.indexOf("node_modules/three") >= 0) {
				continue;
			}
			globalScripts.push(script);
		}
		json.globalScripts = globalScripts;
		fs.writeFileSync(
			gameJsonPath,
			JSON.stringify(json, null, "\t")
		);
	}
	console.log("正常に終了しました");
}

function findAndRemoveThreeModules(name) {
	const json = JSON.parse(
		fs.readFileSync(akashicThreeJsonPath, "utf8")
	);
	if (!json.added) {
		json.added = [];
	}
	if (!json.modules) {
		json.modules = {};
	}

	const index = json.added.indexOf(name);
	if (index < 0) {
		console.error("まだ追加されていないアドオンです", name);
		return null;
	}
	json.added.splice(index, 1);

	const modulePaths = [];
	findThreeModulePaths(json, json.added, modulePaths);

	fs.writeFileSync(
		akashicThreeJsonPath,
		JSON.stringify(json, null, "\t")
	);
	return modulePaths;
}

function removeModuleFromGameJson(name) {
	if (name == null ||
		name === "" ||
		!fs.existsSync(gameJsonPath)) {
		console.log("game.jsonからThree.jsのアドオンを削除します");
		console.log("使い方: npx @iwao0/akashic-three remove [削除するアドオン名]");
		console.log("例: npx @iwao0/akashic-three remove OBJLoader");
		return;
	}
	if (!fs.existsSync(akashicThreeJsonPath)) {
		console.error("設定ファイルが見つかりません");
		console.error(akashicThreeJsonPath);
		console.error("最初に引数なしで実行してください");
		console.error("npx @iwao0/akashic-three");
		return;
	}

	if (name === "all") {
		removeAllThreeModules();
		return;
	}

	const modules = findAndRemoveThreeModules(name);
	if (modules == null) {
		return;
	}

	const json = JSON.parse(
		fs.readFileSync(gameJsonPath, "utf8")
	);
	if (!json.globalScripts) {
		json.globalScripts = [];
	}
	const globalScripts = [];
	for (const script of json.globalScripts) {
		if (script.indexOf("node_modules/three/build/") >= 0) {
			globalScripts.push(script);
			continue;
		}
		if (script.indexOf("node_modules/three") >= 0) {
			continue;
		}
		globalScripts.push(script);
	}
	globalScripts.push(...modules);
	json.globalScripts = globalScripts;
	fs.writeFileSync(
		gameJsonPath,
		JSON.stringify(json, null, "\t")
	);
	console.log("正常に終了しました");
}

const args = process.argv.slice(2);

if (args.length == 0) {
	if (fs.existsSync(akashicThreeJsonPath)) {
		copyModulesToGameJson();
	}
	else {
		const builder = new Builder();
		builder.build();
		console.log("正常に終了しました");
	}
}
else {
	switch (args[0]) {
		case "add":
			addModuleToGameJson(args[1]);
			break;
		case "remove":
			removeModuleFromGameJson(args[1]);
			break;
		default:
			console.error("使用可能なコマンド");
			console.error("  add: アドオンを追加します");
			console.error("  remove: アドオンを削除します");
			console.error("  remove all: 全てのアドオンを削除します");
			break;
	}
}
