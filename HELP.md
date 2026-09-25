# Markdown Editor — Help

The Markdown Editor is one HTML file that edits Markdown with a live, editable preview. It installs nothing and makes no network requests. Open this guide with F1 or the Help button; **Download help (.md)** at the top saves it as a file.

The last section, **For an AI: rebuilding from this file**, is for an AI assistant that has only this guide and markdown-editor.html. Give it both files.

## Getting started

Open markdown-editor.html in Chrome, Edge, Brave, Firefox or Safari. Your document stays in the page until you save it.

- Type Markdown in the left pane (raw) and see it rendered in the right pane (preview).
- The preview is editable too. Type, select and format there, and the raw Markdown follows.
- Drag the bar between the panes to resize them. Double-click the bar to reset it.
- Editor, Both and Preview on the toolbar show one pane or both.

> [!TIP]
> Both panes edit the same document. Undo (Ctrl+Z) steps back through changes made in either one.

## Formatting

Select text in either pane, then use the toolbar or a shortcut.

- **Bold** (Ctrl+B), italic (Ctrl+I), underline (Ctrl+U), strikethrough and inline code.
- H1 to H6 turn the line into a heading. Press the same button again to turn it back into text.
- Bullet and numbered lists. Enter adds the next item; Enter on an empty item leaves the list.
- Quote + adds a quote level each time and Quote − removes one. With some lines inside a quote selected, only those lines change.
- Horizontal rule. To remove one, click it and press Backspace.

Underline is written as two plus signs on each side of the text. That is this editor's own extension; GitHub shows the plus signs as typed.

## Code blocks and colours

The Code Block button turns the selected lines into a code block, or inserts an empty one at the caret. Enter inside a code block adds a line of code; click below the box to type outside it.

Give a code block a language and it is coloured, with the language named in its top-right corner. Either choose one from the language list beside the Code Block button (it is enabled while the caret is inside a code block), or, in the raw pane, type the language straight after the three backticks that open the block.

Coloured languages: Shell (also sh, bash, zsh), PowerShell (ps1, pwsh), JavaScript and TypeScript, JSON, Python, CSS, HTML and XML, SQL, YAML, Diff, and the C family: C, C#, Java, Go, Rust, Kotlin and Swift. Any other name shows plain, still labelled.

```powershell
# Copy today's logs to the backup share
$src = Join-Path $env:TEMP 'logs'
Get-ChildItem -Path $src -Filter *.log | Copy-Item -Destination 'D:\backup' -Force
```

```diff
--- a/config.yml
+++ b/config.yml
 name: nightly
-retries: 3
+retries: 5
```

## Callouts

A quote whose first line is a type in square brackets becomes a coloured panel with a title. It is GitHub's syntax, so the file looks the same there.

```markdown
> [!WARNING]
> Back up the folder before running the script.
```

The types are NOTE, TIP, IMPORTANT, WARNING and CAUTION. The marker must be alone on the first quoted line. The Callout list beside the quote buttons sets, changes or removes the type of the quote at the caret; on an ordinary paragraph it makes a new callout.

> [!NOTE]
> Useful information to notice even when skimming.

> [!TIP]
> Advice that makes something easier.

> [!IMPORTANT]
> Something needed to succeed.

> [!WARNING]
> Something that needs attention right away.

> [!CAUTION]
> A risk of losing work or doing damage.

## Links, images and tables

- Insert Link (Ctrl+K) and Insert Image ask for the text and the address, then insert at the caret.
- Insert Table asks for rows and columns. With the caret in a table, the buttons beside it insert and delete rows and columns.
- Table cells hold plain text.

## Undo and history

- Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes, across both panes. The Undo and Redo tooltips name the step.
- Ctrl+Shift+H, or the clock button, opens History: every step, newest first, with what it changed. Click a row to jump to it.

## Find in other pane and scroll sync

- Select a word, or leave the caret in one, in either pane and click the crosshair beside Track. The same occurrence is selected in the other pane and scrolled into view.
- Track keeps the two panes scrolled together. Click it to turn that off.

## Opening, saving and exporting

- Open (Ctrl+O), or drop a file onto either pane. The editor opens .md, .markdown, .txt and .html files; HTML is converted to Markdown.
- In Chrome, Edge and Brave, Save (Ctrl+S) writes back to the file you opened. A new document asks where the first time. Save As (Ctrl+Shift+S) always asks.
- In Firefox and Safari, Save downloads a copy instead.
- Export As saves Markdown, HTML (with colours and callouts) or plain text, always as a download.
- File, Download this editor saves markdown-editor.html so you can keep using it offline.

