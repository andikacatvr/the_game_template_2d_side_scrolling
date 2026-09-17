// ===============================================================
// 🧠 CODE INSPECTOR & LIVE CODE TRACER (MULTI-EVENT)
// ===============================================================
// Fitur edukasi real-time untuk anak-anak:
// 1. Gerak & Lompat (Movement & Jump - 60 FPS)
// 2. Interaksi & Dialog NPC (Auto-switch saat bicara)
// 3. Mengambil Item / Koin (Auto-switch saat pungut koin)
// 4. Terkena Rintangan / Duri (Auto-switch saat terkena hit)
// ===============================================================

import { CONFIG_SKELETON } from '../../cerita.js';

export class CodeInspector {
    static isLiveActive = false;
    static container = null;
    static currentTab = 'move'; // 'move' | 'npc' | 'coin' | 'hazard'
    static autoReturnTimer = null;
    static lastStateKey = null;
    static lastAction = 'jump';

    static snippets = {
        jump: {
            title: 'Logika Lompat & Gravitasi Karakter',
            file: 'src/scenes/GameScene.js',
            description: 'Karakter hanya boleh melompat jika menyentuh tanah (blocked.down) untuk mencegah lompat tanpa batas di udara.',
            code: `const isJumpPressed = this.keys.w.isDown || this.cursors.up.isDown || this.keys.space.isDown;\nif (isJumpPressed && this.player.body.blocked.down) {\n    this.player.setVelocityY(-330);\n    AudioManager.playJump();\n}`
        },
        move: {
            title: 'Logika Berjalan Kiri & Kanan',
            file: 'src/scenes/GameScene.js',
            description: 'Mengatur kecepatan horizontal (VelocityX) dan membalikkan arah hadap sprite (flipX).',
            code: `const speed = CONFIG_SKELETON.player.kecepatan || 220;\nif (this.keys.a.isDown || this.cursors.left.isDown) {\n    this.player.setVelocityX(-speed);\n    this.player.setFlipX(true);\n} else if (this.keys.d.isDown || this.cursors.right.isDown) {\n    this.player.setVelocityX(speed);\n    this.player.setFlipX(false);\n} else {\n    this.player.setVelocityX(0);\n}`
        },
        npc: {
            title: 'Interaksi & Dialog dengan NPC',
            file: 'src/scenes/GameScene.js & src/ui/DialogBox.js',
            description: 'Memeriksa jarak karakter dengan NPC. Jika dekat dan menekan [E], buka kotak dialog percakapan RPG.',
            code: `const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);\nif (dist < 75 && Phaser.Input.Keyboard.JustDown(this.keys.e)) {\n    this.dialogBox.start(CONFIG_SKELETON.npc.nama, CONFIG_SKELETON.npc.dialog);\n}`
        },
        coin: {
            title: 'Mengambil Koin & Menyimpan ke Tas (Inventory)',
            file: 'src/scenes/GameScene.js',
            description: 'Overlap fisik antara player dan koin item akan memicu penambahan item ke dalam array inventaris.',
            code: `this.physics.add.overlap(this.player, this.items, (player, item) => {\n    item.destroy();\n    AudioManager.playCoin();\n    this.inventory.push({ id: 'gold_coin', nama: 'Koin Emas Murni', icon: '🪙' });\n    this.quest.selesai = true;\n});`
        },
        hazard: {
            title: 'Terkena Duri / Musuh (Mengurangi HP & Efek Berkedip)',
            file: 'src/scenes/GameScene.js',
            description: 'Mengurangi poin kesehatan (HP), memberikan jeda kebal sementara (invincibility), dan efek animasi berkedip.',
            code: `takeDamage(amount) {\n    if (this.isInvincible || this.isGameOver) return;\n    this.hp = Math.max(0, this.hp - amount);\n    this.isInvincible = true;\n    AudioManager.playHurt();\n    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 120, yoyo: true, repeat: 3 });\n}`
        },
        zoom: {
            title: 'Pengatur Kamera Zoom Dinamis',
            file: 'src/utils/CameraZoomManager.js',
            description: 'Mengatur level zoom kamera (Touchpad pinch, mouse wheel, layar sentuh, dan tombol HUD %)',
            code: `setZoom(targetZoom) {\n    this.currentZoom = Phaser.Math.Clamp(targetZoom, this.minZoom, this.maxZoom);\n    this.scene.cameras.main.setZoom(this.currentZoom);\n}`
        },
        portal: {
            title: 'Logika Portal Pindah Scene / Kemenangan',
            file: 'src/scenes/GameScene.js',
            description: 'Memeriksa apakah syarat quest terpenuhi sebelum mengizinkan pemain masuk ke gerbang level berikutnya.',
            code: `this.physics.add.overlap(this.player, this.portal, () => {\n    if (!this.quest.selesai) return;\n    this.victoryModal.show();\n    AudioManager.playSuccess();\n});`
        }
    };

