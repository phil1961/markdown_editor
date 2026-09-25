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
