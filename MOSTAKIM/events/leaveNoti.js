module.exports.config = {
  name: "leave",
  eventType: ["log:unsubscribe"],
  version: "1.0.0",
  credits: "MOSTAKIM", // please don't change credit
  description: "Notify when someone leaves the group",
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

module.exports.run = async function({ api, event, Users, Threads }) {
  if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

  const { createReadStream, existsSync, mkdirSync } = global.nodemodule["fs-extra"];
  const { join } = global.nodemodule["path"];
  const { threadID } = event;

  const data = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data;
  const uid = event.logMessageData.leftParticipantFbId;
  const name = global.data.userName.get(uid) || await Users.getNameUser(uid);

  const type = (event.author == uid)
    ? `╭─❍「 𝐌𝐄𝐌𝐁𝐄𝐑 𝐋𝐄𝐅𝐓 」
│
├ ✦ ${name} left without permission!
│
├ ✦ Profile:
├ ✦ fb.com/${uid}
╰───────────────⭓`
    : `╭─❍「 𝐌𝐄𝐌𝐁𝐄𝐑 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 」
│
├ ✦ ${name} was kicked from the group ...
│
├ ✦ Profile:
├ ✦ fb.com/${uid}
╰───────────────⭓`;

  const path = join(__dirname, "mostakim", "leaveGif");
  const gifPath = join(path, "leave.gif");

  if (!existsSync(path)) mkdirSync(path, { recursive: true });

  let msg = (typeof data.customLeave == "undefined")
    ? `╔══════════════════════╗
║   👋  𝐆𝐎𝐎𝐃𝐁𝐘𝐄 𝐌𝐄𝐒𝐒𝐀𝐆𝐄   ║
╚══════════════════════╝

{name}

{type}

━━━━━━━━━━━━━━━━━━━━━━━
✦─── 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓 ───✦
━━━━━━━━━━━━━━━━━━━━━━━`
    : data.customLeave;

  msg = msg.replace(/\{name}/g, name).replace(/\{type}/g, type);

  const formPush = existsSync(gifPath)
    ? { body: msg, attachment: createReadStream(gifPath) }
    : { body: msg };

  return api.sendMessage(formPush, threadID);
};