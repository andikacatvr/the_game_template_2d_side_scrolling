// ===============================================================
// GRID SYSTEM (TILEMAP & LEVEL DESIGN COORDINATE GRID)
// Mirip sistem grid di Unity 2D, Godot, Tiled Map Editor, & Growtopia
// 1. Grid Lines: Garis kisi beraturan 16px/32px/48px/64px di dunia game
// 2. Cursor Cell Hover: Kotak highlight bersinar di sel yang ditunjuk mouse
// 3. Floating Coordinate Chip: Menampilkan Col, Row, World X, World Y secara live
// 4. Snap to Grid: Membantu menaruh platform/NPC/koin dengan presisi LEGO
// ===============================================================

import { AudioManager } from './AudioManager.js';

class GridSystemClass {
    constructor() {
        this.scene = null;
        this.isActive = false;
        this.cellSize = 50; // Default 50px (Pas rasio 16:9: 16 kolom × 9 baris genap di 800×450)
        this.snapEnabled = false; // Default OFF agar tidak mengunci penempatan objek
        this.graphics = null;
        this.hudBadge = null;
        this.updateListener = null;
        this.keyListener = null;
        this.hoverCell = { col: 0, row: 0, x: 0, y: 0 };
    }

    init(scene) {
        if (this.scene === scene && this.graphics) return;
        this.cleanup();
        this.scene = scene;

        // Pasang listener tombol keyboard [G] untuk toggle grid
        this.keyListener = (e) => {
            // Abaikan jika sedang mengetik di input / console / textarea
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea') return;

            if (e.key === 'g' || e.key === 'G') {
                this.toggle(this.scene);
            }
        };
        window.addEventListener('keydown', this.keyListener);

        // Jika sebelumnya aktif, langsung nyalakan di scene baru
        if (this.isActive) {
            this.activate();
        }

        this.scene.events.once('shutdown', () => this.cleanup());
        this.scene.events.once('destroy', () => this.cleanup());
    }