> [!CAUTION]
> Closing the tab loses unsaved changes. The browser asks before you leave a page with changes that are not saved.

## Windows Explorer and the command line

These come with the project folder, not with the HTML file alone. markdown-editor.ps1 -Install adds Open with Markdown Editor to the right-click menu for .md files without changing the default app. markdown-editor.bat followed by a file name opens that file from a prompt. The launcher puts a copy of the editor, with your file inside it, in %TEMP%.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| F1 | Open or close this help |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+K | Insert link |
| Ctrl+Z | Undo |
| Ctrl+Y or Ctrl+Shift+Z | Redo |
| Ctrl+Shift+H | History panel |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+O | Open |
| Ctrl+N | New document |
| Ctrl+Shift+L | Debug log panel |
| Escape | Close menus, dialogs and this help |

## Troubleshooting

- **Save downloads a file instead of writing back.** This browser cannot write to files (Firefox, Safari), or the editor is embedded in another page. Use Chrome, Edge or Brave with the editor opened from disk.
- **A code block is not coloured.** Check the language name after the opening backticks; unknown names stay plain. Choose one from the language list instead.
- **A callout shows as an ordinary quote.** The marker must be alone on the first quoted line, with nothing after the closing bracket.

## For an AI: rebuilding from this file

Read this whole section before changing anything. It assumes you have only two files: markdown-editor.html and this guide. If you have the full repository (a src folder, build.js and a tests folder), skip to Step 3 and read HANDOFF.md there as well.

> [!IMPORTANT]
> Never edit markdown-editor.html by hand. It is generated. Unpack it into source, change the source, and rebuild. A hand edit is lost at the next build and breaks the markers the unpack step relies on.

### What the editor is

