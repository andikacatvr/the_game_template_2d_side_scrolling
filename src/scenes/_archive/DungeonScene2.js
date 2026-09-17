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
        textureKey: 'weapon_bow', damage: 1, range: 320, attackSpeed: 750,
        color: 0x34d399, desc: 'Menembak panah. Jangkauan ×4!'
    }
};

// ===============================================================
// 🔮 DUNGEON SCENE LEVEL 2: GUA SIHIR KEGELAPAN (RANGED ENEMIES)
// ===============================================================
export class DungeonScene2 extends Phaser.Scene {
    constructor() {
        super({ key: 'DungeonScene2' });
    }

    init(data = {}) {
        this.startData = data;
        this.isGameOver = false;
        this.hp = data.hp !== undefined ? data.hp : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.maxHp = data.maxHp || (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.inventory = Array.isArray(data.inventory) ? [...data.inventory] : [...(CONFIG_SKELETON.inventoryAwal || [])];
        this.collectedItemIds = Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.defeatedEnemies = Array.isArray(data.defeatedEnemies) ? [...data.defeatedEnemies] : [];

        const savedWeaponId = (data.currentWeaponId && data.currentWeaponId !== 'fists') ? data.currentWeaponId : 'bow';
        this.currentWeapon = WEAPONS[savedWeaponId] || WEAPONS.bow;
        this.pickedWeapons = Array.isArray(data.pickedWeapons) ? [...data.pickedWeapons] : [];
    }

    create() {
        const WORLD_WIDTH = 1800;
        const WORLD_HEIGHT = 450;

        this.cameras.main.setBackgroundColor('#10051d');
        this.touchState = { left: false, right: false, jump: false };
        this.isInvOpen = false;
        this.isSettingsOpen = false;
        this.isVictoryOpen = false;
        this.isGameOver = false;

        this._lastAttackTime = {};
        this._lastMageShootTime = {};
        this._lastPlayerAttackTime = 0;
        this._invincible = false;
        this._isTransitioning = false;
        this._weaponSprite = null;

        // 1. Bangun Dunia & Batas
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this._buildWorld(WORLD_WIDTH, WORLD_HEIGHT);

        // 2. Bangun Player & Kamera Follow
        this._buildPlayer();
        this._buildWeaponPickups();

        // 3. Bangun Musuh Penyihir (Ranged Enemies)
        this._buildMageEnemies();

        // 4. Group Proyektil Musuh (Tanpa gravitasi agar terbang lurus ke player)
        this.enemyProjectiles = this.physics.add.group({
            allowGravity: false
        });
        this.physics.add.overlap(this.player, this.enemyProjectiles, (player, proj) => {
            if (proj.active && !this._invincible && !this.isGameOver) {
                proj.destroy();
                this._takeDamage(1, 'Terkena Bola Sihir Musuh!');
            }
        });
        this.physics.add.collider(this.enemyProjectiles, this.platforms, (proj) => {
            if (proj && proj.active) {
                const burst = this.add.circle(proj.x, proj.y, 8, 0xd946ef, 0.8).setDepth(14);
                this.tweens.add({ targets: burst, scale: 2, alpha: 0, duration: 150, onComplete: () => burst.destroy() });
                proj.destroy();
            }
        });

        // 5. Bangun HUD, Modal, & Kontrol
        this._buildHUD();
        this._buildTouchControls();
        this._buildGameOverModal();
        this._buildVictoryModal();
        this._buildSettingsModal();
        this._buildWeaponSwitchUI();

        // Inisialisasi Zoom Kamera
        const camCfg = CONFIG_SKELETON.kamera || {};
        this.zoomManager = new CameraZoomManager(this, {
            minZoom: camCfg.zoomMinimal !== undefined ? camCfg.zoomMinimal : 0.85,
            maxZoom: camCfg.zoomMaksimal || 1.6,
            defaultZoom: camCfg.zoomAwal !== undefined ? camCfg.zoomAwal : 0.85
        });
        const rightEdge = this.scale.width;
        this.zoomBtnContainer = this.zoomManager.createHUDButton(rightEdge - 76, 26);

        // 6. Keyboard Keys
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
        this.input.keyboard.on('keydown-E', () => this._tryExit());
        this.input.keyboard.on('keydown-ENTER', () => this._tryExit());

        // Klik mouse di mana saja untuk serang / menembak
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

        this._showToast('DUNGEON LEVEL 2: HATI-HATI SERANGAN BOLA SIHIR JARAK JAUH!', 0xd946ef);
        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    _buildWorld(width, height) {
        const g = this.add.graphics();
        g.fillStyle(0x130724, 1);
        g.fillRect(0, 0, width, height);

        // Kristal-kristal ungu di latar
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(30, width - 50);
            const y = Phaser.Math.Between(40, 390);
            const sz = Phaser.Math.Between(8, 28);
            g.fillStyle(0x3b0764, 0.75);
            g.fillTriangle(x, y - sz, x - sz * 0.4, y + sz, x + sz * 0.4, y + sz);
            g.fillStyle(0xa855f7, 0.4);
            g.fillCircle(x, y, 2.5);
        }

        // Obor Ungu
        [180, 520, 880, 1240, 1600].forEach(tx => this._addTorch(tx, 350));

        // Platform & lantai
        this.platforms = this.physics.add.staticGroup();
        this._buildGround(0, 434, 58);

        // Platform Melayang
        this._buildPlatform(320, 320, 4);
        this._buildPlatform(680, 260, 5);
        this._buildPlatform(1050, 310, 4);
        this._buildPlatform(1400, 250, 5);

        // Duri Rintangan
        this.hazards = this.physics.add.staticGroup();
        [440, 920, 1300].forEach(hx => {
            this.hazards.create(hx, 406, 'skeleton_hazard').refreshBody();
        });

        // Banner Instruksi
        this.add.text(400, 48, 'GUA SIHIR — DUNGEON LEVEL 2 (RANGED)', {
            fontSize: '16px', fontStyle: 'bold', fill: '#d946ef', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);
        this.add.text(400, 72, 'Klik Mouse: Serang / Tembak  |  Musuh Menembakkan Bola Sihir!', {
            fontSize: '11px', fontStyle: 'bold', fill: '#f5d0fe', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);

        // Pintu Masuk / Mundur (kiri)
        this.doorBack = this.physics.add.staticSprite(50, 395, 'skeleton_portal').setTint(0x94a3b8);
        this.promptBack = this.add.container(50, 345).setDepth(25).setVisible(false);
        const pbPill = this.add.rectangle(0, 0, 96, 20, 0x1e293b, 0.95).setStrokeStyle(1.5, 0x94a3b8);
        const pbTxt = this.add.text(0, 0, '[E] Level 1', { fontSize: '10px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5);
        this.promptBack.add([pbPill, pbTxt]);
        pbPill.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._backToLevel1());

        // Pintu Keluar Selesai (kanan)
        this.exitPortal = this.physics.add.staticSprite(1730, 395, 'skeleton_portal').setTint(0xfacc15);
        this.tweens.add({ targets: this.exitPortal, scaleX: 1.08, scaleY: 1.08, alpha: 0.85, yoyo: true, repeat: -1, duration: 900 });
        this._exitPrompt = this.add.container(1730, 345).setDepth(25).setVisible(false);
        const ep1 = this.add.rectangle(0, 0, 146, 22, 0x2e1065, 0.95).setStrokeStyle(1.5, 0xfacc15);
        const ep2 = this.add.text(0, 0, '[E / Enter] Dungeon 3 ➔', { fontSize: '9px', fontStyle: 'bold', fill: '#fef08a', fontFamily: FONT_BODY }).setOrigin(0.5);
        this._exitPrompt.add([ep1, ep2]);
        ep1.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._tryExit());
    }

    _addTorch(x, y) {
        const g = this.add.graphics();
        g.fillStyle(0x3b0764, 1);
        g.fillRect(x - 3, y, 6, 20);
        const flame = this.add.text(x, y, '🟣', { fontSize: '15px' }).setOrigin(0.5);
        this.tweens.add({ targets: flame, scaleX: 1.2, scaleY: 0.85, yoyo: true, repeat: -1, duration: 260 });
    }

    _buildGround(startX, y, count) {
        for (let i = 0; i < count; i++) {
            this.platforms.create(startX + 16 + i * 32, y, 'tile_dirt_sub').setTint(0x818cf8).refreshBody();
        }
    }

    _buildPlatform(centerX, y, count) {
        const startX = centerX - ((count - 1) * 32) / 2;
        for (let i = 0; i < count; i++) {
            const key = (i === 0) ? 'tile_plat_left' : (i === count - 1) ? 'tile_plat_right' : 'tile_plat_mid';
            const t = this.platforms.create(startX + i * 32, y, key);
            t.setTint(0xc084fc);
            t.refreshBody();
        }
    }

    _buildPlayer() {
        this.player = this.physics.add.sprite(90, 370, 'skeleton_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setDeadzone(140, 70);

        this.physics.add.overlap(this.player, this.hazards, () => {
            if (!this._invincible && !this.isGameOver) this._takeDamage(1, 'Terkena Duri!');
        });

        // Langsung swap ke Dungeon 3 jika menyentuh pintu portal
        if (this.exitPortal) {
            this.physics.add.overlap(this.player, this.exitPortal, () => {
                if (!this._isTransitioning && !this.isGameOver) {
                    this._tryExit();
                }
            });
        }

        if (this.currentWeapon.id !== 'fists') {
            this._equipWeapon(this.currentWeapon);
        }
    }

    _buildWeaponPickups() {
        const bowPickup = this.physics.add.sprite(200, 388, 'weapon_bow').setDepth(8);
        bowPickup.body.setAllowGravity(false);
        const glow = this.add.graphics();
        glow.fillStyle(0x34d399, 0.28);
        glow.fillCircle(200, 388, 24);
        this.tweens.add({ targets: glow, alpha: 0.08, yoyo: true, repeat: -1, duration: 600 });
        const lbl = this.add.text(200, 355, 'Busur Jarak Jauh', {
            fontSize: '10px', fontStyle: 'bold', fill: '#34d399',
            backgroundColor: '#0f172acc', padding: { x: 5, y: 2 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(9);
        this.tweens.add({ targets: [bowPickup, lbl], y: '-=6', yoyo: true, repeat: -1, duration: 700 });

        this.physics.add.overlap(this.player, bowPickup, () => {
            if (!bowPickup.active) return;
            bowPickup.destroy();
            glow.destroy();
            lbl.destroy();
            this._equipWeapon(WEAPONS.bow);
            this._showToast('Memungut Busur Jarak Jauh! Klik Kiri Mouse untuk menembak!', 0x34d399);
            this.cameras.main.flash(200, 52, 211, 153);
        });
    }

    // ─────────────────────────────────────────────────
    // MUSUH PENYIHIR JARAK JAUH (RANGED MAGES)
    // ─────────────────────────────────────────────────
    _buildMageEnemies() {
        this.enemies = this.physics.add.group();

        const positions = [
            { x: 380,  y: 390, patrol: [220, 520],   speed: 55, hp: 3, shootInterval: 2400 },
            { x: 740,  y: 220, patrol: [620, 840],   speed: 40, hp: 3, shootInterval: 2200 }, // di atas platform
            { x: 1080, y: 390, patrol: [920, 1220],  speed: 60, hp: 4, shootInterval: 2000 },
            { x: 1420, y: 210, patrol: [1300, 1520], speed: 45, hp: 4, shootInterval: 2100 }, // di atas platform
            { x: 1650, y: 390, patrol: [1540, 1720], speed: 40, hp: 8, shootInterval: 1700, isBoss: true } // Boss Penyihir
        ];

        positions.forEach((cfg, idx) => {
            const mage = this.physics.add.sprite(cfg.x, cfg.y, 'dungeon_mage').setDepth(9);
            mage.setCollideWorldBounds(true);
            mage.setGravityY(300);
            mage.patrolMin = cfg.patrol[0];
            mage.patrolMax = cfg.patrol[1];
            mage.patrolSpeed = cfg.speed;
            mage.id = `mage_${idx}`;
            mage.isDead = false;
            mage.direction = 1;
            mage.hp = cfg.hp || 3;
            mage.maxHp = cfg.hp || 3;
            mage.shootInterval = cfg.shootInterval || 2200;
            mage.isBoss = !!cfg.isBoss;

            this.physics.add.collider(mage, this.platforms);

            mage.hpBar = this.add.graphics().setDepth(12);
            const nameLabel = cfg.isBoss ? 'Archmage Malakor (Boss Sihir)' : 'Prajurit Penyihir Kegelapan';
            const nameColor = cfg.isBoss ? '#facc15' : '#d8b4fe';
            mage.nameTag = this.add.text(cfg.x, cfg.y - 46, nameLabel, {
                fontSize: cfg.isBoss ? '10px' : '9px', fontStyle: cfg.isBoss ? 'bold' : 'normal', fill: nameColor, fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(12);
            mage.castStatus = this.add.text(cfg.x, cfg.y - 58, '', {
                fontSize: '9px', fontStyle: 'bold', fill: '#f0abfc', fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(12);

            this._drawEnemyHP(mage);

            mage.setInteractive({ useHandCursor: true });
            mage.on('pointerdown', () => {
                if (!mage.isDead && !this.isGameOver) this._attackEnemy(mage);
            });
            mage.on('pointerover', () => { if (!mage.isDead) mage.setTint(0xff88ff); });
            mage.on('pointerout', () => { if (!mage.isDead) mage.clearTint(); });

            this.enemies.add(mage);
        });
    }

    _prepareSpellCast(mage) {
        if (!mage || mage.isDead || !mage.active || !this.player || this.isGameOver || mage.isCasting) return;
        mage.isCasting = true;
        mage.setVelocityX(0);
        mage.setFlipX(this.player.x < mage.x);

        mage.castStatus?.setText(mage.isBoss ? '[BARRAGE SIHIR]' : '[MERAPAL SIHIR]');

        // Efek aura sihir melingkar saat merapal
        const staffX = mage.x + (mage.flipX ? -16 : 16);
        const staffY = mage.y - 8;
        const ring = this.add.circle(staffX, staffY, 4, 0xd946ef, 0.85).setDepth(14);
        this.tweens.add({
            targets: ring,
            scale: 3.4,
            alpha: 0.1,
            duration: 400,
            onComplete: () => ring.destroy()
        });

        // Animasi penyihir melayang saat merapal sihir
        this.tweens.add({
            targets: mage,
            y: mage.y - 6,
            duration: 200,
            yoyo: true
        });

        // Tembak bola sihir setelah merapal 400ms
        this.time.delayedCall(400, () => {
            if (!mage || mage.isDead || !mage.active || this.isGameOver) return;
            if (mage.isBoss) {
                // Boss menembakkan 3 bola sihir menyebar (Triple Spread Attack)
                this._shootDarkOrb(mage, 0);
                this._shootDarkOrb(mage, -0.22);
                this._shootDarkOrb(mage, 0.22);
                this.cameras.main.shake(100, 0.005);
            } else {
                this._shootDarkOrb(mage, 0);
            }
            mage.isCasting = false;
            mage.castStatus?.setText('');
        });
    }

    _shootDarkOrb(mage, angleOffset = 0) {
        if (!mage || mage.isDead || !mage.active || !this.player || this.isGameOver) return;

        const staffX = mage.x + (mage.flipX ? -18 : 18);
        const staffY = mage.y - 8;

        // Buat bola sihir langsung di group tanpa gravitasi
        const orb = this.enemyProjectiles.create(staffX, staffY, 'proj_dark_orb');
        if (!orb) return;
        orb.setDepth(15);
        orb.body.setAllowGravity(false);
        orb.body.gravity.y = 0;

        // Arahkan proyektil tepat lurus ke posisi player di samping
        const targetX = this.player.x;
        const targetY = this.player.y;
        const baseAngle = Phaser.Math.Angle.Between(staffX, staffY, targetX, targetY);
        const angle = baseAngle + angleOffset;
        const speed = mage.isBoss ? 300 : 260;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        orb.setVelocity(vx, vy);
        orb.setRotation(angle);

        // Jejak partikel ungu melayang di belakang bola sihir (Particle Trail)
        const trailTimer = this.time.addEvent({
            delay: 45,
            repeat: 45,
            callback: () => {
                if (!orb || !orb.active) { trailTimer.remove(); return; }
                const spark = this.add.circle(orb.x, orb.y, Phaser.Math.Between(2, 5), 0xd946ef, 0.75).setDepth(14);
                this.tweens.add({
                    targets: spark,
                    alpha: 0,
                    scale: 0.2,
                    duration: 280,
                    onComplete: () => spark.destroy()
                });
            }
        });

        // Hancur otomatis jika luput
        this.time.delayedCall(4200, () => {
            if (orb && orb.active) orb.destroy();
        });

        // Flash kilat di ujung tongkat sihir
        const flash = this.add.circle(staffX, staffY, 14, 0xd946ef, 0.9).setDepth(16);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2.2,
            duration: 180,
            onComplete: () => flash.destroy()
        });

        AudioManager.playClick && AudioManager.playClick();
    }

    _drawEnemyHP(enemy) {
        if (!enemy.hpBar || !enemy.active) return;
        enemy.hpBar.clear();
        enemy.hpBar.fillStyle(0x3b0764, 0.9);
        enemy.hpBar.fillRect(enemy.x - 22, enemy.y - 38, 44, 6);
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        const c = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;
        enemy.hpBar.fillStyle(c, 1);
        enemy.hpBar.fillRect(enemy.x - 22, enemy.y - 38, 44 * ratio, 6);
    }

    _handlePointerAttack(pointer) {
        if (!this.player || !this.player.body || this.isGameOver) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const w = this.currentWeapon;

        this.player.setFlipX(worldX < this.player.x);
        if (this._weaponSprite) {
            const offX = this.player.flipX ? -18 : 18;
            this._weaponSprite.setPosition(this.player.x + offX, this.player.y + 4);
            this._weaponSprite.setFlipX(this.player.flipX);
        }

        const now = this.time.now;
        const lastA = this._lastPlayerAttackTime || 0;
        if (now - lastA < w.attackSpeed) return;
        this._lastPlayerAttackTime = now;

        if (w.id === 'bow') {
            this._spawnArrow(worldX, worldY);
            return;
        }

        this._swingWeaponSprite();

        const dir = worldX < this.player.x ? -1 : 1;
        const slashX = this.player.x + dir * 34;
        const slashY = this.player.y;
        this._spawnSlashFX(slashX, slashY);

        let hitEnemy = null;
        let minDist = w.range;

        this.enemies.getChildren().forEach(e => {
            if (e.isDead || !e.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            const inFront = (dir > 0 && e.x >= this.player.x - 30) || (dir < 0 && e.x <= this.player.x + 30);
            if (dist <= minDist && inFront) {
                minDist = dist;
                hitEnemy = e;
            }
        });

        if (hitEnemy) {
            this._damageEnemy(hitEnemy);
        }
    }

    _damageEnemy(enemy) {
        if (enemy.isDead || !enemy.active) return;
        const w = this.currentWeapon;
        enemy.hp -= w.damage;
        this._drawEnemyHP(enemy);
        this._flashSprite(enemy);
        this._showDamageNumber(enemy.x, enemy.y - 20, `-${w.damage} HP`, w.color);
        AudioManager.playClick && AudioManager.playClick();
        if (enemy.hp <= 0) this._killEnemy(enemy);
    }

    _attackEnemy(enemy) {
        if (enemy.isDead || this.isGameOver) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        const w = this.currentWeapon;

        if (dist > w.range) {
            this._showToast(`Terlalu jauh! Jangkauan ${w.name}: ${w.range}px`, 0xf59e0b);
            return;
        }

        const now = this.time.now;
        const lastA = this._lastAttackTime[`atk_${enemy.id}`] || 0;
        if (now - lastA < w.attackSpeed) {
            this._showToast('⏳ Serangan masih cooldown!', 0x94a3b8);
            return;
        }
        this._lastAttackTime[`atk_${enemy.id}`] = now;

        this.player.setFlipX(enemy.x < this.player.x);

        if (w.id === 'bow') {
            this._spawnArrow(enemy.x, enemy.y);
        } else {
            this._spawnSlashFX(enemy.x, enemy.y);
            this._swingWeaponSprite();
        }

        this._damageEnemy(enemy);
    }

    _attackNearestEnemy() {
        if (this.isGameOver) return;
        let nearest = null, minDist = this.currentWeapon.range;

        this.enemies.getChildren().forEach(e => {
            if (e.isDead || !e.active) return;
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });

        if (nearest) this._attackEnemy(nearest);
        else {
            this._swingWeaponSprite();
            const dir = this.player.flipX ? -1 : 1;
            this._spawnSlashFX(this.player.x + dir * 34, this.player.y);
        }
    }

    _killEnemy(enemy) {
        enemy.isDead = true;
        this.defeatedEnemies.push(enemy.id);
        this.cameras.main.shake(180, 0.01);
        this._showToast(enemy.isBoss ? 'Archmage Dikalahkan! Gerbang Terbuka!' : 'Penyihir Tumbang! +20 XP', 0xfacc15);

        this.tweens.add({
            targets: enemy, alpha: 0, scaleX: 1.5, scaleY: 0.1, duration: 400,
            onComplete: () => {
                enemy.setActive(false).setVisible(false);
                enemy.hpBar?.destroy();
                enemy.nameTag?.destroy();
                enemy.castStatus?.destroy();
            }
        });

        const alive = this.enemies.getChildren().filter(e => !e.isDead && e.active).length;
        if (alive === 0) this._showToast('Seluruh Musuh Level 2 Tumbang!', 0x4ade80);
        this._updateEnemyCount();
    }

    _spawnSlashFX(x, y) {
        const slash = this.add.sprite(x, y, 'fx_slash').setDepth(20).setAlpha(0.9);
        slash.setAngle(Phaser.Math.Between(-30, 30));
        this.tweens.add({
            targets: slash, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 200,
            onComplete: () => slash.destroy()
        });
    }

    _spawnArrow(targetX, targetY) {
        if (typeof targetX === 'object' && targetX !== null) {
            targetY = targetX.y;
            targetX = targetX.x;
        }

        const arrow = this.physics.add.sprite(this.player.x, this.player.y - 5, 'proj_arrow').setDepth(15);
        arrow.body.setAllowGravity(false);

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
        const speed = 520;
        arrow.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        arrow.setRotation(angle);

        this.physics.add.overlap(arrow, this.enemies, (ar, en) => {
            if (!en.isDead && en.active && ar.active) {
                ar.destroy();
                this._damageEnemy(en);
            }
        });

        this.time.delayedCall(1500, () => { if (arrow.active) arrow.destroy(); });

        const muzzle = this.add.graphics();
        muzzle.fillStyle(0x34d399, 0.7);
        muzzle.fillCircle(this.player.x + (this.player.flipX ? -12 : 12), this.player.y, 6);
        this.tweens.add({ targets: muzzle, alpha: 0, duration: 150, onComplete: () => muzzle.destroy() });
    }

    _swingWeaponSprite() {
        if (!this._weaponSprite) return;
        const origA = this._weaponSprite.angle;
        this.tweens.add({
            targets: this._weaponSprite,
            angle: origA + (this.player.flipX ? -55 : 55),
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (this._weaponSprite) this._weaponSprite.setAngle(origA);
            }
        });
    }

    _equipWeapon(w) {
        this.currentWeapon = w;
        if (this._weaponSprite) this._weaponSprite.destroy();
        if (w.textureKey) {
            this._weaponSprite = this.add.sprite(this.player.x + 18, this.player.y, w.textureKey).setDepth(11).setScale(0.85);
        }
        this._updateWeaponHUD();
    }

    _cycleWeapon() {
        const ownedWeapons = Object.values(WEAPONS).filter(w => w.id === 'fists' || this.pickedWeapons.includes(w.id));
        if (ownedWeapons.length <= 1) {
            this._showToast('Belum ada senjata lain! Cari di dalam dungeon.', 0x94a3b8);
            return;
        }

        const currentIdx = ownedWeapons.findIndex(w => w.id === this.currentWeapon.id);
        const nextIdx = (currentIdx + 1) % ownedWeapons.length;
        this._equipWeapon(ownedWeapons[nextIdx]);
        this._showToast(`Ganti ke: ${ownedWeapons[nextIdx].name}`, ownedWeapons[nextIdx].color);
    }

    _takeDamage(amount, msg = 'Kena Serangan!') {
        if (this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this._updateHPDisplay();
        this._showToast(msg, 0xef4444);
        AudioManager.playHurt && AudioManager.playHurt();

        if (this.hp <= 0) { this._triggerGameOver(); return; }
        this._invincible = true;
        this.tweens.add({
            targets: this.player, alpha: 0.3, yoyo: true, repeat: 4, duration: 100,
            onComplete: () => { this.player.setAlpha(1); this._invincible = false; }
        });
    }

    _tryExit() {
        if (this.isGameOver || this._isTransitioning) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1730, 395);
        if (dist < 110) {
            this._isTransitioning = true;
            this.player.setVelocity(0, 0);
            AudioManager.playSuccess && AudioManager.playSuccess();
            this._showToast('Melangkah Masuk ke Dungeon Level 3...', 0xf59e0b);
            SaveManager.save({ hp: this.hp, maxHp: this.maxHp, inventory: this.inventory });
            this.cameras.main.fadeOut(350, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DungeonScene3', {
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory,
                    currentWeaponId: this.currentWeapon.id
                });
            });
        } else {
            this._showToast('Dekati Pintu Keluar terlebih dahulu!', 0xf59e0b);
        }
    }

    _backToLevel1() {
        AudioManager.playClick && AudioManager.playClick();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('DungeonScene', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                currentWeaponId: this.currentWeapon.id
            });
        });
    }

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
            fontSize: '11px', fontStyle: 'bold', fill: '#d946ef', fontFamily: FONT_BODY
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

    _buildWeaponHUDPanel() {
        this._wHUDContainer = this.add.container(16, 410).setDepth(30).setScrollFactor(0);
        this._wHUDBg = this.add.rectangle(0, 0, 220, 32, 0x0f172a, 0.88).setStrokeStyle(1.5, 0xd946ef).setOrigin(0, 0.5);
        this._wHUDIcon = this.add.text(14, 0, this.currentWeapon.icon, { fontSize: '16px' }).setOrigin(0.5);
        this._wHUDName = this.add.text(32, -7, this.currentWeapon.name, { fontSize: '11px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY });
        this._wHUDStats = this.add.text(32, 5, `DMG: ${this.currentWeapon.damage}  |  Range: ${this.currentWeapon.range}px  |  [X] Ganti`, { fontSize: '9px', fill: '#d946ef', fontFamily: FONT_BODY });
        this._wHUDContainer.add([this._wHUDBg, this._wHUDIcon, this._wHUDName, this._wHUDStats]);
    }

    _updateWeaponHUD() {
        if (!this._wHUDIcon) return;
        const w = this.currentWeapon;
        const hexC = '#' + w.color.toString(16).padStart(6, '0');
        this._wHUDIcon.setText(w.icon);
        this._wHUDName.setText(w.name).setFill(hexC);
        this._wHUDStats.setText(`DMG: ${w.damage}  |  Range: ${w.range}px  |  [X] Ganti`);
        this._wHUDBg.setStrokeStyle(1.5, w.color);
    }

    _updateEnemyCount() {
        if (!this._enemyCountText || !this.enemies) return;
        const alive = this.enemies.getChildren().filter(e => !e.isDead && e.active).length;
        this._enemyCountText.setText(`Penyihir Tersisa: ${alive}`);
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
        if (this._hpNumText) {
            this._hpNumText.setText(`${this.hp}/${this.maxHp}`);
        }
    }

    _buildGameOverModal() {
        const D = 70, cx = this.scale ? this.scale.width / 2 : 400, cy = this.scale ? this.scale.height / 2 : 225;
        this._goElements = [];
        const mk = (obj) => { obj.setScrollFactor(0).setDepth(D).setVisible(false); this._goElements.push(obj); return obj; };

        mk(this.add.rectangle(cx, cy, 4000, 4000, 0x000000, 0.88));
        mk(this.add.rectangle(cx, cy, 480, 270, 0x180509, 0.98).setStrokeStyle(2.5, 0xef4444));
        mk(this.add.text(cx, cy - 34, 'GAME OVER', { fontSize: '32px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE }).setOrigin(0.5));
        mk(this.add.text(cx, cy + 6, 'Kamu terkena sihir kegelapan! Coba hindari bola sihirnya!', { fontSize: '12px', fill: '#fca5a5', fontFamily: FONT_BODY }).setOrigin(0.5));

        const restartL2 = () => this.scene.restart({ ...this.startData, hp: this.maxHp, defeatedEnemies: [] });
        const r1 = mk(this.add.rectangle(cx, cy + 56, 240, 36, 0x2563eb, 0.95).setStrokeStyle(1.5, 0x60a5fa).setInteractive({ useHandCursor: true }));
        const r1t = mk(this.add.text(cx, cy + 56, 'Coba Lagi (Level 2)', { fontSize: '12px', fontStyle: 'bold', fill: '#fff', fontFamily: FONT_BODY }).setOrigin(0.5));
        r1.on('pointerdown', restartL2);
        r1t.setInteractive({ useHandCursor: true }).on('pointerdown', restartL2);

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
        mk(this.add.rectangle(cx, cy, 500, 270, 0x130724, 0.98).setStrokeStyle(2.5, 0xd946ef));
        mk(this.add.text(cx, cy - 45, 'DUNGEON LEVEL 2 TAKLUK!', { fontSize: '22px', fontStyle: 'bold', fill: '#f0abfc', fontFamily: FONT_TITLE }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 10, 'Luar biasa! Seluruh penyihir dan Archmage berhasil kamu kalahkan!\nKamu siap melanjutkan petualangan.', {
            fontSize: '12px', fill: '#e9d5ff', align: 'center', wordWrap: { width: 460 }, lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5));

        const toL3 = () => {
            this.scene.start('DungeonScene3', {
                hp: this.hp, maxHp: this.maxHp, inventory: this.inventory, currentWeaponId: this.currentWeapon.id
            });
        };
        const vL3 = mk(this.add.rectangle(cx, cy + 52, 380, 38, 0xb91c1c, 0.95).setStrokeStyle(2, 0xf87171).setInteractive({ useHandCursor: true }));
        const vL3t = mk(this.add.text(cx, cy + 52, 'Lanjut ke Dungeon Level 3 (Rintangan Maut) ➔', { fontSize: '12px', fontStyle: 'bold', fill: '#fef2f2', fontFamily: FONT_BODY }).setOrigin(0.5));
        vL3.on('pointerdown', toL3);
        vL3.on('pointerover', () => vL3.setFillStyle(0xdc2626, 1));
        vL3.on('pointerout',  () => vL3.setFillStyle(0xb91c1c, 0.95));
        vL3t.setInteractive({ useHandCursor: true });
        vL3t.on('pointerdown', toL3);
        vL3t.on('pointerover', () => vL3.setFillStyle(0xdc2626, 1));
        vL3t.on('pointerout',  () => vL3.setFillStyle(0xb91c1c, 0.95));

        const toTitle = () => { AudioManager.stopAmbientBGM?.(); this.scene.start('TitleScene'); };
        const v4 = mk(this.add.rectangle(cx, cy + 98, 200, 32, 0x1e293b, 1).setStrokeStyle(1.5, 0x64748b).setInteractive({ useHandCursor: true }));
        const v4t = mk(this.add.text(cx, cy + 98, 'Menu Utama', { fontSize: '11px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5));
        v4.on('pointerdown', toTitle);
        v4.on('pointerover', () => v4.setFillStyle(0x334155, 1));
        v4.on('pointerout',  () => v4.setFillStyle(0x1e293b, 1));
        v4t.setInteractive({ useHandCursor: true });
        v4t.on('pointerdown', toTitle);
        v4t.on('pointerover', () => v4.setFillStyle(0x334155, 1));
        v4t.on('pointerout',  () => v4.setFillStyle(0x1e293b, 1));
    }

    _showVictoryModal(visible) {
        if (this._vicElements) {
            this._vicElements.forEach(el => el.setVisible(visible));
        }
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

    _buildWeaponSwitchUI() {}

    _toggleSettings() {
        this.isSettingsOpen = !this._settingsModal.isOpen();
        if (this.isSettingsOpen) this._settingsModal.show();
        else this._settingsModal.hide();
    }

    _triggerGameOver() {
        this.isGameOver = true;
        this.cameras.main.shake(350, 0.018);
        this.tweens.add({
            targets: this.player, alpha: 0, duration: 450,
            onComplete: () => {
                this._goElements?.forEach(el => el.setVisible(true));
            }
        });
    }

    _flashSprite(target) {
        this.tweens.add({ targets: target, alpha: 0.2, yoyo: true, repeat: 2, duration: 70, onComplete: () => target.setAlpha(1) });
    }

    _showDamageNumber(x, y, text, color = 0xffffff) {
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const dmgTxt = this.add.text(x, y, text, {
            fontSize: '13px', fontStyle: 'bold', fill: hexC, stroke: '#000000', strokeThickness: 3, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({ targets: dmgTxt, y: y - 32, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => dmgTxt.destroy() });
    }

    _showToast(msg, color = 0x38bdf8) {
        if (!msg) return;
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const px = this.player?.x ?? 400;
        const py = this.player?.y ? this.player.y - 35 : 200;
        const toast = this.add.text(px, py, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexC, backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({ targets: toast, y: toast.y - 28, alpha: 0, duration: 1400, onComplete: () => toast.destroy() });
    }

    update() {
        if (!this.player?.body) return;

        // Cek kedekatan pintu
        if (this.doorBack && this.promptBack) {
            const dBack = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorBack.x, this.doorBack.y);
            this.promptBack.setVisible(dBack < 90);
        }
        if (this.exitPortal && this._exitPrompt) {
            const dExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitPortal.x, this.exitPortal.y);
            this._exitPrompt.setVisible(dExit < 110);
        }

        if (this.isGameOver || this.isVictoryOpen || this.isSettingsOpen) {
            this.player.setVelocityX(0);
            return;
        }

        // Gerak Player
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

        // 🔮 AI MUSUH PENYIHIR: Tembak Bola Sihir Jarak Jauh
        if (this.enemies) {
            const now = this.time.now;
            const MAX_RANGED_DIST = 650; // Jangkauan luas satu layar penuh

            this.enemies.getChildren().forEach(mage => {
                if (mage.isDead || !mage.active) return;

                const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, mage.x, mage.y);

                this._drawEnemyHP(mage);
                mage.nameTag?.setPosition(mage.x, mage.y - 46);
                mage.castStatus?.setPosition(mage.x, mage.y - 58);

                // Jika player dalam radius pandang jarak jauh (<= 650px)
                if (distToPlayer <= MAX_RANGED_DIST) {
                    // Selalu hadapkan penyihir ke arah pemain
                    mage.setFlipX(this.player.x < mage.x);

                    if (distToPlayer < 170) {
                        // Player terlalu dekat: penyihir mundur menjaga jarak tembak!
                        const retreatDir = this.player.x < mage.x ? 1 : -1;
                        mage.setVelocityX(retreatDir * 60);
                        if (!mage.isCasting) mage.castStatus?.setText('Menjaga Jarak!');
                    } else {
                        // Jarak aman: berhenti dan fokus menembak jarak jauh
                        mage.setVelocityX(0);
                        if (!mage.isCasting) mage.castStatus?.setText('Membidik Jarak Jauh');
                    }

                    // Merapal dan melontarkan bola sihir berkala
                    const lastShot = this._lastMageShootTime[mage.id] || 0;
                    if (now - lastShot > mage.shootInterval && !mage.isCasting) {
                        this._lastMageShootTime[mage.id] = now + Phaser.Math.Between(0, 300);
                        this._prepareSpellCast(mage);
                    }
                } else {
                    // Jika player di luar jarak pandang: patroli santai
                    if (mage.x <= mage.patrolMin) mage.direction = 1;
                    else if (mage.x >= mage.patrolMax) mage.direction = -1;
                    mage.setVelocityX(mage.patrolSpeed * mage.direction);
                    mage.setFlipX(mage.direction < 0);
                    mage.castStatus?.setText('');
                }
            });
        }
    }
}
