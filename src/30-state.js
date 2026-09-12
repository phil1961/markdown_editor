// ============================================================================
// APPLICATION STATE
// ============================================================================
const AppState = {
    currentFile: null,
    isModified: false,
    activePane: 'editor',
    viewMode: 'both', // 'editor', 'preview', or 'both'

    setModified(modified) {
        this.isModified = modified;
        DOM.unsavedIndicator.style.display = modified ? 'inline-block' : 'none';
    }
};
