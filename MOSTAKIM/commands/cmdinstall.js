module.exports.config = {
	name: "cmdinstall",
	aliases: ["cmd"],
	version: "1.0.0",
	hasPermssion: 2,
	credits: "MOSTAKIM",
	description: "Install, run, list or delete custom commands from Messenger (Bot Admin only)",
	commandCategory: "system",
	usages: "install <name> | run | list | delete <name>",
	cooldowns: 5
};

const fs   = require("fs");
const path = require("path");
const vm   = require("vm");

const CMD_DIR = path.join(__dirname);

// ── Extract code block from message body ─────────────────────────────────
// Supports ```js ... ``` or ``` ... ``` or raw code after first line
function extractCode(body) {
	// Try to find ``` ... ``` block
	const fence = body.match(/```(?:js|javascript)?\s*([\s\S]+?)```/i);
	if (fence) return fence[1].trim();
	// Otherwise take everything after the first line
	const lines = body.split("\n");
	if (lines.length > 1) return lines.slice(1).join("\n").trim();
	return null;
}

// ── Hot-reload a single command file ─────────────────────────────────────
function hotReload(filePath) {
	const absPath = require.resolve(filePath);
	delete require.cache[absPath];
	const mod = require(absPath);
	if (mod.config?.name) {
		global.client.commands.set(mod.config.name.toLowerCase(), mod);
		if (Array.isArray(mod.config.aliases)) {
			for (const alias of mod.config.aliases)
				global.client.commands.set(alias.toLowerCase(), mod);
		}
	}
	return mod.config?.name || path.basename(filePath);
}

// ── Remove a command from memory ─────────────────────────────────────────
function hotUnload(name) {
	global.client.commands.delete(name.toLowerCase());
}

