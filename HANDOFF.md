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
src/50-preview.js   PreviewOps (dormant; preview is read-only)  @requires-dom
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

- Launcher uses `$PSScriptRoot`, opens blank with no args, injects `MD_PAYLOAD` via `ConvertTo-Json`, writes the temp copy under `%TEMP%`.
- Context menu is `SystemFileAssociations\.md\shell\MarkdownEditor` only — it does not hijack the default opener. Uninstall deletes that verb only. `markdown-editor.ps1 -Install` / `-Uninstall`.
- Page split into numbered modules. `build.js --check` is the stale-artifact gate.
- Parser: fences extracted out of band, all leading `&gt;` restored, `href`/`src` escaped, `javascript:`/`data:` dropped, `_snake_case_` is not italic.
- Quote+ prepends `>` onto an existing quote prefix.
- Preview is read-only. File → Download. Native textarea undo; dead `AppState.history` removed. `setRangeText` in format helpers.
- Ctrl+Shift+L toggles the log panel.
- Tests: parser fixtures in Node; CDP browser check copied from the wealth model (no npm).

## Open

- Real save-back to the Explorer path needs something other than `file://` (out of scope).
- `src/50-preview.js` is unused while preview is read-only. Delete it if that decision holds.
- Root `.gitignore` was ACL-locked RX-only on the machine that did this re-org (Charleston leftover). If `git status` still shows `md_editor_launch.html`, grant the working user Modify on `.gitignore` and replace it; local excludes are in `.git/info/exclude`.
