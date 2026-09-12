# Markdown Editor — handoff

Written 11 September 2026, at the end of the re-org that split the 3,428-line page
the way the Retirement Wealth Model was split.

## Where things stand

```
node build.js
node build.js --check
node tests/markdown-editor.tests.js
node tests/markdown-editor.browser.js
```

`markdown-editor.html` is **generated**. Edit `src/`, run `node build.js`, commit both.

```
src/00-build.js     BUILD: version, corrections, compile DTG
src/10-logger.js    Logger
src/20-parser.js    MarkdownParser (pure; in dist)
src/25-htmlmd.js    HtmlToMarkdown  @requires-dom
src/30-state.js     AppState
src/40-editor.js    TableOps + EditorOps  @requires-dom
src/50-preview.js   PreviewOps  @requires-dom
src/60-chrome.js    ScrollSync, ViewMode, IconHighlighter  @requires-dom
src/70-file.js      FileOps + DragDrop  @requires-dom
src/80-modals.js    ModalOps  @requires-dom
src/90-dom.js       DOM lookups  @requires-dom
src/97-app.js       events, payload, init  @requires-dom
src/page.html       body; @@STYLE@@ @@SCRIPT@@
src/style.css
build.js            assembler → markdown-editor.html + dist/editor.cjs
```

## What this session did

- Page split into numbered modules. `build.js --check` is the stale-artifact gate.
- Parser: fences extracted out of band, all leading `&gt;` restored, `href`/`src` escaped, `javascript:`/`data:` dropped, `_snake_case_` is not italic.
- Quote+ prepends `>` onto an existing quote prefix.
- File → Download. Native textarea undo; dead `AppState.history` removed. `setRangeText` in format helpers. Preview pane is editable and syncs back to markdown.
- Ctrl+Shift+L toggles the log panel.
- Tests: parser fixtures in Node; CDP browser check copied from the wealth model (no npm).

## Open

- Windows Explorer launch (`.ps1` / `.bat` / `.reg`) is a later addition. Leave those files alone until that work starts.
- HtmlToMarkdown still has no table round-trip; editing a table in the preview can flatten it.
- Root `.gitignore` was ACL-locked RX-only on the machine that did this re-org (Charleston leftover). If `git status` still shows `md_editor_launch.html`, grant the working user Modify on `.gitignore` and replace it; local excludes are in `.git/info/exclude`.
