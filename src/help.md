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

<!-- include: tools/unpack.js -->

### Appendix B — build.js

Unpacking writes this file too. It is shown here so it can be read without running anything.

<!-- include: build.js -->

### Appendix C — tests/smoke.browser.js

<!-- include: tests/smoke.browser.js -->
