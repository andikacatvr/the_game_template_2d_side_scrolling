import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { DisplayManager } from '../utils/DisplayManager.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY, isMobileOrTablet } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CameraZoomManager } from '../utils/CameraZoomManager.js';

// ===============================================================
// DEFINISI SENJATA
// ===============================================================
const WEAPONS = {
    fists: {
        id: 'fists', name: 'Tangan Kosong', icon: '👊',
        textureKey: null, damage: 1, range: 70, attackSpeed: 900,
        color: 0x94a3b8, desc: 'Serangan dasar tanpa senjata.'
    },
    sword: {
        id: 'sword', name: 'Pedang Ksatria', icon: '⚔️',
        textureKey: 'weapon_sword', damage: 2, range: 90, attackSpeed: 650,
        color: 0x60a5fa, desc: 'Pedang tajam. DMG ×2, jangkauan lebih jauh.'
    },
    axe: {
        id: 'axe', name: 'Kapak Besi', icon: '🪓',
        textureKey: 'weapon_axe', damage: 3, range: 75, attackSpeed: 1100,
        color: 0xf97316, desc: 'Kapak berat. DMG ×3 tapi lebih lambat.'
    },
    bow: {
        id: 'bow', name: 'Busur Jarak Jauh', icon: '🏹',
        textureKey: 'weapon_bow', damage: 1, range: 350, attackSpeed: 700,
        color: 0x34d399, desc: 'Panah jarak jauh. Klik mouse ke arah musuh!'
    }
};

// ===============================================================
// 🌋 DUNGEON LEVEL 3: JURANG KEMATIAN & PLATFORM BERDURI
// ===============================================================
export class DungeonScene3 extends Phaser.Scene {
    constructor() {
        super({ key: 'DungeonScene3' });
    }

    init(data = {}) {
        this.startData = data;
        this.hp = data.hp ?? (CONFIG_SKELETON.player.hpMaksimal || 5);
        this.maxHp = data.maxHp ?? (CONFIG_SKELETON.player.hpMaksimal || 5);
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];

        const initWeaponId = data.currentWeaponId || 'bow';
        this.currentWeapon = WEAPONS[initWeaponId] || WEAPONS.bow;

        this.isGameOver = false;
        this.isVictoryOpen = false;
        this.isSettingsOpen = false;
        this._invincible = false;
        this._lastAttackTime = 0;
        this._lastEnemyShootTime = {};

