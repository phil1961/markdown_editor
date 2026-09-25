# Markdown Editor — handoff

`markdown-editor.html` and `HELP.md` are **generated**. Edit `src/`, run `node build.js`, commit all three.

```
node build.js
node build.js --check                     # gate: artifact, HELP.md and dist match src/
node tests/markdown-editor.tests.js       # gate: parser and Doc model, in Node
node tests/smoke.browser.js               # real browser, skips with exit 0 if none
node tests/markdown-editor.browser.js     # real browser, the full UI suite; same skip rule
```

The two Node checks are the gates and must pass before a commit. The browser
checks are the gate for any claim about layout or interaction, on a machine
that has Brave, Chrome or Edge; they cannot run elsewhere, which is why they
skip instead of failing there.

---

## Source of record, and how it was lost once

On 25 September 2026 this repo was at 1.3.7 while the published demo
(`D:\AWS3\websites\toughguycomputing_net\www\demos\markdown-editor.html`)
was 1.5.0. Seven modules existed only in the deployed file. The tree was
recovered because the 1.5.0 build fences every piece of the output with a
marker comment and embeds `tools/unpack.js`, `build.js` and
`tests/smoke.browser.js` inside the help. `node tools/unpack.js` split the
deployed file back into `src/` and `node build.js --check` matched it byte
for byte.

Rules that follow from that:

- **Never publish an artifact whose `src/` is not committed.** Publish means
  copying `markdown-editor.html` to the demos folder; do it from a clean,
  checked tree.
- **Keep the markers.** `build.js` writes `/* ==== module NAME ==== */`,
  `/* ==== begin/end style.css ==== */` and the `HELP_MD` block. They are
  what makes the shipped file recoverable.
- **Never write two at-signs in a row in `src/`.** `@@` is the build's
  placeholder marker and the build refuses output that still contains one.
- Every change bumps `BUILD.version` in `src/00-build.js` and adds a
  `BUILD.corrections` entry in the user's words. The Help panel shows them.

---

## Design: the document is the source of truth

The raw textarea and the preview pane are **views**. They do not sync by
turning HTML into markdown. A document model sits in the middle.

```
raw textarea  ←serialize—  Doc (blocks + marked runs)  —render→  preview
                    ↑
            preview toolbar / beforeinput / typing
```

### Why

contenteditable HTML is not a document. Double-click includes a trailing
space, nested marks live in a tag pile, headings become `div`s, and
`innerHTML` → markdown cannot invert what the browser just did.

### Model

- **Blocks:** `p`, `h1`–`h6`, `ul`, `ol`, `quote` (with an optional callout
  `kind`), `pre` (with `lang`), `hr`, `table`
- **Runs:** `{ text, marks: ['bold','italic','underline','strike','code'], href? }`
- **Positions:** integer offsets over visible text (`\n` between blocks)
- **Selection:** `{ from, to }` in those offsets, stored on `Doc`

Preview: `beforeinput` is cancelled. Insert/delete/Enter become model
operations, then both views re-render and the caret is restored via
`data-from` / `data-to` spans. The browser does not own the HTML.

Raw: native caret while focused. On `input`, `Doc.load(markdown)` and the
preview re-renders.

### Two formatting engines (this is deliberate, and documented here because
### the old handoff said otherwise)

- **Preview pane focused:** toolbar → `PreviewOps.applyFormat` → `Doc`
  operations → `syncFromDoc` rewrites both views.
- **Raw pane focused:** toolbar → `EditorOps.applyInlineFormat` /
  `applyBlockFormat`, which edit the textarea text with regexes, and
  `RawBlocks` for the fence or quote around the caret. Doc is reloaded from
  the result. The raw pane never goes through `Doc.toggleMark`.

A new format therefore has to be written twice. The reason is the next
section: a Doc round trip rewrites the whole file, and a toolbar click in
the raw pane must not do that.

### Doc round trips normalise the file

`Doc.parse` → `Doc.toMarkdown` is lossy. Every preview edit, and every
undo/redo, rewrites the raw text through it. What changes:

- hard-wrapped paragraph lines are joined with spaces
- `*` and `+` bullets become `-`; `1)` lists stay paragraphs
- list nesting by indent is flattened (one list, one level)
- raw HTML, reference links (`[x][1]`), and indented code stay as paragraph text
- a bold+italic run serializes as `**_x_**`, never `***x***`

This is a known limitation, not a bug in any one place. Do not "fix" it in
the serializer alone; the parser would have to keep source spans.

### Modules

Filename order is load order. `@requires-dom` in the first comment keeps a
module out of `dist/editor.cjs`, the Node bundle the parser suite loads.

