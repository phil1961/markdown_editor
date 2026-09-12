// ============================================================================
// MARKDOWN PARSER — clean HTML for export. Live preview uses Doc.previewHTML.
// ============================================================================
const MarkdownParser = {
    parse(markdown) {
        return Doc.html(Doc.parse(markdown || ""));
    }
};
