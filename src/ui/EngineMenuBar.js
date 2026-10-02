// ===============================================================
// TOP ENGINE MENU BAR (BLENDER / UNITY STYLE SLIM BAR)
// ===============================================================
// Bilah menu profesional di atas layar game (Height: 34px):
// 1. File Dropdown: Open Hub, Save Game, Export Game
// 2. Add Object Dropdown: Platform, NPC, Hazard, Parallax
// 3. Tombol Cepat: [🎛️ Inspect], [Preview]
// 4. Status Badge Engine & Mode Sandbox
// ===============================================================

import { ExportGameModal } from './ExportGameModal.js';
import { NPCDialogEditorModal } from './NPCDialogEditorModal.js';
import { CodeInspector } from '../utils/CodeInspector.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { AudioManager } from '../utils/AudioManager.js';
import { GridSystem } from '../utils/GridSystem.js';
import { UndoRedoManager } from '../utils/UndoRedoManager.js';

export class EngineMenuBar {
    static instance = null;

    constructor(scene = null) {
        if (EngineMenuBar.instance) {
            if (scene) EngineMenuBar.instance.scene = scene;
            return EngineMenuBar.instance;
        }
        EngineMenuBar.instance = this;
        this.scene = scene;
        this.isCollapsed = true;
        this.isEditMode = false;
        this.currentTool = 'none'; // 'none' | 'punch' | 'wrench'
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

                .gt-mb-v-divider {
                    width: 1px;
                    height: 16px;
                    background: rgba(255, 255, 255, 0.12);
                    margin: 0 3px;
                }

                .gt-mb-kbd {
                    font-size: 9px;
                    line-height: 1;
                    padding: 1.5px 3.5px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.55);
                    font-family: inherit;
                    font-weight: 700;
                    margin-left: 2px;
                }

                /* Quick Tool Action Buttons: Minimalist, Cohesive & Sleek Dark */
                .gt-mb-tool-btn {
                    padding: 3px 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(255, 255, 255, 0.04);
                    color: #d1d5db;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    line-height: 1.2;
                    transition: all 0.14s ease;
                    user-select: none;
                    box-sizing: border-box;
                    height: 25px;
                }

