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
import { ExportGameModal } from './ExportGameModal.js';
import { NPCDialogEditorModal } from './NPCDialogEditorModal.js';
import { CodeInspector } from '../utils/CodeInspector.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { AudioManager } from '../utils/AudioManager.js';
import { GridSystem } from '../utils/GridSystem.js';

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
        this.isCollapsed = true;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-engine-menubar');
        if (oldEl) oldEl.remove();

        this.bar = document.createElement('div');
        this.bar.id = 'gt-engine-menubar';
        this.bar.className = 'gt-mb-bar collapsed';

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

                /* Grid System Button (Tiled / Growtopia / Unity Style) */
                .gt-mb-btn-grid {
                    background: rgba(168, 85, 247, 0.15);
                    border-color: rgba(168, 85, 247, 0.35);
                    color: #c084fc;
                }

                .gt-mb-btn-grid:hover {
                    background: #9333ea;
                    color: #ffffff;
                }

                .gt-mb-btn-grid.active {
                    background: #a855f7 !important;
                    color: #ffffff !important;
                    font-weight: 800 !important;
                    border-color: #c084fc !important;
                    box-shadow: 0 0 14px rgba(168, 85, 247, 0.6) !important;
                }

                /* Wrench Edit Button (Growtopia Style) */
                .gt-mb-btn-edit {
                    background: rgba(245, 158, 11, 0.15);
                    border-color: rgba(245, 158, 11, 0.35);
                    color: #fbbf24;
                }

                .gt-mb-btn-edit:hover {
                    background: #d97706;
                    color: #ffffff;
                }

                .gt-mb-btn-edit.active {
                    background: #f59e0b !important;
                    color: #0f172a !important;
                    font-weight: 800 !important;
                    border-color: #fbbf24 !important;
                    box-shadow: 0 0 14px rgba(245, 158, 11, 0.6) !important;
                }

                /* Right Status & Controls */
                .gt-mb-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
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
                    padding: 4px 18px;
                    font-size: 11.5px;
                    color: #38bdf8;
                    font-weight: 800;
                    letter-spacing: 0.3px;
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
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" id="mi-tour">🎓 Mulai Tur Fitur Engine</div>
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
                        <div class="gt-mb-menu-item" data-create="coin">🪙 Koin Harta Karun</div>
                        <div class="gt-mb-menu-item" data-create="obstacle">⚠️ Duri & Rintangan</div>
                        <div class="gt-mb-menu-item" data-create="portal">🌀 Portal Hub Aman</div>
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" data-create="dialogue">💬 Dialog Percakapan</div>
                        <div class="gt-mb-menu-item" data-create="quest">📋 Misi & Quest</div>
                        <div class="gt-mb-menu-item" data-create="parallax">🌄 Parallax Background</div>
                    </div>
                </div>

                <!-- Quick Button: Edit / Wrench (Growtopia Style) -->
                <button class="gt-mb-tool-btn gt-mb-btn-edit" id="gt-mb-btn-edit" title="Mode Edit Wrench: Klik NPC untuk mengedit percakapan &amp; nama">
                    <span>🔧</span> Edit
                </button>

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

                <!-- Quick Button: Grid System (Unity/Godot/Tiled Style) -->
                <button class="gt-mb-tool-btn gt-mb-btn-grid" id="gt-mb-btn-grid" title="Toggle Grid System & Snap Koordinat (Shortcut: G)">
                    <span>▦</span> Grid
                </button>
            </div>

            <div class="gt-mb-right">
                <button class="gt-mb-btn-toggle-bar" id="gt-mb-btn-toggle" title="Sembunyikan Menu Bar">▲</button>
            </div>
        `;

        document.body.appendChild(this.bar);

        // Pull tab when collapsed
        this.pullTab = document.createElement('div');
        this.pullTab.className = 'gt-mb-pull-tab show';
        this.pullTab.innerHTML = '<span>🛠️</span> <span>ENGINE</span> <span style="font-size: 8px;">▼</span>';
        this.pullTab.title = 'Buka Engine Menu Bar (File, Add Object, Edit, Scripting)';
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
            new ExportGameModal(this.scene).show(this.scene);
        });

        const miTour = this.bar.querySelector('#mi-tour');
        if (miTour) {
            miTour.addEventListener('click', () => {
                fileDd.classList.remove('show');
                if (typeof this.scene.startEngineUITour === 'function') {
                    this.scene.startEngineUITour();
                }
            });
        }

        // Dropdown actions: Add Object
        this.bar.querySelectorAll('#gt-mb-dd-add .gt-mb-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-create');
                addDd.classList.remove('show');

                // 1. Dialog Percakapan -> Langsung buka GUI Editor Dialog NPC (Wrench)
                if (target === 'dialogue') {
                    this.openNPCDialogEditor();
                    return;
                }

                // 2. Misi & Quest -> Langsung buka HTML Active Quest Modal
                if (target === 'quest') {
                    if (this.scene && typeof this.scene.toggleQuestModal === 'function') {
                        this.scene.toggleQuestModal(true);
                    } else if (this.scene && this.scene.questModal) {
                        this.scene.questModal.show();
                    }
                    return;
                }

                // 3. Parallax Background -> Ganti tema background live
                if (target === 'parallax') {
                    if (this.scene && typeof this.scene.cycleParallaxBackground === 'function') {
                        this.scene.cycleParallaxBackground();
                    } else if (this.scene && this.scene.showFloatingToast) {
                        this.scene.showFloatingToast('🌄 Parallax Background aktif pada scene ini!', 0x38bdf8);
                    }
                    return;
                }

                // Jika tipe visual didukung spawner langsung di kanvas:
                if (['tile', 'npc', 'coin', 'obstacle', 'portal'].includes(target) && this.scene && typeof this.scene.enterPlacementMode === 'function') {
                    this.scene.enterPlacementMode(target);
                } else {
                    CommandConsole.show();
                    if (CommandConsole.instance) {
                        CommandConsole.instance.runCommand(`/create ${target}`);
                    }
                }
            });
        });

        // Quick Button: Edit / Wrench
        const editBtn = this.bar.querySelector('#gt-mb-btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

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

        // Quick Button: Grid System
        const gridBtn = this.bar.querySelector('#gt-mb-btn-grid');
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                GridSystem.toggle(this.scene);
            });
        }

        // Collapse / Expand Menu Bar
        const toggleBtn = this.bar.querySelector('#gt-mb-btn-toggle');
        toggleBtn.addEventListener('click', () => {
            this.collapse();
        });

        this.pullTab.addEventListener('click', () => {
            this.expand();
        });
    }

    collapse() {
        this.isCollapsed = true;
        this.bar.classList.add('collapsed');
        this.pullTab.classList.add('show');
        if (this.scene && this.scene.htmlHUD) {
            this.scene.htmlHUD.adjustForMenuBar(false);
        }
    }

    expand() {
        this.isCollapsed = false;
        this.bar.classList.remove('collapsed');
        this.pullTab.classList.remove('show');
        if (this.scene && this.scene.htmlHUD) {
            this.scene.htmlHUD.adjustForMenuBar(true);
        }
    }

    toggleEditMode(forceState) {
        this.isEditMode = (forceState !== undefined) ? forceState : !this.isEditMode;
        const editBtn = this.bar.querySelector('#gt-mb-btn-edit');
        if (editBtn) {
            editBtn.classList.toggle('active', this.isEditMode);
        }

        if (this.scene) {
            this.scene.isEditMode = this.isEditMode;
            if (typeof this.scene.setEditMode === 'function') {
                this.scene.setEditMode(this.isEditMode);
            } else if (this.scene.showFloatingToast) {
                this.scene.showFloatingToast(this.isEditMode ? '🔧 Mode Edit (Wrench) AKTIF! Dekati atau klik NPC untuk edit dialog.' : 'Mode Edit NONAKTIF.', this.isEditMode ? 0xf59e0b : 0x64748b);
            }
        }
    }

    openNPCDialogEditor(npcRef = null) {
        if (!this.npcDialogEditor) {
            this.npcDialogEditor = new NPCDialogEditorModal(this.scene);
        }
        this.npcDialogEditor.scene = this.scene;
        this.npcDialogEditor.open(npcRef || (this.scene && this.scene.npcData));
    }

    show(scene = null) {
        if (scene) {
            this.scene = scene;
            if (this.npcDialogEditor) this.npcDialogEditor.scene = scene;
        }
        if (this.scene) {
            GridSystem.init(this.scene);
        }
        this.bar.style.display = 'flex';
        if (this.isCollapsed) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    hide() {
        this.bar.style.display = 'none';
        this.pullTab.classList.remove('show');
        if (this.scriptingWorkspace) {
            this.scriptingWorkspace.hide();
        }
        if (this.npcDialogEditor) {
            this.npcDialogEditor.close();
        }
        GridSystem.deactivate();
    }
}
