import Phaser from 'phaser';
import { CommandConsole } from '../utils/CommandConsole.js';
import { HTMLAboutOverlay } from '../ui/HTMLAboutOverlay.js';

// ===============================================================
// ABOUT SCENE: EDITORIAL STORYTELLING & CREDITS
// Menggabungkan animasi canvas (theater loop & fireflies) di area hero banner
// dengan HTMLAboutOverlay untuk tipografi ultra-tajam, modern, dan scroll native.
// ===============================================================
export class AboutScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AboutScene' });
        this.htmlAboutOverlay = null;
    }

    preload() {
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

        // Hitung skala canvas ke layar agar banner canvas & HTML 250px presisi 1:1
        const canvasEl = this.game.canvas;
        const displayH = (canvasEl && canvasEl.clientHeight > 0) ? canvasEl.clientHeight : window.innerHeight;
        const scaleY = H / displayH;

        const heroH_css = 200; // Tinggi panggung animasi hero dalam CSS pixel
        const heroH = heroH_css * scaleY;
        const laneFeetY = heroH - Math.max(2, 4 * scaleY);

        this.cameras.main.scrollY = 0;
        this.cameras.main.setBackgroundColor('#ffffff');

        // 1. Hero Banner Canvas Background (#dcff78)
        this.add.rectangle(centerX, heroH / 2, Math.max(W, 3000), heroH, 0xdcff78, 1).setDepth(1);

        // 2. Garis Pemisah Halus di Bawah Hero Banner
        this.add.rectangle(centerX, heroH, Math.max(W, 3000), Math.max(1.5, 2 * scaleY), 0xcbd5e1).setDepth(2);

        // 3. Fireflies di Hero Banner
        this._createHeroFireflies(W, heroH);

        // 4. Theater Loop: Karakter berjalan & dikejar monster!
        this._startTheaterLoop(W, laneFeetY);

        // 5. Mount HTML About Overlay (Crisp vector title, back button, & editorial manifesto)
        this.htmlAboutOverlay = new HTMLAboutOverlay(this, {
            onBack: () => this._returnToMenu(),
            onScroll: (scrollTop) => {
                this.cameras.main.scrollY = scrollTop * scaleY;
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    // KUNANG-KUNANG BERSINAR DI HERO BANNER
    // ─────────────────────────────────────────────────────────
    _createHeroFireflies(W, heroH) {
        const glowColors = [0xfef08a, 0x67e8f9, 0xf472b6, 0xa78bfa, 0x38bdf8, 0xffffff];
        for (let i = 0; i < 9; i++) {
            const x = (i % 2 === 0) ? Phaser.Math.Between(40, W / 2 - 140) : Phaser.Math.Between(W / 2 + 140, W - 40);
            const y = Phaser.Math.Between(25, heroH - 35);
            this._spawnFirefly(x, y, 3, glowColors, 20, 15);
        }
    }

    _spawnFirefly(x, y, depth, glowColors, maxMoveX, maxMoveY) {
        const auraColor = glowColors[Math.floor(Math.random() * glowColors.length)];
        const targetSize = Phaser.Math.Between(18, 24);

        const firefly = this.add.container(x, y).setDepth(depth);

        const glowHalo = this.add.graphics();
        glowHalo.fillStyle(auraColor, 0.45);
        glowHalo.fillCircle(0, 0, targetSize * 0.85);
        glowHalo.fillStyle(0xffffff, 0.60);
        glowHalo.fillCircle(0, 0, targetSize * 0.45);

        const sprite = this.add.image(0, 0, 'npc_firefly');
        sprite.setDisplaySize(targetSize, targetSize);

        firefly.add([glowHalo, sprite]);

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

        this.tweens.add({
            targets: sprite,
            angle: { from: -8, to: 8 },
            duration: Phaser.Math.Between(1800, 3000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

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
    // MINI THEATER LOOP:
    // Babak 1: 1 Karakter Normal jalan kanan -> kiri
    // Babak 2: 2 Karakter Mini jalan kiri -> kanan
    // Babak 3: 3 Karakter Mini lari panik kanan -> kiri
    // Babak 4: 1 Monster Besar mengejar mereka bertiga!
    // -> Loop kembali ke Babak 1
    // ─────────────────────────────────────────────────────────
    _startTheaterLoop(W, laneFeetY) {
        const npcKey = this.textures.exists('npc_portrait') ? 'npc_portrait' : 'npc_template';

        const stage1_solo = () => {
            if (!this.sys || !this.sys.game) return;

            const charSize = 34;
            const baseY = laneFeetY - (charSize / 2);
            const s = this.add.image(W + 40, baseY, npcKey)
                .setDisplaySize(charSize, charSize)
                .setOrigin(0.5, 0.5)
                .setFlipX(true)
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

            const distance = W + 90;
            const speedDuration = 5500;

            for (let i = 0; i < 2; i++) {
                const isLeader = (i === 0);
                const charSize = isLeader ? 38 : 24;
                const baseY = laneFeetY - (charSize / 2);
                const startX = isLeader ? -35 : -80;

                const s = this.add.image(startX, baseY, npcKey)
                    .setDisplaySize(charSize, charSize)
                    .setOrigin(0.5, 0.5)
                    .setFlipX(false)
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

            const chaseDuration = 3200;

            for (let i = 0; i < 3; i++) {
                const isFront = (i === 0);
                const charSize = isFront ? 36 : 22;
                const baseY = laneFeetY - (charSize / 2);
                const startX = W + 35 + (i * 32);

                const s = this.add.image(startX, baseY, npcKey)
                    .setDisplaySize(charSize, charSize)
                    .setOrigin(0.5, 0.5)
                    .setFlipX(true)
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

            const monsterSize = 76;
            const monsterBaseY = laneFeetY - (monsterSize / 2);
            const villainKey = this.textures.exists('villain_template') ? 'villain_template' : npcKey;
            const monster = this.add.image(W + 155, monsterBaseY, villainKey)
                .setDisplaySize(monsterSize, monsterSize)
                .setOrigin(0.5, 0.5)
                .setFlipX(true)
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
                    this.time.delayedCall(700, stage1_solo);
                }
            });
        };

        stage1_solo();
    }

    _returnToMenu() {
        if (this.htmlAboutOverlay) {
            this.htmlAboutOverlay.destroy();
            this.htmlAboutOverlay = null;
        }
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }
}
