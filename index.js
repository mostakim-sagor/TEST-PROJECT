const { spawn }  = require("child_process");
const http       = require("http");
const https      = require("https");
const fs         = require("fs");
const path       = require("path");
const os         = require("os");
const crypto     = require("crypto");

// ── Minimal log before utils loads ──
function rawLog(level, tag, msg) {
	const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
	console.log(`[ ${level.padEnd(7)} ] » ${tag}: ${msg}`);
}

let log;
try {
	log = require("./utils/log.js");
} catch (_) {
	log = {
		info:    (t, m) => rawLog("INFO",    t, m),
		success: (t, m) => rawLog("SUCCESS", t, m),
		warn:    (t, m) => rawLog("WARN",    t, m),
		error:   (t, m) => rawLog("ERROR",   t, m),
	};
}

const DASHBOARD_PORT   = parseInt(process.env.PORT || process.env.DASHBOARD_PORT || 5000);
const DASHBOARD_FILE   = path.join(__dirname, "mostakim.html");
const ACCOUNT_FILE     = path.join(__dirname, "account.txt");
const PASSWORD_FILE    = path.join(__dirname, "dashboard.password");
const DASH_CONFIG_FILE = path.join(__dirname, "dashboard.config.json");

// ── SHA-256 helper ──
// Single-hash system:
//   Browser sends sha256(plain) as "clientHash"
//   Server stores sha256(plain) in dashboard.password
//   Login check: clientHash === storedHash  (direct compare — no double hash)
function sha256(str) {
	return crypto.createHash("sha256").update(String(str)).digest("hex");
}