                .gt-mb-tool-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.18);
                    color: #ffffff;
                }

                .gt-mb-tool-btn:active {
                    transform: translateY(1px);
                }

                /* Individual Subtle Accents for Active States */
                .gt-mb-btn-grid.active {
                    background: rgba(168, 85, 247, 0.18) !important;
                    color: #e9d5ff !important;
                    border-color: rgba(168, 85, 247, 0.5) !important;
                    box-shadow: 0 0 8px rgba(168, 85, 247, 0.25) !important;
                }
                .gt-mb-btn-grid.active .gt-mb-kbd {
                    background: rgba(168, 85, 247, 0.35);
                    color: #ffffff;
                }

                .gt-mb-btn-dig.active-dig {
                    background: rgba(239, 68, 68, 0.18) !important;
                    color: #fca5a5 !important;
                    border-color: rgba(239, 68, 68, 0.5) !important;
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.25) !important;
                }
                .gt-mb-btn-dig.active-dig .gt-mb-kbd {
                    background: rgba(239, 68, 68, 0.35);
                    color: #ffffff;
                }

                .gt-mb-btn-build.active-build {
                    background: rgba(34, 197, 94, 0.18) !important;
                    color: #86efac !important;
                    border-color: rgba(34, 197, 94, 0.5) !important;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.25) !important;
                }
                .gt-mb-btn-build.active-build .gt-mb-kbd {
                    background: rgba(34, 197, 94, 0.35);
                    color: #ffffff;
                }

                .gt-mb-btn-edit.active,
                .gt-mb-btn-edit.active-wrench {
                    background: rgba(245, 158, 11, 0.18) !important;
                    color: #fde047 !important;
                    border-color: rgba(245, 158, 11, 0.5) !important;
                    box-shadow: 0 0 8px rgba(245, 158, 11, 0.25) !important;
                }

                .gt-mb-btn-edit.active-punch {
                    background: rgba(239, 68, 68, 0.18) !important;
                    color: #fca5a5 !important;
                    border-color: rgba(239, 68, 68, 0.5) !important;
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.25) !important;
                }

                .gt-mb-btn-edit.active-build {
                    background: rgba(34, 197, 94, 0.18) !important;
                    color: #86efac !important;
                    border-color: rgba(34, 197, 94, 0.5) !important;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.25) !important;
                }

                /* Blender Style Slim Vertical Toolbar Melebar ke Bawah Agak Transparan di Bawah HP Bar */
                .gt-mb-edit-floating-panel {
                    position: fixed;
                    top: 70px;
                    left: 20px;
                    width: 38px;
                    background: rgba(24, 24, 27, 0.85);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    border-radius: 6px;
                    padding: 3px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
                    display: none;
                    flex-direction: column;
                    gap: 3px;
                    z-index: 99990;
                    box-sizing: border-box;
                    transition: top 0.2s cubic-bezier(0.16, 1, 0.3, 1), left 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.14s ease;
                    animation: gtFadeSlideDown 0.14s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-mb-edit-floating-panel.show {
                    display: flex;
                }

                @keyframes gtFadeSlideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Blender Tool Square Button (Persis Kotak-Kotak Kecil di Screenshot) */
                .gt-blender-tool-btn {
                    position: relative;
                    width: 32px;
                    height: 32px;
                    border-radius: 4px;
                    background: transparent;
                    border: 1px solid transparent;
                    color: #d4d4d8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.12s ease;
                    user-select: none;
                    padding: 0;
                    box-sizing: border-box;
                }

                .gt-blender-tool-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.22);
                    color: #ffffff;
                }

                /* Aksen Segitiga Mungil di Sudut Bawah-Kanan Khas Blender */
                .gt-blender-tool-btn::after {
                    content: '';
                    position: absolute;
                    right: 2px;
                    bottom: 2px;
                    width: 0;
                    height: 0;
                    border-style: solid;
                    border-width: 0 0 4px 4px;
                    border-color: transparent transparent rgba(255, 255, 255, 0.45) transparent;
                }

                /* Keadaan Aktif Punch (Growtopia Red / Blender Style) */
                .gt-blender-tool-btn.active-punch,
                .gt-blender-tool-btn.active.punch-tool {
                    background: #dc2626 !important;
                    border-color: #f87171 !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.6) !important;
                }

                .gt-blender-tool-btn.active-punch::after {
                    border-color: transparent transparent #ffffff transparent;
                }

                /* Keadaan Aktif Build (Modular Green / Blender Style) */
                .gt-blender-tool-btn.active-build,
                .gt-blender-tool-btn.active.build-tool {
                    background: #16a34a !important;
                    border-color: #4ade80 !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 10px rgba(34, 197, 94, 0.6) !important;
                }

                .gt-blender-tool-btn.active-build::after {
                    border-color: transparent transparent #ffffff transparent;
                }

                /* Keadaan Aktif Wrench (Growtopia Gold / Blender Style) */
                .gt-blender-tool-btn.active-wrench,
                .gt-blender-tool-btn.active.wrench-tool {
                    background: #d97706 !important;
                    border-color: #fbbf24 !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.6) !important;
                }

                .gt-blender-tool-btn.active-wrench::after {
                    border-color: transparent transparent #ffffff transparent;
                }

                /* Blender Divider & Non-tool Action Button Variants */
                .gt-blender-divider {
                    width: 22px;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.16);
                    margin: 3px auto;
                }

                .gt-blender-tool-btn.no-arrow::after {
                    display: none !important;
                }

                .gt-blender-tool-btn.disabled {
                    opacity: 0.32;
                    cursor: not-allowed;
                    filter: grayscale(0.85);
                }

                .gt-blender-tool-btn.disabled:hover {
                    background: transparent;
                    border-color: transparent;
                }

                /* Floating Tooltip ke Kanan saat Mouse Hover */
                .gt-blender-tooltip {
                    position: absolute;
                    left: 40px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: #18181b;
                    border: 1px solid #3f3f46;
                    color: #f4f4f5;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.12s ease, transform 0.12s ease;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
                    z-index: 100005;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-blender-tooltip-badge {
                    font-size: 9.5px;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.15);
                    color: #e4e4e7;
                }

                .gt-blender-tool-btn:hover .gt-blender-tooltip {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(-50%) translateX(2px);
                }

                /* Build Picker Sub-Panel (muncul ke kanan dari tombol Build) */
                .gt-build-picker {
                    position: absolute;
                    left: 42px;
                    top: 0;
                    background: rgba(24, 24, 27, 0.92);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-radius: 6px;
                    padding: 4px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65);
                    display: none;
                    flex-direction: column;
                    gap: 2px;
                    z-index: 100006;
                    min-width: 140px;
                    animation: gtFadeSlideDown 0.12s ease;
                }

                .gt-build-picker.show {
                    display: flex;
                }

                .gt-build-picker-title {
                    font-size: 9px;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    padding: 3px 8px 2px;
                    pointer-events: none;
                }

                .gt-build-picker-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 5px 8px;
                    border-radius: 4px;
                    border: none;
                    background: transparent;
                    color: #d1d5db;
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.1s ease;
                    white-space: nowrap;
                    text-align: left;
                    width: 100%;
                    box-sizing: border-box;
                }

                .gt-build-picker-item:hover {
                    background: rgba(34, 197, 94, 0.18);
                    color: #86efac;
                }

                .gt-build-picker-item:active {
                    transform: scale(0.97);
                }

                .gt-build-picker-divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.08);
                    margin: 2px 4px;
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
                    padding: 3px 14px;
                    font-size: 10px;
                    line-height: 1;
                    color: #38bdf8;
                    cursor: pointer;
                    z-index: 99996;
                    display: none;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                    transition: all 0.15s ease;
                }

                .gt-mb-pull-tab:hover {
                    background: #242424;
                    color: #60a5fa;
                    border-color: #444444;
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
                        <div class="gt-mb-menu-item" id="mi-new-world" style="color: #38bdf8; font-weight: 700;">🎬 + Buat Scene Baru (Studio)</div>
                        <div class="gt-mb-menu-item" id="mi-hub">📁 Buka Project Hub</div>
                        <div class="gt-mb-menu-item" id="mi-save">💾 Simpan Progres (AutoSave)</div>
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" id="mi-export">📦 Ekspor Game (.ZIP)</div>
                        <div class="gt-mb-divider"></div>
                        <div class="gt-mb-menu-item" id="mi-tour">🎓 Mulai Tur Fitur Engine</div>
                    </div>
                </div>

                <div class="gt-mb-v-divider"></div>

                <!-- Quick Button: Edit (Growtopia Tools: Palu & Wrench) -->
                <button class="gt-mb-tool-btn gt-mb-btn-edit" id="gt-mb-btn-edit" title="Buka Toolbar Tools di Bawah HP (Palu &amp; Wrench)">
                    <span id="gt-mb-edit-label">Edit</span>
                </button>

                <!-- Quick Button: Inspect -->
                <button class="gt-mb-tool-btn gt-mb-btn-inspect" id="gt-mb-btn-inspect" title="Buka Live Parameter Sliders">
                    <span>Inspect</span>
                </button>

                <!-- Quick Button: Preview / Scene Builder -->
                <button class="gt-mb-tool-btn gt-mb-btn-create" id="gt-mb-btn-create" title="Buka Preview World &amp; Scene Builder">
                    <span>Preview</span>
                </button>

                <div class="gt-mb-v-divider"></div>

                <!-- Quick Button: Grid System (Unity/Godot/Tiled Style) -->
                <button class="gt-mb-tool-btn gt-mb-btn-grid" id="gt-mb-btn-grid" title="Toggle Grid System 50px (Shortcut: G)">
                    <span>Grid</span>
                    <span class="gt-mb-kbd">G</span>
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
        this.pullTab.innerHTML = '▼';
        this.pullTab.title = 'Buka Engine Menu Bar (File, Add Object, Edit, Inspect, Preview)';
        document.body.appendChild(this.pullTab);

        // Floating Toolbar Blender melebar ke bawah tepat di bawah HP bar
        const oldPanel = document.getElementById('gt-mb-dd-edit');
        if (oldPanel) oldPanel.remove();

        this.editFloatingPanel = document.createElement('div');
        this.editFloatingPanel.className = 'gt-mb-edit-floating-panel';
        this.editFloatingPanel.id = 'gt-mb-dd-edit';
        this.editFloatingPanel.innerHTML = `
            <!-- Kotak 1: Palu (Hancurkan Balok) -->
            <button class="gt-blender-tool-btn punch-tool" id="gt-card-tool-punch" type="button" title="Palu (Hancurkan Balok) [X]">
                <span>🔨</span>
                <div class="gt-blender-tooltip">
                    <span>🔨 Palu</span>
                    <span class="gt-blender-tooltip-badge">Hancurkan Balok [X]</span>
                </div>
            </button>

            <!-- Kotak 2: Build (Pasang Balok Modular) -->
            <div style="position: relative;">
                <button class="gt-blender-tool-btn build-tool" id="gt-card-tool-build" type="button" title="Build (Pasang Balok Modular) [B]">
                    <span>🧱</span>
                    <div class="gt-blender-tooltip">
                        <span>🧱 Build</span>
                        <span class="gt-blender-tooltip-badge">Pasang Balok [B]</span>
                    </div>
                </button>
                <!-- Build Picker Sub-Panel -->
                <div class="gt-build-picker" id="gt-build-picker">
                    <div class="gt-build-picker-title">Pilih Objek</div>
                    <button class="gt-build-picker-item" data-build="tile">🧱 Platform / Lantai</button>
                    <button class="gt-build-picker-item" data-build="npc">🧙 Karakter NPC</button>
                    <button class="gt-build-picker-item" data-build="coin">🪙 Koin</button>
                    <button class="gt-build-picker-item" data-build="obstacle">⚠️ Duri & Rintangan</button>
                    <button class="gt-build-picker-item" data-build="portal">🌀 Portal</button>
                </div>
            </div>

            <!-- Kotak 3: Wrench (Edit Dialog NPC) -->
            <button class="gt-blender-tool-btn wrench-tool" id="gt-card-tool-wrench" type="button" title="Wrench (Edit Dialog NPC)">
                <span>🔧</span>
                <div class="gt-blender-tooltip">
                    <span>🔧 Wrench</span>
                    <span class="gt-blender-tooltip-badge">Edit Dialog NPC</span>
                </div>
            </button>

            <!-- Pemisah Halus Blender Strip -->
            <div class="gt-blender-divider"></div>

            <!-- Kotak 4: Undo (Batalkan Aksi) -->
            <button class="gt-blender-tool-btn no-arrow disabled" id="gt-card-tool-undo" type="button" title="Undo (Batalkan Aksi) [Ctrl+Z]">
                <span>↩️</span>
                <div class="gt-blender-tooltip">
                    <span>↩️ Undo</span>
                    <span class="gt-blender-tooltip-badge">Ctrl+Z</span>
                </div>
            </button>

            <!-- Kotak 5: Redo (Ulangi Aksi) -->
            <button class="gt-blender-tool-btn no-arrow disabled" id="gt-card-tool-redo" type="button" title="Redo (Ulangi Aksi) [Ctrl+Y]">
                <span>↪️</span>
                <div class="gt-blender-tooltip">
                    <span>↪️ Redo</span>
                    <span class="gt-blender-tooltip-badge">Ctrl+Y</span>
                </div>
            </button>
        `;
        document.body.appendChild(this.editFloatingPanel);

        this.bindEvents();
    }

    bindEvents() {
        const fileBtn = this.bar.querySelector('#gt-mb-btn-file');
        const fileDd = this.bar.querySelector('#gt-mb-dd-file');
        const editBtn = this.bar.querySelector('#gt-mb-btn-edit');

        // Toggle Dropdowns
        fileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileDd.classList.toggle('show');
        });

        if (editBtn && this.editFloatingPanel) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileDd.classList.remove('show');
                this.updateFloatingPanelPosition();
                const willShow = !this.editFloatingPanel.classList.contains('show');
                this.editFloatingPanel.classList.toggle('show', willShow);
                editBtn.classList.toggle('active', willShow);
                if (willShow && this.currentTool === 'none') {
                    if (this.scene && this.scene.showFloatingToast) {
                        this.scene.showFloatingToast('🛠️ Toolbar Tools di Bawah HP: Pilih Palu [🔨] atau Wrench [🔧]', 0x38bdf8);
                    }
                }
            });

            this.editFloatingPanel.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            const punchCard = document.getElementById('gt-card-tool-punch');
            if (punchCard) {
                punchCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectTool(this.currentTool === 'punch' ? 'none' : 'punch');
                });
            }

            const buildCard = document.getElementById('gt-card-tool-build');
            const buildPicker = document.getElementById('gt-build-picker');
            if (buildCard) {
                buildCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Toggle build picker visibility
                    if (buildPicker) {
                        const isShown = buildPicker.classList.contains('show');
                        buildPicker.classList.toggle('show', !isShown);
                        if (!isShown) {
                            // Activate build mode
                            this.selectTool('build');
                        }
                    } else {
                        this.selectTool(this.currentTool === 'build' ? 'none' : 'build');
                    }
                });
            }

            // Build picker item selection
            if (buildPicker) {
                buildPicker.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                buildPicker.querySelectorAll('.gt-build-picker-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const target = item.getAttribute('data-build');
                        buildPicker.classList.remove('show');
                        // Enter placement mode on the scene
                        if (this.scene && typeof this.scene.enterPlacementMode === 'function') {
                            this.scene.enterPlacementMode(target);
                        } else if (this.scene && this.scene.showFloatingToast) {
                            this.scene.showFloatingToast(`Pasang ${target.toUpperCase()} — mode build aktif`, 0x22c55e);
                        }
                    });
                });
            }

            const wrenchCard = document.getElementById('gt-card-tool-wrench');
            if (wrenchCard) {
                wrenchCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectTool(this.currentTool === 'wrench' ? 'none' : 'wrench');
                });
            }

            // Undo & Redo Handlers
            const undoCard = document.getElementById('gt-card-tool-undo');
            const redoCard = document.getElementById('gt-card-tool-redo');

            if (undoCard) {
                undoCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    UndoRedoManager.undo();
                });
            }

            if (redoCard) {
                redoCard.addEventListener('click', (e) => {
                    e.stopPropagation();
                    UndoRedoManager.redo();
                });
            }

            UndoRedoManager.subscribe((mgr) => {
                if (undoCard) {
                    undoCard.classList.toggle('disabled', !mgr.canUndo());
                }
                if (redoCard) {
                    redoCard.classList.toggle('disabled', !mgr.canRedo());
                }
            });
        }

        // Close dropdowns on outside click
        window.addEventListener('click', () => {
            fileDd.classList.remove('show');
            const bp = document.getElementById('gt-build-picker');
            if (bp) bp.classList.remove('show');
        });

        window.addEventListener('resize', () => {
            this.updateFloatingPanelPosition();
        });

        // Dropdown actions: File
        const miNewWorld = this.bar.querySelector('#mi-new-world');
        if (miNewWorld) {
            miNewWorld.addEventListener('click', () => {
                fileDd.classList.remove('show');
                if (CommandConsole.instance) {
                    CommandConsole.instance.openSceneBuilder();
                }
            });
        }

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




        // Quick Buttons
        this.bar.querySelector('#gt-mb-btn-inspect').addEventListener('click', () => {
            CodeInspector.toggleLive();
        });

        this.bar.querySelector('#gt-mb-btn-create').addEventListener('click', () => {
            if (CommandConsole.instance) {
                CommandConsole.instance.openSceneBuilder('scene');
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

    updateFloatingPanelPosition() {
        if (!this.editFloatingPanel) return;
        const hpBox = document.querySelector('.gt-hud-hp-box');
        if (hpBox) {
            const rect = hpBox.getBoundingClientRect();
            this.editFloatingPanel.style.left = `${Math.max(16, rect.left)}px`;
            this.editFloatingPanel.style.top = `${rect.bottom + 10}px`;
        } else {
            this.editFloatingPanel.style.left = '20px';
            this.editFloatingPanel.style.top = this.isCollapsed ? '70px' : '108px';
        }
    }

    collapse() {
        this.isCollapsed = true;
        this.bar.classList.add('collapsed');
        this.pullTab.classList.add('show');
        if (this.scene && this.scene.htmlHUD) {
            this.scene.htmlHUD.adjustForMenuBar(false);
        }
        this.updateFloatingPanelPosition();
        setTimeout(() => this.updateFloatingPanelPosition(), 220);
    }

    expand() {
        this.isCollapsed = false;
        this.bar.classList.remove('collapsed');
        this.pullTab.classList.remove('show');
        if (this.scene && this.scene.htmlHUD) {
            this.scene.htmlHUD.adjustForMenuBar(true);
        }
        this.updateFloatingPanelPosition();
        setTimeout(() => this.updateFloatingPanelPosition(), 220);
    }

    selectTool(tool) {
        if (tool === this.currentTool) {
            tool = 'none';
        }
        this.currentTool = tool;

        const isPunch = (tool === 'punch');
        const isBuild = (tool === 'build');
        const isWrench = (tool === 'wrench');

        // 1. Sinkronisasi GridSystem untuk Punch (Dig mode) & Build mode
        if (isPunch) {
            if (GridSystem.toolMode !== 'dig') {
                GridSystem.setToolMode('dig');
            }
        } else if (isBuild) {
            if (GridSystem.toolMode !== 'build') {
                GridSystem.setToolMode('build');
            }
        } else {
            if (GridSystem.toolMode === 'dig' || GridSystem.toolMode === 'build') {
                GridSystem.setToolMode('none');
            }
        }

        // 2. Sinkronisasi Wrench / Edit Mode untuk NPC
        this.isEditMode = isWrench;
        if (this.scene) {
            this.scene.isEditMode = isWrench;
            if (typeof this.scene.setEditMode === 'function') {
                this.scene.setEditMode(isWrench);
            }
        }

        // 3. Update Tampilan Tombol Kotak di Floating Toolbar
        const punchCard = document.getElementById('gt-card-tool-punch');
        const buildCard = document.getElementById('gt-card-tool-build');
        const wrenchCard = document.getElementById('gt-card-tool-wrench');

        if (punchCard) {
            punchCard.classList.toggle('active', isPunch);
            punchCard.classList.toggle('active-punch', isPunch);
        }
        if (buildCard) {
            buildCard.classList.toggle('active', isBuild);
            buildCard.classList.toggle('active-build', isBuild);
        }
        if (wrenchCard) {
            wrenchCard.classList.toggle('active', isWrench);
            wrenchCard.classList.toggle('active-wrench', isWrench);
        }

        // 4. Update Tampilan Tombol Utama Menu Bar
        const editBtn = this.bar.querySelector('#gt-mb-btn-edit');
        const editLabel = this.bar.querySelector('#gt-mb-edit-label');

        if (editBtn) {
            editBtn.classList.remove('active', 'active-punch', 'active-build', 'active-wrench');
            if (isPunch) {
                editBtn.classList.add('active-punch');
                if (editLabel) editLabel.textContent = 'Palu';
            } else if (isBuild) {
                editBtn.classList.add('active-build');
                if (editLabel) editLabel.textContent = 'Build';
            } else if (isWrench) {
                editBtn.classList.add('active-wrench');
                if (editLabel) editLabel.textContent = 'Wrench';
            } else {
                if (editLabel) editLabel.textContent = 'Edit';
            }
        }

        // 5. Suara & Notifikasi Toast
        AudioManager.playClick();
        if (this.scene && this.scene.showFloatingToast) {
            if (isPunch) {
                this.scene.showFloatingToast('🔨 Mode Palu AKTIF! Klik balok tanah / platform untuk menghancurkan.', 0xef4444);
            } else if (isBuild) {
                this.scene.showFloatingToast('🧱 Mode Build AKTIF! Klik petak kosong untuk memasang balok modular.', 0x22c55e);
            } else if (isWrench) {
                this.scene.showFloatingToast('🔧 Mode Wrench AKTIF! Klik NPC atau Papan Tanda untuk edit dialog.', 0xf59e0b);
            } else {
                this.scene.showFloatingToast('Mode Tool Dinonaktifkan.', 0x64748b);
            }
        }
    }

    toggleEditMode(forceState) {
        const nextState = (forceState !== undefined) ? forceState : (this.currentTool !== 'wrench');
        this.selectTool(nextState ? 'wrench' : 'none');
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
        if (this.editFloatingPanel) {
            this.editFloatingPanel.classList.remove('show');
        }
        if (this.npcDialogEditor) {
            this.npcDialogEditor.close();
        }
        GridSystem.deactivate();
    }
}
