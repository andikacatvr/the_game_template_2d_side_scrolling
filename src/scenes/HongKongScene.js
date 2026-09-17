import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { DisplayManager } from '../utils/DisplayManager.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { DialogBox } from '../ui/DialogBox.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { CodeInspector } from '../utils/CodeInspector.js';
import { CommandConsole } from '../utils/CommandConsole.js';

// ===============================================================
// SCENE 2: VICTORIA HARBOUR, HONG KONG (PARALLAX + WEATHER)
// Standard Identik dengan Scene 1 (HUD, Save, Controls, Modals)
// ===============================================================
export class HongKongScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Scene2' });
    }

    init(data = {}) {
        this.startData = data;
        this.isGameOver = false;
        this.collectedItemIds = [];
        this.savedSpawnPos = null;

        if (data.isLoadGame && SaveManager.hasSave()) {
            const save = SaveManager.load();
            this.hp = save.hp !== undefined ? save.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.maxHp = save.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(save.inventory) ? [...save.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = save.quest ? { ...save.quest } : {
                judul: "Misi Scene 2: Misteri Teluk Hong Kong",
                deskripsi: "Bicara dengan Kapten Dermaga Chen dan temukan Mutiara Victoria yang tersembunyi di ujung dermaga.",
                selesai: false
            };
            this.collectedItemIds = Array.isArray(save.collectedItemIds) ? [...save.collectedItemIds] : [];
            if (save.playerX && save.playerY && save.sceneKey === 'Scene2') {
                this.savedSpawnPos = { x: save.playerX, y: save.playerY };
            }
        } else {
            this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = data.quest || {
                judul: "Misi Scene 2: Misteri Teluk Hong Kong",
                deskripsi: "Bicara dengan Kapten Dermaga Chen dan temukan Mutiara Victoria yang tersembunyi di ujung dermaga.",
                selesai: false
            };
            this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        }
    }

    create() {
        CommandConsole.show();

        this.cameras.main.setBackgroundColor('#070e1b');

        this.touchState = { left: false, right: false, jump: false };
        this.isInvOpen = false;
        this.isQuestOpen = false;
        this.isSettingsOpen = false;

        // 1. Buat Parallax Background & Dunia Hong Kong
        this.createHongKongWorld();

        // 2. Buat Efek Cuaca (Rintik Hujan & Kilat Petir Halus)
        this.createWeatherEffects();

        // 3. Buat Karakter Player
        this.createPlayer();

        // 4. Buat Top Navbar HUD Identik Scene 1
        this.createGoblinStyleHUD();

        // 5. Buat Kontrol Touch Mobile/Tablet Identik Scene 1
        this.createGoblinStyleTouchControls();

        // 6. Buat Modal Game Over & Victory
        this.createGameOverModalUI();
        this.createVictoryModalUI();

        // 7. Buat Dialog Box RPG
        this.dialogBox = new DialogBox(this);

        // Setup Batas Dunia Fisika & Kamera (Lebar 2000px agar mencakup dermaga penuh sampai feri ekspedisi)
        const worldWidth = 2000;
        this.physics.world.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBounds(0, 0, worldWidth, 450);

        // Kamera otomatis mengikuti karakter pemain dengan pergerakan lerp halus (0.08)
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // Inisialisasi Zoom Kamera (Touchpad, Mouse, Layar Sentuh HP, & Tombol HUD)
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85,
            followTarget: this.player,
            centerOnZoomOut: false
        });
        const rightEdge = this.scale.width;
        this.zoomBtnContainer = this.zoomManager.createHUDButton(rightEdge - 116, 26, 44, 36);

        // Listener resize adaptif
        this.scale.on('resize', (gameSize) => {
            const newW = gameSize.width;
            if (this.menuBtnContainer) this.menuBtnContainer.x = newW - 24;
            if (this.bagBtnContainer) this.bagBtnContainer.x = newW - 68;
            if (this.zoomBtnContainer) this.zoomBtnContainer.x = newW - 116;
            if (this.updateModalsCenter) this.updateModalsCenter();
            if (this.zoomManager) this.zoomManager.updateUI(this.zoomManager.currentZoom);
        });

        // Keyboard Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            i: Phaser.Input.Keyboard.KeyCodes.I,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown-E', () => this.handleInteract());
        this.input.keyboard.on('keydown-Q', () => this.toggleQuestModal());
        this.input.keyboard.on('keydown-I', () => this.toggleInventoryModal());
        this.input.keyboard.on('keydown-ESC', () => this.toggleSettingsModal());

        // Mulai Ambient BGM
        AudioManager.startAmbientBGM();

        // Notifikasi Kedatangan di Scene 2
        this.time.delayedCall(500, () => {
            this.showFloatingToast('Selamat Datang di Scene 2: Victoria Harbour (Hong Kong)!', 0x38bdf8);
        });
    }

    // ===============================================================
    // PEMBUATAN DUNIA HONG KONG DENGAN 5 LAYER PARALLAX
    // ===============================================================
    createHongKongWorld() {
        const W = 3200; // Lebar extra agar mencakup seluruh jangkauan zoom-out tanpa celah hitam
        const H = 500;

        // LAYER 1: Langit Badai & Siluet Gunung Victoria Peak
        this.layer1Sky = this.add.tileSprite(960, 230, W, H, 'hk_layer_1_sky')
            .setScrollFactor(0, 0)
            .setDepth(-20);

        // LAYER 2: Gedung Pencakar Langit Hong Kong
        this.layer2City = this.add.tileSprite(960, 230, W, H, 'hk_layer_2_city')
            .setScrollFactor(0, 0)
            .setDepth(-15);

        // LAYER 3: Kapal Star Ferry yang Mengapung & Berlayar
        this.boatStartX = 1480;
        this.boatStartY = 356;
        this.boat = this.add.image(this.boatStartX, this.boatStartY, 'hk_layer_3_boat')
            .setScrollFactor(0.40, 0)
            .setDepth(-12);

        // Animasi 1: Ombang-ambing Naik-Turun Mengikuti Alunan Ombak
        this.tweens.add({
            targets: this.boat,
            y: this.boatStartY - 5,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Animasi 2: Goyangan Miring Kiri-Kanan Halus
        this.tweens.add({
            targets: this.boat,
            angle: { from: -1.2, to: 1.2 },
            duration: 2600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Animasi 3: Berlayar Pelan Menyeberangi Pelabuhan
        this.tweens.add({
            targets: this.boat,
            x: this.boatStartX - 180,
            duration: 28000,
            yoyo: true,
            repeat: -1,
            ease: 'Linear'
        });

        // LAYER 4: Ombak Laut Bergulung
        this.layer4Waves = this.add.tileSprite(960, 230, W, H, 'hk_layer_4_waves')
            .setScrollFactor(0, 0)
            .setDepth(-10);

        // LAYER 5: Bebatuan Dermaga & Pijakan Tanah
        this.layer5Pier = this.add.tileSprite(960, 230, W, H, 'hk_layer_5_pier')
            .setScrollFactor(1.0, 1.0)
            .setDepth(5);

        // -------------------------------------------------------------
        // PLATFORMS FISIKA (Pijakan karakter di atas dermaga batu)
        // -------------------------------------------------------------
        this.platforms = this.physics.add.staticGroup();

        // Lantai utama dermaga: membentang dari x: -400 sampai 2400 di y: 434
        const groundHeight = 40;
        for (let x = -400; x <= 2400; x += 120) {
            const block = this.add.rectangle(x, 434, 120, groundHeight, 0x000000, 0);
            this.physics.add.existing(block, true);
            this.platforms.add(block);
        }

        // Platform bebatuan tinggi / peti pelabuhan untuk variasi lompatan
        this.createPierCrate(420, 360, 80, 24);
        this.createPierCrate(760, 330, 96, 24);
        this.createPierCrate(1140, 290, 84, 24);
        this.createPierCrate(1460, 340, 90, 24);

        // -------------------------------------------------------------
        // ITEM QUEST: Mutiara Victoria (Di atas platform tinggi x=1140)
        // -------------------------------------------------------------
        if (!this.collectedItemIds.includes('mutiara_victoria')) {
            this.questItem = this.physics.add.sprite(1140, 250, 'hk_pearl_item').setDepth(15);
            this.questItem.body.setAllowGravity(false);
            this.tweens.add({
                targets: this.questItem,
                y: 242,
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Efek aura cahaya mutiara
            this.tweens.add({
                targets: this.questItem,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // -------------------------------------------------------------
        // HAZARD: Ombak Pasang / Semburan Air Asin (x: 880, y: 418)
        // -------------------------------------------------------------
        this.hazard = this.physics.add.staticSprite(880, 412, 'skeleton_hazard').setDepth(8);
        this.hazardText = this.add.text(880, 382, 'Ombak Pecah', {
            fontSize: '10px', fontStyle: 'bold', fill: '#67e8f9', fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(12);

        // -------------------------------------------------------------
        // NPC: Kapten Dermaga Chen
        // -------------------------------------------------------------
        const npcX = 300;
        const npcY = 398;
        this.npc = this.physics.add.staticSprite(npcX, npcY, 'skeleton_npc').setDepth(10);
        this.tweens.add({
            targets: this.npc,
            y: npcY - 3,
            yoyo: true,
            repeat: -1,
            duration: 1300,
            ease: 'Sine.easeInOut'
        });

        this.npcPrompt = this.add.container(npcX, npcY - 38).setDepth(25).setVisible(false);
        const npcPill = this.add.rectangle(0, 0, 95, 20, 0x0f172a, 0.95).setStrokeStyle(1.5, 0x38bdf8);
        const npcTxt = this.add.text(0, 0, '[E] Kapten Chen', { fontSize: '10px', fontStyle: 'bold', fill: '#e0f2fe', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.npcPrompt.add([npcPill, npcTxt]);
        npcPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleInteract());

        // -------------------------------------------------------------
        // PORTAL 1 (KIRI, x=90): Kembali ke Scene 1 (Padang Salju)
        // -------------------------------------------------------------
        this.portalBack = this.add.container(90, 396).setDepth(12);
        const pBackRing = this.add.circle(0, 0, 22, 0x38bdf8, 0.25).setStrokeStyle(2, 0x7dd3fc);
        const pBackIcon = this.add.text(0, 0, '<', { fontSize: '18px', fontStyle: 'bold', fill: '#bae6fd', fontFamily: FONT_BODY }).setOrigin(0.5);
        const pBackLabel = this.add.text(0, -32, '← Scene 1', { fontSize: '11px', fontStyle: 'bold', fill: '#bae6fd', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalBack.add([pBackRing, pBackIcon, pBackLabel]);
        this.tweens.add({
            targets: pBackRing,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // -------------------------------------------------------------
        // PORTAL 2 (KANAN, x=1820): Gerbang Feri Ekspedisi (Victory)
        // -------------------------------------------------------------
        this.portalEnd = this.add.container(1820, 396).setDepth(12);
        const pEndRing = this.add.circle(0, 0, 24, 0xf59e0b, 0.25).setStrokeStyle(2, 0xfbbf24);
        const pEndIcon = this.add.text(0, 0, '[FERI]', { fontSize: '10px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_BODY }).setOrigin(0.5);
        const pEndLabel = this.add.text(0, -34, 'Feri Ekspedisi', { fontSize: '11px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalEnd.add([pEndRing, pEndIcon, pEndLabel]);
        this.tweens.add({
            targets: pEndRing,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createPierCrate(x, y, width, height) {
        const crateVisual = this.add.rectangle(x, y, width, height, 0x1e293b, 0.9)
            .setStrokeStyle(2, 0x475569)
            .setDepth(6);
        const crateHighlight = this.add.rectangle(x, y - height / 2 + 2, width, 3, 0x94a3b8, 0.8).setDepth(6);
        const phys = this.add.rectangle(x, y, width, height, 0x000000, 0);
        this.physics.add.existing(phys, true);
        this.platforms.add(phys);
    }

    // ===============================================================
    // EFEK CUACA: RINTIK HUJAN DINAMIS & KILAT PETIR SESEKALI
    // ===============================================================
    createWeatherEffects() {
        // 1. Partikel Hujan (Diagonal Sleek Rain)
        this.rainDrops = [];
        const maxDrops = 75;
        for (let i = 0; i < maxDrops; i++) {
            const drop = this.add.image(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(-50, 450),
                'fx_rain_drop'
            ).setDepth(18).setAlpha(Phaser.Math.FloatBetween(0.35, 0.75));
            drop.speedY = Phaser.Math.Between(480, 680);
            drop.speedX = Phaser.Math.Between(-120, -70);
            this.rainDrops.push(drop);
        }

        // 2. Kilat Petir Halus (Flash tipis menerangi gedung dan teluk)
        this.lightningOverlay = this.add.rectangle(960, 225, 2400, 600, 0xffffff, 0)
            .setDepth(20)
            .setScrollFactor(0);

        // Timer petir acak antara 12 s/d 22 detik
        this.scheduleLightning();
    }

    scheduleLightning() {
        const delay = Phaser.Math.Between(12000, 20000);
        this.time.delayedCall(delay, () => {
            if (!this.lightningOverlay || !this.scene.isActive()) return;

            // Flash 1
            this.lightningOverlay.setAlpha(0.28);
            this.time.delayedCall(60, () => {
                this.lightningOverlay.setAlpha(0.04);
                this.time.delayedCall(80, () => {
                    // Flash 2 (Double flash khas petir)
                    this.lightningOverlay.setAlpha(0.42);
                    this.time.delayedCall(90, () => {
                        this.lightningOverlay.setAlpha(0);
                        this.scheduleLightning();
                    });
                });
            });
        });
    }

    // ===============================================================
    // PEMBUATAN KARAKTER PLAYER & KOLISI
    // ===============================================================
    createPlayer() {
        const spawnX = this.savedSpawnPos ? this.savedSpawnPos.x : (this.startData?.spawnX || 160);
        const spawnY = this.savedSpawnPos ? this.savedSpawnPos.y : 380;

        const playerTexture = this.textures.exists('custom_player') ? 'custom_player' : 'skeleton_player';
        this.player = this.physics.add.sprite(spawnX, spawnY, playerTexture).setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Auto-scale jika gambar custom murid
        if (playerTexture === 'custom_player') {
            const h = this.player.height;
            if (h > 0 && h !== 44) {
                this.player.setScale(44 / h);
            }
        }

        // Ambil Mutiara Victoria
        if (this.questItem) {
            this.physics.add.overlap(this.player, this.questItem, () => {
                if (this.questItem && this.questItem.active) {
                    this.questItem.disableBody(true, true);
                    this.questItem.destroy();
                    this.questItem = null;
                    CodeInspector.record('coin');
                    CodeInspector.triggerEvent('coin', { item: 'Mutiara Teluk Victoria' });
                    if (!this.collectedItemIds.includes('mutiara_victoria')) {
                        this.collectedItemIds.push('mutiara_victoria');
                    }
                    this.inventory.push({
                        id: 'mutiara_victoria',
                        nama: 'Mutiara Teluk Victoria',
                        deskripsi: 'Mutiara berkilau misterius dari teluk Hong Kong saat malam badai.',
                        icon: ''
                    });
                    this.updateInventoryBadge();
                    this.showFloatingToast('+1 Mutiara Victoria Berhasil Diambil!', 0x38bdf8);
                    AudioManager.playCoin();

                    this.quest.selesai = true;
                    this.quest.deskripsi = 'Mutiara telah diamankan! Pergilah ke Feri Ekspedisi di ujung kanan dermaga.';
                    this.autoSave(false);
                }
            });
        }

        // Kena Hazard
        this.physics.add.overlap(this.player, this.hazard, () => {
            if (!this.isInvincible && !this.isGameOver) {
                this.takeDamage(1);
            }
        });
    }

    // ===============================================================
    // TOP NAVBAR HUD (IDENTIK 100% STANDAR SCENE 1)
    // ===============================================================
    createGoblinStyleHUD() {
        // A. HP DISPLAY
        this.healthContainer = this.add.container(16, 13).setDepth(25).setScrollFactor(0);

        const isCompact = this.maxHp > 4;
        const barWidth = isCompact ? 112 : Math.max(120, 34 + this.maxHp * 20 + 38);
        const hpBg = this.add.rectangle(barWidth / 2, 13, barWidth, 26, 0x0f172a, 0.85)
            .setInteractive({ useHandCursor: true });

        const hpLabel = this.add.text(8, 4, 'HP', {
            fontSize: '11px', fontStyle: 'bold', fill: '#f43f5e', fontFamily: FONT_TITLE
        });

        this.hpHeartTexts = [];
        if (!isCompact) {
            for (let i = 0; i < this.maxHp; i++) {
                const heart = this.add.text(30 + i * 18, 4, '■', { fontSize: '13px', fill: '#f43f5e' });
                this.hpHeartTexts.push(heart);
            }
            this.hpNumericText = this.add.text(32 + this.maxHp * 18 + 4, 5, `${this.hp}/${this.maxHp}`, {
                fontSize: '11px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
            });
            this.healthContainer.add([hpBg, hpLabel, ...this.hpHeartTexts, this.hpNumericText]);
        } else {
            const singleHeart = this.add.text(28, 4, '■', { fontSize: '13px', fill: '#f43f5e' });
            this.hpNumericText = this.add.text(50, 5, `${this.hp}/${this.maxHp}`, {
                fontSize: '12px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
            });
            this.healthContainer.add([hpBg, hpLabel, singleHeart, this.hpNumericText]);
        }
        this.updateHPDisplay();

        // B. QUEST BUTTON
        const questX = 16 + barWidth + 44;
        this.questBtnContainer = this.add.container(questX, 26).setDepth(25).setScrollFactor(0);

        const questBtnBg = this.add.rectangle(0, 0, 72, 34, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x38bdf8)
            .setInteractive({ useHandCursor: true });

        const questBtnText = this.add.text(0, 0, 'Quest', {
            fontSize: '13px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.questBtnContainer.add([questBtnBg, questBtnText]);
        questBtnBg.on('pointerdown', () => this.toggleQuestModal());
        questBtnBg.on('pointerover', () => {
            questBtnBg.setFillStyle(0x1e293b, 1);
            questBtnBg.setStrokeStyle(2, 0x60a5fa);
            this.tweens.add({ targets: this.questBtnContainer, scaleX: 1.05, scaleY: 1.05, duration: 100 });
        });
        questBtnBg.on('pointerout', () => {
            questBtnBg.setFillStyle(0x0f172a, 0.9);
            questBtnBg.setStrokeStyle(2, 0x38bdf8);
            this.tweens.add({ targets: this.questBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // C. INVENTORY BUTTON
        const hudRight = this.scale.width;
        this.bagBtnContainer = this.add.container(hudRight - 68, 26).setDepth(25).setScrollFactor(0);

        const bagBtnBg = this.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });

        const bagGraphics = this.add.graphics();
        const drawBagIcon = (color = 0xf8fafc) => {
            bagGraphics.clear();
            bagGraphics.lineStyle(2, color, 1);
            bagGraphics.beginPath();
            bagGraphics.arc(0, -6.5, 3.5, Math.PI, 0, false);
            bagGraphics.strokePath();
            bagGraphics.strokeRoundedRect(-8.5, -5.5, 17, 16, 2.5);
            bagGraphics.beginPath();
            bagGraphics.moveTo(-8.5, 0);
            bagGraphics.lineTo(8.5, 0);
            bagGraphics.strokePath();
            bagGraphics.fillStyle(color, 1);
            bagGraphics.fillRect(-2, -2, 4, 4);
        };
        drawBagIcon(0xf8fafc);

        this.bagBadgeBg = this.add.circle(13, -12, 7, 0x10b981, 1);
        this.bagBadgeText = this.add.text(13, -12, `${this.inventory.length}`, {
            fontSize: '9px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.bagBtnContainer.add([bagBtnBg, bagGraphics, this.bagBadgeBg, this.bagBadgeText]);
        bagBtnBg.on('pointerdown', () => this.toggleInventoryModal());
        bagBtnBg.on('pointerover', () => {
            bagBtnBg.setFillStyle(0x1e293b, 1);
            drawBagIcon(0x38bdf8);
            this.tweens.add({ targets: this.bagBtnContainer, scaleX: 1.06, scaleY: 1.06, duration: 100 });
        });
        bagBtnBg.on('pointerout', () => {
            bagBtnBg.setFillStyle(0x0f172a, 0.9);
            drawBagIcon(0xf8fafc);
            this.tweens.add({ targets: this.bagBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // D. MENU / SETTINGS BUTTON
        this.menuBtnContainer = this.add.container(hudRight - 24, 26).setDepth(25).setScrollFactor(0);
        const menuBtnBg = this.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuTxt = this.add.text(0, 0, 'MENU', { fontSize: '10px', fontStyle: 'bold', fill: '#94a3b8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.menuBtnContainer.add([menuBtnBg, menuTxt]);
        menuBtnBg.on('pointerdown', () => this.toggleSettingsModal());
        menuBtnBg.on('pointerover', () => {
            menuBtnBg.setFillStyle(0x1e293b, 1);
            this.tweens.add({ targets: this.menuBtnContainer, scaleX: 1.06, scaleY: 1.06, duration: 100 });
        });
        menuBtnBg.on('pointerout', () => {
            menuBtnBg.setFillStyle(0x0f172a, 0.9);
            this.tweens.add({ targets: this.menuBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // Modals
        this.createQuestModalUI();
        this.createInventoryModalUI();
        this.settingsModal = new SettingsModal(this, {
            onRestart: () => {
                SaveManager.clear();
                this.scene.restart({ isNewGame: true });
            },
            onMainMenu: () => {
                AudioManager.stopAmbientBGM();
                this.scene.start('TitleScene');
            },
            onToggleTouch: () => {
                this.touchControlsEnabled = !this.touchControlsEnabled;
                try {
                    localStorage.setItem('template_touch_controls', this.touchControlsEnabled ? 'true' : 'false');
                } catch (e) {}
                this.mobileControlsContainer.setVisible(this.touchControlsEnabled);
                this.showFloatingToast(this.touchControlsEnabled ? 'Tombol Layar: AKTIF' : 'Tombol Layar: NONAKTIF');
                return this.touchControlsEnabled;
            }
        });
    }

    updateHPDisplay() {
        if (this.hpHeartTexts) {
            for (let i = 0; i < this.maxHp; i++) {
                if (this.hpHeartTexts[i]) {
                    this.hpHeartTexts[i].setText('■');
                    if (i < this.hp) {
                        this.hpHeartTexts[i].setColor('#f43f5e').setAlpha(1);
                    } else {
                        this.hpHeartTexts[i].setColor('#334155').setAlpha(0.4);
                    }
                }
            }
        }
        if (this.hpNumericText) {
            this.hpNumericText.setText(`${this.hp}/${this.maxHp}`);
            this.hpNumericText.setFill(this.hp <= 1 ? '#ef4444' : '#fda4af');
        }
    }

    updateInventoryBadge() {
        if (this.bagBadgeText) {
            this.bagBadgeText.setText(`${this.inventory.length}`);
        }
    }

    takeDamage(amount) {
        if (this.isGameOver || this.isGodMode) return;
        CodeInspector.record('hazard');
        CodeInspector.triggerEvent('hazard', { hp: this.hp, amount });
        this.hp = Math.max(0, this.hp - amount);
        this.updateHPDisplay();
        this.showFloatingToast('-1 HP Terkena Ombak!', 0xef4444);
        AudioManager.playHurt();

        if (this.hp === 0) {
            this.triggerGameOver();
            return;
        }

        this.autoSave(false);

        this.isInvincible = true;
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            yoyo: true,
            repeat: 3,
            duration: 120,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvincible = false;
            }
        });
    }

    createGameOverModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.gameOverModal = this.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.85).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 260, 0x180509, 0.98).setStrokeStyle(2.5, 0xef4444);

        const skull = this.add.text(0, -68, '[ GAME OVER ]', { fontSize: '14px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = this.add.text(0, -32, 'GAME OVER', {
            fontSize: '32px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, 8, 'Karakter Anda telah kehabisan HP!', {
            fontSize: '13px', fill: '#fca5a5', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const reloadBtn = this.add.rectangle(0, 56, 240, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const reloadText = this.add.text(0, 56, 'Muat Checkpoint Terakhir', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        reloadBtn.on('pointerdown', () => {
            this.isGameOver = false;
            this.gameOverModal.setVisible(false);
            this.scene.restart({ isLoadGame: true });
        });

        const menuBtn = this.add.rectangle(0, 104, 240, 32, 0x1e293b, 0.95)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(0, 104, 'Kembali ke Menu Utama', {
            fontSize: '11px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        menuBtn.on('pointerdown', () => {
            this.isGameOver = false;
            this.gameOverModal.setVisible(false);
            AudioManager.stopAmbientBGM();
            this.scene.start('TitleScene');
        });

        this.gameOverModal.add([overlay, box, skull, title, subtitle, reloadBtn, reloadText, menuBtn, menuText]);
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.player.setVelocity(0, 0);
        if (this.gameOverModal) {
            this.gameOverModal.setVisible(true);
        }
    }

    // ===============================================================
    // KONTROL TOUCH SCREEN MOBILE/TABLET
    // ===============================================================
    createGoblinStyleTouchControls() {
        if (!isMobileOrTablet()) {
            this.touchControlsEnabled = false;
        } else {
            this.touchControlsEnabled = true;
            try {
                const saved = localStorage.getItem('template_touch_controls');
                if (saved !== null) this.touchControlsEnabled = saved === 'true';
            } catch (e) {}
        }

        this.mobileControlsContainer = this.add.container(0, 0).setDepth(28).setScrollFactor(0);
        this.mobileControlsContainer.setVisible(this.touchControlsEnabled);

        // Kiri
        this.leftBtnContainer = this.add.container(62, 390);
        const leftBg = this.add.rectangle(0, 0, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 76), Phaser.Geom.Rectangle.Contains);
        const leftIcon = this.add.text(0, 0, '◀', { fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.leftBtnContainer.add([leftBg, leftIcon]);
        leftBg.on('pointerdown', () => { this.touchState.left = true; leftBg.setFillStyle(0x2563eb, 0.9); });
        const releaseLeft = () => { this.touchState.left = false; leftBg.setFillStyle(0x0f172a, 0.78); };
        leftBg.on('pointerup', releaseLeft).on('pointerout', releaseLeft);

        // Kanan
        this.rightBtnContainer = this.add.container(134, 390);
        const rightBg = this.add.rectangle(0, 0, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 76), Phaser.Geom.Rectangle.Contains);
        const rightIcon = this.add.text(0, 0, '▶', { fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.rightBtnContainer.add([rightBg, rightIcon]);
        rightBg.on('pointerdown', () => { this.touchState.right = true; rightBg.setFillStyle(0x2563eb, 0.9); });
        const releaseRight = () => { this.touchState.right = false; rightBg.setFillStyle(0x0f172a, 0.78); };
        rightBg.on('pointerup', releaseRight).on('pointerout', releaseRight);

        // Lompat
        this.jumpBtnContainer = this.add.container(735, 390);
        const jumpBg = this.add.rectangle(0, 0, 58, 58, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 78, 78), Phaser.Geom.Rectangle.Contains);
        const jumpIcon = this.add.text(0, 0, '▲', { fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.jumpBtnContainer.add([jumpBg, jumpIcon]);
        jumpBg.on('pointerdown', () => { this.touchState.jump = true; jumpBg.setFillStyle(0x2563eb, 0.9); });
        const releaseJump = () => { this.touchState.jump = false; jumpBg.setFillStyle(0x0f172a, 0.78); };
        jumpBg.on('pointerup', releaseJump).on('pointerout', releaseJump);

        // Interaksi [E]
        this.interactBtnContainer = this.add.container(735, 318);
        const interactBg = this.add.rectangle(0, 0, 56, 42, 0x1e1035, 0.85).setStrokeStyle(2, 0xc084fc)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 62), Phaser.Geom.Rectangle.Contains);
        const interactIcon = this.add.text(0, 0, 'E', { fontSize: '13px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.interactBtnContainer.add([interactBg, interactIcon]);
        interactBg.on('pointerdown', () => this.handleInteract());

        this.mobileControlsContainer.add([this.leftBtnContainer, this.rightBtnContainer, this.jumpBtnContainer, this.interactBtnContainer]);
    }

    // ===============================================================
    // MODALS & UI HELPERS
    // ===============================================================
    createQuestModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.questModal = this.add.container(cx, cy).setDepth(40).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const box = this.add.rectangle(0, 0, 460, 270, 0x0b1a32, 0.98).setStrokeStyle(2, 0x38bdf8);

        const header = this.add.text(0, -100, 'MISI & QUEST SCENE 2', {
            fontSize: '16px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.questTitleText = this.add.text(-200, -50, '', {
            fontSize: '14px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        });

        this.questDescText = this.add.text(-200, -15, '', {
            fontSize: '12px', fill: '#cbd5e1', wordWrap: { width: 400 }, lineSpacing: 4, fontFamily: FONT_BODY
        });

        const closeBtn = this.add.rectangle(0, 95, 120, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 95, 'Tutup [Q]', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => this.toggleQuestModal(false));
        overlay.on('pointerdown', () => this.toggleQuestModal(false));

        this.questModal.add([overlay, box, header, this.questTitleText, this.questDescText, closeBtn, closeText]);
    }

    toggleQuestModal(forceState) {
        this.isQuestOpen = (forceState !== undefined) ? forceState : !this.isQuestOpen;
        if (this.isQuestOpen) {
            this.toggleInventoryModal(false);
            this.toggleSettingsModal(false);
            this.questTitleText.setText(this.quest.judul);
            this.questDescText.setText(this.quest.deskripsi);
            this.updateModalsCenter();
        }
        this.questModal.setVisible(this.isQuestOpen);
    }

    createInventoryModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.invModal = this.add.container(cx, cy).setDepth(40).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 280, 0x0b1a32, 0.98).setStrokeStyle(2, 0x153154);

        const header = this.add.text(0, -108, 'TAS INVENTARIS PETUALANG', {
            fontSize: '15px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.invItemsContainer = this.add.container(0, 0);

        const closeBtn = this.add.rectangle(0, 105, 120, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 105, 'Tutup [I]', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => this.toggleInventoryModal(false));
        overlay.on('pointerdown', () => this.toggleInventoryModal(false));

        this.invModal.add([overlay, box, header, this.invItemsContainer, closeBtn, closeText]);
    }

    toggleInventoryModal(forceState) {
        this.isInvOpen = (forceState !== undefined) ? forceState : !this.isInvOpen;
        if (this.isInvOpen) {
            this.toggleQuestModal(false);
            this.toggleSettingsModal(false);
            this.renderInventorySlots();
            this.updateModalsCenter();
        }
        this.invModal.setVisible(this.isInvOpen);
    }

    renderInventorySlots() {
        this.invItemsContainer.removeAll(true);
        const startX = -180;
        const startY = -60;
        const slotSize = 64;
        const gap = 16;
        const cols = 5;

        for (let i = 0; i < 10; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (slotSize + gap) + slotSize / 2;
            const y = startY + row * (slotSize + gap) + slotSize / 2;

            const slotBg = this.add.rectangle(x, y, slotSize, slotSize, 0x0f172a, 0.9)
                .setStrokeStyle(1.5, 0x334155);
            this.invItemsContainer.add(slotBg);

            const item = this.inventory[i];
            if (item) {
                const iconTxt = this.add.text(x, y - 6, item.icon || '[ITEM]', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
                const nameTxt = this.add.text(x, y + 20, item.nama, {
                    fontSize: '8px', fill: '#94a3b8', fontFamily: FONT_BODY, wordWrap: { width: slotSize }
                }).setOrigin(0.5);
                this.invItemsContainer.add([iconTxt, nameTxt]);
            }
        }
    }

    toggleSettingsModal(forceState) {
        this.isSettingsOpen = (forceState !== undefined) ? forceState : !this.settingsModal.isOpen();
        if (this.isSettingsOpen) {
            this.toggleQuestModal(false);
            this.toggleInventoryModal(false);
            this.updateModalsCenter();
            this.settingsModal.show();
        } else {
            this.settingsModal.hide();
        }
    }

    createVictoryModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.victoryModal = this.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.8).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 260, 0x062118, 0.98).setStrokeStyle(2.5, 0x10b981);

        const icon = this.add.text(0, -68, '[ SELESAI ]', { fontSize: '14px', fontStyle: 'bold', fill: '#34d399', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = this.add.text(0, -32, 'MISI SELESAI!', {
            fontSize: '28px', fontStyle: 'bold', fill: '#34d399', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, 10, 'Kamu berhasil menyeberangi Victoria Harbour!', {
            fontSize: '13px', fill: '#a7f3d0', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const replayBtn = this.add.rectangle(0, 60, 220, 36, 0x059669, 0.95)
            .setStrokeStyle(1.5, 0x34d399)
            .setInteractive({ useHandCursor: true });
        const replayText = this.add.text(0, 60, 'Kembali ke Scene 1', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        replayBtn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            this.scene.start('GameScene');
        });

        const menuBtn = this.add.rectangle(0, 106, 220, 32, 0x1e293b, 0.95)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(0, 106, 'Menu Utama', {
            fontSize: '11px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        menuBtn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            AudioManager.stopAmbientBGM();
            this.scene.start('TitleScene');
        });

        this.victoryModal.add([overlay, box, icon, title, subtitle, replayBtn, replayText, menuBtn, menuText]);
    }

    updateModalsCenter(zoom) {
        const W = this.scale ? this.scale.width : 800;
        const H = this.scale ? this.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;
        const Z = zoom || (this.zoomManager ? this.zoomManager.currentZoom : (this.cameras.main ? this.cameras.main.zoom : 1.0));

        const toCoords = (targetX, targetY) => ({
            x: cx + (targetX - cx) / Z,
            y: cy + (targetY - cy) / Z,
            scale: 1 / Z
        });

        const centerPos = toCoords(cx, cy);

        if (this.gameOverModal && this.gameOverModal.active) {
            this.gameOverModal.setPosition(centerPos.x, centerPos.y);
            this.gameOverModal.setScale(centerPos.scale);
        }
        if (this.victoryModal && this.victoryModal.active) {
            this.victoryModal.setPosition(centerPos.x, centerPos.y);
            this.victoryModal.setScale(centerPos.scale);
        }
        if (this.questModal && this.questModal.active) {
            this.questModal.setPosition(centerPos.x, centerPos.y);
            this.questModal.setScale(centerPos.scale);
        }
        if (this.invModal && this.invModal.active) {
            this.invModal.setPosition(centerPos.x, centerPos.y);
            this.invModal.setScale(centerPos.scale);
        }
        if (this.settingsModal && this.settingsModal.container && this.settingsModal.container.active) {
            this.settingsModal.container.setPosition(centerPos.x, centerPos.y);
            this.settingsModal.container.setScale(centerPos.scale);
        }

        if (this.healthContainer && this.healthContainer.active) {
            const t = toCoords(16, 13);
            this.healthContainer.setPosition(t.x, t.y);
            this.healthContainer.setScale(t.scale);
        }
        if (this.questBtnContainer && this.questBtnContainer.active) {
            const isCompact = this.maxHp > 4;
            const barWidth = isCompact ? 112 : Math.max(120, 34 + this.maxHp * 20 + 38);
            const questX = 16 + barWidth + 44;
            const t = toCoords(questX, 26);
            this.questBtnContainer.setPosition(t.x, t.y);
            this.questBtnContainer.setScale(t.scale);
        }
        if (this.zoomBtnContainer && this.zoomBtnContainer.active) {
            const t = toCoords(W - 116, 26);
            this.zoomBtnContainer.setPosition(t.x, t.y);
            this.zoomBtnContainer.setScale(t.scale);
        }
        if (this.bagBtnContainer && this.bagBtnContainer.active) {
            const t = toCoords(W - 68, 26);
            this.bagBtnContainer.setPosition(t.x, t.y);
            this.bagBtnContainer.setScale(t.scale);
        }
        if (this.menuBtnContainer && this.menuBtnContainer.active) {
            const t = toCoords(W - 24, 26);
            this.menuBtnContainer.setPosition(t.x, t.y);
            this.menuBtnContainer.setScale(t.scale);
        }
    }

    showFloatingToast(text, color = 0x38bdf8) {
        if (this.activeFloatingToast && this.activeFloatingToast.destroy) {
            this.activeFloatingToast.destroy();
            this.activeFloatingToast = null;
        }
        const toast = this.add.container(this.scale.width / 2, 80).setDepth(50).setScrollFactor(0);
        const bg = this.add.rectangle(0, 0, Math.max(260, text.length * 9), 32, 0x0f172a, 0.95)
            .setStrokeStyle(1.5, color);
        const txt = this.add.text(0, 0, text, {
            fontSize: '12px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        toast.add([bg, txt]);
        this.activeFloatingToast = toast;

        this.tweens.add({
            targets: toast,
            y: 65,
            alpha: { from: 1, to: 0 },
            delay: 1500,
            duration: 400,
            onComplete: () => {
                if (this.activeFloatingToast === toast) {
                    this.activeFloatingToast = null;
                }
                toast.destroy();
            }
        });
    }

    autoSave(showToast = true) {
        if (!this.player || !this.player.body || this.isGameOver) return;
        const data = {
            sceneKey: 'Scene2',
            hp: this.hp,
            maxHp: this.maxHp,
            playerX: Math.round(this.player.x),
            playerY: Math.round(this.player.y),
            inventory: this.inventory,
            quest: this.quest,
            collectedItemIds: this.collectedItemIds
        };
        SaveManager.save(data);
        if (showToast) {
            this.showFloatingToast('Progres Scene 2 Tersimpan', 0x10b981);
        }
    }

    handleInteract() {
        if (this.isGameOver || this.isSettingsOpen || this.isQuestOpen || this.isInvOpen) return;

        if (this.dialogBox && this.dialogBox.isOpen()) {
            this.dialogBox.advance();
            return;
        }

        // 1. Interaksi NPC Kapten Chen
        if (this.npc) {
            const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            if (distNpc < 80) {
                AudioManager.playClick();
                CodeInspector.record('npc');
                CodeInspector.triggerEvent('npc', { name: 'Kapten Chen' });
                this.dialogBox.start(
                    'Kapten Chen (Penjaga Dermaga)',
                    [
                        "Selamat datang di Victoria Harbour, pengelana!",
                        "Malam ini badai sedang turun, lihatlah gedung-gedung pencakar langit yang megah di seberang teluk.",
                        "Kapal Star Ferry sedang berlayar mengarungi ombak pelabuhan.",
                        "Konon ada Mutiara Teluk Victoria yang tersembunyi di atas platform bebatuan di sebelah kanan!",
                        "Jika kamu berhasil membawanya, naiklah ke Feri Ekspedisi di ujung dermaga untuk menuntaskan perjalananmu."
                    ],
                    () => {
                        this.showFloatingToast('Dialog Kapten Chen Selesai!', 0x38bdf8);
                    },
                    'npc_portrait'
                );
                return;
            }
        }

        // 2. Portal Kembali ke Scene 1 (x: 90)
        const distPortalBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 396);
        if (distPortalBack < 70) {
            this.showFloatingToast('Teleportasi kembali ke Scene 1...', 0x38bdf8);
            this.scene.start('GameScene', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                quest: this.quest,
                collectedItemIds: this.collectedItemIds
            });
            return;
        }

        // 3. Portal Feri Ekspedisi (x: 1820)
        const distPortalEnd = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1820, 396);
        if (distPortalEnd < 70) {
            if (!this.collectedItemIds.includes('mutiara_victoria')) {
                this.showFloatingToast('Feri belum siap berangkat! Dapatkan Mutiara Victoria terlebih dahulu.', 0xef4444);
            } else {
                this.victoryModal.setVisible(true);
            }
            return;
        }
    }

    // ===============================================================
    // UPDATE LOOP: PARALLAX, HUJAN, & KONTROL
    // ===============================================================
    update(time, delta) {
        // 1. Gerakan Parallax Mengikuti Kamera & Ombak Berayun Dinamis
        const camX = this.cameras.main.scrollX;
        if (this.layer1Sky) {
            this.layer1Sky.tilePositionX = camX * 0.08;
        }
        if (this.layer2City) {
            this.layer2City.tilePositionX = camX * 0.25;
        }
        if (this.layer4Waves) {
            this.layer4Waves.tilePositionX = camX * 0.65 + Math.sin(time * 0.0016) * 8;
        }

        // 2. Simulasi Butir Hujan Jatuh Menukik Miring
        if (this.rainDrops) {
            const dt = (delta || 16) / 1000;
            for (let i = 0; i < this.rainDrops.length; i++) {
                const drop = this.rainDrops[i];
                drop.y += drop.speedY * dt;
                drop.x += drop.speedX * dt;

                if (drop.y > 450) {
                    drop.y = Phaser.Math.Between(-30, -5);
                    drop.x = Phaser.Math.Between(0, 1980);
                }
            }
        }

        if (!this.player || !this.player.body) return;

        // Update Prompt NPC
        if (this.npc && this.npcPrompt) {
            const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            this.npcPrompt.setVisible(distNpc < 80 && (!this.dialogBox || !this.dialogBox.isOpen()));
        }

        if (this.isGameOver || this.isQuestOpen || this.isInvOpen || this.isSettingsOpen || (this.dialogBox && this.dialogBox.isOpen())) {
            this.player.setVelocityX(0);
            return;
        }

        const speed = this.customSpeed || CONFIG_SKELETON.player.kecepatan || 220;
        const jumpSpeed = this.customJump || -(CONFIG_SKELETON.player.kekuatanLompat || 440);

        const left = (this.cursors && this.cursors.left.isDown) || (this.keys && this.keys.a.isDown) || this.touchState.left;
        const right = (this.cursors && this.cursors.right.isDown) || (this.keys && this.keys.d.isDown) || this.touchState.right;
        const jump = (this.cursors && this.cursors.up.isDown) || (this.keys && this.keys.w.isDown) || (this.keys && this.keys.space.isDown) || this.touchState.jump;

        if (left) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            CodeInspector.record('move');
        } else if (right) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            CodeInspector.record('move');
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && (this.player.body.touching.down || this.player.body.blocked.down)) {
            this.player.setVelocityY(jumpSpeed);
            AudioManager.playJump();
            CodeInspector.record('jump');
        }

        // Update Live Code Inspector jika sedang aktif (60 FPS)
        if (CodeInspector.isActive()) {
            CodeInspector.updateRealtime({
                left,
                right,
                jump,
                grounded: this.player.body.touching.down || this.player.body.blocked.down,
                vx: this.player.body.velocity.x,
                vy: this.player.body.velocity.y
            });
        }
    }
}