// ── Password setup ──
// Priority: dashboard.config.json → env DASHBOARD_PASSWORD → dashboard.password → auto-generate
function loadPasswordHash() {
	// 1️⃣  dashboard.config.json — user sets plain password here
	if (fs.existsSync(DASH_CONFIG_FILE)) {
		try {
			const cfg   = JSON.parse(fs.readFileSync(DASH_CONFIG_FILE, "utf-8"));
			const plain = (cfg.password || "").trim();

			if (plain && plain.length >= 4) {
				const hash = sha256(plain);
				try { fs.writeFileSync(PASSWORD_FILE, hash, "utf-8"); } catch (_) {}

				cfg.password = "";
				cfg._status  = "Password saved securely. Plain text cleared.";
				try { fs.writeFileSync(DASH_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8"); } catch (_) {}

				log.success("DASHBOARD", `Password set from dashboard.config.json`);
				return hash;
			}
		} catch (_) {}
	}

	// 2️⃣  Environment variable (Replit Secret / Railway / Render)
	if (process.env.DASHBOARD_PASSWORD) {
		const hash = sha256(process.env.DASHBOARD_PASSWORD.trim());
		try { fs.writeFileSync(PASSWORD_FILE, hash, "utf-8"); } catch (_) {}
		return hash;
	}

	// 3️⃣  Already saved hash file
	if (fs.existsSync(PASSWORD_FILE)) {
		try {
			const saved = fs.readFileSync(PASSWORD_FILE, "utf-8").trim();
			if (saved && saved.length === 64) return saved;
		} catch (_) {}
	}

	// 4️⃣  First run: auto-generate and show in logs
	const generated = crypto.randomBytes(6).toString("hex");
	const hash      = sha256(generated);
	try { fs.writeFileSync(PASSWORD_FILE, hash, "utf-8"); } catch (_) {}

	log.success("DASHBOARD", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	log.success("DASHBOARD", `  Auto-generated password: ${generated}`);
	log.success("DASHBOARD", `  To set your own: edit dashboard.config.json`);
	log.success("DASHBOARD", `  Put your password in the "password" field`);
	log.success("DASHBOARD", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	return hash;
}

// storedHash = sha256(plainPassword)
let storedHash = null;

// ── Session store (token → expiry) ──
const sessions   = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

function createSession() {
	const token  = crypto.randomBytes(32).toString("hex");
	sessions.set(token, Date.now() + SESSION_TTL);
	for (const [t, exp] of sessions) if (exp < Date.now()) sessions.delete(t);
	return token;
}

function isValidSession(token) {
	if (!token) return false;
	const exp = sessions.get(token);
	if (!exp) return false;
	if (exp < Date.now()) { sessions.delete(token); return false; }
	return true;
}

function getToken(req) {
	const auth = req.headers["authorization"] || "";
	return auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

// ── Platform URL auto-detect ──
function detectPublicURL() {
	if (process.env.REPLIT_DEV_DOMAIN)   return `https://${process.env.REPLIT_DEV_DOMAIN}`;
	if (process.env.REPLIT_DOMAINS)      return `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`;
	if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
	if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
	if (process.env.RAILWAY_STATIC_URL)  return process.env.RAILWAY_STATIC_URL;
	if (process.env.HEROKU_APP_NAME)     return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
	if (process.env.KOYEB_PUBLIC_DOMAIN) return `https://${process.env.KOYEB_PUBLIC_DOMAIN}`;
	if (process.env.FLY_APP_NAME)        return `https://${process.env.FLY_APP_NAME}.fly.dev`;
	if (process.env.APP_URL)             return process.env.APP_URL;
	return null;
}

function detectPlatformName() {
	if (process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS)           return "Replit";
	if (process.env.RENDER_EXTERNAL_URL)                                        return "Render";
	if (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL)   return "Railway";
	if (process.env.HEROKU_APP_NAME)                                            return "Heroku";
	if (process.env.KOYEB_PUBLIC_DOMAIN)                                        return "Koyeb";
	if (process.env.FLY_APP_NAME)                                               return "Fly.io";
	return "VPS/Custom";
}

// ── Self-ping keep-alive ──
function startKeepAlive(intervalSec = 180) {
	const url = (() => {
		try {
			const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
			return cfg.autoUptime?.url || detectPublicURL();
		} catch (_) { return detectPublicURL(); }
	})();
	if (!url) { log.warn("UPTIME", "No public URL detected. Skipping self-ping."); return; }
	const pingUrl = url.replace(/\/$/, "") + "/ping";
	log.info("UPTIME", `Keep-alive: Pinging ${pingUrl} every ${intervalSec}s`);
	setInterval(() => {
		try {
			const mod = pingUrl.startsWith("https") ? https : http;
			const req = mod.get(pingUrl, { timeout: 10000 }, () => {});
			req.on("error", () => {});
			req.on("timeout", () => { req.destroy(); });
		} catch (_) {}
	}, intervalSec * 1000);
}

// ── Parse request body ──
function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", c => { body += c; if (body.length > 2e6) req.destroy(); });
		req.on("end",  () => resolve(body));
		req.on("error", reject);
	});
}

// ── JSON response helpers ──
function jsonOk (res, data)     { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); }
function jsonErr(res, code, msg) { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: msg })); }