    static record(actionKey) {
        if (this.snippets[actionKey]) {
            this.lastAction = actionKey;
        }
    }

    static get(topic = null) {
        const key = (topic && topic.trim().toLowerCase()) || this.lastAction;
        if (this.snippets[key]) {
            return { key, ...this.snippets[key] };
        }
        return null;
    }

    static getAllTopics() {
        return Object.keys(this.snippets);
    }

    // ===============================================================
    // ⚡ REAL-TIME LIVE INSPECTOR (HUD OVERLAY)
    // ===============================================================

    static isActive() {
        return this.isLiveActive;
    }

    static toggleLive() {
        if (this.isLiveActive) {
            this.hideLive();
            return false;
        } else {
            this.showLive();
            return true;
        }
    }

    static showLive() {
        this.isLiveActive = true;
        this.ensureDOM();
        if (this.container) {
            this.container.style.display = 'block';
            this.syncSlidersWithActiveScene();
        }
    }

    static syncSlidersWithActiveScene() {
        if (!this.container) return;
        const scene = this.getActiveScene();
        const defSpeed = (CONFIG_SKELETON.player && CONFIG_SKELETON.player.kecepatan) || 220;
        const defJump = (CONFIG_SKELETON.player && CONFIG_SKELETON.player.kekuatanLompat) || 440;
        const defGrav = 650;

        const currentSpeed = (scene && scene.customSpeed) ? scene.customSpeed : defSpeed;
        const currentJump = (scene && scene.customJump) ? Math.abs(scene.customJump) : defJump;
        const currentGrav = (scene && scene.physics && scene.physics.world && scene.physics.world.gravity) ? scene.physics.world.gravity.y : defGrav;

        const speedSlider = this.container.querySelector('#lci-input-speed');
        const jumpSlider = this.container.querySelector('#lci-input-jump');
        const gravSlider = this.container.querySelector('#lci-input-grav');
        const spdEl = this.container.querySelector('#lci-val-speed');
        const jmpEl = this.container.querySelector('#lci-val-jump');
        const grvEl = this.container.querySelector('#lci-val-grav');

        if (speedSlider) speedSlider.value = currentSpeed;
        if (jumpSlider) jumpSlider.value = currentJump;
        if (gravSlider) gravSlider.value = currentGrav;
        if (spdEl) spdEl.textContent = currentSpeed;
        if (jmpEl) jmpEl.textContent = currentJump;
        if (grvEl) grvEl.textContent = currentGrav;
    }

