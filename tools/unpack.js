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