    toggle(scene) {
        if (scene) this.scene = scene;
        if (!this.scene) return;

        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    activate() {
        if (!this.scene) return;
        this.isActive = true;

        // 1. Buat Graphics Object di Phaser (Depth tinggi, scroll factor 1 agar diproses di koordinat dunia Phaser)
        if (!this.graphics) {
            this.graphics = this.scene.add.graphics();
            this.graphics.setDepth(99990);
            this.graphics.setScrollFactor(1);
        }

        // 2. Buat Floating HUD Badge di HTML
        this.createHUD();

        // 3. Pasang loop update render garis grid
        if (!this.updateListener) {
            this.updateListener = () => this.renderGrid();
            this.scene.events.on('update', this.updateListener);
        }

        // 4. Update status tombol di Engine Menu Bar
        this.updateMenuBarButton(true);

        AudioManager.playClick();
        if (this.scene.showFloatingToast) {
            this.scene.showFloatingToast(`▦ Grid System Aktif (${this.cellSize}×${this.cellSize}px) [Tekan G]`, 0xa855f7);
        }
    }

    deactivate() {
        this.isActive = false;

        if (this.graphics) {
            this.graphics.clear();
            this.graphics.destroy();
            this.graphics = null;
        }

        if (this.updateListener && this.scene) {
            this.scene.events.off('update', this.updateListener);
            this.updateListener = null;
        }

        if (this.hudBadge) {
            this.hudBadge.remove();
            this.hudBadge = null;
        }

        this.updateMenuBarButton(false);
        AudioManager.playClick();
        if (this.scene && this.scene.showFloatingToast) {
            this.scene.showFloatingToast('▦ Grid System Dinonaktifkan', 0x64748b);
        }
    }

    setCellSize(size) {
        this.cellSize = size;
        AudioManager.playClick();
        if (this.hudBadge) {
            const sizeLabel = document.getElementById('gt-grid-size-label');
            if (sizeLabel) sizeLabel.textContent = `${this.cellSize}px`;
            this.updateSizeButtonsUI();
        }
        if (this.scene && this.scene.showFloatingToast) {
            this.scene.showFloatingToast(`Ukuran Grid diubah ke ${this.cellSize}×${this.cellSize}px`, 0x38bdf8);
        }
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        AudioManager.playClick();
        if (this.hudBadge) {
            const snapBtn = document.getElementById('gt-grid-snap-toggle');
            if (snapBtn) {
                snapBtn.textContent = `Snap: ${this.snapEnabled ? 'ON' : 'OFF'}`;
                snapBtn.style.color = this.snapEnabled ? '#4ade80' : '#94a3b8';
                snapBtn.style.borderColor = this.snapEnabled ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            }
        }
    }

    renderGrid() {
        if (!this.isActive || !this.graphics || !this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

        const cam = this.scene.cameras.main;
        const g = this.graphics;
        g.clear();

        const step = this.cellSize;

        // Dapatkan batas dunia yang benar-benar terlihat di layar kamera saat ini (termasuk offset, zoom, & expandable canvas)
        const pTopLeft = cam.getWorldPoint(0, 0);
        const pBottomRight = cam.getWorldPoint(cam.width, cam.height);

        const worldMinX = Math.min(pTopLeft.x, pBottomRight.x);
        const worldMaxX = Math.max(pTopLeft.x, pBottomRight.x);
        const worldMinY = Math.min(pTopLeft.y, pBottomRight.y);
        const worldMaxY = Math.max(pTopLeft.y, pBottomRight.y);

        // Ekstensi garis melebihi batas layar agar memenuhi 100% layar tanpa celah
        const startX = Math.floor(worldMinX / step) * step - step * 2;
        const endX = Math.ceil(worldMaxX / step) * step + step * 2;
        const startY = Math.floor(worldMinY / step) * step - step * 2;
        const endY = Math.ceil(worldMaxY / step) * step + step * 2;

        // 1. Gambar Garis Vertikal (Penuh dari ujung atas ke ujung bawah layar)
        for (let wx = startX; wx <= endX; wx += step) {
            const isMajor = (Math.round(wx) % (step * 4) === 0);
            if (isMajor) {
                g.lineStyle(1.5, 0xa855f7, 0.45); // Garis mayor ungu
            } else {
                g.lineStyle(1, 0x38bdf8, 0.22);   // Garis minor cyan
            }
            g.lineBetween(wx, startY, wx, endY);
        }

        // 2. Gambar Garis Horizontal (Penuh dari ujung kiri ke ujung kanan layar)
        for (let wy = startY; wy <= endY; wy += step) {
            const isMajor = (Math.round(wy) % (step * 4) === 0);
            if (isMajor) {
                g.lineStyle(1.5, 0xa855f7, 0.45);
            } else {
                g.lineStyle(1, 0x38bdf8, 0.22);
            }
            g.lineBetween(startX, wy, endX, wy);
        }

        // 3. Highlight Kotak Sel Aktif di bawah kursor mouse
        const pointer = this.scene.input.activePointer;
        if (pointer && pointer.x >= 0 && pointer.x <= cam.width && pointer.y >= 0 && pointer.y <= cam.height) {
            const worldPointer = cam.getWorldPoint(pointer.x, pointer.y);
            const col = Math.floor(worldPointer.x / step);
            const row = Math.floor(worldPointer.y / step);
            const cellWorldX = col * step;
            const cellWorldY = row * step;

            this.hoverCell = { col, row, x: cellWorldX, y: cellWorldY };

            // Kotak highlight bersinar ungu tepat di sel yang ditunjuk
            g.fillStyle(0xa855f7, 0.26);
            g.fillRect(cellWorldX, cellWorldY, step, step);
            g.lineStyle(2, 0xc084fc, 0.85);
            g.strokeRect(cellWorldX, cellWorldY, step, step);

            // Titik tengah sel
            g.fillStyle(0xffffff, 0.85);
            g.fillCircle(cellWorldX + step / 2, cellWorldY + step / 2, 2.5);

            // Update teks live di floating badge
            this.updateHUDText(col, row, cellWorldX, cellWorldY);
        }
    }

    createHUD() {
        if (this.hudBadge) this.hudBadge.remove();

        this.hudBadge = document.createElement('div');
        this.hudBadge.id = 'gt-grid-system-hud';
        this.hudBadge.className = 'gt-grid-hud';

        this.hudBadge.innerHTML = `
            <style>
                .gt-grid-hud {
                    position: fixed;
                    bottom: 18px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(15, 23, 42, 0.94);
                    border: 2px solid rgba(168, 85, 247, 0.5);
                    border-radius: 28px;
                    padding: 6px 18px;
                    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.35);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 99990;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                    pointer-events: auto;
                    animation: gridHudFadeIn 0.2s ease;
                }

                @keyframes gridHudFadeIn {
                    from { opacity: 0; transform: translate(-50%, 10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                .gt-grid-hud-title {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12.5px;
                    font-weight: 800;
                    color: #d8b4fe;
                    letter-spacing: 0.3px;
                }

                .gt-grid-hud-coords {
                    font-size: 12px;
                    font-family: 'JetBrains Mono', monospace;
                    color: #f8fafc;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(0, 0, 0, 0.35);
                    padding: 3px 10px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .gt-grid-hud-coords span {
                    color: #38bdf8;
                    font-weight: bold;
                }

                .gt-grid-size-btn-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gt-grid-size-btn {
                    padding: 2px 7px;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #cbd5e1;
                    cursor: pointer;
                    transition: all 0.12s ease;
                }

                .gt-grid-size-btn:hover {
                    background: #a855f7;
                    color: #ffffff;
                    border-color: #c084fc;
                }

                .gt-grid-size-btn.active {
                    background: #a855f7;
                    color: #ffffff;
                    border-color: #c084fc;
                    box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
                }

                .gt-grid-toggle-btn {
                    padding: 3px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(74, 222, 128, 0.4);
                    color: #4ade80;
                    cursor: pointer;
                    transition: all 0.12s ease;
                }

                .gt-grid-close-btn {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 2px;
                    transition: color 0.12s ease;
                }

                .gt-grid-close-btn:hover {
                    color: #ef4444;
                }
            </style>

            <div class="gt-grid-hud-title">
                <span>▦</span>
                <span>GRID:</span>
                <span id="gt-grid-size-label" style="color: #ffffff;">${this.cellSize}px</span>
            </div>

            <div class="gt-grid-hud-coords">
                <div>Col: <span id="gt-grid-col">0</span></div>
                <div>Row: <span id="gt-grid-row">0</span></div>
                <div>Pos: (<span id="gt-grid-pos-x">0</span>, <span id="gt-grid-pos-y">0</span>)</div>
            </div>

            <!-- Pengatur Ukuran Kotak -->
            <div class="gt-grid-size-btn-group" title="Pilih ukuran kotak grid">
                <button class="gt-grid-size-btn ${this.cellSize === 25 ? 'active' : ''}" data-size="25" title="Detail halus (32×18 kotak)">25</button>
                <button class="gt-grid-size-btn ${this.cellSize === 32 ? 'active' : ''}" data-size="32" title="Standar Tile / Platform 2D">32 (Tile)</button>
                <button class="gt-grid-size-btn ${this.cellSize === 50 ? 'active' : ''}" data-size="50" title="Rasio 16:9 Pas Layar (16×9 kotak)">50 (16:9)</button>
                <button class="gt-grid-size-btn ${this.cellSize === 64 ? 'active' : ''}" data-size="64" title="Minimalis & lapang">64</button>
            </div>

            <button class="gt-grid-toggle-btn" id="gt-grid-snap-toggle" title="Snap aset ke petak terdekat (opsional)">
                Snap: ${this.snapEnabled ? 'ON' : 'OFF'}
            </button>

            <button class="gt-grid-close-btn" id="gt-grid-btn-close" title="Tutup Grid (Shortcut: G)">✕</button>
        `;

        document.body.appendChild(this.hudBadge);

        // Pasang Event Listeners di Badge
        this.hudBadge.querySelectorAll('.gt-grid-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const s = parseInt(btn.getAttribute('data-size'), 10);
                this.setCellSize(s);
            });
        });

