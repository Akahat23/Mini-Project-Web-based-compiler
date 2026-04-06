/* ===========================
   Syntaxia — Homepage Script
   =========================== */

let currentUser = null;
let authToken   = null;
let authMode    = 'login';
let isDark      = true;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function setAuthState(username, token, fullName = '') {
    currentUser = username;
    authToken   = token;
    
    const loginBtn = document.getElementById('loginBtn');
    const userWidget = document.getElementById('userProfileWidget');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const historySec = document.getElementById('historySection');
    
    if (token) {
        localStorage.setItem('syntaxiaAuthToken', token);
        localStorage.setItem('syntaxiaUser', username);
        if (fullName) localStorage.setItem('syntaxiaFullName', fullName);
        else localStorage.removeItem('syntaxiaFullName');
        
        loginBtn.style.display = 'none';
        userWidget.style.display = 'flex';
        
        const displayName = fullName || username.split('@')[0];
        document.getElementById('usernameText').textContent = displayName;
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
        if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${displayName}`;
        
        historySec.style.display = 'block';
        loadDashboardHistory();
    } else {
        localStorage.removeItem('syntaxiaAuthToken');
        localStorage.removeItem('syntaxiaUser');
        localStorage.removeItem('syntaxiaFullName');
        
        loginBtn.style.display = 'flex';
        userWidget.style.display = 'none';
        if (welcomeTitle) welcomeTitle.textContent = 'Welcome to Syntaxia';
        historySec.style.display = 'none';
    }
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
}

document.addEventListener('click', (e) => {
    const widget = document.getElementById('userProfileWidget');
    const dropdown = document.getElementById('profileDropdown');
    if (widget && dropdown && !widget.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

function openLoginModal() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Register';
    document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Login' : 'Register';
    document.getElementById('authMessage').textContent = '';
}

function closeAuthModal() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    if (document.getElementById('authEmail')) document.getElementById('authEmail').value = '';
    if (document.getElementById('authFullName')) document.getElementById('authFullName').value = '';
}

function switchAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Sign In' : 'Register';
    document.getElementById('authSubmitBtn').textContent = authMode === 'login' ? 'Login' : 'Register';
    document.getElementById('authSwitchBtn').textContent = authMode === 'login' ? 'Need an account?' : 'Already have an account?';
    
    if (document.getElementById('authEmail')) document.getElementById('authEmail').style.display = authMode === 'login' ? 'none' : 'block';
    if (document.getElementById('authFullName')) document.getElementById('authFullName').style.display = authMode === 'login' ? 'none' : 'block';
    document.getElementById('authUsername').placeholder = authMode === 'login' ? 'Email or Username' : 'Username';
}

async function submitAuth() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const email = document.getElementById('authEmail') ? document.getElementById('authEmail').value.trim() : '';
    const full_name = document.getElementById('authFullName') ? document.getElementById('authFullName').value.trim() : '';
    const message  = document.getElementById('authMessage');
    
    if (!username || !password) { message.textContent = 'Enter both username and password.'; return; }
    if (authMode === 'register' && (!email || !full_name)) { message.textContent = 'Enter email and full name to register.'; return; }

    const url = authMode === 'login' ? '/api/login' : '/api/register';
    const bodyArgs = authMode === 'login' ? { username, password } : { username, password, email, full_name };
    const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyArgs)
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

    setAuthState(data.username, data.token, data.full_name);
    message.textContent = '';
    closeAuthModal();
    showToast(`Welcome ${data.username}!`);
}

async function logout() {
    await fetch('/api/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken || '' },
        body: JSON.stringify({ token: authToken })
    });
    setAuthState(null, null);
    showToast('Logged out');
    document.getElementById('profileDropdown').style.display = 'none';
}

async function checkAuthToken() {
    const token = localStorage.getItem('syntaxiaAuthToken');
    const username = localStorage.getItem('syntaxiaUser');
    if (!token || !username) return;

    const response = await fetch('/api/me', { headers: { 'X-Auth-Token': token } });
    const data = await response.json();
    
    if (response.ok && data.ok && data.username === username) {
        setAuthState(username, token, data.full_name);
    } else {
        setAuthState(null, null);
    }
}

window.cachedDashboardHistory = [];
async function loadDashboardHistory() {
    if (!currentUser || !authToken) return;

    const resp = await fetch('/api/history', { headers: { 'X-Auth-Token': authToken } });
    const data = await resp.json();
    const container = document.getElementById('dashboardHistoryList');
    
    if (!resp.ok || !data.ok) {
        container.innerHTML = '<p class="text-error">Unable to load history.</p>';
        return;
    }

    if (!data.history.length) {
        container.innerHTML = '<p class="text-muted">No history yet. Start coding below!</p>';
        return;
    }

    container.innerHTML = '';
    // Show only latest 6 runs
    const runs = data.history.slice(0, 6);
    window.cachedDashboardHistory = runs;
    
    runs.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'dashboard-history-card';
        
        const date = new Date(item.timestamp);
        const timeAgo = Math.floor((new Date() - date) / 60000); 
        const dateStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.floor(timeAgo/60)}h ago` : date.toLocaleDateString();
        
        card.innerHTML = `
            <div class="hist-card-header">
                <span class="hist-lang badge-${item.language}">${item.language.toUpperCase()}</span>
                <span class="hist-mode">${item.mode === 'multi' ? 'Workspace' : 'Single'}</span>
            </div>
            <p class="hist-code" style="cursor:pointer;" onclick="openCodeViewer(${index})" title="Click to view full code">${(item.code || '').replace(/</g, "&lt;").slice(0, 60)}...</p>
            <div class="hist-meta">
                <span>${dateStr}</span>
                <div class="hist-card-actions">
                    <button class="mini-btn" onclick="openCodeViewer(${index})">View</button>
                    <button class="mini-btn" onclick="window.location.href='/compiler?lang=${item.language}&mode=${item.mode}'">Open</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openCodeViewer(index) {
    if(!window.cachedDashboardHistory) return;
    const item = window.cachedDashboardHistory[index];
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

window.addEventListener('load', checkAuthToken);

function toggleTheme() {
    isDark = !isDark;
    document.getElementById('body').className = isDark ? 'dark' : 'light';
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

// Background animation exactly like compiler
(function initBackground() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let mx = -1000;
    let my = -1000;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    window.addEventListener('mouseout', () => { mx = -1000; my = -1000; });
    
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    
    class Particle {
        constructor() { this.init(true); }
        init(randomY = false) {
            this.x = Math.random() * canvas.width;
            this.y = randomY ? Math.random() * canvas.height : -10;
            this.r = Math.random() * 1.5 + 0.5;
            this.baseAlpha = Math.random() * 0.6 + 0.2;
            this.alpha = this.baseAlpha;
            this.vx = 0;
            this.vy = Math.random() * 0.5 + 0.2;
        }
        update() {
            // Interactive mouse physics
            let dx = mx - this.x;
            let dy = my - this.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            // Attract slightly if far, repel strongly if very close
            if (dist < 150 && dist > 40) {
                this.vx += (dx / dist) * 0.02;
                this.vy += (dy / dist) * 0.02;
                this.alpha = Math.min(1, this.baseAlpha + 0.4);
            } else if (dist <= 40) {
                this.vx -= (dx / dist) * 0.2;
                this.vy -= (dy / dist) * 0.2;
                this.alpha = 1;
            } else {
                this.alpha = this.baseAlpha;
            }
            
            // Apply friction and base gravity
            this.vx *= 0.96;
            this.vy = this.vy * 0.98 + 0.01; // slow drift downwards
            
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.y > canvas.height + 10 || this.x < -10 || this.x > canvas.width + 10) {
                this.init();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.fill();
        }
    }
    
    const particles = Array.from({length: 150}, () => new Particle());
    function anim() {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(anim);
    }
    anim();
})();

// Dashboard Interactivity Scripts
const tips = [
    "Use the Ctrl+K shortcut in the editor to summon the Command Palette instantly!",
    "Switching languages won't lose your code—we save your progress autonomously behind the scenes.",
    "Click on any of your History cards to instantly view and copy old snippets.",
    "Hover over elements with a 3D effect to see the gradient light perfectly track your mouse.",
    "Writing in C or Java? The multi-file workspace automatically links to your main file!"
];

function nextTip() {
    const el = document.getElementById('tipContent');
    el.style.opacity = '0';
    setTimeout(() => {
        let current = el.textContent;
        let p;
        do { p = tips[Math.floor(Math.random() * tips.length)]; } while (p === current);
        el.textContent = p;
        el.style.opacity = '1';
    }, 250);
}

// Stats Counter Animation
document.addEventListener('DOMContentLoaded', () => {
    const nums = document.querySelectorAll('.stat-num');
    nums.forEach(num => {
        const target = +num.getAttribute('data-target');
        if(!target) return;
        const inc = target / 60; 
        let c = 0;
        const update = () => {
            c += inc;
            if(c < target) {
                num.innerText = Math.ceil(c).toLocaleString();
                requestAnimationFrame(update);
            } else {
                num.innerText = target.toLocaleString();
            }
        };
        update();
    });
});

// 3D Tilt Effect
function tilt(e, el) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
    
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const tiltX = ((y - midY) / midY) * -8;
    const tiltY = ((x - midX) / midX) * 8;
    
    el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
}
function resetTilt(el) {
    el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
}

