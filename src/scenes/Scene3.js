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
import { ScriptingWorkspace } from '../ui/ScriptingWorkspace.js';
import { HTMLGameHUD } from '../ui/HTMLGameHUD.js';
import { HTMLInteractPrompt } from '../ui/HTMLInteractPrompt.js';

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
        this.score = 0;
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
        this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.touchState = { left: false, right: false, jump: false };
        this.isInvincible = false;

        // Visual Click-to-Place state
        this.placementMode = null;
        this.placementGhost = null;
        this.placementBanner = null;
        this.placedObjects = [];
        this.customNpcs = [];
        this.customPortals = [];
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

        // Physics Groups untuk Koin & Rintangan
        this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
        this.physics.add.overlap(this.player, this.coins, (player, coin) => this.collectCoin(coin));

        this.hazards = this.physics.add.group({ allowGravity: false, immovable: true });
        this.physics.add.overlap(this.player, this.hazards, (player, hazard) => this.takeDamage(1));

        // Kamera otomatis mengikuti karakter
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 6. UI HUD (HP, Score & Menu Pengaturan)
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
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.placementMode) {
                this.exitPlacementMode();
            } else {
                this.toggleSettingsModal();
            }
        });

        // Click-to-Place Pointer Event Listeners
        this.input.on('pointermove', (pointer) => this.updatePlacementGhost(pointer));
        this.input.on('pointerdown', (pointer) => this.handlePlacementClick(pointer));

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
        this.interactPrompt = new HTMLInteractPrompt(this);

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
    // UI HUD (HTML DOM OVERLAY)
    // ===============================================================
    createHUD() {
        this.htmlHUD = new HTMLGameHUD(this);
        this.settingsModal = new SettingsModal(this, {
            onRestart: () => {
                SaveManager.clear();
                this.scene.restart();
            },
            onMainMenu: () => {
                this.scene.start('TitleScene');
            }
        });
        this.inventoryModal = new InventoryModal(this);
    }

    updateHPDisplay() {
        if (this.htmlHUD) {
            this.htmlHUD.updateHP(this.hp, this.maxHp);
        }
    }

    updateInventoryBadge() {
        if (this.htmlHUD) {
            this.htmlHUD.updateInventoryBadge(this.inventory.length);
        }
    }

    toggleQuestModal() {
        this.showFloatingToast('Belum ada misi khusus di Sandbox ini.', 0x38bdf8);
    }

    toggleInventoryModal() {
        if (this.inventoryModal) {
            if (this.inventoryModal.isOpen && this.inventoryModal.isOpen()) {
                this.inventoryModal.hide();
            } else {
                this.inventoryModal.show();
            }
        }
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

    // ===============================================================
    // VISUAL CLICK-TO-PLACE OBJECT SPAWNER
    // ===============================================================
    enterPlacementMode(type) {
        this.exitPlacementMode(false);
        this.placementMode = type;

        // Banner petunjuk di layar atas (di bawah Top Engine Menu Bar)
        this.placementBanner = this.add.container(400, 56).setDepth(99999).setScrollFactor(0);
        const bannerBg = this.add.rectangle(0, 0, 520, 26, 0x0284c7, 0.95)
            .setStrokeStyle(1.5, 0x38bdf8);
        const bannerTxt = this.add.text(0, 0, `🔨 MODE PASANG: [${type.toUpperCase()}] | Klik layar untuk pasang | Tekan [ESC] batal`, {
            fontSize: '11px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.placementBanner.add([bannerBg, bannerTxt]);

        // Buat ghost preview
        let ghostTexture = 'tile_plat_mid';
        if (type === 'tile') ghostTexture = 'tile_plat_mid';
        else if (type === 'npc') ghostTexture = 'skeleton_npc';
        else if (type === 'coin') ghostTexture = 'skeleton_item';
        else if (type === 'obstacle') ghostTexture = 'skeleton_hazard';
        else if (type === 'portal') ghostTexture = 'skeleton_portal';

        this.placementGhost = this.add.sprite(-100, -100, ghostTexture)
            .setDepth(99998)
            .setAlpha(0.65)
            .setTint(0x38bdf8);

        if (this.game && this.game.canvas) {
            this.game.canvas.style.cursor = 'crosshair';
        }
        AudioManager.playClick();
        this.showFloatingToast(`Mode Pasang: ${type.toUpperCase()}. Klik kanvas untuk menempatkan!`, 0x0284c7);
    }

    exitPlacementMode(showToast = true) {
        if (this.placementGhost) {
            this.placementGhost.destroy();
            this.placementGhost = null;
        }
        if (this.placementBanner) {
            this.placementBanner.destroy();
            this.placementBanner = null;
        }
        this.placementMode = null;
        if (this.game && this.game.canvas) {
            this.game.canvas.style.cursor = 'default';
        }
        if (showToast) {
            this.showFloatingToast('Mode penempatan dibatalkan', 0x64748b);
        }
    }

    updatePlacementGhost(pointer) {
        if (!this.placementMode || !this.placementGhost) return;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        let snapX, snapY;
        if (this.placementMode === 'tile' || this.placementMode === 'obstacle') {
            snapX = Math.floor(worldPoint.x / 32) * 32 + 16;
            snapY = Math.floor(worldPoint.y / 24) * 24 + 12;
        } else {
            snapX = Math.round(worldPoint.x / 16) * 16;
            snapY = Math.round(worldPoint.y / 16) * 16;
        }

        this.placementGhost.setPosition(snapX, snapY);
    }

    handlePlacementClick(pointer) {
        if (!this.placementMode) return;
        // Abaikan jika pointer diklik di bilah atas (y < 36)
        if (pointer.y < 36) return;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        let snapX, snapY;
        if (this.placementMode === 'tile' || this.placementMode === 'obstacle') {
            snapX = Math.floor(worldPoint.x / 32) * 32 + 16;
            snapY = Math.floor(worldPoint.y / 24) * 24 + 12;
        } else {
            snapX = Math.round(worldPoint.x / 16) * 16;
            snapY = Math.round(worldPoint.y / 16) * 16;
        }

        const type = this.placementMode;

        if (type === 'tile') {
            const plat = this.platforms.create(snapX, snapY, 'tile_plat_mid').refreshBody();
            plat.setDepth(10);
            this.tweens.add({ targets: plat, scaleX: { from: 0.1, to: 1 }, scaleY: { from: 0.1, to: 1 }, duration: 250, ease: 'Back.out' });
            this.placedObjects.push({ type: 'tile', x: snapX, y: snapY });
            ScriptingWorkspace.instance?.appendCodeSnippet(`// [Platform] di (${snapX}, ${snapY})\nthis.platforms.create(${snapX}, ${snapY}, 'tile_plat_mid').refreshBody();`);
        } else if (type === 'npc') {
            const npc = this.physics.add.sprite(snapX, snapY, 'skeleton_npc').setDepth(10).setImmovable(true);
            this.physics.add.collider(npc, this.platforms);
            const tag = this.add.text(snapX, snapY - 30, '🧙 NPC Petualang', {
                fontSize: '10px', fontStyle: 'bold', fill: '#fde047', backgroundColor: '#0f172a', padding: { x: 5, y: 2 }, fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(15);
            this.tweens.add({ targets: [npc, tag], y: '-=4', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.customNpcs.push({
                sprite: npc,
                nameTag: tag,
                x: snapX,
                y: snapY,
                dialog: [
                    "Halo! Selamat datang di dunia buatanmu sendiri!",
                    "Gunakan tombol [E] untuk berinteraksi dengan orang lain.",
                    "Terus bangun peta ini dan bagikan gamemu ke teman-teman!"
                ]
            });
            this.placedObjects.push({ type: 'npc', x: snapX, y: snapY, name: 'NPC Petualang' });
            ScriptingWorkspace.instance?.appendCodeSnippet(`// [NPC] di (${snapX}, ${snapY})\nconst npc = this.physics.add.sprite(${snapX}, ${snapY}, 'skeleton_npc');\nthis.physics.add.collider(npc, this.platforms);`);
        } else if (type === 'coin') {
            const coin = this.coins.create(snapX, snapY, 'skeleton_item').setDepth(10);
            this.tweens.add({ targets: coin, y: snapY - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.placedObjects.push({ type: 'coin', x: snapX, y: snapY });
            ScriptingWorkspace.instance?.appendCodeSnippet(`// [Koin] di (${snapX}, ${snapY})\nconst coin = this.coins.create(${snapX}, ${snapY}, 'skeleton_item');`);
        } else if (type === 'obstacle') {
            const spike = this.hazards.create(snapX, snapY, 'skeleton_hazard').setDepth(10);
            this.placedObjects.push({ type: 'obstacle', x: snapX, y: snapY });
            ScriptingWorkspace.instance?.appendCodeSnippet(`// [Duri] di (${snapX}, ${snapY})\nconst duri = this.hazards.create(${snapX}, ${snapY}, 'skeleton_hazard');`);
        } else if (type === 'portal') {
            const portal = this.add.sprite(snapX, snapY, 'skeleton_portal').setDepth(10);
            const pLabel = this.add.text(snapX, snapY - 38, '🌀 Gerbang Rahasia', {
                fontSize: '10px', fontStyle: 'bold', fill: '#38bdf8', backgroundColor: '#0f172a', padding: { x: 5, y: 2 }, fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(15);
            this.tweens.add({ targets: portal, scaleX: 1.08, scaleY: 1.08, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.customPortals.push({ sprite: portal, label: pLabel, x: snapX, y: snapY });
            this.placedObjects.push({ type: 'portal', x: snapX, y: snapY });
            ScriptingWorkspace.instance?.appendCodeSnippet(`// [Portal] di (${snapX}, ${snapY})\nconst portal = this.add.sprite(${snapX}, ${snapY}, 'skeleton_portal');`);
        }

        AudioManager.playSuccess();
        this.showFloatingToast(`✓ ${type.toUpperCase()} dipasang di (${snapX}, ${snapY})!`, 0x10b981);
    }

    collectCoin(coin) {
        if (!coin || !coin.active) return;
        const x = coin.x;
        const y = coin.y;
        coin.destroy();

        AudioManager.playCoin();
        this.score += 10;
        this.updateHUDScore();

        // Floating score effect
        const plusTxt = this.add.text(x, y - 10, '+10 Koin', {
            fontSize: '11px', fontStyle: 'bold', fill: '#fde047', fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
            targets: plusTxt,
            y: y - 35,
            alpha: 0,
            duration: 800,
            onComplete: () => plusTxt.destroy()
        });
    }

    updateHUDHP() {
        if (this.htmlHUD) {
            this.htmlHUD.updateHP(this.hp, this.maxHp);
        }
    }

    updateHUDScore() {
        if (this.scoreText) {
            this.scoreText.setText(`🪙 ${this.score}`);
        }
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

        // Cek interaksi dengan custom NPC buatan murid
        for (const npc of this.customNpcs) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
            if (dist < 75) {
                AudioManager.playClick();
                this.dialogBox.show({
                    name: 'NPC Petualang',
                    lines: npc.dialog
                });
                return;
            }
        }

        // Cek interaksi dengan custom portal
        for (const p of this.customPortals) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
            if (dist < 75) {
                AudioManager.playSuccess();
                this.showFloatingToast('🌀 Masuk ke Portal Rahasia!', 0x38bdf8);
                this.cameras.main.flash(400, 2, 132, 199);
                this.player.setPosition(180, 380);
                return;
            }
        }
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

        // Prompt Portal Hub saat pemain mendekat
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, 90, 396);
        if (this.portalPrompt) {
            this.portalPrompt.setVisible(distPortal < 80);
        }

        // Prompt Interaksi NPC Custom Buatan Murid (HTML Boxless text)
        let nearestNpc = null;
        let minDist = 75;
        for (const npc of this.customNpcs) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
            if (d < minDist) {
                minDist = d;
                nearestNpc = npc;
            }
        }
        if (nearestNpc && (!this.dialogBox || !this.dialogBox.isOpen())) {
            if (this.interactPrompt) {
                this.interactPrompt.show(nearestNpc.x, nearestNpc.y - 36, 'Bicara', () => this.handleInteract());
            }
        } else {
            if (this.interactPrompt) {
                this.interactPrompt.hide();
            }
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
