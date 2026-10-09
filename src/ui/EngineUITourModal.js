// ===============================================================
// ENGINE UI TOUR MODAL (FLYING ARROW & NPC EXPLANATION TOUR)
// ===============================================================
// Pemandu Engine secara langsung menjelaskan fungsi-fungsi tombol UI
// dengan tanda panah yang terbang berpindah-pindah dan efek spotlight halus.
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';
import { CommandConsole } from '../utils/CommandConsole.js';

export class EngineUITourModal {
    constructor(scene) {
        this.scene = scene;
        this.currentStep = 0;
        this.isOpen = false;
        this.dom = null;
        this.spotlightEl = null;
        this.guideContainer = null;
        this.arrowEl = null;
        this.bubbleEl = null;
        this.boundKeyHandler = null;
        this.resizeHandler = null;

        // Urutan alur tur yang dijelaskan langsung oleh Pemandu Engine (Disinkronkan dengan fitur & toolbar terbaru):
        // 1. Command Console -> 2. Menu File & Hub -> 3. Tombol Edit (Toolbar) -> 4. Palu & Build Modular (Undo/Redo) ->
        // 5. Wrench & Visual Logic Node -> 6. Live Inspector -> 7. Grid System 50px -> 8. Studio Preview & Flow Graph
        this.steps = [
            {
                id: 'step_console',
                selector: '#gt-floating-btn',
                fallbackSelector: '#gt-floating-btn',
                title: '💬 Tombol Command Console',
                badge: 'Langkah 1 dari 8',
                npcSpeech: 'Halo calon kreator game! Perhatikan panah yang menunjuk ke tombol <b>>_ Command</b> di pojok kanan bawah ini. Di sini kamu bisa mengetik perintah developer dan cheat seperti <code>/speed 350</code>, <code>/jump 550</code>, atau <code>/god</code> untuk kebal duri.',
                arrowDir: 'down',
                beforeStep: () => {
                    if (CommandConsole.instance) {
                        // Pastikan tombol floating command aktif & panel tertutup rapi saat ditunjuk
                        CommandConsole.instance.setVisible(true, false, false);
                    }
                }
            },
            {
                id: 'step_file',
                selector: '#gt-mb-btn-file',
                fallbackSelector: '.gt-mb-dropdown:first-child',
                title: '📁 Menu File & Project Hub',
                badge: 'Langkah 2 dari 8',
                npcSpeech: 'Sekarang lihat tanda panah yang terbang ke atas kiri! Ini adalah <b>Menu File</b>. Di sini kamu bisa membuat <b>Scene Baru (Studio)</b>, membuka <b>Project Hub</b>, menyimpan progres (*AutoSave*), dan <b>Mengekspor Game ke file .ZIP</b> siap main tanpa perlu instalasi server!',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.remove('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.remove('active');
                    }
                }
            },
            {
                id: 'step_edit',
                selector: '#gt-mb-btn-edit',
                title: '🛠️ Tombol Edit (Toolbar Pembuat)',
                badge: 'Langkah 3 dari 8',
                npcSpeech: 'Tombol <b>Edit</b> ini berfungsi untuk membuka atau menutup <b>Toolbar Pembuat</b> vertikal di sebelah kiri layar (di bawah bar HP). Mari kita lihat koleksi alat pembuat di toolbar tersebut!',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.add('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.add('active');
                        this.scene.engineMenuBar.updateFloatingPanelPosition();
                    }
                }
            },
            {
                id: 'step_build',
                selector: '#gt-card-tool-build',
                fallbackSelector: '#gt-card-tool-punch',
                title: '🔨 Palu, 🧱 Build & Undo/Redo',
                badge: 'Langkah 4 dari 8',
                npcSpeech: 'Di toolbar vertikal ini, gunakan <b>🔨 Palu [X]</b> untuk menggali & menghancurkan balok tanah, serta <b>🧱 Build [B]</b> untuk memilih & memasang Platform, Karakter NPC, Koin, Duri, atau Portal! Ada tombol <b>↩️ Undo [Ctrl+Z]</b> & <b>↪️ Redo [Ctrl+Y]</b> jika ingin membatalkan aksi.',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.add('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.add('active');
                        this.scene.engineMenuBar.updateFloatingPanelPosition();
                    }
                }
            },
            {
                id: 'step_wrench',
                selector: '#gt-card-tool-wrench',
                title: '🔧 Wrench & Visual Logic Node',
                badge: 'Langkah 5 dari 8',
                npcSpeech: 'Pilih alat <b>🔧 Wrench (Kunci Inggris) [C]</b> lalu klik NPC atau objek mana saja di kanvas! Kamu bisa mengedit teks dialog percakapan hingga merangkai <b>Visual Logic Node Engine</b> (node & kabel ala RapidMiner/Blueprint) untuk logika quest tanpa koding!',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.add('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.add('active');
                        this.scene.engineMenuBar.updateFloatingPanelPosition();
                    }
                }
            },
            {
                id: 'step_inspect',
                selector: '#gt-mb-btn-inspect',
                title: '🎛️ Live Inspector Slider',
                badge: 'Langkah 6 dari 8',
                npcSpeech: 'Di <b>Live Inspector</b>, kamu bisa menguji dan merasakan fisika heromu secara langsung! Gunakan slider interaktif untuk mengatur kecepatan jalan (Speed), daya lompat (Jump Force), hingga gravitasi dunia secara real-time saat bermain.',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.remove('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.remove('active');
                    }
                }
            },
            {
                id: 'step_grid',
                selector: '#gt-mb-btn-grid',
                title: '📐 Grid System 50px [G]',
                badge: 'Langkah 7 dari 8',
                npcSpeech: 'Tekan tombol <b>Grid</b> atau tombol <b>[G]</b> pada keyboard untuk memunculkan garis petak panduan 50px (seperti Unity/Godot) agar posisi balok platform dan penempatan objek tertata presisi dan rapi!',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.remove('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.remove('active');
                    }
                }
            },
            {
                id: 'step_create',
                selector: '#gt-mb-btn-create',
                title: '🎬 Studio Preview & Visual Flow Graph',
                badge: 'Langkah 8 dari 8',
                npcSpeech: 'Terakhir, tombol <b>Preview</b> ini adalah gerbang ke <b>Studio World Builder 3600x1000px</b> (dengan strata bawah tanah) serta <b>⚡ Visual Flow Graph (Node & Kabel)</b> untuk menyambungkan rute petualangan multi-scene! Selamat berkreasi!',
                arrowDir: 'up',
                beforeStep: () => {
                    if (this.scene && this.scene.engineMenuBar) {
                        this.scene.engineMenuBar.expand();
                        if (this.scene.engineMenuBar.editFloatingPanel) {
                            this.scene.engineMenuBar.editFloatingPanel.classList.remove('show');
                        }
                        const editBtn = document.getElementById('gt-mb-btn-edit');
                        if (editBtn) editBtn.classList.remove('active');
                    }
                }
            }
        ];

        this.initDOM();

        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    initDOM() {
        const id = 'gt-flying-arrow-tour';
        const old = document.getElementById(id);
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = id;
        this.dom.className = 'gt-tour-overlay';
        this.dom.style.display = 'none';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700&display=swap');

                .gt-tour-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 999980;
                    cursor: pointer;
                    user-select: none;
                    -webkit-user-select: none;
                    opacity: 0;
                    transition: opacity 0.25s ease;
                }

                .gt-tour-overlay.active {
                    opacity: 1;
                }

                /* 1. SPOTLIGHT: Area aktif terang, background diredupkan sedikit (45% dim) */
                .gt-tour-spotlight-box {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 0;
                    height: 0;
                    border-radius: 8px;
                    border: 2px solid #38bdf8;
                    box-shadow: 0 0 0 9999px rgba(3, 7, 18, 0.45), 0 0 20px rgba(56, 189, 248, 0.8), inset 0 0 14px rgba(56, 189, 248, 0.2);
                    pointer-events: none;
                    transition: top 0.48s cubic-bezier(0.22, 1, 0.36, 1),
                                left 0.48s cubic-bezier(0.22, 1, 0.36, 1),
                                width 0.48s cubic-bezier(0.22, 1, 0.36, 1),
                                height 0.48s cubic-bezier(0.22, 1, 0.36, 1);
                    z-index: 999982;
                }

                .gt-tour-spotlight-box::after {
                    content: '';
                    position: absolute;
                    inset: -5px;
                    border: 2px dashed rgba(56, 189, 248, 0.6);
                    border-radius: 12px;
                    animation: gtTourSpotPulse 1.8s infinite ease-out;
                    pointer-events: none;
                }

                @keyframes gtTourSpotPulse {
                    0% { transform: scale(0.98); opacity: 0.9; }
                    50% { transform: scale(1.05); opacity: 0.35; }
                    100% { transform: scale(0.98); opacity: 0.9; }
                }

                /* 2. FLYING GUIDE CONTAINER (PANAH TERBANG + DIALOG PEMANDU ENGINE) */
                .gt-tour-guide-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    pointer-events: none;
                    z-index: 999988;
                    transition: top 0.48s cubic-bezier(0.22, 1, 0.36, 1),
                                left 0.48s cubic-bezier(0.22, 1, 0.36, 1);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                /* Panah Penunjuk yang Berdenyut Melenting */
                .gt-tour-flying-arrow {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.95)) drop-shadow(0 4px 12px rgba(0,0,0,0.85));
                    transition: transform 0.3s ease;
                }

                .gt-tour-flying-arrow.dir-up {
                    animation: gtArrowBounceUp 1.1s infinite alternate ease-in-out;
                    margin-bottom: 8px;
                }

                .gt-tour-flying-arrow.dir-down {
                    animation: gtArrowBounceDown 1.1s infinite alternate ease-in-out;
                    margin-top: 8px;
                }

                @keyframes gtArrowBounceUp {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-10px); }
                }

                @keyframes gtArrowBounceDown {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(10px); }
                }

                /* Kotak Penjelasan ala Pemandu Engine RPG */
                .gt-tour-bubble {
                    width: 380px;
                    max-width: calc(100vw - 32px);
                    background: rgba(10, 15, 29, 0.96);
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                    border: 1.5px solid rgba(168, 85, 247, 0.55);
                    border-radius: 12px;
                    padding: 16px 18px;
                    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(168, 85, 247, 0.25);
                    color: #ffffff;
                    pointer-events: auto;
                    cursor: default;
                }

                /* Header Pembicara NPC */
                .gt-tour-npc-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: 8px;
                }

                .gt-tour-npc-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #7c3aed, #4c1d95);
                    border: 2px solid #c084fc;
                    box-shadow: 0 0 12px rgba(192, 132, 252, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .gt-tour-npc-info {
                    flex: 1;
                }

                .gt-tour-npc-name {
                    font-size: 13.5px;
                    font-weight: 800;
                    color: #fde047;
                    letter-spacing: 0.3px;
                }

                .gt-tour-npc-title {
                    font-size: 10.5px;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .gt-tour-step-badge {
                    background: rgba(168, 85, 247, 0.25);
                    border: 1px solid rgba(192, 132, 252, 0.4);
                    color: #e9d5ff;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 7px;
                    border-radius: 9999px;
                    letter-spacing: 0.5px;
                }

                .gt-tour-skip-btn {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                    transition: all 0.15s ease;
                }

                .gt-tour-skip-btn:hover {
                    color: #f87171;
                    background: rgba(239, 68, 68, 0.15);
                }

                /* Isi Penjelasan NPC */
                .gt-tour-bubble-speech {
                    font-size: 12.5px;
                    color: #e2e8f0;
                    line-height: 1.58;
                    margin-bottom: 14px;
                }

                .gt-tour-bubble-speech b {
                    color: #38bdf8;
                }

                .gt-tour-bubble-speech code {
                    background: rgba(8, 20, 32, 0.85);
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    color: #fde047;
                    padding: 1px 5px;
                    border-radius: 3px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                }

                .gt-tour-bubble-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 10px;
                }

                .gt-tour-hint {
                    font-size: 10.5px;
                    color: #fbbf24;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    animation: gtHintFade 1.4s infinite alternate ease-in-out;
                }

                @keyframes gtHintFade {
                    0% { opacity: 0.6; }
                    100% { opacity: 1; }
                }

                .gt-tour-next-btn {
                    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                    border: 1px solid #38bdf8;
                    color: #ffffff;
                    font-size: 11.5px;
                    font-weight: 800;
                    padding: 6px 14px;
                    border-radius: 6px;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.5);
                    transition: all 0.15s ease;
                }

                .gt-tour-next-btn:hover {
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    transform: scale(1.04);
                }

                .gt-tour-next-btn.finish {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                    border-color: #34d399 !important;
                }
            </style>

            <!-- Spotlight Box (Area sorotan terang) -->
            <div class="gt-tour-spotlight-box" id="gt-tour-spotlight-box"></div>

            <!-- Flying Guide Container (Tanda Panah + Kotak Penjelasan NPC) -->
            <div class="gt-tour-guide-container" id="gt-tour-guide-container">
                <!-- Panah mengarah ke atas (ketika bubble di bawah target) -->
                <div class="gt-tour-flying-arrow dir-up" id="gt-tour-arrow-up">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M12 20V5M12 5L6 11M12 5L18 11" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>

                <!-- Kartu Penjelasan ala Pemandu Engine -->
                <div class="gt-tour-bubble" id="gt-tour-bubble">
                    <div class="gt-tour-npc-header">
                        <div class="gt-tour-npc-avatar">🧙</div>
                        <div class="gt-tour-npc-info">
                            <div class="gt-tour-npc-name">Pemandu Engine</div>
                            <div class="gt-tour-npc-title" id="gt-tour-feature-title">Fitur Engine</div>
                        </div>
                        <span class="gt-tour-step-badge" id="gt-tour-step-badge">Langkah 1 dari 8</span>
                        <button class="gt-tour-skip-btn" id="gt-tour-skip-btn" title="Keluar Tur (ESC)">✕</button>
                    </div>

                    <div class="gt-tour-bubble-speech" id="gt-tour-bubble-speech">
                        Penjelasan dari Pemandu Engine.
                    </div>

                    <div class="gt-tour-bubble-bottom">
                        <span class="gt-tour-hint">👉 Klik di mana saja untuk lanjut ▶</span>
                        <button class="gt-tour-next-btn" id="gt-tour-next-btn">Lanjut ▶</button>
                    </div>
                </div>

                <!-- Panah mengarah ke bawah (ketika bubble di atas target) -->
                <div class="gt-tour-flying-arrow dir-down" id="gt-tour-arrow-down" style="display: none;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4V19M12 19L6 13M12 19L18 13" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);

        this.spotlightEl = this.dom.querySelector('#gt-tour-spotlight-box');
        this.guideContainer = this.dom.querySelector('#gt-tour-guide-container');
        this.arrowUp = this.dom.querySelector('#gt-tour-arrow-up');
        this.arrowDown = this.dom.querySelector('#gt-tour-arrow-down');
        this.bubbleEl = this.dom.querySelector('#gt-tour-bubble');
        this.featureTitleEl = this.dom.querySelector('#gt-tour-feature-title');
        this.badgeEl = this.dom.querySelector('#gt-tour-step-badge');
        this.speechEl = this.dom.querySelector('#gt-tour-bubble-speech');
        this.btnNext = this.dom.querySelector('#gt-tour-next-btn');
        this.btnSkip = this.dom.querySelector('#gt-tour-skip-btn');

        this.bindEvents();
    }

    bindEvents() {
        // Klik di MANA SAJA di layar langsung memindahkan panah ke tombol berikutnya!
        this.dom.addEventListener('click', (e) => {
            if (e.target === this.btnSkip) return;
            e.stopPropagation();
            AudioManager.playClick();
            this.next();
        });

        this.btnNext.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            this.next();
        });

        this.btnSkip.addEventListener('click', (e) => {
            e.stopPropagation();
            AudioManager.playClick();
            this.close();
        });

        // Window resize reposition
        this.resizeHandler = () => {
            if (this.isOpen) {
                this.renderStep(this.currentStep);
            }
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    start(startIndex = 0) {
        this.isOpen = true;
        this.currentStep = Math.max(0, Math.min(startIndex, this.steps.length - 1));

        // Bekukan pergerakan pemain agar diam di tempat
        if (this.scene) {
            this.scene.isTourActive = true;
            if (this.scene.player && this.scene.player.setVelocity) {
                this.scene.player.setVelocity(0, 0);
            }
        }

        // Tampilkan DOM
        this.dom.style.display = 'block';
        requestAnimationFrame(() => {
            this.dom.classList.add('active');
            this.renderStep(this.currentStep);
        });

        this.setupKeyboard();
        AudioManager.playSuccess();
    }

    renderStep(index) {
        const step = this.steps[index];
        if (!step) return;

        // Callback khusus sebelum langkah (misal membuka console atau menu bar)
        if (typeof step.beforeStep === 'function') {
            step.beforeStep();
        }

        requestAnimationFrame(() => {
            let target = document.querySelector(step.selector);
            if (!target && step.fallbackSelector) {
                target = document.querySelector(step.fallbackSelector);
            }

            // Update dialog NPC & badge
            this.badgeEl.textContent = step.badge || `${index + 1} / ${this.steps.length}`;
            this.featureTitleEl.innerHTML = step.title;
            this.speechEl.innerHTML = step.npcSpeech;

            const isLast = index === this.steps.length - 1;
            this.btnNext.textContent = isLast ? 'Selesai! 🎉' : 'Lanjut ▶';
            this.btnNext.classList.toggle('finish', isLast);

            // Pindahkan Spotlight & Terbangkan Panah ke Target
            this.flyArrowToTarget(target, step.arrowDir);
        });
    }

    flyArrowToTarget(targetEl, preferredDir = 'up') {
        const pad = 6;
        let rect = null;

        if (targetEl) {
            rect = targetEl.getBoundingClientRect();
        } else {
            rect = {
                left: window.innerWidth / 2 - 50,
                top: window.innerHeight / 2 - 25,
                width: 100,
                height: 50,
                bottom: window.innerHeight / 2 + 25
            };
        }

        // 1. Posisikan Spotlight Cutout Box
        const spotX = Math.max(0, rect.left - pad);
        const spotY = Math.max(0, rect.top - pad);
        const spotW = rect.width + pad * 2;
        const spotH = rect.height + pad * 2;

        this.spotlightEl.style.left = `${Math.round(spotX)}px`;
        this.spotlightEl.style.top = `${Math.round(spotY)}px`;
        this.spotlightEl.style.width = `${Math.round(spotW)}px`;
        this.spotlightEl.style.height = `${Math.round(spotH)}px`;

        if (targetEl && (targetEl.classList.contains('gt-floating-btn') || targetEl.id === 'gt-floating-btn')) {
            this.spotlightEl.style.borderRadius = '24px';
        } else {
            this.spotlightEl.style.borderRadius = '8px';
        }

        // 2. Terbangkan Guide Container (Panah + Bubble) ke Target
        const bubbleW = 380;
        const targetCenterX = rect.left + rect.width / 2;
        let guideX = targetCenterX - bubbleW / 2;
        guideX = Math.max(16, Math.min(guideX, window.innerWidth - bubbleW - 16));

        // Hitung posisi horizontal panah agar selalu tepat menunjuk ke titik tengah target
        const arrowRelX = targetCenterX - guideX;
        const clampedArrowRelX = Math.max(28, Math.min(arrowRelX, bubbleW - 28));
        const arrowMargin = `${Math.round(clampedArrowRelX - 18)}px`;

        this.arrowUp.style.alignSelf = 'flex-start';
        this.arrowUp.style.marginLeft = arrowMargin;
        this.arrowDown.style.alignSelf = 'flex-start';
        this.arrowDown.style.marginLeft = arrowMargin;

        const isNearBottom = spotY > window.innerHeight * 0.55 || preferredDir === 'down';

        if (isNearBottom) {
            // Target di bawah (misal Tombol Command) -> Panah menunjuk ke BAWAH
            this.arrowUp.style.display = 'none';
            this.arrowDown.style.display = 'flex';

            const guideH = 190;
            let guideY = spotY - guideH - 12;
            guideY = Math.max(16, guideY);

            this.guideContainer.style.left = `${Math.round(guideX)}px`;
            this.guideContainer.style.top = `${Math.round(guideY)}px`;
        } else {
            // Target di atas (misal Menu Bar) -> Panah menunjuk ke ATAS
            this.arrowUp.style.display = 'flex';
            this.arrowDown.style.display = 'none';

            let guideY = spotY + spotH + 12;

            // Jika target berada di dalam floating toolbar vertikal di kiri, letakkan bubble di bawah seluruh toolbar agar semua tombol alat tetap terlihat jelas
            if (targetEl && targetEl.closest && targetEl.closest('.gt-mb-edit-floating-panel')) {
                const panel = targetEl.closest('.gt-mb-edit-floating-panel');
                const pRect = panel.getBoundingClientRect();
                guideY = Math.max(guideY, pRect.bottom + 14);
            }

            guideY = Math.min(guideY, window.innerHeight - 230);

            this.guideContainer.style.left = `${Math.round(guideX)}px`;
            this.guideContainer.style.top = `${Math.round(guideY)}px`;
        }
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderStep(this.currentStep);
            AudioManager.playClick();
        } else {
            this.finish();
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep(this.currentStep);
            AudioManager.playClick();
        }
    }

    finish() {
        AudioManager.playSuccess();
        this.close();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.dom.classList.remove('active');
        setTimeout(() => {
            if (this.dom) this.dom.style.display = 'none';
        }, 250);

        this.teardownKeyboard();

        // Kembalikan menu bar & floating panel ke keadaan default jika tadi dibuka saat tur
        if (this.scene && this.scene.engineMenuBar) {
            this.scene.engineMenuBar.collapse();
            if (this.scene.engineMenuBar.editFloatingPanel) {
                this.scene.engineMenuBar.editFloatingPanel.classList.remove('show');
            }
            const editBtn = document.getElementById('gt-mb-btn-edit');
            if (editBtn) editBtn.classList.remove('active');
        }

        // Kembalikan kebebasan gerak pemain
        if (this.scene) {
            this.scene.isTourActive = false;
        }
    }

    setupKeyboard() {
        this.teardownKeyboard();

        this.boundKeyHandler = (e) => {
            if (!this.isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'f') {
                e.preventDefault();
                e.stopPropagation();
                this.next();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                this.prev();
            }
        };

        window.addEventListener('keydown', this.boundKeyHandler, true);
    }

    teardownKeyboard() {
        if (this.boundKeyHandler) {
            window.removeEventListener('keydown', this.boundKeyHandler, true);
            this.boundKeyHandler = null;
        }
    }

    destroy() {
        this.close();
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
