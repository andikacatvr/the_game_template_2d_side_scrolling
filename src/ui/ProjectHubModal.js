import { AudioManager } from '../utils/AudioManager.js';

export class ProjectHubModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-project-hub-overlay');
        if (oldEl) oldEl.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-project-hub-overlay';
        this.overlay.className = 'gt-hub-overlay hidden';

        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@500;600;700;800&display=swap');

                .gt-hub-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(4, 8, 19, 0.82);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.22s ease, visibility 0.22s ease;
                    font-family: 'Outfit', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-hub-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-hub-card {
                    position: relative;
                    width: min(760px, 95vw);
                    max-height: min(600px, 92vh);
                    background: linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 26, 0.99) 100%);
                    border: 1.5px solid rgba(56, 189, 248, 0.35);
                    border-radius: 20px;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 35px rgba(56, 189, 248, 0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: gtHubPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes gtHubPop {
                    0% { transform: scale(0.94); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .gt-hub-header {
                    padding: 20px 24px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
                    background: rgba(30, 41, 59, 0.4);
                }

                .gt-hub-title-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gt-hub-icon-badge {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
                }

                .gt-hub-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #f8fafc;
                    letter-spacing: 0.5px;
                    margin: 0;
                }

                .gt-hub-subtitle {
                    font-size: 13px;
                    color: #94a3b8;
                    margin: 2px 0 0 0;
                }

                .gt-hub-close-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #94a3b8;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.18s ease;
                }

                .gt-hub-close-btn:hover {
                    background: rgba(239, 68, 68, 0.25);
                    border-color: #ef4444;
                    color: #fee2e2;
                    transform: scale(1.05);
                }

                .gt-hub-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .gt-hub-project-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 16px 18px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.18);
                    border-radius: 14px;
                    transition: all 0.2s ease;
                }

                .gt-hub-project-item:hover {
                    background: rgba(30, 41, 59, 0.85);
                    border-color: rgba(56, 189, 248, 0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
                }

                .gt-hub-project-item.primary-project {
                    background: linear-gradient(135deg, rgba(14, 116, 144, 0.25) 0%, rgba(15, 23, 42, 0.7) 100%);
                    border-color: rgba(56, 189, 248, 0.45);
                }

                .gt-hub-info-col {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .gt-hub-item-title-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-hub-item-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #f1f5f9;
                }

                .gt-hub-badge {
                    font-size: 11px;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 6px;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                }

                .gt-badge-sandbox {
                    background: rgba(56, 189, 248, 0.2);
                    color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.4);
                }

                .gt-badge-sample {
                    background: rgba(148, 163, 184, 0.15);
                    color: #cbd5e1;
                    border: 1px solid rgba(148, 163, 184, 0.3);
                }

                .gt-hub-item-desc {
                    font-size: 13px;
                    color: #94a3b8;
                    line-height: 1.4;
                }

                .gt-hub-play-btn {
                    padding: 10px 20px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    border: none;
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
                    transition: all 0.18s ease;
                    white-space: nowrap;
                }

                .gt-hub-play-btn:hover {
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    transform: scale(1.04);
                    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.45);
                }

                .gt-hub-play-btn.btn-secondary {
                    background: rgba(51, 65, 85, 0.8);
                    box-shadow: none;
                    border: 1px solid rgba(148, 163, 184, 0.3);
                }

                .gt-hub-play-btn.btn-secondary:hover {
                    background: rgba(71, 85, 105, 0.95);
                    border-color: #94a3b8;
                }

                .gt-hub-tip-box {
                    margin-top: 6px;
                    padding: 14px 16px;
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px dashed rgba(245, 158, 11, 0.4);
                    border-radius: 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    font-size: 13px;
                    color: #fef3c7;
                    line-height: 1.45;
                }

                .gt-hub-tip-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
            </style>

            <div class="gt-hub-card">
                <div class="gt-hub-header">
                    <div class="gt-hub-title-group">
                        <div class="gt-hub-icon-badge">📁</div>
                        <div>
                            <h2 class="gt-hub-title">MY PROJECTS / WORLDS</h2>
                            <p class="gt-hub-subtitle">Pusat Dunia & Ruang Kreasi Game Cilik</p>
                        </div>
                    </div>
                    <button class="gt-hub-close-btn" id="gt-hub-btn-close">✕</button>
                </div>

                <div class="gt-hub-body">
                    <!-- Project 1: Sandbox World (Scene 3) -->
                    <div class="gt-hub-project-item primary-project">
                        <div class="gt-hub-info-col">
                            <div class="gt-hub-item-title-row">
                                <span class="gt-hub-item-title">🌟 Sandbox World (Scene 3)</span>
                                <span class="gt-hub-badge gt-badge-sandbox">KARYA SENDIRI</span>
                            </div>
                            <div class="gt-hub-item-desc">
                                Kanvas kosong berlantai yang siap kamu dekorasi! Gunakan perintah <b>/create</b> untuk menambah NPC, dialog, lantai, dan rintangan.
                            </div>
                        </div>
                        <button class="gt-hub-play-btn" id="gt-hub-open-sandbox">
                            ▶ Buka Dunia
                        </button>
                    </div>

                    <!-- Project 2: Tutorial Sample (Scene 1) -->
                    <div class="gt-hub-project-item">
                        <div class="gt-hub-info-col">
                            <div class="gt-hub-item-title-row">
                                <span class="gt-hub-item-title">🏔️ Level 1: Lembah Bersalju</span>
                                <span class="gt-hub-badge gt-badge-sample">TUTORIAL SAMPLE</span>
                            </div>
                            <div class="gt-hub-item-desc">
                                Contoh dasar: lompat platform, ambil koin emas, bicara dengan penjaga, dan gerbang portal.
                            </div>
                        </div>
                        <button class="gt-hub-play-btn btn-secondary" id="gt-hub-open-scene1">
                            ▶ Mainkan
                        </button>
                    </div>

                    <!-- Project 3: Showcase Sample (Scene 2) -->
                    <div class="gt-hub-project-item">
                        <div class="gt-hub-info-col">
                            <div class="gt-hub-item-title-row">
                                <span class="gt-hub-item-title">🌃 Level 2: Teluk Hong Kong</span>
                                <span class="gt-hub-badge gt-badge-sample">SHOWCASE LEVEL</span>
                            </div>
                            <div class="gt-hub-item-desc">
                                Contoh mahakarya: latar parallax gedung megah, rintik hujan dinamis, ombak laut, dan kapal feri.
                            </div>
                        </div>
                        <button class="gt-hub-play-btn btn-secondary" id="gt-hub-open-scene2">
                            ▶ Mainkan
                        </button>
                    </div>

                    <!-- Pro-Tip Box -->
                    <div class="gt-hub-tip-box">
                        <span class="gt-hub-tip-icon">💡</span>
                        <div>
                            <b>Cara Cepat Membangun Duniamu:</b> Saat berada di dalam Sandbox World, buka Chat Bar lalu ketik 
                            <span style="color:#fde047; font-weight:700;">/create</span> atau klik tombol shortcut 
                            <span style="color:#fde047; font-weight:700;">+/create</span> untuk mendapatkan kumpulan kode template siap tempel!
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Bind events
        this.overlay.querySelector('#gt-hub-btn-close').addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this.overlay.querySelector('#gt-hub-open-sandbox').addEventListener('click', () => {
            this.hide();
            AudioManager.playClick();
            if (this.scene && this.scene.scene) {
                this.scene.scene.start('Scene3', { isNewGame: true });
            }
        });

        this.overlay.querySelector('#gt-hub-open-scene1').addEventListener('click', () => {
            this.hide();
            AudioManager.playClick();
            if (this.scene && this.scene.scene) {
                this.scene.scene.start('GameScene', { isNewGame: true });
            }
        });

        this.overlay.querySelector('#gt-hub-open-scene2').addEventListener('click', () => {
            this.hide();
            AudioManager.playClick();
            if (this.scene && this.scene.scene) {
                this.scene.scene.start('Scene2', { isNewGame: true });
            }
        });
    }

    show() {
        if (!this.overlay) this.createDOM();
        this.overlay.classList.remove('hidden');
        this._isOpen = true;
        AudioManager.playClick();
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this._isOpen = false;
        AudioManager.playClick();
    }

    isOpen() {
        return this._isOpen;
    }
}
