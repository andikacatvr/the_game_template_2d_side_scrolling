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
    }

    create() {
        CommandConsole.hide();

        const W = this.scale.width || 800;
        const H = this.scale.height || 450;
        const centerX = W / 2;

        this.targetScrollY = 0;
        this.cameras.main.scrollY = 0;
        this.cameras.main.setBackgroundColor('#f8fafc');

        const heroH = 220;
        const totalContentH = 620;
        this.maxScrollY = Math.max(0, totalContentH - H);

        // ─────────────────────────────────────────────────────────
        // 1. BAGIAN ATAS: HERO BANNER (GAMBAR & TITLE)
        // ─────────────────────────────────────────────────────────
        // Background Gambar Hero
        const heroBg = this.add.image(centerX, heroH / 2, 'bg_title')
            .setDisplaySize(Math.max(W, 800), heroH);
        
        // Dark Overlay Gradasi Sinematik
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x0f172a, 0x0f172a, 0.65, 0.65, 0.85, 0.85);
        overlay.fillRect(0, 0, Math.max(W, 800), heroH);

        // Badge Kecil di Atas Judul
        const topBadgeBg = this.add.rectangle(centerX, 72, 190, 22, 0xffffff, 0.15)
            .setStrokeStyle(1, 0xffffff, 0.4);
        const topBadgeTxt = this.add.text(centerX, 72, 'MEDIA BELAJAR GAME 2D', {
            fontSize: '10px',
            fontStyle: 'bold',
            fill: '#ffffff',
            fontFamily: FONT_BODY,
            letterSpacing: 1.5
        }).setOrigin(0.5);

        // Judul Utama Besar: About Us
        const heroTitle = this.add.text(centerX, 118, 'About Us', {
            fontSize: '34px',
            fontStyle: 'bold',
            fill: '#ffffff',
            fontFamily: FONT_TITLE || FONT_BODY
        }).setOrigin(0.5);
        heroTitle.setShadow(0, 4, 'rgba(0,0,0,0.5)', 8);

        // Tagline Subtitle di Bawah Judul
        const heroSubtitle = this.add.text(centerX, 156, 'Untuk para pelajar, pemula, dan kreator game masa depan.', {
            fontSize: '12px',
            fill: '#e2e8f0',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Petunjuk Scroll Halus di Bawah Banner
        const scrollHint = this.add.text(centerX, 195, 'v  Gulir ke bawah untuk membaca rincian  v', {
            fontSize: '10px',
            fill: '#94a3b8',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.tweens.add({
            targets: scrollHint,
            y: 200,
            alpha: { from: 0.6, to: 1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ─────────────────────────────────────────────────────────
        // 2. BAGIAN BAWAH: KONTEN TEKS BERSIH (DI BAWAH GAMBAR)
        // ─────────────────────────────────────────────────────────
        const contentStartY = heroH;

        // Latar Belakang Bagian Bawah
        const bottomBg = this.add.graphics();
        bottomBg.fillStyle(0xf8fafc, 1);
        bottomBg.fillRect(0, contentStartY, Math.max(W, 800), totalContentH - contentStartY + 50);

        // Garis Pemisah Halus Antara Banner dan Konten
        const borderLine = this.add.rectangle(centerX, contentStartY, Math.max(W, 800), 2, 0xe2e8f0);

        // Paragraf Pembuka Inspiratif (Gaya Editorial / Lonely Planet)
        const quoteOpening = this.add.text(centerX, contentStartY + 45,
            '“Kami percaya bahwa belajar membuat game adalah untuk semua orang.\n' +
            'Template ini dirancang ramah pemula agar logika, fisika, dan estetika visual\n' +
            'dapat dipelajari secara langsung, menyenangkan, dan tanpa rasa takut rumit.”', {
            fontSize: '12px',
            fontStyle: 'italic',
            fill: '#334155',
            align: 'center',
            lineSpacing: 6,
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Divider Garis Tipis Tengah
        this.add.rectangle(centerX, contentStartY + 88, 120, 1.5, 0xcbd5e1);

        // ─────────────────────────────────────────────────────────
        // DUA KARTU KONTEN BERDAMPINGAN
        // ─────────────────────────────────────────────────────────
        const cardsY = contentStartY + 205;
        const cardH = 200;

        // KARTU KIRI: TUJUAN EDUKASI (Lebar: 420px)
        const leftCardX = centerX - 135;
        const leftCard = this.add.container(leftCardX, cardsY);

        const leftBg = this.add.rectangle(0, 0, 430, cardH, 0xffffff, 1)
            .setStrokeStyle(1.5, 0xe2e8f0);
        leftBg.setOrigin(0.5);

        const eduBadge = this.add.rectangle(-145, -78, 110, 22, 0x0f172a, 1);
        const eduBadgeTxt = this.add.text(-145, -78, 'TUJUAN GAME', {
            fontSize: '10px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const eduTitle = this.add.text(-200, -52, 'Eksplorasi & Logika Game Development 2D', {
            fontSize: '13px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        const eduFeatures = [
            '• Alur Cerita Modular: Cukup atur cerita.js untuk mengubah alur & dialog.',
            '• Live Code Inspector: Eksperimen kecepatan, gravitasi, & lompat langsung.',
            '• Drop & Play Aset: Masukkan gambar sendiri ke folder public/aset_murid/.',
            '• Konsep 2D Esensial: Pahami koordinat (X, Y), collision, & trigger portal.'
        ].join('\n');

        const eduDesc = this.add.text(-200, -28, eduFeatures, {
            fontSize: '11px',
            fill: '#475569',
            lineSpacing: 6,
            fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        leftCard.add([leftBg, eduBadge, eduBadgeTxt, eduTitle, eduDesc]);

        // KARTU KANAN: KREATOR & ENGINE (Lebar: 230px)
        const rightCardX = centerX + 215;
        const rightCard = this.add.container(rightCardX, cardsY);

        const rightBg = this.add.rectangle(0, 0, 240, cardH, 0xffffff, 1)
            .setStrokeStyle(1.5, 0xe2e8f0);
        rightBg.setOrigin(0.5);

        const creatorBadge = this.add.rectangle(-55, -78, 95, 22, 0x0f172a, 1);
        const creatorBadgeTxt = this.add.text(-55, -78, 'KREATOR', {
            fontSize: '10px', fontStyle: 'bold', fill: '#34d399', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const avatarCircle = this.add.circle(-72, -30, 18, 0x0f172a);
        const avatarDev = this.add.text(-72, -30, 'DEV', {
            fontSize: '10px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const authorName = this.add.text(-44, -38, 'Andika Catur Ariantono', {
            fontSize: '11px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        const authorHandle = this.add.text(-44, -22, '@andikacatvr', {
            fontSize: '10.5px', fontStyle: 'bold', fill: '#0284c7', fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        const rightSep = this.add.rectangle(0, 0, 210, 1, 0xf1f5f9);

        const techDetails = this.add.text(0, 28,
            'Engine: Phaser 3 + Vite\n' +
            'Visual: 2D Pixel & Vector\n' +
            'Mode: Interactive Education', {
            fontSize: '10.5px',
            fill: '#64748b',
            align: 'center',
            lineSpacing: 4,
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const quoteBox = this.add.rectangle(0, 68, 210, 24, 0xf1f5f9, 1)
            .setStrokeStyle(1, 0xe2e8f0);
        const quoteText = this.add.text(0, 68, '“Koding itu Seru & Nyata!”', {
            fontSize: '10px', fontStyle: 'italic', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        rightCard.add([rightBg, creatorBadge, creatorBadgeTxt, avatarCircle, avatarDev, authorName, authorHandle, rightSep, techDetails, quoteBox, quoteText]);

        // Footer Note di Bagian Paling Bawah
        this.add.text(centerX, totalContentH - 20, 'The Game Template 2D Side-Scrolling — Dibuat untuk dunia pendidikan dan komunitas.', {
            fontSize: '10px',
            fill: '#94a3b8',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

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

        const txt = this.add.text(0, 0, '← Menu Utama', {
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
        // Mouse Wheel Scroll
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (this.maxScrollY <= 0) return;
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + deltaY * 0.7, 0, this.maxScrollY);
        });

        // Pointer Drag Scroll
        let isDown = false;
        let startY = 0;
        let startScroll = 0;

        this.input.on('pointerdown', (pointer) => {
            // Abaikan klik pada tombol kembali
            if (pointer.x < 160 && pointer.y < 60) return;
            isDown = true;
            startY = pointer.y;
            startScroll = this.targetScrollY;
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDown || this.maxScrollY <= 0) return;
            const diff = pointer.y - startY;
            this.targetScrollY = Phaser.Math.Clamp(startScroll - diff * 1.2, 0, this.maxScrollY);
        });

        this.input.on('pointerup', () => {
            isDown = false;
        });

        // Tombol Panah Bawah / Atas
        this.input.keyboard.on('keydown-DOWN', () => {
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + 60, 0, this.maxScrollY);
        });
        this.input.keyboard.on('keydown-UP', () => {
            this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY - 60, 0, this.maxScrollY);
        });
    }

    update() {
        if (this.maxScrollY > 0) {
            this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.targetScrollY, 0.18);

            if (this.scrollThumb) {
                const ratio = this.cameras.main.scrollY / this.maxScrollY;
                const availableH = this.scrollTrackH - this.scrollThumbH;
                this.scrollThumb.y = this.scrollTrackY + this.scrollThumbH / 2 + ratio * availableH;
            }
        }
    }

    _returnToMenu() {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }
}
