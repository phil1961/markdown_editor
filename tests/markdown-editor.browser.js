#!/usr/bin/env node
/* =========================================================================
   Markdown Editor — a look at the page in a real engine

   Usage:  node markdown-editor.browser.js [--headed] [--out <dir>]
                                           [--browser <path to exe>]
                                           [--html <path>]

   No dependencies. Not a gate. Copied from the Retirement Wealth Model
   CDP client (tests/Retirement-Wealth-Model.browser.js): Node 22 WebSocket,
   DevTools protocol, Brave then Chrome then Edge. Skip exit 0 if none.

   Do not add Playwright to this repo.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const HEADED  = args.includes("--headed");
const HTML    = path.resolve(flag("--html", path.join(__dirname, "..", "markdown-editor.html")));
const OUT     = path.resolve(flag("--out", path.join(os.tmpdir(), "md-editor-browser")));
const CANDIDATES = [
  flag("--browser", null),
  process.env.MD_BROWSER,
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/brave-browser", "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const EXE = CANDIDATES.find(p => fs.existsSync(p));

if (!fs.existsSync(HTML)) { console.error("No page at " + HTML + " — run `node build.js` first."); process.exit(2); }
if (typeof WebSocket !== "function") {
  console.error("This script needs Node 22 or later for the built-in WebSocket (you have " + process.version + ").");
  process.exit(2);
}
if (!EXE) {
  console.log("browser check: skipped — no Brave, Chrome or Edge found. Pass --browser <exe> or set MD_BROWSER.");
  process.exit(0);
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.waiting = new Map(); this.listeners = []; }
  open() { return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = e => rej(new Error("WebSocket: " + (e.message || "error"))); this.ws.onmessage = ev => this.route(JSON.parse(ev.data)); }); }
  route(msg) {
    if (msg.id !== undefined && this.waiting.has(msg.id)) {
      const { res, rej } = this.waiting.get(msg.id); this.waiting.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) this.listeners.forEach(fn => fn(msg));
  }
  send(method, params, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.waiting.set(id, { res, rej });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params: params || {}, sessionId } : { id, method, params: params || {} }));
    });
  }
  on(fn) { this.listeners.push(fn); }
  once(method, sessionId, pred) {
    return new Promise(res => { const fn = m => { if (m.method === method && (!sessionId || m.sessionId === sessionId) && (!pred || pred(m.params))) { this.listeners = this.listeners.filter(f => f !== fn); res(m.params); } }; this.on(fn); });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

let pass = 0, fail = 0;
const G  = n => { console.log("\n" + n); };
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
};

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "md-editor-browser-profile-"));
fs.mkdirSync(OUT, { recursive: true });
const launchArgs = [
  "--remote-debugging-port=0", "--user-data-dir=" + profile,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync",
  "--disable-background-networking", "--disable-component-update",
  "--disable-brave-update", "--disable-features=BraveRewards,BraveNews,BraveWallet,BraveVPN,BraveAIChat",
  "--window-size=1400,900", "--hide-scrollbars",
  ...(HEADED ? [] : ["--headless=new", "--disable-gpu"]),
  "about:blank",
];

(async () => {
  console.log("browser check: " + path.basename(EXE) + (HEADED ? " (headed)" : " (headless)") + " on " + path.basename(HTML));
  const proc = spawn(EXE, launchArgs, { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = "";
    const t = setTimeout(() => rej(new Error("the browser did not announce a DevTools endpoint within 20s")), 20000);
    proc.stderr.on("data", d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
    proc.on("exit", code => { clearTimeout(t); rej(new Error("the browser exited with code " + code + " before listening")); });
  });
  const cdp = new CDP(wsUrl);
  await cdp.open();
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const S = sessionId;
  await cdp.send("Page.enable", {}, S);
  await cdp.send("Runtime.enable", {}, S);
  await cdp.send("Log.enable", {}, S);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }, S);

  const errors = [];
  cdp.on(m => {
    if (m.sessionId !== S) return;
    if (m.method === "Runtime.exceptionThrown") errors.push("exception: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push("log: " + m.params.entry.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("console.error: " + m.params.args.map(a => a.value ?? a.description).join(" "));
  });

  const evalJs = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, S);
    if (r.exceptionDetails) throw new Error("page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const frames = () => evalJs("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))");
  const click = async (selector) => {
    const box = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if(!el) return null;
      el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height, vis: cs.visibility, disp: cs.display,
               hit: (document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) || {}).id || null,
               inside: !!el.contains(document.elementFromPoint(r.left + r.width/2, r.top + r.height/2)) }; })()`);
    if (!box) throw new Error("no element matches " + selector);
    if (box.w < 1 || box.h < 1 || box.disp === "none" || box.vis === "hidden") throw new Error(selector + " is not visible (" + box.w + "x" + box.h + ", " + box.disp + "/" + box.vis + ")");
    if (!box.inside) throw new Error(selector + " is covered by #" + box.hit + " at its centre — a pointer could not reach it");
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await cdp.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 }, S);
    await frames();
    return box;
  };
  const shots = [];
  const shot = async (name, caption, selector, viewportOnly) => {
    let clip;
    if (selector) {
      const r = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({ block: "center" });
        const b = el.getBoundingClientRect(); return { x: b.left + window.scrollX, y: b.top + window.scrollY, width: b.width, height: b.height }; })()`);
      clip = Object.assign({ scale: 1 }, r);
    }
    const params = { format: "png", captureBeyondViewport: !viewportOnly };
    if (clip) params.clip = clip;
    const { data } = await cdp.send("Page.captureScreenshot", params, S);
    const file = path.join(OUT, name + ".png");
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    shots.push({ file: name + ".png", caption });
    return file;
  };

  try {
    G("The page loads in a real engine");
    const fileUrl = "file:///" + HTML.replace(/\\/g, "/").replace(/^\//, "");
    const loaded = cdp.once("Page.loadEventFired", S);
    await cdp.send("Page.navigate", { url: fileUrl }, S);
    await loaded;
    await frames();
    const boot = await evalJs("({ v: BUILD.version, editor: !!document.getElementById('editor'), preview: !!document.getElementById('preview'), editable: document.getElementById('preview').isContentEditable })");
    ok(/^\d+\.\d+/.test(boot.v), "BUILD.version reads " + boot.v);
    ok(boot.editor && boot.preview, "editor and preview exist");
    ok(boot.editable === false, "preview is not contenteditable (revert that and this fails)");
    ok(errors.length === 0, "no exception during load", errors.join(" | "));

    G("Layout");
    const layout = await evalJs("({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ed: getComputedStyle(document.getElementById('editor')).display, pr: getComputedStyle(document.getElementById('preview')).display })");
    ok(layout.sw <= layout.cw + 1, "no horizontal overflow at 1400px (" + layout.sw + " vs " + layout.cw + ")");
    ok(layout.ed !== "none" && layout.pr !== "none", "both panes are displayed");
    await shot("01-both-panes", "Both panes on a blank document.");

    G("Live preview");
    await evalJs("(() => { const ed = document.getElementById('editor'); ed.focus(); ed.value = '# Hello from the browser'; ed.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await evalJs("new Promise(r => setTimeout(r, 50))");
    await frames();
    const prev = await evalJs("document.getElementById('preview').innerHTML");
    ok(/<h1>Hello from the browser<\/h1>/.test(prev), "typing a heading renders in the preview", prev);

    G("Toolbar bold is a real pointer");
    await evalJs("(() => { const ed = document.getElementById('editor'); ed.focus(); ed.value = 'word'; ed.setSelectionRange(0, 4); })()");
    await click("#boldBtn");
    const afterBold = await evalJs("document.getElementById('editor').value");
    ok(afterBold === "**word**", "Bold wraps the selection in **", afterBold);

    G("File menu");
    await click("#fileMenuBtn");
    const menu = await evalJs("({ open: document.getElementById('fileMenu').classList.contains('open'), save: (document.getElementById('menuSave')||{}).textContent })");
    ok(menu.open, "File menu opens from a pointer click");
    ok(/Download/.test(menu.save || ""), "the save item is labelled Download, not Save", menu.save);
    await shot("02-file-menu", "File menu open, Download not Save.");
    await evalJs("document.getElementById('fileMenu').classList.remove('open'); true");

    G("View → Preview hides the editor pane");
    await click("#viewPreviewBtn");
    const view = await evalJs("({ cls: document.querySelector('.main-container').className, ed: getComputedStyle(document.getElementById('editorContainer').closest('.pane')).display })");
    ok(/preview-only/.test(view.cls), "preview-only class is on the container", view.cls);
    ok(view.ed === "none", "the editor pane is display:none", view.ed);
    await shot("03-preview-only", "Preview-only view.");
    await click("#viewBothBtn");

    G("Escape closes a modal");
    await click("#linkBtn");
    const opened = await evalJs("document.getElementById('linkModal').classList.contains('active')");
    ok(opened, "link modal opens");
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, S);
    await frames();
    const closed = await evalJs("document.getElementById('linkModal').classList.contains('active')");
    ok(!closed, "Escape closes the link modal");

    ok(errors.length === 0, "no exception during the whole run", errors.join(" | "));
  } catch (e) {
    fail++; console.log("  FAIL  the run threw: " + e.message);
  } finally {
    const view = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Markdown Editor — browser check</title>
<style>body{margin:0;background:#111;color:#eee;font-family:system-ui,Segoe UI,sans-serif;padding:28px 20px 60px}.wrap{max-width:1100px;margin:0 auto}
h1{font-size:24px;margin:0 0 6px}p{color:#9ca3af;font-size:14px;line-height:1.5;max-width:72ch}
figure{margin:18px 0;border:1px solid #333;background:#1a1a1a}figure img{display:block;width:100%;height:auto}figcaption{padding:10px 12px;font-size:13px;color:#9ca3af}</style></head>
<body><div class="wrap"><h1>Browser check</h1><p>${path.basename(EXE)} ${HEADED ? "headed" : "headless"} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${pass} passed, ${fail} failed.
Generated by tests/markdown-editor.browser.js; delete this folder when done.</p>
${shots.map(s => `<figure><img src="${s.file}" alt="${s.caption}"><figcaption>${s.caption}</figcaption></figure>`).join("\n")}</div></body></html>`;
    fs.writeFileSync(path.join(OUT, "index.html"), view);
    try { await cdp.send("Browser.close"); } catch (e) {}
    cdp.close();
    const gone = new Promise(r => { proc.on("exit", r); setTimeout(r, 5000); });
    try { proc.kill(); } catch (e) {}
    await gone;
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
    console.log("\n----------------------------------------------------------");
    console.log(pass + " passed, " + fail + " failed");
    console.log("screenshots and viewer: " + path.join(OUT, "index.html"));
    process.exit(fail ? 1 : 0);
  }
})().catch(e => { console.error("browser check: " + e.message); process.exit(2); });
