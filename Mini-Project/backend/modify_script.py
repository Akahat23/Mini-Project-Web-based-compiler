import os

js_path = r'd:\mini\Mini-Project\backend\static\script.js'

with open(js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace CodeForge references
content = content.replace('CodeForge — Main Script', 'Syntaxia — Main Script')
content = content.replace('codeforgeAuthToken', 'syntaxiaAuthToken')
content = content.replace('codeforgeUser', 'syntaxiaUser')
content = content.replace('codeforge-dark', 'syntaxia-dark')
content = content.replace('codeforge-light', 'syntaxia-light')

# Add the new features if they don't exist
if 'DOWNLOAD FEATURE' not in content:
    new_features = """

// ════════════════════════════════════════════════════════════════════
// DOWNLOAD FEATURE
// ════════════════════════════════════════════════════════════════════
function downloadFile() {
    if (!editor) return;
    
    let content = "";
    let filename = "";

    if (appMode === 'single') {
        content = editor.getValue();
        filename = `main.${langExtMap[currentLang]}`;
    } else {
        const file = files.find(f => f.id === activeFileId);
        if (!file) return;
        content = file.model.getValue();
        filename = file.name;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    showToast(`✓ Downloaded ${filename}`);
}

// ════════════════════════════════════════════════════════════════════
// AUTOSAVE WORKSPACE
// ════════════════════════════════════════════════════════════════════
function saveWorkspace() {
    if (!editorReady || !appMode) return;
    
    const workspace = {
        mode: appMode,
        lang: currentLang,
        singleCode: appMode === 'single' ? editor.getValue() : '',
        files: appMode === 'multi' ? files.map(f => ({ name: f.name, content: f.model.getValue(), isMain: f.isMain })) : []
    };
    localStorage.setItem('syntaxiaWorkspace', JSON.stringify(workspace));
}

function loadWorkspace() {
    const saved = localStorage.getItem('syntaxiaWorkspace');
    if (!saved) return;
    try {
        const ws = JSON.parse(saved);
        if (ws.mode === 'single' && appMode === 'single' && ws.lang === currentLang) {
            if (ws.singleCode) editor.setValue(ws.singleCode);
        } else if (ws.mode === 'multi' && appMode === 'multi' && ws.lang === currentLang) {
            if (ws.files && ws.files.length) {
                // Remove existing
                files.forEach(f => { try { f.model.dispose(); } catch(e) {} });
                files = [];
                ws.files.forEach(fData => {
                    const model = monaco.editor.createModel(fData.content, extToMonaco[fData.name.split('.').pop().toLowerCase()] || 'plaintext');
                    files.push({ id: generateId(), name: fData.name, model, isMain: fData.isMain });
                });
                const mainFile = files.find(f => f.isMain) || files[0];
                if (mainFile) setActiveFile(mainFile.id);
                renderTabs();
            }
        }
    } catch(e) {
        console.error("Failed to load workspace", e);
    }
}

// Attach autosave listener
setInterval(saveWorkspace, 3000); // save every 3 seconds

// ════════════════════════════════════════════════════════════════════
// COMMAND PALETTE (CTRL+K)
// ════════════════════════════════════════════════════════════════════
const commands = [
    { name: 'Run Code', action: runCode, icon: '▶' },
    { name: 'Clear Terminal', action: clearTerminal, icon: '🧹' },
    { name: 'Switch to Single File Mode', action: () => setMode('single'), icon: '📄' },
    { name: 'Switch to Multi-File Mode', action: () => setMode('multi'), icon: '📂' },
    { name: 'Switch Language: C', action: () => document.querySelector(`.lang-pill[data-lang="c"]`).click(), icon: '⚙' },
    { name: 'Switch Language: C++', action: () => document.querySelector(`.lang-pill[data-lang="cpp"]`).click(), icon: '⚙' },
    { name: 'Switch Language: Java', action: () => document.querySelector(`.lang-pill[data-lang="java"]`).click(), icon: '☕' },
    { name: 'Switch Language: Python', action: () => document.querySelector(`.lang-pill[data-lang="python"]`).click(), icon: '🐍' },
    { name: 'Toggle Theme', action: toggleTheme, icon: '🌓' },
    { name: 'Download Code', action: downloadFile, icon: '⬇' },
    { name: 'Back to Dashboard', action: () => window.location.href = '/', icon: '🏠' }
];

function togglePalette() {
    const p = document.getElementById('paletteOverlay');
    if (!p) return;
    if (p.style.display === 'none') {
        p.style.display = 'flex';
        const inp = document.getElementById('paletteInput');
        inp.value = '';
        renderPalette('');
        inp.focus();
    } else {
        p.style.display = 'none';
        if (editor) editor.focus();
    }
}

function renderPalette(query) {
    const res = document.getElementById('paletteResults');
    if (!res) return;
    res.innerHTML = '';
    const q = query.toLowerCase();
    const filtered = commands.filter(c => c.name.toLowerCase().includes(q));
    
    if (filtered.length === 0) {
        res.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No matching commands found.</div>';
        return;
    }

    filtered.forEach((cmd, idx) => {
        const div = document.createElement('div');
        div.className = 'palette-item' + (idx === 0 ? ' focused' : '');
        div.innerHTML = `<span style="margin-right:0.75rem">${cmd.icon}</span><span>${cmd.name}</span>`;
        div.onclick = () => { togglePalette(); cmd.action(); };
        div.onmouseover = () => {
            res.querySelectorAll('.palette-item').forEach(x => x.classList.remove('focused'));
            div.classList.add('focused');
        };
        res.appendChild(div);
    });
}

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        togglePalette();
    }
});

const pInput = document.getElementById('paletteInput');
if (pInput) {
    pInput.addEventListener('input', e => renderPalette(e.target.value));
    pInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') togglePalette();
        if (e.key === 'Enter') {
            const focused = document.querySelector('.palette-item.focused');
            if (focused) focused.click();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('.palette-item'));
            const idx = items.findIndex(i => i.classList.contains('focused'));
            if (idx < items.length - 1) {
                if(idx >= 0) items[idx].classList.remove('focused');
                items[idx + 1].classList.add('focused');
                items[idx + 1].scrollIntoView({ block: 'nearest' });
            }
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('.palette-item'));
            const idx = items.findIndex(i => i.classList.contains('focused'));
            if (idx > 0) {
                items[idx].classList.remove('focused');
                items[idx - 1].classList.add('focused');
                items[idx - 1].scrollIntoView({ block: 'nearest' });
            }
        }
    });
}

const pOverlay = document.getElementById('paletteOverlay');
if (pOverlay) {
    pOverlay.addEventListener('click', e => {
        if (e.target.id === 'paletteOverlay') togglePalette();
    });
}

// URL Parser
const updateFromUrl = () => {
    const urlP = new URLSearchParams(window.location.search);
    if (urlP.has('mode') || urlP.has('lang')) {
        setTimeout(() => {
            const m = urlP.get('mode') || 'single';
            const l = urlP.get('lang') || 'python';
            const lb = document.querySelector(`.lang-pill[data-lang="${l}"]`);
            if (lb) selectLanguage(l, lb);
            setMode(m);
            const overlay = document.getElementById('modeOverlay');
            if (overlay) overlay.style.display = 'none';
            setTimeout(loadWorkspace, 100);
        }, 500);
    } else {
        setTimeout(loadWorkspace, 500);
    }
};

window.addEventListener('load', updateFromUrl);
"""
    content += new_features

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated script.js successfully")
