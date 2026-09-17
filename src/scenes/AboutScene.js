import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { FONT_TITLE, FONT_BODY } from '../utils/helpers.js';
import { CommandConsole } from '../utils/CommandConsole.js';

// ===============================================================
// ABOUT SCENE: HALAMAN TENTANG GAME & EDUKASI
// ===============================================================
export class AboutScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AboutScene' });
        this._fireflies = [];
    }

    create() {
        CommandConsole.hide();

        const W = this.scale.width || 800;
        const H = this.scale.height || 450;
        const centerX = W / 2;

        this.cameras.main.setBackgroundColor('#dcff78');

        // Background pastel solid
        const bg = this.add.graphics();
        bg.fillStyle(0xdcff78, 1);
        bg.fillRect(0, 0, Math.max(W, 1600), Math.max(H, 1000));

        // Partikel ambient kunang-kunang mini karakter
        this._createFireflies(16, W, H);

        // ─────────────────────────────────────────────────────────
        // HEADER ATAS
        // ─────────────────────────────────────────────────────────
        // Tombol Kembali (Back to Menu) di Kiri Atas
        const btnBack = this._createBackButton(95, 38, () => this._returnToMenu());

        // Judul Halaman di Tengah Atas
        this.add.text(centerX, 38, 'TENTANG GAME INI', {
            fontSize: '18px',
            fontStyle: 'bold',
            fill: '#0f172a',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Subtitle Header
        this.add.text(centerX, 58, `${CONFIG_SKELETON.judulGame || 'The Game Template'} — Media Belajar Game 2D`, {
            fontSize: '11px',
            fill: '#475569',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // ─────────────────────────────────────────────────────────
        // KONTEN KARTU KIRI: TUJUAN EDUKASI (Lebar: 440, Tinggi: 320)
        // ─────────────────────────────────────────────────────────
        const leftCardX = 265;
        const cardY = 245;
        const cardH = 320;

        const leftCard = this.add.container(leftCardX, cardY);
        const leftBg = this.add.rectangle(0, 0, 450, cardH, 0xffffff, 0.96)
            .setStrokeStyle(2, 0x0f172a);
        
        // Badge Tujuan Edukasi
        const eduBadge = this.add.rectangle(-140, -128, 140, 24, 0x0f172a, 1);
        const eduBadgeTxt = this.add.text(-140, -128, 'TUJUAN GAME', {
            fontSize: '11px', fontStyle: 'bold', fill: '#dcff78', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const eduTitle = this.add.text(-205, -95, 'Edukasi & Eksplorasi Game Development 2D', {
            fontSize: '14px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        const eduDesc = this.add.text(-205, -68,
            `Game ini dibangun khusus sebagai media edukasi interaktif untuk siswa,\n` +
            `pemula, dan komunitas yang ingin belajar dasar pengembangan game 2D.\n\n` +
            `Melalui struktur kode yang modular dan ramah pemula, siswa dapat:\n` +
            `• Mengubah alur cerita, dialog, dan map cukup dari file cerita.js\n` +
            `• Menyesuaikan gravitasi, kecepatan jalan, & lompatan secara live\n` +
            `• Memasukkan gambar karakter sendiri via folder public/aset_murid/\n` +
            `• Memahami konsep koordinat, collision, trigger, dan level switching\n\n` +
            `Tujuannya agar siapa pun bisa merasakan serunya berkreasi dan melihat\n` +
            `ide visual mereka langsung hidup di layar tanpa takut rumit!`, {
            fontSize: '11px',
            fill: '#334155',
            lineSpacing: 5,
            fontFamily: FONT_BODY
        }).setOrigin(0, 0);

        leftCard.add([leftBg, eduBadge, eduBadgeTxt, eduTitle, eduDesc]);

        // ─────────────────────────────────────────────────────────
        // KONTEN KARTU KANAN: KREATOR & TEKNOLOGI (Lebar: 230, Tinggi: 320)
        // ─────────────────────────────────────────────────────────
        const rightCardX = 640;
        const rightCard = this.add.container(rightCardX, cardY);
        const rightBg = this.add.rectangle(0, 0, 250, cardH, 0xffffff, 0.96)
            .setStrokeStyle(2, 0x0f172a);

        // Badge Kreator
        const creatorBadge = this.add.rectangle(-55, -128, 115, 24, 0x0f172a, 1);
        const creatorBadgeTxt = this.add.text(-55, -128, 'KREATOR', {
            fontSize: '11px', fontStyle: 'bold', fill: '#dcff78', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Foto / Avatar Placeholder Simpel atau Icon
        const avatarCircle = this.add.circle(0, -65, 28, 0xdcff78)
            .setStrokeStyle(2, 0x0f172a);
        const avatarIcon = this.add.text(0, -65, 'DEV', { fontSize: '13px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY }).setOrigin(0.5);

        // Nama Pembuat (Sesuai Permintaan User)
        const authorHandle = this.add.text(0, -22, '@andikacatvr', {
            fontSize: '13px', fontStyle: 'bold', fill: '#2563eb', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const authorName = this.add.text(0, -4, 'Andika Catur Ariantono', {
            fontSize: '12px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const sepLine = this.add.rectangle(0, 16, 210, 1.5, 0xe2e8f0);

        // Spesifikasi / Stack
        const stackTxt = this.add.text(0, 68,
            `Engine: Phaser 3 + Vite\n` +
            `Visual: 2D Pixel & Vector\n` +
            `Fitur: Drop & Play Assets\n` +
            `Mode: Interactive Education`, {
            fontSize: '11px',
            fill: '#475569',
            align: 'center',
            lineSpacing: 5,
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const quoteBg = this.add.rectangle(0, 125, 220, 32, 0xf1f5f9)
            .setStrokeStyle(1, 0xcbd5e1);
        const quoteTxt = this.add.text(0, 125, '“Koding itu Seru & Nyata!”', {
            fontSize: '10px', fontStyle: 'italic', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        rightCard.add([rightBg, creatorBadge, creatorBadgeTxt, avatarCircle, avatarIcon, authorHandle, authorName, sepLine, stackTxt, quoteBg, quoteTxt]);

        // Keyboard ESC untuk kembali
        this.input.keyboard.on('keydown-ESC', () => {
            this._returnToMenu();
        });
    }

    _createBackButton(x, y, callback) {
        const container = this.add.container(x, y).setDepth(20);
        const bg = this.add.rectangle(0, 0, 130, 30, 0xffffff, 1.0)
            .setStrokeStyle(1.5, 0x000000)
            .setInteractive({ useHandCursor: true });
        
        const txt = this.add.text(0, 0, '← Menu Utama', {
            fontSize: '11px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        container.add([bg, txt]);

        bg.on('pointerover', () => {
            bg.setFillStyle(0xf1f5f9, 1.0);
            this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 90 });
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0xffffff, 1.0);
            this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 90 });
        });
        bg.on('pointerdown', callback);

        return container;
    }

    _returnToMenu() {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }

    _createFireflies(count, W, H) {
        const glowColors = [0xfef08a, 0x67e8f9, 0xf472b6, 0xa78bfa, 0x38bdf8, 0xffffff];

        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(30, W - 30);
            const y = Phaser.Math.Between(30, H - 30);

            const firefly = this.add.container(x, y).setDepth(2);
            const targetSize = Phaser.Math.Between(18, 24);
            const auraColor = Phaser.Utils.Array.GetRandom(glowColors);

            const glowHalo = this.add.graphics();
            glowHalo.fillStyle(auraColor, 0.40);
            glowHalo.fillCircle(0, 0, targetSize * 0.85);

            const sprite = this.add.image(0, 0, 'npc_firefly');
            sprite.setDisplaySize(targetSize, targetSize);

            firefly.add([glowHalo, sprite]);

            this.tweens.add({
                targets: glowHalo,
                alpha: { from: 0.2, to: 0.8 },
                scaleX: { from: 0.85, to: 1.25 },
                scaleY: { from: 0.85, to: 1.25 },
                duration: Phaser.Math.Between(900, 1700),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            const moveX = Phaser.Math.Between(-35, 35);
            const moveY = Phaser.Math.Between(-25, 25);

            this.tweens.add({
                targets: firefly,
                x: `+=${moveX}`,
                y: `+=${moveY}`,
                duration: Phaser.Math.Between(3500, 7000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this._fireflies.push(firefly);
        }
    }
}
