// ===============================================================
// HTML GAME HUD OVERLAY (CRISP DOM BUTTONS & UI)
// ===============================================================
// Mengganti tombol HUD canvas dengan elemen HTML/CSS yang ultra-tajam:
// 1. HP Bar & Hearts (Left)
// 2. Tombol Quest (Left)
// 3. Tombol Zoom Kamera (Right, jika didukung)
// 4. Tombol Tas / Inventory dengan Live Badge Counter (Right)
// 5. Tombol Menu Pengaturan (Right)
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';
import { ProjectHubModal } from './ProjectHubModal.js';
import { CommandConsole } from '../utils/CommandConsole.js';

export class HTMLGameHUD {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.dom = null;
        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau restart
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const old = document.getElementById('gt-html-game-hud');
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = 'gt-html-game-hud';
        this.dom.className = 'gt-hud-root';

        const isEngineBarOpen = (this.scene.engineMenuBar && !this.scene.engineMenuBar.isCollapsed);
        const topOffset = isEngineBarOpen ? '44px' : '14px';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');

                .gt-hud-root {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 99990;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-hud-top-bar {
                    position: absolute;
                    top: ${topOffset};
                    left: 20px;
                    right: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    pointer-events: none;
                    transition: top 0.2s ease;
                }

                .gt-hud-left, .gt-hud-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    pointer-events: auto;
                }

                /* A. HP DISPLAY (Black Obsidian Style) */
                .gt-hud-hp-box {
                    height: 44px;
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 8px;
                    padding: 0 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }

                .gt-hud-hp-label {
                    color: #f43f5e;
                    font-size: 14.5px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    font-family: 'Jost', sans-serif;
                }

                .gt-hud-hp-hearts {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-hud-heart-block {
                    width: 13px;
                    height: 13px;
                    background: #f43f5e;
                    border-radius: 3px;
                    box-shadow: 0 0 8px rgba(244, 63, 94, 0.7);
                    transition: all 0.2s ease;
                }

                .gt-hud-heart-block.lost {
                    background: #27272a;
                    box-shadow: none;
                    opacity: 0.45;
                }

                .gt-hud-hp-num {
                    color: #f4f4f5;
                    font-size: 14.5px;
                    font-weight: 700;
                    margin-left: 2px;
                    font-family: 'Jost', monospace;
                }

                /* B. BASE BUTTON STYLING (Projects Hub Style) */
                .gt-hud-btn {
                    height: 44px;
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 8px;
                    color: #f4f4f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    outline: none;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    font-family: 'Jost', sans-serif;
                }

                .gt-hud-btn:hover {
                    background: #242424;
                    border-color: #38bdf8;
                    box-shadow: 0 0 16px rgba(56, 189, 248, 0.3);
                    transform: translateY(-1px);
                }

                .gt-hud-btn:active {
                    transform: translateY(1px);
                }

                /* QUEST BUTTON */
                .gt-hud-btn-quest {
                    padding: 0 20px;
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    color: #f4f4f5;
                }

                .gt-hud-btn-quest:hover {
                    background: #222226;
                    border-color: #38bdf8;
                    color: #ffffff;
                }

                /* ZOOM BUTTON */
                .gt-hud-btn-zoom {
                    padding: 0 14px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #a1a1aa;
                    gap: 6px;
                }

                .gt-hud-btn-zoom:hover {
                    border-color: #38bdf8;
                    color: #38bdf8;
                    background: #222226;
                }

                /* INVENTORY / BAG BUTTON */
                .gt-hud-btn-bag {
                    width: 44px;
                    height: 44px;
                    padding: 0;
                }

                .gt-hud-btn-bag:hover {
                    background: #222226;
                    border-color: #38bdf8;
                }

                .gt-hud-btn-bag:hover svg {
                    stroke: #38bdf8;
                }

                .gt-hud-bag-svg {
                    stroke: #e4e4e7;
                    transition: stroke 0.15s ease;
                }

                .gt-hud-badge {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 4px;
                    background: #0284c7;
                    color: #ffffff;
                    border: 2px solid #181818;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 800;
                    font-family: 'Jost', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .gt-hud-badge.bump {
                    transform: scale(1.3);
                }

                /* C. STRIP RADAR DI BAWAH TENGAH (BOTTOM-CENTER REAL-TIME) */
                .gt-hud-radar-bottom {
                    position: absolute;
                    bottom: 14px;
                    left: 50%;
                    transform: translateX(-50%);
                    pointer-events: auto;
                    z-index: 99980;
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                }

                .gt-hud-radar-strip {
                    background: rgba(8, 12, 22, 0.94);
                    border: 1px solid #1e293b;
                    border-radius: 9px;
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.15);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                                height 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                                padding 0.22s ease,
                                border-color 0.2s ease,
                                box-shadow 0.2s ease;
                    box-sizing: border-box;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .gt-hud-radar-strip:hover {
                    border-color: #38bdf8;
                    box-shadow: 0 0 22px rgba(56, 189, 248, 0.35);
                }

                /* Mode 1: Normal (Default Ramping) */
                .gt-hud-radar-strip.is-normal {
                    width: 480px;
                    max-width: 92vw;
                    height: 54px;
                    padding: 4px 8px;
                }
                .gt-hud-radar-strip.is-normal .gt-hud-strip-canvas-wrap {
                    height: 27px;
                }

                /* Mode 2: Expanded (Diperbesar / Tactical Box) */
                .gt-hud-radar-strip.is-expanded {
                    width: 620px;
                    max-width: 94vw;
                    height: 140px;
                    padding: 6px 10px;
                    gap: 4px;
                }
                .gt-hud-radar-strip.is-expanded .gt-hud-strip-canvas-wrap {
                    height: 100px;
                }

                /* Mode 3: Minimized (Diperkecil / Capsule Pill) */
                .gt-hud-radar-strip.is-minimized {
                    width: 250px;
                    height: 32px;
                    padding: 0 12px;
                    justify-content: center;
                    border-radius: 20px;
                    cursor: pointer;
                }
                .gt-hud-radar-strip.is-minimized .gt-hud-strip-canvas-wrap,
                .gt-hud-radar-strip.is-minimized .gt-hud-strip-bar-track,
                .gt-hud-radar-strip.is-minimized .gt-hud-strip-gps {
                    display: none !important;
                }
                .gt-hud-radar-strip.is-minimized .gt-hud-strip-top {
                    height: 100%;
                }

                .gt-hud-strip-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 14px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #e2e8f0;
                    font-family: 'JetBrains Mono', monospace;
                    line-height: 1;
                }

                .gt-hud-strip-title {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #ffffff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 190px;
                    cursor: pointer;
                }

                .gt-hud-strip-gps {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 9.5px;
                    color: #38bdf8;
                }

                .gt-strip-gps-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 6px #22c55e;
                    animation: gtGpsPulse 1.2s infinite;
                }

