import { AudioManager } from '../utils/AudioManager.js';

export class InventoryModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.selectedIdx = 0;
        this.maxSlots = options.maxSlots || 10;
        this.domId = `gt-inventory-modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-inventory-modal-overlay');
        if (oldEl) oldEl.remove();

        // 1. Overlay Backdrop
        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-inventory-modal-overlay';
        this.overlay.className = 'gt-inventory-overlay hidden';

        // 2. HTML & CSS
        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@500;600;700;800&display=swap');

                .gt-inventory-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99997;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(4, 8, 19, 0.78);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.22s ease, visibility 0.22s ease;
                    font-family: 'Outfit', 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-inventory-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-inventory-card {
                    position: relative;
                    width: min(740px, 95vw);
                    max-height: min(560px, 92vh);
                    background: linear-gradient(135deg, rgba(13, 22, 44, 0.96) 0%, rgba(9, 15, 30, 0.98) 100%);
                    border: 1.5px solid rgba(251, 191, 36, 0.35);
                    border-radius: 18px;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 
                                0 0 35px rgba(251, 191, 36, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(1);
                    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-inventory-overlay.hidden .gt-inventory-card {
                    transform: scale(0.94) translateY(10px);
                }

                /* Header */
                .gt-inv-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    background: rgba(15, 23, 42, 0.6);
                    border-bottom: 1px solid rgba(251, 191, 36, 0.2);
                }

                .gt-inv-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 17px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #fbbf24;
                    text-transform: uppercase;
                }

                .gt-inv-title .badge-icon {
                    width: 26px;
                    height: 26px;
                    background: linear-gradient(135deg, #d97706, #fbbf24);
                    border-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: #0f172a;
                }

                .gt-inv-close-x {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #94a3b8;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-inv-close-x:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                    color: #ffffff;
                }

                /* Main Content (2 Columns: Grid + Detail) */
                .gt-inv-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                    display: grid;
                    grid-template-columns: 1.4fr 1fr;
                    gap: 24px;
                    flex: 1;
                }

                @media (max-width: 650px) {
                    .gt-inv-body {
                        grid-template-columns: 1fr;
                        gap: 16px;
                        padding: 16px;
                    }
                }

                /* Slots Grid */
                .gt-slots-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .gt-slots-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                }

                .gt-slot {
                    aspect-ratio: 1;
                    background: rgba(15, 23, 42, 0.55);
                    border: 1.5px solid rgba(56, 189, 248, 0.18);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.18s ease;
                    padding: 4px;
                }

                .gt-slot:hover {
                    background: rgba(30, 41, 59, 0.7);
                    border-color: #38bdf8;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
                }

                .gt-slot.selected {
                    background: rgba(30, 58, 138, 0.5);
                    border-color: #fbbf24;
                    box-shadow: 0 0 14px rgba(251, 191, 36, 0.4);
                }

                .gt-slot.has-item {
                    border-color: rgba(56, 189, 248, 0.35);
                }

                .gt-slot-num {
                    position: absolute;
                    top: 4px;
                    left: 6px;
                    font-size: 9px;
                    font-weight: 800;
                    color: #475569;
                    font-family: 'Nunito', monospace;
                }

                .gt-slot-icon {
                    font-size: 22px;
                    margin-bottom: 2px;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
                }

                .gt-slot-name {
                    font-size: 9.5px;
                    font-weight: 700;
                    color: #e2e8f0;
                    text-align: center;
                    max-width: 90%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gt-slot-empty {
                    font-size: 10px;
                    font-weight: 600;
                    color: #475569;
                }

                /* Detail Panel */
                .gt-item-detail {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(56, 189, 248, 0.18);
                    border-radius: 14px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .gt-detail-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    padding-bottom: 12px;
                }

                .gt-detail-icon-wrap {
                    width: 46px;
                    height: 46px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.6), rgba(15, 23, 42, 0.8));
                    border: 1px solid #38bdf8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }

                .gt-detail-title-wrap {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .gt-detail-name {
                    font-size: 15px;
                    font-weight: 800;
                    color: #fbbf24;
                }

                .gt-detail-type {
                    font-size: 10px;
                    font-weight: 700;
                    color: #38bdf8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .gt-detail-desc {
                    font-size: 12px;
                    color: #cbd5e1;
                    line-height: 1.5;
                    flex: 1;
                }

                .gt-detail-hint {
                    font-size: 11px;
                    color: #64748b;
                    font-style: italic;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 8px 10px;
                    border-radius: 8px;
                    border-left: 2px solid #38bdf8;
                }

                /* Footer */
                .gt-inv-footer {
                    padding: 14px 24px;
                    background: rgba(10, 16, 32, 0.8);
                    border-top: 1px solid rgba(251, 191, 36, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .gt-capacity-wrap {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gt-capacity-bar {
                    width: 120px;
                    height: 8px;
                    background: #1e293b;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .gt-capacity-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981, #38bdf8);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }

                .gt-capacity-text {
                    font-size: 12px;
                    font-weight: 700;
                    color: #94a3b8;
                    font-family: 'Nunito', monospace;
                }

                .gt-btn-close-inv {
                    background: linear-gradient(135deg, #d97706, #f59e0b);
                    border: 1.5px solid #fbbf24;
                    color: #0f172a;
                    padding: 9px 20px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s ease;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
                }

                .gt-btn-close-inv:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
                    filter: brightness(1.1);
                }
            </style>

            <div class="gt-inventory-card" id="gt-inventory-card">
                <!-- Header -->
                <div class="gt-inv-header">
                    <div class="gt-inv-title">
                        <span class="badge-icon">🎒</span>
                        <span>ADVENTURER'S INVENTORY</span>
                    </div>
                    <button class="gt-inv-close-x" id="gt-close-inv-x" title="Close (I / ESC)">✕</button>
                </div>

                <!-- Body -->
                <div class="gt-inv-body">
                    <!-- Left: Slots Grid -->
                    <div class="gt-slots-container">
                        <div class="gt-slots-grid" id="gt-slots-grid">
                            <!-- Dynamic Slots -->
                        </div>
                    </div>

                    <!-- Right: Item Detail -->
                    <div class="gt-item-detail" id="gt-item-detail">
                        <div class="gt-detail-header">
                            <div class="gt-detail-icon-wrap" id="gt-detail-icon">✨</div>
                            <div class="gt-detail-title-wrap">
                                <div class="gt-detail-name" id="gt-detail-name">Select an Item</div>
                                <div class="gt-detail-type" id="gt-detail-type">INVENTORY SLOT</div>
                            </div>
                        </div>
                        <div class="gt-detail-desc" id="gt-detail-desc">
                            Click any slot in your bag to inspect the item's details, lore, and usage instructions.
                        </div>
                        <div class="gt-detail-hint" id="gt-detail-hint">
                            💡 Tip: Items collected during your journey remain safely stored in your save file.
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="gt-inv-footer">
                    <div class="gt-capacity-wrap">
                        <div class="gt-capacity-bar">
                            <div class="gt-capacity-fill" id="gt-cap-fill" style="width: 0%;"></div>
                        </div>
                        <span class="gt-capacity-text" id="gt-cap-text">0 / 10 Used</span>
                    </div>

                    <button class="gt-btn-close-inv" id="gt-close-inv-btn">
                        <span>Close (I / ESC)</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.bindEvents();
    }

    bindEvents() {
        const overlay = this.overlay;
        const card = overlay.querySelector('#gt-inventory-card');
        const closeX = overlay.querySelector('#gt-close-inv-x');
        const closeBtn = overlay.querySelector('#gt-close-inv-btn');

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                AudioManager.playClick();
                this.hide();
            }
        });

        if (card) {
            card.addEventListener('click', (e) => e.stopPropagation());
        }

        if (closeX) closeX.addEventListener('click', () => {
            AudioManager.playClick();
            this.hide();
        });

        if (closeBtn) closeBtn.addEventListener('click', () => {
            AudioManager.playClick();
            this.hide();
        });

        // Keydown listener for ESC & I
        this._keyListener = (e) => {
            if (!this._isOpen) return;
            if (e.key === 'Escape' || e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                e.stopPropagation();
                AudioManager.playClick();
                this.hide();
            }
        };
        window.addEventListener('keydown', this._keyListener);
    }

    renderItems() {
        if (!this.overlay) return;
        const grid = this.overlay.querySelector('#gt-slots-grid');
        if (!grid) return;

        const inventory = Array.isArray(this.scene?.inventory) ? this.scene.inventory : [];
        grid.innerHTML = '';

        for (let i = 0; i < this.maxSlots; i++) {
            const item = inventory[i];
            const slot = document.createElement('div');
            slot.className = `gt-slot ${item ? 'has-item' : ''} ${i === this.selectedIdx ? 'selected' : ''}`;
            slot.dataset.idx = i;

            const iconDisplay = item ? (item.icon || '🪙') : '';

            slot.innerHTML = `
                <span class="gt-slot-num">#${i + 1}</span>
                ${item ? `
                    <div class="gt-slot-icon">${iconDisplay}</div>
                    <div class="gt-slot-name">${item.nama || 'Item'}</div>
                ` : `
                    <div class="gt-slot-empty">Empty</div>
                `}
            `;

            slot.addEventListener('click', () => {
                AudioManager.playClick();
                this.selectSlot(i);
            });

            grid.appendChild(slot);
        }

        // Capacity Bar
        const capFill = this.overlay.querySelector('#gt-cap-fill');
        const capText = this.overlay.querySelector('#gt-cap-text');
        const pct = Math.min(100, Math.round((inventory.length / this.maxSlots) * 100));
        if (capFill) capFill.style.width = `${pct}%`;
        if (capText) capText.textContent = `${inventory.length} / ${this.maxSlots} Used`;

        this.updateDetailView();
    }

    selectSlot(idx) {
        this.selectedIdx = idx;
        const slots = this.overlay.querySelectorAll('.gt-slot');
        slots.forEach((s, i) => {
            if (i === idx) s.classList.add('selected');
            else s.classList.remove('selected');
        });
        this.updateDetailView();
    }

    updateDetailView() {
        const inventory = Array.isArray(this.scene?.inventory) ? this.scene.inventory : [];
        const item = inventory[this.selectedIdx];

        const iconEl = this.overlay.querySelector('#gt-detail-icon');
        const nameEl = this.overlay.querySelector('#gt-detail-name');
        const typeEl = this.overlay.querySelector('#gt-detail-type');
        const descEl = this.overlay.querySelector('#gt-detail-desc');
        const hintEl = this.overlay.querySelector('#gt-detail-hint');

        if (item) {
            if (iconEl) iconEl.textContent = item.icon || '🪙';
            if (nameEl) nameEl.textContent = item.nama || 'Mysterious Artifact';
            if (typeEl) typeEl.textContent = 'KEY QUEST ITEM';
            if (descEl) descEl.textContent = item.deskripsi || 'A valuable item obtained from your adventure in the skeleton world.';
            if (hintEl) hintEl.textContent = `📍 Item ID: ${item.id || 'unknown'} | Stored in Slot #${this.selectedIdx + 1}`;
        } else {
            if (iconEl) iconEl.textContent = '📦';
            if (nameEl) nameEl.textContent = `Slot #${this.selectedIdx + 1} (Empty)`;
            if (typeEl) typeEl.textContent = 'VACANT SLOT';
            if (descEl) descEl.textContent = 'This inventory slot is currently empty. Explore the map, pick up coins, or uncover secrets to fill this space!';
            if (hintEl) hintEl.textContent = '💡 Tip: Items will automatically be placed into the first empty slot when picked up.';
        }
    }

    show() {
        if (!this.overlay) return;
        this._isOpen = true;
        this.renderItems();
        this.overlay.classList.remove('hidden');

        if (this.scene) {
            this.scene.isInvOpen = true;

            if (this.scene.player && this.scene.player.body) {
                this.scene.player.setVelocity(0, 0);
            }

            if (this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = false;
            }
        }
    }

    hide() {
        if (!this.overlay) return;
        this._isOpen = false;
        this.overlay.classList.add('hidden');

        if (this.scene) {
            this.scene.isInvOpen = false;

            if (this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = true;
            }
        }
    }

    toggle() {
        if (this._isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    isOpen() {
        return this._isOpen;
    }

    destroy() {
        if (this._keyListener) {
            window.removeEventListener('keydown', this._keyListener);
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
