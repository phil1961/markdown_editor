// ============================================================================
// LOGGING SYSTEM
// ============================================================================
const Logger = {
    enabled: true,
    showInConsole: true,
    
    _format(level, module, message) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + 
                    String(new Date().getMilliseconds()).padStart(3, '0');
        return `[${time}] [${module}] ${message}`;
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
    }
};
