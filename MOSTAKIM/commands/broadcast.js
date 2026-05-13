module.exports.config = {
	name: "broadcast",
	aliases: ["bc", "announce"],
	version: "1.0.0",
	hasPermssion: 2,
	credits: "MOSTAKIM",
	description: "সব group-এ একসাথে announcement পাঠাও (শুধু Bot Admin)",
	commandCategory: "system",
	usages: "[message] | reply করেও পাঠানো যাবে",
	cooldowns: 10
};

module.exports.languages = {
	"en": {
		"noThreads":   "❌ Bot এখনো কোনো group-এ নেই।",
		"noMessage":   "❓ কী broadcast করতে চাও? Message লেখো:\n💡 উদাহরণ: *broadcast সবাইকে জানাই...",
		"sending":     "📡 Broadcast শুরু হচ্ছে...\n📦 মোট {total}টি group-এ পাঠানো হবে।",
		"done":        "📊 Broadcast সম্পন্ন!\n✅ সফল : {ok} টি group\n❌ ব্যর্থ : {fail} টি group\n⏱️  সময় : {time}s"
	}
};

module.exports.run = async function({ api, event, args, Users, getText }) {
	const { threadID, messageID, senderID, type, messageReply } = event;

	// ── Collect all known threads ─────────────────────────────────
	const allThreads = (global.data?.allThreadID || []).filter(id => String(id) !== String(threadID));

	if (allThreads.length === 0) {
		return api.sendMessage(getText("noThreads"), threadID, messageID);
	}

	// ── Get message content ───────────────────────────────────────
	let broadcastText = args.join(" ").trim();
	let attachment    = [];

	// Support: reply to a message to broadcast it
	if (!broadcastText && type === "message_reply" && messageReply) {
		broadcastText = messageReply.body || "";
		if (messageReply.attachments?.length > 0) {
			attachment = messageReply.attachments;
		}
	}

	// Support: attachments in the current message
	if (event.attachments?.length > 0) {
		attachment = event.attachments;
	}

	if (!broadcastText && attachment.length === 0) {
		return api.sendMessage(getText("noMessage"), threadID, messageID);
	}

	// ── Get admin name ────────────────────────────────────────────
	let adminName = "Admin";
	try {
		adminName = global.data?.userName?.get(String(senderID))
			|| await Users.getNameUser(senderID)
			|| "Admin";
	} catch (_) {}

	// ── Build broadcast message ───────────────────────────────────
	const now = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
	const header =
		`📢 BROADCAST MESSAGE\n` +
		`━━━━━━━━━━━━━━━━━━━━━━━\n`;
	const footer =
		`\n━━━━━━━━━━━━━━━━━━━━━━━\n` +
		`👑 From : ${adminName}\n` +
		`🕐 Time : ${now}`;

	const fullText = header + broadcastText + footer;

	// ── Notify admin that sending has started ─────────────────────
	await api.sendMessage(
		getText("sending").replace("{total}", allThreads.length),
		threadID, messageID
	);

	// ── Send to all threads with small delay ──────────────────────
	const startTime = Date.now();
	let ok = 0, fail = 0;

	for (const tid of allThreads) {
		try {
			await new Promise((resolve, reject) => {
				const msgObj = attachment.length > 0
					? { body: fullText, attachment }
					: { body: fullText };

				api.sendMessage(msgObj, tid, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
			ok++;
		} catch (_) {
			fail++;
		}
		// Small delay to avoid Facebook rate-limiting
		await new Promise(r => setTimeout(r, 300));
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	return api.sendMessage(
		getText("done")
			.replace("{ok}", ok)
			.replace("{fail}", fail)
			.replace("{time}", elapsed),
		threadID, messageID
	);
};