- One HTML file with one inline style block and one inline script. It must keep working when opened straight from disk (file://) with zero network requests: no link or script-src tags, no fetch, no ES modules, no npm packages, no CDN.
- The script is plain JavaScript files concatenated in filename order. Each file declares one top-level const (Doc, Highlight, FileOps and so on). The numeric filename prefixes are the load order. Do not convert them to imports.
- The document model, Doc in 16-doc.js, is the source of truth. The raw textarea and the editable preview are two views of it. Preview input events are cancelled and turned into Doc operations; the raw pane reloads Doc from its Markdown. Never sync the panes by converting preview HTML back into Markdown.
- Every change to the document records an undo step: History.commit(label) for a discrete action, History.schedule(label) for typing. A change without one is folded into the next step.
- Confirmations and notices use the in-page Dialog (Dialog.ask and Dialog.tell). Never call the browser's alert or confirm; sandboxed frames silently ignore them.

### Step 1 — Save the unpack tool

You need Node.js 18 or later, and Node 22 or later for the browser check. Copy the code in Appendix A, exactly, into a file named tools/unpack.js in the folder that holds markdown-editor.html.

### Step 2 — Unpack and prove the round trip

```shell
node tools/unpack.js markdown-editor.html
node build.js --check
```

Unpacking writes the src folder (page shell, stylesheet, every module, and help.md, the source of this guide), build.js, HELP.md and tests/smoke.browser.js beside the HTML. It drops the file payload the Windows launcher injects into its temporary copies.

The check must report that markdown-editor.html matches src exactly and that HELP.md is current. If it does not, stop: the HTML was edited by hand, or it predates version 1.5.0.

### Step 3 — Find your way around

| File in src | What it holds |
| --- | --- |
| page.html | The page markup, with placeholders where the stylesheet and script go |
| style.css | All styles. Markdown styles are shared by the preview and this help panel |
| help.md | This guide. Lines that include a file become the appendices |
| 00-build.js | BUILD: version, release date, compile stamp, and the list of user-visible corrections |
| 10-logger.js | Logger, shown in the debug panel (Ctrl+Shift+L) |
| 15-highlight.js | Highlight: syntax colouring for code blocks |
| 16-doc.js | Doc: parse, serialize, render, editing operations, caret mapping |
| 18-locate.js | Locate: maps a selection between the raw pane and the preview |
| 19-rawblocks.js | RawBlocks: the code block or quote around the raw-pane caret |
| 20-parser.js | MarkdownParser: Markdown to clean HTML for export |
| 25-htmlmd.js | HtmlToMarkdown: HTML file import |
| 30-state.js | AppState: current file, active pane, modified flag |
| 35-history.js | History: the undo stack and its panel |
| 40-editor.js | TableOps, EditorOps (raw pane edits), BlockStyleOps (language and callout lists) |
| 50-preview.js | PreviewOps: preview keyboard, typing and paste become Doc operations |
| 60-chrome.js | Scroll sync, view modes, the pane splitter, toolbar state, Find in other pane |
| 70-file.js | FileOps: open, save, export; drag and drop |
| 80-modals.js | Dialog, the link and image modals, HelpOps (this panel) |
| 90-dom.js | DOM: element references |
| 97-app.js | Event wiring, keyboard shortcuts, start-up |

Files that need a browser document say @requires-dom in their first comment. build.js also writes the others to dist/editor.cjs, so parser and model questions can be answered in Node:

```shell
node -e "const { Doc } = require('./dist/editor.cjs'); console.log(Doc.html(Doc.parse('> [!NOTE]\n> hi')))"
```

### Step 4 — Change the source and rebuild

- Edit files under src. Keep the numeric prefixes unless you mean to change the load order.
- Bump BUILD.version in src/00-build.js, and add an entry to BUILD.corrections describing the change in the user's terms.
- If users will notice the change, update the user sections of src/help.md, and keep this section true.
- Run node build.js. It rewrites markdown-editor.html, HELP.md and dist/editor.cjs.

build.js stops with an error when the output still contains two at-signs in a row (its placeholder marker; never write that pair anywhere in src), or when a file named on an include line of src/help.md is missing, has CR line endings, does not end with exactly one newline, or contains three backticks in a row.

### Step 5 — Verify by running, not by reading

```shell
node build.js --check
node tests/smoke.browser.js markdown-editor.html
```

The smoke check starts Chrome, Edge, Brave or Chromium headless and drives the real page over the DevTools protocol, with no Playwright and no packages. It checks that the page boots, typing in each pane reaches the other, Bold works, code is coloured, callouts render, and this help opens. It exits 0 when everything passes (or when no browser is installed, and says skipped) and 1 when a check fails. Add a check, in the same style, for any behaviour you change, and confirm it fails before your fix.

Settle parser and model questions with Node against dist/editor.cjs, and layout or interaction questions in the browser.

### Step 6 — Hand back

Return the rebuilt markdown-editor.html and HELP.md. Those two files are the product; everything else can be unpacked from them again.

### Pitfalls that have bitten before

- When marking part of a run of text, do not merge the two halves back together before the mark is applied (see splitInlines in 16-doc.js), or bolding a word with a trailing space silently does nothing.
- Toolbar buttons must not take focus from the preview; the toolbar cancels mousedown on buttons. A select does take focus, so its handler uses the selection Doc already holds and hands focus back.
- Highlight.tokens must return pieces that join back to exactly the input. The caret mapping counts characters.
- A numbered list split into several lists renumbers from 1 in each; selected paragraphs become one list.
- Test changes by executing them. A claim about the parser is settled by running it, a claim about layout by the browser check.

### Appendix A — tools/unpack.js

Save as `tools/unpack.js`:

```js
#!/usr/bin/env node
/* =========================================================================
   Markdown Editor — unpack

   Usage:  node tools/unpack.js [markdown-editor.html] [out-dir]

   Splits the shipped single-file editor back into the tree build.js
   assembles, so the .html alone is enough to keep developing:

     src/page.html  src/style.css  src/NN-name.js ...  src/help.md  HELP.md
     build.js  tools/unpack.js  tests/smoke.browser.js   (carried in the help)

   out-dir defaults to the folder holding the .html. Then, in out-dir:

     node build.js --check     must report that everything matches
     node build.js             after you edit src/

   No dependencies. It reads the marker comments build.js writes.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path");

const input = path.resolve(process.argv[2] || "markdown-editor.html");
const outDir = path.resolve(process.argv[3] || path.dirname(input));
const AT = "@", TICKS = "`".repeat(3);
const token = name => AT + AT + name + AT + AT;        /* build.js placeholders */
const mark = label => "/* ==== " + label + " ==== */";
const OLD = " (was this .html built by build.js from version 1.5.0 or later?)";

function die(msg) { console.error("unpack: " + msg); process.exit(1); }
if (!fs.existsSync(input)) die("no file at " + input);

/* LF only, and no launcher payload (markdown-editor.ps1 injects one before </head>). */
let html = fs.readFileSync(input, "utf8").replace(/\r\n/g, "\n")
  .replace(/<script>window\.MD_PAYLOAD=[^\n]*?;<\/script>/, "");
const files = {};

/* Script: marker line + module text for each module, joined with "\n",
   then "\n" + the end marker. The embedded help comes last. */
const first = /^\/\* ==== module \S+ ==== \*\/$/m.exec(html);
if (!first) die("no module markers found" + OLD);
const endMark = "\n" + mark("end script");
const end = html.indexOf(endMark, first.index);
if (end < 0) die("the end-of-script marker is missing" + OLD);
const body = html.slice(first.index, end);
const parts = [];
const re = /^\/\* ==== (?:module (\S+)|generated HELP_MD from src\/help\.md) ==== \*\/\n/gm;
for (let m; (m = re.exec(body)); ) parts.push({ name: m[1] || null, start: m.index, textStart: m.index + m[0].length });
let helpMd = null;
parts.forEach((p, i) => {
  const text = body.slice(p.textStart, i + 1 < parts.length ? parts[i + 1].start - 1 : body.length);
  if (p.name) { files["src/" + p.name] = text; return; }
  const hm = /^const HELP_MD = ("(?:[^"\\\n]|\\.)*");\n$/.exec(text);
  if (!hm) die("the embedded help is malformed");
  helpMd = JSON.parse(hm[1]);
});
if (helpMd === null) die("no embedded help (HELP_MD) found" + OLD);
html = html.slice(0, first.index) + token("SCRIPT") + html.slice(end + endMark.length);

