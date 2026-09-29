// ===============================================================
// HTML QUEST MODAL (CRISP DOM OVERLAY)
// ===============================================================
// Menampilkan jendela modal Active Quest dengan estetika visual:
// 1. Box navy elegan (#0b1a32) dengan border cyan cerah (#38bdf8)
// 2. Header "ACTIVE QUEST" beraksen neon glow
// 3. Judul & deskripsi misi dengan font modern 'Inter' ultra-tajam
// 4. Tombol "Close [Q]" dengan efek hover dan keyboard shortcut [Q] / [ESC]
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';

export class QuestModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.dom = null;
        this.keyboardHandler = null;

        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau restart
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const id = 'gt-html-quest-modal';
        const old = document.getElementById(id);
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = id;
        this.dom.className = 'gt-quest-overlay hidden';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap');

                .gt-quest-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99996;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s ease;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-quest-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-quest-card {
                    position: relative;
                    width: min(460px, 94vw);
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 12px;
                    padding: 24px 28px 20px;
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: left;
                    transform: scale(1);
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-quest-overlay.hidden .gt-quest-card {
                    transform: scale(0.95);
                    opacity: 0;
                }

                /* Header: ACTIVE QUEST */
                .gt-quest-header {
                    color: #38bdf8;
                    font-size: 13.5px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-align: center;
                    margin-bottom: 18px;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-quest-header::before, .gt-quest-header::after {
                    content: '';
                    width: 24px;
                    height: 1px;
                    background: rgba(56, 189, 248, 0.3);
                }

                /* Content Box */
                .gt-quest-body {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 22px;
                    background: #141414;
                    border: 1px solid #282828;
                    border-radius: 8px;
                    padding: 16px;
                    box-sizing: border-box;
                }

                .gt-quest-title {
                    font-size: 14.5px;
                    font-weight: 700;
                    color: #f4f4f5;
                    line-height: 1.4;
                    letter-spacing: 0.2px;
                }

                .gt-quest-desc {
                    font-size: 13px;
                    font-weight: 400;
                    color: #a1a1aa;
                    line-height: 1.6;
                    letter-spacing: 0.15px;
                }

                /* Tombol Close [Q] */
                .gt-quest-close-btn {
                    padding: 7px 22px;
                    background: #27272a;
                    border: 1px solid #3f3f46;
                    border-radius: 6px;
                    color: #f4f4f5;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                    outline: none;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    transition: all 0.15s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    letter-spacing: 0.3px;
                    font-family: 'Jost', sans-serif;
                }

                .gt-quest-close-btn:hover {
                    background: #323238;
                    border-color: #52525b;
                    color: #ffffff;
                    transform: translateY(-1px);
                }

                .gt-quest-close-btn:active {
                    transform: translateY(1px);
                }
            </style>

            <div class="gt-quest-card" id="gt-quest-card">
                <div class="gt-quest-header" id="gt-quest-header">Active Quest</div>
                <div class="gt-quest-body">
                    <div class="gt-quest-title" id="gt-quest-title">Misi Pertama: Menjelajahi Dunia</div>
                    <div class="gt-quest-desc" id="gt-quest-desc">
                        Lompati platform, ambil koin berharga, dan temukan gerbang portal untuk lanjut ke level berikutnya!
                    </div>
                </div>
                <button class="gt-quest-close-btn" id="gt-quest-close-btn">Close (Q)</button>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.card = this.dom.querySelector('#gt-quest-card');
        this.header = this.dom.querySelector('#gt-quest-header');
        this.titleText = this.dom.querySelector('#gt-quest-title');
        this.descText = this.dom.querySelector('#gt-quest-desc');
        this.closeBtn = this.dom.querySelector('#gt-quest-close-btn');

        // Klik overlay di luar box menutup modal
        this.dom.addEventListener('click', (e) => {
            if (e.target === this.dom) {
                this.hide();
            }
        });

        // Tombol Close
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });

        // Keyboard handler [Q] / [ESC]
        this.keyboardHandler = (e) => {
            if (!this.isOpen()) return;
            const key = e.key ? e.key.toLowerCase() : '';
            if (key === 'q' || key === 'escape') {
                e.stopPropagation();
                e.preventDefault();
                this.hide();
            }
        };
        window.addEventListener('keydown', this.keyboardHandler, true);
    }

    show(questData = null) {
        if (questData) {
            if (questData.header && this.header) this.header.textContent = questData.header;
            if (questData.judul && this.titleText) this.titleText.textContent = questData.judul;
            if (questData.deskripsi && this.descText) this.descText.textContent = questData.deskripsi;
        } else if (this.scene && this.scene.quest) {
            if (this.scene.quest.judul && this.titleText) this.titleText.textContent = this.scene.quest.judul;
            if (this.scene.quest.deskripsi && this.descText) this.descText.textContent = this.scene.quest.deskripsi;
        }

        this._isOpen = true;
        if (this.dom) {
            this.dom.classList.remove('hidden');
        }
        AudioManager.playClick();
    }

    hide() {
        if (!this._isOpen) return;
        this._isOpen = false;
        if (this.dom) {
            this.dom.classList.add('hidden');
        }
        AudioManager.playClick();

        if (this.scene && this.scene.isQuestOpen !== undefined) {
            this.scene.isQuestOpen = false;
        }
    }

    toggle(questData = null) {
        if (this.isOpen()) {
            this.hide();
        } else {
            this.show(questData);
        }
    }

    isOpen() {
        return this._isOpen;
    }

    destroy() {
        if (this.keyboardHandler) {
            window.removeEventListener('keydown', this.keyboardHandler, true);
            this.keyboardHandler = null;
        }
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
