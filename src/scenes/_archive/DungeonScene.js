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
        textureKey: 'weapon_bow', damage: 1, range: 300, attackSpeed: 800,
        color: 0x34d399, desc: 'Menembak panah. Jangkauan ×4!'
    }
};

// ===============================================================
// 4. DUNGEON SCENE: AREA BARU PENUH MUSUH SETELAH PORTAL
// ===============================================================
export class DungeonScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DungeonScene' });
    }

    init(data = {}) {
        this.startData = data;
        this.isGameOver = false;

        this.hp              = data.hp     !== undefined ? data.hp     : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.maxHp           = data.maxHp  !== undefined ? data.maxHp  : (CONFIG_SKELETON.player.hpMaksimal || 3);
        this.inventory       = Array.isArray(data.inventory) ? [...data.inventory] : [];
        this.collectedItemIds= Array.isArray(data.collectedItemIds) ? [...data.collectedItemIds] : [];
        this.defeatedEnemies = Array.isArray(data.defeatedEnemies)  ? [...data.defeatedEnemies]  : [];

        // Senjata aktif saat ini
        const savedWeaponId  = data.currentWeaponId || 'fists';
        this.currentWeapon   = WEAPONS[savedWeaponId] || WEAPONS.fists;
        this.pickedWeapons   = Array.isArray(data.pickedWeapons) ? [...data.pickedWeapons] : [];
    }

    create() {
        this.cameras.main.setBackgroundColor('#08050f');

        this.touchState      = { left: false, right: false, jump: false };
        this.isInvOpen       = false;
        this.isSettingsOpen  = false;
        this.isVictoryOpen   = false;
        this.isGameOver      = false;

        this._lastAttackTime = {};
        this._invincible     = false;
        this._isTransitioning= false;
        this._weaponSprite   = null;  // sprite senjata yg nempel di player

        // Build everything
        this._buildWorld();
        this._buildPlayer();
        this._buildWeaponPickups();
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

        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys    = this.input.keyboard.addKeys({
            a:   Phaser.Input.Keyboard.KeyCodes.A,
            d:   Phaser.Input.Keyboard.KeyCodes.D,
            w:   Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC,
            z:   Phaser.Input.Keyboard.KeyCodes.Z,
            x:   Phaser.Input.Keyboard.KeyCodes.X,  // ganti senjata berikutnya
        });

        this.input.keyboard.on('keydown-ESC', () => this._toggleSettings());
        this.input.keyboard.on('keydown-Z',   () => this._attackNearestEnemy());
        this.input.keyboard.on('keydown-X',   () => this._cycleWeapon());

        // 🖱️ Klik mouse di mana saja di layar untuk serang / menembak
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver || this.isVictoryOpen || this.isSettingsOpen) return;
            if (pointer.y < 50) return; // Abaikan klik di area navbar/HUD
            if (this._touchContainer && this._touchContainer.visible && pointer.y > 270) return;
            this._handlePointerAttack(pointer);
        });

        // Set kursor crosshair bidik di Dungeon
        this.input.setDefaultCursor('crosshair');
        this.events.on('shutdown', () => {
            this.input.setDefaultCursor('default');
        });
    }

    // ─────────────────────────────────────────────────
    // DUNIA
    // ─────────────────────────────────────────────────
    _buildWorld() {
        const g = this.add.graphics();
        g.fillStyle(0x0d0917, 1);
        g.fillRect(-100, -50, 1800, 620);

        // Batu-batu latar
        for (let i = 0; i < 24; i++) {
            const x = Phaser.Math.Between(20, 1580);
            const y = Phaser.Math.Between(60, 390);
            const sz = Phaser.Math.Between(10, 40);
            g.fillStyle(0x150e20, 1);
            g.fillRect(x, y, sz, sz * 0.5);
        }

        // Obor api dekorasi
        this._addTorch(160, 350); this._addTorch(640, 280);
        this._addTorch(1050, 320); this._addTorch(1440, 350);

        // Platform & lantai
        this.platforms = this.physics.add.staticGroup();
        this._buildGround(0, 434, 50);

        this._buildPlatform(300,  320, 4);
        this._buildPlatform(650,  260, 5);
        this._buildPlatform(1000, 300, 4);
        this._buildPlatform(1340, 270, 5);

        // Tanda (Pusat Layar 400px fixed)
        this.add.text(400, 48, 'GUA MUSUH — DUNGEON LEVEL 1', {
            fontSize: '16px', fontStyle: 'bold', fill: '#c084fc', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);
        this.add.text(400, 72, 'Klik Mouse: Serang / Tembak  |  [Z] Serang  |  [X] Ganti Senjata', {
            fontSize: '11px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(5);

        // Hazard duri
        this.hazards = this.physics.add.staticGroup();
        [420, 800, 1150].forEach(x => {
            this.hazards.create(x, 406, 'skeleton_hazard').refreshBody();
        });

        // Pintu keluar (kanan)
        this.exitPortal = this.physics.add.staticSprite(1550, 388, 'skeleton_portal');
        this.tweens.add({ targets: this.exitPortal, alpha: 0.75, yoyo: true, repeat: -1, duration: 900 });
        this._exitPrompt = this.add.container(1550, 340).setDepth(25).setVisible(false);
        const ep1 = this.add.rectangle(0, 0, 146, 22, 0x1c0440, 0.95).setStrokeStyle(1.5, 0xc084fc);
        const ep2 = this.add.text(0, 0, '[E / Enter] Dungeon 2 ➔', { fontSize: '9px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY }).setOrigin(0.5);
        this._exitPrompt.add([ep1, ep2]);
        ep1.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._tryExit());

        this.cameras.main.setBounds(0, 0, 1600, 450);
        this.physics.world.setBounds(0, 0, 1600, 450);
    }

    _addTorch(x, y) {
        const g = this.add.graphics();
        g.fillStyle(0x5c3d11, 1);
        g.fillRect(x - 3, y, 6, 20);
        const flame = this.add.text(x, y, '🔥', { fontSize: '18px' }).setOrigin(0.5);
        this.tweens.add({ targets: flame, scaleX: 1.15, scaleY: 0.85, yoyo: true, repeat: -1, duration: 250 });
    }

    _buildGround(startX, y, count) {
        for (let i = 0; i < count; i++) {
            const px = startX + 16 + i * 32;
            for (let dy = 0; y + dy <= 560; dy += 32) {
                this.platforms.create(px, y + dy, 'tile_dirt_sub').refreshBody();
            }
        }
    }

    _buildPlatform(centerX, y, count) {
        const startX = centerX - ((count - 1) * 32) / 2;
        for (let i = 0; i < count; i++) {
            const key = (i === 0) ? 'tile_plat_left' : (i === count - 1) ? 'tile_plat_right' : 'tile_plat_mid';
            const t = this.platforms.create(startX + i * 32, y, key);
            t.setTint(0x9f7aea);
            t.refreshBody();
        }
    }

    // ─────────────────────────────────────────────────
    // WEAPON PICKUPS DI MAP
    // ─────────────────────────────────────────────────
    _buildWeaponPickups() {
        const pickupDefs = [
            { id: 'sword', x: 350,  y: 388, weaponId: 'sword' },
            { id: 'axe',   x: 990,  y: 255, weaponId: 'axe'   },  // di atas platform
            { id: 'bow',   x: 1350, y: 220, weaponId: 'bow'   },  // di atas platform
        ];

        this._weaponPickupGroup = this.physics.add.group();

        pickupDefs.forEach(def => {
            if (this.pickedWeapons.includes(def.id)) return; // sudah diambil

            const w = WEAPONS[def.weaponId];
            const pickup = this.physics.add.sprite(def.x, def.y, w.textureKey);
            pickup.body.setAllowGravity(false);
            pickup.weaponId = def.weaponId;
            pickup.pickupId = def.id;
            pickup.setDepth(8);

            // Aura glow (lingkaran berkedip)
            const glow = this.add.graphics();
            glow.fillStyle(w.color, 0.25);
            glow.fillCircle(def.x, def.y, 22);
            this.tweens.add({ targets: glow, alpha: 0.05, yoyo: true, repeat: -1, duration: 600 });

            // Label senjata mengambang
            const lbl = this.add.text(def.x, def.y - 30, `${w.icon} ${w.name}`, {
                fontSize: '10px', fontStyle: 'bold', fill: '#' + w.color.toString(16).padStart(6, '0'),
                backgroundColor: '#0f172acc', padding: { x: 4, y: 2 }, fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(9);
            this.tweens.add({ targets: [pickup, lbl], y: '-=6', yoyo: true, repeat: -1, duration: 700 });

            // Overlap player → ambil senjata
            this.physics.add.overlap(this.player, pickup, () => {
                if (!pickup.active) return;
                this._pickupWeapon(def.weaponId, def.id);
                pickup.destroy();
                glow.destroy();
                lbl.destroy();
            });

            this._weaponPickupGroup.add(pickup);
        });
    }

    _pickupWeapon(weaponId, pickupId) {
        const w = WEAPONS[weaponId];
        if (!w) return;

        this.pickedWeapons.push(pickupId);
        this._equipWeapon(w);

        const hexColor = '#' + w.color.toString(16).padStart(6, '0');
        this._showToast(`${w.icon} Senjata Ditemukan: ${w.name}!\n${w.desc}`, w.color);
        this.cameras.main.flash(200, 80, 160, 255);
    }

    _equipWeapon(w) {
        this.currentWeapon = w;

        // Hapus sprite senjata lama
        if (this._weaponSprite) {
            this._weaponSprite.destroy();
            this._weaponSprite = null;
        }

        // Pasang sprite senjata baru nempel di player
        if (w.textureKey) {
            this._weaponSprite = this.add.sprite(
                this.player.x + 18,
                this.player.y,
                w.textureKey
            ).setDepth(11).setScale(0.85);

            // Tween masuk dramatis
            this._weaponSprite.setAlpha(0).setScale(1.8);
            this.tweens.add({
                targets: this._weaponSprite,
                alpha: 1, scaleX: 0.85, scaleY: 0.85,
                duration: 250, ease: 'Back.easeOut'
            });
        }

        // Update weapon HUD
        this._updateWeaponHUD();
    }

    _cycleWeapon() {
        const owned = ['fists', ...this.pickedWeapons.map(pid => {
            // pid adalah pickupId, map ke weaponId
            const pdef = [
                { id: 'sword', weaponId: 'sword' },
                { id: 'axe',   weaponId: 'axe'   },
                { id: 'bow',   weaponId: 'bow'   },
            ];
            const found = pdef.find(p => p.id === pid);
            return found ? found.weaponId : null;
        }).filter(Boolean)];

        const ownedWeapons = owned.map(id => WEAPONS[id]);
        const curIdx = ownedWeapons.findIndex(w => w.id === this.currentWeapon.id);
        const nextIdx = (curIdx + 1) % ownedWeapons.length;
        this._equipWeapon(ownedWeapons[nextIdx]);
        this._showToast(`Ganti ke: ${ownedWeapons[nextIdx].name}`, ownedWeapons[nextIdx].color);
    }

    // ─────────────────────────────────────────────────
    // PLAYER
    // ─────────────────────────────────────────────────
    _buildPlayer() {
        this.player = this.physics.add.sprite(80, 370, 'skeleton_player').setDepth(10);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Kamera ikuti player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(120, 60);

        this.physics.add.overlap(this.player, this.hazards, () => {
            if (!this._invincible && !this.isGameOver) this._takeDamage(1, 'Terkena Duri!');
        });

        // Langsung swap ke Dungeon 2 jika menyentuh pintu portal
        if (this.exitPortal) {
            this.physics.add.overlap(this.player, this.exitPortal, () => {
                if (!this._isTransitioning && !this.isGameOver) {
                    this._tryExit();
                }
            });
        }

        this._buildEnemies();

        // Equip senjata awal jika sudah punya
        if (this.currentWeapon.id !== 'fists') {
            this._equipWeapon(this.currentWeapon);
        }
    }

    // ─────────────────────────────────────────────────
    // MUSUH
    // ─────────────────────────────────────────────────
    _buildEnemies() {
        this.enemies = this.physics.add.group();

        const positions = [
            { x: 300,  y: 390, patrol: [150,  520],  speed: 70, hp: 3 },  // area awal
            { x: 620,  y: 390, patrol: [450,  820],  speed: 85, hp: 3 },  // setelah hazard pertama
            { x: 980,  y: 390, patrol: [720,  1180], speed: 80, hp: 4 },  // tengah map (lebih kuat)
            { x: 1280, y: 390, patrol: [1050, 1450], speed: 90, hp: 3 },  // area akhir
            { x: 1480, y: 390, patrol: [1280, 1580], speed: 75, hp: 5 },  // boss mini depan pintu keluar
        ];
        
        positions.forEach((cfg, idx) => {
            const enemy = this.physics.add.sprite(cfg.x, cfg.y, 'dungeon_enemy').setDepth(9);
            enemy.setCollideWorldBounds(true);
            enemy.setGravityY(300);
            enemy.patrolMin   = cfg.patrol[0];
            enemy.patrolMax   = cfg.patrol[1];
            enemy.patrolSpeed = cfg.speed;
            enemy.id          = `enemy_${idx}`;
            enemy.isDead      = false;
            enemy.direction   = 1;
            enemy.hp          = cfg.hp || 3;
            enemy.maxHp       = cfg.hp || 3;

            if (this.defeatedEnemies.includes(enemy.id)) {
                enemy.setActive(false).setVisible(false);
                return;
            }

            this.physics.add.collider(enemy, this.platforms);

            enemy.hpBar    = this.add.graphics().setDepth(12);
            const isBoss   = idx === positions.length - 1;
            const nameLabel = isBoss ? 'Boss Mini — Penjaga Gerbang' : 'Prajurit Kegelapan';
            const nameColor = isBoss ? '#fbbf24' : '#f87171';
            enemy.nameTag  = this.add.text(cfg.x, cfg.y - 46, nameLabel, {
                fontSize: '9px', fill: nameColor, fontFamily: FONT_BODY
            }).setOrigin(0.5).setDepth(12);
            this._drawEnemyHP(enemy);

            // Serangan musuh ke player (sentuh = damage)
            this.physics.add.overlap(this.player, enemy, () => {
                if (!this._invincible && !this.isGameOver && !enemy.isDead) {
                    const now  = this.time.now;
                    const last = this._lastAttackTime[enemy.id] || 0;
                    if (now - last > 900) {
                        this._lastAttackTime[enemy.id] = now;
                        this._takeDamage(1, 'Diserang Musuh!');
                        this._flashSprite(this.player);
                    }
                }
            });

            // Klik musuh = serang
            enemy.setInteractive({ useHandCursor: true });
            enemy.on('pointerdown', () => {
                if (!enemy.isDead && !this.isGameOver) this._attackEnemy(enemy);
            });
            enemy.on('pointerover', () => { if (!enemy.isDead) enemy.setTint(0xff8888); });
            enemy.on('pointerout',  () => { if (!enemy.isDead) enemy.clearTint(); });

            this.enemies.add(enemy);
        });
    }

    _drawEnemyHP(enemy) {
        if (!enemy.hpBar || !enemy.active) return;
        enemy.hpBar.clear();
        enemy.hpBar.fillStyle(0x7f1d1d, 0.9);
        enemy.hpBar.fillRect(enemy.x - 20, enemy.y - 38, 40, 6);
        const ratio = Math.max(0, enemy.hp / enemy.maxHp);
        const c     = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;
        enemy.hpBar.fillStyle(c, 1);
        enemy.hpBar.fillRect(enemy.x - 20, enemy.y - 38, 40 * ratio, 6);
    }

    // ─────────────────────────────────────────────────
    // ─────────────────────────────────────────────────
    // SISTEM SERANG (MOUSE & KEYBOARD)
    // ─────────────────────────────────────────────────
    _handlePointerAttack(pointer) {
        if (!this.player || !this.player.body || this.isGameOver) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const w = this.currentWeapon;

        // Player otomatis menghadap ke arah kursor mouse
        this.player.setFlipX(worldX < this.player.x);
        if (this._weaponSprite) {
            const offX = this.player.flipX ? -18 : 18;
            this._weaponSprite.setPosition(this.player.x + offX, this.player.y + 4);
            this._weaponSprite.setFlipX(this.player.flipX);
        }

        // Cek cooldown serangan player
        const now = this.time.now;
        const lastA = this._lastPlayerAttackTime || 0;
        if (now - lastA < w.attackSpeed) {
            return;
        }
        this._lastPlayerAttackTime = now;

        // 1. Jika Busur Panah: Tembak panah ke arah kursor mouse
        if (w.id === 'bow') {
            this._spawnArrow(worldX, worldY);
            return;
        }

        // 2. Senjata Tebas / Pukul (Pedang, Kapak, Tinju)
        this._swingWeaponSprite();

        const dir = worldX < this.player.x ? -1 : 1;
        const slashX = this.player.x + dir * 34;
        const slashY = this.player.y;
        this._spawnSlashFX(slashX, slashY);

        // Cari musuh dalam jangkauan
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
        const w    = this.currentWeapon;

        if (dist > w.range) {
            this._showToast(`Terlalu jauh! Jangkauan ${w.name}: ${w.range}px`, 0xf59e0b);
            return;
        }

        const now  = this.time.now;
        const lastA = this._lastAttackTime[`atk_${enemy.id}`] || 0;
        if (now - lastA < w.attackSpeed) {
            this._showToast('⏳ Serangan masih cooldown!', 0x94a3b8);
            return;
        }
        this._lastAttackTime[`atk_${enemy.id}`] = now;

        // Player menghadap musuh
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
            // Tetap lakukan ayunan pedang kosong agar responsif
            this._swingWeaponSprite();
            const dir = this.player.flipX ? -1 : 1;
            this._spawnSlashFX(this.player.x + dir * 34, this.player.y);
        }
    }

    _killEnemy(enemy) {
        enemy.isDead = true;
        this.defeatedEnemies.push(enemy.id);
        this.cameras.main.shake(150, 0.008);
        this._showToast('Musuh Dikalahkan! +10 XP', 0x4ade80);

        // Efek mati
        this.tweens.add({
            targets: enemy, alpha: 0, scaleX: 1.4, scaleY: 0.1, duration: 350,
            onComplete: () => {
                enemy.setActive(false).setVisible(false);
                enemy.hpBar?.destroy();
                enemy.nameTag?.destroy();
            }
        });

        const alive = this.enemies.getChildren().filter(e => !e.isDead && e.active).length;
        if (alive === 0) this._showToast('Semua Musuh Dikalahkan! Keluar dari Gua!', 0xfbbf24);
        this._updateEnemyCount();
    }

    // ─────────────────────────────────────────────────
    // EFEK VISUAL SENJATA
    // ─────────────────────────────────────────────────
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

        const arrow = this.physics.add.sprite(this.player.x, this.player.y - 5, 'proj_arrow')
            .setDepth(15);
        arrow.body.setAllowGravity(false);

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
        const speed = 520;
        arrow.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        arrow.setRotation(angle);

        // Overlap panah dgn musuh
        this.physics.add.overlap(arrow, this.enemies, (ar, en) => {
            if (!en.isDead && en.active && ar.active) {
                ar.destroy();
                this._damageEnemy(en);
            }
        });

        // Hilang setelah 1.5 detik jika tidak kena
        this.time.delayedCall(1500, () => { if (arrow.active) arrow.destroy(); });

        // Slash kecil saat panah keluar
        const muzzle = this.add.graphics();
        muzzle.fillStyle(0x34d399, 0.7);
        muzzle.fillCircle(this.player.x + (this.player.flipX ? -12 : 12), this.player.y, 6);
        this.tweens.add({ targets: muzzle, alpha: 0, duration: 150, onComplete: () => muzzle.destroy() });
    }

    _swingWeaponSprite() {
        if (!this._weaponSprite) return;
        // Animasi ayun senjata
        const origX = this._weaponSprite.x;
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

    _showDamageNumber(x, y, text, color = 0xffffff) {
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const dmgTxt = this.add.text(x, y, text, {
            fontSize: '13px', fontStyle: 'bold', fill: hexC,
            stroke: '#000000', strokeThickness: 3, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({
            targets: dmgTxt, y: y - 32, alpha: 0, duration: 700, ease: 'Power2',
            onComplete: () => dmgTxt.destroy()
        });
    }

    _flashSprite(target) {
        this.tweens.add({
            targets: target, alpha: 0.2, yoyo: true, repeat: 2, duration: 70,
            onComplete: () => target.setAlpha(1)
        });
    }

    // ─────────────────────────────────────────────────
    // DAMAGE PLAYER
    // ─────────────────────────────────────────────────
    _takeDamage(amount, msg = 'Kena Serangan!') {
        if (this.isGameOver) return;
        this.hp = Math.max(0, this.hp - amount);
        this._updateHPDisplay();
        this._showToast(msg, 0xef4444);
        if (this.hp <= 0) { this._triggerGameOver(); return; }
        this._invincible = true;
        this.tweens.add({
            targets: this.player, alpha: 0.3, yoyo: true, repeat: 4, duration: 100,
            onComplete: () => { this.player.setAlpha(1); this._invincible = false; }
        });
        this._saveProgress(false);
    }

    _tryExit() {
        if (this.isGameOver || this._isTransitioning) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1550, 388);
        if (dist < 110) {
            this._isTransitioning = true;
            this.player.setVelocity(0, 0);
            AudioManager.playSuccess?.();
            this._showToast('Melangkah Masuk ke Dungeon Level 2...', 0xf59e0b);
            this._saveProgress(true);
            this.cameras.main.fadeOut(350, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('DungeonScene2', {
                    hp: this.hp,
                    maxHp: this.maxHp,
                    inventory: this.inventory,
                    currentWeaponId: this.currentWeapon.id,
                    pickedWeapons: this.pickedWeapons
                });
            });
        } else {
            this._showToast('Dekati Pintu Keluar terlebih dahulu!', 0xf59e0b);
        }
    }

    // ─────────────────────────────────────────────────
    // HUD
    // ─────────────────────────────────────────────────
    _buildHUD() {
        // HP bar (kiri atas)
        this._hudContainer = this.add.container(16, 13).setDepth(30).setScrollFactor(0);
        const hpBg    = this.add.rectangle(67, 13, 134, 26, 0x0f172a, 0.9);
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

        // Penghitung musuh (tengah atas)
        this._enemyCountText = this.add.text(400, 13, '', {
            fontSize: '11px', fill: '#f87171', fontFamily: FONT_BODY
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
        this._updateEnemyCount();

        // Tombol menu (kanan atas, menempel tepi kanan)
        const rightEdge = this.scale.width;
        const menuBg = this.add.rectangle(rightEdge - 24, 26, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b).setScrollFactor(0).setDepth(30)
            .setInteractive({ useHandCursor: true });
        menuBg.on('pointerdown', () => this._toggleSettings());
        [this.add.rectangle(rightEdge - 24, 20, 18, 2.5, 0xf8fafc).setScrollFactor(0).setDepth(30),
         this.add.rectangle(rightEdge - 24, 26, 18, 2.5, 0xf8fafc).setScrollFactor(0).setDepth(30),
         this.add.rectangle(rightEdge - 24, 32, 18, 2.5, 0xf8fafc).setScrollFactor(0).setDepth(30)];

        // Weapon HUD (bawah kiri)
        this._buildWeaponHUDPanel();
    }

    _buildWeaponHUDPanel() {
        this._wHUDContainer = this.add.container(16, 410).setDepth(30).setScrollFactor(0);

        this._wHUDBg = this.add.rectangle(0, 0, 210, 32, 0x0f172a, 0.88)
            .setStrokeStyle(1.5, 0x7c3aed).setOrigin(0, 0.5);

        this._wHUDIcon = this.add.text(14, 0, this.currentWeapon.icon, {
            fontSize: '16px'
        }).setOrigin(0.5);

        this._wHUDName = this.add.text(32, -7, this.currentWeapon.name, {
            fontSize: '11px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY
        });
        this._wHUDStats = this.add.text(32, 5, `DMG: ${this.currentWeapon.damage}  |  Range: ${this.currentWeapon.range}px  |  [X] Ganti`, {
            fontSize: '9px', fill: '#7c3aed', fontFamily: FONT_BODY
        });

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

        // Flash animasi HUD
        this.tweens.add({
            targets: this._wHUDContainer, scaleX: 1.06, scaleY: 1.06, duration: 120, yoyo: true
        });
    }

    _buildWeaponSwitchUI() {
        // Label kontrol [Z]/[X] di kanan bawah
        this.add.text(784, 430, '[Z] Serang  [X] Ganti Senjata', {
            fontSize: '9px', fill: '#7c3aed', fontFamily: FONT_BODY, backgroundColor: '#0f172a99',
            padding: { x: 5, y: 3 }
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(30);
    }

    _updateHPDisplay() {
        if (!this._hpHearts) return;
        for (let i = 0; i < this.maxHp; i++) {
            if (this._hpHearts[i]) {
                this._hpHearts[i].setText(i < this.hp ? '❤️' : '🖤');
                this._hpHearts[i].setAlpha(i < this.hp ? 1 : 0.35);
            }
        }
        this._hpNumText?.setText(`${this.hp}/${this.maxHp}`)
            .setFill(this.hp <= 1 ? '#ef4444' : '#fda4af');
    }

    _updateEnemyCount() {
        if (!this._enemyCountText || !this.enemies) return;
        const total = this.enemies.getChildren().length;
        const alive = this.enemies.getChildren().filter(e => !e.isDead && e.active).length;
        this._enemyCountText.setText(`Musuh: ${alive}/${total} tersisa`);
    }

    // ─────────────────────────────────────────────────
    // TOUCH CONTROLS
    // ─────────────────────────────────────────────────
    _buildTouchControls() {
        const isTouch = isMobileOrTablet();
        this._touchContainer = this.add.container(0, 0).setDepth(28).setScrollFactor(0);
        this._touchContainer.setVisible(isTouch);

        const mkBtn = (x, y, icon, onDown, onUp) => {
            const bg  = this.add.rectangle(x, y, 56, 56, 0x0f172a, 0.78)
                .setStrokeStyle(2, 0x475569)
                .setInteractive(new Phaser.Geom.Rectangle(x - 38, y - 38, 76, 76), Phaser.Geom.Rectangle.Contains);
            const txt = this.add.text(x, y, icon, { fontSize: '22px', fontStyle: 'bold', fill: '#f8fafc' }).setOrigin(0.5);
            bg.on('pointerdown', () => { onDown(); bg.setFillStyle(0x2563eb, 0.9); });
            bg.on('pointerup',   () => { onUp();   bg.setFillStyle(0x0f172a, 0.78); });
            bg.on('pointerout',  () => { onUp();   bg.setFillStyle(0x0f172a, 0.78); });
            this._touchContainer.add([bg, txt]);
        };

        mkBtn(62,  390, '◀', () => { this.touchState.left  = true;  }, () => { this.touchState.left  = false; });
        mkBtn(134, 390, '▶', () => { this.touchState.right = true;  }, () => { this.touchState.right = false; });
        mkBtn(735, 390, '▲', () => { this.touchState.jump  = true;  }, () => { this.touchState.jump  = false; });

        // Tombol serang
        const atkBg = this.add.rectangle(735, 318, 56, 42, 0x3b0764, 0.88)
            .setStrokeStyle(2, 0xc084fc)
            .setInteractive(new Phaser.Geom.Rectangle(697, 287, 76, 62), Phaser.Geom.Rectangle.Contains);
        const atkTxt = this.add.text(735, 318, '⚔️', { fontSize: '20px' }).setOrigin(0.5);
        atkBg.on('pointerdown', () => {
            this._attackNearestEnemy();
            this.tweens.add({ targets: atkBg, scaleX: 0.88, scaleY: 0.88, duration: 60, yoyo: true });
        });

        // Tombol ganti senjata
        const swBg  = this.add.rectangle(675, 390, 56, 42, 0x1e293b, 0.85)
            .setStrokeStyle(2, 0x7c3aed)
            .setInteractive(new Phaser.Geom.Rectangle(637, 359, 76, 62), Phaser.Geom.Rectangle.Contains);
        const swTxt = this.add.text(675, 390, '[X]', { fontSize: '12px', fontStyle: 'bold', fill: '#c4b5fd', fontFamily: FONT_BODY }).setOrigin(0.5);
        swBg.on('pointerdown', () => {
            this._cycleWeapon();
            this.tweens.add({ targets: swBg, scaleX: 0.88, scaleY: 0.88, duration: 60, yoyo: true });
        });

        this._touchContainer.add([atkBg, atkTxt, swBg, swTxt]);
    }

    // ─────────────────────────────────────────────────
    // MODAL
    // ─────────────────────────────────────────────────
    _buildGameOverModal() {
        const D = 70, cx = this.scale ? this.scale.width / 2 : 400, cy = this.scale ? this.scale.height / 2 : 225;
        this._goElements = [];
        const mk = (obj) => { obj.setScrollFactor(0).setDepth(D).setVisible(false); this._goElements.push(obj); return obj; };

        mk(this.add.rectangle(cx, cy, 4000, 4000, 0x000000, 0.88));
        mk(this.add.rectangle(cx, cy, 480, 270, 0x180509, 0.98).setStrokeStyle(2.5, 0xef4444));
        mk(this.add.text(cx, cy - 78, '☠️', { fontSize: '34px' }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 34, 'GAME OVER', { fontSize: '32px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE }).setOrigin(0.5));
        mk(this.add.text(cx, cy + 6, 'HP habis di dalam gua! Senjatamu tidak cukup kuat?', { fontSize: '12px', fill: '#fca5a5', fontFamily: FONT_BODY }).setOrigin(0.5));

        const restartL1 = () => this.scene.restart({ ...this.startData, hp: this.maxHp, defeatedEnemies: [], pickedWeapons: [], currentWeaponId: 'fists' });
        const r1 = mk(this.add.rectangle(cx, cy + 56, 240, 36, 0x2563eb, 0.95).setStrokeStyle(1.5, 0x60a5fa).setInteractive({ useHandCursor: true }));
        const r1t = mk(this.add.text(cx, cy + 56, 'Coba Lagi (Dungeon)', { fontSize: '12px', fontStyle: 'bold', fill: '#fff', fontFamily: FONT_BODY }).setOrigin(0.5));
        r1.on('pointerdown', restartL1);
        r1t.setInteractive({ useHandCursor: true }).on('pointerdown', restartL1);

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
        mk(this.add.rectangle(cx, cy, 500, 280, 0x07100f, 0.98).setStrokeStyle(2.5, 0x22c55e));
        mk(this.add.text(cx, cy - 92, '🏆', { fontSize: '38px' }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 52, 'GUA BERHASIL DITAKLUKKAN!', {
            fontSize: '22px', fontStyle: 'bold', fill: '#4ade80', fontFamily: FONT_TITLE
        }).setOrigin(0.5));
        mk(this.add.text(cx, cy - 16, 'Selamat! Kamu berhasil melewati Dungeon Level 1.\nSenjata yang ditemukan ikut tersimpan!', {
            fontSize: '12px', fill: '#bbf7d0', align: 'center', wordWrap: { width: 440 }, lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5));

        // Tampilkan senjata yang berhasil ditemukan
        this._vicWeaponSummary = mk(this.add.text(cx, cy + 18, '', {
            fontSize: '11px', fill: '#86efac', fontFamily: FONT_BODY, align: 'center'
        }).setOrigin(0.5));

        // Tombol Utama: Lanjut ke Dungeon Level 2 (Ranged Mages)
        const vL2 = mk(this.add.rectangle(cx, cy + 58, 380, 38, 0x581c87, 0.95).setStrokeStyle(2, 0xd946ef).setInteractive({ useHandCursor: true }));
        const vL2t = mk(this.add.text(cx, cy + 58, 'Lanjut ke Dungeon Level 2 (Musuh Sihir) ➔', { fontSize: '12px', fontStyle: 'bold', fill: '#f5d0fe', fontFamily: FONT_BODY }).setOrigin(0.5));
        const goToL2 = () => {
            this.scene.start('DungeonScene2', {
                hp: this.hp,
                maxHp: this.maxHp,
                inventory: this.inventory,
                currentWeaponId: this.currentWeapon.id,
                pickedWeapons: this.pickedWeapons
            });
        };
        vL2.on('pointerdown', goToL2);
        vL2.on('pointerover', () => vL2.setFillStyle(0x7e22ce, 1));
        vL2.on('pointerout',  () => vL2.setFillStyle(0x581c87, 0.95));

        vL2t.setInteractive({ useHandCursor: true });
        vL2t.on('pointerdown', goToL2);
        vL2t.on('pointerover', () => vL2.setFillStyle(0x7e22ce, 1));
        vL2t.on('pointerout',  () => vL2.setFillStyle(0x581c87, 0.95));

        // Tombol Menu Utama
        const v3 = mk(this.add.rectangle(cx, cy + 104, 200, 32, 0x0f172a, 0.9).setStrokeStyle(1.5, 0x475569).setInteractive({ useHandCursor: true }));
        const v3t = mk(this.add.text(cx, cy + 104, 'Menu Utama', { fontSize: '11px', fontStyle: 'bold', fill: '#94a3b8', fontFamily: FONT_BODY }).setOrigin(0.5));
        const toTitleMenu = () => { AudioManager.stopAmbientBGM?.(); this.scene.start('TitleScene'); };
        v3.on('pointerdown', toTitleMenu);
        v3.on('pointerover', () => v3.setFillStyle(0x1e293b, 1));
        v3.on('pointerout',  () => v3.setFillStyle(0x0f172a, 0.9));
        v3t.setInteractive({ useHandCursor: true });
        v3t.on('pointerdown', toTitleMenu);
        v3t.on('pointerover', () => v3.setFillStyle(0x1e293b, 1));
        v3t.on('pointerout',  () => v3.setFillStyle(0x0f172a, 0.9));
    }

    _buildSettingsModal() {
        this._settingsModal = new SettingsModal(this, {
            isGameScene: true,
            onSaveGame: () => { this._saveProgress(true); this._showToast('Tersimpan!', 0x22c55e); },
            onToMenu:   () => { this._saveProgress(false); this.scene.start('TitleScene'); },
            onToggleTouch: () => {
                this._touchContainer.setVisible(!this._touchContainer.visible);
                return this._touchContainer.visible;
            }
        });
    }

    _toggleSettings() {
        this.isSettingsOpen = !this._settingsModal.isOpen();
        if (this.isSettingsOpen) this._settingsModal.show();
        else this._settingsModal.hide();
    }

    _showVictory() {
        this.isVictoryOpen = true;
        this._saveProgress(false);
        if (this._vicWeaponSummary) {
            this._vicWeaponSummary.setText(`Senjata Ditemukan: ${this.pickedWeapons.length > 0 ? this.pickedWeapons.join(', ') : 'Tidak ada'}`);
        }
        this._vicElements?.forEach(el => el.setVisible(true));
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

    _saveProgress(toast = true) {
        SaveManager.save({
            hp: this.hp, maxHp: this.maxHp,
            inventory: this.inventory,
            collectedItemIds: this.collectedItemIds,
            currentWeaponId: this.currentWeapon.id,
            pickedWeapons: this.pickedWeapons,
        });
        if (toast) this._showToast('Disimpan!', 0x10b981);
    }

    _showToast(msg, color = 0x38bdf8) {
        if (!msg) return;
        const hexC = '#' + color.toString(16).padStart(6, '0');
        const px   = this.player?.x ?? 400;
        const py   = this.player?.y ? this.player.y - 35 : 200;
        const toast = this.add.text(px, py, msg, {
            fontSize: '11px', fontStyle: 'bold', fill: hexC,
            backgroundColor: '#0f172acc', padding: { x: 6, y: 3 }, fontFamily: FONT_BODY
        }).setOrigin(0.5).setDepth(35);
        this.tweens.add({ targets: toast, y: toast.y - 28, alpha: 0, duration: 1400, onComplete: () => toast.destroy() });
    }

    // ─────────────────────────────────────────────────
    // UPDATE LOOP
    // ─────────────────────────────────────────────────
    update() {
        if (!this.player?.body) return;

        // Prompt pintu keluar
        if (this.exitPortal && this._exitPrompt) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1550, 388);
            this._exitPrompt.setVisible(d < 110);
        }

        // [E] atau [ENTER] keluar / masuk Level 2 (keyboard)
        const eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        if (Phaser.Input.Keyboard.JustDown(eKey) || Phaser.Input.Keyboard.JustDown(enterKey)) {
            this._tryExit();
        }

        if (this.isGameOver || this.isVictoryOpen || this.isSettingsOpen) {
            this.player.setVelocityX(0);
            return;
        }

        // Gerak player
        const speed   = CONFIG_SKELETON.player.kecepatan    || 220;
        const jumpSpd = -(CONFIG_SKELETON.player.kekuatanLompat || 440);
        const left    = this.cursors?.left.isDown  || this.keys?.a.isDown  || this.touchState.left;
        const right   = this.cursors?.right.isDown || this.keys?.d.isDown  || this.touchState.right;
        const jump    = this.cursors?.up.isDown    || this.keys?.w.isDown  || this.keys?.space.isDown || this.touchState.jump;

        this.player.setVelocityX(left ? -speed : right ? speed : 0);
        if (left)  this.player.setFlipX(true);
        if (right) this.player.setFlipX(false);

        if (jump && (this.player.body.touching.down || this.player.body.blocked.down)) {
            this.player.setVelocityY(jumpSpd);
        }

        // Posisi sprite senjata ikut player
        if (this._weaponSprite) {
            const offX = this.player.flipX ? -18 : 18;
            this._weaponSprite.setPosition(this.player.x + offX, this.player.y + 4);
            this._weaponSprite.setFlipX(this.player.flipX);
        }

        // AI musuh
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy.isDead || !enemy.active) return;

                // Patroli dasar
                if (enemy.x <= enemy.patrolMin) enemy.direction = 1;
                else if (enemy.x >= enemy.patrolMax) enemy.direction = -1;
                enemy.setVelocityX(enemy.patrolSpeed * enemy.direction);
                enemy.setFlipX(enemy.direction < 0);

                // Aggro (kejar player jika dekat)
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < 200) {
                    const dir = this.player.x > enemy.x ? 1 : -1;
                    enemy.setVelocityX(enemy.patrolSpeed * 1.5 * dir);
                    enemy.setFlipX(dir < 0);
                }

                this._drawEnemyHP(enemy);
                enemy.nameTag?.setPosition(enemy.x, enemy.y - 46);
            });
        }

        this._updateEnemyCount();
    }
}
