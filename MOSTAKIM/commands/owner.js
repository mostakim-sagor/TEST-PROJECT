const request = require("request");
const fs = require("fs-extra");

module.exports.config = {
  name: "owner",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "MOSTAKIM",
  description: "Show Owner Info with styled box & random photo",
  commandCategory: "Information",
  usages: "owner",
  cooldowns: 2
};

module.exports.run = async function ({ api, event }) {

  
  const info = `
╔═════════════════════ ✿
║ ✨ 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢 ✨
╠═════════════════════ ✿
║ 👑 𝗡𝗮𝗺𝗲 : MOSTAKIM ISLAM SAGOR
║ 🎂 𝗔𝗴𝗲 : 20 +
║ 💘 𝗥𝗲𝗹𝗮𝘁𝗶𝗼𝗻 : SINGLE 
║ 🎓 𝗣𝗿𝗼𝗳𝗲𝘀𝘀𝗶𝗼𝗻 : STUDENT
║ 📚 𝗘𝗱𝘂𝗰𝗮𝘁𝗶𝗼𝗻 : HSC
║ 🏡 𝗔𝗱𝗱𝗿𝗲𝘀𝘀 : DHAKA, BANGLADESH 
╠═════════════════════ ✿
║ 🔗 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗟𝗜𝗡𝗞𝗦
╠═════════════════════ ✿
║ 📘 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 :
║ https://www.facebook.com/100058112936375
║ ✈️ 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 :
║ t.me/M0STAKIM10X
╚═════════════════════ ✿
┌───────────────⭓
│ 🕒 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗧𝗶𝗺𝗲
├───────────────
│ ${time}
└───────────────⭓
`;

  const images = [
    "https://i.imgur.com/TNPPtjT.jpeg",
  ];

  const randomImg = images[Math.floor(Math.random() * images.length)];

  const callback = () => api.sendMessage(
    {
      body: info,
      attachment: fs.createReadStream(__dirname + "/cache/owner.jpg")
    },
    event.threadID,
    () => fs.unlinkSync(__dirname + "/cache/owner.jpg")
  );

  return request(encodeURI(randomImg))
    .pipe(fs.createWriteStream(__dirname + "/cache/owner.jpg"))
    .on("close", () => callback());
};
