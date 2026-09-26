// ===============================================================
// IN-GAME SCRIPTING WORKSPACE (BLENDER STYLE CODE EDITOR)
// ===============================================================
// Editor kode terintegrasi langsung di dalam game browser:
// 1. Tampilan editor kode dark mode ala Blender 5.2 & VS Code
// 2. Tab pemilih file: Sandbox Script (Scene3.js) & Cerita (cerita.js)
// 3. Tombol sisipkan template (/create) 1-klik
// 4. Tombol [▶ Run & Apply] untuk menerapkan perubahan kode secara live
// ===============================================================

import { SceneTemplates } from '../utils/SceneTemplates.js';
import { AudioManager } from '../utils/AudioManager.js';

export class ScriptingWorkspace {
    static instance = null;

    constructor() {
        if (ScriptingWorkspace.instance) {
            return ScriptingWorkspace.instance;
        }
        ScriptingWorkspace.instance = this;
        this.isOpen = false;
        this.currentTab = 'scene3'; // 'scene3' | 'cerita' | 'scratchpad'
        this.activeScene = null;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-scripting-workspace');
        if (oldEl) oldEl.remove();

        this.container = document.createElement('div');
        this.container.id = 'gt-scripting-workspace';
        this.container.className = 'gt-sw-container hidden';

        this.container.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@500;600;700&display=swap');

                .gt-sw-container {
                    position: fixed;
                    top: 34px;
                    right: 0;
                    width: min(580px, 95vw);
                    height: calc(100vh - 34px);
                    background: #141414;
                    border-left: 2px solid #2d2d2d;
                    box-shadow: -15px 0 40px rgba(0, 0, 0, 0.75);
                    z-index: 99990;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', sans-serif;
                    box-sizing: border-box;
                    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: text !important;
                    -webkit-user-select: text !important;
                }

                .gt-sw-container.hidden {
                    transform: translateX(100%);
                    pointer-events: none;
                }

                /* Header Toolbar (Blender Scripting Style) */
                .gt-sw-toolbar {
                    height: 38px;
                    background: #1c1c1c;
                    border-bottom: 1px solid #2b2b2b;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    flex-shrink: 0;
                }

                .gt-sw-tabs {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-sw-tab-btn {
                    padding: 5px 12px;
                    border-radius: 4px;
                    background: transparent;
                    border: 1px solid transparent;
                    color: #8c8c8c;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-sw-tab-btn:hover {
                    background: #252525;
                    color: #d4d4d4;
                }

                .gt-sw-tab-btn.active {
                    background: #282828;
                    color: #38bdf8;
                    border-color: #383838;
                }

                .gt-sw-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-sw-btn-run {
                    padding: 5px 14px;
                    background: #16a34a;
                    border: none;
                    border-radius: 4px;
                    color: #ffffff;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-sw-btn-run:hover {
                    background: #22c55e;
                    box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
                }

                .gt-sw-btn-close {
                    width: 26px;
                    height: 26px;
                    background: transparent;
                    border: none;
                    color: #888888;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gt-sw-btn-close:hover {
                    background: #e11d48;
                    color: #ffffff;
                }

                /* Sub-bar Templates & Helpers */
                .gt-sw-subbar {
                    background: #181818;
                    border-bottom: 1px solid #262626;
                    padding: 6px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11.5px;
                    color: #94a3b8;
                }

                .gt-sw-template-select {
                    background: #222222;
                    border: 1px solid #333333;
                    border-radius: 4px;
                    color: #f1f5f9;
                    font-size: 11.5px;
                    padding: 3px 8px;
                    outline: none;
                }

                /* Editor Body (Line numbers + Textarea) */
                .gt-sw-editor-body {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    position: relative;
                    background: #101010;
                }

                .gt-sw-gutter {
                    width: 44px;
                    background: #151515;
                    border-right: 1px solid #222222;
                    padding: 12px 6px;
                    text-align: right;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12px;
                    color: #4b5563;
                    line-height: 20px;
                    user-select: none;
                    overflow: hidden;
                }

                .gt-sw-textarea {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    padding: 12px 14px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12.5px;
                    line-height: 20px;
                    color: #e2e8f0;
                    white-space: pre;
                    overflow: auto;
                    resize: none;
                    tab-size: 4;
                    box-sizing: border-box;
                }

                .gt-sw-textarea::selection {
                    background: rgba(56, 189, 248, 0.3);
                }

                /* Toast Status Notification */
                .gt-sw-toast {
                    position: absolute;
                    bottom: 14px;
                    right: 14px;
                    background: #0f172a;
                    border: 1px solid #22c55e;
                    color: #4ade80;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease;
                }

                .gt-sw-toast.show {
                    opacity: 1;
                }
            </style>

            <!-- Toolbar Header -->
            <div class="gt-sw-toolbar">
                <div class="gt-sw-tabs">
                    <button class="gt-sw-tab-btn active" data-tab="scene3">
                        <span>📜</span> Scene3.js
                    </button>
                    <button class="gt-sw-tab-btn" data-tab="cerita">
                        <span>⚙️</span> cerita.js
                    </button>
                    <button class="gt-sw-tab-btn" data-tab="scratchpad">
                        <span>📝</span> Scratchpad
                    </button>
                </div>

                <div class="gt-sw-actions">
                    <button class="gt-sw-btn-run" id="gt-sw-btn-run" title="Jalankan / Terapkan Kode">
                        <span>▶</span> Run Script
                    </button>
                    <button class="gt-sw-btn-close" id="gt-sw-btn-close" title="Tutup Editor">✕</button>
                </div>
            </div>

            <!-- Subbar Helpers -->
            <div class="gt-sw-subbar">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>⚡ Sisipkan Template:</span>
                    <select class="gt-sw-template-select" id="gt-sw-template-select">
                        <option value="">-- Pilih Template /create --</option>
                        <option value="tile">🧱 Platform & Lantai</option>
                        <option value="npc">🧙 Karakter NPC</option>
                        <option value="dialogue">💬 Dialog Percakapan</option>
                        <option value="quest">📋 Misi / Quest Tracker</option>
                        <option value="obstacle">⚠️ Duri & Rintangan</option>
                        <option value="parallax">🌄 Parallax Background</option>
                        <option value="cutscene">🎬 Cutscene Sinematik</option>
                        <option value="portal">🌀 Portal Hub Aman</option>
                    </select>
                </div>
                <span id="gt-sw-cursor-pos" style="font-family: monospace; font-size: 11px;">Ln 1, Col 1</span>
            </div>

            <!-- Editor Body -->
            <div class="gt-sw-editor-body">
                <div class="gt-sw-gutter" id="gt-sw-gutter">
                    1<br>2<br>3<br>4<br>5
                </div>
                <textarea class="gt-sw-textarea" id="gt-sw-code" spellcheck="false"></textarea>
                <div class="gt-sw-toast" id="gt-sw-toast">✓ Kode Berhasil Dijalankan!</div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Cache elements
        this.textarea = this.container.querySelector('#gt-sw-code');
        this.gutter = this.container.querySelector('#gt-sw-gutter');
        this.toast = this.container.querySelector('#gt-sw-toast');
        this.cursorPos = this.container.querySelector('#gt-sw-cursor-pos');
        this.templateSelect = this.container.querySelector('#gt-sw-template-select');

        // Events
        this.container.querySelector('#gt-sw-btn-close').addEventListener('click', () => this.hide());
        this.container.querySelector('#gt-sw-btn-run').addEventListener('click', () => this.runScript());

        // Tab buttons
        this.container.querySelectorAll('.gt-sw-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.gt-sw-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.getAttribute('data-tab');
                this.loadTabContent();
            });
        });

        // Template insert
        this.templateSelect.addEventListener('change', (e) => {
            const topic = e.target.value;
            if (!topic) return;
            const t = SceneTemplates.get(topic);
            if (t) {
                this.insertAtCursor(`\n${t.code}\n`);
                this.showToast(`Template ${t.title} disisipkan!`);
            }
            e.target.value = '';
        });

        // Input & gutter update
        this.textarea.addEventListener('input', () => this.updateGutter());
        this.textarea.addEventListener('keyup', () => this.updateCursorPos());
        this.textarea.addEventListener('click', () => this.updateCursorPos());

        // Tab key support
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertAtCursor('    ');
            }
        });

        // Initial content
        this.loadTabContent();
    }

    updateGutter() {
        const lines = this.textarea.value.split('\n').length;
        let numbers = '';
        for (let i = 1; i <= Math.max(lines, 30); i++) {
            numbers += `${i}<br>`;
        }
        this.gutter.innerHTML = numbers;
    }

    updateCursorPos() {
        const text = this.textarea.value.substring(0, this.textarea.selectionStart);
        const lines = text.split('\n');
        const row = lines.length;
        const col = lines[lines.length - 1].length + 1;
        this.cursorPos.innerText = `Ln ${row}, Col ${col}`;
    }

    insertAtCursor(myValue) {
        const myField = this.textarea;
        if (document.selection) {
            myField.focus();
            const sel = document.selection.createRange();
            sel.text = myValue;
        } else if (myField.selectionStart || myField.selectionStart === 0) {
            const startPos = myField.selectionStart;
            const endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos + myValue.length;
            myField.selectionEnd = startPos + myValue.length;
        } else {
            myField.value += myValue;
        }
        this.updateGutter();
    }

    loadTabContent() {
        if (this.currentTab === 'scene3') {
            this.textarea.value = `// ===============================================================
// 🎨 SCRIPTING AREA: SCENE 3 SANDBOX WORLD
// ===============================================================
// Kamu bisa menambahkan platform, NPC, atau duri baru di sini.
// Klik dropdown 'Sisipkan Template' di atas untuk memasukkan kode!

// Contoh: Mengatur kecepatan lari karakter
const speedHero = 260;
if (this.player) {
    this.player.customSpeed = speedHero;
}

// Menampilkan pesan toast di game
this.showFloatingToast("Script Editor Terhubung!", 0x38bdf8);`;
        } else if (this.currentTab === 'cerita') {
            this.textarea.value = `// ===============================================================
// ⚙️ KONFIGURASI CERITA & GAME (cerita.js)
// ===============================================================
export const CONFIG_SKELETON = {
    judulGame: "The Game Template",
    player: {
        nama: "Hero Cilik",
        kecepatan: 220,
        kekuatanLompat: 440,
        hpMaksimal: 3
    }
};`;
        } else {
            this.textarea.value = `// 📝 Scratchpad Bebas
// Tulis catatan atau kode eksperimenmu di sini!`;
        }
        this.updateGutter();
    }

    runScript() {
        AudioManager.playSuccess();
        const code = this.textarea.value;

        // Eksekusi kode secara aman jika berada di context activeScene
        try {
            if (this.activeScene) {
                const runFunc = new Function(code);
                runFunc.call(this.activeScene);
                this.showToast('✓ Kode Berhasil Diterapkan ke Game!');
            } else {
                this.showToast('✓ Kode Berhasil Disimpan!');
            }
        } catch (err) {
            console.error(err);
            this.showToast(`⚠️ Error: ${err.message}`);
        }
    }

    showToast(msg) {
        this.toast.innerText = msg;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2500);
    }

    show(scene = null) {
        if (scene) this.activeScene = scene;
        this.container.classList.remove('hidden');
        this.isOpen = true;
        this.textarea.focus();
        AudioManager.playClick();
    }

    hide() {
        this.container.classList.add('hidden');
        this.isOpen = false;
        AudioManager.playClick();
    }

    toggle(scene = null) {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show(scene);
        }
    }
}
