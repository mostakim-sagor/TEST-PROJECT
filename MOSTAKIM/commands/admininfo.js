const axios = require("axios");
const request = require("request");
const fs = require("fs-extra");
const moment = require("moment-timezone");

module.exports.config = {
 name: "admin",
 version: "1.0.0",
 hasPermssion: 0,
 credits: "MOSTAKIM",
 description: "Show Owner Info",
 commandCategory: "info",
 usages: "admin",
 cooldowns: 2
};

module.exports.run = async function({ api, event }) {
 const time = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");

 const callback = () => api.sendMessage({
 body: `
┌───────────────⭓
│ 𝗔𝗗𝗠𝗜𝗡 𝗗𝗘𝗧𝗔𝗜𝗟𝗦
├───────────────
│ 👤 𝐍𝐚𝐦𝐞 : MOSTAKIM ISLAM SAGOR
│ 🚹 𝐆𝐞𝐧𝐝𝐞𝐫 : Male
│ ❤️ 𝐑𝐞𝐥𝐚𝐭𝐢𝐨𝐧 : Single
│ 🎂 𝐀𝐠𝐞 : 20+
│ 🕌 𝐑𝐞𝐥𝐢𝐠𝐢𝐨𝐧 : Islam
│ 🎓 𝐄𝐝𝐮𝐜𝐚𝐭𝐢𝐨𝐧 : HSC 
│ 🏡 𝐀𝐝𝐝𝐫𝐞𝐬𝐬 : Dhaka, Bangladesh
└───────────────⭓

┌───────────────⭓
│ 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗟𝗜𝗡𝗞𝗦
├───────────────
│ 📘 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸:
│https://www.facebook.com/100058112936375
│ 💬  𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 :
│ t.me/M0STAKIM10X
└───────────────⭓

┌───────────────⭓
│ 🕒 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 𝗧𝗶𝗺𝗲
├───────────────
│ ${time}
└───────────────⭓
 `,
 attachment: fs.createReadStream(__dirname + "/cache/owner.jpg")
 }, event.threadID, () => fs.unlinkSync(__dirname + "/cache/owner.jpg"));

 return request("https://i.imgur.com/TNPPtjT.jpeg")
 .pipe(fs.createWriteStream(__dirname + '/cache/owner.jpg'))
 .on('close', () => callback());
};
