// ===============================================================
// TOP ENGINE MENU BAR (BLENDER / UNITY STYLE SLIM BAR)
// ===============================================================
// Bilah menu profesional di atas layar game (Height: 34px):
// 1. File Dropdown: Open Hub, Save Game, Export Game
// 2. Add Object Dropdown: Platform, NPC, Hazard, Parallax
// 3. Tombol Cepat: [📜 Scripting], [🎛️ Inspect], [+/create]
// 4. Status Badge Engine & Mode Sandbox
// ===============================================================

import { ScriptingWorkspace } from './ScriptingWorkspace.js';
import { CodeInspector } from '../utils/CodeInspector.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { AudioManager } from '../utils/AudioManager.js';

export class EngineMenuBar {
    static instance = null;

    constructor(scene = null) {
        if (EngineMenuBar.instance) {
            if (scene) EngineMenuBar.instance.scene = scene;
            return EngineMenuBar.instance;
        }
        EngineMenuBar.instance = this;
        this.scene = scene;
        this.scriptingWorkspace = new ScriptingWorkspace();
        this.isCollapsed = false;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-engine-menubar');
        if (oldEl) oldEl.remove();

        this.bar = document.createElement('div');
        this.bar.id = 'gt-engine-menubar';
        this.bar.className = 'gt-mb-bar';

        this.bar.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap');

                .gt-mb-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 34px;
                    background: #181818;
                    border-bottom: 1px solid #2e2e2e;
                    z-index: 99995;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
                    transition: transform 0.2s ease;
                }

                .gt-mb-bar.collapsed {
                    transform: translateY(-34px);
                }

                .gt-mb-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-mb-logo {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    font-weight: 800;
                    color: #ffffff;
                    padding: 3px 8px;
                    background: #242424;
                    border-radius: 4px;
                    border: 1px solid #383838;
                    margin-right: 6px;
                }

                .gt-mb-logo-icon {
                    color: #38bdf8;
                    font-size: 13px;
                }

                /* Dropdown Menus */
                .gt-mb-dropdown {
                    position: relative;
                }

                .gt-mb-btn-menu {
                    background: transparent;
                    border: none;
                    color: #d4d4d4;
                    font-size: 12px;
                    font-weight: 500;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.12s ease;
                }

                .gt-mb-btn-menu:hover, .gt-mb-btn-menu.open {
                    background: #2b2b2b;
                    color: #ffffff;
                }

