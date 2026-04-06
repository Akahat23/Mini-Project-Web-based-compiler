/* ===========================
   Syntaxia — Main Script
   =========================== */

// ─── App State ───────────────────────────────────────────────────────────────
let editor       = null;
let currentLang  = 'c';
let isDark       = true;
let appMode      = null;
let editorReady  = false;
let isRunning    = false;
let startTime    = null;
let socket       = null;
let authToken    = null;
let currentUser  = null;
let authMode     = 'login'; // or register


// ─── Multi-file State ────────────────────────────────────────────────────────
let files        = [];
let activeFileId = null;
let renameTargetId = null;

// ─── Terminal buffer ──────────────────────────────────────────────────────────
let _termSpan   = null;
let _termKind   = null;
let _termCursor = null;

// ─── File extension maps ──────────────────────────────────────────────────────
const langExtMap     = { c: 'c', cpp: 'cpp', java: 'java', python: 'py' };
const monacoLangMap  = { c: 'c', cpp: 'cpp', java: 'java', python: 'python' };
const langDisplayMap = { c: 'C', cpp: 'C++', java: 'Java', python: 'Python' };
const extToMonaco    = {
    c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
    java: 'java', py: 'python', txt: 'plaintext', md: 'markdown',
    json: 'json', xml: 'xml', html: 'html', css: 'css', js: 'javascript',
};

// ─── Code Templates ──────────────────────────────────────────────────────────
const templates = {
    c:      `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
    cpp:    `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
    java:   `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    python: `# Hello World\nprint("Hello, World!")\n`,
};

// ════════════════════════════════════════════════════════════════════
// MONACO EDITOR — init first, everything else after
// ════════════════════════════════════════════════════════════════════
require.config({
    paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
});

require(['vs/editor/editor.main'], function () {
    // ─── Custom themes ────────────────────────────────────────────
    monaco.editor.defineTheme('syntaxia-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
            { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
            { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
            { token: 'string',  foreground: '34d399' },
            { token: 'number',  foreground: 'fbbf24' },
            { token: 'type',    foreground: 'a78bfa' },
        ],
        colors: {
            'editor.background':              '#0a0a0f',
            'editor.foreground':              '#e2e8f0',
            'editor.lineHighlightBackground': '#0d1524',
            'editor.selectionBackground':     '#1e40af55',
            'editorLineNumber.foreground':    '#2d3748',
            'editorLineNumber.activeForeground': '#38bdf8',
            'editorCursor.foreground':        '#38bdf8',
            'editorGutter.background':        '#0a0a0f',
        }
    });

    monaco.editor.defineTheme('syntaxia-light', {
        base: 'vs', inherit: true, rules: [],
        colors: {
            'editor.background':              '#f8fafc',
            'editor.foreground':              '#0f172a',
            'editor.lineHighlightBackground': '#f1f5f9',
            'editorLineNumber.foreground':    '#cbd5e1',
            'editorLineNumber.activeForeground': '#2563eb',
            'editorCursor.foreground':        '#2563eb',
            'editorGutter.background':        '#f8fafc',
        }
    });

    // ─── Create editor ────────────────────────────────────────────
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: templates['c'],
        language: 'c',
        theme: 'syntaxia-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        renderWhitespace: 'none',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 14, bottom: 14 },
        overviewRulerLanes: 0,
        scrollbar: { vertical: 'auto', horizontal: 'auto', verticalScrollbarSize: 5, horizontalScrollbarSize: 5 }
    });

    editorReady = true;

    // ─── Now init Socket.IO (safely after editor) ─────────────────
    // Wait a bit to ensure socket.io.js is loaded
    if (typeof io !== 'undefined') {
        _initSocket();
    } else {
        console.error('Socket.IO library not loaded!');
        setStatus('error', 'Library load failed');
        setTimeout(() => {
            if (typeof io === 'undefined') {
                console.error('Socket.IO library still not available');
                setStatus('error', 'Offline');
            } else {
                _initSocket();
            }
        }, 1000);
    }

    // ─── Show mode modal ──────────────────────────────────────────
    document.getElementById('modeOverlay').style.display = 'flex';
});