// ─────────────────────────────────────────────────────────────
// ── HTTP Server — bind to PORT immediately (Render/Railway) ──
// ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
	const url = req.url.split("?")[0];

	res.setHeader("Access-Control-Allow-Origin",  "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
	if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

	// ── PUBLIC: Dashboard HTML ──
	if (req.method === "GET" && (url === "/" || url === "/dashboard")) {
		fs.readFile(DASHBOARD_FILE, (err, data) => {
			if (err) { res.writeHead(200, { "Content-Type": "text/html" }); return res.end("<h2>Bot is running. Dashboard file missing.</h2>"); }
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(data);
		});
		return;
	}

	// ── PUBLIC: Ping / Health (no auth — uptime monitors) ──
	if (req.method === "GET" && (url === "/ping" || url === "/health")) {
		const alive = botProcess && !botProcess.killed;
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true, alive, uptime: Math.floor(process.uptime()), time: Date.now() }));
		return;
	}

	// ── AUTH: Login ──
	// Browser sends sha256(plain) as clientHash
	// Server compares: clientHash === storedHash
	if (req.method === "POST" && url === "/auth/login") {
		try {
			const body = await readBody(req);
			const { clientHash } = JSON.parse(body);
			if (!clientHash) return jsonErr(res, 400, "Missing credentials");
			if (!storedHash)  return jsonErr(res, 503, "Password not initialized — check server logs");
			if (clientHash !== storedHash)
				return jsonErr(res, 401, "Wrong password");
			const token = createSession();
			return jsonOk(res, { ok: true, token });
		} catch (e) { return jsonErr(res, 400, e.message); }
	}

	// ── AUTH: Logout ──
	if (req.method === "POST" && url === "/auth/logout") {
		const token = getToken(req);
		if (token) sessions.delete(token);
		return jsonOk(res, { ok: true });
	}

	// ── AUTH: Verify token ──
	if (req.method === "GET" && url === "/auth/verify") {
		return jsonOk(res, { ok: isValidSession(getToken(req)) });
	}

	// ── PROTECTED: Check auth for all routes below ──
	if (!isValidSession(getToken(req))) {
		return jsonErr(res, 401, "Unauthorized — please log in");
	}

	// ── PROTECTED: Status ──
	if (req.method === "GET" && url === "/status") {
		try {
			const config   = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
			const pkg      = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"));
			const mem      = process.memoryUsage();
			const totalMem = os.totalmem();
			const usedMem  = totalMem - os.freemem();
			const hasAccount = fs.existsSync(ACCOUNT_FILE) && fs.readFileSync(ACCOUNT_FILE, "utf-8").trim().length > 2;
			jsonOk(res, {
				owner:          config.adminBot?.[0] || "N/A",
				bot:            pkg.name || "MOSTAKIM V2",
				version:        pkg.version || "1.0.0",
				cores:          os.cpus().length,
				node:           process.version,
				date:           new Date().toLocaleDateString("en-GB"),
				uptime_seconds: Math.floor(process.uptime()),
				has_account:    hasAccount,
				platform:       detectPlatformName(),
				public_url:     detectPublicURL() || "N/A",
				ram: {
					used:    (usedMem  / 1e9).toFixed(2),
					total:   (totalMem / 1e9).toFixed(2),
					percent: ((usedMem / totalMem) * 100).toFixed(1)
				},
				heap: {
					used:    (mem.heapUsed  / 1e6).toFixed(1),
					total:   (mem.heapTotal / 1e6).toFixed(1),
					percent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)
				},
				cpu_percent: null
			});
		} catch (e) { jsonErr(res, 500, e.message); }
		return;
	}

	// ── PROTECTED: Update Appstate ──
	if (req.method === "POST" && url === "/update-appstate") {
		try {
			const body = await readBody(req);
			const { appstate } = JSON.parse(body);
			if (!appstate || typeof appstate !== "string") throw new Error("Missing appstate field");
			let parsed;
			try { parsed = JSON.parse(appstate); } catch (_) { throw new Error("Invalid JSON in appstate"); }
			if (!Array.isArray(parsed)) throw new Error("Appstate must be a JSON array");
			const hasCUser = parsed.some(c => c.key === "c_user" || c.key === "i_user");
			if (!hasCUser) throw new Error("Appstate missing c_user cookie — not a valid Facebook appstate");
			const seen = new Set();
			const deduped = parsed.filter(c => {
				const k = `${c.key}_${c.domain}_${c.path}`;
				if (seen.has(k)) return false;
				seen.add(k); return true;
			});
			fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(deduped, null, 2), "utf-8");
			log.success("DASHBOARD", `Appstate updated: ${deduped.length} cookies saved`);
			jsonOk(res, { ok: true, cookies: deduped.length, message: "Appstate saved! Restarting bot..." });
			setTimeout(() => restartBot("appstate-update"), 1500);
		} catch (e) { jsonErr(res, 400, e.message); }
		return;
	}

	// ── PROTECTED: Restart bot ──
	if (req.method === "POST" && url === "/restart") {
		jsonOk(res, { ok: true, message: "Bot restarting..." });
		setTimeout(() => restartBot("manual-restart"), 500);
		return;
	}

	// ── PROTECTED: Change password ──
	if (req.method === "POST" && url === "/auth/change-password") {
		try {
			const body = await readBody(req);
			const { newClientHash } = JSON.parse(body);
			if (!newClientHash || newClientHash.length !== 64) throw new Error("Invalid password hash");
			// newClientHash = sha256(newPlain) — store directly
			try { fs.writeFileSync(PASSWORD_FILE, newClientHash, "utf-8"); } catch (_) {}
			storedHash = newClientHash;
			sessions.clear();
			log.success("DASHBOARD", "Dashboard password changed.");
			jsonOk(res, { ok: true, message: "Password changed. Please log in again." });
		} catch (e) { jsonErr(res, 400, e.message); }
		return;
	}

	res.writeHead(404); res.end("Not found");
});

