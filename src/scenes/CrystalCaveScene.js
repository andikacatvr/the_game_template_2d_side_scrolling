import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { DisplayManager } from '../utils/DisplayManager.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { DialogBox } from '../ui/DialogBox.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { CodeInspector } from '../utils/CodeInspector.js';
import { CommandConsole } from '../utils/CommandConsole.js';

// ===============================================================
// SCENE 3: GUA KRISTAL PURBA (MYSTIC CRYSTAL CAVERN)
// ===============================================================
export class CrystalCaveScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Scene3' });
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
                judul: "Misi Scene 3: Misteri Kristal Bintang",
                deskripsi: "Bicara dengan Arkan Penjaga Gua dan temukan Batu Bintang Abadi di puncak tebing kristal.",
                selesai: false
            };
            this.collectedItemIds = Array.isArray(save.collectedItemIds) ? [...save.collectedItemIds] : [];
            if (save.playerX && save.playerY && save.sceneKey === 'Scene3') {
                this.savedSpawnPos = { x: save.playerX, y: save.playerY };
            }
        } else {
            this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = data.quest || {
                judul: "Misi Scene 3: Misteri Kristal Bintang",
                deskripsi: "Bicara dengan Arkan Penjaga Gua dan temukan Batu Bintang Abadi di puncak tebing kristal.",
                selesai: false
            };
            this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        }

        this.touchState = { left: false, right: false, jump: false };
    }

    create() {
        CommandConsole.show();

        // 1. Warna Latar Gua Bawah Tanah yang Magis
        this.cameras.main.setBackgroundColor('#090414');

        // 2. Lingkungan Gua Kristal
        this.createCaveEnvironment();

        // 3. Karakter Player
        this.createPlayer();

        // 4. Top Navbar HUD
        this.createCaveHUD();

        // 5. Kontrol Sentuh Mobile/Tablet
        this.createTouchControls();

        // 6. Modal Game Over & Victory
        this.createGameOverModalUI();
        this.createVictoryModalUI();

        // 7. Dialog Box RPG
        this.dialogBox = new DialogBox(this);

        // Batas Fisika & Kamera (Lebar 2000px)
        const worldWidth = 2000;
        this.physics.world.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // Inisialisasi Zoom Kamera
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

        // Responsive resize
        this.scale.on('resize', (gameSize) => {
            const newW = gameSize.width;
            if (this.menuBtnContainer) this.menuBtnContainer.x = newW - 24;
            if (this.bagBtnContainer) this.bagBtnContainer.x = newW - 68;
            if (this.zoomBtnContainer) this.zoomBtnContainer.x = newW - 116;
            if (this.updateModalsCenter) this.updateModalsCenter();
            if (this.zoomManager) this.zoomManager.updateUI(this.zoomManager.currentZoom);
        });

        // Kontrol Keyboard
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

        // Audio Ambient
        AudioManager.startAmbientBGM();

        // Notifikasi Selamat Datang
        this.time.delayedCall(500, () => {
            this.showFloatingToast('Memasuki Scene 3: Gua Kristal Purba', 0xc084fc);
        });

        this.autoSave(false);
    }

    // ===============================================================
    // LINGKUNGAN GUA KRISTAL (PARALLAX, STALAKTIT, PARTIKEL & PLATFORM)
    // ===============================================================
    createCaveEnvironment() {
        const W = 2000;
        const H = 450;

        // Latar Belakang Gradien Langit-langit Gua
        const caveBg = this.add.graphics().setScrollFactor(0.2, 0);
        caveBg.fillGradientStyle(0x13072b, 0x13072b, 0x070310, 0x070310, 1);
        caveBg.fillRect(0, 0, W, H);

        // Stalaktit Langit-langit yang Bergantung
        for (let x = 60; x <= W; x += 110) {
            const h = Phaser.Math.Between(35, 75);
            const stalactite = this.add.image(x, 0, 'crystal_stalactite')
                .setOrigin(0.5, 0)
                .setScale(Phaser.Math.FloatBetween(0.8, 1.25), h / 56)
                .setScrollFactor(0.5, 1)
                .setDepth(2);
            // Kilau ujung stalaktit sesekali
            this.tweens.add({
                targets: stalactite,
                alpha: 0.65,
                duration: Phaser.Math.Between(2000, 3500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Partikel Debu Magis Mengambang (Floating Crystal Motes)
        this.crystalMotes = [];
        for (let i = 0; i < 45; i++) {
            const mote = this.add.image(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(40, H - 40),
                'fx_crystal_dust'
            ).setDepth(4).setAlpha(Phaser.Math.FloatBetween(0.25, 0.75));
            mote.baseX = mote.x;
            mote.speedY = Phaser.Math.FloatBetween(12, 28);
            mote.waveSpeed = Phaser.Math.FloatBetween(0.001, 0.003);
            mote.waveAmp = Phaser.Math.FloatBetween(8, 22);
            this.crystalMotes.push(mote);
        }

        // Platform Statis Fisika
        this.platforms = this.physics.add.staticGroup();

        // 1. Lantai Utama Gua (dengan Celah Jurang di x: 740 s/d 920)
        // Bagian Kiri: x: -100 s/d 740
        for (let x = -100; x <= 740; x += 32) {
            const tile = this.add.image(x, 434, 'crystal_tile_cave_ground').setDepth(5);
            const phys = this.add.rectangle(x, 434, 32, 32, 0x000000, 0);
            this.physics.add.existing(phys, true);
            this.platforms.add(phys);
        }

        // Bagian Kanan: x: 920 s/d 2100
        for (let x = 920; x <= 2100; x += 32) {
            const tile = this.add.image(x, 434, 'crystal_tile_cave_ground').setDepth(5);
            const phys = this.add.rectangle(x, 434, 32, 32, 0x000000, 0);
            this.physics.add.existing(phys, true);
            this.platforms.add(phys);
        }

        // Hazard Duri Kristal Tajam di Celah Jurang (x: 750 s/d 910)
        this.hazard = this.physics.add.staticGroup();
        for (let x = 756; x <= 900; x += 32) {
            const spike = this.hazard.create(x, 438, 'crystal_spike_hazard').setDepth(6);
            spike.refreshBody();
        }

        // 2. Platform Kristal Melayang (Pijakan Bertingkat)
        this.createFloatingCrystalLedge(360, 350, 140, 24);
        this.createFloatingCrystalLedge(620, 275, 130, 24);
        this.createFloatingCrystalLedge(830, 215, 150, 24); // Melompati celah jurang
        this.createFloatingCrystalLedge(1080, 275, 140, 24);
        this.createFloatingCrystalLedge(1360, 320, 160, 24);
        this.createFloatingCrystalLedge(1600, 240, 120, 24);

        // 3. Hiasan Klaster Kristal Bercahaya di Beberapa Tempat
        this.createCrystalCluster(280, 418, 'purple');
        this.createCrystalCluster(500, 418, 'cyan');
        this.createCrystalCluster(830, 203, 'purple');
        this.createCrystalCluster(1020, 418, 'cyan');
        this.createCrystalCluster(1250, 418, 'purple');
        this.createCrystalCluster(1500, 418, 'cyan');

        // 4. ITEM QUEST: Batu Bintang Abadi (Di platform tertinggi x: 830, y: 170)
        if (!this.collectedItemIds.includes('kristal_bintang')) {
            this.questItem = this.physics.add.sprite(830, 165, 'crystal_star_gem').setDepth(15);
            this.questItem.body.setAllowGravity(false);
            this.questItem.body.immovable = true;
            this.questItem.body.moves = false;

            this.tweens.add({
                targets: this.questItem,
                y: 153,
                angle: 15,
                duration: 1100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: this.questItem,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // 5. NPC: Arkan Penjaga Gua (x: 200, y: 396)
        const npcX = 200;
        const npcY = 396;
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
        const npcPill = this.add.rectangle(0, 0, 110, 20, 0x170b2c, 0.95).setStrokeStyle(1.5, 0xc084fc);
        const npcTxt = this.add.text(0, 0, '[E] Arkan Penjaga', { fontSize: '10px', fontStyle: 'bold', fill: '#f3e8ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.npcPrompt.add([npcPill, npcTxt]);
        npcPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleInteract());

        // 6. PORTAL KIRI (x: 90): Kembali ke Teluk Hong Kong (Scene 2)
        this.portalBack = this.add.container(90, 396).setDepth(12);
        const pBackRing = this.add.circle(0, 0, 22, 0xa855f7, 0.25).setStrokeStyle(2, 0xc084fc);
        const pBackIcon = this.add.text(0, 0, '<', { fontSize: '18px', fontStyle: 'bold', fill: '#f3e8ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        const pBackLabel = this.add.text(0, -32, '← Teluk HK', { fontSize: '11px', fontStyle: 'bold', fill: '#f3e8ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalBack.add([pBackRing, pBackIcon, pBackLabel]);
        this.tweens.add({
            targets: pBackRing,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // 7. PORTAL KANAN (x: 1820): Gerbang Inti Kristal (Victory)
        this.portalEnd = this.add.container(1820, 396).setDepth(12);
        const pEndRing = this.add.circle(0, 0, 24, 0x06b6d4, 0.25).setStrokeStyle(2, 0x22d3ee);
        const pEndIcon = this.add.text(0, 0, '[INTI]', { fontSize: '10px', fontStyle: 'bold', fill: '#cffafe', fontFamily: FONT_BODY }).setOrigin(0.5);
        const pEndLabel = this.add.text(0, -34, 'Gerbang Inti', { fontSize: '11px', fontStyle: 'bold', fill: '#cffafe', fontFamily: FONT_BODY }).setOrigin(0.5);
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

    createFloatingCrystalLedge(x, y, width, height) {
        const slab = this.add.rectangle(x, y, width, height, 0x2e1065, 0.95)
            .setStrokeStyle(2, 0xa855f7)
            .setDepth(6);
        const glowLine = this.add.rectangle(x, y - height / 2 + 1, width, 3, 0xc084fc, 0.9).setDepth(7);
        const phys = this.add.rectangle(x, y, width, height, 0x000000, 0);
        this.physics.add.existing(phys, true);
        this.platforms.add(phys);
    }

    createCrystalCluster(x, y, type = 'purple') {
        const texture = type === 'cyan' ? 'crystal_cluster_cyan' : 'crystal_cluster_purple';
        const crystal = this.add.image(x, y, texture).setOrigin(0.5, 1).setDepth(8);
        this.tweens.add({
            targets: crystal,
            alpha: 0.75,
            scaleY: 1.05,
            duration: Phaser.Math.Between(1500, 2400),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ===============================================================
    // KARAKTER PLAYER & INTERAKSI FISIKA
    // ===============================================================
    createPlayer() {
        const spawnX = this.savedSpawnPos ? this.savedSpawnPos.x : (this.startData?.spawnX || 160);
        const spawnY = this.savedSpawnPos ? this.savedSpawnPos.y : 380;

        const playerTexture = this.textures.exists('custom_player') ? 'custom_player' : 'skeleton_player';
        this.player = this.physics.add.sprite(spawnX, spawnY, playerTexture).setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        if (playerTexture === 'custom_player') {
            const h = this.player.height;
            if (h > 0 && h !== 44) {
                this.player.setScale(44 / h);
            }
        }

        // Ambil Batu Bintang Abadi
        if (this.questItem) {
            this.physics.add.overlap(this.player, this.questItem, () => {
                if (this.questItem && this.questItem.active) {
                    this.createCoinSparkle(this.questItem.x, this.questItem.y);
                    this.questItem.disableBody(true, true);
                    this.questItem.destroy();
                    this.questItem = null;

                    CodeInspector.record('coin');
                    CodeInspector.triggerEvent('coin', { item: 'Batu Bintang Abadi' });

                    if (!this.collectedItemIds.includes('kristal_bintang')) {
                        this.collectedItemIds.push('kristal_bintang');
                    }
                    this.inventory.push({
                        id: 'kristal_bintang',
                        nama: 'Batu Bintang Abadi',
                        deskripsi: 'Kristal berenergi murni yang bersinar di kedalaman gua bawah tanah.',
                        icon: ''
                    });

                    this.updateInventoryBadge();
                    this.showFloatingToast('+1 Batu Bintang Abadi Diperoleh!', 0xc084fc);
                    AudioManager.playCoin();

                    this.quest.selesai = true;
                    this.quest.deskripsi = 'Kristal Bintang telah diamankan! Masuki Gerbang Inti di ujung kanan gua.';
                    this.autoSave(false);
                }
            });
        }

        // Kena Duri Kristal Hazard
        this.physics.add.overlap(this.player, this.hazard, () => {
            if (!this.isInvincible && !this.isGameOver) {
                this.takeDamage(1);
            }
        });
    }

    // ===============================================================
    // TOP NAVBAR HUD (HP, QUEST, INVENTORY, SETTINGS)
    // ===============================================================
    createCaveHUD() {
        // A. HP Bar
        this.healthContainer = this.add.container(16, 13).setDepth(25).setScrollFactor(0);
        const isCompact = this.maxHp > 4;
        const barWidth = isCompact ? 112 : Math.max(120, 34 + this.maxHp * 20 + 38);
        const hpBg = this.add.rectangle(barWidth / 2, 13, barWidth, 26, 0x130924, 0.9).setStrokeStyle(1.5, 0x7c3aed);
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

        // B. Quest Button
        const questX = 16 + barWidth + 44;
        this.questBtnContainer = this.add.container(questX, 26).setDepth(25).setScrollFactor(0);
        const questBtnBg = this.add.rectangle(0, 0, 72, 34, 0x170b2c, 0.9)
            .setStrokeStyle(2, 0xc084fc)
            .setInteractive({ useHandCursor: true });
        const questBtnText = this.add.text(0, 0, 'Quest', {
            fontSize: '13px', fontStyle: 'bold', fill: '#f3e8ff', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.questBtnContainer.add([questBtnBg, questBtnText]);
        questBtnBg.on('pointerdown', () => this.toggleQuestModal());

        // C. Bag / Inventory Button
        const hudRight = this.scale.width;
        this.bagBtnContainer = this.add.container(hudRight - 68, 26).setDepth(25).setScrollFactor(0);
        const bagBtnBg = this.add.rectangle(0, 0, 36, 36, 0x170b2c, 0.9)
            .setStrokeStyle(2, 0x7c3aed)
            .setInteractive({ useHandCursor: true });
        const bagIcon = this.add.text(0, 0, '🎒', { fontSize: '16px' }).setOrigin(0.5);
        this.bagBtnContainer.add([bagBtnBg, bagIcon]);
        bagBtnBg.on('pointerdown', () => this.toggleInventoryModal());

        // D. Settings Button
        this.menuBtnContainer = this.add.container(hudRight - 24, 26).setDepth(25).setScrollFactor(0);
        const menuBtnBg = this.add.rectangle(0, 0, 36, 36, 0x170b2c, 0.9)
            .setStrokeStyle(2, 0x7c3aed)
            .setInteractive({ useHandCursor: true });
        const menuIcon = this.add.text(0, 0, '⚙', { fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);
        this.menuBtnContainer.add([menuBtnBg, menuIcon]);
        menuBtnBg.on('pointerdown', () => this.toggleSettingsModal());

        // Modals
        this.createQuestModalUI();
        this.inventoryModal = new InventoryModal(this, {
            onClose: () => { this.isInvOpen = false; }
        });
        this.settingsModal = new SettingsModal(this, {
            onClose: () => { this.isSettingsOpen = false; }
        });
    }

    updateHPDisplay() {
        if (!this.healthContainer) return;
        const isCompact = this.maxHp > 4;
        if (!isCompact && this.hpHeartTexts) {
            for (let i = 0; i < this.maxHp; i++) {
                if (this.hpHeartTexts[i]) {
                    this.hpHeartTexts[i].setFill(i < this.hp ? '#f43f5e' : '#475569');
                }
            }
        }
        if (this.hpNumericText) {
            this.hpNumericText.setText(`${this.hp}/${this.maxHp}`);
        }
    }

    updateInventoryBadge() {}

    takeDamage(amount = 1) {
        if (this.isInvincible || this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this.updateHPDisplay();
        AudioManager.playHurt();

        if (this.hp <= 0) {
            this.triggerGameOver();
            return;
        }

        this.isInvincible = true;
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            yoyo: true,
            repeat: 3,
            duration: 120,
            onComplete: () => {
                if (this.player) this.player.setAlpha(1);
                this.isInvincible = false;
            }
        });
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.player.setVelocity(0, 0);
        if (this.gameOverModal) {
            this.gameOverModal.setVisible(true);
        }
    }

    // ===============================================================
    // MODALS (QUEST, GAMEOVER, VICTORY)
    // ===============================================================
    createQuestModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.questModal = this.add.container(cx, cy).setDepth(40).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const box = this.add.rectangle(0, 0, 460, 270, 0x130924, 0.98).setStrokeStyle(2, 0xc084fc);

        const header = this.add.text(0, -100, 'ACTIVE QUEST - SCENE 3', {
            fontSize: '16px', fontStyle: 'bold', fill: '#c084fc', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.questTitleText = this.add.text(-200, -50, '', {
            fontSize: '14px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        });

        this.questDescText = this.add.text(-200, -15, '', {
            fontSize: '12px', fill: '#e9d5ff', wordWrap: { width: 400 }, lineSpacing: 4, fontFamily: FONT_BODY
        });

        const closeBtn = this.add.rectangle(0, 95, 120, 32, 0x2e1065, 1)
            .setStrokeStyle(1.5, 0xa855f7)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 95, 'Close [Q]', {
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

    toggleInventoryModal(forceState) {
        const nextState = (forceState !== undefined) ? forceState : (this.inventoryModal ? !this.inventoryModal.isOpen() : !this.isInvOpen);
        if (nextState) {
            this.toggleQuestModal(false);
            this.toggleSettingsModal(false);
            if (this.inventoryModal) this.inventoryModal.show();
        } else {
            if (this.inventoryModal) this.inventoryModal.hide();
        }
        this.isInvOpen = this.inventoryModal ? this.inventoryModal.isOpen() : false;
    }

    toggleSettingsModal(forceState) {
        const nextState = (forceState !== undefined) ? forceState : (this.settingsModal ? !this.settingsModal.isOpen() : !this.isSettingsOpen);
        if (nextState) {
            this.toggleQuestModal(false);
            this.toggleInventoryModal(false);
            if (this.settingsModal) this.settingsModal.show();
        } else {
            if (this.settingsModal) this.settingsModal.hide();
        }
        this.isSettingsOpen = this.settingsModal ? this.settingsModal.isOpen() : false;
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

        const reloadBtn = this.add.rectangle(0, 56, 240, 36, 0x7c3aed, 0.95)
            .setStrokeStyle(1.5, 0xc084fc)
            .setInteractive({ useHandCursor: true });
        const reloadText = this.add.text(0, 56, 'Coba Lagi Dari Awal Gua', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        reloadBtn.on('pointerdown', () => {
            this.isGameOver = false;
            this.gameOverModal.setVisible(false);
            this.scene.restart({ hp: this.maxHp });
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

    createVictoryModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.victoryModal = this.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.8).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 270, 0x130924, 0.98).setStrokeStyle(2.5, 0xc084fc);

        const icon = this.add.text(0, -72, '★ PETUALANGAN PURNA ★', { fontSize: '14px', fontStyle: 'bold', fill: '#fde047', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = this.add.text(0, -36, 'GUA KRISTAL TERTEMBUS!', {
            fontSize: '26px', fontStyle: 'bold', fill: '#c084fc', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, 4, 'Selamat! Kamu berhasil menaklukkan misteri kristal purba!', {
            fontSize: '12px', fill: '#e9d5ff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const backScene2Btn = this.add.rectangle(0, 50, 230, 34, 0x0284c7, 0.95)
            .setStrokeStyle(1.5, 0x38bdf8)
            .setInteractive({ useHandCursor: true });
        const backScene2Text = this.add.text(0, 50, 'Kembali ke Teluk HK (Scene 2)', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        backScene2Btn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            this.scene.start('Scene2');
        });

        const menuBtn = this.add.rectangle(0, 96, 230, 32, 0x1e293b, 0.95)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(0, 96, 'Kembali ke Menu Utama', {
            fontSize: '11px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        menuBtn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            AudioManager.stopAmbientBGM();
            this.scene.start('TitleScene');
        });

        this.victoryModal.add([overlay, box, icon, title, subtitle, backScene2Btn, backScene2Text, menuBtn, menuText]);
    }

    updateModalsCenter(zoom) {
        const W = this.scale ? this.scale.width : 800;
        const H = this.scale ? this.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;

        if (this.questModal && this.questModal.active) this.questModal.setPosition(cx, cy);
        if (this.gameOverModal && this.gameOverModal.active) this.gameOverModal.setPosition(cx, cy);
        if (this.victoryModal && this.victoryModal.active) this.victoryModal.setPosition(cx, cy);
    }

    // ===============================================================
    // TOUCH CONTROLS UNTUK MOBILE/TABLET
    // ===============================================================
    createTouchControls() {
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
        const leftBg = this.add.rectangle(62, 390, 56, 56, 0x170b2c, 0.8).setStrokeStyle(2, 0x7c3aed).setInteractive();
        const leftIcon = this.add.text(62, 390, '◀', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        leftBg.on('pointerdown', () => { this.touchState.left = true; leftBg.setFillStyle(0x7c3aed, 0.9); });
        const releaseLeft = () => { this.touchState.left = false; leftBg.setFillStyle(0x170b2c, 0.8); };
        leftBg.on('pointerup', releaseLeft).on('pointerout', releaseLeft);

        // Kanan
        const rightBg = this.add.rectangle(134, 390, 56, 56, 0x170b2c, 0.8).setStrokeStyle(2, 0x7c3aed).setInteractive();
        const rightIcon = this.add.text(134, 390, '▶', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        rightBg.on('pointerdown', () => { this.touchState.right = true; rightBg.setFillStyle(0x7c3aed, 0.9); });
        const releaseRight = () => { this.touchState.right = false; rightBg.setFillStyle(0x170b2c, 0.8); };
        rightBg.on('pointerup', releaseRight).on('pointerout', releaseRight);

        // Lompat
        const jumpBg = this.add.rectangle(735, 390, 58, 58, 0x170b2c, 0.8).setStrokeStyle(2, 0x7c3aed).setInteractive();
        const jumpIcon = this.add.text(735, 390, '▲', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        jumpBg.on('pointerdown', () => { this.touchState.jump = true; jumpBg.setFillStyle(0x7c3aed, 0.9); });
        const releaseJump = () => { this.touchState.jump = false; jumpBg.setFillStyle(0x170b2c, 0.8); };
        jumpBg.on('pointerup', releaseJump).on('pointerout', releaseJump);

        // Interaksi [E]
        const interactBg = this.add.rectangle(735, 318, 56, 42, 0x2e1065, 0.85).setStrokeStyle(2, 0xc084fc).setInteractive();
        const interactIcon = this.add.text(735, 318, 'E', { fontSize: '13px', fontStyle: 'bold', fill: '#e9d5ff' }).setOrigin(0.5);
        interactBg.on('pointerdown', () => this.handleInteract());

        this.mobileControlsContainer.add([leftBg, leftIcon, rightBg, rightIcon, jumpBg, jumpIcon, interactBg, interactIcon]);
    }

    // ===============================================================
    // INTERAKSI & UPDATE LOOP
    // ===============================================================
    handleInteract() {
        if (!this.player) return;

        // 1. Dialog NPC Arkan Penjaga
        if (this.npc) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            if (dist < 80) {
                CodeInspector.triggerEvent('npc', { name: 'Arkan' });
                this.dialogBox.start(
                    'Arkan (Penjaga Kristal Purba)',
                    [
                        "Salam petualang! Selamat datang di Gua Kristal Purba.",
                        "Gua ini menyimpan energi kosmik yang telah membatu selama ribuan tahun.",
                        "Di tebing tertinggi di tengah jurang, terdapat Batu Bintang Abadi yang sangat langka.",
                        "Hati-hati saat melompat di atas jurang, kristal di dasarnya sangat tajam!",
                        "Ambillah Batu Bintang itu dan bawalah ke Gerbang Inti di ujung gua."
                    ],
                    () => {
                        this.showFloatingToast('Dialog Arkan Selesai!', 0xc084fc);
                    },
                    'npc_portrait'
                );
                return;
            }
        }

        // 2. Portal Kembali ke Teluk Hong Kong (x: 90)
        const distPortalBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 396);
        if (distPortalBack < 70) {
            this.showFloatingToast('Kembali ke Scene 2: Teluk Hong Kong...', 0x38bdf8);
            this.scene.start('Scene2', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                quest: this.quest,
                collectedItemIds: this.collectedItemIds
            });
            return;
        }

        // 3. Portal Gerbang Inti (x: 1820)
        const distPortalEnd = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1820, 396);
        if (distPortalEnd < 70) {
            if (!this.collectedItemIds.includes('kristal_bintang')) {
                this.showFloatingToast('Gerbang terkunci! Temukan Batu Bintang Abadi terlebih dahulu.', 0xef4444);
            } else {
                this.victoryModal.setVisible(true);
            }
            return;
        }
    }

    update(time, delta) {
        // 1. Floating Motes Movement
        if (this.crystalMotes) {
            const dt = (delta || 16) / 1000;
            for (let i = 0; i < this.crystalMotes.length; i++) {
                const mote = this.crystalMotes[i];
                mote.y -= mote.speedY * dt;
                mote.x = mote.baseX + Math.sin(time * mote.waveSpeed) * mote.waveAmp;
                if (mote.y < 20) {
                    mote.y = 430;
                }
            }
        }

        if (this.isGameOver || !this.player || !this.player.body) return;

        // 2. Tampilkan prompt [E] saat dekat NPC atau Portal
        const distNPC = this.npc ? Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) : 999;
        if (this.npcPrompt) {
            this.npcPrompt.setVisible(distNPC < 80);
        }

        // 3. Kontrol Pergerakan Karakter
        const speed = this.customSpeed || 220;
        const jumpForce = this.customJump || -340;
        const onGround = this.player.body.blocked.down || this.player.body.touching.down;

        let moveLeft = this.cursors.left.isDown || this.keys.a.isDown || this.touchState.left;
        let moveRight = this.cursors.right.isDown || this.keys.d.isDown || this.touchState.right;
        let doJump = this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown || this.touchState.jump;

        if (moveLeft) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (moveRight) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (doJump && onGround) {
            this.player.setVelocityY(jumpForce);
            AudioManager.playJump();
        }
    }

    createCoinSparkle(x, y) {
        for (let i = 0; i < 8; i++) {
            const spark = this.add.image(x, y, 'fx_crystal_dust').setDepth(20);
            const angle = (i / 8) * Math.PI * 2;
            const dist = Phaser.Math.Between(25, 45);
            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.2,
                duration: 600,
                onComplete: () => spark.destroy()
            });
        }
    }

    showFloatingToast(text, color = 0xc084fc) {
        const toast = this.add.text(
            this.player ? this.player.x : 400,
            this.player ? this.player.y - 45 : 200,
            text,
            {
                fontSize: '12px',
                fontStyle: 'bold',
                fill: '#ffffff',
                backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
                padding: { x: 8, y: 4 },
                fontFamily: FONT_BODY
            }
        ).setOrigin(0.5).setDepth(40);

        this.tweens.add({
            targets: toast,
            y: toast.y - 30,
            alpha: 0,
            duration: 2000,
            onComplete: () => toast.destroy()
        });
    }

    autoSave(isCheckpoint = false) {
        SaveManager.save({
            sceneKey: 'Scene3',
            hp: this.hp,
            maxHp: this.maxHp,
            playerX: Math.round(this.player ? this.player.x : 160),
            playerY: Math.round(this.player ? this.player.y : 380),
            inventory: this.inventory,
            quest: this.quest,
            collectedItemIds: this.collectedItemIds,
            isCheckpoint: isCheckpoint
        });
    }
}
