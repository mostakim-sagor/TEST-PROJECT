module.exports.config = {
	name: "stats",
	aliases: ["botstats", "botinfo"],
	version: "1.0.0",
	hasPermssion: 0,
	credits: "MOSTAKIM",
	description: "Show live bot statistics — users, groups, commands, memory, uptime",
	commandCategory: "info",
	usages: "",
	cooldowns: 10
};

// ── Track command usage count across the session ─────────────────────────
if (!global._statsCounter) {
	global._statsCounter = {
		total: 0,
		today: 0,
		lastReset: new Date().toDateString()
	};
}

// Increment counter — called from handleEvent on every command execution
module.exports.handleEvent = function({ event }) {
	if (!event?.body) return;
	const threadData = global.data?.threadData?.get(String(event.threadID)) || {};
	const prefix     = (threadData.PREFIX || global.config?.PREFIX || "*").toLowerCase();
	const body       = event.body.trim().toLowerCase();

	if (!body.startsWith(prefix)) return;

	// Reset daily counter at midnight
	const today = new Date().toDateString();
	if (global._statsCounter.lastReset !== today) {
		global._statsCounter.today     = 0;
		global._statsCounter.lastReset = today;
	}
	global._statsCounter.total++;
	global._statsCounter.today++;
};

// ── Format uptime ─────────────────────────────────────────────────────────
function formatUptime(sec) {
	const d = Math.floor(sec / 86400);
	const h = Math.floor((sec % 86400) / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = Math.floor(sec % 60);
	if (d > 0) return `${d}d ${h}h ${m}m`;
	if (h > 0) return `${h}h ${m}m ${s}s`;
	return `${m}m ${s}s`;
}

// ── Bar chart helper ──────────────────────────────────────────────────────
function bar(pct, len = 12) {
	const filled = Math.round((pct / 100) * len);
	return "█".repeat(filled) + "░".repeat(len - filled);
}

// ── run ───────────────────────────────────────────────────────────────────
module.exports.run = async function({ api, event }) {
	const { threadID, messageID } = event;

	// Reset daily counter check
	const today = new Date().toDateString();
	if (global._statsCounter.lastReset !== today) {
		global._statsCounter.today     = 0;
		global._statsCounter.lastReset = today;
	}

	// ── Collect stats ────────────────────────────────────────────────────
	const totalUsers    = (global.data?.allUserID    || []).length;
	const totalGroups   = (global.data?.allThreadID  || []).length;
	const totalCmds     = (global.client?.commands?.size || 0);
	const cmdUsedToday  = global._statsCounter.today;
	const cmdUsedTotal  = global._statsCounter.total;

	const uptimeSec     = Math.floor(process.uptime());
	const mem           = process.memoryUsage();
	const heapUsedMB    = (mem.heapUsed  / 1024 / 1024).toFixed(1);
	const heapTotalMB   = (mem.heapTotal / 1024 / 1024).toFixed(1);
	const rssMB         = (mem.rss       / 1024 / 1024).toFixed(1);
	const heapPct       = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(0);

	const os            = require("os");
	const totalMemMB    = (os.totalmem()  / 1024 / 1024).toFixed(0);
	const usedMemMB     = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0);
	const sysPct        = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(0);

	const nodeVer       = process.version;
	const platform      = process.platform;
	const prefix        = global.data?.threadData?.get(String(threadID))?.PREFIX
		|| global.config?.PREFIX || "*";
	const botName       = global.config?.BOTNAME || "MOSTAKIM V2 BOT";
	const now           = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });

	// ── Build message ─────────────────────────────────────────────────────
	const msg =
		`╔═══════════════════════╗\n` +
		`║    📊 BOT STATISTICS    ║\n` +
		`╚═══════════════════════╝\n\n` +

		`🤖 ${botName}\n` +
		`🔑 Prefix : [ ${prefix} ]\n` +
		`🕐 Time   : ${now}\n\n` +

		`━━━━ 👥 SOCIAL ━━━━━━━━━━━\n` +
		`👤 Total Users  : ${totalUsers.toLocaleString()}\n` +
		`🏘️  Total Groups : ${totalGroups.toLocaleString()}\n\n` +

		`━━━━ ⚡ COMMANDS ━━━━━━━━━\n` +
		`📦 Loaded       : ${totalCmds} commands\n` +
		`📅 Used Today   : ${cmdUsedToday.toLocaleString()}\n` +
		`🔢 All Time     : ${cmdUsedTotal.toLocaleString()}\n\n` +

		`━━━━ 💾 MEMORY ━━━━━━━━━━━\n` +
		`Heap  [${bar(Number(heapPct))}] ${heapPct}%\n` +
		`      ${heapUsedMB}MB / ${heapTotalMB}MB\n` +
		`Sys   [${bar(Number(sysPct))}] ${sysPct}%\n` +
		`      ${usedMemMB}MB / ${totalMemMB}MB\n` +
		`RSS   : ${rssMB} MB\n\n` +

		`━━━━ 🖥️  SYSTEM ━━━━━━━━━━\n` +
		`⏱️  Uptime  : ${formatUptime(uptimeSec)}\n` +
		`📟 Node.js : ${nodeVer}\n` +
		`🖥️  OS      : ${platform}\n` +
		`━━━━━━━━━━━━━━━━━━━━━━━━`;

	return api.sendMessage(msg, threadID, messageID);
};
