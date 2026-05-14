module.exports.config = {
	name: "joinNoti",
	eventType: ["log:subscribe"],
	version: "2.0.0",
	credits: "MOSTAKIM",
	description: "Welcome message when a member joins the group"
};

module.exports.run = async function({ api, event, Users, Threads }) {
	const fs   = require("fs-extra");
	const path = require("path");
	const { threadID } = event;
	const addedParticipants = event.logMessageData?.addedParticipants || [];
	if (!addedParticipants.length) return;

	const botID = String(api.getCurrentUserID());

	// ── Bot itself was added to a group ──────────────────────────────────
	if (addedParticipants.some(p => String(p.userFbId) === botID)) {
		const prefix  = global.config?.PREFIX || "*";
		const botName = global.config?.BOTNAME || "MOSTAKIM GOAT BOT";
		try {
			api.changeNickname(`[ ${prefix} ] • ${botName}`, threadID, botID);
		} catch (_) {}
		return api.sendMessage(
			`👋 Hello everyone!\n\n` +
			`🤖 I'm ${botName}\n` +
			`🔑 My prefix is: [ ${prefix} ]\n` +
			`💡 Type ${prefix}help to see all commands!\n\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`⚡ Powered by MOSTAKIM V2`,
			threadID
		);
	}

	// ── Regular member(s) joined ─────────────────────────────────────────
	try {
		// Get thread info
		const threadInfo = await new Promise((res, rej) =>
			api.getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
		).catch(() => ({}));

		const threadName  = threadInfo?.name || "the group";
		const memberCount = (threadInfo?.participantIDs || []).length;

		// Collect joined members
		const names    = [];
		const mentions = [];

		for (const p of addedParticipants) {
			const uid  = String(p.userFbId);
			if (uid === botID) continue;

			const name = p.fullName
				|| global.data?.userName?.get(uid)
				|| await Users.getNameUser(uid).catch(() => uid);

			names.push(name);
			mentions.push({ tag: name, id: uid });

			// Register in DB if new
			if (!global.data.allUserID.includes(uid)) {
				await Users.createData(uid, { name, data: {} }).catch(() => {});
				global.data.userName?.set(uid, name);
				global.data.allUserID.push(uid);
			}
		}

		if (!names.length) return;

		// ── Build message ──────────────────────────────────────────────
		// Check for custom join message set via *setjoin
		const threadData = global.data?.threadData?.get(String(threadID))
			|| (await Threads.getData(threadID).catch(() => ({ data: {} }))).data
			|| {};

		let msg;
		if (typeof threadData.customJoin === "string" && threadData.customJoin) {
			// Custom message with placeholders
			msg = threadData.customJoin
				.replace(/\{name}/g,        names.join(", "))
				.replace(/\{type}/g,        names.length > 1 ? "you all" : "you")
				.replace(/\{soThanhVien}/g, String(memberCount))
				.replace(/\{threadName}/g,  threadName);
		} else {
			// Default English welcome
			const now = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
			const multiple = names.length > 1;
			msg =
				`╔══════════════════════╗\n` +
				`║     WELCOME TO GROUP!     ║\n` +
				`╚══════════════════════╝\n\n` +
				`👋 Welcome, ${names.map(n => `@${n}`).join(" & ")}!\n\n` +
				`📍 Group  : ${threadName}\n` +
				`👥 Members: ${memberCount} people\n` +
				`🕐 Joined : ${now}\n\n` +
				`━━━━━━━━━━━━━━━━━━━━━━━\n` +
				`🎉 Glad to have ${multiple ? "you all" : "you"} here!\n` +
				`Type ${global.config?.PREFIX || "*"}help to see bot commands.`;
		}

		// ── Check for custom GIF ───────────────────────────────────────
		const gifDir  = path.join(__dirname, "cache", "joinGif");
		const gifPath = path.join(gifDir, `${threadID}.gif`);
		if (!fs.existsSync(gifDir)) fs.mkdirSync(gifDir, { recursive: true });

		const msgObj = fs.existsSync(gifPath)
			? { body: msg, attachment: fs.createReadStream(gifPath), mentions }
			: { body: msg, mentions };

		return api.sendMessage(msgObj, threadID);
	} catch (e) {
		console.error("[joinNoti]", e.message);
	}
};