                .gt-hud-strip-right-cluster {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-hud-strip-prog {
                    font-size: 10.5px;
                    font-weight: 800;
                    color: #22c55e;
                }

                .gt-hud-strip-actions {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }

                .gt-strip-action-btn {
                    width: 20px;
                    height: 20px;
                    background: #182234;
                    border: 1px solid #334155;
                    border-radius: 4px;
                    color: #94a3b8;
                    font-size: 11px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                    transition: all 0.15s ease;
                }

                .gt-strip-action-btn:hover {
                    background: #38bdf8;
                    border-color: #38bdf8;
                    color: #040810;
                    transform: scale(1.08);
                }

                .gt-hud-strip-canvas-wrap {
                    width: 100%;
                    border-radius: 4px;
                    overflow: hidden;
                    background: #040810;
                    border: 1px solid rgba(30, 41, 59, 0.6);
                    cursor: pointer;
                }

                #gt-hud-strip-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }

                .gt-hud-strip-bar-track {
                    width: 100%;
                    height: 2.5px;
                    background: #1e293b;
                    border-radius: 1px;
                    overflow: hidden;
                }

                .gt-hud-strip-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #38bdf8, #22c55e);
                    border-radius: 1px;
                    transition: width 0.2s ease;
                }

                @media (max-width: 600px) {
                    .gt-hud-radar-bottom {
                        bottom: 8px;
                    }
                    .gt-hud-strip-gps {
                        display: none;
                    }
                }

                /* LEVEL / LOCATION BUTTON (BETWEEN BAG & MENU) */
                .gt-hud-btn-level {
                    height: 44px;
                    padding: 0 14px;
                    gap: 8px;
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 8px;
                    color: #f4f4f5;
                    font-size: 13.5px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    font-family: 'Jost', sans-serif;
                }

                .gt-hud-btn-level:hover {
                    background: #222226;
                    border-color: #38bdf8;
                    color: #ffffff;
                    box-shadow: 0 0 16px rgba(56, 189, 248, 0.3);
                    transform: translateY(-1px);
                }

                .gt-hud-btn-level:active {
                    transform: translateY(1px);
                }

