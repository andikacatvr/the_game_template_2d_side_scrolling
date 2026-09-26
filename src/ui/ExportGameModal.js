// ===============================================================
// EXPORT GAME MODAL & PACKAGING ENGINE (JSZIP)
// ===============================================================
// Menghasilkan file ZIP game mandiri (Standalone Pure Game):
// 1. Mengambil judul game & nama murid
// 2. Opsi: Pure Game Mode (tanpa dev console & menu editor)
// 3. Mengemas HTML + JS + Assets menjadi 1 file ZIP yang siap dimainkan!
// ===============================================================

import JSZip from 'jszip';
import { CONFIG_SKELETON } from '../../cerita.js';
import { AudioManager } from '../utils/AudioManager.js';

export class ExportGameModal {
    static instance = null;

    constructor(scene = null) {
        if (ExportGameModal.instance) {
            if (scene) ExportGameModal.instance.scene = scene;
            return ExportGameModal.instance;
        }
        ExportGameModal.instance = this;
        this.scene = scene;
        this.isOpen = false;
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-export-modal-overlay');
        if (oldEl) oldEl.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-export-modal-overlay';
        this.overlay.className = 'gt-exp-overlay hidden';

        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');

                .gt-exp-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(4, 8, 19, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    font-family: 'Inter', sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                    transition: opacity 0.2s ease, visibility 0.2s ease;
                }

                .gt-exp-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-exp-card {
                    width: min(560px, 94vw);
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 14px;
                    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(2, 132, 199, 0.2);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: expEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes expEnter {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .gt-exp-header {
                    padding: 18px 22px;
                    background: #202020;
                    border-bottom: 1px solid #2d2d2d;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-exp-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                }

                .gt-exp-close {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: transparent;
                    border: none;
                    color: #888888;
                    font-size: 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gt-exp-close:hover {
                    background: #e11d48;
                    color: #fff;
                }

                .gt-exp-body {
                    padding: 22px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    color: #d1d5db;
                    font-size: 13px;
                }

                .gt-exp-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .gt-exp-label {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #94a3b8;
                }

                .gt-exp-input {
                    background: #242424;
                    border: 1px solid #383838;
                    border-radius: 6px;
                    padding: 9px 12px;
                    color: #ffffff;
                    font-size: 13.5px;
                    outline: none;
                    font-family: inherit;
                    transition: border-color 0.15s;
                }

                .gt-exp-input:focus {
                    border-color: #0284c7;
                }

                .gt-exp-options-box {
                    background: #202020;
                    border: 1px solid #2d2d2d;
                    border-radius: 8px;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .gt-exp-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 12.5px;
                    color: #f1f5f9;
                    cursor: pointer;
                }

                .gt-exp-footer {
                    padding: 16px 22px;
                    background: #1c1c1c;
                    border-top: 1px solid #2d2d2d;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-exp-btn-export {
                    padding: 10px 22px;
                    background: #0284c7;
                    border: none;
                    border-radius: 6px;
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s ease;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
                }

                .gt-exp-btn-export:hover {
                    background: #0ea5e9;
                    transform: scale(1.02);
                }

                .gt-exp-btn-cancel {
                    padding: 9px 16px;
                    background: transparent;
                    border: 1px solid #444444;
                    border-radius: 6px;
                    color: #a3a3a3;
                    font-size: 13px;
                    cursor: pointer;
                }

                .gt-exp-btn-cancel:hover {
                    background: #2b2b2b;
                    color: #fff;
                }

                .gt-exp-progress-bar {
                    height: 4px;
                    background: #0284c7;
                    width: 0%;
                    transition: width 0.3s ease;
                }
            </style>

            <div class="gt-exp-card">
                <div class="gt-exp-header">
                    <h3 class="gt-exp-title">
                        <span>📦</span> Ekspor Game Mandiri (Pure Standalone)
                    </h3>
                    <button class="gt-exp-close" id="gt-exp-btn-close">✕</button>
                </div>
                <div class="gt-exp-progress-bar" id="gt-exp-progress"></div>

                <div class="gt-exp-body">
                    <p style="margin: 0; line-height: 1.5; color: #a3a3a3;">
                        Hasil ekspor adalah <b>game murni 100% milikmu</b>: tanpa tulisan template, tanpa chat console, dan siap kamu bagikan ke teman atau orang tua!
                    </p>

                    <div class="gt-exp-form-group">
                        <label class="gt-exp-label">Judul Game Kreasimu:</label>
                        <input type="text" class="gt-exp-input" id="gt-exp-title" value="${CONFIG_SKELETON.judulGame || 'Petualangan Kucing Ninja'}" />
                    </div>

                    <div class="gt-exp-form-group">
                        <label class="gt-exp-label">Nama Pembuat / Kelompok:</label>
                        <input type="text" class="gt-exp-input" id="gt-exp-author" value="${CONFIG_SKELETON.namaKelompok || 'Developer Cilik'}" />
                    </div>

                    <div class="gt-exp-options-box">
                        <label class="gt-exp-checkbox-label">
                            <input type="checkbox" id="gt-exp-opt-pure" checked />
                            <span><b>Mode Pure Game:</b> Sembunyikan Menu Bar &amp; Dev Console.</span>
                        </label>
                        <label class="gt-exp-checkbox-label">
                            <input type="checkbox" id="gt-exp-opt-direct" checked />
                            <span><b>Auto Start:</b> Langsung masuk ke Dunia Kreasimu (Scene 3).</span>
                        </label>
                    </div>
                </div>

                <div class="gt-exp-footer">
                    <button class="gt-exp-btn-cancel" id="gt-exp-btn-cancel">Batal</button>
                    <button class="gt-exp-btn-export" id="gt-exp-btn-download">
                        <span>📥</span> Unduh Paket (.ZIP)
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Bindings
        this.overlay.querySelector('#gt-exp-btn-close').addEventListener('click', () => this.hide());
        this.overlay.querySelector('#gt-exp-btn-cancel').addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this.overlay.querySelector('#gt-exp-btn-download').addEventListener('click', () => this.generateZip());
    }

    async generateZip() {
        const titleInput = this.overlay.querySelector('#gt-exp-title').value.trim() || 'Petualangan Seru';
        const authorInput = this.overlay.querySelector('#gt-exp-author').value.trim() || 'Developer Cilik';
        const isPure = this.overlay.querySelector('#gt-exp-opt-pure').checked;
        const progressEl = this.overlay.querySelector('#gt-exp-progress');
        const downloadBtn = this.overlay.querySelector('#gt-exp-btn-download');

        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '⏳ Mengemas Game...';
        progressEl.style.width = '25%';

        try {
            const zip = new JSZip();

            // Kumpulkan objek kreasi murid dari Scene3 jika ada
            let customPlaced = [];
            if (this.scene && Array.isArray(this.scene.placedObjects)) {
                customPlaced = [...this.scene.placedObjects];
            }

            // 1. Buat index.html mandiri (Pure Game)
            const cleanIndexHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>${this.escapeHTML(titleInput)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #060b14;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Roboto, sans-serif;
            color: #ffffff;
            user-select: none;
            -webkit-user-select: none;
        }
        #game-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #game-container canvas {
            max-width: 100vw !important;
            max-height: 100vh !important;
            object-fit: contain !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        }
        .standalone-watermark {
            position: fixed;
            bottom: 6px;
            right: 12px;
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.4);
            pointer-events: none;
            letter-spacing: 0.5px;
            z-index: 999;
        }
    </style>
    <!-- Phaser 3 HTML5 Game Engine -->
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
</head>
<body>
    <div id="game-container"></div>
    <div class="standalone-watermark">${this.escapeHTML(titleInput)} • Oleh: ${this.escapeHTML(authorInput)}</div>
    <script src="./game.js"></script>
</body>
</html>`;

            zip.file('index.html', cleanIndexHtml);
            progressEl.style.width = '45%';

            // 2. Buat game.js yang mandiri 100% (No dependencies, zero CORS errors)
            const safeObjectsJson = JSON.stringify(customPlaced);
            const safeTitleJson = JSON.stringify(titleInput);
            const safeAuthorJson = JSON.stringify(authorInput);

            const standaloneGameJs = `// ===============================================================
// 🎮 ${titleInput.toUpperCase()}
// Dibuat oleh: ${authorInput}
// Hasil Ekspor Standalone (Pure Game Mode)
// ===============================================================

const GAME_TITLE = ${safeTitleJson};
const GAME_AUTHOR = ${safeAuthorJson};
const PLACED_OBJECTS = ${safeObjectsJson};

// ===============================================================
// WEB AUDIO SYNTHESIZER (Tanpa butuh file mp3 eksternal)
// ===============================================================
const AudioSynth = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playTone(freq, duration, type = 'sine') {
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    jump() {
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch(e) {}
    },
    coin() {
        this.playTone(987, 0.08, 'sine');
        setTimeout(() => this.playTone(1318, 0.14, 'sine'), 70);
    },
    hurt() {
        this.playTone(120, 0.25, 'sawtooth');
    },
    win() {
        const notes = [523, 659, 783, 1046];
        notes.forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'triangle'), i * 130));
    }
};

// ===============================================================
// MAIN PLAY SCENE
// ===============================================================
class StandaloneGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StandaloneGameScene' });
    }

