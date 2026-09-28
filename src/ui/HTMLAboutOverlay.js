// ===============================================================
// HTML ABOUT OVERLAY (ULTRA-CRISP EDITORIAL & CREDITS PAGE)
// Menggabungkan animasi canvas (theater loop & fireflies) di area hero banner
// dengan tipografi vector HTML yang super tajam dan scroll native yang mulus.
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';

export class HTMLAboutOverlay {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.dom = null;
        this.scrollEl = null;
        this.autoScrollInterval = null;
        this.isUserScrolling = false;
        this.resumeTimer = null;
        this.escHandler = null;

        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau shutdown
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const old = document.getElementById('gt-html-about-overlay');
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = 'gt-html-about-overlay';
        this.dom.className = 'gt-about-root';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                .gt-about-root {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: text;
                    -webkit-user-select: text;
                    overflow: hidden;
                    background: transparent;
                    pointer-events: none;
                }

                /* Tombol Kembali Tetap di Pojok Kiri Atas */
                .gt-about-back-btn {
                    position: fixed;
                    top: 18px;
                    left: 20px;
                    z-index: 1100;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 16px;
                    background-color: #0f172a;
                    color: #ffffff;
                    border: 2px solid #0f172a;
                    border-radius: 6px;
                    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    cursor: pointer;
                    transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.15s ease;
                    outline: none;
                    user-select: none;
                    pointer-events: auto;
                }

                .gt-about-back-btn:hover {
                    background-color: #1e293b;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
                }

                .gt-about-back-btn:active {
                    transform: translateY(1.5px);
                    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
                }

                /* Container Scrollable Utama */
                .gt-about-scroll-container {
                    width: 100%;
                    height: 100%;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scroll-behavior: smooth;
                    pointer-events: auto;
                }

