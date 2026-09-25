#!/usr/bin/env node
/* Parser fixtures. Requires dist/editor.cjs — run `node build.js` first.
   No framework. Revert the fence extraction in src/20-parser.js and this
   file's "fences are opaque" group goes red. */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { spawnSync } = require("child_process");
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

G("Doc model — pasted numbered lists stay one list");
{
    Doc.load("1. abc\n\n2. one\n\n3. two");
    const html = Doc.html();
    ok((html.match(/<ol>/g) || []).length === 1, "blank lines between 1. 2. 3. are still one <ol>", html);
    ok((html.match(/<li>/g) || []).length === 3, "three items", html);
    ok(Doc.toMarkdown() === "1. abc\n2. one\n3. two", "renumbers as 1. 2. 3.", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("1. abc\n\n1. one\n\n1. two");
    const html = Doc.html();
    ok((html.match(/<ol>/g) || []).length === 1, "pasted 1. 1. 1. is still one list", html);
    ok(Doc.toMarkdown() === "1. abc\n2. one\n3. two", "1. 1. 1. becomes 1. 2. 3. in markdown", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("");
    Doc.paste("1. abc\n\n2. one\n\n3. two");
    const html = Doc.html();
    ok((html.match(/<ol>/g) || []).length === 1, "paste of a loose list is one <ol>", html);
    ok(Doc.toMarkdown() === "1. abc\n2. one\n3. two", "paste markdown is 1. 2. 3.", JSON.stringify(Doc.toMarkdown()));
}

{
    const html = MarkdownParser.parse("1. abc\n\n2. one\n\n3. two");
    ok((html.match(/<ol>/g) || []).length === 1, "export HTML has one <ol>", html);
    ok((html.match(/<li>/g) || []).length === 3, "export HTML has three <li>", html);
}

G("Doc model — quote indent nests, does not toggle off");
{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.indentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 1, "first >+ wraps once", Doc.html());
    ok(/^>\s*abc/m.test(Doc.toMarkdown()), "raw has one >", Doc.toMarkdown());
    Doc.indentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 2, "second >+ nests, does not unwrap", Doc.html());
    Doc.indentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 3, "third >+ is a triple indent", Doc.html());
    Doc.outdentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 2, ">- removes one level", Doc.html());
    Doc.outdentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 1, ">- again leaves one level", Doc.html());
    Doc.outdentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 0, ">- on the last level unwraps", Doc.html());
    ok(!/^>/m.test(Doc.toMarkdown().trim()), "raw has no quote marker", Doc.toMarkdown());
}

{
    Doc.load("abc\n\none");
    Doc.setSelection(0, Doc.totalLen());
    Doc.indentQuote();
    Doc.indentQuote();
    const html = Doc.html();
    ok((html.match(/<blockquote>/g) || []).length === 2, "two selected paragraphs nest together", html);
    Doc.setSelection(3, 3);
    Doc.insertText("!");
    ok(/abc!/.test(Doc.toMarkdown()), "typing still works inside a nested quote", Doc.toMarkdown());
}

{
    Doc.load("aaa\n\nbbb\n\nccc");
    Doc.setSelection(0, Doc.totalLen());
    Doc.indentQuote();
    Doc.setSelection(4, 7);
    Doc.indentQuote();
    const html = Doc.html();
    const md = Doc.toMarkdown();
    ok((html.match(/<blockquote>/g) || []).length === 2, "middle line gets its own nested quote", html);
    ok(/<blockquote>[\s\S]*aaa[\s\S]*<blockquote>[\s\S]*bbb[\s\S]*<\/blockquote>[\s\S]*ccc/.test(html),
        "aaa and ccc stay at one level, bbb is nested", html);
    const qlines = md.split("\n");
    ok(qlines.includes("> > bbb") && qlines.includes("> aaa") && qlines.includes("> ccc")
        && !qlines.some(l => /^> > (aaa|ccc)/.test(l)),
        "raw has >> only on the middle line", md);
    Doc.setSelection(4, 7);
    Doc.outdentQuote();
    const after = Doc.toMarkdown();
    const alines = after.split("\n");
    ok(alines.includes("> aaa") && alines.includes("> bbb") && alines.includes("> ccc")
        && !alines.some(l => /^> >/.test(l)),
        ">- on the middle line only removes that extra indent", after);
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.indentQuote();
    Doc.setSelection(3, 3);
    Doc.splitBlock();
    const g = Doc.get();
    ok(g.blocks[0].type === "quote" && g.blocks[1] && g.blocks[1].type === "p",
        "Enter at the end of a quote starts an unquoted line after it, not a blank quoted line",
        JSON.stringify(g.blocks.map(b => b.type)));
    ok(!(g.blocks[0].blocks || []).some(b => !(b.inlines && b.inlines.length)),
        "the quote does not keep a trailing empty paragraph", JSON.stringify(g.blocks[0].blocks));
}

