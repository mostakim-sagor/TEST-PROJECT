module.exports.config = {
	name: "osu",
	version: "1.0.2",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Lấy thông tin osu thông qua tên người dùng",
	commandCategory: "other",
	usages: "osu username",
	cooldowns: 5,
	dependencies: {
		"request": "",
		"fs-extra": ""
	}
};

module.exports.languages = {
	"vi": {
		"missingUsername": "Hãy nhập username mà bạn muốn tìm kiếm thông tin"
	},
	"en": {
		"missingUsername": "Missing username!"
	}
}

module.exports.run = function({ event, api, args, getText }) {
	if (args.length == 0) return api.sendMessage(getText("missingUsername"), event.threadID, event.messageID);

	const request = require("request");
	const fs = require("fs-extra");
	const path = require("path");

	const cacheDir = path.join(__dirname, "cache");
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

	const outFile = path.join(cacheDir, `${event.senderID}-osu.png`);
	const url = `http://lemmmy.pw/osusig/sig.php?colour=hex8866ee&uname=${encodeURIComponent(args.join(" "))}&pp=1&countryrank&rankedscore&onlineindicator=undefined&xpbar&xpbarhex`;

	request(url)
		.pipe(fs.createWriteStream(outFile))
		.on("close", () =>
			api.sendMessage(
				{ attachment: fs.createReadStream(outFile) },
				event.threadID,
				() => { try { fs.unlinkSync(outFile); } catch(_) {} },
				event.messageID
			)
		)
		.on("error", (e) => api.sendMessage("❌ Osu error: " + e.message, event.threadID, event.messageID));
}