                /* Custom Scrollbar */
                .gt-about-scroll-container::-webkit-scrollbar {
                    width: 7px;
                }
                .gt-about-scroll-container::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                }
                .gt-about-scroll-container::-webkit-scrollbar-thumb {
                    background: #94a3b8;
                    border-radius: 4px;
                }
                .gt-about-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }

                /* Hero Header Atas (Panggung animasi karakter & kunang-kunang di canvas) */
                .gt-about-hero {
                    position: relative;
                    width: 100%;
                    height: 200px;
                    background: transparent;
                    pointer-events: none;
                    box-sizing: border-box;
                }

                /* Judul Utama di Bagian Putih */
                .gt-about-title-block {
                    margin-bottom: 38px;
                    padding-bottom: 24px;
                    border-bottom: 2px solid #e2e8f0;
                }

                .gt-about-hero-badge {
                    display: inline-block;
                    font-size: 13px;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 2.5px;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }

                .gt-about-hero-title {
                    margin: 0;
                    font-size: clamp(28px, 4.5vw, 42px);
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: -0.5px;
                    line-height: 1.15;
                }

                /* Wrapper Konten Putih Polos */
                .gt-about-content-wrapper {
                    position: relative;
                    background-color: #ffffff;
                    width: 100%;
                    border-top: 2px solid #cbd5e1;
                    box-sizing: border-box;
                }

                /* Konten Manifesto & Credits */
                .gt-about-content {
                    max-width: 640px;
                    margin: 0 auto;
                    padding: 50px 24px 70px 24px;
                    text-align: center;
                    box-sizing: border-box;
                }

                .gt-about-section {
                    margin-bottom: 28px;
                }

                .gt-about-label {
                    font-size: 13px;
                    font-weight: 800;
                    letter-spacing: 1.6px;
                    color: #000000;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }

                .gt-about-author-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 2px;
                }

                .gt-about-author-handle {
                    font-size: 13.5px;
                    font-weight: 500;
                    color: #0284c7;
                }

                .gt-about-presented-org {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .gt-about-divider {
                    width: 120px;
                    height: 2px;
                    background-color: #e2e8f0;
                    margin: 36px auto;
                    border-radius: 2px;
                }

                /* Grid Teknologi */
                .gt-about-tech-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    align-items: center;
                }

                .gt-about-tech-item {
                    font-size: 13.5px;
                    color: #334155;
                    font-weight: 500;
                }

                .gt-about-tech-item strong {
                    color: #0f172a;
                    font-weight: 700;
                }

                /* Teks Paragraf Manifesto */
                .gt-about-prose {
                    font-size: 13.5px;
                    line-height: 1.7;
                    color: #334155;
                    margin: 0 0 10px 0;
                    font-weight: 400;
                }

                .gt-about-prose strong {
                    color: #0f172a;
                    font-weight: 700;
                }

                /* Kurikulum / Pembelajaran */
                .gt-about-learn-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 12px;
                }

                .gt-about-learn-item {
                    font-size: 13.5px;
                    color: #334155;
                }

                .gt-about-learn-item strong {
                    color: #0f172a;
                    font-weight: 700;
                }

                .gt-about-ai-powered {
                    margin-top: 14px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #0284c7;
                }

                /* Penutup & Motto */
                .gt-about-closing {
                    margin-top: 40px;
                }

                .gt-about-motto {
                    font-size: 13px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    color: #0f172a;
                    margin-bottom: 4px;
                }

                .gt-about-thankyou {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    color: #0284c7;
                    margin-top: 16px;
                }

                /* Footer Banner (#dcff78) dengan Logo */
                .gt-about-footer-banner {
                    width: 100%;
                    background-color: #dcff78;
                    border-top: 2px solid #cbd5e1;
                    padding: 48px 20px;
                    text-align: center;
                    box-sizing: border-box;
                }

                .gt-about-footer-logo-img {
                    max-width: 250px;
                    height: auto;
                    display: inline-block;
                    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.08));
                }
            </style>

            <!-- Tombol Kembali Tetap di Pojok Kiri Atas -->
            <button id="gt-about-btn-back" class="gt-about-back-btn">
                <span>←</span> Main Menu
            </button>

            <!-- Area Scrollable -->
            <div id="gt-about-scroller" class="gt-about-scroll-container">
                <!-- Hero Header Atas (Panggung animasi karakter & kunang-kunang di canvas) -->
                <div class="gt-about-hero"></div>

                <!-- Wrapper Konten Putih -->
                <div class="gt-about-content-wrapper">
                    <!-- Konten Teks Editorial -->
                    <div class="gt-about-content">
                        <!-- Judul Halaman di Bagian Putih -->
                        <div class="gt-about-title-block">
                            <div class="gt-about-hero-badge">ABOUT</div>
                            <h1 class="gt-about-hero-title">The Game Template</h1>
                        </div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">DEVELOPED BY</div>
                            <div class="gt-about-author-name">Andika Catur Ariantono</div>
                            <div class="gt-about-author-handle">@andikacatvr</div>
                        </section>

                        <section class="gt-about-section">
                            <div class="gt-about-label">PRESENTED FOR</div>
                            <div class="gt-about-presented-org">Gendigital Academy</div>
                        </section>

                        <div class="gt-about-divider"></div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">TECHNOLOGY</div>
                            <div class="gt-about-tech-list">
                                <div class="gt-about-tech-item"><strong>Engine</strong> — Phaser.js</div>
                                <div class="gt-about-tech-item"><strong>Visual Style</strong> — Pixel Art</div>
                                <div class="gt-about-tech-item"><strong>Platform</strong> — 2D Side-Scroller</div>
                            </div>
                        </section>

                        <div class="gt-about-divider"></div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">WHO THIS TEMPLATE IS FOR</div>
                            <p class="gt-about-prose"><strong>Educators</strong>, who dare to teach something new.</p>
                            <p class="gt-about-prose"><strong>Indonesian Children</strong>, the next generation of creators.</p>
                            <p class="gt-about-prose"><strong>Every Imagination</strong>, waiting for a place to come alive.</p>
                        </section>

                        <div class="gt-about-divider"></div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">A MISSION</div>
                            <p class="gt-about-prose">In a world that moves fast,<br>the ability to create is the most valuable skill.</p>
                            <p class="gt-about-prose">This template was not built as just a game—<br>it was built as a space to learn.</p>
                            <p class="gt-about-prose">An empty canvas,<br>waiting for a child's imagination to fill it.</p>
                        </section>

                        <div class="gt-about-divider"></div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">WHAT WILL BE LEARNED</div>
                            <div class="gt-about-learn-grid">
                                <div class="gt-about-learn-item"><strong>Character Design</strong> — bringing imagination to life</div>
                                <div class="gt-about-learn-item"><strong>World Building</strong> — crafting environments & parallax backgrounds</div>
                                <div class="gt-about-learn-item"><strong>Obstacle Design</strong> — shaping challenges within the game</div>
                                <div class="gt-about-learn-item"><strong>Mission & Objectives</strong> — what to face, what to collect, what to complete</div>
                                <div class="gt-about-learn-item"><strong>Game Logic</strong> — understanding what runs behind the scenes</div>
                            </div>
                            <div class="gt-about-ai-powered">Powered by Artificial Intelligence, guided by human imagination.</div>
                        </section>

                        <div class="gt-about-divider"></div>

                        <section class="gt-about-section">
                            <div class="gt-about-label">ACKNOWLEDGMENTS</div>
                            <p class="gt-about-prose">To every educator who believes learning can be fun.</p>
                            <p class="gt-about-prose">To every child who dares to dream through a world of their own making.</p>
                            <p class="gt-about-prose">And to you, reading this right now—<br><strong>the next game is in your hands.</strong></p>
                        </section>

                        <div class="gt-about-divider"></div>

                        <div class="gt-about-closing">
                            <div class="gt-about-motto">FROM IDEA TO GAME.</div>
                            <div class="gt-about-motto">FROM IMAGINATION TO REALITY.</div>
                            <div class="gt-about-thankyou">THANK YOU FOR CREATING</div>
                        </div>
                    </div>

                    <!-- Footer Banner dengan Logo Asli -->
                    <div class="gt-about-footer-banner">
                        <img src="/the_game_template.png" alt="The Game Template Logo" class="gt-about-footer-logo-img" />
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);
        this.scrollEl = document.getElementById('gt-about-scroller');

        this.bindEvents();
        this.startAutoScroll();
    }

    bindEvents() {
        const backBtn = document.getElementById('gt-about-btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                AudioManager.playClick();
                if (this.options.onBack) this.options.onBack();
            });
        }

        // Shortcut ESC untuk kembali
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                AudioManager.playClick();
                if (this.options.onBack) this.options.onBack();
            }
        };
        window.addEventListener('keydown', this.escHandler);

        // Scroll listener untuk sinkronisasi kamera canvas & jeda auto-scroll
        if (this.scrollEl) {
            this.scrollEl.addEventListener('scroll', () => {
                if (this.options.onScroll) {
                    this.options.onScroll(this.scrollEl.scrollTop);
                }
            });

            const onUserTouch = () => {
                this.isUserScrolling = true;
                if (this.resumeTimer) clearTimeout(this.resumeTimer);
                this.resumeTimer = setTimeout(() => {
                    this.isUserScrolling = false;
                }, 3500);
            };

            this.scrollEl.addEventListener('wheel', onUserTouch, { passive: true });
            this.scrollEl.addEventListener('touchstart', onUserTouch, { passive: true });
            this.scrollEl.addEventListener('touchmove', onUserTouch, { passive: true });
        }
    }

    startAutoScroll() {
        // Mulai auto-scroll halus setelah jeda awal 2.5 detik
        setTimeout(() => {
            if (!this.scrollEl) return;
            this.autoScrollInterval = setInterval(() => {
                if (!this.scrollEl || this.isUserScrolling) return;
                const maxScroll = this.scrollEl.scrollHeight - this.scrollEl.clientHeight;
                if (this.scrollEl.scrollTop < maxScroll) {
                    this.scrollEl.scrollTop += 0.8;
                }
            }, 25);
        }, 2500);
    }

    destroy() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        if (this.resumeTimer) {
            clearTimeout(this.resumeTimer);
            this.resumeTimer = null;
        }
        if (this.escHandler) {
            window.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
        const existing = document.getElementById('gt-html-about-overlay');
        if (existing) existing.remove();
    }
}
