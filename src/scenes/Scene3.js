import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { DialogBox } from '../ui/DialogBox.js';
import { EngineMenuBar } from '../ui/EngineMenuBar.js';

// ===============================================================
// SCENE 3: TEMPLATE KOSONG (HANYA LANTAI / TILES)
// ===============================================================
export class Scene3 extends Phaser.Scene {
    constructor() {
        super({ key: 'Scene3' });
    }

    init(data = {}) {
        this.startData = data;
        this.isGameOver = false;
        this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
        this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.touchState = { left: false, right: false, jump: false };
        this.isInvincible = false;
    }

    create() {
        CommandConsole.show();

        // Inisialisasi Top Engine Menu Bar (Blender / Unity Style)
        this.engineMenuBar = new EngineMenuBar(this);
        this.engineMenuBar.show(this);

        // 1. Warna Latar Bersih
        this.cameras.main.setBackgroundColor('#0b1329');

        // 2. Setup Batas Dunia & Kamera (Lebar 1600px)
        const worldWidth = 1600;
        this.physics.world.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBounds(0, 0, worldWidth, 450);

        // 3. Lantai / Tiles Penuh (Kosong tanpa rintangan)
        this.createGround(worldWidth);

        // 4. Portal Polos untuk Kembali ke Scene 2 (di sebelah kiri x: 90)
        this.createReturnPortal();

        // 5. Karakter Player
        this.createPlayer();

        // Kamera otomatis mengikuti karakter
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 6. UI HUD (HP & Menu Pengaturan)
        this.createHUD();

        // 7. Kontrol Sentuh Mobile (jika di perangkat touch)
        this.createTouchControls();

        // 8. Kontrol Keyboard
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
        this.input.keyboard.on('keydown-ESC', () => this.toggleSettingsModal());

        // Zoom Kamera
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: 0.85,
            maxZoom: 1.6,
            defaultZoom: 1.0,
            followTarget: this.player
        });
        const rightEdge = this.scale.width;
        this.zoomBtnContainer = this.zoomManager.createHUDButton(rightEdge - 116, 26, 44, 36);

        // 9. Sistem Kotak Dialog (untuk template /create dialogue & npc)
        this.dialogBox = new DialogBox(this);

        // ===============================================================
        // 🎨 KANVAS KREASI MURID (TEMPEL KODE /create KAMU DI BAWAH INI)
        // ===============================================================
        // 1. [Parallax]: Tempel kode /create parallax di sini
        // 2. [Platform]: Tempel kode /create tile di sini
        // 3. [NPC]:      Tempel kode /create npc di sini
        // 4. [Misi]:     Tempel kode /create quest di sini
        // 5. [Duri]:     Tempel kode /create obstacle di sini
        // ===============================================================

        // Notifikasi Selamat Datang
        this.time.delayedCall(400, () => {
            this.showFloatingToast('🌟 Sandbox World Aktif! Ketik /create untuk membangun.', 0x38bdf8);
        });

        SaveManager.save({
            sceneKey: 'Scene3',
            hp: this.hp,
            maxHp: this.maxHp,
            playerX: Math.round(this.player.x),
            playerY: Math.round(this.player.y),
            inventory: this.inventory
        });
    }

    // ===============================================================
    // LANTAI / TILES PENUH (KOSONG TANPA JURANG / HAZARD)
    // ===============================================================
    createGround(worldWidth) {
        this.platforms = this.physics.add.staticGroup();

        const groundY = 434;
        const tileCount = Math.ceil((worldWidth + 128) / 32);

        for (let i = 0; i < tileCount; i++) {
            const x = -64 + i * 32 + 16;
            let tileKey = 'tile_grass_mid';
            if (i === 0) tileKey = 'tile_grass_left';
            else if (i === tileCount - 1) tileKey = 'tile_grass_right';

            // Permukaan lantai atas
            this.platforms.create(x, groundY, tileKey).refreshBody();

            // Lapisan bawah tanah agar solid saat kamera bergerak
            for (let dy = 32; groundY + dy <= 560; dy += 32) {
                this.platforms.create(x, groundY + dy, 'tile_dirt_sub').refreshBody();
            }
        }
    }

    // ===============================================================
    // PORTAL KEMBALI KE SCENE 2 (POLOS)
    // ===============================================================
    createReturnPortal() {
        const portalX = 90;
        const portalY = 396;
        this.portalBack = this.add.container(portalX, portalY).setDepth(12);

        const ring = this.add.circle(0, 0, 24, 0x0284c7, 0.25).setStrokeStyle(2, 0x38bdf8);
        const icon = this.add.text(0, 0, 'HUB', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        const label = this.add.text(0, -34, '← Menu Utama', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalBack.add([ring, icon, label]);

        this.tweens.add({
            targets: ring,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        this.portalPrompt = this.add.container(portalX, portalY - 52).setDepth(25).setVisible(false);
        const pill = this.add.rectangle(0, 0, 130, 22, 0x0f172a, 0.95).setStrokeStyle(1.5, 0x38bdf8);
        const txt = this.add.text(0, 0, '[E] Ke Menu Utama', { fontSize: '10px', fontStyle: 'bold', fill: '#e0f2fe', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalPrompt.add([pill, txt]);
        pill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleInteract());
    }

    // ===============================================================
    // PEMBUATAN KARAKTER PLAYER
    // ===============================================================
    createPlayer() {
        const spawnX = this.startData?.spawnX || 180;
        const spawnY = this.startData?.spawnY || 380;

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
    }

    // ===============================================================
    // UI HUD
    // ===============================================================
    createHUD() {
        // HP Bar
        this.healthContainer = this.add.container(16, 13).setDepth(25).setScrollFactor(0);
        const barWidth = Math.max(120, 34 + this.maxHp * 20 + 38);
        const hpBg = this.add.rectangle(barWidth / 2, 13, barWidth, 26, 0x0f172a, 0.85);
        const hpLabel = this.add.text(8, 4, 'HP', { fontSize: '11px', fontStyle: 'bold', fill: '#f43f5e', fontFamily: FONT_TITLE });

        this.hpHeartTexts = [];
        for (let i = 0; i < this.maxHp; i++) {
            const heart = this.add.text(30 + i * 18, 4, '■', { fontSize: '13px', fill: '#f43f5e' });
            this.hpHeartTexts.push(heart);
        }
        this.hpNumericText = this.add.text(32 + this.maxHp * 18 + 4, 5, `${this.hp}/${this.maxHp}`, {
            fontSize: '11px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
        });
        this.healthContainer.add([hpBg, hpLabel, ...this.hpHeartTexts, this.hpNumericText]);

        // Tombol Settings di kanan
        const hudRight = this.scale.width;
        this.menuBtnContainer = this.add.container(hudRight - 24, 26).setDepth(25).setScrollFactor(0);
        const menuBtnBg = this.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuIcon = this.add.text(0, 0, '⚙', { fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);
        this.menuBtnContainer.add([menuBtnBg, menuIcon]);
        menuBtnBg.on('pointerdown', () => this.toggleSettingsModal());

        this.settingsModal = new SettingsModal(this);
    }

    toggleSettingsModal() {
        if (this.settingsModal) {
            if (this.settingsModal.isOpen()) {
                this.settingsModal.hide();
            } else {
                this.settingsModal.show();
            }
        }
    }

    createTouchControls() {
        if (!isMobileOrTablet()) return;

        this.mobileControlsContainer = this.add.container(0, 0).setDepth(28).setScrollFactor(0);

        // Kiri
        const leftBg = this.add.rectangle(62, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569).setInteractive();
        const leftIcon = this.add.text(62, 390, '◀', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        leftBg.on('pointerdown', () => { this.touchState.left = true; leftBg.setFillStyle(0x2563eb, 0.9); });
        const releaseLeft = () => { this.touchState.left = false; leftBg.setFillStyle(0x0f172a, 0.78); };
        leftBg.on('pointerup', releaseLeft).on('pointerout', releaseLeft);

        // Kanan
        const rightBg = this.add.rectangle(134, 390, 56, 56, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569).setInteractive();
        const rightIcon = this.add.text(134, 390, '▶', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        rightBg.on('pointerdown', () => { this.touchState.right = true; rightBg.setFillStyle(0x2563eb, 0.9); });
        const releaseRight = () => { this.touchState.right = false; rightBg.setFillStyle(0x0f172a, 0.78); };
        rightBg.on('pointerup', releaseRight).on('pointerout', releaseRight);

        // Lompat
        const jumpBg = this.add.rectangle(735, 390, 58, 58, 0x0f172a, 0.78).setStrokeStyle(2, 0x475569).setInteractive();
        const jumpIcon = this.add.text(735, 390, '▲', { fontSize: '24px', fill: '#f8fafc' }).setOrigin(0.5);
        jumpBg.on('pointerdown', () => { this.touchState.jump = true; jumpBg.setFillStyle(0x2563eb, 0.9); });
        const releaseJump = () => { this.touchState.jump = false; jumpBg.setFillStyle(0x0f172a, 0.78); };
        jumpBg.on('pointerup', releaseJump).on('pointerout', releaseJump);

        // Interaksi [E]
        const interactBg = this.add.rectangle(735, 318, 56, 42, 0x1e1035, 0.85).setStrokeStyle(2, 0xc084fc).setInteractive();
        const interactIcon = this.add.text(735, 318, 'E', { fontSize: '13px', fontStyle: 'bold', fill: '#e9d5ff' }).setOrigin(0.5);
        interactBg.on('pointerdown', () => this.handleInteract());

        this.mobileControlsContainer.add([leftBg, leftIcon, rightBg, rightIcon, jumpBg, jumpIcon, interactBg, interactIcon]);
    }

    handleInteract() {
        if (!this.player) return;

        // Jika dialog sedang aktif, lanjutkan dialog saat tekan [E]
        if (this.dialogBox && this.dialogBox.isOpen()) {
            this.dialogBox.advance();
            return;
        }

        // Cek dekat Portal Kembali ke Menu Utama / Hub (x: 90)
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 396);
        if (distPortal < 80) {
            this.showFloatingToast('Kembali ke Project Hub...', 0x38bdf8);
            if (this.engineMenuBar) this.engineMenuBar.hide();
            this.cameras.main.fadeOut(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('TitleScene');
            });
            return;
        }

        // ===============================================================
        // 💬 TEMPEL KODE /create dialogue DI BAWAH INI:
        // ===============================================================

    }

    takeDamage(amount = 1) {
        if (this.isInvincible || this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this.isInvincible = true;
        AudioManager.playHurt();
        this.updateHUDHP();

        if (this.hp <= 0) {
            this.handleGameOver();
            return;
        }

        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 120,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                if (this.player) this.player.setAlpha(1);
                this.isInvincible = false;
            }
        });
    }

    handleGameOver() {
        this.isGameOver = true;
        this.showFloatingToast('Game Over! Respawn ke posisi awal...', 0xef4444);
        this.time.delayedCall(1200, () => {
            this.hp = this.maxHp;
            this.isGameOver = false;
            this.isInvincible = false;
            this.player.setPosition(180, 380);
            this.player.setVelocity(0, 0);
            this.player.setAlpha(1);
            this.updateHUDHP();
        });
    }

    update() {
        if (!this.player || !this.player.body) return;

        // Prompt Portal saat pemain mendekat
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 396);
        if (this.portalPrompt) {
            this.portalPrompt.setVisible(distPortal < 80);
        }

        // Pergerakan Karakter
        const speed = 220;
        const jumpForce = -340;
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

    showFloatingToast(text, color = 0x38bdf8) {
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
}