module.exports.run = async function({ api, event, args }) {
	const { threadID, messageID, body } = event;
	const sub = (args[0] || "").toLowerCase();

	// ──────────────────────────────────────────────────────────────────────
	// cmd install <name>
	// ──────────────────────────────────────────────────────────────────────
	if (sub === "install") {
		const name = (args[1] || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
		if (!name) {
			return api.sendMessage(
				`❌ Command name দাও:\n*cmd install mycommand\n\`\`\`js\n// code এখানে\n\`\`\``,
				threadID, messageID
			);
		}

		const code = extractCode(body);
		if (!code) {
			return api.sendMessage(
				`❌ Code পাওয়া যায়নি!\n\n` +
				`নিচের format-এ পাঠাও:\n` +
				`*cmd install ${name}\n\`\`\`js\n` +
				`module.exports.config = { name: "${name}", version: "1.0.0", hasPermssion: 0, credits: "Admin", description: "My command", commandCategory: "other", usages: "", cooldowns: 3 };\n` +
				`module.exports.run = async function({ api, event, args }) {\n` +
				`  return api.sendMessage("Hello!", event.threadID);\n` +
				`};\n\`\`\``,
				threadID, messageID
			);
		}

		// Syntax check before saving
		try {
			new vm.Script(code);
		} catch (e) {
			return api.sendMessage(
				`❌ Syntax Error:\n${e.message}\n\nCode fix করে আবার পাঠাও।`,
				threadID, messageID
			);
		}

		const filePath = path.join(CMD_DIR, `${name}.js`);
		const existed  = fs.existsSync(filePath);

		try {
			fs.writeFileSync(filePath, code, "utf-8");
			const loadedName = hotReload(filePath);
			return api.sendMessage(
				`✅ Command "${loadedName}" ${existed ? "updated" : "installed"} সফলভাবে!\n` +
				`📁 File: MOSTAKIM/commands/${name}.js\n` +
				`🔄 Hot-reloaded — এখনই *${loadedName} দিয়ে test করো!`,
				threadID, messageID
			);
		} catch (e) {
			return api.sendMessage(`❌ Install failed: ${e.message}`, threadID, messageID);
		}
	}

	// ──────────────────────────────────────────────────────────────────────
	// cmd run  — execute code on the fly (not saved)
	// ──────────────────────────────────────────────────────────────────────
	if (sub === "run") {
		const code = extractCode(body);
		if (!code) {
			return api.sendMessage(
				`❌ Code পাওয়া যায়নি!\n\nFormat:\n*cmd run\n\`\`\`js\n// code এখানে\n\`\`\``,
				threadID, messageID
			);
		}

		let result;
		const start = Date.now();
		try {
			// Provide helpful globals in sandbox
			const sandbox = {
				api,
				event,
				global,
				require,
				console,
				setTimeout,
				setInterval,
				clearTimeout,
				clearInterval,
				process,
				Buffer,
				__result: undefined
			};
			const wrapped = `(async () => { ${code} })()`;
			result = await vm.runInNewContext(wrapped, sandbox, { timeout: 10000 });
			const elapsed = Date.now() - start;
			const output  = result !== undefined ? JSON.stringify(result, null, 2) : "(no return value)";
			return api.sendMessage(
				`✅ Code run successful!\n⏱️ Time: ${elapsed}ms\n\n📤 Output:\n${String(output).slice(0, 800)}`,
				threadID, messageID
			);
		} catch (e) {
			const elapsed = Date.now() - start;
			return api.sendMessage(
				`❌ Error (${elapsed}ms):\n${e.message}`,
				threadID, messageID
			);
		}
	}

	// ──────────────────────────────────────────────────────────────────────
	// cmd delete <name>
	// ──────────────────────────────────────────────────────────────────────
	if (sub === "delete" || sub === "remove" || sub === "del") {
		const name = (args[1] || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
		if (!name) return api.sendMessage(`❌ Command name দাও: *cmd delete <name>`, threadID, messageID);

		// Safety: don't allow deleting core system commands
		const PROTECTED = ["help", "prefix", "cmdinstall", "cmd", "broadcast", "calladmin", "setprefix"];
		if (PROTECTED.includes(name)) {
			return api.sendMessage(`🛡️ "${name}" একটি protected command — delete করা যাবে না।`, threadID, messageID);
		}

		const filePath = path.join(CMD_DIR, `${name}.js`);
		if (!fs.existsSync(filePath)) {
			return api.sendMessage(`❌ "${name}.js" file পাওয়া যায়নি।`, threadID, messageID);
		}

		try {
			hotUnload(name);
			const absPath = require.resolve(filePath);
			delete require.cache[absPath];
			fs.unlinkSync(filePath);
			return api.sendMessage(
				`🗑️ Command "${name}" deleted!\n📁 File removed from MOSTAKIM/commands/`,
				threadID, messageID
			);
		} catch (e) {
			return api.sendMessage(`❌ Delete failed: ${e.message}`, threadID, messageID);
		}
	}

	// ──────────────────────────────────────────────────────────────────────
	// cmd list
	// ──────────────────────────────────────────────────────────────────────
	if (sub === "list") {
		const files = fs.readdirSync(CMD_DIR).filter(f => f.endsWith(".js") && !f.startsWith("_"));
		const list  = files.map(f => `• ${f.replace(".js", "")}`).join("\n");
		return api.sendMessage(
			`📦 MOSTAKIM/commands (${files.length} files):\n${list}`,
			threadID, messageID
		);
	}

	// ──────────────────────────────────────────────────────────────────────
	// Usage guide
	// ──────────────────────────────────────────────────────────────────────
	return api.sendMessage(
		`╔══════════════════════╗\n` +
		`║    CMD INSTALL GUIDE    ║\n` +
		`╚══════════════════════╝\n\n` +
		`📦 *cmd install <name>\n` +
		`   Code সহ পাঠাও — permanently save হবে\n\n` +
		`⚡ *cmd run\n` +
		`   Code সহ পাঠাও — save ছাড়াই চালাও\n\n` +
		`📋 *cmd list\n` +
		`   সব command file দেখাও\n\n` +
		`🗑️ *cmd delete <name>\n` +
		`   Command file মুছে ফেলো\n\n` +
		`━━━━━━━━━━━━━━━━━━━━━━━\n` +
		`💡 Code format:\n` +
		`\`\`\`js\n// তোমার code এখানে\n\`\`\``,
		threadID, messageID
	);
};
