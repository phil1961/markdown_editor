/* @requires-dom */
// ============================================================================
// PREVIEW OPERATIONS
// ============================================================================
const PreviewOps = {
    /**
     * Apply formatting in preview pane
     */
    applyFormat(format) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        // Check if we're in the preview pane
        if (!DOM.preview.contains(range.commonAncestorContainer)) {
            return;
        }
        
        // Handle block formats differently
        const blockFormats = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bullet', 'number', 'quoteIncrease', 'quoteDecrease', 'codeBlock', 'hr'];
        if (blockFormats.includes(format)) {
            this.applyBlockFormat(format, range);
        } else {
            this.applyInlineFormat(format, range);
        }
    },
    
    /**
     * Apply inline formatting in preview
     */
    applyInlineFormat(format, range) {
        let tagName;
        switch (format) {
            case 'bold': tagName = 'strong'; break;
            case 'italic': tagName = 'em'; break;
            case 'underline': tagName = 'u'; break;
            case 'strike': tagName = 'del'; break;
            case 'code': tagName = 'code'; break;
            default: return;
        }
        
        // Check if already formatted
        const parentTag = range.commonAncestorContainer.parentElement;
        if (parentTag && parentTag.tagName.toLowerCase() === tagName) {
            // Remove formatting
            const text = document.createTextNode(parentTag.textContent);
            parentTag.parentNode.replaceChild(text, parentTag);
        } else {
            // Add formatting
            const wrapper = document.createElement(tagName);
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);
        }
        
        this.syncToEditor();
        Logger.info('Preview', `Applied ${format} formatting`);
    },
    
    /**
     * Apply block formatting in preview
     */
    applyBlockFormat(format, range) {
        // Find the block element(s) containing the selection
        let startBlock = this.findBlockElement(range.startContainer);
        let endBlock = this.findBlockElement(range.endContainer);
        
        if (!startBlock) {
            Logger.warn('Preview', 'Could not find block element for formatting');
            alert('Could not find block element. Please select some content first.');
            return;
        }
        
        // Collect all block elements in the selection
        const selectedBlocks = [];
        const processedLists = new Set();
        
        // Get all elements that intersect with the selection
        const walker = document.createTreeWalker(
            DOM.preview,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'UL', 'OL'].includes(node.tagName)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let node;
        let foundStart = false;
        
        while (node = walker.nextNode()) {
            if (node === startBlock || node.contains(startBlock) || startBlock.contains(node)) {
                foundStart = true;
            }
            
            if (foundStart && range.intersectsNode(node)) {
                // Special handling for LI elements - get the parent list instead
                if (node.tagName === 'LI') {
                    const parentList = node.closest('ul, ol');
                    if (parentList && !processedLists.has(parentList)) {
                        // Check if all list items are selected
                        const listItems = Array.from(parentList.querySelectorAll(':scope > li'));
                        const allSelected = listItems.every(li => range.intersectsNode(li));
                        if (allSelected && (format === 'quoteIncrease' || format === 'quoteDecrease')) {
                            selectedBlocks.push(parentList);
                            processedLists.add(parentList);
                            continue;
                        }
                    }
                }
                
                if (!processedLists.has(node.closest('ul, ol'))) {
                    selectedBlocks.push(node);
                }
            }
            
            if (node === endBlock || node.contains(endBlock)) {
                break;
            }
        }
        
        // If no blocks found, use the start block
        if (selectedBlocks.length === 0 && startBlock) {
            selectedBlocks.push(startBlock);
        }
        
        // Apply formatting to each block
        for (const block of selectedBlocks) {
            this.formatBlock(block, format);
        }
        
        this.syncToEditor();
        Logger.info('Preview', `Applied ${format} to ${selectedBlocks.length} block(s)`);
    },
    
    /**
     * Find the nearest block-level element
     */
    findBlockElement(node) {
        while (node && node !== DOM.preview) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'ul', 'ol'].includes(tag)) {
                    return node;
                }
            }
            node = node.parentNode;
        }
        // If no block parent found, wrap the text node in a <p>
        if (node === DOM.preview) {
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                const p = document.createElement('p');
                // Find the top-level nodes in preview that intersect the selection
                const children = Array.from(DOM.preview.childNodes);
                let first = null, last = null;
                for (const child of children) {
                    if (range.intersectsNode(child)) {
                        if (!first) first = child;
                        last = child;
                    }
                }
                if (first) {
                    DOM.preview.insertBefore(p, first);
                    let current = p.nextSibling;
                    while (current) {
                        const next = current.nextSibling;
                        p.appendChild(current);
                        if (current === last) break;
                        current = next;
                    }
                    return p;
                }
            }
        }
        return null;
    },
    
    /**
     * Format a single block element
     */
    formatBlock(block, format) {
        const tag = block.tagName.toLowerCase();
        
        switch (format) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                this.convertToHeader(block, format);
                break;
                
            case 'bullet':
                this.convertToList(block, 'ul');
                break;
                
            case 'number':
                this.convertToList(block, 'ol');
                break;
                
            case 'quoteIncrease':
                this.increaseQuote(block);
                break;
                
            case 'quoteDecrease':
                this.decreaseQuote(block);
                break;
        }
    },
    
    /**
     * Convert block to header
     */
    convertToHeader(block, level) {
        const newHeader = document.createElement(level);
        newHeader.innerHTML = block.innerHTML;
        block.parentNode.replaceChild(newHeader, block);
    },
    
    /**
     * Convert block to list
     */
    convertToList(block, type) {
        const tag = block.tagName.toLowerCase();
        
        if (tag === 'li') {
            // Toggle list type
            const parentList = block.parentElement;
            if (parentList.tagName.toLowerCase() !== type) {
                const newList = document.createElement(type);
                while (parentList.firstChild) {
                    newList.appendChild(parentList.firstChild);
                }
                parentList.parentNode.replaceChild(newList, parentList);
            }
        } else {
            // Convert to list
            const list = document.createElement(type);
            const li = document.createElement('li');
            li.innerHTML = block.innerHTML;
            list.appendChild(li);
            block.parentNode.replaceChild(list, block);
        }
    },
    
    /**
     * Increase quote level
     */
    increaseQuote(block) {
        const blockquote = document.createElement('blockquote');
        
        // Handle list elements specially - wrap the entire list
        if (block.tagName === 'UL' || block.tagName === 'OL') {
            const clonedList = block.cloneNode(true);
            blockquote.appendChild(clonedList);
            block.parentNode.replaceChild(blockquote, block);
        } else if (block.tagName === 'LI') {
            // Wrap the parent list
            const parentList = block.closest('ul, ol');
            if (parentList) {
                const clonedList = parentList.cloneNode(true);
                blockquote.appendChild(clonedList);
                parentList.parentNode.replaceChild(blockquote, parentList);
            }
        } else {
            // Regular element
            const cloned = block.cloneNode(true);
            blockquote.appendChild(cloned);
            block.parentNode.replaceChild(blockquote, block);
        }
    },
    
    /**
     * Decrease quote level
     */
    decreaseQuote(block) {
        // Find the nearest blockquote parent
        const blockquote = block.closest('blockquote');
        if (!blockquote) return;
        
        // Move contents out of the blockquote
        const parent = blockquote.parentNode;
        while (blockquote.firstChild) {
            parent.insertBefore(blockquote.firstChild, blockquote);
        }
        parent.removeChild(blockquote);
    },
    
    /**
     * Sync preview changes back to editor
     */
    syncToEditor() {
        const markdown = HtmlToMarkdown.convert(DOM.preview.innerHTML);
        DOM.editor.value = markdown;
        EditorOps.updateStatus();
        AppState.setModified(true);
    }
};
