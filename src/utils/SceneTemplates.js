// ===============================================================
// SCENE TEMPLATES ENGINE: KUMPULAN TEMPLATE KODE WORLD BUILDER
// ===============================================================
// Didesain khusus untuk edukasi murid & pemula:
// - Komentar dalam Bahasa Indonesia yang ramah pemula
// - 100% Bebas dari anomali portal
// - Modular dan siap di-copy-paste ke Scene3.js
// ===============================================================

export class SceneTemplates {
    static templates = {
        // ===========================================================
        // 1. BASE SCENE UTUH (UNTUK BIKIN DUNIA / LEVEL BARU DARI NOL)
        // ===========================================================
        scene: {
            title: 'Template 1 File Scene Baru Utuh',
            icon: '🌍',
            badge: 'FULL SCENE',
            targetFile: 'src/scenes/CustomWorldScene.js',
            targetPlace: 'Buat file baru di folder src/scenes/',
            description: 'Kerangka lengkap 1 file Scene Phaser 4 (kamera, kontrol, lantai, hero, dan portal kembali ke Hub).',
            code: `import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { AudioManager } from '../utils/AudioManager.js';
import { CommandConsole } from '../utils/CommandConsole.js';
import { FONT_BODY } from '../utils/helpers.js';

export class CustomWorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CustomWorldScene' });
    }

    init(data = {}) {
        this.hp = data.hp || 3;
        this.maxHp = data.maxHp || 3;
        this.inventory = data.inventory || [];
        this.touchState = { left: false, right: false, jump: false };
    }

    create() {
        // Buka Chat & Command Console
        CommandConsole.show();

        // 1. Warna Latar Dunia
        this.cameras.main.setBackgroundColor('#0b1329');

        // 2. Setup Batas Luas Dunia (Lebar 1600px, Tinggi 450px)
        const worldWidth = 1600;
        this.physics.world.setBounds(0, 0, worldWidth, 450);
        this.cameras.main.setBounds(0, 0, worldWidth, 450);

        // 3. Buat Lantai Dasar
        this.platforms = this.physics.add.staticGroup();
        const ground = this.add.rectangle(worldWidth / 2, 435, worldWidth, 30, 0x1e293b).setDepth(5);
        this.physics.add.existing(ground, true);
        this.platforms.add(ground);

        // 4. Buat Karakter Utama (Hero)
        this.player = this.physics.add.sprite(160, 360, 'hero_default');
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 5. Portal Pintu Keluar Aman ke Main Menu / Project Hub
        this.portalExit = this.add.rectangle(80, 395, 45, 60, 0x38bdf8, 0.3)
            .setStrokeStyle(2, 0x38bdf8).setDepth(6);
        this.add.text(80, 350, '← Hub', { fontSize: '11px', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);

        // 6. Kontrol Keyboard (A, D, W, Spasi, E)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            e: Phaser.Input.Keyboard.KeyCodes.E
        });

        this.input.keyboard.on('keydown-E', () => this.handleInteract());
    }

    handleInteract() {
        // Dekat dengan Portal Keluar? Kembali ke Menu Utama
        const distPortal = Phaser.Math.Distance.Between(this.player.x, this.player.y, 80, 395);
        if (distPortal < 70) {
            this.scene.start('TitleScene');
        }
    }

    update() {
        if (!this.player || !this.player.body) return;
        const speed = 220;
        const onGround = this.player.body.blocked.down;

        if (this.keys.a.isDown || this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.keys.d.isDown || this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if ((this.keys.w.isDown || this.cursors.up.isDown || this.keys.space.isDown) && onGround) {
            this.player.setVelocityY(-350);
            AudioManager.playJump();
        }
    }
}`
        },

        // ===========================================================
        // 2. LANTAI & PLATFORM PIJAKAN (TILE / FLOOR)
        // ===========================================================
        tile: {
            title: 'Template Lantai & Platform Melayang',
            icon: '🧱',
            badge: 'PLATFORM',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create()',
            description: 'Membuat pijakan melayang dan platform tambahan yang kokoh untuk dipijak karakter.',
            code: `// ===============================================================
// 🧱 PLATFORM & PIJAKAN MELAYANG TAMBAHAN
// ===============================================================
// Fungsi bantu membuat 1 platform (x, y, lebar, tinggi, warna)
const buatPlatform = (x, y, w, h, warna = 0x334155) => {
    // 1. Tampilan Visual Kotak Platform
    const visual = this.add.rectangle(x, y, w, h, warna).setDepth(5);
    // Garis sorot atas agar terlihat 3D keren
    this.add.rectangle(x, y - h / 2 + 2, w, 3, 0x94a3b8).setDepth(6);
    // 2. Fisika Tabrakan (Agar karakter bisa berpijak)
    const phys = this.add.rectangle(x, y, w, h, 0x000000, 0);
    this.physics.add.existing(phys, true);
    this.platforms.add(phys);
};

// Buat 3 platform melayang dengan ketinggian bervariasi:
buatPlatform(450, 320, 160, 20, 0x1e293b); // Platform rendah
buatPlatform(720, 240, 180, 20, 0x1e293b); // Platform sedang
buatPlatform(980, 180, 150, 20, 0x1e293b); // Platform tinggi`
        },

        // ===========================================================
        // 3. KARAKTER PLAYER & KAMERA FOLLOW
        // ===========================================================
        player: {
            title: 'Template Karakter Player & Kamera Follow',
            icon: '🏃',
            badge: 'PLAYER',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create()',
            description: 'Menyiapkan karakter hero utama dengan gravitasi, collider lantai, dan kamera yang mengikutinya.',
            code: `// ===============================================================
// 🏃 INISIALISASI KARAKTER HERO & KAMERA
// ===============================================================
// 1. Buat Karakter di koordinat X: 200, Y: 360
this.player = this.physics.add.sprite(200, 360, 'hero_default');
this.player.setDepth(15);
this.player.setCollideWorldBounds(true); // Agar tidak jatuh tembus batas dunia
this.player.setBounce(0.05);

// 2. Sambungkan Fisika Tabrakan Hero dengan Lantai
this.physics.add.collider(this.player, this.platforms);

// 3. Kamera Otomatis Mengikuti Gerakan Hero
this.cameras.main.startFollow(this.player, true, 0.08, 0.08);`
        },

        // ===========================================================
        // 4. KARAKTER NPC INTERAKTIF
        // ===========================================================
        npc: {
            title: 'Template Karakter NPC Interaktif',
            icon: '🧙',
            badge: 'NPC',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create() & handleInteract()',
            description: 'Membuat karakter NPC yang bisa diajak berbicara saat didekati dan menekan tombol [E].',
            code: `// ===============================================================
// 🧙 KARAKTER NPC (Contoh: Kakek Bijak)
// Letakkan blok ini di dalam create():
// ===============================================================
this.npc = this.add.container(600, 385).setDepth(14);

// Tubuh NPC (Visual Kotak Berkarakter / Sprite)
const npcBody = this.add.rectangle(0, 0, 36, 52, 0x8b5cf6).setStrokeStyle(2, 0xc4b5fd);
const npcMata = this.add.rectangle(6, -10, 6, 6, 0xffffff);

// Label Nama di atas kepala NPC
const npcName = this.add.text(0, -38, 'Kakek Bijak', {
    fontSize: '12px',
    fontStyle: 'bold',
    fill: '#c4b5fd',
    fontFamily: FONT_BODY
}).setOrigin(0.5);

// Ikon Indikator [E Bicara] saat didekati
this.npcPrompt = this.add.text(0, -56, '[E] Bicara', {
    fontSize: '11px',
    fill: '#fde047',
    backgroundColor: '#0f172a',
    padding: { x: 6, y: 3 },
    fontFamily: FONT_BODY
}).setOrigin(0.5).setVisible(false);

this.npc.add([npcBody, npcMata, npcName, this.npcPrompt]);

// Animasi Napas Mengambang (Idle Floating Tween)
this.tweens.add({
    targets: this.npc,
    y: '-=4',
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
});`
        },

        // ===========================================================
        // 5. SISTEM DIALOG PERCAKAPAN (MULTI-NPC SUPPORT)
        // ===========================================================
        dialogue: {
            title: 'Template Sistem Dialog Multi-NPC',
            icon: '💬',
            badge: 'DIALOGUE',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi handleInteract()',
            description: 'Mengatur percakapan berbeda untuk setiap NPC (misal NPC A beda isi bicaranya dengan NPC B).',
            code: `// ===============================================================
// 💬 LOGIKA PERCAKAPAN MULTI-NPC
// Letakkan blok ini di dalam handleInteract():
// ===============================================================
if (!this.player) return;

// 1. Cek Jarak dengan NPC Pertama: "Kakek Bijak" (x: 600)
const distKeKakek = Phaser.Math.Distance.Between(this.player.x, this.player.y, 600, 385);
if (distKeKakek < 80) {
    AudioManager.playClick();
    this.dialogBox.start("Kakek Bijak", [
        "Salam pengelana muda! Senang bertemu denganmu di dunia ini.",
        "Dunia ini dibangun menggunakan kode-kode sakti JavaScript.",
        "Lompatlah ke platform di atas untuk menemukan rahasia tersembunyi!"
    ]);
    return;
}

// 2. (Opsional) Cek Jarak jika ada NPC Kedua: "Kucing Penjaga" (x: 950)
const distKeKucing = Phaser.Math.Distance.Between(this.player.x, this.player.y, 950, 385);
if (distKeKucing < 80) {
    AudioManager.playClick();
    this.dialogBox.start("Kucing Oyen", [
        "Meooww! Aku sedang menjaga ikan koin emasku.",
        "Jangan lupa simpan perubahan kreasimu ya!"
    ]);
    return;
}`
        },

        // ===========================================================
        // 6. MISI / QUEST TRACKER
        // ===========================================================
        quest: {
            title: 'Template Misi & Quest Tracker',
            icon: '📋',
            badge: 'QUEST',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create()',
            description: 'Membuat misi petualangan di HUD dan item target yang bisa diambil untuk menyelesaikan misi.',
            code: `// ===============================================================
// 📋 SETUP MISI (QUEST) & ITEM TARGET
// ===============================================================
// 1. Tentukan Judul & Deskripsi Misi
this.quest = {
    judul: "Misi: Mengambil Kristal Langit",
    deskripsi: "Panjatlah platform tertinggi dan ambil Kristal Ajaib yang bersinar!",
    selesai: false
};

// 2. Taruh Item Kristal di atas platform (x: 980, y: 130)
this.kristalItem = this.physics.add.sprite(980, 130, 'item_gem');
this.kristalItem.setDepth(12);

// Animasi Kristal Melayang Berkilau
this.tweens.add({
    targets: this.kristalItem,
    y: '-=8',
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
});

// 3. Ketika Hero Menyentuh Kristal -> Misi Selesai!
this.physics.add.overlap(this.player, this.kristalItem, () => {
    if (this.quest.selesai) return;
    this.quest.selesai = true;
    this.kristalItem.destroy(); // Hilangkan kristal
    AudioManager.playSuccess();
    this.showFloatingToast('🎉 Misi Selesai! Kristal Langit Berhasil Didapatkan!', 0x22c55e);
});`
        },

        // ===========================================================
        // 7. RINTANGAN DURI / HAZARD BERBAHAYA
        // ===========================================================
        obstacle: {
            title: 'Template Rintangan Duri & Bahaya (Obstacle)',
            icon: '⚠️',
            badge: 'HAZARD',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create()',
            description: 'Membuat duri jebakan berbahaya yang mengurangi HP darah hero jika tersentuh.',
            code: `// ===============================================================
// ⚠️ RINTANGAN DURI (HAZARD OBSTACLE)
// ===============================================================
// Buat grup rintangan duri
this.hazards = this.physics.add.staticGroup();

const buatDuri = (x, y, lebar = 70) => {
    // Tampilan visual duri merah segitiga/persegi
    const visual = this.add.rectangle(x, y, lebar, 16, 0xef4444).setDepth(6);
    this.add.text(x, y - 2, '▲▲▲▲▲', { fontSize: '12px', fill: '#fee2e2' }).setOrigin(0.5).setDepth(7);
    
    const phys = this.add.rectangle(x, y, lebar, 16, 0x000000, 0);
    this.physics.add.existing(phys, true);
    this.hazards.add(phys);
};

// Pasang duri di lantai (x: 550) dan di bawah tebing (x: 850)
buatDuri(550, 412, 80);
buatDuri(850, 412, 90);

// Jika Hero Menginjak Duri -> Terkena Damage!
this.physics.add.overlap(this.player, this.hazards, () => {
    if (this.isInvincible || this.isGameOver) return;
    this.takeDamage(1); // Mengurangi 1 HP darah
});`
        },

        // ===========================================================
        // 8. BACKGROUND PARALLAX MULTI-LAYER
        // ===========================================================
        parallax: {
            title: 'Template Latar Parallax Multi-Layer',
            icon: '🌄',
            badge: 'PARALLAX',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di baris paling atas create() sebelum lantai',
            description: 'Efek latar berlapis (langit diam, gunung lambat, awan bergeser) menciptakan kedalaman 3D.',
            code: `// ===============================================================
// 🌄 LATAR BELAKANG PARALLAX 3 LAPIS KEDALAMAN
// ===============================================================
const worldW = 1600;

// Layer 1: Langit Malam Diam (ScrollFactor 0 = Mengikuti layar)
this.add.rectangle(400, 225, 800, 450, 0x090e1a).setScrollFactor(0).setDepth(0);

// Layer 2: Siluet Gunung Jauh (ScrollFactor 0.2 = Bergerak sangat lambat)
for (let i = 0; i < worldW; i += 320) {
    this.add.triangle(i + 160, 360, 0, 180, 160, 0, 320, 180, 0x1e1b4b, 0.6)
        .setScrollFactor(0.2).setDepth(1);
}

// Layer 3: Pepohonan Tengah (ScrollFactor 0.5 = Bergerak sedang)
for (let i = 0; i < worldW; i += 220) {
    this.add.rectangle(i + 110, 385, 24, 70, 0x064e3b, 0.75)
        .setScrollFactor(0.5).setDepth(2);
    this.add.circle(i + 110, 340, 28, 0x047857, 0.8)
        .setScrollFactor(0.5).setDepth(3);
}`
        },

        // ===========================================================
        // 9. CUTSCENE OTOMATIS SINEMATIK
        // ===========================================================
        cutscene: {
            title: 'Template Cutscene Kamera Sinematik',
            icon: '🎬',
            badge: 'CUTSCENE',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Sebagai method baru di dalam class Scene3',
            description: 'Mengunci kontrol pemain sementara kamera bergeser secara halus menyorot lokasi penting.',
            code: `// ===============================================================
// 🎬 FUNGSI CUTSCENE SINEMATIK
// ===============================================================
playIntroCutscene() {
    this.isCutsceneActive = true; // Kunci kontrol tombol pemain
    this.player.setVelocityX(0);

    // 1. Kamera bergeser halus (Pan) menyorot ke arah kanan (x: 1000)
    this.cameras.main.pan(1000, 225, 2200, 'Sine.easeInOut');

    // 2. Setelah kamera sampai, munculkan dialog penjelasan
    this.time.delayedCall(2400, () => {
        this.dialogBox.start("Narator", [
            "Lihatlah ke sekelilingmu...",
            "Dunia ini adalah kanvas kosong yang siap kamu bangun!",
            "Gunakan tombol /create untuk menambahkan keajaiban kreasimu."
        ], () => {
            // 3. Setelah dialog selesai, kembalikan kamera ke Hero
            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
            this.isCutsceneActive = false; // Buka kembali kontrol gerak
        });
    });
}`
        },

        // ===========================================================
        // 10. PORTAL GERBANG KELUAR AMAN (ANTI-ANOMALI)
        // ===========================================================
        portal: {
            title: 'Template Portal Gerbang Keluar Aman (Anti-Loop)',
            icon: '🌀',
            badge: 'PORTAL',
            targetFile: 'src/scenes/Scene3.js',
            targetPlace: 'Di dalam fungsi create() & handleInteract()',
            description: 'Pintu gerbang yang membawa pemain kembali ke Project Hub (Main Menu) dengan aman.',
            code: `// ===============================================================
// 🌀 PORTAL GERBANG KELUAR AMAN (KEMBALI KE HUB)
// Letakkan blok ini di dalam create():
// ===============================================================
const portalX = 80;
const portalY = 395;

this.portalHub = this.add.container(portalX, portalY).setDepth(12);

// Cincin Berputar Berkilau
const pRing = this.add.circle(0, 0, 24, 0x0284c7, 0.25).setStrokeStyle(2, 0x38bdf8);
const pIcon = this.add.text(0, 0, 'HUB', { fontSize: '11px', fontStyle: 'bold', fill: '#bae6fd' }).setOrigin(0.5);
const pLabel = this.add.text(0, -32, '← Menu Utama', { fontSize: '11px', fill: '#38bdf8' }).setOrigin(0.5);

this.portalHub.add([pRing, pIcon, pLabel]);

this.tweens.add({
    targets: pRing,
    angle: 360,
    duration: 4000,
    repeat: -1,
    ease: 'Linear'
});

// Prompt Bantuan [E Keluar] saat hero mendekat
this.portalPrompt = this.add.text(portalX, portalY - 52, '[E] Ke Menu Utama', {
    fontSize: '11px',
    fill: '#fde047',
    backgroundColor: '#0f172a',
    padding: { x: 6, y: 3 }
}).setOrigin(0.5).setDepth(20).setVisible(false);`
        }
    };

    /**
     * Mengambil template berdasarkan topik
     */
    static get(topic = '') {
        const key = topic.trim().toLowerCase();
        const aliasMap = {
            'floor': 'tile',
            'platform': 'tile',
            'tiles': 'tile',
            'sprite': 'player',
            'hero': 'player',
            'karakter': 'player',
            'dialog': 'dialogue',
            'misi': 'quest',
            'duri': 'obstacle',
            'hazard': 'obstacle',
            'rintangan': 'obstacle',
            'bg': 'parallax',
            'background': 'parallax',
            'pintu': 'portal',
            'world': 'scene'
        };

        const resolvedKey = aliasMap[key] || key;
        return this.templates[resolvedKey] || null;
    }

    /**
     * Mengembalikan daftar ringkas seluruh template yang ada
     */
    static getCatalog() {
        return Object.entries(this.templates).map(([key, item]) => ({
            key,
            title: item.title,
            icon: item.icon,
            badge: item.badge,
            targetFile: item.targetFile,
            description: item.description
        }));
    }
}
