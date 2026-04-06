import os

css_path = r'd:\mini\Mini-Project\backend\static\style.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

if '/* ==========================================================================\n   Syntaxia Palette\n   ========================================================================== */' not in content:
    palette_css = """
/* ==========================================================================
   Syntaxia Palette
   ========================================================================== */
.palette-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 15vh;
}

.palette-modal {
    width: 600px;
    max-width: 90%;
    background: var(--bg-card);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}

.palette-search {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
}

.palette-search svg {
    color: var(--text-muted);
    margin-right: 1rem;
}

.palette-search input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-family: inherit;
}

.palette-shortcut {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--bg-body);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-muted);
    font-weight: 500;
}

.palette-results {
    max-height: 350px;
    overflow-y: auto;
    padding: 0.5rem;
}

.palette-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.palette-item.focused {
    background: var(--primary);
    color: #fff;
}
"""
    content += palette_css

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated style.css successfully")
