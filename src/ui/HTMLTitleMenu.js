// ===============================================================
// HTML TITLE MENU OVERLAY (ULTRA-CRISP VECTOR BUTTONS)
// Mengganti tombol canvas yang buram/pixelated dengan elemen HTML/CSS:
// 1. Play Tutorial
// 2. My Projects
// 3. Settings
// 4. About (Bottom Right)
// 5. Footer (Version & Kelompok Developer)
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';
import { CONFIG_SKELETON } from '../../cerita.js';

export class HTMLTitleMenu {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.dom = null;
        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau shutdown
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const old = document.getElementById('gt-html-title-menu');
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = 'gt-html-title-menu';
        this.dom.className = 'gt-title-menu-root';

        const authorName = CONFIG_SKELETON.namaKelompok || 'Kelompok Developer';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap');

                .gt-title-menu-root {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 1000;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                }

                /* Container Tombol Menu di Sisi Kanan (Ukuran proporsional, tidak menabrak logo) */
                .gt-title-btn-stack {
                    position: absolute;
                    right: clamp(60px, 15vw, 240px);
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    width: clamp(250px, 20vw, 320px);
                    pointer-events: auto;
                    animation: titleMenuBob 2.5s ease-in-out infinite;
                }

                @keyframes titleMenuBob {
                    0%, 100% { transform: translateY(-50%); }
                    50% { transform: translateY(calc(-50% - 5px)); }
                }

                /* Tombol Utama Neo-Brutalist Tactile (Ukuran Pas, Ramping, & Elegan) */
                .gt-title-btn {
                    position: relative;
                    width: 100%;
                    height: clamp(48px, 6.5vh, 56px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                    font-size: clamp(15px, 1.1vw, 17px);
                    font-weight: 800;
                    letter-spacing: 0.4px;
                    border: 3px solid #0f172a;
                    border-radius: 10px;
                    box-shadow: 0 5px 0 #0f172a;
                    cursor: pointer;
                    transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.15s ease;
                    outline: none;
                }

                .gt-title-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 0 #0f172a;
                }

                .gt-title-btn:active {
                    transform: translateY(2px);
                    box-shadow: 0 2px 0 #0f172a;
                }

                /* Varian 1: Play Tutorial (Putih Bersih) */
                .gt-title-btn-tutorial {
                    background-color: #ffffff;
                    color: #0f172a;
                }
                .gt-title-btn-tutorial:hover {
                    background-color: #f8fafc;
                }

                /* Varian 2: My Projects (Biru Modern) */
                .gt-title-btn-projects {
                    background-color: #0284c7;
                    color: #ffffff;
                }
                .gt-title-btn-projects:hover {
                    background-color: #0369a1;
                }

                /* Varian 3: Settings (Navy Gelap) */
                .gt-title-btn-settings {
                    background-color: #0f172a;
                    color: #ffffff;
                }
                .gt-title-btn-settings:hover {
                    background-color: #1e293b;
                }

                /* Tombol About di Pojok Kanan Bawah */
                .gt-title-about-btn {
                    position: absolute;
                    right: 28px;
                    bottom: 20px;
                    padding: 8px 22px;
                    height: 38px;
                    background-color: #ffffff;
                    color: #0f172a;
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 800;
                    letter-spacing: 0.4px;
                    border: 2.5px solid #0f172a;
                    border-radius: 8px;
                    box-shadow: 0 3.5px 0 #0f172a;
                    cursor: pointer;
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.15s ease;
                    outline: none;
                }

                .gt-title-about-btn:hover {
                    background-color: #f1f5f9;
                    transform: translateY(-2px);
                    box-shadow: 0 5.5px 0 #0f172a;
                }

                .gt-title-about-btn:active {
                    transform: translateY(2px);
                    box-shadow: 0 1px 0 #0f172a;
                }

                /* Footer Kiri & Tengah */
                .gt-title-footer-ver {
                    position: absolute;
                    left: 32px;
                    bottom: 24px;
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e293b;
                    pointer-events: none;
                    letter-spacing: 0.6px;
                }

                .gt-title-footer-author {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    bottom: 24px;
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e293b;
                    pointer-events: none;
                    letter-spacing: 0.5px;
                    text-align: center;
                }
            </style>

            <!-- Stack Tombol Utama -->
            <div class="gt-title-btn-stack">
                <button id="gt-btn-play-tutorial" class="gt-title-btn gt-title-btn-tutorial">
                    Play Tutorial
                </button>
                <button id="gt-btn-my-projects" class="gt-title-btn gt-title-btn-projects">
                    My Projects
                </button>
                <button id="gt-btn-settings" class="gt-title-btn gt-title-btn-settings">
                    Settings
                </button>
            </div>

            <!-- Tombol About -->
            <button id="gt-btn-about" class="gt-title-about-btn">
                About
            </button>

            <!-- Footer -->
            <div class="gt-title-footer-ver">v1.0</div>
            <div class="gt-title-footer-author">${authorName}</div>
        `;

        document.body.appendChild(this.dom);
        this.bindEvents();
    }

    bindEvents() {
        const btnTutorial = document.getElementById('gt-btn-play-tutorial');
        const btnProjects = document.getElementById('gt-btn-my-projects');
        const btnSettings = document.getElementById('gt-btn-settings');
        const btnAbout = document.getElementById('gt-btn-about');

        if (btnTutorial) {
            btnTutorial.addEventListener('click', () => {
                AudioManager.playClick();
                if (this.options.onPlayTutorial) this.options.onPlayTutorial();
            });
        }

        if (btnProjects) {
            btnProjects.addEventListener('click', () => {
                AudioManager.playClick();
                if (this.options.onMyProjects) this.options.onMyProjects();
            });
        }

        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                AudioManager.playClick();
                if (this.options.onSettings) this.options.onSettings();
            });
        }

        if (btnAbout) {
            btnAbout.addEventListener('click', () => {
                AudioManager.playClick();
                if (this.options.onAbout) this.options.onAbout();
            });
        }
    }

    destroy() {
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
        const existing = document.getElementById('gt-html-title-menu');
        if (existing) existing.remove();
    }
}
