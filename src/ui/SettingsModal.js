import { SettingsManager } from '../utils/SettingsManager.js';
import { DisplayManager } from '../utils/DisplayManager.js';
import { SaveManager } from '../utils/SaveManager.js';
import { AudioManager } from '../utils/AudioManager.js';

export class SettingsModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options; // { onDeleteSave, onSaveGame, onToMenu, onToggleTouch, isGameScene, isTouchEnabled }
        this._isOpen = false;
        this.container = { active: false, setPosition: () => {}, setScale: () => {}, setVisible: () => {} };
        this.domId = `gt-settings-modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-settings-modal-overlay');
        if (oldEl) oldEl.remove();

        // 1. Overlay Backdrop
        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-settings-modal-overlay';
        this.overlay.className = 'gt-settings-overlay hidden';

        // 2. HTML Markup & CSS
        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@500;600;700;800&display=swap');

                .gt-settings-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99998;
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

                .gt-settings-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-settings-card {
                    position: relative;
                    width: min(720px, 95vw);
                    max-height: min(580px, 92vh);
                    background: linear-gradient(135deg, rgba(13, 22, 44, 0.96) 0%, rgba(9, 15, 30, 0.98) 100%);
                    border: 1.5px solid rgba(56, 189, 248, 0.35);
                    border-radius: 18px;
                    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 
                                0 0 35px rgba(56, 189, 248, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(1);
                    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-settings-overlay.hidden .gt-settings-card {
                    transform: scale(0.94) translateY(10px);
                }

                /* Header */
                .gt-settings-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    background: rgba(15, 23, 42, 0.6);
                    border-bottom: 1px solid rgba(56, 189, 248, 0.15);
                }

                .gt-settings-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 17px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #ffffff;
                    text-transform: uppercase;
                }

                .gt-settings-title .badge-icon {
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #0284c7, #38bdf8);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                }

                .gt-settings-close-x {
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

                .gt-settings-close-x:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                    color: #ffffff;
                }

                /* Body Grid */
                .gt-settings-body {
                    padding: 20px 24px;
                    overflow-y: auto;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }

                @media (max-width: 640px) {
                    .gt-settings-body {
                        grid-template-columns: 1fr;
                        gap: 18px;
                        padding: 16px;
                    }
                }

                .gt-settings-col {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .gt-section-title {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    color: #fbbf24;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 2px;
                }

                .gt-section-title::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(251, 191, 36, 0.2);
                }

                .gt-setting-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(15, 23, 42, 0.45);
                    border: 1px solid rgba(56, 189, 248, 0.12);
                    padding: 10px 14px;
                    border-radius: 10px;
                    gap: 12px;
                }

                .gt-setting-item label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #e2e8f0;
                    white-space: nowrap;
                }

                /* Range Slider Modern */
                .gt-slider-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    justify-content: flex-end;
                }

                .gt-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100px;
                    height: 6px;
                    border-radius: 3px;
                    background: #1e293b;
                    outline: none;
                    cursor: pointer;
                    transition: background 0.15s;
                }

                .gt-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #38bdf8;
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
                    cursor: pointer;
                    transition: transform 0.15s, background 0.15s;
                }

                .gt-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                    background: #7dd3fc;
                }

                .gt-val-badge {
                    min-width: 40px;
                    text-align: right;
                    font-size: 12px;
                    font-weight: 800;
                    color: #38bdf8;
                    font-family: 'Nunito', monospace;
                }

                /* Toggle Button */
                .gt-toggle-btn {
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    border: 1.5px solid #475569;
                    background: #1e293b;
                    color: #94a3b8;
                    transition: all 0.15s ease;
                }

                .gt-toggle-btn.active {
                    background: #16a34a;
                    border-color: #86efac;
                    color: #ffffff;
                    box-shadow: 0 0 10px rgba(22, 163, 74, 0.35);
                }

                .gt-toggle-btn.fast {
                    background: #2563eb;
                    border-color: #60a5fa;
                    color: #ffffff;
                    box-shadow: 0 0 10px rgba(37, 99, 235, 0.35);
                }

                /* Controls List */
                .gt-controls-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-control-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #cbd5e1;
                    padding: 4px 0;
                }

                .gt-key-badge {
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 6px;
                    padding: 3px 8px;
                    font-family: 'Nunito', monospace;
                    font-size: 11px;
                    font-weight: 800;
                    color: #f8fafc;
                    box-shadow: 0 2px 0 #1e293b;
                }

                /* Footer Actions */
                .gt-settings-footer {
                    padding: 14px 24px;
                    background: rgba(10, 16, 32, 0.8);
                    border-top: 1px solid rgba(56, 189, 248, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .gt-btn-primary {
                    background: linear-gradient(135deg, #0284c7, #0ea5e9);
                    border: 1.5px solid #38bdf8;
                    color: #ffffff;
                    padding: 9px 20px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s ease;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
                }

                .gt-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
                    filter: brightness(1.1);
                }

                .gt-btn-action {
                    background: #1e293b;
                    border: 1.5px solid #475569;
                    color: #ffffff;
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-btn-action:hover {
                    background: #334155;
                    border-color: #64748b;
                }

                .gt-btn-save {
                    background: #15803d;
                    border-color: #86efac;
                    color: #ffffff;
                }

                .gt-btn-save:hover {
                    background: #16a34a;
                }

                .gt-btn-danger {
                    background: #7f1d1d;
                    border-color: #ef4444;
                    color: #fecaca;
                }

                .gt-btn-danger:hover {
                    background: #991b1b;
                    color: #ffffff;
                }

                .gt-btn-disabled {
                    background: #1e293b;
                    border-color: #334155;
                    color: #64748b;
                    cursor: not-allowed;
                }
            </style>

            <div class="gt-settings-card" id="gt-settings-card">
                <!-- Header -->
                <div class="gt-settings-header">
                    <div class="gt-settings-title">
                        <span class="badge-icon">⚙</span>
                        <span>SETTINGS</span>
                    </div>
                    <button class="gt-settings-close-x" id="gt-close-x-btn" title="Close (ESC)">✕</button>
                </div>

                <!-- Body -->
                <div class="gt-settings-body">
                    <!-- Kolom Kiri: Audio & Gameplay -->
                    <div class="gt-settings-col">
                        <div class="gt-section-title">🔊 AUDIO & SOUND</div>
                        
                        <!-- Music Volume Slider -->
                        <div class="gt-setting-item">
                            <label for="gt-music-slider">Music Volume</label>
                            <div class="gt-slider-wrap">
                                <input type="range" min="0" max="100" step="5" value="${SettingsManager.musicVolume}" class="gt-slider" id="gt-music-slider">
                                <span class="gt-val-badge" id="gt-music-val">${SettingsManager.musicVolume}%</span>
                            </div>
                        </div>

                        <!-- SFX Volume Slider -->
                        <div class="gt-setting-item">
                            <label for="gt-sfx-slider">SFX Volume</label>
                            <div class="gt-slider-wrap">
                                <input type="range" min="0" max="100" step="5" value="${SettingsManager.sfxVolume}" class="gt-slider" id="gt-sfx-slider">
                                <span class="gt-val-badge" id="gt-sfx-val">${SettingsManager.sfxVolume}%</span>
                            </div>
                        </div>

                        <div class="gt-section-title" style="margin-top: 6px;">🎮 GAMEPLAY</div>

                        <!-- Dialogue Speed -->
                        <div class="gt-setting-item">
                            <label>Dialogue Speed</label>
                            <button class="gt-toggle-btn ${SettingsManager.dialogueSpeedFast ? 'fast' : ''}" id="gt-dialog-toggle">
                                ${SettingsManager.dialogueSpeedFast ? 'Fast' : 'Normal'}
                            </button>
                        </div>

                        <!-- Fullscreen -->
                        <div class="gt-setting-item">
                            <label>Fullscreen</label>
                            <button class="gt-toggle-btn" id="gt-fullscreen-toggle">OFF</button>
                        </div>

                        <!-- Touch Controls -->
                        <div class="gt-setting-item">
                            <label>Mobile Touch Controls</label>
                            <button class="gt-toggle-btn ${this.options.isTouchEnabled ? 'active' : ''}" id="gt-touch-toggle">
                                ${this.options.isTouchEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    <!-- Kolom Kanan: Panduan Kontrol & Resolusi -->
                    <div class="gt-settings-col">
                        <div class="gt-section-title">⌨ CONTROLS GUIDE</div>
                        <div class="gt-controls-list">
                            <div class="gt-control-row">
                                <span>Move Left / Right</span>
                                <span class="gt-key-badge">A / D or ← / →</span>
                            </div>
                            <div class="gt-control-row">
                                <span>Jump</span>
                                <span class="gt-key-badge">W / Space / ↑</span>
                            </div>
                            <div class="gt-control-row">
                                <span>Interact / Talk</span>
                                <span class="gt-key-badge">E / Enter</span>
                            </div>
                            <div class="gt-control-row">
                                <span>View Quest</span>
                                <span class="gt-key-badge">Q</span>
                            </div>
                            <div class="gt-control-row">
                                <span>Open Inventory</span>
                                <span class="gt-key-badge">I</span>
                            </div>
                            <div class="gt-control-row">
                                <span>Camera Zoom</span>
                                <span class="gt-key-badge">Scroll / + / -</span>
                            </div>
                        </div>

                        <div class="gt-section-title" style="margin-top: 6px;">🖥 DISPLAY & RESOLUTION</div>
                        <div class="gt-setting-item">
                            <label>Resolution</label>
                            <button class="gt-btn-action" id="gt-res-btn" style="min-width: 140px; text-align: center;">
                                ${DisplayManager.current.label}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="gt-settings-footer">
                    <button class="gt-btn-primary" id="gt-close-esc-btn">
                        <span>Close (ESC)</span>
                    </button>
                    
                    <div style="display: flex; gap: 10px; align-items: center;" id="gt-action-container">
                        <!-- Diisi secara dinamis tergantung isGameScene atau TitleScene -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // 3. Bind Interaksi UI
        this.bindEvents();
    }

    bindEvents() {
        const overlay = this.overlay;
        const card = overlay.querySelector('#gt-settings-card');
        const closeX = overlay.querySelector('#gt-close-x-btn');
        const closeEsc = overlay.querySelector('#gt-close-esc-btn');

        // Klik background overlay = tutup
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

        if (closeEsc) closeEsc.addEventListener('click', () => {
            AudioManager.playClick();
            this.hide();
        });

        // Sliders
        const musicSlider = overlay.querySelector('#gt-music-slider');
        const musicVal = overlay.querySelector('#gt-music-val');
        if (musicSlider && musicVal) {
            musicSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                SettingsManager.setMusicVolume(val);
                musicVal.textContent = `${val}%`;
                if (this.scene && this.scene.sound && this.scene.sound.setVolume) {
                    this.scene.sound.setVolume(val / 100);
                }
            });
        }

        const sfxSlider = overlay.querySelector('#gt-sfx-slider');
        const sfxVal = overlay.querySelector('#gt-sfx-val');
        if (sfxSlider && sfxVal) {
            sfxSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                SettingsManager.setSfxVolume(val);
                sfxVal.textContent = `${val}%`;
            });
            sfxSlider.addEventListener('change', () => {
                AudioManager.playCoin();
            });
        }

        // Dialogue Speed Toggle
        const diagToggle = overlay.querySelector('#gt-dialog-toggle');
        if (diagToggle) {
            diagToggle.addEventListener('click', () => {
                const isFast = SettingsManager.toggleDialogueSpeed();
                diagToggle.textContent = isFast ? 'Fast' : 'Normal';
                if (isFast) {
                    diagToggle.classList.add('fast');
                } else {
                    diagToggle.classList.remove('fast');
                }
                AudioManager.playDialogBeep();
            });
        }

        // Fullscreen Toggle
        const fsToggle = overlay.querySelector('#gt-fullscreen-toggle');
        if (fsToggle) {
            fsToggle.addEventListener('click', () => {
                DisplayManager.toggleFullscreen(this.scene);
                setTimeout(() => this.updateFullscreenUI(), 100);
            });
        }

        // Touch Toggle
        const touchToggle = overlay.querySelector('#gt-touch-toggle');
        if (touchToggle) {
            touchToggle.addEventListener('click', () => {
                if (this.options.onToggleTouch) {
                    const newState = this.options.onToggleTouch();
                    touchToggle.textContent = newState ? 'ON' : 'OFF';
                    if (newState) {
                        touchToggle.classList.add('active');
                    } else {
                        touchToggle.classList.remove('active');
                    }
                    AudioManager.playClick();
                }
            });
        }

        // Resolution Cycle
        const resBtn = overlay.querySelector('#gt-res-btn');
        if (resBtn) {
            resBtn.addEventListener('click', () => {
                const nextRes = DisplayManager.cycleNext();
                resBtn.textContent = nextRes.label;
                AudioManager.playClick();
            });
        }

        // Action Buttons (GameScene vs TitleScene)
        const actionContainer = overlay.querySelector('#gt-action-container');
        if (actionContainer) {
            actionContainer.innerHTML = '';
            if (this.options.isGameScene) {
                const saveBtn = document.createElement('button');
                saveBtn.className = 'gt-btn-action gt-btn-save';
                saveBtn.textContent = 'Save Game';
                saveBtn.addEventListener('click', () => {
                    AudioManager.playClick();
                    if (this.options.onSaveGame) this.options.onSaveGame();
                });

                const menuBtn = document.createElement('button');
                menuBtn.className = 'gt-btn-action';
                menuBtn.textContent = 'Main Menu';
                menuBtn.addEventListener('click', () => {
                    AudioManager.playClick();
                    this.hide();
                    if (this.options.onToMenu) this.options.onToMenu();
                });

                actionContainer.appendChild(saveBtn);
                actionContainer.appendChild(menuBtn);
            } else {
                const hasSave = SaveManager.hasSave();
                const delBtn = document.createElement('button');
                delBtn.className = `gt-btn-action ${hasSave ? 'gt-btn-danger' : 'gt-btn-disabled'}`;
                delBtn.textContent = hasSave ? 'Delete Save Data' : 'No Save Data';
                if (hasSave) {
                    delBtn.addEventListener('click', () => {
                        AudioManager.playClick();
                        this.hide();
                        if (this.options.onDeleteSave) this.options.onDeleteSave();
                    });
                }
                actionContainer.appendChild(delBtn);
            }
        }

        // ESC Key listener
        this._escListener = (e) => {
            if (e.key === 'Escape' && this._isOpen) {
                e.preventDefault();
                e.stopPropagation();
                AudioManager.playClick();
                this.hide();
            }
        };
        window.addEventListener('keydown', this._escListener);
    }

    updateFullscreenUI() {
        const fsToggle = this.overlay.querySelector('#gt-fullscreen-toggle');
        if (fsToggle) {
            const isFs = (this.scene.scale && this.scene.scale.isFullscreen) || !!document.fullscreenElement;
            fsToggle.textContent = isFs ? 'ON' : 'OFF';
            if (isFs) {
                fsToggle.classList.add('active');
            } else {
                fsToggle.classList.remove('active');
            }
        }
    }

    show() {
        if (!this.overlay) return;
        this._isOpen = true;

        // Sinkronisasi data terkini
        this.updateFullscreenUI();
        const resBtn = this.overlay.querySelector('#gt-res-btn');
        if (resBtn) resBtn.textContent = DisplayManager.current.label;

        // Tampilkan modal
        this.overlay.classList.remove('hidden');

        // Kunci status scene
        if (this.scene) {
            this.scene.isSettingsOpen = true;

            // Kunci pemain agar tidak bisa bergerak di background
            if (this.scene.player && this.scene.player.body) {
                this.scene.player.setVelocity(0, 0);
            }

            // Sembunyikan tombol kontrol layar sentuh HP sementara
            if (this.scene.mobileControlsContainer) {
                this.scene.mobileControlsContainer.setVisible(false);
            }

            // Matikan sementara keyboard input Phaser agar tidak bocor
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
            this.scene.isSettingsOpen = false;

            // Pulihkan tombol kontrol sentuh jika aktif
            if (this.options.isTouchEnabled && this.scene.mobileControlsContainer) {
                this.scene.mobileControlsContainer.setVisible(true);
            }

            // Nyalakan kembali keyboard input Phaser
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
        if (this._escListener) {
            window.removeEventListener('keydown', this._escListener);
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
