import Phaser from 'phaser';
import { FONT_TITLE, FONT_BODY } from '../utils/helpers.js';
import { SettingsModal } from './SettingsModal.js';
import { SaveManager } from '../utils/SaveManager.js';
import { AudioManager } from '../utils/AudioManager.js';

export class GameHUD {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.isQuestOpen = false;
        this.isInvOpen = false;
        this.isSettingsOpen = false;

        this.buildHUD();
        this.buildModals();
        this.bindEvents();
        this.updateZoomTransform();
    }

    buildHUD() {
        const s = this.scene;
        const hudRight = s.scale.width;

        // -------------------------------------------------------------
        // A. HP DISPLAY (Top Left)
        // -------------------------------------------------------------
        this.healthContainer = s.add.container(16, 13).setDepth(35).setScrollFactor(0);

        const isCompact = s.maxHp > 4;
        const barWidth = isCompact ? 112 : Math.max(120, 34 + s.maxHp * 20 + 38);
        this.barWidth = barWidth;
        const hpBg = s.add.rectangle(barWidth / 2, 13, barWidth, 26, 0x0f172a, 0.85);

        const hpLabel = s.add.text(8, 4, 'HP', {
            fontSize: '11px',
            fontStyle: 'bold',
            fill: '#f43f5e',
            fontFamily: FONT_TITLE
        });

        this.hpHeartTexts = [];
        if (!isCompact) {
            for (let i = 0; i < s.maxHp; i++) {
                const heart = s.add.text(30 + i * 18, 4, '■', { fontSize: '13px', fill: '#f43f5e' });
                this.hpHeartTexts.push(heart);
            }
            this.hpNumericText = s.add.text(32 + s.maxHp * 18 + 4, 5, `${s.hp}/${s.maxHp}`, {
                fontSize: '11px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
            });
            this.healthContainer.add([hpBg, hpLabel, ...this.hpHeartTexts, this.hpNumericText]);
        } else {
            const singleHeart = s.add.text(28, 4, '■', { fontSize: '13px', fill: '#f43f5e' });
            this.hpNumericText = s.add.text(50, 5, `${s.hp}/${s.maxHp}`, {
                fontSize: '12px', fontStyle: 'bold', fill: '#fda4af', fontFamily: FONT_BODY
            });
            this.healthContainer.add([hpBg, hpLabel, singleHeart, this.hpNumericText]);
        }
        this.updateHPDisplay();

        // -------------------------------------------------------------
        // B. QUEST BUTTON (Top Left, samping HP)
        // -------------------------------------------------------------
        const questX = 16 + barWidth + 44;
        this.questBtnContainer = s.add.container(questX, 26).setDepth(35).setScrollFactor(0);

        const questBtnBg = s.add.rectangle(0, 0, 72, 34, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x38bdf8)
            .setInteractive({ useHandCursor: true });

        const questBtnText = s.add.text(0, 0, 'Quest', {
            fontSize: '13px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.questBtnContainer.add([questBtnBg, questBtnText]);

        questBtnBg.on('pointerdown', () => this.toggleQuestModal());
        questBtnBg.on('pointerover', () => {
            questBtnBg.setFillStyle(0x1e293b, 1);
            questBtnBg.setStrokeStyle(2, 0x60a5fa);
            s.tweens.add({ targets: this.questBtnContainer, scaleX: 1.05, scaleY: 1.05, duration: 100 });
        });
        questBtnBg.on('pointerout', () => {
            questBtnBg.setFillStyle(0x0f172a, 0.9);
            questBtnBg.setStrokeStyle(2, 0x38bdf8);
            s.tweens.add({ targets: this.questBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // -------------------------------------------------------------
        // C. CENTER SCENE TITLE BADGE (Optional)
        // -------------------------------------------------------------
        if (this.options.sceneTitle) {
            this.sceneBadgeContainer = s.add.container(Math.round(hudRight / 2), 26).setDepth(35).setScrollFactor(0);
            const badgeBg = s.add.rectangle(0, 0, 220, 26, 0x0f172a, 0.85)
                .setStrokeStyle(1.5, this.options.badgeStrokeColor || 0x38bdf8);
            const badgeText = s.add.text(0, 0, this.options.sceneTitle, {
                fontSize: '11px', fontStyle: 'bold', fill: this.options.badgeTextColor || '#e0f2fe', fontFamily: FONT_BODY
            }).setOrigin(0.5);
            this.sceneBadgeContainer.add([badgeBg, badgeText]);
        }

        // -------------------------------------------------------------
        // D. TOP RIGHT TOOLBAR (Zoom, Tas, Hamburger Menu)
        // -------------------------------------------------------------
        // 1. Tombol Zoom (lebar 46, tinggi 36)
        if (s.zoomManager) {
            this.zoomBtnContainer = s.zoomManager.createHUDButton(hudRight - 118, 26, 46, 36);
        }

        // 2. Tombol Tas / Inventory (36x36)
        this.bagBtnContainer = s.add.container(hudRight - 68, 26).setDepth(35).setScrollFactor(0);

        const bagBtnBg = s.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });

        const bagGraphics = s.add.graphics();
        const drawBagIcon = (color = 0xf8fafc) => {
            bagGraphics.clear();
            bagGraphics.lineStyle(2, color, 1);
            bagGraphics.beginPath();
            bagGraphics.arc(0, -6.5, 3.5, Math.PI, 0, false);
            bagGraphics.strokePath();
            bagGraphics.strokeRoundedRect(-8.5, -5.5, 17, 16, 2.5);
            bagGraphics.beginPath();
            bagGraphics.moveTo(-8.5, 0);
            bagGraphics.lineTo(8.5, 0);
            bagGraphics.strokePath();
            bagGraphics.fillStyle(color, 1);
            bagGraphics.fillRect(-2, -2, 4, 4);
        };
        drawBagIcon(0xf8fafc);

        const invCount = Array.isArray(s.inventory) ? s.inventory.length : 0;
        this.bagBadgeBg = s.add.circle(13, -12, 7, 0x10b981, 1);
        this.bagBadgeText = s.add.text(13, -12, `${invCount}`, {
            fontSize: '9px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.bagBtnContainer.add([bagBtnBg, bagGraphics, this.bagBadgeBg, this.bagBadgeText]);

        bagBtnBg.on('pointerdown', () => this.toggleInventoryModal());
        bagBtnBg.on('pointerover', () => {
            bagBtnBg.setFillStyle(0x1e293b, 1);
            bagBtnBg.setStrokeStyle(2, 0xf59e0b);
            drawBagIcon(0xfde047);
            s.tweens.add({ targets: this.bagBtnContainer, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        });
        bagBtnBg.on('pointerout', () => {
            bagBtnBg.setFillStyle(0x0f172a, 0.9);
            bagBtnBg.setStrokeStyle(2, 0x64748b);
            drawBagIcon(0xf8fafc);
            s.tweens.add({ targets: this.bagBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });

        // 3. Tombol Menu Hamburger (36x36)
        this.menuBtnContainer = s.add.container(hudRight - 24, 26).setDepth(35).setScrollFactor(0);

        const menuBtnBg = s.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.9)
            .setStrokeStyle(2, 0x64748b)
            .setInteractive({ useHandCursor: true });

        const line1 = s.add.rectangle(0, -6, 18, 2.5, 0xf8fafc, 1);
        const line2 = s.add.rectangle(0, 0, 18, 2.5, 0xf8fafc, 1);
        const line3 = s.add.rectangle(0, 6, 18, 2.5, 0xf8fafc, 1);

        this.menuBtnContainer.add([menuBtnBg, line1, line2, line3]);

        menuBtnBg.on('pointerdown', () => this.toggleSettingsModal());
        menuBtnBg.on('pointerover', () => {
            menuBtnBg.setFillStyle(0x1e293b, 1);
            menuBtnBg.setStrokeStyle(2, 0x38bdf8);
            s.tweens.add({ targets: this.menuBtnContainer, scaleX: 1.08, scaleY: 1.08, duration: 100 });
        });
        menuBtnBg.on('pointerout', () => {
            menuBtnBg.setFillStyle(0x0f172a, 0.9);
            menuBtnBg.setStrokeStyle(2, 0x64748b);
            s.tweens.add({ targets: this.menuBtnContainer, scaleX: 1, scaleY: 1, duration: 100 });
        });
    }

    buildModals() {
        const s = this.scene;

        // 1. QUEST MODAL
        this.questModal = s.add.container(400, 225).setDepth(45).setVisible(false).setScrollFactor(0);
        const qOverlay = s.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const qBox = s.add.rectangle(0, 0, 460, 270, 0x0b1a32, 0.98).setStrokeStyle(2, 0x38bdf8);

        const qHeader = s.add.text(0, -100, 'ACTIVE QUEST', {
            fontSize: '16px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.questTitleText = s.add.text(-200, -50, '', {
            fontSize: '14px', fontStyle: 'bold', fill: '#f8fafc', fontFamily: FONT_BODY
        });

        this.questDescText = s.add.text(-200, -15, '', {
            fontSize: '12px', fill: '#cbd5e1', wordWrap: { width: 400 }, lineSpacing: 4, fontFamily: FONT_BODY
        });

        const qCloseBtn = s.add.rectangle(0, 95, 120, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const qCloseText = s.add.text(0, 95, 'Close [Q]', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        qCloseBtn.on('pointerdown', () => this.toggleQuestModal(false));
        qOverlay.on('pointerdown', () => this.toggleQuestModal(false));

        this.questModal.add([qOverlay, qBox, qHeader, this.questTitleText, this.questDescText, qCloseBtn, qCloseText]);

        // 2. INVENTORY MODAL
        this.invModal = s.add.container(400, 225).setDepth(45).setVisible(false).setScrollFactor(0);
        const invOverlay = s.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.65).setInteractive();
        const invBox = s.add.rectangle(0, 0, 480, 280, 0x0b1a32, 0.98).setStrokeStyle(2, 0x153154);

        const invHeader = s.add.text(0, -108, "ADVENTURER'S INVENTORY", {
            fontSize: '15px', fontStyle: 'bold', fill: '#fbbf24', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        this.invItemsContainer = s.add.container(0, 0);

        const invCloseBtn = s.add.rectangle(0, 105, 120, 32, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const invCloseText = s.add.text(0, 105, 'Close [I]', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        invCloseBtn.on('pointerdown', () => this.toggleInventoryModal(false));
        invOverlay.on('pointerdown', () => this.toggleInventoryModal(false));

        this.invModal.add([invOverlay, invBox, invHeader, this.invItemsContainer, invCloseBtn, invCloseText]);

        // 3. GAME OVER MODAL (Centered, fully responsive & zoom-invariant)
        this.buildGameOverModal();

        // 4. VICTORY MODAL (Centered, fully responsive & zoom-invariant)
        this.buildVictoryModal();

        // 5. SETTINGS MODAL
        this.settingsModal = new SettingsModal(s, {
            isGameScene: true,
            isTouchEnabled: s.touchControlsEnabled,
            onSaveGame: () => {
                if (this.options.onSaveGame) {
                    this.options.onSaveGame();
                } else {
                    SaveManager.save({
                        hp: s.hp,
                        maxHp: s.maxHp,
                        inventory: s.inventory,
                        quest: s.quest,
                        collectedItemIds: s.collectedItemIds
                    });
                    s.showFloatingToast?.('Progres Berhasil Disimpan!', 0x22c55e);
                }
            },
            onToMenu: () => {
                if (this.options.onToMenu) {
                    this.options.onToMenu();
                } else {
                    AudioManager.stopAmbientBGM?.();
                    s.scene.start('TitleScene');
                }
            },
            onToggleTouch: () => {
                s.touchControlsEnabled = !s.touchControlsEnabled;
                try {
                    localStorage.setItem('template_touch_controls', s.touchControlsEnabled ? 'true' : 'false');
                } catch (e) {}
                if (s.mobileControlsContainer) {
                    s.mobileControlsContainer.setVisible(s.touchControlsEnabled);
                }
                s.showFloatingToast?.(s.touchControlsEnabled ? 'Tombol Layar: AKTIF' : 'Tombol Layar: NONAKTIF');
                return s.touchControlsEnabled;
            }
        });
    }

    buildGameOverModal() {
        const s = this.scene;
        const W = s.scale ? s.scale.width : 800;
        const H = s.scale ? s.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;

        this.gameOverModal = s.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);

        // Backdrop hitam full screen dinamis yang sangat lebar agar menutupi layar penuh di resolusi mana pun
        const overlay = s.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.85).setInteractive();
        const box = s.add.rectangle(0, 0, 480, 260, 0x180509, 0.98).setStrokeStyle(2.5, 0xef4444);

        const skull = s.add.text(0, -68, '[ GAME OVER ]', { fontSize: '14px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = s.add.text(0, -32, 'GAME OVER', {
            fontSize: '32px', fontStyle: 'bold', fill: '#ef4444', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const subtitle = s.add.text(0, 8, 'Your character has run out of HP!', {
            fontSize: '13px', fill: '#fca5a5', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Tombol 1: Load Last Checkpoint
        const reloadBtn = s.add.rectangle(0, 56, 240, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const reloadText = s.add.text(0, 56, 'Load Last Checkpoint', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        reloadBtn.on('pointerover', () => reloadBtn.setFillStyle(0x1d4ed8, 1));
        reloadBtn.on('pointerout', () => reloadBtn.setFillStyle(0x2563eb, 0.95));
        reloadBtn.on('pointerdown', () => {
            s.isGameOver = false;
            this.gameOverModal.setVisible(false);
            if (this.options.onRestartGameOver) {
                this.options.onRestartGameOver();
            } else {
                s.scene.restart({ isLoadGame: true, ...s.startData });
            }
        });

        // Tombol 2: Return to Main Menu
        const menuBtn = s.add.rectangle(0, 102, 240, 34, 0x1e293b, 1)
            .setStrokeStyle(1.5, 0x64748b)
            .setInteractive({ useHandCursor: true });
        const menuText = s.add.text(0, 102, 'Return to Main Menu', {
            fontSize: '12px', fontStyle: 'bold', fill: '#cbd5e1', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x334155, 1));
        menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x1e293b, 1));
        menuBtn.on('pointerdown', () => {
            s.isGameOver = false;
            AudioManager.stopAmbientBGM?.();
            s.scene.start('TitleScene');
        });

        this.gameOverModal.add([overlay, box, skull, title, subtitle, reloadBtn, reloadText, menuBtn, menuText]);
    }

    buildVictoryModal() {
        const s = this.scene;
        const W = s.scale ? s.scale.width : 800;
        const H = s.scale ? s.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;

        this.victoryModal = s.add.container(cx, cy).setDepth(60).setVisible(false).setScrollFactor(0);

        const overlay = s.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.85).setInteractive();
        const box = s.add.rectangle(0, 0, 480, 260, 0x071b26, 0.98).setStrokeStyle(2.5, 0x38bdf8);

        const icon = s.add.text(0, -68, '[ COMPLETE ]', { fontSize: '14px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_TITLE }).setOrigin(0.5);
        const title = s.add.text(0, -32, 'ADVENTURE COMPLETE!', {
            fontSize: '24px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_TITLE
        }).setOrigin(0.5);

        const desc = s.add.text(0, 10, 'Congratulations! You explored the world,\ncompleted missions, and finished this game template!', {
            fontSize: '12px', fill: '#cbd5e1', align: 'center', wordWrap: { width: 420 }, lineSpacing: 4, fontFamily: FONT_BODY
        }).setOrigin(0.5);

        const toMenuBtn = s.add.rectangle(0, 80, 220, 36, 0x2563eb, 0.95)
            .setStrokeStyle(1.5, 0x60a5fa)
            .setInteractive({ useHandCursor: true });
        const toMenuText = s.add.text(0, 80, 'Return to Main Menu', {
            fontSize: '12px', fontStyle: 'bold', fill: '#ffffff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        toMenuBtn.on('pointerover', () => toMenuBtn.setFillStyle(0x1d4ed8, 1));
        toMenuBtn.on('pointerout', () => toMenuBtn.setFillStyle(0x2563eb, 0.95));
        toMenuBtn.on('pointerdown', () => {
            AudioManager.stopAmbientBGM?.();
            s.scene.start('TitleScene');
        });

        this.victoryModal.add([overlay, box, icon, title, desc, toMenuBtn, toMenuText]);
    }

    showGameOverModal() {
        this.updateZoomTransform();
        if (this.gameOverModal) {
            this.gameOverModal.setVisible(true);
        }
    }

    hideGameOverModal() {
        if (this.gameOverModal) {
            this.gameOverModal.setVisible(false);
        }
    }

    showVictoryModal() {
        this.updateZoomTransform();
        if (this.victoryModal) {
            this.victoryModal.setVisible(true);
        }
    }

    hideVictoryModal() {
        if (this.victoryModal) {
            this.victoryModal.setVisible(false);
        }
    }

    bindEvents() {
        const s = this.scene;

        // Resize Listener: otomatis menjaga tombol di tepi kanan layar
        this.resizeHandler = () => {
            this.updateZoomTransform();
        };
        s.scale.on('resize', this.resizeHandler);

        // Keyboard Shortcuts: Q, I, ESC
        if (s.input && s.input.keyboard) {
            this.onKeyQ = () => this.toggleQuestModal();
            this.onKeyI = () => this.toggleInventoryModal();
            this.onKeyEsc = () => this.toggleSettingsModal();

            s.input.keyboard.on('keydown-Q', this.onKeyQ);
            s.input.keyboard.on('keydown-I', this.onKeyI);
            s.input.keyboard.on('keydown-ESC', this.onKeyEsc);
        }

        s.events.once('shutdown', () => this.destroy());
    }

    updateZoomTransform(zoom) {
        const s = this.scene;
        const Z = zoom || (s.zoomManager ? s.zoomManager.currentZoom : 1.0);
        const W = s.scale ? s.scale.width : 800;
        const H = s.scale ? s.scale.height : 450;
        const cx = W / 2;
        const cy = H / 2;

        const toCoords = (targetX, targetY) => ({
            x: cx + (targetX - cx) / Z,
            y: cy + (targetY - cy) / Z,
            scale: 1 / Z
        });

        // 1. HP Container (Top-Left)
        if (this.healthContainer && this.healthContainer.active) {
            const t = toCoords(16, 13);
            this.healthContainer.setPosition(t.x, t.y);
            this.healthContainer.setScale(t.scale);
        }

        // 2. Quest Button (Top-Left, samping HP)
        if (this.questBtnContainer && this.questBtnContainer.active) {
            const questTargetX = 16 + (this.barWidth || 112) + 44;
            const t = toCoords(questTargetX, 26);
            this.questBtnContainer.setPosition(t.x, t.y);
            this.questBtnContainer.setScale(t.scale);
        }

        // 3. Center Scene Title Badge
        if (this.sceneBadgeContainer && this.sceneBadgeContainer.active) {
            const t = toCoords(Math.round(W / 2), 26);
            this.sceneBadgeContainer.setPosition(t.x, t.y);
            this.sceneBadgeContainer.setScale(t.scale);
        }

        // 4. Zoom Button (Top-Right)
        if (this.zoomBtnContainer && this.zoomBtnContainer.active) {
            const t = toCoords(W - 118, 26);
            this.zoomBtnContainer.setPosition(t.x, t.y);
            this.zoomBtnContainer.setScale(t.scale);
        }

        // 5. Bag Button (Top-Right)
        if (this.bagBtnContainer && this.bagBtnContainer.active) {
            const t = toCoords(W - 68, 26);
            this.bagBtnContainer.setPosition(t.x, t.y);
            this.bagBtnContainer.setScale(t.scale);
        }

        // 6. Menu Hamburger Button (Top-Right)
        if (this.menuBtnContainer && this.menuBtnContainer.active) {
            const t = toCoords(W - 24, 26);
            this.menuBtnContainer.setPosition(t.x, t.y);
            this.menuBtnContainer.setScale(t.scale);
        }

        // 7. Modals (Tetap di tengah layar dan proporsional terhadap zoom & resolusi)
        const centerPos = toCoords(cx, cy);
        if (this.questModal && this.questModal.active) {
            this.questModal.setPosition(centerPos.x, centerPos.y);
            this.questModal.setScale(centerPos.scale);
        }
        if (this.invModal && this.invModal.active) {
            this.invModal.setPosition(centerPos.x, centerPos.y);
            this.invModal.setScale(centerPos.scale);
        }
        if (this.gameOverModal && this.gameOverModal.active) {
            this.gameOverModal.setPosition(centerPos.x, centerPos.y);
            this.gameOverModal.setScale(centerPos.scale);
        }
        if (this.victoryModal && this.victoryModal.active) {
            this.victoryModal.setPosition(centerPos.x, centerPos.y);
            this.victoryModal.setScale(centerPos.scale);
        }
        if (this.settingsModal && this.settingsModal.container && this.settingsModal.container.active) {
            this.settingsModal.container.setPosition(centerPos.x, centerPos.y);
            this.settingsModal.container.setScale(centerPos.scale);
        }
    }

    updateHPDisplay() {
        const s = this.scene;
        if (this.hpHeartTexts) {
            for (let i = 0; i < s.maxHp; i++) {
                if (this.hpHeartTexts[i]) {
                    this.hpHeartTexts[i].setText('■');
                    if (i < s.hp) {
                        this.hpHeartTexts[i].setColor('#f43f5e').setAlpha(1);
                    } else {
                        this.hpHeartTexts[i].setColor('#334155').setAlpha(0.4);
                    }
                }
            }
        }
        if (this.hpNumericText) {
            this.hpNumericText.setText(`${s.hp}/${s.maxHp}`);
            if (s.hp <= 1) {
                this.hpNumericText.setFill('#ef4444');
            } else {
                this.hpNumericText.setFill('#fda4af');
            }
        }
    }

    updateInventoryBadge() {
        const s = this.scene;
        if (this.bagBadgeText) {
            const count = Array.isArray(s.inventory) ? s.inventory.length : 0;
            this.bagBadgeText.setText(`${count}`);
        }
    }

    toggleQuestModal(forceState) {
        const s = this.scene;
        this.isQuestOpen = (forceState !== undefined) ? forceState : !this.isQuestOpen;
        if (this.isQuestOpen) {
            this.toggleInventoryModal(false);
            this.toggleSettingsModal(false);

            const quest = s.quest || {
                judul: 'Petualangan Berlanjut',
                deskripsi: 'Jelajahi area ini, hindari bahaya, dan temukan pintu jalan ke rute berikutnya.'
            };
            this.questTitleText.setText(quest.judul || 'Misi Utama');
            this.questDescText.setText(quest.deskripsi || 'Jelajahi area ini.');
        }
        this.questModal.setVisible(this.isQuestOpen);
    }

    toggleInventoryModal(forceState) {
        this.isInvOpen = (forceState !== undefined) ? forceState : !this.isInvOpen;
        if (this.isInvOpen) {
            this.toggleQuestModal(false);
            this.toggleSettingsModal(false);
            this.renderInventorySlots();
        }
        this.invModal.setVisible(this.isInvOpen);
    }

    renderInventorySlots() {
        const s = this.scene;
        this.invItemsContainer.removeAll(true);

        const startX = -180;
        const startY = -45;
        const slotSize = 72;
        const gap = 18;

        const inventory = Array.isArray(s.inventory) ? s.inventory : [];

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (slotSize + gap);
            const slotBg = s.add.rectangle(x, startY, slotSize, slotSize, 0x04070e, 0.98)
                .setStrokeStyle(2, 0x153154);
            this.invItemsContainer.add(slotBg);

            const item = inventory[i];
            if (item) {
                const icon = s.add.text(x, startY - 12, item.icon || '[ITEM]', { fontSize: '11px', fontStyle: 'bold', fill: '#38bdf8', fontFamily: FONT_BODY }).setOrigin(0.5);
                const name = s.add.text(x, startY + 18, item.nama || 'Item', {
                    fontSize: '10px', fill: '#f8fafc', align: 'center', wordWrap: { width: 68 }, fontFamily: FONT_BODY
                }).setOrigin(0.5);
                this.invItemsContainer.add([icon, name]);
            } else {
                const empty = s.add.text(x, startY, 'Kosong', { fontSize: '10px', fill: '#475569', fontFamily: FONT_BODY }).setOrigin(0.5);
                this.invItemsContainer.add(empty);
            }
        }

        const info = s.add.text(0, 42, `Total Barang: ${inventory.length} / 4 Slot Digunakan`, {
            fontSize: '12px', fill: '#94a3b8', fontFamily: FONT_BODY
        }).setOrigin(0.5);
        this.invItemsContainer.add(info);
    }

    toggleSettingsModal(forceState) {
        this.isSettingsOpen = (forceState !== undefined) ? forceState : !this.settingsModal.isOpen();
        if (this.isSettingsOpen) {
            this.toggleQuestModal(false);
            this.toggleInventoryModal(false);
            this.settingsModal.show();
        } else {
            this.settingsModal.hide();
        }
    }

    destroy() {
        const s = this.scene;
        if (this.resizeHandler) {
            s.scale.off('resize', this.resizeHandler);
        }
        if (s.input && s.input.keyboard) {
            if (this.onKeyQ) s.input.keyboard.off('keydown-Q', this.onKeyQ);
            if (this.onKeyI) s.input.keyboard.off('keydown-I', this.onKeyI);
            if (this.onKeyEsc) s.input.keyboard.off('keydown-ESC', this.onKeyEsc);
        }
    }
}
