// ===============================================================
// GAME OVER MODAL (MODERN MINIMALIST GLASS UI)
// ===============================================================
// Tampilan Game Over modern dengan efek glassmorphism, tipografi bersih,
// ikon SVG Heroicons, dan animasi transisi halus.
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';

export class GameOverModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.dom = null;
        this.isOpen = false;
        this.keyListener = null;

        this.initDOM();

        if (this.scene && this.scene.events) {
            this.scene.events.once('shutdown', () => this.destroy());
            this.scene.events.once('destroy', () => this.destroy());
        }
    }

    initDOM() {
        const id = 'gt-game-over-modal-overlay';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        this.dom = document.createElement('div');
        this.dom.id = id;
        this.dom.className = 'gt-gameover-overlay';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                .gt-gameover-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.78);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .gt-gameover-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .gt-gameover-card {
                    width: 420px;
                    max-width: calc(100vw - 32px);
                    background: linear-gradient(180deg, rgba(28, 12, 16, 0.94) 0%, rgba(13, 15, 23, 0.98) 100%);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 18px;
                    padding: 32px 28px 26px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(239, 68, 68, 0.18);
                    text-align: center;
                    transform: scale(0.92) translateY(12px);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    overflow: hidden;
                }

                .gt-gameover-overlay.active .gt-gameover-card {
                    transform: scale(1) translateY(0);
                }

                /* Glowing accent ring at top */
                .gt-gameover-card::before {
                    content: '';
                    position: absolute;
                    top: -60px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 240px;
                    height: 120px;
                    background: radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%);
                    pointer-events: none;
                }

                .gt-gameover-badge {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.12);
                    border: 1.5px solid rgba(239, 68, 68, 0.45);
                    box-shadow: 0 0 24px rgba(239, 68, 68, 0.3);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                    color: #f87171;
                    animation: gtPulseBadge 2s infinite ease-in-out;
                }

                @keyframes gtPulseBadge {
                    0% { transform: scale(1); box-shadow: 0 0 16px rgba(239, 68, 68, 0.25); }
                    50% { transform: scale(1.05); box-shadow: 0 0 28px rgba(239, 68, 68, 0.5); }
                    100% { transform: scale(1); box-shadow: 0 0 16px rgba(239, 68, 68, 0.25); }
                }

                .gt-gameover-title {
                    font-size: 26px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                    color: #ffffff;
                    margin: 0 0 8px 0;
                    text-shadow: 0 2px 12px rgba(239, 68, 68, 0.4);
                }

                .gt-gameover-desc {
                    font-size: 13.5px;
                    color: #94a3b8;
                    line-height: 1.5;
                    margin: 0 0 24px 0;
                }

                .gt-gameover-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                }

                .gt-gameover-btn-primary {
                    width: 100%;
                    height: 42px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    border: 1px solid #f87171;
                    border-radius: 9px;
                    color: #ffffff;
                    font-size: 13.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.38);
                    transition: all 0.15s ease;
                }

                .gt-gameover-btn-primary:hover {
                    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.55);
                    transform: translateY(-1px);
                }

                .gt-gameover-btn-primary:active {
                    transform: translateY(0);
                }

                .gt-gameover-btn-secondary {
                    width: 100%;
                    height: 38px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 9px;
                    color: #cbd5e1;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.15s ease;
                }

                .gt-gameover-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.22);
                    color: #ffffff;
                }

                .gt-gameover-hint {
                    margin-top: 14px;
                    font-size: 11.5px;
                    color: #64748b;
                }

                .gt-gameover-hint kbd {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #94a3b8;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10.5px;
                    font-family: inherit;
                }
            </style>

            <div class="gt-gameover-card">
                <!-- Icon Badge (Tengkorak Modern SVG) -->
                <div class="gt-gameover-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" style="width: 30px; height: 30px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>

                <h2 class="gt-gameover-title">GAME OVER</h2>
                <p class="gt-gameover-desc" id="gt-gameover-msg">
                    Karaktermu telah kehabisan HP.<br/>
                    Jangan menyerah, bangkit kembali dan taklukkan rintangannya!
                </p>

                <div class="gt-gameover-actions">
                    <button class="gt-gameover-btn-primary" id="btn-go-retry">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" style="width: 17px; height: 17px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span id="btn-go-retry-text">Muat Checkpoint Terakhir</span>
                    </button>

                    <button class="gt-gameover-btn-secondary" id="btn-go-menu">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                        <span>Kembali ke Menu Utama</span>
                    </button>
                </div>

                <div class="gt-gameover-hint">
                    Tekan <kbd>Spasi</kbd> atau <kbd>Enter</kbd> untuk langsung mencoba lagi
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind events
        this.btnRetry = this.dom.querySelector('#btn-go-retry');
        this.btnMenu = this.dom.querySelector('#btn-go-menu');
        this.retryTextEl = this.dom.querySelector('#btn-go-retry-text');
        this.msgEl = this.dom.querySelector('#gt-gameover-msg');

        this.btnRetry.addEventListener('click', () => {
            AudioManager.playClick();
            this.handleRetry();
        });

        this.btnMenu.addEventListener('click', () => {
            AudioManager.playClick();
            this.handleMenu();
        });
    }

    show(cfg = {}) {
        this.isOpen = true;
        if (cfg.retryText && this.retryTextEl) {
            this.retryTextEl.textContent = cfg.retryText;
        }
        if (cfg.message && this.msgEl) {
            this.msgEl.innerHTML = cfg.message;
        }

        this.onRetryCallback = cfg.onRetry || null;
        this.onMenuCallback = cfg.onMenu || null;

        this.dom.classList.add('active');

        // Setup keyboard shortcuts
        this.keyListener = (e) => {
            if (!this.isOpen) return;
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.handleRetry();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.handleMenu();
            }
        };
        window.addEventListener('keydown', this.keyListener);
    }

    hide() {
        this.isOpen = false;
        this.dom.classList.remove('active');
        if (this.keyListener) {
            window.removeEventListener('keydown', this.keyListener);
            this.keyListener = null;
        }
    }

    handleRetry() {
        this.hide();
        if (typeof this.onRetryCallback === 'function') {
            this.onRetryCallback();
        } else if (this.scene) {
            this.scene.isGameOver = false;
            this.scene.scene.restart({ isLoadGame: true });
        }
    }

    handleMenu() {
        this.hide();
        if (typeof this.onMenuCallback === 'function') {
            this.onMenuCallback();
        } else if (this.scene) {
            this.scene.isGameOver = false;
            AudioManager.stopAmbientBGM();
            this.scene.scene.start('TitleScene');
        }
    }

    destroy() {
        this.hide();
        if (this.dom && this.dom.parentElement) {
            this.dom.remove();
        }
    }
}
