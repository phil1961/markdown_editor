"use strict";

const BUILD = {
  version:  "1.2.0",
  released: "12 September 2026",
  compiled: "@@COMPILED@@",
  corrections: [
    ["Raw and preview were two live copies of the note",
     "A document model is now the source of truth. Both panes are views. "
     + "Toolbar and preview typing are model operations, not HTML unwrap."]
  ]
};
