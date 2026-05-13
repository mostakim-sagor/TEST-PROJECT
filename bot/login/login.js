const fs = require("fs-extra");
const path = require("path");
const login = require("mostakim-fca");

const log = require("../../utils/log.js");

const ROOT        = path.join(__dirname, "../../");
const accountPath = path.join(ROOT, "account.txt");
const config      = global.GoatBot.config;

// ─── Setup global.config ─────────────────────────────────────────────────
function setupGlobalConfig() {
        if (!global.config) {
                global.config = {
                        PREFIX:        config.prefix       || "*",
                        BOTNAME:       config.nickNameBot  || "MOSTAKIM BOT",
                        ADMINBOT:      (config.adminBot    || []).map(String),
                        language:      config.language     || "en",
                        allowInbox:    !config.antiInbox,
                        DeveloperMode: false,
                        autoCreateDB:  true,
                        DATABASE: { sqlite: { storage: "database/db.sqlite" } }
                };
        }
        if (!global.configModule) global.configModule = {};
}

// ─── Setup global.data ───────────────────────────────────────────────────
function setupGlobalData() {
        if (!global.data) global.data = {};
        global.data.allUserID       = global.data.allUserID       || [];
        global.data.allCurrenciesID = global.data.allCurrenciesID || [];
        global.data.allThreadID     = global.data.allThreadID     || [];
        global.data.userName        = global.data.userName        || new Map();
        global.data.threadInfo      = global.data.threadInfo      || new Map();
        global.data.threadData      = global.data.threadData      || new Map();
        global.data.threadAllowNSFW = global.data.threadAllowNSFW || [];
        global.data.userBanned      = global.data.userBanned      || new Map();
        global.data.threadBanned    = global.data.threadBanned    || new Map();
}

// ─── Setup global.client ─────────────────────────────────────────────────
function setupGlobalClient() {
        global.client.commands       = global.client.commands      || new Map();
        global.client.events         = global.client.events        || new Map();
        global.client.handleReply    = global.client.handleReply   || [];
        global.client.handleReaction = global.client.handleReaction|| [];
        global.client.cooldowns      = global.client.cooldowns     || new Map();
        global.client.mainPath       = ROOT;
        global.client.timeStart      = global.client.timeStart     || Date.now();
        global.client.configPath     = path.join(ROOT, "config.json");

        // global.moduleData — used by commands like shortcut, fishing, etc.
        if (!global.moduleData) global.moduleData = {};

        // global.config.version — used by fishing.js semver check
        try {
                const pkg = require(path.join(ROOT, "package.json"));
                if (global.config && !global.config.version) global.config.version = pkg.version || "1.0.0";
        } catch (_) {}
}

// ─── global.nodemodule proxy ─────────────────────────────────────────────
function setupNodeModule() {
        global.nodemodule = new Proxy({}, {
                get(_, pkg) {
                        try { return require(pkg); } catch (e) { return null; }
                }
        });
}

// ─── global.utils ────────────────────────────────────────────────────────
function setupUtils() {
        if (!global.utils) global.utils = {};
        global.utils.throwError = (name, threadID, messageID) => {
                try {
                        if (global.client?.api && threadID)
                                global.client.api.sendMessage(`❌ Error in command: ${name}`, threadID, messageID);
                } catch (_) {}
        };
        global.utils.sleep = (ms) => new Promise(r => setTimeout(r, ms));
        global.utils.formatNumber = (n) => Number(n).toLocaleString();
        global.utils.downloadFile = async (url, dest) => {
                const axios = require("axios");
                const writer = require("fs").createWriteStream(dest);
                const res = await axios({ url, method: "GET", responseType: "stream" });
                res.data.pipe(writer);
                return new Promise((ok, fail) => {
                        writer.on("finish", ok);
                        writer.on("error", fail);
                });
        };
}

