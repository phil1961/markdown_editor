# Markdown Editor

## Read this first

`HANDOFF.md` is the plan of record. `markdown-editor.html` and `HELP.md` are **generated**. Edit `src/`, run `node build.js`, commit all three.

```
node build.js
node build.js --check                   # gate
node tests/markdown-editor.tests.js     # gate
node tests/smoke.browser.js             # skip 0 if no browser
node tests/markdown-editor.browser.js   # skip 0 if no browser
```

## House rules

- **The single-file form is a product requirement.** No `<link>`, no `<script src>`, no `fetch`, no ES modules. The assembler concatenates in filename order. Do not convert modules to real imports.
- **Never hand-merge `markdown-editor.html` or `HELP.md`.** Take either side of a conflict and rebuild from `src/`.
- **Run `node build.js --check` before committing.** It is the only thing that catches a stale artifact.
- **Keep the build markers.** `build.js` fences every piece of the output (`/* ==== module NAME ==== */` and friends) and embeds `tools/unpack.js` in the help, so `node tools/unpack.js markdown-editor.html` can recover `src/` from the shipped file. That is how `src/` came back after the repo fell behind the deployed 1.5.0.
- **Never write `@@` in `src/`.** It is the build's placeholder marker; the build refuses output containing one.
- **Every change bumps `BUILD.version` in `src/00-build.js` and adds a `BUILD.corrections` entry** in the user's words. Header, `document.title` and the Help panel read them. Update the user sections of `src/help.md` when users will notice.
- **Do not add Playwright (or any npm dependency) to this repo.** The browser checks are zero-dependency CDP clients.
- **Verify by executing.** Parser claims are settled by `tests/markdown-editor.tests.js`, layout claims by the browser scripts.
- Modules that cannot be evaluated without a document carry `@requires-dom` and are excluded from `dist/editor.cjs`.
- **Never call `alert` or `confirm`.** Use `Dialog.ask` / `Dialog.tell`; sandboxed frames ignore the browser ones.
- **Explorer launch is `markdown-editor.ps1`.** Edit the ps1, not the generated HTML. `-Install` writes the `.reg` files from the current path. Launch copies go under `%TEMP%`, never into the repo.
- **Publish** means copying `markdown-editor.html` to `D:\AWS3\websites\toughguycomputing_net\www\demos`. Only from a committed tree that passes `--check`.
