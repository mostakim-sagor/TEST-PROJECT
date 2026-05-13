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
				`❌ "${args[0]}" নামে কোনো command নেই।\n` +
				`💡 ${prefix}help লিখলে সব ${totalCmds}টি command দেখা যাবে।`,
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
			`║     📖 COMMAND INFO      ║\n` +
			`╚══════════════════════╝\n\n` +
			`🔹 Name      : ${prefix}${c.name}\n` +
			`🔹 Version   : v${c.version || "1.0"}\n` +
			`🔹 Author    : ${c.credits || "Unknown"}` + aliasLine + `\n` +
			`🔹 Category  : ${catInfo.emoji} ${catInfo.label}\n` +
			`🔹 Cooldown  : ${c.cooldowns || 3}s\n` +
			`🔹 Role      : ${perm}\n\n` +
			`📝 Description:\n${c.description || "No description."}\n\n` +
			`💡 Usage:\n  ${prefix}${c.name} ${c.usages || ""}`.trimEnd() + `\n\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`📦 Total loaded: ${totalCmds} commands`,
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
	const botName = global.config?.BOTNAME || "MOSTAKIM V2 BOT";
	let msg = `╔══════════════════════╗\n`;
	msg += `║   🤖 ${botName.padEnd(17)}║\n`.slice(0, 46) + `\n`;
	msg += `╚══════════════════════╝\n`;
	msg += `👑 Owner  : MOSTAKIM\n`;
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
	msg += `💡 ${prefix}help [command] → বিস্তারিত দেখুন\n`;
	msg += `📌 উদাহরণ : ${prefix}help ping`;

	return api.sendMessage(msg, threadID, messageID);
};
