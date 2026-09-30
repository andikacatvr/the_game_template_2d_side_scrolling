import { AudioManager } from '../utils/AudioManager.js';

// Katalog Item Template untuk World Builder (Setiap Objek adalah Unit Kotak 1x1)
export const ITEM_TEMPLATES = {
    player: { type: 'player', label: 'Player Spawn (1x1)', icon: '👤', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Titik awal pemain muncul di dunia (1x1)' },
    npc: { type: 'npc', label: 'NPC Guide (1x1)', icon: '🧙', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Karakter interaktif pemberi info (1x1)' },
    slime: { type: 'slime', label: 'Monster Slime (1x1)', icon: '🟢', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Musuh melompat berlendir (1x1)' },
    skeleton: { type: 'skeleton', label: 'Monster Skeleton (1x1)', icon: '💀', cat: 'creature', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Musuh tengkorak berpatroli (1x1)' },
    platforms: { type: 'platforms', label: 'Pijakan (1x1)', icon: '🧱', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 5, desc: 'Balok pijakan 1x1 (otomatis menyatu saat berjejer)' },
    spikes: { type: 'spikes', label: 'Rintangan Duri (1x1)', icon: '⚠️', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Jebakan duri runcing 1x1' },
    chest: { type: 'chest', label: 'Peti Harta (1x1)', icon: '📦', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Peti rahasia berisi hadiah 1x1' },
    coins: { type: 'coins', label: 'Koin Emas (1x1)', icon: '🪙', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 4, desc: 'Koin koleksi penambah skor 1x1' },
    portal: { type: 'portal', label: 'Portal Finish (1x1)', icon: '🌀', cat: 'solid', wTiles: 1, hTiles: 1, defaultRow: 7, desc: 'Gerbang finish kemenangan 1x1' },
    water: { type: 'water', label: 'Blok Air (1x1)', icon: '🌊', cat: 'fluid', wTiles: 1, hTiles: 1, defaultRow: 8, desc: 'Blok cairan air 1x1 (otomatis menyatu menjadi kolam saat berjejer)' },
    lava: { type: 'lava', label: 'Blok Lava (1x1)', icon: '🌋', cat: 'fluid', wTiles: 1, hTiles: 1, defaultRow: 8, desc: 'Blok cairan lava 1x1 (otomatis menyatu menjadi jurang lava saat berjejer)' }
};

export class SceneBuilderModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.animFrameId = null;

        // Default State (STANDARDIZED TILE MATRIX SNAP 50x50px)
        // 36 Kolom (0..35 = 1800px).
        // Baris 0..7 = Langit, Baris 8 = Permukaan Tanah (y = 400px), Baris 9+ = Subsoil & Bedrock.
        this.state = {
            name: 'Gurun Api Tengkorak',
            biome: 'desert', // 'dirt' | 'snow' | 'desert' | 'cave'
            timeOfDay: 'day', // 'day' | 'sunset' | 'night'
            showGrid: true,
            showGizmos: true,
            selectedId: 'player_1',
            activeTool: null, // item type yang sedang aktif untuk mode cap (stamp tool)
            worldWidth: 1800,
            worldHeight: 850,

            // Dynamic Entity List (Semua objek unit 1x1, otomatis menyatu bila berjejer)
            entities: [
                { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Player Spawn', cat: 'creature', icon: '👤', wTiles: 1, hTiles: 1 },
                { id: 'npc_1', type: 'npc', col: 6, row: 7, x: 325, y: 400, label: 'NPC Guide', cat: 'creature', icon: '🧙', wTiles: 1, hTiles: 1 },
                { id: 'spikes_1', type: 'spikes', col: 7, row: 7, x: 375, y: 400, label: 'Rintangan Duri', cat: 'solid', icon: '⚠️', wTiles: 1, hTiles: 1 },
                { id: 'slime_1', type: 'slime', col: 10, row: 7, x: 525, y: 400, label: 'Monster Slime', cat: 'creature', icon: '🟢', wTiles: 1, hTiles: 1 },
                { id: 'water_1', type: 'water', col: 11, row: 8, x: 575, y: 400, label: 'Blok Air #1', cat: 'fluid', icon: '🌊', wTiles: 1, hTiles: 1 },
                { id: 'water_2', type: 'water', col: 12, row: 8, x: 625, y: 400, label: 'Blok Air #2', cat: 'fluid', icon: '🌊', wTiles: 1, hTiles: 1 },
                { id: 'water_3', type: 'water', col: 13, row: 8, x: 675, y: 400, label: 'Blok Air #3', cat: 'fluid', icon: '🌊', wTiles: 1, hTiles: 1 },
                { id: 'platform_1', type: 'platforms', col: 12, row: 5, x: 625, y: 250, label: 'Pijakan #1', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                { id: 'platform_2', type: 'platforms', col: 13, row: 5, x: 675, y: 250, label: 'Pijakan #2', cat: 'solid', icon: '🧱', wTiles: 1, hTiles: 1 },
                { id: 'coins_1', type: 'coins', col: 12, row: 4, x: 625, y: 200, label: 'Koin Emas #1', cat: 'solid', icon: '🪙', wTiles: 1, hTiles: 1 },
                { id: 'coins_2', type: 'coins', col: 13, row: 4, x: 675, y: 200, label: 'Koin Emas #2', cat: 'solid', icon: '🪙', wTiles: 1, hTiles: 1 },
                { id: 'chest_1', type: 'chest', col: 15, row: 7, x: 775, y: 400, label: 'Peti Harta Karun', cat: 'solid', icon: '📦', wTiles: 1, hTiles: 1 },
                { id: 'lava_1', type: 'lava', col: 20, row: 8, x: 1025, y: 400, label: 'Blok Lava #1', cat: 'fluid', icon: '🌋', wTiles: 1, hTiles: 1 },
                { id: 'lava_2', type: 'lava', col: 21, row: 8, x: 1075, y: 400, label: 'Blok Lava #2', cat: 'fluid', icon: '🌋', wTiles: 1, hTiles: 1 },
                { id: 'lava_3', type: 'lava', col: 22, row: 8, x: 1125, y: 400, label: 'Blok Lava #3', cat: 'fluid', icon: '🌋', wTiles: 1, hTiles: 1 },
                { id: 'skeleton_1', type: 'skeleton', col: 30, row: 7, x: 1525, y: 400, label: 'Monster Skeleton', cat: 'creature', icon: '💀', wTiles: 1, hTiles: 1 },
                { id: 'portal_1', type: 'portal', col: 34, row: 7, x: 1725, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
            ]
        };

        this.animTime = 0;
        this.hoverTile = null; // { col, row }
        this.isCanvasDragging = false;
        this.canvasDragEntity = null;
        this.draggedHierarchyId = null;
        this.clipboardEntity = null; // Clipboard untuk Ctrl+C dan Ctrl+V

        this.createDOM();
        this.preventAllOverlaps();
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
                    font-weight: 600;
                    color: #71717a;
                    font-family: 'JetBrains Mono', monospace;
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

                /* Right Section Toolbar */
                .gt-sb-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
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
                .gt-sb-drawer {
                    height: 160px;
                    background: #131316;
                    border-top: 1px solid #27272a;
                    display: flex;
                    flex-direction: column;
                    padding: 8px 14px;
                    box-sizing: border-box;
                    flex-shrink: 0;
                    gap: 6px;
                    z-index: 10;
                }

                .gt-sb-drawer-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .gt-sb-drawer-title {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11.5px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                }

                .gt-sb-drawer-hint {
                    font-size: 10px;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    background: rgba(56, 189, 248, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                /* Backpack Category Tabs */
                .gt-sb-category-bar {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .gt-sb-cat-btn {
                    padding: 3px 10px;
                    border-radius: 4px;
                    background: #18181c;
                    border: 1px solid #27272a;
                    color: #a1a1aa;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.12s ease;
                    font-family: inherit;
                }

                .gt-sb-cat-btn:hover {
                    background: #222228;
                    color: #ffffff;
                }

                .gt-sb-cat-btn.active {
                    background: #172554;
                    color: #38bdf8;
                    border-color: #38bdf8;
                }

                .gt-sb-cat-count {
                    font-size: 9px;
                    font-family: 'JetBrains Mono', monospace;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.08);
                    color: #94a3b8;
                }

                /* Backpack Slots Grid (Draggable Chips) */
                .gt-sb-palette-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 6px;
                    overflow-y: auto;
                    flex: 1;
                    padding-right: 4px;
                }

                .gt-sb-palette-grid::-webkit-scrollbar {
                    width: 4px;
                }
                .gt-sb-palette-grid::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 2px;
                }

                .gt-sb-chip {
                    background: #18181c;
                    border: 1px solid #27272e;
                    border-radius: 5px;
                    padding: 5px 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: grab;
                    transition: all 0.12s ease;
                    height: 32px;
                    box-sizing: border-box;
                }

                .gt-sb-chip:active {
                    cursor: grabbing;
                }

                .gt-sb-chip:hover {
                    background: #222228;
                    border-color: #38bdf8;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                }

                .gt-sb-chip.stamp-active {
                    background: #172554;
                    border-color: #38bdf8;
                    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
                }

                .gt-sb-chip-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #e4e4e7;
                }

                .gt-sb-chip-badge {
                    font-size: 9px;
                    font-family: 'JetBrains Mono', monospace;
                    color: #a1a1aa;
                    background: rgba(255, 255, 255, 0.06);
                    padding: 1px 4px;
                    border-radius: 3px;
                }
            </style>

            <!-- 1. Top Unity-Style Toolbar -->
            <div class="gt-sb-topbar">
                <div class="gt-sb-topbar-left">
                    <div class="gt-sb-unity-brand">
                        <span class="gt-sb-unity-logo">🛠️</span>
                        <span class="gt-sb-unity-title">UNITY 2D ENGINE</span>
                    </div>
                    <span class="gt-sb-scene-tag">Scene: CustomWorld.scene</span>
                    <div class="gt-sb-input-wrap">
                        <input type="text" class="gt-sb-input-name" id="gt-sb-input-name" value="${this.state.name}" placeholder="Nama Level..." />
                        <button class="gt-sb-btn-random" id="gt-sb-btn-random" title="Pilih nama acak">🎲 Acak</button>
                    </div>
                </div>

                <div class="gt-sb-topbar-center">
                    <button class="gt-sb-play-btn" id="gt-sb-btn-enter" title="Play &amp; Uji Level ini secara langsung!">
                        <span>▶ Play World</span>
                    </button>
                    <button class="gt-sb-tool-toggle ${this.state.showGrid ? 'active' : ''}" id="gt-sb-btn-grid" title="Toggle Grid Persegi 50px">
                        <span>⊞ Grid: ON</span>
                    </button>
                    <button class="gt-sb-tool-toggle ${this.state.showGizmos ? 'active' : ''}" id="gt-sb-btn-gizmo" title="Toggle Transform Gizmo">
                        <span>◈ Gizmos</span>
                    </button>
                </div>

                <div class="gt-sb-topbar-right">
                    <div class="gt-sb-biome-group">
                        <button class="gt-sb-biome-btn ${this.state.biome === 'desert' ? 'active' : ''}" data-biome="desert">
                            <span>🏜️ Gurun</span>
                        </button>
                        <button class="gt-sb-biome-btn ${this.state.biome === 'snow' ? 'active' : ''}" data-biome="snow">
                            <span>❄️ Salju</span>
                        </button>
                        <button class="gt-sb-biome-btn ${this.state.biome === 'dirt' ? 'active' : ''}" data-biome="dirt">
                            <span>🌲 Hutan</span>
                        </button>
                        <button class="gt-sb-biome-btn ${this.state.biome === 'cave' ? 'active' : ''}" data-biome="cave">
                            <span>🌋 Gua</span>
                        </button>
                    </div>
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

                    <!-- Top Left Badge -->
                    <div class="gt-sb-stage-badge-topleft">
                        <div class="gt-sb-live-dot"></div>
                        <span class="gt-sb-stage-badge-title">SCENE VIEW (DRAG &amp; DROP READY)</span>
                    </div>

                    <!-- Top Right Badge -->
                    <div class="gt-sb-stage-badge-topright">
                        <span id="gt-sb-grid-info">GRID: 50px PERSEGI | CELL-CENTER SNAP READY</span>
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

            <!-- 3. Docked Growtopia Backpack Drawer -->
            <div class="gt-sb-drawer">
                <div class="gt-sb-drawer-header">
                    <div class="gt-sb-drawer-title">
                        <span>🎒</span> <span>GROWTOPIA BACKPACK PALETTE</span>
                        <span class="gt-sb-drawer-hint">Tarik item ke Kanvas / Hierarchy untuk meletakkannya!</span>
                    </div>

                    <!-- Growtopia Category Tabs -->
                    <div class="gt-sb-category-bar">
                        <button class="gt-sb-cat-btn active" data-cat="all">
                            <span>🎒 Semua</span>
                            <span class="gt-sb-cat-count" id="count-all">11</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="solid">
                            <span>🧱 Objek Padat</span>
                            <span class="gt-sb-cat-count" id="count-solid">5</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="creature">
                            <span>👥 Makhluk &amp; Karakter</span>
                            <span class="gt-sb-cat-count" id="count-creature">4</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="fluid">
                            <span>🌊 Cairan Bahaya</span>
                            <span class="gt-sb-cat-count" id="count-fluid">2</span>
                        </button>
                    </div>
                </div>

                <!-- Slots Grid (Draggable Chips) -->
                <div class="gt-sb-palette-grid" id="gt-sb-palette-grid">
                    <!-- Populated dynamically from ITEM_TEMPLATES -->
                </div>
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
            html += `
                <div class="gt-sb-chip ${isStampActive ? 'stamp-active' : ''}" 
                     draggable="true" 
                     data-type="${key}" 
                     data-cat="${tmpl.cat}"
                     title="${tmpl.desc} (Drag &amp; Drop ke Kanvas atau Hierarchy)">
                    <div class="gt-sb-chip-left">
                        <span>${tmpl.icon}</span>
                        <span>${tmpl.label}</span>
                    </div>
                    <span class="gt-sb-chip-badge">${tmpl.wTiles}x${tmpl.hTiles}</span>
                </div>
            `;
        }

        this.paletteGrid.innerHTML = html;

        // Pasang event Dragstart pada setiap chip backpack
        this.paletteGrid.querySelectorAll('.gt-sb-chip').forEach(chip => {
            chip.addEventListener('dragstart', (e) => {
                const type = chip.getAttribute('data-type');
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    source: 'backpack',
                    type: type
                }));
                e.dataTransfer.effectAllowed = 'copyMove';
            });

            // Klik untuk mengaktifkan Stamp Tool (mode cap langsung ke kanvas)
            chip.addEventListener('click', () => {
                AudioManager.playClick();
                const type = chip.getAttribute('data-type');
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
            html += `
                <div class="gt-sb-add-opt" data-type="${key}">
                    <span>${tmpl.icon}</span>
                    <span>${tmpl.label}</span>
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
     * Mengambil entitas yang menempati area grid [col..col+wTiles-1, row].
     * Mengembalikan objek entity jika ada, atau null jika kotak benar-benar kosong.
     */
    getOccupyingEntity(col, row, ignoreId = null, wTiles = 1) {
        const targetStartCol = col;
        const targetEndCol = col + Math.max(1, wTiles) - 1;

        return this.state.entities.find(e => {
            if (ignoreId && e.id === ignoreId) return false;

            const eRow = (e.row !== undefined) ? e.row : 7;
            if (eRow !== row) return false;

            const eStartCol = e.col;
            const eEndCol = e.col + (e.wTiles || 1) - 1;
            const hasColOverlap = Math.max(targetStartCol, eStartCol) <= Math.min(targetEndCol, eEndCol);

            return hasColOverlap;
        }) || null;
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
        let col = Math.max(0, Math.min(36 - safeW, preferredCol));
        let row = Math.max(0, Math.min(13, preferredRow));

        // Jika slot yang diinginkan sudah kosong, pakai langsung
        if (!this.isSlotOccupied(col, row, ignoreId, safeW)) {
            return { col, row };
        }

        // 1. Cari ke kanan pada baris yang sama
        for (let c = col + 1; c <= 36 - safeW; c++) {
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
        for (let offset = 1; offset <= 6; offset++) {
            for (const r of [row - offset, row + offset]) {
                if (r >= 0 && r <= 13) {
                    if (!this.isSlotOccupied(col, r, ignoreId, safeW)) {
                        return { col, row: r };
                    }
                    for (let c = col + 1; c <= 36 - safeW; c++) {
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

        const wTiles = tmpl.wTiles || 1;

        // JIKA MENEMPATKAN DI KOTAK SPESIFIK (Stamp tool / Backpack drop / Klik):
        // Jika kotak sudah terisi objek lain, TOLAK KERAS (tidak boleh ditimbun)!
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

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `✨ OBJEK DITAMBAHKAN: ${newEnt.label} di [Col ${safeSlot.col}, Row ${safeSlot.row}] (Kotak Bersih)`;
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

        AudioManager.playClick();
        this.state.entities = this.state.entities.filter(e => e.id !== id);

        if (this.state.selectedId === id) {
            this.state.selectedId = this.state.entities.length > 0 ? this.state.entities[0].id : null;
        }

        this.renderHierarchy();
        this.renderInspector();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `🗑️ OBJEK DIHAPUS: Petak [Col ${ent.col}, Row ${ent.row}] sekarang KOSONG dan siap diisi objek baru.`;
        }
    }

    duplicateEntity(id) {
        if (!id) return;
        const ent = this.state.entities.find(e => e.id === id);
        if (!ent) return;

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

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `📋 DIDUPLIKASI: ${clone.label} di [Col ${safeSlot.col}, Row ${safeSlot.row}] (Bebas Tumpukan)`;
        }
    }

    copySelectedEntity() {
        if (!this.state.selectedId) return;
        const ent = this.state.entities.find(el => el.id === this.state.selectedId);
        if (!ent) return;

        this.clipboardEntity = JSON.parse(JSON.stringify(ent));
        AudioManager.playClick();

        if (this.gridInfoEl) {
            this.gridInfoEl.textContent = `📋 DISALIN: ${ent.label} (Arahkan kursor ke petak KOSONG & tekan Ctrl+V)`;
        }
    }

    pasteEntity() {
        if (!this.clipboardEntity) return;

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
        const selId = this.state.selectedId;
        const obj = this.state.entities.find(e => e.id === selId);

        if (!obj) {
            // Scene Settings
            this.inspectorContent.innerHTML = `
                <div class="gt-sb-inspector-card">
                    <div class="gt-sb-card-title">🌐 WORLD SETTINGS</div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">World Bounds</span>
                        <span class="gt-sb-prop-val">1800 x ${this.state.worldHeight || 850} px</span>
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
                    <button class="gt-sb-btn-action gt-sb-btn-clone" id="gt-sb-act-clone" title="Duplikasi Objek (Ctrl+C lalu Ctrl+V, atau Ctrl+D)">
                        <span>📋 Duplikasi</span>
                    </button>
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
            inpWTiles.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 36) {
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
        const btnAddItem = overlay.querySelector('#gt-sb-btn-add-item');

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

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.state.name = e.target.value.trim() || 'Dunia Kreasiku';
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

        // ===============================================================
        // CANVAS DRAG & DROP + DIRECT MANIPULATION
        // ===============================================================
        if (this.canvas) {
            // Helper konversi posisi mouse ke grid tile
            const getTileFromMouse = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const W = this.canvas.width;
                const worldW = this.state.worldWidth || 1800;
                const scale = W / worldW;
                const col = Math.floor((mouseX / scale) / 50);
                const row = Math.floor((mouseY / scale) / 50);
                return { col: Math.max(0, Math.min(35, col)), row: Math.max(0, row), scale };
            };

            // 1. Mouse move tracker
            this.canvas.addEventListener('mousemove', (e) => {
                const { col, row } = getTileFromMouse(e);
                this.hoverTile = { col, row };

                // Jika sedang dragging objek langsung di atas canvas
                if (this.isCanvasDragging && this.canvasDragEntity) {
                    const ent = this.canvasDragEntity;
                    ent.col = col;
                    ent.x = col * 50 + 25;
                    if (ent.type === 'platforms' || ent.type === 'coins' || ent.cat === 'fluid') {
                        ent.row = Math.max(0, Math.min(13, row));
                        ent.y = ent.row * 50 + 25;
                    }
                    this.renderInspector();
                }

                if (this.gridInfoEl) {
                    const occ = this.getOccupyingEntity(col, row, this.isCanvasDragging ? this.canvasDragEntity?.id : null);
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
                this.hoverTile = null;
                this.isCanvasDragging = false;
                this.canvasDragEntity = null;
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `GRID: 50px PERSEGI | CELL-CENTER SNAP READY`;
                }
            });

            // 2. Mouse Down (Click to select, start drag, or stamp)
            this.canvas.addEventListener('mousedown', (e) => {
                if (e.button === 2) return; // Right-click handled by contextmenu
                const { col, row } = getTileFromMouse(e);

                // Jika ada stamp tool yang sedang aktif
                if (this.state.activeTool) {
                    this.addNewEntity(this.state.activeTool, -1, col, row);
                    return;
                }

                // Cari apakah ada entity di koordinat [col, row] ini secara akurat
                const hit = this.state.entities.find(ent => {
                    const startCol = ent.col;
                    const endCol = ent.col + (ent.wTiles || 1) - 1;
                    const colMatch = (col >= startCol && col <= endCol);
                    const entRow = (ent.row !== undefined) ? ent.row : 7;
                    const rowMatch = (row === entRow) || 
                        ((ent.cat === 'creature' || ent.type === 'spikes' || ent.type === 'chest' || ent.type === 'portal') && (row === 7 || row === 8));
                    return colMatch && rowMatch;
                });

                if (hit) {
                    AudioManager.playClick();
                    this.state.selectedId = hit.id;
                    this.isCanvasDragging = true;
                    this.canvasDragEntity = hit;
                    this.dragStartCol = hit.col;
                    this.dragStartRow = (hit.row !== undefined) ? hit.row : 7;
                    this.renderHierarchy();
                    this.renderInspector();
                }
            });

            this.canvas.addEventListener('mouseup', () => {
                if (this.isCanvasDragging && this.canvasDragEntity) {
                    const ent = this.canvasDragEntity;
                    const wTiles = ent.wTiles || 1;

                    // Periksa apakah petak tujuan sudah diisi objek lain:
                    const existing = this.getOccupyingEntity(ent.col, ent.row, ent.id, wTiles);
                    if (existing) {
                        // KEMBALIKAN KE POSISI ASAL KARENA KOTAK SUDAH TERISI (TIDAK BOLEH DITIMBUN)
                        ent.col = this.dragStartCol;
                        ent.row = this.dragStartRow;
                        ent.x = ent.col * 50 + 25;
                        ent.y = (ent.row === 7) ? 400 : (ent.row * 50 + 25);
                        AudioManager.playClick();
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `⛔ GAGAL PINDAH: Kotak [Col ${this.dragStartCol}, Row ${this.dragStartRow}] -> [Col ${ent.col}, Row ${ent.row}] sudah diisi oleh "${existing.label}". Hapus objek itu dulu jika ingin mengisi petak ini!`;
                        }
                    } else {
                        if (this.gridInfoEl) {
                            this.gridInfoEl.textContent = `✅ Objek ${ent.label} dipindahkan ke [Col ${ent.col}, Row ${ent.row}] (Kotak Bersih)`;
                        }
                    }

                    this.isCanvasDragging = false;
                    this.canvasDragEntity = null;
                    this.renderHierarchy();
                    this.renderInspector();
                }
            });

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
                            ? Math.max(0, Math.min(13, row))
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

            // ESC: Tutup modal
            if (e.key === 'Escape' || e.key === 'Esc') {
                AudioManager.playClick();
                this.hide();
                return;
            }

            if (isTyping) return;

            // Delete / Backspace: Hapus objek terpilih
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.state.selectedId) {
                this.deleteEntity(this.state.selectedId);
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
        };
        window.addEventListener('keydown', this._escHandler);
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
            worldHeight: this.state.worldHeight || 850,
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
            entities: JSON.parse(JSON.stringify(this.state.entities))
        };

        // Simpan ke localStorage agar bisa diakses di Projects Hub
        try {
            const raw = localStorage.getItem('gt_custom_worlds');
            const list = raw ? JSON.parse(raw) : [];
            list.unshift(worldData);
            localStorage.setItem('gt_custom_worlds', JSON.stringify(list.slice(0, 10)));
        } catch (e) {
            // ignore
        }

        this.hide();

        // Teleportasi Instan ke CustomWorldScene
        if (this.scene && this.scene.scene) {
            this.scene.scene.start('CustomWorldScene', { worldData });
        } else if (window.__templateGame && window.__templateGame.scene) {
            window.__templateGame.scene.start('CustomWorldScene', { worldData });
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

        // 1. UNIFORM SCALE (LEBAR PENUH & TINGGI PENUH VIEWPORT)
        const worldW = this.state.worldWidth || 1800;
        const scale = W / worldW;
        const cellSize = 50 * scale; // Ukuran kotak persegi 100% 1:1

        // Jumlah baris vertikal yang menutupi seluruh tinggi kanvas H
        const totalRows = Math.max(14, Math.ceil(H / cellSize));
        this.state.worldHeight = totalRows * 50;

        // Helper fungsi pemetaan koordinat dunia ke kanvas
        const toX = (wx) => wx * scale;
        const toY = (wy) => wy * scale;

        // Ground walking baseline tepat di Row 8 (y = 400px)
        const groundRow = 8;
        const groundY = toY(400);

        // Bedrock di baris paling bawah yang mengisi dasar viewport kanvas
        const bedrockRow = totalRows - 1;
        const bedrockY = toY(bedrockRow * 50);

        ctx.clearRect(0, 0, W, H);

        // 2. SKY GRADIENT BERSIH (MEMBENTANG PENUH DARI ROW 0 KE ROW 8)
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

        // 3. CELESTIAL SUN / MOON (Lingkaran Sempurna)
        if (this.state.biome !== 'cave') {
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

        // 4b. GAMBAR BLOK AIR/LAVA DI LANGIT (Rows 0..7) JIKA ADA
        for (let col = 0; col < 36; col++) {
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
                }
            }
        }

        // 5. MENGGAMBAR STRATA TANAH & PETAK CAIRAN (SETIAP PETAK 1x1 MURNI)
        for (let col = 0; col < 36; col++) {
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

                // C. ROW 8: PERMUKAAN TANAH (SURFACE TURF)
                if (r === groundRow) {
                    ctx.fillStyle = surfaceColor;
                    ctx.fillRect(rx, ry, rw, 14 * scale);
                    ctx.fillStyle = dirtColor;
                    ctx.fillRect(rx, ry + 14 * scale, rw, rh - 14 * scale);
                    continue;
                }

                // D. ROW 9..11: LAPISAN TANAH BAWAH (SUBSURFACE DIRT)
                if (r <= 11) {
                    ctx.fillStyle = dirtColor;
                    ctx.fillRect(rx, ry, rw, rh);
                    if ((col + r) % 3 === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(rx + 12 * scale, ry + 14 * scale, 6 * scale, 4 * scale);
                    }
                    continue;
                }

                // E. ROW 12..bedrockRow-1: LAPISAN BATU GUA DALAM (CAVERN SLATE STONE)
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
            }
        }

        // Label Penanda Bedrock di Kiri Bawah
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.max(8, 10 * scale)}px 'JetBrains Mono'`;
        ctx.textAlign = 'left';
        ctx.fillText('⬛ BEDROCK (DASAR BUMI TAK TERTEMBUS)', toX(20), bedrockY + cellSize * 0.65);

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

                // Garis Rumput Permukaan Atas
                ctx.fillStyle = surfaceColor;
                ctx.fillRect(px, py, pw, 3.5 * scale);

                // Border Luar
                ctx.strokeStyle = surfaceColor;
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

            // C. RINTANGAN DURI (SPIKES)
            else if (ent.type === 'spikes') {
                const px = toX(ent.col * 50);
                const py = groundY;
                const sw = cellSize;
                const sh = Math.max(10, 32 * scale);

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

            // D. PETI HARTA KARUN (CHEST)
            else if (ent.type === 'chest') {
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

            // H. PLAYER SPAWN (PLAYER)
            else if (ent.type === 'player') {
                const playerX = toX(ent.col * 50 + 25);
                const pw = Math.max(10, 24 * scale);
                const ph = Math.max(14, 38 * scale);
                const playerY = groundY - ph;

                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(playerX - pw / 2, playerY, pw, ph);
                ctx.strokeStyle = '#bae6fd';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(playerX - pw / 2, playerY, pw, ph);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(playerX - 3, playerY + 6, 3, 4);
                ctx.fillRect(playerX + 3, playerY + 6, 3, 4);

                ctx.fillStyle = '#38bdf8';
                ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
                ctx.textAlign = 'center';
                ctx.fillText('SPAWN', playerX, playerY - 4);
            }

            // I. FINISH EXIT PORTAL (PORTAL)
            else if (ent.type === 'portal') {
                const portalX = toX(ent.col * 50 + 25);
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
        });

        // ===============================================================
        // 7. MINIATURE SQUARE GRID OVERLAY (100% KOTAK PERSEGI PRESISI)
        // ===============================================================
        if (this.state.showGrid) {
            ctx.save();
            ctx.lineWidth = 1;

            // Garis Vertikal (Setiap 50px dari Col 0 sampai Col 36)
            for (let col = 0; col <= 36; col++) {
                const rx = toX(col * 50);
                const isMajor = (col % 5) === 0;

                ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, H);
                ctx.stroke();

                if (isMajor && col >= 0 && col <= 36) {
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

                // Coordinate Tag Badge
                const badgeWidth = Math.max(90, boxW);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.fillRect(boxX, boxY - 18, badgeWidth, 16);
                ctx.strokeStyle = '#38bdf8';
                ctx.strokeRect(boxX, boxY - 18, badgeWidth, 16);

                ctx.fillStyle = '#38bdf8';
                ctx.font = "bold 9px 'JetBrains Mono'";
                ctx.textAlign = 'center';
                ctx.fillText(`Col ${selObj.col}, Row ${selObj.row} (${selObj.label})`, boxX + badgeWidth / 2, boxY - 6);

                ctx.restore();
            }
        }
    }

    show() {
        if (!this.overlay) return;
        this._isOpen = true;
        this.overlay.classList.remove('hidden');

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
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