// ════════════════════════════════════════════════════════════════════
// SOCKET.IO — initialized after Monaco to avoid blocking errors
// ════════════════════════════════════════════════════════════════════
function _initSocket() {
    try {
        let socketUrl;
        if (window.location.protocol === 'file:') {
            socketUrl = 'http://127.0.0.1:5000';
        } else {
            socketUrl = window.location.origin;
        }

        socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,
            timeout: 20000
        });
    } catch (e) {
        console.error('Socket.IO init failed:', e);
        setStatus('error', 'Offline');
        showToast('Socket.IO init failed. Make sure backend is running.');
        return;
    }

    socket.on('connect', () => {
        console.log('Socket.IO connected');
        setStatus('ready', 'Ready');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setStatus('error', 'Connection Error');
        showToast('Unable to connect to backend. Check server is running and refresh.');
    });

    socket.on('connect_timeout', (timeout) => {
        console.error('Socket.IO connect timeout:', timeout);
        setStatus('error', 'Timeout');
        showToast('Connection timed out. Ensure backend at localhost:5000 and refresh.');
    });

    socket.on('reconnect_attempt', (attempt) => {
        console.log('Socket.IO reconnect attempt', attempt);
        setStatus('error', 'Reconnecting...');
    });

    socket.on('reconnect_failed', () => {
        console.error('Socket.IO reconnect failed');
        setStatus('error', 'Reconnect Failed');
        showToast('Socket reconnect failed after max attempts. Restart server then refresh.');
    });

    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
        setStatus('error', 'Server Error');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setStatus('error', 'Disconnected');
        if (isRunning) _endRun({});
    });

    socket.on('terminal_clear', () => _clearTerminalContent());

    socket.on('run_started', () => {
        isRunning = true;
        startTime = Date.now();
        _showLoadingOverlay(true);
        _showInputBar(false);
        document.getElementById('terminalPlaceholder').style.display = 'none';
    });

    socket.on('process_alive', () => {
        _showLoadingOverlay(false);
        _showInputBar(true);
        _addCursor();
        document.getElementById('terminalInput').focus();
    });

    socket.on('terminal_output', (data) => {
        _showLoadingOverlay(false);
        _removeCursor();
        _appendTerminal(data.text, data.kind || 'output');
        _addCursor();
    });

    socket.on('run_done', (data) => {
        _removeCursor();
        _endRun(data);
    });
}

// ─── Run / Stop ───────────────────────────────────────────────────────────────
function runCode() {
    if (!editor || !appMode) {
        showToast('Please select a workspace mode first!');
        openModeModal();
        return;
    }
    if (isRunning) return;
    if (!socket || (!socket.connected && !socket.connecting)) {
        showToast('Not connected to server. Ensure backend is running at http://localhost:5000 and refresh.');
        return;
    }

    _rippleBtn(document.getElementById('runBtn'));
    _clearTerminalContent();
    document.getElementById('terminalPlaceholder').style.display = 'none';
    document.getElementById('execTime').textContent = '';

    const payload = { language: currentLang, mode: appMode };

    if (appMode === 'single') {
        const code = editor.getValue().trim();
        if (!code) { showToast('Please write some code first!'); return; }
        payload.code = code;
    } else {
        const mainFile = files.find(f => f.isMain);
        if (!mainFile || !mainFile.model.getValue().trim()) { showToast('Main file is empty!'); return; }
        payload.code  = mainFile.model.getValue();
        payload.files = files.map(f => ({ name: f.name, content: f.model.getValue(), isMain: f.isMain }));
    }

    setStatus('running', 'Running...');
    _setRunBtn(true);
    socket.emit('run_code', payload);
    saveHistory(payload).catch(err => console.warn('History save failed', err));
}