const open = mark("begin style.css") + "\n", close = "\n" + mark("end style.css");
const a = html.indexOf(open), b = a < 0 ? -1 : html.indexOf(close, a + open.length);
if (a < 0 || b < 0) die("the style.css markers are missing" + OLD);
files["src/style.css"] = html.slice(a + open.length, b);
files["src/page.html"] = html.slice(0, a) + token("STYLE") + html.slice(b + close.length);

/* The compile stamp goes back to its placeholder. */
const buildInfo = files["src/00-build.js"];
if (!buildInfo) die("src/00-build.js is not in the page" + OLD);
files["src/00-build.js"] = buildInfo.replace(/compiled:(\s*)"[^"]*"/, (_, ws) => "compiled:" + ws + '"' + token("COMPILED") + '"');

/* The help: each "Save as `path`:" fence becomes that file, and the source
   keeps the include line build.js expands. */
const include = new RegExp("^Save as `([^`\\n]+)`:\\n\\n" + TICKS + "[\\w+#-]*\\n([\\s\\S]*?)\\n" + TICKS + "$", "gm");
files["src/help.md"] = helpMd.replace(include, (_, rel, text) => {
  files[rel] = text + "\n";
  return "<!-- include: " + rel + " -->";
});
files["HELP.md"] = helpMd;

