import Phaser from 'phaser';
import { SettingsManager } from '../utils/SettingsManager.js';
import { DisplayManager } from '../utils/DisplayManager.js';
import { SaveManager } from '../utils/SaveManager.js';
import { FONT_BODY, FONT_CLEAN } from '../utils/helpers.js';
import { AudioManager } from '../utils/AudioManager.js';

export class SettingsModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options; // { onDeleteSave, onSaveGame, onToMenu, onToggleTouch, isGameScene, isTouchEnabled }
        this.createUI();
    }

    createUI() {
        const scene = this.scene;
        const W = scene.scale ? scene.scale.width : 800;
        const H = scene.scale ? scene.scale.height : 450;
        this.container = scene.add.container(W / 2, H / 2).setDepth(65).setVisible(false).setScrollFactor(0);

        // 1. Overlay semi-transparan penuh (menutup seluruh layar & memblokir klik tembus)
        const overlay = scene.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.8).setInteractive();
        overlay.on('pointerdown', () => this.hide());

        // 2. Kotak Utama (670 x 390) - Hitam Pekat dengan Garis Border Putih
        const box = scene.add.rectangle(0, 0, 670, 390, 0x000000, 1)
            .setStrokeStyle(2, 0xffffff);

        // Header Modal (Hitam Pekat & Teks Putih Bersih)
        const headerBg = scene.add.rectangle(0, -165, 670, 36, 0x000000, 1);
        const header = scene.add.text(0, -165, 'PENGATURAN', {
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#ffffff',
            fontFamily: FONT_CLEAN,
            letterSpacing: 2
        }).setOrigin(0.5);

        // ==========================================
        // KOLOM KIRI: AUDIO & GAMEPLAY
        // ==========================================
        const leftX = -310;

        // A. Kategori Audio
        const audioHeader = scene.add.text(leftX + 20, -135, 'AUDIO', {
            fontSize: '13px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_CLEAN, letterSpacing: 1
        });

        // 1. Volume Musik
        const musicLabel = scene.add.text(leftX + 20, -108, 'Volume Musik', {
            fontSize: '13px', fill: '#e2e8f0', fontFamily: FONT_CLEAN
        });

        this.musicValText = scene.add.text(-50, -100, `${SettingsManager.musicVolume}%`, {
            fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        const musicMinus = this.createStepButton(-90, -100, '-', () => {
            SettingsManager.setMusicVolume(SettingsManager.musicVolume - 10);
            this.musicValText.setText(`${SettingsManager.musicVolume}%`);
            if (scene.sound && scene.sound.setVolume) scene.sound.setVolume(SettingsManager.musicVolume / 100);
        });

        const musicPlus = this.createStepButton(-10, -100, '+', () => {
            SettingsManager.setMusicVolume(SettingsManager.musicVolume + 10);
            this.musicValText.setText(`${SettingsManager.musicVolume}%`);
            if (scene.sound && scene.sound.setVolume) scene.sound.setVolume(SettingsManager.musicVolume / 100);
        });

        // 2. Volume Efek (SFX)
        const sfxLabel = scene.add.text(leftX + 20, -74, 'Volume Efek (SFX)', {
            fontSize: '13px', fill: '#e2e8f0', fontFamily: FONT_CLEAN
        });

        this.sfxValText = scene.add.text(-50, -66, `${SettingsManager.sfxVolume}%`, {
            fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        const sfxMinus = this.createStepButton(-90, -66, '-', () => {
            SettingsManager.setSfxVolume(SettingsManager.sfxVolume - 10);
            this.sfxValText.setText(`${SettingsManager.sfxVolume}%`);
            AudioManager.playCoin();
        });

        const sfxPlus = this.createStepButton(-10, -66, '+', () => {
            SettingsManager.setSfxVolume(SettingsManager.sfxVolume + 10);
            this.sfxValText.setText(`${SettingsManager.sfxVolume}%`);
            AudioManager.playCoin();
        });

        // B. Kategori Gameplay
        const gameplayHeader = scene.add.text(leftX + 20, -36, 'GAMEPLAY', {
            fontSize: '13px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_CLEAN, letterSpacing: 1
        });

        // 1. Kecepatan Dialog (Normal / Cepat)
        const diagLabel = scene.add.text(leftX + 20, -10, 'Kecepatan Dialog', {
            fontSize: '13px', fill: '#e2e8f0', fontFamily: FONT_CLEAN
        });

        this.diagToggleBtn = scene.add.rectangle(-50, -3, 90, 24, SettingsManager.dialogueSpeedFast ? 0x2563eb : 0x1e293b, 1)
            .setStrokeStyle(1.5, SettingsManager.dialogueSpeedFast ? 0x60a5fa : 0x475569)
            .setInteractive({ useHandCursor: true });

        this.diagToggleText = scene.add.text(-50, -3, SettingsManager.dialogueSpeedFast ? 'Cepat' : 'Normal', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        this.diagToggleBtn.on('pointerdown', () => {
            const isFast = SettingsManager.toggleDialogueSpeed();
            this.diagToggleBtn.setFillStyle(isFast ? 0x2563eb : 0x1e293b, 1);
            this.diagToggleBtn.setStrokeStyle(1.5, isFast ? 0x60a5fa : 0x475569);
            this.diagToggleText.setText(isFast ? 'Cepat' : 'Normal');
            AudioManager.playDialogBeep();
        });

        // 2. Layar Penuh (Fullscreen)
        const fsLabel = scene.add.text(leftX + 20, 24, 'Layar Penuh', {
            fontSize: '13px', fill: '#e2e8f0', fontFamily: FONT_CLEAN
        });

        const isFullscreen = (scene.scale && scene.scale.isFullscreen) || !!document.fullscreenElement;
        this.fsToggleBtn = scene.add.rectangle(-50, 31, 90, 24, isFullscreen ? 0x16a34a : 0x1e293b, 1)
            .setStrokeStyle(1.5, isFullscreen ? 0x86efac : 0x475569)
            .setInteractive({ useHandCursor: true });

        this.fsToggleText = scene.add.text(-50, 31, isFullscreen ? 'ON' : 'OFF', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        this.fsToggleBtn.on('pointerdown', () => {
            DisplayManager.toggleFullscreen(scene);
            const nowFs = (scene.scale && scene.scale.isFullscreen) || !!document.fullscreenElement;
            this.fsToggleBtn.setFillStyle(nowFs ? 0x16a34a : 0x1e293b, 1);
            this.fsToggleBtn.setStrokeStyle(1.5, nowFs ? 0x86efac : 0x475569);
            this.fsToggleText.setText(nowFs ? 'ON' : 'OFF');
        });

        // 3. Tombol Sentuh Layar (HP / Tablet)
        const touchLabel = scene.add.text(leftX + 20, 58, 'Tombol Sentuh HP', {
            fontSize: '13px', fill: '#e2e8f0', fontFamily: FONT_CLEAN
        });

        const touchActive = !!this.options.isTouchEnabled;
        this.touchToggleBtn = scene.add.rectangle(-50, 65, 90, 24, touchActive ? 0x16a34a : 0x1e293b, 1)
            .setStrokeStyle(1.5, touchActive ? 0x86efac : 0x475569)
            .setInteractive({ useHandCursor: true });

        this.touchToggleText = scene.add.text(-50, 65, touchActive ? 'Aktif' : 'Mati', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        this.touchToggleBtn.on('pointerdown', () => {
            if (this.options.onToggleTouch) {
                const newState = this.options.onToggleTouch();
                this.touchToggleBtn.setFillStyle(newState ? 0x16a34a : 0x1e293b, 1);
                this.touchToggleBtn.setStrokeStyle(1.5, newState ? 0x86efac : 0x475569);
                this.touchToggleText.setText(newState ? 'Aktif' : 'Mati');
            }
        });

        // ==========================================
        // KOLOM KANAN: PANDUAN KONTROL & AKSI
        // ==========================================
        const rightX = 20;

        const ctrlHeader = scene.add.text(rightX, -135, 'PANDUAN KONTROL', {
            fontSize: '13px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_CLEAN, letterSpacing: 1
        });

        // Daftar Kontrol Lengkap, Rapi & Lega
        const controlItems = [
            { label: 'Jalan Kiri / Kanan', key: 'A / D  atau  ← / →' },
            { label: 'Lompat (Jump)',       key: 'W / Spasi / ↑' },
            { label: 'Interaksi / Bicara', key: 'E / Enter' },
            { label: 'Lihat Misi (Quest)', key: 'Q' },
            { label: 'Buka Tas (Inventaris)', key: 'I' },
            { label: 'Zoom Kamera',        key: 'Scroll / + / -' }
        ];

        const ctrlElements = [];
        controlItems.forEach((item, idx) => {
            const y = -106 + idx * 24;
            const lText = scene.add.text(rightX, y, item.label, {
                fontSize: '12px', fill: '#cbd5e1', fontFamily: FONT_CLEAN
            });

            const badgeBg = scene.add.rectangle(rightX + 215, y + 6, 110, 19, 0x111111, 0.9)
                .setStrokeStyle(1, 0x52525b);
            const badgeText = scene.add.text(rightX + 215, y + 6, item.key, {
                fontSize: '11px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
            }).setOrigin(0.5);

            ctrlElements.push(lText, badgeBg, badgeText);
        });

        // Baris Aksi Game (Simpan / Menu Utama)
        const actionElements = [];
        if (this.options.isGameScene) {
            // Tombol Simpan Game (Hijau Lembut)
            const saveBtn = scene.add.rectangle(rightX + 65, 56, 125, 30, 0x15803d, 1)
                .setStrokeStyle(1.5, 0x86efac).setInteractive({ useHandCursor: true });
            const saveText = scene.add.text(rightX + 65, 56, 'Simpan Game', {
                fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
            }).setOrigin(0.5);
            saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x16a34a, 1));
            saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x15803d, 1));
            saveBtn.on('pointerdown', () => {
                if (this.options.onSaveGame) this.options.onSaveGame();
            });

            // Tombol Menu Utama (Dark Slate)
            const menuBtn = scene.add.rectangle(rightX + 205, 56, 125, 30, 0x111111, 1)
                .setStrokeStyle(1.5, 0xffffff).setInteractive({ useHandCursor: true });
            const menuText = scene.add.text(rightX + 205, 56, 'Menu Utama', {
                fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
            }).setOrigin(0.5);
            menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x27272a, 1));
            menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x111111, 1));
            menuBtn.on('pointerdown', () => {
                if (this.options.onToMenu) this.options.onToMenu();
            });

            actionElements.push(saveBtn, saveText, menuBtn, menuText);
        } else {
            // Di Menu Utama: Opsi Hapus Save
            const hasSave = SaveManager.hasSave();
            const delBtn = scene.add.rectangle(rightX + 135, 56, 250, 32, hasSave ? 0x7f1d1d : 0x111111, 1)
                .setStrokeStyle(1.5, hasSave ? 0xef4444 : 0x52525b);
            const delText = scene.add.text(rightX + 135, 56, hasSave ? 'Hapus Data Simpanan' : 'Tidak Ada Data Tersimpan', {
                fontSize: '12px', fontStyle: 'bold', fill: hasSave ? '#fecaca' : '#71717a', fontFamily: FONT_CLEAN
            }).setOrigin(0.5);

            if (hasSave) {
                delBtn.setInteractive({ useHandCursor: true });
                delBtn.on('pointerover', () => delBtn.setFillStyle(0xdc2626, 1));
                delBtn.on('pointerout', () => delBtn.setFillStyle(0x7f1d1d, 1));
                delBtn.on('pointerdown', () => {
                    this.hide();
                    if (this.options.onDeleteSave) this.options.onDeleteSave();
                });
            }
            actionElements.push(delBtn, delText);
        }

        // ==========================================
        // BARIS BAWAH: TUTUP [ESC] (KIRI) & RESOLUSI (KANAN)
        // ==========================================
        // 1. Tombol Tutup [ESC] di sebelah KIRI bawah
        const closeBtn = scene.add.rectangle(-160, 146, 160, 32, 0x111111, 1)
            .setStrokeStyle(1.5, 0xffffff)
            .setInteractive({ useHandCursor: true });
        const closeText = scene.add.text(-160, 146, 'Tutup (ESC)', {
            fontSize: '13px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        closeBtn.on('pointerover', () => {
            closeBtn.setFillStyle(0x27272a, 1);
            closeBtn.setStrokeStyle(2, 0xffffff);
        });
        closeBtn.on('pointerout', () => {
            closeBtn.setFillStyle(0x111111, 1);
            closeBtn.setStrokeStyle(1.5, 0xffffff);
        });
        closeBtn.on('pointerdown', () => this.hide());

        // 2. Tombol Resolusi di sebelah KANAN bawah
        const resLabel = scene.add.text(rightX, 108, 'RESOLUSI LAYAR', {
            fontSize: '13px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_CLEAN, letterSpacing: 1
        });

        const resBtn = scene.add.rectangle(rightX + 135, 146, 270, 32, 0x111111, 1)
            .setStrokeStyle(1.5, 0xffffff)
            .setInteractive({ useHandCursor: true });

        this.resBtnText = scene.add.text(rightX + 135, 146, DisplayManager.current.label, {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        resBtn.on('pointerover', () => {
            resBtn.setFillStyle(0x27272a, 1);
            resBtn.setStrokeStyle(2, 0xffffff);
        });
        resBtn.on('pointerout', () => {
            resBtn.setFillStyle(0x111111, 1);
            resBtn.setStrokeStyle(1.5, 0xffffff);
        });
        resBtn.on('pointerdown', () => {
            const nextRes = DisplayManager.cycleNext();
            this.resBtnText.setText(nextRes.label);
        });

        scene.input.keyboard.on('keydown-ESC', () => {
            if (this.container.visible) this.hide();
        });

        this.container.add([
            overlay, box, headerBg, header,
            audioHeader, musicLabel, musicMinus, this.musicValText, musicPlus,
            sfxLabel, sfxMinus, this.sfxValText, sfxPlus,
            gameplayHeader, diagLabel, this.diagToggleBtn, this.diagToggleText,
            fsLabel, this.fsToggleBtn, this.fsToggleText,
            touchLabel, this.touchToggleBtn, this.touchToggleText,
            ctrlHeader, ...ctrlElements,
            ...actionElements,
            closeBtn, closeText,
            resLabel, resBtn, this.resBtnText
        ]);
    }

    createStepButton(x, y, text, callback) {
        const scene = this.scene;
        const btn = scene.add.rectangle(x, y, 24, 24, 0x111111, 1)
            .setStrokeStyle(1.5, 0xffffff)
            .setInteractive({ useHandCursor: true });

        const t = scene.add.text(x, y, text, {
            fontSize: '15px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_CLEAN
        }).setOrigin(0.5);

        btn.on('pointerover', () => btn.setFillStyle(0x27272a, 1));
        btn.on('pointerout', () => btn.setFillStyle(0x111111, 1));
        btn.on('pointerdown', callback);

        const container = scene.add.container(0, 0);
        container.add([btn, t]);
        return container;
    }

    show() {
        const W = this.scene.scale ? this.scene.scale.width : 800;
        const H = this.scene.scale ? this.scene.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;
        const Z = this.scene.zoomManager ? this.scene.zoomManager.currentZoom : (this.scene.cameras.main ? this.scene.cameras.main.zoom : 1.0);

        this.container.setPosition(cx, cy);
        this.container.setScale(1 / Z);
        if (this.resBtnText) this.resBtnText.setText(DisplayManager.current.label);
        const isFullscreen = (this.scene.scale && this.scene.scale.isFullscreen) || !!document.fullscreenElement;
        if (this.fsToggleBtn && this.fsToggleText) {
            this.fsToggleBtn.setFillStyle(isFullscreen ? 0x16a34a : 0x1e293b, 1);
            this.fsToggleBtn.setStrokeStyle(1.5, isFullscreen ? 0x86efac : 0x475569);
            this.fsToggleText.setText(isFullscreen ? 'ON' : 'OFF');
        }
        if (this.touchToggleBtn && this.touchToggleText) {
            const touchActive = !!this.options.isTouchEnabled;
            this.touchToggleBtn.setFillStyle(touchActive ? 0x16a34a : 0x1e293b, 1);
            this.touchToggleBtn.setStrokeStyle(1.5, touchActive ? 0x86efac : 0x475569);
            this.touchToggleText.setText(touchActive ? 'Aktif' : 'Mati');
        }

        // Kunci status scene
        this.scene.isSettingsOpen = true;

        // Kunci pemain agar tidak bisa bergerak di belakang layar pengaturan
        if (this.scene.player && this.scene.player.body) {
            this.scene.player.setVelocity(0, 0);
        }

        // Sembunyikan kotak dialog sementara jika sedang terbuka agar tidak tembus/bocor
        if (this.scene.dialogBox && this.scene.dialogBox.container) {
            this.wasDialogVisible = this.scene.dialogBox.container.visible;
            if (this.wasDialogVisible) {
                this.scene.dialogBox.container.setVisible(false);
            }
        }

        // Sembunyikan tombol kontrol layar sentuh HP sementara
        if (this.scene.mobileControlsContainer) {
            this.scene.mobileControlsContainer.setVisible(false);
        }

        this.container.setVisible(true);
    }

    hide() {
        this.container.setVisible(false);
        this.scene.isSettingsOpen = false;

        // Pulihkan kotak dialog jika sebelumnya sedang aktif
        if (this.wasDialogVisible && this.scene.dialogBox && this.scene.dialogBox.container) {
            this.scene.dialogBox.container.setVisible(true);
            this.wasDialogVisible = false;
        }

        // Pulihkan tombol kontrol sentuh jika aktif
        if (this.options.isTouchEnabled && this.scene.mobileControlsContainer) {
            this.scene.mobileControlsContainer.setVisible(true);
        }
    }

    toggle() {
        if (this.container.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    isOpen() {
        return this.container && this.container.visible;
    }
}
