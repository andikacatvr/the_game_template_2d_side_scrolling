import { SettingsManager } from '../utils/SettingsManager.js';
import { AudioManager } from '../utils/AudioManager.js';
import { FONT_BODY } from '../utils/helpers.js';

export class DialogBox {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];
        this.currentLineIdx = 0;
        this.currentCharIdx = 0;
        this.isTyping = false;
        this.typingTimer = null;
        this.onCompleteCallback = null;
        this.portraitTween = null;

        this.createUI();
    }

    createUI() {
        const scene = this.scene;
        this.container = scene.add.container(400, 370).setDepth(45).setVisible(false).setScrollFactor(0);

        // Karakter sprite yang berdiri di BELAKANG kotak dialog (Standing Art / Cutout)
        this.characterSprite = scene.add.image(-230, -85, 'npc_portrait')
            .setDisplaySize(175, 175)
            .setOrigin(0.5, 0.5);

        // Box background (Opaque 1.0 agar bagian bawah karakter tertutup rapi)
        const box = scene.add.rectangle(0, 0, 680, 115, 0x090d16, 1.0)
            .setStrokeStyle(2, 0xa855f7)
            .setInteractive({ useHandCursor: true });

        // Name badge container (di atas tengah dialog box)
        this.nameBg = scene.add.rectangle(0, -58, 160, 26, 0x1e1035, 1)
            .setStrokeStyle(1.5, 0xc084fc);
        this.nameText = scene.add.text(0, -58, 'NPC', {
            fontSize: '12px', fontStyle: 'bold', fill: '#e9d5ff', fontFamily: FONT_BODY
        }).setOrigin(0.5);

        // Main text content (Lega & membentang penuh karena karakter ada di belakang)
        this.dialogText = scene.add.text(-310, -30, '', {
            fontSize: '13.5px', fill: '#f8fafc', wordWrap: { width: 620 }, lineSpacing: 6, fontFamily: FONT_BODY
        });

        // Prompt advance hint
        this.hintText = scene.add.text(310, 42, 'Press [E] or Click', {
            fontSize: '10px', fontStyle: 'bold', fill: '#c084fc', fontFamily: FONT_BODY
        }).setOrigin(1, 0.5);

        // Advance dialogue on click
        box.on('pointerdown', () => this.advance());

        // Urutan render penting: characterSprite duluan (paling belakang), lalu box, lalu nama & teks
        this.container.add([this.characterSprite, box, this.nameBg, this.nameText, this.dialogText, this.hintText]);
    }

    startPortraitTween() {
        if (this.portraitTween) {
            this.portraitTween.stop();
        }
        this.portraitTween = this.scene.tweens.add({
            targets: this.characterSprite,
            y: -89,
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: 'Sine.easeInOut'
        });
    }

    stopPortraitTween() {
        if (this.portraitTween) {
            this.portraitTween.stop();
            this.portraitTween = null;
        }
        if (this.characterSprite) {
            this.characterSprite.setY(-85);
        }
    }

    start(speakerName, lines, onComplete, portraitKey = null) {
        if (!lines || lines.length === 0) return;
        this.lines = Array.isArray(lines) ? lines : [lines];
        this.currentLineIdx = 0;
        this.onCompleteCallback = onComplete;
        this.nameText.setText(speakerName || 'Karakter');
        if (this.nameBg && this.nameText) {
            const badgeW = Math.max(140, this.nameText.width + 36);
            this.nameBg.setSize(badgeW, 26);
        }

        const pKey = portraitKey || 'npc_portrait';
        if (pKey && this.scene.textures.exists(pKey)) {
            this.characterSprite.setTexture(pKey);
            this.characterSprite.setDisplaySize(175, 175);
            this.characterSprite.setVisible(true);
            this.characterSprite.setY(-60);
            this.characterSprite.setAlpha(0);

            // Slide-up entrance animation dari belakang dialog box
            this.scene.tweens.add({
                targets: this.characterSprite,
                y: -85,
                alpha: 1,
                duration: 300,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.startPortraitTween();
                }
            });
        } else {
            this.characterSprite.setVisible(false);
            this.stopPortraitTween();
        }

        this.container.setVisible(true);
        this.typeCurrentLine();
    }

    typeCurrentLine() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }

        const fullText = this.lines[this.currentLineIdx] || '';
        this.currentCharIdx = 0;
        this.isTyping = true;
        this.dialogText.setText('');
        this.hintText.setText('Mengetik...');

        const speed = SettingsManager.dialogueSpeedFast ? 10 : 32;

        this.typingTimer = setInterval(() => {
            this.currentCharIdx++;
            this.dialogText.setText(fullText.substring(0, this.currentCharIdx));

            if (this.currentCharIdx % 3 === 0) {
                AudioManager.playDialogBeep();
            }

            if (this.currentCharIdx >= fullText.length) {
                this.finishTyping();
            }
        }, speed);
    }

    finishTyping() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }
        const fullText = this.lines[this.currentLineIdx] || '';
        this.dialogText.setText(fullText);
        this.isTyping = false;
        const isLast = this.currentLineIdx >= this.lines.length - 1;
        this.hintText.setText(isLast ? 'Selesai [E]' : 'Lanjut [E]');
    }

    advance() {
        if (!this.container.visible) return;

        if (this.isTyping) {
            // Instant finish line if clicked while typing
            this.finishTyping();
            return;
        }

        AudioManager.playClick();
        this.currentLineIdx++;
        if (this.currentLineIdx < this.lines.length) {
            this.typeCurrentLine();
        } else {
            this.close();
        }
    }

    close() {
        if (this.typingTimer) {
            clearInterval(this.typingTimer);
            this.typingTimer = null;
        }
        this.stopPortraitTween();
        this.container.setVisible(false);
        this.isTyping = false;
        if (this.onCompleteCallback) {
            const cb = this.onCompleteCallback;
            this.onCompleteCallback = null;
            cb();
        }
    }

    isOpen() {
        return this.container && this.container.visible;
    }
}
