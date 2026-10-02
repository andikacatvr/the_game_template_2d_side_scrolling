import { AudioManager } from '../utils/AudioManager.js';
import { ProjectManager } from '../utils/ProjectManager.js';
import { SceneFlowGraphView } from './SceneFlowGraphView.js';

// Katalog Item Template untuk World Builder (Unit Kotak 1x1 Presisi)
export const ITEM_TEMPLATES = {
    dirt: { type: 'dirt', label: 'Tanah', icon: '🟫', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 8, desc: 'Blok tanah / tebing modular' },
    player: { type: 'player', label: 'Letak Spawn (Pintu Putih)', icon: '🚪', cat: 'spawn', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Pintu kedatangan utama pemain (Default, bisa dipindah, tidak bisa dihapus)', isUnique: true },
    npc: { type: 'npc', label: 'NPC', icon: '🧙', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Karakter interaktif pemberi dialog' },
    slime: { type: 'slime', label: 'Slime', icon: '🟢', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Monster slime melompat berlendir' },
    skeleton: { type: 'skeleton', label: 'Skeleton', icon: '💀', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Monster tengkorak berpatroli' },
    platforms: { type: 'platforms', label: 'Pijakan', icon: '🧱', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 5, desc: 'Balok pijakan melayang' },
    spikes: { type: 'spikes', label: 'Duri', icon: '⚠️', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Jebakan duri runcing berbahaya' },
    chest: { type: 'chest', label: 'Peti', icon: '📦', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Peti harta karun hadiah' },
    coins: { type: 'coins', label: 'Koin', icon: '🪙', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 4, desc: 'Koin emas koleksi skor' },
    portal: { type: 'portal', label: 'Portal', icon: '🌀', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Gerbang portal finish kemenangan', isUnique: true },
    water: { type: 'water', label: 'Air', icon: '🌊', cat: 'fluid', wTiles: 1, hTiles: 1, defaultRow: 8, desc: 'Blok cairan air danau/kolam' },
    lava: { type: 'lava', label: 'Lava', icon: '🌋', cat: 'fluid', wTiles: 1, hTiles: 1, defaultRow: 8, desc: 'Blok cairan lahar panas mematikan' }
};

export class SceneBuilderModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this.projectId = options.projectId || null;
        this.sceneId = options.sceneId || null;
        this._isOpen = false;
        this.animFrameId = null;

        // Default State (STANDARDIZED TILE MATRIX SNAP 50x50px)
        // 36 Kolom (0..35 = 1800px).
        // Baris 0..7 = Langit, Baris 8 = Permukaan Tanah (y = 400px), Baris 9+ = Subsoil & Bedrock.
        this.state = {
            name: options.name || (options.sceneName || 'Level Baru'),
            biome: options.biome || 'dirt', // 'dirt' | 'snow' | 'desert' | 'cave' | 'hongkong'
            timeOfDay: 'day', // 'day' | 'sunset' | 'night'
            showGrid: true,
            showGizmos: true,
            selectedId: 'player_1',
            activeTool: null, // item type yang sedang aktif untuk mode cap (stamp tool)
            worldWidth: 3600,
            worldHeight: 1000,

            // Dynamic Entity List (Default bersih: Pintu Kedatangan & Portal Kemenangan)
            entities: [
                { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Letak Spawn (Pintu Putih)', cat: 'spawn', icon: '🚪', wTiles: 1, hTiles: 1 },
                { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
            ]
        };

        // Inisialisasi Petak Tanah Modular Penuh (Row 8, membentang sepanjang 72 kolom)
        const initTerrain = new Set();
        for (let c = 0; c < 72; c++) {
            initTerrain.add(`${c},8`);
        }
        this.state.terrainTiles = initTerrain;
        this.state.dugTiles = new Set();

        this.animTime = 0;
        this.hoverTile = null; // { col, row }
        this.isCanvasDragging = false;
        this.canvasDragEntity = null;
        this.draggedHierarchyId = null;
        this.clipboardEntity = null; // Clipboard untuk Ctrl+C dan Ctrl+V
        this.dragStartCol = 0;
        this.dragStartRow = 0;

        // Multi-Seleksi Kotak (Box Marquee Selection via Mouse Drag atau Shift + Panah)
        this.boxSelection = null; // { startCol, startRow, endCol, endRow }
        this.isBoxSelecting = false;
        this.dragPixelBox = null; // { startX, startY, currentX, currentY } untuk 60fps pixel-smooth drag
        this.selectionFlashes = []; // Feedback visual flash saat batch fill / delete
        this.isTestPlayMode = false;
        this.testPlayer = null;
        this.testKeys = { w: false, a: false, s: false, d: false, space: false };

        // History Stacks untuk Undo & Redo (Ctrl+Z & Ctrl+Y / Ctrl+Shift+Z)
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySteps = 50;
        this._dragPreMoveSnapshot = null;

        // Preload Aset Parallax Background untuk Live Canvas Preview 1:1
        this.bgImages = {};
        const bgAssets = {
            snow_mountain: '/bg_scene1.png',
            hk_sky: '/assets/hongkong/layer_1_sky_500.png',
            hk_city: '/assets/hongkong/layer_2_city_500.png',
            hk_boat: '/assets/hongkong/layer_3_boat_scaled.png',
            hk_waves: '/assets/hongkong/layer_4_waves_500.png',
            hk_pier: '/assets/hongkong/layer_5_pier_500.png'
        };
        Object.entries(bgAssets).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                this.bgImages[key] = img;
            };
        });

        this.createDOM();
        this.preventAllOverlaps();
        if (this.scene) {
            this.syncWithActiveScene(this.scene);
        }
    }

    createDOM() {
        const oldEl = document.getElementById('gt-scene-builder-overlay');
        if (oldEl) oldEl.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-scene-builder-overlay';
        this.overlay.className = 'gt-sb-overlay hidden';

        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');

                .gt-sb-overlay {
                    position: fixed;
                    inset: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 99998;
                    display: flex;
                    flex-direction: column;
                    background: #0d0d10;
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s ease;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                    overflow: hidden;
                    color: #e4e4e7;
                }

                .gt-sb-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                /* =============================================================== */
                /* 1. TOP UNITY-STYLE TOOLBAR                                      */
                /* =============================================================== */
                .gt-sb-topbar {
                    height: 48px;
                    background: #18181c;
                    border-bottom: 1px solid #27272a;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 14px;
                    flex-shrink: 0;
                    gap: 12px;
                    z-index: 20;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
                }

                .gt-sb-topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-sb-unity-brand {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 4px 8px;
                    background: #111114;
                    border: 1px solid #27272a;
                    border-radius: 5px;
                }

                .gt-sb-unity-logo {
                    font-size: 15px;
                }

                .gt-sb-unity-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 0.5px;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-sb-scene-tag {
                    font-size: 11px;
                    font-weight: 700;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    background: rgba(56, 189, 248, 0.1);
                    padding: 3px 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(56, 189, 248, 0.25);
                }

                .gt-sb-topbar-divider {
                    width: 1px;
                    height: 20px;
                    background: #27272a;
                    margin: 0 4px;
                }

                /* Mode Switcher: Scene View vs Flow Graph */
                .gt-sb-mode-tabs {
                    display: flex;
                    align-items: center;
                    background: #111115;
                    border: 1px solid #27272a;
                    border-radius: 6px;
                    padding: 2px;
                    gap: 3px;
                }

                .gt-sb-mode-tab {
                    padding: 4px 10px;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                }

                .gt-sb-mode-tab:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.06);
                }

                .gt-sb-mode-tab.active {
                    background: #0284c7;
                    color: #ffffff;
                    box-shadow: 0 0 10px rgba(2, 132, 199, 0.4);
                }

                .gt-sb-input-wrap {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #111114;
                    border: 1px solid #27272a;
                    border-radius: 5px;
                    padding: 2px 4px 2px 8px;
                }

                .gt-sb-input-name {
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #f4f4f5;
                    font-size: 12px;
                    font-weight: 600;
                    width: 150px;
                    font-family: inherit;
                }

                .gt-sb-btn-random {
                    background: #242429;
                    border: 1px solid #38383e;
                    color: #e4e4e7;
                    font-size: 10.5px;
                    font-weight: 700;
                    padding: 3px 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.12s ease;
                }

                .gt-sb-btn-random:hover {
                    background: #323238;
                    color: #ffffff;
                }

                /* Unity Play Controls in Center */
                .gt-sb-topbar-center {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-sb-play-btn {
                    background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
                    border: 1px solid #4ade80;
                    color: #ffffff;
                    padding: 5px 16px;
                    border-radius: 5px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                    box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
                    font-family: inherit;
                }

                .gt-sb-play-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 0 18px rgba(74, 222, 128, 0.6);
                    filter: brightness(1.1);
                }

                .gt-sb-tool-toggle {
                    background: #1c1c21;
                    border: 1px solid #2d2d34;
                    color: #a1a1aa;
                    padding: 4px 10px;
                    border-radius: 5px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-sb-tool-toggle:hover {
                    background: #27272e;
                    color: #f4f4f5;
                }

                .gt-sb-tool-toggle.active {
                    background: #172554;
                    border-color: #38bdf8;
                    color: #38bdf8;
                }

                .gt-sb-tool-btn {
                    background: #1c1c21;
                    border: 1px solid #2d2d34;
                    color: #e2e8f0;
                    padding: 4px 9px;
                    border-radius: 5px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.15s ease;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-sb-tool-btn:hover:not(.disabled) {
                    background: #27272e;
                    color: #38bdf8;
                    border-color: #38bdf8;
                }

                .gt-sb-tool-btn.disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    border-color: #23232a;
                    color: #64748b;
                }

                /* Right Section Toolbar */
                .gt-sb-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-sb-btn-play {
                    width: 30px;
                    height: 30px;
                    border-radius: 5px;
                    background: #1c1c21;
                    border: 1px solid #2d2d34;
                    color: #22c55e;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                    padding: 0;
                    margin: 0;
                }

                .gt-sb-btn-play:hover {
                    background: #15803d;
                    border-color: #22c55e;
                    color: #ffffff;
                }

                .gt-sb-biome-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #111114;
                    padding: 3px 5px;
                    border-radius: 6px;
                    border: 1px solid #27272a;
                }

                .gt-sb-biome-btn {
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid transparent;
                    background: transparent;
                    color: #a1a1aa;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }

                .gt-sb-biome-btn:hover {
                    background: #1e1e24;
                    color: #f4f4f5;
                }

                .gt-sb-biome-btn.active {
                    background: #1e293b;
                    border-color: #60a5fa;
                    color: #60a5fa;
                }

                .gt-sb-btn-close {
                    width: 30px;
                    height: 30px;
                    border-radius: 5px;
                    background: #1c1c21;
                    border: 1px solid #2d2d34;
                    color: #a1a1aa;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.12s ease;
                }

                .gt-sb-btn-close:hover {
                    background: #e11d48;
                    border-color: #f43f5e;
                    color: #ffffff;
                }

                /* =============================================================== */
                /* 2. MIDDLE STUDIO BODY: HIERARCHY | SCENE VIEW | INSPECTOR        */
                /* =============================================================== */
                .gt-sb-body {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    position: relative;
                }

                /* --- LEFT: HIERARCHY PANEL (DRAGGABLE & REORDERABLE) --- */
                .gt-sb-hierarchy {
                    width: 250px;
                    background: #141417;
                    border-right: 1px solid #27272a;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    z-index: 10;
                }

                .gt-sb-panel-header {
                    height: 32px;
                    background: #18181c;
                    border-bottom: 1px solid #27272a;
                    padding: 0 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    font-weight: 800;
                    color: #a1a1aa;
                    letter-spacing: 0.5px;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-sb-add-menu-wrap {
                    position: relative;
                }

                .gt-sb-btn-add-item {
                    background: #1e293b;
                    border: 1px solid #38bdf8;
                    color: #38bdf8;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 7px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    transition: all 0.12s ease;
                }

                .gt-sb-btn-add-item:hover {
                    background: #38bdf8;
                    color: #090d16;
                }

                .gt-sb-add-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 4px;
                    background: #18181c;
                    border: 1px solid #3f3f46;
                    border-radius: 6px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.7);
                    width: 190px;
                    max-height: 280px;
                    overflow-y: auto;
                    display: none;
                    flex-direction: column;
                    z-index: 99;
                    padding: 4px;
                }

                .gt-sb-add-dropdown.show {
                    display: flex;
                }

                .gt-sb-add-opt {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 8px;
                    border-radius: 4px;
                    font-size: 11.5px;
                    color: #d4d4d8;
                    cursor: pointer;
                    transition: background 0.1s;
                }

                .gt-sb-add-opt:hover {
                    background: #27272a;
                    color: #ffffff;
                }

                .gt-sb-hierarchy-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 4px 0;
                    display: flex;
                    flex-direction: column;
                    min-height: 100px;
                }

                .gt-sb-hierarchy-list::-webkit-scrollbar {
                    width: 4px;
                }
                .gt-sb-hierarchy-list::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 2px;
                }

                /* Hierarchy Tree Item (HTML5 Draggable) */
                .gt-sb-tree-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                    color: #d4d4d8;
                    cursor: grab;
                    transition: background 0.1s ease, border 0.1s ease;
                    border-left: 2px solid transparent;
                    border-top: 2px solid transparent;
                    border-bottom: 2px solid transparent;
                    position: relative;
                }

                .gt-sb-tree-item:active {
                    cursor: grabbing;
                }

                .gt-sb-tree-item:hover {
                    background: #1d1d23;
                    color: #ffffff;
                }

                .gt-sb-tree-item.active {
                    background: #1e293b;
                    border-left-color: #38bdf8;
                    color: #38bdf8;
                    font-weight: 700;
                }

                .gt-sb-tree-item.dragging {
                    opacity: 0.35;
                    background: #27272a;
                }

                .gt-sb-tree-item.drag-over-top {
                    border-top: 2px solid #38bdf8 !important;
                }

                .gt-sb-tree-item.drag-over-bottom {
                    border-bottom: 2px solid #38bdf8 !important;
                }

                .gt-sb-tree-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gt-sb-tree-handle {
                    color: #52525b;
                    font-size: 11px;
                    cursor: grab;
                    user-select: none;
                }

                .gt-sb-tree-right {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .gt-sb-tree-coord {
                    font-size: 9.5px;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    background: rgba(56, 189, 248, 0.1);
                    padding: 1px 4px;
                    border-radius: 3px;
                }

                .gt-sb-tree-del {
                    opacity: 0;
                    background: transparent;
                    border: none;
                    color: #f43f5e;
                    cursor: pointer;
                    font-size: 11px;
                    padding: 2px;
                    border-radius: 3px;
                    transition: opacity 0.15s, background 0.15s;
                }

                .gt-sb-tree-item:hover .gt-sb-tree-del {
                    opacity: 1;
                }

                .gt-sb-tree-del:hover {
                    background: rgba(244, 63, 94, 0.2);
                }

                .gt-sb-hierarchy-empty-hint {
                    padding: 16px 12px;
                    text-align: center;
                    font-size: 11px;
                    color: #71717a;
                    font-style: italic;
                }

                /* --- CENTER: SCENE VIEWPORT & MINIATURE GRID --- */
                .gt-sb-stage-viewport {
                    flex: 1;
                    position: relative;
                    background: #09090b;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: crosshair;
                }

                #gt-sb-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }

                /* Floating Quick Action Toolbar for Multi-Selection Area */
                .gt-sb-selection-toolbar {
                    position: absolute;
                    z-index: 35;
                    display: none;
                    align-items: center;
                    gap: 5px;
                    background: rgba(13, 14, 18, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(56, 189, 248, 0.45);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), 0 0 14px rgba(56, 189, 248, 0.25);
                    padding: 4px 8px;
                    border-radius: 8px;
                    pointer-events: auto;
                    transition: opacity 0.12s ease, transform 0.12s ease;
                }

                .gt-sb-sel-badge {
                    font-size: 10px;
                    font-weight: 800;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    padding: 2px 7px;
                    background: rgba(56, 189, 248, 0.12);
                    border-radius: 4px;
                    white-space: nowrap;
                    border: 1px solid rgba(56, 189, 248, 0.25);
                }

                .gt-sb-sel-btn {
                    padding: 3px 8px;
                    border-radius: 5px;
                    border: 1px solid #2d2d38;
                    background: #1e1e28;
                    color: #f1f5f9;
                    font-size: 10.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    transition: all 0.12s ease;
                    white-space: nowrap;
                    font-family: inherit;
                }

                .gt-sb-sel-btn:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #ffffff;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(56, 189, 248, 0.4);
                }

                .gt-sb-sel-btn.gt-sb-sel-del {
                    background: rgba(239, 68, 68, 0.22);
                    border-color: #dc2626;
                    color: #fca5a5;
                }

                .gt-sb-sel-btn.gt-sb-sel-del:hover {
                    background: #ef4444;
                    border-color: #f87171;
                    color: #ffffff;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
                }

                .gt-sb-sel-btn.gt-sb-sel-close {
                    padding: 3px 6px;
                    background: transparent;
                    border-color: transparent;
                    color: #94a3b8;
                    font-size: 11px;
                }

                .gt-sb-sel-btn.gt-sb-sel-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }

                /* Top Left Viewport Badge */
                .gt-sb-stage-badge-topleft {
                    position: absolute;
                    top: 10px;
                    left: 12px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    background: rgba(18, 18, 22, 0.85);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 4px 10px;
                    border-radius: 5px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    pointer-events: none;
                }

                .gt-sb-live-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 6px #22c55e;
                    animation: pulseLive 1.4s infinite;
                }

                @keyframes pulseLive {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }

                .gt-sb-stage-badge-title {
                    font-size: 10.5px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 0.4px;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* Top Right Grid Info Badge */
                .gt-sb-stage-badge-topright {
                    position: absolute;
                    top: 10px;
                    right: 12px;
                    background: rgba(18, 18, 22, 0.85);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 4px 10px;
                    border-radius: 5px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    pointer-events: none;
                }

                /* Bottom Scale Ruler Track */
                .gt-sb-stage-ruler {
                    position: absolute;
                    bottom: 8px;
                    left: 12px;
                    right: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(18, 18, 22, 0.85);
                    backdrop-filter: blur(6px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    padding: 3px 12px;
                    border-radius: 5px;
                    font-size: 9.5px;
                    font-family: 'JetBrains Mono', monospace;
                    color: #94a3b8;
                    pointer-events: none;
                }

                /* --- RIGHT: INSPECTOR PANEL --- */
                .gt-sb-inspector {
                    width: 260px;
                    background: #141417;
                    border-left: 1px solid #27272a;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    z-index: 10;
                }

                .gt-sb-inspector-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .gt-sb-inspector-card {
                    background: #1a1a1f;
                    border: 1px solid #27272e;
                    border-radius: 6px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-sb-card-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    border-bottom: 1px solid #27272a;
                    padding-bottom: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-sb-prop-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                }

                .gt-sb-prop-label {
                    color: #a1a1aa;
                    font-weight: 600;
                }

                .gt-sb-prop-val {
                    color: #f4f4f5;
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 700;
                }

                .gt-sb-prop-input {
                    width: 70px;
                    background: #111114;
                    border: 1px solid #2d2d34;
                    color: #38bdf8;
                    font-size: 11px;
                    font-family: 'JetBrains Mono', monospace;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-align: right;
                }

                .gt-sb-inspector-actions {
                    display: flex;
                    gap: 6px;
                    margin-top: 4px;
                }

                .gt-sb-btn-action {
                    flex: 1;
                    padding: 5px 8px;
                    border-radius: 4px;
                    font-size: 10.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: all 0.12s ease;
                }

                .gt-sb-btn-clone {
                    background: #1e293b;
                    border: 1px solid #38bdf8;
                    color: #38bdf8;
                }
                .gt-sb-btn-clone:hover {
                    background: #38bdf8;
                    color: #090d16;
                }

                .gt-sb-btn-delete {
                    background: #2b1216;
                    border: 1px solid #f43f5e;
                    color: #f43f5e;
                }
                .gt-sb-btn-delete:hover {
                    background: #f43f5e;
                    color: #ffffff;
                }

                /* =============================================================== */
                /* 3. DOCKED GROWTOPIA BACKPACK DRAWER (BOTTOM)                     */
                /* =============================================================== */
                /* =============================================================== */
                /* 3. DOCKED SLIM HOTBAR DRAWER (BOTTOM - MARIO MAKER STYLE)        */
                /* =============================================================== */
                .gt-sb-drawer {
                    height: 82px;
                    background: #0d0e12;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.55);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 6px 14px 7px 14px;
                    box-sizing: border-box;
                    flex-shrink: 0;
                    gap: 6px;
                    z-index: 10;
                }

                .gt-sb-drawer-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                    height: 22px;
                }

                .gt-sb-drawer-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-sb-drawer-badge {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 2px 7px;
                    border-radius: 4px;
                }

                .gt-sb-drawer-badge-title {
                    font-size: 9px;
                    font-weight: 800;
                    color: #94a3b8;
                    letter-spacing: 0.5px;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* Category Filter Tabs (Pills) */
                .gt-sb-category-bar {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gt-sb-cat-btn {
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: #18181f;
                    border: 1px solid #272732;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.12s ease;
                    font-family: inherit;
                    white-space: nowrap;
                    height: 22px;
                }

                .gt-sb-cat-btn:hover {
                    background: #23232c;
                    color: #f1f5f9;
                    border-color: #3f3f4e;
                }

                .gt-sb-cat-btn.active {
                    background: #0369a1;
                    color: #ffffff;
                    border-color: #38bdf8;
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.35);
                }

                .gt-sb-cat-count {
                    font-size: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    padding: 1px 3px;
                    border-radius: 3px;
                    background: rgba(0, 0, 0, 0.25);
                    color: inherit;
                }

                .gt-sb-drawer-right {
                    display: flex;
                    align-items: center;
                }

                .gt-sb-drawer-hint {
                    font-size: 9px;
                    font-weight: 700;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    background: rgba(56, 189, 248, 0.08);
                    border: 1px solid rgba(56, 189, 248, 0.2);
                    padding: 2px 7px;
                    border-radius: 4px;
                    white-space: nowrap;
                }

                /* Horizontal Hotbar Slots di Bawah (Left-Aligned Hotbar) */
                .gt-sb-palette-grid {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 7px;
                    overflow-x: auto;
                    overflow-y: hidden;
                    width: 100%;
                    padding: 1px 2px;
                    scrollbar-width: thin;
                }

                .gt-sb-palette-grid::-webkit-scrollbar {
                    height: 3px;
                }
                .gt-sb-palette-grid::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 2px;
                }

                /* Square Hotbar Asset Card (44x44px) */
                .gt-sb-chip {
                    width: 44px;
                    height: 44px;
                    min-width: 44px;
                    background: #181820;
                    border: 1px solid #2d2d38;
                    border-radius: 7px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    transition: all 0.14s cubic-bezier(0.4, 0, 0.2, 1);
                    box-sizing: border-box;
                    padding: 2px;
                    user-select: none;
                    flex-shrink: 0;
                }

                .gt-sb-chip:active {
                    cursor: grabbing;
                    transform: scale(0.95);
                }

                .gt-sb-chip:hover {
                    background: #23232f;
                    border-color: #38bdf8;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(56, 189, 248, 0.35);
                }

                .gt-sb-chip.stamp-active {
                    background: #0c2340;
                    border-color: #38bdf8;
                    box-shadow: 0 0 10px rgba(56, 189, 248, 0.55);
                    transform: translateY(-1px);
                }

                .gt-sb-chip-icon {
                    font-size: 19px;
                    line-height: 1;
                    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
                    pointer-events: none;
                }

                .gt-sb-chip-label {
                    font-size: 7.5px;
                    font-weight: 700;
                    color: #94a3b8;
                    white-space: nowrap;
                    max-width: 40px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-align: center;
                    margin-top: 2px;
                    font-family: 'JetBrains Mono', monospace;
                    pointer-events: none;
                }

                .gt-sb-chip:hover .gt-sb-chip-label {
                    color: #38bdf8;
                }
            </style>

            <!-- 1. Top Unity-Style Toolbar -->
            <div class="gt-sb-topbar">
                <div class="gt-sb-topbar-left">
                    <div class="gt-sb-unity-brand">
                        <span class="gt-sb-unity-logo">🛠️</span>
                        <span class="gt-sb-unity-title">Preview</span>
                    </div>

                    <!-- Mode Switcher: Scene View vs Flow Graph -->
                    <div class="gt-sb-mode-tabs" id="gt-sb-mode-tabs">
                        <button class="gt-sb-mode-tab active" id="gt-sb-tab-scene" title="Canvas Editor Dunia 2D">
                            <span>🗺️ Scene View</span>
                        </button>
                        <button class="gt-sb-mode-tab" id="gt-sb-tab-flow" title="Visual Flow Node Graph (Hubungkan Rute Antar-Scene)">
                            <span>⚡ Flow Graph</span>
                        </button>
                    </div>

                    <div class="gt-sb-topbar-divider"></div>

                    <!-- Undo & Redo Buttons -->
                    <button class="gt-sb-tool-btn disabled" id="gt-sb-btn-undo" title="Undo (Ctrl+Z)">
                        <span>↩ Undo</span>
                    </button>
                    <button class="gt-sb-tool-btn disabled" id="gt-sb-btn-redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
                        <span>↪ Redo</span>
                    </button>

                    <div class="gt-sb-topbar-divider"></div>

                    <button class="gt-sb-tool-toggle ${this.state.showGrid ? 'active' : ''}" id="gt-sb-btn-grid" title="Toggle Grid Persegi 50px">
                        <span>⊞ Grid: ON</span>
                    </button>
                    <button class="gt-sb-tool-toggle ${this.state.showGizmos ? 'active' : ''}" id="gt-sb-btn-gizmo" title="Toggle Transform Gizmo">
                        <span>◈ Gizmos</span>
                    </button>
                    <button class="gt-sb-tool-toggle" id="gt-sb-btn-testplay" title="Uji Gerak Karakter dengan WASD / Spasi (Shortcut: Tab)">
                        <span>🎮 Uji Gerak (WASD)</span>
                    </button>
                </div>

                <div class="gt-sb-topbar-right">
                    <button class="gt-sb-btn-play" id="gt-sb-btn-enter" title="Terapkan Pembaruan & Mainkan (Play)">▶</button>
                    <button class="gt-sb-btn-close" id="gt-sb-close-btn" title="Tutup Studio (ESC)">✕</button>
                </div>
            </div>

            <!-- 2. Middle Body: Hierarchy (Left) | Scene Viewport (Center) | Inspector (Right) -->
            <div class="gt-sb-body">
                <!-- Left: Hierarchy Tree (Drag and Drop Supported) -->
                <div class="gt-sb-hierarchy">
                    <div class="gt-sb-panel-header">
                        <span>▼ HIERARCHY</span>
                        <div class="gt-sb-add-menu-wrap">
                            <button class="gt-sb-btn-add-item" id="gt-sb-btn-add-item" title="Tambah Objek Baru">+ Tambah</button>
                            <div class="gt-sb-add-dropdown" id="gt-sb-add-dropdown">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>
                    <div class="gt-sb-hierarchy-list" id="gt-sb-hierarchy-list">
                        <!-- Rendered dynamically -->
                    </div>
                </div>

                <!-- Center: Scene Viewport & Miniature Grid -->
                <div class="gt-sb-stage-viewport" id="gt-sb-viewport">
                    <canvas id="gt-sb-canvas"></canvas>

                    <!-- Floating Quick Action Toolbar for Multi-Selection Area -->
                    <div class="gt-sb-selection-toolbar" id="gt-sb-selection-toolbar">
                        <div class="gt-sb-sel-badge" id="gt-sb-sel-badge">📦 0 Petak</div>
                        <button class="gt-sb-sel-btn gt-sb-sel-del" id="gt-sb-quick-del" title="Hapus Semua Blok di Area Seleksi (Del)">🗑️ Hapus</button>
                        <button class="gt-sb-sel-btn" id="gt-sb-quick-dirt" title="Isi Area dengan Blok Tanah">🟫 Tanah</button>
                        <button class="gt-sb-sel-btn" id="gt-sb-quick-platform" title="Isi Area dengan Pijakan">🧱 Pijakan</button>
                        <button class="gt-sb-sel-btn" id="gt-sb-quick-water" title="Isi Area dengan Air">🌊 Air</button>
                        <button class="gt-sb-sel-btn" id="gt-sb-quick-lava" title="Isi Area dengan Lava">🌋 Lava</button>
                        <button class="gt-sb-sel-btn gt-sb-sel-close" id="gt-sb-quick-close" title="Tutup Seleksi (Esc)">✕</button>
                    </div>

                    <!-- Bottom Scale Ruler Track -->
                    <div class="gt-sb-stage-ruler">
                        <div style="color: #38bdf8;"><span>🏁</span> <span id="ruler-spawn-txt">[Col 2: 125px] SPAWN</span></div>
                        <div style="color: #64748b;"><span>────── 50px TILE MATRIX (DRAG OBJEK BEBAS) ──────</span></div>
                        <div style="color: #a855f7;"><span>🌀</span> <span id="ruler-finish-txt">[Col 34: 1725px] FINISH</span></div>
                    </div>
                </div>

                <!-- Right: Inspector Panel -->
                <div class="gt-sb-inspector">
                    <div class="gt-sb-panel-header">
                        <span>ⓘ INSPECTOR</span>
                        <span id="gt-sb-inspector-type">Transform</span>
                    </div>
                    <div class="gt-sb-inspector-content" id="gt-sb-inspector-content">
                        <!-- Rendered dynamically based on selected object -->
                    </div>
                </div>
            </div>

            <!-- 3. Slim 2-Tier Hotbar Drawer (Categories on Top, Objects Centered Below) -->
            <div class="gt-sb-drawer">
                <!-- Baris Atas: Kategori & Hint Info -->
                <div class="gt-sb-drawer-top">
                    <div class="gt-sb-drawer-left">
                        <div class="gt-sb-drawer-badge">
                            <span>🎒</span>
                            <span class="gt-sb-drawer-badge-title">HOTBAR</span>
                        </div>

                        <!-- Category Filter Tabs -->
                        <div class="gt-sb-category-bar">
                            <button class="gt-sb-cat-btn active" data-cat="all" title="Semua Objek">
                                <span>Semua</span>
                                <span class="gt-sb-cat-count" id="count-all">12</span>
                            </button>
                            <button class="gt-sb-cat-btn" data-cat="solid" title="Objek Padat &amp; Pijakan">
                                <span>🧱 Padat</span>
                                <span class="gt-sb-cat-count" id="count-solid">5</span>
                            </button>
                            <button class="gt-sb-cat-btn" data-cat="creature" title="Makhluk &amp; Karakter">
                                <span>👥 Karakter</span>
                                <span class="gt-sb-cat-count" id="count-creature">4</span>
                            </button>
                            <button class="gt-sb-cat-btn" data-cat="fluid" title="Cairan Bahaya">
                                <span>🌊 Cairan</span>
                                <span class="gt-sb-cat-count" id="count-fluid">2</span>
                            </button>
                        </div>
                    </div>

                    <div class="gt-sb-drawer-right">
                        <span class="gt-sb-drawer-hint" title="Tarik kartu ke kanvas atau klik untuk mode stempel">💡 Drag / Klik Item ke Kanvas</span>
                    </div>
                </div>

                <!-- Baris Bawah: Deretan Kartu Objek (Tanah, Player, dll ditaruh di bawah) -->
                <div class="gt-sb-palette-grid" id="gt-sb-palette-grid">
                    <!-- Populated dynamically from ITEM_TEMPLATES -->
                </div>
            </div>

            <!-- 4. Visual Flow Graph Overlay View (When Mode Flow is Active) -->
            <div class="gt-sb-flow-wrapper" id="gt-sb-flow-wrapper" style="display: none; position: absolute; top: 48px; left: 0; right: 0; bottom: 0; z-index: 50;">
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.canvas = this.overlay.querySelector('#gt-sb-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.viewport = this.overlay.querySelector('#gt-sb-viewport');
        this.hierarchyList = this.overlay.querySelector('#gt-sb-hierarchy-list');
        this.inspectorContent = this.overlay.querySelector('#gt-sb-inspector-content');
        this.gridInfoEl = this.overlay.querySelector('#gt-sb-grid-info');
        this.paletteGrid = this.overlay.querySelector('#gt-sb-palette-grid');
        this.addDropdown = this.overlay.querySelector('#gt-sb-add-dropdown');
        this.selectionToolbar = this.overlay.querySelector('#gt-sb-selection-toolbar');
        this.selectionBadge = this.overlay.querySelector('#gt-sb-sel-badge');

        this.renderPalette();
        this.renderAddDropdown();
        this.renderHierarchy();
        this.renderInspector();
        this.bindEvents();
    }

    renderPalette() {
        if (!this.paletteGrid) return;
        let html = '';

        for (const [key, tmpl] of Object.entries(ITEM_TEMPLATES)) {
            const isStampActive = this.state.activeTool === key;
            const isDeployedUnique = tmpl.isUnique && this.state.entities.some(e => e.type === key);
            html += `
                <div class="gt-sb-chip ${isStampActive ? 'stamp-active' : ''} ${isDeployedUnique ? 'chip-unique-deployed' : ''}" 
                     draggable="${!isDeployedUnique}" 
                     data-type="${key}" 
                     data-cat="${tmpl.cat}"
                     title="${tmpl.label}: ${tmpl.desc}${isDeployedUnique ? ' (Objek Tunggal: Sudah Terpasang)' : ''}">
                    <span class="gt-sb-chip-icon">${tmpl.icon}</span>
                    <span class="gt-sb-chip-label">${tmpl.label}</span>
                    ${isDeployedUnique ? `<span style="font-size: 9px; color: #38bdf8; background: rgba(56,189,248,0.18); border: 1px solid rgba(56,189,248,0.3); padding: 1px 4px; border-radius: 4px; margin-left: 3px; font-weight: 600;">1/1</span>` : ''}
                </div>
            `;
        }

        this.paletteGrid.innerHTML = html;

        // Pasang event Dragstart pada setiap chip backpack
        this.paletteGrid.querySelectorAll('.gt-sb-chip').forEach(chip => {
            chip.addEventListener('dragstart', (e) => {
                const type = chip.getAttribute('data-type');
                const tmpl = ITEM_TEMPLATES[type];
                if (tmpl?.isUnique && this.state.entities.some(el => el.type === type)) {
                    e.preventDefault();
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `ℹ️ OBJEK TUNGGAL: "${tmpl.label}" sudah ada di scene (maksimal 1)!`;
                    }
                    return;
                }
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    source: 'backpack',
                    type: type
                }));
                e.dataTransfer.effectAllowed = 'copyMove';
            });

            // Klik untuk mengaktifkan Stamp Tool (mode cap langsung ke kanvas) atau auto-select objek tunggal
            chip.addEventListener('click', () => {
                AudioManager.playClick();
                const type = chip.getAttribute('data-type');
                const tmpl = ITEM_TEMPLATES[type];
                if (tmpl?.isUnique) {
                    const existing = this.state.entities.find(e => e.type === type);
                    if (existing) {
                        this.state.selectedId = existing.id;
                        this.state.activeTool = null;
                        this.renderHierarchy();
                        this.renderInspector();
                        this.renderPalette();
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `ℹ️ OBJEK TUNGGAL: "${existing.label}" sudah ada di [Col ${existing.col}, Row ${existing.row !== undefined ? existing.row : 7}]. Objek dipilih otomatis!`;
                        }
                        return;
                    }
                }
                if (this.state.activeTool === type) {
                    this.state.activeTool = null;
                } else {
                    this.state.activeTool = type;
                }
                this.renderPalette();
            });
        });
    }

    renderAddDropdown() {
        if (!this.addDropdown) return;
        let html = '';
        for (const [key, tmpl] of Object.entries(ITEM_TEMPLATES)) {
            const isDeployedUnique = tmpl.isUnique && this.state.entities.some(e => e.type === key);
            html += `
                <div class="gt-sb-add-opt ${isDeployedUnique ? 'opt-unique-deployed' : ''}" data-type="${key}">
                    <span>${tmpl.icon}</span>
                    <span>${tmpl.label}</span>
                    ${isDeployedUnique ? `<span style="font-size: 10px; color: #38bdf8; margin-left: auto; opacity: 0.85;">(1/1 Terpasang)</span>` : ''}
                </div>
            `;
        }
        this.addDropdown.innerHTML = html;

        this.addDropdown.querySelectorAll('.gt-sb-add-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                AudioManager.playClick();
                const type = opt.getAttribute('data-type');
                this.addNewEntity(type);
                this.addDropdown.classList.remove('show');
            });
        });
    }

    // ===============================================================
    // HIERARCHY TREE DENGAN FULL DRAG & DROP REORDERING
    // ===============================================================
    renderHierarchy() {
        if (!this.hierarchyList) return;
        const entities = this.state.entities;
        let html = '';

        if (entities.length === 0) {
            html = `<div class="gt-sb-hierarchy-empty-hint">Hierarchy kosong. Tarik objek dari Backpack atau klik "+ Tambah".</div>`;
        } else {
            entities.forEach((ent, idx) => {
                const isSelected = this.state.selectedId === ent.id;
                html += `
                    <div class="gt-sb-tree-item ${isSelected ? 'active' : ''}" 
                         draggable="true" 
                         data-id="${ent.id}" 
                         data-index="${idx}">
                        <div class="gt-sb-tree-left">
                            <span class="gt-sb-tree-handle" title="Tarik untuk mengubah urutan">⋮⋮</span>
                            <span>${ent.icon}</span>
                            <span>${ent.label}</span>
                        </div>
                        <div class="gt-sb-tree-right">
                            <span class="gt-sb-tree-coord">Col ${ent.col}</span>
                            ${ent.type !== 'player' ? `<button class="gt-sb-tree-del" data-del-id="${ent.id}" title="Hapus objek">✕</button>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        this.hierarchyList.innerHTML = html;

        // Update Ruler Texts
        const pEnt = entities.find(e => e.type === 'player');
        const fEnt = entities.find(e => e.type === 'portal');
        const rulerSpawn = this.overlay.querySelector('#ruler-spawn-txt');
        const rulerFinish = this.overlay.querySelector('#ruler-finish-txt');
        if (rulerSpawn && pEnt) rulerSpawn.textContent = `[Col ${pEnt.col}: ${pEnt.x}px] SPAWN`;
        if (rulerFinish && fEnt) rulerFinish.textContent = `[Col ${fEnt.col}: ${fEnt.x}px] FINISH`;

        // 1. Click to select object
        this.hierarchyList.querySelectorAll('.gt-sb-tree-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('gt-sb-tree-del')) return;
                AudioManager.playClick();
                this.state.selectedId = item.getAttribute('data-id');
                this.renderHierarchy();
                this.renderInspector();
            });

            // 2. Drag & Drop Reordering Handlers
            item.addEventListener('dragstart', (e) => {
                const id = item.getAttribute('data-id');
                const idx = parseInt(item.getAttribute('data-index'), 10);
                this.draggedHierarchyId = id;
                item.classList.add('dragging');

                e.dataTransfer.setData('text/plain', JSON.stringify({
                    source: 'hierarchy',
                    id: id,
                    index: idx
                }));
                e.dataTransfer.effectAllowed = 'copyMove';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedHierarchyId = null;
                this.hierarchyList.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const rect = item.getBoundingClientRect();
                const relY = e.clientY - rect.top;

                if (relY < rect.height / 2) {
                    item.classList.add('drag-over-top');
                    item.classList.remove('drag-over-bottom');
                } else {
                    item.classList.add('drag-over-bottom');
                    item.classList.remove('drag-over-top');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');

                let data;
                try {
                    data = JSON.parse(e.dataTransfer.getData('text/plain'));
                } catch (err) {
                    return;
                }

                const targetIdx = parseInt(item.getAttribute('data-index'), 10);
                const rect = item.getBoundingClientRect();
                const dropAtBottom = (e.clientY - rect.top) >= rect.height / 2;

                if (data.source === 'hierarchy') {
                    // Reorder existing entity
                    const sourceIdx = this.state.entities.findIndex(el => el.id === data.id);
                    if (sourceIdx !== -1 && sourceIdx !== targetIdx) {
                        this.pushUndoState('Ubah Urutan Hierarchy');
                        const [moved] = this.state.entities.splice(sourceIdx, 1);
                        let insertIdx = targetIdx;
                        if (sourceIdx < targetIdx && !dropAtBottom) {
                            insertIdx = targetIdx - 1;
                        } else if (sourceIdx > targetIdx && dropAtBottom) {
                            insertIdx = targetIdx + 1;
                        }
                        insertIdx = Math.max(0, Math.min(this.state.entities.length, insertIdx));
                        this.state.entities.splice(insertIdx, 0, moved);

                        AudioManager.playClick();
                        this.renderHierarchy();
                        this.renderInspector();
                    }
                } else if (data.source === 'backpack') {
                    // Create new entity and insert at hierarchy position
                    const insertIdx = dropAtBottom ? targetIdx + 1 : targetIdx;
                    this.addNewEntity(data.type, insertIdx);
                }
            });
        });

        // Delete buttons in hierarchy
        this.hierarchyList.querySelectorAll('.gt-sb-tree-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const delId = btn.getAttribute('data-del-id');
                this.deleteEntity(delId);
            });
        });

        // Drop in empty area of hierarchy list to append
        this.hierarchyList.addEventListener('dragover', (e) => {
            if (e.target === this.hierarchyList) {
                e.preventDefault();
            }
        });
        this.hierarchyList.addEventListener('drop', (e) => {
            if (e.target === this.hierarchyList) {
                e.preventDefault();
                let data;
                try {
                    data = JSON.parse(e.dataTransfer.getData('text/plain'));
                } catch (err) {
                    return;
                }
                if (data.source === 'backpack') {
                    this.addNewEntity(data.type);
                }
            }
        });
    }

    // ===============================================================
    // ANTI-NIMBUN / STRICT SINGLE-OCCUPANCY GRID LOCK
    // ===============================================================

    /**
     * Memeriksa apakah terdapat blok tanah (terrain) di petak [col, row].
     */
    hasTerrainAt(col, row) {
        if (this.state.dugTiles && this.state.dugTiles.has(`${col},${row}`)) {
            return false;
        }
        if (!this.state.terrainTiles) return row === 8;
        return this.state.terrainTiles.has(`${col},${row}`);
    }

    /**
     * Mengambil entitas yang menempati area grid [col..col+wTiles-1, row].
     * Mengembalikan objek entity jika ada, atau null jika kotak benar-benar kosong.
     */
    getOccupyingEntity(col, row, ignoreId = null, wTiles = 1) {
        const targetStartCol = col;
        const targetEndCol = col + Math.max(1, wTiles) - 1;

        // 1. Cek entitas dinamis (player, platform, water, lava, spikes, dll)
        const hitEntity = this.state.entities.find(e => {
            if (ignoreId && e.id === ignoreId) return false;

            const eRow = (e.row !== undefined) ? e.row : 7;
            if (eRow !== row) return false;

            const eStartCol = e.col;
            const eEndCol = e.col + (e.wTiles || 1) - 1;
            const hasColOverlap = Math.max(targetStartCol, eStartCol) <= Math.min(targetEndCol, eEndCol);

            return hasColOverlap;
        });

        if (hitEntity) return hitEntity;

        // 2. Cek apakah ada Blok Tanah (Terrain Tile) di petak ini
        if (ignoreId !== 'terrain') {
            for (let c = targetStartCol; c <= targetEndCol; c++) {
                if (this.hasTerrainAt(c, row)) {
                    return { id: `terrain_${c}_${row}`, label: 'Blok Tanah', type: 'dirt', col: c, row: row };
                }
            }
        }

        return null;
    }

    /**
     * Mengambil batas baris maksimum yang valid berdasarkan tinggi kanvas / dunia.
     */
    getMaxRow() {
        const height = this.state.worldHeight || 1000;
        return Math.max(19, Math.floor(height / 50) - 1);
    }

    /**
     * Mengambil batas kolom maksimum yang valid berdasarkan lebar dunia.
     */
    getMaxCol() {
        const width = this.state.worldWidth || 3600;
        return Math.max(71, Math.ceil(width / 50) - 1);
    }

    /**
     * Mengambil batas-batas area seleksi yang dinormalisasi (minCol, maxCol, minRow, maxRow, width, height).
     */
    getSelectionBounds() {
        if (!this.boxSelection) return null;
        const maxAllowedCol = this.getMaxCol();
        const maxAllowedRow = this.getMaxRow();
        const minCol = Math.max(0, Math.min(maxAllowedCol, Math.min(this.boxSelection.startCol, this.boxSelection.endCol)));
        const maxCol = Math.max(0, Math.min(maxAllowedCol, Math.max(this.boxSelection.startCol, this.boxSelection.endCol)));
        const minRow = Math.max(0, Math.min(maxAllowedRow, Math.min(this.boxSelection.startRow, this.boxSelection.endRow)));
        const maxRow = Math.max(0, Math.min(maxAllowedRow, Math.max(this.boxSelection.startRow, this.boxSelection.endRow)));
        return {
            minCol,
            maxCol,
            minRow,
            maxRow,
            width: maxCol - minCol + 1,
            height: maxRow - minRow + 1
        };
    }

    triggerSelectionFlash(x, y, w, h, color, strokeColor) {
        if (!this.selectionFlashes) this.selectionFlashes = [];
        this.selectionFlashes.push({
            x, y, w, h,
            color, strokeColor,
            startTime: performance.now(),
            duration: 350,
            maxAlpha: 0.38
        });
    }

    updateQuickToolbar() {
        if (!this.selectionToolbar || !this.boxSelection || !this.canvas) return;
        const bounds = this.getSelectionBounds();
        if (!bounds) {
            this.hideQuickToolbar();
            return;
        }

        const scale = this.canvas.width / (this.state.worldWidth || 1800);
        const bx = bounds.minCol * 50 * scale;
        const by = bounds.minRow * 50 * scale;
        const bw = bounds.width * 50 * scale;
        const bh = bounds.height * 50 * scale;

        if (this.selectionBadge) {
            this.selectionBadge.textContent = `📦 ${bounds.width}×${bounds.height} (${bounds.width * bounds.height} Petak)`;
        }

        this.selectionToolbar.style.display = 'flex';
        const tbWidth = this.selectionToolbar.offsetWidth || 340;
        const posX = Math.max(12, Math.min(this.canvas.width - tbWidth - 12, bx + (bw - tbWidth) / 2));
        const posY = (by > 44) ? (by - 40) : (by + bh + 10);

        this.selectionToolbar.style.left = `${posX}px`;
        this.selectionToolbar.style.top = `${posY}px`;
    }

    hideQuickToolbar() {
        if (this.selectionToolbar) {
            this.selectionToolbar.style.display = 'none';
        }
    }

    // ===============================================================
    // UNDO & REDO ENGINE (CTRL+Z & CTRL+Y)
    // ===============================================================

    captureSnapshot(actionName = '') {
        return {
            action: actionName,
            entities: JSON.parse(JSON.stringify(this.state.entities)),
            terrainTiles: this.state.terrainTiles ? Array.from(this.state.terrainTiles) : [],
            dugTiles: this.state.dugTiles ? Array.from(this.state.dugTiles) : [],
            selectedId: this.state.selectedId
        };
    }

    pushUndoState(actionName = '') {
        const snapshot = this.captureSnapshot(actionName);
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistorySteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length === 0) {
            AudioManager.playClick();
            if (this.gridInfoEl) this.gridInfoEl.textContent = 'ℹ️ Tidak ada aksi lagi untuk di-Undo (Stack Kosong).';
            return;
        }

        const currentSnapshot = this.captureSnapshot('Current State');
        this.redoStack.push(currentSnapshot);
        if (this.redoStack.length > this.maxHistorySteps) {
            this.redoStack.shift();
        }

        const previousSnapshot = this.undoStack.pop();
        this.state.entities = previousSnapshot.entities;
        this.state.terrainTiles = new Set(previousSnapshot.terrainTiles || []);
        this.state.dugTiles = new Set(previousSnapshot.dugTiles || []);
        this.state.selectedId = previousSnapshot.selectedId;

        this.boxSelection = null;
        this.hideQuickToolbar();
        this.renderHierarchy();
        this.renderInspector();
        this.renderPalette();
        this.updateUndoRedoButtons();

        AudioManager.playClick();
        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `↩️ UNDO: Berhasil dikembalikan ${previousSnapshot.action ? `("${previousSnapshot.action}")` : ''}`;
        }
    }

    redo() {
        if (this.redoStack.length === 0) {
            AudioManager.playClick();
            if (this.gridInfoEl) this.gridInfoEl.textContent = 'ℹ️ Tidak ada aksi lagi untuk di-Redo.';
            return;
        }

        const currentSnapshot = this.captureSnapshot('Current State');
        this.undoStack.push(currentSnapshot);
        if (this.undoStack.length > this.maxHistorySteps) {
            this.undoStack.shift();
        }

        const nextSnapshot = this.redoStack.pop();
        this.state.entities = nextSnapshot.entities;
        this.state.terrainTiles = new Set(nextSnapshot.terrainTiles || []);
        this.state.dugTiles = new Set(nextSnapshot.dugTiles || []);
        this.state.selectedId = nextSnapshot.selectedId;

        this.boxSelection = null;
        this.hideQuickToolbar();
        this.renderHierarchy();
        this.renderInspector();
        this.renderPalette();
        this.updateUndoRedoButtons();

        AudioManager.playClick();
        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `↪️ REDO: Berhasil dimajukan ${nextSnapshot.action ? `("${nextSnapshot.action}")` : ''}`;
        }
    }

    updateUndoRedoButtons() {
        if (!this.overlay) return;
        const undoBtn = this.overlay.querySelector('#gt-sb-btn-undo');
        const redoBtn = this.overlay.querySelector('#gt-sb-btn-redo');
        if (undoBtn) {
            if (this.undoStack.length > 0) {
                undoBtn.classList.remove('disabled');
                undoBtn.title = `Undo: ${this.undoStack[this.undoStack.length - 1].action || 'Aksi Sebelumnya'} (Ctrl+Z)`;
            } else {
                undoBtn.classList.add('disabled');
                undoBtn.title = 'Undo (Ctrl+Z) - Kosong';
            }
        }
        if (redoBtn) {
            if (this.redoStack.length > 0) {
                redoBtn.classList.remove('disabled');
                redoBtn.title = `Redo: ${this.redoStack[this.redoStack.length - 1].action || 'Aksi Sesudahnya'} (Ctrl+Y / Ctrl+Shift+Z)`;
            } else {
                redoBtn.classList.add('disabled');
                redoBtn.title = 'Redo (Ctrl+Y) - Kosong';
            }
        }
    }

    /**
     * Menghapus semua blok tanah dan objek di dalam area seleksi sekaligus (Batch Delete).
     */
    deleteSelectionArea() {
        const bounds = this.getSelectionBounds();
        if (!bounds) return;

        this.pushUndoState('Hapus Area Seleksi');

        // Visual flash ripple effect on canvas
        if (this.canvas) {
            const scale = this.canvas.width / (this.state.worldWidth || 1800);
            this.triggerSelectionFlash(
                bounds.minCol * 50 * scale,
                bounds.minRow * 50 * scale,
                bounds.width * 50 * scale,
                bounds.height * 50 * scale,
                'rgba(239, 68, 68, ALPHA)',
                'rgba(248, 113, 113, ALPHA)'
            );
        }

        let deletedEntities = 0;
        let deletedTerrain = 0;

        // 1. Hapus entitas di area seleksi (kecuali player spawn)
        this.state.entities = this.state.entities.filter(ent => {
            if (ent.type === 'player') return true;
            const eRow = (ent.row !== undefined) ? ent.row : 7;
            const inArea = (ent.col >= bounds.minCol && ent.col <= bounds.maxCol && eRow >= bounds.minRow && eRow <= bounds.maxRow);
            if (inArea) deletedEntities++;
            return !inArea;
        });

        // 2. Hapus tanah / terrain tiles di area seleksi
        if (this.state.terrainTiles) {
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
                    if (this.state.terrainTiles.delete(`${c},${r}`)) {
                        deletedTerrain++;
                    }
                    if (r >= 8) {
                        if (!this.state.dugTiles) this.state.dugTiles = new Set();
                        this.state.dugTiles.add(`${c},${r}`);
                    }
                }
            }
        }

        AudioManager.playClick();
        const infoMsg = `🗑️ AREA BERSIH: ${deletedTerrain} blok tanah & ${deletedEntities} objek dihapus di [Col ${bounds.minCol}..${bounds.maxCol}, Row ${bounds.minRow}..${bounds.maxRow}]`;
        this.boxSelection = null;
        this.hideQuickToolbar();
        this.renderHierarchy();
        this.renderInspector();

        if (this.gridInfoEl) this.gridInfoEl.textContent = infoMsg;
    }

    /**
     * Mengisi semua petak di area seleksi dengan jenis blok tertentu (Batch Fill).
     */
    fillSelectionArea(type) {
        const bounds = this.getSelectionBounds();
        if (!bounds) return;

        this.pushUndoState(`Isi ${type.toUpperCase()}`);

        // Visual flash ripple effect on canvas
        if (this.canvas) {
            const scale = this.canvas.width / (this.state.worldWidth || 1800);
            const colorMap = {
                dirt: ['rgba(180, 83, 9, ALPHA)', 'rgba(251, 191, 36, ALPHA)'],
                platforms: ['rgba(56, 189, 248, ALPHA)', 'rgba(125, 211, 252, ALPHA)'],
                water: ['rgba(2, 132, 199, ALPHA)', 'rgba(56, 189, 248, ALPHA)'],
                lava: ['rgba(239, 68, 68, ALPHA)', 'rgba(249, 115, 22, ALPHA)']
            };
            const [c, s] = colorMap[type] || ['rgba(56, 189, 248, ALPHA)', 'rgba(125, 211, 252, ALPHA)'];
            this.triggerSelectionFlash(
                bounds.minCol * 50 * scale,
                bounds.minRow * 50 * scale,
                bounds.width * 50 * scale,
                bounds.height * 50 * scale,
                c, s
            );
        }

        if (type === 'dirt') {
            if (!this.state.terrainTiles) this.state.terrainTiles = new Set();
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
                    this.state.entities = this.state.entities.filter(e => !(e.col === c && (e.row || 7) === r && e.type !== 'player'));
                    this.state.terrainTiles.add(`${c},${r}`);
                    if (this.state.dugTiles) this.state.dugTiles.delete(`${c},${r}`);
                }
            }
        } else if (type === 'platforms' || type === 'water' || type === 'lava' || type === 'coins') {
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
                    this.state.terrainTiles.delete(`${c},${r}`);
                    this.state.entities = this.state.entities.filter(e => !(e.col === c && (e.row || 7) === r && e.type !== 'player'));
                    const newId = `${type}_${Date.now()}_${c}_${r}`;
                    const tmpl = ITEM_TEMPLATES[type];
                    this.state.entities.push({
                        id: newId,
                        type: type,
                        col: c,
                        row: r,
                        x: c * 50 + 25,
                        y: (r === 7) ? 400 : (r * 50 + 25),
                        label: `${tmpl ? tmpl.label : type} [${c},${r}]`,
                        cat: tmpl ? tmpl.cat : 'solid',
                        icon: tmpl ? tmpl.icon : '🧱',
                        wTiles: 1,
                        hTiles: 1
                    });
                }
            }
        }

        AudioManager.playClick();
        const total = bounds.width * bounds.height;
        this.boxSelection = null;
        this.hideQuickToolbar();
        this.renderHierarchy();
        this.renderInspector();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `✨ AREA TERISI: ${total} petak berhasil diisi dengan ${type.toUpperCase()}!`;
        }
    }

    /**
     * Memeriksa apakah suatu area grid [col..col+wTiles-1, row] sudah ditempati objek lain.
     */
    isSlotOccupied(col, row, ignoreId = null, wTiles = 1) {
        return !!this.getOccupyingEntity(col, row, ignoreId, wTiles);
    }

    /**
     * Mencari petak kosong terdekat (bebas dari objek lain) agar objek tidak pernah bertumpuk.
     */
    findFreeSlot(preferredCol, preferredRow, wTiles = 1, ignoreId = null) {
        const safeW = Math.max(1, wTiles);
        const maxC = this.getMaxCol();
        const maxR = this.getMaxRow();
        let col = Math.max(0, Math.min(maxC + 1 - safeW, preferredCol));
        let row = Math.max(0, Math.min(maxR, preferredRow));

        // Jika slot yang diinginkan sudah kosong, pakai langsung
        if (!this.isSlotOccupied(col, row, ignoreId, safeW)) {
            return { col, row };
        }

        // 1. Cari ke kanan pada baris yang sama
        for (let c = col + 1; c <= maxC + 1 - safeW; c++) {
            if (!this.isSlotOccupied(c, row, ignoreId, safeW)) {
                return { col: c, row };
            }
        }

        // 2. Cari ke kiri pada baris yang sama
        for (let c = col - 1; c >= 0; c--) {
            if (!this.isSlotOccupied(c, row, ignoreId, safeW)) {
                return { col: c, row };
            }
        }

        // 3. Jika satu baris penuh, cari baris terdekat (atas/bawah)
        for (let offset = 1; offset <= 10; offset++) {
            for (const r of [row - offset, row + offset]) {
                if (r >= 0 && r <= maxR) {
                    if (!this.isSlotOccupied(col, r, ignoreId, safeW)) {
                        return { col, row: r };
                    }
                    for (let c = col + 1; c <= maxC + 1 - safeW; c++) {
                        if (!this.isSlotOccupied(c, r, ignoreId, safeW)) {
                            return { col: c, row: r };
                        }
                    }
                    for (let c = col - 1; c >= 0; c--) {
                        if (!this.isSlotOccupied(c, r, ignoreId, safeW)) {
                            return { col: c, row: r };
                        }
                    }
                }
            }
        }

        return { col, row };
    }

    /**
     * Memastikan seluruh objek yang ada tidak ada yang bertumpukan pada posisi yang sama persis.
     */
    preventAllOverlaps() {
        const seen = new Set();
        this.state.entities.forEach(ent => {
            const r = (ent.row !== undefined) ? ent.row : 7;
            const w = ent.wTiles || 1;
            const key = `${ent.col},${r}`;
            if (seen.has(key)) {
                const safe = this.findFreeSlot(ent.col + 1, r, w, ent.id);
                ent.col = safe.col;
                ent.row = safe.row;
                ent.x = safe.col * 50 + 25;
                ent.y = (safe.row === 7) ? 400 : (safe.row * 50 + 25);
            }
            for (let c = ent.col; c < ent.col + w; c++) {
                seen.add(`${c},${ent.row}`);
            }
        });
    }

    addNewEntity(type, insertIndex = -1, customCol = null, customRow = null) {
        const tmpl = ITEM_TEMPLATES[type];
        if (!tmpl) return;

        // PROTEKSI OBJEK TUNGGAL (SINGLETON): Player & Portal hanya boleh 1 di scene
        if (tmpl.isUnique) {
            const existing = this.state.entities.find(e => e.type === type);
            if (existing) {
                AudioManager.playClick();
                this.state.selectedId = existing.id;
                this.state.activeTool = null;
                this.renderHierarchy();
                this.renderInspector();
                this.renderPalette();
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `ℹ️ OBJEK TUNGGAL: "${existing.label}" sudah ada di [Col ${existing.col}, Row ${existing.row !== undefined ? existing.row : 7}]. Objek dipilih otomatis!`;
                }
                return;
            }
        }

        const wTiles = tmpl.wTiles || 1;

        // JIKA MENEMPATKAN DI KOTAK SPESIFIK (Stamp tool / Backpack drop / Klik):
        if (customCol !== null && customRow !== null) {
            const occupied = this.getOccupyingEntity(customCol, customRow, null, wTiles);
            if (occupied) {
                AudioManager.playClick();
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `⛔ KOTAK SUDAH TERISI: [Col ${customCol}, Row ${customRow}] sudah ditempati "${occupied.label}". Hapus objek itu terlebih dahulu jika ingin menempatkan objek baru!`;
                }
                return;
            }
        }

        // JIKA MENAMBAHKAN BLOK TANAH (DIRT):
        if (type === 'dirt') {
            const targetCol = customCol !== null ? customCol : 10;
            const targetRow = customRow !== null ? customRow : 8;
            this.pushUndoState('Tambah Blok Tanah');
            this.state.terrainTiles.add(`${targetCol},${targetRow}`);
            if (this.state.dugTiles) this.state.dugTiles.delete(`${targetCol},${targetRow}`);
            AudioManager.playClick();
            this.renderHierarchy();
            this.renderInspector();
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = `🟫 BLOK TANAH DITAMBAHKAN di [Col ${targetCol}, Row ${targetRow}]`;
            }
            return;
        }

        this.pushUndoState(`Tambah ${tmpl.label}`);

        const count = this.state.entities.filter(e => e.type === type).length;
        const newId = `${type}_${Date.now()}`;

        // Tentukan posisi awal [col, row]
        let prefCol = customCol !== null ? customCol : Math.min(33, 4 + count * 3);
        let prefRow = customRow !== null ? customRow : tmpl.defaultRow;

        // Cari slot kosong
        const safeSlot = (customCol !== null && customRow !== null) 
            ? { col: customCol, row: customRow } 
            : this.findFreeSlot(prefCol, prefRow, wTiles, null);

        const newEnt = {
            id: newId,
            type: type,
            col: safeSlot.col,
            row: safeSlot.row,
            x: safeSlot.col * 50 + 25,
            y: (safeSlot.row === 7) ? 400 : (safeSlot.row * 50 + 25),
            label: `${tmpl.label} #${count + 1}`,
            cat: tmpl.cat,
            icon: tmpl.icon,
            wTiles: tmpl.wTiles,
            hTiles: tmpl.hTiles
        };

        if (insertIndex >= 0 && insertIndex <= this.state.entities.length) {
            this.state.entities.splice(insertIndex, 0, newEnt);
        } else {
            this.state.entities.push(newEnt);
        }

        this.state.selectedId = newId;
        AudioManager.playClick();
        this.renderHierarchy();
        this.renderInspector();
        this.renderPalette();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `✨ OBJEK DITAMBAHKAN: ${newEnt.label} di [Col ${safeSlot.col}, Row ${safeSlot.row}] (Kotak Bersih)`;
        }
    }

    nudgeSelectedEntity(dCol, dRow) {
        let ent = this.state.entities.find(el => el.id === this.state.selectedId);
        if (!ent) {
            ent = this.state.entities.find(el => el.type === 'player') || this.state.entities[0];
            if (ent) {
                this.state.selectedId = ent.id;
            }
        }
        if (!ent) return;

        const maxC = this.getMaxCol();
        const maxR = this.getMaxRow();
        const wTiles = ent.wTiles || 1;
        const curRow = (ent.row !== undefined) ? ent.row : 7;
        const targetCol = Math.max(0, Math.min(maxC - wTiles + 1, ent.col + dCol));
        const targetRow = Math.max(0, Math.min(maxR, curRow + dRow));

        if (targetCol === ent.col && targetRow === curRow) return;

        // Cek tabrakan jika ada objek lain di petak tujuan
        const occ = this.getOccupyingEntity(targetCol, targetRow, ent.id, wTiles);
        if (occ) {
            AudioManager.playClick();
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = `⛔ GAGAL GESER: Kotak [Col ${targetCol}, Row ${targetRow}] sudah diisi oleh "${occ.label}".`;
            }
            return;
        }

        this.pushUndoState(`Geser ${ent.label} (WASD)`);

        ent.col = targetCol;
        ent.row = targetRow;
        ent.x = targetCol * 50 + 25;
        ent.y = (targetRow === 7) ? 400 : (targetRow * 50 + 25);

        AudioManager.playClick();
        this.renderHierarchy();
        this.renderInspector();
        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `🎮 [Col ${ent.col}, Row ${ent.row}] ${ent.label} digeser (WASD / Panah)`;
        }
    }

    initTestPlayer(startX = null, startY = null) {
        const playerEnt = this.state.entities.find(e => e.type === 'player');
        const defaultSpawnX = playerEnt ? (playerEnt.x !== undefined ? playerEnt.x : playerEnt.col * 50 + 25) : 125;
        const defaultSpawnY = (playerEnt && playerEnt.row !== undefined && playerEnt.row !== 7) ? (playerEnt.row + 1) * 50 : 400;

        const posX = (startX !== null && startX !== undefined) ? startX : defaultSpawnX;
        const posY = (startY !== null && startY !== undefined) ? startY : defaultSpawnY;

        this.testPlayer = {
            x: posX,
            y: posY,
            vx: 0,
            vy: 0,
            facing: 1,
            isGrounded: true,
            walkTime: 0
        };
        this.testKeys = { w: false, a: false, s: false, d: false, space: false };
    }

    toggleTestPlayMode(forceState = null) {
        this.isTestPlayMode = (forceState !== null) ? forceState : !this.isTestPlayMode;
        AudioManager.playClick();
        const btn = this.overlay ? this.overlay.querySelector('#gt-sb-btn-testplay') : null;
        if (btn) {
            if (this.isTestPlayMode) {
                btn.classList.add('active');
                btn.innerHTML = '<span>🎮 Uji Gerak: ON</span>';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<span>🎮 Uji Gerak (WASD)</span>';
            }
        }

        if (this.isTestPlayMode) {
            const startX = this.runtimePlayerX !== null && this.runtimePlayerX !== undefined ? this.runtimePlayerX : null;
            const startY = this.runtimePlayerY !== null && this.runtimePlayerY !== undefined ? this.runtimePlayerY : null;
            this.initTestPlayer(startX, startY);
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = '🎮 MODE UJI GERAK AKTIF: Gunakan [W, A, S, D] atau Spasi untuk berjalan mulus & lompat | Tekan Tab/Esc untuk selesai';
            }
        } else {
            this.testPlayer = null;
            this.testKeys = { w: false, a: false, s: false, d: false, space: false };
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = 'GRID: 50px PERSEGI | MODE EDIT AKTIF (Gunakan Tombol Panah ← ↑ → ↓ untuk menggeser objek)';
            }
        }
    }

    deleteEntity(id) {
        if (!id) return;
        const ent = this.state.entities.find(e => e.id === id);
        if (!ent) return;

        if (ent.type === 'player') {
            alert('Player Spawn tidak dapat dihapus karena dibutuhkan untuk memulai game!');
            return;
        }

        this.pushUndoState(`Hapus ${ent.label}`);

        AudioManager.playClick();
        this.state.entities = this.state.entities.filter(e => e.id !== id);

        if (this.state.selectedId === id) {
            this.state.selectedId = this.state.entities.length > 0 ? this.state.entities[0].id : null;
        }

        this.renderHierarchy();
        this.renderInspector();
        this.renderPalette();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `🗑️ OBJEK DIHAPUS: Petak [Col ${ent.col}, Row ${ent.row}] sekarang KOSONG dan siap diisi objek baru.`;
        }
    }

    duplicateEntity(id) {
        if (!id) return;
        const ent = this.state.entities.find(e => e.id === id);
        if (!ent) return;

        // PROTEKSI OBJEK TUNGGAL (Player / Portal)
        const tmpl = ITEM_TEMPLATES[ent.type];
        if (tmpl?.isUnique) {
            AudioManager.playClick();
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = `⛔ OBJEK TUNGGAL: "${ent.label}" hanya boleh ada 1 di dalam scene dan tidak dapat diduplikasi!`;
            }
            return;
        }

        this.pushUndoState(`Duplikasi ${ent.label}`);

        this.clipboardEntity = JSON.parse(JSON.stringify(ent));

        const newId = `${ent.type}_${Date.now()}`;
        const wTiles = ent.wTiles || 1;

        // Cari slot kosong terdekat di samping objek asli (anti-nimbun)
        const safeSlot = this.findFreeSlot(ent.col + wTiles, ent.row, wTiles, null);

        const count = this.state.entities.filter(e => e.type === ent.type).length;
        const clone = {
            ...ent,
            id: newId,
            col: safeSlot.col,
            row: safeSlot.row,
            x: safeSlot.col * 50 + 25,
            y: (safeSlot.row === 7) ? 400 : (safeSlot.row * 50 + 25),
            label: `${ent.label.replace(/\s*\(Copy.*?\)/g, '')} (Copy #${count + 1})`
        };

        const idx = this.state.entities.findIndex(e => e.id === id);
        this.state.entities.splice(idx + 1, 0, clone);
        this.state.selectedId = newId;

        AudioManager.playClick();
        this.renderHierarchy();
        this.renderInspector();
        this.renderPalette();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `📋 DIDUPLIKASI: ${clone.label} di [Col ${safeSlot.col}, Row ${safeSlot.row}] (Bebas Tumpukan)`;
        }
    }

    copySelectedEntity() {
        if (!this.state.selectedId) return;
        const ent = this.state.entities.find(el => el.id === this.state.selectedId);
        if (!ent) return;

        const tmpl = ITEM_TEMPLATES[ent.type];
        if (tmpl?.isUnique) {
            AudioManager.playClick();
            if (this.gridInfoEl) {
                this.gridInfoEl.textContent = `⛔ OBJEK TUNGGAL: "${ent.label}" tidak dapat disalin karena hanya boleh ada 1 di dalam scene!`;
            }
            return;
        }

        this.clipboardEntity = JSON.parse(JSON.stringify(ent));
        AudioManager.playClick();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `📋 DISALIN: ${ent.label} (Arahkan kursor ke petak KOSONG & tekan Ctrl+V)`;
        }
    }

    pasteEntity() {
        if (!this.clipboardEntity) return;

        const tmpl = ITEM_TEMPLATES[this.clipboardEntity.type];
        if (tmpl?.isUnique) {
            const exists = this.state.entities.some(e => e.type === this.clipboardEntity.type);
            if (exists) {
                AudioManager.playClick();
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `⛔ OBJEK TUNGGAL: "${tmpl.label}" sudah terpasang di scene dan tidak dapat dipaste lagi!`;
                }
                return;
            }
        }

        const wTiles = this.clipboardEntity.wTiles || 1;
        const count = this.state.entities.filter(e => e.type === this.clipboardEntity.type).length;
        const newId = `${this.clipboardEntity.type}_${Date.now()}`;

        let targetCol, targetRow;
        if (this.hoverTile) {
            targetCol = this.hoverTile.col;
            targetRow = (this.clipboardEntity.cat === 'fluid' || this.clipboardEntity.type === 'platforms' || this.clipboardEntity.type === 'coins') 
                ? this.hoverTile.row 
                : this.clipboardEntity.row;

            // JIKA PETAK YANG DIARAHKAN MOUSE SUDAH TERISI: TOLAK KERAS!
            const occupied = this.getOccupyingEntity(targetCol, targetRow, null, wTiles);
            if (occupied) {
                AudioManager.playClick();
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `⛔ TIDAK BISA PASTE: Petak [Col ${targetCol}, Row ${targetRow}] sudah diisi oleh "${occupied.label}". Kotak harus kosong terlebih dahulu!`;
                }
                return;
            }
        } else {
            // Jika kursor di luar canvas, tempatkan di petak kosong terdekat di samping
            const prefCol = this.clipboardEntity.col + wTiles;
            const prefRow = this.clipboardEntity.row;
            const safeSlot = this.findFreeSlot(prefCol, prefRow, wTiles, null);
            targetCol = safeSlot.col;
            targetRow = safeSlot.row;
        }

        const clone = {
            ...this.clipboardEntity,
            id: newId,
            col: targetCol,
            row: targetRow,
            x: targetCol * 50 + 25,
            y: (targetRow === 7) ? 400 : (targetRow * 50 + 25),
            label: `${this.clipboardEntity.label.replace(/\s*\(Copy.*?\)/g, '')} (Copy #${count + 1})`
        };

        this.clipboardEntity.col = targetCol;
        this.clipboardEntity.row = targetRow;

        this.pushUndoState(`Tempel ${clone.label}`);
        this.state.entities.push(clone);
        this.state.selectedId = newId;

        AudioManager.playClick();
        this.renderHierarchy();
        this.renderInspector();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `✅ DITEMPEL: ${clone.label} di [Col ${targetCol}, Row ${targetRow}] (Petak Bersih)`;
        }
    }

    // ===============================================================
    // INSPECTOR PANEL
    // ===============================================================
    renderInspector() {
        if (!this.inspectorContent) return;

        // MULTI-SELEKSI AREA PANEL
        if (this.boxSelection) {
            const bounds = this.getSelectionBounds();
            const totalTiles = bounds.width * bounds.height;
            this.inspectorContent.innerHTML = `
                <div class="gt-sb-inspector-card">
                    <div class="gt-sb-card-title">📦 MULTI-SELEKSI AREA</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 12px; line-height: 1.5;">
                        Rentang: <b>Col ${bounds.minCol}..${bounds.maxCol}</b>, <b>Row ${bounds.minRow}..${bounds.maxRow}</b><br/>
                        Total: <span style="color:#38bdf8; font-weight:bold;">${bounds.width} x ${bounds.height} = ${totalTiles} Petak</span>
                    </div>

                    <div style="font-size: 11px; color: #94a3b8; line-height: 1.4; margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 6px; border-left: 3px solid #38bdf8;">
                        💡 <b>Toolbar Mengapung Aktif:</b> Pilih aksi isi (Tanah, Pijakan, Air, Lava) atau hapus langsung lewat menu di atas kotak seleksi kanvas.
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="gt-sb-btn-action gt-sb-btn-delete" id="gt-sb-act-batch-delete" style="width: 100%; justify-content: center; padding: 10px; font-weight: bold;">
                            <span>🗑️ Hapus Semua di Area (Del)</span>
                        </button>
                        <button class="gt-sb-btn-action" id="gt-sb-act-batch-cancel" style="width: 100%; justify-content: center; padding: 7px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: #94a3b8; font-size: 11px;">
                            <span>❌ Batal Seleksi (Esc)</span>
                        </button>
                    </div>
                </div>
            `;

            this.inspectorContent.querySelector('#gt-sb-act-batch-delete')?.addEventListener('click', () => this.deleteSelectionArea());
            this.inspectorContent.querySelector('#gt-sb-act-batch-cancel')?.addEventListener('click', () => {
                this.boxSelection = null;
                this.hideQuickToolbar();
                this.renderInspector();
            });
            return;
        }

        const selId = this.state.selectedId;
        const obj = this.state.entities.find(e => e.id === selId);

        if (!obj) {
            // Scene Settings
            this.inspectorContent.innerHTML = `
                <div class="gt-sb-inspector-card">
                    <div class="gt-sb-card-title">🌐 WORLD SETTINGS</div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">World Bounds</span>
                        <span class="gt-sb-prop-val">1800 x ${this.state.worldHeight || 700} px</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Grid Cell Type</span>
                        <span class="gt-sb-prop-val" style="color: #22c55e;">Square (50x50 px)</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Ground Surface</span>
                        <span class="gt-sb-prop-val" style="color: #f59e0b;">Row 8 (y: 400 px)</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Bottom Layer</span>
                        <span class="gt-sb-prop-val" style="color: #94a3b8;">⬛ BEDROCK (Indestructible)</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Snap Mode</span>
                        <span class="gt-sb-prop-val" style="color: #38bdf8;">Cell-Center (+25px)</span>
                    </div>
                </div>
            `;
            return;
        }

        this.inspectorContent.innerHTML = `
            <div class="gt-sb-inspector-card">
                <div class="gt-sb-card-title">
                    <span>${obj.icon} ${obj.label}</span>
                    <span style="font-size: 9px; color: #38bdf8;">${obj.type}</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Label Nama</span>
                    <input type="text" class="gt-sb-input-name" id="gt-sb-inp-label" value="${obj.label}" style="width: 120px; font-size: 11px; padding: 2px 4px; border: 1px solid #27272e; border-radius: 4px; background: #111114;" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Kategori</span>
                    <span class="gt-sb-prop-val" style="color: #a855f7;">${obj.cat.toUpperCase()}</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Kolom Grid (0..35)</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-col" value="${obj.col}" min="0" max="35" step="1" title="Geser Kolom Grid (0..35)" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Baris Grid (0..14)</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-row" value="${obj.row}" min="0" max="14" step="1" title="Geser Baris Grid (0..14)" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">World Pos (X, Y)</span>
                    <span class="gt-sb-prop-val">(${obj.x}, ${obj.y})</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Dimensi Tile</span>
                    <span class="gt-sb-prop-val" style="color: #38bdf8;">${obj.wTiles || 1} x ${obj.hTiles || 1} Tile (Unit 1x1)</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Panjang Blok (Width)</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-wtiles" value="${obj.wTiles || 1}" min="1" max="10" step="1" title="Perlebar blok tile (1..10)" />
                </div>
                <div style="font-size: 9.5px; color: #4ade80; background: rgba(34, 197, 94, 0.1); padding: 5px 8px; border-radius: 4px; border: 1px dashed rgba(34, 197, 94, 0.3); margin-top: 4px; line-height: 1.35;">
                    🔗 <b>Auto-Merge:</b> Blok 1x1 (Air, Lava, Pijakan) otomatis menyatu mulus saat diletakkan berdampingan!
                </div>
            </div>

            <div class="gt-sb-inspector-card">
                <div class="gt-sb-card-title">⚡ AKSI OBJEK</div>
                <div class="gt-sb-inspector-actions">
                    ${!ITEM_TEMPLATES[obj.type]?.isUnique ? `
                    <button class="gt-sb-btn-action gt-sb-btn-clone" id="gt-sb-act-clone" title="Duplikasi Objek (Ctrl+D)">
                        <span>📋 Duplikasi</span>
                    </button>` : `
                    <div style="font-size: 11px; color: #38bdf8; padding: 6px 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; width: 100%; text-align: center; font-weight: 500;">
                        🔒 Objek Tunggal (Maks 1 di Scene)
                    </div>`}
                    ${obj.type !== 'player' ? `
                    <button class="gt-sb-btn-action gt-sb-btn-delete" id="gt-sb-act-delete" title="Hapus Objek (Delete / Backspace)">
                        <span>🗑️ Hapus</span>
                    </button>` : ''}
                </div>
            </div>
        `;

        // Event listeners pada inspector
        const inpWTiles = this.inspectorContent.querySelector('#gt-sb-inp-wtiles');
        if (inpWTiles) {
            inpWTiles.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 36 && val !== obj.wTiles) {
                    this.pushUndoState(`Ubah lebar ${obj.label}`);
                    obj.wTiles = val;
                    this.renderHierarchy();
                }
            });
        }

        const inpCol = this.inspectorContent.querySelector('#gt-sb-inp-col');
        if (inpCol) {
            let lastValidCol = obj.col;
            inpCol.addEventListener('change', () => {
                const val = parseInt(inpCol.value, 10);
                if (isNaN(val) || val < 0 || val > 35) {
                    inpCol.value = lastValidCol;
                    return;
                }
                const existing = this.getOccupyingEntity(val, obj.row, obj.id, obj.wTiles || 1);
                if (existing) {
                    inpCol.value = lastValidCol;
                    AudioManager.playClick();
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `⛔ GAGAL: Petak [Col ${val}, Row ${obj.row}] sudah diisi "${existing.label}". Hapus objek itu terlebih dahulu!`;
                    }
                } else {
                    this.pushUndoState(`Ubah kolom ${obj.label}`);
                    obj.col = val;
                    obj.x = val * 50 + 25;
                    lastValidCol = val;
                    this.renderHierarchy();
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `✅ Posisi ${obj.label} diubah ke [Col ${val}, Row ${obj.row}]`;
                    }
                }
            });
        }

        const inpRow = this.inspectorContent.querySelector('#gt-sb-inp-row');
        if (inpRow) {
            let lastValidRow = obj.row;
            inpRow.addEventListener('change', () => {
                const val = parseInt(inpRow.value, 10);
                if (isNaN(val) || val < 0 || val > 14) {
                    inpRow.value = lastValidRow;
                    return;
                }
                const existing = this.getOccupyingEntity(obj.col, val, obj.id, obj.wTiles || 1);
                if (existing) {
                    inpRow.value = lastValidRow;
                    AudioManager.playClick();
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `⛔ GAGAL: Petak [Col ${obj.col}, Row ${val}] sudah diisi "${existing.label}". Hapus objek itu terlebih dahulu!`;
                    }
                } else {
                    this.pushUndoState(`Ubah baris ${obj.label}`);
                    obj.row = val;
                    obj.y = (val === 7) ? 400 : (val * 50 + 25);
                    lastValidRow = val;
                    this.renderHierarchy();
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `✅ Posisi ${obj.label} diubah ke [Col ${obj.col}, Row ${val}]`;
                    }
                }
            });
        }

        const inpLabel = this.inspectorContent.querySelector('#gt-sb-inp-label');
        if (inpLabel) {
            inpLabel.addEventListener('input', (e) => {
                obj.label = e.target.value.trim() || obj.type;
                this.renderHierarchy();
            });
        }

        const btnClone = this.inspectorContent.querySelector('#gt-sb-act-clone');
        if (btnClone) {
            btnClone.addEventListener('click', () => {
                this.duplicateEntity(obj.id);
            });
        }

        const btnDelete = this.inspectorContent.querySelector('#gt-sb-act-delete');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                this.deleteEntity(obj.id);
            });
        }
    }

    bindEvents() {
        const overlay = this.overlay;
        const closeBtn = overlay.querySelector('#gt-sb-close-btn');
        const enterBtn = overlay.querySelector('#gt-sb-btn-enter');
        const randomBtn = overlay.querySelector('#gt-sb-btn-random');
        const nameInput = overlay.querySelector('#gt-sb-input-name');
        const gridBtn = overlay.querySelector('#gt-sb-btn-grid');
        const gizmoBtn = overlay.querySelector('#gt-sb-btn-gizmo');
        const undoBtn = overlay.querySelector('#gt-sb-btn-undo');
        const redoBtn = overlay.querySelector('#gt-sb-btn-redo');
        const btnAddItem = overlay.querySelector('#gt-sb-btn-add-item');

        // Tab Mode Switcher: Scene View vs Flow Graph
        const tabScene = overlay.querySelector('#gt-sb-tab-scene');
        const tabFlow = overlay.querySelector('#gt-sb-tab-flow');
        const flowWrapper = overlay.querySelector('#gt-sb-flow-wrapper');
        const sbBody = overlay.querySelector('.gt-sb-body');
        const sbDrawer = overlay.querySelector('.gt-sb-drawer');

        this.switchEditorMode = (mode) => {
            AudioManager.playClick();
            if (mode === 'flow') {
                if (tabFlow) tabFlow.classList.add('active');
                if (tabScene) tabScene.classList.remove('active');
                if (sbBody) sbBody.style.display = 'none';
                if (sbDrawer) sbDrawer.style.display = 'none';
                if (flowWrapper) flowWrapper.style.display = 'block';

                if (!this.flowGraphView) {
                    this.flowGraphView = new SceneFlowGraphView(flowWrapper, {
                        projectId: this.projectId,
                        onOpenScene: (sceneId, sceneData) => {
                            this.loadWorldData(sceneData, this.projectId, sceneId);
                            this.switchEditorMode('scene');
                        },
                        onAddScene: () => {
                            let targetProjId = this.projectId;
                            if (!targetProjId) {
                                const projs = ProjectManager.getProjects();
                                if (projs.length > 0) targetProjId = projs[0].id;
                            }
                            const project = targetProjId ? ProjectManager.getProject(targetProjId) : null;
                            if (!project) return;
                            const nextNum = (project.scenes || []).length + 1;
                            const name = prompt('Nama Level Baru:', `Level ${nextNum} • Area Petualangan`);
                            if (name && name.trim()) {
                                ProjectManager.addSceneToProject(targetProjId, {
                                    name: name.trim(),
                                    biome: 'dirt',
                                    worldWidth: 3600,
                                    worldHeight: 1000
                                });
                                this.flowGraphView.refresh();
                            }
                        }
                    });
                } else {
                    this.flowGraphView.projectId = this.projectId;
                    this.flowGraphView.refresh();
                }
            } else {
                if (tabScene) tabScene.classList.add('active');
                if (tabFlow) tabFlow.classList.remove('active');
                if (sbBody) sbBody.style.display = 'flex';
                if (sbDrawer) sbDrawer.style.display = 'block';
                if (flowWrapper) flowWrapper.style.display = 'none';
                setTimeout(() => {
                    this.resizeCanvas();
                }, 30);
            }
        };

        if (tabScene) tabScene.addEventListener('click', () => this.switchEditorMode('scene'));
        if (tabFlow) tabFlow.addEventListener('click', () => this.switchEditorMode('flow'));

        if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

        if (btnAddItem && this.addDropdown) {
            btnAddItem.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.addDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!btnAddItem.contains(e.target) && !this.addDropdown.contains(e.target)) {
                    this.addDropdown.classList.remove('show');
                }
            });
        }

        const sceneTagEl = overlay.querySelector('#gt-sb-scene-tag');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.state.name = e.target.value.trim() || 'Dunia Kreasiku';
                if (sceneTagEl) sceneTagEl.textContent = `Scene: ${this.state.name}.scene`;
            });
        }

        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                AudioManager.playClick();
                const prefixes = ['Gurun', 'Lembah', 'Puncak', 'Gua', 'Rawa', 'Benteng', 'Pulau'];
                const adjectives = ['Api Tengkorak', 'Salju Abadi', 'Misteri', 'Kristal Safir', 'Lahar Panas', 'Gelap Gulita', 'Harapan'];
                const p = prefixes[Math.floor(Math.random() * prefixes.length)];
                const a = adjectives[Math.floor(Math.random() * adjectives.length)];
                this.state.name = `${p} ${a}`;
                if (nameInput) nameInput.value = this.state.name;
                if (sceneTagEl) sceneTagEl.textContent = `Scene: ${this.state.name}.scene`;
            });
        }

        // Toggle Grid Button
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                AudioManager.playClick();
                this.state.showGrid = !this.state.showGrid;
                if (this.state.showGrid) {
                    gridBtn.classList.add('active');
                    gridBtn.innerHTML = '<span>⊞ Grid: ON</span>';
                } else {
                    gridBtn.classList.remove('active');
                    gridBtn.innerHTML = '<span>⊞ Grid: OFF</span>';
                }
            });
        }

        // Toggle Gizmos Button
        if (gizmoBtn) {
            gizmoBtn.addEventListener('click', () => {
                AudioManager.playClick();
                this.state.showGizmos = !this.state.showGizmos;
                if (this.state.showGizmos) {
                    gizmoBtn.classList.add('active');
                } else {
                    gizmoBtn.classList.remove('active');
                }
            });
        }

        // Toggle Uji Gerak Karakter (WASD)
        const testPlayBtn = overlay.querySelector('#gt-sb-btn-testplay');
        if (testPlayBtn) {
            testPlayBtn.addEventListener('click', () => {
                this.toggleTestPlayMode();
            });
        }

        // Biome Buttons
        overlay.querySelectorAll('.gt-sb-biome-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                overlay.querySelectorAll('.gt-sb-biome-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.biome = btn.getAttribute('data-biome');
            });
        });

        // Backpack Categories Filter Tab Click
        const catButtons = overlay.querySelectorAll('.gt-sb-cat-btn');
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedCat = btn.getAttribute('data-cat');

                const chips = overlay.querySelectorAll('.gt-sb-chip');
                chips.forEach(chip => {
                    const cat = chip.getAttribute('data-cat');
                    if (selectedCat === 'all' || cat === selectedCat) {
                        chip.style.display = 'flex';
                    } else {
                        chip.style.display = 'none';
                    }
                });
            });
        });

        // Floating Quick Action Toolbar Click Listeners
        if (this.selectionToolbar) {
            this.selectionToolbar.querySelector('#gt-sb-quick-del')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSelectionArea();
            });
            this.selectionToolbar.querySelector('#gt-sb-quick-dirt')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fillSelectionArea('dirt');
            });
            this.selectionToolbar.querySelector('#gt-sb-quick-platform')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fillSelectionArea('platforms');
            });
            this.selectionToolbar.querySelector('#gt-sb-quick-water')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fillSelectionArea('water');
            });
            this.selectionToolbar.querySelector('#gt-sb-quick-lava')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fillSelectionArea('lava');
            });
            this.selectionToolbar.querySelector('#gt-sb-quick-close')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.boxSelection = null;
                this.hideQuickToolbar();
                this.renderInspector();
            });
        }

        // ===============================================================
        // CANVAS DRAG & DROP + DIRECT MANIPULATION (60FPS ULTRA-SMOOTH)
        // ===============================================================
        if (this.canvas) {
            // Helper konversi posisi mouse ke grid tile & pixel lokal kanvas
            const getTileFromMouse = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = Math.max(0, Math.min(this.canvas.width, e.clientX - rect.left));
                const mouseY = Math.max(0, Math.min(this.canvas.height, e.clientY - rect.top));
                const W = this.canvas.width;
                const H = this.canvas.height;
                const worldW = this.state.worldWidth || 1800;
                const worldH = this.state.worldHeight || 700;
                const scaleX = W / worldW;
                const scaleY = H / worldH;
                const scale = Math.max(scaleX, scaleY);
                const offsetX = Math.max(0, (W - worldW * scale) / 2);
                const offsetY = Math.max(0, (H - worldH * scale) / 2);
                const col = Math.floor(((mouseX - offsetX) / scale) / 50);
                const row = Math.floor(((mouseY - offsetY) / scale) / 50);
                const maxC = this.getMaxCol();
                const maxR = this.getMaxRow();
                return { col: Math.max(0, Math.min(maxC, col)), row: Math.max(0, Math.min(maxR, row)), scale, mouseX, mouseY };
            };

            // 1. Mouse move tracker pada Canvas (Hover Tile & Tooltip)
            this.canvas.addEventListener('mousemove', (e) => {
                const { col, row } = getTileFromMouse(e);
                this.hoverTile = { col, row };

                if (!this.isBoxSelecting && !this.isCanvasDragging && this.gridInfoEl) {
                    const occ = this.getOccupyingEntity(col, row, null);
                    if (occ) {
                        this.gridInfoEl.textContent = `⛔ KOTAK TERISI: [Col ${col}, Row ${row}] oleh "${occ.label}" (Tidak dapat ditimbun / diisi lagi)`;
                    } else {
                        let layerName = 'LANGIT (SKY)';
                        if (row === 8) layerName = 'TANAH (SURFACE)';
                        else if (row > 8 && row <= 11) layerName = 'SUBSOIL (DIRT)';
                        else if (row > 11) layerName = 'CAVERN (STONE)';

                        this.gridInfoEl.textContent = `🟩 KOTAK KOSONG: [Col: ${col}, Row: ${row}] (Dapat diisi objek) | ${layerName}`;
                    }
                }
            });

            this.canvas.addEventListener('mouseleave', () => {
                if (!this.isBoxSelecting && !this.isCanvasDragging) {
                    this.hoverTile = null;
                    if (this.gridInfoEl) {
                        this.gridInfoEl.textContent = `GRID: 50px PERSEGI | CELL-CENTER SNAP READY`;
                    }
                }
            });

            // 2. Mouse Down (Click to select entity, start drag, or start pixel-smooth box selection)
            this.canvas.addEventListener('mousedown', (e) => {
                if (e.button === 2) return; // Right-click handled by contextmenu
                const { col, row, mouseX, mouseY } = getTileFromMouse(e);

                // Jika ada stamp tool yang sedang aktif
                if (this.state.activeTool) {
                    this.addNewEntity(this.state.activeTool, -1, col, row);
                    return;
                }

                // Cari apakah ada entity dinamis di koordinat [col, row] ini secara akurat
                const hit = this.state.entities.find(ent => {
                    const startCol = ent.col;
                    const endCol = ent.col + (ent.wTiles || 1) - 1;
                    const colMatch = (col >= startCol && col <= endCol);
                    const entRow = (ent.row !== undefined) ? ent.row : 7;
                    const rowMatch = (row === entRow) || 
                        ((ent.cat === 'creature' || ent.type === 'spikes' || ent.type === 'chest' || ent.type === 'portal') && (row === 7 || row === 8));
                    return colMatch && rowMatch;
                });

                if (hit && !e.shiftKey) {
                    this.boxSelection = null;
                    this.hideQuickToolbar();
                    AudioManager.playClick();
                    this.state.selectedId = hit.id;
                    this.isCanvasDragging = true;
                    this.canvasDragEntity = hit;
                    this.dragStartCol = hit.col;
                    this.dragStartRow = (hit.row !== undefined) ? hit.row : 7;
                    this._dragPreMoveSnapshot = this.captureSnapshot(`Pindah ${hit.label}`);
                    this.renderHierarchy();
                    this.renderInspector();
                } else {
                    // Mulai Multi-Seleksi Kotak Ultra-Smooth (Real-time pixel tracking)
                    this.state.selectedId = null;
                    this.isBoxSelecting = true;
                    this.hideQuickToolbar();
                    this.dragPixelBox = {
                        startX: mouseX,
                        startY: mouseY,
                        currentX: mouseX,
                        currentY: mouseY
                    };
                    this.boxSelection = { startCol: col, startRow: row, endCol: col, endRow: row };
                    AudioManager.playClick();
                    this.renderHierarchy();
                    this.renderInspector();
                }
            });

            // 3. Global Window MouseMove & MouseUp (Anti-stutter saat kursor bergerak cepat / keluar kanvas)
            this._globalMouseMove = (e) => {
                if (!this._isOpen) return;

                if (this.isBoxSelecting && this.boxSelection) {
                    const { col, row, mouseX, mouseY } = getTileFromMouse(e);
                    if (this.dragPixelBox) {
                        this.dragPixelBox.currentX = mouseX;
                        this.dragPixelBox.currentY = mouseY;
                    }
                    this.boxSelection.endCol = col;
                    this.boxSelection.endRow = row;

                    const bounds = this.getSelectionBounds();
                    if (this.gridInfoEl && bounds) {
                        this.gridInfoEl.textContent = `📦 SELEKSI AREA: [Col ${bounds.minCol}..${bounds.maxCol}, Row ${bounds.minRow}..${bounds.maxRow}] (${bounds.width * bounds.height} Petak)`;
                    }
                    return;
                }

                if (this.isCanvasDragging && this.canvasDragEntity) {
                    const { col, row } = getTileFromMouse(e);
                    const ent = this.canvasDragEntity;
                    ent.col = col;
                    ent.x = col * 50 + 25;
                    if (ent.type === 'platforms' || ent.type === 'coins' || ent.cat === 'fluid') {
                        ent.row = Math.max(0, Math.min(this.getMaxRow(), row));
                        ent.y = ent.row * 50 + 25;
                    }
                    this.renderInspector();
                }
            };
            window.addEventListener('mousemove', this._globalMouseMove);

            this._globalMouseUp = () => {
                if (!this._isOpen) return;

                if (this.isBoxSelecting) {
                    this.isBoxSelecting = false;
                    this.dragPixelBox = null;
                    const bounds = this.getSelectionBounds();
                    if (bounds) {
                        this.renderInspector();
                        this.updateQuickToolbar();
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `📦 AREA TERPILIH: [Col ${bounds.minCol}..${bounds.maxCol}, Row ${bounds.minRow}..${bounds.maxRow}] (${bounds.width * bounds.height} Petak) | Tekan Delete atau klik tombol cepat untuk Hapus/Isi`;
                        }
                    } else {
                        this.hideQuickToolbar();
                    }
                }

                if (this.isCanvasDragging && this.canvasDragEntity) {
                    const ent = this.canvasDragEntity;
                    const wTiles = ent.wTiles || 1;

                    // Periksa apakah petak tujuan sudah diisi objek lain:
                    const existing = this.getOccupyingEntity(ent.col, ent.row, ent.id, wTiles);
                    if (existing) {
                        ent.col = this.dragStartCol;
                        ent.row = this.dragStartRow;
                        ent.x = ent.col * 50 + 25;
                        ent.y = (ent.row === 7) ? 400 : (ent.row * 50 + 25);
                        AudioManager.playClick();
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `⛔ GAGAL PINDAH: Kotak [Col ${this.dragStartCol}, Row ${this.dragStartRow}] -> [Col ${ent.col}, Row ${ent.row}] sudah diisi oleh "${existing.label}". Hapus objek itu dulu jika ingin mengisi petak ini!`;
                        }
                    } else {
                        if (ent.col !== this.dragStartCol || ent.row !== this.dragStartRow) {
                            if (this._dragPreMoveSnapshot) {
                                this.undoStack.push(this._dragPreMoveSnapshot);
                                if (this.undoStack.length > this.maxHistorySteps) {
                                    this.undoStack.shift();
                                }
                                this.redoStack = [];
                                this.updateUndoRedoButtons();
                            }
                        }
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `✅ Objek ${ent.label} dipindahkan ke [Col ${ent.col}, Row ${ent.row}] (Kotak Bersih)`;
                        }
                    }
                    this._dragPreMoveSnapshot = null;

                    this.isCanvasDragging = false;
                    this.canvasDragEntity = null;
                    this.renderHierarchy();
                    this.renderInspector();
                }
            };
            window.addEventListener('mouseup', this._globalMouseUp);

            // 3. Right-Click Quick Action (Delete Entity)
            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const { col, row } = getTileFromMouse(e);
                const hit = this.state.entities.find(ent => {
                    const startCol = ent.col;
                    const endCol = ent.col + (ent.wTiles || 1) - 1;
                    const colMatch = (col >= startCol && col <= endCol);
                    const entRow = (ent.row !== undefined) ? ent.row : 7;
                    const rowMatch = (row === entRow) || 
                        ((ent.cat === 'creature' || ent.type === 'spikes' || ent.type === 'chest' || ent.type === 'portal') && (row === 7 || row === 8));
                    return colMatch && rowMatch;
                });

                if (hit && hit.type !== 'player') {
                    if (confirm(`Hapus ${hit.label}?`)) {
                        this.deleteEntity(hit.id);
                    }
                }
            });

            // 4. HTML5 Drag Over on Canvas
            this.canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                const { col, row } = getTileFromMouse(e);
                this.hoverTile = { col, row };
            });

            // 5. HTML5 Drop on Canvas (Accepts from Hierarchy or Backpack)
            this.canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const { col, row } = getTileFromMouse(e);

                let data;
                try {
                    data = JSON.parse(e.dataTransfer.getData('text/plain'));
                } catch (err) {
                    return;
                }

                if (data.source === 'hierarchy') {
                    const ent = this.state.entities.find(el => el.id === data.id);
                    if (ent) {
                        const wTiles = ent.wTiles || 1;
                        let targetRow = (ent.type === 'platforms' || ent.type === 'coins' || ent.cat === 'fluid')
                            ? Math.max(0, Math.min(this.getMaxRow(), row))
                            : 7;

                        const existing = this.getOccupyingEntity(col, targetRow, ent.id, wTiles);
                        if (existing) {
                            AudioManager.playClick();
                            if (this.gridInfoEl) {
                                this.gridInfoEl.textContent = `⛔ TIDAK BISA DIPINDAH: Kotak [Col ${col}, Row ${targetRow}] sudah diisi oleh "${existing.label}". Hapus objek itu terlebih dahulu!`;
                            }
                            return;
                        }

                        ent.col = col;
                        ent.row = targetRow;
                        ent.x = col * 50 + 25;
                        ent.y = (targetRow === 7) ? 400 : (targetRow * 50 + 25);

                        this.state.selectedId = ent.id;
                        AudioManager.playClick();
                        this.renderHierarchy();
                        this.renderInspector();
                    }
                } else if (data.source === 'backpack') {
                    // Spawn new entity at this tile (anti-nimbun otomatis via addNewEntity)
                    this.addNewEntity(data.type, -1, col, row);
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                AudioManager.playClick();
                this.hide();
            });
        }

        // Tombol Eksekusi "▶ Play World"
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                this.executeEnterWorld();
            });
        }

        // Resize Canvas Observer
        window.addEventListener('resize', () => {
            if (this._isOpen) this.resizeCanvas();
        });

        // Keyboard Shortcuts (ESC, Delete, Ctrl+C, Ctrl+V, Ctrl+D)
        this._escHandler = (e) => {
            if (!this._isOpen) return;

            // Abaikan shortcut jika sedang mengetik di input text
            const isTyping = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

            // ESC: Batalkan multi-seleksi atau tutup modal
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (this.boxSelection) {
                    this.boxSelection = null;
                    AudioManager.playClick();
                    this.renderInspector();
                    if (this.gridInfoEl) this.gridInfoEl.textContent = '❌ Seleksi area dibatalkan.';
                    return;
                }
                AudioManager.playClick();
                this.hide();
                return;
            }

            if (isTyping) return;

            // Tab: Toggle Mode Uji Gerak (WASD)
            // Tab: Toggle Mode Uji Gerak (WASD)
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleTestPlayMode();
                return;
            }

            // Tombol WASD atau Spasi: Kontrol Karakter Player Bergerak Mulus (Smooth 60FPS)
            const k = e.key.toLowerCase();
            if (['a', 'd', 'w', 's', ' '].includes(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!this.testPlayer) {
                    this.initTestPlayer();
                    this.isTestPlayMode = true;
                    const btn = this.overlay ? this.overlay.querySelector('#gt-sb-btn-testplay') : null;
                    if (btn) {
                        btn.classList.add('active');
                        btn.innerHTML = '<span>🎮 Uji Gerak: ON</span>';
                    }
                }
                if (k === 'a') this.testKeys.a = true;
                if (k === 'd') this.testKeys.d = true;
                if (k === 'w' || k === ' ') {
                    e.preventDefault();
                    this.testKeys.w = true;
                }
                if (k === 's') this.testKeys.s = true;
                return;
            }

            if (e.key === 'Escape' && this.isTestPlayMode) {
                this.toggleTestPlayMode(false);
                return;
            }

            // Mode Edit: Geser Objek Terpilih dengan Tombol Panah (← ↑ → ↓)
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.nudgeSelectedEntity(0, -1);
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.nudgeSelectedEntity(0, 1);
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.nudgeSelectedEntity(-1, 0);
                    return;
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nudgeSelectedEntity(1, 0);
                    return;
                }
            }

            // Shift + Arrow Keys: Seleksi Kotak Banyak (Kanan, Kiri, Atas, Bawah)
            if (e.shiftKey && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                if (!this.boxSelection) {
                    let initCol = 10, initRow = 8;
                    if (this.hoverTile) {
                        initCol = this.hoverTile.col;
                        initRow = this.hoverTile.row;
                    } else if (this.state.selectedId) {
                        const sel = this.state.entities.find(el => el.id === this.state.selectedId);
                        if (sel) {
                            initCol = sel.col;
                            initRow = (sel.row !== undefined) ? sel.row : 7;
                        }
                    }
                    this.boxSelection = { startCol: initCol, startRow: initRow, endCol: initCol, endRow: initRow };
                }

                if (e.key === 'ArrowRight') {
                    this.boxSelection.endCol = Math.min(this.getMaxCol(), this.boxSelection.endCol + 1);
                } else if (e.key === 'ArrowLeft') {
                    this.boxSelection.endCol = Math.max(0, this.boxSelection.endCol - 1);
                } else if (e.key === 'ArrowDown') {
                    this.boxSelection.endRow = Math.min(this.getMaxRow(), this.boxSelection.endRow + 1);
                } else if (e.key === 'ArrowUp') {
                    this.boxSelection.endRow = Math.max(0, this.boxSelection.endRow - 1);
                }

                AudioManager.playClick();
                const bounds = this.getSelectionBounds();
                this.renderInspector();
                if (this.gridInfoEl && bounds) {
                    this.gridInfoEl.textContent = `📦 SELEKSI AREA (Shift+Panah): [Col ${bounds.minCol}..${bounds.maxCol}, Row ${bounds.minRow}..${bounds.maxRow}] (${bounds.width * bounds.height} Petak)`;
                }
                return;
            }

            // Delete / Backspace: Hapus area seleksi atau objek terpilih
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.boxSelection) {
                    this.deleteSelectionArea();
                    return;
                } else if (this.state.selectedId) {
                    this.deleteEntity(this.state.selectedId);
                    return;
                }
            }
            // Ctrl+C / Cmd+C: Copy objek terpilih
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                this.copySelectedEntity();
            }
            // Ctrl+V / Cmd+V: Paste objek yang disalin
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                e.preventDefault();
                this.pasteEntity();
            }
            // Ctrl+D / Cmd+D: Duplikasi langsung (Standard Unity/Blender)
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                if (this.state.selectedId) {
                    this.duplicateEntity(this.state.selectedId);
                }
            }
            // Ctrl+Z / Cmd+Z: Undo (atau Redo jika Shift ditekan)
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
            // Ctrl+Y / Cmd+Y: Redo
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                this.redo();
            }
        };
        window.addEventListener('keydown', this._escHandler);

        // KeyUp Listener untuk merilis tombol gerak pada Mode Uji Gerak
        this._keyUpHandler = (e) => {
            if (!this._isOpen) return;
            if (this.isTestPlayMode) {
                const k = e.key.toLowerCase();
                if (k === 'a' || e.key === 'ArrowLeft') this.testKeys.a = false;
                if (k === 'd' || e.key === 'ArrowRight') this.testKeys.d = false;
                if (k === 'w' || e.key === 'ArrowUp' || e.key === ' ') this.testKeys.w = false;
                if (k === 's' || e.key === 'ArrowDown') this.testKeys.s = false;
            }
        };
        window.addEventListener('keyup', this._keyUpHandler);
    }

    resizeCanvas() {
        if (!this.canvas || !this.viewport) return;
        const rect = this.viewport.getBoundingClientRect();
        this.canvas.width = Math.max(800, Math.floor(rect.width));
        this.canvas.height = Math.max(300, Math.floor(rect.height));
    }

    executeEnterWorld() {
        AudioManager.playClick();

        // Cek keberadaan komponen untuk backward compatibility
        const types = new Set(this.state.entities.map(e => e.type));

        const worldData = {
            id: `world-${Date.now()}`,
            name: this.state.name || 'Dunia Kreasiku',
            biome: this.state.biome,
            timeOfDay: this.state.timeOfDay,
            worldWidth: this.state.worldWidth || 1800,
            worldHeight: this.state.worldHeight || 700,
            hasLava: types.has('lava'),
            hasWater: types.has('water'),
            hasSpikes: types.has('spikes'),
            hasPlatforms: types.has('platforms'),
            hasSlime: types.has('slime'),
            hasSkeleton: types.has('skeleton'),
            hasNpc: types.has('npc'),
            hasChest: types.has('chest'),
            hasCoins: types.has('coins'),
            hasPortal: types.has('portal'),
            // Dynamic custom entities array
            entities: JSON.parse(JSON.stringify(this.state.entities)),
            terrainTiles: this.state.terrainTiles ? Array.from(this.state.terrainTiles) : null,
            dugTiles: this.state.dugTiles ? Array.from(this.state.dugTiles) : []
        };

        let targetProjectId = this.projectId;
        if (!targetProjectId) {
            const projects = ProjectManager.getProjects();
            targetProjectId = (projects && projects[0]) ? projects[0].id : ProjectManager.createProject('Project Kreasiku').id;
        }

        let targetSceneId = this.sceneId || worldData.id;
        worldData.id = targetSceneId;

        if (this.sceneId) {
            ProjectManager.updateSceneInProject(targetProjectId, this.sceneId, worldData);
        } else {
            const created = ProjectManager.addSceneToProject(targetProjectId, worldData);
            if (created) targetSceneId = created.id;
        }

        this.hide();

        // Teleportasi Instan ke CustomWorldScene dengan project context
        if (this.scene && this.scene.scene) {
            this.scene.scene.start('CustomWorldScene', { worldData, projectId: targetProjectId, sceneId: targetSceneId });
        } else if (window.__templateGame && window.__templateGame.scene) {
            window.__templateGame.scene.start('CustomWorldScene', { worldData, projectId: targetProjectId, sceneId: targetSceneId });
        }
    }

    // ===============================================================
    // TRUE MINIATURE MAP ENGINE DENGAN DYNAMIC ENTITY RENDERING
    // ===============================================================
    startPreviewLoop() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

        const render = () => {
            if (!this._isOpen) return;
            this.animTime += 0.04;
            this.drawMiniatureMap();
            this.animFrameId = requestAnimationFrame(render);
        };
        this.animFrameId = requestAnimationFrame(render);
    }

    drawMiniatureMap() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.animTime;

        // 1. SCALE YANG MENGISI PENUH KANVAS (VERTIKAL & HORIZONTAL)
        const worldW = this.state.worldWidth || 3600;
        const worldH = this.state.worldHeight || 1000; // 20 baris × 50px (Row 0..19, Bedrock di Row 19)
        const totalRows = Math.floor(worldH / 50);
        const totalCols = Math.ceil(worldW / 50);
        this.state.worldHeight = worldH;
        this.state.worldWidth = worldW;

        // Skala terbesar agar dunia mengisi seluruh kanvas tanpa ruang hitam kosong
        const scaleX = W / worldW;
        const scaleY = H / worldH;
        const scale = Math.max(scaleX, scaleY);
        const cellSize = 50 * scale;

        // Offset untuk centering horizontal jika tinggi kanvas menentukan skala
        const offsetX = Math.max(0, (W - worldW * scale) / 2);
        const offsetY = Math.max(0, (H - worldH * scale) / 2);

        // Helper fungsi pemetaan koordinat dunia ke kanvas
        const toX = (wx) => offsetX + wx * scale;
        const toY = (wy) => offsetY + wy * scale;

        // Ground walking baseline tepat di Row 8 (y = 400px)
        const groundRow = 8;
        const groundY = toY(400);

        // Bedrock SELALU di Row 19 (y=950..1000) identik dengan CustomWorldScene.js
        const bedrockRow = totalRows - 1;
        const bedrockY = toY(bedrockRow * 50);

        ctx.clearRect(0, 0, W, H);

        // 2. BACKGROUND & PARALLAX LAYERS (100% 1:1 DENGAN GAME ENGINE)
        if (this.state.biome === 'hongkong') {
            // Latar Belakang Gelap Victoria Harbour
            ctx.fillStyle = '#070e1b';
            ctx.fillRect(0, 0, W, H);

            // LAYER 1: Langit Badai & Siluet Gunung Victoria Peak
            if (this.bgImages.hk_sky && this.bgImages.hk_sky.complete) {
                ctx.drawImage(this.bgImages.hk_sky, 0, 0, W, groundY + 120);
            }

            // LAYER 2: Gedung Pencakar Langit Hong Kong
            if (this.bgImages.hk_city && this.bgImages.hk_city.complete) {
                ctx.drawImage(this.bgImages.hk_city, 0, 0, W, groundY + 120);
            }

            // LAYER 3: Kapal Star Ferry (Mengapung & Berlayar Halus)
            if (this.bgImages.hk_boat && this.bgImages.hk_boat.complete) {
                ctx.save();
                const boatBaseX = toX(Math.min(1480, (this.state.worldWidth || 1800) - 200));
                const boatCruise = Math.sin(t * 0.15) * (15 * scale);
                const boatBob = Math.sin(t * 1.8) * (3 * scale);
                const boatTilt = Math.sin(t * 1.2) * 0.02;
                const bx = boatBaseX - boatCruise;
                const by = toY(356) + boatBob;
                ctx.translate(bx, by);
                ctx.rotate(boatTilt);
                const bw = this.bgImages.hk_boat.width * scale;
                const bh = this.bgImages.hk_boat.height * scale;
                ctx.drawImage(this.bgImages.hk_boat, -bw / 2, -bh / 2, bw, bh);
                ctx.restore();
            }

            // LAYER 4: Ombak Laut Bergulung
            if (this.bgImages.hk_waves && this.bgImages.hk_waves.complete) {
                const waveShiftY = Math.sin(t * 2.2) * (2 * scale);
                ctx.drawImage(this.bgImages.hk_waves, 0, waveShiftY, W, groundY + 120);
            }

            // LAYER 5: Bebatuan Dermaga / Pier
            if (this.bgImages.hk_pier && this.bgImages.hk_pier.complete) {
                ctx.drawImage(this.bgImages.hk_pier, 0, 0, W, H);
            }

            // Efek Cuaca: Butir Rintik Hujan Menukik
            ctx.save();
            ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
            ctx.lineWidth = Math.max(1, 1.3 * scale);
            for (let i = 0; i < 45; i++) {
                const rx = (i * 47 + t * 280) % W;
                const ry = (i * 31 + t * 650) % H;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx - 8 * scale, ry + 16 * scale);
                ctx.stroke();
            }
            // Flash Kilat Petir Sesekali
            const flashCycle = Math.sin(t * 0.55);
            if (flashCycle > 0.985) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.fillRect(0, 0, W, H);
            }
            ctx.restore();
        } else {
            // SKY GRADIENT BERSIH (MEMBENTANG PENUH DARI ROW 0 KE ROW 8)
            let skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
            if (this.state.biome === 'snow') {
                skyGradient.addColorStop(0, '#0369a1');
                skyGradient.addColorStop(0.65, '#38bdf8');
                skyGradient.addColorStop(1, '#bae6fd');
            } else if (this.state.biome === 'desert') {
                skyGradient.addColorStop(0, '#78350f');
                skyGradient.addColorStop(0.45, '#d97706');
                skyGradient.addColorStop(1, '#fde68a');
            } else if (this.state.biome === 'cave') {
                skyGradient.addColorStop(0, '#090d16');
                skyGradient.addColorStop(0.7, '#111827');
                skyGradient.addColorStop(1, '#1e1b4b');
            } else {
                // dirt / forest
                skyGradient.addColorStop(0, '#0369a1');
                skyGradient.addColorStop(0.55, '#38bdf8');
                skyGradient.addColorStop(1, '#7dd3fc');
            }
            ctx.fillStyle = skyGradient;
            ctx.fillRect(0, 0, W, groundY);

            // Lapisan Gunung Salju untuk Biome Snow (bg_scene1)
            if (this.state.biome === 'snow' && this.bgImages.snow_mountain && this.bgImages.snow_mountain.complete) {
                ctx.save();
                ctx.globalAlpha = 0.85;
                ctx.drawImage(this.bgImages.snow_mountain, 0, 0, W, groundY + 40);
                ctx.restore();

                // Efek Salju Melayang
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                for (let i = 0; i < 30; i++) {
                    const sx = (i * 53 + Math.sin(t + i) * 15) % W;
                    const sy = (i * 29 + t * 50) % H;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.8 * scale + (i % 2), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // 3. CELESTIAL SUN / MOON (Lingkaran Sempurna)
        if (this.state.biome !== 'cave' && this.state.biome !== 'hongkong') {
            const sunX = toX(275);
            const sunY = toY(80);
            const sunR = Math.max(14, 26 * scale);

            ctx.fillStyle = this.state.biome === 'snow' ? '#f8fafc' : '#fef08a';
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.state.biome === 'snow' ? 'rgba(255,255,255,0.4)' : 'rgba(253, 224, 71, 0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. PENENTUAN WARNA BIOME STRATA
        let surfaceColor = '#15803d'; // Forest rumput
        let dirtColor = '#78350f';    // Subsoil cokelat
        let stoneColor = '#334155';   // Deep cavern slate stone

        if (this.state.biome === 'snow') {
            surfaceColor = '#f1f5f9';
            dirtColor = '#475569';
            stoneColor = '#1e293b';
        } else if (this.state.biome === 'desert') {
            surfaceColor = '#f59e0b';
            dirtColor = '#b45309';
            stoneColor = '#292524';
        } else if (this.state.biome === 'cave') {
            surfaceColor = '#374151';
            dirtColor = '#1f2937';
            stoneColor = '#0f172a';
        } else if (this.state.biome === 'hongkong') {
            surfaceColor = '#1e293b';
            dirtColor = '#0f172a';
            stoneColor = '#020617';
        }

        // Peta Petak 1x1 Spesifik [col, row] untuk Cairan (Water & Lava)
        const waterEntities = this.state.entities.filter(e => e.type === 'water');
        const lavaEntities = this.state.entities.filter(e => e.type === 'lava');

        const waterTileMap = new Set();
        waterEntities.forEach(e => {
            const w = e.wTiles || 1;
            const h = e.hTiles || 1;
            for (let c = e.col; c < e.col + w; c++) {
                for (let r = e.row; r < e.row + h; r++) {
                    waterTileMap.add(`${c},${r}`);
                }
            }
        });

        const lavaTileMap = new Set();
        lavaEntities.forEach(e => {
            const w = e.wTiles || 1;
            const h = e.hTiles || 1;
            for (let c = e.col; c < e.col + w; c++) {
                for (let r = e.row; r < e.row + h; r++) {
                    lavaTileMap.add(`${c},${r}`);
                }
            }
        });

        const isWaterTile = (c, r) => waterTileMap.has(`${c},${r}`);
        const isLavaTile = (c, r) => lavaTileMap.has(`${c},${r}`);

        // 4b. GAMBAR BLOK AIR, LAVA & TANAH DI LANGIT (Rows 0..7) JIKA ADA
        for (let col = 0; col < totalCols; col++) {
            const rx = toX(col * 50);
            const rw = cellSize + 0.5;
            for (let r = 0; r < groundRow; r++) {
                const ry = toY(r * 50);
                const rh = cellSize + 0.5;
                if (isWaterTile(col, r)) {
                    const hasAbove = isWaterTile(col, r - 1);
                    const waveY = (!hasAbove) ? (ry + Math.sin(t * 3 + col * 0.8) * 3) : ry;
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(rx, waveY, rw, rh + (ry - waveY));
                    if (!hasAbove) {
                        ctx.fillStyle = '#7dd3fc';
                        ctx.fillRect(rx, waveY, rw, 3);
                    }
                    if (this.state.showGrid && isWaterTile(col + 1, r)) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(rx + rw, ry);
                        ctx.lineTo(rx + rw, ry + rh);
                        ctx.stroke();
                    }
                } else if (isLavaTile(col, r)) {
                    const hasAbove = isLavaTile(col, r - 1);
                    const lavaWaveY = (!hasAbove) ? (ry + Math.sin(t * 2 + col * 0.9) * 2) : ry;
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(rx, lavaWaveY, rw, rh + (ry - lavaWaveY));
                    if (!hasAbove) {
                        ctx.fillStyle = '#f97316';
                        ctx.fillRect(rx, lavaWaveY, rw, 3);
                    }
                    if (this.state.showGrid && isLavaTile(col + 1, r)) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(rx + rw, ry);
                        ctx.lineTo(rx + rw, ry + rh);
                        ctx.stroke();
                    }
                } else if (this.hasTerrainAt(col, r)) {
                    // BLOK TANAH MODULAR DI LANGIT (Rows 0..7)
                    const hasAbove = this.hasTerrainAt(col, r - 1);
                    if (!hasAbove) {
                        ctx.fillStyle = surfaceColor;
                        ctx.fillRect(rx, ry, rw, 14 * scale);
                        ctx.fillStyle = dirtColor;
                        ctx.fillRect(rx, ry + 14 * scale, rw, rh - 14 * scale);
                    } else {
                        ctx.fillStyle = dirtColor;
                        ctx.fillRect(rx, ry, rw, rh);
                    }
                    if ((col + r) % 3 === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.18)';
                        ctx.fillRect(rx + 8 * scale, ry + 12 * scale, 8 * scale, 5 * scale);
                    }
                    if (this.state.showGrid) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(rx, ry, rw, rh);
                    }
                }
            }
        }

        // 5. MENGGAMBAR STRATA TANAH & PETAK CAIRAN (SETIAP PETAK 1x1 MURNI)
        for (let col = 0; col < totalCols; col++) {
            const rx = toX(col * 50);
            const rw = cellSize + 0.5;

            for (let r = groundRow; r < totalRows; r++) {
                const ry = toY(r * 50);
                const rh = cellSize + 0.5;

                // A. JIKA PETAK INI [col, r] ADALAH AIR 1x1
                if (isWaterTile(col, r)) {
                    const hasAbove = isWaterTile(col, r - 1);
                    const waveY = (!hasAbove) ? (ry + Math.sin(t * 3 + col * 0.8) * 3) : ry;
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(rx, waveY, rw, rh + (ry - waveY));
                    if (!hasAbove) {
                        ctx.fillStyle = '#7dd3fc';
                        ctx.fillRect(rx, waveY, rw, 3);
                    }
                    if (this.state.showGrid && isWaterTile(col + 1, r)) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(rx + rw, ry);
                        ctx.lineTo(rx + rw, ry + rh);
                        ctx.stroke();
                    }
                    continue;
                }

                // B. JIKA PETAK INI [col, r] ADALAH LAVA 1x1
                if (isLavaTile(col, r)) {
                    const hasAbove = isLavaTile(col, r - 1);
                    const lavaWaveY = (!hasAbove) ? (ry + Math.sin(t * 2 + col * 0.9) * 2) : ry;
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(rx, lavaWaveY, rw, rh + (ry - lavaWaveY));
                    if (!hasAbove) {
                        ctx.fillStyle = '#f97316';
                        ctx.fillRect(rx, lavaWaveY, rw, 3);
                        const bubbleY = lavaWaveY - Math.abs(Math.sin(t * 4 + col)) * 6;
                        ctx.fillStyle = '#fbbf24';
                        ctx.beginPath();
                        ctx.arc(rx + rw / 2, bubbleY, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    if (this.state.showGrid && isLavaTile(col + 1, r)) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(rx + rw, ry);
                        ctx.lineTo(rx + rw, ry + rh);
                        ctx.stroke();
                    }
                    continue;
                }

                // B. ROW BEDROCK PALING DASAR (Row bedrockRow)
                if (r === bedrockRow) {
                    ctx.fillStyle = '#05070a';
                    ctx.fillRect(rx, ry, rw, rh);

                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(rx + 3 * scale, ry + 3 * scale, rw - 6 * scale, rh - 6 * scale);

                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(rx + 8 * scale, ry + 8 * scale, 14 * scale, 14 * scale);
                    ctx.fillRect(rx + rw - 22 * scale, ry + rh - 22 * scale, 14 * scale, 14 * scale);

                    ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx + rw, ry + rh);
                    ctx.moveTo(rx + rw, ry);
                    ctx.lineTo(rx, ry + rh);
                    ctx.stroke();

                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(rx, ry, rw, rh);
                    continue;
                }

                // C. ROW 8: PERMUKAAN TANAH (SURFACE TURF) ATAU BLOK TANAH
                const hasGroundAtR = this.hasTerrainAt(col, r);
                const hasGroundAtSurface = this.hasTerrainAt(col, groundRow);

                // Khusus Biome Hong Kong: laut dan bebatuan dermaga membentang alami hingga ke dasar
                // (hk_layer_4_waves & hk_layer_5_pier). Hindari menggambar balok strata tanah/batu tambang
                // pekat dengan kristal safir/emas yang menutupi tekstur dermaga.
                if (this.state.biome === 'hongkong') {
                    if (r === groundRow && hasGroundAtR) {
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                        ctx.fillRect(rx, ry, rw, 3 * scale);
                    }
                    continue;
                }

                if (r === groundRow) {
                    if (this.state.dugTiles && this.state.dugTiles.has(`${col},${r}`)) {
                        continue;
                    }
                    if (hasGroundAtR) {
                        const hasAbove = this.hasTerrainAt(col, r - 1);
                        if (!hasAbove) {
                            ctx.fillStyle = surfaceColor;
                            ctx.fillRect(rx, ry, rw, 14 * scale);
                            ctx.fillStyle = dirtColor;
                            ctx.fillRect(rx, ry + 14 * scale, rw, rh - 14 * scale);
                        } else {
                            ctx.fillStyle = dirtColor;
                            ctx.fillRect(rx, ry, rw, rh);
                        }
                    }
                    continue;
                }

                // Jika petak bawah tanah ini sudah digali / dihancurkan pemain
                if (this.state.dugTiles && this.state.dugTiles.has(`${col},${r}`)) {
                    continue;
                }

                // Jika tanah di baris 8 sudah dihapus dan tidak ada blok di baris r ini,
                // biarkan tembus langit/jurang sampai ke dasar!
                if (!hasGroundAtSurface && !hasGroundAtR) {
                    continue;
                }

                // D. ROW 9..12: LAPISAN TANAH BAWAH (SUBSURFACE DIRT - 4 BARIS)
                if (r <= 12) {
                    ctx.fillStyle = dirtColor;
                    ctx.fillRect(rx, ry, rw, rh);
                    if ((col + r) % 3 === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(rx + 12 * scale, ry + 14 * scale, 6 * scale, 4 * scale);
                    }
                    continue;
                }

                // E. ROW 13..16: LAPISAN BATU GUA DALAM (CAVERN SLATE STONE - 4 BARIS)
                if (r <= 16) {
                    ctx.fillStyle = stoneColor;
                    ctx.fillRect(rx, ry, rw, rh);

                    // Urat Mineral Kristal Terpendam
                    if ((col * 7 + r * 13) % 9 === 0) {
                        ctx.fillStyle = '#38bdf8'; // Kristal Safir
                        ctx.beginPath();
                        ctx.arc(rx + rw / 2, ry + rh / 2, 4 * scale, 0, Math.PI * 2);
                        ctx.fill();
                    } else if ((col * 3 + r * 11) % 8 === 0) {
                        ctx.fillStyle = '#f59e0b'; // Emas
                        ctx.fillRect(rx + rw / 2 - 3 * scale, ry + rh / 2 - 3 * scale, 6 * scale, 6 * scale);
                    }
                    continue;
                }

                // F. ROW 17..18: DEEP MANTLE OBSIDIAN & MAGMA CAVERN (2 BARIS)
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(rx, ry, rw, rh);
                if ((col * 5 + r * 7) % 7 === 0) {
                    ctx.fillStyle = '#ef4444'; // Kristal Ruby Merah
                    ctx.beginPath();
                    ctx.arc(rx + rw / 2, ry + rh / 2, 4 * scale, 0, Math.PI * 2);
                    ctx.fill();
                } else if ((col * 4 + r * 9) % 6 === 0) {
                    ctx.fillStyle = '#8b5cf6'; // Kristal Amethyst Ungu
                    ctx.fillRect(rx + rw / 2 - 2.5 * scale, ry + rh / 2 - 2.5 * scale, 5 * scale, 5 * scale);
                }
            }
        }

        // Label Penanda Bedrock di Kiri Bawah (Hanya untuk biome bertanah/tambang)
        if (this.state.biome !== 'hongkong') {
            ctx.fillStyle = '#94a3b8';
            ctx.font = `bold ${Math.max(8, 10 * scale)}px 'JetBrains Mono'`;
            ctx.textAlign = 'left';
            ctx.fillText('⬛ BEDROCK (DASAR BUMI TAK TERTEMBUS)', toX(20), bedrockY + cellSize * 0.65);
        }

        // ===============================================================
        // 6. AUTO-MERGED PLATFORMS RENDERING (BLOK 1x1 MENYATU SAAT BERJEJER)
        // ===============================================================
        const platEntities = this.state.entities.filter(e => e.type === 'platforms');
        const platRowMap = new Map();
        platEntities.forEach(p => {
            const r = p.row;
            if (!platRowMap.has(r)) platRowMap.set(r, new Set());
            const w = p.wTiles || 1;
            for (let c = p.col; c < p.col + w; c++) platRowMap.get(r).add(c);
        });

        platRowMap.forEach((colsSet, r) => {
            const sorted = Array.from(colsSet).sort((a, b) => a - b);
            let cur = null;
            const segments = [];
            sorted.forEach(c => {
                if (!cur) {
                    cur = { start: c, end: c };
                } else if (c === cur.end + 1) {
                    cur.end = c;
                } else {
                    segments.push(cur);
                    cur = { start: c, end: c };
                }
            });
            if (cur) segments.push(cur);

            segments.forEach(seg => {
                const px = toX(seg.start * 50);
                const py = toY(r * 50);
                const count = seg.end - seg.start + 1;
                const pw = count * cellSize;
                const ph = Math.max(6, 18 * scale);

                // Badan Balok Pijakan Menyatu
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px, py, pw, ph);

                // Garis Rumput Permukaan Atas / Highlight Peti Pelabuhan Hong Kong
                const isHkBiome = (this.state.biome === 'hongkong');
                ctx.fillStyle = isHkBiome ? '#94a3b8' : surfaceColor;
                ctx.fillRect(px, py, pw, isHkBiome ? (2 * scale) : (3.5 * scale));

                // Border Luar
                ctx.strokeStyle = isHkBiome ? '#475569' : surfaceColor;
                ctx.lineWidth = 1.8;
                ctx.strokeRect(px, py, pw, ph);

                // Garis Sambungan Halus Antar Tile 1x1 (Seamless Joint Indicator)
                if (count > 1) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                    ctx.lineWidth = 1;
                    for (let c = seg.start + 1; c <= seg.end; c++) {
                        const jx = toX(c * 50);
                        ctx.beginPath();
                        ctx.moveTo(jx, py + 3.5 * scale);
                        ctx.lineTo(jx, py + ph);
                        ctx.stroke();
                    }
                }
            });
        });

        // ===============================================================
        // 7. DRAW ALL INDIVIDUAL DYNAMIC ENTITIES ON CANVAS
        // ===============================================================
        this.state.entities.forEach((ent, idx) => {
            const ex = toX(ent.col * 50 + 25);
            const ey = toY(ent.row * 50);

            // Platform sudah digambar dengan auto-merge di atas, lewati
            if (ent.type === 'platforms') return;

            // B. KOIN EMAS (COINS)
            if (ent.type === 'coins') {
                const coinX = toX(ent.col * 50 + 25);
                const coinY = toY(ent.row * 50 + 25);
                const coinW = Math.max(4, Math.abs(Math.sin(t * 3 + idx)) * (8 * scale));

                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.ellipse(coinX, coinY, coinW, 8 * scale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // C. RINTANGAN DURI (SPIKES) / OMBAK PECAH
            else if (ent.type === 'spikes') {
                const px = toX(ent.col * 50);
                const py = groundY;
                const sw = cellSize;
                const sh = Math.max(10, 30 * scale);

                if (this.state.biome === 'hongkong' || ent.isWaveHazard || (ent.label && ent.label.includes('Ombak'))) {
                    // Segitiga Tunggal Merah Ombak Pecah (Identik dengan skeleton_hazard di HongKongScene)
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.moveTo(px + sw * 0.15, py);
                    ctx.lineTo(px + sw * 0.5, py - sh);
                    ctx.lineTo(px + sw * 0.85, py);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#fca5a5';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Teks Nama Rintangan Cyan "Ombak Pecah"
                    ctx.fillStyle = '#67e8f9';
                    ctx.font = `bold ${Math.max(7, 8.5 * scale)}px 'JetBrains Mono'`;
                    ctx.textAlign = 'center';
                    ctx.fillText(ent.label || 'Ombak Pecah', px + sw * 0.5, py - sh - 5);
                } else {
                    ctx.fillStyle = '#dc2626';
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + sw * 0.25, py - sh);
                    ctx.lineTo(px + sw * 0.5, py);
                    ctx.lineTo(px + sw * 0.75, py - sh);
                    ctx.lineTo(px + sw, py);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#fca5a5';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }

            // D. PETI HARTA KARUN (CHEST) ATAU ITEM QUEST / MUTIARA
            else if (ent.type === 'chest' || ent.type === 'quest_item') {
                const isPearl = ent.subType === 'pearl' || (ent.label && ent.label.toLowerCase().includes('mutiara'));
                if (isPearl) {
                    const cx = toX(ent.x !== undefined ? ent.x : (ent.col * 50 + 25));
                    const cy = toY(ent.y !== undefined ? ent.y : 215);
                    const pr = Math.max(6, 10 * scale);

                    // Pendar Cahaya Mutiara Teluk Victoria
                    const glowR = pr + 4 * scale + Math.sin(t * 3.5) * (2 * scale);
                    const grad = ctx.createRadialGradient(cx, cy, pr * 0.2, cx, cy, glowR);
                    grad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
                    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
                    ctx.fill();

                    // Butir Mutiara Putih Berkilau
                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.6;
                    ctx.stroke();

                    // Teks Label Mutiara Victoria
                    ctx.fillStyle = '#7dd3fc';
                    ctx.font = `bold ${Math.max(7, 8.5 * scale)}px 'JetBrains Mono'`;
                    ctx.textAlign = 'center';
                    ctx.fillText('Mutiara Victoria', cx, cy - pr - 5);
                } else {
                    const cx = toX(ent.col * 50 + 25);
                    const cw = Math.max(12, 30 * scale);
                    const ch = Math.max(10, 24 * scale);
                    const cy = groundY - ch;

                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(cx - cw / 2, cy, cw, ch);
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(cx - cw / 2, cy, cw, ch);
                    ctx.fillStyle = '#fde047';
                    ctx.fillRect(cx - 2, cy + ch / 2 - 2, 4, 4);

                    ctx.fillStyle = '#fbbf24';
                    ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
                    ctx.textAlign = 'center';
                    ctx.fillText('CHEST', cx, cy - 4);
                }
            }

            // E. KARAKTER NPC (NPC)
            else if (ent.type === 'npc') {
                const npcX = toX(ent.col * 50 + 25);
                const nw = Math.max(10, 24 * scale);
                const nh = Math.max(14, 38 * scale);
                const npcY = groundY - nh;

                ctx.fillStyle = '#a855f7';
                ctx.fillRect(npcX - nw / 2, npcY, nw, nh);
                ctx.strokeStyle = '#d8b4fe';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(npcX - nw / 2, npcY, nw, nh);

                ctx.fillStyle = '#fde047';
                ctx.fillRect(npcX - 4, npcY + 6, 3, 3);
                ctx.fillRect(npcX + 2, npcY + 6, 3, 3);

                const bubbleY = npcY - 10 * scale + Math.sin(t * 4 + idx) * 2;
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(npcX - 10, bubbleY - 10, 20, 12);
                ctx.strokeStyle = '#c084fc';
                ctx.strokeRect(npcX - 10, bubbleY - 10, 20, 12);
                ctx.fillStyle = '#ffffff';
                ctx.font = "bold 9px 'JetBrains Mono'";
                ctx.textAlign = 'center';
                ctx.fillText('[E]', npcX, bubbleY - 1);
            }

            // F. MONSTER SLIME (SLIME)
            else if (ent.type === 'slime') {
                const slimeBaseX = toX(ent.col * 50 + 25);
                const patrolOffset = Math.sin(t * 1.5 + idx) * (12 * scale);
                const jumpOffset = Math.abs(Math.sin(t * 3 + idx)) * (18 * scale);
                const smX = slimeBaseX + patrolOffset;
                const smR = Math.max(7, 14 * scale);
                const smY = groundY - smR - jumpOffset;

                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(smX, smY, smR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#86efac';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(smX - 4, smY - 3, 3, 4);
                ctx.fillRect(smX + 2, smY - 3, 3, 4);
            }

            // G. MONSTER SKELETON (SKELETON)
            else if (ent.type === 'skeleton') {
                const skelBaseX = toX(ent.col * 50 + 25);
                const patrolOffset = Math.sin(t * 1.2 + idx) * (14 * scale);
                const skX = skelBaseX + patrolOffset;
                const skW = Math.max(9, 22 * scale);
                const skH = Math.max(14, 38 * scale);
                const skY = groundY - skH;

                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(skX - skW / 2, skY, skW, skH);
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(skX - skW / 2, skY, skW, skH);

                ctx.fillStyle = '#ef4444';
                ctx.fillRect(skX - 4, skY + 6, 3, 3);
                ctx.fillRect(skX + 2, skY + 6, 3, 3);
            }

            // H. LETAK SPAWN (PINTU PUTIH KEDATANGAN / PLAYER SPAWN)
            else if (ent.type === 'player') {
                const spawnX = toX(ent.x !== undefined ? ent.x : (ent.col * 50 + 25));
                const groundBaseY = (ent.row === 7) ? groundY : toY((ent.row + 1) * 50);

                // 1. PINTU PUTIH KEDATANGAN (WHITE DOOR / GERBANG SPAWN)
                const dw = Math.max(20, 36 * scale);
                const dh = Math.max(26, 48 * scale);
                const doorLeft = spawnX - dw / 2;
                const doorTop = groundBaseY - dh;

                // Aura Pendar Cahaya Kedatangan (Glow Pulse)
                const glowR = dw * 0.8 + Math.sin(t * 3) * (2 * scale);
                const glowGrad = ctx.createRadialGradient(spawnX, doorTop + dh * 0.5, dw * 0.2, spawnX, doorTop + dh * 0.5, glowR);
                glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
                glowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
                glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(spawnX, doorTop + dh * 0.5, glowR, 0, Math.PI * 2);
                ctx.fill();

                // Kusen Luar Pintu Putih
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(doorLeft - 2 * scale, doorTop - 2 * scale, dw + 4 * scale, dh + 2 * scale);
                ctx.strokeStyle = '#bae6fd';
                ctx.lineWidth = 1.8;
                ctx.strokeRect(doorLeft - 2 * scale, doorTop - 2 * scale, dw + 4 * scale, dh + 2 * scale);

                // Daun Pintu Putih (White Door Body)
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(doorLeft, doorTop, dw, dh);

                // Panel Kayu Vertikal Dalam Pintu
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(doorLeft + 3 * scale, doorTop + 4 * scale, dw * 0.4, dh * 0.42);
                ctx.fillRect(doorLeft + dw * 0.52, doorTop + 4 * scale, dw * 0.4, dh * 0.42);
                ctx.fillRect(doorLeft + 3 * scale, doorTop + dh * 0.52, dw * 0.4, dh * 0.42);
                ctx.fillRect(doorLeft + dw * 0.52, doorTop + dh * 0.52, dw * 0.4, dh * 0.42);

                // Gagang Pintu Emas (Golden Doorknob)
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(doorLeft + dw - 5 * scale, doorTop + dh * 0.54, 2.5 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Plakat Atas Tulisan "SPAWN"
                const signW = Math.max(26, 34 * scale);
                const signH = Math.max(8, 10 * scale);
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(spawnX - signW / 2, doorTop - signH / 2 - 2 * scale, signW, signH);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                ctx.strokeRect(spawnX - signW / 2, doorTop - signH / 2 - 2 * scale, signW, signH);
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(6.5, 7.5 * scale)}px 'JetBrains Mono'`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('SPAWN', spawnX, doorTop - 2 * scale);

                // BADGE TEKS DI ATAS PINTU SPAWN
                ctx.fillStyle = '#38bdf8';
                ctx.font = `bold ${Math.max(7.5, 8.5 * scale)}px 'JetBrains Mono'`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(`🚪 Letak Spawn (Col ${ent.col})`, spawnX, doorTop - signH - 3 * scale);
            }

            // I. FINISH / PORTAL (PORTAL)
            else if (ent.type === 'portal') {
                const portalX = toX(ent.x !== undefined ? ent.x : (ent.col * 50 + 25));
                const isReturn = ent.isReturnPortal || (ent.label && ent.label.includes('Scene 1'));

                if (isReturn || this.state.biome === 'hongkong') {
                    // Portal Cincin Biru Balik ← Scene 1 (Persis di HongKongScene)
                    const portalR = Math.max(11, 20 * scale);
                    const portalY = toY(ent.y !== undefined ? ent.y : 376);

                    ctx.strokeStyle = '#7dd3fc';
                    ctx.lineWidth = 2.2;
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
                    ctx.beginPath();
                    ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Ikon panah mundur
                    ctx.fillStyle = '#bae6fd';
                    ctx.font = `bold ${Math.max(10, 14 * scale)}px 'JetBrains Mono'`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('<', portalX, portalY);

                    // Label nama portal
                    ctx.font = `bold ${Math.max(7.5, 8.5 * scale)}px 'JetBrains Mono'`;
                    ctx.fillText(ent.label || '← Scene 1', portalX, portalY - portalR - 6);
                } else {
                    const portalR = Math.max(14, 24 * scale);
                    const portalY = groundY - cellSize / 2;

                    ctx.save();
                    ctx.translate(portalX, portalY);
                    ctx.rotate(t * 3);

                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, portalR, 0, Math.PI * 1.6);
                    ctx.stroke();

                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, portalR * 0.6, 0, Math.PI * 1.4);
                    ctx.stroke();

                    ctx.restore();

                    ctx.fillStyle = '#e0f2fe';
                    ctx.beginPath();
                    ctx.arc(portalX, portalY, 5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#38bdf8';
                    ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
                    ctx.textAlign = 'center';
                    ctx.fillText('GOAL', portalX, portalY - portalR - 4);
                }
            }
        });

        // ===============================================================
        // 7. MINIATURE SQUARE GRID OVERLAY (100% KOTAK PERSEGI PRESISI)
        // ===============================================================
        if (this.state.showGrid) {
            ctx.save();
            ctx.lineWidth = 1;

            // Garis Vertikal (Setiap 50px dari Col 0 sampai Col totalCols)
            for (let col = 0; col <= totalCols; col++) {
                const rx = toX(col * 50);
                const isMajor = (col % 5) === 0;

                ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, H);
                ctx.stroke();

                if (isMajor && col >= 0 && col <= totalCols) {
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
                    ctx.font = "8.5px 'JetBrains Mono'";
                    ctx.textAlign = 'center';
                    ctx.fillText(`${col * 50}`, rx, 14);
                }
            }

            // Garis Horizontal (Setiap 50px dari Row 0 sampai totalRows)
            for (let r = 0; r <= totalRows; r++) {
                const ry = toY(r * 50);
                if (ry > H) break;

                const isGroundLine = (r === groundRow);
                const isBedrockLine = (r === bedrockRow);

                if (isGroundLine) {
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
                    ctx.lineWidth = 1.5;
                } else if (isBedrockLine) {
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.lineWidth = 1;
                }

                ctx.beginPath();
                ctx.moveTo(0, ry);
                ctx.lineTo(W, ry);
                ctx.stroke();

                if (isGroundLine) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = "bold 8.5px 'JetBrains Mono'";
                    ctx.textAlign = 'left';
                    ctx.fillText('GROUND (Row 8: y=400)', 8, ry - 3);
                }
            }

            // Hover Cursor Tile Highlight (Kotak Persegi yang Sedang Disorot Mouse)
            if (this.hoverTile) {
                const hx = toX(this.hoverTile.col * 50);
                const hy = toY(this.hoverTile.row * 50);
                const occ = this.getOccupyingEntity(this.hoverTile.col, this.hoverTile.row, this.isCanvasDragging ? this.canvasDragEntity?.id : null);

                if (occ) {
                    // Kotak Terisi (Merah: DILARANG DITIMBUN / TERKUNCI)
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
                    ctx.fillRect(hx, hy, cellSize, cellSize);

                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 2]);
                    ctx.strokeRect(hx, hy, cellSize, cellSize);
                    ctx.setLineDash([]);

                    // Tanda silang merah halus di tengah petak
                    ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(hx + cellSize * 0.3, hy + cellSize * 0.3);
                    ctx.lineTo(hx + cellSize * 0.7, hy + cellSize * 0.7);
                    ctx.moveTo(hx + cellSize * 0.7, hy + cellSize * 0.3);
                    ctx.lineTo(hx + cellSize * 0.3, hy + cellSize * 0.7);
                    ctx.stroke();
                } else {
                    // Kotak Kosong (Cyan: TERSEDIA / BEBAS DIISI)
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                    ctx.fillRect(hx, hy, cellSize, cellSize);

                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(hx, hy, cellSize, cellSize);
                    ctx.setLineDash([]);
                }
            }

            ctx.restore();
        }

        // ===============================================================
        // 8. UNITY TRANSFORM GIZMOS ON SELECTED OBJECT
        // ===============================================================
        if (this.state.showGizmos && this.state.selectedId) {
            const selObj = this.state.entities.find(e => e.id === this.state.selectedId);
            if (selObj) {
                const boxX = toX(selObj.col * 50);
                const boxY = toY(selObj.row * 50);
                const boxW = (selObj.wTiles || 1) * cellSize;
                const boxH = (selObj.hTiles || 1) * cellSize;

                ctx.save();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(boxX, boxY, boxW, boxH);
                ctx.setLineDash([]);

                // Transform corner handles
                ctx.fillStyle = '#ffffff';
                const corners = [
                    [boxX, boxY],
                    [boxX + boxW, boxY],
                    [boxX, boxY + boxH],
                    [boxX + boxW, boxY + boxH]
                ];
                corners.forEach(([cx, cy]) => {
                    ctx.fillRect(cx - 3, cy - 3, 6, 6);
                });

                ctx.restore();
            }
        }

        // ===============================================================
        // 9. MULTI-SELECTION MARQUEE BOX OVERLAY (ULTRA-SMOOTH PIXEL + GRID SNAPPED)
        // ===============================================================
        const bounds = this.getSelectionBounds();
        if (bounds) {
            const bx = toX(bounds.minCol * 50);
            const by = toY(bounds.minRow * 50);
            const bw = bounds.width * cellSize;
            const bh = bounds.height * cellSize;

            ctx.save();

            // A. Petak grid yang tersorot di bawahnya (Smooth individual cell highlight glow)
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
                    const tx = toX(c * 50);
                    const ty = toY(r * 50);
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                    ctx.fillRect(tx + 1, ty + 1, cellSize - 2, cellSize - 2);
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx + 0.5, ty + 0.5, cellSize - 1, cellSize - 1);
                }
            }

            // B. Jika sedang dragging aktif: Kotak pixel-smooth mengikuti kursor secara instan (60fps)
            if (this.isBoxSelecting && this.dragPixelBox) {
                const pxMinX = Math.min(this.dragPixelBox.startX, this.dragPixelBox.currentX);
                const pxMaxX = Math.max(this.dragPixelBox.startX, this.dragPixelBox.currentX);
                const pxMinY = Math.min(this.dragPixelBox.startY, this.dragPixelBox.currentY);
                const pxMaxY = Math.max(this.dragPixelBox.startY, this.dragPixelBox.currentY);
                const pxW = pxMaxX - pxMinX;
                const pxH = pxMaxY - pxMinY;

                ctx.fillStyle = 'rgba(14, 165, 233, 0.14)';
                ctx.fillRect(pxMinX, pxMinY, pxW, pxH);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.6;
                ctx.setLineDash([5, 3]);
                ctx.lineDashOffset = -(t * 26) % 8;
                ctx.strokeRect(pxMinX, pxMinY, pxW, pxH);
                ctx.setLineDash([]);
            }

            // C. Garis Luar Snapped Grid Marquee dengan Animasi Halus
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2.2;
            const dashOffset = (t * 20) % 12;
            ctx.setLineDash([6, 3]);
            ctx.lineDashOffset = -dashOffset;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.setLineDash([]);

            // Grid Inner Guides jika area seleksi > 1 petak
            if (bounds.width > 1 || bounds.height > 1) {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.lineWidth = 1;
                for (let c = 1; c < bounds.width; c++) {
                    const gx = bx + c * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(gx, by);
                    ctx.lineTo(gx, by + bh);
                    ctx.stroke();
                }
                for (let r = 1; r < bounds.height; r++) {
                    const gy = by + r * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(bx, gy);
                    ctx.lineTo(bx + bw, gy);
                    ctx.stroke();
                }
            }

            // D. 4 Titik Sudut Transform Bersinar (Hanya saat drag selesai)
            if (!this.isBoxSelecting) {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 1.5;
                const handleCorners = [
                    [bx, by],
                    [bx + bw, by],
                    [bx, by + bh],
                    [bx + bw, by + bh]
                ];
                handleCorners.forEach(([cx, cy]) => {
                    ctx.fillRect(cx - 3.5, cy - 3.5, 7, 7);
                    ctx.strokeRect(cx - 3.5, cy - 3.5, 7, 7);
                });
            }

            ctx.restore();
        }

        // ===============================================================
        // 9.5 VISUAL FLASH EFFECTS (BATCH FILL / DELETE RIPPLE)
        // ===============================================================
        if (this.selectionFlashes && this.selectionFlashes.length > 0) {
            const now = performance.now();
            this.selectionFlashes = this.selectionFlashes.filter(flash => {
                const elapsed = now - flash.startTime;
                if (elapsed >= flash.duration) return false;
                const progress = elapsed / flash.duration;
                const alpha = Math.max(0, (1 - progress) * flash.maxAlpha);
                ctx.save();
                ctx.fillStyle = flash.color.replace('ALPHA', alpha.toFixed(3));
                ctx.fillRect(flash.x, flash.y, flash.w, flash.h);
                ctx.strokeStyle = flash.strokeColor.replace('ALPHA', Math.min(1, alpha * 2).toFixed(3));
                ctx.lineWidth = 2.5;
                ctx.strokeRect(flash.x, flash.y, flash.w, flash.h);
                ctx.restore();
                return true;
            });
        }

        // ===============================================================
        // 8. LIVE CAMERA VIEWPORT FRUSTUM (Dynamic Sync dengan Kamera Game)
        // ===============================================================
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            const cam = this.scene.cameras.main;
            const camZoom = cam.zoom || 1;
            const camW = cam.width / camZoom;
            const camH = cam.height / camZoom;
            const camX = cam.scrollX;
            const camY = cam.scrollY;

            const bx = toX(camX);
            const by = toY(camY);
            const bw = camW * scale;
            const bh = camH * scale;

            ctx.save();
            // Garis putus-putus cyan penanda area layar yang sedang dilihat pemain di game
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([6 * scale, 4 * scale]);
            ctx.strokeRect(bx, by, bw, bh);

            // Shading transparan agar area kamera tampak fokus
            ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.fillRect(bx, by, bw, bh);

            // Badge penanda di sudut kiri atas kotak kamera
            ctx.setLineDash([]);
            const zoomPct = Math.round(camZoom * 100);
            const wTiles = Math.round(camW / 50);
            const hTiles = Math.round(camH / 50);
            const badgeText = `📷 AREA KAMERA GAME (${zoomPct}% • ${wTiles}x${hTiles} petak)`;

            ctx.font = `bold ${Math.max(7.5, 8.5 * scale)}px 'JetBrains Mono'`;
            const textWidth = ctx.measureText(badgeText).width;
            const bWidth = textWidth + 14;
            const bHeight = Math.max(16, 17 * scale);
            ctx.fillStyle = 'rgba(2, 132, 199, 0.92)';
            ctx.fillRect(bx, by, bWidth, bHeight);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, bx + 6, by + bHeight / 2);
            ctx.restore();
        }

        // ===============================================================
        // 9. LIVE TEST-PLAY CHARACTER SIMULATION (ULTRA-SMOOTH 60FPS WASD)
        // ===============================================================
        if (this.testPlayer) {
            const tp = this.testPlayer;
            const maxSpeed = 5.2;
            const accel = 0.9;
            const friction = 0.78;

            if (this.testKeys.a) {
                tp.vx = Math.max(-maxSpeed, tp.vx - accel);
                tp.facing = -1;
            } else if (this.testKeys.d) {
                tp.vx = Math.min(maxSpeed, tp.vx + accel);
                tp.facing = 1;
            } else {
                tp.vx *= friction;
                if (Math.abs(tp.vx) < 0.05) tp.vx = 0;
            }

            if ((this.testKeys.w || this.testKeys.space) && tp.isGrounded) {
                tp.vy = -12.2;
                tp.isGrounded = false;
                AudioManager.playJump();
            }

            // Gravitasi halus
            tp.vy += 0.58;
            if (tp.vy > 14) tp.vy = 14;

            tp.x += tp.vx;
            tp.y += tp.vy;

            // Batas layar horizontal
            const worldW = this.state.worldWidth || 1800;
            tp.x = Math.max(15, Math.min(worldW - 15, tp.x));

            const pCol = Math.max(0, Math.min(Math.floor((worldW - 1) / 50), Math.floor(tp.x / 50)));

            // Kumpulkan semua batas lantai potensial di bawah pemain
            const floorCandidates = [];

            // 1. Bedrock (Row 13 = y: 650) selalu padat tak tertembus
            floorCandidates.push(13 * 50);

            // 2. Lapisan tanah alamiah (Row 8..12) yang belum digali
            for (let r = 8; r < 13; r++) {
                const isDug = this.state.dugTiles && this.state.dugTiles.has(`${pCol},${r}`);
                const hasT = (r === 8) ? this.hasTerrainAt(pCol, 8) : true;
                if (!isDug && hasT) {
                    floorCandidates.push(r * 50);
                    break;
                }
            }

            // 3. Pijakan buatan (platforms, dirt, chest)
            this.state.entities.forEach(ent => {
                if (['platforms', 'dirt', 'chest'].includes(ent.type)) {
                    const eCol = ent.col;
                    const eRow = (ent.row !== undefined) ? ent.row : 7;
                    if (pCol === eCol) {
                        floorCandidates.push(eRow * 50);
                    }
                }
            });

            floorCandidates.sort((a, b) => a - b);
            let targetFloor = 13 * 50; // default Bedrock jika tanah berlubang
            for (const fl of floorCandidates) {
                if (tp.y <= fl + 14 && (tp.y + tp.vy >= fl - 2 || tp.y >= fl - 2)) {
                    targetFloor = fl;
                    break;
                }
            }

            if (tp.y >= targetFloor) {
                tp.y = targetFloor;
                tp.vy = 0;
                tp.isGrounded = true;
            } else {
                tp.isGrounded = false;
            }

            // Animasi langkah kaki dinamis (bobbing & tilt)
            if (tp.isGrounded && Math.abs(tp.vx) > 0.3) {
                tp.walkTime = (tp.walkTime || 0) + 0.28;
            } else {
                tp.walkTime = 0;
            }
            const walkBob = tp.isGrounded ? Math.abs(Math.sin(tp.walkTime)) * (2.8 * scale) : 0;
            const walkTilt = tp.isGrounded ? Math.sin(tp.walkTime) * 0.08 : (tp.vy < 0 ? -0.09 * tp.facing : 0.07 * tp.facing);

            // Sinkronisasi kamera game agar kotak cyan mengikuti pergerakan karakter uji
            if (this.scene && this.scene.cameras && this.scene.cameras.main) {
                const camWVal = this.scene.cameras.main.width / (this.scene.cameras.main.zoom || 1);
                this.scene.cameras.main.scrollX = Math.max(0, Math.min(worldW - camWVal, tp.x - camWVal / 2));
            }

            // Gambar Karakter Player Uji Coba di Kanvas
            const px = toX(tp.x);
            const py = toY(tp.y) - walkBob;
            const pw = Math.max(12, 22 * scale);
            const ph = Math.max(16, 32 * scale);

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(walkTilt);

            // Bayangan Kaki
            ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, walkBob, pw * 0.65, 3.5 * scale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pendar Aura Halus
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8 * scale;

            // Tubuh Karakter
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-pw / 2, -ph, pw, ph);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.8;
            ctx.strokeRect(-pw / 2, -ph, pw, ph);
            ctx.shadowBlur = 0;

            // Mata Putih & Pupil
            const eyeOff = tp.facing * (3 * scale);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(eyeOff - 3 * scale, -ph + 6 * scale, 4 * scale, 4 * scale);
            ctx.fillRect(eyeOff + 2 * scale, -ph + 6 * scale, 4 * scale, 4 * scale);
            ctx.fillStyle = '#000000';
            const lookY = !tp.isGrounded ? (tp.vy < 0 ? -1 * scale : 1 * scale) : 0;
            ctx.fillRect(eyeOff - (tp.facing > 0 ? 1 : 3) * scale, -ph + 7 * scale + lookY, 2 * scale, 2 * scale);
            ctx.fillRect(eyeOff + (tp.facing > 0 ? 4 : 2) * scale, -ph + 7 * scale + lookY, 2 * scale, 2 * scale);

            // Label Floating "🏃 PEMAIN (WASD)"
            ctx.fillStyle = 'rgba(2, 132, 199, 0.95)';
            const tagW = Math.max(68, 84 * scale);
            const tagH = Math.max(14, 15 * scale);
            ctx.fillRect(-tagW / 2, -ph - tagH - 4 * scale, tagW, tagH);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(-tagW / 2, -ph - tagH - 4 * scale, tagW, tagH);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(6.5, 7.5 * scale)}px 'JetBrains Mono'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏃 PEMAIN (WASD)', 0, -ph - tagH / 2 - 4 * scale);
            ctx.restore();
        }
    }

    loadWorldData(data, projectId = null, sceneId = null) {
        if (!data) return;
        if (projectId) this.projectId = projectId;
        if (sceneId) this.sceneId = sceneId;
        else if (data.id) this.sceneId = data.id;

        if (data.name) this.state.name = data.name;
        this.state.biome = data.biome || 'dirt';
        this.state.timeOfDay = data.timeOfDay || 'day';
        this.state.worldWidth = (!data.worldWidth || data.worldWidth <= 1800) ? 3600 : data.worldWidth;
        this.state.worldHeight = (!data.worldHeight || data.worldHeight <= 700) ? 1000 : data.worldHeight;

        if (data.dugTiles && Array.isArray(data.dugTiles)) {
            this.state.dugTiles = new Set(data.dugTiles);
        } else if (!this.state.dugTiles) {
            this.state.dugTiles = new Set();
        }

        if (Array.isArray(data.entities)) {
            this.state.entities = JSON.parse(JSON.stringify(data.entities));
            // PASTIKAN OBJEK LETAK SPAWN (PINTU PUTIH) SELALU ADA SECARA DEFAULT
            const playerEnt = this.state.entities.find(e => e.type === 'player');
            if (!playerEnt) {
                this.state.entities.unshift({
                    id: 'player_1',
                    type: 'player',
                    col: 2,
                    row: 7,
                    x: 125,
                    y: 400,
                    label: 'Letak Spawn (Pintu Putih)',
                    cat: 'spawn',
                    icon: '🚪',
                    wTiles: 1,
                    hTiles: 1
                });
            } else {
                playerEnt.icon = '🚪';
                if (!playerEnt.label || playerEnt.label === 'Player' || playerEnt.label === 'Player Spawn' || playerEnt.label === 'Pemain') {
                    playerEnt.label = 'Letak Spawn (Pintu Putih)';
                }
            }

            // PASTIKAN PORTAL FINISH SELALU ADA DI UJUNG DUNIA
            const portalEnt = this.state.entities.find(e => e.type === 'portal');
            const targetPortalCol = Math.max(10, Math.floor(this.state.worldWidth / 50) - 2);
            if (!portalEnt) {
                this.state.entities.push({
                    id: 'portal_1',
                    type: 'portal',
                    col: targetPortalCol,
                    row: 7,
                    x: targetPortalCol * 50 + 25,
                    y: 400,
                    label: 'Goal Portal Finish',
                    cat: 'solid',
                    icon: '🌀',
                    wTiles: 1,
                    hTiles: 1
                });
            } else if (portalEnt.col <= 35 && this.state.worldWidth >= 3000) {
                portalEnt.col = targetPortalCol;
                portalEnt.x = targetPortalCol * 50 + 25;
            }
        } else {
            const targetPortalCol = Math.max(10, Math.floor(this.state.worldWidth / 50) - 2);
            this.state.entities = [
                { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Letak Spawn (Pintu Putih)', cat: 'spawn', icon: '🚪', wTiles: 1, hTiles: 1 },
                { id: 'portal_1', type: 'portal', col: targetPortalCol, row: 7, x: targetPortalCol * 50 + 25, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
            ];
        }

        // Pastikan seluruh rentang kolom dunia di Row 8 terisi balok tanah solid (kecuali yang sengaja digali)
        const totalCols = Math.ceil(this.state.worldWidth / 50);
        if (data.terrainTiles && Array.isArray(data.terrainTiles) && data.terrainTiles.length > 0) {
            this.state.terrainTiles = new Set(data.terrainTiles);
            for (let c = 0; c < totalCols; c++) {
                const k = `${c},8`;
                if (!this.state.dugTiles.has(k) && !this.state.terrainTiles.has(k) && (!data.dugTiles || !data.dugTiles.includes(k))) {
                    this.state.terrainTiles.add(k);
                }
            }
        } else {
            const tSet = new Set();
            for (let c = 0; c < totalCols; c++) {
                const k = `${c},8`;
                if (!this.state.dugTiles.has(k)) tSet.add(k);
            }
            this.state.terrainTiles = tSet;
        }

        // Sinkronisasi tombol biome di UI
        if (this.overlay) {
            this.overlay.querySelectorAll('.gt-sb-biome-btn').forEach(btn => {
                if (btn.getAttribute('data-biome') === this.state.biome) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Render ulang bila DOM sudah terbentuk
        if (this.titleInput) this.titleInput.value = this.state.name;
        if (typeof this.preventAllOverlaps === 'function') this.preventAllOverlaps();
        if (typeof this.renderHierarchy === 'function') this.renderHierarchy();
        if (typeof this.renderInspector === 'function') this.renderInspector();
    }

    syncWithActiveScene(scene) {
        if (!scene) {
            if (window.__templateGame && window.__templateGame.scene) {
                const activeScenes = window.__templateGame.scene.getScenes(true) || [];
                scene = activeScenes.find(s => ['GameScene', 'HongKongScene', 'Scene2', 'CustomWorldScene', 'Scene3'].includes(s.scene && s.scene.key)) || activeScenes[0];
            }
        }
        if (!scene || !scene.scene) return;
        this.scene = scene;
        const sceneKey = scene.scene.key;

        // 1. JIKA SEDANG DI SCENE 1 (Tutorial - Lembah Salju)
        if (sceneKey === 'GameScene') {
            const playerX = scene.player ? scene.player.x : 125;
            const playerCol = Math.max(1, Math.min(26, Math.floor(playerX / 50)));

            const terrain = new Set();
            for (let c = 0; c < 28; c++) {
                terrain.add(`${c},8`);
            }

            const data = {
                name: 'Level 1 • Lembah Salju',
                biome: 'snow',
                timeOfDay: 'day',
                worldWidth: 1400,
                worldHeight: 850,
                entities: [
                    { id: 'player_1', type: 'player', col: playerCol, row: 7, x: playerCol * 50 + 25, y: 400, label: 'Player Spawn', cat: 'creature', icon: '👤', wTiles: 1, hTiles: 1 },
                    { id: 'npc_1', type: 'npc', col: 4, row: 7, x: 225, y: 400, label: 'Penjaga Gerbang (NPC)', cat: 'creature', icon: '🧙', wTiles: 1, hTiles: 1 },
                    { id: 'spikes_1', type: 'spikes', col: 11, row: 7, x: 575, y: 400, label: 'Rintangan Duri Salju #1', cat: 'solid', icon: '⚠️', wTiles: 1, hTiles: 1 },
                    { id: 'spikes_2', type: 'spikes', col: 12, row: 7, x: 625, y: 400, label: 'Rintangan Duri Salju #2', cat: 'solid', icon: '⚠️', wTiles: 1, hTiles: 1 },
                    { id: 'platform_1', type: 'platforms', col: 8, row: 6, x: 425, y: 300, label: 'Pijakan Salju #1', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                    { id: 'platform_2', type: 'platforms', col: 9, row: 6, x: 475, y: 300, label: 'Pijakan Salju #2', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                    { id: 'platform_3', type: 'platforms', col: 10, row: 6, x: 525, y: 300, label: 'Pijakan Salju #3', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                    { id: 'platform_4', type: 'platforms', col: 14, row: 4, x: 725, y: 200, label: 'Pijakan Tinggi #1', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                    { id: 'platform_5', type: 'platforms', col: 15, row: 4, x: 775, y: 200, label: 'Pijakan Tinggi #2', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                    { id: 'coins_1', type: 'coins', col: 11, row: 4, x: 575, y: 200, label: 'Koin Emas Murni', cat: 'solid', icon: '🪙', wTiles: 1, hTiles: 1 },
                    { id: 'portal_1', type: 'portal', col: 23, row: 7, x: 1175, y: 400, label: 'Portal ke Scene 2', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
                ],
                terrainTiles: Array.from(terrain)
            };
            this.loadWorldData(data);
            return;
        }

        // 2. JIKA SEDANG DI SCENE 2 (Teluk Hong Kong) - DYNAMIC RUNTIME SYNC
        if (sceneKey === 'HongKongScene' || sceneKey === 'Scene2') {
            const playerX = scene.player ? scene.player.x : 175;
            const playerY = scene.player ? scene.player.y : 378;
            const playerCol = Math.max(0, Math.min(38, Math.floor(playerX / 50)));

            const entities = [
                { id: 'player_1', type: 'player', col: playerCol, row: 7, x: playerX, y: playerY, label: 'Pemain', cat: 'creature', icon: '👤', wTiles: 1, hTiles: 1 }
            ];

            // 1. Portal Balik Kiri (← Scene 1)
            const pX = (scene.portalBack && scene.portalBack.x) || 75;
            const pY = (scene.portalBack && scene.portalBack.y) || 376;
            entities.push({
                id: 'portal_back',
                type: 'portal',
                col: Math.floor(pX / 50),
                row: 7,
                x: pX,
                y: pY,
                label: '← Scene 1',
                cat: 'solid',
                icon: '🌀',
                wTiles: 1,
                hTiles: 1,
                isReturnPortal: true
            });

            // 2. NPC Kapten Chen
            const npcX = (scene.npc && scene.npc.x) || 325;
            const npcY = (scene.npc && scene.npc.y) || 378;
            entities.push({
                id: 'npc_chen',
                type: 'npc',
                col: Math.floor(npcX / 50),
                row: 7,
                x: npcX,
                y: npcY,
                label: (scene.npcData && scene.npcData.name) || 'Kapten Chen (NPC)',
                cat: 'creature',
                icon: '🧙',
                wTiles: 1,
                hTiles: 1
            });

            // 3. Hazard Ombak Pecah
            const hX = (scene.hazard && scene.hazard.x) || 875;
            const hY = (scene.hazard && scene.hazard.y) || 388;
            entities.push({
                id: 'hazard_ombak',
                type: 'spikes',
                col: Math.floor(hX / 50),
                row: 7,
                x: hX,
                y: hY,
                label: 'Ombak Pecah',
                cat: 'solid',
                icon: '⚠️',
                wTiles: 1,
                hTiles: 1,
                isWaveHazard: true
            });

            // 4. Platforms Dermaga (Peti Pelabuhan & Karang Tinggi)
            entities.push(
                { id: 'platform_hk1', type: 'platforms', col: 8, row: 7, x: 450, y: 350, label: 'Peti Dermaga #1', cat: 'solid', icon: '🧱', wTiles: 2, hTiles: 1 },
                { id: 'platform_hk2', type: 'platforms', col: 14, row: 6, x: 750, y: 300, label: 'Peti Dermaga #2', cat: 'solid', icon: '🧱', wTiles: 2, hTiles: 1 },
                { id: 'platform_hk3', type: 'platforms', col: 22, row: 5, x: 1150, y: 250, label: 'Batu Karang Tinggi', cat: 'solid', icon: '🧱', wTiles: 2, hTiles: 1 },
                { id: 'platform_hk4', type: 'platforms', col: 29, row: 6, x: 1500, y: 300, label: 'Peti Dermaga #3', cat: 'solid', icon: '🧱', wTiles: 2, hTiles: 1 }
            );

            // 5. Item Quest: Mutiara Victoria (Hanya tampil jika belum dikoleksi)
            const isPearlCollected = scene.collectedItemIds && scene.collectedItemIds.includes('mutiara_victoria');
            if (!isPearlCollected) {
                const pearlX = (scene.questItem && scene.questItem.x) || 1150;
                const pearlY = (scene.questItem && scene.questItem.y) || 215;
                entities.push({
                    id: 'quest_pearl',
                    type: 'quest_item',
                    subType: 'pearl',
                    col: Math.floor(pearlX / 50),
                    row: 4,
                    x: pearlX,
                    y: pearlY,
                    label: 'Mutiara Victoria',
                    cat: 'solid',
                    icon: '🔮',
                    wTiles: 1,
                    hTiles: 1
                });
            }

            const terrain = new Set();
            for (let c = 0; c < 40; c++) {
                terrain.add(`${c},8`);
            }

            const data = {
                name: 'Level 2 • Teluk Hong Kong',
                biome: 'hongkong',
                timeOfDay: 'night',
                worldWidth: 2000,
                worldHeight: 850,
                entities: entities,
                terrainTiles: Array.from(terrain)
            };

            // Update ruler labels agar presisi
            if (this.overlay) {
                const rulerSpawn = this.overlay.querySelector('#ruler-spawn-txt');
                const rulerFinish = this.overlay.querySelector('#ruler-finish-txt');
                if (rulerSpawn) rulerSpawn.textContent = `[Col ${playerCol}: ${Math.round(playerX)}px] PLAYER`;
                if (rulerFinish) rulerFinish.textContent = `[Col 1: 75px] ← SCENE 1`;
            }

            this.loadWorldData(data);
            return;
        }

        // 3. JIKA SEDANG DI CUSTOM WORLD SCENE
        if (sceneKey === 'CustomWorldScene' && scene.worldData) {
            const data = JSON.parse(JSON.stringify(scene.worldData));
            if (scene.dugTiles) {
                data.dugTiles = Array.from(scene.dugTiles);
            }
            if (scene.player) {
                this.runtimePlayerX = scene.player.x;
                this.runtimePlayerY = scene.player.y;
            }
            this.loadWorldData(data);
            return;
        }
    }

    show(targetScene = null) {
        this.runtimePlayerX = null;
        this.runtimePlayerY = null;
        const sceneToSync = targetScene || this.scene;
        this.syncWithActiveScene(sceneToSync);

        this._isOpen = true;
        this.overlay.classList.remove('hidden');

        if (typeof this.switchEditorMode === 'function') {
            this.switchEditorMode('scene');
        }

        // Buka langsung dalam mode Uji Gerak aktif agar WASD langsung bisa dimainkan dengan smooth
        this.toggleTestPlayMode(true);

        setTimeout(() => {
            this.resizeCanvas();
            this.startPreviewLoop();
        }, 30);

        if (this.scene) {
            if (this.scene.player && this.scene.player.body) {
                this.scene.player.setVelocity(0, 0);
            }
            if (this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = false;
            }
        }
    }

    hide() {
        if (!this.overlay) return;
        this._isOpen = false;
        this.isTestPlayMode = false;
        this.testPlayer = null;
        this.testKeys = { w: false, a: false, s: false, d: false, space: false };
        const testBtn = this.overlay.querySelector('#gt-sb-btn-testplay');
        if (testBtn) {
            testBtn.classList.remove('active');
            testBtn.innerHTML = '<span>🎮 Uji Gerak (WASD)</span>';
        }
        this.boxSelection = null;
        this.isBoxSelecting = false;
        this.dragPixelBox = null;
        this.hideQuickToolbar();
        this.overlay.classList.add('hidden');
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = true;
        }
    }

    toggle() {
        if (this._isOpen) this.hide();
        else this.show();
    }

    isOpen() {
        return this._isOpen;
    }

    destroy() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this._escHandler) window.removeEventListener('keydown', this._escHandler);
        if (this._keyUpHandler) window.removeEventListener('keyup', this._keyUpHandler);
        if (this._globalMouseMove) window.removeEventListener('mousemove', this._globalMouseMove);
        if (this._globalMouseUp) window.removeEventListener('mouseup', this._globalMouseUp);
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
