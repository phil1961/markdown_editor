/* @requires-dom — HtmlToMarkdown uses document.createElement. */
// ============================================================================
// HTML TO MARKDOWN CONVERTER
// ============================================================================
const HtmlToMarkdown = {
    convert(html) {
        if (!html) return '';
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        return this.processNode(temp).trim();
    },
    
    processNode(node) {
        let result = '';
        
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                result += this.convertElement(child);
            }
        }
        
        return result;
    },
    
    convertElement(el) {
        const tag = el.tagName.toLowerCase();
        const content = this.processNode(el);
        
        switch (tag) {
            case 'strong':
            case 'b':
                return `**${content}**`;
            case 'em':
            case 'i':
                return `*${content}*`;
            case 'u':
                return `++${content}++`;
            case 'del':
            case 's':
                return `~~${content}~~`;
            case 'h1':
                return `# ${content}\n\n`;
            case 'h2':
                return `## ${content}\n\n`;
            case 'h3':
                return `### ${content}\n\n`;
            case 'h4':
                return `#### ${content}\n\n`;
            case 'h5':
                return `##### ${content}\n\n`;
            case 'h6':
                return `###### ${content}\n\n`;
            case 'p':
                return `${content}\n\n`;
            case 'br':
                return '\n';
            case 'hr':
                return '---\n\n';
            case 'a':
                return `[${content}](${el.getAttribute('href') || ''})`;
            case 'img':
                return `![${el.getAttribute('alt') || ''}](${el.getAttribute('src') || ''})`;
            case 'code':
                if (el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
                    return content;
                }
                return `\`${content}\``;
            case 'pre':
                const codeEl = el.querySelector('code');
                const lang = codeEl ? (codeEl.className.replace('language-', '') || '') : '';
                return `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
            case 'blockquote':
                return this.convertBlockquote(el);
            case 'ul':
                return this.convertList(el, 'ul');
            case 'ol':
                return this.convertList(el, 'ol');
            case 'li':
                return content;
            default:
                return content;
        }
    },
    
    convertBlockquote(el, depth = 1) {
        const prefix = '>'.repeat(depth) + ' ';
        let result = '';
        
        for (const child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text) {
                    result += text.split('\n').map(line => prefix + line).join('\n') + '\n';
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'blockquote') {
                    result += this.convertBlockquote(child, depth + 1);
                } else if (tag === 'ul' || tag === 'ol') {
                    result += this.convertListInBlockquote(child, tag, depth);
                } else if (tag === 'p') {
                    const content = this.processNode(child);
                    result += content.split('\n').map(line => prefix + line).join('\n') + '\n';
                } else {
                    const content = this.convertElement(child);
                    result += content.split('\n').filter(l => l.trim()).map(line => prefix + line).join('\n') + '\n';
                }
            }
        }
        
        return result + '\n';
    },
    
    convertListInBlockquote(el, type, quoteDepth) {
        const prefix = '>'.repeat(quoteDepth) + ' ';
        let result = '';
        let index = 1;
        
        for (const li of el.querySelectorAll(':scope > li')) {
            const content = this.processNode(li);
            const marker = type === 'ol' ? `${index}. ` : '- ';
            result += prefix + marker + content + '\n';
            index++;
        }
        
        return result;
    },
    
    convertList(el, type) {
        let result = '';
        let index = 1;
        
        for (const li of el.querySelectorAll(':scope > li')) {
            const content = this.processNode(li);
            const marker = type === 'ol' ? `${index}. ` : '- ';
            result += marker + content + '\n';
            index++;
        }
        
        return result + '\n';
    }
};
