# Markdown Editor — handoff

`markdown-editor.html` is **generated**. Edit `src/`, run `node build.js`, commit both.

```
node build.js
node build.js --check
node tests/markdown-editor.tests.js
node tests/markdown-editor.browser.js
```

---

## Design: the document is the source of truth

The raw textarea and the preview pane are **views**. They do not sync by
turning HTML into markdown. A document model sits in the middle.

```
raw textarea  ←serialize—  Doc (blocks + marked runs)  —render→  preview
                    ↑
            toolbar / beforeinput / typing
```

### Why

contenteditable HTML is not a document. Double-click includes a trailing
space, nested marks live in a tag pile, headings become `div`s, and
`innerHTML` → markdown cannot invert what the browser just did. The
highlighter walking the DOM is a symptom of that, not a separate feature.

### Model

- **Blocks:** `p`, `h1`–`h6`, `ul`, `ol`, `quote`, `pre`, `hr`, `table`
- **Runs:** `{ text, marks: ['bold','italic','underline','strike','code'], href? }`
- **Positions:** integer offsets over visible text (`\n` between blocks)
- **Selection:** `{ from, to }` in those offsets, stored on `Doc`

Toolbar: `Doc.toggleMark('bold')` / `Doc.toggleBlock('h1')` on the current
range. Toggle means: if the whole range already has it, remove it; else add
it. Nested marks are a set on a run. Peeling bold does not flatten italic.

Preview: `beforeinput` is cancelled. Insert/delete/Enter become model
operations, then both views re-render and the caret is restored via
`data-from` / `data-to` spans. The browser does not own the HTML.

Raw: native caret and undo while focused. On `input`, `Doc.load(markdown)`
and the preview re-renders. Toolbar while the raw pane is focused maps
through the same model once the markdown is loaded.

### Modules

```
src/16-doc.js       Doc — parse, serialize, render, ops, caret map
src/20-parser.js    MarkdownParser.parse = clean HTML for export (uses Doc)
src/25-htmlmd.js    HTML file import only
src/50-preview.js   beforeinput / paste → Doc
src/60-chrome.js    highlighter reads Doc.marksAt / blockTypeAt in preview
```

### Tests that must exist (found in production by a human; must not regress)

The browser suite is the gate for UI. It must fail if these return:

1. Double-click a word, Bold: raw is `**word**` not `**word **`
2. Stack Bold+Italic+Underline+Strike; peel Underline: the other three remain
3. After peeling Bold from a four-mark stack, Italic+Underline+Strike stay lit
   without clicking the word again
4. H1 on then H1 off: heading gone, no alert, button unlit
5. Preview typing appears in raw; raw typing appears in preview
6. Nested mark peel does not flatten remaining marks

### Pitfall (do not reintroduce)

`splitInlines` must **not** call `mergeInlines`. The two halves of a cut still
share marks; merging them back makes `applyMarkToInlines` skip the run
(`a >= lo && b <= hi` fails). That is how double-click `"abc "` became a
no-op instead of `**abc** `. Merge only after the mark is applied.

Selected paragraphs become **one** list (`1. 2. 3.`), not one `<ol>` per line.
Enter in a list item adds the next item; Enter on an empty item leaves the list.
Blank lines between numbered items (a paste of `1.\n\n2.\n\n3.` or `1.\n\n1.\n\n1.`)
stay one list. HTML `<ol>` restarts at 1 for every list, so splitting items
across lists is how every marker becomes `1.`

`>+` adds a quote level each click; `>-` removes one. It is not a toggle.
Inside an existing quote, select a subset of lines and `>+` / `>-` apply to
those lines only, not the whole block.
Enter at the end of a quote (or on a blank quoted line) leaves the quote
instead of adding a blank indented line at the bottom.
Clicks in the empty space below the last line of the preview land in a
trailing paragraph (after a quote, heading, or list). That pad is not saved.
Numbering or bullets inside a quote apply per inner line, not one item
flattening `a b c`.
Enter in a code block inserts a newline in the fence. Click below the box
to type outside it.
Code-block with no selection inserts an empty fence at the caret.
Insert Link / Image save the caret, write markdown into the document, and
return focus to the pane — never into the modal fields.

Windows Explorer launch (`.ps1` / `.bat` / `.reg`) is later work.
