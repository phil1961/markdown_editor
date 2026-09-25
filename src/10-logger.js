// ============================================================================
// LOGGING SYSTEM
// ============================================================================
const Logger = {
    enabled: true,
    showInConsole: true,
    
    /* The level is in the text, not only in the row's class, so a copied
       or screenshotted panel still tells an error from an info line. */
    _format(level, module, message) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.'
                   + String(now.getMilliseconds()).padStart(3, '0');
        return `[${time}] [${level}] [${module}] ${message}`;
    },

    _addToPanel(level, message) {
        const panel = document.getElementById('consolePanel');
        if (panel) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${level}`;
            entry.textContent = message;
            panel.appendChild(entry);
            panel.scrollTop = panel.scrollHeight;
        }
    },
    
    info(module, message) {
        if (!this.enabled) return;
        const formatted = this._format('INFO', module, message);
        if (this.showInConsole) console.log(formatted);
        this._addToPanel('info', formatted);
    },
    
    warn(module, message) {
        if (!this.enabled) return;
        const formatted = this._format('WARN', module, message);
        if (this.showInConsole) console.warn(formatted);
        this._addToPanel('warn', formatted);
    },
    
    error(module, message) {
        if (!this.enabled) return;
        const formatted = this._format('ERROR', module, message);
        if (this.showInConsole) console.error(formatted);
        this._addToPanel('error', formatted);
    },
    
    success(module, message) {
        if (!this.enabled) return;
        const formatted = this._format('OK', module, message);
        if (this.showInConsole) console.log(formatted);
        this._addToPanel('success', formatted);
    },

    /* Uncaught exceptions and unhandled rejections land in the panel too, so
       Ctrl+Shift+L shows why an operation silently stopped. Installed at
       script time; the panel is looked up when the first entry arrives.
       A no-op under Node (dist/editor.cjs). */
    captureUncaught() {
        if (typeof window === 'undefined' || this._capturing) return;
        this._capturing = true;
        window.addEventListener('error', e => {
            const where = e.filename ? ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')' : '';
            this.error('Uncaught', (e.message || String(e.error || 'error')) + where);
        });
        window.addEventListener('unhandledrejection', e => {
            const r = e.reason;
            this.error('Uncaught', 'Unhandled promise rejection: ' + (r && r.message ? r.message : String(r)));
        });
    }
};
Logger.captureUncaught();
