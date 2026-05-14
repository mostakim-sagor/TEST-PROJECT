const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

const COMMANDS_DIR = path.join(__dirname);

function getGithubInfo() {
	try {
		const pkg = require(path.join(__dirname, "../../package.json"));
		const repoUrl = pkg?.repository?.url || "";
		const match   = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/i);
		if (match) return { owner: match[1], repo: match[2] };
	} catch (_) {}
	return null;
}

module.exports = {
	config: {
		name:             "loadcmd",
		version:          "1.0.0",
		author:           "MOSTAKIM",
		countDown:        5,
		role:             2,
		shortDescription: "GitHub থেকে command load করো",
		longDescription:  "GitHub repo থেকে যেকোনো command live load করো — bot restart ছাড়াই",
		category:         "owner",
		guide:            "{pn} <command_name>\n{pn} all — সব নতুন command load করো"
	},

	run: async ({ api, event, args }) => {
		const { threadID, messageID } = event;

		if (!args[0]) {
			return api.sendMessage(
				`📦 LOADCMD — GitHub থেকে Live Command Loader\n\n` +
				`📌 ব্যবহার:\n` +
				`  ${global.config.PREFIX}loadcmd <command_name>\n` +
				`  ${global.config.PREFIX}loadcmd all\n\n` +
				`📝 উদাহরণ:\n` +
				`  ${global.config.PREFIX}loadcmd ping\n` +
				`  ${global.config.PREFIX}loadcmd all`,
				threadID, messageID
			);
		}

		const ghInfo = getGithubInfo();
		if (!ghInfo) {
			return api.sendMessage(
				`❌ GitHub repo info পাওয়া যায়নি!\n\n` +
				`package.json এ repository.url সেট করো:\n` +
				`"repository": {\n  "url": "https://github.com/USERNAME/REPO.git"\n}`,
				threadID, messageID
			);
		}

		const { owner, repo } = ghInfo;
		const branch           = "main";
		const apiBase          = `https://api.github.com/repos/${owner}/${repo}/contents/MOSTAKIM/commands`;
		const rawBase          = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/MOSTAKIM/commands`;

		// ── ALL mode ──
		if (args[0].toLowerCase() === "all") {
			api.sendMessage(`⏳ GitHub থেকে command list আনছি...`, threadID, messageID);

			let fileList;
			try {
				const { data } = await axios.get(apiBase, {
					headers: { "User-Agent": "MOSTAKIM-BOT" },
					timeout: 10000
				});
				fileList = data
					.filter(f => f.name.endsWith(".js") && !f.name.startsWith("_"))
					.map(f => f.name);
			} catch (e) {
				return api.sendMessage(
					`❌ GitHub API error: ${e.message}\n\nRepo: ${owner}/${repo}`,
					threadID, messageID
				);
			}

			let loaded = 0, updated = 0, failed = 0;
			const failedList = [];

			for (const file of fileList) {
				const cmdName  = file.replace(".js", "");
				const filePath = path.join(COMMANDS_DIR, file);
				try {
					const { data: code } = await axios.get(`${rawBase}/${file}`, {
						timeout: 10000,
						responseType: "text"
					});

					await fs.writeFile(filePath, code, "utf-8");
					delete require.cache[require.resolve(filePath)];
					const cmd = require(filePath);

					if (cmd.config?.name) {
						const isNew = !global.client.commands.has(cmd.config.name.toLowerCase());
						global.client.commands.set(cmd.config.name.toLowerCase(), cmd);
						if (isNew) loaded++;
						else updated++;
						if (typeof cmd.onLoad === "function") {
							try { await cmd.onLoad(); } catch (_) {}
						}
					}
				} catch (e) {
					failed++;
					failedList.push(`${cmdName}: ${e.message}`);
				}
			}

			return api.sendMessage(
				`✅ সব Command Load সম্পন্ন!\n\n` +
				`📦 নতুন: ${loaded} টা\n` +
				`🔄 Updated: ${updated} টা\n` +
				`❌ Failed: ${failed} টা\n` +
				`📊 Total Commands: ${global.client.commands.size}\n` +
				(failedList.length ? `\n⚠️ Failed:\n${failedList.slice(0, 5).join("\n")}` : ""),
				threadID, messageID
			);
		}

		// ── Single command ──
		const cmdName  = args[0].toLowerCase().replace(".js", "");
		const fileName = `${cmdName}.js`;
		const filePath = path.join(COMMANDS_DIR, fileName);
		const rawUrl   = `${rawBase}/${fileName}`;

		api.sendMessage(`⏳ "${cmdName}" command GitHub থেকে আনছি...`, threadID, messageID);

		let code;
		try {
			const { data } = await axios.get(rawUrl, {
				timeout: 10000,
				responseType: "text"
			});
			code = data;
		} catch (e) {
			return api.sendMessage(
				`❌ GitHub থেকে আনতে পারিনি!\n\n` +
				`Command: ${cmdName}\n` +
				`URL: ${rawUrl}\n\n` +
				`Error: ${e.response?.status === 404
					? "File পাওয়া যায়নি — নাম ঠিক আছে তো?"
					: e.message}`,
				threadID, messageID
			);
		}

		try {
			await fs.writeFile(filePath, code, "utf-8");
		} catch (e) {
			return api.sendMessage(`❌ File save করতে পারিনি: ${e.message}`, threadID, messageID);
		}

		try {
			delete require.cache[require.resolve(filePath)];
			const cmd = require(filePath);

			if (!cmd.config?.name) {
				return api.sendMessage(
					`❌ Command load হলো কিন্তু config.name নেই!\nFile টা ঠিক আছে তো?`,
					threadID, messageID
				);
			}

			const isNew = !global.client.commands.has(cmd.config.name.toLowerCase());
			global.client.commands.set(cmd.config.name.toLowerCase(), cmd);

			if (typeof cmd.onLoad === "function") {
				try { await cmd.onLoad(); } catch (_) {}
			}

			return api.sendMessage(
				`✅ Command ${isNew ? "নতুন Load" : "Update"} সফল!\n\n` +
				`📦 Name   : ${cmd.config.name}\n` +
				`📝 Version: ${cmd.config.version || "N/A"}\n` +
				`👤 Author : ${cmd.config.author || "N/A"}\n` +
				`📊 Total  : ${global.client.commands.size} commands\n\n` +
				`💡 ${global.config.PREFIX}${cmd.config.name} দিয়ে এখনই ব্যবহার করো!`,
				threadID, messageID
			);
		} catch (e) {
			return api.sendMessage(
				`❌ Command execute করতে error:\n${e.message}\n\nCode এ সমস্যা আছে।`,
				threadID, messageID
			);
		}
	}
};