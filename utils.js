const path = require("path");
const fs = require("fs-extra");

const log = require("./utils/log.js");

function getText(module, key, ...args) {
	if (global.getText) return global.getText(module, key, ...args);
	let text = key;
	for (let i = 0; i < args.length; i++) {
		text = text.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
	}
	return text;
}

function compareVersion(v1, v2) {
	const parts1 = v1.split(".").map(Number);
	const parts2 = v2.split(".").map(Number);
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const a = parts1[i] || 0;
		const b = parts2[i] || 0;
		if (a > b) return 1;
		if (a < b) return -1;
	}
	return 0;
}

const colors = {
	gray: (s) => s,
	hex: (color, s) => s
};

module.exports = {
	log,
	getText,
	compareVersion,
	colors
};