function stopRun() {
    if (socket) socket.emit('stop_run');
    _endRun({ stopped: true });
}

function sendTerminalInput() {
    const inp  = document.getElementById('terminalInput');
    const text = inp.value;
    inp.value = '';
    _removeCursor();
    _appendTerminal(text + '\n', 'input_echo');
    _addCursor();
    if (socket) socket.emit('send_input', { text });
    inp.focus();
}

function _endRun(data) {
    isRunning = false;
    _showLoadingOverlay(false);
    _showInputBar(false);
    _setRunBtn(false);
    if (startTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        document.getElementById('execTime').textContent = `${elapsed}s`;
        startTime = null;
    }
    const exitOk = data && data.exit_code === 0;
    if (data && data.stopped) _appendTerminal('\n[Execution stopped by user]\n', 'system');
    setStatus(exitOk ? 'ready' : 'error', exitOk ? 'Ready' : (data && data.stopped ? 'Ready' : 'Error'));
}

// ─── Terminal Helpers ─────────────────────────────────────────────────────────
function _appendTerminal(text, kind) {
    const out = document.getElementById('terminalOutput');
    if (!_termSpan || _termKind !== kind) {
        _termSpan = document.createElement('span');
        _termSpan.className = `term-${kind}`;
        out.appendChild(_termSpan);
        _termKind = kind;
    }
    _termSpan.textContent += text;
    out.scrollTop = out.scrollHeight;
}

function _addCursor() {
    if (_termCursor) return;
    const out = document.getElementById('terminalOutput');
    _termCursor = document.createElement('span');
    _termCursor.className = 'term-cursor';
    out.appendChild(_termCursor);
    out.scrollTop = out.scrollHeight;
}

function _removeCursor() {
    if (_termCursor) { _termCursor.remove(); _termCursor = null; }
    _termSpan = null; _termKind = null;
}

function _clearTerminalContent() {
    const out = document.getElementById('terminalOutput');
    out.querySelectorAll('span').forEach(s => s.remove());
    _termSpan = null; _termKind = null; _termCursor = null;
}

function clearTerminal() {
    _clearTerminalContent();
    document.getElementById('execTime').textContent = '';
    document.getElementById('terminalPlaceholder').style.display = 'flex';
}

function _showInputBar(show) {
    const bar    = document.getElementById('terminalInputBar');
    const stopBtn = document.getElementById('stopBtn');
    bar.classList.toggle('active', show);
    if (stopBtn) stopBtn.style.display = show ? '' : 'none';
    if (show) setTimeout(() => document.getElementById('terminalInput').focus(), 50);
}

function _setRunBtn(running) {
    const btn   = document.getElementById('runBtn');
    const icon  = document.getElementById('runBtnIcon');
    const label = document.getElementById('runBtnLabel');
    if (running) {
        btn.classList.add('running');
        icon.innerHTML = '<rect x="4" y="4" width="16" height="16" rx="2"></rect>';
        label.textContent = 'Running';
        btn.onclick = stopRun;
    } else {
        btn.classList.remove('running');
        icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        label.textContent = 'Run';
        btn.onclick = runCode;
    }
}

function _rippleBtn(btn) {
    const r = document.createElement('span');
    Object.assign(r.style, {
        position: 'absolute', borderRadius: '50%',
        background: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
        width: '100px', height: '100px',
        marginTop: '-50px', marginLeft: '-50px',
        top: '50%', left: '50%',
        transform: 'scale(0)',
        transition: 'transform 0.5s ease, opacity 0.5s ease',
        opacity: '0.7'
    });
    btn.style.position = 'relative'; btn.style.overflow = 'hidden';
    btn.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(2.5)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
}

