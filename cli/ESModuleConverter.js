const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const astravel = require("astravel");
const astring = require("astring");
const log4js = require("log4js");

const ImportNode = {
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

const ImportSpecifierNode = {
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

const ExportNode = {
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

class ESModuleConverter {
	/** @type log4js.Logger */
	logger;

	/**
	 *
	 * @param {log4js.Logger} logger
	 */
	constructor(logger) {
		this.logger = logger;
	}

	/**
	 *
	 * @param {string} filePath
	 * @returns {{ text: string, imports: Object.<string, string> }}
	 */
	convert(filePath) {
		if (!fs.existsSync(filePath)) {
			this.logger.error("ファイルが見つかりません", filePath);
			return null;
		}
		const imports = {};
		imports["."] = filePath;

		const file = fs.readFileSync(filePath, "utf8");
		const esTree = this._parse(file);
		if (esTree == null) {
			return null;
		}
		//fs.writeFileSync("./test/ast.txt", JSON.stringify(esTree, null, "\t"))

		for (let i = 0; i < esTree.body.length; i++) {
			const node = esTree.body[i];
			if (node.type === "ImportDeclaration") {
				const nodes = this._convertImportDeclaration(
					filePath,
					imports,
					node
				);
				esTree.body.splice(i, 1, ...nodes);
				continue;
			}
			if (node.type === "ExportNamedDeclaration") {
				const nodes = this._convertExportNamedDeclaration(node);
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

	/**
	 *
	 * @param {string} text
	 * @returns {acorn.Program}
	 */
	_parse(text) {
		const comments = [];
		let esTree;
		try {
			esTree = acorn.parse(
				text,
				{
					ecmaVersion: 2022,
					sourceType: "module",
					locations: true,
					allowAwaitOutsideFunction: true,
					onComment: comments
				}
			);
		}
		catch (err) {
			this.logger.error(err);
			return null;
		}
		try {
			astravel.attachComments(esTree, comments);
		}
		catch (err) {
			this.logger.error(err);
		}
		return esTree;
	}

	/**
	 *
	 * @param {string} filePath
	 * @param {object} imports
	 * @param {acorn.Statement | acorn.ModuleDeclaration} node
	 * @returns {(acorn.Statement | acorn.ModuleDeclaration)[]}
	 */
	_convertImportDeclaration(filePath, imports, node) {
		const nodes = [];
		const importNode = structuredClone(ImportNode);
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
			const specifierNode = structuredClone(ImportSpecifierNode);
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
				const specifierNode = structuredClone(ImportSpecifierNode);
				specifierNode.declarations[0].id.name = s.imported.name;
				specifierNode.declarations[0].init.object.name = id;
				specifierNode.declarations[0].init.property.name = s.imported.name;
				nodes.push(specifierNode);
			}
		}
		return nodes;
	}

	_convertExportNamedDeclaration(node) {
		const nodes = [];
		for (const s of node.specifiers) {
			if (s.type !== "ExportSpecifier") {
				continue;
			}
			const exportNode = structuredClone(ExportNode);
			exportNode.expression.left.property.name = s.exported.name;
			exportNode.expression.right.name = s.exported.name;
			nodes.push(exportNode);
		}
		return nodes;
	}
}

module.exports = ESModuleConverter;