                .gt-hud-level-icon {
                    font-size: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .gt-hud-level-title {
                    max-width: 170px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .gt-hud-level-title {
                        max-width: 85px;
                    }
                }

                @media (max-width: 520px) {
                    .gt-hud-level-title {
                        display: none;
                    }
                    .gt-hud-btn-level {
                        padding: 0 11px;
                    }
                }

                /* MENU / SETTINGS BUTTON (HAMBURGER BAR) */
                .gt-hud-btn-menu {
                    width: 44px;
                    height: 44px;
                    padding: 0;
                    color: #e4e4e7;
                }

                .gt-hud-btn-menu:hover {
                    background: #222226;
                    border-color: #38bdf8;
                    color: #38bdf8;
                }

                .gt-hud-btn-menu:hover svg {
                    stroke: #38bdf8;
                }

                .gt-hud-menu-svg {
                    stroke: #e4e4e7;
                    transition: stroke 0.15s ease;
                }
            </style>

            <div class="gt-hud-top-bar" id="gt-hud-top-bar">
                <div class="gt-hud-left">
                    <!-- HP Box -->
                    <div class="gt-hud-hp-box" id="gt-hud-hp-box">
                        <span class="gt-hud-hp-label">HP</span>
                        <div class="gt-hud-hp-hearts" id="gt-hud-hearts-container"></div>
                        <span class="gt-hud-hp-num" id="gt-hud-hp-text">3/3</span>
                    </div>

                    <!-- Quest Button -->
                    <button class="gt-hud-btn gt-hud-btn-quest" id="gt-hud-btn-quest" title="Buka Misi &amp; Quest">
                        Quest
                    </button>
                </div>

                <div class="gt-hud-right">
                    <!-- Inventory Bag Button -->
                    <button class="gt-hud-btn gt-hud-btn-bag" id="gt-hud-btn-bag" title="Buka Tas / Inventaris">
                        <svg class="gt-hud-bag-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 6V4.5A2.5 2.5 0 0 1 15 4.5V6" stroke="currentColor"></path>
                            <rect x="4" y="6" width="16" height="15" rx="2.5" stroke="currentColor"></rect>
                            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor"></line>
                            <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" fill="currentColor"></rect>
                        </svg>
                        <span class="gt-hud-badge" id="gt-hud-badge">0</span>
                    </button>

                    <!-- Level / Location Button Indicator (Tepat di Tengah Tombol Backpack & Hamburger) -->
                    <button class="gt-hud-btn gt-hud-btn-level" id="gt-hud-btn-level" title="Informasi Level &amp; Tempat (Klik untuk Detail / Tekan M)">
                        <span class="gt-hud-level-icon" id="gt-hud-level-icon">🗺️</span>
                        <span class="gt-hud-level-title" id="gt-hud-level-title">Peta</span>
                    </button>

                    <!-- Menu Button (Hamburger Bar) -->
                    <button class="gt-hud-btn gt-hud-btn-menu" id="gt-hud-btn-menu" title="Menu Pengaturan (ESC)">
                        <svg class="gt-hud-menu-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="18" x2="20" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Radar Ramping di Bawah Tengah (Bisa Di-minimize & Diperbesar/Perkecil) -->
            <div class="gt-hud-radar-bottom" id="gt-hud-radar-bottom">
                <div class="gt-hud-radar-strip is-normal" id="gt-hud-radar-strip">
                    <div class="gt-hud-strip-top">
                        <div class="gt-hud-strip-title" id="gt-strip-title-btn" title="Klik untuk perkecil / perbesar">
                            <span id="gt-strip-icon">❄️</span>
                            <span id="gt-strip-name">Lv. 1 • Lembah Salju</span>
                        </div>
                        <div class="gt-hud-strip-gps" id="gt-strip-gps">
                            <span class="gt-strip-gps-dot"></span>
                            <span id="gt-strip-coord">GPS LIVE</span>
                        </div>
                        <div class="gt-hud-strip-right-cluster">
                            <div class="gt-hud-strip-prog" id="gt-strip-prog">0%</div>
                            <div class="gt-hud-strip-actions">
                                <button class="gt-strip-action-btn" id="gt-strip-btn-min" title="Minimize / Perkecil Radar (Mode Pill)">−</button>
                                <button class="gt-strip-action-btn" id="gt-strip-btn-size" title="Perbesar / Perkecil Ukuran Radar">⤢</button>
                                <button class="gt-strip-action-btn" id="gt-strip-btn-modal" title="Buka Radar Peta Penuh (M)">🗺️</button>
                            </div>
                        </div>
                    </div>
                    <div class="gt-hud-strip-canvas-wrap" id="gt-strip-canvas-wrap" title="Klik untuk Peta Lengkap / Double Klik untuk Ubah Ukuran">
                        <canvas id="gt-hud-strip-canvas" width="480" height="42"></canvas>
                    </div>
                    <div class="gt-hud-strip-bar-track" id="gt-strip-bar-track">
                        <div class="gt-hud-strip-bar-fill" id="gt-strip-bar-fill" style="width: 10%;"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.topBar = this.dom.querySelector('#gt-hud-top-bar');
        this.btnQuest = this.dom.querySelector('#gt-hud-btn-quest');
        this.btnBag = this.dom.querySelector('#gt-hud-btn-bag');
        this.btnLevel = this.dom.querySelector('#gt-hud-btn-level');
        this.levelIcon = this.dom.querySelector('#gt-hud-level-icon');
        this.levelTitle = this.dom.querySelector('#gt-hud-level-title');
        this.radarStrip = this.dom.querySelector('#gt-hud-radar-strip');
        this.stripCanvasWrap = this.dom.querySelector('#gt-strip-canvas-wrap');
        this.stripCanvas = this.dom.querySelector('#gt-hud-strip-canvas');
        this.stripCtx = this.stripCanvas ? this.stripCanvas.getContext('2d') : null;
        this.stripIcon = this.dom.querySelector('#gt-strip-icon');
        this.stripName = this.dom.querySelector('#gt-strip-name');
        this.stripCoord = this.dom.querySelector('#gt-strip-coord');
        this.stripProg = this.dom.querySelector('#gt-strip-prog');
        this.stripBarFill = this.dom.querySelector('#gt-strip-bar-fill');
        this.btnStripMin = this.dom.querySelector('#gt-strip-btn-min');
        this.btnStripSize = this.dom.querySelector('#gt-strip-btn-size');
        this.btnStripModal = this.dom.querySelector('#gt-strip-btn-modal');
        this.stripTitleBtn = this.dom.querySelector('#gt-strip-title-btn');
        this.btnMenu = this.dom.querySelector('#gt-hud-btn-menu');
        this.bagBadge = this.dom.querySelector('#gt-hud-badge');
        this.hpText = this.dom.querySelector('#gt-hud-hp-text');
        this.heartsContainer = this.dom.querySelector('#gt-hud-hearts-container');

        this.stripRadarAnimId = null;
        this.radarMode = 'normal';
        try {
            this.radarMode = localStorage.getItem('gt_radar_mode') || 'normal';
        } catch (e) {}

        this.setRadarMode(this.radarMode);
        this.bindEvents();
        this.syncInitialState();
    }