function _showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    const text    = overlay.querySelector('.loading-text');
    const sub     = document.getElementById('loadingLang');
    const isMono  = ['c', 'cpp', 'java'].includes(currentLang);
    if (text) text.innerHTML = (isMono ? 'Compiling' : 'Running') + '<span class="dots"></span>';
    if (sub)  sub.textContent = appMode === 'multi' ? 'Compiling project...' : `Executing ${langDisplayMap[currentLang]} code...`;
    overlay.classList.toggle('active', show);
}

// ════════════════════════════════════════════════════════════════════
// MODE SELECTION
// ════════════════════════════════════════════════════════════════════
function openModeModal() {
    const overlay = document.getElementById('modeOverlay');
    overlay.style.display = 'flex';
    overlay.classList.remove('hiding');
}

function setMode(mode) {
    appMode = mode;
    const overlay = document.getElementById('modeOverlay');
    overlay.classList.add('hiding');
    setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('hiding'); }, 250);
    updateModeToggleBtn();
    if (mode === 'single') enableSingleFileMode();
    else enableMultiFileMode();
}

function updateModeToggleBtn() {
    const btn   = document.getElementById('modeToggleBtn');
    const label = document.getElementById('modeToggleLabel');
    const icon  = document.getElementById('modeToggleIcon');
    if (appMode === 'single') {
        label.textContent = 'Single File'; btn.classList.remove('multi-active');
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    } else {
        label.textContent = 'Multi-File'; btn.classList.add('multi-active');
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    }
}

function enableSingleFileMode() {
    document.getElementById('fileTabsBar').style.display = 'none';
    document.getElementById('editorPanelTitle').textContent = 'Source Code';
    document.getElementById('resetBtn').style.display = '';
    if (editor) {
        const model = monaco.editor.createModel(templates[currentLang], monacoLangMap[currentLang]);
        editor.setModel(model);
        editor.focus();
    }
    files.forEach(f => { try { f.model.dispose(); } catch(e) {} });
    files = []; activeFileId = null; renderTabs();
}

function enableMultiFileMode() {
    document.getElementById('fileTabsBar').style.display = 'flex';
    document.getElementById('editorPanelTitle').textContent = 'Project Files';
    document.getElementById('resetBtn').style.display = 'none';
    files = [];
    const mainModel = monaco.editor.createModel(templates[currentLang], monacoLangMap[currentLang]);
    const mainId    = generateId();
    files.push({ id: mainId, name: getMainFileName(), model: mainModel, isMain: true });
    setActiveFile(mainId); renderTabs();
}

function getMainFileName() {
    return currentLang === 'java' ? 'Main.java' : `main.${langExtMap[currentLang]}`;
}

// ─── File Management ──────────────────────────────────────────────────────────
function addNewFile() {
    const ext = langExtMap[currentLang];
    let index = files.length, name = `file${index}.${ext}`;
    while (files.some(f => f.name === name)) { index++; name = `file${index}.${ext}`; }
    const model = monaco.editor.createModel('', monacoLangMap[currentLang] || 'plaintext');
    const id = generateId();
    files.push({ id, name, model, isMain: false });
    setActiveFile(id); renderTabs();
    showToast(`✓ Added "${name}"`);
    setTimeout(() => startRename(id), 100);
}

function deleteFile(id) {
    const file = files.find(f => f.id === id);
    if (!file || file.isMain) { showToast('Cannot delete the main file'); return; }
    if (activeFileId === id) {
        const others = files.filter(f => f.id !== id);
        if (others.length > 0) setActiveFile(others[0].id);
    }
    try { file.model.dispose(); } catch(e) {}
    files = files.filter(f => f.id !== id); renderTabs();
    showToast(`Deleted "${file.name}"`);
}

function setActiveFile(id) {
    activeFileId = id;
    const file = files.find(f => f.id === id);
    if (!file || !editor) return;
    editor.setModel(file.model);
    const ext = file.name.split('.').pop().toLowerCase();
    monaco.editor.setModelLanguage(file.model, extToMonaco[ext] || 'plaintext');
    renderTabs(); editor.focus();
}

