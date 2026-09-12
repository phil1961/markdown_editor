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
const { MarkdownParser, BUILD, Doc } = require(dist);

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

G("Doc model — marks, peel, H1, trailing space");
{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.toggleMark("bold");
    ok(Doc.toMarkdown() === "**abc**", "bold wrap", JSON.stringify(Doc.toMarkdown()));
    Doc.toggleMark("italic");
    const bi = Doc.toMarkdown();
    ok(/\*/.test(bi) && /\*\*/.test(bi), "bold+italic stacked", bi);
    ok(bi === "**_abc_**", "bold+italic serializes without ***", bi);
    Doc.toggleMark("underline");
    Doc.toggleMark("strike");
    const stacked = Doc.toMarkdown();
    ok(/\+\+/.test(stacked) && /~~/.test(stacked), "underline+strike stacked", stacked);
    Doc.toggleMark("underline");
    const peeledU = Doc.toMarkdown();
    ok(!/\+\+/.test(peeledU) && /~~/.test(peeledU) && /\*\*/.test(peeledU), "peel underline keeps the rest", peeledU);
    Doc.toggleMark("bold");
    const peeledB = Doc.toMarkdown();
    ok(!peeledB.includes("**") && /\*/.test(peeledB) && /~~/.test(peeledB), "peel bold keeps italic/strike", peeledB);
}

{
    Doc.load("abc ");
    ok(Doc.toMarkdown() === "abc ", "load keeps a trailing space", JSON.stringify(Doc.toMarkdown()));
    Doc.setSelection(0, 4);
    Doc.toggleMark("bold");
    const md = Doc.toMarkdown();
    ok(md.includes("**abc**") && !md.includes("**abc **"), "trailing space stays outside **", JSON.stringify(md));
    ok(Doc.marksAt(0, 4).has("bold"), "highlighter treats trailing space as outside the mark");
}

{
    Doc.load(" abc");
    Doc.setSelection(0, 4);
    Doc.toggleMark("bold");
    const md = Doc.toMarkdown();
    ok(md.includes("**abc**") && !md.includes("** abc**"), "leading space stays outside **", JSON.stringify(md));
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.toggleBlock("h1");
    ok(/^#\s*abc/.test(Doc.toMarkdown()), "H1 on", Doc.toMarkdown());
    Doc.toggleBlock("h1");
    ok(!/^#/.test(Doc.toMarkdown().trim()), "H1 off", Doc.toMarkdown());
    Doc.setSelection(1, 1);
    Doc.toggleBlock("h1");
    ok(/^#\s*abc/.test(Doc.toMarkdown()), "H1 on with a collapsed caret", Doc.toMarkdown());
}

G("Doc model — split must not re-merge, insert, Enter, round-trip");
{
    Doc.load("abcdef");
    Doc.setSelection(2, 4);
    Doc.toggleMark("bold");
    ok(Doc.toMarkdown() === "ab**cd**ef", "bold a slice inside a run", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abcdef");
    Doc.setSelection(2, 2);
    Doc.insertText("X");
    ok(Doc.toMarkdown() === "abXcdef", "insert in the middle of a run", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abcd");
    Doc.setSelection(2, 2);
    Doc.splitBlock();
    ok(Doc.toMarkdown() === "ab\n\ncd", "Enter splits a paragraph", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.toggleMark("bold");
    Doc.toggleMark("italic");
    const md = Doc.toMarkdown();
    Doc.load(md);
    const html = Doc.html();
    ok(/<strong>/.test(html) && /<em>/.test(html), "bold+italic survives a markdown round-trip", html + " | " + md);
    ok(Doc.toMarkdown() === md, "round-trip is stable", Doc.toMarkdown());
}

{
    const html = MarkdownParser.parse("***xyz***");
    ok(/<strong>/.test(html) && /<em>/.test(html), "***xyz*** is bold+italic", html);
}

{
    Doc.load("abc");
    Doc.setSelection(0, 0);
    Doc.toggleMark("bold");
    ok(Doc.toMarkdown() === "abc", "collapsed caret does not wrap", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abcdef");
    Doc.setSelection(2, 4);
    Doc.deleteBackward();
    ok(Doc.toMarkdown() === "abef", "backspace on a range deletes the range", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abc");
    Doc.setSelection(3, 3);
    Doc.deleteBackward();
    ok(Doc.toMarkdown() === "ab", "backspace deletes one character", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abcd");
    Doc.setSelection(2, 2);
    Doc.splitBlock();
    Doc.setSelection(3, 3);
    Doc.deleteBackward();
    ok(Doc.toMarkdown() === "abcd", "backspace at the start of a paragraph joins it to the previous", JSON.stringify(Doc.toMarkdown()));
}

G("Doc model — numbered and bullet lists");
{
    Doc.load("abc\n\none\n\ntwo\n\nthree");
    Doc.setSelection(0, Doc.totalLen());
    Doc.toggleBlock("ol");
    const md = Doc.toMarkdown();
    ok(md === "1. abc\n2. one\n3. two\n4. three", "numbering several paragraphs makes one list 1–4", JSON.stringify(md));
    const html = Doc.html();
    ok((html.match(/<ol>/g) || []).length === 1, "one <ol>, not one per line", html);
    ok((html.match(/<li>/g) || []).length === 4, "four <li>", html);
}

{
    Doc.load("abc\n\none\n\ntwo");
    Doc.setSelection(0, Doc.totalLen());
    Doc.toggleBlock("ol");
    Doc.toggleBlock("ol");
    ok(Doc.toMarkdown() === "abc\n\none\n\ntwo", "un-number restores separate paragraphs", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.toggleBlock("ol");
    ok(Doc.toMarkdown() === "1. abc", "number a single paragraph", JSON.stringify(Doc.toMarkdown()));
    Doc.setSelection(3, 3);
    Doc.insertText("!");
    ok(Doc.toMarkdown() === "1. abc!", "typing continues in the list item", JSON.stringify(Doc.toMarkdown()));
    Doc.setSelection(4, 4);
    Doc.splitBlock();
    Doc.insertText("one");
    ok(Doc.toMarkdown() === "1. abc!\n2. one", "Enter makes the next numbered item", JSON.stringify(Doc.toMarkdown()));
    Doc.splitBlock();
    ok(Doc.toMarkdown() === "1. abc!\n2. one\n3. ", "Enter on a filled item adds an empty one", JSON.stringify(Doc.toMarkdown()));
    Doc.splitBlock();
    const exited = Doc.toMarkdown();
    ok(exited === "1. abc!\n2. one\n\n" || exited === "1. abc!\n2. one", "Enter on an empty item leaves the list", JSON.stringify(exited));
}

{
    Doc.load("abc\n\none");
    Doc.setSelection(0, Doc.totalLen());
    Doc.toggleBlock("ul");
    ok(Doc.toMarkdown() === "- abc\n- one", "bullet several paragraphs into one list", JSON.stringify(Doc.toMarkdown()));
    Doc.toggleBlock("ol");
    ok(Doc.toMarkdown() === "1. abc\n2. one", "bullet list converts to numbered", JSON.stringify(Doc.toMarkdown()));
}

console.log("\n----------------------------------------------------------");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
