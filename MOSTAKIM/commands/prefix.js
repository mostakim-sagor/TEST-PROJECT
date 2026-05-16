module.exports.config = {
  name: "prefix",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "MOSTAKIM",
  description: "Display the bot's prefix and owner info",
  commandCategory: "Information",
  usages: "",
  cooldowns: 5
};

module.exports.handleEvent = async ({ event, api, Threads }) => {
  var { threadID, messageID, body } = event;
  if (!body) return;

  var dataThread = await Threads.getData(threadID);
  var data = dataThread.data || {};
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const prefix = threadSetting.PREFIX || global.config.PREFIX;
  const groupName = dataThread.threadInfo?.threadName || "Unnamed Group";

  const triggerWords = [
    "prefix", "Prefix", "bot prefix", "what is the prefix", "bot name",
    "how to use bot", "bot not working", "bot is offline", "/", "?",
    "perfix", "bot not talking", "where is bot", "bot dead", "bots dead",
    ".", "!", "what prefix", "MOSTAKIM V2 BOT", "what is bot", "what prefix bot",
    "how use bot", "where are the bots", "where prefix"
  ];

  let lowerBody = body.toLowerCase();

  if (triggerWords.includes(lowerBody)) {
    return api.sendMessage(
`╔════════════════════╗
      『 𝗣𝗥𝗘𝗙𝗜𝗫 𝗜𝗡𝗙𝗢 』
╚════════════════════╝

╭─❍「 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢 」
├ ✦ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 : 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓
├ ✦ 𝗣𝗿𝗲𝗳𝗶𝘅   : ${prefix}
╰───────────────⭓

╭─❍「 𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗙𝗢 」
├ ✦ 𝗚𝗿𝗼𝘂𝗽 𝗡𝗮𝗺𝗲 : ${groupName}
├ ✦ 𝗚𝗿𝗼𝘂𝗽 𝗧𝗜𝗗  : ${threadID}
├ ✦ 𝗚𝗿𝗼𝘂𝗽 𝗣𝗿𝗲𝗳𝗶𝘅 : ${prefix}
╰───────────────⭓

╭─❍「 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢 」
├ ✦ 𝗡𝗮𝗺𝗲 : 𝐌𝐃 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐈𝐒𝐋𝐀𝐌 𝐒𝐀𝐆𝐎𝐑
├ ✦ 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 : www.facebook.com/100058112936375
├ ✦ 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 : t.me/M0STAKIM10X
╰───────────────⭓

╔════════════════════╗
   𝗧𝗛𝗔𝗡𝗞𝗦 𝗙𝗢𝗥 𝗨𝗦𝗜𝗡𝗚
    ⚡ 𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓 ⚡
╚════════════════════╝`,
      threadID,
      null
    );
  }
};

module.exports.run = async ({ event, api }) => {
  return api.sendMessage(
    "Type 'prefix' or similar to get the bot info.",
    event.threadID
  );
};