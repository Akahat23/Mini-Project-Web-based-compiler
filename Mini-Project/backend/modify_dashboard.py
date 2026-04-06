import os

home_html = r'd:\mini\Mini-Project\backend\templates\home.html'
style_css = r'd:\mini\Mini-Project\backend\static\style.css'
home_js   = r'd:\mini\Mini-Project\backend\static\home.js'

# --- 1. Modify home.html ---
with open(home_html, 'r', encoding='utf-8') as f:
    html = f.read()

# Add dashboard-body class
html = html.replace('<body class="dark" id="body">', '<body class="dark dashboard-body" id="body">')

# Add Stats and Tips HTML
stats_html = """
    <!-- Interactive Elements Section -->
    <section class="interactive-modules">
        <div class="stats-row">
            <div class="stat-card" onmousemove="tilt(event, this)" onmouseleave="resetTilt(this)">
                <div class="stat-num" data-target="15234">0</div>
                <div class="stat-label">Lines Compiled</div>
            </div>
            <div class="stat-card" onmousemove="tilt(event, this)" onmouseleave="resetTilt(this)">
                <div class="stat-num" data-target="98">0</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card" onmousemove="tilt(event, this)" onmouseleave="resetTilt(this)">
                <div class="stat-num">Python</div>
                <div class="stat-label">Top Language</div>
            </div>
        </div>
        
        <div class="tip-card" onclick="nextTip()" onmousemove="tilt(event, this)" onmouseleave="resetTilt(this)" title="Click for another tip!">
            <div class="tip-header">💡 Tip of the Day</div>
            <div class="tip-content" id="tipContent">Use the Ctrl+K shortcut in the editor to summon the Command Palette instantly!</div>
        </div>
    </section>
"""

if 'class="interactive-modules"' not in html:
    html = html.replace('</section>\n\n    <section class="history-section"', f'</section>\n\n{stats_html}\n    <section class="history-section"')

with open(home_html, 'w', encoding='utf-8') as f:
    f.write(html)


# --- 2. Modify style.css ---
with open(style_css, 'r', encoding='utf-8') as f:
    css = f.read()

# Fix scrolling and add new styles
if '.dashboard-body' not in css:
    new_css = """
/* Dashboard Bug Fixes & Interactivity */
body.dashboard-body {
    overflow-y: auto !important;
    height: auto !important;
    min-height: 100vh;
}

.interactive-modules {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 20px;
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}

.stat-card, .tip-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transition: box-shadow 0.3s ease, border-color 0.3s ease;
    transform-style: preserve-3d;
    transform: perspective(1000px);
    will-change: transform;
}

.stat-card::before, .tip-card::before {
    content: '';
    position: absolute; inset: 0; border-radius: var(--radius-lg);
    background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 50%);
    opacity: 0; transition: opacity 0.3s; pointer-events: none;
}

.stat-card:hover, .tip-card:hover {
    border-color: var(--accent);
    box-shadow: 0 16px 40px rgba(56,189,248,0.12);
}
.stat-card:hover::before, .tip-card:hover::before { opacity: 1; }

.stat-num {
    font-size: 32px; font-weight: 800;
    margin-bottom: 6px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transform: translateZ(20px);
}
body.light .stat-num { background: linear-gradient(135deg, #2563eb, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.stat-label { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; transform: translateZ(10px); }

.tip-card {
    cursor: pointer; position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: flex-start; text-align: left;
}
.tip-header { font-size: 14px; font-weight: 700; color: var(--warning); margin-bottom: 12px; transform: translateZ(15px); }
.tip-content { font-size: 16px; color: var(--text); font-style: italic; line-height: 1.5; transform: translateZ(10px); transition: opacity 0.25s; }
"""
    css += new_css
    with open(style_css, 'w', encoding='utf-8') as f:
        f.write(css)


# --- 3. Modify home.js ---
with open(home_js, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the old rigid animation with interactive ones
# The old one is at the bottom wrapped in (function initBackground() { ... })();
if 'mousemove' not in js.split('initBackground')[1]:
    old_bg = """(function initBackground() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
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
                ctx.shadowBlur = this.r * 6; ctx.shadowColor = 'rgba(56,189,248,0.8)';
            } else { ctx.shadowBlur = 0; }
        }
    }
    const stars = Array.from({length: 120}, () => new Star());
    function anim() {
        const t = performance.now();
        ctx.clearRect(0,0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.y += s.speed * 12; s.update(t); s.draw();
            if (s.y > canvas.height + 5) s.init(true);
        });
        requestAnimationFrame(anim);
    }
    anim();
})();"""

    new_bg = """(function initBackground() {
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
"""
    js = js.replace(old_bg, new_bg)
    with open(home_js, 'w', encoding='utf-8') as f:
        f.write(js)

print("Dashboard interactivity successfully upgraded.")
