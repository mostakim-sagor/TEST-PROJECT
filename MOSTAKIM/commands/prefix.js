module.exports.config = {
        name: "prefix",
        version: "1.0.0",
        hasPermssion: 0,
        credits: "MOSTAKIM",
        description: "Show current bot prefix and usage info",
        commandCategory: "system",
        usages: "",
        cooldowns: 5
};

// ── Helper: build the prefix info message ────────────────────────────────
function buildPrefixMsg(threadID) {
        const threadData = global.data?.threadData?.get(String(threadID)) || {};
        const prefix     = threadData.PREFIX || global.config?.PREFIX || "*";
        const botName    = global.config?.BOTNAME || "MOSTAKIM GOAT BOT";

        return (
                `╔══════════════════════╗\n` +
                `║      BOT PREFIX INFO      ║\n` +
                `╚══════════════════════╝\n\n` +
                `🤖 Bot   : ${botName}\n` +
                `🔑 Prefix : [ ${prefix} ]\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 How to use:\n` +
                `   ${prefix}help       → all commands\n` +
                `   ${prefix}help ping  → command detail\n` +
                `   ${prefix}prefix     → show this info\n\n` +
                `💡 Admin can change prefix:\n` +
                `   ${prefix}setprefix [new prefix]\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⚡ Just type ${prefix} alone to see this anytime!`
        );
}

// ── handleEvent: triggered when someone types ONLY the prefix OR "prefix" ─
module.exports.handleEvent = function({ api, event }) {
        if (!event || !event.body) return;
        const { body, threadID } = event;
        const threadData = global.data?.threadData?.get(String(threadID)) || {};
        const prefix     = (threadData.PREFIX || global.config?.PREFIX || "*").toLowerCase();
        const trimmed    = body.trim().toLowerCase();

        // Match any of:
        //   * (just the prefix character alone)
        //   prefix (the word, without any prefix)
        if (trimmed === prefix || trimmed === "prefix") {
                return api.sendMessage(buildPrefixMsg(threadID), threadID, event.messageID);
        }
};

// ── run: *prefix ─────────────────────────────────────────────────────────
module.exports.run = function({ api, event }) {
        return api.sendMessage(buildPrefixMsg(event.threadID), event.threadID, event.messageID);
};
