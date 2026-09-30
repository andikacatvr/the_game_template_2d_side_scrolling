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
        let skyColor = 0x38bdf8;
        let groundColor = 0x22c55e;

        if (this.worldData.biome === 'snow') {
            skyColor = this.worldData.timeOfDay === 'night' ? 0x070d18 : 0x7dd3fc;
            this.cameras.main.setBackgroundColor(this.worldData.timeOfDay === 'night' ? '#070d18' : '#3b82f6');
        } else if (this.worldData.biome === 'desert') {
            skyColor = 0xf59e0b;
            this.cameras.main.setBackgroundColor(this.worldData.timeOfDay === 'sunset' ? '#9a3412' : '#d97706');
        } else if (this.worldData.biome === 'cave') {
            skyColor = 0x090d16;
            this.cameras.main.setBackgroundColor('#090d16');
        } else {
            // Dirt / Forest
            skyColor = this.worldData.timeOfDay === 'sunset' ? 0xc2410c : 0x0284c7;
            this.cameras.main.setBackgroundColor(this.worldData.timeOfDay === 'sunset' ? '#c2410c' : '#0284c7');
        }

        // Matahari / Bulan dekoratif di langit
        if (this.worldData.biome !== 'cave') {
            const isNight = this.worldData.timeOfDay === 'night';
            const celestial = this.add.circle(280, 80, 28, isNight ? 0xf8fafc : 0xfef08a, 0.9).setScrollFactor(0.05);
            celestial.setStrokeStyle(3, isNight ? 0xe2e8f0 : 0xfde047, 0.7);
        }

    }

    // ===============================================================
    // 2. PEMBANGUNAN MEDAN TANAH, AIR & LAVA
    // ===============================================================
    buildTerrain(worldWidth) {
        const groundY = 416;
        const tileCount = Math.ceil((worldWidth + 128) / 32);

        // Pilih tekstur tanah berdasarkan biome
        let surfaceColor = 0x15803d; // Forest rumput
        let subColor = 0x78350f;     // Tanah cokelat

        if (this.worldData.biome === 'snow') {
            surfaceColor = 0xf1f5f9; // Salju putih
            subColor = 0x334155;     // Es beku
        } else if (this.worldData.biome === 'desert') {
            surfaceColor = 0xf59e0b; // Pasir emas
            subColor = 0xb45309;     // Pasir padat
        } else if (this.worldData.biome === 'cave') {
            surfaceColor = 0x374151; // Batuan obsidian
            subColor = 0x111827;     // Lapisan tambang
        }

        // Zona Bahaya: Kolam Air dan Kolam Lava
        const hasWater = !!this.worldData.hasWater;
        const hasLava = !!this.worldData.hasLava;
        const waterStart = 550;
        const waterEnd = 700;
        const lavaStart = 1000;
        const lavaEnd = 1150;

        for (let i = 0; i < tileCount; i++) {
            const x = -64 + i * 32 + 16;

            // Lewati tanah jika berada di kolam air atau lava
            const inWater = hasWater && x >= waterStart && x <= waterEnd;
            const inLava = hasLava && x >= lavaStart && x <= lavaEnd;

            if (inWater) {
                // Kolam Air
                const waterBlock = this.add.rectangle(x, groundY + 6, 32, 28, 0x0284c7, 0.65).setDepth(5);
                this.physics.add.existing(waterBlock, true);
                this.waterBodies.add(waterBlock);
                continue;
            }

            if (inLava) {
                // Kolam Lava Panas Membara
                const lavaBlock = this.add.rectangle(x, groundY + 6, 32, 28, 0xef4444, 0.9).setDepth(5);
                lavaBlock.setStrokeStyle(1.5, 0xf97316);
                this.physics.add.existing(lavaBlock, true);
                this.hazards.add(lavaBlock);

                // Gelembung lava berkilau
                if (i % 2 === 0) {
                    const bubble = this.add.circle(x, groundY, 4, 0xfbbf24).setDepth(6);
                    this.tweens.add({
                        targets: bubble,
                        y: groundY - 12,
                        alpha: 0,
                        duration: 800 + (x % 300),
                        repeat: -1,
                        ease: 'Sine.easeOut'
                    });
                }
                continue;
            }

            // Lantai Utama
            const topTile = this.add.rectangle(x, groundY, 32, 32, surfaceColor).setDepth(4);
            topTile.setStrokeStyle(1, 0x000000, 0.25);
            this.physics.add.existing(topTile, true);
            this.platforms.add(topTile);

            // Bawah Tanah Solid: Subsoil Dirt -> Deep Cavern Stone -> Bedrock
            const worldHeight = this.worldData.worldHeight || 850;
            const maxSubY = worldHeight - 32;
            for (let dy = 32; groundY + dy <= maxSubY; dy += 32) {
                const curY = groundY + dy;
                let tileColor = subColor;
                if (curY > 650) {
                    tileColor = 0x1e293b; // Deep slate stone
                }
                const subTile = this.add.rectangle(x, curY, 32, 32, tileColor).setDepth(3);
                this.physics.add.existing(subTile, true);
                this.platforms.add(subTile);
            }

            // Bedrock Tak Tertembus di Dasar Dunia
            const bedrockTile = this.add.rectangle(x, worldHeight - 16, 32, 32, 0x05070a).setDepth(4);
            bedrockTile.setStrokeStyle(1.5, 0x1e293b);
            this.physics.add.existing(bedrockTile, true);
            this.platforms.add(bedrockTile);
        }

        // Rintangan Duri (Spikes) jika aktif (Snapped to 50px Grid)
        if (this.worldData.hasSpikes) {
            const spikePositions = [375, 825, 1325]; // Center of Cols 7, 16, 26
            spikePositions.forEach(spX => {
                if (spX < worldWidth - 160) {
                    const spike = this.add.triangle(spX, groundY - 14, 0, 28, 14, 0, 28, 28, 0xdc2626).setDepth(6);
                    spike.setStrokeStyle(1.5, 0xfca5a5);
                    this.physics.add.existing(spike, true);
                    this.hazards.add(spike);
                }
            });
        }

        // Pijakan Melayang (Floating Platforms) jika aktif (Snapped to 50px Grid Lines)
        if (this.worldData.hasPlatforms) {
            const platPositions = [
                { x: 450, y: 300, w: 100 },  // Spans x: 400..500 (Cols 8-10, Row 6)
                { x: 650, y: 250, w: 100 },  // Spans x: 600..700 (Cols 12-14, Row 5, jembatan air)
                { x: 900, y: 300, w: 100 },  // Spans x: 850..950 (Cols 17-19, Row 6)
                { x: 1100, y: 250, w: 100 }, // Spans x: 1050..1150 (Cols 21-23, Row 5, jembatan lava)
                { x: 1400, y: 300, w: 100 }  // Spans x: 1350..1450 (Cols 27-29, Row 6)
            ];

            platPositions.forEach(p => {
                if (p.x < worldWidth - 100) {
                    const plat = this.add.rectangle(p.x, p.y, p.w, 18, 0x1f2937).setDepth(6);
                    plat.setStrokeStyle(2, surfaceColor);
                    this.physics.add.existing(plat, true);
                    this.platforms.add(plat);

                    // Koin emas di atas platform jika aktif
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
    // 3. PEMBUATAN KARAKTER PLAYER
    // ===============================================================
    createPlayer() {
        const playerTexture = this.textures.exists('custom_player') ? 'custom_player' : 'skeleton_player';
        this.player = this.physics.add.sprite(120, 360, playerTexture).setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Fisika Karakter
        this.player.body.setSize(24, 40);
        this.player.body.setOffset(4, 4);

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
    // 4. PEMBUATAN MONSTER (SLIME & SKELETON)
    // ===============================================================
    buildMonsters() {
        // Monster Slime Melompat (Col 10: x=500)
        if (this.worldData.hasSlime) {
            const slimeX = 500;
            const slime = this.physics.add.sprite(slimeX, 390, null).setDepth(8);
            const sG = this.add.graphics();
            sG.fillStyle(0x22c55e, 1);
            sG.fillRoundedRect(-14, -14, 28, 24, 6);
            sG.fillStyle(0xffffff, 1);
            sG.fillRect(-8, -8, 5, 5);
            sG.fillRect(3, -8, 5, 5);
            sG.fillStyle(0x0f172a, 1);
            sG.fillRect(-6, -6, 3, 3);
            sG.fillRect(5, -6, 3, 3);
            slime.add ? slime.add(sG) : null;

            // Simple Slime Body
            const slimeVisual = this.add.rectangle(slimeX, 396, 26, 22, 0x22c55e).setDepth(8);
            slimeVisual.setStrokeStyle(1.5, 0x86efac);
            this.physics.add.existing(slimeVisual);
            this.physics.add.collider(slimeVisual, this.platforms);

            // AI Patroli Slime
            slimeVisual.body.setVelocityX(60);
            slimeVisual.startX = slimeX;
            slimeVisual.isSlime = true;
            this.monsters.push(slimeVisual);

            this.time.addEvent({
                delay: 2000,
                loop: true,
                callback: () => {
                    if (slimeVisual && slimeVisual.body) {
                        slimeVisual.body.setVelocityY(-180);
                    }
                }
            });

            this.physics.add.overlap(this.player, slimeVisual, () => this.handleHazardDamage());
        }

        // Monster Skeleton Berpatroli (Col 30: x=1500)
        if (this.worldData.hasSkeleton) {
            const skelX = 1500;
            const skelVisual = this.add.rectangle(skelX, 390, 26, 38, 0x7f1d1d).setDepth(8);
            skelVisual.setStrokeStyle(1.5, 0xfca5a5);
            this.physics.add.existing(skelVisual);
            this.physics.add.collider(skelVisual, this.platforms);

            skelVisual.body.setVelocityX(-50);
            skelVisual.startX = skelX;
            skelVisual.isSkeleton = true;
            this.monsters.push(skelVisual);

            this.physics.add.overlap(this.player, skelVisual, () => this.handleHazardDamage());
        }
    }

    // ===============================================================
    // 5. INTERAKSI: NPC & PETI HARTA
    // ===============================================================
    buildInteractions() {
        if (this.worldData.hasNpc) {
            const npcX = 300;
            this.npc = this.add.rectangle(npcX, 390, 28, 42, 0xa855f7).setDepth(8);
            this.npc.setStrokeStyle(1.5, 0xd8b4fe);
            this.physics.add.existing(this.npc, true);

            // Eyes
            const eye1 = this.add.circle(npcX - 5, 380, 2.5, 0xfde047).setDepth(9);
            const eye2 = this.add.circle(npcX + 5, 380, 2.5, 0xfde047).setDepth(9);

            // Label Nama
            this.add.text(npcX, 355, 'Penjelajah Roh', {
                fontSize: '11px',
                fontStyle: 'bold',
                fill: '#d8b4fe',
                fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(9);
        }

        if (this.worldData.hasChest) {
            const chestX = 750; // Col 15
            this.chest = this.add.rectangle(chestX, 400, 26, 20, 0xb45309).setDepth(7);
            this.chest.setStrokeStyle(1.5, 0xfde047);
            this.physics.add.existing(this.chest, true);

            this.add.text(chestX, 380, '📦 Peti', {
                fontSize: '10px',
                fontStyle: 'bold',
                fill: '#fbbf24',
                fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(8);
        }
    }

    // ===============================================================
    // 6. PORTAL KELUAR KE MENU / HUB
    // ===============================================================
    createPortal(worldWidth) {
        const portalX = worldWidth - 100;
        const portalY = 376;
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