function renderTabs() {
    const container = document.getElementById('fileTabsScroll');
    if (!container) return;
    container.innerHTML = '';
    files.forEach(file => {
        const tab = document.createElement('button');
        tab.className = 'file-tab' + (file.id === activeFileId ? ' active' : '');
        const ext = file.name.split('.').pop().toLowerCase();
        const icons = { c:'🔵',h:'📋',cpp:'🔷',java:'☕',py:'🐍',js:'🟨',html:'🌐',css:'🎨',txt:'📄',md:'📝',json:'📦' };
        const icon = icons[ext] || '📄';
        tab.innerHTML = `
            <span class="file-tab-icon">${icon}</span>
            <span class="file-tab-name" title="${file.name}">${file.name}</span>
            ${file.isMain ? '<span class="file-tab-main-badge">MAIN</span>' : ''}
            ${!file.isMain ? `<button class="file-tab-close" onclick="event.stopPropagation();deleteFile('${file.id}')" title="Delete">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>` : ''}`;
        tab.addEventListener('click', () => setActiveFile(file.id));
        tab.addEventListener('dblclick', e => { e.stopPropagation(); startRename(file.id); });
        container.appendChild(tab);
    });
    const active = container.querySelector('.file-tab.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
}

// ─── Rename ───────────────────────────────────────────────────────────────────
function startRename(id) {
    renameTargetId = id;
    const file = files.find(f => f.id === id);
    if (!file) return;
    const overlay = document.getElementById('renameOverlay');
    const input   = document.getElementById('renameInput');
    overlay.style.display = 'flex'; input.value = file.name; input.focus(); input.select();
}
function cancelRename() { document.getElementById('renameOverlay').style.display = 'none'; renameTargetId = null; }
function confirmRename() {
    const input = document.getElementById('renameInput');
    const newName = input.value.trim();
    if (!newName) { showToast('File name cannot be empty'); return; }
    if (files.some(f => f.id !== renameTargetId && f.name === newName)) { showToast('Name already exists'); return; }
    const file = files.find(f => f.id === renameTargetId);
    if (file) {
        const old = file.name; file.name = newName;
        const ext = newName.split('.').pop().toLowerCase();
        monaco.editor.setModelLanguage(file.model, extToMonaco[ext] || 'plaintext');
        renderTabs(); showToast(`Renamed "${old}" → "${newName}"`);
    }
    cancelRename();
}

// ─── DOM listeners ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const ri = document.getElementById('renameInput');
    if (ri) { ri.addEventListener('keydown', e => { if (e.key==='Enter') confirmRename(); if (e.key==='Escape') cancelRename(); }); }
    const ti = document.getElementById('terminalInput');
    if (ti) { ti.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); sendTerminalInput(); } }); }
});

// ════════════════════════════════════════════════════════════════════
// LANGUAGE SELECTION
// ════════════════════════════════════════════════════════════════════
function selectLanguage(lang, btn) {
    if (lang === currentLang) return;
    currentLang = lang;
    document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('langBadge').textContent = langDisplayMap[lang];
    if (appMode === 'single' && editor) {
        editor.setModel(monaco.editor.createModel(templates[lang], monacoLangMap[lang]));
    } else if (appMode === 'multi') {
        files.forEach(f => { try { f.model.dispose(); } catch(e) {} });
        files = [];
        const mainModel = monaco.editor.createModel(templates[lang], monacoLangMap[lang]);
        const mainId = generateId();
        files.push({ id: mainId, name: getMainFileName(), model: mainModel, isMain: true });
        setActiveFile(mainId); renderTabs();
    }
    clearTerminal();
}

// ════════════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════════════
function setStatus(type, text) {
    const badge = document.getElementById('statusBadge');
    const span  = document.getElementById('statusText');
    badge.className = 'status-badge ' + (type !== 'ready' ? type : '');
    span.textContent = text;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function copyCode() {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getValue()).then(() => showToast('✓ Code copied!'));
}

