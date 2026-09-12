"use strict";

const BUILD = {
  version:  "1.2.4",
  released: "12 September 2026",
  compiled: "@@COMPILED@@",
  corrections: [
    ["Raw and preview were two live copies of the note",
     "A document model is now the source of truth. Both panes are views. "
     + "Toolbar and preview typing are model operations, not HTML unwrap."],
    ["Numbering several paragraphs made four lists that all started at 1, "
     + "and Enter inside a list jumped out of it",
     "Selected blocks become one list. Enter adds the next item; Enter on an "
     + "empty item leaves the list. Typing stays in the item."],
    ["Pasted numbered items with blank lines became one <ol> each, so every "
     + "marker showed as 1.",
     "Blank lines no longer break a list. Adjacent numbered items are one "
     + "list, 1. 2. 3."],
    ["A second click on quote-increase removed the indent instead of nesting",
     ">+ adds a quote level each time. >- removes one level."],
    ["Could not indent one line further inside an already-quoted block",
     ">+ / >- now apply to the selected inner lines, not always the whole quote."]
  ]
};
