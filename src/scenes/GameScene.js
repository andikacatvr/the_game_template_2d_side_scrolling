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
import { HTMLTutorialGuide } from '../ui/HTMLTutorialGuide.js';
import { GameOverModal } from '../ui/GameOverModal.js';
import { GridSystem } from '../utils/GridSystem.js';
import { UndoRedoManager } from '../utils/UndoRedoManager.js';

// ===============================================================
// 3. GAME SCENE: SKELETON WITH FULL HUD & RESOLUTION MANAGER
// ===============================================================
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this._fireflies = [];
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

        // Level Tutorial adalah Sandbox Eksplorasi Bersih (Tanpa Save Permanen)
        this.isTutorialMode = true;

        if (data.hp !== undefined && !data.isNewGame) {
            this.hp = data.hp;
            this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
            this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = data.quest ? { ...data.quest } : { ...CONFIG_SKELETON.questAwal };
            this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        } else {
            // Default Selalu Segar dari konfigurasi awal cerita.js
            this.hp = CONFIG_SKELETON.player.hpMaksimal || 3;
            this.maxHp = CONFIG_SKELETON.player.hpMaksimal || 3;
            this.inventory = [...(CONFIG_SKELETON.inventoryAwal || [])];
            this.quest = { ...CONFIG_SKELETON.questAwal };
            this.collectedItemIds = [];
        }
    }

    create() {
        // Tampilkan chat console saat gameplay dimulai
        CommandConsole.show();

        this.cameras.main.setBackgroundColor('#dcff78');

        this.touchState = { left: false, right: false, jump: false };
        this.isInvOpen = false;
        this.isQuestOpen = false;
        this.isSettingsOpen = false;

        // Buat Dunia Polosan
        this.createWorld();

        // Buat Partikel Kunang-Kunang Hitam Animasi Identik Main Menu
        this._createFireflies();

        // Buat Efek Kabut Atmosferik
        this.createFogEffect();

        // Buat Karakter
        this.createPlayer();

        // Buat Top Navbar HUD Identik Goblin Game
        this.createGoblinStyleHUD();

        // Buat Kontrol Touch Android/Tablet Identik Goblin Game
        this.createGoblinStyleTouchControls();

        // Buat Modal Game Over & Victory Modal
        this.gameOverModal = new GameOverModal(this);
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

        // Setup Batas Dunia Fisika & Kamera (Mendukung eksplorasi bawah tanah luas ala Terraria/Growtopia)
        const worldWidth = (this.currentMap && this.currentMap.lebarDunia) || 1400;
        const worldHeight = (this.currentMap && this.currentMap.tinggiDunia) || 1000;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setRoundPixels(true);

        // Smart Ground Clamp Camera Anchor:
        // Menjaga permukaan tanah tetap di bagian bawah layar saat di daratan,
        // dan otomatis meluncur ke bawah mengikuti kedalaman saat pemain menggali ke dalam tanah.
        this.cameraAnchor = {
            x: this.player ? this.player.x : 175,
            y: Math.max(225, (this.player ? this.player.y : 350) - 160)
        };

        // Kamera otomatis mengikuti cameraAnchor dengan pergerakan lerp halus (0.08)
        this.cameras.main.startFollow(this.cameraAnchor, true, 0.08, 0.08);

        // Inisialisasi Zoom Kamera (Touchpad, Mouse, Layar Sentuh HP, & Tombol HUD)
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85,
            followTarget: this.cameraAnchor,
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

        // Input Klik Dunia untuk Alat Manipulasi World (Gali & Pasang Balok Modular 50px)
        this.input.on('pointerdown', (pointer) => this.handleWorldPointerDown(pointer));

        // Mulai Ambient BGM
        AudioManager.startAmbientBGM();

        // Inisialisasi Sistem Panah Tutorial Interaktif
        this.initTutorialGuide();

        // Simpan posisi awal game baru secara otomatis
        if (this.startData && this.startData.isNewGame) {
            this.autoSave(false);
        }

        // Otomatis munculkan Pemandu Engine saat scene dibuka
        this.time.delayedCall(400, () => {
            if (this.engineUITour && !this.engineUITour.isOpen) {
                this.startEngineUITour();
            }
        });
    }

    initTutorialGuide() {
        this.tutorialStep = 0;
        this.tutorialSteps = [
            {
                id: 'step_npc',
                title: 'Bicara dengan Pemandu',
                desc: 'Dekati Pemandu Engine (🧙) dan tekan [F] / [E] untuk info & tur engine.',
                targetX: 225, targetY: 378
            },
            {
                id: 'step_cmd',
                title: 'Coba Command Developer',
                desc: 'Buka chat konsol di kanan bawah dan ketik /speed 350 atau /jump 550.',
                targetX: 475, targetY: 300
            },
            {
                id: 'step_god',
                title: 'Lompati Duri / Coba /god',
                desc: 'Ketik /god di konsol untuk kebal, lalu lompati duri rintangan.',
                targetX: 600, targetY: 388
            },
            {
                id: 'step_coin',
                title: 'Ambil Koin Emas Murni',
                desc: 'Lompat ke platform melayang dan ambil koin emas berkilau.',
                targetX: 725, targetY: 125
            },
            {
                id: 'step_portal',
                title: 'Masuki Portal Gerbang',
                desc: 'Berjalanlah ke kanan dan masuki portal cahaya biru menuju Tutorial Part II!',
                targetX: 1175, targetY: 376
            }
        ];

        this.tutorialGuide = new HTMLTutorialGuide(this, {
            steps: this.tutorialSteps
        });
    }

    setTutorialStep(index) {
        this.tutorialStep = Math.max(0, Math.min(index, this.tutorialSteps.length - 1));
        if (this.tutorialGuide) {
            this.tutorialGuide.updateStep(this.tutorialStep);
        }
    }

    advanceTutorialStep(completedId) {
        if (!this.tutorialSteps || this.tutorialSteps.length === 0) return;
        const curStep = this.tutorialSteps[this.tutorialStep];
        if (curStep && (curStep.id === completedId || !completedId)) {
            if (this.tutorialStep < this.tutorialSteps.length - 1) {
                this.tutorialStep++;
                if (this.tutorialGuide) {
                    this.tutorialGuide.updateStep(this.tutorialStep);
                }
                AudioManager.playSuccess();
                this.showFloatingToast(`✓ Tutorial Langkah ${this.tutorialStep}/${this.tutorialSteps.length} Selesai!`, 0x10b981);
            }
        }
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
        } else if (cmd === 'dig' || cmd === 'gali' || cmd === 'erase') {
            GridSystem.setToolMode('dig');
        } else if (cmd === 'build' || cmd === 'pasang' || cmd === 'place') {
            GridSystem.setToolMode('build');
        } else if (cmd === 'resetworld' || cmd === 'resetmap' || cmd === 'clearmap') {
            this.resetWorldBlocks();
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
        // Mode Tutorial adalah Sandbox Bebas:
        // Pemain bebas bereksperimen, menggali balok, menumpuk platform, atau mengutak-atik saat sesi bermain,
        // namun TIDAK disimpan ke penyimpanan permanen agar level tutorial selalu default & segar.
        if (this.isTutorialMode) return;

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
        const worldW = map.lebarDunia || 1400;
        const worldH = map.tinggiDunia || 1000;

        // 0. Batas kamera dan fisika sesuai lebar & kedalaman dunia map
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.physics.world.setBounds(0, 0, worldW, worldH);

        if (map.warnaLangit) {
            this.cameras.main.setBackgroundColor(map.warnaLangit);
        } else {
            this.cameras.main.setBackgroundColor('#dcff78');
        }

        // Background Gambar Langit Permukaan
        let bgKey = null;
        if (map.background && map.background !== 'bg_scene1.png' && map.background !== 'bg_scene1') {
            if (this.textures.exists(map.id + '_bg')) {
                bgKey = map.id + '_bg';
            } else if (this.textures.exists(map.background)) {
                bgKey = map.background;
            }
        }

        if (bgKey && this.textures.exists(bgKey)) {
            this.bgImage = this.add.image(worldW / 2, 225, bgKey)
                .setDisplaySize(worldW, 580)
                .setDepth(-10);
            
            this.bgOverlay = this.add.rectangle(worldW / 2, 225, worldW, 580, 0x07111e, 0.2)
                .setDepth(-9);
        } else {
            // Background Langit Solid Vivid Yellow-Green (#dcff78) identik Main Menu
            const skyColor = (map.warnaLangit && map.warnaLangit !== '#0b1329') 
                ? Phaser.Display.Color.HexStringToColor(map.warnaLangit).color 
                : 0xdcff78;
            this.bgSolidSky = this.add.rectangle(worldW / 2, 200, Math.max(worldW + 1000, 2400), 450, skyColor)
                .setDepth(-10);
        }

        // Latar Belakang Bawah Tanah / Cavern Backdrop (y: 400 s/d worldH)
        if (worldH > 450) {
            const caveHeight = worldH - 400;
            const caveCenterY = 400 + caveHeight / 2;
            this.caveBg = this.add.rectangle(worldW / 2, caveCenterY, worldW, caveHeight, 0x050a12)
                .setDepth(-10);

            // Lapisan siluet bebatuan gua & stalaktit atmosferik
            this.caveGfx = this.add.graphics().setDepth(-9);
            this.caveGfx.fillStyle(0x0c1422, 0.55);
            for (let cx = 0; cx < worldW; cx += 100) {
                // Stalaktit menggantung di atap gua
                this.caveGfx.fillTriangle(cx, 400, cx + 50, 470, cx + 100, 400);
                // Pilar batu dari dasar
                this.caveGfx.fillTriangle(cx + 25, worldH, cx + 65, worldH - 60, cx + 105, worldH);
            }
        }

        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();
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
                // Ayunan melayang lembut 4px agar tetap 100% di dalam sel 50px tanpa menyentuh garis grid
                this.tweens.add({
                    targets: item,
                    y: k.y - 4,
                    yoyo: true,
                    repeat: -1,
                    duration: 900,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        // 4. Hazard Duri (Bisa jamak)
        if (!this.hazards) this.hazards = this.physics.add.staticGroup();
        const daftarDuri = (Array.isArray(map.duri) && map.duri.length > 0) 
            ? map.duri 
            : [{ x: 600, y: 388, lebar: 100 }];

        daftarDuri.forEach(d => {
            const targetY = (!d.y || d.y >= 400) ? 388 : d.y;
            const lebar = d.lebar || 100;
            const numCells = Math.max(1, Math.round(lebar / 50));
            const totalWidth = numCells * 50;
            const rawLeft = d.x - totalWidth / 2;
            const startCol = Math.round(rawLeft / 50);
            const startX = startCol * 50;
            const totalSpikes = numCells * 2; // 2 duri per sel 50px (masing-masing 25px)

            for (let i = 0; i < totalSpikes; i++) {
                const spikeX = startX + i * 25 + 12.5; // Titik tengah masing-masing duri 25px
                const hz = this.hazards.create(spikeX, targetY, 'skeleton_hazard');
                hz.setDepth(10);
                hz.refreshBody();
            }
        });

        // 5. NPC - Berdiri di atas lantai y = 400
        const npcConfig = map.npc || CONFIG_SKELETON.npc || {};
        const npcX = npcConfig.posisiX || 225;
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
        const portalX = portalConfig.posisiX || 1175;
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
        const pLabel = this.add.text(0, -34, 'Ke Tutorial Part II →', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalScene2.add([pRing, pIcon, pLabel]);
        this.tweens.add({
            targets: pRing,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // Sensor Tabrakan Fisika Otomatis Masuk Portal
        this.portalSensor = this.add.rectangle(portalX, portalY, 50, 70, 0x000000, 0);
        this.physics.add.existing(this.portalSensor, true);

        // 7. Papan Petunjuk Alami Dunia (Single Wooden Signpost RPG)
        this.createNaturalSignpost();
    }

    createNaturalSignpost() {
        // Berdiri di Kolom 5 (x: 250..300), tepat di titik tengah x = 275
        const signX = 275;
        const signY = 398; // Kaki tiang tertancap pas di permukaan tanah y = 400

        this.naturalSignContainer = this.add.container(signX, signY).setDepth(10);

        // Tiang kayu alami
        const post = this.add.rectangle(0, -10, 5, 24, 0x5c2b09);
        const postHighlight = this.add.rectangle(-1, -10, 1.5, 24, 0x78350f);

        // Papan kayu berukir 46px (Pas di dalam sel 50px antara x: 252 s/d 298, tidak terpotong garis grid 250 & 300!)
        const board = this.add.rectangle(0, -26, 46, 24, 0x78350f).setStrokeStyle(1.5, 0xb45309);
        const plankLine = this.add.rectangle(0, -26, 42, 1, 0x451a03);

        // Paku logam kecil di sudut
        const nailL = this.add.circle(-18, -26, 1.2, 0x94a3b8);
        const nailR = this.add.circle(18, -26, 1.2, 0x94a3b8);

        // Teks ukiran kayu proporsional dan tajam
        const signText = this.add.text(0, -26, 'Lembah Es', {
            fontSize: '8px',
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

        const map = this.currentMap || {};
        const worldH = map.tinggiDunia || 1000;
        const maxRow = Math.min(25, Math.floor(worldH / 50)); // Default 20 baris (Row 0 s/d 19)

        // Koordinat rahasia keberadaan mineral Kristal Safir terpendam di dalam gua
        const secretGemCoords = new Set([
            '3,12', '6,11', '9,15', '13,12', '16,16', '18,10', '21,14', '24,17',
            '28,13', '32,15', '36,11', '40,16', '45,12', '50,14', '55,16'
        ]);

        for (let col = startCol; col <= endCol; col++) {
            const x = col * 50 + 25; // Titik tengah kolom 50px

            // Row 8 (y: 400 - 450) -> Balok Permukaan Salju 50x50 px
            const blockTop = this.platforms.create(x, 425, 'tile_block_50_snow').refreshBody();
            blockTop.setDepth(10);
            blockTop.gridCol = col;
            blockTop.gridRow = 8;
            blockTop.gridType = 'snow';
            this.gridWorldBlocks.set(`${col},8`, blockTop);

            // Row 9 s/d maxRow - 3 (Row 9 s/d 17: Full Dirt Seragam)
            for (let r = 9; r < maxRow - 2; r++) {
                const y = r * 50 + 25;
                const key = `${col},${r}`;
                const dirtBlock = this.platforms.create(x, y, 'tile_block_50_dirt').refreshBody();
                dirtBlock.setDepth(9);
                dirtBlock.gridCol = col;
                dirtBlock.gridRow = r;
                dirtBlock.gridType = 'dirt';
                this.gridWorldBlocks.set(key, dirtBlock);
            }

            // Row 18 & 19: Dua Baris Paling Bawah (Lava Tidak Beraturan)
            const isLava19 = (col % 6 !== 0); // ~83% lava di baris 19
            const isLava18 = isLava19 && ((col % 5 !== 1) && (col % 5 !== 4)); // kubangan variatif di baris 18

            // Row 18
            const r18 = maxRow - 2;
            const y18 = r18 * 50 + 25;
            const key18 = `${col},${r18}`;
            if (isLava18) {
                const lava18 = this.add.rectangle(x, y18, 50, 50, 0xef4444, 0.95).setDepth(9);
                this.physics.add.existing(lava18, true);
                this.hazards.add(lava18);
                this.add.rectangle(x, y18 - 23, 50, 3, 0xf97316, 0.95).setDepth(10);
            } else {
                const dirt18 = this.platforms.create(x, y18, 'tile_block_50_dirt').refreshBody();
                dirt18.setDepth(9);
                dirt18.gridCol = col;
                dirt18.gridRow = r18;
                dirt18.gridType = 'dirt';
                this.gridWorldBlocks.set(key18, dirt18);
            }

            // Row 19 (Baris Paling Bawah)
            const r19 = maxRow - 1;
            const y19 = r19 * 50 + 25;
            const key19 = `${col},${r19}`;
            if (isLava19) {
                const lava19 = this.add.rectangle(x, y19, 50, 50, 0xef4444, 0.95).setDepth(9);
                this.physics.add.existing(lava19, true);
                this.hazards.add(lava19);
            } else {
                const dirt19 = this.platforms.create(x, y19, 'tile_block_50_dirt').refreshBody();
                dirt19.setDepth(9);
                dirt19.gridCol = col;
                dirt19.gridRow = r19;
                dirt19.gridType = 'dirt';
                this.gridWorldBlocks.set(key19, dirt19);
            }
        }
    }

    buildModular50Platform(centerX, y, tileCount = 3) {
        if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();
        // y adalah titik tengah vertikal platform (312 untuk surface 300)
        const row = Math.floor((y - 12) / 50);

        // Kunci penempatan agar balok platform selalu menempel presisi di batas sel kisi grid 50px
        const totalWidth = tileCount * 50;
        const rawLeft = centerX - totalWidth / 2;
        const startCol = Math.round(rawLeft / 50);
        const startX = startCol * 50; // Garis grid pembatas tepi kiri

        for (let i = 0; i < tileCount; i++) {
            const col = startCol + i;
            const tileCenterX = startX + i * 50 + 25; // Tepat di titik tengah sel kolom 50px (+25px)

            let key = 'tile_plat_50_mid';
            if (i === 0) key = 'tile_plat_50_left';
            else if (i === tileCount - 1) key = 'tile_plat_50_right';

            const plat = this.platforms.create(tileCenterX, y, key).refreshBody();
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

    // ===============================================================
    // WORLD MANIPULATION SYSTEM (GALI / HAPUS & PASANG BALOK GRID 50px)
    // Mirip mekanik Sandbox di Terraria, Growtopia, & Minecraft 2D
    // ===============================================================
    handleWorldPointerDown(pointer) {
        // Abaikan jika pointer mengenai elemen HTML (Menu bar, console, modal)
        if (pointer.event && pointer.event.target && pointer.event.target.tagName !== 'CANVAS') return;

        if (!GridSystem || GridSystem.toolMode === 'none') return;

        const cam = this.cameras.main;
        const wp = cam.getWorldPoint(pointer.x, pointer.y);

        if (GridSystem.toolMode === 'dig') {
            this.handleWorldDig(wp.x, wp.y);
        } else if (GridSystem.toolMode === 'build') {
            this.handleWorldBuild(wp.x, wp.y);
        }
    }

    handleWorldDig(worldX, worldY) {
        const col = Math.floor(worldX / 50);
        const row = Math.floor(worldY / 50);
        const key = `${col},${row}`;

        // 1. Cek apakah ada Balok Platform / Tanah / Batu / Bedrock di gridWorldBlocks
        let block = this.gridWorldBlocks ? this.gridWorldBlocks.get(key) : null;
        if (block && block.active) {
            const cx = block.x;
            const cy = block.y;
            const bType = block.gridType || 'dirt';

            // Bedrock tidak bisa dihancurkan
            if (bType === 'bedrock') {
                this.showFloatingBlockToast(cx, cy - 20, '⚠️ Bedrock Tak Tertembus!', 0x94a3b8);
                AudioManager.playClick();
                this.tweens.add({
                    targets: block,
                    x: cx + 3,
                    yoyo: true,
                    repeat: 3,
                    duration: 35,
                    onComplete: () => { block.x = cx; }
                });
                return false;
            }

            // Jika menemukan mineral kristal safir langka
            if (bType === 'gem') {
                this.spawnBlockBreakParticles(cx, cy, 'gem');
                AudioManager.playGem();

                this.platforms.remove(block, true, true);
                this.gridWorldBlocks.delete(key);

                const gemItem = {
                    id: `permata_${col}_${row}`,
                    nama: 'Permata Safir Bawah Tanah 💎',
                    deskripsi: 'Permata kristal murni langka yang digali dari kedalaman perut bumi.',
                    icon: '💎'
                };
                this.inventory.push(gemItem);
                this.updateInventoryBadge();

                this.showFloatingBlockToast(cx, cy - 20, '💎 +1 Permata Safir!', 0x38bdf8);
                if (this.showFloatingToast) {
                    this.showFloatingToast('💎 Menemukan Permata Safir Bawah Tanah! (Masuk Tas)', 0x38bdf8);
                }
                return true;
            }

            // Balok tanah, salju, batu, atau platform biasa
            const savedCol = col;
            const savedRow = row;
            const savedKey = key;
            const savedBType = bType;
            const savedX = cx;
            const savedY = block.y;
            const savedTexture = (block.texture && block.texture.key) ? block.texture.key : ('tile_block_50_' + (bType === 'ground' ? 'dirt' : bType));
            const savedDepth = block.depth || 9;

            this.spawnBlockBreakParticles(cx, cy, bType);
            AudioManager.playDig();

            // Hapus dari grup fisika & Map
            this.platforms.remove(block, true, true);
            this.gridWorldBlocks.delete(key);

            let label = 'Balok';
            if (bType === 'platform') label = 'Platform';
            else if (bType === 'snow') label = 'Balok Salju';
            else if (bType === 'stone') label = 'Batu Gua';
            else label = 'Balok Tanah';

            this.showFloatingBlockToast(cx, cy - 20, `-1 ${label}`, 0xef4444);

            UndoRedoManager.push({
                description: `Hancurkan ${label}`,
                undo: () => {
                    if (!this.platforms) return;
                    const restored = this.platforms.create(savedX, savedY, savedTexture).refreshBody();
                    restored.setDepth(savedDepth);
                    restored.gridCol = savedCol;
                    restored.gridRow = savedRow;
                    restored.gridType = savedBType;
                    if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();
                    this.gridWorldBlocks.set(savedKey, restored);
                    this.spawnBlockPlaceParticles(savedX, savedY);
                    AudioManager.playPlace();
                },
                redo: () => {
                    const blk = this.gridWorldBlocks ? this.gridWorldBlocks.get(savedKey) : null;
                    if (blk && blk.active) {
                        this.spawnBlockBreakParticles(blk.x, blk.y, savedBType);
                        this.platforms.remove(blk, true, true);
                        this.gridWorldBlocks.delete(savedKey);
                        AudioManager.playDig();
                    }
                }
            });
            return true;
        }

        // 2. Cek apakah ada Hazard / Duri di petak ini
        if (this.hazards) {
            const hzList = this.hazards.getChildren();
            const foundHz = hzList.find(hz => hz.active && Math.abs(hz.x - (col * 50 + 25)) < 30 && Math.abs(hz.y - (row * 50 + 25)) < 30);
            if (foundHz) {
                const hzX = foundHz.x;
                const hzY = foundHz.y;
                this.spawnBlockBreakParticles(foundHz.x, foundHz.y, 'hazard');
                AudioManager.playDig();
                this.hazards.remove(foundHz, true, true);
                this.showFloatingBlockToast(foundHz.x, foundHz.y - 20, '-1 Duri', 0xef4444);

                UndoRedoManager.push({
                    description: 'Hapus Duri',
                    undo: () => {
                        if (!this.hazards) return;
                        this.hazards.create(hzX, hzY, 'skeleton_hazard').setDepth(10);
                        AudioManager.playPlace();
                    },
                    redo: () => {
                        if (!this.hazards) return;
                        const h = this.hazards.getChildren().find(hz => hz.active && Math.abs(hz.x - hzX) < 10 && Math.abs(hz.y - hzY) < 10);
                        if (h) {
                            this.spawnBlockBreakParticles(h.x, h.y, 'hazard');
                            this.hazards.remove(h, true, true);
                            AudioManager.playDig();
                        }
                    }
                });
                return true;
            }
        }

        // 3. Cek apakah ada Koin di petak ini
        if (this.items) {
            const coinList = this.items.getChildren();
            const foundCoin = coinList.find(c => c.active && Math.abs(c.x - (col * 50 + 25)) < 30 && Math.abs(c.y - (row * 50 + 25)) < 30);
            if (foundCoin) {
                const coinX = foundCoin.x;
                const coinY = foundCoin.y;
                this.spawnBlockBreakParticles(foundCoin.x, foundCoin.y, 'coin');
                AudioManager.playDig();
                this.items.remove(foundCoin, true, true);
                this.showFloatingBlockToast(foundCoin.x, foundCoin.y - 20, '-1 Koin', 0xfacc15);

                UndoRedoManager.push({
                    description: 'Hapus Koin',
                    undo: () => {
                        if (!this.items) return;
                        this.items.create(coinX, coinY, 'skeleton_item').setDepth(10);
                        AudioManager.playPlace();
                    },
                    redo: () => {
                        if (!this.items) return;
                        const c = this.items.getChildren().find(item => item.active && Math.abs(item.x - coinX) < 10 && Math.abs(item.y - coinY) < 10);
                        if (c) {
                            this.spawnBlockBreakParticles(c.x, c.y, 'coin');
                            this.items.remove(c, true, true);
                            AudioManager.playDig();
                        }
                    }
                });
                return true;
            }
        }

        // Jika sel kosong
        this.showFloatingBlockToast(col * 50 + 25, row * 50 + 25, 'Kosong', 0x94a3b8);
        return false;
    }

    handleWorldBuild(worldX, worldY) {
        const col = Math.floor(worldX / 50);
        const row = Math.floor(worldY / 50);
        const key = `${col},${row}`;

        if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();

        // Jangan timpa jika sudah ada balok aktif
        if (this.gridWorldBlocks.has(key)) {
            this.showFloatingBlockToast(col * 50 + 25, row * 50 + 15, '⚠️ Sudah ada balok!', 0xf59e0b);
            return false;
        }

        const tileCenterX = col * 50 + 25;
        let newBlock = null;
        let bType = 'ground';

        if (row === 8) {
            // Permukaan salju
            newBlock = this.platforms.create(tileCenterX, row * 50 + 25, 'tile_block_50_snow').refreshBody();
            newBlock.setDepth(10);
            bType = 'snow';
        } else if (row >= 9 && row <= 13) {
            // Lapisan tanah bawah permukaan
            newBlock = this.platforms.create(tileCenterX, row * 50 + 25, 'tile_block_50_dirt').refreshBody();
            newBlock.setDepth(9);
            bType = 'dirt';
        } else if (row >= 14) {
            // Lapisan batu gua dalam
            newBlock = this.platforms.create(tileCenterX, row * 50 + 25, 'tile_block_50_stone').refreshBody();
            newBlock.setDepth(9);
            bType = 'stone';
        } else {
            // Platform melayang jika di atas tanah (row < 8)
            newBlock = this.platforms.create(tileCenterX, row * 50 + 12, 'tile_plat_50_mid').refreshBody();
            newBlock.setDepth(10);
            bType = 'platform';
        }

        newBlock.gridCol = col;
        newBlock.gridRow = row;
        newBlock.gridType = bType;
        this.gridWorldBlocks.set(key, newBlock);

        // Efek partikel & audio
        this.spawnBlockPlaceParticles(tileCenterX, newBlock.y);
        AudioManager.playPlace();

        let label = 'Balok';
        if (bType === 'platform') label = 'Platform';
        else if (bType === 'snow') label = 'Balok Salju';
        else if (bType === 'stone') label = 'Batu Gua';
        else label = 'Balok Tanah';

        this.showFloatingBlockToast(tileCenterX, row * 50 - 15, `+1 ${label}`, 0x22c55e);

        const savedCol = col;
        const savedRow = row;
        const savedKey = key;
        const savedBType = bType;
        const savedX = tileCenterX;
        const savedY = newBlock.y;
        const savedTexture = (newBlock.texture && newBlock.texture.key) ? newBlock.texture.key : ('tile_block_50_' + (bType === 'ground' ? 'dirt' : bType));
        const savedDepth = newBlock.depth;

        UndoRedoManager.push({
            description: `Pasang ${label}`,
            undo: () => {
                const blk = this.gridWorldBlocks ? this.gridWorldBlocks.get(savedKey) : null;
                if (blk && blk.active) {
                    this.spawnBlockBreakParticles(blk.x, blk.y, savedBType);
                    this.platforms.remove(blk, true, true);
                    this.gridWorldBlocks.delete(savedKey);
                    AudioManager.playDig();
                }
            },
            redo: () => {
                if (!this.platforms) return;
                const reBlock = this.platforms.create(savedX, savedY, savedTexture).refreshBody();
                reBlock.setDepth(savedDepth);
                reBlock.gridCol = savedCol;
                reBlock.gridRow = savedRow;
                reBlock.gridType = savedBType;
                if (!this.gridWorldBlocks) this.gridWorldBlocks = new Map();
                this.gridWorldBlocks.set(savedKey, reBlock);
                this.spawnBlockPlaceParticles(savedX, savedY);
                AudioManager.playPlace();
            }
        });

        return true;
    }

    spawnBlockBreakParticles(x, y, type = 'ground') {
        const colors = (type === 'snow') 
            ? [0xe2e8f0, 0xffffff, 0x94a3b8] 
            : (type === 'dirt') 
                ? [0x78350f, 0x451a03, 0x92400e]
                : (type === 'stone')
                    ? [0x334155, 0x1e293b, 0x64748b]
                    : (type === 'gem')
                        ? [0x38bdf8, 0x0284c7, 0xbae6fd, 0xffffff]
                        : (type === 'hazard')
                            ? [0xef4444, 0xf87171, 0x991b1b]
                            : (type === 'coin')
                                ? [0xfacc15, 0xfef08a, 0xeab308]
                                : [0x38bdf8, 0x64748b, 0x1e293b];

        for (let i = 0; i < 10; i++) {
            const color = Phaser.Utils.Array.GetRandom(colors);
            const pSize = Phaser.Math.Between(4, 7);
            const particle = this.add.rectangle(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), pSize, pSize, color).setDepth(30);
            const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
            const speed = Phaser.Math.Between(40, 100);

            this.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed + 35,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(400, 600),
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    spawnBlockPlaceParticles(x, y) {
        const ring = this.add.rectangle(x, y, 48, 48).setDepth(28);
        ring.setStrokeStyle(2, 0x22c55e, 0.9);
        ring.setFillStyle(0x22c55e, 0.2);

        this.tweens.add({
            targets: ring,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    showFloatingBlockToast(x, y, text, color = 0xffffff) {
        return;
    }

    resetWorldBlocks() {
        if (!this.gridWorldBlocks) return;

        // 1. Bersihkan semua balok dinamis saat ini
        this.gridWorldBlocks.forEach((block) => {
            if (block && block.active) {
                this.platforms.remove(block, true, true);
            }
        });
        this.gridWorldBlocks.clear();

        // 2. Bangun kembali tanah default
        const map = this.currentMap || {};
        const worldW = map.lebarDunia || 1400;
        this.buildModular50Ground(worldW);

        // 3. Bangun kembali platform dari map data
        if (Array.isArray(map.platform) && map.platform.length > 0) {
            map.platform.forEach(p => {
                const count = Math.max(1, Math.round((p.lebar || 150) / 50));
                this.buildModular50Platform(p.x, p.y, count);
            });
        }

        AudioManager.playSuccess();
        if (this.showFloatingToast) {
            this.showFloatingToast('✓ Struktur Dunia di-reset ke kondisi awal!', 0x10b981);
        }
    }

    createFogEffect() {
        // Jangan timpa langit cerah vivid yellow-green dengan kabut kelabu tebal (identik Main Menu)
        const map = this.currentMap || {};
        if (map.warnaLangit === '#dcff78' || this.mapId === 'map_salju') {
            return;
        }
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

    // ─────────────────────────────────────────────────────────
    // KUNANG-KUNANG HITAM ANIMASI IDENTIK MAIN MENU
    // ─────────────────────────────────────────────────────────
    _createFireflies(count = 32) {
        if (!this.textures.exists('npc_firefly')) return;
        this._fireflies = [];
        const worldW = (this.currentMap && this.currentMap.lebarDunia) || 1400;
        // Palet warna aura cahaya di belakang karakter kunang-kunang hitam (sesuai TitleScene)
        const glowColors = [0xfef08a, 0x67e8f9, 0xf472b6, 0xa78bfa, 0x38bdf8, 0xffffff];

        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(40, worldW - 40);
            const y = Phaser.Math.Between(35, 365);
            const auraColor = glowColors[Math.floor(Math.random() * glowColors.length)];
            const targetSize = Phaser.Math.Between(18, 26);

            // Variasi kedalaman: sebagian melayang di belakang platform/pemain, sebagian di depan
            const depth = (i % 2 === 0) ? 2 : 12;
            const firefly = this.add.container(x, y).setDepth(depth);

            // 1. Aura Cahaya Bercahaya (Glow Halo)
            const glowHalo = this.add.graphics();
            glowHalo.fillStyle(auraColor, 0.45);
            glowHalo.fillCircle(0, 0, targetSize * 0.85);
            glowHalo.fillStyle(0xffffff, 0.60);
            glowHalo.fillCircle(0, 0, targetSize * 0.45);

            // 2. Karakter Kunang-Kunang Hitam Mini (Sprite 'npc_firefly')
            const sprite = this.add.image(0, 0, 'npc_firefly');
            sprite.setDisplaySize(targetSize, targetSize);

            firefly.add([glowHalo, sprite]);

            // Animasi Denyut Cahaya (Pulse Glow)
            const pulseDuration = Phaser.Math.Between(800, 1600);
            this.tweens.add({
                targets: glowHalo,
                alpha: { from: 0.25, to: 0.90 },
                scaleX: { from: 0.85, to: 1.30 },
                scaleY: { from: 0.85, to: 1.30 },
                duration: pulseDuration,
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1500),
                ease: 'Sine.easeInOut'
            });

            // Animasi Goyangan Miring Lucu (Wobble)
            this.tweens.add({
                targets: sprite,
                angle: { from: -8, to: 8 },
                duration: Phaser.Math.Between(1800, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Animasi Melayang Mengapung (Floating Drift)
            const moveX = Phaser.Math.Between(-45, 45);
            const moveY = Phaser.Math.Between(-35, 35);
            this.tweens.add({
                targets: firefly,
                x: `+=${moveX}`,
                y: `+=${moveY}`,
                duration: Phaser.Math.Between(3500, 7500),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Sine.easeInOut'
            });

            this._fireflies.push(firefly);
        }
    }

    createPlayer() {
        const defaultSpawn = (this.currentMap && this.currentMap.spawn) || { x: 160, y: 360 };
        const spawnX = this.savedSpawnPos ? this.savedSpawnPos.x : defaultSpawn.x;
        const spawnY = this.savedSpawnPos ? this.savedSpawnPos.y : defaultSpawn.y;

        const playerTexture = this.textures.exists('custom_player') ? 'custom_player' : 'skeleton_player';
        this.player = this.physics.add.sprite(spawnX, spawnY, playerTexture).setDepth(10);
        this.player.setCollideWorldBounds(true);

        // Auto-scale jika gambar custom murid agar ukurannya pas (tinggi ~44px)
        const rawW = this.player.width || 32;
        const rawH = this.player.height || 44;
        const targetH = 44;
        if (rawH > 0 && rawH !== targetH) {
            this.player.setScale(targetH / rawH);
        } else {
            this.player.setScale(1);
        }

        // Hitbox anti-snag: beri margin 2px di kiri & kanan agar pergerakan di atas sambungan balok ubin lantai selalu mulus tanpa tersendat
        // Hitbox tinggi menggunakan rawH agar tinggi fisik setelah scale pas 44px dan kaki tidak mendem
        const marginX = 4 / this.player.scaleX;
        const boxW = Math.max(14 / this.player.scaleX, rawW - marginX);
        const boxH = rawH;
        this.player.body.setSize(boxW, boxH, true);
        this.physics.add.collider(this.player, this.platforms);

        // Sensor Tabrakan Masuk Portal
        if (this.portalSensor) {
            this.physics.add.overlap(this.player, this.portalSensor, () => {
                this.handlePortalEnter();
            });
        }

        // Variabel animasi elastisitas & timer platformer halus
        this.playerBaseScaleX = this.player.scaleX || 1;
        this.playerBaseScaleY = this.player.scaleY || 1;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.airTime = 0;
        this.prevJumpPressed = false;
        this.isJumping = false;
        this.squashTween = null;
        this.lastHorizDir = 'right';

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
                    this.showFloatingToast(`+1 ${kData.nama}`, 0xfacc15);
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
                if (this.gameOverModal) {
                    this.gameOverModal.show({
                        retryText: this.isTutorialMode ? 'Ulangi Tutorial (Mulai Baru)' : 'Muat Checkpoint Terakhir',
                        onRetry: () => {
                            this.isGameOver = false;
                            this.scene.restart({ isNewGame: true, isTutorial: true });
                        },
                        onMenu: () => {
                            this.isGameOver = false;
                            AudioManager.stopAmbientBGM();
                            this.scene.start('TitleScene');
                        }
                    });
                }
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
        return;
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
            this.handlePortalEnter();
            return;
        }
    }

    handlePortalEnter() {
        if (this.isLevelTransitioning) return;
        this.isLevelTransitioning = true;
        AudioManager.playCoin();

        const targetSceneKey = this.portalTargetMapId || 'Scene2';
        const isHongKong = (targetSceneKey === 'HongKongScene' || targetSceneKey === 'Scene2');

        this.advanceTutorialStep('step_portal');
        this.showFloatingToast(`🎉 Memasuki Portal! Menuju ${isHongKong ? 'Tutorial Part II (Victoria Harbour)' : targetSceneKey}...`, 0x10b981);

        this.time.delayedCall(800, () => {
            if (isHongKong) {
                this.scene.start('Scene2', {
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory,
                    collectedItemIds: this.collectedItemIds,
                    isTutorial: true
                });
            } else {
                const targetMap = Array.isArray(DAFTAR_MAP) && DAFTAR_MAP.find(m => m.id === targetSceneKey);
                if (targetMap) {
                    this.scene.restart({
                        mapId: targetSceneKey,
                        customSpeed: this.customSpeed,
                        customJump: this.customJump,
                        hp: this.hp,
                        maxHp: this.maxHp,
                        inventory: this.inventory
                    });
                } else {
                    this.showVictoryModal();
                    AudioManager.playSuccess();
                }
            }
        });
    }

    update(time, delta) {
        // Update panah tutorial interaktif & arah langkah
        this.updateTutorialArrows();

        // Animasi pergerakan aliran kabut terus berjalan
        if (this.fogBack) this.fogBack.tilePositionX += 0.25;
        if (this.fogMid) this.fogMid.tilePositionX += 0.42;
        if (this.fogGround) this.fogGround.tilePositionX += 0.55;
        if (this.fogFront) this.fogFront.tilePositionX -= 0.16;

        if (!this.player || !this.player.body) return;

        // Smart Ground Clamp Camera Tracking:
        // Menjaga pandangan daratan luas (tanah di dasar layar), dan otomatis meluncur ke bawah saat pemain menggali ke gua
        if (this.cameraAnchor) {
            this.cameraAnchor.x = this.player.x;
            this.cameraAnchor.y = Math.max(225, this.player.y - 160);
        }
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

        const dt = Math.min((delta || 16.6) / 1000, 0.05); // Detik per frame
        const isGrounded = !!(this.player.body.touching.down || this.player.body.blocked.down);

        // Stabilisasi Pendaratan & Coyote Time:
        if (isGrounded) {
            // Efek pendaratan hanya dipicu jika karakter benar-benar melayang di udara (> 90ms)
            if (this.airTime > 90 && this.player.body.velocity.y >= 0) {
                this.createDustEffect(this.player.x, this.player.y + (this.player.displayHeight ? this.player.displayHeight / 2 : 22));
                this.triggerLandSquash();
            }
            this.airTime = 0;
            this.coyoteTimer = 130;
            this.isJumping = false;
        } else {
            this.airTime = (this.airTime || 0) + (delta || 16.6);
            this.coyoteTimer = Math.max(0, (this.coyoteTimer || 0) - (delta || 16.6));
        }

        // 1. HORIZONTAL MOVEMENT: Bisa bergerak simultan kapan saja (di darat maupun di udara saat melompat)
        let targetVx = 0;
        if (left && right) {
            targetVx = (this.lastHorizDir === 'left') ? -speed : speed;
        } else if (left) {
            targetVx = -speed;
            this.lastHorizDir = 'left';
        } else if (right) {
            targetVx = speed;
            this.lastHorizDir = 'right';
        }

        const currentVx = this.player.body.velocity.x;
        let newVx = currentVx;

        if (targetVx !== 0) {
            // Cek berbalik arah mendadak (skid)
            const isTurnaround = (currentVx > 25 && targetVx < 0) || (currentVx < -25 && targetVx > 0);
            const rate = isTurnaround 
                ? (isGrounded ? 2800 : 2000) 
                : (isGrounded ? 1600 : 1400);

            if (targetVx > currentVx) {
                newVx = Math.min(targetVx, currentVx + rate * dt);
            } else {
                newVx = Math.max(targetVx, currentVx - rate * dt);
            }

            // Partikel skid saat berbalik arah di tanah
            if (isTurnaround && isGrounded && Math.abs(currentVx) > 90) {
                this.createSkidEffect(this.player.x, this.player.y + (this.player.displayHeight ? this.player.displayHeight / 2 : 22), currentVx > 0 ? 1 : -1);
            }

            // Arah pandang karakter (FlipX)
            if (targetVx < 0) this.player.setFlipX(true);
            else if (targetVx > 0) this.player.setFlipX(false);
            CodeInspector.record('move');
        } else {
            // Deselerasi / Friksi rem saat tombol dilepas
            const friction = isGrounded ? 1500 : 400;
            if (Math.abs(currentVx) <= friction * dt) {
                newVx = 0;
            } else if (currentVx > 0) {
                newVx = currentVx - friction * dt;
            } else {
                newVx = currentVx + friction * dt;
            }
        }
        this.player.setVelocityX(newVx);

        // 2. JUMP BUFFER & SIMULTANEOUS RUNNING JUMP:
        const jumpJustPressed = jump && !this.prevJumpPressed;
        this.prevJumpPressed = jump;

        if (jumpJustPressed) {
            this.jumpBufferTimer = 140;
        } else {
            this.jumpBufferTimer = Math.max(0, (this.jumpBufferTimer || 0) - (delta || 16.6));
        }

        // 3. TRIGGER JUMP: Bisa melompat saat diam ataupun sambil lari kencang ke kiri/kanan
        const canJump = (this.jumpBufferTimer > 0) && (isGrounded || this.coyoteTimer > 0);
        if (canJump) {
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.airTime = 100;
            this.isJumping = true;
            this.player.setVelocityY(jumpSpeed);
            AudioManager.playJump();
            CodeInspector.record('jump');

            this.createDustEffect(this.player.x, this.player.y + (this.player.displayHeight ? this.player.displayHeight / 2 : 22));
            this.triggerJumpSquash();
        }

        // 4. VARIABLE JUMP HEIGHT: Short hop jika tombol lompat hanya ditekan cepat
        if (!jump && this.isJumping && this.player.body.velocity.y < -60) {
            this.player.setVelocityY(this.player.body.velocity.y * 0.52);
            this.isJumping = false;
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

    createSkidEffect(x, y, dir = 1) {
        for (let i = 0; i < 3; i++) {
            const dust = this.add.circle(x - dir * 8 + Phaser.Math.Between(-4, 4), y - 2, Phaser.Math.Between(2, 3), 0xe2e8f0, 0.65).setDepth(11);
            this.tweens.add({
                targets: dust,
                x: dust.x - dir * Phaser.Math.Between(10, 20),
                y: dust.y - Phaser.Math.Between(2, 6),
                scale: 0.2,
                alpha: 0,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => dust.destroy()
            });
        }
    }

    // Efek Penyet / Squash saat ancang-ancang melompat (Memipih lebar kocak, lalu melesat memanjang)
    triggerJumpSquash() {
        if (!this.player || !this.player.active) return;
        if (this.squashTween) {
            this.squashTween.stop();
            this.squashTween = null;
        }
        const baseSX = this.playerBaseScaleX || 1;
        const baseSY = this.playerBaseScaleY || 1;

        // Fase 1: Memipih penyet super elastis (lebar 150%, tinggi 50%)
        this.player.setScale(baseSX * 1.50, baseSY * 0.50);

        this.squashTween = this.tweens.add({
            targets: this.player,
            scaleX: baseSX * 0.74,
            scaleY: baseSY * 1.36,
            duration: 85,
            ease: 'Sine.easeIn',
            onComplete: () => {
                if (!this.player || !this.player.active) return;
                this.squashTween = this.tweens.add({
                    targets: this.player,
                    scaleX: baseSX,
                    scaleY: baseSY,
                    duration: 170,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        if (this.player && this.player.active) {
                            this.player.setScale(baseSX, baseSY);
                        }
                        this.squashTween = null;
                    }
                });
            }
        });
    }

    // Efek Penyet / Squash saat mendarat di lantai (Membal elastis seperti jeli)
    triggerLandSquash() {
        if (!this.player || !this.player.active) return;
        if (this.squashTween) {
            this.squashTween.stop();
            this.squashTween = null;
        }
        const baseSX = this.playerBaseScaleX || 1;
        const baseSY = this.playerBaseScaleY || 1;

        // Memipih penyet lebar (lebar 152%, tinggi 48%)
        this.player.setScale(baseSX * 1.52, baseSY * 0.48);

        this.squashTween = this.tweens.add({
            targets: this.player,
            scaleX: baseSX,
            scaleY: baseSY,
            duration: 210,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (this.player && this.player.active) {
                    this.player.setScale(baseSX, baseSY);
                }
                this.squashTween = null;
            }
        });
    }

    triggerSquash(scaleRatioX, scaleRatioY, duration = 150) {
        if (!this.player || !this.player.active) return;
        if (this.squashTween) {
            this.squashTween.stop();
            this.squashTween = null;
        }
        const baseSX = this.playerBaseScaleX || 1;
        const baseSY = this.playerBaseScaleY || 1;

        // Selalu reset ke proporsi awal agar tidak pernah gepeng permanen
        this.player.setScale(baseSX, baseSY);

        this.squashTween = this.tweens.add({
            targets: this.player,
            scaleX: { from: baseSX * scaleRatioX, to: baseSX },
            scaleY: { from: baseSY * scaleRatioY, to: baseSY },
            duration: duration,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.player && this.player.active) {
                    this.player.setScale(baseSX, baseSY);
                }
                this.squashTween = null;
            }
        });
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
