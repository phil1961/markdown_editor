/* @requires-dom — wires the page and registers DOMContentLoaded. */
// ============================================================================
// EVENT HANDLERS
// ============================================================================
function setupEventListeners() {
    // Editor input
    DOM.editor.addEventListener('input', () => {
        EditorOps.updatePreview();
        AppState.setModified(true);
        History.schedule('Typing');
    });
    
    // Editor selection change
    DOM.editor.addEventListener('keyup', () => IconHighlighter.checkEditorFormats());
    DOM.editor.addEventListener('click', () => IconHighlighter.checkEditorFormats());
    DOM.editor.addEventListener('focus', () => {
        AppState.activePane = 'editor';
        IconHighlighter.checkEditorFormats();
    });
    
    DOM.preview.addEventListener('keyup', () => IconHighlighter.checkPreviewFormats());
    DOM.preview.addEventListener('click', () => IconHighlighter.checkPreviewFormats());
    DOM.preview.addEventListener('mouseup', () => IconHighlighter.checkPreviewFormats());
    DOM.preview.addEventListener('focus', () => {
        AppState.activePane = 'preview';
        IconHighlighter.checkPreviewFormats();
    });

    /* Keep the preview/editor selection when clicking a toolbar button.
       Without this, mousedown focuses the button and the format is a no-op. */
    document.querySelector('.toolbar').addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) e.preventDefault();
    });
    
    // File Menu
    DOM.fileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.fileMenu.classList.toggle('open');
    });
    
    // Close file menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!DOM.fileMenu.contains(e.target)) {
            DOM.fileMenu.classList.remove('open');
        }
    });
    
    // File menu items
    DOM.menuNew.addEventListener('click', () => {
        FileOps.newDocument();
        DOM.fileMenu.classList.remove('open');
    });
    DOM.menuOpen.addEventListener('click', () => {
        FileOps.openFile();
        DOM.fileMenu.classList.remove('open');
    });
    DOM.menuSave.addEventListener('click', () => {
        FileOps.saveFile();
        DOM.fileMenu.classList.remove('open');
    });
    DOM.menuSaveAs.addEventListener('click', () => {
        FileOps.saveAs();
        DOM.fileMenu.classList.remove('open');
    });
    DOM.exportMd.addEventListener('click', () => {
        FileOps.exportAs('md');
        DOM.fileMenu.classList.remove('open');
    });
    DOM.exportHtml.addEventListener('click', () => {
        FileOps.exportAs('html');
        DOM.fileMenu.classList.remove('open');
    });
    DOM.exportTxt.addEventListener('click', () => {
        FileOps.exportAs('txt');
        DOM.fileMenu.classList.remove('open');
    });
    DOM.menuDownloadEditor.addEventListener('click', () => {
        FileOps.downloadEditor();
        DOM.fileMenu.classList.remove('open');
    });
    DOM.downloadAppBtn.addEventListener('click', (e) => {
        e.preventDefault();
        FileOps.downloadEditor();
    });
    DOM.fileInput.addEventListener('change', (e) => FileOps.handleFileOpen(e));

    // Help panel
    DOM.helpBtn.addEventListener('click', () => HelpOps.open());
    DOM.menuHelp.addEventListener('click', () => {
        DOM.fileMenu.classList.remove('open');
        HelpOps.open();
    });
    DOM.menuDownloadHelp.addEventListener('click', () => {
        DOM.fileMenu.classList.remove('open');
        HelpOps.download();
    });
    DOM.helpDownload.addEventListener('click', () => HelpOps.download());
    DOM.helpClose.addEventListener('click', () => HelpOps.close());
    DOM.helpPanel.addEventListener('click', (e) => {
        if (e.target === DOM.helpPanel) HelpOps.close();
    });
    
    // Undo / redo / history panel
    DOM.undoBtn.addEventListener('click', () => History.undo());
    DOM.redoBtn.addEventListener('click', () => History.redo());
    DOM.historyBtn.addEventListener('click', () => History.togglePanel());
    DOM.historyClose.addEventListener('click', () => History.togglePanel(false));
    DOM.historyList.addEventListener('click', (e) => {
        const row = e.target.closest('.hist-entry');
        if (row) History.goTo(+row.getAttribute('data-index'));
    });

    // Format buttons
    DOM.boldBtn.addEventListener('click', () => handleFormat('bold'));
    DOM.italicBtn.addEventListener('click', () => handleFormat('italic'));
    DOM.underlineBtn.addEventListener('click', () => handleFormat('underline'));
    DOM.strikeBtn.addEventListener('click', () => handleFormat('strike'));
    DOM.h1Btn.addEventListener('click', () => handleFormat('h1'));
    DOM.h2Btn.addEventListener('click', () => handleFormat('h2'));
    DOM.h3Btn.addEventListener('click', () => handleFormat('h3'));
    DOM.h4Btn.addEventListener('click', () => handleFormat('h4'));
    DOM.h5Btn.addEventListener('click', () => handleFormat('h5'));
    DOM.h6Btn.addEventListener('click', () => handleFormat('h6'));
    DOM.bulletBtn.addEventListener('click', () => handleFormat('bullet'));
    DOM.numberBtn.addEventListener('click', () => handleFormat('number'));
    DOM.quoteIncreaseBtn.addEventListener('click', () => handleFormat('quoteIncrease'));
    DOM.quoteDecreaseBtn.addEventListener('click', () => handleFormat('quoteDecrease'));
    DOM.codeBtn.addEventListener('click', () => handleFormat('code'));
    DOM.codeBlockBtn.addEventListener('click', () => handleFormat('codeBlock'));
    DOM.hrBtn.addEventListener('click', () => handleFormat('hr'));
    
    // Table button
    DOM.tableBtn.addEventListener('click', () => TableOps.openModal());
    DOM.tableRowAboveBtn.addEventListener('click', () => TableOps.apply('rowAbove'));
    DOM.tableRowBelowBtn.addEventListener('click', () => TableOps.apply('rowBelow'));
    DOM.tableRowDelBtn.addEventListener('click', () => TableOps.apply('rowDel'));
    DOM.tableColLeftBtn.addEventListener('click', () => TableOps.apply('colLeft'));
    DOM.tableColRightBtn.addEventListener('click', () => TableOps.apply('colRight'));
    DOM.tableColDelBtn.addEventListener('click', () => TableOps.apply('colDel'));
    
    // View mode buttons
    DOM.viewEditorBtn.addEventListener('click', () => ViewModeManager.setMode('editor'));
    DOM.viewBothBtn.addEventListener('click', () => ViewModeManager.setMode('both'));
    DOM.viewPreviewBtn.addEventListener('click', () => ViewModeManager.setMode('preview'));
    
    // Link and image buttons
    DOM.linkBtn.addEventListener('click', () => ModalOps.openLinkModal());
    DOM.imageBtn.addEventListener('click', () => ModalOps.openImageModal());
    
    // Modal buttons
    DOM.linkCancel.addEventListener('click', () => ModalOps.closeLinkModal());
    DOM.linkSubmit.addEventListener('click', () => ModalOps.submitLink());
    DOM.imageCancel.addEventListener('click', () => ModalOps.closeImageModal());
    DOM.imageSubmit.addEventListener('click', () => ModalOps.submitImage());
    DOM.tableCancel.addEventListener('click', () => TableOps.closeModal());
    DOM.dialogOk.addEventListener('click', () => Dialog.close(true));
    DOM.dialogCancel.addEventListener('click', () => Dialog.close(false));
    DOM.dialogModal.addEventListener('click', (e) => {
        if (e.target === DOM.dialogModal) Dialog.close(false);
    });
    DOM.tableSubmit.addEventListener('click', () => TableOps.insert());
    
    // Table preview update on input change
    DOM.tableRows.addEventListener('input', () => TableOps.updatePreview());
    DOM.tableCols.addEventListener('input', () => TableOps.updatePreview());
    
    // Modal overlay click to close
    DOM.linkModal.addEventListener('click', (e) => {
        if (e.target === DOM.linkModal) ModalOps.closeLinkModal();
    });
    DOM.imageModal.addEventListener('click', (e) => {
        if (e.target === DOM.imageModal) ModalOps.closeImageModal();
    });
    DOM.tableModal.addEventListener('click', (e) => {
        if (e.target === DOM.tableModal) TableOps.closeModal();
    });
    
    // Modal Enter key
    DOM.linkUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); ModalOps.submitLink(); }
    });
    DOM.imageUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); ModalOps.submitImage(); }
    });
    DOM.tableCols.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') TableOps.insert();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        /* An open dialog owns the keyboard: Escape cancels, nothing else fires. */
        if (Dialog.isOpen()) {
            if (e.key === 'Escape') {
                e.preventDefault();
                Dialog.close(false);
            }
            return;
        }
        /* Help reads over the document: Escape or F1 closes it, and editor
           shortcuts stay off while it is open (native copy and find still work). */
        if (HelpOps.isOpen()) {
            if (e.key === 'Escape' || e.key === 'F1') {
                e.preventDefault();
                HelpOps.close();
            }
            return;
        }
        if (e.key === 'F1') {
            e.preventDefault();
            HelpOps.open();
            return;
        }
        const inModalField =!!(e.target && e.target.closest && e.target.closest('.modal'));
        if ((e.ctrlKey || e.metaKey) && !inModalField) {
            const k = e.key.toLowerCase();
            /* One undo stack for both panes replaces the textarea's native one. */
            if (k === 'z') {
                e.preventDefault();
                if (e.shiftKey) History.redo(); else History.undo();
                return;
            }
            if (k === 'y') {
                e.preventDefault();
                History.redo();
                return;
            }
            if (k === 'h' && e.shiftKey) {
                e.preventDefault();
                History.togglePanel();
                return;
            }
        }
        /* A modal field owns Ctrl+B/I/U/K/N/O/S as much as it owns Ctrl+Z
           above: Bold in the link dialog must not format the document
           behind it. */
        if ((e.ctrlKey || e.metaKey) && !inModalField) {
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    FileOps.newDocument();
                    break;
                case 'o':
                    e.preventDefault();
                    FileOps.openFile();
                    break;
                case 'b':
                    e.preventDefault();
                    handleFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    handleFormat('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    handleFormat('underline');
                    break;
                case 'k':
                    e.preventDefault();
                    ModalOps.openLinkModal();
                    break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) FileOps.saveAs(); else FileOps.saveFile();
                    break;
            }
        }
        
        // Escape to close modals and file menu
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            document.getElementById('consolePanel').classList.toggle('visible');
        }
        if (e.key === 'Escape') {
            ModalOps.closeLinkModal();
            ModalOps.closeImageModal();
            TableOps.closeModal();
            DOM.fileMenu.classList.remove('open');
        }
    });
    
    // Before unload warning
    window.addEventListener('beforeunload', (e) => {
        if (AppState.isModified) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

/**
 * Handle format button clicks
 */
const FORMAT_LABELS = {
    bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strikethrough', code: 'Inline code',
    h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6',
    bullet: 'Bullet list', number: 'Numbered list', quoteIncrease: 'Quote +', quoteDecrease: 'Quote -',
    codeBlock: 'Code block', hr: 'Horizontal rule'
};

function handleFormat(format) {
    const inlineFormats = ['bold', 'italic', 'underline', 'strike', 'code'];
    const blockFormats = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bullet', 'number', 'quoteIncrease', 'quoteDecrease', 'codeBlock', 'hr'];
    if (AppState.activePane === 'preview') {
        PreviewOps.applyFormat(format);
    } else if (inlineFormats.includes(format)) {
        EditorOps.applyInlineFormat(format);
    } else if (blockFormats.includes(format)) {
        EditorOps.applyBlockFormat(format);
    } else {
        return;
    }
    History.commit(FORMAT_LABELS[format] || format);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
// markdown-editor.ps1 injects window.MD_PAYLOAD into a %TEMP% copy of the
// HTML before opening it. { b64, filename } — b64 is UTF-8 bytes.
function loadFromPayload() {
    if (!window.MD_PAYLOAD) return false;

    try {
        const { b64, filename } = window.MD_PAYLOAD;
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const content = new TextDecoder("utf-8").decode(bytes);

        DOM.editor.value = content;
        EditorOps.updatePreviewNow();
        AppState.currentFile = filename;
        AppState.setModified(false);
        FileOps.updateFileNameDisplay();
        DOM.statusLeft.textContent = "Opened: " + filename;
        document.title = "Markdown Editor v" + BUILD.version + " - " + filename;
        History.reset("Open " + filename);

        Logger.success("App", "Loaded from launcher payload: " + filename);
        return true;
    } catch (err) {
        Logger.error("App", "Failed to load from launcher payload: " + err.message);
        return false;
    }
}

function init() {
    const ver = 'v' + BUILD.version;
    const verEl = document.querySelector('.header-title .text-sm');
    if (verEl) verEl.textContent = ver;
    document.title = 'Markdown Editor ' + ver;
    Logger.info('App', 'MARKDOWN EDITOR ' + ver + ' - Initializing Application');
    
    // Set up event listeners
    setupEventListeners();
    PreviewOps.init();
    Splitter.init();
    PaneLocator.init();
    BlockStyleOps.init();
    if (!loadFromPayload()) {
        Doc.load(DOM.editor.value || "");
        DOM.preview.innerHTML = Doc.previewHTML();
        History.reset("Start");
    }

    ScrollSyncManager.init(DOM.editor, DOM.previewContainer, DOM.trackBtn);
    DragDropHandler.init();

    // Initial status update
    EditorOps.updateStatus();

    // Set focus to editor
    DOM.editor.focus();
    AppState.activePane = 'editor';
    
    Logger.success('App', 'Application initialized successfully');
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