// ── Bind to PORT immediately — Render/Railway/Koyeb detect this ──
server.listen(DASHBOARD_PORT, "0.0.0.0", () => {
	log.info("DASHBOARD", `Dashboard running at http://0.0.0.0:${DASHBOARD_PORT}`);
	// Load password AFTER server is already listening
	try {
		storedHash = loadPasswordHash();
	} catch (e) {
		log.error("DASHBOARD", `Password init failed: ${e.message}`);
	}
});

server.on("error", (err) => {
	log.error("DASHBOARD", `Server error: ${err.message}`);
	if (err.code === "EADDRINUSE") {
		log.error("DASHBOARD", `Port ${DASHBOARD_PORT} is already in use!`);
	}
});

// ── Bot Launcher with smart restart ──
let botProcess    = null;
let restartCount  = 0;
let lastRestartAt = 0;

function restartBot(reason) {
	if (botProcess && !botProcess.killed) botProcess.kill("SIGTERM");
	setTimeout(() => startProject(reason), 1000);
}

function startProject(reason) {
	const now = Date.now();
	if (now - lastRestartAt > 10 * 60 * 1000) restartCount = 0;
	lastRestartAt = now;
	restartCount++;
	const backoff = Math.min(restartCount > 3 ? (restartCount - 3) * 5000 : 0, 60000);
	if (backoff > 0) log.warn("BOT", `Restarting in ${backoff / 1000}s (attempt #${restartCount})...`);
	else if (reason) log.info("BOT", `Starting (${reason})...`);
	setTimeout(() => {
		// Do NOT pass PORT to the child — it has its own env already
		// Pass BOT_PROCESS=1 so mostakim.js knows it's a child
		const childEnv = { ...process.env, BOT_PROCESS: "1" };
		delete childEnv.PORT; // prevent child from trying to bind to same port

		botProcess = spawn("node", ["mostakim.js"], {
			cwd: __dirname, stdio: "inherit", shell: false,
			env: childEnv
		});
		botProcess.on("close", (code, signal) => {
			if (signal === "SIGTERM") return;
			if (code === 2)      { log.info("BOT", "Restart requested (exit code 2)."); startProject("code-2"); }
			else if (code === 0) { log.info("BOT", "Bot exited cleanly."); }
			else                 { log.warn("BOT", `Bot crashed (code=${code}). Restarting...`); startProject("crash"); }
		});
		botProcess.on("error", (err) => {
			log.error("BOT", `Failed to start: ${err.message}`);
			setTimeout(() => startProject("spawn-error"), 5000);
		});
	}, backoff);
}

// ── Keep-alive ──
try {
	const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
	if (cfg.autoUptime?.enable !== false) startKeepAlive(cfg.autoUptime?.timeInterval || 180);
} catch (_) { startKeepAlive(180); }

startProject("initial-start");
