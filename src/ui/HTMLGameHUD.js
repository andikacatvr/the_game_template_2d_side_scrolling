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
                    top: ${topOffset};
                    left: 20px;
                    right: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    pointer-events: none;
                    z-index: 99990;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
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
                <button class="gt-hud-btn gt-hud-btn-level" id="gt-hud-btn-level" title="Informasi Level &amp; Tempat (Klik untuk Detail)">
                    <span class="gt-hud-level-icon" id="gt-hud-level-icon">📍</span>
                    <span class="gt-hud-level-title" id="gt-hud-level-title">Level</span>
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
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.btnQuest = this.dom.querySelector('#gt-hud-btn-quest');
        this.btnBag = this.dom.querySelector('#gt-hud-btn-bag');
        this.btnLevel = this.dom.querySelector('#gt-hud-btn-level');
        this.levelIcon = this.dom.querySelector('#gt-hud-level-icon');
        this.levelTitle = this.dom.querySelector('#gt-hud-level-title');
        this.btnMenu = this.dom.querySelector('#gt-hud-btn-menu');
        this.bagBadge = this.dom.querySelector('#gt-hud-badge');
        this.hpText = this.dom.querySelector('#gt-hud-hp-text');
        this.heartsContainer = this.dom.querySelector('#gt-hud-hearts-container');

        this.bindEvents();
        this.syncInitialState();
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

        // Level / Location Button Click
        if (this.btnLevel) {
            this.btnLevel.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.showLevelInfoModal();
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

    syncInitialState() {
        const hp = this.scene.hp !== undefined ? this.scene.hp : 3;
        const maxHp = this.scene.maxHp !== undefined ? this.scene.maxHp : 3;
        this.updateHP(hp, maxHp);

        const invCount = Array.isArray(this.scene.inventory) ? this.scene.inventory.length : 0;
        this.updateInventoryBadge(invCount);
        this.updateLevelBadge();
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
        if (!this.levelTitle || !this.levelIcon) return;
        const info = this.getLevelInfo();
        this.levelIcon.textContent = info.icon;
        this.levelTitle.textContent = info.fullName;
        if (this.btnLevel) {
            this.btnLevel.title = `${info.fullName} (${info.type}) • Klik untuk Detail`;
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
        modal.innerHTML = `
            <style>
                .gt-level-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    animation: gtFadeIn 0.15s ease-out;
                }
                @keyframes gtFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                .gt-level-card {
                    width: 420px;
                    max-width: 90vw;
                    background: #141416;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 24px rgba(56, 189, 248, 0.2);
                    padding: 24px;
                    color: #e4e4e7;
                    position: relative;
                }
                .gt-level-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 14px;
                }
                .gt-level-badge-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    background: #1e293b;
                    border: 1px solid #38bdf8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                }
                .gt-level-header-text {
                    flex: 1;
                }
                .gt-level-tag {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                }
                .gt-level-name {
                    font-size: 18px;
                    font-weight: 800;
                    color: #ffffff;
                    margin-top: 2px;
                }
                .gt-level-desc {
                    font-size: 13.5px;
                    color: #a1a1aa;
                    line-height: 1.5;
                    margin-bottom: 16px;
                }
                .gt-level-box-objective {
                    background: rgba(56, 189, 248, 0.08);
                    border: 1px solid rgba(56, 189, 248, 0.25);
                    border-radius: 8px;
                    padding: 12px 14px;
                    margin-bottom: 20px;
                }
                .gt-level-obj-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: #7dd3fc;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .gt-level-obj-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: #f0f9ff;
                    line-height: 1.4;
                }
                .gt-level-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                .gt-level-btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }
                .gt-level-btn-close {
                    background: #27272a;
                    border: 1px solid #3f3f46;
                    color: #d4d4d8;
                }
                .gt-level-btn-close:hover {
                    background: #3f3f46;
                    color: #ffffff;
                }
                .gt-level-btn-action {
                    background: #0284c7;
                    border: 1px solid #38bdf8;
                    color: #ffffff;
                }
                .gt-level-btn-action:hover {
                    background: #0369a1;
                    box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
                }
            </style>
            <div class="gt-level-modal-overlay" id="gt-level-overlay">
                <div class="gt-level-card">
                    <div class="gt-level-header">
                        <div class="gt-level-badge-icon">${info.icon}</div>
                        <div class="gt-level-header-text">
                            <div class="gt-level-tag">${info.type}</div>
                            <div class="gt-level-name">${info.fullName}</div>
                        </div>
                    </div>
                    <div class="gt-level-desc">${info.desc}</div>
                    <div class="gt-level-box-objective">
                        <div class="gt-level-obj-title">🎯 Objektif Utama</div>
                        <div class="gt-level-obj-text">${info.objective}</div>
                    </div>
                    <div class="gt-level-actions">
                        ${(this.scene && (this.scene.scene.key === 'CustomWorldScene' || this.scene.scene.key === 'Scene3')) ? `
                            <button class="gt-level-btn gt-level-btn-action" id="gt-btn-modal-edit">
                                <span>🛠️</span> Edit Scene
                            </button>
                        ` : `
                            <button class="gt-level-btn gt-level-btn-action" id="gt-btn-modal-hub">
                                <span>📁</span> Project Hub
                            </button>
                        `}
                        <button class="gt-level-btn gt-level-btn-close" id="gt-btn-modal-close">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const overlay = modal.querySelector('#gt-level-overlay');
        const closeBtn = modal.querySelector('#gt-btn-modal-close');
        const editBtn = modal.querySelector('#gt-btn-modal-edit');
        const hubBtn = modal.querySelector('#gt-btn-modal-hub');

        const closeModal = () => {
            AudioManager.playClick();
            modal.remove();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                closeModal();
                if (typeof this.scene.openSceneBuilder === 'function') {
                    this.scene.openSceneBuilder();
                } else if (CommandConsole.instance) {
                    CommandConsole.instance.openSceneBuilder();
                }
            });
        }

        if (hubBtn) {
            hubBtn.addEventListener('click', () => {
                closeModal();
                new ProjectHubModal(this.scene).show();
            });
        }
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
        if (!this.dom) return;
        this.dom.style.top = hasMenuBar ? '44px' : '14px';
    }

    show() {
        if (this.dom) this.dom.style.display = 'flex';
    }

    hide() {
        if (this.dom) this.dom.style.display = 'none';
    }

    destroy() {
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
