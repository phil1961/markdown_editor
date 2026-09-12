#!/usr/bin/env node
/* Parser fixtures. Requires dist/editor.cjs — run `node build.js` first.
   No framework. Revert the fence extraction in src/20-parser.js and this
   file's "fences are opaque" group goes red. */
"use strict";
const fs = require("fs"), path = require("path");
const dist = path.join(__dirname, "..", "dist", "editor.cjs");
if (!fs.existsSync(dist)) {
    console.error("dist/editor.cjs is missing. Run: node build.js");
    process.exit(2);
}
const { MarkdownParser, BUILD } = require(dist);

let pass = 0, fail = 0, group = "";
const G = n => { group = n; console.log("\n" + n); };
const ok = (cond, label, detail) => {
    if (cond) { pass++; console.log("  PASS  " + label); }
    else { fail++; console.log("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
};

G("BUILD");
ok(/^\d+\.\d+/.test(BUILD.version), "BUILD.version is " + BUILD.version);
ok(BUILD.compiled && BUILD.compiled !== "@@COMPILED@@", "compiled DTG was stamped (" + BUILD.compiled + ")");

G("Headers and emphasis");
ok(/<h1>Hello<\/h1>/.test(MarkdownParser.parse("# Hello")), "ATX h1");
ok(/<strong>bold<\/strong>/.test(MarkdownParser.parse("**bold**")), "bold");
ok(/<em>yes<\/em>/.test(MarkdownParser.parse("_yes_")), "underscore italic at word bounds");
ok(!/<em>/.test(MarkdownParser.parse("foo_bar_baz")), "snake_case is not italic");

G("Fences are opaque");
{
    const html = MarkdownParser.parse("```\n**bold**\n# not a header\n```");
    ok(/<pre><code/.test(html), "emits a pre/code block");
    ok(!/<strong>/.test(html), "bold inside a fence is not rewritten", html);
    ok(!/<h1>/.test(html), "a heading line inside a fence is not rewritten", html);
}

G("Nested quotes");
{
    const html = MarkdownParser.parse(">> nested");
    ok((html.match(/<blockquote>/g) || []).length >= 2, ">> becomes two blockquote wrappers", html);
}

G("URL and attribute safety");
{
    const js = MarkdownParser.parse("[x](javascript:alert(1))");
    ok(/href="#/.test(js), "javascript: href is dropped", js);
    ok(!/javascript:/i.test(js), "javascript: does not survive", js);
    const img = MarkdownParser.parse('![x](foo" onerror="alert(1))');
    ok(!/<img[^>]*\sonerror="/i.test(img), "quote in src cannot break out into an onerror attribute", img);
    ok(/<img src="[^"]*" alt="/.test(img), "src and alt remain a single quoted attribute each", img);
}

G("Tables still parse");
{
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |\n";
    const html = MarkdownParser.parse(md);
    ok(/<table>/.test(html) && /<th>A<\/th>/.test(html), "pipe table becomes HTML", html);
}

console.log("\n----------------------------------------------------------");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
