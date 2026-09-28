import Phaser from 'phaser';
import { CONFIG_SKELETON, DAFTAR_MAP } from '../../cerita.js';
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
import { HTMLGameHUD } from '../ui/HTMLGameHUD.js';
import { HTMLInteractPrompt } from '../ui/HTMLInteractPrompt.js';
import { QuestModal } from '../ui/QuestModal.js';
import { NPCDialogEditorModal } from '../ui/NPCDialogEditorModal.js';
import { EngineMenuBar } from '../ui/EngineMenuBar.js';
import { EngineUITourModal } from '../ui/EngineUITourModal.js';

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

        // Prompt Interaksi NPC HTML (Boxless & Tajam)
        this.interactPrompt = new HTMLInteractPrompt(this);

        // Editor Dialog NPC (Wrench Growtopia Style)
        this.npcDialogEditor = new NPCDialogEditorModal(this);

        // Top Engine Menu Bar
        this.engineMenuBar = new EngineMenuBar(this);
        this.engineMenuBar.show(this);

        // Interactive Engine UI Tour Modal (Spotlight & Coach Marks)
        this.engineUITour = new EngineUITourModal(this);
        this.isTourActive = false;

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
            f: Phaser.Input.Keyboard.KeyCodes.F,
            q: Phaser.Input.Keyboard.KeyCodes.Q,
            i: Phaser.Input.Keyboard.KeyCodes.I,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown-E', () => this.handleInteract());
        this.input.keyboard.on('keydown-F', () => this.handleTourKey());
        this.input.keyboard.on('keydown-Q', () => this.toggleQuestModal());
        this.input.keyboard.on('keydown-I', () => this.toggleInventoryModal());
        this.input.keyboard.on('keydown-ESC', () => this.toggleSettingsModal());

        // Mulai Ambient BGM
        AudioManager.startAmbientBGM();

        // Inisialisasi Sistem Panah Tutorial Interaktif
        this.initTutorialGuide();

        // Simpan posisi awal game baru secara otomatis
        if (this.startData && this.startData.isNewGame) {
            this.autoSave(false);
        }
    }

    initTutorialGuide() {
        this.tutorialSteps = [];
        this.tutorialStep = 0;
    }

    setTutorialStep(index) {
        this.tutorialStep = index;
    }

    advanceTutorialStep(completedId) {
        // Handled via Pemandu Engine tour
    }

    onCommandExecuted(cmd, args) {
        if (cmd === 'speed' || cmd === 'jump') {
            this.createAuraPulse(this.player ? this.player.x : 300, this.player ? this.player.y : 380, 0x38bdf8);
            this.showFloatingToast(`✓ Command /${cmd} berhasil diterapkan!`, 0x38bdf8);
            if (this.tutorialStep === 1) {
                this.advanceTutorialStep('step_cmd');
            }
        } else if (cmd === 'god') {
            this.createAuraPulse(this.player ? this.player.x : 500, this.player ? this.player.y : 380, 0xfacc15);
            this.showFloatingToast(`✓ God Mode diubah: ${this.isGodMode ? 'AKTIF' : 'NONAKTIF'}!`, 0xfacc15);
            if (this.tutorialStep === 2) {
                this.advanceTutorialStep('step_god');
            }
        } else if (cmd === 'tp' || cmd === 'goto') {
            this.createAuraPulse(this.player ? this.player.x : 400, this.player ? this.player.y : 380, 0xa855f7);
            this.showFloatingToast('✓ Teleportasi berhasil!', 0xa855f7);
        }
    }

    createAuraPulse(x, y, color = 0x38bdf8) {
        const ring = this.add.circle(x, y, 16, color, 0.6).setDepth(25);
        this.tweens.add({
            targets: ring,
            scaleX: 3.5,
            scaleY: 3.5,
            alpha: 0,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    updateTutorialArrows() {
        if (!this.player || !this.player.body || !this.tutorialSteps) return;
        const step = this.tutorialSteps[this.tutorialStep];
        if (!step) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, step.targetX, step.targetY);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, step.targetX, step.targetY);

        if (this.playerGuideArrow) {
            if (dist < 60) {
                // Sangat dekat dengan target -> sembunyikan panah kecil agar layar bersih
                this.playerGuideArrow.setAlpha(0);
            } else {
                this.playerGuideArrow.setAlpha(1);
                // Posisi mengitari player dengan radius 44px
                const orbitRadius = 44;
                this.playerGuideArrow.setPosition(
                    this.player.x + Math.cos(angle) * orbitRadius,
                    this.player.y - 10 + Math.sin(angle) * orbitRadius
                );

                if (this.playerGuideArrow.pArrowGfx) {
                    this.playerGuideArrow.pArrowGfx.setRotation(angle);
                }

                if (this.playerGuideArrow.pDistTxt) {
                    const distMeter = Math.max(1, Math.round(dist / 20));
                    this.playerGuideArrow.pDistTxt.setText(`${distMeter}m`);
                }
            }
        }

        // Auto advance step 1 jika pemain sudah berhasil naik ke platform 1
        if (this.tutorialStep === 1 && this.player.x > 400 && this.player.y < 350) {
            this.advanceTutorialStep('step_cmd');
        }

        // Auto advance step 2 jika pemain melompat melewati duri (x > 590)
        if (this.tutorialStep === 2 && this.player.x > 590) {
            this.advanceTutorialStep('step_god');
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
        this.gridWorldBlocks = new Map();

        // 1. Lantai Dasar Modular 50x50 px - Permukaan atas tepat sejajar garis horizontal grid y = 400 (Row 8)
        this.buildModular50Ground(worldW);

        // 2. Platform Melayang Modular 50px dari data map
        if (Array.isArray(map.platform) && map.platform.length > 0) {
            map.platform.forEach(p => {
                const count = Math.max(1, Math.round((p.lebar || 150) / 50));
                this.buildModular50Platform(p.x, p.y, count);
            });
        } else {
            this.buildModular50Platform(450, 312, 3);
            this.buildModular50Platform(725, 212, 4);
        }

        // 3. Item Koin dari data map (Bisa jamak)
        this.items = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });
        const daftarKoin = (Array.isArray(map.koin) && map.koin.length > 0) 
            ? map.koin 
            : [{ x: 560, y: 220, id: 'koin_emas', nama: 'Koin Emas Murni', icon: '' }];

        daftarKoin.forEach(k => {
            if (!this.collectedItemIds.includes(k.id)) {
                const item = this.physics.add.sprite(k.x, k.y, 'skeleton_item');
                this.items.add(item);
                item.body.setAllowGravity(false);
                item.body.immovable = true;
                item.body.moves = false;
                item.setDepth(15);
                item.coinData = k;
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
            const targetY = (!d.y || d.y >= 400) ? 388 : d.y;
            const lebar = d.lebar || 24;
            const count = Math.max(1, Math.round(lebar / 24));
            const startX = d.x - ((count - 1) * 24) / 2;

            for (let i = 0; i < count; i++) {
                const hz = this.hazards.create(startX + i * 24, targetY, 'skeleton_hazard');
                hz.setDepth(10);
                hz.refreshBody();
            }
        });

        // 5. NPC - Berdiri di atas lantai y = 400
        const npcConfig = map.npc || CONFIG_SKELETON.npc || {};
        const npcX = npcConfig.posisiX || 200;
        const npcY = npcConfig.posisiY || 378;
        this.npc = this.physics.add.staticSprite(npcX, npcY, 'skeleton_npc');
        this.npcData = {
            name: npcConfig.nama || 'Penjaga Gerbang',
            dialog: Array.isArray(npcConfig.dialog) ? [...npcConfig.dialog] : ['Halo petualang! Selamat datang di Lembah Bersalju.']
        };
        this.tweens.add({
            targets: this.npc,
            y: npcY - 4,
            yoyo: true,
            repeat: -1,
            duration: 1400,
            ease: 'Sine.easeInOut'
        });

        // Klik NPC langsung buka editor jika dalam Edit Mode
        this.npc.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            if (this.isEditMode) {
                this.openNPCDialogEditor();
            } else {
                this.handleInteract();
            }
        });

        // Floating Prompt di atas NPC diatur oleh HTMLInteractPrompt (tanpa kotak kaku)
        this.npcPrompt = null;

        // 6. Portal Gerbang - Berdiri di atas lantai y = 400
        const portalConfig = map.portal || {};
        const portalX = portalConfig.posisiX || 1150;
        const portalY = portalConfig.posisiY || 376;
        this.portalX = portalX;
        this.portalY = portalY;
        this.portalTargetMapId = portalConfig.tujuanMapId || '';
        this.portalLockedMsg = portalConfig.pesanTerkunci || 'Gerbang Terkunci! Kamu harus mengambil koin terlebih dahulu.';
        this.portalOpenMsg = portalConfig.pesanTerbuka || 'Gerbang Terbuka!';

        // Portal Polos ke Scene 2 (Bersih, tanpa musuh penghalang)
        this.portalScene2 = this.add.container(portalX, portalY).setDepth(12);
        const pRing = this.add.circle(0, 0, 24, 0x38bdf8, 0.25).setStrokeStyle(2, 0x38bdf8);
        const pIcon = this.add.text(0, 0, 'O', { fontSize: '18px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        const pLabel = this.add.text(0, -34, 'Ke Scene 2 →', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalScene2.add([pRing, pIcon, pLabel]);
        this.tweens.add({
            targets: pRing,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // 7. Papan Petunjuk Alami Dunia (Single Wooden Signpost RPG)
        this.createNaturalSignpost();
    }

    createNaturalSignpost() {
        const signX = 275;
        const signY = 398; // Kaki tiang tertancap pas di permukaan tanah y = 400

        this.naturalSignContainer = this.add.container(signX, signY).setDepth(10);

        // Tiang kayu alami
        const post = this.add.rectangle(0, -10, 5, 24, 0x5c2b09);
        const postHighlight = this.add.rectangle(-1, -10, 1.5, 24, 0x78350f);

        // Papan kayu berukir (Rustic Wooden Plaque)
        const board = this.add.rectangle(0, -26, 88, 24, 0x78350f).setStrokeStyle(1.5, 0xb45309);
        const plankLine = this.add.rectangle(0, -26, 82, 1, 0x451a03);

        // Paku logam kecil di sudut
        const nailL = this.add.circle(-38, -26, 1.5, 0x94a3b8);
        const nailR = this.add.circle(38, -26, 1.5, 0x94a3b8);

        // Teks ukiran kayu
        const signText = this.add.text(0, -26, '🪵 Lembah Es', {
            fontSize: '9.5px',
            fontStyle: 'bold',
            fill: '#fef3c7',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.naturalSignContainer.add([post, postHighlight, board, plankLine, nailL, nailR, signText]);

        // Interaksi klik mouse langsung di papan
        board.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            this.readNaturalSign();
        });

        this.naturalSign = {
            x: signX,
            y: signY,
            container: this.naturalSignContainer
        };
    }

    readNaturalSign() {
        if (this.dialogBox && this.dialogBox.isOpen()) return;
        AudioManager.playClick();
        this.dialogBox.start(
            '🪵 Papan Penjelajah Lembah',
            [
                "Selamat datang di Lembah Bersalju!",
                "Petunjuk Penjelajah:\n• Tekan [A] & [D] untuk bergerak, [W] atau [Spasi] untuk melompat.",
                "• Manfaatkan Command Console di bawah untuk mengubah fisikmu, misalnya ketik '/speed 350' atau '/jump 550'.",
                "• Waspadai duri tajam di depan! Gunakan '/god' jika kamu ingin menguji mode kebal.",
                "• Ambil Koin Emas di atas tebing tinggi untuk menyelesaikan misi dan membuka petualangan berikutnya!"
            ],
            () => {
                this.showFloatingToast('Selesai membaca Papan Lembah', 0xf59e0b);
            }
        );
    }

    buildModular50Ground(worldW) {
        if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();
        const startCol = -2;
        const endCol = Math.ceil(worldW / 50) + 2;

        for (let col = startCol; col <= endCol; col++) {
            const x = col * 50 + 25; // Titik tengah kolom 50px

            // Row 8 (y: 400 - 450) -> Balok Permukaan Salju 50x50 px
            const blockTop = this.platforms.create(x, 425, 'tile_block_50_snow').refreshBody();
            blockTop.setDepth(10);
            blockTop.gridCol = col;
            blockTop.gridRow = 8;
            blockTop.gridType = 'ground';
            this.gridWorldBlocks.set(`${col},8`, blockTop);

            // Row 9 (y: 450 - 500) -> Balok Bawah Tanah 50x50 px
            const blockSub1 = this.platforms.create(x, 475, 'tile_block_50_dirt').refreshBody();
            blockSub1.setDepth(9);
            blockSub1.gridCol = col;
            blockSub1.gridRow = 9;
            blockSub1.gridType = 'subdirt';
            this.gridWorldBlocks.set(`${col},9`, blockSub1);

            // Row 10 (y: 500 - 550) -> Balok Bawah Tanah 50x50 px (agar tebal saat kamera zoom out)
            const blockSub2 = this.platforms.create(x, 525, 'tile_block_50_dirt').refreshBody();
            blockSub2.setDepth(9);
            blockSub2.gridCol = col;
            blockSub2.gridRow = 10;
            blockSub2.gridType = 'subdirt';
            this.gridWorldBlocks.set(`${col},10`, blockSub2);
        }
    }

    buildModular50Platform(centerX, y, tileCount = 3) {
        if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();
        // y adalah titik tengah vertikal platform (312 untuk surface 300)
        const row = Math.floor((y - 12) / 50);
        const startX = centerX - ((tileCount - 1) * 50) / 2;

        for (let i = 0; i < tileCount; i++) {
            const x = startX + i * 50;
            const col = Math.floor(x / 50);

            let key = 'tile_plat_50_mid';
            if (i === 0) key = 'tile_plat_50_left';
            else if (i === tileCount - 1) key = 'tile_plat_50_right';

            const plat = this.platforms.create(x, y, key).refreshBody();
            plat.setDepth(10);
            plat.gridCol = col;
            plat.gridRow = row;
            plat.gridType = 'platform';
            this.gridWorldBlocks.set(`${col},${row}`, plat);
        }
    }

    buildTiledGround(startX, y, tileCount = 25) {
        this.buildModular50Ground(1280);
    }

    buildTiledPlatform(centerX, y, tileCount = 4) {
        this.buildModular50Platform(centerX, y, Math.round(tileCount * 32 / 50));
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
        this.fogGround = this.add.tileSprite(490, 394, 1280, 120, 'fx_fog_ground')
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
                    this.createCoinSparkle(item.x, item.y);
                    item.disableBody(true, true);
                    item.destroy();
                    CodeInspector.record('coin');
                    CodeInspector.triggerEvent('coin', { item: kData.nama });
                    if (!this.collectedItemIds.includes(kData.id)) {
                        this.collectedItemIds.push(kData.id);
                    }
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
                    this.advanceTutorialStep('step_coin');
                    this.autoSave(false);
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
        // HTML Native HUD Overlay (Tombol Quest, Tas, Menu, dan HP Bar Ultra-Tajam)
        this.htmlHUD = new HTMLGameHUD(this);

        // Buat Popup Modals (Quest, Inventory, & Settings/Resolution)
        this.createQuestModalUI();
        this.inventoryModal = new InventoryModal(this);
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
        if (this.htmlHUD) {
            this.htmlHUD.updateHP(this.hp, this.maxHp);
        }
    }

    updateInventoryBadge() {
        if (this.htmlHUD) {
            this.htmlHUD.updateInventoryBadge(this.inventory.length);
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
        const reloadText = this.add.text(0, 56, 'Load Last Checkpoint', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        reloadBtn.on('pointerover', () => reloadBtn.setFillStyle(0x1d4ed8, 1));
        reloadBtn.on('pointerout', () => reloadBtn.setFillStyle(0x2563eb, 0.95));
        reloadBtn.on('pointerdown', () => {
            this.isGameOver = false;
            this.gameOverModal.setVisible(false);
            this.scene.restart({ isLoadGame: true });
        });

        // Tombol 2: Return to Main Menu
        const menuBtn = this.add.rectangle(0, 102, 240, 34, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(0, 102, 'Return to Main Menu', {
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
        this.questModal = new QuestModal(this);
    }

    toggleQuestModal(forceState) {
        if (this.questModal) {
            const nextState = (forceState !== undefined) ? forceState : !this.questModal.isOpen();
            if (nextState) {
                if (this.inventoryModal && this.inventoryModal.isOpen && this.inventoryModal.isOpen()) {
                    this.inventoryModal.hide();
                }
                if (this.settingsModal && this.settingsModal.isOpen && this.settingsModal.isOpen()) {
                    this.settingsModal.hide();
                }
                this.questModal.show({
                    header: 'ACTIVE QUEST',
                    judul: this.quest.judul,
                    deskripsi: this.quest.deskripsi
                });
            } else {
                this.questModal.hide();
            }
            this.isQuestOpen = this.questModal.isOpen();
        }
    }

    openNPCDialogEditor(npcRef = null) {
        if (!this.npcDialogEditor) {
            this.npcDialogEditor = new NPCDialogEditorModal(this);
        }
        this.advanceTutorialStep('step_wrench');
        const target = npcRef || this.npcData;
        this.npcDialogEditor.open(target, (saved) => {
            this.npcData = saved;
            if (this.currentMap && this.currentMap.npc) {
                this.currentMap.npc.nama = saved.name;
                this.currentMap.npc.dialog = saved.dialog;
            }
        });
    }

    setEditMode(active) {
        this.isEditMode = active;
        if (this.game && this.game.canvas) {
            this.game.canvas.style.cursor = active ? 'cell' : 'default';
        }
        if (this.showFloatingToast) {
            this.showFloatingToast(active ? '🔧 Mode Edit (Wrench) AKTIF! Dekati atau klik NPC untuk edit dialog.' : 'Mode Edit NONAKTIF.', active ? 0xf59e0b : 0x64748b);
        }
        if (active) {
            this.advanceTutorialStep('step_wrench');
            this.advanceTutorialStep('sign_wrench_edit');
        }
    }

    createInventoryModalUI() {
        const cx = this.scale ? this.scale.width / 2 : 400;
        const cy = this.scale ? this.scale.height / 2 : 225;
        this.invModal = this.add.container(cx, cy).setDepth(40).setVisible(false).setScrollFactor(0);
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const box = this.add.rectangle(0, 0, 480, 280, 0x0b1a32, 0.98).setStrokeStyle(2, 0x153154);

        const header = this.add.text(0, -108, 'ADVENTURER\'S INVENTORY', {
            fontSize: '15px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.invItemsContainer = this.add.container(0, 0);

        const closeBtn = this.add.rectangle(0, 105, 120, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 105, 'Close [I]', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => this.toggleInventoryModal(false));
        overlay.on('pointerdown', () => this.toggleInventoryModal(false));

        this.invModal.add([overlay, box, header, this.invItemsContainer, closeBtn, closeText]);
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
        if (this.activeFloatingToast && this.activeFloatingToast.destroy) {
            this.activeFloatingToast.destroy();
            this.activeFloatingToast = null;
        }
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        const toast = this.add.text(this.player.x, this.player.y - 35, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexColor, backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(30);
        this.activeFloatingToast = toast;

        this.tweens.add({
            targets: toast,
            y: toast.y - 25,
            alpha: 0,
            duration: 1200,
            onComplete: () => {
                if (this.activeFloatingToast === toast) {
                    this.activeFloatingToast = null;
                }
                toast.destroy();
            }
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

        // Tombol 1: Play Again
        const replayBtn = this.add.rectangle(-90, 72, 140, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const replayText = this.add.text(-90, 72, 'Play Again', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        replayBtn.on('pointerdown', () => {
            this.victoryModal.setVisible(false);
            this.scene.restart({ isNewGame: true });
        });

        // Tombol 2: Main Menu
        const menuBtn = this.add.rectangle(90, 72, 140, 36, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = this.add.text(90, 72, 'Main Menu', {
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

    handleTourKey() {
        if (this.isGameOver || this.isSettingsOpen) return;
        this.startEngineUITour();
    }

    startEngineUITour() {
        if (this.dialogBox && this.dialogBox.isOpen()) {
            this.dialogBox.close();
        }
        if (this.engineUITour) {
            this.engineUITour.start(0);
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
                // Jika sedang dalam Mode Edit (Wrench), langsung buka editor dialog
                if (this.isEditMode) {
                    this.openNPCDialogEditor();
                    return;
                }

                // Pemandu Engine langsung menjelaskan fungsi engine dengan tur panah melayang
                this.startEngineUITour();
                return;
            }
        }

        // 2b. Cek apakah pemain dekat dengan Papan Petunjuk Alami Lembah
        if (this.naturalSign) {
            const distSign = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.naturalSign.x, this.naturalSign.y);
            if (distSign < 70) {
                this.readNaturalSign();
                return;
            }
        }

        // 3. Cek apakah pemain dekat dengan Portal Gerbang
        const pX = this.portalX !== undefined ? this.portalX : 1180;
        const pY = this.portalY !== undefined ? this.portalY : 396;
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, pX, pY);
        if (distPortal < 80) {
            AudioManager.playClick();

            // Masuk langsung ke Scene 2 (Polos tanpa syarat terkunci)
            if (this.portalTargetMapId === 'Scene2' || this.portalTargetMapId === 'HongKongScene' || !this.portalTargetMapId) {
                this.showFloatingToast('Berlayar ke Scene 2...', 0x38bdf8);
                this.scene.start('Scene2', {
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory,
                    collectedItemIds: this.collectedItemIds
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
        // Update panah tutorial interaktif & arah langkah
        this.updateTutorialArrows();

        // Animasi pergerakan aliran kabut terus berjalan
        if (this.fogBack) this.fogBack.tilePositionX += 0.25;
        if (this.fogMid) this.fogMid.tilePositionX += 0.42;
        if (this.fogGround) this.fogGround.tilePositionX += 0.55;
        if (this.fogFront) this.fogFront.tilePositionX -= 0.16;

        if (!this.player || !this.player.body) return;

        // Update floating prompts (HTML Boxless text)
        let activePromptTarget = null;

        // 1. Cek NPC
        if (this.npc) {
            const distNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            const isNear = distNpc < 75 && (!this.dialogBox || !this.dialogBox.isOpen());
            if (isNear) {
                activePromptTarget = {
                    x: this.npc.x,
                    y: this.npc.y - 36,
                    label: this.isEditMode ? 'Edit Dialog' : 'Penjelasan Engine',
                    onInteract: () => this.handleInteract()
                };
            }
        }

        // 2. Jika tidak dekat NPC, cek apakah dekat Papan Petunjuk Alami Lembah
        if (!activePromptTarget && this.naturalSign && (!this.dialogBox || !this.dialogBox.isOpen())) {
            const distSign = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.naturalSign.x, this.naturalSign.y);
            if (distSign < 70) {
                activePromptTarget = {
                    x: this.naturalSign.x,
                    y: this.naturalSign.y - 42,
                    label: 'Baca Papan',
                    onInteract: () => this.readNaturalSign(),
                    secondary: null
                };
            }
        }

        // 3. Jika tidak dekat papan, cek apakah dekat Gerbang Portal
        if (!activePromptTarget) {
            const pX = this.portalX !== undefined ? this.portalX : 1180;
            const pY = this.portalY !== undefined ? this.portalY : 396;
            const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, pX, pY);
            if (distPortal < 80) {
                activePromptTarget = {
                    x: pX,
                    y: pY - 42,
                    label: 'Masuk Scene 2',
                    onInteract: () => this.handleInteract(),
                    secondary: null
                };
            }
        }

        if (activePromptTarget) {
            if (this.interactPrompt) {
                this.interactPrompt.show(
                    activePromptTarget.x,
                    activePromptTarget.y,
                    activePromptTarget.label,
                    activePromptTarget.onInteract,
                    'E',
                    activePromptTarget.secondary
                );
            }
        } else {
            if (this.interactPrompt) {
                this.interactPrompt.hide();
            }
        }

        if (this.isGameOver || this.isTourActive || this.isQuestOpen || this.isInvOpen || this.isSettingsOpen || (this.dialogBox && this.dialogBox.isOpen())) {
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

        const isGrounded = !!(this.player.body.touching.down || this.player.body.blocked.down);
        if (jump && isGrounded) {
            this.player.setVelocityY(jumpSpeed);
            AudioManager.playJump();
            CodeInspector.record('jump');
            this.createDustEffect(this.player.x, this.player.y + (this.player.displayHeight ? this.player.displayHeight / 2 : 22));
        } else if (!this.wasGrounded && isGrounded && this.player.body.velocity.y >= 0) {
            this.createDustEffect(this.player.x, this.player.y + (this.player.displayHeight ? this.player.displayHeight / 2 : 22));
        }
        this.wasGrounded = isGrounded;

        // Update Live Code Inspector jika sedang aktif (60 FPS)
        if (CodeInspector.isActive()) {
            CodeInspector.updateRealtime({
                left,
                right,
                jump,
                grounded: isGrounded,
                vx: this.player.body.velocity.x,
                vy: this.player.body.velocity.y,
                x: this.player.x,
                y: this.player.y
            });
        }
    }

    createDustEffect(x, y) {
        for (let i = 0; i < 6; i++) {
            const dust = this.add.circle(x + Phaser.Math.Between(-10, 10), y - 2, Phaser.Math.Between(2, 4), 0xe2e8f0, 0.7).setDepth(11);
            this.tweens.add({
                targets: dust,
                x: dust.x + Phaser.Math.Between(-16, 16),
                y: dust.y - Phaser.Math.Between(4, 10),
                scale: 0.2,
                alpha: 0,
                duration: Phaser.Math.Between(250, 400),
                ease: 'Quad.easeOut',
                onComplete: () => dust.destroy()
            });
        }
    }

    createCoinSparkle(x, y) {
        const colors = [0xfef08a, 0xfacc15, 0xffffff, 0xfde047];
        for (let i = 0; i < 10; i++) {
            const col = colors[i % colors.length];
            const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), col, 1).setDepth(20);
            const angle = (i / 10) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
            const dist = Phaser.Math.Between(15, 34);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                scale: 0,
                alpha: 0,
                duration: Phaser.Math.Between(350, 500),
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }
}
