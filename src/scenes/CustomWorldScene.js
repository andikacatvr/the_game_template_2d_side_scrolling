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

export class CustomWorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CustomWorldScene' });
    }

    init(data = {}) {
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

        // Banner Notifikasi Selamat Datang
        this.showWorldBanner(this.worldData.name || 'Dunia Baru');
    }

    // ===============================================================
    // 1. LATAR BELAKANG & LANGIT
    // ===============================================================
    setupSkyAndBackground(worldWidth) {
        let topColor = 0x0284c7;
        let botColor = 0x38bdf8;

        if (this.worldData.timeOfDay === 'sunset') {
            topColor = 0xc2410c;
            botColor = 0xfb923c;
        } else if (this.worldData.timeOfDay === 'night') {
            topColor = 0x050b14;
            botColor = 0x0f172a;
        } else if (this.worldData.biome === 'snow') {
            topColor = 0x0284c7;
            botColor = 0xbae6fd;
        } else if (this.worldData.biome === 'desert') {
            topColor = 0xd97706;
            botColor = 0xfef08a;
        } else if (this.worldData.biome === 'cave') {
            topColor = 0x090d16;
            botColor = 0x1e293b;
        }

        // Latar Belakang Gradien Langit (Sesuai Preview SceneBuilder)
        const bgGraphics = this.add.graphics().setDepth(0).setScrollFactor(0);
        bgGraphics.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
        bgGraphics.fillRect(0, 0, 1920, 1080);

        // Matahari / Bulan dekoratif di langit
        if (this.worldData.biome !== 'cave') {
            const isNight = this.worldData.timeOfDay === 'night';
            const sun = this.add.circle(320, 80, 26, isNight ? 0xf8fafc : 0xfef08a, 0.9).setScrollFactor(0.05).setDepth(1);
            sun.setStrokeStyle(3, isNight ? 0xe2e8f0 : 0xfde047, 0.7);
        }
    }

    // ===============================================================
    // 2. PEMBANGUNAN MEDAN TANAH, AIR & LAVA (100% GRID 50x50 SESUAI PREVIEW)
    // ===============================================================
    buildTerrain(worldWidth) {
        const totalCols = 36;
        const groundRow = 8;
        const groundY = 400;

        // Pilih tekstur tanah berdasarkan biome (Presisi seperti di SceneBuilderModal)
        let surfaceColor = 0x15803d; // Forest rumput hijau
        let subColor = 0x78350f;     // Tanah cokelat
        let stoneColor = 0x334155;   // Deep cavern slate stone

        if (this.worldData.biome === 'snow') {
            surfaceColor = 0xf1f5f9; // Salju putih
            subColor = 0x475569;     // Es beku / tanah abu
            stoneColor = 0x1e293b;
        } else if (this.worldData.biome === 'desert') {
            surfaceColor = 0xf59e0b; // Pasir emas
            subColor = 0xb45309;     // Pasir padat
            stoneColor = 0x292524;
        } else if (this.worldData.biome === 'cave') {
            surfaceColor = 0x374151; // Batuan obsidian
            subColor = 0x1f2937;     // Lapisan tambang
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

        // Render Kolom 0 sampai 35 (Setiap Kolom 50px murni)
        for (let col = 0; col < totalCols; col++) {
            const cx = col * 50 + 25;
            const inWater = waterTileMap.has(`${col},8`);
            const inLava = lavaTileMap.has(`${col},8`);
            const hasGroundAtCol = terrainSet ? terrainSet.has(`${col},8`) : (!inWater && !inLava);

            // A. Row 8: Permukaan Tanah / Kolam
            if (inWater) {
                // Kolam Air 1x1 Presisi 50x50
                const waterBlock = this.add.rectangle(cx, groundY + 25, 50, 50, 0x0284c7, 0.75).setDepth(5);
                this.physics.add.existing(waterBlock, true);
                this.waterBodies.add(waterBlock);

                // Efek ombak air di permukaan
                const wave = this.add.rectangle(cx, groundY + 3, 50, 6, 0x7dd3fc, 0.9).setDepth(6);
                this.tweens.add({
                    targets: wave,
                    y: groundY + 5,
                    duration: 700 + (col % 3) * 150,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else if (inLava) {
                // Kolam Lava 1x1 Presisi 50x50
                const lavaBlock = this.add.rectangle(cx, groundY + 25, 50, 50, 0xef4444, 0.92).setDepth(5);
                lavaBlock.setStrokeStyle(1.5, 0xf97316);
                this.physics.add.existing(lavaBlock, true);
                this.hazards.add(lavaBlock);

                // Permukaan api lava
                this.add.rectangle(cx, groundY + 3, 50, 6, 0xf97316, 0.9).setDepth(6);

                // Gelembung lava berkilau
                const bubble = this.add.circle(cx, groundY + 12, 3.5, 0xfbbf24).setDepth(7);
                this.tweens.add({
                    targets: bubble,
                    y: groundY - 4,
                    alpha: 0,
                    duration: 800 + (col * 80) % 500,
                    repeat: -1,
                    ease: 'Sine.easeOut'
                });
            } else if (hasGroundAtCol) {
                // Balok Permukaan Tanah (Row 8: y=400..450)
                const topTile = this.add.rectangle(cx, groundY + 25, 50, 50, subColor).setDepth(4);
                topTile.setStrokeStyle(1, 0x000000, 0.2);
                this.physics.add.existing(topTile, true);
                this.platforms.add(topTile);

                // Lapisan Rumput / Turf Permukaan (14px)
                const turf = this.add.rectangle(cx, groundY + 7, 50, 14, surfaceColor).setDepth(5);
            }

            // B. Lapisan Bawah Tanah (Row 9..11: Subsoil, Row 12: Stone)
            // Jika tanah di Row 8 dihapus dan bukan air/lava, biarkan tembus bolong (jurang)!
            if (hasGroundAtCol || inWater || inLava) {
                for (let r = 9; r <= 11; r++) {
                    const ry = r * 50 + 25;
                    const subTile = this.add.rectangle(cx, ry, 50, 50, subColor).setDepth(3);
                    subTile.setStrokeStyle(1, 0x000000, 0.15);
                    this.physics.add.existing(subTile, true);
                    this.platforms.add(subTile);
                }

                // Row 12: Slate Stone
                const stoneTile = this.add.rectangle(cx, 12 * 50 + 25, 50, 50, stoneColor).setDepth(3);
                stoneTile.setStrokeStyle(1, 0x000000, 0.2);
                this.physics.add.existing(stoneTile, true);
                this.platforms.add(stoneTile);
            }

            // C. Row 13 (y=650..700): Bedrock Tak Tertembus di Dasar Dunia
            const bedrockTile = this.add.rectangle(cx, 13 * 50 + 25, 50, 50, 0x05070a).setDepth(4);
            bedrockTile.setStrokeStyle(1.5, 0x1e293b);
            this.physics.add.existing(bedrockTile, true);
            this.platforms.add(bedrockTile);
        }

        // Blok Tanah Kustom (Modular Dirt Tiles pada baris selain baris 8)
        if (terrainSet) {
            terrainSet.forEach(key => {
                const parts = key.split(',');
                const c = parseInt(parts[0], 10);
                const r = parseInt(parts[1], 10);
                if (r !== 8 && !isNaN(c) && !isNaN(r)) {
                    const bx = c * 50 + 25;
                    const by = r * 50 + 25;
                    const dirtTile = this.add.rectangle(bx, by, 50, 50, subColor).setDepth(4);
                    dirtTile.setStrokeStyle(1, 0x000000, 0.25);
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
                const dirtTile = this.add.rectangle(bx, by, 50, 50, subColor).setDepth(4);
                dirtTile.setStrokeStyle(1, 0x000000, 0.25);
                this.add.rectangle(bx, by - 18, 50, 14, surfaceColor).setDepth(5);
                this.physics.add.existing(dirtTile, true);
                this.platforms.add(dirtTile);
            });
        }

        // Rintangan Duri (Spikes)
        if (hasCustom) {
            this.worldData.entities.filter(e => e.type === 'spikes').forEach(sp => {
                const spX = (sp.col !== undefined) ? (sp.col * 50 + 25) : sp.x;
                const spY = (sp.row !== undefined) ? (sp.row * 50) : groundY;
                const spike = this.add.triangle(spX, spY - 14, 0, 28, 14, 0, 28, 28, 0xdc2626).setDepth(6);
                spike.setStrokeStyle(1.5, 0xfca5a5);
                this.physics.add.existing(spike, true);
                this.hazards.add(spike);
            });
        } else if (this.worldData.hasSpikes) {
            const spikePositions = [375, 825, 1325];
            spikePositions.forEach(spX => {
                if (spX < worldWidth - 160) {
                    const spike = this.add.triangle(spX, groundY - 14, 0, 28, 14, 0, 28, 28, 0xdc2626).setDepth(6);
                    spike.setStrokeStyle(1.5, 0xfca5a5);
                    this.physics.add.existing(spike, true);
                    this.hazards.add(spike);
                }
            });
        }

        // Pijakan Melayang (Floating Platforms - Auto-Merged)
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
                    if (!cur) {
                        cur = { start: c, end: c };
                    } else if (c === cur.end + 1) {
                        cur.end = c;
                    } else {
                        segs.push(cur);
                        cur = { start: c, end: c };
                    }
                });
                if (cur) segs.push(cur);

                segs.forEach(seg => {
                    const count = seg.end - seg.start + 1;
                    const pw = count * 50;
                    const px = seg.start * 50 + pw / 2;
                    const py = row * 50 + 9;
                    const plat = this.add.rectangle(px, py, pw, 18, 0x1f2937).setDepth(6);
                    plat.setStrokeStyle(2, surfaceColor);
                    this.physics.add.existing(plat, true);
                    this.platforms.add(plat);
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
                    const plat = this.add.rectangle(p.x, p.y, p.w, 18, 0x1f2937).setDepth(6);
                    plat.setStrokeStyle(2, surfaceColor);
                    this.physics.add.existing(plat, true);
                    this.platforms.add(plat);

                    if (this.worldData.hasCoins) {
                        const coin = this.add.circle(p.x, p.y - 20, 8, 0xf59e0b).setDepth(7);
                        coin.setStrokeStyle(1.5, 0xfde047);
                        this.physics.add.existing(coin, true);
                        this.coins.add(coin);
                        this.tweens.add({
                            targets: coin,
                            y: p.y - 26,
                            duration: 700,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
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

        // Auto-scale jika gambar custom murid agar ukurannya pas (tinggi ~44px) dan tidak menutupi layar
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

        const spawnSlime = (x, y = 386) => {
            const container = this.add.container(x, y).setDepth(8);
            const body = this.add.circle(0, 0, 14, 0x22c55e);
            body.setStrokeStyle(1.5, 0x86efac);
            const eyeL = this.add.rectangle(-4, -3, 3, 4, 0xffffff);
            const eyeR = this.add.rectangle(4, -3, 3, 4, 0xffffff);
            const pupilL = this.add.rectangle(-4, -2, 1.5, 2, 0x000000);
            const pupilR = this.add.rectangle(4, -2, 1.5, 2, 0x000000);
            container.add([body, eyeL, eyeR, pupilL, pupilR]);

            this.physics.add.existing(container);
            container.body.setSize(28, 28);
            container.body.setOffset(-14, -14);
            this.physics.add.collider(container, this.platforms);

            container.body.setVelocityX(60);
            container.startX = x;
            container.isSlime = true;
            this.monsters.push(container);

            this.time.addEvent({
                delay: 2000,
                loop: true,
                callback: () => {
                    if (container && container.body && container.body.blocked.down) {
                        container.body.setVelocityY(-180);
                    }
                }
            });

            this.physics.add.overlap(this.player, container, () => this.handleHazardDamage());
        };

        const spawnSkeleton = (x, y = 381) => {
            const container = this.add.container(x, y).setDepth(8);
            const body = this.add.rectangle(0, 0, 22, 38, 0xe2e8f0);
            body.setStrokeStyle(1.5, 0x94a3b8);
            const eyeL = this.add.rectangle(-4, -8, 3, 3, 0xef4444);
            const eyeR = this.add.rectangle(4, -8, 3, 3, 0xef4444);
            container.add([body, eyeL, eyeR]);

            this.physics.add.existing(container);
            container.body.setSize(22, 38);
            container.body.setOffset(-11, -19);
            this.physics.add.collider(container, this.platforms);

            container.body.setVelocityX(-50);
            container.startX = x;
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
    // 5. INTERAKSI: NPC & PETI HARTA (ALIGNED DENGAN GRID 50x50)
    // ===============================================================
    buildInteractions() {
        const hasCustom = Array.isArray(this.worldData.entities) && this.worldData.entities.length > 0;

        const spawnNPC = (x, y = 381) => {
            const npc = this.add.rectangle(x, y, 24, 38, 0xa855f7).setDepth(8);
            npc.setStrokeStyle(1.5, 0xd8b4fe);
            this.physics.add.existing(npc, true);

            this.add.circle(x - 4, y - 10, 2.5, 0xfde047).setDepth(9);
            this.add.circle(x + 4, y - 10, 2.5, 0xfde047).setDepth(9);

            this.add.text(x, y - 28, 'Penjelajah Roh', {
                fontSize: '11px',
                fontStyle: 'bold',
                fill: '#d8b4fe',
                fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(9);
        };

        const spawnChest = (x, y = 388) => {
            const chest = this.add.rectangle(x, y, 30, 24, 0xb45309).setDepth(7);
            chest.setStrokeStyle(2, 0xfde047);
            this.add.rectangle(x, y, 4, 4, 0xfde047).setDepth(8);
            this.physics.add.existing(chest, true);

            this.add.text(x, y - 20, '📦 Peti', {
                fontSize: '10px',
                fontStyle: 'bold',
                fill: '#fbbf24',
                fontFamily: FONT_BODY
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
    // 6. PORTAL KELUAR KE MENU / HUB
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
        this.portalEnd = this.add.container(portalX, portalY).setDepth(12);

        const ring = this.add.circle(0, 0, 24, 0x0284c7, 0.3).setStrokeStyle(2.5, 0x38bdf8);
        const icon = this.add.text(0, 0, 'EXIT', { fontSize: '11px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY }).setOrigin(0.5);
        const label = this.add.text(0, -34, '🌀 Portal Finish', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.portalEnd.add([ring, icon, label]);

        this.tweens.add({
            targets: ring,
            angle: 360,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // Trigger Menang saat sentuh Portal
        const portalSensor = this.add.rectangle(portalX, portalY, 40, 60, 0x000000, 0);
        this.physics.add.existing(portalSensor, true);
        this.physics.add.overlap(this.player, portalSensor, () => {
            this.showWorldBanner('🎉 SELAMAT! Kamu Menyelesaikan Level Ini!', '#10b981');
            AudioManager.playCoin();
            this.time.delayedCall(2000, () => {
                this.scene.start('TitleScene');
            });
        });
    }

    // ===============================================================
    // 7. KAMERA FOLLOW DENGAN SMART GROUND CLAMP
    // ===============================================================
    setupCameraFollow() {
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: 0.85,
            maxZoom: 1.6,
            defaultZoom: 1.0,
            followTarget: this.player
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
        this.input.keyboard.on('keydown-E', () => {
            if (this.npc && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) < 60) {
                this.dialogBox.showDialogue([
                    `Halo pengelana! Selamat datang di ${this.worldData.name || 'Dunia Kreasimu'}.`,
                    'Hati-hati dengan kolam lahar dan monster yang berpatroli!',
                    'Capai portal di ujung kanan untuk menyelesaikan misi.'
                ]);
            }
        });
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

        // Update Patroli Monster
        this.monsters.forEach(m => {
            if (m && m.body) {
                if (m.x > m.startX + 120) {
                    m.body.setVelocityX(-50);
                } else if (m.x < m.startX - 120) {
                    m.body.setVelocityX(50);
                }
            }
        });
    }
}
