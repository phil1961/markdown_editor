/* @requires-dom — DOM lookups at evaluation time; script is at end of body. */
// ============================================================================
// DOM REFERENCES
// ============================================================================
const DOM = {
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    editorContainer: document.getElementById('editorContainer'),
    previewContainer: document.getElementById('previewContainer'),
    mainContainer: document.getElementById('mainContainer') || document.querySelector('.main-container'),
    editorPane: document.getElementById('editorPane'),
    previewPane: document.getElementById('previewPane'),
    splitter: document.getElementById('splitter'),
    
    // File Menu
    fileMenu: document.getElementById('fileMenu'),
    fileMenuBtn: document.getElementById('fileMenuBtn'),
    menuNew: document.getElementById('menuNew'),
    menuOpen: document.getElementById('menuOpen'),
    menuSave: document.getElementById('menuSave'),
    menuDownloadEditor: document.getElementById('menuDownloadEditor'),
    downloadAppBtn: document.getElementById('downloadAppBtn'),
    exportMd: document.getElementById('exportMd'),
    exportHtml: document.getElementById('exportHtml'),
    exportTxt: document.getElementById('exportTxt'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    
    // Drag and Drop
    dragOverlay: document.getElementById('dragOverlay'),
    
    // View Mode Buttons
    viewEditorBtn: document.getElementById('viewEditorBtn'),
    viewBothBtn: document.getElementById('viewBothBtn'),
    viewPreviewBtn: document.getElementById('viewPreviewBtn'),
    
    // Toolbar Buttons
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    historyBtn: document.getElementById('historyBtn'),
    historyPanel: document.getElementById('historyPanel'),
    historySummary: document.getElementById('historySummary'),
    historyList: document.getElementById('historyList'),
    historyClose: document.getElementById('historyClose'),
    boldBtn: document.getElementById('boldBtn'),
    italicBtn: document.getElementById('italicBtn'),
    underlineBtn: document.getElementById('underlineBtn'),
    strikeBtn: document.getElementById('strikeBtn'),
    h1Btn: document.getElementById('h1Btn'),
    h2Btn: document.getElementById('h2Btn'),
    h3Btn: document.getElementById('h3Btn'),
    h4Btn: document.getElementById('h4Btn'),
    h5Btn: document.getElementById('h5Btn'),
    h6Btn: document.getElementById('h6Btn'),
    bulletBtn: document.getElementById('bulletBtn'),
    numberBtn: document.getElementById('numberBtn'),
    quoteIncreaseBtn: document.getElementById('quoteIncreaseBtn'),
    quoteDecreaseBtn: document.getElementById('quoteDecreaseBtn'),
    linkBtn: document.getElementById('linkBtn'),
    imageBtn: document.getElementById('imageBtn'),
    tableBtn: document.getElementById('tableBtn'),
    tableRowAboveBtn: document.getElementById('tableRowAboveBtn'),
    tableRowBelowBtn: document.getElementById('tableRowBelowBtn'),
    tableRowDelBtn: document.getElementById('tableRowDelBtn'),
    tableColLeftBtn: document.getElementById('tableColLeftBtn'),
    tableColRightBtn: document.getElementById('tableColRightBtn'),
    tableColDelBtn: document.getElementById('tableColDelBtn'),
    codeBtn: document.getElementById('codeBtn'),
    codeBlockBtn: document.getElementById('codeBlockBtn'),
    hrBtn: document.getElementById('hrBtn'),
    trackBtn: document.getElementById('trackBtn'),
    
    // Modals
    linkModal: document.getElementById('linkModal'),
    imageModal: document.getElementById('imageModal'),
    tableModal: document.getElementById('tableModal'),
    linkText: document.getElementById('linkText'),
    linkUrl: document.getElementById('linkUrl'),
    imageAlt: document.getElementById('imageAlt'),
    imageUrl: document.getElementById('imageUrl'),
    linkCancel: document.getElementById('linkCancel'),
    linkSubmit: document.getElementById('linkSubmit'),
    imageCancel: document.getElementById('imageCancel'),
    imageSubmit: document.getElementById('imageSubmit'),
    tableRows: document.getElementById('tableRows'),
    tableCols: document.getElementById('tableCols'),
    tablePreview: document.getElementById('tablePreview'),
    tableCancel: document.getElementById('tableCancel'),
    tableSubmit: document.getElementById('tableSubmit'),
    
    // Status
    statusLeft: document.getElementById('statusLeft'),
    statusRight: document.getElementById('statusRight'),
    unsavedIndicator: document.getElementById('unsavedIndicator'),
    fileInput: document.getElementById('fileInput')
};
