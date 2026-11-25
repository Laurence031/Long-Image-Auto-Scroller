const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_PORT = 8787;

function validPort(p) { return Number.isInteger(p) && p >= 1024 && p <= 65535; }
function randomPin() { return String(crypto.randomInt(0, 1000000)).padStart(6, "0"); }

// lumang paraan ng pag-save ng PIN (remote-pin.txt) - ginagamit pa rin kung wala pang settings
function loadOrCreatePin(dir) {
    const file = path.join(dir, "remote-pin.txt");
    try {
        const saved = fs.readFileSync(file, "utf8").trim();
        if (/^\d{6}$/.test(saved)) return saved;
    } catch (e) { /* wala pang file */ }
    const pin = randomPin();
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, pin);
    } catch (e) { /* kahit hindi ma-save, gagana pa rin */ }
    return pin;
}

function loadSettings(dir) {
    let saved = {};
    try { saved = JSON.parse(fs.readFileSync(path.join(dir, "remote-settings.json"), "utf8")); } catch (e) { /* wala pa */ }
    return {
        enabled: saved.enabled !== false,
        port: validPort(saved.port) ? saved.port : DEFAULT_PORT,
        pin: /^\d{6}$/.test(saved.pin || "") ? saved.pin : loadOrCreatePin(dir)
    };
}

function saveSettings(dir, s) {
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "remote-settings.json"), JSON.stringify(s, null, 2));
    } catch (e) { /* kahit hindi ma-save, gagana pa rin */ }
}

function lanAddresses() {
    const list = [];
    Object.values(os.networkInterfaces()).forEach(ifaces => {
        (ifaces || []).forEach(i => {
            if ((i.family === "IPv4" || i.family === 4) && !i.internal) list.push(i.address);
        });
    });
    return list;
}