| File | Declares | Depends on | What it holds |
| --- | --- | --- | --- |
| `00-build.js` | `BUILD` | — | version, release date, compile stamp, `corrections` (the Help changelog) |
| `10-logger.js` | `Logger` | DOM at call time | debug panel (Ctrl+Shift+L) and console |
| `15-highlight.js` | `Highlight` | — | tokeniser and HTML for coloured fences; `tokens` must join back to the input |
| `16-doc.js` | `Doc` | `Highlight` | parse, serialize, render, edit ops, caret map. One indexer (`indexFrom`), one overlap finder (`overlappingIn`), one list exit (`exitListAt`); offset resolution is layered, see Debt |
| `18-locate.js` | `Locate` | `Doc` | raw offset ↔ Doc offset for Find in other pane |
| `19-rawblocks.js` | `RawBlocks` | — | fence / callout around the raw-pane caret, as text splices |
| `20-parser.js` | `MarkdownParser` | `Doc` | `parse()` = clean HTML for export |
| `25-htmlmd.js` | `HtmlToMarkdown` | DOM | `.html` file import and HTML paste |
| `30-state.js` | `AppState` | `DOM` | current file, handle, modified flag, active pane, view mode |
| `35-history.js` | `History` | `Doc`, `DOM`, `EditorOps`, `IconHighlighter` | one undo stack for both panes, History panel |
| `40-editor.js` | `TableOps`, `EditorOps`, `BlockStyleOps` | `Doc`, `DOM`, `ModalOps._saved`, `syncFromDoc`, `RawBlocks` | raw-pane edits, table insert, language and callout pickers |
| `50-preview.js` | `PreviewOps`, `applyDocFormat`, `syncFromDoc` | `Doc`, `DOM`, `History`, `IconHighlighter` | preview input → Doc; the shared re-render |
| `60-chrome.js` | `ScrollSyncManager`, `ViewModeManager`, `Splitter`, `IconHighlighter`, `PaneLocator` | `Doc`, `DOM`, `Locate`, `EditorOps` | scroll sync, view modes, drag bar, toolbar state, Find in other pane |
| `70-file.js` | `FileOps`, `DragDropHandler` | `Doc`, `DOM`, `History`, `Dialog` | open, save, export, download editor, drag and drop |
| `80-modals.js` | `Dialog`, `ModalOps`, `HelpOps` | `Doc`, `DOM`, `HELP_MD` | confirm/notice dialog, link and image modals, Help panel |
| `90-dom.js` | `DOM` | the page | element references, looked up at script time |
| `97-app.js` | `setupEventListeners`, `handleFormat`, `init` | everything | wiring, shortcuts, launcher payload, start-up |
| `help.md` | `HELP_MD` (via build) | `tools/unpack.js`, `build.js`, `tests/smoke.browser.js` (included) | the Help panel and `HELP.md` |
| `page.html`, `style.css` | — | — | shell with `@@STYLE@@` / `@@SCRIPT@@`; all styles |

`syncFromDoc(focus)` in `50-preview.js` is the one function that writes both
views from Doc. Anything that mutates Doc calls it, then `History`.

### Tests that must exist (found in production by a human; must not regress)

The browser suite must fail if these return:

1. Double-click a word, Bold: raw is `**word**` not `**word **`
2. Stack Bold+Italic+Underline+Strike; peel Underline: the other three remain
3. After peeling Bold from a four-mark stack, Italic+Underline+Strike stay lit
   without clicking the word again
4. H1 on then H1 off: heading gone, no alert, button unlit
5. Preview typing appears in raw; raw typing appears in preview
6. Nested mark peel does not flatten remaining marks
7. Bold lights with the caret inside `**bold**` on the last line of the raw pane

The parser suite must fail if these return:

8. A line starting with `|` that is not yet a table hangs `Doc.parse` (it did:
   the paragraph loop excluded `|` lines and never advanced)
9. `2 * 3 * 4` renders as italics

### Pitfalls (do not reintroduce)

- `splitInlines` must **not** call `mergeInlines`. The two halves of a cut
  still share marks; merging them back makes `applyMarkToInlines` skip the run
  (`a >= lo && b <= hi` fails). That is how double-click `"abc "` became a
  no-op instead of `**abc** `. Merge only after the mark is applied.
- The paragraph loop in `Doc.parse` consumes its first line unconditionally.
  Every block rule above it has already declined that line; an empty
  paragraph that does not advance `i` is an infinite loop.
- `PreviewOps.runOp` releases `_opLock` in a `finally`. A throw inside a Doc
  op used to leave the lock set and Enter/Backspace dead for the session.
