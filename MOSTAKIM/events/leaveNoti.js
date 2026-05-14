module.exports.config = {
	name: "leaveNoti",
	eventType: ["log:unsubscribe"],
	version: "2.0.0",
	credits: "MOSTAKIM",
	description: "Leave message when a member leaves or is removed from the group"
};

module.exports.run = async function({ api, event, Users, Threads }) {
	const fs   = require("fs-extra");
	const path = require("path");
	const { threadID } = event;

	const leftID = String(event.logMessageData?.leftParticipantFbId || "");
	if (!leftID) return;

	// ── Bot itself left — skip ───────────────────────────────────────────
	if (leftID === String(api.getCurrentUserID())) return;

	try {
		// Get the leaver's name
		const name = global.data?.userName?.get(leftID)
			|| await Users.getNameUser(leftID).catch(() => leftID);

		// Determine if self-left or was removed
		const selfLeft = String(event.author) === leftID;
		const action   = selfLeft ? "left the group" : "was removed from the group";
		const icon     = selfLeft ? "🚪" : "🔨";

		// Check for custom leave message set via *setleave
		const threadData = global.data?.threadData?.get(String(threadID))
			|| (await Threads.getData(threadID).catch(() => ({ data: {} }))).data
			|| {};

		let msg;
		if (typeof threadData.customLeave === "string" && threadData.customLeave) {
			msg = threadData.customLeave
				.replace(/\{name}/g, name)
				.replace(/\{type}/g, action);
		} else {
			// Default English leave message
			const now = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" });
			msg =
				`${icon} Member Left\n` +
				`━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
				`👤 ${name} has ${action}.\n` +
				`🕐 Time: ${now}\n\n` +
				`We hope to see them again! 👋`;
		}

		// ── Check for custom GIF ─────────────────────────────────────────
		const gifDir  = path.join(__dirname, "cache", "leaveGif");
		const gifPath = path.join(gifDir, `${threadID}.gif`);
		if (!fs.existsSync(gifDir)) fs.mkdirSync(gifDir, { recursive: true });

		const msgObj = fs.existsSync(gifPath)
			? { body: msg, attachment: fs.createReadStream(gifPath) }
			: { body: msg };

		return api.sendMessage(msgObj, threadID);
	} catch (e) {
		console.error("[leaveNoti]", e.message);
	}
};
