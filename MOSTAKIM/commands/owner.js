module.exports.config = {
        name: "owner",
        aliases: ["botowner", "admininfo"],
        version: "1.0.0",
        hasPermssion: 0,
        credits: "MOSTAKIM",
        description: "Show bot owner/admin profile details",
        commandCategory: "info",
        usages: "",
        cooldowns: 10
};

// ════════════════════════════════════════════════════════════════
//  OWNER DETAILS — এখানে তোমার নিজের info দাও
//  (config.json থেকে admin ID auto-detect হবে)
// ════════════════════════════════════════════════════════════════
const OWNER_DETAILS = {
        // ── Personal Info ────────────────────────────────────────────
        name:       "MD MOSTAKIM ISLAM SAGOR", // তোমার নাম
        nickname:   "MOSTAKIM GOAT",           // nickname
        age:        "21 Plus",                 // বয়স
        country:    "Bangladesh 🇧🇩",          // দেশ
        city:       "Dhaka",                   // শহর

        // ── Contact ──────────────────────────────────────────────────
        fb:         "https://facebook.com/100058112936375", // Facebook profile link
        github:     "",                        // GitHub link
        email:      "",                        // Email

        // ── About Bot ─────────────────────────────────────────────────
        botVersion: "2.0.0",              // Bot version
        framework:  "mostakim-fca",       // Framework
        language:   "Node.js",            // Language

        // ── Status / Bio ──────────────────────────────────────────────
        bio:        "MOSTAKIM V2 BOT — Always Online ⚡"
};
// ════════════════════════════════════════════════════════════════

module.exports.run = async function({ api, event, Users }) {
        const { threadID, messageID } = event;

        // ── Read admin IDs from config.json (live, always fresh) ────
        let adminIDs = [];
        try {
                const fs   = require("fs");
                const path = require("path");
                const raw  = fs.readFileSync(path.join(__dirname, "../../config.json"), "utf-8");
                adminIDs   = JSON.parse(raw).adminBot || [];
        } catch (_) {
                adminIDs = global.config?.ADMINBOT || [];
        }
        adminIDs = adminIDs.map(String);

        // ── Fetch names for all admin IDs ────────────────────────────
        const adminList = [];
        for (const id of adminIDs) {
                let name = "Unknown";
                try {
                        name = global.data?.userName?.get(id)
                                || await Users.getNameUser(id)
                                || "Unknown";
                } catch (_) {}
                adminList.push({ id, name });
        }

        // ── Build admin list section ──────────────────────────────────
        const adminLines = adminList.map((a, i) =>
                `  ${i + 1}. ${a.name}\n     🆔 ${a.id}`
        ).join("\n\n");

        // ── Build contact section (skip empty fields) ─────────────────
        const d = OWNER_DETAILS;
        const contactLines = [
                d.fb     ? `  🔗 Facebook : ${d.fb}`     : null,
                d.github ? `  🐙 GitHub   : ${d.github}` : null,
                d.email  ? `  📧 Email    : ${d.email}`  : null
        ].filter(Boolean).join("\n");

        const personalLines = [
                d.age     ? `  📅 Age      : ${d.age}`      : null,
                d.country ? `  🌏 Country  : ${d.country}`  : null,
                d.city    ? `  📍 City     : ${d.city}`      : null
        ].filter(Boolean).join("\n");

        const botName  = global.config?.BOTNAME || "MOSTAKIM V2 BOT";
        const prefix   = global.config?.PREFIX  || "*";
        const now      = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });

        // ── Assemble full message ─────────────────────────────────────
        let msg =
                `╔══════════════════════╗\n` +
                `║    👑 BOT OWNER INFO    ║\n` +
                `╚══════════════════════╝\n\n`;

        // Owner name & bio
        msg +=
                `👤 Owner   : ${d.name}\n` +
                `💬 Nickname: ${d.nickname}\n`;

        if (d.bio) msg += `✨ Bio     : ${d.bio}\n`;

        // Personal
        if (personalLines) {
                msg += `\n━━━━ 📋 PERSONAL ━━━━━━━━━\n${personalLines}\n`;
        }

        // Contact
        if (contactLines) {
                msg += `\n━━━━ 📬 CONTACT ━━━━━━━━━━\n${contactLines}\n`;
        }

        // Bot info
        msg +=
                `\n━━━━ 🤖 BOT INFO ━━━━━━━━━\n` +
                `  🤖 Name     : ${botName}\n` +
                `  🔑 Prefix   : [ ${prefix} ]\n` +
                `  📦 Version  : v${d.botVersion}\n` +
                `  ⚙️  Framework: ${d.framework}\n` +
                `  💻 Language : ${d.language}\n`;

        // Admin list
        msg +=
                `\n━━━━ 👑 BOT ADMINS ━━━━━━━\n` +
                `${adminLines || "  No admins configured"}\n`;

        // Footer
        msg +=
                `\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🕐 ${now}\n` +
                `💡 Type ${prefix}help to see all commands`;

        return api.sendMessage(msg, threadID, messageID);
};