    setRadarMode(mode) {
        if (!this.radarStrip) return;
        this.radarMode = mode;
        try {
            localStorage.setItem('gt_radar_mode', mode);
        } catch (e) {}

        this.radarStrip.classList.remove('is-minimized', 'is-normal', 'is-expanded');
        this.radarStrip.classList.add(`is-${mode}`);

        if (mode === 'expanded') {
            if (this.stripCanvas) {
                this.stripCanvas.width = 620;
                this.stripCanvas.height = 100;
            }
            if (this.btnStripSize) {
                this.btnStripSize.textContent = '⤡';
                this.btnStripSize.title = 'Kecilkan ke Ukuran Normal';
            }
            if (this.btnStripMin) {
                this.btnStripMin.textContent = '−';
                this.btnStripMin.title = 'Minimize Radar (Mode Pill Kecil)';
            }
        } else if (mode === 'minimized') {
            if (this.btnStripMin) {
                this.btnStripMin.textContent = '▲';
                this.btnStripMin.title = 'Buka / Pulihkan Ukuran Radar';
            }
            if (this.btnStripSize) {
                this.btnStripSize.textContent = '⤢';
                this.btnStripSize.title = 'Perbesar Radar';
            }
        } else { // normal
            if (this.stripCanvas) {
                this.stripCanvas.width = 480;
                this.stripCanvas.height = 42;
            }
            if (this.btnStripSize) {
                this.btnStripSize.textContent = '⤢';
                this.btnStripSize.title = 'Perbesar Ukuran Radar (Tactical Box)';
            }
            if (this.btnStripMin) {
                this.btnStripMin.textContent = '−';
                this.btnStripMin.title = 'Minimize Radar (Mode Pill Kecil)';
            }
        }
    }