function resetCode() {
    if (!editor || appMode !== 'single') return;
    editor.setModel(monaco.editor.createModel(templates[currentLang], monacoLangMap[currentLang]));
    showToast('↺ Reset to template');
}

function clearAll() {
    if (appMode === 'single' && editor) editor.setValue('');
    else if (appMode === 'multi') files.forEach(f => f.model.setValue(''));
    clearTerminal();
    document.getElementById('execTime').textContent = '';
    showToast('Cleared');
}

function setAuthState(username, token) {
    currentUser = username;
    authToken   = token;
    if (token) {
        localStorage.setItem('syntaxiaAuthToken', token);
        localStorage.setItem('syntaxiaUser', username);
        document.getElementById('loginBtn').title = 'Logout';
        document.getElementById('loginBtn').textContent = username;
    } else {
        localStorage.removeItem('syntaxiaAuthToken');
        localStorage.removeItem('syntaxiaUser');
        document.getElementById('loginBtn').title = 'Login';
        document.getElementById('loginBtn').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path></svg>`;
    }
}

function openLoginModal() {
    if (currentUser) { logout(); return; }
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Register';
    document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Login' : 'Register';
    document.getElementById('authMessage').textContent = '';
}

function closeAuthModal() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
}

function switchAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Register';
    document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Login' : 'Register';
    document.getElementById('authSwitchBtn').textContent = authMode === 'login' ? 'Need an account?' : 'Already have an account?';
}

async function submitAuth() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const message  = document.getElementById('authMessage');
    if (!username || !password) { message.textContent = 'Enter both username and password.'; return; }

    const url = authMode === 'login' ? '/api/login' : '/api/register';
    const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        message.textContent = data.error || 'Authentication failed';
        return;
    }

    if (authMode === 'register') {
        message.textContent = 'Registered. You can login now.';
        authMode = 'login';
        switchAuthMode();
        return;
    }

    setAuthState(data.username, data.token);
    message.textContent = '';
    closeAuthModal();
    showToast(`Welcome ${data.username}!`);
    loadHistory();
}

async function logout() {
    await fetch('/api/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken || '' },
        body: JSON.stringify({ token: authToken })
    });
    setAuthState(null, null);
    currentUser = null;
    showToast('Logged out');
}

async function checkAuthToken() {
    const token = localStorage.getItem('syntaxiaAuthToken');
    const username = localStorage.getItem('syntaxiaUser');
    if (!token || !username) return;

    const response = await fetch('/api/me', { headers: { 'X-Auth-Token': token } });
    const data = await response.json();
    if (response.ok && data.ok && data.username === username) {
        setAuthState(username, token);
        loadHistory();
    } else {
        setAuthState(null, null);
    }
}

async function saveHistory(payload) {
    if (!currentUser || !authToken) return;

    await fetch('/api/history', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify(payload)
    });
    loadHistory();
}

async function loadHistory() {
    if (!currentUser || !authToken) return;

    const resp = await fetch('/api/history', { headers: { 'X-Auth-Token': authToken } });
    const data = await resp.json();

    const container = document.getElementById('historyList');
    if (!resp.ok || !data.ok) {
        container.innerHTML = '<p>Unable to load history.</p>';
        return;
    }

    if (!data.history.length) {
        container.innerHTML = '<p>No history yet. Run some code to record your sessions.</p>';
        return;
    }

    container.innerHTML = '';
    window.cachedHistory = data.history;
    data.history.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'history-card-item';
        card.style.cursor = 'pointer';
        card.onclick = () => openCodeViewer(index);
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="margin:0; font-size:0.95rem; font-weight:600;">${item.language.toUpperCase()} (${item.mode})</h4>
                <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <p style="margin:0; font-size:0.85rem; font-family:'JetBrains Mono', monospace; color:var(--text-secondary); opacity:0.8; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
                ${(item.code || '').slice(0, 280)}
            </p>
        `;
        container.appendChild(card);
    });
}