// ─── getText ─────────────────────────────────────────────────────────────
function setupGetText() {
        const langPath = path.join(ROOT, `languages/${config.language || "en"}.lang`);
        let langData = {};
        try {
                const raw = fs.readFileSync(langPath, "utf-8");
                for (const line of raw.split("\n")) {
                        if (line.startsWith("#") || !line.trim()) continue;
                        const eq = line.indexOf("=");
                        if (eq === -1) continue;
                        langData[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/\\n/g, "\n");
                }
        } catch (e) { /* no lang file */ }

        global.getText = function (module, key, ...args) {
                let text = langData[`${module}.${key}`] || key;
                for (let i = 0; i < args.length; i++)
                        text = text.replace(new RegExp(`%${i + 1}`, "g"), String(args[i]));
                return text;
        };
}

// ─── Per-command getText (supports module.exports.languages) ──────────────
function makeGetText(mod) {
        const lang = config.language || "en";
        if (mod.languages) {
                return (key, ...args) => {
                        let text = mod.languages[lang]?.[key]
                                || mod.languages["en"]?.[key]
                                || mod.languages["vi"]?.[key]
                                || key;
                        for (let i = 0; i < args.length; i++)
                                text = text.replace(new RegExp(`%${i + 1}`, "g"), String(args[i]));
                        return text;
                };
        }
        return (key, ...p) => global.getText(mod.config?.name || "bot", key, ...p);
}

// ─── Build DB helper objects (Users / Threads) ────────────────────────────
function buildDBHelpers(models) {
        const api = () => global.client.api;

        // ── Users helper ──
        const Users = {
                async getNameUser(userID) {
                        try {
                                const uid = String(userID);
                                if (global.data.userName.has(uid)) return global.data.userName.get(uid);
                                const row = await models.model.Users.findOne({ where: { userID } });
                                if (row?.name) { global.data.userName.set(uid, row.name); return row.name; }
                                // fallback: ask Facebook
                                const info = await new Promise((res, rej) =>
                                        api().getUserInfo(uid, (e, d) => e ? rej(e) : res(d))
                                );
                                const name = info?.[uid]?.name || uid;
                                global.data.userName.set(uid, name);
                                return name;
                        } catch (e) { return String(userID); }
                },
                async getData(userID) {
                        try {
                                let row = await models.model.Users.findOne({ where: { userID } });
                                if (!row) {
                                        row = await models.model.Users.create({ userID, name: "", data: {} });
                                        if (!global.data.allUserID.includes(String(userID)))
                                                global.data.allUserID.push(String(userID));
                                }
                                return { data: row.data || {}, name: row.name || "" };
                        } catch (e) { return { data: {}, name: "" }; }
                },
                async setData(userID, updates) {
                        try {
                                await models.model.Users.update(updates, { where: { userID } });
                        } catch (e) { /* silent */ }
                },
                async createData(userID, obj = {}) {
                        try {
                                const [row] = await models.model.Users.findOrCreate({
                                        where: { userID },
                                        defaults: { userID, name: obj.name || "", data: obj.data || {} }
                                });
                                if (!global.data.allUserID.includes(String(userID)))
                                        global.data.allUserID.push(String(userID));
                                if (obj.name) global.data.userName.set(String(userID), obj.name);
                                return row;
                        } catch (e) { return null; }
                }
        };

        // ── Threads helper ──
        const Threads = {
                async getData(threadID) {
                        try {
                                let row = await models.model.Threads.findOne({ where: { threadID } });
                                if (!row) {
                                        let threadInfo = {};
                                        try {
                                                threadInfo = await new Promise((res, rej) =>
                                                        api().getThreadInfo(String(threadID), (e, d) => e ? rej(e) : res(d))
                                                );
                                        } catch (_) {}
                                        row = await models.model.Threads.create({
                                                threadID,
                                                threadInfo,
                                                data: {}
                                        });
                                        if (!global.data.allThreadID.includes(String(threadID)))
                                                global.data.allThreadID.push(String(threadID));
                                        global.data.threadData.set(String(threadID), {});
                                }
                                return { threadInfo: row.threadInfo || {}, data: row.data || {} };
                        } catch (e) { return { threadInfo: {}, data: {} }; }
                },
                async setData(threadID, updates) {
                        try {
                                await models.model.Threads.update(updates, { where: { threadID } });
                                if (updates.data) global.data.threadData.set(String(threadID), updates.data);
                        } catch (e) { /* silent */ }
                },
                async createData(threadID, threadInfo = {}, data = {}) {
                        try {
                                const [row] = await models.model.Threads.findOrCreate({
                                        where: { threadID },
                                        defaults: { threadID, threadInfo, data }
                                });
                                if (!global.data.allThreadID.includes(String(threadID)))
                                        global.data.allThreadID.push(String(threadID));
                                global.data.threadData.set(String(threadID), data);
                                return row;
                        } catch (e) { return null; }
                }
        };

        return { Users, Threads };
}

