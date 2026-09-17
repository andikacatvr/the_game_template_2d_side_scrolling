import Phaser from 'phaser';
import { CONFIG_SKELETON } from '../../cerita.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_TITLE, FONT_BODY } from '../utils/helpers.js';
import { SettingsModal } from '../ui/SettingsModal.js';
import { CommandConsole } from '../utils/CommandConsole.js';

// ===============================================================
// 2. TITLE SCENE: LAYAR MENU UTAMA — REDESIGN PREMIUM + FIREFLIES
// ===============================================================
export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        this._fireflies = [];
    }

    create() {
        // Sembunyikan chat console saat berada di Menu Utama
        CommandConsole.hide();

        const W = this.scale.width || 800;
        const H = this.scale.height || 450;
        const centerX = W / 2;
        const centerY = H / 2;

        this.cameras.main.setBackgroundColor('#dcff78');

        // ─────────────────────────────────────────────────────────
        // LATAR BELAKANG PASTEL YELLOW GREEN (#dcff78) SOLID
        // ─────────────────────────────────────────────────────────
        const bgSolid = this.add.graphics();
        bgSolid.fillStyle(0xdcff78, 1);
        bgSolid.fillRect(0, 0, Math.max(W, 1600), Math.max(H, 1000));

        // ─────────────────────────────────────────────────────────
        // PARTIKEL KELAP-KELIP AMBIENT
        // ─────────────────────────────────────────────────────────
        this._createFireflies(24, W, H);

        // ─────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────
        // SISI KIRI: LOGO JUDUL GAME (SEJAJAR DAN SEIMBANG PRESISI)
        // ─────────────────────────────────────────────────────────
        const leftCenterX = centerX - 133; // x = 267 (Margin kiri = 107px)
        const titleContainer = this.add.container(leftCenterX, centerY).setDepth(10);

        const titleLogoImg = this.add.image(0, 0, 'title_logo');
        titleLogoImg.setDisplaySize(340, 340 * (1080 / 1920)); // proporsional 16:9 sesuai file logo_thegametemplate.png

        titleContainer.add(titleLogoImg);

        // ─────────────────────────────────────────────────────────
        // SISI KANAN: TOMBOL MENU (SEJAJAR PUCUK & DASAR DENGAN LOGO)
        // ─────────────────────────────────────────────────────────
        const rightCenterX = centerX + 178; // x = 578 (Margin kanan = 107px)
        const btnW = 230; // Diperlebar agar seimbang dengan logo dan sisi kanan kokoh
        const btnH = 40;  // Tinggi presisi agar total rentang 3 tombol persis sama dengan logo
        const btnSpacing = 47;

        // Tombol 1: Start (Puncak atas sejajar pucuk huruf "The" logo)
        const btnStart = this._makeButton(rightCenterX, centerY - btnSpacing,
            'Start', '#0f172a', 0xffffff, 0x0f172a, true,
            '', () => {
                this._transitionTo('GameScene', { isNewGame: true });
            }, btnW, 0xf1f5f9, btnH, '15px'
        );

        // Tombol 2: Settings (Tepat di tengah centerY sejajar kata "for")
        const btnSettings = this._makeButton(rightCenterX, centerY,
            'Settings', '#ffffff', 0x0f172a, 0x0f172a, true,
            '', () => this.settingsModal.show(), btnW, 0x1e293b, btnH, '15px'
        );

        // Tombol 3: Quit (Dasar bawah sejajar dasar huruf "Education", dengan border hitam)
        const btnQuit = this._makeButton(rightCenterX, centerY + btnSpacing,
            'Quit', '#ffffff', 0xef4444, 0x000000, true,
            '', () => this._confirmQuit(), btnW, 0xdc2626, btnH, '15px'
        );

        // Animasi melayang lembut bersamaan (Sinkron agar selalu sejajar)
        this.tweens.add({
            targets: [titleContainer, btnStart, btnSettings, btnQuit],
            y: '-=6',
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ─────────────────────────────────────────────────────────
        // FOOTER
        // ─────────────────────────────────────────────────────────
        this.add.text(centerX, H - 12,
            `${CONFIG_SKELETON.namaKelompok || 'Kelompok Developer'}  •  Phaser 3  •  Template 2D`, {
            fontSize: '10px', fontStyle: 'bold', fill: '#1e293b', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.add.text(12, H - 12, 'v1.0', {
            fontSize: '10px', fontStyle: 'bold', fill: '#1e293b', fontFamily: FONT_BODY
        });

        // ─────────────────────────────────────────────────────────
        // TOMBOL KECIL "ABOUT" DI SAMPING KANAN BAWAH
        // ─────────────────────────────────────────────────────────
        const btnAbout = this.add.container(W - 48, H - 14).setDepth(15);
        const aboutBg = this.add.rectangle(0, 0, 60, 20, 0xffffff, 1.0)
            .setStrokeStyle(1.5, 0x000000)
            .setInteractive({ useHandCursor: true });
        const aboutTxt = this.add.text(0, 0, 'About', {
            fontSize: '10px', fontStyle: 'bold', fill: '#0f172a', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        btnAbout.add([aboutBg, aboutTxt]);

        aboutBg.on('pointerover', () => {
            aboutBg.setFillStyle(0xf1f5f9, 1.0);
            aboutBg.setStrokeStyle(1.5, 0x000000);
            this.tweens.add({ targets: btnAbout, scaleX: 1.06, scaleY: 1.06, duration: 80 });
        });
        aboutBg.on('pointerout', () => {
            aboutBg.setFillStyle(0xffffff, 1.0);
            aboutBg.setStrokeStyle(1.5, 0x000000);
            this.tweens.add({ targets: btnAbout, scaleX: 1.0, scaleY: 1.0, duration: 80 });
        });
        aboutBg.on('pointerdown', () => {
            this.cameras.main.fadeOut(200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('AboutScene');
            });
        });

        // ─────────────────────────────────────────────────────────
        // MODAL
        // ─────────────────────────────────────────────────────────
        this._buildDeleteModal();
        this.settingsModal = new SettingsModal(this, {
            onDeleteSave: () => this._toggleDeleteModal(true)
        });
    }

    // ─────────────────────────────────────────────────────────
    // BINTANG
    // ─────────────────────────────────────────────────────────
    _createStars(W, H) {
        const g = this.add.graphics();
        const starCount = 60;
        for (let i = 0; i < starCount; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H * 0.75);
            const size = Math.random() < 0.15 ? 1.5 : 1;
            const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
            g.fillStyle(0xffffff, alpha);
            g.fillRect(x, y, size, size);

            // Beberapa bintang berkedip
            if (Math.random() < 0.3) {
                this.tweens.add({
                    targets: g, alpha: Phaser.Math.FloatBetween(0.3, 0.8),
                    duration: Phaser.Math.Between(800, 2500),
                    yoyo: true, repeat: -1,
                    delay: Phaser.Math.Between(0, 2000),
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // KUNANG-KUNANG KARAKTER MINI BERSINAR
    // ─────────────────────────────────────────────────────────
    _createFireflies(count, W, H) {
        // Palet warna aura cahaya di belakang karakter
        const glowColors = [0xfef08a, 0x67e8f9, 0xf472b6, 0xa78bfa, 0x38bdf8, 0xffffff];

        for (let i = 0; i < count; i++) {
            // Hindari area gambar logo "the Game Template" di sisi kiri tengah (x: 80 - 450, y: 110 - 340)
            let x, y;
            let attempts = 0;
            do {
                x = Phaser.Math.Between(35, W - 35);
                y = Phaser.Math.Between(30, H - 35);
                attempts++;
            } while (attempts < 50 && (x >= 80 && x <= 450 && y >= 110 && y <= 340));

            const auraColor = glowColors[Math.floor(Math.random() * glowColors.length)];
            const targetSize = Phaser.Math.Between(18, 26); // Ukuran jelas terlihat kembali

            const firefly = this.add.container(x, y).setDepth(3);

            // 1. Aura Cahaya Bercahaya (Glow Halo)
            const glowHalo = this.add.graphics();
            glowHalo.fillStyle(auraColor, 0.45);
            glowHalo.fillCircle(0, 0, targetSize * 0.85);
            glowHalo.fillStyle(0xffffff, 0.60);
            glowHalo.fillCircle(0, 0, targetSize * 0.45);

            // 2. Karakter NPC Mini
            const sprite = this.add.image(0, 0, 'npc_firefly');
            sprite.setDisplaySize(targetSize, targetSize);

            firefly.add([glowHalo, sprite]);

            // Animasi Denyut Cahaya (Pulse Glow)
            const pulseDuration = Phaser.Math.Between(800, 1600);
            this.tweens.add({
                targets: glowHalo,
                alpha: { from: 0.25, to: 0.90 },
                scaleX: { from: 0.85, to: 1.30 },
                scaleY: { from: 0.85, to: 1.30 },
                duration: pulseDuration,
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1500),
                ease: 'Sine.easeInOut'
            });

            // Animasi Goyangan Miring Lucu (Wobble)
            this.tweens.add({
                targets: sprite,
                angle: { from: -8, to: 8 },
                duration: Phaser.Math.Between(1800, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Arah melayang aman (tidak masuk ke area logo)
            let moveX = Phaser.Math.Between(-45, 45);
            let moveY = Phaser.Math.Between(-35, 35);
            if (x < 80 && moveX > 0) moveX = -moveX;
            if (x > 450 && (x + moveX < 455)) moveX = Math.abs(moveX);
            if (y < 110 && (y + moveY > 105)) moveY = -Math.abs(moveY);
            if (y > 340 && (y + moveY < 345)) moveY = Math.abs(moveY);

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

            this._fireflies.push(firefly);
        }
    }

    // ─────────────────────────────────────────────────────────
    // BUAT TOMBOL SOLID (DENGAN UKURAN PROPORSIONAL)
    // ─────────────────────────────────────────────────────────
    _makeButton(x, y, label, textColor, bgHex, borderHex = null, active = true, sub = '', callback = null, w = 210, hoverBg = null, h = 44, fontSize = '15px') {
        const btnHeight = sub ? 52 : h;
        const container = this.add.container(x, y).setDepth(10);

        // Balok warna solid murni (dengan outline jika borderHex diset)
        const bg = this.add.rectangle(0, 0, w, btnHeight, bgHex, 1.0);
        if (borderHex !== null && borderHex !== undefined) {
            bg.setStrokeStyle(1.5, borderHex);
        }

        const txt = this.add.text(0, sub ? -9 : 0, label, {
            fontSize: fontSize, fontStyle: 'bold',
            fill: active ? textColor : '#334155',
            fontFamily: FONT_BODY
        }).setOrigin(0.5);

        container.add([bg, txt]);

        if (sub) {
            const subTxt = this.add.text(0, 12, sub, {
                fontSize: '9px', fill: active ? '#4ade80' : '#334155', fontFamily: FONT_BODY
            }).setOrigin(0.5);
            container.add(subTxt);
        }

        if (active && callback) {
            bg.setInteractive({ useHandCursor: true });
            const hBg = hoverBg !== null ? hoverBg : bgHex;

            bg.on('pointerover', () => {
                bg.setFillStyle(hBg, 1.0);
                this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 90, ease: 'Back.easeOut' });
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(bgHex, 1.0);
                if (borderHex !== null && borderHex !== undefined) {
                    bg.setStrokeStyle(1.5, borderHex);
                }
                this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 90 });
            });
            bg.on('pointerdown', () => {
                this.tweens.add({ targets: container, scaleX: 0.97, scaleY: 0.97, duration: 60, yoyo: true });
                this.time.delayedCall(80, callback);
            });
        }

        return container;
    }


    // ─────────────────────────────────────────────────────────
    // TRANSISI DENGAN FADE OUT
    // ─────────────────────────────────────────────────────────
    _transitionTo(sceneKey, data = {}) {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(sceneKey, data);
        });
    }

    // ─────────────────────────────────────────────────────────
    // MODAL HAPUS DATA
    // ─────────────────────────────────────────────────────────
    _buildDeleteModal() {
        this.deleteModal = this.add.container(400, 225).setDepth(80).setVisible(false);
        const ov = this.add.rectangle(0, 0, 800, 450, 0x000000, 0.82).setInteractive();
        const box = this.add.rectangle(0, 0, 440, 230, 0x0a0f1e, 0.98).setStrokeStyle(2, 0xef4444);
        const ico = this.add.text(0, -72, '⚠️', { fontSize: '28px' }).setOrigin(0.5);
        const hdr = this.add.text(0, -36, 'HAPUS DATA PETUALANGAN?', {
            fontSize: '15px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        const inf = this.add.text(0, 4,
            'Seluruh progres (HP, item tas, posisi)\nakan dihapus secara permanen.', {
            fontSize: '11px', fill: '#94a3b8', align: 'center', lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const canBg = this.add.rectangle(-78, 64, 120, 34, 0x1e293b, 1).setStrokeStyle(1.5, 0x475569).setInteractive({ useHandCursor: true });
        const canTxt = this.add.text(-78, 64, 'Batal', { fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY }).setOrigin(0.5);
        canBg.on('pointerover', () => canBg.setFillStyle(0x334155, 1));
        canBg.on('pointerout', () => canBg.setFillStyle(0x1e293b, 1));
        canBg.on('pointerdown', () => this._toggleDeleteModal(false));
        ov.on('pointerdown', () => this._toggleDeleteModal(false));

        const delBg = this.add.rectangle(78, 64, 138, 34, 0xdc2626, 1).setStrokeStyle(1.5, 0xfca5a5).setInteractive({ useHandCursor: true });
        const delTxt = this.add.text(78, 64, 'Ya, Hapus', { fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY }).setOrigin(0.5);
        delBg.on('pointerover', () => delBg.setFillStyle(0xb91c1c, 1));
        delBg.on('pointerout', () => delBg.setFillStyle(0xdc2626, 1));
        delBg.on('pointerdown', () => {
            SaveManager.clear();
            this._toggleDeleteModal(false);
            this.scene.restart();
        });

        this.deleteModal.add([ov, box, ico, hdr, inf, canBg, canTxt, delBg, delTxt]);
    }

    _toggleDeleteModal(state) {
        this.deleteModal.setVisible(state);
    }

    // ─────────────────────────────────────────────────────────
    // QUIT CONFIRMATION
    // ─────────────────────────────────────────────────────────
    _confirmQuit() {
        // Buat modal konfirmasi quit
        const qModal = this.add.container(400, 225).setDepth(90);
        const ov = this.add.rectangle(0, 0, 800, 450, 0x000000, 0.85).setInteractive();
        const box = this.add.rectangle(0, 0, 380, 190, 0x0a0f1e, 0.98).setStrokeStyle(2, 0xef4444);
        const ico = this.add.text(0, -60, '🚪', { fontSize: '28px' }).setOrigin(0.5);
        const hdr = this.add.text(0, -24, 'Quit Game?', {
            fontSize: '18px', fontStyle: 'bold', fill: '#f87171', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        const inf = this.add.text(0, 12, 'Are you sure you want to quit?', {
            fontSize: '11px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Tombol Cancel
        const canBg = this.add.rectangle(-70, 58, 110, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x475569).setInteractive({ useHandCursor: true });
        const canTxt = this.add.text(-70, 58, 'Cancel', {
            fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        canBg.on('pointerover', () => canBg.setFillStyle(0x334155, 1));
        canBg.on('pointerout', () => canBg.setFillStyle(0x1e293b, 1));
        canBg.on('pointerdown', () => { qModal.destroy(); });
        ov.on('pointerdown', () => { qModal.destroy(); });

        // Tombol Quit
        const qBg = this.add.rectangle(70, 58, 110, 32, 0xdc2626, 1)
            .setStrokeStyle(1.5, 0xfca5a5).setInteractive({ useHandCursor: true });
        const qTxt = this.add.text(70, 58, 'Quit', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        qBg.on('pointerover', () => qBg.setFillStyle(0xb91c1c, 1));
        qBg.on('pointerout', () => qBg.setFillStyle(0xdc2626, 1));
        qBg.on('pointerdown', () => {
            // Fade out lalu tutup tab
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                window.close();
                // Jika window.close() gagal (tab bukan dibuka via script),
                // tampilkan pesan alternatif
                setTimeout(() => {
                    const msg = this.add.text(400, 225,
                        'Close this tab manually\n(Ctrl+W / Cmd+W)', {
                        fontSize: '16px', fontStyle: 'bold', fill: '#f87171',
                        align: 'center', fontFamily: FONT_BODY
                    }).setOrigin(0.5).setDepth(100);
                }, 300);
            });
        });

        qModal.add([ov, box, ico, hdr, inf, canBg, canTxt, qBg, qTxt]);
    }
}
