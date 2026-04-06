import os

server_py = r'd:\mini\Mini-Project\backend\server.py'
index_html = r'd:\mini\Mini-Project\backend\templates\index.html'
script_js = r'd:\mini\Mini-Project\backend\static\script.js'

with open(server_py, 'r', encoding='utf-8') as f:
    server_content = f.read()

update_username_endpoint = """
@app.route('/api/update_username', methods=['POST'])
def update_username():
    token = request.headers.get('X-Auth-Token')
    old_username = _get_user_from_token(token)
    if not old_username:
        return jsonify({'ok': False, 'error': 'Unauthorized'}), 401
    
    data = request.get_json(force=True, silent=True) or {}
    new_username = (data.get('new_username') or '').strip()
    
    if not new_username:
        return jsonify({'ok': False, 'error': 'New username cannot be empty.'}), 400
    
    users = _load_json(USERS_FILE, {})
    if new_username in users:
        return jsonify({'ok': False, 'error': 'Username already exists.'}), 409
        
    # Migrate users.json
    users[new_username] = users.pop(old_username)
    _save_json(USERS_FILE, users)
    
    # Migrate history.json
    history = _load_json(HISTORY_FILE, {})
    if old_username in history:
        history[new_username] = history.pop(old_username)
        _save_json(HISTORY_FILE, history)
        
    # Migrate active sessions mapping
    for session_token, u in _sessions.items():
        if u == old_username:
            _sessions[session_token] = new_username
            
    return jsonify({'ok': True, 'username': new_username})

# ─── Main"""

if 'update_username' not in server_content:
    server_content = server_content.replace('# ─── Main', update_username_endpoint)
    with open(server_py, 'w', encoding='utf-8') as f:
        f.write(server_content)
    print("Modified server.py")

with open(index_html, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Edit Profile in dropdown
if 'Edit Profile' not in index_content:
    index_content = index_content.replace(
        '<div class="dropdown-sep"></div>',
        '<button class="dropdown-item" onclick="openProfileModal()">\n        <span class="dropdown-icon">✏️</span> Edit Profile\n    </button>\n    <div class="dropdown-sep"></div>'
    )
    
    # Profile Overlay
    profile_overlay = """
<!-- Edit Profile Modal -->
<div class="auth-overlay" id="profileOverlay" style="display:none;">
    <div class="auth-card">
        <h2 id="profileTitle">Edit Profile</h2>
        <p id="profileMessage" class="auth-message"></p>
        <input id="profileUsername" placeholder="New Username" autocomplete="off" spellcheck="false" />
        <div class="auth-actions" style="justify-content: flex-end; margin-top: 15px;">
            <button class="mini-btn" onclick="closeProfileModal()" style="margin-right: 10px;">Cancel</button>
            <button class="run-btn" onclick="updateUsername()">Save Changes</button>
        </div>
    </div>
</div>
"""
    index_content = index_content.replace('<!-- Toast Notification -->', profile_overlay + '\n<!-- Toast Notification -->')
    
    # Dashboard button
    dash_button = """        <button class="icon-btn" onclick="window.location.href='/'" title="Dashboard / Home">
            🏠
        </button>
        <div class="nav-divider"></div>
        
        <button class="mode-toggle-btn\""""
    index_content = index_content.replace('<button class="mode-toggle-btn"', dash_button)

    with open(index_html, 'w', encoding='utf-8') as f:
        f.write(index_content)
    print("Modified index.html")

with open(script_js, 'r', encoding='utf-8') as f:
    script_content = f.read()

# Update loadWorkspace and saveWorkspace
if 'singleCodeMap' not in script_content:
    # We replace saveWorkspace and loadWorkspace completely
    old_save = """function saveWorkspace() {
    if (!editorReady || !appMode) return;
    
    const workspace = {
        mode: appMode,
        lang: currentLang,
        singleCode: appMode === 'single' ? editor.getValue() : '',
        files: appMode === 'multi' ? files.map(f => ({ name: f.name, content: f.model.getValue(), isMain: f.isMain })) : []
    };
    localStorage.setItem('syntaxiaWorkspace', JSON.stringify(workspace));
}"""
    new_save = """function saveWorkspace() {
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
}"""
    script_content = script_content.replace(old_save, new_save)

    old_load = """function loadWorkspace() {
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
}"""
    new_load = """function loadWorkspace() {
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
}"""
    script_content = script_content.replace(old_load, new_load)

# Add codeviewer copy capability for history in script.js
if 'openCodeViewer' not in script_content:
    profile_and_codeviewer = """
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
"""
    script_content += profile_and_codeviewer

    # We also need to change how loadHistory renders items to be clickable
    old_history_render = """    container.innerHTML = '';
    data.history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card-item';
        const title = document.createElement('h4');
        title.textContent = `${item.language.toUpperCase()} (${item.mode}) — ${new Date(item.timestamp).toLocaleString()}`;
        const snippet = document.createElement('p');
        snippet.textContent = (item.code || '').slice(0, 280);
        card.appendChild(title);
        card.appendChild(snippet);
        container.appendChild(card);
    });"""
    new_history_render = """    container.innerHTML = '';
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
    });"""
    script_content = script_content.replace(old_history_render, new_history_render)

    with open(script_js, 'w', encoding='utf-8') as f:
        f.write(script_content)
    print("Modified script.js")