// ─── Load commands & events ───────────────────────────────────────────────
function loadModules() {
        const commandsDir = path.join(ROOT, "MOSTAKIM/commands");
        const eventsDir   = path.join(ROOT, "MOSTAKIM/events");

        const cmdFiles = fs.existsSync(commandsDir)
                ? fs.readdirSync(commandsDir).filter(f => f.endsWith(".js") && !f.startsWith("_"))
                : [];

        for (const file of cmdFiles) {
                try {
                        const cmd = require(path.join(commandsDir, file));
                        if (cmd.config?.name) {
                                global.client.commands.set(cmd.config.name.toLowerCase(), cmd);
                                if (cmd.config.envConfig) {
                                        const envKey = cmd.config.name;
                                        global.configModule[envKey] = Object.assign(
                                                {}, cmd.config.envConfig,
                                                global.GoatBot.configCommands?.envCommands?.[envKey] || {}
                                        );
                                }
                                                // Run onLoad if exists (handle both sync and async)
                                if (typeof cmd.onLoad === "function") {
                                        try {
                                                const result = cmd.onLoad();
                                                if (result && typeof result.catch === "function")
                                                        result.catch(e => log.warn("LOAD CMD", `${file} onLoad: ${e.message}`));
                                        } catch (e) { log.warn("LOAD CMD", `${file} onLoad: ${e.message}`); }
                                }
                        }
                } catch (e) {
                        log.warn("LOAD CMD", `${file}: ${e.message}`);
                }
        }

        const evtFiles = fs.existsSync(eventsDir)
                ? fs.readdirSync(eventsDir).filter(f => f.endsWith(".js") && !f.startsWith("_"))
                : [];

        for (const file of evtFiles) {
                try {
                        const evt = require(path.join(eventsDir, file));
                        if (evt.config?.name) {
                                global.client.events.set(evt.config.name.toLowerCase(), evt);
                                if (evt.config.envConfig) {
                                        const envKey = evt.config.name;
                                        global.configModule[envKey] = Object.assign(
                                                {}, evt.config.envConfig,
                                                global.GoatBot.configCommands?.envEvents?.[envKey] || {}
                                        );
                                }
                        }
                } catch (e) {
                        log.warn("LOAD EVT", `${file}: ${e.message}`);
                }
        }

        log.success("MODULES", `Loaded ${global.client.commands.size} commands & ${global.client.events.size} events`);
}

// ─── SQLite database ──────────────────────────────────────────────────────
async function setupDatabase() {
        try {
                fs.ensureDirSync(path.join(ROOT, "database"));
                const { Sequelize } = require("sequelize");
                const sequelize = new Sequelize({
                        dialect: "sqlite",
                        storage: path.join(ROOT, "database/db.sqlite"),
                        logging: false,
                        transactionType: "IMMEDIATE",
                        define: { underscored: false, freezeTableName: true, charset: "utf8", timestamps: true },
                        retry: { match: [/SQLITE_BUSY/], name: "query", max: 20 }
                });
                const models = require(path.join(ROOT, "includes/database/model.js"))({ sequelize, Sequelize });
                await sequelize.authenticate();
                log.success("DATABASE", "SQLite connected!");
                return models;
        } catch (e) {
                log.error("DATABASE", `Failed: ${e.message}`);
                return null;
        }
}

// ─── Read account.txt ────────────────────────────────────────────────────
function readAppState() {
        if (!fs.existsSync(accountPath)) {
                log.warn("LOGIN", "account.txt not found.");
                return null;
        }
        const raw = fs.readFileSync(accountPath, "utf-8").trim();
        if (!raw) { log.warn("LOGIN", "account.txt is empty."); return null; }
        try { return JSON.parse(raw); }
        catch (e) { log.error("LOGIN", `account.txt invalid JSON: ${e.message}`); return null; }
}

