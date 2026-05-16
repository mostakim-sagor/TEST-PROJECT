module.exports.config = {
 name: "antiout",
 eventType: ["log:unsubscribe"],
 version: "0.0.1",
 credits: "MOSTAKIM",  //please don't change credit
 description: "Listen events"
};

module.exports.run = async({ event, api, Threads, Users }) => {
 let data = (await Threads.getData(event.threadID)).data || {};
 if (data.antiout == false) return;
 if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;
 const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || await Users.getNameUser(event.logMessageData.leftParticipantFbId);
 const type = (event.author == event.logMessageData.leftParticipantFbId) ? "self-separation" : "Koi Ase Pichware Mai Lath Marta Hai?";
 if (type == "self-separation") {
  api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID, (error, info) => {
   if (error) {
    api.sendMessage(`সরি বস, ${name} কে আবার এড করতে পারলাম না!\n──────𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓─────`, event.threadID)
   } else api.sendMessage(`শোন, ${name}, - নিয়ম ভুলে গেলে চলবে না!\n
- এডমিনের অনুমতি ছাড়া গ্রুপ থেকে লিভ নিলে\n - আবার অটো “রিটার্ন টিকিট” ইস্যু হয়ে যায় ! 🚀
\n──────𝐌𝐎𝐒𝐓𝐀𝐊𝐈𝐌 𝐕𝟐 𝐁𝐎𝐓─────`, event.threadID);
  })
 }
}