                .gt-mb-menu-dropdown-content {
                    position: absolute;
                    top: 28px;
                    left: 0;
                    background: #202020;
                    border: 1px solid #383838;
                    border-radius: 6px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7);
                    min-width: 190px;
                    padding: 4px 0;
                    display: none;
                    flex-direction: column;
                    z-index: 100000;
                }

                .gt-mb-menu-dropdown-content.show {
                    display: flex;
                }

                .gt-mb-menu-item {
                    padding: 7px 14px;
                    font-size: 12px;
                    color: #d1d5db;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.12s ease;
                }

                .gt-mb-menu-item:hover {
                    background: #0284c7;
                    color: #ffffff;
                }

                .gt-mb-divider {
                    height: 1px;
                    background: #333333;
                    margin: 4px 0;
                }

                /* Quick Tool Action Buttons */
                .gt-mb-tool-btn {
                    padding: 3px 10px;
                    border-radius: 4px;
                    border: 1px solid transparent;
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.12s ease;
                }

                .gt-mb-btn-scripting {
                    background: rgba(56, 189, 248, 0.15);
                    border-color: rgba(56, 189, 248, 0.35);
                    color: #7dd3fc;
                }

                .gt-mb-btn-scripting:hover {
                    background: #0284c7;
                    color: #ffffff;
                }

                .gt-mb-btn-inspect {
                    background: rgba(245, 158, 11, 0.15);
                    border-color: rgba(245, 158, 11, 0.35);
                    color: #fde047;
                }

                .gt-mb-btn-inspect:hover {
                    background: #d97706;
                    color: #ffffff;
                }

                .gt-mb-btn-create {
                    background: rgba(16, 185, 129, 0.15);
                    border-color: rgba(16, 185, 129, 0.35);
                    color: #6ee7b7;
                }

                .gt-mb-btn-create:hover {
                    background: #059669;
                    color: #ffffff;
                }

                /* Right Status & Controls */
                .gt-mb-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-mb-badge-status {
                    font-size: 10.5px;
                    font-weight: 600;
                    padding: 2px 8px;
                    background: #242424;
                    color: #34d399;
                    border-radius: 4px;
                    border: 1px solid #333333;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .gt-mb-btn-toggle-bar {
                    width: 24px;
                    height: 24px;
                    background: transparent;
                    border: 1px solid #333333;
                    border-radius: 4px;
                    color: #888888;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                }

                .gt-mb-btn-toggle-bar:hover {
                    background: #333333;
                    color: #ffffff;
                }

                /* Mini Floating pull-down tab when collapsed */
                .gt-mb-pull-tab {
                    position: fixed;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #181818;
                    border: 1px solid #333333;
                    border-top: none;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                    padding: 2px 14px;
                    font-size: 10px;
                    color: #38bdf8;
                    font-weight: bold;
                    cursor: pointer;
                    z-index: 99996;
                    display: none;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                }

                .gt-mb-pull-tab.show {
                    display: block;
                }
            </style>

            <div class="gt-mb-left">
                <div class="gt-mb-logo">
                    <span class="gt-mb-logo-icon">▲</span>
                    <span>EDU ENGINE</span>
                </div>

                <!-- Dropdown 1: File -->
                <div class="gt-mb-dropdown">
                    <button class="gt-mb-btn-menu" id="gt-mb-btn-file">
                        File <span style="font-size: 9px;">▾</span>
                    </button>
                    <div class="gt-mb-menu-dropdown-content" id="gt-mb-dd-file">
                        <div class="gt-mb-menu-item" id="mi-hub">📁 Buka Project Hub</div>
                        <div class="gt-mb-menu-item" id="mi-save">💾 Simpan Progres (AutoSave)</div>
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" id="mi-export">📦 Ekspor Game (.ZIP)</div>
                    </div>
                </div>

                <!-- Dropdown 2: Add Object -->
                <div class="gt-mb-dropdown">
                    <button class="gt-mb-btn-menu" id="gt-mb-btn-add">
                        Add Object <span style="font-size: 9px;">▾</span>
                    </button>
                    <div class="gt-mb-menu-dropdown-content" id="gt-mb-dd-add">
                        <div class="gt-mb-menu-item" data-create="tile">🧱 Platform / Lantai</div>
                        <div class="gt-mb-menu-item" data-create="npc">🧙 Karakter NPC</div>
                        <div class="gt-mb-menu-item" data-create="dialogue">💬 Dialog Percakapan</div>
                        <div class="gt-mb-menu-item" data-create="quest">📋 Misi & Quest</div>
                        <div class="gt-mb-menu-item" data-create="obstacle">⚠️ Duri & Rintangan</div>
                        <div class="gt-mb-menu-item" data-create="parallax">🌄 Parallax Background</div>
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" data-create="portal">🌀 Portal Hub Aman</div>
                    </div>
                </div>

                <!-- Quick Button: Scripting (Blender Style) -->
                <button class="gt-mb-tool-btn gt-mb-btn-scripting" id="gt-mb-btn-scripting" title="Buka Editor Koding di Browser">
                    <span>📜</span> Scripting
                </button>

                <!-- Quick Button: Inspect -->
                <button class="gt-mb-tool-btn gt-mb-btn-inspect" id="gt-mb-btn-inspect" title="Buka Live Parameter Sliders">
                    <span>🎛️</span> Inspect
                </button>

                <!-- Quick Button: /create chips -->
                <button class="gt-mb-tool-btn gt-mb-btn-create" id="gt-mb-btn-create" title="Buka Builder Template di Console">
                    <span>+</span> /create
                </button>
            </div>

            <div class="gt-mb-right">
                <div class="gt-mb-badge-status">
                    <span>●</span> Mode: Sandbox (Scene 3)
                </div>
                <button class="gt-mb-btn-toggle-bar" id="gt-mb-btn-toggle" title="Sembunyikan Menu Bar">▲</button>
            </div>
        `;

        document.body.appendChild(this.bar);

        // Pull tab when collapsed
        this.pullTab = document.createElement('div');
        this.pullTab.className = 'gt-mb-pull-tab';
        this.pullTab.innerHTML = '▲ EDU ENGINE MENU';
        document.body.appendChild(this.pullTab);

        this.bindEvents();
    }

    bindEvents() {
        const fileBtn = this.bar.querySelector('#gt-mb-btn-file');
        const fileDd = this.bar.querySelector('#gt-mb-dd-file');
        const addBtn = this.bar.querySelector('#gt-mb-btn-add');
        const addDd = this.bar.querySelector('#gt-mb-dd-add');

        // Toggle Dropdowns
        fileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addDd.classList.remove('show');
            fileDd.classList.toggle('show');
        });

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileDd.classList.remove('show');
            addDd.classList.toggle('show');
        });

        // Close dropdowns on outside click
        window.addEventListener('click', () => {
            fileDd.classList.remove('show');
            addDd.classList.remove('show');
        });

        // Dropdown actions: File
        this.bar.querySelector('#mi-hub').addEventListener('click', () => {
            if (this.scene && this.scene.scene) {
                AudioManager.playClick();
                this.scene.scene.start('TitleScene');
            }
        });

        this.bar.querySelector('#mi-save').addEventListener('click', () => {
            AudioManager.playSuccess();
            if (this.scene && this.scene.showFloatingToast) {
                this.scene.showFloatingToast('Progres Sandbox Disimpan!', 0x22c55e);
            }
        });

        this.bar.querySelector('#mi-export').addEventListener('click', () => {
            AudioManager.playSuccess();
            alert('📦 FITUR EKSPOR GAME:\nGame kamu siap dikemas! Jalankan perintah "npm run build" untuk menghasilkan bundel siap main di folder dist/.');
        });

        // Dropdown actions: Add Object
        this.bar.querySelectorAll('#gt-mb-dd-add .gt-mb-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-create');
                CommandConsole.show();
                if (CommandConsole.instance) {
                    CommandConsole.instance.runCommand(`/create ${target}`);
                }
            });
        });

        // Quick Buttons
        this.bar.querySelector('#gt-mb-btn-scripting').addEventListener('click', () => {
            this.scriptingWorkspace.toggle(this.scene);
        });

        this.bar.querySelector('#gt-mb-btn-inspect').addEventListener('click', () => {
            CodeInspector.toggleLive();
        });

        this.bar.querySelector('#gt-mb-btn-create').addEventListener('click', () => {
            CommandConsole.show();
            if (CommandConsole.instance) {
                CommandConsole.instance.runCommand('/create');
            }
        });

        // Collapse / Expand Menu Bar
        const toggleBtn = this.bar.querySelector('#gt-mb-btn-toggle');
        toggleBtn.addEventListener('click', () => {
            this.bar.classList.add('collapsed');
            this.pullTab.classList.add('show');
        });

        this.pullTab.addEventListener('click', () => {
            this.bar.classList.remove('collapsed');
            this.pullTab.classList.remove('show');
        });
    }

    show(scene = null) {
        if (scene) this.scene = scene;
        this.bar.style.display = 'flex';
    }

    hide() {
        this.bar.style.display = 'none';
        this.pullTab.classList.remove('show');
        if (this.scriptingWorkspace) {
            this.scriptingWorkspace.hide();
        }
    }
}