    preload() {
        // 1. Player
        const pG = this.make.graphics({ x: 0, y: 0, add: false });
        pG.fillStyle(0x38bdf8, 1);
        pG.fillRoundedRect(0, 0, 32, 44, 6);
        pG.fillStyle(0xffffff, 1);
        pG.fillRect(6, 12, 7, 7);
        pG.fillRect(19, 12, 7, 7);
        pG.fillStyle(0x0f172a, 1);
        pG.fillRect(9, 14, 4, 4);
        pG.fillRect(22, 14, 4, 4);
        pG.generateTexture('sa_player', 32, 44);

        // 2. Ground
        const gG = this.make.graphics({ x: 0, y: 0, add: false });
        gG.fillStyle(0x111a2c, 1);
        gG.fillRect(0, 0, 32, 32);
        gG.fillStyle(0x10b981, 1);
        gG.fillRect(0, 0, 32, 8);
        gG.fillStyle(0x34d399, 1);
        gG.fillRect(0, 0, 32, 3);
        gG.generateTexture('sa_ground', 32, 32);

        // 3. Platform Slab
        const plG = this.make.graphics({ x: 0, y: 0, add: false });
        plG.fillStyle(0x1e293b, 1);
        plG.fillRoundedRect(0, 0, 80, 22, 4);
        plG.fillStyle(0x10b981, 1);
        plG.fillRoundedRect(0, 0, 80, 5, 2);
        plG.generateTexture('sa_platform', 80, 22);

        // 4. Coin
        const cG = this.make.graphics({ x: 0, y: 0, add: false });
        cG.fillStyle(0xf59e0b, 1);
        cG.fillCircle(12, 12, 11);
        cG.fillStyle(0xfef08a, 1);
        cG.fillCircle(12, 12, 7);
        cG.generateTexture('sa_coin', 24, 24);

        // 5. Spike Hazard
        const sG = this.make.graphics({ x: 0, y: 0, add: false });
        sG.fillStyle(0xef4444, 1);
        sG.beginPath();
        sG.moveTo(0, 24);
        sG.lineTo(12, 0);
        sG.lineTo(24, 24);
        sG.closePath();
        sG.fillPath();
        sG.generateTexture('sa_spike', 24, 24);

        // 6. NPC
        const nG = this.make.graphics({ x: 0, y: 0, add: false });
        nG.fillStyle(0xa855f7, 1);
        nG.fillRoundedRect(0, 0, 32, 44, 6);
        nG.fillStyle(0x6b21a8, 1);
        nG.fillRect(0, 0, 32, 10);
        nG.fillStyle(0xfde047, 1);
        nG.fillRect(7, 14, 6, 6);
        nG.fillRect(19, 14, 6, 6);
        nG.generateTexture('sa_npc', 32, 44);

        // 7. Portal
        const poG = this.make.graphics({ x: 0, y: 0, add: false });
        poG.fillStyle(0x0284c7, 1);
        poG.fillRoundedRect(0, 0, 44, 60, 10);
        poG.fillStyle(0x38bdf8, 1);
        poG.fillCircle(22, 30, 12);
        poG.fillStyle(0xffffff, 1);
        poG.fillCircle(22, 30, 5);
        poG.generateTexture('sa_portal', 44, 60);
    }

