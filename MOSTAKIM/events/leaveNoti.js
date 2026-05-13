module.exports.config = {
        name: "leave",
        eventType: ["log:unsubscribe"],
        version: "1.0.0",
        credits: "Mirai Team",
        description: "Thông báo bot hoặc người rời khỏi nhóm",
        dependencies: {
                "fs-extra": "",
                "path": ""
        }
};

module.exports.run = async function({ api, event, Users, Threads }) {
        const fs   = require("fs-extra");
        const path = require("path");
        const { threadID } = event;
        const leftID = String(event.logMessageData?.leftParticipantFbId);

        // Bot itself left — skip
        if (leftID === String(api.getCurrentUserID())) return;

        try {
                const threadData = global.data.threadData.get(String(threadID))
                        || (await Threads.getData(threadID)).data
                        || {};

                const name = global.data.userName.get(leftID)
                        || await Users.getNameUser(leftID);

                const type = (String(event.author) === leftID) ? "left" : "was removed by admin";

                let msg = typeof threadData.customLeave !== "undefined"
                        ? threadData.customLeave
                        : "👋 {name} has {type} the group.";

                msg = msg.replace(/\{name}/g, name).replace(/\{type}/g, type);

                const gifDir  = path.join(__dirname, "cache", "leaveGif");
                const gifPath = path.join(gifDir, `${threadID}.gif`);

                // Fix: create dir if it does NOT exist
                if (!fs.existsSync(gifDir)) fs.mkdirSync(gifDir, { recursive: true });

                const formPush = fs.existsSync(gifPath)
                        ? { body: msg, attachment: fs.createReadStream(gifPath) }
                        : { body: msg };

                return api.sendMessage(formPush, threadID);
        } catch (e) { console.error("[leaveNoti]", e.message); }
}