for (const [rel, text] of Object.entries(files)) {
  if (path.isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) die("refusing to write outside the output folder: " + rel);
  const abs = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
  console.log("  " + rel.padEnd(28) + text.length + " bytes");
}
console.log("unpack: wrote " + Object.keys(files).length + " files under " + outDir);
console.log("next:   cd " + JSON.stringify(outDir) + " && node build.js --check");
```

### Appendix B — build.js

Unpacking writes this file too. It is shown here so it can be read without running anything.

Save as `build.js`:

```js
#!/usr/bin/env node
/* =========================================================================
   Markdown Editor — assembler

   Usage:  node build.js [--check] [--quiet]
           node build.js            write markdown-editor.html, HELP.md and
                                    dist/editor.cjs
           node build.js --check    build in memory, diff against the files on
                                    disk, exit 1 if they differ. Nothing written.

   No dependencies. This is deliberately the dumbest thing that can work.

   Straight concatenation in filename order, then two string substitutions
   into the page shell. No minification, no transpilation, no dependency
   graph, no rewriting of the module text. Do not convert these to ES
   modules with real imports — that changes evaluation order and it stops
   being a refactor. The numeric prefixes ARE the dependency order.

   A one-line marker comment precedes each module and brackets the CSS, so
   tools/unpack.js can split the shipped .html back into src/ exactly. The
   help is src/help.md with each "<!-- include: path -->" line replaced by
   that file in a fence; it is written to HELP.md and embedded as HELP_MD
   after the last module.

   The single-file form is a product requirement: the output is one HTML
   file that works on file:// with zero network requests.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path");

const ROOT   = __dirname;
const SRC    = path.join(ROOT, "src");
const TARGET = path.join(ROOT, "markdown-editor.html");
const HELP   = path.join(ROOT, "HELP.md");
const DIST   = path.join(ROOT, "dist", "editor.cjs");
const TICKS  = "`".repeat(3);

const args  = process.argv.slice(2);
const CHECK = args.includes("--check");
const QUIET = args.includes("--quiet");
const log   = (...a) => { if (!QUIET) console.log(...a); };

function toDTG(d) {
  const p2 = n => String(n).padStart(2, "0");
  const MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return p2(d.getUTCDate()) + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + "Z "
       + MON[d.getUTCMonth()] + " " + String(d.getUTCFullYear()).slice(-2);
}
const DTG_RE   = /compiled:(\s*)"[^"]*"/;
const normDTG  = s => s.replace(DTG_RE, (_, ws) => "compiled:" + ws + '"@@COMPILED@@"');
const stampDTG = (s, dtg) => s.replace(DTG_RE, (_, ws) => "compiled:" + ws + '"' + dtg + '"');
const readDTG  = s => { const m = /compiled:\s*"([^"]*)"/.exec(s); return m ? m[1] : null; };

const mark = label => "/* ==== " + label + " ==== */";
const HELP_MARK = "generated HELP_MD from src/help.md";

function modules() {
  return fs.readdirSync(SRC)
    .filter(f => f.endsWith(".js"))
    .sort()
    .map(f => ({
      name: f,
      text: fs.readFileSync(path.join(SRC, f), "utf8")
    }));
}

/* src/help.md with every "<!-- include: path -->" line replaced by that file
   in a fence. tools/unpack.js reverses this, so an included file must use LF,
   end with exactly one newline, and never contain three backticks. */
function helpText() {
  const file = path.join(SRC, "help.md");
  if (!fs.existsSync(file)) fail("src/help.md is missing");
  return fs.readFileSync(file, "utf8").replace(/^<!-- include: (\S+) -->$/gm, (_, rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) fail("src/help.md includes " + rel + ", which does not exist");
    const body = fs.readFileSync(abs, "utf8");
    if (body.includes("\r")) fail(rel + " has CR line endings; files included in the help must be LF");
    if (!/[^\n]\n$/.test(body)) fail(rel + " must end with exactly one newline to be included in the help");
    if (body.includes(TICKS)) fail(rel + " contains three backticks in a row, which would close its fence in the help");
    return "Save as `" + rel + "`:\n\n" + TICKS + path.extname(rel).slice(1) + "\n" + body + TICKS;
  });
}

/* JSON with < and @ as \u escapes: no </script> inside the page, and no
   double at-sign to trip the unsubstituted-marker check. */
function helpModule(md) {
  const special = new RegExp("[<@" + String.fromCharCode(0x2028, 0x2029) + "]", "g");
  return "const HELP_MD = " + JSON.stringify(md).replace(special,
    c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) + ";\n";
}

function assemble() {
  const page = fs.readFileSync(path.join(SRC, "page.html"), "utf8");
  const css  = fs.readFileSync(path.join(SRC, "style.css"), "utf8");
  const mods = modules();
  const help = helpText();

  for (const m of ["@@STYLE@@", "@@SCRIPT@@"])
    if (page.indexOf(m) < 0) fail("src/page.html has no " + m + " marker");
  if (!mods.length) fail("no .js modules found in src/");

  const js = mods.map(m => mark("module " + m.name) + "\n" + m.text)
    .concat(mark(HELP_MARK) + "\n" + helpModule(help))
    .join("\n") + "\n" + mark("end script");
  const style = mark("begin style.css") + "\n" + css + "\n" + mark("end style.css");
  const out = page.replace("@@STYLE@@", () => style).replace("@@SCRIPT@@", () => js);
  if (stampDTG(out, "").indexOf("@@") >= 0) fail("an unsubstituted @@MARKER@@ survived into the output");
  return { text: out, mods, help };
}

function fail(msg) { console.error("build: " + msg); process.exit(2); }

