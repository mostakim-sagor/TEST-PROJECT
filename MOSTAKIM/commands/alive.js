module.exports = {
	config: {
		name: "alive",
		version: "1.0",
		author: "MOSTAKIM",
		countDown: 3,
		role: 0,
		shortDescription: "Check if bot is alive",
		longDescription: "Check bot status and uptime",
		category: "info",
		guide: "{pn}"
	},

	run: async ({ api, event }) => {
		const uptime  = process.uptime();
		const hours   = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const seconds = Math.floor(uptime % 60);

		const msg =
			`╔══════════════════╗\n` +
			`║   🟢 BOT IS ALIVE   ║\n` +
			`╚══════════════════╝\n\n` +
			`🤖 Bot: ${global.config?.BOTNAME || "MOSTAKIM V2 BOT"}\n` +
			`🆔 ID: ${global.GoatBot?.botID || "N/A"}\n` +
			`⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
			`📦 Commands: ${global.client?.commands?.size || 0}\n` +
			`📡 Status: ONLINE ✅`;

		api.sendMessage(msg, event.threadID, event.messageID);
	}
};
