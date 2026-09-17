import Phaser from 'phaser';
import './src/utils/DisplayManager.js';
import { BootScene }    from './src/scenes/BootScene.js';
import { TitleScene }   from './src/scenes/TitleScene.js';
import { GameScene }    from './src/scenes/GameScene.js';
import { HongKongScene } from './src/scenes/HongKongScene.js';
import { AboutScene }    from './src/scenes/AboutScene.js';
import { CommandConsole } from './src/utils/CommandConsole.js';

export { SaveManager } from './src/utils/SaveManager.js';

// Inisialisasi Chat Command Bar & Code Inspector
CommandConsole.init();

// ===============================================================
// 🎮 PHASER GAME CONFIG & INITIALIZATION
// ===============================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: 'game-container',
    pixelArt: false,
    roundPixels: false,
    scale: {
        mode: Phaser.Scale.EXPAND,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3
    },
    resolution: Math.max(2, window.devicePixelRatio || 2),
    render: {
        antialias: true,
        antialiasGL: true,
        roundPixels: false,
        pixelArt: false,
        powerPreference: 'high-performance'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 650 },
            debug: false
        }
    },
    scene: [BootScene, TitleScene, GameScene, HongKongScene, AboutScene]
};

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
        window.__templateGame = new Phaser.Game(config);
    });
} else {
    window.__templateGame = new Phaser.Game(config);
}
