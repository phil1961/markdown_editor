/* @requires-dom — HtmlToMarkdown uses DOMParser and DOM nodes. */
// ============================================================================
// HTML TO MARKDOWN CONVERTER
// ============================================================================
const HtmlToMarkdown = {
    /* Parse in an inert document. Clipboard HTML and opened .html files are
       untrusted; on a live element an <img onerror> would run in the
       editor's origin. DOMParser documents load nothing and run nothing. */
    convert(html) {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(String(html), 'text/html');
        return this.processNode(doc.body || doc.documentElement).trim();
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
                return this.wrapInline('**', content);
            case 'em':
            case 'i':
                return this.wrapInline('*', content);
            case 'u':
                return this.wrapInline('++', content);
            case 'del':
            case 's':
                return this.wrapInline('~~', content);
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
            case 'table':
                return this.convertTable(el);
            case 'thead':
            case 'tbody':
            case 'tr':
            case 'th':
            case 'td':
                return content;
            case 'div':
                if (this.alertKind(el)) return this.convertBlockquote(el);
                return content + (content.endsWith('\n') ? '' : '\n');
            default:
                return content;
        }
    },

    /* Keep leading/trailing spaces outside the markers so
       <strong>Widget </strong> becomes **Widget** not **Widget **. */
    wrapInline(marker, content) {
        const lead = content.match(/^\s*/)[0];
        const trail = content.match(/\s*$/)[0];
        const core = content.slice(lead.length, content.length - trail.length);
        if (!core) return content;
        return lead + marker + core + marker + trail;
    },
    
    /* Our export's <blockquote class="markdown-alert markdown-alert-note">, or
       GitHub's rendered <div> with the same classes. */
    alertKind(el) {
        const m = /(?:^|\s)markdown-alert-(note|tip|important|warning|caution)(?:\s|$)/.exec(el.className || '');
        return m ? m[1] : '';
    },

    convertBlockquote(el, depth = 1) {
        const prefix = '>'.repeat(depth) + ' ';
        const kind = this.alertKind(el);
        let result = kind ? prefix + '[!' + kind.toUpperCase() + ']\n' : '';
        
        for (const child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text) {
                    result += text.split('\n').map(line => prefix + line).join('\n') + '\n';
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                if (/(?:^|\s)markdown-alert-title(?:\s|$)/.test(child.className || '')) continue;
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
    
    convertTable(el) {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (!rows.length) return '';
        const cells = row => Array.from(row.querySelectorAll('th,td'))
            .map(c => this.processNode(c).replace(/\|/g, '\\|').trim());
        const header = cells(rows[0]);
        if (!header.length) return '';
        let md = '| ' + header.join(' | ') + ' |\n';
        md += '| ' + header.map(() => '---').join(' | ') + ' |\n';
        for (let i = 1; i < rows.length; i++) {
            md += '| ' + cells(rows[i]).join(' | ') + ' |\n';
        }
        return md + '\n';
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
