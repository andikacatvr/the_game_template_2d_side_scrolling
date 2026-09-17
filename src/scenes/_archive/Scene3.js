import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { AudioManager } from '../utils/AudioManager.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { SaveManager } from '../utils/SaveManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { GameHUD } from '../ui/GameHUD.js';

// ===============================================================
//  SCENE 3: RERUNTUHAN KUNO (TEMPLATE KOSONGAN)
// ===============================================================
// Karakteristik: Layar sedang (lebar 1200px), kamera follow player,
// dilengkapi pintu kembali ke Scene 2 dan portal maju ke Scene 4.
export class Scene3 extends Phaser.Scene {
    constructor() {
        super({ key: 'Scene3' });
    }

    init(data = {}) {
        this.startData = data;
        this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
        this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.quest = data.quest || { ...CONFIG_SKELETON.questAwal };

        this.isGameOver = false;
        this.isSettingsOpen = false;
        this.touchState = { left: false, right: false, jump: false };
    }

    create() {
        const WORLD_WIDTH = 1200;
        const WORLD_HEIGHT = 450;

        // 1. Batas Kamera & Fisika
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setBackgroundColor('#7dd3fc'); // Biru muda cerah (sky blue)

        // 2. Platform Dunia
        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();

        // Tanah Dasar
        this.buildTiledGround(0, 434, 38);

        // Platform Melayang (Contoh Tata Letak)
        this.buildTiledPlatform(320, 320, 4);
        this.buildTiledPlatform(600, 250, 5);
        this.buildTiledPlatform(880, 310, 4);

        //  [SLOT KONTEN]: Tambahkan Musuh / Rintangan Baru di sini
        this.hazards.create(600, 412, 'skeleton_hazard').refreshBody();

        //  [SLOT KONTEN]: Tambahkan Item / Koin Pengambilan di sini
        // Contoh: this.koin = this.physics.add.sprite(600, 200, 'skeleton_item');

        // 3. Pintu Kembali (ke Scene 2) & Pintu Maju (ke Scene 4)
        this.doorBack = this.physics.add.staticSprite(50, 395, 'skeleton_portal').setTint(0x94a3b8);
        this.promptBack = this.add.container(50, 350).setDepth(25).setVisible(false);
        const pbPill = this.add.rectangle(0, 0, 96, 20, 0x1e293b, 0.95).setStrokeStyle(1.5, 0x94a3b8);
        const pbTxt = this.add.text(0, 0, '[E] Scene 2', { fontSize: '10px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptBack.add([pbPill, pbTxt]);
        pbPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.goToScene2());

        this.doorNext = this.physics.add.staticSprite(1130, 395, 'skeleton_portal');
        this.tweens.add({ targets: this.doorNext, alpha: 0.8, yoyo: true, repeat: -1, duration: 1000 });
        this.promptNext = this.add.container(1130, 350).setDepth(25).setVisible(false);
        const pnPill = this.add.rectangle(0, 0, 96, 20, 0x0c2744, 0.95).setStrokeStyle(1.5, 0x38bdf8);
        const pnTxt = this.add.text(0, 0, '[E] Scene 4', { fontSize: '10px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptNext.add([pnPill, pnTxt]);
        pnPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.goToScene4());

        // 4. Karakter Pemain
        const spawnX = this.startData.fromScene4 ? 1070 : 100;
        this.player = this.physics.add.sprite(spawnX, 370, 'skeleton_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Kamera Mengikuti Player
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(120, 60);

        this.physics.add.overlap(this.player, this.hazards, () => {
            if (!this.isInvincible && !this.isGameOver) this.takeDamage(1);
        });

        // Inisialisasi Zoom Kamera
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85,
            followTarget: this.player
        });

        // 5. UI HUD Bersatu (Selaras dengan Scene 1)
        this.createHUD();
        this.createTouchControls();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown-E', () => this.handleInteract());

        this.showFloatingToast('SCENE 3: RERUNTUHAN KUNO (TEMPLATE KOSONGAN)', 0x38bdf8);
        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    buildTiledGround(startX, y, tileCount) {
        for (let i = 0; i < tileCount; i++) {
            const x = startX + 16 + i * 32;
            let tileKey = (i === 0) ? 'tile_grass_left' : (i === tileCount - 1) ? 'tile_grass_right' : 'tile_grass_mid';
            this.platforms.create(x, y, tileKey).refreshBody();
            for (let dy = 32; y + dy <= 560; dy += 32) {
                this.platforms.create(x, y + dy, 'tile_dirt_sub').refreshBody();
            }
        }
    }

    buildTiledPlatform(centerX, y, tileCount) {
        const startX = centerX - ((tileCount - 1) * 32) / 2;
        for (let i = 0; i < tileCount; i++) {
            const x = startX + i * 32;
            const tileKey = (i === 0) ? 'tile_plat_left' : (i === tileCount - 1) ? 'tile_plat_right' : 'tile_plat_mid';
            this.platforms.create(x, y, tileKey).refreshBody();
        }
    }

    createHUD() {
        this.hud = new GameHUD(this, {
            sceneTitle: 'SCENE 3 - RERUNTUHAN KUNO',
            badgeStrokeColor: 0x38bdf8,
            badgeTextColor: '#e0f2fe'
        });
    }

    createTouchControls() {
        this.mobileControlsContainer = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
        this.touchControlsEnabled = isMobileOrTablet();
        try {
            const saved = localStorage.getItem('template_touch_controls');
            if (saved !== null) this.touchControlsEnabled = saved === 'true';
        } catch (e) {}
        this.mobileControlsContainer.setVisible(this.touchControlsEnabled);

        const leftBg = this.add.rectangle(62, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569).setInteractive();
        const leftIcon = this.add.text(62, 390, '◀', { fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
        leftBg.on('pointerdown', () => { this.touchState.left = true; });
        const relL = () => { this.touchState.left = false; };
        leftBg.on('pointerup', relL).on('pointerout', relL);

        const rightBg = this.add.rectangle(134, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569).setInteractive();
        const rightIcon = this.add.text(134, 390, '▶', { fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
        rightBg.on('pointerdown', () => { this.touchState.right = true; });
        const relR = () => { this.touchState.right = false; };
        rightBg.on('pointerup', relR).on('pointerout', relR);

        const jumpBg = this.add.rectangle(738, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x38bdf8).setInteractive();
        const jumpIcon = this.add.text(738, 390, '▲', { fontSize: '24px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        jumpBg.on('pointerdown', () => { this.touchState.jump = true; });
        const relJ = () => { this.touchState.jump = false; };
        jumpBg.on('pointerup', relJ).on('pointerout', relJ);

        this.mobileControlsContainer.add([leftBg, leftIcon, rightBg, rightIcon, jumpBg, jumpIcon]);
    }

    handleInteract() {
        if (this.isGameOver || this.isSettingsOpen) return;

        const distBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
        if (distBack < 75) {
            this.goToScene2();
            return;
        }

        const distNext = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorNext.x, this.doorNext.y);
        if (distNext < 75) {
            this.goToScene4();
            return;
        }
    }

    goToScene2() {
        AudioManager.playClick();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Scene2', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                quest: this.quest,
                collectedItemIds: this.collectedItemIds,
                fromScene3: true
            });
        });
    }

    goToScene4() {
        AudioManager.playSuccess();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Scene4', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                quest: this.quest,
                collectedItemIds: this.collectedItemIds
            });
        });
    }

    takeDamage(amount) {
        if (this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this.updateHPDisplay();
        AudioManager.playHurt();
        this.showFloatingToast('-1 HP!', 0xef4444);

        if (this.hp <= 0) {
            this.triggerGameOver();
            return;
        }

        this.isInvincible = true;
        this.tweens.add({
            targets: this.player, alpha: 0.3, yoyo: true, repeat: 3, duration: 120,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isInvincible = false;
            }
        });
    }

    updateHPDisplay() {
        if (this.hud) {
            this.hud.updateHPDisplay();
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.player.setVelocity(0, 0);
        AudioManager.playHurt();
        this.cameras.main.shake(300, 0.02);
        this.tweens.add({
            targets: this.player,
            alpha: 0,
            duration: 450,
            onComplete: () => {
                if (this.hud) {
                    this.hud.showGameOverModal();
                } else {
                    this.scene.restart(this.startData);
                }
            }
        });
    }

    toggleSettingsModal(forceState) {
        if (this.hud) {
            this.hud.toggleSettingsModal(forceState);
        }
    }

    toggleQuestModal(forceState) {
        if (this.hud) {
            this.hud.toggleQuestModal(forceState);
        }
    }

    toggleInventoryModal(forceState) {
        if (this.hud) {
            this.hud.toggleInventoryModal(forceState);
        }
    }

    showFloatingToast(msg, color = 0x38bdf8) {
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        const toast = this.add.text(this.player.x, this.player.y - 35, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexColor,
            backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);

        this.tweens.add({
            targets: toast, y: toast.y - 20, alpha: 0, duration: 1500,
            onComplete: () => toast.destroy()
        });
    }

    update() {
        if (!this.player || !this.player.body || this.isGameOver) return;

        const dBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
        this.promptBack.setVisible(dBack < 80);

        const dNext = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorNext.x, this.doorNext.y);
        this.promptNext.setVisible(dNext < 80);

        const speed = CONFIG_SKELETON.player.kecepatan || 220;
        const jumpSpeed = -(CONFIG_SKELETON.player.kekuatanLompat || 440);

        const left = this.cursors.left.isDown || this.keys.a.isDown || this.touchState.left;
        const right = this.cursors.right.isDown || this.keys.d.isDown || this.touchState.right;
        const jump = this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown || this.touchState.jump;

        if (left) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (right) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && (this.player.body.touching.down || this.player.body.blocked.down)) {
            this.player.setVelocityY(jumpSpeed);
            AudioManager.playJump();
        }
    }
}
