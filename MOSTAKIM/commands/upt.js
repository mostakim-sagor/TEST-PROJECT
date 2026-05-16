const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "upt",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "MOSTAKIM", //please don't change credit
  description: "Monitoring for your Messenger robot 24 hour active",
  commandCategory: "system",
  usages: "[upt]",
  cooldowns: 3
};

module.exports.onLoad = () => {
  const dir = path.join(__dirname, "noprefix");
  const imgPath = path.join(dir, "upt.png");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(imgPath)) {
    request("https://i.imgur.com/W8DS6ye.png").pipe(fs.createWriteStream(imgPath));
  }
};

function sendUptime(api, threadID, messageID) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const dir = path.join(__dirname, "noprefix");
  const imgPath = path.join(dir, "upt.png");

  const message = `
╔═══════════════════╗
║      🕧 𝗨𝗣𝗧𝗜𝗠𝗘 𝗥𝗢𝗕𝗢𝗧 🕧       
╠═══════════════════╣
║ 𝗦𝗬𝗦𝗧𝗘𝗠 𝗥𝗨𝗡𝗡𝗜𝗡𝗚 𝗧𝗜𝗠𝗘         
╠═══════════════════╣
║ ⏱ 𝗛𝗢𝗨𝗥𝗦   : ${hours}
║ ⏱ 𝗠𝗜𝗡𝗨𝗧𝗘 : ${minutes}
║ ⏱ 𝗦𝗘𝗖𝗢𝗡𝗗 : ${seconds}
╚═══════════════════╝
`;

  return api.sendMessage({
    body: message,
    attachment: fs.createReadStream(imgPath)
  }, threadID, messageID);
}

module.exports.handleEvent = async function({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  const text = body.trim().toLowerCase();
  if (text === "up" || text === "upt") {
    return sendUptime(api, threadID, messageID);
  }
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;
  return sendUptime(api, threadID, messageID);
};
