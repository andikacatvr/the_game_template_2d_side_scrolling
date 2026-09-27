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

        const isEngineBarActive = !!document.getElementById('gt-engine-menubar') || !!this.scene.engineMenuBar;
        const topOffset = isEngineBarActive ? '44px' : '14px';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=JetBrains+Mono:wght@700&display=swap');

                .gt-hud-root {
                    position: fixed;
                    top: ${topOffset};
                    left: 14px;
                    right: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    pointer-events: none;
                    z-index: 99990;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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

                /* A. HP DISPLAY */
                .gt-hud-hp-box {
                    height: 34px;
                    background: rgba(15, 23, 42, 0.92);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 0 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .gt-hud-hp-label {
                    color: #f43f5e;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .gt-hud-hp-hearts {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gt-hud-heart-block {
                    width: 9px;
                    height: 9px;
                    background: #f43f5e;
                    border-radius: 2px;
                    box-shadow: 0 0 6px rgba(244, 63, 94, 0.6);
                    transition: all 0.2s ease;
                }

                .gt-hud-heart-block.lost {
                    background: #334155;
                    box-shadow: none;
                    opacity: 0.45;
                }

                .gt-hud-hp-num {
                    color: #fda4af;
                    font-size: 11.5px;
                    font-weight: 700;
                    margin-left: 2px;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* B. BASE BUTTON STYLING */
                .gt-hud-btn {
                    height: 34px;
                    background: rgba(15, 23, 42, 0.92);
                    border-radius: 6px;
                    color: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    outline: none;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                }

                .gt-hud-btn:hover {
                    transform: translateY(-1px) scale(1.04);
                }

                .gt-hud-btn:active {
                    transform: translateY(1px) scale(0.96);
                }

                /* QUEST BUTTON */
                .gt-hud-btn-quest {
                    padding: 0 16px;
                    border: 2px solid #38bdf8;
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                }

                .gt-hud-btn-quest:hover {
                    background: #1e293b;
                    border-color: #60a5fa;
                    box-shadow: 0 0 14px rgba(56, 189, 248, 0.45);
                    color: #ffffff;
                }

                /* ZOOM BUTTON */
                .gt-hud-btn-zoom {
                    padding: 0 10px;
                    border: 2px solid #64748b;
                    font-size: 11px;
                    font-weight: 700;
                    color: #cbd5e1;
                    gap: 4px;
                }

                .gt-hud-btn-zoom:hover {
                    border-color: #38bdf8;
                    color: #38bdf8;
                    background: #1e293b;
                }

                /* INVENTORY / BAG BUTTON */
                .gt-hud-btn-bag {
                    width: 36px;
                    height: 36px;
                    border: 2px solid #64748b;
                    padding: 0;
                }

                .gt-hud-btn-bag:hover {
                    background: #1e293b;
                    border-color: #f59e0b;
                    box-shadow: 0 0 14px rgba(245, 158, 11, 0.4);
                }

                .gt-hud-btn-bag:hover svg {
                    stroke: #fde047;
                }

                .gt-hud-bag-svg {
                    stroke: #f8fafc;
                    transition: stroke 0.15s ease;
                }

                .gt-hud-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    min-width: 16px;
                    height: 16px;
                    padding: 0 4px;
                    background: #10b981;
                    color: #ffffff;
                    border: 2px solid #0f172a;
                    border-radius: 10px;
                    font-size: 9.5px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .gt-hud-badge.bump {
                    transform: scale(1.35);
                }

                /* MENU / SETTINGS BUTTON */
                .gt-hud-btn-menu {
                    width: 46px;
                    height: 36px;
                    border: 2px solid #64748b;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    color: #94a3b8;
                }

                .gt-hud-btn-menu:hover {
                    background: #1e293b;
                    border-color: #38bdf8;
                    color: #38bdf8;
                    box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
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
                    <svg class="gt-hud-bag-svg" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 6V4.5A2.5 2.5 0 0 1 15 4.5V6" stroke="currentColor"></path>
                        <rect x="4" y="6" width="16" height="15" rx="2.5" stroke="currentColor"></rect>
                        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor"></line>
                        <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" fill="currentColor"></rect>
                    </svg>
                    <span class="gt-hud-badge" id="gt-hud-badge">0</span>
                </button>

                <!-- Menu Button -->
                <button class="gt-hud-btn gt-hud-btn-menu" id="gt-hud-btn-menu" title="Menu Pengaturan (ESC)">
                    MENU
                </button>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.btnQuest = this.dom.querySelector('#gt-hud-btn-quest');
        this.btnBag = this.dom.querySelector('#gt-hud-btn-bag');
        this.btnMenu = this.dom.querySelector('#gt-hud-btn-menu');
        this.bagBadge = this.dom.querySelector('#gt-hud-badge');
        this.hpText = this.dom.querySelector('#gt-hud-hp-text');
        this.heartsContainer = this.dom.querySelector('#gt-hud-hearts-container');

        this.bindEvents();
        this.syncInitialState();
    }

    bindEvents() {
        // Quest Button Click
        this.btnQuest.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            if (typeof this.scene.toggleQuestModal === 'function') {
                this.scene.toggleQuestModal();
            } else if (this.scene.questModal) {
                this.scene.questModal.setVisible(!this.scene.questModal.visible);
            }
        });

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