    bindEvents() {
        // Quest Button Click (jika ada tombol Quest di HUD)
        if (this.btnQuest) {
            this.btnQuest.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                if (typeof this.scene.toggleQuestModal === 'function') {
                    this.scene.toggleQuestModal();
                } else if (this.scene.questModal) {
                    this.scene.questModal.setVisible(!this.scene.questModal.visible);
                }
            });
        }

        // Inventory Bag Button Click
        this.btnBag.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            if (typeof this.scene.toggleInventoryModal === 'function') {
                this.scene.toggleInventoryModal();
            } else if (this.scene.inventoryModal) {
                if (this.scene.inventoryModal.isOpen && this.scene.inventoryModal.isOpen()) {
                    this.scene.inventoryModal.hide();
                } else {
                    this.scene.inventoryModal.show();
                }
            }
        });

        // Strip Radar Min Button Click
        if (this.btnStripMin) {
            this.btnStripMin.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                if (this.radarMode === 'minimized') {
                    this.setRadarMode('normal');
                } else {
                    this.setRadarMode('minimized');
                }
            });
        }

        // Strip Radar Size Toggle Click (Normal <-> Expanded)
        if (this.btnStripSize) {
            this.btnStripSize.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                if (this.radarMode === 'expanded') {
                    this.setRadarMode('normal');
                } else if (this.radarMode === 'normal') {
                    this.setRadarMode('expanded');
                } else {
                    this.setRadarMode('normal');
                }
            });
        }

        // Strip Radar Modal Button Click
        if (this.btnStripModal) {
            this.btnStripModal.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.showLevelInfoModal();
            });
        }

        // Klik judul saat minimized untuk membuka kembali
        if (this.stripTitleBtn) {
            this.stripTitleBtn.addEventListener('click', (e) => {
                if (this.radarMode === 'minimized') {
                    e.stopPropagation();
                    AudioManager.playClick();
                    this.setRadarMode('normal');
                }
            });
        }

        // Strip Radar Body Click (jika sedang minimized, klik bar memulihkan ke normal)
        if (this.radarStrip) {
            this.radarStrip.addEventListener('click', (e) => {
                if (this.radarMode === 'minimized') {
                    e.stopPropagation();
                    AudioManager.playClick();
                    this.setRadarMode('normal');
                }
            });
        }

        // Double Click pada canvas wrap untuk toggle ukuran cepat, Single Click untuk buka modal
        if (this.stripCanvasWrap) {
            this.stripCanvasWrap.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.setRadarMode(this.radarMode === 'expanded' ? 'normal' : 'expanded');
            });
            this.stripCanvasWrap.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.showLevelInfoModal();
            });
        }

        // Level / Location Button Click (Antara Bag & Menu)
        if (this.btnLevel) {
            this.btnLevel.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.showLevelInfoModal();
            });
        }

        // Shortcut Keyboard [M] untuk Buka/Tutup Radar Peta
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-M', () => {
                const existing = document.getElementById('gt-hud-level-modal');
                if (existing) {
                    existing.remove();
                } else {
                    this.showLevelInfoModal();
                }
            });
        }

        // Menu Button Click
        this.btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            if (typeof this.scene.toggleSettingsModal === 'function') {
                this.scene.toggleSettingsModal();
            } else if (this.scene.settingsModal) {
                if (this.scene.settingsModal.isOpen && this.scene.settingsModal.isOpen()) {
                    this.scene.settingsModal.hide();
                } else {
                    this.scene.settingsModal.show();
                }
            }
        });
    }

    startStripRadarLoop() {
        if (!this.stripCanvas || !this.stripCtx) return;
        if (this.stripRadarAnimId) cancelAnimationFrame(this.stripRadarAnimId);

        const canvas = this.stripCanvas;
        const ctx = this.stripCtx;
        const scene = this.scene;

        let animTime = 0;

        const loop = () => {
            if (!this.dom || !document.getElementById('gt-html-game-hud')) return;
            animTime += 0.04;

            const worldW = (scene && scene.physics && scene.physics.world && scene.physics.world.bounds) 
                ? scene.physics.world.bounds.width 
                : ((scene && scene.worldData && scene.worldData.worldWidth) || 1400);
            const worldH = (scene && scene.physics && scene.physics.world && scene.physics.world.bounds) 
                ? scene.physics.world.bounds.height 
                : ((scene && scene.worldData && scene.worldData.worldHeight) || 450);

            const curPx = (scene && scene.player) ? scene.player.x : 100;
            const curPy = (scene && scene.player) ? scene.player.y : 350;

            const W = canvas.width;
            const H = canvas.height;
            const scaleX = W / Math.max(800, worldW);
            const scaleY = H / Math.max(300, worldH);

            ctx.clearRect(0, 0, W, H);

            // 1. Background & subtle Blueprint grid
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, W, H);

            ctx.lineWidth = 0.8;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            for (let wx = 0; wx <= worldW; wx += 200) {
                const rx = wx * scaleX;
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, H);
                ctx.stroke();
            }

            // 2. Ground Baseline
            const groundY = (worldH > 500 ? 400 : (worldH - 50)) * scaleY;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, groundY, W, H - groundY);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(W, groundY);
            ctx.stroke();

            // 3. Platforms
            if (scene && scene.platforms && typeof scene.platforms.getChildren === 'function') {
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                scene.platforms.getChildren().forEach(p => {
                    if (!p || !p.body) return;
                    const bw = p.displayWidth || p.width || 50;
                    const bh = p.displayHeight || p.height || 20;
                    const bx = (p.x - bw / 2) * scaleX;
                    const by = (p.y - bh / 2) * scaleY;
                    ctx.fillRect(bx, by, bw * scaleX, Math.max(2, bh * scaleY));
                    ctx.strokeRect(bx, by, bw * scaleX, Math.max(2, bh * scaleY));
                });
            }

            // 4. Coins
            if (scene && scene.coins && typeof scene.coins.getChildren === 'function') {
                ctx.fillStyle = '#f59e0b';
                scene.coins.getChildren().forEach(c => {
                    if (!c || !c.active) return;
                    ctx.beginPath();
                    ctx.arc(c.x * scaleX, c.y * scaleY, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 5. Hazards
            if (scene && scene.hazards && typeof scene.hazards.getChildren === 'function') {
                ctx.fillStyle = '#ef4444';
                scene.hazards.getChildren().forEach(h => {
                    if (!h) return;
                    ctx.fillRect((h.x - 10) * scaleX, (h.y - 5) * scaleY, 20 * scaleX, 5 * scaleY);
                });
            }

            let goalX = worldW - 150, goalY = 375;
            if (scene && scene.portalExit) goalX = scene.portalExit.x, goalY = scene.portalExit.y;
            else if (scene && scene.portal) goalX = scene.portal.x, goalY = scene.portal.y;
            else if (scene && scene.worldData && Array.isArray(scene.worldData.entities)) {
                const pf = scene.worldData.entities.find(e => e.type === 'portal');
                if (pf) goalX = (pf.col !== undefined) ? (pf.col * 50 + 25) : pf.x;
            }

            // Update Live Texts & Progress Bar
            if (this.stripCoord) {
                this.stripCoord.textContent = `X:${Math.round(curPx)} Y:${Math.round(curPy)}`;
            }
            const prog = Math.min(100, Math.max(0, Math.round((curPx / Math.max(1, goalX)) * 100)));
            if (this.stripProg) {
                this.stripProg.textContent = `${prog}%`;
            }
            if (this.stripBarFill) {
                this.stripBarFill.style.width = `${prog}%`;
            }

            // Jika mode minimized, lewati render canvas untuk hemat daya & CPU
            if (this.radarMode === 'minimized') {
                this.stripRadarAnimId = requestAnimationFrame(loop);
                return;
            }

            const gx = goalX * scaleX;
            const gy = goalY * scaleY;
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(gx, gy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e9d5ff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 7. Player Beacon & Wave Pulse
            const px = curPx * scaleX;
            const py = curPy * scaleY;

            const pulseR = 3 + ((animTime * 1.6) % 1) * 10;
            const pulseAlpha = Math.max(0, 1 - ((animTime * 1.6) % 1));
            ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(px, py, pulseR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            this.stripRadarAnimId = requestAnimationFrame(loop);
        };

        this.stripRadarAnimId = requestAnimationFrame(loop);
    }

    getLevelInfo() {
        const sceneKey = this.scene && this.scene.scene ? this.scene.scene.key : '';

        if (sceneKey === 'GameScene') {
            return {
                icon: '❄️',
                shortName: 'Lv. 1',
                fullName: 'Lv. 1 • Lembah Salju',
                type: 'Tutorial Campaign',
                desc: 'Lembah bersalju tempat mempelajari dasar pergerakan, koin emas, dan portal petualangan.',
                objective: 'Kumpulkan Koin Emas dan lewati rintangan duri menuju portal petualangan!'
            };
        }

        if (sceneKey === 'HongKongScene' || sceneKey === 'Scene2') {
            return {
                icon: '🏙️',
                shortName: 'Lv. 2',
                fullName: 'Lv. 2 • Teluk Hong Kong',
                type: 'Story Campaign',
                desc: 'Pelabuhan malam Teluk Victoria dengan efek hujan rintik, kapal tongkang terapung, dan kapal feri ikonik.',
                objective: 'Lintasi kapal tongkang terapung dan naiki Kapal Feri Bintang untuk menang!'
            };
        }

        if (sceneKey === 'Scene3') {
            return {
                icon: '🌟',
                shortName: 'Sandbox',
                fullName: 'Sandbox • Lab Koding',
                type: 'Creative Sandbox',
                desc: 'Kanvas bebas murid untuk eksperimen koding JavaScript dan menguji balok kustom.',
                objective: 'Tulis kode kreasimu di Scene3.js atau gunakan menu Add Object di atas!'
            };
        }

        if (sceneKey === 'CustomWorldScene') {
            const worldName = (this.scene.worldData && this.scene.worldData.name) 
                ? this.scene.worldData.name 
                : 'Scene Kreasiku';
            const biome = (this.scene.worldData && this.scene.worldData.biome) || 'desert';
            const biomeIcons = {
                desert: '🏜️',
                snow: '❄️',
                dirt: '🌲',
                cave: '🌋'
            };
            return {
                icon: biomeIcons[biome] || '🎮',
                shortName: 'Scene Live',
                fullName: `${worldName}`,
                type: 'Kreator Scene Baru',
                desc: `Dunia modular buatanmu dengan tema biome ${biome}.`,
                objective: 'Uji gameplay, kalahkan rintangan, atau tekan [F4] untuk kembali ke Visual Editor!'
            };
        }

        return {
            icon: '📍',
            shortName: 'World',
            fullName: sceneKey || 'Game World',
            type: 'Petualangan',
            desc: 'Dunia petualangan 2D.',
            objective: 'Jelajahi dunia dan capai garis akhir!'
        };
    }

    updateLevelBadge() {
        const info = this.getLevelInfo();
        if (this.levelIcon) this.levelIcon.textContent = info.icon;
        if (this.levelTitle) this.levelTitle.textContent = info.fullName;
        if (this.stripIcon) this.stripIcon.textContent = info.icon;
        if (this.stripName) this.stripName.textContent = info.fullName;
        if (this.btnLevel) {
            this.btnLevel.title = `${info.fullName} (${info.type}) • Klik untuk Detail / Tekan M`;
        }
    }

    showLevelInfoModal() {
        const info = this.getLevelInfo();
        const oldModal = document.getElementById('gt-hud-level-modal');
        if (oldModal) {
            oldModal.remove();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'gt-hud-level-modal';

        const scene = this.scene;
        const worldW = (scene && scene.physics && scene.physics.world && scene.physics.world.bounds) 
            ? scene.physics.world.bounds.width 
            : ((scene && scene.worldData && scene.worldData.worldWidth) || 1400);
        const worldH = (scene && scene.physics && scene.physics.world && scene.physics.world.bounds) 
            ? scene.physics.world.bounds.height 
            : ((scene && scene.worldData && scene.worldData.worldHeight) || 450);

        const playerX = scene && scene.player ? Math.round(scene.player.x) : 100;
        const playerY = scene && scene.player ? Math.round(scene.player.y) : 350;

        modal.innerHTML = `
            <style>
                .gt-radar-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(4, 7, 15, 0.78);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    animation: gtRadarIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: none;
                }
                @keyframes gtRadarIn {
                    from { opacity: 0; transform: scale(0.96) translateY(6px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .gt-radar-window {
                    width: 820px;
                    max-width: 95vw;
                    background: #090e17;
                    border: 1px solid #1e293b;
                    border-radius: 12px;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.15);
                    padding: 20px 22px;
                    color: #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    box-sizing: border-box;
                }
                .gt-radar-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #1e293b;
                    padding-bottom: 12px;
                }
                .gt-radar-title-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .gt-radar-badge-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: #0f172a;
                    border: 1px solid #38bdf8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    box-shadow: 0 0 14px rgba(56, 189, 248, 0.25);
                }
                .gt-radar-level-name {
                    font-size: 17px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                }
                .gt-radar-sub-gps {
                    font-size: 11px;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    margin-top: 2px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .gt-radar-live-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 8px #22c55e;
                    animation: gtGpsPulse 1.2s infinite;
                }
                @keyframes gtGpsPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }
                .gt-radar-btn-close {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    width: 34px;
                    height: 34px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: all 0.15s ease;
                }
                .gt-radar-btn-close:hover {
                    background: #dc2626;
                    border-color: #ef4444;
                    color: #ffffff;
                }
                .gt-radar-screen-wrap {
                    position: relative;
                    width: 100%;
                    height: 240px;
                    background: #040810;
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.9);
                }
                #gt-radar-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }
                .gt-radar-progress-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .gt-radar-progress-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11.5px;
                    font-weight: 700;
                    color: #94a3b8;
                    font-family: 'JetBrains Mono', monospace;
                }
                .gt-radar-progress-track {
                    height: 6px;
                    background: #1e293b;
                    border-radius: 3px;
                    overflow: hidden;
                }
                .gt-radar-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #38bdf8, #22c55e);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                    box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
                }
                .gt-radar-legend {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #0d131f;
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    padding: 8px 14px;
                    font-size: 11.5px;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .gt-radar-legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                    color: #cbd5e1;
                }
                .gt-radar-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 4px;
                }
                .gt-radar-hint {
                    font-size: 12px;
                    color: #64748b;
                }
                .gt-radar-actions {
                    display: flex;
                    gap: 8px;
                }
                .gt-radar-btn {
                    padding: 7px 15px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }
                .gt-radar-btn-sec {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #e2e8f0;
                }
                .gt-radar-btn-sec:hover {
                    background: #334155;
                    color: #ffffff;
                }
                .gt-radar-btn-pri {
                    background: #0284c7;
                    border: 1px solid #38bdf8;
                    color: #ffffff;
                    box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
                }
                .gt-radar-btn-pri:hover {
                    background: #0369a1;
                    box-shadow: 0 0 16px rgba(56, 189, 248, 0.5);
                }
            </style>

            <div class="gt-radar-modal-overlay" id="gt-radar-overlay">
                <div class="gt-radar-window">
                    <div class="gt-radar-top">
                        <div class="gt-radar-title-group">
                            <div class="gt-radar-badge-icon">${info.icon}</div>
                            <div>
                                <div class="gt-radar-level-name">RADAR PETA: ${info.fullName}</div>
                                <div class="gt-radar-sub-gps">
                                    <span class="gt-radar-live-dot"></span>
                                    <span>GPS LIVE</span>
                                    <span>•</span>
                                    <span id="gt-radar-coord-text">X: ${playerX}px, Y: ${playerY}px</span>
                                    <span>•</span>
                                    <span>LEBAR DUNIA: ${worldW}px</span>
                                </div>
                            </div>
                        </div>
                        <button class="gt-radar-btn-close" id="gt-radar-btn-x" title="Tutup Peta (ESC)">✕</button>
                    </div>

                    <div class="gt-radar-screen-wrap">
                        <canvas id="gt-radar-canvas" width="800" height="240"></canvas>
                    </div>

                    <div class="gt-radar-progress-bar">
                        <div class="gt-radar-progress-header">
                            <span id="gt-radar-prog-title">🏃 KEMAJUAN MENUJU FINISH</span>
                            <span id="gt-radar-prog-percent">0%</span>
                        </div>
                        <div class="gt-radar-progress-track">
                            <div class="gt-radar-progress-fill" id="gt-radar-prog-fill" style="width: 10%;"></div>
                        </div>
                    </div>

                    <div class="gt-radar-legend">
                        <div class="gt-radar-legend-item"><span style="color:#fde047;">📍</span> <span>Hero (Kamu)</span></div>
                        <div class="gt-radar-legend-item"><span style="color:#a855f7;">🌀</span> <span>Portal Finish</span></div>
                        <div class="gt-radar-legend-item"><span style="color:#f59e0b;">🪙</span> <span>Koin Emas</span></div>
                        <div class="gt-radar-legend-item"><span style="color:#22c55e;">🧙</span> <span>NPC Pemandu</span></div>
                        <div class="gt-radar-legend-item"><span style="color:#ef4444;">⚠️</span> <span>Rintangan Bahaya</span></div>
                        <div class="gt-radar-legend-item"><span style="color:#38bdf8;">🧱</span> <span>Pijakan</span></div>
                    </div>

                    <div class="gt-radar-footer">
                        <div class="gt-radar-hint">🎯 ${info.objective}</div>
                        <div class="gt-radar-actions">
                            ${(scene && (scene.scene.key === 'CustomWorldScene' || scene.scene.key === 'Scene3')) ? `
                                <button class="gt-radar-btn gt-radar-btn-pri" id="gt-radar-btn-edit">
                                    <span>🛠️</span> Edit Level
                                </button>
                            ` : `
                                <button class="gt-radar-btn gt-radar-btn-sec" id="gt-radar-btn-hub">
                                    <span>📁</span> Project Hub
                                </button>
                            `}
                            <button class="gt-radar-btn gt-radar-btn-sec" id="gt-radar-btn-close-bottom">
                                Tutup Peta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const canvas = modal.querySelector('#gt-radar-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        const overlay = modal.querySelector('#gt-radar-overlay');
        const btnX = modal.querySelector('#gt-radar-btn-x');
        const btnCloseBottom = modal.querySelector('#gt-radar-btn-close-bottom');
        const btnEdit = modal.querySelector('#gt-radar-btn-edit');
        const btnHub = modal.querySelector('#gt-radar-btn-hub');
        const coordText = modal.querySelector('#gt-radar-coord-text');
        const progPercent = modal.querySelector('#gt-radar-prog-percent');
        const progFill = modal.querySelector('#gt-radar-prog-fill');

        let animFrameId = null;
        let animTime = 0;

        const closeModal = () => {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            AudioManager.playClick();
            modal.remove();
        };

        if (btnX) btnX.addEventListener('click', closeModal);
        if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
        }

        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                closeModal();
                if (typeof scene.openSceneBuilder === 'function') {
                    scene.openSceneBuilder();
                } else if (CommandConsole.instance) {
                    CommandConsole.instance.openSceneBuilder();
                }
            });
        }

        if (btnHub) {
            btnHub.addEventListener('click', () => {
                closeModal();
                new ProjectHubModal(scene).show();
            });
        }

        // ===========================================================
        // RENDER LOOP RADAR MINI-MAP REAL-TIME
        // ===========================================================
        const renderRadar = () => {
            if (!ctx || !canvas || !document.getElementById('gt-hud-level-modal')) return;
            animTime += 0.04;

            const W = canvas.width;
            const H = canvas.height;
            const scaleX = W / Math.max(800, worldW);
            const scaleY = H / Math.max(300, worldH);

            ctx.clearRect(0, 0, W, H);

            // 1. Blueprint Grid & Scanner Scanlines
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, W, H);

            // Grid vertikal per 100px di game world
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';

            for (let wx = 0; wx <= worldW; wx += 200) {
                const rx = wx * scaleX;
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, H);
                ctx.stroke();
                ctx.fillText(`${wx}m`, rx + 3, 12);
            }

            // Grid horizontal
            for (let wy = 0; wy <= worldH; wy += 100) {
                const ry = wy * scaleY;
                ctx.beginPath();
                ctx.moveTo(0, ry);
                ctx.lineTo(W, ry);
                ctx.stroke();
            }

            // 2. Garis Dasar Lantai Tanah (Ground Baseline)
            const groundY = (worldH > 500 ? 400 : (worldH - 50)) * scaleY;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, groundY, W, H - groundY);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(W, groundY);
            ctx.stroke();

            // 3. Platform Pijakan (Melayang)
            if (scene && scene.platforms && typeof scene.platforms.getChildren === 'function') {
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#0ea5e9';
                ctx.lineWidth = 1.5;
                scene.platforms.getChildren().forEach(p => {
                    if (!p || !p.body) return;
                    const bw = p.displayWidth || p.width || 50;
                    const bh = p.displayHeight || p.height || 20;
                    const bx = (p.x - bw / 2) * scaleX;
                    const by = (p.y - bh / 2) * scaleY;
                    ctx.fillRect(bx, by, bw * scaleX, Math.max(3, bh * scaleY));
                    ctx.strokeRect(bx, by, bw * scaleX, Math.max(3, bh * scaleY));
                });
            }

            // 4. Koin Harta Karun (Shimmering Gold)
            if (scene && scene.coins && typeof scene.coins.getChildren === 'function') {
                scene.coins.getChildren().forEach(c => {
                    if (!c || !c.active) return;
                    const cx = c.x * scaleX;
                    const cy = c.y * scaleY;
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            // 5. Rintangan Duri / Bahaya
            if (scene && scene.hazards && typeof scene.hazards.getChildren === 'function') {
                ctx.fillStyle = '#ef4444';
                scene.hazards.getChildren().forEach(h => {
                    if (!h) return;
                    const hx = h.x * scaleX;
                    const hy = h.y * scaleY;
                    ctx.beginPath();
                    ctx.moveTo(hx - 4, hy + 4);
                    ctx.lineTo(hx + 4, hy + 4);
                    ctx.lineTo(hx, hy - 4);
                    ctx.closePath();
                    ctx.fill();
                });
            }

            // 6. NPC Pemandu
            let npcX = 225, npcY = 378;
            if (scene && scene.npc) {
                npcX = scene.npc.x;
                npcY = scene.npc.y;
            }
            const nx = npcX * scaleX;
            const ny = npcY * scaleY;
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#86efac';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label NPC
            ctx.font = 'bold 9px "Jost", sans-serif';
            ctx.fillStyle = '#86efac';
            ctx.textAlign = 'center';
            ctx.fillText('🧙 NPC', nx, ny - 8);

            // 7. Portal Finish (Goal)
            let goalX = worldW - 150, goalY = 375;
            if (scene && scene.portalExit) {
                goalX = scene.portalExit.x;
                goalY = scene.portalExit.y;
            } else if (scene && scene.portal) {
                goalX = scene.portal.x;
                goalY = scene.portal.y;
            } else if (scene && scene.worldData && Array.isArray(scene.worldData.entities)) {
                const pf = scene.worldData.entities.find(e => e.type === 'portal');
                if (pf) {
                    goalX = (pf.col !== undefined) ? (pf.col * 50 + 25) : pf.x;
                    goalY = (pf.row !== undefined) ? (pf.row * 50 + 25) : 375;
                }
            }

            const gx = goalX * scaleX;
            const gy = goalY * scaleY;

            // Rotating Pulse Rings Portal
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(gx, gy, 8 + Math.sin(animTime * 3) * 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(gx, gy, 14, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#c084fc';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🌀 FINISH', gx, gy - 18);

            // 8. HERO / PLAYER RADAR BEACON (PULSING REAL-TIME)
            const curPx = (scene && scene.player) ? scene.player.x : playerX;
            const curPy = (scene && scene.player) ? scene.player.y : playerY;
            const px = curPx * scaleX;
            const py = curPy * scaleY;

            // Update text koordinat & progress bar live
            if (coordText) {
                coordText.textContent = `X: ${Math.round(curPx)}px, Y: ${Math.round(curPy)}px`;
            }
            const prog = Math.min(100, Math.max(0, Math.round((curPx / Math.max(1, goalX)) * 100)));
            if (progPercent) progPercent.textContent = `${prog}%`;
            if (progFill) progFill.style.width = `${prog}%`;

            // Pulsing Radar Beacon Waves
            const pulsePhase = (animTime * 1.5) % 1;
            const pulseR = 6 + pulsePhase * 24;
            const pulseAlpha = Math.max(0, 1 - pulsePhase);

            ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, pulseR, 0, Math.PI * 2);
            ctx.stroke();

            const pulsePhase2 = (animTime * 1.5 + 0.5) % 1;
            const pulseR2 = 6 + pulsePhase2 * 24;
            const pulseAlpha2 = Math.max(0, 1 - pulsePhase2);
            ctx.strokeStyle = `rgba(34, 197, 94, ${pulseAlpha2})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(px, py, pulseR2, 0, Math.PI * 2);
            ctx.stroke();

            // Center Player Marker Dot
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Floating Badge Callout "KAMU DI SINI"
            const calloutW = 86;
            const calloutH = 18;
            const calloutX = px - calloutW / 2;
            const calloutY = py - 28;

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(calloutX, calloutY, calloutW, calloutH, 4);
            ctx.fill();

            // Arrow down pointing to player
            ctx.beginPath();
            ctx.moveTo(px - 4, calloutY + calloutH);
            ctx.lineTo(px + 4, calloutY + calloutH);
            ctx.lineTo(px, calloutY + calloutH + 4);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#080d1a';
            ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('📍 KAMU DI SINI', px, calloutY + 12);

            animFrameId = requestAnimationFrame(renderRadar);
        };

        animFrameId = requestAnimationFrame(renderRadar);
    }

    updateHP(hp, maxHp = 3) {
        if (!this.heartsContainer || !this.hpText) return;
        this.hpText.textContent = `${hp}/${maxHp}`;

        let html = '';
        for (let i = 0; i < maxHp; i++) {
            const isLost = i >= hp;
            html += `<span class="gt-hud-heart-block ${isLost ? 'lost' : ''}"></span>`;
        }
        this.heartsContainer.innerHTML = html;
    }

    updateInventoryBadge(count) {
        if (!this.bagBadge) return;
        this.bagBadge.textContent = `${count}`;
        this.bagBadge.classList.add('bump');
        setTimeout(() => this.bagBadge.classList.remove('bump'), 220);
    }

    adjustForMenuBar(hasMenuBar = false) {
        if (this.topBar) {
            this.topBar.style.top = hasMenuBar ? '44px' : '14px';
        }
    }

    show() {
        if (this.dom) this.dom.style.display = 'block';
    }

    hide() {
        if (this.dom) this.dom.style.display = 'none';
    }

    destroy() {
        if (this.stripRadarAnimId) {
            cancelAnimationFrame(this.stripRadarAnimId);
            this.stripRadarAnimId = null;
        }
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
