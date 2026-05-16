const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
  name: "antiProtect",
  version: "3.3.0",
  credits: "MOSTAKIM",  //please don't change credit
  description: "Protect group name, photo, description, emoji, color/theme with warning GIF & user mention",
  eventType: [
    "log:thread-name",
    "log:thread-icon",
    "log:thread-description",
    "log:thread-emoji",
    "log:thread-color"
  ],
  cooldowns: 2
};

module.exports.run = async function ({ api, event }) {
  try {
    const threadID = event.threadID;
    const senderID = event.author || event.senderID;

    // Folder for cache
    const dir = `${__dirname}/../../cache/antiProtect/`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dataFile = dir + `${threadID}.json`;

    // Thread info
    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = (threadInfo.adminIDs || []).map(i => i.id);
    const botID = api.getCurrentUserID();
    const isAdmin = adminIDs.includes(senderID);
    const botAdmin = adminIDs.includes(botID);
    if (!botAdmin) return;

    // Save initial snapshot
    if (!fs.existsSync(dataFile)) {
      const snap = {
        name: threadInfo.threadName || "😒",
        image: threadInfo.imageSrc || null,
        description: threadInfo?.threadDescription || "😒",
        emoji: threadInfo?.emoji || "😒",
        color: threadInfo?.threadColor || "😒"
      };
      fs.writeFileSync(dataFile, JSON.stringify(snap, null, 2));
      return;
    }

    const old = JSON.parse(fs.readFileSync(dataFile));

    // Update snapshot if admin or bot
    if (isAdmin || senderID == botID) {
      const snap = {
        name: threadInfo.threadName,
        image: threadInfo.imageSrc,
        description: threadInfo?.threadDescription || "",
        emoji: threadInfo?.emoji || "",
        color: threadInfo?.threadColor || ""
      };
      fs.writeFileSync(dataFile, JSON.stringify(snap, null, 2));
      return;
    }

    // Local warning GIF path
    const warningImage = __dirname + "/../../cache/antiprotect.gif";

    // Create mention object
    const mentions = [
      {
        tag: threadInfo.nicknames?.[senderID] || senderID,
        id: senderID
      }
    ];

    switch (event.logMessageType) {

      case "log:thread-name": {
        await api.setTitle(old.name, threadID).catch(() => {});

        return api.sendMessage({
          body: `🚫 Group name change blocked!\n👤 User: @${threadInfo.nicknames?.[senderID] || senderID}\nRestored to: "${old.name}"`,
          mentions,
          attachment: fs.createReadStream(warningImage)
        }, threadID);
      }

      case "log:thread-icon": {
        try {
          if (old.image) {
            const res = await axios.get(old.image, { responseType: "arraybuffer" });
            const buf = Buffer.from(res.data, "binary");
            await api.changeGroupImage(buf, threadID);
          }
        } catch {}

        return api.sendMessage({
          body: `🚫 Group photo change blocked!\n👤 User: @${threadInfo.nicknames?.[senderID] || senderID}\nOld photo restored.`,
          mentions,
          attachment: fs.createReadStream(warningImage)
        }, threadID);
      }

      case "log:thread-description": {
        await api.setThreadDescription(old.description, threadID).catch(() => {});

        return api.sendMessage({
          body: `🚫 Group description change blocked!\n👤 User: @${threadInfo.nicknames?.[senderID] || senderID}\nrestored. to old description.`,
          mentions,
          attachment: fs.createReadStream(warningImage)
        }, threadID);
      }

      case "log:thread-emoji": {
        await api.setThreadEmoji(old.emoji, threadID).catch(() => {});

        return api.sendMessage({
          body: `🚫 Group emoji change blocked!\n👤 User: @${threadInfo.nicknames?.[senderID] || senderID}\nrestored. to old emoji.`,
          mentions,
          attachment: fs.createReadStream(warningImage)
        }, threadID);
      }

      case "log:thread-color": {
        await api.setThreadColor(old.color, threadID).catch(() => {});

        return api.sendMessage({
          body: `🚫 Group color/theme change blocked!\n👤 User: @${threadInfo.nicknames?.[senderID] || senderID}\nrestored. to old color/theme.`,
          mentions,
          attachment: fs.createReadStream(warningImage)
        }, threadID);
      }

    }

  } catch (e) {
    console.log("antiProtect Error:", e);
  }
};