{
    Doc.load("aaa\n\nbbb");
    Doc.setSelection(Doc.totalLen(), Doc.totalLen());
    Doc.splitBlock();
    Doc.setSelection(0, Doc.totalLen());
    Doc.indentQuote();
    const g = Doc.get();
    const innerEmpty = (g.blocks[0].blocks || []).filter(b => b.type === "p" && !((b.inlines || []).some(r => r.text)));
    ok(g.blocks[0].type === "quote" && innerEmpty.length === 0,
        "a trailing blank line is not wrapped into the quote", JSON.stringify(g.blocks));
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.indentQuote();
    const g = Doc.get();
    const last = g.blocks[g.blocks.length - 1];
    ok(last && last.type === "p", "after a quote there is a paragraph to land the caret in", JSON.stringify(g.blocks.map(b => b.type)));
    ok(/^>\s*abc\s*$/.test(Doc.toMarkdown()), "the landing paragraph is not written into the markdown", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("# Hello");
    const g = Doc.get();
    ok(g.blocks[0].type === "h1" && g.blocks[g.blocks.length - 1].type === "p",
        "after a heading there is a paragraph to land the caret in");
    ok(/^#\s*Hello\s*$/.test(Doc.toMarkdown()), "that landing paragraph is not in the markdown", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("abc");
    Doc.setSelection(0, 3);
    Doc.indentQuote();
    Doc.indentQuote();
    Doc.setSelection(0, Doc.totalLen());
    Doc.outdentQuote();
    ok((Doc.html().match(/<blockquote>/g) || []).length === 1,
        ">- still unwraps one level when the landing paragraph is in the selection", Doc.html());
}

G("Doc model — numbering inside a quote keeps one item per line");
{
    Doc.load("a\n\nb\n\nc");
    Doc.setSelection(0, Doc.totalLen());
    Doc.indentQuote();
    Doc.setSelection(0, Doc.totalLen());
    Doc.toggleBlock("ol");
    const md = Doc.toMarkdown();
    const html = Doc.html();
    ok(!/1\.\s*a\s+b\s+c/.test(md) && /1\.\s*a/.test(md) && /2\.\s*b/.test(md) && /3\.\s*c/.test(md),
        "quoted a, b, c number as 1. 2. 3. not '1. a b c'", md);
    ok((html.match(/<li>/g) || []).length === 3, "three list items", html);
    ok((html.match(/<blockquote>/g) || []).length === 1, "still inside one quote", html);
}

G("Doc model — Enter stays inside a code block");
{
    Doc.load("hello");
    Doc.setSelection(0, 5);
    Doc.toggleBlock("pre");
    ok(Doc.get().blocks[0].type === "pre", "code block wraps the line");
    Doc.setSelection(5, 5);
    Doc.splitBlock();
    ok(Doc.get().blocks[0].type === "pre" && Doc.get().blocks[0].text === "hello\n",
        "Enter at the end of the code stays in the fence", JSON.stringify(Doc.get().blocks[0]));
    Doc.insertText("world");
    ok(Doc.get().blocks[0].text === "hello\nworld", "typing after Enter is still in the code", Doc.get().blocks[0].text);
    ok(/```[\s\S]*hello\nworld/.test(Doc.toMarkdown()), "markdown fence contains both lines", Doc.toMarkdown());
}

{
    Doc.load("a\n\nb");
    Doc.setSelection(0, Doc.totalLen());
    Doc.toggleBlock("pre");
    ok(Doc.get().blocks[0].type === "pre" && Doc.get().blocks[0].text === "a\nb",
        "several paragraphs become one fence with newlines", JSON.stringify(Doc.get().blocks[0]));
}

{
    Doc.load("");
    Doc.setSelection(0, 0);
    Doc.toggleBlock("pre");
    ok(Doc.get().blocks[0].type === "pre" && Doc.get().blocks[0].text === "",
        "code-block with no selection inserts an empty fence", JSON.stringify(Doc.get().blocks[0]));
    Doc.insertText("x");
    ok(Doc.get().blocks[0].type === "pre" && Doc.get().blocks[0].text === "x",
        "typing goes into that empty fence", Doc.get().blocks[0].text);
}

{
    Doc.load("hello");
    Doc.setSelection(5, 5);
    Doc.toggleBlock("pre");
    const types = Doc.get().blocks.map(b => b.type);
    ok(types[0] === "p" && types.includes("pre"),
        "caret at the end of a paragraph inserts a fence after it", types.join(","));
    const pre = Doc.get().blocks.find(b => b.type === "pre");
    ok(pre && pre.text === "", "the inserted fence is empty");
}

G("Doc model — insert a link as a real <a>");
{
    Doc.load("hello");
    Doc.setSelection(0, 5);
    Doc.insertInlineMarkdown("[hello](https://example.com)");
    const html = Doc.html();
    ok(/<a href="https:\/\/example.com">hello<\/a>/.test(html), "link is an anchor, not typed into a form", html);
    ok(/\[hello\]\(https:\/\/example.com\)/.test(Doc.toMarkdown()), "raw markdown is [hello](url)", Doc.toMarkdown());
}

G("Doc model — horizontal rule inserts and deletes");
{
    Doc.load("abc");
    Doc.setSelection(3, 3);
    Doc.insertHr();
    ok(/---/.test(Doc.toMarkdown()), "HR inserts a ---", Doc.toMarkdown());
    ok(/<hr/.test(Doc.html()), "preview has an <hr>", Doc.html());
    const types = Doc.get().blocks.map(b => b.type);
    ok(types.includes("hr"), "there is an hr block", types.join(","));
    const hr = Doc.get().blocks.findIndex(b => b.type === "hr");
    const ixFrom = (() => { Doc.previewHTML(); return true; })();
    Doc.setSelection(4, 5);
    Doc.insertHr();
    ok(!Doc.get().blocks.some(b => b.type === "hr"), "HR button on the rule removes it", Doc.get().blocks.map(b => b.type).join(","));
}

{
    Doc.load("abc");
    Doc.setSelection(3, 3);
    Doc.insertHr();
    Doc.setSelection(4, 5);
    Doc.deleteBackward();
    ok(!Doc.get().blocks.some(b => b.type === "hr"), "Backspace removes the rule", Doc.toMarkdown());
    ok(/abc/.test(Doc.toMarkdown()), "the text before the rule remains", Doc.toMarkdown());
}

G("Doc model — table row and column edits");
{
    Doc.load("| A | B |\n| --- | --- |\n| 1 | 2 |\n");
    Doc.setSelection(0, 1);
    const ctx = Doc.tableContext();
    ok(ctx && ctx.row === 0 && ctx.col === 0, "caret in header cell A", JSON.stringify(ctx));
    Doc.insertRow("below");
    ok(Doc.get().blocks.find(b => b.type === "table").rows.length === 3, "insert row below adds a row");
    Doc.setSelection(0, 1);
    Doc.insertCol("right");
    ok(Doc.get().blocks.find(b => b.type === "table").rows[0].length === 3, "insert column right adds a column");
    Doc.setSelection(0, 1);
    Doc.deleteCol();
    ok(Doc.get().blocks.find(b => b.type === "table").rows[0].length === 2, "delete column removes it");
    Doc.setSelection(0, 1);
    Doc.deleteRow();
    ok(Doc.get().blocks.find(b => b.type === "table").rows.length === 2, "delete row removes one");
    const md = Doc.toMarkdown();
    ok(/\|/.test(md), "table still serializes as pipes", md);
}

G("Doc model — Enter on an empty list item leaves the list, at the top level and inside a quote");
{
    Doc.load("> - a\n> - b");
    Doc.setSelection(3, 3);
    Doc.splitBlock();
    ok(Doc.get().blocks[0].type === "quote" && Doc.get().blocks[0].blocks[0].items.length === 3,
        "Enter at the end of the last quoted item adds an empty item", JSON.stringify(Doc.get().blocks[0]));
    ok(Doc.selection().from === 4, "caret is in the empty item", JSON.stringify(Doc.selection()));
    Doc.splitBlock();
    const q = Doc.get().blocks[0];
    ok(q.type === "quote" && q.blocks.length === 2 && q.blocks[0].items && q.blocks[1].type === "p",
        "the empty item becomes a paragraph after the list, still inside the quote", JSON.stringify(q));
    ok(q.blocks[0].items.length === 2, "the list keeps its two items", JSON.stringify(q));
    ok(Doc.selection().from === 4, "caret lands in that paragraph", JSON.stringify(Doc.selection()));
    Doc.insertText("x");
    ok(Doc.toMarkdown() === "> - a\n> - b\n>\n> x", "typing goes into the paragraph inside the quote", JSON.stringify(Doc.toMarkdown()));
}

{
    Doc.load("- a\n- b\n- c");
    Doc.setSelection(2, 2);
    Doc.splitBlock();
    Doc.setSelection(2, 2);
    Doc.splitBlock();
    const types = Doc.get().blocks.map(b => b.type);
    ok(types[0] === "ul" && types[1] === "p" && types[2] === "ul",
        "Enter on an empty top-level item splits the list around a paragraph", types.join(","));
    ok(Doc.selection().from === 2, "caret lands in that paragraph", JSON.stringify(Doc.selection()));
}

G("Parser terminates on pipe-led lines");
{
    const t0 = Date.now();
    for (const md of ["| A | B |", "hello\n|", "| a |\n| b |", "|", "x\n|\n\n| h |\n| --- |\n| c |"]) {
        const html = MarkdownParser.parse(md);
        ok(typeof html === "string", "parses without hanging: " + JSON.stringify(md), html);
    }
    ok(Date.now() - t0 < 2000, "pipe-led lines parse in well under two seconds");
    const header = MarkdownParser.parse("| A | B |");
    ok(/<p>\| A \| B \|<\/p>/.test(header), "a header row with no separator line is a paragraph", header);
    ok(/<table>/.test(MarkdownParser.parse("| h |\n| --- |\n| c |")), "a real table still parses");
}

G("Inline delimiters hug their text");
{
    const math = MarkdownParser.parse("2 * 3 * 4");
    ok(!/<em>/.test(math), "asterisks with spaces inside are not italics", math);
    ok(/<em>yes<\/em>/.test(MarkdownParser.parse("*yes*")), "*yes* is still italic");
    ok(/<strong>a<\/strong>/.test(MarkdownParser.parse("**a**")), "**a** is still bold");
    ok(/<code> x <\/code>/.test(MarkdownParser.parse("` x `")), "a code span keeps its inner spaces", MarkdownParser.parse("` x `"));
}

G("Explorer launcher writes under TEMP, not the repo");
{
    const win = process.platform === "win32";
    const ps1 = path.join(__dirname, "..", "markdown-editor.ps1");
    const html = path.join(__dirname, "..", "markdown-editor.html");
    if (!win) {
        ok(true, "skipped — not Windows");
    } else if (!fs.existsSync(ps1) || !fs.existsSync(html)) {
        ok(false, "markdown-editor.ps1 and markdown-editor.html must exist");
    } else {
        const fixture = path.join(os.tmpdir(), "md-editor-launcher-fixture.md");
        fs.writeFileSync(fixture, "# Café\n\nlauncher test\n", "utf8");
        const r = spawnSync("powershell.exe", [
            "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", ps1, "-NoLaunch", fixture
        ], { encoding: "utf8" });
        const out = ((r.stdout || "") + (r.stderr || "")).trim();
        ok(r.status === 0, "ps1 -NoLaunch exits 0", out);
        const launchHtml = (r.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
        ok(launchHtml && fs.existsSync(launchHtml), "ps1 printed a temp html path", launchHtml || out);
        const tempRoot = path.resolve(os.tmpdir());
        ok(launchHtml && path.resolve(launchHtml).toLowerCase().startsWith(tempRoot.toLowerCase()),
            "launch copy is under %TEMP%", launchHtml);
        ok(launchHtml && /markdown-editor-launch-[0-9a-f]+\.html$/i.test(path.basename(launchHtml)),
            "launch copy uses a unique markdown-editor-launch-*.html name", launchHtml);
        const repoLaunch = path.join(__dirname, "..", "md_editor_launch.html");
        ok(!fs.existsSync(repoLaunch), "does not write md_editor_launch.html into the repo");
        if (launchHtml && fs.existsSync(launchHtml)) {
            const injected = fs.readFileSync(launchHtml, "utf8");
            const marker = "window.MD_PAYLOAD=";
            const i = injected.indexOf(marker);
            const j = injected.indexOf(";</script>", i);
            ok(i > 0 && j > i, "injects window.MD_PAYLOAD before a script close");
            let payload = null;
            try { payload = JSON.parse(injected.slice(i + marker.length, j)); } catch (e) {}
            ok(payload && payload.filename === "md-editor-launcher-fixture.md",
                "payload filename is the launched file", payload && payload.filename);
            const text = payload ? Buffer.from(payload.b64, "base64").toString("utf8") : "";
            ok(text === "# Café\n\nlauncher test\n", "payload b64 is the file as UTF-8", JSON.stringify(text));
            try { fs.unlinkSync(launchHtml); } catch (e) {}
        }
        const missing = spawnSync("powershell.exe", [
            "-NoProfile", "-ExecutionPolicy", "Bypass",
            "-File", ps1, "-NoLaunch", path.join(os.tmpdir(), "md-editor-does-not-exist.md")
        ], { encoding: "utf8" });
        ok(missing.status !== 0, "missing file exits non-zero");
        try { fs.unlinkSync(fixture); } catch (e) {}
    }
}

console.log("\n----------------------------------------------------------");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
