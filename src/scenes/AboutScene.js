import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { FONT_TITLE, FONT_BODY } from '../utils/helpers.js';
import { CommandConsole } from '../utils/CommandConsole.js';

// ===============================================================
// ABOUT SCENE: EDITORIAL HERO BANNER & STORYTELLING LAYOUT
// Gaya: Modern Hero Banner di Atas, Konten Teks di Bawah (Scrollable)
// ===============================================================
export class AboutScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AboutScene' });
        this.targetScrollY = 0;
        this.maxScrollY = 0;
        this.autoScrollActive = false;
        this.userInteracting = false;
        this.autoScrollResumeTimer = null;
        this.autoScrollSpeed = 28; // Kecepatan auto-scroll (pixel per detik)
    }

    preload() {
        if (!this.textures.exists('about_footer_logo')) {
            this.load.image('about_footer_logo', '/the_game_template.png');
        }
        if (!this.textures.exists('npc_firefly')) {
            this.load.image('npc_firefly', '/assets/npc_firefly.png');
        }
        if (!this.textures.exists('npc_template')) {
            this.load.image('npc_template', '/npc_template.png');
        }
        if (!this.textures.exists('villain_template')) {
            this.load.image('villain_template', '/VILLAIN_TEMPLATE.png');
        }
    }

    create() {
        CommandConsole.hide();

        const W = this.scale.width || 800;
        const H = this.scale.height || 450;
        const centerX = W / 2;

        this.targetScrollY = 0;
        this.cameras.main.scrollY = 0;
        this.cameras.main.setBackgroundColor('#ffffff');

        // Mulai auto scroll setelah jeda awal 2 detik
        this.autoScrollActive = false;
        this.userInteracting = false;
        if (this.autoScrollResumeTimer) {
            this.autoScrollResumeTimer.remove();
            this.autoScrollResumeTimer = null;
        }
        this.time.delayedCall(2000, () => {
            this.autoScrollActive = true;
        });

        const heroH = 200;
        const contentStartY = heroH;

        // ─────────────────────────────────────────────────────────
        // 1. BAGIAN ATAS: HERO BANNER (WARNA HIJAU PASTEL MAIN MENU)
        // ─────────────────────────────────────────────────────────
        const heroBg = this.add.rectangle(centerX, heroH / 2, Math.max(W, 800), heroH, 0xdcff78, 1).setDepth(5);

        // Judul Utama: About \n The Game Template
        const heroTitle = this.add.text(centerX, 62, "About\nThe Game Template", {
            fontSize: '30px',
            fontStyle: 'bold',
            fill: '#000000',
            align: 'center',
            lineSpacing: 2,
            fontFamily: FONT_TITLE || FONT_BODY
        }).setOrigin(0.5).setDepth(7);



        // ─────────────────────────────────────────────────────────
        // 2. BAGIAN BAWAH: MANIFESTO & CREDITS
        // ─────────────────────────────────────────────────────────
        const manifestoLines = [
            'DEVELOPED BY',
            '',
            'Andika Catur Ariantono',
            '@andikacatvr',
            '',
            '',
            'PRESENTED FOR',
            '',
            'Gendigital Academy',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'TECHNOLOGY',
            '',
            'Engine — Phaser.js',
            'Visual Style — Pixel Art',
            'Platform — 2D Side-Scroller',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'WHO THIS TEMPLATE IS FOR',
            '',
            'Educators,',
            'who dare to teach something new.',
            '',
            'Indonesian Children,',
            'the next generation of creators.',
            '',
            'Every Imagination,',
            'waiting for a place to come alive.',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'A MISSION',
            '',
            'In a world that moves fast,',
            'the ability to create is the most valuable skill.',
            '',
            'This template was not built as just a game—',
            'it was built as a space to learn.',
            '',
            'An empty canvas,',
            'waiting for a child\'s imagination to fill it.',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'WHAT WILL BE LEARNED',
            '',
            'Character Design',
            '— bringing imagination to life',
            '',
            'World Building',
            '— crafting environments & parallax backgrounds',
            '',
            'Obstacle Design',
            '— shaping challenges within the game',
            '',
            'Mission & Objectives',
            '— what to face, what to collect, what to complete',
            '',
            'Game Logic',
            '— understanding what runs behind the scenes',
            '',
            'Powered by Artificial Intelligence,',
            'guided by human imagination.',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'ACKNOWLEDGMENTS',
            '',
            'To every educator who believes',
            'learning can be fun.',
            '',
            'To every child who dares to dream',
            'through a world of their own making.',
            '',
            'And to you,',
            'reading this right now—',
            'the next game is in your hands.',
            '',
            '',
            '────────────────────────────────',
            '',
            '',
            'FROM IDEA TO GAME.',
            'FROM IMAGINATION TO REALITY.',
            '',
            '',
            'THANK YOU',
            'FOR CREATING',
            '',
            '════════════════════════════════'
        ];

        // ─────────────────────────────────────────────────────────
        // MINI THEATER ANIMASI: THEATER LOOP (DI BAWAH AREA YELLOW-GREEN)
        // ─────────────────────────────────────────────────────────
        this._startTheaterLoop(W, heroH);

        let currentY = contentStartY + 45;

        manifestoLines.forEach(rawLine => {
            const line = rawLine.trim();
            if (!line) {
                currentY += 13;
                return;
            }

            const isSeparator = line.startsWith('═') || line.startsWith('─');
            const isCaps = !isSeparator && line === line.toUpperCase() && /[A-Z]/.test(line);
            const isMainTitle = line.toLowerCase() === 'the game template';

            const style = {
                fontFamily: isSeparator ? '"Consolas", "Courier New", monospace' : FONT_BODY,
                fontSize: isMainTitle ? '16px' : (isCaps ? '13px' : '12.5px'),
                fontStyle: (isCaps || isMainTitle) ? 'bold' : 'normal',
                fill: isSeparator ? '#94a3b8' : (isCaps || isMainTitle ? '#000000' : '#334155'),
                align: 'center'
            };

            const textObj = this.add.text(centerX, currentY, line, style)
                .setOrigin(0.5, 0)
                .setDepth(3);

            currentY += Math.round(textObj.height) + 4;
        });

        const textBottomY = currentY;
        const footerStartY = textBottomY + 50;
        const footerH = 175;
        const totalContentH = footerStartY + footerH;
        this.maxScrollY = Math.max(0, totalContentH - H);

        // Latar Belakang Bagian Konten Teks (Putih Polos)
        const bottomBg = this.add.graphics().setDepth(1);
        bottomBg.fillStyle(0xffffff, 1);
        bottomBg.fillRect(0, contentStartY, Math.max(W, 800), footerStartY - contentStartY);

        // Garis Pemisah Halus Antara Banner Atas dan Konten
        const borderLine = this.add.rectangle(centerX, contentStartY, Math.max(W, 800), 2, 0xe2e8f0).setDepth(5);

        // ─────────────────────────────────────────────────────────
        // FOOTER BANNER: THE GAME TEMPLATE (#dcff78)
        // ─────────────────────────────────────────────────────────
        const footerBg = this.add.rectangle(centerX, footerStartY + (footerH + 120) / 2, Math.max(W, 800), footerH + 120, 0xdcff78, 1).setDepth(2);
        const footerBorder = this.add.rectangle(centerX, footerStartY, Math.max(W, 800), 1.5, 0xe2e8f0).setDepth(3);

        // Logo Footer the_game_template.png
        const footerLogoH = 130;
        const footerLogoW = footerLogoH * (1920 / 1080); // ~231px
        this.add.image(centerX, footerStartY + footerH / 2, 'about_footer_logo')
            .setDisplaySize(footerLogoW, footerLogoH)
            .setDepth(4);

        // Kunang-kunang ambient seperti di Main Menu
        this._createFireflies(W, contentStartY, footerStartY, footerH);



        // ─────────────────────────────────────────────────────────
        // 3. ELEMEN TETAP (FIXED UI / SCROLLFACTOR 0)
        // ─────────────────────────────────────────────────────────
        // Tombol Kembali (Menu Utama) Selalu Menempel di Pojok Kiri Atas
        this._createFixedBackButton(88, 32, () => this._returnToMenu());

        // Scrollbar Track & Thumb Minimalis di Kanan
        if (this.maxScrollY > 0) {
            this._setupScrollbar(W, H);
        }

        // Listener Mouse Wheel & Touch Drag untuk Scrolling
        this._setupScrollInput();

        // Keyboard ESC untuk kembali
        this.input.keyboard.on('keydown-ESC', () => {
            this._returnToMenu();
        });
    }

    _createFixedBackButton(x, y, callback) {
        const container = this.add.container(x, y).setDepth(200).setScrollFactor(0);

        const bg = this.add.rectangle(0, 0, 125, 30, 0x0f172a, 0.85)
            .setStrokeStyle(1, 0xffffff, 0.35)
            .setInteractive({ useHandCursor: true });

        const txt = this.add.text(0, 0, '← Main Menu', {
            fontSize: '11px',
            fontStyle: 'bold',
            fill: '#ffffff',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        container.add([bg, txt]);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x1e293b, 0.95);
            bg.setStrokeStyle(1.5, 0x38bdf8, 0.9);
            this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 90 });
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x0f172a, 0.85);
            bg.setStrokeStyle(1, 0xffffff, 0.35);
            this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 90 });
        });
        bg.on('pointerdown', callback);

        return container;
    }

    _setupScrollbar(W, H) {
        this.scrollTrackX = W - 10;
        this.scrollTrackY = 60;
        this.scrollTrackH = H - 100;

        const track = this.add.rectangle(this.scrollTrackX, this.scrollTrackY + this.scrollTrackH / 2, 4, this.scrollTrackH, 0x000000, 0.12)
            .setDepth(150)
            .setScrollFactor(0);

        this.scrollThumbH = 36;
        this.scrollThumb = this.add.rectangle(this.scrollTrackX, this.scrollTrackY + this.scrollThumbH / 2, 4, this.scrollThumbH, 0x0f172a, 0.6)
            .setDepth(151)
            .setScrollFactor(0);
    }

    _setupScrollInput() {
        const onUserManualScroll = () => {
            this._pauseAutoScroll();
        };

        // Mouse Wheel Scroll
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (this.maxScrollY <= 0) return;
            onUserManualScroll();
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + deltaY * 0.7, 0, this.maxScrollY);
        });

        // Pointer Drag Scroll
        let isDown = false;
        let startY = 0;
        let startScroll = 0;

        this.input.on('pointerdown', (pointer) => {
            // Abaikan klik pada tombol kembali
            if (pointer.x < 160 && pointer.y < 60) return;
            onUserManualScroll();
            isDown = true;
            startY = pointer.y;
            startScroll = this.targetScrollY;
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDown || this.maxScrollY <= 0) return;
            onUserManualScroll();
            const diff = pointer.y - startY;
            this.targetScrollY = Phaser.Math.Clamp(startScroll - diff * 1.2, 0, this.maxScrollY);
        });

        this.input.on('pointerup', () => {
            if (isDown) {
                isDown = false;
                onUserManualScroll();
            }
        });

        // Tombol Panah Bawah / Atas
        this.input.keyboard.on('keydown-DOWN', () => {
            onUserManualScroll();
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + 60, 0, this.maxScrollY);
        });
        this.input.keyboard.on('keydown-UP', () => {
            onUserManualScroll();
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY - 60, 0, this.maxScrollY);
        });
    }

    _pauseAutoScroll() {
        this.userInteracting = true;
        if (this.autoScrollResumeTimer) {
            this.autoScrollResumeTimer.remove();
        }
        // Auto-scroll diam saat user scroll sendiri; setelah 4 detik idle tanpa scroll manual, baru lanjut lagi perlahan
        this.autoScrollResumeTimer = this.time.delayedCall(4000, () => {
            this.userInteracting = false;
        });
    }

    update(time, delta) {
        if (this.maxScrollY > 0) {
            // Auto scroll berjalan otomatis jika user sedang tidak scroll manual dan belum mencapai dasar
            if (this.autoScrollActive && !this.userInteracting && this.targetScrollY < this.maxScrollY) {
                const dt = (delta || 16.6) / 1000;
                this.targetScrollY = Math.min(this.maxScrollY, this.targetScrollY + this.autoScrollSpeed * dt);
            }

            this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.targetScrollY, 0.18);

            if (this.scrollThumb) {
                const ratio = this.cameras.main.scrollY / this.maxScrollY;
                const availableH = this.scrollTrackH - this.scrollThumbH;
                this.scrollThumb.y = this.scrollTrackY + this.scrollThumbH / 2 + ratio * availableH;
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // KUNANG-KUNANG BERSINAR SEPERTI DI MAIN MENU
    // ─────────────────────────────────────────────────────────
    _createFireflies(W, contentStartY, footerStartY, footerH) {
        const glowColors = [0xfef08a, 0x67e8f9, 0xf472b6, 0xa78bfa, 0x38bdf8, 0xffffff];

        // 1. Kunang-kunang di Hero Banner Atas (Area sekitar judul)
        for (let i = 0; i < 7; i++) {
            const x = (i % 2 === 0) ? Phaser.Math.Between(40, W / 2 - 130) : Phaser.Math.Between(W / 2 + 130, W - 40);
            const y = Phaser.Math.Between(25, 95);
            this._spawnFirefly(x, y, 6, glowColors, 20, 15);
        }

        // 2. Kunang-kunang di Hero Banner Bawah (Dikit aja di area bawah agar tidak kosong)
        for (let i = 0; i < 4; i++) {
            const x = Phaser.Math.Between(60, W - 60);
            const y = Phaser.Math.Between(120, 165);
            this._spawnFirefly(x, y, 6, glowColors, 20, 12);
        }

        // 3. Kunang-kunang di Footer Banner Bawah (Area hijau #dcff78 paling bawah)
        for (let i = 0; i < 7; i++) {
            const x = (i % 2 === 0) ? Phaser.Math.Between(40, W / 2 - 150) : Phaser.Math.Between(W / 2 + 150, W - 40);
            const y = footerStartY + Phaser.Math.Between(45, footerH - 35);
            this._spawnFirefly(x, y, 5, glowColors, 20, 15);
        }
    }

    _spawnFirefly(x, y, depth, glowColors, maxMoveX, maxMoveY) {
        const auraColor = glowColors[Math.floor(Math.random() * glowColors.length)];
        const targetSize = Phaser.Math.Between(18, 24);

        const firefly = this.add.container(x, y).setDepth(depth);

        // 1. Glow Halo
        const glowHalo = this.add.graphics();
        glowHalo.fillStyle(auraColor, 0.45);
        glowHalo.fillCircle(0, 0, targetSize * 0.85);
        glowHalo.fillStyle(0xffffff, 0.60);
        glowHalo.fillCircle(0, 0, targetSize * 0.45);

        // 2. Sprite kunang-kunang mini
        const sprite = this.add.image(0, 0, 'npc_firefly');
        sprite.setDisplaySize(targetSize, targetSize);

        firefly.add([glowHalo, sprite]);

        // Pulse glow animation
        this.tweens.add({
            targets: glowHalo,
            alpha: { from: 0.25, to: 0.90 },
            scaleX: { from: 0.85, to: 1.30 },
            scaleY: { from: 0.85, to: 1.30 },
            duration: Phaser.Math.Between(800, 1600),
            yoyo: true,
            repeat: -1,
            delay: Phaser.Math.Between(0, 1500),
            ease: 'Sine.easeInOut'
        });

        // Wobble animation
        this.tweens.add({
            targets: sprite,
            angle: { from: -8, to: 8 },
            duration: Phaser.Math.Between(1800, 3000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Ambient drift
        const moveX = Phaser.Math.Between(-maxMoveX, maxMoveX);
        const moveY = Phaser.Math.Between(-maxMoveY, maxMoveY);
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
    }

    // ─────────────────────────────────────────────────────────
    // MINI THEATER LOOP (BERJALAN DI BAGIAN BAWAH AREA YELLOW-GREEN):
    // Babak 1: 1 Karakter Normal jalan kanan -> kiri
    // Babak 2: 2 Karakter Mini jalan kiri -> kanan
    // Babak 3: 3 Karakter Mini lari panik kanan -> kiri
    // Babak 4: 1 Monster Besar mengejar mereka bertiga!
    // -> Repeat ke Babak 1
    // ─────────────────────────────────────────────────────────
    _startTheaterLoop(W, heroH) {
        // Pijakan kaki karakter berada tepat di bagian bawah area banner kuning-hijau (di atas garis pemisah)
        const laneFeetY = heroH - 4;
        const npcKey = this.textures.exists('npc_portrait') ? 'npc_portrait' : 'npc_template';

        const stage1_solo = () => {
            if (!this.sys || !this.sys.game) return;

            // Babak 1: 1 Karakter Normal (ukuran 34px) jalan santai kanan ke kiri
            const charSize = 34;
            const baseY = laneFeetY - (charSize / 2);
            const s = this.add.image(W + 40, baseY, npcKey)
                .setDisplaySize(charSize, charSize)
                .setOrigin(0.5, 0.5)
                .setFlipX(true) // Menghadap kiri
                .setDepth(10);

            const hop = this.tweens.add({
                targets: s,
                y: baseY - 4,
                duration: 170,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            const wobble = this.tweens.add({
                targets: s,
                angle: { from: -5, to: 5 },
                duration: 210,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: s,
                x: -45,
                duration: 6500,
                ease: 'Linear',
                onComplete: () => {
                    hop.stop();
                    wobble.stop();
                    s.destroy();
                    this.time.delayedCall(400, stage2_twins);
                }
            });
        };

        const stage2_twins = () => {
            if (!this.sys || !this.sys.game) return;

            // Babak 2: 2 Karakter jalan kiri ke kanan (kanan 38px, kiri 24px)
            const distance = W + 90;
            const speedDuration = 5500;

            for (let i = 0; i < 2; i++) {
                // i = 0: karakter paling kanan (depan) -> 38px
                // i = 1: karakter kiri (belakang) -> 24px
                const isLeader = (i === 0);
                const charSize = isLeader ? 38 : 24;
                const baseY = laneFeetY - (charSize / 2); // Selaraskan posisi telapak kaki
                const startX = isLeader ? -35 : -80;

                const s = this.add.image(startX, baseY, npcKey)
                    .setDisplaySize(charSize, charSize)
                    .setOrigin(0.5, 0.5)
                    .setFlipX(false) // Menghadap kanan
                    .setDepth(10);

                const hop = this.tweens.add({
                    targets: s,
                    y: baseY - (isLeader ? 4 : 3),
                    duration: isLeader ? 150 : 130,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                const wobble = this.tweens.add({
                    targets: s,
                    angle: isLeader ? { from: -5, to: 5 } : { from: -6, to: 6 },
                    duration: isLeader ? 180 : 160,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.tweens.add({
                    targets: s,
                    x: startX + distance + 50,
                    duration: speedDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        hop.stop();
                        wobble.stop();
                        s.destroy();
                        if (i === 1) {
                            this.time.delayedCall(400, stage3_chase);
                        }
                    }
                });
            }
        };

        const stage3_chase = () => {
            if (!this.sys || !this.sys.game) return;

            // Babak 3: 3 Karakter Mini lari panik dari kanan ke kiri (paling kiri/depan diperbesar jadi 36px)
            const chaseDuration = 3200; // Lari kencang & panik!

            for (let i = 0; i < 3; i++) {
                // i = 0: karakter paling depan (paling kiri) -> 36px
                // i = 1, 2: kawan-kawan di belakangnya -> 22px
                const isFront = (i === 0);
                const charSize = isFront ? 36 : 22;
                const baseY = laneFeetY - (charSize / 2); // Selaraskan kaki
                const startX = W + 35 + (i * 32);

                const s = this.add.image(startX, baseY, npcKey)
                    .setDisplaySize(charSize, charSize)
                    .setOrigin(0.5, 0.5)
                    .setFlipX(true) // Menghadap kiri
                    .setDepth(10);

                const panicHop = this.tweens.add({
                    targets: s,
                    y: baseY - 5,
                    duration: 90,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                const panicWobble = this.tweens.add({
                    targets: s,
                    angle: { from: -10, to: 10 },
                    duration: 100,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.tweens.add({
                    targets: s,
                    x: -60,
                    duration: chaseDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        panicHop.stop();
                        panicWobble.stop();
                        s.destroy();
                    }
                });
            }

            // Babak 4: Monster / Villain di paling kanan (VILLAIN_TEMPLATE.png, 76px) mengejar tepat di belakang!
            const monsterSize = 76;
            const monsterBaseY = laneFeetY - (monsterSize / 2); // Selaraskan kaki di lantai
            const villainKey = this.textures.exists('villain_template') ? 'villain_template' : npcKey;
            const monster = this.add.image(W + 155, monsterBaseY, villainKey)
                .setDisplaySize(monsterSize, monsterSize)
                .setOrigin(0.5, 0.5)
                .setFlipX(true) // Menghadap kiri
                .setDepth(10);

            const monsterStomp = this.tweens.add({
                targets: monster,
                y: monsterBaseY - 6,
                duration: 140,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            const monsterWobble = this.tweens.add({
                targets: monster,
                angle: { from: -7, to: 7 },
                duration: 170,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: monster,
                x: -80,
                duration: 3500,
                ease: 'Linear',
                onComplete: () => {
                    monsterStomp.stop();
                    monsterWobble.stop();
                    monster.destroy();
                    // Selesai 1 siklus cerita -> Ulangi lagi dari awal!
                    this.time.delayedCall(700, stage1_solo);
                }
            });
        };

        // Mulai dari Babak 1
        stage1_solo();
    }

    _returnToMenu() {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }
}
