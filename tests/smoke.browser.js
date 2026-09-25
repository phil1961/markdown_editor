#!/usr/bin/env node
/* =========================================================================
   Markdown Editor — smoke check in a real, headless browser

   Usage:  node tests/smoke.browser.js [markdown-editor.html] [--browser <exe>] [--headed]

   Needs Node 22+ (built-in WebSocket) and Chrome, Edge, Brave or Chromium.
   No npm packages: it speaks the DevTools protocol directly.
   Exit 0 = passed (or skipped: no browser found), 1 = a check failed,
   2 = could not run. The repository has a far larger suite in
   tests/markdown-editor.browser.js; this one travels inside the help.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--browser");
const HTML = path.resolve(positional[0] || path.join(__dirname, "..", "markdown-editor.html"));
const HEADED = args.includes("--headed");
const EXE = [
  opt("--browser"), process.env.MD_BROWSER,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge", "/usr/bin/brave-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
].find(p => p && fs.existsSync(p));

if (!fs.existsSync(HTML)) { console.error("smoke: no page at " + HTML); process.exit(2); }
if (typeof WebSocket !== "function") { console.error("smoke: needs Node 22+ for the built-in WebSocket (this is " + process.version + ")"); process.exit(2); }
if (!EXE) { console.log("smoke: skipped - no Chrome, Edge, Brave or Chromium found. Pass --browser <exe> or set MD_BROWSER."); process.exit(0); }

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (detail ? "\n          " + String(detail).slice(0, 600) : "")); }
};
const pause = ms => new Promise(r => setTimeout(r, ms));
const FENCE = "`".repeat(3);

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "md-editor-smoke-"));
  const proc = spawn(EXE, [
    "--remote-debugging-port=0", "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-sync", "--window-size=1400,900",
    ...(HEADED ? [] : ["--headless=new", "--disable-gpu"]), "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let ws = null;
  try {
    const url = await new Promise((res, rej) => {
      let buf = "";
      const t = setTimeout(() => rej(new Error("the browser did not open a DevTools port within 20s")), 20000);
      proc.stderr.on("data", d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
      proc.on("exit", c => { clearTimeout(t); rej(new Error("the browser exited (" + c + ") before listening")); });
    });
    ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("could not connect to DevTools")); });
    let seq = 0;
    const waiting = new Map(), listeners = [];
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id !== undefined && waiting.has(m.id)) {
        const w = waiting.get(m.id);
        waiting.delete(m.id);
        if (m.error) w.rej(new Error(m.error.message)); else w.res(m.result);
      } else if (m.method) listeners.forEach(fn => fn(m));
    };
    const send = (method, params, sessionId) => new Promise((res, rej) => {
      const id = ++seq;
      waiting.set(id, { res, rej });
      ws.send(JSON.stringify(Object.assign({ id, method, params: params || {} }, sessionId ? { sessionId } : {})));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId: S } = await send("Target.attachToTarget", { targetId, flatten: true });
    const errors = [];
    listeners.push(m => {
      if (m.sessionId !== S) return;
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(x => x.value ?? x.description).join(" "));
    });
    for (const domain of ["Page.enable", "Runtime.enable"]) await send(domain, {}, S);
    await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }, S);

    const js = async expr => {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, S);
      if (r.exceptionDetails) throw new Error("page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const frames = () => js("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))");
    /* A real pointer click at the element's centre, refused if something covers it. */
    const click = async selector => {
      const box = await js("(() => { const el = document.querySelector(" + JSON.stringify(selector) + "); if (!el) return null;"
        + " el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();"
        + " const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);"
        + " return { x: r.left + r.width / 2, y: r.top + r.height / 2, reachable: r.width > 0 && el.contains(hit) }; })()");
      if (!box || !box.reachable) throw new Error(selector + " is missing or covered");
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 }, S);
      await frames();
    };
    const key = async (name, code, vk) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, S);
      await frames();
    };
    const setRaw = async md => {
      await js("(() => { const ed = document.getElementById('editor'); ed.focus(); ed.value = " + JSON.stringify(md)
        + "; ed.dispatchEvent(new Event('input', { bubbles: true })); })()");
      await pause(150);
    };
    const selectInPreview = (from, to) => js("(() => { const p = document.getElementById('preview'); p.focus();"
      + " AppState.activePane = 'preview'; Doc.setSelection(" + from + ", " + to + "); Doc.restorePreviewSelection(p); })()");

    console.log("smoke: " + path.basename(EXE) + (HEADED ? " (headed)" : " (headless)") + " on " + HTML);
    const loaded = new Promise(r => listeners.push(m => { if (m.sessionId === S && m.method === "Page.loadEventFired") r(); }));
    await send("Page.navigate", { url: "file:///" + HTML.replace(/\\/g, "/").replace(/^\//, "") }, S);
    await loaded;
    await frames();

    const boot = await js("({ version: typeof BUILD === 'object' && BUILD.version, doc: typeof Doc,"
      + " editable: document.getElementById('preview').isContentEditable, help: typeof HELP_MD === 'string' && HELP_MD.length })");
    ok(/^\d+\.\d+/.test(boot.version || "") && boot.doc === "object", "the page boots (v" + boot.version + ")", JSON.stringify(boot));
    ok(boot.editable && boot.help > 1000, "the preview is editable and the help is embedded", JSON.stringify(boot));

    await setRaw("# Smoke\n\nhello world");
    let st = await js("({ h1: (document.querySelector('#preview h1') || {}).textContent, p: (document.querySelector('#preview p') || {}).textContent })");
    ok(st.h1 === "Smoke" && st.p === "hello world", "typing in the raw pane renders in the preview", JSON.stringify(st));

    await selectInPreview(17, 17);
    await send("Input.insertText", { text: "!" }, S);
    await frames();
    st = await js("document.getElementById('editor').value");
    ok(st === "# Smoke\n\nhello world!", "typing in the preview updates the raw pane", JSON.stringify(st));

    await selectInPreview(6, 11);
    await click("#boldBtn");
    st = await js("({ md: document.getElementById('editor').value, strong: (document.querySelector('#preview strong') || {}).textContent })");
    ok(st.md === "# Smoke\n\n**hello** world!" && st.strong === "hello", "Bold on the toolbar wraps the selected word", JSON.stringify(st));

    await setRaw(FENCE + "shell\necho hi # note\n" + FENCE + "\n\n> [!WARNING]\n> Careful.");
    st = await js("(() => { const pre = document.querySelector('#preview pre'), bq = document.querySelector('#preview blockquote');"
      + " return { lang: pre && pre.getAttribute('data-lang'), cmd: pre && (pre.querySelector('.hl-f') || {}).textContent,"
      + " comment: pre && (pre.querySelector('.hl-c') || {}).textContent, alert: bq && bq.className,"
      + " title: bq && getComputedStyle(bq, '::before').content }; })()");
    ok(st.lang === "shell" && st.cmd === "echo" && st.comment === "# note", "a shell code block is coloured", JSON.stringify(st));
    ok(/markdown-alert-warning/.test(st.alert || "") && /Warning/.test(st.title || ""), "> [!WARNING] renders as a titled callout", JSON.stringify(st));

    await click("#helpBtn");
    st = await js("(() => { const body = document.getElementById('helpBody'); return { open: document.getElementById('helpPanel').classList.contains('active'),"
      + " sections: body.querySelectorAll('h2').length, rebuild: body.textContent.includes('node build.js --check') }; })()");
    ok(st.open && st.sections >= 5 && st.rebuild, "Help opens with its sections and the rebuild instructions", JSON.stringify(st));
    await key("Escape", "Escape", 27);
    st = await js("({ open: document.getElementById('helpPanel').classList.contains('active'), md: document.getElementById('editor').value })");
    ok(!st.open && /Careful/.test(st.md), "Escape closes Help and leaves the document alone", JSON.stringify(st));

    ok(errors.length === 0, "no script errors during the run", errors.join(" | "));
  } catch (e) {
    fail++;
    console.log("  FAIL  the run stopped: " + e.message);
  }
  console.log("\n" + pass + " passed, " + fail + " failed");
  try { ws && ws.close(); } catch (e) { /* already closed */ }
  try { proc.kill(); } catch (e) { /* already gone */ }
  await pause(400);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* the browser may still hold a lock */ }
  process.exit(fail ? 1 : 0);
})();