    static hideLive() {
        this.isLiveActive = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    static setTab(tabKey) {
        this.currentTab = tabKey;
        this.ensureDOM();

        // Update tab buttons
        const tabs = this.container.querySelectorAll('.lci-tab');
        tabs.forEach(btn => {
            if (btn.dataset.tab === tabKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show/hide code blocks
        const blocks = this.container.querySelectorAll('.lci-code-block');
        blocks.forEach(blk => {
            blk.style.display = (blk.id === `lci-block-${tabKey}`) ? 'flex' : 'none';
        });

        // Set status defaults
        const statusText = this.container.querySelector('#lci-status-text');
        const coordsText = this.container.querySelector('#lci-coords-text');

        if (tabKey === 'move') {
            if (statusText) {
                statusText.textContent = '⏸️ DIAM (IDLE)';
                statusText.style.color = '#38bdf8';
            }
            if (coordsText) coordsText.style.display = 'block';
        } else if (tabKey === 'npc') {
            if (statusText) {
                statusText.textContent = '💬 INTERAKSI NPC (Tekan [E])';
                statusText.style.color = '#c084fc';
            }
            if (coordsText) coordsText.style.display = 'none';
        } else if (tabKey === 'coin') {
            if (statusText) {
                statusText.textContent = '🪙 AMBIL ITEM (Overlap Fisika)';
                statusText.style.color = '#fbbf24';
            }
            if (coordsText) coordsText.style.display = 'none';
        } else if (tabKey === 'hazard') {
            if (statusText) {
                statusText.textContent = '💥 KENA DURI / DAMAGE (takeDamage)';
                statusText.style.color = '#f87171';
            }
            if (coordsText) coordsText.style.display = 'none';
        }

        this.lastStateKey = null; // force re-render
    }

    /**
     * Pemicu Event Dinamis (NPC, Koin, Damage/Duri)
     * Otomatis berpindah tab dan menyalakan animasi highlight baris kode!
     */
    static triggerEvent(eventType, data = {}) {
        if (!this.isLiveActive) return;
        this.ensureDOM();

        if (eventType === 'npc') {
            this.setTab('npc');
            const l3 = this.container.querySelector('#lci-npc-l3');
            const l4 = this.container.querySelector('#lci-npc-l4');
            const l5 = this.container.querySelector('#lci-npc-l5');
            const st = this.container.querySelector('#lci-status-text');
            if (l3) l3.classList.add('active-npc');
            if (l4) l4.classList.add('active-npc');
            if (l5) l5.classList.add('active-npc');
            if (st) {
                st.textContent = `💬 SEDANG BICARA: "${data.name || 'NPC'}" (Dialog Box Terbuka!)`;
                st.style.color = '#d8b4fe';
            }
            this.scheduleAutoReturn(4500);
        } else if (eventType === 'coin') {
            this.setTab('coin');
            const l3 = this.container.querySelector('#lci-coin-l3');
            const l4 = this.container.querySelector('#lci-coin-l4');
            const l5 = this.container.querySelector('#lci-coin-l5');
            const st = this.container.querySelector('#lci-status-text');
            if (l3) l3.classList.add('active-coin');
            if (l4) l4.classList.add('active-coin');
            if (l5) l5.classList.add('active-coin');
            if (st) {
                st.textContent = `🪙 ITEM DIAMBIL: "${data.item || 'Koin'}" (+1 Masuk Tas!)`;
                st.style.color = '#fde047';
            }
            this.scheduleAutoReturn(3500);
        } else if (eventType === 'hazard') {
            this.setTab('hazard');
            const l3 = this.container.querySelector('#lci-haz-l3');
            const l4 = this.container.querySelector('#lci-haz-l4');
            const l5 = this.container.querySelector('#lci-haz-l5');
            const st = this.container.querySelector('#lci-status-text');
            if (l3) l3.classList.add('active-hazard');
            if (l4) l4.classList.add('active-hazard');
            if (l5) l5.classList.add('active-hazard');
            if (st) {
                st.textContent = `💥 TERKENA RINTANGAN! (HP berkurang & kebal sementara)`;
                st.style.color = '#f87171';
            }
            this.scheduleAutoReturn(3500);
        }
    }

    static scheduleAutoReturn(delayMs = 3500) {
        if (this.autoReturnTimer) clearTimeout(this.autoReturnTimer);
        this.autoReturnTimer = setTimeout(() => {
            if (this.isLiveActive) {
                this.setTab('move');
            }
        }, delayMs);
    }

    static ensureDOM() {
        if (this.container && document.body.contains(this.container)) return;

        const old = document.getElementById('live-code-inspector');
        if (old) old.remove();

        this.container = document.createElement('div');
        this.container.id = 'live-code-inspector';
        this.container.innerHTML = `
            <style>
                #live-code-inspector {
                    position: fixed;
                    top: 60px;
                    left: 16px;
                    width: min(510px, calc(100vw - 32px));
                    z-index: 99990;
                    font-family: 'Consolas', 'Courier New', monospace;
                    background: rgba(10, 25, 41, 0.94);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 2px solid #38bdf8;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.35);
                    border-radius: 10px;
                    overflow: hidden;
                    box-sizing: border-box;
                    user-select: none;
                    pointer-events: auto;
                }

                .lci-header {
                    background: #0f172a;
                    padding: 7px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(56, 189, 248, 0.3);
                    cursor: grab;
                }
                .lci-header:active {
                    cursor: grabbing;
                }

                .lci-title {
                    font-size: 12.5px;
                    font-weight: 800;
                    color: #e0f2fe;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                }

                .lci-badge {
                    background: #0284c7;
                    color: #ffffff;
                    font-size: 9.5px;
                    font-weight: 900;
                    padding: 1px 6px;
                    border-radius: 4px;
                    letter-spacing: 0.5px;
                }

                .lci-close {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 0 4px;
                    line-height: 1;
                }
                .lci-close:hover {
                    color: #ef4444;
                }

                /* TABS SELECTOR */
                .lci-tabs-bar {
                    background: #071322;
                    display: flex;
                    gap: 3px;
                    padding: 4px 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    overflow-x: auto;
                }
                .lci-tab {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #94a3b8;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 3px 9px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-family: 'Segoe UI', sans-serif;
                    white-space: nowrap;
                    transition: all 0.1s;
                }
                .lci-tab:hover {
                    background: rgba(56, 189, 248, 0.2);
                    color: #ffffff;
                }
                .lci-tab.active {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #ffffff;
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
                }

                .lci-status-bar {
                    background: #030712;
                    padding: 5px 12px;
                    font-size: 11px;
                    color: #94a3b8;
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .lci-state-label {
                    font-weight: 800;
                    color: #38bdf8;
                }

                .lci-code-body {
                    padding: 7px 10px;
                    font-size: 11.5px;
                    line-height: 1.5;
                    color: #94a3b8;
                    max-height: 220px;
                    overflow-y: auto;
                }

                .lci-code-block {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }

                .lci-line {
                    display: flex;
                    align-items: baseline;
                    padding: 1px 6px;
                    border-radius: 4px;
                    transition: background 0.08s, color 0.08s, transform 0.08s;
                    white-space: pre;
                }

                .lci-num {
                    width: 22px;
                    color: #475569;
                    font-size: 10px;
                    user-select: none;
                    flex-shrink: 0;
                }

                .lci-text {
                    color: #cbd5e1;
                }

                /* HIGHLIGHT: GERAK JALAN (HIJAU NEON BOLD) */
                .lci-line.active-move {
                    background: rgba(34, 197, 94, 0.28) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #22c55e;
                    transform: scale(1.01);
                }
                .lci-line.active-move .lci-text {
                    color: #4ade80 !important;
                    font-weight: 900 !important;
                    text-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
                }

                /* HIGHLIGHT: LOMPAT (KUNING NEON BOLD) */
                .lci-line.active-jump {
                    background: rgba(250, 204, 21, 0.32) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #facc15;
                    transform: scale(1.02);
                }
                .lci-line.active-jump .lci-text {
                    color: #fef08a !important;
                    font-weight: 900 !important;
                    text-shadow: 0 0 10px rgba(250, 204, 21, 0.8);
                }

                /* HIGHLIGHT: DIAM (IDLE) */
                .lci-line.active-idle {
                    background: rgba(56, 189, 248, 0.15) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #38bdf8;
                }
                .lci-line.active-idle .lci-text {
                    color: #7dd3fc !important;
                    font-weight: 800 !important;
                }

                /* HIGHLIGHT: NPC (UNGU NEON BOLD) */
                .lci-line.active-npc {
                    background: rgba(192, 132, 252, 0.35) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #c084fc;
                    transform: scale(1.02);
                }
                .lci-line.active-npc .lci-text {
                    color: #e9d5ff !important;
                    font-weight: 900 !important;
                    text-shadow: 0 0 10px rgba(192, 132, 252, 0.8);
                }

                /* HIGHLIGHT: KOIN (EMAS NEON BOLD) */
                .lci-line.active-coin {
                    background: rgba(251, 191, 36, 0.38) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #f59e0b;
                    transform: scale(1.02);
                }
                .lci-line.active-coin .lci-text {
                    color: #fef08a !important;
                    font-weight: 900 !important;
                    text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
                }

                /* HIGHLIGHT: HAZARD (MERAH NEON BOLD) */
                .lci-line.active-hazard {
                    background: rgba(239, 68, 68, 0.38) !important;
                    color: #ffffff !important;
                    border-left: 3px solid #ef4444;
                    transform: scale(1.02);
                }
                .lci-line.active-hazard .lci-text {
                    color: #fca5a5 !important;
                    font-weight: 900 !important;
                    text-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
                }

                /* SLIDER PANEL */
                .lci-sliders-panel {
                    background: #030a13;
                    border-top: 1px solid rgba(56, 189, 248, 0.25);
                    padding: 6px 12px 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-family: 'Segoe UI', sans-serif;
                }
                .lci-sliders-title {
                    font-size: 10px;
                    font-weight: 800;
                    color: #38bdf8;
                    letter-spacing: 0.5px;
                }
                .lci-slider-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    font-size: 11px;
                    color: #cbd5e1;
                }
                .lci-slider-label {
                    width: 145px;
                    flex-shrink: 0;
                    font-size: 11px;
                }
                .lci-slider-label b {
                    color: #facc15;
                }
                .lci-slider {
                    flex: 1;
                    height: 5px;
                    accent-color: #38bdf8;
                    cursor: pointer;
                }
                .lci-btn-reset {
                    background: #1e293b;
                    border: 1px solid #475569;
                    color: #e2e8f0;
                    border-radius: 4px;
                    padding: 2px 8px;
                    font-size: 10px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .lci-btn-reset:hover {
                    background: #334155;
                    color: #ffffff;
                }

                .lci-comment { color: #64748b; font-style: italic; }
                .lci-kw { color: #f472b6; font-weight: bold; }
                .lci-fn { color: #38bdf8; }
            </style>

            <div class="lci-header" id="lci-drag-handle">
                <div class="lci-title">
                    <span>⚡</span>
                    <span>LIVE CODE INSPECTOR</span>
                    <span class="lci-badge">REAL-TIME</span>
                </div>
                <button class="lci-close" id="lci-btn-close" title="Tutup Inspector">✕</button>
            </div>

            <!-- TABS PEMILIH KATEGORI KODE -->
            <div class="lci-tabs-bar">
                <button class="lci-tab active" data-tab="move">🏃 Gerak &amp; Lompat</button>
                <button class="lci-tab" data-tab="npc">💬 Bicara NPC</button>
                <button class="lci-tab" data-tab="coin">🪙 Ambil Koin</button>
                <button class="lci-tab" data-tab="hazard">💥 Kena Duri/Hit</button>
            </div>

            <div class="lci-status-bar">
                <div>Status: <span id="lci-status-text" class="lci-state-label">⏸️ DIAM (IDLE)</span></div>
                <div id="lci-coords-text">vX: 0 | diTanah: YA</div>
            </div>

            <div class="lci-code-body">
                <!-- 1. BLOK KODE: GERAK & LOMPAT -->
                <div class="lci-code-block" id="lci-block-move" style="display: flex;">
                    <div class="lci-line" id="lci-l1"><span class="lci-num">1</span><span class="lci-text"><span class="lci-kw">if</span> (left) {</span></div>
                    <div class="lci-line" id="lci-l2"><span class="lci-num">2</span><span class="lci-text">    player.<span class="lci-fn">setVelocityX</span>(-speed); <span class="lci-comment">// ◀ Jalan Kiri</span></span></div>
                    <div class="lci-line" id="lci-l3"><span class="lci-num">3</span><span class="lci-text">    player.<span class="lci-fn">setFlipX</span>(true);</span></div>
                    <div class="lci-line" id="lci-l4"><span class="lci-num">4</span><span class="lci-text">} <span class="lci-kw">else if</span> (right) {</span></div>
                    <div class="lci-line" id="lci-l5"><span class="lci-num">5</span><span class="lci-text">    player.<span class="lci-fn">setVelocityX</span>(speed);  <span class="lci-comment">// ▶ Jalan Kanan</span></span></div>
                    <div class="lci-line" id="lci-l6"><span class="lci-num">6</span><span class="lci-text">    player.<span class="lci-fn">setFlipX</span>(false);</span></div>
                    <div class="lci-line" id="lci-l7"><span class="lci-num">7</span><span class="lci-text">} <span class="lci-kw">else</span> {</span></div>
                    <div class="lci-line" id="lci-l8"><span class="lci-num">8</span><span class="lci-text">    player.<span class="lci-fn">setVelocityX</span>(0);      <span class="lci-comment">// ⏸️ Berhenti (Idle)</span></span></div>
                    <div class="lci-line" id="lci-l9"><span class="lci-num">9</span><span class="lci-text">}</span></div>
                    <div class="lci-line" id="lci-l10"><span class="lci-num">10</span><span class="lci-text"><span class="lci-kw">if</span> (jump &amp;&amp; player.body.blocked.down) {</span></div>
                    <div class="lci-line" id="lci-l11"><span class="lci-num">11</span><span class="lci-text">    player.<span class="lci-fn">setVelocityY</span>(jumpSpeed); <span class="lci-comment">// 🚀 LOMPAT!</span></span></div>
                    <div class="lci-line" id="lci-l12"><span class="lci-num">12</span><span class="lci-text">    AudioManager.<span class="lci-fn">playJump</span>();</span></div>
                    <div class="lci-line" id="lci-l13"><span class="lci-num">13</span><span class="lci-text">}</span></div>
                </div>

                <!-- 2. BLOK KODE: BICARA NPC -->
                <div class="lci-code-block" id="lci-block-npc" style="display: none;">
                    <div class="lci-line" id="lci-npc-l1"><span class="lci-num">1</span><span class="lci-text"><span class="lci-comment">// Cek jarak antara pemain dan karakter NPC</span></span></div>
                    <div class="lci-line" id="lci-npc-l2"><span class="lci-num">2</span><span class="lci-text"><span class="lci-kw">const</span> dist = Distance(player.x, player.y, npc.x, npc.y);</span></div>
                    <div class="lci-line" id="lci-npc-l3"><span class="lci-num">3</span><span class="lci-text"><span class="lci-kw">if</span> (dist &lt; 75 &amp;&amp; isInteractPressed) {</span></div>
                    <div class="lci-line" id="lci-npc-l4"><span class="lci-num">4</span><span class="lci-text">    dialogBox.<span class="lci-fn">start</span>(npc.nama, npc.dialog); <span class="lci-comment">// 💬 Buka Dialog RPG!</span></span></div>
                    <div class="lci-line" id="lci-npc-l5"><span class="lci-num">5</span><span class="lci-text">    AudioManager.<span class="lci-fn">playClick</span>();</span></div>
                    <div class="lci-line" id="lci-npc-l6"><span class="lci-num">6</span><span class="lci-text">}</span></div>
                </div>

                <!-- 3. BLOK KODE: AMBIL KOIN -->
                <div class="lci-code-block" id="lci-block-coin" style="display: none;">
                    <div class="lci-line" id="lci-coin-l1"><span class="lci-num">1</span><span class="lci-text"><span class="lci-comment">// Deteksi tabrakan fisika (overlap) pemain dengan item</span></span></div>
                    <div class="lci-line" id="lci-coin-l2"><span class="lci-num">2</span><span class="lci-text">physics.add.<span class="lci-fn">overlap</span>(player, items, (player, item) =&gt; {</span></div>
                    <div class="lci-line" id="lci-coin-l3"><span class="lci-num">3</span><span class="lci-text">    item.<span class="lci-fn">destroy</span>(); <span class="lci-comment">// 🗑️ Hapus koin dari layar</span></span></div>
                    <div class="lci-line" id="lci-coin-l4"><span class="lci-num">4</span><span class="lci-text">    inventory.<span class="lci-fn">push</span>({ id, nama, icon: <span class="lci-comment">'🪙'</span> }); <span class="lci-comment">// 🎒 Simpan ke Tas!</span></span></div>
                    <div class="lci-line" id="lci-coin-l5"><span class="lci-num">5</span><span class="lci-text">    AudioManager.<span class="lci-fn">playCoin</span>(); <span class="lci-comment">// 🔔 Suara ting!</span></span></div>
                    <div class="lci-line" id="lci-coin-l6"><span class="lci-num">6</span><span class="lci-text">    quest.selesai = <span class="lci-kw">true</span>;</span></div>
                    <div class="lci-line" id="lci-coin-l7"><span class="lci-num">7</span><span class="lci-text">});</span></div>
                </div>

                <!-- 4. BLOK KODE: KENA DURI / DAMAGE -->
                <div class="lci-code-block" id="lci-block-hazard" style="display: none;">
                    <div class="lci-line" id="lci-haz-l1"><span class="lci-num">1</span><span class="lci-text"><span class="lci-fn">takeDamage</span>(amount) {</span></div>
                    <div class="lci-line" id="lci-haz-l2"><span class="lci-num">2</span><span class="lci-text">    <span class="lci-kw">if</span> (isInvincible || isGameOver) <span class="lci-kw">return</span>;</span></div>
                    <div class="lci-line" id="lci-haz-l3"><span class="lci-num">3</span><span class="lci-text">    hp = Math.<span class="lci-fn">max</span>(0, hp - amount); <span class="lci-comment">// 💔 Kurangi 1 HP</span></span></div>
                    <div class="lci-line" id="lci-haz-l4"><span class="lci-num">4</span><span class="lci-text">    AudioManager.<span class="lci-fn">playHurt</span>();</span></div>
                    <div class="lci-line" id="lci-haz-l5"><span class="lci-num">5</span><span class="lci-text">    isInvincible = <span class="lci-kw">true</span>; <span class="lci-comment">// 🛡️ Mode Kebal Sementara</span></span></div>
                    <div class="lci-line" id="lci-haz-l6"><span class="lci-num">6</span><span class="lci-text">    playerBlinkTween(4); <span class="lci-comment">// Animasi kedip</span></span></div>
                    <div class="lci-line" id="lci-haz-l7"><span class="lci-num">7</span><span class="lci-text">}</span></div>
                </div>
            </div>

            <!-- SLIDER PANEL (LIVE PARAMETER TWEAKER) -->
            <div class="lci-sliders-panel">
                <div class="lci-sliders-title">🎛️ COBA GESER ANGKA VARIABEL (REAL-TIME):</div>
                <div class="lci-slider-row">
                    <span class="lci-slider-label">🏃 Kecepatan: <b id="lci-val-speed">220</b></span>
                    <input type="range" class="lci-slider" id="lci-input-speed" min="100" max="600" value="220" />
                </div>
                <div class="lci-slider-row">
                    <span class="lci-slider-label">🚀 Daya Lompat: <b id="lci-val-jump">440</b></span>
                    <input type="range" class="lci-slider" id="lci-input-jump" min="200" max="800" value="440" />
                </div>
                <div class="lci-slider-row">
                    <span class="lci-slider-label">🌍 Gravitasi: <b id="lci-val-grav">650</b></span>
                    <input type="range" class="lci-slider" id="lci-input-grav" min="100" max="1400" value="650" />
                    <button class="lci-btn-reset" id="lci-btn-reset" title="Kembalikan nilai ke normal">↺ Reset</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Bind tab buttons
        const tabs = this.container.querySelectorAll('.lci-tab');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.autoReturnTimer) clearTimeout(this.autoReturnTimer);
                this.setTab(btn.dataset.tab);
            });
        });

        // Bind sliders
        const speedSlider = this.container.querySelector('#lci-input-speed');
        const jumpSlider = this.container.querySelector('#lci-input-jump');
        const gravSlider = this.container.querySelector('#lci-input-grav');
        const resetBtn = this.container.querySelector('#lci-btn-reset');

        const updateSliders = () => {
            const scene = this.getActiveScene();
            const spd = parseInt(speedSlider.value, 10);
            const jmp = parseInt(jumpSlider.value, 10);
            const grv = parseInt(gravSlider.value, 10);

            const spdEl = this.container.querySelector('#lci-val-speed');
            const jmpEl = this.container.querySelector('#lci-val-jump');
            const grvEl = this.container.querySelector('#lci-val-grav');
            if (spdEl) spdEl.textContent = spd;
            if (jmpEl) jmpEl.textContent = jmp;
            if (grvEl) grvEl.textContent = grv;

            if (scene) {
                scene.customSpeed = spd;
                scene.customJump = -jmp;
                if (scene.physics && scene.physics.world) {
                    scene.physics.world.gravity.y = grv;
                }
            }
        };

        if (speedSlider) speedSlider.addEventListener('input', updateSliders);
        if (jumpSlider) jumpSlider.addEventListener('input', updateSliders);
        if (gravSlider) gravSlider.addEventListener('input', updateSliders);

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const defSpeed = (CONFIG_SKELETON.player && CONFIG_SKELETON.player.kecepatan) || 220;
                const defJump = (CONFIG_SKELETON.player && CONFIG_SKELETON.player.kekuatanLompat) || 440;
                const defGrav = 650;
                if (speedSlider) speedSlider.value = defSpeed;
                if (jumpSlider) jumpSlider.value = defJump;
                if (gravSlider) gravSlider.value = defGrav;
                updateSliders();
            });
        }

        // Event close
        const closeBtn = this.container.querySelector('#lci-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLive());
        }

        this.setupDrag();
    }

    static getActiveScene() {
        if (!window.__templateGame) return null;
        const scenes = window.__templateGame.scene.getScenes(true);
        return scenes && scenes.length > 0 ? scenes[0] : null;
    }

    static setupDrag() {
        const handle = this.container.querySelector('#lci-drag-handle');
        if (!handle) return;

        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        const onDown = (clientX, clientY, target) => {
            if (target && target.closest('button')) return;
            isDragging = true;
            startX = clientX;
            startY = clientY;
            const rect = this.container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            this.container.style.left = `${initialLeft}px`;
            this.container.style.top = `${initialTop}px`;
            this.container.style.right = 'auto';
            document.body.style.userSelect = 'none';
        };

        const onMove = (clientX, clientY) => {
            if (!isDragging) return;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            this.container.style.left = `${Math.max(10, Math.min(window.innerWidth - 300, initialLeft + deltaX))}px`;
            this.container.style.top = `${Math.max(10, Math.min(window.innerHeight - 100, initialTop + deltaY))}px`;
        };

        const onUp = () => {
            isDragging = false;
            document.body.style.userSelect = '';
        };

        handle.addEventListener('mousedown', (e) => {
            onDown(e.clientX, e.clientY, e.target);
            const moveH = (ev) => onMove(ev.clientX, ev.clientY);
            const upH = () => {
                window.removeEventListener('mousemove', moveH);
                window.removeEventListener('mouseup', upH);
                onUp();
            };
            window.addEventListener('mousemove', moveH);
            window.addEventListener('mouseup', upH);
        });

        handle.addEventListener('touchstart', (e) => {
            if (!e.touches[0]) return;
            onDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
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
    }

    /**
     * Dipanggil setiap frame (60 FPS) dari update() game scene
     * Hanya memperbarui state gerak & lompat jika tab aktif adalah 'move'
     */
    static updateRealtime(state) {
        if (!this.isLiveActive || !this.container) return;
        if (this.currentTab !== 'move') return;

        const left = Boolean(state.left);
        const right = Boolean(state.right);
        const jump = Boolean(state.jump);
        const grounded = Boolean(state.grounded);
        const vx = Math.round(state.vx || 0);
        const vy = Math.round(state.vy || 0);

        const stateKey = `${left}_${right}_${jump}_${grounded}_${vx}_${vy}`;
        if (this.lastStateKey === stateKey) return;
        this.lastStateKey = stateKey;

        const l1 = this.container.querySelector('#lci-l1');
        const l2 = this.container.querySelector('#lci-l2');
        const l3 = this.container.querySelector('#lci-l3');
        const l4 = this.container.querySelector('#lci-l4');
        const l5 = this.container.querySelector('#lci-l5');
        const l6 = this.container.querySelector('#lci-l6');
        const l7 = this.container.querySelector('#lci-l7');
        const l8 = this.container.querySelector('#lci-l8');
        const l9 = this.container.querySelector('#lci-l9');
        const l10 = this.container.querySelector('#lci-l10');
        const l11 = this.container.querySelector('#lci-l11');
        const l12 = this.container.querySelector('#lci-l12');
        const l13 = this.container.querySelector('#lci-l13');

        const statusText = this.container.querySelector('#lci-status-text');
        const coordsText = this.container.querySelector('#lci-coords-text');

        // Reset highlight
        [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13].forEach(el => {
            if (el) el.classList.remove('active-move', 'active-jump', 'active-idle');
        });

        // 1. Horizontal Move Logic
        if (left) {
            if (l1) l1.classList.add('active-move');
            if (l2) l2.classList.add('active-move');
            if (l3) l3.classList.add('active-move');
            if (statusText) {
                statusText.textContent = '◀ BERJALAN KIRI';
                statusText.style.color = '#4ade80';
            }
        } else if (right) {
            if (l4) l4.classList.add('active-move');
            if (l5) l5.classList.add('active-move');
            if (l6) l6.classList.add('active-move');
            if (statusText) {
                statusText.textContent = '▶ BERJALAN KANAN';
                statusText.style.color = '#4ade80';
            }
        } else {
            if (l7) l7.classList.add('active-idle');
            if (l8) l8.classList.add('active-idle');
            if (statusText) {
                statusText.textContent = '⏸️ DIAM (IDLE)';
                statusText.style.color = '#38bdf8';
            }
        }

        // 2. Jump Logic
        if (jump && grounded) {
            if (l10) l10.classList.add('active-jump');
            if (l11) l11.classList.add('active-jump');
            if (l12) l12.classList.add('active-jump');
            if (statusText) {
                statusText.textContent = '🚀 MELOMPAT (JUMP)!';
                statusText.style.color = '#facc15';
            }
        } else if (!grounded) {
            if (vy < 0) {
                if (l11) l11.classList.add('active-jump');
                if (statusText && !left && !right) {
                    statusText.textContent = '⬆️ NAIK KE ATAS';
                    statusText.style.color = '#facc15';
                }
            } else {
                if (statusText && !left && !right) {
                    statusText.textContent = '⬇️ JATUH (GRAVITASI)';
                    statusText.style.color = '#cbd5e1';
                }
            }
        }

        if (coordsText) {
            coordsText.textContent = `vX: ${vx} | vY: ${vy} | diTanah: ${grounded ? 'YA' : 'TIDAK'}`;
        }
    }
}