    create() {
        this.score = 0;
        this.hp = 3;
        this.maxHp = 3;
        this.isWon = false;
        this.isGameOver = false;

        const worldWidth = 1600;
        this.physics.world.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBackgroundColor('#0b1329');

        // Lantai Dasar Penuh
        this.platforms = this.physics.add.staticGroup();
        const tileCount = Math.ceil((worldWidth + 64) / 32);
        for (let i = 0; i < tileCount; i++) {
            this.platforms.create(i * 32, 434, 'sa_ground').refreshBody();
        }

        // Koin & Bahaya Groups
        this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
        this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
        this.customNpcs = [];

        // Player
        this.player = this.physics.add.sprite(120, 380, 'sa_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // Pasang objek dari dunia kreasi murid
        if (Array.isArray(PLACED_OBJECTS) && PLACED_OBJECTS.length > 0) {
            PLACED_OBJECTS.forEach(obj => {
                if (obj.type === 'tile') {
                    this.platforms.create(obj.x, obj.y, 'sa_platform').refreshBody();
                } else if (obj.type === 'coin') {
                    const c = this.coins.create(obj.x, obj.y, 'sa_coin');
                    this.tweens.add({ targets: c, y: obj.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                } else if (obj.type === 'obstacle') {
                    this.hazards.create(obj.x, obj.y, 'sa_spike');
                } else if (obj.type === 'npc') {
                    const npc = this.physics.add.sprite(obj.x, obj.y, 'sa_npc').setImmovable(true);
                    this.physics.add.collider(npc, this.platforms);
                    const tag = this.add.text(obj.x, obj.y - 28, '🧙 NPC Teman', {
                        fontSize: '10px', fontStyle: 'bold', fill: '#fde047', backgroundColor: '#0f172a', padding: { x: 4, y: 2 }
                    }).setOrigin(0.5);
                    this.customNpcs.push({ x: obj.x, y: obj.y, name: 'NPC Teman', dialog: 'Selamat datang di game buatanku!' });
                } else if (obj.type === 'portal') {
                    this.portal = this.add.sprite(obj.x, obj.y, 'sa_portal');
                }
            });
        } else {
            // Default layout jika murid belum menaruh objek kustom
            const defPlats = [{ x: 320, y: 320 }, { x: 540, y: 250 }, { x: 780, y: 290 }, { x: 1040, y: 230 }];
            defPlats.forEach(p => this.platforms.create(p.x, p.y, 'sa_platform').refreshBody());

            const defCoins = [{ x: 540, y: 205 }, { x: 780, y: 245 }, { x: 1040, y: 185 }];
            defCoins.forEach(c => {
                const coin = this.coins.create(c.x, c.y, 'sa_coin');
                this.tweens.add({ targets: coin, y: c.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            });

            this.hazards.create(440, 410, 'sa_spike');
            this.hazards.create(660, 410, 'sa_spike');

            const npc = this.physics.add.sprite(200, 396, 'sa_npc').setImmovable(true);
            this.physics.add.collider(npc, this.platforms);
            this.add.text(200, 368, '🧙 Mentor', {
                fontSize: '10px', fontStyle: 'bold', fill: '#fde047', backgroundColor: '#0f172a', padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
            this.customNpcs.push({ x: 200, y: 396, name: 'Mentor', dialog: 'Lompati platform dan masuki portal di ujung kanan!' });

            this.portal = this.add.sprite(1300, 396, 'sa_portal');
        }

        // Default Portal jika belum ada
        if (!this.portal) {
            this.portal = this.add.sprite(worldWidth - 160, 396, 'sa_portal');
        }

        // Overlap Collisions
        this.physics.add.overlap(this.player, this.coins, (player, coin) => {
            coin.destroy();
            this.score += 10;
            AudioSynth.coin();
            this.scoreText.setText('🪙 ' + this.score);
        });

        this.physics.add.overlap(this.player, this.hazards, () => {
            this.takeDamage();
        });

        // HUD (Fixed on camera)
        this.createHUD();

        // Keyboard Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            e: Phaser.Input.Keyboard.KeyCodes.E
        });

        this.input.keyboard.on('keydown-E', () => this.handleInteract());

        // Dialogue Box
        this.createDialogUI();

        // Title Welcome Toast
        const welcome = this.add.text(400, 60, GAME_TITLE, {
            fontSize: '15px', fontStyle: 'bold', fill: '#38bdf8', backgroundColor: '#0f172a', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
        this.tweens.add({ targets: welcome, alpha: 0, delay: 2800, duration: 1000, onComplete: () => welcome.destroy() });
    }

    createHUD() {
        const hud = this.add.container(16, 14).setDepth(90).setScrollFactor(0);
        const bg = this.add.rectangle(90, 14, 180, 28, 0x0f172a, 0.88).setStrokeStyle(1, 0x334155);
        this.hpText = this.add.text(12, 6, 'HP: ♥♥♥', { fontSize: '12px', fontStyle: 'bold', fill: '#f43f5e' });
        this.scoreText = this.add.text(105, 6, '🪙 0', { fontSize: '12px', fontStyle: 'bold', fill: '#fde047' });
        hud.add([bg, this.hpText, this.scoreText]);
    }

    createDialogUI() {
        this.dialogContainer = this.add.container(400, 370).setDepth(99).setScrollFactor(0).setVisible(false);
        const dBox = this.add.rectangle(0, 0, 560, 80, 0x0f172a, 0.95).setStrokeStyle(2, 0x38bdf8);
        this.dialogTitle = this.add.text(-260, -30, '', { fontSize: '12px', fontStyle: 'bold', fill: '#38bdf8' });
        this.dialogBody = this.add.text(-260, -8, '', { fontSize: '12px', fill: '#ffffff', wordWrap: { width: 520 } });
        const hint = this.add.text(260, 24, '[E] Tutup', { fontSize: '10px', fill: '#94a3b8' }).setOrigin(1, 0.5);
        this.dialogContainer.add([dBox, this.dialogTitle, this.dialogBody, hint]);
    }

    handleInteract() {
        if (this.dialogContainer.visible) {
            this.dialogContainer.setVisible(false);
            AudioSynth.playTone(400, 0.05);
            return;
        }

        // Cek dekat NPC
        for (const npc of this.customNpcs) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
            if (dist < 80) {
                this.dialogTitle.setText(npc.name);
                this.dialogBody.setText(npc.dialog);
                this.dialogContainer.setVisible(true);
                AudioSynth.playTone(600, 0.08);
                return;
            }
        }
    }

    takeDamage() {
        if (this.isInvincible || this.isGameOver) return;
        this.hp--;
        AudioSynth.hurt();
        this.isInvincible = true;

        let hearts = '';
        for (let i = 0; i < this.hp; i++) hearts += '♥';
        this.hpText.setText('HP: ' + (hearts || 'DEAD'));

        if (this.hp <= 0) {
            this.isGameOver = true;
            this.cameras.main.flash(300, 239, 68, 68);
            setTimeout(() => {
                this.scene.restart();
            }, 1000);
            return;
        }

        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvincible = false;
            }
        });
    }

    update() {
        if (!this.player || !this.player.body || this.isGameOver || this.isWon) return;

        const onGround = this.player.body.blocked.down || this.player.body.touching.down;
        const left = this.cursors.left.isDown || this.keys.a.isDown;
        const right = this.cursors.right.isDown || this.keys.d.isDown;
        const jump = this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown;

        if (left) {
            this.player.setVelocityX(-220);
            this.player.setFlipX(true);
        } else if (right) {
            this.player.setVelocityX(220);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && onGround) {
            this.player.setVelocityY(-340);
            AudioSynth.jump();
        }

        // Cek Menang saat masuk portal
        if (this.portal && !this.isWon) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
            if (dist < 60) {
                this.isWon = true;
                AudioSynth.win();
                this.player.setVelocity(0, 0);

                const victoryModal = this.add.container(400, 220).setDepth(200).setScrollFactor(0);
                const vBg = this.add.rectangle(0, 0, 480, 140, 0x0f172a, 0.96).setStrokeStyle(3, 0x10b981);
                const vTitle = this.add.text(0, -32, '🎉 SELAMAT! KAMU MENANG! 🎉', {
                    fontSize: '18px', fontStyle: 'bold', fill: '#34d399'
                }).setOrigin(0.5);
                const vSub = this.add.text(0, 2, GAME_TITLE + ' berhasil ditaklukkan!', {
                    fontSize: '13px', fill: '#ffffff'
                }).setOrigin(0.5);
                const vScore = this.add.text(0, 32, 'Total Skor Koin: ' + this.score, {
                    fontSize: '13px', fontStyle: 'bold', fill: '#fde047'
                }).setOrigin(0.5);
                victoryModal.add([vBg, vTitle, vSub, vScore]);
            }
        }
    }
}

// Konfigurasi Standalone Phaser Game
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 650 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [StandaloneGameScene]
};

window.addEventListener('DOMContentLoaded', () => {
    new Phaser.Game(config);
});
`;

            zip.file('game.js', standaloneGameJs);
            progressEl.style.width = '70%';

            // 3. Catatan Panduan Memainkan
            const readmeTxt = `===============================================================
🎮 ${titleInput.toUpperCase()}
Dibuat oleh: ${authorInput}
Tanggal: ${new Date().toLocaleDateString('id-ID')}
===============================================================
Selamat! Ini adalah game mandiri (standalone) yang 100% milikmu.

CARA MEMAINKAN:
1. Pastikan seluruh isi file ZIP ini diekstrak ke dalam 1 folder.
2. Cukup klik ganda (double-click) "index.html" atau "Mainkan_Game.bat" di Windows!
3. Game akan langsung berjalan di browser favoritmu (Chrome, Edge, Firefox, Safari).

KONTROL PERMAINAN:
- A / Tombol Panah Kiri  : Berjalan ke Kiri
- D / Tombol Panah Kanan : Berjalan ke Kanan
- W / Spasi / Panah Atas : Melompat
- E                      : Bicara dengan NPC

CARA BERBAGI:
Kamu bisa mengirimkan file ZIP ini atau folder hasil ekstraksinya
ke teman, guru, atau orang tuamu agar mereka bisa memainkan game buatanmu!
===============================================================`;

            zip.file('PANDUAN_MAIN.txt', readmeTxt);

            // 4. Windows 1-Click Launcher Batch File
            const batContent = `@echo off
echo ===================================================
echo Membuka game: ${titleInput}
echo Dibuat oleh: ${authorInput}
echo ===================================================
start "" "%~dp0index.html"
exit
`;
            zip.file('Mainkan_Game.bat', batContent);

            // 5. Game metadata json
            const gameInfoJson = JSON.stringify({
                judul: titleInput,
                pembuat: authorInput,
                versi: '1.0.0-standalone',
                jumlahObjekKustom: customPlaced.length,
                dibuatPada: new Date().toISOString()
            }, null, 2);
            zip.file('game-info.json', gameInfoJson);

            progressEl.style.width = '90%';

            // Generate ZIP file
            const content = await zip.generateAsync({ type: 'blob' });
            progressEl.style.width = '100%';

            // Trigger browser download
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            const safeName = titleInput.replace(/[^a-zA-Z0-9_-]/g, '_');
            a.href = url;
            a.download = `${safeName}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            AudioManager.playSuccess();
            downloadBtn.innerHTML = '✓ Paket ZIP Terunduh!';
            downloadBtn.style.background = '#16a34a';

            setTimeout(() => {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<span>📥</span> Unduh Paket (.ZIP)';
                downloadBtn.style.background = '';
                progressEl.style.width = '0%';
                this.hide();
                if (this.scene && this.scene.showFloatingToast) {
                    this.scene.showFloatingToast(`📦 Game "${titleInput}" berhasil diekspor (.ZIP)!`, 0x22c55e);
                }
            }, 1800);

        } catch (err) {
            console.error('Error generating export ZIP:', err);
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '⚠️ Gagal Mengemas';
            alert(`Terjadi kesalahan saat mengemas ZIP: ${err.message}`);
        }
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    show(scene = null) {
        if (scene) this.scene = scene;
        if (!this.overlay) this.createDOM();
        this.overlay.classList.remove('hidden');
        this.isOpen = true;
        AudioManager.playClick();
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this.isOpen = false;
        AudioManager.playClick();
    }
}