function saveAppState(api) {
        try {
                const raw = api.getAppState();
                // Deduplicate by key+domain+path to prevent bloat
                const seen = new Set();
                const deduped = raw.filter(c => {
                        const k = `${c.key}_${c.domain}_${c.path}`;
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                });
                fs.writeFileSync(accountPath, JSON.stringify(deduped, null, 2));
        } catch (_) {}
}

// ─── React-based moderation ───────────────────────────────────────────────
// Stores: reactStore[messageID] = { senderID, threadID }
const reactStore = new Map();

function storeMessage(event) {
        if (event.type === "message" || event.type === "message_reply") {
                reactStore.set(event.messageID, {
                        senderID:  String(event.senderID),
                        threadID:  String(event.threadID),
                        messageID: event.messageID
                });
                // Keep store size reasonable
                if (reactStore.size > 2000) {
                        const first = reactStore.keys().next().value;
                        reactStore.delete(first);
                }
        }
}

async function handleReactModeration(api, event) {
        const { reaction, messageID, senderID, threadID } = event;
        const senderIDStr = String(senderID);

        const isAdmin = (global.config.ADMINBOT || []).includes(senderIDStr);
        const storedMsg = reactStore.get(messageID);

        // Read reactBy lists from config.json
        const reactBy = config.reactBy || {};
        const deleteEmojis  = reactBy.delete  || ["🗑️", "❌", "😠", "😡", "😾"];
        const kickEmojis    = reactBy.kick    || ["🖕", "🦵"];
        const warnEmojis    = reactBy.warn    || ["⚠️"];
        const muteEmojis    = reactBy.mute    || ["🔇", "🤐"];
        const addUserEmojis = reactBy.adduser || ["🫂"];

        // delete → unsend the reacted message
        if (deleteEmojis.includes(reaction)) {
                if (!isAdmin) return;
                try { api.unsendMessage(messageID); } catch (_) {}
                return;
        }

        if (!storedMsg) return;
        const targetID = storedMsg.senderID;
        if (targetID === String(api.getCurrentUserID())) return;

        // kick → remove user from group
        if (kickEmojis.includes(reaction)) {
                if (!isAdmin) return;
                try {
                        await new Promise((res, rej) =>
                                api.removeUserFromGroup(targetID, threadID, (e) => e ? rej(e) : res())
                        );
                        api.sendMessage(`✅ Kicked user ${targetID} from the group.`, threadID);
                } catch (e) {
                        api.sendMessage(`❌ Cannot kick: ${e.message}`, threadID);
                }
                return;
        }

        // warn → send warning message
        if (warnEmojis.includes(reaction)) {
                if (!isAdmin) return;
                api.sendMessage(`⚠️ Warning issued to user ${targetID}. Please follow group rules.`, threadID);
                return;
        }

        // mute → add to banned list temporarily
        if (muteEmojis.includes(reaction)) {
                if (!isAdmin) return;
                global.data.userBanned.set(targetID, { reason: "Muted via reaction", bannedBy: senderIDStr, time: Date.now() });
                api.sendMessage(`🔇 User ${targetID} has been muted. Use *unban to restore.`, threadID);
                return;
        }

        // adduser → (placeholder for adding users back)
        if (addUserEmojis.includes(reaction)) {
                if (!isAdmin) return;
                api.sendMessage(`🫂 Use the *add command to add users to the group.`, threadID);
                return;
        }
}

