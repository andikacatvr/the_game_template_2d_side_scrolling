// ===============================================================
// RETRO 2D CHAT BOX & COMMAND CONSOLE
// ===============================================================
// UI Chat Log & Command Console Interaktif:
// 1. Panel Cyan/Teal Semi-transparan dengan border Navy & Bevel Cyan
// 2. Font Retro dengan Text-Shadow Black Outline (sangat jelas & kontras)
// 3. Format Baris: [i] (Info), [W] (World), [HH:MM:SS], <NamaPemain>, Teks Warna (Hijau, Biru, Kuning, Putih)
// 4. Handle Tab Hamburger (≡) di tengah bawah
// 5. Dukungan Kode Warna Retro: \1 (cyan), \2 (hijau), \3 (biru), \4 (merah), \5 (pink), \6 (oranye), \7 (abu), \8 (hitam), \9 (kuning), \w (putih)
// 6. Keyboard isolasi: Karakter tidak bergerak saat mengetik chat
// 7. Dukungan Command (/help, /learn, /create, /tp, /speed, /jump, /hp, /god, /zoom, /clear)
// ===============================================================

import { CodeInspector } from './CodeInspector.js';
import { CONFIG_SKELETON } from '../../cerita.js';

export class CommandConsole {
    static instance = null;

    constructor() {
        if (CommandConsole.instance) {
            CommandConsole.instance.height = 138;
            CommandConsole.instance.isMinimized = false;
            CommandConsole.instance.initDOM();
            return CommandConsole.instance;
        }
        CommandConsole.instance = this;

        this.isOpen = true; // Default terbuka
        this.height = 138;  // Tinggi default sesuai gambar (header + 1 baris pesan + input bar)
        this.minHeight = 96;
        this.maxHeight = Math.min(window.innerHeight * 0.85, 800);
        this.isMinimized = false;
        this.savedHeight = 380;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartH = 0;

        this.history = [];
        this.historyIdx = -1;

        // Daftar warna chat bergantian jika pemain tidak memakai kode warna
        this.chatColors = ['#48ea58', '#56d6f5', '#ffea3b', '#ffffff'];
        this.colorIdx = 0;

        this.playerName = (CONFIG_SKELETON && CONFIG_SKELETON.player && CONFIG_SKELETON.player.nama) || 'Player';

        this.initDOM();
        this.setupKeyListeners();
        // Sembunyikan default saat di menu utama
        this.setVisible(false, false);
    }

    static init() {
        if (!CommandConsole.instance && typeof document !== 'undefined') {
            new CommandConsole();
        }
    }

    static show(openPanel = true, focusInput = false) {
        if (CommandConsole.instance) {
            CommandConsole.instance.setVisible(true, openPanel, focusInput);
        }
    }

    static hide() {
        if (CommandConsole.instance) {
            CommandConsole.instance.setVisible(false, false);
        }
    }

    setVisible(visible, openPanel = true, focusInput = false) {
        if (!visible) {
            this.isOpen = false;
            if (this.container) {
                this.container.style.display = 'none';
                this.container.classList.add('collapsed');
            }
            if (this.floatingBtn) {
                this.floatingBtn.style.display = 'none';
                this.floatingBtn.classList.remove('active');
            }
            if (this.inputEl) {
                this.inputEl.blur();
            }
            this.togglePhaserInput(true);
            return;
        }

        // Jika visible = true
        if (this.container) {
            this.container.style.display = '';
        }
        if (openPanel) {
            this.open(focusInput);
        } else {
            this.close();
        }
    }

