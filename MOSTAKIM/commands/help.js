module.exports.config = {
	name: "help",
	version: "3.0",
	hasPermssion: 0,
	credits: "MOSTAKIM",
	description: "Show all commands with details",
	commandCategory: "system",
	usages: "[command name]",
	cooldowns: 3
};

const CATEGORY_INFO = {
	"system":      { emoji: "⚙️",  label: "System" },
	"config":      { emoji: "🔧", label: "Config" },
	"economy":     { emoji: "💰", label: "Economy" },
	"media":       { emoji: "🎵", label: "Media" },
	"game-mp":     { emoji: "🎲", label: "Games" },
	"game-sp":     { emoji: "🎯", label: "Games" },
	"study":       { emoji: "📚", label: "Study" },
	"other":       { emoji: "🔮", label: "Other" },
	"info":        { emoji: "ℹ️",  label: "Info" },
	"nsfw":        { emoji: "🔞", label: "NSFW" },
	"random-img":  { emoji: "🖼️",  label: "Images" },
	"random-text": { emoji: "💬", label: "Random" },
	"health":      { emoji: "💊", label: "Health" },
	"news":        { emoji: "📰", label: "News" }
};

const PERM_LABEL = {
	0: "👤 Everyone",
	1: "👑 Group Admin",
	2: "🛡️ Bot Admin"
};

module.exports.run = function({ api, event, args }) {
	const { commands } = global.client;
	const { threadID, messageID } = event;

	const threadData = global.data?.threadData?.get(String(threadID)) || {};
	const prefix = threadData.PREFIX || global.config?.PREFIX || "*";
	const totalCmds = commands.size;

	// ── Single command detail ──────────────────────────────────
	if (args[0]) {
		const input = args[0].toLowerCase().replace(/^\W+/, "");
		const cmd = commands.get(input) ||
			[...commands.values()].find(c => (c.config.aliases || []).includes(input));

		if (!cmd) {
			return api.sendMessage(
				`❌ No command found with the name "${args[0]}".\n` +
				`💡 Type ${prefix}help to see all ${totalCmds} available commands.`,
				threadID, messageID
			);
		}

		const c = cmd.config;
		const cat = (c.commandCategory || c.category || "other").toLowerCase();
		const catInfo = CATEGORY_INFO[cat] || { emoji: "📌", label: cat };
		const perm = PERM_LABEL[c.hasPermssion ?? c.hasPermission ?? 0] || "👤 Everyone";
		const aliasLine = (c.aliases || []).length > 0
			? `\n🔁 Aliases   : ${c.aliases.map(a => prefix + a).join(", ")}`
			: "";

		return api.sendMessage(
			`╔══════════════════════╗\n` +
			`║     📖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎      ║\n` +
			`╚══════════════════════╝\n\n` +
			`🔹 Name      : ${prefix}${c.name}\n` +
			`🔹 Version   : v${c.version || "1.0"}\n` +
			`🔹 Author    : ${c.credits || "Unknown"}` + aliasLine + `\n` +
			`🔹 Category  : ${catInfo.emoji} ${catInfo.label}\n` +
			`🔹 Cooldown  : ${c.cooldowns || 3}s\n` +
			`🔹 Role      : ${perm}\n\n` +
			`📝 Description:\n${c.description || "No description available."}\n\n` +
			`💡 Usage:\n  ${prefix}${c.name} ${c.usages || ""}`.trimEnd() + `\n\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`📦 Total Loaded: ${totalCmds} commands`,
			threadID, messageID
		);
	}

	// ── Full grouped command list ──────────────────────────────
	const groups = new Map();
	for (const [, cmd] of commands) {
		const cat = (cmd.config.commandCategory || cmd.config.category || "other").toLowerCase();
		if (!groups.has(cat)) groups.set(cat, []);
		groups.get(cat).push(cmd.config.name);
	}

	// Sort categories and each category's commands alphabetically
	const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

	// Build header
	const botName = global.config?.BOTNAME || "𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓";
	let msg = `╔══════════════════════╗\n`;
	msg += `║   🤖 ${botName.padEnd(17)}║\n`.slice(0, 46) + `\n`;
	msg += `╚══════════════════════╝\n`;
	msg += `👑 Owner  : 𝐌𝐃 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐈𝐒𝐋𝐀𝐌 𝐒𝐀𝐆𝐎𝐑\n`;
	msg += `📦 Cmds   : ${totalCmds} commands\n`;
	msg += `🔑 Prefix : [ ${prefix} ]\n`;
	msg += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

	// Each category block
	for (const [cat, cmds] of sorted) {
		const info = CATEGORY_INFO[cat] || { emoji: "📌", label: cat };
		msg += `${info.emoji} ${info.label.toUpperCase()} [ ${cmds.length} ]\n`;
		msg += cmds.sort().map(n => `  ✦ ${prefix}${n}`).join("\n");
		msg += "\n\n";
	}

	msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
	msg += `💡 ${prefix}help [command] → View command details\n`;
	msg += `📌 Example : ${prefix}help ping`;

	return api.sendMessage(msg, threadID, messageID);
};