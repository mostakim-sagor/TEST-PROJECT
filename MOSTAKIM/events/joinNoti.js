module.exports.config = {
        name: "joinNoti",
        eventType: ["log:subscribe"],
        version: "1.0.4",
        credits: "Mirai Team",
        description: "Thông báo bot hoặc người vào nhóm",
        dependencies: {
                "fs-extra": ""
        }
};

module.exports.run = async function({ api, event, Users }) {
        const fs   = require("fs-extra");
        const path = require("path");
        const { threadID } = event;
        const addedParticipants = event.logMessageData?.addedParticipants || [];

        // Bot itself was added
        if (addedParticipants.some(i => String(i.userFbId) === String(api.getCurrentUserID()))) {
                try {
                        api.changeNickname(
                                `[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || "MOSTAKIM V2 BOT"}`,
                                threadID, api.getCurrentUserID()
                        );
                } catch (_) {}
                return api.sendMessage(
                        `✅ Hi! I'm ${global.config.BOTNAME || "MOSTAKIM V2 BOT"}!\n` +
                        `🔑 Prefix: ${global.config.PREFIX || "*"}\n` +
                        `💡 Type ${global.config.PREFIX || "*"}help to see all commands!`,
                        threadID
                );
        }

        try {
                const threadInfo  = await new Promise((res, rej) =>
                        api.getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
                );
                const threadName  = threadInfo?.name || "this group";
                const memberCount = (threadInfo?.participantIDs || []).length;
                const threadData  = global.data.threadData.get(String(threadID)) || {};

                const nameArray = [], mentions = [];
                for (const p of addedParticipants) {
                        const uid  = String(p.userFbId);
                        const name = p.fullName || await Users.getNameUser(uid);
                        nameArray.push(name);
                        mentions.push({ tag: name, id: uid });
                        if (!global.data.allUserID.includes(uid)) {
                                await Users.createData(uid, { name, data: {} });
                                global.data.userName.set(uid, name);
                                global.data.allUserID.push(uid);
                        }
                }

                let msg = typeof threadData.customJoin !== "undefined"
                        ? threadData.customJoin
                        : "👋 Welcome {name}!\n🎉 You are member #{soThanhVien} of {threadName}!";

                msg = msg
                        .replace(/\{name}/g, nameArray.join(", "))
                        .replace(/\{type}/g, nameArray.length > 1 ? "you all" : "you")
                        .replace(/\{soThanhVien}/g, memberCount)
                        .replace(/\{threadName}/g, threadName);

                const gifDir  = path.join(__dirname, "cache", "joinGif");
                const gifPath = path.join(gifDir, `${threadID}.gif`);

                // Fix: create dir if it does NOT exist
                if (!fs.existsSync(gifDir)) fs.mkdirSync(gifDir, { recursive: true });

                const formPush = fs.existsSync(gifPath)
                        ? { body: msg, attachment: fs.createReadStream(gifPath), mentions }
                        : { body: msg, mentions };

                return api.sendMessage(formPush, threadID);
        } catch (e) { console.error("[joinNoti]", e.message); }
}