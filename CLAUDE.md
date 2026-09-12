# Markdown Editor

## Read this first

`HANDOFF.md` is the plan of record. `markdown-editor.html` is **generated**. Edit `src/`, run `node build.js`, commit both.

```
node build.js
node build.js --check
node tests/markdown-editor.tests.js
node tests/markdown-editor.browser.js   # skip 0 if no browser
```

## House rules

- **The single-file form is a product requirement.** No `<link>`, no `<script src>`, no `fetch`, no ES modules. The assembler concatenates in filename order. Do not convert modules to real imports.
- **Never hand-merge `markdown-editor.html`.** Take either side of a conflict and rebuild from `src/`.
- **Run `node build.js --check` before committing.** It is the only thing that catches a stale artifact.
- **Do not add Playwright (or any npm dependency) to this repo.** The browser check is a zero-dependency CDP client.
- **Version lives in `src/00-build.js` (`BUILD.version`).** Header and `document.title` read it.
- **Verify by executing.** Parser claims are settled by `tests/markdown-editor.tests.js`, layout claims by the browser script.
- Modules that cannot be evaluated without a document carry `@requires-dom` and are excluded from `dist/editor.cjs`.
