console.log("Script Loaded");

function toggleTheme() {
    const body = document.body;
    body.classList.toggle("dark");
    body.classList.toggle("light");

    if (window.monaco) {
        const isDark = body.classList.contains("dark");
        monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
    }
}

const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

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

let particles = [];
for (let i = 0; i < 80; i++) particles.push(new Particle());

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.move();
        p.draw();
    });
    requestAnimationFrame(animate);
}
animate();

require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {

    const editor = monaco.editor.create(
        document.getElementById("editor"),
        {
            value: "// Start coding here...\n",
            language: "python",
            theme: "vs-dark",
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false }
        }
    );

    document.getElementById("language").addEventListener("change", function () {
        const langMap = {
            python: "python",
            c: "c",
            cpp: "cpp",
            java: "java",
        };

        monaco.editor.setModelLanguage(
            editor.getModel(),
            langMap[this.value]
        );

        // 🔥 ADDED: Default templates for each language
        const templates = {
            python: "# Write Python code\nprint('Hello Python')",

            c: `#include <stdio.h>
int main() {
    printf("Hello C");
    return 0;
}`,

            cpp: `#include <iostream>
using namespace std;
int main() {
    cout << "Hello C++";
    return 0;
}`,

            java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}`
        };

        editor.setValue(templates[this.value] || "");
    });

    document.querySelector(".run").addEventListener("click", async function (event) {

        event.preventDefault();

        const code = editor.getValue();
        const language = document.getElementById("language").value;
        const input = document.getElementById("input").value;

        const runBtn = document.querySelector(".run"); // 🔥 ADDED
        runBtn.disabled = true; // 🔥 ADDED

        document.getElementById("status").textContent = "● Running...";
        document.getElementById("output").value = "";

        try {
            const response = await fetch("/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language, input })
            });

            const result = await response.json();

            // 🔥 UPDATED: Better output handling
            document.getElementById("output").value =
                (result.output ? result.output : "") +
                (result.error ? "\n" + result.error : "");

            document.getElementById("status").textContent = "● Ready";

        } catch (error) {
            document.getElementById("output").value = "Server Error";
            document.getElementById("status").textContent = "● Error";
        }

        runBtn.disabled = false; // 🔥 ADDED
    });

});