// ─── Main event handler ───────────────────────────────────────────────────
async function onEvent(api, event, db) {
        if (!event || !event.type) return;

        const { Users, Threads } = db;
        const { type } = event;
        const { commands, events, handleReply, handleReaction } = global.client;

        // Store message for react-moderation lookup
        storeMessage(event);

        // ── Route to event modules by eventType ──────────────────────────────
        for (const evt of events.values()) {
                const evtTypes = evt.config?.eventType || [];
                if (evtTypes.includes(type) || evtTypes.some(t => type.startsWith(t))) {
                        try {
                                await evt.run({ api, event, Users, Threads, getText: makeGetText(evt) });
                        } catch (e) { log.warn("EVT", `${evt.config?.name}: ${e.message}`); }
                }
        }

        // ── handleEvent for all events (message-based) ────────────────────────
        if (type === "message" || type === "message_reply") {
                for (const evt of events.values()) {
                        try {
                                if (typeof evt.handleEvent === "function")
                                        evt.handleEvent({ api, event, Users, Threads, getText: makeGetText(evt) });
                        } catch (_) {}
                }

                // handleEvent from commands (e.g. help)
                for (const cmd of commands.values()) {
                        try {
                                if (typeof cmd.handleEvent === "function")
                                        cmd.handleEvent({ api, event, Users, Threads, getText: makeGetText(cmd) });
                        } catch (_) {}
                }

                const body = event.body || "";

                // Reply callbacks
                for (let i = handleReply.length - 1; i >= 0; i--) {
                        const hr = handleReply[i];
                        if (hr && hr.messageID === event.messageReply?.messageID) {
                                try {
                                        const cmd = commands.get((hr.name || "").toLowerCase());
                                        if (cmd?.handleReply)
                                                cmd.handleReply({ api, event, handleReply: hr, Users, Threads, getText: makeGetText(cmd) });
                                } catch (e) { log.warn("REPLY", e.message); }
                        }
                }

                if (!body) return;

                // Banned user check
                const senderID = String(event.senderID);
                if (global.data.userBanned?.has(senderID)) return;

                // Banned thread check
                const threadIDStr = String(event.threadID);
                if (global.data.threadBanned?.has(threadIDStr)) return;

                // Prefix resolve
                const threadData = global.data.threadData.get(threadIDStr) || {};
                const threadPrefix = threadData.PREFIX || global.config.PREFIX;
                const noPrefix = config.noPrefix && (global.config.ADMINBOT || []).includes(senderID);

                let commandName, args;
                if (body.toLowerCase().startsWith(threadPrefix.toLowerCase())) {
                        args = body.slice(threadPrefix.length).trim().split(/\s+/);
                        commandName = args.shift().toLowerCase();
                } else if (noPrefix) {
                        args = body.trim().split(/\s+/);
                        commandName = args.shift().toLowerCase();
                } else {
                        return;
                }

                const command = commands.get(commandName);
                if (!command) return;

                // Permission check
                const hasPermission = command.config.hasPermssion || 0;
                const isAdmin = (global.config.ADMINBOT || []).includes(senderID);
                if (hasPermission >= 2 && !isAdmin) {
                        return api.sendMessage("❌ You don't have permission to use this command!", event.threadID);
                }
                if (hasPermission >= 1) {
                        // group admin or bot admin
                        try {
                                const tInfo = await Threads.getData(event.threadID);
                                const adminIDs = (tInfo.threadInfo?.adminIDs || []).map(a => String(a.id || a));
                                if (!isAdmin && !adminIDs.includes(senderID)) {
                                        return api.sendMessage("❌ You need to be a group admin to use this command!", event.threadID);
                                }
                        } catch (_) {}
                }

                // Cooldown
                if (!global.client.cooldowns.has(command.config.name))
                        global.client.cooldowns.set(command.config.name, new Map());
                const now = Date.now();
                const cMap = global.client.cooldowns.get(command.config.name);
                const cTime = (command.config.cooldowns || 3) * 1000;
                if (cMap.has(senderID) && now < cMap.get(senderID) + cTime) return;
                cMap.set(senderID, now);

                // Run command
                try {
                        await command.run({
                                api, event, args, Users, Threads,
                                getText:    makeGetText(command),
                                permssion:  isAdmin ? 2 : 0
                        });
                } catch (e) {
                        log.error("CMD", `${commandName}: ${e.message}`);
                        try { api.sendMessage(`❌ Error: ${e.message}`, event.threadID); } catch (_) {}
                }

        } else if (type === "message_reaction") {
                // React-based moderation
                try { await handleReactModeration(api, event); } catch (_) {}

                // Registered reaction handlers
                for (const hr of handleReaction) {
                        if (hr && hr.messageID === event.messageID) {
                                try {
                                        const cmd = commands.get((hr.name || "").toLowerCase());
                                        if (cmd?.handleReaction)
                                                cmd.handleReaction({ api, event, handleReaction: hr, Users, Threads, getText: makeGetText(cmd) });
                                } catch (e) { log.warn("REACTION", e.message); }
                        }
                }
        }
}