function toggleHistoryModal() {
    const overlay = document.getElementById('historyOverlay');
    const isVisible = overlay.style.display === 'flex';
    overlay.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) loadHistory();
}

window.addEventListener('load', checkAuthToken);

function toggleTheme() {
    isDark = !isDark;
    document.getElementById('body').className = isDark ? 'dark' : 'light';
    if (editor) monaco.editor.setTheme(isDark ? 'syntaxia-dark' : 'syntaxia-light');
    const icon = document.getElementById('themeIcon');
    if (isDark) {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
}

document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
    if (e.key === 'Escape') { _showLoadingOverlay(false); cancelRename(); }
});

function generateId() { return Math.random().toString(36).slice(2, 10); }

// ════════════════════════════════════════════════════════════════════
// BACKGROUND ANIMATION — Stars (dark) / Particles (light)
// ════════════════════════════════════════════════════════════════════
(function initBackground() {
    const canvas = document.getElementById('particles');
    const ctx    = canvas.getContext('2d');

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    class Star {
        constructor() { this.init(); }
        init(fromTop = false) {
            this.x = Math.random() * canvas.width;
            this.y = fromTop ? -2 : Math.random() * canvas.height;
            this.r = Math.random() * 1.4 + 0.2;
            this.base = Math.random() * 0.65 + 0.25;
            this.alpha = this.base;
            this.phase = Math.random() * Math.PI * 2;
            this.speed = Math.random() * 0.012 + 0.003;
        }
        update(t) {
            this.alpha = this.base + Math.sin(t * this.speed * 60 + this.phase) * 0.28;
            this.alpha = Math.max(0.05, Math.min(1, this.alpha));
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`; ctx.fill();
            if (this.r > 0.9) {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200,220,255,${this.alpha * 0.12})`; ctx.fill();
            }
        }
    }

    class ShootingStar {
        constructor() { this.active = false; this.delay = Math.random() * 300 + 80; }
        update() {
            if (!this.active) { if (--this.delay <= 0) this._spawn(); return; }
            this.x += this.vx; this.y += this.vy; this.life--;
            if (this.life <= 0 || this.y > canvas.height || this.x > canvas.width) {
                this.active = false; this.delay = Math.random() * 500 + 200;
            }
        }
        _spawn() {
            this.x = Math.random() * canvas.width * 0.75;
            this.y = Math.random() * canvas.height * 0.35;
            const spd = Math.random() * 9 + 7, ang = (Math.random() * 20 + 18) * Math.PI / 180;
            this.vx = Math.cos(ang) * spd; this.vy = Math.sin(ang) * spd;
            this.life = this.maxLife = Math.random() * 28 + 18; this.active = true;
        }
        draw() {
            if (!this.active) return;
            const op = this.life / this.maxLife, tail = 12;
            const grd = ctx.createLinearGradient(this.x - this.vx * tail, this.y - this.vy * tail, this.x, this.y);
            grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, `rgba(255,255,255,${op * 0.9})`);
            ctx.beginPath(); ctx.moveTo(this.x - this.vx * tail, this.y - this.vy * tail);
            ctx.lineTo(this.x, this.y); ctx.strokeStyle = grd; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.beginPath(); ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${op})`; ctx.fill();
        }
    }

    class DarkParticle {
        constructor() { this._reset(); }
        _reset() {
            this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.45; this.vy = (Math.random() - 0.5) * 0.45;
            this.r = Math.random() * 2 + 0.5; this.a = Math.random() * 0.25 + 0.08;
        }
        move() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height)  this.vy *= -1;
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(15,23,80,${this.a})`; ctx.fill();
        }
    }

    const stars         = Array.from({ length: 200 }, () => new Star());
    const shootingStars = Array.from({ length: 3   }, () => new ShootingStar());
    const darkParticles = Array.from({ length: 70  }, () => new DarkParticle());

    function drawDarkConnections() {
        for (let i = 0; i < darkParticles.length; i++) {
            for (let j = i + 1; j < darkParticles.length; j++) {
                const dx = darkParticles[i].x - darkParticles[j].x;
                const dy = darkParticles[i].y - darkParticles[j].y;
                const d  = Math.sqrt(dx*dx + dy*dy);
                if (d < 120) {
                    ctx.beginPath();
                    ctx.moveTo(darkParticles[i].x, darkParticles[i].y);
                    ctx.lineTo(darkParticles[j].x, darkParticles[j].y);
                    ctx.strokeStyle = `rgba(15,23,80,${0.07 * (1 - d/120)})`;
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
    }

    let t = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); t++;
        if (isDark) {
            stars.forEach(s => { s.update(t); s.draw(); });
            shootingStars.forEach(s => { s.update(); s.draw(); });
        } else {
            drawDarkConnections();
            darkParticles.forEach(p => { p.move(); p.draw(); });
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

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
    
    let workspace = {};
    try {
        workspace = JSON.parse(localStorage.getItem('syntaxiaWorkspace') || '{}');
    } catch(e) {}
    
    if (!workspace.singleCodeMap) workspace.singleCodeMap = {};
    if (!workspace.multiFilesMap) workspace.multiFilesMap = {};

    workspace.mode = appMode;
    workspace.lang = currentLang;

    if (appMode === 'single') {
        workspace.singleCodeMap[currentLang] = editor.getValue();
    } else {
        workspace.multiFilesMap[currentLang] = files.map(f => ({ name: f.name, content: f.model.getValue(), isMain: f.isMain }));
    }
    
    localStorage.setItem('syntaxiaWorkspace', JSON.stringify(workspace));
}

function loadWorkspace() {
    const saved = localStorage.getItem('syntaxiaWorkspace');
    if (!saved) return;
    try {
        const ws = JSON.parse(saved);
        if (appMode === 'single') {
            if (ws.singleCodeMap && ws.singleCodeMap[currentLang]) {
                editor.setValue(ws.singleCodeMap[currentLang]);
            }
        } else if (appMode === 'multi') {
            if (ws.multiFilesMap && ws.multiFilesMap[currentLang] && ws.multiFilesMap[currentLang].length) {
                files.forEach(f => { try { f.model.dispose(); } catch(e) {} });
                files = [];
                ws.multiFilesMap[currentLang].forEach(fData => {
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

// ════════════════════════════════════════════════════════════════════
// PROFILE EDIT
// ════════════════════════════════════════════════════════════════════
function openProfileModal() {
    document.getElementById('profileOverlay').style.display = 'flex';
    document.getElementById('profileUsername').value = currentUser || '';
    document.getElementById('profileMessage').textContent = '';
    document.getElementById('profileDropdown').style.display = 'none';
}

function closeProfileModal() {
    document.getElementById('profileOverlay').style.display = 'none';
}

async function updateUsername() {
    const newUsername = document.getElementById('profileUsername').value.trim();
    if (!newUsername) return;
    const msg = document.getElementById('profileMessage');
    
    const resp = await fetch('/api/update_username', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify({ new_username: newUsername })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
        msg.textContent = data.error || 'Failed to update';
        return;
    }
    
    // Success updates
    setAuthState(data.username, authToken);
    closeProfileModal();
    showToast('Username updated successfully!');
}

// ════════════════════════════════════════════════════════════════════
// HISTORY INTERACTIVE
// ════════════════════════════════════════════════════════════════════
window.cachedHistory = [];
function openCodeViewer(index) {
    if(!window.cachedHistory) return;
    const item = window.cachedHistory[index];
    if(!item) return;
    document.getElementById('codeViewerBody').textContent = item.code || '';
    document.getElementById('codeViewerOverlay').style.display = 'flex';
}
function closeCodeViewer() {
    document.getElementById('codeViewerOverlay').style.display = 'none';
}
function copyCodeViewerContent() {
    const text = document.getElementById('codeViewerBody').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Code copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy');
    });
}
