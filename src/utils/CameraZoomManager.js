import Phaser from 'phaser';
import { FONT_BODY } from './helpers.js';

// ===============================================================
// 🔍 CAMERA ZOOM MANAGER
// ===============================================================
// Pengatur sistem zoom in & zoom out kamera di Phaser 3.
// Fitur:
// 1. Laptop Touchpad (pinch 2 jari) & Mouse Wheel (scroll)
// 2. Layar HP / Tablet Layar Sentuh (multi-touch pinch 2 jari)
// 3. Tombol Shortcut Keyboard (+ / - / 0)
// 4. Tombol Interaktif di Navbar HUD (menampilkan % zoom & bisa diklik)
// 5. Menjaga posisi dan skala HUD / UI agar tidak bergeser saat zoom
// 6. Menyimpan preferensi zoom saat berpindah scene
// ===============================================================

export class CameraZoomManager {
    static globalZoom = 0.85;

    /**
     * @param {Phaser.Scene} scene
     * @param {Object} options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.minZoom = options.minZoom !== undefined ? options.minZoom : 0.85;
        this.maxZoom = options.maxZoom !== undefined ? options.maxZoom : 1.6;
        this.defaultZoom = options.defaultZoom !== undefined ? options.defaultZoom : 0.85;
        
        // Gunakan zoom global terakhir jika masih dalam batas
        const savedZoom = CameraZoomManager.globalZoom;
        this.currentZoom = Phaser.Math.Clamp(savedZoom !== undefined && savedZoom !== null ? savedZoom : this.defaultZoom, this.minZoom, this.maxZoom);

        this.enableWheel = options.enableWheel !== false;
        this.enablePinch = options.enablePinch !== false;
        this.enableKeys  = options.enableKeys  !== false;
        this.enableHUD   = options.enableHUD   !== false;

        this.followTarget    = options.followTarget || null;
        this.centerOnZoomOut = options.centerOnZoomOut || false;
        this.centerX         = options.centerX !== undefined ? options.centerX : 400;
        this.centerY         = options.centerY !== undefined ? options.centerY : 225;
        this.onZoomChange    = options.onZoomChange || null;

        this.uiMap = new Map();
        this.targetZoom = this.currentZoom;
        this.isFollowingCharacter = null;
        this.updateHandler = null;
        this.hudBtnText = null;
        this.toastTimeout = null;

        // Inisialisasi awal
        this.init();
    }

    init() {
        // Terapkan zoom awal
        this.scene.cameras.main.setZoom(this.currentZoom);
        this.applyCameraFocus(this.currentZoom, true);

        // Auto-register elemen UI yang sudah ada di scene (yang setScrollFactor(0))
        this.autoScanUI();

        // Terapkan penyesuaian posisi UI untuk zoom awal
        if (this.currentZoom !== 1.0) {
            this.updateUI(this.currentZoom);
        }

        // 1. Mouse Wheel & Laptop Touchpad Pinch (Target Zoom + Smooth Glide)
        if (this.enableWheel) {
            this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
                // Kunci zoom saat menu pengaturan atau modal aktif
                if (this.isBlockedByModal()) return;
                // deltaY < 0 = scroll up / pinch out (Zoom In)
                // deltaY > 0 = scroll down / pinch in (Zoom Out)
                const factor = deltaY < 0 ? 1.07 : 0.93;
                const nextZoom = this.targetZoom * factor;
                this.setZoom(nextZoom, true);
                this.showDebouncedToast();
            });
        }

        // 2. Mobile / Tablet Multi-Touch Pinch Gesture
        if (this.enablePinch) {
            let initialDist = null;
            let pinchBaseZoom = this.targetZoom;

            this.scene.input.on('pointermove', () => {
                if (this.isBlockedByModal()) return;
                const p1 = this.scene.input.pointer1;
                const p2 = this.scene.input.pointer2;

                if (p1 && p2 && p1.isDown && p2.isDown) {
                    const currentDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
                    if (!initialDist) {
                        initialDist = currentDist;
                        pinchBaseZoom = this.targetZoom;
                    } else if (Math.abs(currentDist - initialDist) > 5) {
                        const ratio = currentDist / initialDist;
                        const nextTarget = pinchBaseZoom * ratio;
                        this.setZoom(nextTarget, true);
                        this.showDebouncedToast();
                    }
                }
            });

            const resetPinch = () => {
                const p1 = this.scene.input.pointer1;
                const p2 = this.scene.input.pointer2;
                if (!p1 || !p2 || !p1.isDown || !p2.isDown) {
                    initialDist = null;
                }
            };

            this.scene.input.on('pointerup', resetPinch);
            this.scene.input.on('pointerupoutside', resetPinch);
        }

        // 3. Keyboard Shortcuts (+, -, 0)
        if (this.enableKeys && this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown', (event) => {
                if (this.isBlockedByModal()) return;
                if (event.key === '=' || event.key === '+') {
                    this.zoomIn(0.15, true);
                } else if (event.key === '-' || event.key === '_') {
                    this.zoomOut(0.15, true);
                } else if (event.key === '0') {
                    this.resetZoom(true);
                }
            });
        }

        // 4. Update Loop untuk animasi zoom yang sangat mulus (Ultra-smooth Damping LERP)
        this.updateHandler = (time, delta) => this.onSceneUpdate(time, delta);
        this.scene.events.on('update', this.updateHandler);

        // Bersihkan saat scene shutdown
        this.scene.events.once('shutdown', () => this.destroy());
    }

    isBlockedByModal() {
        if (!this.scene) return false;
        return !!(this.scene.isSettingsOpen ||
            this.scene.isQuestOpen ||
            this.scene.isInvOpen ||
            this.scene.isGameOver ||
            (this.scene.settingsModal && this.scene.settingsModal.isOpen()) ||
            (this.scene._settingsModal && this.scene._settingsModal.isOpen()) ||
            (this.scene.questModal && this.scene.questModal.visible) ||
            (this.scene.invModal && this.scene.invModal.visible));
    }

    registerUI(obj) {
        if (!obj || !obj.scene) return;

        // Pastikan obj dan seluruh elemen di dalamnya memiliki scrollFactor = 0
        // agar hit area klik tidak tergeser oleh camera.scrollX saat zoom!
        if (obj.setScrollFactor) obj.setScrollFactor(0);
        if (obj.list && Array.isArray(obj.list)) {
            obj.list.forEach(child => {
                if (child && child.setScrollFactor) {
                    child.setScrollFactor(0);
                }
            });
        }

        if (!this.uiMap.has(obj)) {
            this.uiMap.set(obj, {
                origX: obj.x,
                origY: obj.y,
                origScaleX: obj.scaleX || 1,
                origScaleY: obj.scaleY || 1
            });
            if (this.currentZoom !== 1.0) {
                this.applyTransformToItem(obj, this.uiMap.get(obj), this.currentZoom);
            }
        }
    }

    autoScanUI() {
        if (!this.scene || !this.scene.children) return;
        this.scene.children.each((child) => {
            if (child && (child.scrollFactorX === 0 || child.scrollFactorY === 0)) {
                this.registerUI(child);
            }
        });
    }

    applyTransformToItem(obj, orig, zoom) {
        // Objek HUD diatur posisinya secara statis dan responsif melalui event resize & setScrollFactor(0)
        // Menghindari pengubahan koordinat Y/X manual yang dapat merusak penataan tombol navbar
        return;
    }

    updateUI(zoom) {
        // Perbarui teks pada tombol HUD jika ada
        if (this.hudBtnText && this.hudBtnText.active) {
            const pct = Math.round(zoom * 100);
            this.hudBtnText.setText(`${pct}%`);
        }
        if (this.scene && this.scene.hud && this.scene.hud.updateZoomTransform) {
            this.scene.hud.updateZoomTransform(zoom);
        }
        if (this.scene && this.scene.updateModalsCenter) {
            this.scene.updateModalsCenter(zoom);
        }
    }

    onSceneUpdate(time, delta) {
        const diff = this.targetZoom - this.currentZoom;
        if (Math.abs(diff) > 0.0004) {
            const dt = Math.min(delta || 16.666, 50);
            // Dynamic smooth damping LERP (~240ms fluid easing)
            const factor = 1 - Math.pow(0.001, dt / 240);
            this.currentZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, factor);

            CameraZoomManager.globalZoom = this.currentZoom;
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.setZoom(this.currentZoom);
            }
            this.updateUI(this.currentZoom);
            if (this.onZoomChange) this.onZoomChange(this.currentZoom);
        } else if (this.currentZoom !== this.targetZoom) {
            this.currentZoom = this.targetZoom;
            CameraZoomManager.globalZoom = this.currentZoom;
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.setZoom(this.currentZoom);
            }
            this.updateUI(this.currentZoom);
            if (this.onZoomChange) this.onZoomChange(this.currentZoom);
        }
    }

    applyCameraFocus(zoom, immediate = false) {
        if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

        if (this.centerOnZoomOut && zoom <= 0.60) {
            // Hanya saat zoom out sangat jauh (overview map), lepaskan follow karakter
            if (this.isFollowingCharacter !== false) {
                this.isFollowingCharacter = false;
                this.scene.cameras.main.stopFollow();
                if (immediate) {
                    this.scene.cameras.main.centerOn(this.centerX, this.centerY);
                } else {
                    this.scene.cameras.main.pan(this.centerX, this.centerY, 350, 'Sine.easeInOut');
                }
            }
        } else if (this.followTarget) {
            // Selalu ikuti karakter pemain dengan tracking halus (lerp 0.08)
            if (this.isFollowingCharacter !== true) {
                this.isFollowingCharacter = true;
                this.scene.cameras.main.startFollow(this.followTarget, true, 0.08, 0.08);
            }
        }
    }

    /**
     * Atur level zoom kamera secara smooth atau instan
     */
    setZoom(targetZoom, smooth = true, showToastNow = false) {
        const clamped = Phaser.Math.Clamp(targetZoom, this.minZoom, this.maxZoom);
        this.targetZoom = clamped;

        this.applyCameraFocus(clamped, !smooth);

        if (!smooth) {
            this.currentZoom = clamped;
            CameraZoomManager.globalZoom = clamped;
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.setZoom(clamped);
            }
            this.updateUI(clamped);
            if (this.onZoomChange) this.onZoomChange(clamped);
            if (showToastNow) this.showFloatingToast();
        } else {
            if (showToastNow) this.showFloatingToast();
        }
    }

    zoomIn(step = 0.15, smooth = true) {
        this.setZoom(this.targetZoom + step, smooth, true);
    }

    zoomOut(step = 0.15, smooth = true) {
        this.setZoom(this.targetZoom - step, smooth, true);
    }

    resetZoom(smooth = true) {
        this.setZoom(this.defaultZoom, smooth, true);
    }

    /**
     * Berpindah preset zoom (0.85x -> 1.0x -> 1.25x -> 1.5x)
     */
    cyclePreset() {
        const presets = [0.85, 1.0, 1.25, 1.5];
        if (this.minZoom < 0.85 && !presets.includes(this.minZoom)) presets.unshift(this.minZoom);
        presets.sort((a, b) => a - b);

        // Cari preset terdekat yang lebih tinggi
        let nextPreset = presets.find(p => p > this.targetZoom + 0.05);
        if (!nextPreset) {
            nextPreset = presets[0];
        }

        this.setZoom(nextPreset, true, true);
    }

    /**
     * Buat tombol HUD interaktif di navbar (desain seragam dengan tombol HUD lain)
     */
    createHUDButton(x = 669, y = 26, w = 44, h = 36) {
        // Dinonaktifkan: kotak HUD zoom kanan atas dihilangkan sesuai permintaan
        return null;
    }

    showDebouncedToast() {
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.showFloatingToast();
        }, 350);
    }

    showFloatingToast() {
        if (!this.scene || !this.scene.add || !this.scene.sys || !this.scene.sys.isActive()) return;

        const pct = Math.round(this.targetZoom * 100);
        const msg = `Zoom Kamera: ${pct}%`;

        if (this.scene.showFloatingToast) {
            this.scene.showFloatingToast(msg, 0x38bdf8);
        }
    }

    destroy() {
        if (this.updateHandler && this.scene && this.scene.events) {
            this.scene.events.off('update', this.updateHandler);
            this.updateHandler = null;
        }
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
        this.uiMap.clear();
    }
}