        const snapBtn = document.getElementById('gt-grid-snap-toggle');
        if (snapBtn) {
            snapBtn.addEventListener('click', () => this.toggleSnap());
        }

        const closeBtn = document.getElementById('gt-grid-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivate());
        }
    }

    updateHUDText(col, row, wx, wy) {
        const colEl = document.getElementById('gt-grid-col');
        const rowEl = document.getElementById('gt-grid-row');
        const posXEl = document.getElementById('gt-grid-pos-x');
        const posYEl = document.getElementById('gt-grid-pos-y');

        if (colEl) colEl.textContent = col;
        if (rowEl) rowEl.textContent = row;
        if (posXEl) posXEl.textContent = wx;
        if (posYEl) posYEl.textContent = wy;
    }

    updateSizeButtonsUI() {
        if (!this.hudBadge) return;
        this.hudBadge.querySelectorAll('.gt-grid-size-btn').forEach(btn => {
            const s = parseInt(btn.getAttribute('data-size'), 10);
            if (s === this.cellSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateMenuBarButton(active) {
        const btn = document.getElementById('gt-mb-btn-grid');
        if (btn) {
            if (active) {
                btn.classList.add('active');
                btn.title = 'Grid System Aktif (Klik atau tekan G untuk matikan)';
            } else {
                btn.classList.remove('active');
                btn.title = 'Toggle Grid System & Snap Koordinat (Shortcut: G)';
            }
        }
    }

    // Helper: Snap koordinat (x, y) ke tengah atau sudut sel kotak
    snap(worldX, worldY, alignCenter = true) {
        const s = this.cellSize;
        const col = Math.floor(worldX / s);
        const row = Math.floor(worldY / s);
        const offset = alignCenter ? s / 2 : 0;
        return {
            x: col * s + offset,
            y: row * s + offset,
            col: col,
            row: row,
            cellSize: s
        };
    }

    cleanup() {
        if (this.keyListener) {
            window.removeEventListener('keydown', this.keyListener);
            this.keyListener = null;
        }
        if (this.updateListener && this.scene) {
            this.scene.events.off('update', this.updateListener);
            this.updateListener = null;
        }
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
        if (this.hudBadge) {
            this.hudBadge.remove();
            this.hudBadge = null;
        }
    }
}

export const GridSystem = new GridSystemClass();
