// ===============================================================
// HTML RPG DIALOG BOX (CRISP DOM OVERLAY)
// ===============================================================
// Mengganti kotak dialog canvas dengan elemen HTML/CSS yang ultra-tajam:
// 1. Badge Nama Pembicara [ Penjaga Gerbang ] di garis atas tengah
// 2. Teks dialog dengan efek ketik (typewriter) & audio beep
// 3. Hint navigasi bawah-kanan: Lanjut [E] / Selesai [E]
// 4. Portrait cutout karakter (jika gambar tersedia & valid)
// 5. Animasi entrance halus, backdrop blur, dan full keyboard/click support
// ===============================================================

import { SettingsManager } from '../utils/SettingsManager.js';
import { AudioManager } from '../utils/AudioManager.js';

export class DialogBox {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];
        this.currentLineIdx = 0;
        this.currentCharIdx = 0;
        this.isTyping = false;
        this.typingTimer = null;
        this.onCompleteCallback = null;
        this.dom = null;
        this.keyboardHandler = null;

        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau restart
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const old = document.getElementById('gt-html-dialog-box');
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = 'gt-html-dialog-box';
        this.dom.className = 'gt-dialog-root';
        this.dom.style.display = 'none';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');

                .gt-dialog-root {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(16px);
                    width: min(720px, calc(100vw - 32px));
                    max-width: 720px;
                    pointer-events: auto;
                    z-index: 999999;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                    opacity: 0;
                    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-dialog-root.visible {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                /* Standing Art / Portrait opsional */
                .gt-dialog-portrait-wrapper {
                    position: absolute;
                    bottom: calc(100% - 15px);
                    left: 24px;
                    width: 140px;
                    height: 140px;
                    pointer-events: none;
                    z-index: 1;
                    display: none;
                    animation: gtPortraitFloat 2.4s ease-in-out infinite;
                }

                @keyframes gtPortraitFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                .gt-dialog-portrait-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.65));
                }

                /* Kotak Utama Dialog (Persis Screenshot) */
                .gt-dialog-card {
                    position: relative;
                    background: rgba(9, 13, 22, 0.96);
                    border: 2px solid #a855f7;
                    border-radius: 6px;
                    padding: 24px 26px 16px 26px;
                    box-shadow: 0 10px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(168, 85, 247, 0.28);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    min-height: 110px;
                    justify-content: space-between;
                    z-index: 2;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .gt-dialog-card:hover {
                    border-color: #c084fc;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85), 0 0 28px rgba(192, 132, 252, 0.35);
                }

                /* Badge Nama Pembicara (Mengambang di garis atas tengah) */
                .gt-dialog-name-badge {
                    position: absolute;
                    top: -14px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1e1035;
                    border: 1.5px solid #c084fc;
                    border-radius: 5px;
                    padding: 3px 22px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
                    white-space: nowrap;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
                }

                /* Teks Dialog Utama */
                .gt-dialog-text {
                    font-size: 14.5px;
                    font-weight: 500;
                    line-height: 1.65;
                    color: #f8fafc;
                    letter-spacing: 0.2px;
                    margin: 8px 0 10px 0;
                    min-height: 48px;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                    word-wrap: break-word;
                }

                /* Kursor Ketik Berkedip */
                .gt-dialog-cursor {
                    display: inline-block;
                    width: 7px;
                    height: 15px;
                    background: #c084fc;
                    margin-left: 3px;
                    vertical-align: middle;
                    animation: gtCursorBlink 0.6s step-end infinite;
                }

                @keyframes gtCursorBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                /* Hint Petunjuk Lanjut / Selesai (Bawah-Kanan) */
                .gt-dialog-hint {
                    align-self: flex-end;
                    font-size: 11px;
                    font-weight: 700;
                    color: #c084fc;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    user-select: none;
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
                    animation: gtHintPulse 1.6s ease-in-out infinite;
                }

                @keyframes gtHintPulse {
                    0%, 100% { opacity: 0.9; }
                    50% { opacity: 1; text-shadow: 0 0 8px rgba(192, 132, 252, 0.6); }
                }
            </style>

            <!-- Portrait Wrapper (Hanya tampil jika ada portrait valid) -->
            <div class="gt-dialog-portrait-wrapper" id="gt-dialog-portrait-wrapper">
                <img class="gt-dialog-portrait-img" id="gt-dialog-portrait-img" src="" alt="" />
            </div>

            <!-- Kartu Dialog -->
            <div class="gt-dialog-card" id="gt-dialog-card">
                <div class="gt-dialog-name-badge" id="gt-dialog-name-badge">NPC</div>
                <div class="gt-dialog-text">
                    <span id="gt-dialog-text-body"></span>
                    <span class="gt-dialog-cursor" id="gt-dialog-cursor"></span>
                </div>
                <div class="gt-dialog-hint" id="gt-dialog-hint">
                    <span id="gt-dialog-hint-text">Lanjut [E]</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.card = this.dom.querySelector('#gt-dialog-card');
        this.nameBadge = this.dom.querySelector('#gt-dialog-name-badge');
        this.textBody = this.dom.querySelector('#gt-dialog-text-body');
        this.cursor = this.dom.querySelector('#gt-dialog-cursor');
        this.hintText = this.dom.querySelector('#gt-dialog-hint-text');
        this.portraitWrapper = this.dom.querySelector('#gt-dialog-portrait-wrapper');
        this.portraitImg = this.dom.querySelector('#gt-dialog-portrait-img');

        // Cegah broken image icon jika gagal load
        if (this.portraitImg) {
            this.portraitImg.onerror = () => {
                if (this.portraitWrapper) this.portraitWrapper.style.display = 'none';
            };
        }

        // Klik pada dialog box untuk advance
        this.card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.advance();
        });

        // Keyboard listener untuk E, Space, Enter saat dialog aktif
        this.keyboardHandler = (e) => {
            if (!this.isOpen()) return;
            const key = e.key ? e.key.toLowerCase() : '';
            if (key === 'e' || key === ' ' || key === 'enter') {
                e.stopPropagation();
                e.preventDefault();
                this.advance();
            }
        };
        window.addEventListener('keydown', this.keyboardHandler, true);
    }

    start(speakerName, lines, onComplete, portraitKey = null) {
        if (!lines || lines.length === 0) return;
        this.lines = Array.isArray(lines) ? lines : [lines];
        this.currentLineIdx = 0;
        this.onCompleteCallback = onComplete;

        if (this.nameBadge) {
            this.nameBadge.textContent = speakerName || 'Karakter';
        }

        // Cek texture portrait hanya jika portraitKey eksplisit diberikan
        if (portraitKey && this.portraitWrapper && this.portraitImg) {
            const pUrl = this.getTextureURL(portraitKey);
            if (pUrl) {
                this.portraitImg.src = pUrl;
                this.portraitWrapper.style.display = 'block';
            } else {
                this.portraitWrapper.style.display = 'none';
            }
        } else if (this.portraitWrapper) {
            this.portraitWrapper.style.display = 'none';
        }

        if (this.dom) {
            this.dom.style.display = 'block';
            void this.dom.offsetWidth;
            this.dom.classList.add('visible');
        }

        this.typeCurrentLine();
    }

    // Alias show({...}) untuk fleksibilitas pemanggilan
    show(options) {
        if (typeof options === 'object' && options !== null && !Array.isArray(options)) {
            return this.start(options.name || options.speakerName, options.lines || options.dialog, options.onComplete, options.portraitKey);
        }
        return this.start(...arguments);
    }

    getTextureURL(key) {
        if (!key || !this.scene || !this.scene.textures) return null;
        if (!this.scene.textures.exists(key)) return null;
        try {
            const texture = this.scene.textures.get(key);
            const srcImg = texture.getSourceImage();
            if (srcImg && srcImg.src && srcImg.src.length > 5) {
                return srcImg.src;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    typeCurrentLine() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }

        const fullText = this.lines[this.currentLineIdx] || '';
        this.currentCharIdx = 0;
        this.isTyping = true;

        if (this.textBody) this.textBody.textContent = '';
        if (this.cursor) this.cursor.style.display = 'inline-block';
        if (this.hintText) this.hintText.textContent = 'Mengetik...';

        const speed = SettingsManager.dialogueSpeedFast ? 10 : 32;

        this.typingTimer = setInterval(() => {
            this.currentCharIdx++;
            if (this.textBody) {
                this.textBody.textContent = fullText.substring(0, this.currentCharIdx);
            }

            if (this.currentCharIdx % 3 === 0) {
                AudioManager.playDialogBeep();
            }

            if (this.currentCharIdx >= fullText.length) {
                this.finishTyping();
            }
        }, speed);
    }

    finishTyping() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }
        const fullText = this.lines[this.currentLineIdx] || '';
        if (this.textBody) this.textBody.textContent = fullText;
        if (this.cursor) this.cursor.style.display = 'none';
        this.isTyping = false;

        const isLast = this.currentLineIdx >= this.lines.length - 1;
        if (this.hintText) {
            this.hintText.textContent = isLast ? 'Selesai [E]' : 'Lanjut [E]';
        }
    }

    advance() {
        if (!this.isOpen()) return;

        if (this.isTyping) {
            // Langsung tampilkan seluruh teks baris jika diklik saat sedang mengetik
            this.finishTyping();
            return;
        }

        AudioManager.playClick();
        this.currentLineIdx++;
        if (this.currentLineIdx < this.lines.length) {
            this.typeCurrentLine();
        } else {
            this.close();
        }
    }

    close() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }
        this.isTyping = false;

        if (this.dom) {
            this.dom.classList.remove('visible');
            setTimeout(() => {
                if (!this.isOpen() && this.dom) {
                    this.dom.style.display = 'none';
                }
            }, 210);
        }

        if (this.onCompleteCallback) {
            const cb = this.onCompleteCallback;
            this.onCompleteCallback = null;
            cb();
        }
    }

    isOpen() {
        return !!(this.dom && this.dom.classList.contains('visible'));
    }

    destroy() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }
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
