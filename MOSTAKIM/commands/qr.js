module.exports.config = {
	name: "qr",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Mã hoá văn bản bằng mã QR",
	commandCategory: "other",
	usages: "[text]",
	cooldowns: 5,
	dependencies: {
		"qrcode": "",
		"fs-extra": ""
	}
};

module.exports.languages = {
	"vi": {
		"missingInput": "Hãy nhập đầu vào để có thể tạo qr code"
	},
	"en": {
		"missingInput": "Enter input to create qr code"
	}
}

module.exports.run = async function({ api, event, args, getText }) {
	const fs = require("fs-extra");
	const QRCode = require("qrcode");
	const path = require("path");

	const text = args.join(" ");
	if (!text) return api.sendMessage(getText("missingInput"), event.threadID);

	const cacheDir = path.join(__dirname, "cache");
	if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

	const outFile = path.join(cacheDir, "qr.png");
	const opt = {
		errorCorrectionLevel: "H",
		type: "image/png",
		quality: 0.3,
		scale: 50,
		margin: 1,
		color: { dark: "#000000", light: "#ffffff" }
	};

	api.sendTypingIndicator(event.threadID, () =>
		QRCode.toFile(outFile, text, opt, (err) => {
			if (err) return api.sendMessage("❌ QR generation error: " + err.message, event.threadID);
			api.sendMessage(
				{ attachment: fs.createReadStream(outFile) },
				event.threadID,
				() => fs.unlinkSync(outFile),
				event.messageID
			);
		})
	);
}
