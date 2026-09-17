import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { AudioManager } from '../utils/AudioManager.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { SaveManager } from '../utils/SaveManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { GameHUD } from '../ui/GameHUD.js';

// ===============================================================
//  SCENE 5: PUNCAK MENARA AKHIR (BOSS / FINALE TEMPLATE)
// ===============================================================
// Karakteristik: Area arena terakhir (lebar 1000px), portal akhir
// menuju kemenangan (Tamat / Victory), dan pintu kembali ke Scene 4.
export class Scene5 extends Phaser.Scene {
    constructor() {
        super({ key: 'Scene5' });
    }

    init(data = {}) {
        this.startData = data;
        this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
        this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.quest = data.quest || { ...CONFIG_SKELETON.questAwal };

        this.isGameOver = false;
        this.isVictoryOpen = false;
        this.isSettingsOpen = false;
        this.touchState = { left: false, right: false, jump: false };
    }

    create() {
        const WORLD_WIDTH = 1000;
        const WORLD_HEIGHT = 450;

        // 1. Batas Kamera & Fisika
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setBackgroundColor('#7dd3fc'); // Biru muda cerah (sky blue)

        // 2. Platform Arena
        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();

        // Tanah Dasar Arena
        this.buildTiledGround(0, 434, 32);

        // Platform Bertingkat Arena Boss
        this.buildTiledPlatform(260, 320, 4);
        this.buildTiledPlatform(500, 240, 6);
        this.buildTiledPlatform(740, 320, 4);

        //  [SLOT KONTEN]: Taruh Bos / Musuh Akhir di sini
        // Contoh: this.boss = this.physics.add.sprite(500, 180, 'skeleton_npc').setTint(0xef4444);

        // 3. Pintu Kembali (ke Scene 4) & Portal Kemenangan Akhir (Tamat)
        this.doorBack = this.physics.add.staticSprite(50, 395, 'skeleton_portal').setTint(0x94a3b8);
        this.promptBack = this.add.container(50, 350).setDepth(25).setVisible(false);
        const pbPill = this.add.rectangle(0, 0, 96, 20, 0x1e293b, 0.95).setStrokeStyle(1.5, 0x94a3b8);
        const pbTxt = this.add.text(0, 0, '[E] Scene 4', { fontSize: '10px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptBack.add([pbPill, pbTxt]);
        pbPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.goToScene4());

        // Portal Kemenangan Akhir
        this.portalFinal = this.physics.add.staticSprite(920, 395, 'skeleton_portal').setTint(0xfacc15);
        this.tweens.add({ targets: this.portalFinal, scaleX: 1.1, scaleY: 1.1, alpha: 0.85, yoyo: true, repeat: -1, duration: 800 });
        this.promptFinal = this.add.container(920, 350).setDepth(25).setVisible(false);
        const pfPill = this.add.rectangle(0, 0, 110, 20, 0x3b1c05, 0.95).setStrokeStyle(1.5, 0xfacc15);
        const pfTxt = this.add.text(0, 0, '[E] Selesaikan Game', { fontSize: '9px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptFinal.add([pfPill, pfTxt]);
        pfPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.triggerVictory());

        // 4. Karakter Pemain
        this.player = this.physics.add.sprite(100, 370, 'skeleton_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Kamera Mengikuti Player
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(120, 60);

        // Inisialisasi Zoom Kamera
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85,
            followTarget: this.player
        });

        // 5. UI HUD & Victory Modal
        this.createHUD();
        this.createVictoryModal();
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

        this.showFloatingToast('SCENE 5: PUNCAK MENARA AKHIR (FINALE)', 0xfacc15);
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
            sceneTitle: 'SCENE 5 - PUNCAK AKHIR',
            badgeStrokeColor: 0xfacc15,
            badgeTextColor: '#fef08a'
        });
    }

    createVictoryModal() {
        this.victoryModal = this.add.container(400, 225).setDepth(80).setVisible(false).setScrollFactor(0);

        const overlay = this.add.rectangle(0, 0, 800, 450, 0x000000, 0.88).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 280, 0x071510, 0.98).setStrokeStyle(2.5, 0x22c55e);
        const icon = this.add.text(0, -95, '[ SELESAI ]', { fontSize: '42px' }).setOrigin(0.5);
        const title = this.add.text(0, -50, 'SELURUH PETUALANGAN TAMAT!', {
            fontSize: '22px', fontStyle: 'bold', fill: '#4ade80', fontFamily: FONT_TITLE
        }).setOrigin(0.5);
        const desc = this.add.text(0, -10, 'Selamat! Kamu telah berhasil menjelajahi seluruh 5 Scene!\nKarya dari: ' + (CONFIG_SKELETON.namaKelompok || 'Kelompok Developer'), {
            fontSize: '12px', fill: '#bbf7d0', align: 'center', wordWrap: { width: 420 }, lineSpacing: 5, fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Tombol Main Lagi
        const replayBtn = this.add.rectangle(-95, 65, 150, 36, 0x2563eb, 0.95).setStrokeStyle(1.5, 0x60a5fa).setInteractive({ useHandCursor: true });
        const replayTxt = this.add.text(-95, 65, 'Main Lagi', { fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY }).setOrigin(0.5);
        replayBtn.on('pointerdown', () => {
            this.scene.start('GameScene', { isNewGame: true });
        });

        // Tombol Menu Utama
        const menuBtn = this.add.rectangle(95, 65, 150, 36, 0x1e293b, 0.95).setStrokeStyle(1.5, 0x64748b).setInteractive({ useHandCursor: true });
        const menuTxt = this.add.text(95, 65, 'Menu Utama', { fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY }).setOrigin(0.5);
        menuBtn.on('pointerdown', () => {
            this.scene.start('TitleScene');
        });

        this.victoryModal.add([overlay, box, icon, title, desc, replayBtn, replayTxt, menuBtn, menuTxt]);
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

        const jumpBg = this.add.rectangle(738, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0xfacc15).setInteractive();
        const jumpIcon = this.add.text(738, 390, '▲', { fontSize: '24px', fontStyle: 'bold', fill: '#facc15', fontFamily: FONT_BODY }).setOrigin(0.5);
        jumpBg.on('pointerdown', () => { this.touchState.jump = true; });
        const relJ = () => { this.touchState.jump = false; };
        jumpBg.on('pointerup', relJ).on('pointerout', relJ);

        this.mobileControlsContainer.add([leftBg, leftIcon, rightBg, rightIcon, jumpBg, jumpIcon]);
    }

    handleInteract() {
        if (this.isGameOver || this.isSettingsOpen || this.isVictoryOpen) return;

        const distBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
        if (distBack < 75) {
            this.goToScene4();
            return;
        }

        const distFinal = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portalFinal.x, this.portalFinal.y);
        if (distFinal < 75) {
            this.triggerVictory();
            return;
        }
    }

    goToScene4() {
        AudioManager.playClick();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Scene4', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                quest: this.quest,
                collectedItemIds: this.collectedItemIds,
                fromScene5: true
            });
        });
    }

    triggerVictory() {
        this.isVictoryOpen = true;
        this.player.setVelocity(0, 0);
        AudioManager.playSuccess();
        this.victoryModal.setVisible(true);
    }

    takeDamage(amount) {
        if (this.isGameOver || this.isVictoryOpen) return;
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

    updateHPDisplay() {
        if (this.hud) {
            this.hud.updateHPDisplay();
        }
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
        if (!this.player || !this.player.body || this.isGameOver || this.isVictoryOpen) return;

        const dBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
        this.promptBack.setVisible(dBack < 80);

        const dFinal = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portalFinal.x, this.portalFinal.y);
        this.promptFinal.setVisible(dFinal < 80);

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