    // Mendapatkan timestamp format [HH:MM:SS]
    static getTimestamp() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
    }

    initDOM() {
        // Hapus elemen lama jika ada (agar HMR / reload langsung menerapkan ukuran baru)
        const oldEl = document.getElementById('gt-command-console');
        if (oldEl) oldEl.remove();
        const oldBtn = document.getElementById('gt-floating-btn');
        if (oldBtn) oldBtn.remove();

        // Kontainer Utama Console Drawer
        this.container = document.createElement('div');
        this.container.id = 'gt-command-console';
        this.container.innerHTML = `
            <style>
                /* Font import Nunito untuk kesan rounded jelas */
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');

                #gt-command-console {
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                    width: min(650px, calc(100vw - 32px));
                    z-index: 99999;
                    font-family: 'Nunito', 'Century Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    box-sizing: border-box;
                    pointer-events: auto;
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: text;
                    -webkit-user-select: text;
                    transform-origin: bottom right;
                }

                #gt-command-console.collapsed {
                    opacity: 0;
                    transform: scale(0.9) translateY(16px);
                    pointer-events: none !important;
                }

                #gt-command-console.dragging {
                    transition: none !important;
                }

                /* =============================================================== */
                /* PANEL BODY: TRANSLUCENT TEAL GLASS (TEMBUS PANDANG)             */
                /* =============================================================== */
                .gt-console-panel {
                    background: linear-gradient(180deg, rgba(14, 55, 72, 0.7) 0%, rgba(8, 34, 46, 0.8) 100%);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 2px solid rgba(73, 191, 222, 0.7);
                    box-shadow: inset 0 0 0 1px rgba(73, 191, 222, 0.2), 0 14px 40px rgba(0, 0, 0, 0.7);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    height: 138px;
                    width: 100%;
                    position: relative;
                    box-sizing: border-box;
                    overflow: hidden;
                    transition: height 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                #gt-command-console.resizing .gt-console-panel,
                #gt-command-console.dragging .gt-console-panel {
                    transition: none !important;
                }

                /* Header Console - Drag Bar */
                .gt-console-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 14px;
                    border-bottom: 1.5px solid rgba(73, 191, 222, 0.3);
                    background: rgba(11, 40, 52, 0.7);
                    border-top-left-radius: 10px;
                    border-top-right-radius: 10px;
                    user-select: none;
                    cursor: grab;
                }

                .gt-console-header:active {
                    cursor: grabbing;
                }

                .gt-header-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .gt-mini-badge {
                    background: #f59e0b;
                    border: 1px solid #162b37;
                    color: #0f172a;
                    font-weight: 900;
                    font-size: 11.5px;
                    padding: 2px 7px;
                    border-radius: 4px;
                    text-shadow: none;
                    letter-spacing: 0.5px;
                    flex-shrink: 0;
                }

                .gt-header-title {
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #e0f7fe;
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .gt-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .gt-btn-tool {
                    background: linear-gradient(180deg, #3dbde2 0%, #1b7a97 100%);
                    border: 1.5px solid #162b37;
                    color: #ffffff;
                    border-radius: 5px;
                    padding: 4px 12px;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 2px 0 #10232e;
                    text-shadow: 1px 1px 0 #000;
                    transition: transform 0.08s, filter 0.1s;
                    font-family: inherit;
                }

                .gt-btn-tool:hover {
                    filter: brightness(1.15);
                }

                .gt-btn-tool:active {
                    transform: translateY(1px);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 0 #10232e;
                }


                /* =============================================================== */
                /* LOG HISTORY AREA (TEKS RETRO BORDER HITAM)                      */
                /* =============================================================== */
                .gt-console-logs {
                    flex: 1;
                    overflow-y: auto;
                    padding: 4px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    font-size: 16px;
                    font-weight: 800;
                    line-height: 1.4;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                    scroll-behavior: smooth;
                    /* Black crisp comic outline */
                    text-shadow:
                        -1px -1px 0 #000,
                         1px -1px 0 #000,
                        -1px  1px 0 #000,
                         1px  1px 0 #000,
                         0 1.5px 1.5px rgba(0,0,0,0.85);
                }

                .gt-console-logs::-webkit-scrollbar {
                    width: 7px;
                }
                .gt-console-logs::-webkit-scrollbar-thumb {
                    background: rgba(22, 43, 55, 0.85);
                    border: 1px solid #49bfde;
                    border-radius: 4px;
                }
                .gt-console-logs::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.15);
                }

                .gt-log-line {
                    word-break: break-word;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 4px;
                }

                /* Badges & Tags */
                .gt-badge-info {
                    color: #64e5ff;
                    font-weight: 800;
                }
                .gt-badge-world {
                    color: #ffa024;
                    font-weight: 900;
                }
                .gt-timestamp {
                    color: #d0f4ff;
                    font-size: 14.5px;
                }
                .gt-sender {
                    color: #ffffff;
                    font-weight: 800;
                }
                .gt-sender-dr {
                    color: #ff4d4d;
                    font-weight: 800;
                }
                .gt-sender-mod {
                    color: #4ade80;
                    font-weight: 900;
                }

                /* Retro Colors */
                .gt-c-green { color: #48ea58; }
                .gt-c-cyan { color: #56d6f5; }
                .gt-c-yellow { color: #ffea3b; }
                .gt-c-white { color: #ffffff; }
                .gt-c-red { color: #ff4d4d; }
                .gt-c-orange { color: #ffa024; }
                .gt-c-pink { color: #f472b6; }
                .gt-c-grey { color: #cbd5e1; }

                /* Code Snippet Box for /learn */
                .gt-code-card {
                    background: rgba(10, 31, 41, 0.95);
                    border: 2px solid #38bdf8;
                    box-shadow: 0 4px 18px rgba(0,0,0,0.5);
                    border-radius: 6px;
                    margin: 6px 0;
                    padding: 10px 14px;
                    font-family: 'Consolas', monospace;
                    text-shadow: none !important;
                }

                .gt-code-header {
                    display: flex;
                    justify-content: space-between;
                    color: #38bdf8;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .gt-code-desc {
                    color: #cbd5e1;
                    font-size: 13px;
                    margin-bottom: 8px;
                    font-family: 'Nunito', sans-serif;
                }

                .gt-code-content {
                    background: #041219;
                    color: #7be6ff;
                    padding: 10px 12px;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-size: 13.5px !important;
                    line-height: 1.5;
                    white-space: pre;
                    border: 1px solid #163847;
                }

                /* =============================================================== */
                /* =============================================================== */
                /* INPUT BAR                                                        */
                /* =============================================================== */
                .gt-console-input-bar {
                    display: flex;
                    align-items: center;
                    background: rgba(8, 30, 42, 0.7);
                    border-top: 1.5px solid rgba(73, 191, 222, 0.3);
                    border-bottom-left-radius: 10px;
                    border-bottom-right-radius: 10px;
                    padding: 8px 12px;
                    gap: 10px;
                }

                .gt-input {
                    flex: 1;
                    background: rgba(5, 20, 28, 0.75);
                    border: 2px solid rgba(40, 99, 117, 0.7);
                    border-radius: 6px;
                    color: #ffffff;
                    font-size: 17px !important;
                    font-weight: 700;
                    height: 46px;
                    padding: 0 14px;
                    outline: none;
                    font-family: inherit;
                    box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                }

                .gt-input:focus {
                    border-color: #49bfde;
                    background: rgba(8, 32, 45, 0.95);
                    box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 0 10px rgba(73, 191, 222, 0.3);
                }

                .gt-input::placeholder {
                    color: #8bb3c2;
                    font-size: 15px;
                    font-weight: normal;
                    text-shadow: none;
                }

                .gt-btn-send {
                    background: linear-gradient(180deg, #3dbde2 0%, #1a7693 100%);
                    color: #ffffff;
                    border: 2px solid #162b37;
                    border-radius: 6px;
                    padding: 0 22px;
                    height: 46px;
                    font-size: 15.5px !important;
                    font-weight: 900;
                    cursor: pointer;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 3px 0 #10232e;
                    text-shadow: 1px 1px 0 #000;
                    font-family: inherit;
                    letter-spacing: 0.5px;
                    transition: transform 0.08s, filter 0.1s;
                }

                .gt-btn-send:hover {
                    filter: brightness(1.15);
                }

                .gt-btn-send:active {
                    transform: translateY(1px);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 0 #10232e;
                }

                /* Corner Resizer di pojok kanan bawah */
                .gt-console-resizer {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 16px;
                    height: 16px;
                    cursor: nwse-resize;
                    display: flex;
                    align-items: flex-end;
                    justify-content: flex-end;
                    padding: 2px;
                    user-select: none;
                    touch-action: none;
                    z-index: 50;
                }

                .gt-console-resizer::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    border-right: 2.5px solid rgba(73, 191, 222, 0.85);
                    border-bottom: 2.5px solid rgba(73, 191, 222, 0.85);
                    border-radius: 1px;
                }

                /* Multi-directional Resize Handles (Kiri, Atas, Sudut Kiri-Atas) */
                .gt-resizer-left {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: -7px;
                    width: 14px;
                    cursor: ew-resize;
                    z-index: 50;
                    touch-action: none;
                    user-select: none;
                    border-left: 2px solid transparent;
                    transition: border-color 0.15s, background 0.15s;
                }
                .gt-resizer-left:hover, .gt-resizer-left.active {
                    background: rgba(56, 189, 248, 0.25);
                    border-left: 3px solid #38bdf8;
                }

                .gt-resizer-top {
                    position: absolute;
                    left: 0;
                    right: 0;
                    top: -7px;
                    height: 14px;
                    cursor: ns-resize;
                    z-index: 50;
                    touch-action: none;
                    user-select: none;
                    border-top: 2px solid transparent;
                    transition: border-color 0.15s, background 0.15s;
                }
                .gt-resizer-top:hover, .gt-resizer-top.active {
                    background: rgba(56, 189, 248, 0.25);
                    border-top: 3px solid #38bdf8;
                }

                .gt-resizer-topleft {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 16px;
                    height: 16px;
                    cursor: nwse-resize;
                    z-index: 55;
                    touch-action: none;
                    user-select: none;
                    border-top: 2.5px solid transparent;
                    border-left: 2.5px solid transparent;
                    border-top-left-radius: 10px;
                    transition: border-color 0.15s, background 0.15s;
                }
                .gt-resizer-topleft:hover, .gt-resizer-topleft.active {
                    border-color: #38bdf8;
                    background: rgba(56, 189, 248, 0.35);
                }

                /* =============================================================== */
                /* TOMBOL TOGGLE FLOATING DI KANAN BAWAH                           */
                /* =============================================================== */
                .gt-floating-btn {
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                    z-index: 99998;
                    background: linear-gradient(180deg, rgba(61, 189, 226, 0.9) 0%, rgba(27, 122, 151, 0.95) 100%);
                    border: 2px solid #162b37;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.55);
                    border-radius: 20px;
                    color: #ffffff;
                    padding: 8px 18px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-family: 'Nunito', sans-serif;
                    font-size: 14.5px;
                    font-weight: 800;
                    text-shadow: 1px 1px 0 #000;
                    transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), filter 0.15s, box-shadow 0.15s;
                    pointer-events: auto;
                    user-select: none;
                }

                .gt-floating-btn:hover {
                    transform: translateY(-2px) scale(1.04);
                    filter: brightness(1.15);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(61, 189, 226, 0.5);
                }

                .gt-floating-btn:active {
                    transform: translateY(1px) scale(0.97);
                }

                .gt-floating-btn.active {
                    background: linear-gradient(180deg, rgba(245, 158, 11, 0.92) 0%, rgba(180, 83, 9, 0.95) 100%);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(245, 158, 11, 0.5);
                }
            </style>

            <div class="gt-console-panel">
                <!-- Handles Resize Multi-Arah: Kiri ke Kanan, Atas ke Bawah, Sudut Kiri-Atas -->
                <div class="gt-resizer gt-resizer-left" title="Tarik kiri-kanan untuk mengubah / memperkecil lebar"></div>
                <div class="gt-resizer gt-resizer-top" title="Tarik atas-bawah untuk mengubah / memperkecil tinggi"></div>
                <div class="gt-resizer gt-resizer-topleft" title="Tarik sudut kiri-atas untuk ubah ukuran bebas"></div>

                <div class="gt-console-header">
                    <div class="gt-header-left">
                        <span class="gt-mini-badge">CHAT</span>
                        <span class="gt-header-title">CHAT &amp; COMMAND CONSOLE</span>
                    </div>
                    <div class="gt-header-actions">
                        <button class="gt-btn-tool" id="gt-btn-quick-inspect" style="background: linear-gradient(180deg, #f59e0b 0%, #b45309 100%);">/inspect</button>
                        <button class="gt-btn-tool" id="gt-btn-quick-learn">/learn</button>
                        <button class="gt-btn-tool" id="gt-btn-quick-help">/help</button>
                        <button class="gt-btn-tool" id="gt-btn-clear">Clear</button>
                        <button class="gt-btn-tool" id="gt-btn-minimize" title="Minimize / Perkecil chat box">−</button>
                        <button class="gt-btn-tool" id="gt-btn-toggle" title="Tutup Chat Bar">X</button>
                    </div>
                </div>

                <div class="gt-console-logs" id="gt-logs"></div>

                <div class="gt-console-input-bar">
                    <input type="text" class="gt-input" id="gt-input-cmd" placeholder="Type a chat message or command (/inspect, /help, /learn, /tp, /god)..." autocomplete="off" />
                    <button class="gt-btn-send" id="gt-btn-send">SEND ↵</button>
                </div>

                <!-- Corner Resizer -->
                <div class="gt-console-resizer" title="Tarik untuk mengubah ukuran"></div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Tombol Floating Chat Bar terpisah di body (hanya tampil saat panel ditutup [X])
        this.floatingBtn = document.createElement('button');
        this.floatingBtn.id = 'gt-floating-btn';
        this.floatingBtn.className = 'gt-floating-btn';
        this.floatingBtn.style.display = 'none'; // Sembunyi default karena panel sudah terbuka
        this.floatingBtn.title = 'Buka Chat Bar (Tekan Enter atau /)';
        this.floatingBtn.innerHTML = `
            <span>&gt;_</span>
            <span class="gt-btn-text">Chat Bar</span>
        `;
        document.body.appendChild(this.floatingBtn);

        // Cache elemen penting
        this.panel = this.container.querySelector('.gt-console-panel');
        this.logsContainer = this.container.querySelector('#gt-logs');
        this.inputEl = this.container.querySelector('#gt-input-cmd');
        this.toggleBtn = this.container.querySelector('#gt-btn-toggle');

        // Event Buttons
        this.container.querySelector('#gt-btn-clear').addEventListener('click', () => this.clearLogs());
        this.container.querySelector('#gt-btn-quick-inspect').addEventListener('click', () => {
            if (this.isMinimized) this.toggleMinimize(false);
            this.runCommand('/inspect');
        });
        this.container.querySelector('#gt-btn-quick-help').addEventListener('click', () => {
            if (this.isMinimized) this.toggleMinimize(false);
            this.runCommand('/help');
        });
        this.container.querySelector('#gt-btn-quick-learn').addEventListener('click', () => {
            if (this.isMinimized) this.toggleMinimize(false);
            this.runCommand('/learn');
        });
        this.container.querySelector('#gt-btn-send').addEventListener('click', () => this.handleSubmit());
        this.toggleBtn.addEventListener('click', () => this.close());
        this.floatingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.isOpen) {
                this.open(true);
            } else {
                // Jika chat bar sudah terbuka, pastikan tetap terbuka dan fokuskan ke input
                this.togglePhaserInput(false);
                this.inputEl.focus();
            }
        });

        // Tombol Minimize & Double-Click Header untuk minimize/restore
        this.minimizeBtn = this.container.querySelector('#gt-btn-minimize');
        if (this.minimizeBtn) {
            this.minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
        }
        if (this.container.querySelector('.gt-console-header')) {
            this.container.querySelector('.gt-console-header').addEventListener('dblclick', () => this.toggleMinimize());
        }

        // Terapkan status awal: mode mini-chat (tinggi 138px dengan 1-2 baris pesan)
        this.panel.style.height = '138px';
        this.logsContainer.style.display = 'flex';
        if (this.minimizeBtn) {
            this.minimizeBtn.textContent = '−';
            this.minimizeBtn.title = 'Minimize / Perkecil Chat Bar';
        }

        // Setup Window Drag & Multi-Resizer (Kiri, Atas, Pojok)
        this.setupWindowDrag();
        this.setupResizer();
        this.printWelcome();
    }

    setupWindowDrag() {
        const header = this.container.querySelector('.gt-console-header');
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        const onPointerDown = (clientX, clientY, target) => {
            if (target.closest('.gt-header-actions') || target.closest('button')) return;
            isDragging = true;
            startX = clientX;
            startY = clientY;

            const rect = this.container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            this.container.style.left = `${initialLeft}px`;
            this.container.style.top = `${initialTop}px`;
            this.container.style.right = 'auto';
            this.container.style.bottom = 'auto';
            this.container.style.transform = '';

            this.container.classList.add('dragging');
            header.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        };

        const onPointerMove = (clientX, clientY) => {
            if (!isDragging) return;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;

            const maxLeft = window.innerWidth - this.container.offsetWidth - 10;
            const maxTop = window.innerHeight - this.container.offsetHeight - 10;
            newLeft = Math.max(10, Math.min(maxLeft, newLeft));
            newTop = Math.max(10, Math.min(maxTop, newTop));

            this.container.style.left = `${newLeft}px`;
            this.container.style.top = `${newTop}px`;
        };

        const onPointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            this.container.classList.remove('dragging');
            header.style.cursor = 'grab';
            document.body.style.userSelect = '';
        };

        header.addEventListener('mousedown', (e) => {
            onPointerDown(e.clientX, e.clientY, e.target);
            const moveH = (ev) => onPointerMove(ev.clientX, ev.clientY);
            const upH = () => {
                window.removeEventListener('mousemove', moveH);
                window.removeEventListener('mouseup', upH);
                onPointerUp();
            };
            window.addEventListener('mousemove', moveH);
            window.addEventListener('mouseup', upH);
        });

        header.addEventListener('touchstart', (e) => {
            if (!e.touches[0]) return;
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
            const moveH = (ev) => {
                if (ev.touches[0]) onPointerMove(ev.touches[0].clientX, ev.touches[0].clientY);
            };
            const upH = () => {
                window.removeEventListener('touchmove', moveH);
                window.removeEventListener('touchend', upH);
                onPointerUp();
            };
            window.addEventListener('touchmove', moveH, { passive: true });
            window.addEventListener('touchend', upH);
        }, { passive: true });
    }

    toggleMinimize(forceState = null) {
        const currentH = this.panel.offsetHeight;
        if (currentH > 160) {
            // Sedang di-expand besar -> ciutkan ke mode mini-chat (138px)
            this.savedHeight = currentH;
            this.panel.style.height = '138px';
            this.logsContainer.style.display = 'flex';
            this.isMinimized = false;
            if (this.minimizeBtn) {
                this.minimizeBtn.textContent = '−';
                this.minimizeBtn.title = 'Minimize / Perkecil Chat Bar';
            }
        } else if (currentH > 110) {
            // Sedang di mode mini-chat (138px) -> ciutkan ke ultra-compact (96px, sembunyikan log)
            this.panel.style.height = '96px';
            this.logsContainer.style.display = 'none';
            this.isMinimized = true;
            if (this.minimizeBtn) {
                this.minimizeBtn.textContent = '+';
                this.minimizeBtn.title = 'Restore / Perbesar Chat Bar';
            }
        } else {
            // Sedang di mode ultra-compact (96px) -> kembalikan ke mode mini-chat (138px)
            this.panel.style.height = '138px';
            this.logsContainer.style.display = 'flex';
            this.isMinimized = false;
            if (this.minimizeBtn) {
                this.minimizeBtn.textContent = '−';
                this.minimizeBtn.title = 'Minimize / Perkecil Chat Bar';
            }
            if (this.logsContainer) {
                this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
            }
        }
    }

    setupResizer() {
        const resizerBR = this.container.querySelector('.gt-console-resizer');
        const resizerLeft = this.container.querySelector('.gt-resizer-left');
        const resizerTop = this.container.querySelector('.gt-resizer-top');
        const resizerTopLeft = this.container.querySelector('.gt-resizer-topleft');

        let isResizing = false;
        let mode = ''; // 'br', 'left', 'top', 'topleft'
        let startX = 0, startY = 0;
        let startW = 0, startH = 0;
        let startLeft = 0, startTop = 0;
        let isFreePos = false;

        const onStart = (clientX, clientY, resizeMode) => {
            isResizing = true;
            mode = resizeMode;
            startX = clientX;
            startY = clientY;
            startW = this.container.offsetWidth;
            startH = this.panel.offsetHeight;

            const rect = this.container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            isFreePos = (this.container.style.right === 'auto');

            this.container.classList.add('resizing');
            document.body.style.userSelect = 'none';

            if (mode === 'left') document.body.style.cursor = 'ew-resize';
            else if (mode === 'top') document.body.style.cursor = 'ns-resize';
            else document.body.style.cursor = 'nwse-resize';
        };

        const onMove = (clientX, clientY) => {
            if (!isResizing) return;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newW = startW;
            let newH = startH;

            // 1. Tarik dari Sisi Kiri (kiri ke kanan = perkecil lebar / minimize)
            if (mode === 'left' || mode === 'topleft') {
                newW = Math.max(340, Math.min(window.innerWidth - 30, startW - deltaX));
                if (isFreePos) {
                    const newLeft = startLeft + (startW - newW);
                    this.container.style.left = `${Math.max(10, newLeft)}px`;
                }
            }

            // 2. Tarik dari Sisi Atas (atas ke bawah = perkecil tinggi / minimize)
            if (mode === 'top' || mode === 'topleft') {
                newH = Math.max(104, Math.min(window.innerHeight - 50, startH - deltaY));
                if (isFreePos) {
                    const newTop = startTop + (startH - newH);
                    this.container.style.top = `${Math.max(10, newTop)}px`;
                }
            }

            // 3. Tarik dari Sudut Kanan-Bawah (tradisional)
            if (mode === 'br') {
                newW = Math.max(340, Math.min(window.innerWidth - 30, startW + deltaX));
                newH = Math.max(104, Math.min(window.innerHeight - 50, startH + deltaY));
            }

            this.container.style.width = `${newW}px`;
            this.panel.style.height = `${newH}px`;

            // Sinkronkan status minimize dengan tinggi drag
            if (newH > 160) {
                this.savedHeight = newH;
                this.isMinimized = false;
                this.logsContainer.style.display = 'flex';
                if (this.minimizeBtn) {
                    this.minimizeBtn.textContent = '−';
                    this.minimizeBtn.title = 'Minimize / Perkecil Chat Bar';
                }
            } else if (newH <= 110) {
                this.isMinimized = true;
                this.logsContainer.style.display = 'none';
                if (this.minimizeBtn) {
                    this.minimizeBtn.textContent = '+';
                    this.minimizeBtn.title = 'Restore / Perbesar Chat Bar';
                }
            } else {
                this.isMinimized = false;
                this.logsContainer.style.display = 'flex';
                if (this.minimizeBtn) {
                    this.minimizeBtn.textContent = '−';
                    this.minimizeBtn.title = 'Minimize / Perkecil Chat Bar';
                }
            }
            this.height = newH;

            // Sembunyikan logs otomatis jika diperkecil sangat pendek (di bawah 130px)
            if (newH <= 130) {
                this.logsContainer.style.display = 'none';
            } else {
                this.logsContainer.style.display = 'flex';
            }
        };

        const onUp = () => {
            if (!isResizing) return;
            isResizing = false;
            this.container.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        const bindHandle = (el, resizeMode) => {
            if (!el) return;
            el.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                onStart(e.clientX, e.clientY, resizeMode);
                const moveH = (ev) => onMove(ev.clientX, ev.clientY);
                const upH = () => {
                    window.removeEventListener('mousemove', moveH);
                    window.removeEventListener('mouseup', upH);
                    onUp();
                };
                window.addEventListener('mousemove', moveH);
                window.addEventListener('mouseup', upH);
            });

            el.addEventListener('touchstart', (e) => {
                if (!e.touches[0]) return;
                onStart(e.touches[0].clientX, e.touches[0].clientY, resizeMode);
                const moveH = (ev) => {
                    if (ev.touches[0]) onMove(ev.touches[0].clientX, ev.touches[0].clientY);
                };
                const upH = () => {
                    window.removeEventListener('touchmove', moveH);
                    window.removeEventListener('touchend', upH);
                    onUp();
                };
                window.addEventListener('touchmove', moveH, { passive: true });
                window.addEventListener('touchend', upH);
            }, { passive: true });
        };

        bindHandle(resizerLeft, 'left');
        bindHandle(resizerTop, 'top');
        bindHandle(resizerTopLeft, 'topleft');
        bindHandle(resizerBR, 'br');
    }

    setupKeyListeners() {
        // Global shortcut: tekan Enter atau '/' untuk membuka & fokus ke chat bar
        window.addEventListener('keydown', (e) => {
            if (e.target && e.target.tagName === 'INPUT' && e.target !== this.inputEl) {
                return;
            }

            if (!this.isOpen) {
                if (e.key === '/' || e.key === 'Enter') {
                    e.preventDefault();
                    this.open(true);
                    if (e.key === '/') {
                        this.inputEl.value = '/';
                    }
                }
            } else {
                if (e.key === '/' || e.key === 'Enter') {
                    if (document.activeElement !== this.inputEl) {
                        e.preventDefault();
                        this.inputEl.focus();
                        this.togglePhaserInput(false);
                        if (e.key === '/') {
                            this.inputEl.value = '/';
                        }
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (document.activeElement === this.inputEl) {
                        this.inputEl.blur();
                        this.togglePhaserInput(true);
                    } else {
                        this.close();
                    }
                }
            }
        });

        // Key listener khusus di dalam input bar
        this.inputEl.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Cegah event bocor ke karakter Phaser!

            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.inputEl.blur();
                this.togglePhaserInput(true);
            }
        });

        // Saat input fokus (pemain mulai mengetik): matikan kontrol karakter agar WASD tidak bikin lari/lompat
        this.inputEl.addEventListener('focus', () => {
            this.togglePhaserInput(false);
        });

        // Saat input blur (pemain keluar dari input bar / klik game): kembalikan kontrol karakter segera!
        this.inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                this.togglePhaserInput(true);
            }, 30);
        });

        // Klik di manapun di layar game (di luar chat bar) otomatis melepaskan fokus input dan mengaktifkan karakter
        window.addEventListener('pointerdown', (e) => {
            if (this.container && !this.container.contains(e.target)) {
                if (document.activeElement === this.inputEl) {
                    this.inputEl.blur();
                    this.togglePhaserInput(true);
                }
            }
        });
    }

    togglePhaserInput(enabled) {
        if (window.__templateGame && window.__templateGame.input && window.__templateGame.input.keyboard) {
            window.__templateGame.input.keyboard.enabled = enabled;
        }
    }

    open(focusInput = false) {
        this.isOpen = true;
        this.container.classList.remove('collapsed');
        if (this.floatingBtn) {
            this.floatingBtn.style.display = 'none'; // Sembunyikan floating button saat panel terbuka
        }

        if (focusInput) {
            this.togglePhaserInput(false);
            setTimeout(() => {
                this.inputEl.focus();
            }, 80);
        } else {
            // Chat bar tampil di layar, tapi karakter tetap bebas bergerak!
            this.togglePhaserInput(true);
        }
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('collapsed');
        if (this.floatingBtn) {
            this.floatingBtn.style.display = 'flex'; // Tampilkan tombol pill jika panel ditutup dengan [X]
            this.floatingBtn.classList.remove('active');
        }
        this.inputEl.blur();
        this.togglePhaserInput(true);
    }

    toggle() {
        if (!this.isOpen) {
            this.open(true);
        } else {
            this.inputEl.focus();
            this.togglePhaserInput(false);
        }
    }

    handleSubmit() {
        const val = this.inputEl.value.trim();
        if (val) {
            this.inputEl.value = '';
            this.history.push(val);
            this.historyIdx = this.history.length;

            if (val.startsWith('/')) {
                this.runCommand(val);
            } else {
                this.logPlayerChat(this.playerName, val);
            }
        }

        // Setelah kirim pesan, lepas fokus input agar karakter langsung bisa bergerak kembali
        this.inputEl.blur();
        this.togglePhaserInput(true);
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;

        this.historyIdx += direction;
        if (this.historyIdx < 0) this.historyIdx = 0;
        if (this.historyIdx >= this.history.length) {
            this.historyIdx = this.history.length;
            this.inputEl.value = '';
            return;
        }

        this.inputEl.value = this.history[this.historyIdx];
        this.inputEl.selectionStart = this.inputEl.selectionEnd = this.inputEl.value.length;
    }

    // ===============================================================
    // MESSAGE RENDERERS
    // ===============================================================

    /**
     * Pesan Info/Sistem:
     * Contoh: [i][10:23:30] System message info
     */
    logInfo(message) {
        const line = document.createElement('div');
        line.className = 'gt-log-line';
        line.innerHTML = `
            <span class="gt-c-white">${message}</span>
        `;
        this.appendLog(line);
    }

    /**
     * Chat Pemain:
     * Contoh: [W][10:23:41] <NamaPemain> Pesan chat
     */
    logPlayerChat(sender, rawText, isDr = false) {
        const line = document.createElement('div');
        line.className = 'gt-log-line';

        // Parse format kode warna (\1, \2, \3, dst)
        const parsedHTML = this.parseGTColorCodes(rawText);

        const senderClass = isDr ? 'gt-sender-dr' : 'gt-sender';

        line.innerHTML = `
            <span class="${senderClass}">&lt;${this.escapeHTML(sender)}&gt;</span>
            <span class="gt-chat-text">${parsedHTML}</span>
        `;

        this.appendLog(line);
    }

    /**
     * Parser Kode Warna:
     * \1 / \c : Cyan
     * \2 / \g : Green
     * \3 / \b : Blue
     * \4 / \r : Red
     * \5 / \p : Pink
     * \6 / \o : Orange
     * \7 : Gray
     * \8 : Black
     * \9 / \y : Yellow
     * \w : White
     */
    parseGTColorCodes(text) {
        // Jika tidak memakai kode warna, gunakan rotasi warna ceria
        if (!text.includes('\\')) {
            const color = this.chatColors[this.colorIdx % this.chatColors.length];
            this.colorIdx++;
            return `<span style="color: ${color};">${this.escapeHTML(text)}</span>`;
        }

        const colorMap = {
            '1': '#56d6f5', 'c': '#56d6f5',
            '2': '#48ea58', 'g': '#48ea58',
            '3': '#3b82f6', 'b': '#3b82f6',
            '4': '#ff4d4d', 'r': '#ff4d4d',
            '5': '#f472b6', 'p': '#f472b6',
            '6': '#ffa024', 'o': '#ffa024',
            '7': '#94a3b8',
            '8': '#1e293b',
            '9': '#ffea3b', 'y': '#ffea3b',
            'w': '#ffffff'
        };

        const parts = text.split(/\\([0-9a-zA-Z])/);
        let result = '';
        let currentColor = '#ffffff';

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {
                // Kode warna
                const code = parts[i].toLowerCase();
                currentColor = colorMap[code] || currentColor;
            } else if (parts[i]) {
                result += `<span style="color: ${currentColor};">${this.escapeHTML(parts[i])}</span>`;
            }
        }

        return result || `<span class="gt-c-white">${this.escapeHTML(text)}</span>`;
    }

    appendLog(el) {
        this.logsContainer.appendChild(el);
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }

    clearLogs() {
        this.logsContainer.innerHTML = '';
        this.logInfo('Chat dan konsol telah dibersihkan.');
    }

    printWelcome() {
        this.logPlayerChat('System', '\\9Ketik pesan biasa atau gunakan command (\\w/help\\9, \\w/learn\\9, \\w/tp\\9, \\w/god\\9).');
    }

    getActiveScene() {
        if (!window.__templateGame) return null;
        const scenes = window.__templateGame.scene.getScenes(true);
        return scenes && scenes.length > 0 ? scenes[0] : null;
    }

    // ===============================================================
    // COMMAND EXECUTOR
    // ===============================================================
    runCommand(inputStr) {
        const trimmed = inputStr.trim();
        const time = CommandConsole.getTimestamp();

        // Tampilkan prompt perintah
        const promptLine = document.createElement('div');
        promptLine.className = 'gt-log-line';
        promptLine.innerHTML = `
            <span class="gt-c-yellow">&gt; ${this.escapeHTML(trimmed)}</span>
        `;
        this.appendLog(promptLine);

        if (!trimmed.startsWith('/')) {
            this.logPlayerChat(this.playerName, trimmed);
            return;
        }

        // Jika user menjalankan perintah (/help, /learn, /inspect, dll), auto-expand agar hasilnya langsung terbaca
        if (this.isMinimized) {
            this.toggleMinimize(false);
        }

        const parts = trimmed.slice(1).split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'inspect':
                this.cmdInspect();
                break;
            case 'help':
                this.cmdHelp();
                break;
            case 'learn':
                this.cmdLearn(args[0]);
                break;
            case 'tp':
            case 'goto':
                this.cmdTeleport(args[0]);
                break;
            case 'speed':
                this.cmdSpeed(args[0]);
                break;
            case 'jump':
                this.cmdJump(args[0]);
                break;
            case 'hp':
                this.cmdHP(args[0]);
                break;
            case 'god':
                this.cmdGod();
                break;
            case 'clear':
            case 'cls':
                this.clearLogs();
                break;
            default:
                this.logInfo(`Perintah tidak dikenal: <span class="gt-c-red">/${this.escapeHTML(cmd)}</span>. Ketik <span class="gt-c-yellow">/help</span> untuk bantuan.`);
                break;
        }
    }

    // ===============================================================
    // COMMAND HANDLERS
    // ===============================================================
    cmdHelp() {
        this.logInfo('<b>--- DAFTAR PERINTAH GAME CONSOLE ---</b>');
        this.logInfo('• <span class="gt-c-yellow">/inspect</span> : Melihat kode logika game (jalan/lompat) berjalan secara real-time!');
        this.logInfo('• <span class="gt-c-yellow">/learn [topik]</span> : Melihat kode logika game (jump, move, npc, coin, hazard, zoom, portal).');
        this.logInfo('• <span class="gt-c-yellow">/tp &lt;scene&gt;</span> : Teleport scene (GameScene, Scene2, Scene3, Scene4, Scene5, DungeonScene, dll).');
        this.logInfo('• <span class="gt-c-yellow">/speed &lt;angka&gt;</span> : Ubah kecepatan lari karakter secara live (contoh: /speed 350).');
        this.logInfo('• <span class="gt-c-yellow">/jump &lt;angka&gt;</span> : Ubah kekuatan lompat karakter secara live (contoh: /jump 450).');
        this.logInfo('• <span class="gt-c-yellow">/hp &lt;angka&gt;</span> : Atur jumlah HP karakter saat ini.');
        this.logInfo('• <span class="gt-c-yellow">/god</span> : Nyalakan/matikan mode kebal duri (God Mode).');
        this.logInfo('• <span class="gt-c-yellow">/clear</span> : Bersihkan teks log chat.');
    }

    cmdInspect() {
        const active = CodeInspector.toggleLive();
        if (active) {
            this.logInfo('<b>Live Code Inspector DIAKTIFKAN!</b> Coba gerakkan karakter dengan <b>A / D</b> atau lompat dengan <b>W / Spasi</b> untuk melihat baris kode menyala.');
        } else {
            this.logInfo('Live Code Inspector DINONAKTIFKAN.');
        }
    }

    cmdLearn(topic) {
        const data = CodeInspector.get(topic);
        if (!data) {
            const list = CodeInspector.getAllTopics().join(', ');
            this.logInfo(`Topik "<b>${this.escapeHTML(topic || '')}</b>" tidak ditemukan. Pilihan topik: <span class="gt-c-cyan">${list}</span>`);
            return;
        }

        const card = document.createElement('div');
        card.className = 'gt-code-card';
        card.innerHTML = `
            <div class="gt-code-header">
                <span>${data.title}</span>
                <span style="font-size: 11px; color: #94a3b8;">${data.file}</span>
            </div>
            <div class="gt-code-desc">${data.description}</div>
            <pre class="gt-code-content"><code>${this.escapeHTML(data.code)}</code></pre>
        `;

        this.appendLog(card);
    }

    cmdTeleport(sceneName) {
        if (!sceneName) {
            this.logInfo('Gunakan: <span class="gt-c-yellow">/tp &lt;nama_scene&gt;</span> (Pilihan: GameScene, Scene2, hongkong, scene1, scene2)');
            return;
        }

        const aliasMap = {
            'scene1': 'GameScene',
            'gamescene': 'GameScene',
            'scene2': 'Scene2',
            'hongkong': 'Scene2',
            'hk': 'Scene2',
            'title': 'TitleScene',
            'titlescene': 'TitleScene'
        };

        const targetName = aliasMap[sceneName.toLowerCase()] || sceneName;
        const scene = window.__templateGame.scene.getScene(targetName);
        if (!scene) {
            this.logInfo(`Scene "<b>${this.escapeHTML(sceneName)}</b>" tidak ditemukan di dalam game.`);
            return;
        }

        const current = this.getActiveScene();
        if (current) {
            current.scene.start(targetName);
            this.logInfo(`Teleportasi ke scene <b>${targetName}</b> berhasil!`);
        }
    }

    cmdSpeed(val) {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
            this.logInfo('Gunakan angka positif: <span class="gt-c-yellow">/speed 300</span>');
            return;
        }

        const scene = this.getActiveScene();
        if (scene) {
            scene.customSpeed = num;
            this.logInfo(`Kecepatan gerak diatur ke <b>${num}</b> (Default: 220).`);
        }
    }

    cmdJump(val) {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
            this.logInfo('Gunakan angka positif: <span class="gt-c-yellow">/jump 420</span>');
            return;
        }

        const scene = this.getActiveScene();
        if (scene) {
            scene.customJump = -Math.abs(num);
            this.logInfo(`Kekuatan dorong lompat diatur ke <b>-${Math.abs(num)}</b> (Default: -330).`);
        }
    }

    cmdHP(val) {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
            this.logInfo('Gunakan angka: <span class="gt-c-yellow">/hp 10</span>');
            return;
        }

        const scene = this.getActiveScene();
        if (scene && scene.hp !== undefined) {
            scene.hp = num;
            if (scene.updateHPDisplay) scene.updateHPDisplay();
            this.logInfo(`HP pemain diatur ke <b>${num}</b>.`);
        }
    }

    cmdGod() {
        const scene = this.getActiveScene();
        if (scene) {
            scene.isGodMode = !scene.isGodMode;
            scene.isInvincible = scene.isGodMode;
            this.logInfo(`God Mode (Kebal Kerusakan): <b>${scene.isGodMode ? 'AKTIF' : 'NONAKTIF'}</b>`);
        }
    }

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        if (CommandConsole.instance) {
            CommandConsole.instance.height = 138;
            CommandConsole.instance.isMinimized = false;
            CommandConsole.instance.initDOM();
        }
    });
}