- Toolbar buttons must not take focus from the preview; the toolbar cancels
  `mousedown` on buttons. A `<select>` does take focus, so `BlockStyleOps`
  uses the selection Doc already holds and hands focus back.
- `Highlight.tokens` must return pieces that join back to exactly the input.
  The caret mapping counts characters under the block's `data-from` span.
- Never call `window.alert` / `confirm`. Sandboxed frames ignore them
  (confirm returns false with nothing shown). Use `Dialog.ask` / `Dialog.tell`.

### Behaviour notes (each was a bug once)

Selected paragraphs become **one** list (`1. 2. 3.`), not one `<ol>` per line.
Enter in a list item adds the next item; Enter on an empty item leaves the list.
Blank lines between numbered items stay one list; HTML `<ol>` restarts at 1
for every list, so splitting items across lists is how every marker becomes `1.`

`>+` adds a quote level each click; `>-` removes one. Inside an existing quote
a selected subset of lines is what moves. Enter at the end of a quote (or on
a blank quoted line) leaves the quote. Numbering inside a quote applies per
inner line. `> [!NOTE]` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION` alone on
the first quoted line makes a titled callout; the Callout picker sets it in
either pane.

Clicks in the empty space below the last line land in a trailing paragraph
that is never saved. Enter in a code block inserts a newline in the fence;
click below the box to leave it. Code-block with no selection inserts an empty
fence. The language picker sets the fence language of the block at the caret
and the preview colours it (`Highlight`).

Insert Link / Image save the caret, write markdown into the document, and
return focus to the pane, never into the modal fields. A horizontal rule is
removed by clicking it and pressing Backspace, or the HR button again. With
the caret in a table: insert/delete row and column; icons are disabled outside
a table.

Find in other pane (`PaneLocator`, the crosshair beside Track): the selected
word, or the word around a caret, is selected in the other pane and scrolled
into view. `Locate` does the offset mapping with sentinel characters and
falls back to the same-ordinal occurrence.

Save (`FileOps.saveFile`): with the File System Access API (Chrome, Edge,
Brave) Open keeps a handle and Ctrl+S writes back through `createWritable`.
No handle (new document, drop, `<input type=file>`, launcher payload) means
Ctrl+S is Save As. Without the API both download. An `.html` source never
gets a handle. Export As is always a download.

Undo/redo (`History`): one stack for both panes, snapshots are markdown plus
caret. `History.schedule(label)` for typing (350 ms coalesce),
`History.commit(label)` for discrete steps. Open/new calls `History.reset`.
Ctrl+Shift+H opens the panel. **Adding a mutation path without a `History`
call is a bug**: the change folds into the next entry. Undo/redo marks the
document modified even when it lands on the saved state.

Help (`HelpOps`): F1, the Help button, or File → Help renders `HELP_MD` with
`Doc.html`; Download help saves it as `.md`. The last section of the help is
written for an AI that has only the `.html`.

The splitter (`#splitter`) drags to resize; `--split` on `.main-container`;
double-click resets; persisted as `md-editor-split`.

Windows Explorer: `markdown-editor.ps1 -Install` adds **Open with Markdown
Editor** for `.md`. The script copies the editor to `%TEMP%`, injects
`window.MD_PAYLOAD`, and never writes launch copies into this folder.
`tools/unpack.js` strips that payload if it is ever fed a launch copy.

---

## Debt (ranked, from the 25 September 2026 review, updated the same day)

Done that day, each as its own commit: the Doc dedupe (one indexer, one
overlap finder, one list exit, dead code gone), log lines that name their
level plus uncaught-error capture, the `.HTML` case, an inert HTML parse,
the modal shortcut guard, and Help rendering `BUILD.corrections`.

Remaining:

1. **Two formatting engines** (see above). Unify on Doc only once the
   parser preserves source formatting; until then every format is written
   twice, once in `EditorOps` / `RawBlocks` and once in `Doc`.
2. **Doc round trips normalise the file** (see above). Preserving soft
   breaks, bullet glyphs and list nesting means keeping source spans in
   the model. It is the prerequisite for 1.
3. **Offset resolution is layered**, one resolver per nesting level:
   `locAt` (document → block), `containerAt` (into quotes), `innerAt`,
   `itemAt` (list items), `cellInTable`. That is by design, not
   duplication, but a new block kind has to be taught to every layer it
   can nest in. `blockText` is the one place a block's visible text is
   defined; keep it that way.
4. **Corrections render as markdown in Help.** A correction whose text
   contains triple backticks (the code-block entry) shows stray backticks.
   Escape or reword when it bothers someone.
