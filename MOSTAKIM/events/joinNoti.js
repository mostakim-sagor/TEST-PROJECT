module.exports.config = {
  name: "joinnoti",
  eventType: ["log:subscribe"],
  version: "1.0.6",
  credits: "MOSTAKIM",  //please don't change credit
  description: "Welcome message with optional image/video, dynamic session & profile links",
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

module.exports.onLoad = function () {
  const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
  const { join } = global.nodemodule["path"];
  const paths = [
    join(__dirname, "cache", "botrun.gif"),
    join(__dirname, "cache", "joinGif")
  ];
  for (const path of paths) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }
};

module.exports.run = async function({ api, event, Users, Threads }) {
  const fs = require("fs");
  const path = require("path");
  const { threadID } = event;

  const botPrefix = global.config.PREFIX || "/";
  const botName = global.config.BOTNAME || "𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓";

  // ===================== BOT ADDED =====================
  if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    await api.changeNickname(`[ ${botPrefix} ] • ${botName}`, threadID, api.getCurrentUserID());

    api.sendMessage(`⚡ 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌-𝐕2-𝐁𝐎𝐓 ⚡

Is successfully connected and running ♻️
All services are active and ready to handle your requests 🔥
Thank you for using this system — let’s get started 🚀

☢️ Prefix : ${botPrefix}`, threadID, () => {

      const randomGifPath = path.join(__dirname, "cache", "botrun.gif");

      let selected = null;
      if (fs.existsSync(randomGifPath)) {
        const allFiles = fs.readdirSync(randomGifPath).filter(file =>
          [".mp4", ".jpg", ".png", ".jpeg", ".gif", ".mp3"].some(ext => file.endsWith(ext))
        );

        if (allFiles.length > 0) {
          selected = fs.createReadStream(
            path.join(randomGifPath, allFiles[Math.floor(Math.random() * allFiles.length)])
          );
        }
      }

      if (selected) {
        api.sendMessage({ body: "Bot is now online!♻️", attachment: selected }, threadID);
      }
    });

    return;
  }

  // ===================== USER JOIN =====================
  try {
    const { createReadStream, readdirSync, existsSync } = global.nodemodule["fs-extra"];
    let { threadName, participantIDs } = await api.getThreadInfo(threadID);
    const threadData = global.data.threadData.get(parseInt(threadID)) || {};

    let mentions = [], nameArray = [], memLength = [], i = 0;

    for (let user of event.logMessageData.addedParticipants) {
      nameArray.push(user.fullName);
      mentions.push({ tag: user.fullName, id: user.userFbId });
      memLength.push(participantIDs.length - i++);
    }

    memLength.sort((a, b) => a - b);

    // ===================== SESSION LOGIC =====================
    const now = new Date();
    const hour = now.getHours();
    let session;
    if (hour >= 20 || hour < 6) session = "Night";
    else if (hour >= 6 && hour < 12) session = "Morning";
    else if (hour >= 12 && hour < 17) session = "Afternoon";
    else session = "Evening";

    // ===================== PROFILE LINKS =====================
    const profileLinks = event.logMessageData.addedParticipants
      .map(u => `fb.com/${u.userFbId}`)
      .join('\n');

    // ===================== MAIN JOIN MESSAGE =====================
    let msg = (typeof threadData.customJoin === "undefined") ? 
`Hello ${nameArray.join(', ')}.

Welcome to ${threadName}

✧ Have a nice ${session} 😊

You are member number ${memLength.join(', ')}


${profileLinks}` 
    : threadData.customJoin
        .replace(/\{userName}/g, nameArray.join(', '))
        .replace(/\{boxName}/g, threadName)
        .replace(/\{soThanhVien}/g, memLength.join(', '))
        .replace(/\{session}/g, session)
        .concat(`\nProfile Links:\n${profileLinks}`);

    // ===================== RANDOM JOIN GIF =====================
    const joinGifPath = path.join(__dirname, "cache", "joinGif");

    let randomFile = null;
    if (existsSync(joinGifPath)) {
      const files = readdirSync(joinGifPath).filter(file =>
        [".mp4", ".jpg", ".png", ".jpeg", ".gif", ".mp3"].some(ext => file.endsWith(ext))
      );

      if (files.length > 0) {
        randomFile = createReadStream(
          path.join(joinGifPath, files[Math.floor(Math.random() * files.length)])
        );
      }
    }

    // ===================== SEND MESSAGE =====================
    return api.sendMessage(
      randomFile
        ? { body: msg, attachment: randomFile, mentions }
        : { body: msg, mentions },
      threadID
    );

  } catch (e) {
    console.error(e);
  }
};