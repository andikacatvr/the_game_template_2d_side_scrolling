// ===============================================================
// HTML INTERACTION PROMPT OVERLAY (CRISP DOM PROMPT)
// ===============================================================
// Menampilkan tulisan interaksi [E] Talk/Bicara di atas NPC
// menggunakan HTML/CSS murni tanpa kotak latar kaku (boxless),
// dengan font tajam, animasi floating halus, dan glow modern.
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';

export class HTMLInteractPrompt {
    constructor(scene) {
        this.scene = scene;
        this.dom = null;
        this.targetX = 0;
        this.targetY = 0;
        this.isVisible = false;
        this.onInteract = null;

        this.createDOM();

        // Hook update kamera setiap render frame
        this.updateCallback = () => this.updatePosition();
        this.scene.events.on('postupdate', this.updateCallback);

        // Bersihkan otomatis saat scene berganti atau restart
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const id = 'gt-interact-prompt-overlay';
        const old = document.getElementById(id);
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = id;
        this.dom.className = 'gt-interact-prompt-root';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap');

                .gt-interact-prompt-root {
                    position: fixed;
                    top: 0;
                    left: 0;
                    transform: translate(-50%, -100%);
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    z-index: 99980;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                    opacity: 0;
                    transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                    cursor: pointer;
                }

                .gt-interact-prompt-root.visible {
                    opacity: 1;
                    pointer-events: auto;
                    animation: gtPromptFloat 1.8s ease-in-out infinite;
                }

                .gt-interact-prompt-root:hover {
                    animation-play-state: paused;
                    transform: translate(-50%, -100%) scale(1.08);
                }

                .gt-interact-prompt-root:active {
                    transform: translate(-50%, -100%) scale(0.95);
                }

                @keyframes gtPromptFloat {
                    0%, 100% {
                        transform: translate(-50%, -100%) translateY(0);
                    }
                    50% {
                        transform: translate(-50%, -100%) translateY(-4px);
                    }
                }

                /* Keycap Minimalis [E] */
                .gt-prompt-kbd {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    font-size: 11px;
                    font-weight: 800;
                    color: #ffffff;
                    background: rgba(15, 23, 42, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.35);
                    border-radius: 5px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    letter-spacing: 0;
                    transition: all 0.15s ease;
                }

                .gt-interact-prompt-root:hover .gt-prompt-kbd {
                    border-color: #c084fc;
                    box-shadow: 0 0 10px rgba(192, 132, 252, 0.5);
                    color: #e9d5ff;
                }

                /* Teks Interaksi Tanpa Kotak */
                .gt-prompt-label {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 12px rgba(192, 132, 252, 0.4);
                    transition: color 0.15s ease, text-shadow 0.15s ease;
                    white-space: nowrap;
                }

                .gt-interact-prompt-root:hover .gt-prompt-label {
                    color: #f3e8ff;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 14px rgba(192, 132, 252, 0.8);
                }
            </style>

            <kbd class="gt-prompt-kbd" id="gt-prompt-key">E</kbd>
            <span class="gt-prompt-label" id="gt-prompt-label">Talk</span>
        `;

        document.body.appendChild(this.dom);

        this.keyElem = this.dom.querySelector('#gt-prompt-key');
        this.labelElem = this.dom.querySelector('#gt-prompt-label');

        this.dom.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            if (typeof this.onInteract === 'function') {
                this.onInteract();
            } else if (typeof this.scene.handleInteract === 'function') {
                this.scene.handleInteract();
            }
        });
    }

    show(worldX, worldY, label = 'Talk', onInteract = null, key = 'E') {
        this.targetX = worldX;
        this.targetY = worldY;
        this.onInteract = onInteract;

        if (this.labelElem && this.labelElem.textContent !== label) {
            this.labelElem.textContent = label;
        }
        if (this.keyElem && this.keyElem.textContent !== key) {
            this.keyElem.textContent = key;
        }

        if (!this.isVisible) {
            this.isVisible = true;
            if (this.dom) this.dom.classList.add('visible');
        }

        this.updatePosition();
    }

    hide() {
        if (this.isVisible) {
            this.isVisible = false;
            if (this.dom) this.dom.classList.remove('visible');
        }
    }

    updatePosition() {
        if (!this.isVisible || !this.dom || !this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

        const cam = this.scene.cameras.main;
        if (!cam.matrixCombined) return;

        // Transform world coordinate ke camera viewport coordinate
        const p = cam.matrixCombined.transformPoint(this.targetX, this.targetY);

        const canvas = this.scene.game.canvas;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / this.scene.scale.width;
        const scaleY = rect.height / this.scene.scale.height;

        const screenX = rect.left + p.x * scaleX;
        const screenY = rect.top + p.y * scaleY;

        this.dom.style.left = `${Math.round(screenX)}px`;
        this.dom.style.top = `${Math.round(screenY)}px`;
    }

    destroy() {
        if (this.updateCallback && this.scene && this.scene.events) {
            this.scene.events.off('postupdate', this.updateCallback);
            this.updateCallback = null;
        }
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
