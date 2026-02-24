/* ===== THEME TOGGLE ===== */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle("dark");
    body.classList.toggle("light");

    const isDark = body.classList.contains("dark");

    // Change Monaco theme also
    if (window.monaco) {
        monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
    }
}

/* ===== PARTICLE BACKGROUND ===== */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

let particles = [];
const particleCount = 80;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56,189,248,0.6)";
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}
initParticles();

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.move();
        p.draw();
    });

    requestAnimationFrame(animateParticles);
}
animateParticles();
require.config({
    paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
    }
});

require(['vs/editor/editor.main'], function () {

    window.editor = monaco.editor.create(document.getElementById('editor'), {
        value: '// Start coding here...',
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false }
    });

    // 🔥 Language Change Listener
    document.getElementById("language").addEventListener("change", function () {

        const langMap = {
            python: "python",
            c: "c",
            cpp: "cpp",
            java: "java",
            javascript: "javascript"
        };

        const selected = this.value;

        monaco.editor.setModelLanguage(
            editor.getModel(),
            langMap[selected]
        );
    });

});