function assembleDist(help) {
  const mods = modules().filter(m => !/@requires-dom/.test(m.text));
  const names = mods.map(m => {
    const hit = /^const ([A-Za-z_$][\w$]*)\s*=/m.exec(m.text);
    if (!hit) fail(m.name + " declares no top-level const, so nothing can be exported from it");
    return hit[1];
  });
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) fail("two modules both declare " + dupes[0]);
  return "/* GENERATED by build.js — do not edit. Rebuild with: node build.js */\n"
       + '"use strict";\n'
       + mods.map(m => m.text).join("\n")
       + "\n" + helpModule(help)
       + "module.exports = { " + names.concat("HELP_MD").join(", ") + " };\n";
}

function firstDiff(a, b) {
  const x = a.split("\n"), y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if (x[i] !== y[i]) return { line: i + 1, built: x[i], onDisk: y[i] };
  return null;
}

const { text: rawText, mods, help } = assemble();
const rawDist = assembleDist(help);

if (CHECK) {
  if (!fs.existsSync(TARGET)) fail("nothing to check against — " + path.basename(TARGET) + " is missing");
  const onDisk = fs.readFileSync(TARGET, "utf8");
  if (normDTG(rawText) !== normDTG(onDisk)) {
    const d = firstDiff(normDTG(rawText), normDTG(onDisk));
    console.error("build --check: " + path.basename(TARGET) + " does NOT match src/.");
    console.error("Someone edited the assembled file directly, or src/ changed without a rebuild.");
    if (d) {
      console.error("  first difference at line " + d.line);
      console.error("    from src/: " + JSON.stringify(String(d.built).slice(0, 100)));
      console.error("    on disk:   " + JSON.stringify(String(d.onDisk).slice(0, 100)));
    }
    console.error("  built " + rawText.length + " bytes, on disk " + onDisk.length + " bytes");
    process.exit(1);
  }
  if (!fs.existsSync(HELP) || fs.readFileSync(HELP, "utf8") !== help) {
    console.error("build --check: " + path.basename(TARGET) + " matches, but HELP.md is " + (fs.existsSync(HELP) ? "STALE" : "missing") + ".");
    console.error("Run: node build.js");
    process.exit(1);
  }
  if (fs.existsSync(DIST) && normDTG(fs.readFileSync(DIST, "utf8")) !== normDTG(rawDist)) {
    console.error("build --check: " + path.basename(TARGET) + " matches, but dist/editor.cjs is STALE.");
    console.error("Run: node build.js");
    process.exit(1);
  }
  log("build --check: " + path.basename(TARGET) + " matches src/ exactly ("
      + mods.length + " modules, " + rawText.length + " bytes; compile DTG not compared); HELP.md current"
      + (fs.existsSync(DIST) ? "; dist/editor.cjs current" : "; dist/editor.cjs not built yet"));
  process.exit(0);
}

const before = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : null;
const reuse = before && normDTG(rawText) === normDTG(before) ? readDTG(before) : null;
const dtg   = reuse || toDTG(new Date());
const text     = stampDTG(rawText, dtg);
const distText = stampDTG(rawDist, dtg);
fs.writeFileSync(TARGET, text);
log("build: wrote " + path.basename(TARGET) + " — " + mods.length + " modules, "
    + text.length + " bytes, compiled " + dtg
    + (before === null ? " (new)" : before === text ? " (unchanged)" : " (CHANGED)"));

const helpBefore = fs.existsSync(HELP) ? fs.readFileSync(HELP, "utf8") : null;
fs.writeFileSync(HELP, help);
log("build: wrote HELP.md — " + help.length + " bytes"
    + (helpBefore === null ? " (new)" : helpBefore === help ? " (unchanged)" : " (CHANGED)"));

fs.mkdirSync(path.dirname(DIST), { recursive: true });
const distBefore = fs.existsSync(DIST) ? fs.readFileSync(DIST, "utf8") : null;
fs.writeFileSync(DIST, distText);
log("build: wrote dist/editor.cjs — " + distText.length + " bytes"
    + (distBefore === null ? " (new)" : distBefore === distText ? " (unchanged)" : " (CHANGED)"));
if (!QUIET) mods.forEach(m =>
  log("  " + m.name.padEnd(16) + m.text.split("\n").length + " lines"));
```

### Appendix C — tests/smoke.browser.js

Save as `tests/smoke.browser.js`:

```js
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
```
