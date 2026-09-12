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
  const pointerAt = async (x, y, clickCount) => {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left", clickCount: 1 }, S);
    for (const type of ["mousePressed", "mouseReleased"])
      await cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount }, S);
  };
  const dblclickWord = async (word) => {
    const box = await evalJs(`(() => {
      const preview = document.getElementById("preview");
      const w = ${JSON.stringify(word)};
      const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const i = node.textContent.indexOf(w);
        if (i < 0) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + w.length);
        const r = range.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return null;
    })()`);
    if (!box) throw new Error("word not found in preview: " + word);
    await pointerAt(box.x, box.y, 1);
    await pointerAt(box.x, box.y, 2);
    await frames();
    return box;
  };
  const previewState = async (tag, btn) => evalJs(`({
    html: document.getElementById("preview").innerHTML,
    text: document.getElementById("preview").innerText,
    md: document.getElementById("editor").value,
    tagText: (document.getElementById("preview").querySelector(${JSON.stringify(tag)}) || {}).textContent || "",
    hasTag: !!document.getElementById("preview").querySelector(${JSON.stringify(tag)}),
    btnActive: document.getElementById(${JSON.stringify(btn)}).classList.contains("active"),
    selected: window.getSelection().toString(),
    pane: AppState.activePane
  })`);
  const bootPreview = async (text) => {
    await evalJs(`(() => {
      Doc.load("");
      document.getElementById("editor").value = "";
      document.getElementById("preview").innerHTML = Doc.previewHTML();
      AppState.activePane = "preview";
    })()`);
    await click("#preview");
    if (text) {
      await cdp.send("Input.insertText", { text }, S);
      await frames();
    }
  };
  const loadMd = async (md) => {
    await evalJs("(() => { Doc.load(" + JSON.stringify(md) + "); document.getElementById('editor').value = Doc.toMarkdown(); document.getElementById('preview').innerHTML = Doc.previewHTML(); AppState.activePane = 'preview'; })()");
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
    ok(boot.editable === true, "preview is contenteditable so the right pane accepts typing");
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
    const prev = await evalJs("({ html: document.getElementById('preview').innerHTML, h: (document.querySelector('#preview h1')||{}).textContent })");
    ok(prev.h === "Hello from the browser", "typing a heading renders in the preview", JSON.stringify(prev));

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

    G("Preview pane: type, double-click a word, toggle bold/italic/underline");
    await click("#viewBothBtn");
    await bootPreview("alpha Widget omega");
    const typed = await evalJs("document.getElementById('preview').innerText");
    ok(/Widget/.test(typed), "typed into the preview pane (" + JSON.stringify(typed) + ")");
    ok(/Widget/.test(await evalJs("document.getElementById('editor').value")), "preview typing appears in the raw pane");

    const formats = [
      { name: "bold", btn: "boldBtn", tag: "strong" },
      { name: "italic", btn: "italicBtn", tag: "em" },
      { name: "underline", btn: "underlineBtn", tag: "u" }
    ];
    for (const fmt of formats) {
      await bootPreview("alpha Widget omega");

      await dblclickWord("Widget");
      const selected = await evalJs("window.getSelection().toString()");
      ok(/Widget/.test(selected), fmt.name + ": double-click selects Widget (" + JSON.stringify(selected) + ")");

      await click("#" + fmt.btn);
      const on = await previewState(fmt.tag, fmt.btn);
      ok(on.hasTag, fmt.name + ": button wraps Widget in <" + fmt.tag + ">", on.html);
      ok(on.tagText === "Widget", fmt.name + ": wrapped text has no trailing space (" + JSON.stringify(on.tagText) + ")", on.html);
      const spaced = { bold: "**Widget **", italic: "*Widget *", underline: "++Widget ++" };
      const tight = { bold: "**Widget**", italic: "*Widget*", underline: "++Widget++" };
      ok(!on.md.includes(spaced[fmt.name]) && on.md.includes(tight[fmt.name]),
        fmt.name + ": raw pane keeps the space outside the markers", on.md);
      ok(on.btnActive, fmt.name + ": toolbar button is highlighted after applying", JSON.stringify(on));
      await shot("04-preview-" + fmt.name + "-on", "Preview after " + fmt.name + " applied to Widget.");

      await dblclickWord("Widget");
      const stillOn = await previewState(fmt.tag, fmt.btn);
      ok(stillOn.btnActive, fmt.name + ": double-clicking the formatted word keeps the button highlighted", JSON.stringify(stillOn));

      await click("#" + fmt.btn);
      const off = await previewState(fmt.tag, fmt.btn);
      ok(!off.hasTag, fmt.name + ": second click removes <" + fmt.tag + ">", off.html);
      ok(!off.btnActive, fmt.name + ": toolbar button is unhighlighted after removing", JSON.stringify(off));
      await shot("04-preview-" + fmt.name + "-off", "Preview after " + fmt.name + " removed from Widget.");
    }

    G("QC: bugs the toggle tests would not catch");
    await click("#viewBothBtn");

    await loadMd("hello");
    await evalJs("(() => { Doc.setSelection(0, 0); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#boldBtn");
    const empty = await evalJs("({ strongs: [...document.querySelectorAll('#preview strong')].map(el => el.textContent) })");
    ok(empty.strongs.length === 0, "collapsed caret does not insert an empty <strong>", JSON.stringify(empty));

    await loadMd("**Widget**");
    await evalJs("(() => { const n = Doc.totalLen(); Doc.setSelection(0, n); AppState.activePane = 'preview'; })()");
    await click("#preview");
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await click("#boldBtn");
    const unwrapped = await evalJs("({ n: document.querySelectorAll('#preview strong').length, html: document.getElementById('preview').innerHTML, md: document.getElementById('editor').value })");
    ok(unwrapped.n === 0, "selecting the bold run toggles bold off", unwrapped.html);

    await loadMd("alpha **Widget** omega");
    await dblclickWord("Widget");
    const lit = await evalJs("document.getElementById('boldBtn').classList.contains('active')");
    ok(lit, "highlighter lights Bold while the caret is in bold text");

    await loadMd("alpha **Widget** omega");
    const md = await evalJs("document.getElementById('editor').value");
    ok(/\*\*Widget\*\*/.test(md), "raw pane keeps **Widget**", md);

    await loadMd("| A | B |\n| --- | --- |\n| 1 | 2 |\n");
    const tableMd = await evalJs("document.getElementById('editor').value");
    ok(/\| A \|/.test(tableMd) && /\| 1 \|/.test(tableMd), "a markdown table round-trips", tableMd);

    G("QC: stacked formats — removing underline leaves the rest");
    await bootPreview("abc");
    await dblclickWord("abc");
    for (const id of ["boldBtn", "italicBtn", "strikeBtn", "underlineBtn"]) await click("#" + id);
    const stacked = await evalJs("({ html: document.getElementById('preview').innerHTML, tags: ['strong','em','del','u'].filter(t => document.querySelector('#preview ' + t)) })");
    ok(stacked.tags.length === 4, "bold+italic+strike+underline all applied", stacked.html);
    await dblclickWord("abc");
    await click("#underlineBtn");
    const peeled = await evalJs(`({
      html: document.getElementById('preview').innerHTML,
      u: !!document.querySelector('#preview u'),
      strong: !!document.querySelector('#preview strong'),
      em: !!document.querySelector('#preview em'),
      del: !!document.querySelector('#preview del'),
      uBtn: document.getElementById('underlineBtn').classList.contains('active'),
      bBtn: document.getElementById('boldBtn').classList.contains('active')
    })`);
    ok(!peeled.u && peeled.strong && peeled.em && peeled.del,
      "underline gone, bold/italic/strike remain", peeled.html);
    ok(!peeled.uBtn, "underline button is unhighlighted");
    ok(peeled.bBtn, "bold button stays highlighted");

    G("QC: peeling bold keeps italic/underline/strike highlighted");
    await bootPreview("abc");
    await dblclickWord("abc");
    for (const id of ["boldBtn", "italicBtn", "underlineBtn", "strikeBtn"]) await click("#" + id);
    await dblclickWord("abc");
    await click("#boldBtn");
    const peeledBold = await evalJs(`({
      html: document.getElementById('preview').innerHTML,
      strong: !!document.querySelector('#preview strong'),
      em: !!document.querySelector('#preview em'),
      u: !!document.querySelector('#preview u'),
      del: !!document.querySelector('#preview del'),
      bBtn: document.getElementById('boldBtn').classList.contains('active'),
      iBtn: document.getElementById('italicBtn').classList.contains('active'),
      uBtn: document.getElementById('underlineBtn').classList.contains('active'),
      sBtn: document.getElementById('strikeBtn').classList.contains('active')
    })`);
    ok(!peeledBold.strong && peeledBold.em && peeledBold.u && peeledBold.del,
      "bold gone from the tree, other three remain", peeledBold.html);
    ok(!peeledBold.bBtn, "bold button unhighlighted");
    ok(peeledBold.iBtn && peeledBold.uBtn && peeledBold.sBtn,
      "italic, underline and strike stay highlighted without re-clicking the word", JSON.stringify(peeledBold));

    G("QC: H1 applies and toggles off");
    await bootPreview("abc");
    await dblclickWord("abc");
    await click("#h1Btn");
    const h1on = await evalJs(`({
      html: document.getElementById('preview').innerHTML,
      md: document.getElementById('editor').value,
      h1: !!document.querySelector('#preview h1'),
      btn: document.getElementById('h1Btn').classList.contains('active')
    })`);
    ok(h1on.h1 && /^#\s*abc/m.test(h1on.md), "H1 applied in preview and raw pane", h1on.html + " | " + h1on.md);
    ok(h1on.btn, "H1 button highlighted");
    await dblclickWord("abc");
    await click("#h1Btn");
    const h1off = await evalJs(`({
      html: document.getElementById('preview').innerHTML,
      md: document.getElementById('editor').value,
      h1: !!document.querySelector('#preview h1'),
      btn: document.getElementById('h1Btn').classList.contains('active')
    })`);
    ok(!h1off.h1, "second H1 click removes the heading", h1off.html);
    ok(!/^#\s/m.test(h1off.md.trim()), "raw pane no longer has a heading marker", h1off.md);
    ok(!h1off.btn, "H1 button unhighlighted");

    G("QC: insert in the middle of a word, Enter, partial wrap");
    await loadMd("abcdef");
    await evalJs("(() => { Doc.setSelection(2, 2); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#preview");
    await evalJs("(() => { Doc.setSelection(2, 2); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await cdp.send("Input.insertText", { text: "X" }, S);
    await frames();
    const mid = await evalJs("({ md: document.getElementById('editor').value, text: document.getElementById('preview').innerText })");
    ok(mid.md === "abXcdef" || /abXcdef/.test(mid.text.replace(/\s/g, "")),
      "typing in the middle of a word updates raw and preview", JSON.stringify(mid));

    await loadMd("abcd");
    await evalJs("(() => { Doc.setSelection(2, 2); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#preview");
    await evalJs("(() => { Doc.setSelection(2, 2); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "char", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await frames();
    const split = await evalJs("({ md: document.getElementById('editor').value, ps: document.querySelectorAll('#preview p').length, html: document.getElementById('preview').innerHTML })");
    ok(split.ps >= 2 || /\n\n/.test(split.md), "Enter splits the paragraph", JSON.stringify(split));

    await loadMd("abcdef");
    await evalJs("(() => { Doc.setSelection(2, 4); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#boldBtn");
    const slice = await evalJs("({ md: document.getElementById('editor').value, html: document.getElementById('preview').innerHTML, tag: (document.querySelector('#preview strong')||{}).textContent })");
    ok(slice.md === "ab**cd**ef" && slice.tag === "cd", "bold a slice inside a word", JSON.stringify(slice));

    await loadMd("**_abc_**");
    const rt = await evalJs("({ html: document.getElementById('preview').innerHTML, strong: !!document.querySelector('#preview strong'), em: !!document.querySelector('#preview em') })");
    ok(rt.strong && rt.em, "raw **_abc_** renders as bold+italic", rt.html);

    G("QC: numbered list — several paragraphs become 1. 2. 3.");
    await bootPreview("abc");
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "char", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await frames();
    await cdp.send("Input.insertText", { text: "one" }, S);
    await frames();
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "char", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await frames();
    await cdp.send("Input.insertText", { text: "two" }, S);
    await frames();
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#numberBtn");
    const numbered = await evalJs(`({
      md: document.getElementById('editor').value,
      html: document.getElementById('preview').innerHTML,
      ols: document.querySelectorAll('#preview ol').length,
      lis: [...document.querySelectorAll('#preview li')].map(el => el.textContent.trim())
    })`);
    ok(numbered.ols === 1, "one numbered list, not one list per line", numbered.html);
    ok(numbered.lis.join("|") === "abc|one|two", "three list items in order", JSON.stringify(numbered.lis));
    ok(/^1\.\s*abc\n2\.\s*one\n3\.\s*two/.test(numbered.md), "raw pane is 1. 2. 3.", numbered.md);
    ok(await evalJs("document.getElementById('numberBtn').classList.contains('active')"), "number button is highlighted");

    await evalJs("(() => { const n = Doc.totalLen(); Doc.setSelection(n, n); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "char", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 }, S);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }, S);
    await frames();
    await cdp.send("Input.insertText", { text: "three" }, S);
    await frames();
    const nextItem = await evalJs("({ md: document.getElementById('editor').value, lis: [...document.querySelectorAll('#preview li')].map(el => el.textContent.trim()) })");
    ok(/4\.\s*three/.test(nextItem.md) && nextItem.lis[3] === "three", "Enter inside the list adds item 4", JSON.stringify(nextItem));

    G("QC: pasted numbered list with blank lines is 1. 2. 3. not 1. 1. 1.");
    await loadMd("1. abc\n\n2. one\n\n3. two");
    const pasted = await evalJs(`({
      md: document.getElementById('editor').value,
      html: document.getElementById('preview').innerHTML,
      ols: document.querySelectorAll('#preview ol').length,
      lis: [...document.querySelectorAll('#preview li')].map(el => el.textContent.trim()),
      starts: [...document.querySelectorAll('#preview ol')].map(el => el.start || 1)
    })`);
    ok(pasted.ols === 1, "paste/load of 1.\\n\\n2.\\n\\n3. is one <ol>, not three", pasted.html);
    ok(pasted.lis.join("|") === "abc|one|two", "three items, numbers come from the list not the text", JSON.stringify(pasted.lis));
    ok(/^1\.\s*abc\n2\.\s*one\n3\.\s*two/.test(pasted.md), "raw pane is 1. 2. 3.", pasted.md);

    await evalJs("(() => { Doc.load(''); document.getElementById('editor').value = ''; document.getElementById('preview').innerHTML = Doc.previewHTML(); AppState.activePane = 'preview'; Doc.paste('1. abc\\n\\n1. one\\n\\n1. two'); document.getElementById('editor').value = Doc.toMarkdown(); document.getElementById('preview').innerHTML = Doc.previewHTML(); })()");
    const ones = await evalJs(`({
      md: document.getElementById('editor').value,
      ols: document.querySelectorAll('#preview ol').length,
      lis: [...document.querySelectorAll('#preview li')].map(el => el.textContent.trim()),
      html: document.getElementById('preview').innerHTML
    })`);
    ok(ones.ols === 1 && ones.lis.join("|") === "abc|one|two", "paste of 1. 1. 1. renders as one list", ones.html);
    ok(/^1\.\s*abc\n2\.\s*one\n3\.\s*two/.test(ones.md), "those items are numbered 1. 2. 3. in raw", ones.md);

    G("QC: quote-increase nests instead of toggling off");
    await bootPreview("abc");
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#quoteIncreaseBtn");
    const q1 = await evalJs("({ n: document.querySelectorAll('#preview blockquote').length, md: document.getElementById('editor').value, html: document.getElementById('preview').innerHTML })");
    ok(q1.n === 1, "first >+ wraps in a blockquote", q1.html);
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await click("#quoteIncreaseBtn");
    const q2 = await evalJs("({ n: document.querySelectorAll('#preview blockquote').length, md: document.getElementById('editor').value, html: document.getElementById('preview').innerHTML })");
    ok(q2.n === 2, "second >+ nests a second blockquote, does not unwrap", q2.html + " | " + q2.md);
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await click("#quoteIncreaseBtn");
    const q3 = await evalJs("document.querySelectorAll('#preview blockquote').length");
    ok(q3 === 3, "third >+ is a triple indent", String(q3));
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await click("#quoteDecreaseBtn");
    const qDown = await evalJs("document.querySelectorAll('#preview blockquote').length");
    ok(qDown === 2, ">- removes one indent level", String(qDown));

    G("QC: indent only the middle line inside an existing quote");
    await loadMd("aaa\n\nbbb\n\nccc");
    await evalJs("(() => { Doc.setSelection(0, Doc.totalLen()); Doc.restorePreviewSelection(document.getElementById('preview')); AppState.activePane = 'preview'; })()");
    await click("#quoteIncreaseBtn");
    await evalJs("(() => { Doc.setSelection(4, 7); Doc.restorePreviewSelection(document.getElementById('preview')); })()");
    await click("#quoteIncreaseBtn");
    const midQuote = await evalJs(`(() => {
      const outer = document.querySelector('#preview blockquote');
      const inner = outer && outer.querySelector('blockquote');
      const innerText = inner ? inner.textContent.trim() : '';
      const md = document.getElementById('editor').value;
      return {
        outers: document.querySelectorAll('#preview > blockquote').length,
        nest: document.querySelectorAll('#preview blockquote blockquote').length,
        innerText,
        md,
        html: document.getElementById('preview').innerHTML
      };
    })()`);
    ok(midQuote.outers === 1 && midQuote.nest === 1, "one outer quote with one nested quote", midQuote.html);
    ok(midQuote.innerText === "bbb", "the nested quote is only the middle line", JSON.stringify(midQuote.innerText));
    ok(midQuote.md.split("\n").includes("> > bbb") && !midQuote.md.split("\n").some(l => /^> > aaa/.test(l)), "raw has >> only on bbb", midQuote.md);

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
