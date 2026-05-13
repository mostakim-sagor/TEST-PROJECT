module.exports.config = {
	name: "calladmin",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "MOSTAKIM",
	description: "Admin-কে সরাসরি message পাঠাও — admin reply করলে bot তোমার কাছে ফিরিয়ে দেবে",
	commandCategory: "system",
	usages: "[message]",
	cooldowns: 30
};

module.exports.languages = {
	"en": {
		"noAdmin":       "❌ কোনো admin configure করা নেই।",
		"noMessage":     "❓ Admin-কে কী বলতে চাও? Message লেখো:\n💡 উদাহরণ: *calladmin আমার সাহায্য দরকার",
		"sent":          "✅ তোমার message admin-এর কাছে পাঠানো হয়েছে!\n⏳ Admin reply করলে তুমি এখানেই পাবে।",
		"adminReply":    "📨 Admin-এর reply:\n\n{msg}\n\n━━━━━━━━━━━━━━━\n👤 To: {name}",
		"notAdmin":      "🚫 তুমি admin নও, এই message-এ reply করতে পারবে না।",
		"selfMessage":   "⚠️ নিজেকে নিজে message করা যাবে না।"
	}
};

// ── Helper: get admin IDs ──────────────────────────────────────────────────
function getAdminIDs() {
	const cfg = global.config || global.GoatBot?.config || {};
	return (cfg.adminBot || cfg.ADMINBOT || []).map(String);
}

// ── handleReply: admin replies → forward to user's thread ─────────────────
module.exports.handleReply = async function({ api, event, handleReply, Users, getText }) {
	const { body, threadID, senderID } = event;
	const adminIDs = getAdminIDs();

	// Only admins can reply through this system
	if (!adminIDs.includes(String(senderID))) {
		return api.sendMessage(getText("notAdmin"), threadID, event.messageID);
	}

	const { targetThreadID, targetUserID, targetUserName } = handleReply;

	// Remove this handleReply entry so it doesn't trigger again
	const idx = global.client.handleReply.findIndex(h => h.messageID === handleReply.messageID);
	if (idx !== -1) global.client.handleReply.splice(idx, 1);

	// Send admin reply to the original thread, mentioning the user
	const replyMsg = getText("adminReply")
		.replace("{msg}", body)
		.replace("{name}", targetUserName);

	await api.sendMessage(
		{
			body: replyMsg,
			mentions: [{ tag: targetUserName, id: targetUserID }]
		},
		targetThreadID
	);

	// Confirm to admin that the reply was delivered
	return api.sendMessage(
		`✅ Reply সফলভাবে পাঠানো হয়েছে!\n👤 To: ${targetUserName} (${targetUserID})`,
		threadID,
		event.messageID
	);
};

// ── run: user sends message to admin ─────────────────────────────────────
module.exports.run = async function({ api, event, args, Users, getText }) {
	const { threadID, messageID, senderID } = event;
	const adminIDs = getAdminIDs();

	if (adminIDs.length === 0) {
		return api.sendMessage(getText("noAdmin"), threadID, messageID);
	}

	const message = args.join(" ").trim();
	if (!message) {
		return api.sendMessage(getText("noMessage"), threadID, messageID);
	}

	// Get sender info
	let senderName = "Unknown User";
	try {
		senderName = global.data?.userName?.get(String(senderID))
			|| await Users.getNameUser(senderID)
			|| "Unknown User";
	} catch (_) {}

	// Get thread info
	let threadName = String(threadID);
	try {
		const info = await new Promise((res, rej) =>
			api.getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
		);
		threadName = info?.name || `Thread ${threadID}`;
	} catch (_) {}

	// Build the forwarded message for admin inbox
	const now = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
	const forwardMsg =
		`╔══════════════════════╗\n` +
		`║   📩 USER MESSAGE INBOX  ║\n` +
		`╚══════════════════════╝\n\n` +
		`👤 From     : ${senderName}\n` +
		`🆔 User ID  : ${senderID}\n` +
		`📍 Thread   : ${threadName}\n` +
		`🗓️  Time     : ${now}\n` +
		`━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
		`💬 Message:\n${message}\n\n` +
		`━━━━━━━━━━━━━━━━━━━━━━━\n` +
		`↩️  Reply করুন → user-কে সরাসরি উত্তর যাবে`;

	// Send to all admins
	let sent = false;
	for (const adminID of adminIDs) {
		// Skip if user is admin themselves
		if (adminID === String(senderID)) continue;

		try {
			await new Promise((resolve, reject) => {
				api.sendMessage(forwardMsg, adminID, (err, info) => {
					if (err) return reject(err);
					// Register handleReply so admin can reply back
					global.client.handleReply.push({
						name: "calladmin",
						messageID: info.messageID,
						author: adminID,
						targetThreadID: threadID,
						targetUserID: String(senderID),
						targetUserName: senderName
					});
					resolve();
				});
			});
			sent = true;
		} catch (e) {
			console.error("[calladmin] Failed to send to admin", adminID, e.message);
		}
	}

	if (!sent && adminIDs.includes(String(senderID))) {
		return api.sendMessage(getText("selfMessage"), threadID, messageID);
	}

	return api.sendMessage(getText("sent"), threadID, messageID);
};
