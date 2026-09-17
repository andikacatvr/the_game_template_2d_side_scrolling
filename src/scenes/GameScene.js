import Phaser from 'phaser';
import { CONFIG_SKELETON, DAFTAR_MAP } from '../../cerita.js';
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
// 3. GAME SCENE: SKELETON WITH FULL HUD & RESOLUTION MANAGER
// ===============================================================
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data = {}) {
        this.startData = data;
        this.isGameOver = false;
        this.collectedItemIds = [];
        this.savedSpawnPos = null;

        // Data-Driven Map: Tentukan map yang aktif
        this.mapId = data.mapId || 'map_salju';
        this.currentMap = (Array.isArray(DAFTAR_MAP) && DAFTAR_MAP.find(m => m.id === this.mapId)) || (DAFTAR_MAP && DAFTAR_MAP[0]) || null;

        // Pertahankan slider parameter jika sebelumnya sudah diubah
        if (data.customSpeed) this.customSpeed = data.customSpeed;
        if (data.customJump) this.customJump = data.customJump;

        if (data.hp !== undefined) {
            this.hp = data.hp;
            this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = data.quest ? { ...data.quest } : { ...CONFIG_SKELETON.questAwal };
            this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        } else if (data.isLoadGame && SaveManager.hasSave()) {
            const save = SaveManager.load();
            this.hp = save.hp !== undefined ? save.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.maxHp = save.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(save.inventory) ? [...save.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = save.quest ? { ...save.quest } : { ...CONFIG_SKELETON.questAwal };
            this.collectedItemIds = Array.isArray(save.collectedItemIds) ? [...save.collectedItemIds] : [];
            if (save.playerX && save.playerY) {
                this.savedSpawnPos = { x: save.playerX, y: save.playerY };
            }
        } else {
            // New Game / Default
            this.hp = CONFIG_SKELETON.player.hpMaksimal || 3;
            this.maxHp = CONFIG_SKELETON.player.hpMaksimal || 3;
            this.inventory = [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = { ...CONFIG_SKELETON.questAwal };
            this.collectedItemIds = [];
            if (data.isNewGame) {
                SaveManager.clear();
            }
        }
    }

    create() {
        // Tampilkan chat console saat gameplay dimulai
        CommandConsole.show();

        this.cameras.main.setBackgroundColor('#0b1329');

        this.touchState = { left: false, right: false, jump: false };
        this.isInvOpen = false;
        this.isQuestOpen = false;
        this.isSettingsOpen = false;

        // Buat Dunia Polosan
        this.createWorld();

        // Buat Efek Kabut Atmosferik
        this.createFogEffect();

        // Buat Karakter
        this.createPlayer();

        // Buat Top Navbar HUD Identik Goblin Game
        this.createGoblinStyleHUD();

        // Buat Kontrol Touch Android/Tablet Identik Goblin Game
        this.createGoblinStyleTouchControls();

        // Buat Modal Game Over & Victory Modal
        this.createGameOverModalUI();
        this.createVictoryModalUI();

        // Buat Dialog Box RPG
        this.dialogBox = new DialogBox(this);

        // Setup Batas Dunia Fisika & Kamera (Diperlebar ke 1280 agar mencakup layar penuh tanpa batas void)
        const worldWidth = 1280;
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

        // Listener agar tombol & modal selalu adaptif di posisi presisi saat ukuran layar/jendela berubah
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

        // Simpan posisi awal game baru secara otomatis
        if (this.startData && this.startData.isNewGame) {
            this.autoSave(false);
        }
    }

    autoSave(showToast = true) {
        if (!this.player || !this.player.body || this.isGameOver) return;
        const data = {
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
            this.showFloatingToast('Progres Tersimpan Otomatis', 0x10b981);
        }
    }

    createWorld() {
        const map = this.currentMap || {};
        const worldW = map.lebarDunia || 1280;

        // 0. Batas kamera dan fisika sesuai lebar dunia map
        this.cameras.main.setBounds(0, 0, worldW, 450);
        this.physics.world.setBounds(0, 0, worldW, 450);

        if (map.warnaLangit) {
            this.cameras.main.setBackgroundColor(map.warnaLangit);
        }

        // Background Gambar
        let bgKey = null;
        if (this.textures.exists(map.id + '_bg')) {
            bgKey = map.id + '_bg';
        } else if (map.background && this.textures.exists(map.background)) {
            bgKey = map.background;
        } else if (map.background === 'bg_scene1.png' || map.background === 'bg_scene1') {
            bgKey = 'bg_scene1';
        } else if (map.background && this.textures.exists('bg_scene1')) {
            bgKey = 'bg_scene1';
        }

        if (bgKey && this.textures.exists(bgKey)) {
            this.bgImage = this.add.image(worldW / 2, 225, bgKey)
                .setDisplaySize(worldW, 580)
                .setDepth(-10);
            
            this.bgOverlay = this.add.rectangle(worldW / 2, 225, worldW, 580, 0x07111e, 0.2)
                .setDepth(-9);
        }

        this.platforms = this.physics.add.staticGroup();

        // 1. Lantai Dasar Modular
        const tileCount = Math.ceil((worldW + 192) / 32);
        this.buildTiledGround(-96, 434, tileCount);

        // 2. Platform Melayang dari data map
        if (Array.isArray(map.platform) && map.platform.length > 0) {
            map.platform.forEach(p => {
                const count = Math.max(2, Math.round((p.lebar || 180) / 32));
                this.buildTiledPlatform(p.x, p.y, count);
            });
        } else {
            this.buildTiledPlatform(250, 320, 4);
            this.buildTiledPlatform(560, 270, 4);
        }

        // 3. Item Koin dari data map (Bisa jamak)
        this.items = this.physics.add.group();
        const daftarKoin = (Array.isArray(map.koin) && map.koin.length > 0) 
            ? map.koin 
            : [{ x: 560, y: 220, id: 'koin_emas', nama: 'Koin Emas Murni', icon: '' }];

        daftarKoin.forEach(k => {
            if (!this.collectedItemIds.includes(k.id)) {
                const item = this.physics.add.sprite(k.x, k.y, 'skeleton_item');
                item.body.setAllowGravity(false);
                item.coinData = k;
                this.items.add(item);
                this.tweens.add({
                    targets: item,
                    y: k.y - 8,
                    yoyo: true,
                    repeat: -1,
                    duration: 800,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // 4. Hazard Duri (Bisa jamak)
        this.hazards = this.physics.add.staticGroup();
        const daftarDuri = (Array.isArray(map.duri) && map.duri.length > 0) 
            ? map.duri 
            : [{ x: 400, y: 406 }];

        daftarDuri.forEach(d => {
            this.hazards.create(d.x, d.y || 406, 'skeleton_hazard');
        });

        // 5. NPC
        const npcConfig = map.npc || CONFIG_SKELETON.npc || {};
        const npcX = npcConfig.posisiX || 200;
        const npcY = npcConfig.posisiY || 396;
        this.npc = this.physics.add.staticSprite(npcX, npcY, 'skeleton_npc');
        this.tweens.add({
            targets: this.npc,
            y: npcY - 4,
            yoyo: true,
            repeat: -1,
            duration: 1400,
            ease: 'Sine.easeInOut'
        });

        // Floating Prompt di atas NPC
        this.npcPrompt = this.add.container(npcX, npcY - 36).setDepth(25).setVisible(false);
        const npcPill = this.add.rectangle(0, 0, 80, 20, 0x1e1035, 0.95).setStrokeStyle(1.5, 0xc084fc);
        const npcTxt = this.add.text(0, 0, '[E] Bicara', { fontSize: '10px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.npcPrompt.add([npcPill, npcTxt]);
        npcPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleInteract());

        // 6. Portal Gerbang
        const portalConfig = map.portal || {};
        const portalX = portalConfig.posisiX || (worldW - 100);
        const portalY = portalConfig.posisiY || 396;
        this.portalX = portalX;
        this.portalY = portalY;
        this.portalTargetMapId = portalConfig.tujuanMapId || '';
        this.portalLockedMsg = portalConfig.pesanTerkunci || 'Gerbang Terkunci! Kamu harus mengambil koin terlebih dahulu.';
        this.portalOpenMsg = portalConfig.pesanTerbuka || 'Gerbang Terbuka!';

        this.portalScene2 = this.add.container(portalX, portalY).setDepth(12);
        const pRing = this.add.circle(0, 0, 24, 0x38bdf8, 0.25).setStrokeStyle(2, 0x38bdf8);
        const pIcon = this.add.text(0, 0, 'O', { fontSize: '18px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);

        const targetMapObj = Array.isArray(DAFTAR_MAP) && DAFTAR_MAP.find(m => m.id === this.portalTargetMapId);
        let portalLabel = 'Gerbang Selesai';
        if (this.portalTargetMapId === 'Scene2' || this.portalTargetMapId === 'HongKongScene') {
            portalLabel = 'Ke Teluk Hong Kong →';
        } else if (targetMapObj) {
            portalLabel = `Ke ${targetMapObj.nama} →`;
        } else if (this.portalTargetMapId) {
            portalLabel = 'Ke Level Selanjutnya →';
        }
        const pLabel = this.add.text(0, -34, portalLabel, { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalScene2.add([pRing, pIcon, pLabel]);
        this.tweens.add({
            targets: pRing,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        this.portalPrompt = this.add.container(portalX, portalY - 51).setDepth(25).setVisible(false);
        const pPill = this.add.rectangle(0, 0, 130, 22, 0x0f172a, 0.95).setStrokeStyle(1.5, 0x38bdf8);
        const pTxt = this.add.text(0, 0, '[E] Masuk Portal', { fontSize: '10px', fontStyle: 'bold', fill: '#e0f2fe', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalPrompt.add([pPill, pTxt]);
        pPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleInteract());
    }

    buildTiledGround(startX, y, tileCount = 25) {
        for (let i = 0; i < tileCount; i++) {
            const x = startX + 16 + i * 32;
            let tileKey = 'tile_grass_mid';
            if (i === 0) tileKey = 'tile_grass_left';
            else if (i === tileCount - 1) tileKey = 'tile_grass_right';

            this.platforms.create(x, y, tileKey).refreshBody();

            // Layer bawah tanah berlapis tebal ke bawah (sampai y: 560) agar tidak tembus void saat zoom out
            for (let dy = 32; y + dy <= 560; dy += 32) {
                this.platforms.create(x, y + dy, 'tile_dirt_sub').refreshBody();
            }
        }
    }

    buildTiledPlatform(centerX, y, tileCount = 4) {
        const startX = centerX - ((tileCount - 1) * 32) / 2;
        for (let i = 0; i < tileCount; i++) {
            const x = startX + i * 32;
            let tileKey = 'tile_plat_mid';
            if (i === 0) tileKey = 'tile_plat_left';
            else if (i === tileCount - 1) tileKey = 'tile_plat_right';

            this.platforms.create(x, y, tileKey).refreshBody();
        }
    }

    createFogEffect() {
        if (!this.textures.exists('fx_fog_dense')) return;

        // 1. Kabut Jauh / Background Fog (depth: -8)
        this.fogBack = this.add.tileSprite(640, 190, 1280, 240, 'fx_fog_dense')
            .setDepth(-8)
            .setAlpha(0.60)
            .setScale(1, 1.25);

        this.tweens.add({
            targets: this.fogBack,
            alpha: { from: 0.45, to: 0.72 },
            duration: 7500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 2. Kabut Midground (depth: 6)
        this.fogMid = this.add.tileSprite(490, 290, 1280, 240, 'fx_fog_dense')
            .setDepth(6)
            .setAlpha(0.35)
            .setScale(1.1, 0.95);

        this.tweens.add({
            targets: this.fogMid,
            alpha: { from: 0.22, to: 0.42 },
            duration: 6000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Kabut Merayap di Tanah / Ground Crawling Fog (depth: 8)
        this.fogGround = this.add.tileSprite(490, 412, 1280, 120, 'fx_fog_ground')
            .setDepth(8)
            .setAlpha(0.70)
            .setScale(1, 1.2);

        this.tweens.add({
            targets: this.fogGround,
            alpha: { from: 0.55, to: 0.82 },
            duration: 5200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. Kabut Depan Lembut / Foreground Cinematic Fog (depth: 15)
        this.fogFront = this.add.tileSprite(490, 260, 1280, 240, 'fx_fog_dense')
            .setDepth(15)
            .setAlpha(0.18)
            .setScale(1.25, 1.35);

        this.tweens.add({
            targets: this.fogFront,
            alpha: { from: 0.12, to: 0.24 },
            duration: 8500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createPlayer() {
        const defaultSpawn = (this.currentMap && this.currentMap.spawn) || { x: 160, y: 360 };
        const spawnX = this.savedSpawnPos ? this.savedSpawnPos.x : defaultSpawn.x;
        const spawnY = this.savedSpawnPos ? this.savedSpawnPos.y : defaultSpawn.y;

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

        // Ambil item -> masuk inventory
        if (this.items) {
            this.physics.add.overlap(this.player, this.items, (player, item) => {
                if (item && item.active) {
                    const kData = item.coinData || { id: 'koin_emas', nama: 'Koin Emas Murni', icon: '' };
                    item.destroy();
                    CodeInspector.record('coin');
                    CodeInspector.triggerEvent('coin', { item: kData.nama });
                    this.collectedItemIds.push(kData.id);
                    this.inventory.push({
                        id: kData.id,
                        nama: kData.nama,
                        deskripsi: 'Koin berharga yang berhasil diambil dari petualangan.',
                        icon: kData.icon || ''
                    });
                    this.updateInventoryBadge();
                    this.showFloatingToast(`+1 ${kData.nama} (Masuk Tas!)`, 0xfacc15);
                    AudioManager.playCoin();

                    this.quest.selesai = true;
                    this.quest.deskripsi = 'Item berhasil diambil! Masuki Portal Gerbang untuk lanjut.';
                    this.autoSave(true);
                }
            });
        }

        // Kena hazard -> kurang HP
        if (this.hazards) {
            this.physics.add.overlap(this.player, this.hazards, () => {
                if (!this.isInvincible && !this.isGameOver) {
                    this.takeDamage(1);
                }
            });
        }
    }

    // ===============================================================
    // TOP NAVBAR HUD (100% IDENTIK DENGAN CURSE OF THE GOBLIN)
    // ===============================================================
    createGoblinStyleHUD() {
        // A. HP DISPLAY (Top Left: Adaptif terhadap jumlah maxHp)
        this.healthContainer = this.add.container(16, 13).setDepth(25).setScrollFactor(0);

        const isCompact = this.maxHp > 4;
        const barWidth = isCompact ? 112 : Math.max(120, 34 + this.maxHp * 20 + 38);
        const hpBg = this.add.rectangle(barWidth / 2, 13, barWidth, 26, 0x0f172a, 0.85)
            .setInteractive({ useHandCursor: true });

        const hpLabel = this.add.text(8, 4, 'HP', {
            fontSize: '11px',
            fontStyle: 'bold',
            fill: '#f43f5e',
            fontFamily: FONT_TITLE
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

        // B. QUEST BUTTON (Top Left samping HP: posisi dinamis agar tidak pernah bertabrakan)
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

        // C. INVENTORY BUTTON (Top Right: Minimalist White Vector Bag Icon, dinamis terhadap lebar layar)
        const hudRight = this.scale.width;
        this.bagBtnContainer = this.add.container(hudRight - 68, 26).setDepth(25).setScrollFactor(0);

        const bagBtnBg = this.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });

        // Gambar Ikon Tas Vector
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

        // Badge jumlah item di tas
        this.bagBadgeBg = this.add.circle(13, -12, 7, 0x10b981, 1);
        this.bagBadgeText = this.add.text(13, -12, `${this.inventory.length}`, {
            fontSize: '9px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.bagBtnContainer.add([bagBtnBg, bagGraphics, this.bagBadgeBg, this.bagBadgeText]);

        bagBtnBg.on('pointerdown', () => this.toggleInventoryModal());
        bagBtnBg.on('pointerover', () => {
            bagBtnBg.setFillStyle(0x1e293b, 1);
            bagBtnBg.setStrokeStyle(2, 0xf59e0b);
            drawBagIcon(0xfde047);
            this.tweens.add({ targets: this.bagBtnContainer, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        });
        bagBtnBg.on('pointerout', () => {
            bagBtnBg.setFillStyle(0x0f172a, 0.9);
            bagBtnBg.setStrokeStyle(2, 0x64748b);
            drawBagIcon(0xf8fafc);
            this.tweens.add({ targets: this.bagBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // D. MENU / SETTINGS BUTTON (Top Right: Hamburger Icon, menempel pas di ujung kanan layar)
        this.menuBtnContainer = this.add.container(hudRight - 24, 26).setDepth(25).setScrollFactor(0);

        const menuBtnBg = this.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });

        const line1 = this.add.rectangle(0, -6, 18, 2.5, 0xf8fafc, 1);
        const line2 = this.add.rectangle(0, 0, 18, 2.5, 0xf8fafc, 1);
        const line3 = this.add.rectangle(0, 6, 18, 2.5, 0xf8fafc, 1);

        this.menuBtnContainer.add([menuBtnBg, line1, line2, line3]);

        menuBtnBg.on('pointerdown', () => this.toggleSettingsModal());
        menuBtnBg.on('pointerover', () => {
            menuBtnBg.setFillStyle(0x1e293b, 1);
            menuBtnBg.setStrokeStyle(2, 0x38bdf8);
            this.tweens.add({ targets: this.menuBtnContainer, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        });
        menuBtnBg.on('pointerout', () => {
            menuBtnBg.setFillStyle(0x0f172a, 0.9);
            menuBtnBg.setStrokeStyle(2, 0x64748b);
            this.tweens.add({ targets: this.menuBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // Buat Popup Modals (Quest, Inventory, & Settings/Resolution)
        this.createQuestModalUI();
        this.createInventoryModalUI();
        this.settingsModal = new SettingsModal(this, {
            isGameScene: true,
            isTouchEnabled: this.touchControlsEnabled,
            onSaveGame: () => {
                this.autoSave(true);
                this.showFloatingToast('Progres Berhasil Disimpan Manual!', 0x22c55e);
            },
            onToMenu: () => {
                this.autoSave(false);
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
            if (this.hp <= 1) {
                this.hpNumericText.setFill('#ef4444');
            } else {
                this.hpNumericText.setFill('#fda4af');
            }
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
        this.showFloatingToast('-1 HP Terkena Duri!', 0xef4444);
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

        // Tombol 1: Muat Checkpoint Terakhir
        const reloadBtn = this.add.rectangle(0, 56, 240, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const reloadText = this.add.text(0, 56, 'Muat Checkpoint Terakhir', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        reloadBtn.on('pointerover', () => reloadBtn.setFillStyle(0x1d4ed8, 1));
        reloadBtn.on('pointerout', () => reloadBtn.setFillStyle(0x2563eb, 0.95));
        reloadBtn.on('pointerdown', () => {
            this.isGameOver = false;
            this.gameOverModal.setVisible(false);
            this.scene.restart({ isLoadGame: true });
        });

        // Tombol 2: Kembali ke Menu Utama
        const menuBtn = this.add.rectangle(0, 102, 240, 34, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(0, 102, 'Kembali ke Menu Utama', {
            fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x334155, 1));
        menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x1e293b, 1));
        menuBtn.on('pointerdown', () => {
            this.isGameOver = false;
            AudioManager.stopAmbientBGM();
            this.scene.start('TitleScene');
        });

        this.gameOverModal.add([overlay, box, skull, title, subtitle, reloadBtn, reloadText, menuBtn, menuText]);
    }

    triggerGameOver() {
        this.isGameOver = true;
        AudioManager.stopAmbientBGM();
        if (this.player && this.player.body) {
            this.player.setVelocity(0, 0);
        }
        this.cameras.main.shake(350, 0.018);
        this.tweens.add({
            targets: this.player,
            alpha: 0,
            duration: 450,
            onComplete: () => {
                this.updateModalsCenter();
                this.gameOverModal.setVisible(true);
            }
        });
    }

    // ===============================================================
    // KONTROL TOUCH ANDROID / TABLET (IDENTIK GOBLIN GAME)
    // ===============================================================
    createGoblinStyleTouchControls() {
        const isTouchScreen = isMobileOrTablet();
        
        // Di PC / Laptop: Sembunyikan dan nonaktifkan tombol sentuh secara default
        if (!isTouchScreen) {
            this.touchControlsEnabled = false;
            try {
                localStorage.removeItem('template_touch_controls');
            } catch (e) {}
        } else {
            this.touchControlsEnabled = true;
            try {
                const saved = localStorage.getItem('template_touch_controls');
                if (saved !== null) {
                    this.touchControlsEnabled = saved === 'true';
                }
            } catch (e) {}
        }

        this.mobileControlsContainer = this.add.container(0, 0).setDepth(28).setScrollFactor(0);
        this.mobileControlsContainer.setVisible(this.touchControlsEnabled);

        // 1. Tombol Kiri [◀] (x: 62, y: 390)
        this.leftBtnContainer = this.add.container(62, 390);
        const leftBg = this.add.rectangle(0, 0, 56, 56, 0x0f172a, 0.78)
            .setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 76), Phaser.Geom.Rectangle.Contains);
        const leftIcon = this.add.text(0, 0, '◀', {
            fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.leftBtnContainer.add([leftBg, leftIcon]);

        leftBg.on('pointerdown', () => {
            this.touchState.left = true;
            leftBg.setFillStyle(0x2563eb, 0.9);
            leftBg.setStrokeStyle(2.5, 0x60a5fa);
            leftIcon.setFill('#ffffff');
            this.tweens.add({ targets: this.leftBtnContainer, scaleX: 0.94, scaleY: 0.94, duration: 80 });
        });
        const releaseLeft = () => {
            this.touchState.left = false;
            leftBg.setFillStyle(0x0f172a, 0.78);
            leftBg.setStrokeStyle(2, 0x475569);
            leftIcon.setFill('#f8fafc');
            this.tweens.add({ targets: this.leftBtnContainer, scaleX: 1, scaleY: 1, duration: 80 });
        };
        leftBg.on('pointerup', releaseLeft);
        leftBg.on('pointerout', releaseLeft);

        // 2. Tombol Kanan [▶] (x: 134, y: 390)
        this.rightBtnContainer = this.add.container(134, 390);
        const rightBg = this.add.rectangle(0, 0, 56, 56, 0x0f172a, 0.78)
            .setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 76), Phaser.Geom.Rectangle.Contains);
        const rightIcon = this.add.text(0, 0, '▶', {
            fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.rightBtnContainer.add([rightBg, rightIcon]);

        rightBg.on('pointerdown', () => {
            this.touchState.right = true;
            rightBg.setFillStyle(0x2563eb, 0.9);
            rightBg.setStrokeStyle(2.5, 0x60a5fa);
            rightIcon.setFill('#ffffff');
            this.tweens.add({ targets: this.rightBtnContainer, scaleX: 0.94, scaleY: 0.94, duration: 80 });
        });
        const releaseRight = () => {
            this.touchState.right = false;
            rightBg.setFillStyle(0x0f172a, 0.78);
            rightBg.setStrokeStyle(2, 0x475569);
            rightIcon.setFill('#f8fafc');
            this.tweens.add({ targets: this.rightBtnContainer, scaleX: 1, scaleY: 1, duration: 80 });
        };
        rightBg.on('pointerup', releaseRight);
        rightBg.on('pointerout', releaseRight);

        // 3. Tombol Lompat [▲] (x: 735, y: 390)
        this.jumpBtnContainer = this.add.container(735, 390);
        const jumpBg = this.add.rectangle(0, 0, 58, 58, 0x0f172a, 0.78)
            .setStrokeStyle(2, 0x475569)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 78, 78), Phaser.Geom.Rectangle.Contains);
        const jumpIcon = this.add.text(0, 0, '▲', {
            fontSize: '24px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.jumpBtnContainer.add([jumpBg, jumpIcon]);

        jumpBg.on('pointerdown', () => {
            this.touchState.jump = true;
            jumpBg.setFillStyle(0x2563eb, 0.9);
            jumpBg.setStrokeStyle(2.5, 0x60a5fa);
            jumpIcon.setFill('#ffffff');
            this.tweens.add({ targets: this.jumpBtnContainer, scaleX: 0.94, scaleY: 0.94, duration: 80 });
        });
        const releaseJump = () => {
            this.touchState.jump = false;
            jumpBg.setFillStyle(0x0f172a, 0.78);
            jumpBg.setStrokeStyle(2, 0x475569);
            jumpIcon.setFill('#f8fafc');
            this.tweens.add({ targets: this.jumpBtnContainer, scaleX: 1, scaleY: 1, duration: 80 });
        };
        jumpBg.on('pointerup', releaseJump);
        jumpBg.on('pointerout', releaseJump);

        // 4. Tombol Interaksi [E] (x: 735, y: 318)
        this.interactBtnContainer = this.add.container(735, 318);
        const interactBg = this.add.rectangle(0, 0, 56, 42, 0x1e1035, 0.85)
            .setStrokeStyle(2, 0xc084fc)
            .setInteractive(new Phaser.Geom.Rectangle(-10, -10, 76, 62), Phaser.Geom.Rectangle.Contains);
        const interactIcon = this.add.text(0, 0, 'E', {
            fontSize: '13px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.interactBtnContainer.add([interactBg, interactIcon]);

        interactBg.on('pointerdown', () => {
            this.handleInteract();
            this.tweens.add({ targets: this.interactBtnContainer, scaleX: 0.92, scaleY: 0.92, duration: 70 });
        });
        const releaseInteract = () => {
            this.tweens.add({ targets: this.interactBtnContainer, scaleX: 1, scaleY: 1, duration: 70 });
        };
        interactBg.on('pointerup', releaseInteract);
        interactBg.on('pointerout', releaseInteract);

        this.mobileControlsContainer.add([this.leftBtnContainer, this.rightBtnContainer, this.jumpBtnContainer, this.interactBtnContainer]);
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

    createQuestModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.questModal = this.add.container(cx, cy).setDepth(40).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const box = this.add.rectangle(0, 0, 460, 270, 0x0b1a32, 0.98).setStrokeStyle(2, 0x38bdf8);

        const header = this.add.text(0, -100, 'MISI & QUEST SKELETON', {
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

        const header = this.add.text(0, -108, 'TAS INVENTARIS SKELETON', {
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
        const startY = -45;
        const slotSize = 72;
        const gap = 18;

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (slotSize + gap);
            const slotBg = this.add.rectangle(x, startY, slotSize, slotSize, 0x04070e, 0.98)
                .setStrokeStyle(2, 0x153154);
            this.invItemsContainer.add(slotBg);

            const item = this.inventory[i];
            if (item) {
                const icon = this.add.text(x, startY - 12, item.icon || '[ITEM]', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
                const name = this.add.text(x, startY + 18, item.nama || 'Item', {
                    fontSize: '10px', fill: '#f8fafc', align: 'center', wordWrap: { width: 68 }, fontFamily: FONT_BODY
                }).setOrigin(0.5);
                this.invItemsContainer.add([icon, name]);
            } else {
                const empty = this.add.text(x, startY, 'Kosong', { fontSize: '10px', fill: '#475569', fontFamily: FONT_BODY }).setOrigin(0.5);
                this.invItemsContainer.add(empty);
            }
        }

        const info = this.add.text(0, 42, `Total Barang: ${this.inventory.length} / 4 Slot Digunakan`, {
            fontSize: '12px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.invItemsContainer.add(info);
    }

    showFloatingToast(msg, color = 0x38bdf8) {
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        const toast = this.add.text(this.player.x, this.player.y - 35, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexColor, backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: toast,
            y: toast.y - 25,
            alpha: 0,
            duration: 1200,
            onComplete: () => toast.destroy()
        });
    }

    createVictoryModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.victoryModal = this.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.85).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 260, 0x071526, 0.98).setStrokeStyle(2.5, 0x38bdf8);

        const icon = this.add.text(0, -68, '[ SELESAI ]', { fontSize: '14px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = this.add.text(0, -32, 'PETUALANGAN SELESAI!', {
            fontSize: '24px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, 10, 'Selamat! Kamu telah berhasil menjelajahi dunia,\nmengumpulkan item koin, dan membuka gerbang petualangan.', {
            fontSize: '12px', fill: '#cbd5e1', align: 'center', wordWrap: { width: 420 }, lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Tombol 1: Main Lagi
        const replayBtn = this.add.rectangle(-90, 72, 140, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const replayText = this.add.text(-90, 72, 'Main Lagi', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        replayBtn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            this.scene.restart({ isNewGame: true });
        });

        // Tombol 2: Menu Utama
        const menuBtn = this.add.rectangle(90, 72, 140, 36, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(90, 72, 'Menu Utama', {
            fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY
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

        // Sinkronkan juga seluruh tombol baris atas di GameScene
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

    showVictoryModal() {
        if (this.victoryModal) {
            this.victoryModal.setVisible(true);
        }
    }

    handleInteract() {
        if (this.isGameOver || this.isSettingsOpen || this.isQuestOpen || this.isInvOpen) return;

        // 1. Jika dialog box sedang aktif, teruskan dialog
        if (this.dialogBox && this.dialogBox.isOpen()) {
            this.dialogBox.advance();
            return;
        }

        // 2. Cek apakah pemain dekat dengan NPC
        if (this.npc) {
            const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            if (distNpc < 75) {
                AudioManager.playClick();
                CodeInspector.record('npc');
                const npcCfg = (this.currentMap && this.currentMap.npc) || CONFIG_SKELETON.npc || {};
                CodeInspector.triggerEvent('npc', { name: npcCfg.nama || 'Penjaga Gerbang' });
                this.dialogBox.start(
                    npcCfg.nama || 'Penjaga Gerbang',
                    npcCfg.dialog || [],
                    () => {
                        this.showFloatingToast('Dialog Selesai!', 0xc084fc);
                    },
                    npcCfg.portrait || 'npc_portrait'
                );
                return;
            }
        }

        // 3. Cek apakah pemain dekat dengan Portal Gerbang
        const pX = this.portalX !== undefined ? this.portalX : 1180;
        const pY = this.portalY !== undefined ? this.portalY : 396;
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, pX, pY);
        if (distPortal < 80) {
            if (!this.quest.selesai) {
                AudioManager.playClick();
                this.showFloatingToast(this.portalLockedMsg || 'Gerbang Terkunci! Ambil Koin terlebih dahulu.', 0xef4444);
                return;
            }
            AudioManager.playClick();

            // Cek jika targetnya adalah Scene2 / Hong Kong
            if (this.portalTargetMapId === 'Scene2' || this.portalTargetMapId === 'HongKongScene') {
                this.showFloatingToast(this.portalOpenMsg || 'Gerbang Terbuka! Berlayar ke Teluk Hong Kong...', 0x38bdf8);
                this.scene.start('Scene2', {
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory
                });
                return;
            }

            const targetMap = Array.isArray(DAFTAR_MAP) && DAFTAR_MAP.find(m => m.id === this.portalTargetMapId);
            if (targetMap) {
                this.showFloatingToast(this.portalOpenMsg || 'Gerbang Terbuka! Memuat level...', 0x38bdf8);
                this.scene.restart({
                    mapId: this.portalTargetMapId,
                    customSpeed: this.customSpeed,
                    customJump: this.customJump,
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory,
                    quest: {
                        judul: `Misi: Menjelajahi ${targetMap.nama}`,
                        deskripsi: 'Jelajahi level ini, kumpulkan koin, dan temukan pintu gerbang selanjutnya!',
                        selesai: false
                    }
                });
            } else {
                // Selesai / Tamat
                this.showVictoryModal();
                AudioManager.playSuccess();
            }
            return;
        }
    }

    update() {
        // Animasi pergerakan aliran kabut terus berjalan
        if (this.fogBack) this.fogBack.tilePositionX += 0.25;
        if (this.fogMid) this.fogMid.tilePositionX += 0.42;
        if (this.fogGround) this.fogGround.tilePositionX += 0.55;
        if (this.fogFront) this.fogFront.tilePositionX -= 0.16;

        if (!this.player || !this.player.body) return;

        // Update floating prompts
        if (this.npc && this.npcPrompt) {
            const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            this.npcPrompt.setVisible(distNpc < 75 && (!this.dialogBox || !this.dialogBox.isOpen()));
        }

        if (this.portalPrompt) {
            const pX = this.portalX !== undefined ? this.portalX : 1180;
            const pY = this.portalY !== undefined ? this.portalY : 396;
            const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, pX, pY);
            this.portalPrompt.setVisible(distPortal < 80);
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
            CodeInspector.record('move');
        } else if (right) {
            this.player.setVelocityX(speed);
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
