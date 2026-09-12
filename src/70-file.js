/* @requires-dom */
// ============================================================================
// FILE OPERATIONS
// ============================================================================
const FileOps = {
    newDocument() {
        if (AppState.isModified) {
            if (!confirm('You have unsaved changes. Create a new document anyway?')) {
                return;
            }
        }
        
        DOM.editor.value = '';
        Doc.load('');
        DOM.preview.innerHTML = Doc.previewHTML();
        AppState.currentFile = null;
        AppState.setModified(false);
        this.updateFileNameDisplay();
        EditorOps.updateStatus();
        Logger.info('File', 'Created new document');
    },
    
    openFile() {
        DOM.fileInput.click();
    },
    
    handleFileOpen(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.loadFile(file);
        // Reset file input
        event.target.value = '';
    },
    
    loadFile(file) {
        // Validate file type
        const validExtensions = ['.md', '.txt', '.html'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(extension)) {
            alert('Unsupported file type. Please use .md, .txt, or .html files.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            let content = e.target.result;
            
            // If HTML file, convert to markdown
            if (file.name.endsWith('.html')) {
                const doc = new DOMParser().parseFromString(content, 'text/html');
                content = HtmlToMarkdown.convert(doc.body ? doc.body.innerHTML : '');
            }
            
            DOM.editor.value = content;
            EditorOps.updatePreviewNow();
            AppState.currentFile = file.name;
            AppState.setModified(false);
            this.updateFileNameDisplay();
            DOM.statusLeft.textContent = `Opened: ${file.name}`;
            Logger.info('File', `Opened: ${file.name}`);
        };
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            Logger.error('File', `Error reading: ${file.name}`);
        };
        reader.readAsText(file);
    },
    
    saveFile() {
        this.exportAs('md');
    },
    
    exportAs(format) {
        const markdown = DOM.editor.value;
        let content, mimeType, extension;
        
        switch (format) {
            case 'md':
                content = markdown;
                mimeType = 'text/markdown';
                extension = '.md';
                break;
                
            case 'html':
                const htmlContent = MarkdownParser.parse(markdown);
                content = this.generateHtmlDocument(htmlContent);
                mimeType = 'text/html';
                extension = '.html';
                break;
                
            case 'txt':
                // Strip markdown formatting for plain text
                content = this.stripMarkdown(markdown);
                mimeType = 'text/plain';
                extension = '.txt';
                break;
                
            default:
                return;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Get base filename without extension
        let baseName = 'document';
        if (AppState.currentFile) {
            baseName = AppState.currentFile.replace(/\.[^/.]+$/, '');
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + extension;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (format === 'md') {
            AppState.setModified(false);
            AppState.currentFile = a.download;
            this.updateFileNameDisplay();
        }
        
        DOM.statusLeft.textContent = `Downloaded: ${a.download}`;
        Logger.info('File', `Downloaded as ${format.toUpperCase()}: ${a.download}`);
    },

    // Hosted demo only: grab the original file, not the live DOM (which has
    // whatever the visitor typed). file:// cannot fetch; the href is enough.
    downloadEditor() {
        const name = "markdown-editor.html";
        const clickHref = (href, revoke) => {
            const a = document.createElement("a");
            a.href = href;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1500);
            DOM.statusLeft.textContent = "Downloaded: " + name;
            Logger.info("File", "Downloaded editor app: " + name);
        };
        const pageUrl = location.href.split("#")[0].split("?")[0];
        if (location.protocol === "http:" || location.protocol === "https:") {
            fetch(pageUrl, { cache: "no-store" }).then(r => {
                if (!r.ok) throw new Error(String(r.status));
                return r.blob();
            }).then(blob => clickHref(URL.createObjectURL(blob), true))
              .catch(() => clickHref("markdown-editor.html", false));
            return;
        }
        clickHref("markdown-editor.html", false);
    },
    
    generateHtmlDocument(bodyContent) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${AppState.currentFile ? AppState.currentFile.replace(/\.[^/.]+$/, '') : 'Document'}</title>
    <style>
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    line-height: 1.6;
    color: #333;
}
h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; color: inherit; }
blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.5em 1em; background: #eff6ff; }
a { color: #2563eb; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f9f9f9; }
    </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
    },
    
    stripMarkdown(markdown) {
        let text = markdown;
        // Remove headers
        text = text.replace(/^#{1,6}\s+/gm, '');
        // Remove bold/italic
        text = text.replace(/\*\*(.+?)\*\*/g, '$1');
        text = text.replace(/\*(.+?)\*/g, '$1');
        text = text.replace(/__(.+?)__/g, '$1');
        text = text.replace(/_(.+?)_/g, '$1');
        // Remove strikethrough
        text = text.replace(/~~(.+?)~~/g, '$1');
        // Remove links but keep text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Remove images
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
        // Remove inline code
        text = text.replace(/`([^`]+)`/g, '$1');
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        // Remove blockquotes
        text = text.replace(/^>\s*/gm, '');
        // Remove list markers
        text = text.replace(/^[-*+]\s+/gm, '');
        text = text.replace(/^\d+\.\s+/gm, '');
        // Remove horizontal rules
        text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '');
        return text;
    },
    
    updateFileNameDisplay() {
        if (DOM.fileNameDisplay) {
            DOM.fileNameDisplay.textContent = AppState.currentFile || '';
        }
    }
};

// ============================================================================
// DRAG AND DROP HANDLER
// ============================================================================
const DragDropHandler = {
    dragCounter: 0,
    
    init() {
        // Prevent default drag behaviors on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Handle drag enter/leave for overlay
        document.body.addEventListener('dragenter', (e) => this.handleDragEnter(e), false);
        document.body.addEventListener('dragleave', (e) => this.handleDragLeave(e), false);
        document.body.addEventListener('dragover', (e) => this.handleDragOver(e), false);
        document.body.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        Logger.info('DragDrop', 'Drag and drop initialized');
    },
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    handleDragEnter(e) {
        this.dragCounter++;
        
        // Check if dragging files
        if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
            DOM.dragOverlay.classList.add('active');
        }
    },
    
    handleDragLeave(e) {
        this.dragCounter--;
        
        if (this.dragCounter === 0) {
            DOM.dragOverlay.classList.remove('active');
        }
    },
    
    handleDragOver(e) {
        e.dataTransfer.dropEffect = 'copy';
    },
    
    handleDrop(e) {
        this.dragCounter = 0;
        DOM.dragOverlay.classList.remove('active');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Only handle the first file
            const file = files[0];
            
            // Check for unsaved changes
            if (AppState.isModified) {
                if (!confirm('You have unsaved changes. Load the dropped file anyway?')) {
                    return;
                }
            }
            
            FileOps.loadFile(file);
            Logger.info('DragDrop', `File dropped: ${file.name}`);
        }
    }
};