// ─── Notify on MQTT error (Telegram / Discord) ───────────────────────────
async function sendErrorNotification(msg) {
        const noti = config.notiWhenListenMqttError || {};
        const axios = require("axios");

        if (noti.telegram?.enable && noti.telegram.botToken && noti.telegram.chatId) {
                const ids = String(noti.telegram.chatId).split(/[\s,]+/).filter(Boolean);
                for (const chatId of ids) {
                        try {
                                await axios.post(`https://api.telegram.org/bot${noti.telegram.botToken}/sendMessage`, {
                                        chat_id: chatId, text: `🤖 MOSTAKIM BOT\n⚠️ ${msg}`, parse_mode: "HTML"
                                });
                        } catch (_) {}
                }
        }

        if (noti.discordHook?.enable && noti.discordHook.webhookUrl) {
                const urls = String(noti.discordHook.webhookUrl).split(/[\s,]+/).filter(Boolean);
                for (const url of urls) {
                        try {
                                await axios.post(url, { content: `🤖 **MOSTAKIM BOT**\n⚠️ ${msg}` });
                        } catch (_) {}
                }
        }
}

// ─── Main startup ─────────────────────────────────────────────────────────
async function startBot() {
        setupGlobalConfig();
        setupGlobalData();
        setupGlobalClient();
        setupNodeModule();
        setupUtils();
        setupGetText();
        loadModules();

        const appstate = readAppState();
        if (!appstate) {
                log.info("DASHBOARD", "Dashboard running. Add appstate JSON to account.txt to start the bot.");
                return;
        }

        const models = await setupDatabase();
        const db = models ? buildDBHelpers(models) : {
                Users: { getNameUser: (id) => String(id), getData: async () => ({ data: {}, name: "" }), setData: async () => {}, createData: async () => null },
                Threads: { getData: async () => ({ threadInfo: {}, data: {} }), setData: async () => {}, createData: async () => null }
        };

        // ── Build full FCA options from config.json (mostakim-fca) ──────────
        const oFca = config.optionsFca || {};
        const fcaOptions = {
                logLevel:                 "silent",
                listenEvents:             oFca.listenEvents             ?? true,
                selfListen:               oFca.selfListen               ?? false,
                selfListenEvent:          oFca.selfListenEvent          ?? true,
                autoMarkRead:             oFca.autoMarkRead             ?? true,
                autoMarkDelivery:         oFca.autoMarkDelivery         ?? false,
                autoReconnect:            oFca.autoReconnect            ?? true,
                forceLogin:               oFca.forceLogin               ?? true,
                online:                   oFca.online                   ?? true,
                listenTyping:             oFca.listenTyping             ?? true,
                updatePresence:           oFca.updatePresence           ?? false,
                simulateTyping:           oFca.simulateTyping           ?? true,
                randomUserAgent:          oFca.randomUserAgent          ?? false,
                persona:                  oFca.persona                  ?? "desktop",
                stealthMode:              oFca.stealthMode              ?? true,
                maxConcurrentRequests:    oFca.maxConcurrentRequests    ?? 5,
                maxRequestsPerMinute:     oFca.maxRequestsPerMinute     ?? 50,
                requestCooldownMs:        oFca.requestCooldownMs        ?? 60000,
                errorCacheTtlMs:          oFca.errorCacheTtlMs          ?? 300000,
                userAgent:                config.facebookAccount?.userAgent ||
                        "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        };

        log.info("LOGIN", "Connecting to Facebook via mostakim-fca...");

        login({ appState: appstate }, fcaOptions, async (err, api) => {
                if (err) {
                        const msg = err.message || err.error || JSON.stringify(err);
                        log.error("LOGIN", msg);
                        if (msg.includes("ctx") || msg.includes("cookiestate") || msg.includes("dead") || msg.includes("login")) {
                                log.warn("LOGIN", "⚠️  Facebook session expired! Please update appstate via the dashboard.");
                                await sendErrorNotification("Facebook session expired. Please update appstate.");
                        }
                        return;
                }

                global.GoatBot.fcaApi = api;
                global.GoatBot.botID  = api.getCurrentUserID();
                global.client.api     = api;

                log.success("LOGIN", `Connected! Bot ID: ${global.GoatBot.botID}`);
                saveAppState(api);
                api.setOptions(fcaOptions);

                // ── Get bot name ────────────────────────────────────────────
                try {
                        const info = await new Promise((res, rej) =>
                                api.getUserInfo(global.GoatBot.botID, (e, d) => e ? rej(e) : res(d))
                        );
                        const botName = info?.[global.GoatBot.botID]?.name || "Unknown";
                        log.success("BOT", `Logged in as: ${botName}`);
                        global.config.BOTNAME = botName;
                } catch (_) {}

                // ── Auto appstate refresh (session persistence) ─────────────
                if (config.autoRefreshFbstate) {
                        // Save every 10 min to keep session fresh & prevent logout
                        setInterval(() => {
                                try {
                                        saveAppState(api);
                                        log.info("APPSTATE", "Session auto-saved.");
                                } catch (_) {}
                        }, 10 * 60 * 1000);
                }

                // ── Typing indicator wrapper ─────────────────────────────────
                if (config.typingIndicator?.enable && api.sendTypingIndicator) {
                        const origSend = api.sendMessage.bind(api);
                        const typingDuration = config.typingIndicator.duration || 2000;
                        api.sendMessage = function(msg, threadID, callback, messageID) {
                                try {
                                        api.sendTypingIndicator(threadID, () => {});
                                } catch (_) {}
                                setTimeout(() => origSend(msg, threadID, callback, messageID), Math.min(typingDuration, 3000));
                        };
                }

                // ── MQTT Listener ────────────────────────────────────────────
                let mqttStopped = false;

                function startListening() {
                        mqttStopped = false;
                        global.GoatBot.Listening = api.listenMqtt((listenErr, event) => {
                                if (listenErr) {
                                        const errMsg = listenErr.message || String(listenErr);
                                        log.error("LISTEN", errMsg);
                                        if (!mqttStopped) {
                                                mqttStopped = true;
                                                sendErrorNotification(`MQTT error: ${errMsg}`).catch(() => {});
                                                if (config.autoRestartWhenListenMqttError) {
                                                        log.warn("LISTEN", "Restarting bot process...");
                                                        setTimeout(() => process.exit(2), 2000);
                                                }
                                        }
                                        return;
                                }

                                // Log events (respecting config.logEvents)
                                const logCfg = config.logEvents || {};
                                if (!logCfg.disableAll && event?.type) {
                                        const shouldLog =
                                                (event.type === "message"          && logCfg.message !== false) ||
                                                (event.type === "message_reply"    && logCfg.message_reply !== false) ||
                                                (event.type === "message_reaction" && logCfg.message_reaction !== false) ||
                                                (event.type === "message_unsend"   && logCfg.message_unsend !== false) ||
                                                (event.type === "event"            && logCfg.event !== false) ||
                                                (event.type === "read_receipt"     && logCfg.read_receipt === true) ||
                                                (event.type === "typ"              && logCfg.typ === true) ||
                                                (event.type === "presence"         && logCfg.presence === true);
                                        if (shouldLog)
                                                log.info("EVENT", `type=${event.type} | body="${(event.body || "").slice(0, 60)}" | thread=${event.threadID}`);
                                }

                                onEvent(api, event, db).catch(e => log.error("EVENT", e.message));
                        });
                }

                startListening();

                // ── MQTT periodic restart (restartListenMqtt) ────────────────
                const restartCfg = config.restartListenMqtt || {};
                if (restartCfg.enable && restartCfg.timeRestart > 0) {
                        setInterval(() => {
                                if (restartCfg.logNoti !== false)
                                        log.info("MQTT", "Restarting MQTT listener (scheduled)...");
                                try {
                                        if (global.GoatBot.Listening && typeof global.GoatBot.Listening.stopListening === "function")
                                                global.GoatBot.Listening.stopListening();
                                } catch (_) {}
                                setTimeout(() => startListening(), restartCfg.delayAfterStopListening || 2000);
                        }, restartCfg.timeRestart);
                }

                log.success("BOT", "✅ Bot is fully running with mostakim-fca!");
        });
}

global.GoatBot.reLoginBot = startBot;
startBot();
