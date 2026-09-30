import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { DialogBox } from '../ui/DialogBox.js';
import { EngineMenuBar } from '../ui/EngineMenuBar.js';
import { HTMLGameHUD } from '../ui/HTMLGameHUD.js';
import { HTMLInteractPrompt } from '../ui/HTMLInteractPrompt.js';
import { QuestModal } from '../ui/QuestModal.js';
import { GridSystem } from '../utils/GridSystem.js';
import { ProjectManager } from '../utils/ProjectManager.js';

export class CustomWorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CustomWorldScene' });
    }

    init(data = {}) {
        this.projectId = data.projectId || null;
        this.sceneId = data.sceneId || (data.worldData ? data.worldData.id : null);
        this.isLevelTransitioning = false;
        this.worldData = data.worldData || {
            name: 'Dunia Kreasiku #1',
            biome: 'dirt',
            timeOfDay: 'day',
            worldWidth: 1800,
            hasLava: true,
            hasWater: true,
            hasSpikes: true,
            hasPlatforms: true,
            hasSlime: true,
            hasSkeleton: true,
            hasNpc: true,
            hasChest: true,
            hasCoins: true,
            hasPortal: true
        };

        this.hp = data.hp !== undefined ? data.hp : 3;
        this.maxHp = 3;
        this.score = 0;
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];
        this.collectedItemIds = [];
        this.isGameOver = false;
        this.isInvincible = false;
        this.monsters = [];
    }

    create() {
        CommandConsole.show();

        // 1. Inisialisasi Menu Bar & HUD
        this.engineMenuBar = new EngineMenuBar(this);
        this.engineMenuBar.show(this);

        const worldWidth = this.worldData.worldWidth || 1800;
        const worldHeight = this.worldData.worldHeight || 850;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // 2. Latar Belakang & Langit sesuai Biome
        this.setupSkyAndBackground(worldWidth);

        // 3. Platform Groups & Colliders
        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();
        this.waterBodies = this.physics.add.group({ allowGravity: false, immovable: true });
        this.coins = this.physics.add.group({ allowGravity: false, immovable: true });

        // 4. Bangun Medan Tanah & Blok
        this.buildTerrain(worldWidth);

        // 5. Bangun Karakter Player
        this.createPlayer();

        // 6. Bangun Monster & Rintangan
        this.buildMonsters();

        // 7. Bangun NPC & Peti Harta
        this.buildInteractions();

        // 8. Bangun Portal Keluar
        this.createPortal(worldWidth);

        // 9. Kamera Follow dengan Smart Ground Clamping
        this.setupCameraFollow();

        // 10. Pasang HUD & Kontrol
        this.setupHUDAndControls();

        // Banner Notifikasi Selamat Datang Scene Baru
        this.showWorldBanner(`🎬 Scene: "${this.worldData.name || 'Scene Kreasiku'}" • [F4 / Klik Edit] untuk Live Editor`);
    }

    // ===============================================================
    // 1. LATAR BELAKANG & LANGIT
    // ===============================================================
    // ===============================================================
    // 1. LATAR BELAKANG & LANGIT (100% IDENTIK DENGAN PREVIEW)
    // ===============================================================
    setupSkyAndBackground(worldWidth) {
        let topColor = 0x0369a1;
        let midColor = 0x38bdf8;
        let botColor = 0x7dd3fc;
        let skyHex = '#0369a1';

        if (this.worldData.biome === 'snow') {
            topColor = 0x0369a1;
            midColor = 0x38bdf8;
            botColor = 0xbae6fd;
            skyHex = '#0369a1';
        } else if (this.worldData.biome === 'desert') {
            topColor = 0x78350f; // Cokelat tua tembaga di puncak langit
            midColor = 0xd97706; // Jingga gurun hangat
            botColor = 0xfde68a; // Kuning keemasan terang di garis cakrawala
            skyHex = '#78350f';
        } else if (this.worldData.biome === 'cave') {
            topColor = 0x090d16;
            midColor = 0x111827;
            botColor = 0x1e1b4b;
            skyHex = '#090d16';
        }

        if (this.worldData.timeOfDay === 'sunset') {
            topColor = 0xc2410c;
            midColor = 0xea580c;
            botColor = 0xfb923c;
            skyHex = '#c2410c';
        } else if (this.worldData.timeOfDay === 'night') {
            topColor = 0x050b14;
            midColor = 0x0a1120;
            botColor = 0x0f172a;
            skyHex = '#050b14';
        }

        // Latar Belakang Kamera Dasar
        this.cameras.main.setBackgroundColor(skyHex);

        // Gradien Langit di World Space (Membentang dari y = 0 ke y = 400 cakrawala tanah)
        const skyGraphics = this.add.graphics().setDepth(0);
        
        // Bagian atas langit jika kamera melihat ke atas (y < 0)
        skyGraphics.fillStyle(topColor, 1);
        skyGraphics.fillRect(-1000, -800, worldWidth + 2000, 800);

        // Gradien Langit dari y=0 ke y=400 (Sesuai persis dengan ctx.createLinearGradient di preview)
        skyGraphics.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
        skyGraphics.fillRect(-1000, 0, worldWidth + 2000, 400);

        // Matahari / Bulan dekoratif di langit (Posisi x=275, y=80 presisi dengan cincin aura bercahaya)
        if (this.worldData.biome !== 'cave') {
            const isNight = this.worldData.timeOfDay === 'night';
            const sunColor = isNight ? 0xf8fafc : 0xfef08a;
            const glowColor = isNight ? 0xe2e8f0 : 0xfde047;

            // Lingkaran matahari utama
            const sun = this.add.circle(275, 80, 26, sunColor, 0.95).setDepth(1);
            // Cincin aura bercahaya lembut
            const sunGlow = this.add.circle(275, 80, 30).setStrokeStyle(3, glowColor, 0.4).setDepth(1);
        }
    }

    // ===============================================================
    // 2. PEMBANGUNAN MEDAN TANAH, AIR & LAVA (100% IDENTIK DENGAN PREVIEW)
    // ===============================================================
    buildTerrain(worldWidth) {
        const totalCols = 36;
        const groundRow = 8;
        const groundY = 400;

        // Penentuan Warna Biome Strata Tanah & Batu Gua
        let surfaceColor = 0x15803d; // Rumput hijau
        let dirtColor = 0x78350f;    // Subsoil cokelat
        let stoneColor = 0x334155;   // Deep cavern slate stone

        if (this.worldData.biome === 'snow') {
            surfaceColor = 0xf1f5f9; // Salju putih
            dirtColor = 0x475569;     // Subsoil beku
            stoneColor = 0x1e293b;
        } else if (this.worldData.biome === 'desert') {
            surfaceColor = 0xf59e0b; // Pasir emas permukaan
            dirtColor = 0xb45309;     // Tanah cokelat gurun subsoil
            stoneColor = 0x1e293b;   // Batu slate gelap gua dalam
        } else if (this.worldData.biome === 'cave') {
            surfaceColor = 0x374151; // Batuan obsidian
            dirtColor = 0x1f2937;
            stoneColor = 0x0f172a;
        }

        // Peta Petak 1x1 Spesifik untuk Air dan Lava
        const hasCustom = Array.isArray(this.worldData.entities) && this.worldData.entities.length > 0;
        const waterTileMap = new Set();
        const lavaTileMap = new Set();

        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'water').forEach(w => {
                const wt = w.wTiles || 1;
                const ht = w.hTiles || 1;
                const r0 = (w.row !== undefined) ? w.row : 8;
                for (let c = w.col; c < w.col + wt; c++) {
                    for (let r = r0; r < r0 + ht; r++) waterTileMap.add(`${c},${r}`);
                }
            });
            this.worldData.entities.filter(e => e.type === 'lava').forEach(l => {
                const wt = l.wTiles || 1;
                const ht = l.hTiles || 1;
                const r0 = (l.row !== undefined) ? l.row : 8;
                for (let c = l.col; c < l.col + wt; c++) {
                    for (let r = r0; r < r0 + ht; r++) lavaTileMap.add(`${c},${r}`);
                }
            });
        } else {
            if (this.worldData.hasWater) [11, 12, 13].forEach(c => waterTileMap.add(`${c},8`));
            if (this.worldData.hasLava) [20, 21, 22].forEach(c => lavaTileMap.add(`${c},8`));
        }

        const terrainSet = (Array.isArray(this.worldData.terrainTiles)) ? new Set(this.worldData.terrainTiles) : null;

        // Render Kolom 0 sampai 35 (Setiap Kolom 50px)
        for (let col = 0; col < totalCols; col++) {
            const cx = col * 50 + 25;
            const inWater = waterTileMap.has(`${col},8`);
            const inLava = lavaTileMap.has(`${col},8`);
            // Jika ada terrainSet, cek apakah ada tanah di baris 8. Jika tidak ada, default ada tanah kecuali di tempat air/lava
            const hasGroundAtCol = terrainSet ? terrainSet.has(`${col},8`) : (!inWater && !inLava);

            // A. ROW 8: PERMUKAAN TANAH / KOLAM AIR / KOLAM LAVA
            if (inWater) {
                // Kolam Air 1x1 Presisi 50x50
                const waterBlock = this.add.rectangle(cx, groundY + 25, 50, 50, 0x0284c7, 0.85).setDepth(5);
                this.physics.add.existing(waterBlock, true);
                this.waterBodies.add(waterBlock);

                // Garis putih tipis ombak atas (3px) persis seperti di preview
                const wave = this.add.rectangle(cx, groundY + 2, 50, 3, 0x7dd3fc, 0.95).setDepth(6);
                this.tweens.add({
                    targets: wave,
                    y: groundY + 4,
                    duration: 750 + (col % 3) * 120,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else if (inLava) {
                // Kolam Lava 1x1 Presisi 50x50
                const lavaBlock = this.add.rectangle(cx, groundY + 25, 50, 50, 0xef4444, 0.95).setDepth(5);
                this.physics.add.existing(lavaBlock, true);
                this.hazards.add(lavaBlock);

                // Garis api oranye di atas permukaan
                this.add.rectangle(cx, groundY + 2, 50, 3, 0xf97316, 0.95).setDepth(6);

                // Gelembung lava kuning emas naik ke atas
                const bubble = this.add.circle(cx, groundY + 12, 3, 0xfbbf24).setDepth(7);
                this.tweens.add({
                    targets: bubble,
                    y: groundY - 4,
                    alpha: 0,
                    duration: 850 + (col * 70) % 500,
                    repeat: -1,
                    ease: 'Sine.easeOut'
                });
            } else if (hasGroundAtCol) {
                // Balok Permukaan Tanah (Row 8: y=400..450)
                const topTile = this.add.rectangle(cx, groundY + 25, 50, 50, dirtColor).setDepth(4);
                this.physics.add.existing(topTile, true);
                this.platforms.add(topTile);

                // Lapisan Rumput / Turf Permukaan (14px)
                this.add.rectangle(cx, groundY + 7, 50, 14, surfaceColor).setDepth(5);
            }

            // B. LAPISAN STRATA BAWAH TANAH (Row 9..10: Subsoil Dirt, Row 11..12: Deep Cavern Slate Stone)
            if (hasGroundAtCol) {
                // Row 9 & 10: Tanah Cokelat Subsoil
                for (let r = 9; r <= 10; r++) {
                    const ry = r * 50 + 25;
                    const subTile = this.add.rectangle(cx, ry, 50, 50, dirtColor).setDepth(3);
                    this.physics.add.existing(subTile, true);
                    this.platforms.add(subTile);

                    // Aksen kerikil tanah halus persis seperti di preview
                    if ((col + r) % 3 === 0) {
                        this.add.rectangle(cx + 4, ry + 6, 8, 5, 0x000000, 0.15).setDepth(4);
                    }
                }

                // Row 11 & 12: Batu Gua Slate Gelap (#1e293b)
                for (let r = 11; r <= 12; r++) {
                    const ry = r * 50 + 25;
                    const stoneTile = this.add.rectangle(cx, ry, 50, 50, stoneColor).setDepth(3);
                    this.physics.add.existing(stoneTile, true);
                    this.platforms.add(stoneTile);

                    // Urat kristal safir biru & bongkahan emas persis seperti di preview
                    if ((col * 7 + r * 13) % 9 === 0) {
                        this.add.circle(cx, ry, 4, 0x38bdf8).setDepth(4);
                    } else if ((col * 3 + r * 11) % 8 === 0) {
                        this.add.rectangle(cx, ry, 6, 6, 0xf59e0b).setDepth(4);
                    }
                }
            } else {
                // PALUNG JURANG DI BAWAH AIR / LAVA / JURANG GALIAN (Persis seperti palung hitam di preview!)
                const chasmBg = this.add.rectangle(cx, groundY + 125, 50, 200, 0x070b12).setDepth(2);
                chasmBg.setStrokeStyle(1, 0x111827, 0.35);
            }

            // C. ROW 13 (y=650..700): BEDROCK TAK TERTEMBUS DI DASAR DUNIA
            const bedrockTile = this.add.rectangle(cx, 13 * 50 + 25, 50, 50, 0x05070a).setDepth(4);
            bedrockTile.setStrokeStyle(1.5, 0x1e293b);
            this.physics.add.existing(bedrockTile, true);
            this.platforms.add(bedrockTile);
        }

        // Blok Tanah Kustom Tambahan (Modular Dirt Tiles pada baris selain baris 8)
        if (terrainSet) {
            terrainSet.forEach(key => {
                const parts = key.split(',');
                const c = parseInt(parts[0], 10);
                const r = parseInt(parts[1], 10);
                if (r !== 8 && !isNaN(c) && !isNaN(r)) {
                    const bx = c * 50 + 25;
                    const by = r * 50 + 25;
                    const dirtTile = this.add.rectangle(bx, by, 50, 50, dirtColor).setDepth(4);
                    this.add.rectangle(bx, by - 18, 50, 14, surfaceColor).setDepth(5);
                    this.physics.add.existing(dirtTile, true);
                    this.platforms.add(dirtTile);
                }
            });
        }

        // Blok Tanah yang Disimpan Sebagai Entitas Dinamis
        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'dirt').forEach(d => {
                const bx = d.col * 50 + 25;
                const r = (d.row !== undefined ? d.row : 8);
                const by = r * 50 + 25;
                const dirtTile = this.add.rectangle(bx, by, 50, 50, dirtColor).setDepth(4);
                this.add.rectangle(bx, by - 18, 50, 14, surfaceColor).setDepth(5);
                this.physics.add.existing(dirtTile, true);
                this.platforms.add(dirtTile);
            });
        }

        // Rintangan Duri (Spikes) - 2 Duri Tajam Berjejer per Petak 1x1 Sesuai Preview
        const spawnSpikes = (col, y = 400) => {
            const px = col * 50;
            const spike1 = this.add.triangle(px + 12.5, y - 14, 0, 28, 12, 0, 24, 28, 0xdc2626).setDepth(6);
            spike1.setStrokeStyle(1.2, 0xfca5a5);
            this.physics.add.existing(spike1, true);
            this.hazards.add(spike1);

            const spike2 = this.add.triangle(px + 37.5, y - 14, 0, 28, 12, 0, 24, 28, 0xdc2626).setDepth(6);
            spike2.setStrokeStyle(1.2, 0xfca5a5);
            this.physics.add.existing(spike2, true);
            this.hazards.add(spike2);
        };

        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'spikes').forEach(sp => {
                const c = (sp.col !== undefined) ? sp.col : Math.floor(sp.x / 50);
                const y = (sp.row !== undefined) ? (sp.row * 50) : groundY;
                spawnSpikes(c, y);
            });
        } else if (this.worldData.hasSpikes) {
            [7, 16, 26].forEach(c => spawnSpikes(c, groundY));
        }

        // Pijakan Melayang (Floating Platforms - Auto-Merged Presisi Sesuai Preview)
        if (hasCustom) {
            const platEntities = this.worldData.entities.filter(e => e.type === 'platforms');
            const platRowMap = new Map();
            platEntities.forEach(p => {
                const r = p.row;
                if (!platRowMap.has(r)) platRowMap.set(r, new Set());
                const w = p.wTiles || 1;
                for (let c = p.col; c < p.col + w; c++) platRowMap.get(r).add(c);
            });

            platRowMap.forEach((colsSet, row) => {
                const sorted = Array.from(colsSet).sort((a, b) => a - b);
                let cur = null;
                const segs = [];
                sorted.forEach(c => {
                    if (!cur) cur = { start: c, end: c };
                    else if (c === cur.end + 1) cur.end = c;
                    else { segs.push(cur); cur = { start: c, end: c }; }
                });
                if (cur) segs.push(cur);

                segs.forEach(seg => {
                    const count = seg.end - seg.start + 1;
                    const pw = count * 50;
                    const px = seg.start * 50 + pw / 2;
                    const py = row * 50 + 9;

                    // Badan Balok Platform
                    const plat = this.add.rectangle(px, py, pw, 18, 0x1e293b).setDepth(6);
                    plat.setStrokeStyle(1.8, surfaceColor);
                    this.physics.add.existing(plat, true);
                    this.platforms.add(plat);

                    // Garis Rumput Permukaan Atas
                    this.add.rectangle(px, py - 7, pw, 3.5, surfaceColor).setDepth(7);

                    // Garis Sambungan Halus Antar Tile jika lebih dari 1 petak
                    if (count > 1) {
                        for (let c = seg.start + 1; c <= seg.end; c++) {
                            const jx = c * 50;
                            const line = this.add.line(0, 0, jx, py - 5, jx, py + 9, 0xffffff, 0.15).setDepth(7);
                        }
                    }
                });
            });

            // Koin Emas
            this.worldData.entities.filter(e => e.type === 'coins').forEach(c => {
                const cx = (c.col !== undefined) ? (c.col * 50 + 25) : c.x;
                const cy = (c.row !== undefined) ? (c.row * 50 + 25) : 375;
                const coin = this.add.circle(cx, cy, 8, 0xf59e0b).setDepth(7);
                coin.setStrokeStyle(1.5, 0xfde047);
                this.physics.add.existing(coin, true);
                this.coins.add(coin);
                this.tweens.add({
                    targets: coin,
                    y: cy - 6,
                    duration: 700,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            });
        } else if (this.worldData.hasPlatforms) {
            const platPositions = [
                { x: 450, y: 300, w: 100 },
                { x: 650, y: 250, w: 100 },
                { x: 900, y: 300, w: 100 },
                { x: 1100, y: 250, w: 100 },
                { x: 1400, y: 300, w: 100 }
            ];

            platPositions.forEach(p => {
                if (p.x < worldWidth - 100) {
                    const plat = this.add.rectangle(p.x, p.y, p.w, 18, 0x1e293b).setDepth(6);
                    plat.setStrokeStyle(1.8, surfaceColor);
                    this.physics.add.existing(plat, true);
                    this.platforms.add(plat);
                }
            });
        }
    }

    // ===============================================================
    // 3. PEMBUATAN KARAKTER PLAYER (DENGAN AUTO-SCALE AKURAT)
    // ===============================================================
    createPlayer() {
        const playerTexture = this.textures.exists('custom_player') ? 'custom_player' : 'skeleton_player';
        
        let spawnX = 125;
        let spawnY = 370;
        if (Array.isArray(this.worldData.entities)) {
            const p = this.worldData.entities.find(e => e.type === 'player');
            if (p) {
                spawnX = (p.col !== undefined) ? (p.col * 50 + 25) : p.x;
                spawnY = (p.row !== undefined) ? (p.row * 50 + 22) : 370;
            }
        }

        this.player = this.physics.add.sprite(spawnX, spawnY, playerTexture).setDepth(15);
        this.player.setCollideWorldBounds(true);

        // Auto-scale jika gambar custom murid agar ukurannya pas (tinggi ~44px)
        if (playerTexture === 'custom_player') {
            const h = this.player.height;
            if (h > 0 && h !== 44) {
                this.player.setScale(44 / h);
            }
        } else {
            this.player.setScale(1);
        }

        // Fisika Karakter & Hitbox Anti-snag
        const pWidth = this.player.displayWidth || 32;
        const pHeight = this.player.displayHeight || 44;
        this.player.body.setSize(Math.max(18, pWidth - 6), pHeight, true);
        this.physics.add.collider(this.player, this.platforms);

        // Collision dengan Hazards (Duri & Lava)
        this.physics.add.overlap(this.player, this.hazards, () => this.handleHazardDamage());

        // Overlap dengan Air (Efek Berenang / Lambat)
        this.physics.add.overlap(this.player, this.waterBodies, () => {
            if (this.player.body.velocity.y > 60) {
                this.player.setVelocityY(60);
            }
        });

        // Ambil Koin
        this.physics.add.overlap(this.player, this.coins, (player, coin) => {
            coin.destroy();
            this.score += 10;
            AudioManager.playCoin();
        });
    }

    // ===============================================================
    // 4. PEMBUATAN MONSTER (SLIME & SKELETON DENGAN VISUAL AKURAT)
    // ===============================================================
    buildMonsters() {
        const hasCustom = Array.isArray(this.worldData.entities) && this.worldData.entities.length > 0;

        // Monster Slime Hijau Bouncy (Melompat lucu di tempat tanpa jatuh ke air)
        const spawnSlime = (x, y = 400) => {
            const smR = 14;
            const smY = y - smR;
            const container = this.add.container(x, smY).setDepth(8);
            const body = this.add.circle(0, 0, smR, 0x22c55e);
            body.setStrokeStyle(1.5, 0x86efac);
            const eyeL = this.add.rectangle(-4, -3, 3, 4, 0xffffff);
            const eyeR = this.add.rectangle(4, -3, 3, 4, 0xffffff);
            container.add([body, eyeL, eyeR]);

            this.physics.add.existing(container);
            container.body.setSize(28, 28);
            container.body.setOffset(-14, -14);
            this.physics.add.collider(container, this.platforms);

            container.startX = x;
            container.patrolRadius = 15;
            container.isSlime = true;
            this.monsters.push(container);

            // Animasi melompat di petak miliknya persis seperti di preview
            this.tweens.add({
                targets: container,
                y: smY - 18,
                duration: 450,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeOut'
            });

            this.physics.add.overlap(this.player, container, () => this.handleHazardDamage());
        };

        // Monster Skeleton (Tengkorak Berjalan dengan Mata Merah Menyala)
        const spawnSkeleton = (x, y = 400) => {
            const skW = 22;
            const skH = 38;
            const skY = y - skH / 2;
            const container = this.add.container(x, skY).setDepth(8);
            const body = this.add.rectangle(0, 0, skW, skH, 0xe2e8f0);
            body.setStrokeStyle(1.5, 0x94a3b8);
            const eyeL = this.add.rectangle(-4, -8, 3, 3, 0xef4444);
            const eyeR = this.add.rectangle(4, -8, 3, 3, 0xef4444);
            container.add([body, eyeL, eyeR]);

            this.physics.add.existing(container);
            container.body.setSize(skW, skH);
            container.body.setOffset(-skW / 2, -skH / 2);
            this.physics.add.collider(container, this.platforms);

            container.body.setVelocityX(-40);
            container.startX = x;
            container.patrolRadius = 30;
            container.isSkeleton = true;
            this.monsters.push(container);

            this.physics.add.overlap(this.player, container, () => this.handleHazardDamage());
        };

        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'slime').forEach(sl => {
                const sx = (sl.col !== undefined) ? (sl.col * 50 + 25) : sl.x;
                spawnSlime(sx);
            });
            this.worldData.entities.filter(e => e.type === 'skeleton').forEach(sk => {
                const skx = (sk.col !== undefined) ? (sk.col * 50 + 25) : sk.x;
                spawnSkeleton(skx);
            });
        } else {
            if (this.worldData.hasSlime) spawnSlime(525);
            if (this.worldData.hasSkeleton) spawnSkeleton(1525);
        }
    }

    // ===============================================================
    // 5. INTERAKSI: NPC & PETI HARTA (ALIGNED DENGAN GRID 50x50 SESUAI PREVIEW)
    // ===============================================================
    buildInteractions() {
        const hasCustom = Array.isArray(this.worldData.entities) && this.worldData.entities.length > 0;

        const spawnNPC = (x, y = 400) => {
            const nw = 24;
            const nh = 38;
            const ny = y - nh / 2;
            const npc = this.add.rectangle(x, ny, nw, nh, 0xa855f7).setDepth(8);
            npc.setStrokeStyle(1.5, 0xd8b4fe);
            this.physics.add.existing(npc, true);
            this.npc = npc;

            this.add.circle(x - 4, ny - 6, 2, 0xfde047).setDepth(9);
            this.add.circle(x + 4, ny - 6, 2, 0xfde047).setDepth(9);

            // Speech bubble [E] mungil persis seperti di preview SceneBuilderModal
            const bubble = this.add.rectangle(x, ny - 24, 20, 12, 0x1e1b4b).setDepth(9);
            bubble.setStrokeStyle(1, 0xc084fc);
            this.add.text(x, ny - 24, '[E]', {
                fontSize: '9px',
                fontStyle: 'bold',
                fill: '#ffffff',
                fontFamily: "'JetBrains Mono', monospace"
            }).setOrigin(0.5).setDepth(10);
        };

        const spawnChest = (x, y = 400) => {
            const ch = 24;
            const cw = 30;
            const cy = y - ch / 2;
            const chest = this.add.rectangle(x, cy, cw, ch, 0xb45309).setDepth(7);
            chest.setStrokeStyle(1.5, 0xfde047);
            this.add.rectangle(x, cy, 4, 4, 0xfde047).setDepth(8);
            this.physics.add.existing(chest, true);

            // Label CHEST di atas peti persis seperti di preview
            this.add.text(x, cy - 16, 'CHEST', {
                fontSize: '9px',
                fontStyle: 'bold',
                fill: '#fbbf24',
                fontFamily: "'JetBrains Mono', monospace"
            }).setOrigin(0.5).setDepth(8);
        };

        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'npc').forEach(n => {
                const nx = (n.col !== undefined) ? (n.col * 50 + 25) : n.x;
                spawnNPC(nx);
            });
            this.worldData.entities.filter(e => e.type === 'chest').forEach(c => {
                const cx = (c.col !== undefined) ? (c.col * 50 + 25) : c.x;
                spawnChest(cx);
            });
        } else {
            if (this.worldData.hasNpc) spawnNPC(325);
            if (this.worldData.hasChest) spawnChest(775);
        }
    }

    // ===============================================================
    // 6. PORTAL KELUAR KE MENU / HUB (PERSIS DENGAN PREVIEW)
    // ===============================================================
    createPortal(worldWidth) {
        let portalX = 1725;
        let portalY = 375;
        if (Array.isArray(this.worldData.entities)) {
            const p = this.worldData.entities.find(e => e.type === 'portal');
            if (p) {
                portalX = (p.col !== undefined) ? (p.col * 50 + 25) : p.x;
                portalY = (p.row !== undefined) ? (p.row * 50 + 25) : 375;
            }
        }

        const portal = this.add.container(portalX, portalY).setDepth(12);
        const ringOuter = this.add.circle(0, 0, 24, 0x000000, 0).setStrokeStyle(2.5, 0x38bdf8);
        const ringInner = this.add.circle(0, 0, 14, 0x000000, 0).setStrokeStyle(2, 0xa855f7);
        const centerDot = this.add.circle(0, 0, 5, 0xe0f2fe);
        const goalText = this.add.text(0, -32, 'GOAL', {
            fontSize: '9px',
            fontStyle: 'bold',
            fill: '#38bdf8',
            fontFamily: "'JetBrains Mono', monospace"
        }).setOrigin(0.5);
        portal.add([ringOuter, ringInner, centerDot, goalText]);

        this.tweens.add({ targets: ringOuter, angle: 360, duration: 4000, repeat: -1 });
        this.tweens.add({ targets: ringInner, angle: -360, duration: 2500, repeat: -1 });

        // Trigger Menang saat sentuh Portal
        const portalSensor = this.add.rectangle(portalX, portalY, 40, 60, 0x000000, 0);
        this.physics.add.existing(portalSensor, true);
        this.physics.add.overlap(this.player, portalSensor, () => {
            if (this.isLevelTransitioning) return;
            this.isLevelTransitioning = true;
            AudioManager.playCoin();

            // Cek apakah scene ini merupakan bagian dari sebuah multi-scene Project
            let nextScene = null;
            let project = null;
            if (this.projectId) {
                project = ProjectManager.getProject(this.projectId);
                if (project && Array.isArray(project.scenes)) {
                    nextScene = ProjectManager.getNextScene(this.projectId, this.sceneId);
                }
            }

            if (nextScene) {
                this.showWorldBanner(`🎉 LEVEL SELESAI! Menuju Level Berikutnya: "${nextScene.name}"...`, '#10b981');
                this.time.delayedCall(1800, () => {
                    this.scene.start('CustomWorldScene', {
                        worldData: nextScene,
                        projectId: this.projectId,
                        sceneId: nextScene.id,
                        hp: this.hp,
                        inventory: this.inventory
                    });
                });
            } else {
                const projTitle = project ? project.name : (this.worldData.name || 'Dunia Kreasiku');
                this.showWorldBanner(`🏆 SELAMAT! Kamu Menyelesaikan Seluruh Project "${projTitle}"!`, '#10b981');
                this.time.delayedCall(2400, () => {
                    this.scene.start('TitleScene');
                });
            }
        });
    }

    // ===============================================================
    // 7. KAMERA FOLLOW DENGAN SMART GROUND CLAMP
    // ===============================================================
    setupCameraFollow() {
        this.cameras.main.setRoundPixels(true);
        this.cameraAnchor = {
            x: this.player ? this.player.x : 125,
            y: 360
        };
        this.cameras.main.startFollow(this.cameraAnchor, true, 0.08, 0.08);
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: 0.85,
            maxZoom: 1.6,
            defaultZoom: 1.0,
            followTarget: this.cameraAnchor
        });
    }

    // ===============================================================
    // 8. HUD & KONTROL INPUT
    // ===============================================================
    setupHUDAndControls() {
        this.htmlHUD = new HTMLGameHUD(this);
        this.dialogBox = new DialogBox(this);
        this.interactPrompt = new HTMLInteractPrompt(this);
        this.inventoryModal = new InventoryModal(this);
        this.settingsModal = new SettingsModal(this, { isGameScene: true });
        this.questModal = new QuestModal(this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            i: Phaser.Input.Keyboard.KeyCodes.I,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown-I', () => this.inventoryModal.toggle());
        this.input.keyboard.on('keydown-ESC', () => this.settingsModal.toggle());
        this.input.keyboard.on('keydown-F4', () => this.openSceneBuilder());
        this.input.keyboard.on('keydown-E', () => {
            if (this.npc && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) < 60) {
                this.dialogBox.showDialogue([
                    `Halo pengelana! Selamat datang di ${this.worldData.name || 'Dunia Kreasimu'}.`,
                    'Hati-hati dengan kolam lahar dan monster yang berpatroli!',
                    'Capai portal di ujung kanan untuk menyelesaikan misi.'
                ]);
            }
        });

        this.createEditorQuickButton();
    }

    createEditorQuickButton() {
        const old = document.getElementById('gt-live-edit-btn');
        if (old) old.remove();

        const btn = document.createElement('button');
        btn.id = 'gt-live-edit-btn';
        btn.innerHTML = '<span>🛠️</span> <span>Edit Scene</span> <span style="font-size: 10px; opacity: 0.7;">[F4]</span>';
        btn.style.position = 'fixed';
        btn.style.top = '48px';
        btn.style.right = '16px';
        btn.style.zIndex = '99995';
        btn.style.background = 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';
        btn.style.border = '1px solid #38bdf8';
        btn.style.color = '#38bdf8';
        btn.style.padding = '6px 14px';
        btn.style.borderRadius = '6px';
        btn.style.fontSize = '12px';
        btn.style.fontWeight = '700';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.transition = 'all 0.15s ease';
        btn.style.fontFamily = "'Jost', sans-serif";

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.background = 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)';
            btn.style.color = '#ffffff';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.background = 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';
            btn.style.color = '#38bdf8';
        });
        btn.addEventListener('click', () => {
            AudioManager.playClick();
            this.openSceneBuilder();
        });

        document.body.appendChild(btn);
        this.events.once('shutdown', () => btn.remove());
        this.events.once('destroy', () => btn.remove());
    }

    openSceneBuilder() {
        if (CommandConsole.instance) {
            CommandConsole.instance.openSceneBuilder();
            if (CommandConsole.instance.sceneBuilderModal) {
                CommandConsole.instance.sceneBuilderModal.loadWorldData(this.worldData);
            }
        }
    }

    // ===============================================================
    // 9. DAMAGE HAZARD (LAVA / DURI / MONSTER)
    // ===============================================================
    handleHazardDamage() {
        if (this.isInvincible || this.isGameOver) return;
        this.isInvincible = true;
        this.hp = Math.max(0, this.hp - 1);
        AudioManager.playHazardHit();

        if (this.htmlHUD) {
            this.htmlHUD.updateHP(this.hp, this.maxHp);
        }

        // Efek kedip merah saat kena hit
        this.player.setTint(0xff0000);
        this.player.setVelocityY(-200);

        if (this.hp <= 0) {
            this.showWorldBanner('💀 Kamu Gugur! Mengulang level...', '#ef4444');
            this.time.delayedCall(1500, () => {
                this.scene.restart({ worldData: this.worldData });
            });
            return;
        }

        this.time.delayedCall(800, () => {
            this.player.clearTint();
            this.isInvincible = false;
        });
    }

    // Banner Floating Notifikasi
    showWorldBanner(text, bgColor = '#0284c7') {
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.top = '70px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.background = '#181818';
        banner.style.border = '1px solid #333333';
        banner.style.borderLeft = `4px solid ${bgColor}`;
        banner.style.color = '#ffffff';
        banner.style.padding = '8px 20px';
        banner.style.borderRadius = '8px';
        banner.style.fontSize = '13.5px';
        banner.style.fontWeight = '700';
        banner.style.fontFamily = "'Jost', sans-serif";
        banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8)';
        banner.style.zIndex = '99999';
        banner.style.pointerEvents = 'none';
        banner.style.transition = 'all 0.3s ease';
        banner.textContent = text;
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => banner.remove(), 400);
        }, 3200);
    }

    update() {
        if (!this.player || !this.player.body || this.isGameOver) return;

        // Kontrol Gerak Karakter
        const speed = 220;
        const left = this.cursors.left.isDown || this.keys.a.isDown;
        const right = this.cursors.right.isDown || this.keys.d.isDown;
        const jump = this.cursors.up.isDown || this.keys.w.isDown || this.keys.space.isDown;

        if (left) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (right) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && this.player.body.blocked.down) {
            this.player.setVelocityY(-420);
            AudioManager.playJump();
        }

        // Update Camera Anchor Smooth Follow
        if (this.cameraAnchor) {
            this.cameraAnchor.x = this.player.x;
            if (this.player.y > 450) {
                this.cameraAnchor.y = this.player.y - 70;
            } else {
                this.cameraAnchor.y = 360;
            }
        }

        // Update Patroli Monster Aman (Terkunci dalam radius patroli agar tidak jatuh ke air)
        this.monsters.forEach(m => {
            if (m && m.body) {
                const rad = m.patrolRadius || 30;
                if (m.x > m.startX + rad) {
                    m.body.setVelocityX(-40);
                } else if (m.x < m.startX - rad) {
                    m.body.setVelocityX(40);
                }
            }
        });
    }
}