function start(opts) {
    const ipcMain = opts.ipcMain;
    const getMainWindow = opts.getMainWindow;
    const htmlPath = opts.htmlPath;
    const dataDir = opts.dataDir;
    const maxBody = opts.maxBody || 30 * 1024 * 1024;

    let settings = loadSettings(dataDir);
    if (opts.port !== undefined) settings.port = opts.port;   // para sa test lang (0 = kahit anong port)

    let server = null;
    let boundPort = null;
    let lastError = null;
    const clients = new Map();   // key -> SSE response
    const fails = new Map();     // ip -> { n, until }

    function toScroller(channel, payload) {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    }
    function notifyCount() { toScroller("remote-count", clients.size); }

    function info(extraError) {
        return {
            enabled: settings.enabled,
            running: !!server,
            port: settings.port,
            boundPort: boundPort,
            pin: settings.pin,
            urls: server ? lanAddresses().map(ip => "http://" + ip + ":" + boundPort + "/?pin=" + settings.pin) : [],
            error: extraError || lastError
        };
    }

    function broadcast(msg) {
        const line = "data: " + JSON.stringify(msg) + "\n\n";
        clients.forEach(res => { try { res.write(line); } catch (e) { /* closed */ } });
    }

    // true = ok, false = wrong pin, "blocked" = masyadong maraming maling subok
    function authorize(req, url) {
        const ip = req.socket.remoteAddress || "?";
        const f = fails.get(ip);
        if (f && f.until > Date.now()) return "blocked";
        const given = Buffer.from(url.searchParams.get("pin") || "");
        const real = Buffer.from(settings.pin);
        const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
        if (ok) { fails.delete(ip); return true; }
        const n = ((f && f.n) || 0) + 1;
        fails.set(ip, n >= 8 ? { n: 0, until: Date.now() + 60000 } : { n: n, until: 0 });
        return false;
    }

    function createHttpServer() {
        return http.createServer((req, res) => {
            const url = new URL(req.url, "http://localhost");
            const p = url.pathname;

            if (req.method === "GET" && (p === "/" || p === "/maker")) {
                fs.readFile(htmlPath, (err, buf) => {
                    if (err) { res.writeHead(500); return res.end("lyrics_maker.html not found"); }
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
                    res.end(buf);
                });
                return;
            }

            if (p === "/api/events" && req.method === "GET") {
                const auth = authorize(req, url);
                if (auth !== true) { res.writeHead(auth === "blocked" ? 429 : 401); return res.end(); }
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive"
                });
                res.write("retry: 2000\n\n");
                const key = (url.searchParams.get("clientId") || "c").slice(0, 40) + ":" + crypto.randomBytes(3).toString("hex");
                clients.set(key, res);
                notifyCount();
                const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (e) { /* closed */ } }, 20000);
                req.on("close", () => { clearInterval(ping); clients.delete(key); notifyCount(); });
                return;
            }

            if (p === "/api/send" && req.method === "POST") {
                const auth = authorize(req, url);
                if (auth !== true) { res.writeHead(auth === "blocked" ? 429 : 401); return res.end(); }
                let size = 0;
                const chunks = [];
                let tooBig = false;
                req.on("data", c => {
                    if (tooBig) return;
                    size += c.length;
                    if (size > maxBody) {
                        tooBig = true;
                        res.writeHead(413);
                        res.end();
                        req.destroy();
                        return;
                    }
                    chunks.push(c);
                });
                req.on("end", () => {
                    if (tooBig) return;
                    try {
                        const msg = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                        if (!msg || typeof msg.type !== "string") throw new Error("bad message");
                        toScroller("remote-maker-msg", msg);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end('{"ok":true}');
                    } catch (e) {
                        res.writeHead(400);
                        res.end();
                    }
                });
                return;
            }

            res.writeHead(404);
            res.end("Not found");
        });
    }

    // sinusubukan ang port; kung busy, susunod na port (hanggang 10 beses)
    function listen(srv, port, triesLeft) {
        return new Promise((resolve, reject) => {
            const onListening = () => { srv.removeListener("error", onError); resolve(srv.address().port); };
            const onError = err => {
                srv.removeListener("listening", onListening);
                if (err.code === "EADDRINUSE" && triesLeft > 0 && port !== 0) listen(srv, port + 1, triesLeft - 1).then(resolve, reject);
                else reject(err);
            };
            srv.once("error", onError);
            srv.once("listening", onListening);
            srv.listen(port, "0.0.0.0");
        });
    }

    async function begin() {
        lastError = null;
        boundPort = null;
        if (!settings.enabled) return;
        const srv = createHttpServer();
        try {
            boundPort = await listen(srv, settings.port, 10);
            server = srv;
            console.log("[remote] Web Teleprompter for other devices:", info().urls.join("  "));
        } catch (err) {
            lastError = err.code === "EADDRINUSE" ? "Port " + settings.port + " is busy" : err.message;
            console.error("[remote] server error:", err.message);
        }
    }

    function halt() {
        clients.forEach(res => { try { res.end(); } catch (e) { /* closed */ } });
        clients.clear();
        fails.clear();
        if (server) {
            server.close();
            if (typeof server.closeAllConnections === "function") server.closeAllConnections();
            server = null;
        }
        boundPort = null;
    }

    async function applySettings(partial) {
        const next = Object.assign({}, settings);
        partial = partial || {};
        if (partial.enabled !== undefined) next.enabled = !!partial.enabled;
        if (partial.port !== undefined) {
            const p = Number(partial.port);
            if (!validPort(p)) return info("Port must be a number from 1024 to 65535");
            next.port = p;
        }
        if (partial.pin !== undefined) {
            const pn = partial.pin === "random" ? randomPin() : String(partial.pin);
            if (!/^\d{6}$/.test(pn)) return info("PIN must be exactly 6 digits");
            next.pin = pn;
        }
        settings = next;
        saveSettings(dataDir, settings);
        halt();
        notifyCount();
        await begin();
        return info();
    }

    ipcMain.on("remote-info-request", e => {
        e.sender.send("remote-info", info());
        e.sender.send("remote-count", clients.size);
    });
    ipcMain.on("remote-settings-save", (e, partial) => {
        applySettings(partial).then(i => {
            e.sender.send("remote-info", i);
            e.sender.send("remote-count", clients.size);
        });
    });
    ipcMain.on("to-remote-maker", (_e, msg) => broadcast(msg));

    const ready = begin().then(() => { toScroller("remote-info", info()); });

    return {
        info: info,
        applySettings: applySettings,
        stop: function () { halt(); },
        whenListening: function () { return ready.then(() => boundPort); }
    };
}

module.exports = { start: start };
