"use strict";

/* =========================================================================
   BUILD — the one place a version is recorded.
   Header, document.title and logs read BUILD.version.
   ========================================================================= */
const BUILD = {
  version:  "1.1.1",
  released: "11 September 2026",
  /* Stamped by build.js at compile time as a military DTG (DDHHMMZ MON YY,
     Zulu). The source carries a placeholder; the assembler substitutes the
     moment of the build and restamps only when the rest of the file actually
     changed, so rebuilding an unchanged tree does not churn it, and
     `build.js --check` ignores this one line when it diffs. */
  compiled: "@@COMPILED@@",
  corrections: [
    ["Fenced code and nested quotes were rewritten by later regexes",
     "Fences are extracted before inlines run; all leading &gt; markers are restored so >> nests; href/src quotes are escaped and javascript:/data: URLs are dropped."],
    ["Quote+ inserted a space the parser treated as depth 1",
     "A second press produced '> > foo'. Quote+ now prepends '>' onto an existing quote prefix."],
    ["Save did not write the opened file",
     "File → Download and Ctrl+S download a copy. file:// cannot overwrite the path Explorer opened."],
    ["Custom undo history was recorded and never consumed",
     "Dead AppState.history is gone. Format helpers use setRangeText so native textarea undo survives Bold."],
    ["Preview editing was briefly disabled",
     "The right pane is contenteditable again. Typing there syncs back to markdown."]
  ]
};