        // Posisi checkpoint default (pulau awal)
        this.lastCheckpoint = { x: 90, y: 370 };
        this.touchState = { left: false, right: false, jump: false };
    }

    create() {
        const WORLD_W = 2200;
        const WORLD_H = 450;

        // 1. Setup Fisika & Kamera
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
        this.physics.world.gravity.y = 650;
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

        // 2. Bangun Lingkungan Map (Pulau-pulau bolong & jurang maut)
        this._buildWorld(WORLD_W, WORLD_H);

        // 3. Bangun Player & Checkpoints
        this._buildPlayer();

        // 4. Bangun Musuh & Boss
        this._buildEnemies();

        // 5. Group Proyektil (Musuh & Player)
        this.enemyProjectiles = this.physics.add.group({ allowGravity: false });
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, proj) => {
            if (proj.active && !this._invincible && !this.isGameOver) {
                proj.destroy();
                this._takeDamage(1, 'Terkena Semburan Api Musuh!');
            }
        });
        this.physics.add.collider(this.enemyProjectiles, this.platforms, (proj) => {
            if (proj && proj.active) {
                this._createBurstEffect(proj.x, proj.y, 0xf97316);
                proj.destroy();
            }
        });

        // 6. Bangun UI, HUD, Modals
        this._buildHUD();
        this._buildBossHealthBar();
        this._buildTouchControls();
        this._buildGameOverModal();
        this._buildVictoryModal();
        this._buildSettingsModal();

        // Inisialisasi Zoom Kamera
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85
        });
        const rightEdge = this.scale.width;
        this.zoomBtnContainer = this.zoomManager.createHUDButton(rightEdge - 76, 26);

        // 7. Kontrol Keyboard & Mouse
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            z: Phaser.Input.Keyboard.KeyCodes.Z,
            x: Phaser.Input.Keyboard.KeyCodes.X,
            e: Phaser.Input.Keyboard.KeyCodes.E
        });

        this.input.keyboard.on('keydown-ESC', () => this._toggleSettings());
        this.input.keyboard.on('keydown-Z', () => this._attackNearestEnemy());
        this.input.keyboard.on('keydown-X', () => this._cycleWeapon());
        this.input.keyboard.on('keydown-E', () => this._handleInteraction());

        // Serang dengan Klik Mouse
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver || this.isVictoryOpen || this.isSettingsOpen) return;
            if (pointer.y < 50) return; // Abaikan klik di area navbar/HUD
            if (this._touchContainer && this._touchContainer.visible && pointer.y > 270) return;
            this._handlePointerAttack(pointer);
        });

        this.input.setDefaultCursor('crosshair');
        this.events.on('shutdown', () => {
            this.input.setDefaultCursor('default');
        });

        this._showToast('DUNGEON LEVEL 3: AWAS JURANG MAUT & DURI DI FLOATING TILES!', 0xf97316);
        this.cameras.main.fadeIn(350, 0, 0, 0);
    }

    // ===============================================================
    // 🗺️ PEMBANGUNAN DUNIA (MAP DENGAN DASAR BOLONG & DURI FLOATING TILES)
    // ===============================================================
    _buildWorld(width, height) {
        const g = this.add.graphics();
        // Latar gelap jurang api vulkanik
        g.fillStyle(0x0c0714, 1);
        g.fillRect(0, 0, width, height);

        // Lapisan kabut magma merah di bagian bawah jurang
        g.fillStyle(0x450a0a, 0.45);
        g.fillRect(0, 360, width, 90);
        g.fillStyle(0x7f1d1d, 0.25);
        g.fillRect(0, 410, width, 40);

        // Stalaktit atas gelap
        for (let x = 20; x < width; x += Phaser.Math.Between(40, 80)) {
            const h = Phaser.Math.Between(25, 75);
            g.fillStyle(0x1e1b2e, 0.85);
            g.fillTriangle(x - 15, 0, x + 15, 0, x, h);
            g.fillStyle(0xef4444, 0.3);
            g.fillCircle(x, h, 2);
        }

        // Pijar lava membubung dari jurang
        for (let i = 0; i < 40; i++) {
            const px = Phaser.Math.Between(20, width - 20);
            const py = Phaser.Math.Between(280, 440);
            const ember = this.add.circle(px, py, Phaser.Math.Between(1, 3), 0xf97316, Phaser.Math.FloatBetween(0.3, 0.8));
            this.tweens.add({
                targets: ember,
                y: py - Phaser.Math.Between(40, 100),
                alpha: 0,
                duration: Phaser.Math.Between(1500, 3000),
                repeat: -1,
                yoyo: false
            });
        }

        // Groups Fisika
        this.platforms = this.physics.add.staticGroup();
        this.hazards = this.physics.add.staticGroup();
        this.movingPlatforms = [];
        this.potionPickups = this.physics.add.group({ allowGravity: false });

        // -------------------------------------------------------------
        // 🧱 PERMUKAAN DASAR BOLONG-BOLONG (ISLAND SEGMENTS)
        // -------------------------------------------------------------
        // Pulau 1: Spawn & Pintu Masuk (x: 0 - 224)
        this._buildGroundSegment(0, 434, 7);
        this._addBrazier(140, 400);

        // --- JURANG 1: x: 224 s/d 380 (156px void) ---
        // Floating platform di atas Jurang 1 dgn DURI DI TENGAH
        this._buildFloatingTileWithSpikes(300, 320, 3, ['mid']);

        // Pulau 2: Ledge Kedua (x: 380 - 540)
        this._buildGroundSegment(380, 434, 5);
        this._addBrazier(460, 400);

        // --- JURANG 2: x: 540 s/d 800 (260px void) ---
        // Floating platform bertingkat dengan duri
        this._buildFloatingTileWithSpikes(620, 310, 3, ['left']);   // Duri di kiri tile
        this._buildFloatingTileWithSpikes(720, 230, 3, ['right']);  // Duri di kanan tile

        // Pulau 3: Pilar Tengah (x: 800 - 960)
        this._buildGroundSegment(800, 434, 5);
        this._addBrazier(880, 400);

        // --- JURANG 3: x: 960 s/d 1340 (380px Great Void) ---
        // Rangkaian floating tiles & moving platform dengan duri
        this._buildFloatingTileWithSpikes(1030, 330, 3, ['mid']);

        // Platform Melayang Bergerak Vertikal (Moving Platform)
        this._buildMovingPlatform(1150, 240, 4, ['left', 'right'], 180, 280, 2400);

        this._buildFloatingTileWithSpikes(1260, 310, 3, ['mid']);

        // Pulau 4: Ledge Keempat (x: 1340 - 1500)
        this._buildGroundSegment(1340, 434, 5);
        this._addBrazier(1420, 400);

        // --- JURANG 4: x: 1500 s/d 1780 (280px void) ---
        // Floating tiles berjenjang ekstrem
        this._buildFloatingTileWithSpikes(1560, 310, 3, ['left']);
        this._buildFloatingTileWithSpikes(1640, 220, 3, ['mid']);
        this._buildFloatingTileWithSpikes(1720, 290, 3, ['right']);

        // Pulau 5: Arena Boss & Altar Portal Keluar (x: 1780 - 2200)
        this._buildGroundSegment(1780, 434, 14);
        this._addBrazier(1840, 400);
        this._addBrazier(2020, 400);

        // Penanda Checkpoints Visual
        this.checkpoints = [
            { x: 90,   y: 380, name: 'Awal Penjelajahan' },
            { x: 440,  y: 380, name: 'Pilar Batu Kedua' },
            { x: 860,  y: 380, name: 'Pilar Perlindungan' },
            { x: 1400, y: 380, name: 'Gerbang Sebelum Arena' },
            { x: 1840, y: 380, name: 'Sanctuary Boss' }
        ];

        // Label Info Atas
        this.add.text(400, 46, 'DUNGEON LEVEL 3 — JURANG KEMATIAN', {
            fontSize: '16px', fontStyle: 'bold', fill: '#f97316', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);
        this.add.text(400, 70, 'Lompat tepat di floating tiles! Awas duri tajam & jurang maut!', {
            fontSize: '11px', fontStyle: 'bold', fill: '#fed7aa', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);

        // Pintu Kembali ke Level 2 (kiri)
        this.doorBack = this.physics.add.staticSprite(50, 395, 'skeleton_portal').setTint(0x94a3b8);
        this.promptBack = this.add.container(50, 345).setDepth(25).setVisible(false);
        const pbPill = this.add.rectangle(0, 0, 100, 20, 0x1e293b, 0.95).setStrokeStyle(1.5, 0x94a3b8);
        const pbTxt = this.add.text(0, 0, '[E] Level 2', { fontSize: '10px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptBack.add([pbPill, pbTxt]);
        pbPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._backToLevel2());

        // Pintu Keluar Utama (kanan)
        this.exitPortal = this.physics.add.staticSprite(2120, 395, 'skeleton_portal').setTint(0xfacc15);
        this.tweens.add({ targets: this.exitPortal, scaleX: 1.1, scaleY: 1.1, alpha: 0.85, yoyo: true, repeat: -1, duration: 800 });
        this._exitPrompt = this.add.container(2120, 345).setDepth(25).setVisible(false);
        const ep1 = this.add.rectangle(0, 0, 110, 20, 0x450a0a, 0.95).setStrokeStyle(1.5, 0xfacc15);
        const ep2 = this.add.text(0, 0, '[E] Selesai Lvl 3', { fontSize: '10px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_BODY }).setOrigin(0.5);
        this._exitPrompt.add([ep1, ep2]);
        ep1.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._tryExit());

        // Pickup Pemulihan HP di Pulau 3
        this._buildPotionPickup(880, 395);
    }

    _buildGroundSegment(startX, y, count) {
        for (let i = 0; i < count; i++) {
            const t = this.platforms.create(startX + 16 + i * 32, y, 'tile_dirt_sub');
            t.setTint(0x7f1d1d);
            t.refreshBody();
        }
    }

    // Bangun floating platform dan tancapkan duri langsung di atas tiles-nya!
    _buildFloatingTileWithSpikes(centerX, y, count, spikePositions = []) {
        const startX = centerX - ((count - 1) * 32) / 2;
        for (let i = 0; i < count; i++) {
            const px = startX + i * 32;
            const key = (i === 0) ? 'tile_plat_left' : (i === count - 1) ? 'tile_plat_right' : 'tile_plat_mid';
            const platTile = this.platforms.create(px, y, key);
            platTile.setTint(0xf87171);
            platTile.refreshBody();

            // Pasang duri langsung di atas floating tile jika posisi cocok
            const isLeft = (i === 0 && spikePositions.includes('left'));
            const isRight = (i === count - 1 && spikePositions.includes('right'));
            const isMid = (i > 0 && i < count - 1 && spikePositions.includes('mid'));

            if (isLeft || isRight || isMid) {
                // Posisi tepat di permukaan atas floating tile (y - 20)
                const spike = this.hazards.create(px, y - 20, 'skeleton_hazard');
                spike.setTint(0xff3333);
                spike.refreshBody();
            }
        }
    }

    // Platform bergerak vertikal dengan duri di platform-nya
    _buildMovingPlatform(centerX, startY, count, spikePositions, minY, maxY, duration) {
        const startX = centerX - ((count - 1) * 32) / 2;
        const tiles = [];
        const spikes = [];

        for (let i = 0; i < count; i++) {
            const px = startX + i * 32;
            const key = (i === 0) ? 'tile_plat_left' : (i === count - 1) ? 'tile_plat_right' : 'tile_plat_mid';
            const t = this.physics.add.image(px, startY, key).setTint(0xf97316);
            t.setImmovable(true);
            t.body.setAllowGravity(false);
            tiles.push(t);

            const isLeft = (i === 0 && spikePositions.includes('left'));
            const isRight = (i === count - 1 && spikePositions.includes('right'));
            const isMid = (i > 0 && i < count - 1 && spikePositions.includes('mid'));

            if (isLeft || isRight || isMid) {
                const s = this.physics.add.image(px, startY - 20, 'skeleton_hazard').setTint(0xff2222);
                s.setImmovable(true);
                s.body.setAllowGravity(false);
                spikes.push(s);
            }
        }

        // Animasi gerak naik-turun menggunakan tween
        const target = { y: startY };
        this.tweens.add({
            targets: target,
            y: maxY,
            duration: duration / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                tiles.forEach(t => {
                    t.y = target.y;
                    t.body.updateFromGameObject();
                });
                spikes.forEach(s => {
                    s.y = target.y - 20;
                    s.body.updateFromGameObject();
                });
            }
        });

        this.movingPlatforms.push({ tiles, spikes });
    }

    _addBrazier(x, y) {
        const g = this.add.graphics();
        g.fillStyle(0x27272a, 1);
        g.fillRect(x - 5, y, 10, 22);
        g.fillStyle(0x71717a, 1);
        g.fillTriangle(x - 10, y, x + 10, y, x, y + 8);
        const flame = this.add.text(x, y - 4, '🔥', { fontSize: '15px' }).setOrigin(0.5);
        this.tweens.add({ targets: flame, scaleX: 1.25, scaleY: 0.85, yoyo: true, repeat: -1, duration: 240 });
    }

    _buildPotionPickup(x, y) {
        const pot = this.potionPickups.create(x, y, 'skeleton_item').setTint(0x22c55e);
        pot.body.setAllowGravity(false);
        const lbl = this.add.text(x, y - 22, '+2 HP', {
            fontSize: '9px', fontStyle: 'bold', fill: '#86efac',
            backgroundColor: '#0f172acc', padding: { x: 4, y: 2 }, fontFamily: FONT_BODY
        }).setOrigin(0.5);
        pot.lbl = lbl;
        this.tweens.add({ targets: [pot, lbl], y: '-=6', yoyo: true, repeat: -1, duration: 700 });
    }

    // ===============================================================
    // 👤 PLAYER & KONTROL
    // ===============================================================
    _buildPlayer() {
        this.player = this.physics.add.sprite(90, 370, 'skeleton_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(140, 70);

        // Sentuhan duri statis
        this.physics.add.overlap(this.player, this.hazards, (player, hazard) => {
            if (!this._invincible && !this.isGameOver) {
                this._takeDamage(1, 'Tertusuk Duri di Platform!');
                // Sedikit terpental menjauh dari duri
                const pushDir = player.x < hazard.x ? -140 : 140;
                player.setVelocityX(pushDir);
                player.setVelocityY(-200);
            }
        });

        // Collider player dengan tiles bergerak & duri bergerak
        if (this.movingPlatforms) {
            this.movingPlatforms.forEach(mp => {
                mp.tiles.forEach(t => {
                    this.physics.add.collider(this.player, t);
                });
                mp.spikes.forEach(s => {
                    this.physics.add.overlap(this.player, s, () => {
                        if (!this._invincible && !this.isGameOver) {
                            this._takeDamage(1, 'Tertusuk Duri di Moving Platform!');
                        }
                    });
                });
            });
        }

        // Overlap player dengan pickup potion
        if (this.potionPickups) {
            this.physics.add.overlap(this.player, this.potionPickups, (player, pot) => {
                if (this.hp < this.maxHp) {
                    this.hp = Math.min(this.maxHp, this.hp + 2);
                    this._updateHPDisplay();
                    this._showToast('Memulihkan 2 Darah!', 0x22c55e);
                    AudioManager.playSuccess && AudioManager.playSuccess();
                    if (pot.lbl) pot.lbl.destroy();
                    pot.destroy();
                } else {
                    this._showToast('Darah kamu sudah penuh!', 0x38bdf8);
                }
            });
        }

        if (this.currentWeapon.id !== 'fists') {
            this._equipWeapon(this.currentWeapon);
        }
    }

    // ===============================================================
    // 👹 MUSUH & FINAL BOSS
    // ===============================================================
    _buildEnemies() {
        this.enemies = this.physics.add.group();

        // 1. Guard di Pulau 2 (x: 460)
        this._createEnemy('sentry1', 460, 370, 'Prajurit Bayangan', 4, 'melee', 400, 520);

        // 2. Pyromancer Ranged di Pulau 3 (x: 880)
        this._createEnemy('mage1', 880, 370, 'Pyromancer Abyss', 4, 'ranged', 820, 940);

        // 3. Dread Knight di Pulau 4 (x: 1420)
        this._createEnemy('knight1', 1420, 370, 'Ksatria Neraka', 6, 'melee', 1360, 1480);

        // 4. 🔥 FINAL BOSS: ARCHDEMON ABYSS di Pulau 5 (x: 1960)
        this.boss = this.physics.add.sprite(1960, 350, 'dungeon_enemy').setDepth(10);
        this.boss.setScale(1.6);
        this.boss.setTint(0xff1111);
        this.boss.setCollideWorldBounds(true);
        this.physics.add.collider(this.boss, this.platforms);

        this.boss.id = 'archdemon_boss';
        this.boss.enemyName = 'ARCHDEMON OF THE ABYSS';
        this.boss.maxHp = 18;
        this.boss.hp = 18;
        this.boss.type = 'boss';
        this.boss.patrolMin = 1840;
        this.boss.patrolMax = 2080;
        this.boss.direction = -1;
        this.boss.patrolSpeed = 45;
        this.boss.shootInterval = 2200;
        this.boss.isDead = false;

        this.boss.hpBar = this.add.graphics().setDepth(15);
        this.boss.nameTag = this.add.text(1960, 300, 'ARCHDEMON (BOSS)', {
            fontSize: '11px', fontStyle: 'bold', fill: '#f87171', backgroundColor: '#000000aa', padding: { x: 4, y: 1 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(15);

        this.enemies.add(this.boss);

        // Tabrakan kontak musuh melee ke player
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.isDead && !this._invincible && !this.isGameOver) {
                const dmg = enemy.type === 'boss' ? 2 : 1;
                this._takeDamage(dmg, `Terhantam ${enemy.enemyName}!`);
                const knockDir = player.x < enemy.x ? -160 : 160;
                player.setVelocityX(knockDir);
            }
        });
    }

    _createEnemy(id, x, y, name, hp, type, patrolMin, patrolMax) {
        const tex = type === 'ranged' ? 'dungeon_mage' : 'dungeon_enemy';
        const e = this.physics.add.sprite(x, y, tex).setDepth(10);
        e.setCollideWorldBounds(true);
        this.physics.add.collider(e, this.platforms);

        e.id = id;
        e.enemyName = name;
        e.maxHp = hp;
        e.hp = hp;
        e.type = type;
        e.patrolMin = patrolMin;
        e.patrolMax = patrolMax;
        e.direction = 1;
        e.patrolSpeed = type === 'ranged' ? 30 : 60;
        e.shootInterval = 2500;
        e.isDead = false;

        e.hpBar = this.add.graphics().setDepth(15);
        e.nameTag = this.add.text(x, y - 35, name, {
            fontSize: '9px', fontStyle: 'bold', fill: type === 'ranged' ? '#f472b6' : '#fca5a5',
            backgroundColor: '#00000088', padding: { x: 3, y: 1 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(15);

        this.enemies.add(e);
        return e;
    }

    // ===============================================================
    // ⚔️ SISTEM SERANGAN PLAYER
    // ===============================================================
    _handlePointerAttack(pointer) {
        const now = this.time.now;
        if (now - this._lastAttackTime < this.currentWeapon.attackSpeed) return;
        this._lastAttackTime = now;

        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const dx = worldPoint.x - this.player.x;
        const dy = worldPoint.y - this.player.y;

        // Hadapkan player ke arah tembakan/klik mouse
        if (dx < 0) this.player.setFlipX(true);
        else if (dx > 0) this.player.setFlipX(false);

        if (this.currentWeapon.id === 'bow') {
            this._fireArrowTowards(worldPoint.x, worldPoint.y);
        } else {
            this._meleeAttackTowards(worldPoint.x, worldPoint.y);
        }
    }

    _fireArrowTowards(targetX, targetY) {
        AudioManager.playShoot && AudioManager.playShoot();
        const startX = this.player.x + (this.player.flipX ? -16 : 16);
        const startY = this.player.y;

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        const arrow = this.physics.add.sprite(startX, startY, 'proj_arrow').setDepth(14);
        arrow.body.setAllowGravity(false);
        arrow.setRotation(angle);

        const speed = 440;
        arrow.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        this.physics.add.overlap(arrow, this.enemies, (arr, enemy) => {
            if (arr.active && !enemy.isDead) {
                arr.destroy();
                this._damageEnemy(enemy, this.currentWeapon.damage);
            }
        });

        this.physics.add.collider(arrow, this.platforms, (arr) => {
            if (arr.active) {
                this._createBurstEffect(arr.x, arr.y, 0x94a3b8);
                arr.destroy();
            }
        });

        this.time.delayedCall(1200, () => {
            if (arrow.active) arrow.destroy();
        });
    }

    _meleeAttackTowards(targetX, targetY) {
        AudioManager.playSlash && AudioManager.playSlash();
        const startX = this.player.x + (this.player.flipX ? -24 : 24);
        const startY = this.player.y;

        const slash = this.add.sprite(startX, startY, 'fx_slash').setDepth(14);
        slash.setFlipX(this.player.flipX);
        this.tweens.add({
            targets: slash, alpha: 0, scaleX: 1.3, scaleY: 1.3, duration: 180,
            onComplete: () => slash.destroy()
        });

        // Cek musuh di area jangkauan
        const range = this.currentWeapon.range;
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.isDead) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            const inFront = this.player.flipX ? (enemy.x < this.player.x) : (enemy.x > this.player.x);
            if (dist <= range && inFront) {
                this._damageEnemy(enemy, this.currentWeapon.damage);
            }
        });
    }

    _attackNearestEnemy() {
        if (!this.enemies) return;
        let nearest = null;
        let minDist = 9999;
        this.enemies.getChildren().forEach(e => {
            if (e.isDead) return;
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });

        if (nearest) {
            this._handlePointerAttack({ x: nearest.x - this.cameras.main.scrollX, y: nearest.y - this.cameras.main.scrollY });
        } else {
            const fakeX = this.player.flipX ? this.player.x - 100 : this.player.x + 100;
            this._handlePointerAttack({ x: fakeX - this.cameras.main.scrollX, y: this.player.y - this.cameras.main.scrollY });
        }
    }

    _damageEnemy(enemy, amount) {
        if (enemy.isDead) return;
        enemy.hp = Math.max(0, enemy.hp - amount);
        this._showDamageNumber(enemy.x, enemy.y - 20, `-${amount}`, 0xffffff);
        this._flashTarget(enemy);
        AudioManager.playHit && AudioManager.playHit();

        if (enemy.hp <= 0) {
            this._killEnemy(enemy);
        }
    }

    _killEnemy(enemy) {
        enemy.isDead = true;
        enemy.setVelocity(0, 0);
        enemy.body.enable = false;
        enemy.hpBar?.clear();
        enemy.nameTag?.destroy();

        this._createBurstEffect(enemy.x, enemy.y, 0xef4444);
        this.tweens.add({
            targets: enemy, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300,
            onComplete: () => {
                enemy.destroy();
                this._updateEnemyCount();
                if (enemy.id === 'archdemon_boss') {
                    this._onBossDefeated();
                }
            }
        });
    }

    _onBossDefeated() {
        this._showToast('ARCHDEMON TELAH DIKALAHKAN! PINTU LEVEL 3 TERBUKA!', 0xfacc15);
        AudioManager.playSuccess && AudioManager.playSuccess();
        if (this._bossHUD) this._bossHUD.setVisible(false);

        // Efek kembang api kemenangan di altar
        for (let i = 0; i < 15; i++) {
            this.time.delayedCall(i * 120, () => {
                this._createBurstEffect(Phaser.Math.Between(2000, 2160), Phaser.Math.Between(250, 380), 0xfacc15);
            });
        }
    }

    _equipWeapon(weapon) {
        this.currentWeapon = weapon;
        if (this._weaponSprite) this._weaponSprite.destroy();

        if (weapon.textureKey) {
            this._weaponSprite = this.add.sprite(this.player.x, this.player.y, weapon.textureKey).setDepth(11);
        }
        this._updateWeaponHUD();
    }

    _cycleWeapon() {
        const owned = ['fists', 'sword', 'axe', 'bow'];
        const list = owned.map(id => WEAPONS[id]);
        const curIdx = list.findIndex(w => w.id === this.currentWeapon.id);
        const next = list[(curIdx + 1) % list.length];
        this._equipWeapon(next);
        this._showToast(`Ganti Senjata: ${next.name}`, next.color);
    }

    // ===============================================================
    // 💔 DAMAGE, PIT FALL, & CHECKPOINTS
    // ===============================================================
    _handleFallIntoPit() {
        if (this.isGameOver) return;
        this.cameras.main.shake(250, 0.015);
        this.cameras.main.flash(200, 220, 38, 38);
        this._takeDamage(1, 'Terjatuh ke Jurang Maut!');

        if (this.hp > 0) {
            // Respawn ke checkpoint terdekat yang aman
            this.player.setPosition(this.lastCheckpoint.x, this.lastCheckpoint.y - 15);
            this.player.setVelocity(0, 0);
            this._invincible = true;
            this.tweens.add({
                targets: this.player, alpha: 0.3, yoyo: true, repeat: 4, duration: 100,
                onComplete: () => { this.player.setAlpha(1); this._invincible = false; }
            });
        }
    }

    _takeDamage(amount, msg = 'Kena Serangan!') {
        if (this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this._updateHPDisplay();
        this._showToast(msg, 0xef4444);
        AudioManager.playHurt && AudioManager.playHurt();

        if (this.hp <= 0) {
            this._triggerGameOver();
            return;
        }

        this._invincible = true;
        this.tweens.add({
            targets: this.player, alpha: 0.3, yoyo: true, repeat: 4, duration: 100,
            onComplete: () => { this.player.setAlpha(1); this._invincible = false; }
        });
    }

    // ===============================================================
    // 🖥️ HUD & MODALS
    // ===============================================================
    _buildHUD() {
        this._hudContainer = this.add.container(16, 13).setDepth(30).setScrollFactor(0);
        const hpBg = this.add.rectangle(67, 13, 134, 26, 0x0f172a, 0.9);
        const hpLabel = this.add.text(8, 4, 'HP', { fontSize: '11px', fontStyle: 'bold', fill: '#f43f5e', fontFamily: FONT_TITLE });
        this._hpHearts = [];
        for (let i = 0; i < this.maxHp; i++) {
            this._hpHearts.push(this.add.text(32 + i * 22, 4, '❤️', { fontSize: '14px' }));
        }
        this._hpNumText = this.add.text(102, 5, `${this.hp}/${this.maxHp}`, {
            fontSize: '11px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
        });
        this._hudContainer.add([hpBg, hpLabel, ...this._hpHearts, this._hpNumText]);
        this._updateHPDisplay();

        this._enemyCountText = this.add.text(400, 18, '', {
            fontSize: '11px', fontStyle: 'bold', fill: '#f97316', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
        this._updateEnemyCount();

        // Tombol menu (kanan atas, menempel tepi kanan)
        const rightEdge = this.scale.width;
        const menuBg = this.add.rectangle(rightEdge - 24, 26, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b).setScrollFactor(0).setDepth(30).setInteractive({ useHandCursor: true });
        this.add.text(rightEdge - 24, 26, '⚙️', { fontSize: '16px' }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
        menuBg.on('pointerdown', () => this._toggleSettings());

        this._buildWeaponHUDPanel();
    }

    _buildBossHealthBar() {
        this._bossHUD = this.add.container(400, 36).setDepth(29).setScrollFactor(0).setVisible(false);
        const bg = this.add.rectangle(0, 0, 260, 18, 0x1f1313, 0.9).setStrokeStyle(1.5, 0xef4444);
        this._bossHpBarG = this.add.graphics();
        const lbl = this.add.text(0, -14, 'ARCHDEMON OF THE ABYSS', {
            fontSize: '10px', fontStyle: 'bold', fill: '#fca5a5', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this._bossHUD.add([bg, this._bossHpBarG, lbl]);
    }

    _updateBossHealthBar() {
        if (!this.boss || this.boss.isDead || !this._bossHUD) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
        if (dist < 600) {
            this._bossHUD.setVisible(true);
            this._bossHpBarG.clear();
            const pct = Math.max(0, this.boss.hp / this.boss.maxHp);
            this._bossHpBarG.fillStyle(0xef4444, 1);
            this._bossHpBarG.fillRect(-126, -7, 252 * pct, 14);
        } else {
            this._bossHUD.setVisible(false);
        }
    }

    _buildWeaponHUDPanel() {
        this._wHUDContainer = this.add.container(16, 410).setDepth(30).setScrollFactor(0);
        this._wHUDBg = this.add.rectangle(0, 0, 230, 32, 0x0f172a, 0.88).setStrokeStyle(1.5, 0xf97316).setOrigin(0, 0.5);
        this._wHUDIcon = this.add.text(14, 0, this.currentWeapon.icon, { fontSize: '16px' }).setOrigin(0.5);
        this._wHUDName = this.add.text(32, -7, this.currentWeapon.name, { fontSize: '11px', fontStyle: 'bold', fill: '#fed7aa', fontFamily: FONT_BODY });
        this._wHUDStats = this.add.text(32, 5, `DMG: ${this.currentWeapon.damage}  |  [X] Ganti  |  Klik Mouse: Serang`, { fontSize: '9px', fill: '#fdba74', fontFamily: FONT_BODY });
        this._wHUDContainer.add([this._wHUDBg, this._wHUDIcon, this._wHUDName, this._wHUDStats]);
    }

    _updateWeaponHUD() {
        if (!this._wHUDIcon) return;
        const w = this.currentWeapon;
        const hexC = '#' + w.color.toString(16).padStart(6, '0');
        this._wHUDIcon.setText(w.icon);
        this._wHUDName.setText(w.name).setFill(hexC);
        this._wHUDStats.setText(`DMG: ${w.damage}  |  [X] Ganti  |  Klik Mouse: Serang`);
        this._wHUDBg.setStrokeStyle(1.5, w.color);
    }

    _updateHPDisplay() {
        if (this._hpHearts) {
            for (let i = 0; i < this.maxHp; i++) {
                if (this._hpHearts[i]) {
                    this._hpHearts[i].setText(i < this.hp ? '❤️' : '🖤');
                    this._hpHearts[i].setAlpha(i < this.hp ? 1 : 0.35);
                }
            }
        }
        if (this._hpNumText) this._hpNumText.setText(`${this.hp}/${this.maxHp}`);
    }

    _updateEnemyCount() {
        if (!this._enemyCountText || !this.enemies) return;
        const alive = this.enemies.getChildren().filter(e => !e.isDead && e.active).length;
        this._enemyCountText.setText(`Musuh Tersisa: ${alive}`);
    }

    _buildGameOverModal() {
        const D = 70, cx = this.scale ? this.scale.width / 2 : 400, cy = this.scale ? this.scale.height / 2 : 225;
        this._goElements = [];
        const mk = (obj) => { obj.setScrollFactor(0).setDepth(D).setVisible(false); this._goElements.push(obj); return obj; };

        mk(this.add.rectangle(cx, cy, 4000, 4000, 0x000000, 0.88));
        mk(this.add.rectangle(cx, cy, 480, 270, 0x1f1010, 0.98).setStrokeStyle(2.5, 0xef4444));
        mk(this.add.text(cx, cy - 78, '☠️', { fontSize: '34px' }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 34, 'GAME OVER', { fontSize: '32px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE }).setOrigin(0.5));
        mk(this.add.text(cx, cy + 6, 'Kamu tewas di Jurang Kematian! Perhatikan pijakan floating tiles!', { fontSize: '12px', fill: '#fca5a5', fontFamily: FONT_BODY }).setOrigin(0.5));

        const restartL3 = () => this.scene.restart({ ...this.startData, hp: this.maxHp });
        const r1 = mk(this.add.rectangle(cx, cy + 56, 240, 36, 0x2563eb, 0.95).setStrokeStyle(1.5, 0x60a5fa).setInteractive({ useHandCursor: true }));
        const r1t = mk(this.add.text(cx, cy + 56, 'Coba Lagi (Level 3)', { fontSize: '12px', fontStyle: 'bold', fill: '#fff', fontFamily: FONT_BODY }).setOrigin(0.5));
        r1.on('pointerdown', restartL3);
        r1t.setInteractive({ useHandCursor: true }).on('pointerdown', restartL3);

        const toTitle = () => { AudioManager.stopAmbientBGM?.(); this.scene.start('TitleScene'); };
        const r2 = mk(this.add.rectangle(cx, cy + 102, 240, 34, 0x1e293b, 1).setStrokeStyle(1.5, 0x64748b).setInteractive({ useHandCursor: true }));
        const r2t = mk(this.add.text(cx, cy + 102, 'Kembali ke Menu Utama', { fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5));
        r2.on('pointerdown', toTitle);
        r2t.setInteractive({ useHandCursor: true }).on('pointerdown', toTitle);
    }

    _buildVictoryModal() {
        const D = 70, cx = this.scale ? this.scale.width / 2 : 400, cy = this.scale ? this.scale.height / 2 : 225;
        this._vicElements = [];
        const mk = (obj) => { obj.setScrollFactor(0).setDepth(D).setVisible(false); this._vicElements.push(obj); return obj; };

        mk(this.add.rectangle(cx, cy, 4000, 4000, 0x000000, 0.88));
        mk(this.add.rectangle(cx, cy, 480, 220, 0x180909, 0.98).setStrokeStyle(2.5, 0xfacc15));
        mk(this.add.text(cx, cy - 68, '👑', { fontSize: '38px' }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 28, 'DUNGEON LEVEL 3 TAKLUK!', { fontSize: '22px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_TITLE }).setOrigin(0.5));
        mk(this.add.text(cx, cy + 8, 'Hebat sekali! Rintangan jurang maut dan duri berhasil kamu taklukkan!\nArchdemon berhasil dihancurkan!', {
            fontSize: '12px', fill: '#fed7aa', align: 'center', wordWrap: { width: 440 }, lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5));

        const toTitle = () => { AudioManager.stopAmbientBGM?.(); this.scene.start('TitleScene'); };
        const v4 = mk(this.add.rectangle(cx, cy + 58, 220, 36, 0x1e293b, 1).setStrokeStyle(1.5, 0x64748b).setInteractive({ useHandCursor: true }));
        const v4t = mk(this.add.text(cx, cy + 58, 'Menu Utama', { fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY }).setOrigin(0.5));
        v4.on('pointerdown', toTitle);
        v4.on('pointerover', () => v4.setFillStyle(0x334155, 1));
        v4.on('pointerout',  () => v4.setFillStyle(0x1e293b, 1));
        v4t.setInteractive({ useHandCursor: true });
        v4t.on('pointerdown', toTitle);
        v4t.on('pointerover', () => v4.setFillStyle(0x334155, 1));
        v4t.on('pointerout',  () => v4.setFillStyle(0x1e293b, 1));
    }

    _buildSettingsModal() {
        this._settingsModal = new SettingsModal(this, {
            isGameScene: true,
            onSaveGame: () => { SaveManager.save({ hp: this.hp, maxHp: this.maxHp, inventory: this.inventory }); this._showToast('Tersimpan!', 0x22c55e); },
            onToMenu: () => { this.scene.start('TitleScene'); }
        });
    }

    _buildTouchControls() {
        this._touchContainer = this.add.container(0, 0).setDepth(30).setScrollFactor(0);
        this.touchControlsEnabled = isMobileOrTablet();
        try {
            const saved = localStorage.getItem('template_touch_controls');
            if (saved !== null) this.touchControlsEnabled = saved === 'true';
        } catch (e) {}
        this._touchContainer.setVisible(this.touchControlsEnabled);

        const mkBtn = (x, y, label, dn, up) => {
            const bg = this.add.rectangle(x, y, 56, 46, 0x0f172a, 0.85).setStrokeStyle(2, 0x475569).setInteractive();
            const txt = this.add.text(x, y, label, { fontSize: '20px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY }).setOrigin(0.5);
            bg.on('pointerdown', dn).on('pointerup', up).on('pointerout', up);
            this._touchContainer.add([bg, txt]);
        };

        mkBtn(62, 390, '◀', () => { this.touchState.left = true; }, () => { this.touchState.left = false; });
        mkBtn(134, 390, '▶', () => { this.touchState.right = true; }, () => { this.touchState.right = false; });
        mkBtn(735, 390, '▲', () => { this.touchState.jump = true; }, () => { this.touchState.jump = false; });
    }

    _toggleSettings() {
        this.isSettingsOpen = !this._settingsModal.isOpen();
        if (this.isSettingsOpen) this._settingsModal.show();
        else this._settingsModal.hide();
    }

    _triggerGameOver() {
        this.isGameOver = true;
        this.player?.setVelocity(0, 0);
        AudioManager.playGameOver && AudioManager.playGameOver();
        this._goElements?.forEach(el => el.setVisible(true));
    }

    _handleInteraction() {
        if (this.doorBack && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y) < 90) {
            this._backToLevel2();
            return;
        }
        if (this.exitPortal && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitPortal.x, this.exitPortal.y) < 100) {
            this._tryExit();
            return;
        }
    }

    _tryExit() {
        if (this.isGameOver || this.isVictoryOpen) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitPortal.x, this.exitPortal.y);
        if (dist < 100) {
            AudioManager.playSuccess && AudioManager.playSuccess();
            this.isVictoryOpen = true;
            this._vicElements?.forEach(el => el.setVisible(true));
        } else {
            this._showToast('Dekati Pintu Keluar terlebih dahulu!', 0xf59e0b);
        }
    }

    _backToLevel2() {
        AudioManager.playClick && AudioManager.playClick();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('DungeonScene2', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                currentWeaponId: this.currentWeapon.id
            });
        });
    }

    // ===============================================================
    // 💥 EFEK & UTILITAS
    // ===============================================================
    _createBurstEffect(x, y, color = 0xf97316) {
        const circle = this.add.circle(x, y, 10, color, 0.85).setDepth(20);
        this.tweens.add({
            targets: circle, scale: 2.2, alpha: 0, duration: 200,
            onComplete: () => circle.destroy()
        });
    }

    _flashTarget(target) {
        this.tweens.add({ targets: target, alpha: 0.2, yoyo: true, repeat: 2, duration: 60, onComplete: () => target.setAlpha(1) });
    }

    _showDamageNumber(x, y, text, color = 0xffffff) {
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const dmgTxt = this.add.text(x, y, text, {
            fontSize: '13px', fontStyle: 'bold', fill: hexC, stroke: '#000000', strokeThickness: 3, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({ targets: dmgTxt, y: y - 32, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => dmgTxt.destroy() });
    }

    _showToast(msg, color = 0xf97316) {
        if (!msg) return;
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const px = this.player?.x ?? 400;
        const py = this.player?.y ? this.player.y - 35 : 200;
        const toast = this.add.text(px, py, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexC, backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({ targets: toast, y: toast.y - 28, alpha: 0, duration: 1400, onComplete: () => toast.destroy() });
    }

    _drawEnemyHP(enemy) {
        if (!enemy.hpBar || enemy.isDead) return;
        enemy.hpBar.clear();
        if (enemy.type === 'boss') return; // Boss punya HUD terpisah

        const pct = Math.max(0, enemy.hp / enemy.maxHp);
        const w = 32;
        const h = 4;
        const bx = enemy.x - w / 2;
        const by = enemy.y - 28;

        enemy.hpBar.fillStyle(0x0f172a, 0.85);
        enemy.hpBar.fillRect(bx - 1, by - 1, w + 2, h + 2);
        enemy.hpBar.fillStyle(0xef4444, 1);
        enemy.hpBar.fillRect(bx, by, w * pct, h);
    }

    // ===============================================================
    // 🔄 GAME LOOP UPDATE
    // ===============================================================
    update() {
        if (!this.player?.body) return;

        // 1. Cek jika player jatuh ke jurang ("permukaan dasarnya bolong-bolong")
        if (this.player.y > 438) {
            this._handleFallIntoPit();
            return;
        }

        // 2. Cek apakah player menginjak checkpoint pulau aman
        if (this.player.body.touching.down || this.player.body.blocked.down) {
            this.checkpoints.forEach(cp => {
                if (Math.abs(this.player.x - cp.x) < 70 && Math.abs(this.player.y - cp.y) < 30) {
                    if (this.lastCheckpoint.x !== cp.x) {
                        this.lastCheckpoint = { x: cp.x, y: cp.y };
                        this._showToast(`Checkpoint Tersimpan: ${cp.name}`, 0x38bdf8);
                    }
                }
            });
        }

        // 3. Cek kedekatan pintu masuk / keluar
        if (this.doorBack && this.promptBack) {
            const dBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
            this.promptBack.setVisible(dBack < 90);
        }
        if (this.exitPortal && this._exitPrompt) {
            const dExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitPortal.x, this.exitPortal.y);
            this._exitPrompt.setVisible(dExit < 100);
        }

        // 4. Modal active state
        if (this.isGameOver || this.isVictoryOpen || this.isSettingsOpen) {
            this.player.setVelocityX(0);
            return;
        }

        // 5. Kontrol Gerak Player
        const speed = CONFIG_SKELETON.player.kecepatan || 220;
        const jumpSpd = -(CONFIG_SKELETON.player.kekuatanLompat || 440);
        const left = this.cursors?.left.isDown || this.keys?.a.isDown || this.touchState.left;
        const right = this.cursors?.right.isDown || this.keys?.d.isDown || this.touchState.right;
        const jump = this.cursors?.up.isDown || this.keys?.w.isDown || this.keys?.space.isDown || this.touchState.jump;

        this.player.setVelocityX(left ? -speed : right ? speed : 0);
        if (left) this.player.setFlipX(true);
        if (right) this.player.setFlipX(false);

        if (jump && (this.player.body.touching.down || this.player.body.blocked.down)) {
            this.player.setVelocityY(jumpSpd);
            AudioManager.playJump && AudioManager.playJump();
        }

        if (this._weaponSprite) {
            const offX = this.player.flipX ? -18 : 18;
            this._weaponSprite.setPosition(this.player.x + offX, this.player.y + 4);
            this._weaponSprite.setFlipX(this.player.flipX);
        }

        // 6. Update Musuh & Boss
        this._updateBossHealthBar();

        if (this.enemies) {
            const now = this.time.now;
            this.enemies.getChildren().forEach(e => {
                if (e.isDead || !e.active) return;
                this._drawEnemyHP(e);
                e.nameTag?.setPosition(e.x, e.y - (e.type === 'boss' ? 48 : 34));

                const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);

                // Logika AI Ranged & Boss
                if (e.type === 'ranged' || e.type === 'boss') {
                    if (distToPlayer <= 550) {
                        e.setFlipX(this.player.x < e.x);
                        e.setVelocityX(0);

                        const lastShot = this._lastEnemyShootTime[e.id] || 0;
                        if (now - lastShot > e.shootInterval) {
                            this._lastEnemyShootTime[e.id] = now + Phaser.Math.Between(0, 300);
                            this._shootFireOrb(e);
                        }
                    } else {
                        // Patroli
                        if (e.x <= e.patrolMin) e.direction = 1;
                        else if (e.x >= e.patrolMax) e.direction = -1;
                        e.setVelocityX(e.patrolSpeed * e.direction);
                        e.setFlipX(e.direction < 0);
                    }
                } else {
                    // Melee Patroli
                    if (e.x <= e.patrolMin) e.direction = 1;
                    else if (e.x >= e.patrolMax) e.direction = -1;
                    e.setVelocityX(e.patrolSpeed * e.direction);
                    e.setFlipX(e.direction < 0);
                }
            });
        }
    }

    _shootFireOrb(shooter) {
        const startX = shooter.x + (shooter.flipX ? -16 : 16);
        const startY = shooter.y;

        const orb = this.physics.add.sprite(startX, startY, 'proj_dark_orb').setDepth(14);
        orb.setTint(0xf97316);
        this.enemyProjectiles.add(orb);
        orb.body.setAllowGravity(false);

        const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);
        const spd = shooter.type === 'boss' ? 240 : 190;
        orb.body.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

        // Jika Boss, tembakkan 2 bola tambahan (3-way spread)
        if (shooter.type === 'boss') {
            [-0.3, 0.3].forEach(offset => {
                const subOrb = this.physics.add.sprite(startX, startY, 'proj_dark_orb').setDepth(14);
                subOrb.setTint(0xef4444);
                this.enemyProjectiles.add(subOrb);
                subOrb.body.setAllowGravity(false);
                subOrb.body.setVelocity(Math.cos(angle + offset) * spd, Math.sin(angle + offset) * spd);
                this.time.delayedCall(2200, () => { if (subOrb.active) subOrb.destroy(); });
            });
        }

        this.time.delayedCall(2400, () => {
            if (orb.active) orb.destroy();
        });
    }
}
