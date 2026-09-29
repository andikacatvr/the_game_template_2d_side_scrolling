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
        this.toolMode = 'none'; // 'none' (Normal), 'dig' (Gali/Hapus Balok & Objek), 'build' (Pasang Balok)
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

        // Pasang listener tombol keyboard: [G] toggle grid, [X] mode gali/hapus, [B] mode pasang
        this.keyListener = (e) => {
            // Abaikan jika sedang mengetik di input / console / textarea
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea') return;

            if (e.key === 'g' || e.key === 'G') {
                this.toggle(this.scene);
            } else if (e.key === 'x' || e.key === 'X') {
                this.setToolMode('dig');
            } else if (e.key === 'b' || e.key === 'B') {
                this.setToolMode('build');
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

        // 1. Buat Graphics Object di Phaser (Depth tinggi, scroll factor 0 agar dirender langsung di koordinat layar tanpa distorsi kamera)
        if (!this.graphics) {
            this.graphics = this.scene.add.graphics();
            this.graphics.setDepth(99990);
            this.graphics.setScrollFactor(0);
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
            this.scene.showFloatingToast('▦ Grid System 50px Aktif [Tekan G]', 0xa855f7);
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

    setToolMode(mode) {
        if (this.toolMode === mode) {
            this.toolMode = 'none';
        } else {
            this.toolMode = mode;
            if (!this.isActive) {
                this.activate();
            }
        }

        AudioManager.playClick();
        this.updateToolButtonsUI();

        if (this.scene && this.scene.showFloatingToast) {
            if (this.toolMode === 'dig') {
                this.scene.showFloatingToast('⛏️ Mode Gali / Hapus Aktif [Klik tanah atau platform untuk menghancurkan]', 0xef4444);
            } else if (this.toolMode === 'build') {
                this.scene.showFloatingToast('🧱 Mode Pasang Balok Aktif [Klik petak kosong untuk pasang balok]', 0x22c55e);
            } else {
                this.scene.showFloatingToast('🔍 Mode Grid Normal', 0x38bdf8);
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
        const startX = Math.floor(worldMinX / step) * step - step;
        const endX = Math.ceil(worldMaxX / step) * step + step;
        const startY = Math.floor(worldMinY / step) * step - step;
        const endY = Math.ceil(worldMaxY / step) * step + step;

        const screenW = Math.max(cam.width, this.scene.scale ? this.scene.scale.width : 800);
        const screenH = Math.max(cam.height, this.scene.scale ? this.scene.scale.height : 450);

        // Gambar Garis Vertikal & Horizontal Putih Bersih (Uniform 1px, elegan, tajam, & konsisten)
        // Menggunakan proyeksi koordinat layar integer (Math.round), setiap garis mendarat tepat pada
        // 1 kolom/baris pixel fisik layar tanpa sub-pixel anti-aliasing / blur / garis belang tebal-tipis!
        g.lineStyle(1, 0xffffff, 0.45);
        for (let wx = startX; wx <= endX; wx += step) {
            const sx = Math.round((wx - pTopLeft.x) * cam.zoom);
            if (sx >= -1 && sx <= screenW + 1) {
                g.lineBetween(sx, 0, sx, screenH);
            }
        }
        for (let wy = startY; wy <= endY; wy += step) {
            const sy = Math.round((wy - pTopLeft.y) * cam.zoom);
            if (sy >= -1 && sy <= screenH + 1) {
                g.lineBetween(0, sy, screenW, sy);
            }
        }

        // 3. Highlight Kotak Sel Aktif di bawah kursor mouse
        const pointer = this.scene.input.activePointer;
        if (pointer && pointer.x >= 0 && pointer.x <= screenW && pointer.y >= 0 && pointer.y <= screenH) {
            const worldPointer = cam.getWorldPoint(pointer.x, pointer.y);
            const col = Math.floor(worldPointer.x / step);
            const row = Math.floor(worldPointer.y / step);
            const cellWorldX = col * step;
            const cellWorldY = row * step;

            this.hoverCell = { col, row, x: cellWorldX, y: cellWorldY };

            // Proyeksikan batas kotak sel ke koordinat layar yang sinkron presisi dengan garis grid
            const boxSx = Math.round((cellWorldX - pTopLeft.x) * cam.zoom);
            const boxSy = Math.round((cellWorldY - pTopLeft.y) * cam.zoom);
            const boxSw = Math.round(((cellWorldX + step) - pTopLeft.x) * cam.zoom) - boxSx;
            const boxSh = Math.round(((cellWorldY + step) - pTopLeft.y) * cam.zoom) - boxSy;

            if (this.toolMode === 'dig') {
                // Mode Gali / Hapus: Kotak merah menyala + tanda silang (X)
                g.fillStyle(0xef4444, 0.28);
                g.fillRect(boxSx, boxSy, boxSw, boxSh);
                g.lineStyle(2.5, 0xef4444, 1.0);
                g.strokeRect(boxSx, boxSy, boxSw, boxSh);

                g.lineStyle(2, 0xffffff, 0.95);
                g.lineBetween(boxSx + 15, boxSy + 15, boxSx + boxSw - 15, boxSy + boxSh - 15);
                g.lineBetween(boxSx + boxSw - 15, boxSy + 15, boxSx + 15, boxSy + boxSh - 15);
            } else if (this.toolMode === 'build') {
                // Mode Pasang: Kotak hijau zamrud menyala + tanda plus (+)
                g.fillStyle(0x22c55e, 0.28);
                g.fillRect(boxSx, boxSy, boxSw, boxSh);
                g.lineStyle(2.5, 0x22c55e, 1.0);
                g.strokeRect(boxSx, boxSy, boxSw, boxSh);

                g.lineStyle(2, 0xffffff, 0.95);
                g.lineBetween(boxSx + boxSw / 2, boxSy + 13, boxSx + boxSw / 2, boxSy + boxSh - 13);
                g.lineBetween(boxSx + 13, boxSy + boxSh / 2, boxSx + boxSw - 13, boxSy + boxSh / 2);
            } else {
                // Mode Normal: Kotak highlight seleksi dengan double-outline hitam & putih
                g.fillStyle(0xffffff, 0.12);
                g.fillRect(boxSx, boxSy, boxSw, boxSh);
                g.lineStyle(3, 0x000000, 0.85);
                g.strokeRect(boxSx, boxSy, boxSw, boxSh);
                g.lineStyle(1.5, 0xffffff, 0.95);
                g.strokeRect(boxSx, boxSy, boxSw, boxSh);

                // Titik tengah sel berkontras tinggi
                g.fillStyle(0x000000, 0.9);
                g.fillCircle(boxSx + boxSw / 2, boxSy + boxSh / 2, 3.5);
                g.fillStyle(0xffffff, 1.0);
                g.fillCircle(boxSx + boxSw / 2, boxSy + boxSh / 2, 2);
            }

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

                /* World Manipulation Tools (Gali / Pasang / Reset) */
                .gt-grid-tool-btn-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    border-left: 1px solid rgba(255, 255, 255, 0.15);
                    border-right: 1px solid rgba(255, 255, 255, 0.15);
                    padding: 0 8px;
                }

                .gt-grid-tool-btn {
                    padding: 3px 9px;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #cbd5e1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.12s ease;
                }

                .gt-grid-tool-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                }

                .gt-grid-tool-btn.active-dig {
                    background: #ef4444 !important;
                    color: #ffffff !important;
                    border-color: #f87171 !important;
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.6) !important;
                }

                .gt-grid-tool-btn.active-build {
                    background: #22c55e !important;
                    color: #ffffff !important;
                    border-color: #4ade80 !important;
                    box-shadow: 0 0 10px rgba(34, 197, 94, 0.6) !important;
                }

                .gt-grid-btn-reset:hover {
                    background: #eab308 !important;
                    color: #0f172a !important;
                    border-color: #fde047 !important;
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
                <span id="gt-grid-size-label" style="color: #ffffff; font-weight: 800;">50px</span>
                <span style="font-size: 10px; color: #d8b4fe; font-weight: 700; background: rgba(168, 85, 247, 0.2); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.4);">16:9</span>
            </div>

            <div class="gt-grid-hud-coords">
                <div>Col: <span id="gt-grid-col">0</span></div>
                <div>Row: <span id="gt-grid-row">0</span></div>
                <div>Pos: (<span id="gt-grid-pos-x">0</span>, <span id="gt-grid-pos-y">0</span>)</div>
            </div>

            <!-- Kelompok Alat Manipulasi World -->
            <div class="gt-grid-tool-btn-group">
                <button class="gt-grid-tool-btn" id="gt-grid-tool-dig" title="Mode Gali / Hapus Balok & Objek (Shortcut: X)">
                    ⛏️ Gali [X]
                </button>
                <button class="gt-grid-tool-btn" id="gt-grid-tool-build" title="Mode Pasang Balok Modular (Shortcut: B)">
                    🧱 Pasang [B]
                </button>
                <button class="gt-grid-tool-btn gt-grid-btn-reset" id="gt-grid-btn-reset" title="Kembalikan semua balok tanah ke kondisi awal">
                    ↺ Reset
                </button>
            </div>

            <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                <span>Toggle:</span>
                <b style="color: #f1f5f9; background: rgba(255, 255, 255, 0.12); padding: 1px 6px; border-radius: 4px;">[G]</b>
            </div>

            <button class="gt-grid-close-btn" id="gt-grid-btn-close" title="Tutup Grid (Shortcut: G)">✕</button>
        `;

        document.body.appendChild(this.hudBadge);

        const digBtn = document.getElementById('gt-grid-tool-dig');
        if (digBtn) {
            digBtn.addEventListener('click', () => this.setToolMode('dig'));
        }

        const buildBtn = document.getElementById('gt-grid-tool-build');
        if (buildBtn) {
            buildBtn.addEventListener('click', () => this.setToolMode('build'));
        }

        const resetBtn = document.getElementById('gt-grid-btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.scene && typeof this.scene.resetWorldBlocks === 'function') {
                    this.scene.resetWorldBlocks();
                }
            });
        }

        const closeBtn = document.getElementById('gt-grid-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivate());
        }

        this.updateToolButtonsUI();
    }

    updateToolButtonsUI() {
        const digBtn = document.getElementById('gt-grid-tool-dig');
        const buildBtn = document.getElementById('gt-grid-tool-build');
        const mbDigBtn = document.getElementById('gt-mb-btn-dig');
        const mbBuildBtn = document.getElementById('gt-mb-btn-build');

        if (digBtn) digBtn.classList.toggle('active-dig', this.toolMode === 'dig');
        if (buildBtn) buildBtn.classList.toggle('active-build', this.toolMode === 'build');
        if (mbDigBtn) mbDigBtn.classList.toggle('active-dig', this.toolMode === 'dig');
        if (mbBuildBtn) mbBuildBtn.classList.toggle('active-build', this.toolMode === 'build');
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
