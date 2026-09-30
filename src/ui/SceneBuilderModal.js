import { AudioManager } from '../utils/AudioManager.js';

export class SceneBuilderModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.animFrameId = null;

        // Default State (100% STANDARDIZED TILE MATRIX SNAP)
        // Setip tile adalah 50x50px.
        // Kolom 0..35 (Total 36 kolom = 1800px).
        // Baris 0..7 = Langit, Baris 8 = Permukaan Tanah (y = 400px), Baris 9+ = Bawah Tanah & Bedrock.
        this.state = {
            name: 'Gurun Api Tengkorak',
            biome: 'desert', // 'dirt' | 'snow' | 'desert' | 'cave'
            timeOfDay: 'day', // 'day' | 'sunset' | 'night'
            showGrid: true,
            showGizmos: true,
            selectedId: 'player', // Currently selected object for Unity Inspector

            // World Components Toggles
            hasLava: true,
            hasWater: true,
            hasSpikes: true,
            hasPlatforms: true,
            hasSlime: true,
            hasSkeleton: true,
            hasNpc: true,
            hasChest: true,
            hasCoins: true,
            hasPortal: true,
            worldWidth: 1800,
            worldHeight: 850,

            // Entity Transforms (Standar Cell-Center: x = col * 50 + 25, y = 400 untuk ground)
            positions: {
                player: { col: 2, row: 7, x: 125, y: 400, label: 'Player Spawn', cat: 'creature', icon: '👤', wTiles: 1, hTiles: 1 },
                npc: { col: 6, row: 7, x: 325, y: 400, label: 'NPC Guide', cat: 'creature', icon: '🧙', wTiles: 1, hTiles: 1 },
                spikes: { col: 7, row: 7, x: 375, y: 400, label: 'Rintangan Duri (x3)', cat: 'solid', icon: '⚠️', wTiles: 1, hTiles: 1 },
                slime: { col: 10, row: 7, x: 525, y: 400, label: 'Monster Slime', cat: 'creature', icon: '🟢', wTiles: 1, hTiles: 1 },
                water: { col: 11, row: 8, x: 625, y: 400, label: 'Kolam Air (3 Tiles)', cat: 'fluid', icon: '🌊', wTiles: 3, hTiles: 3 },
                platforms: { col: 12, row: 5, x: 650, y: 250, label: 'Pijakan Melayang (x5)', cat: 'solid', icon: '🧱', wTiles: 2, hTiles: 1 },
                coins: { col: 12, row: 4, x: 650, y: 200, label: 'Koin Emas (x5)', cat: 'solid', icon: '🪙', wTiles: 1, hTiles: 1 },
                chest: { col: 15, row: 7, x: 775, y: 400, label: 'Peti Harta Karun', cat: 'solid', icon: '📦', wTiles: 1, hTiles: 1 },
                lava: { col: 20, row: 8, x: 1075, y: 400, label: 'Kolam Lava (3 Tiles)', cat: 'fluid', icon: '🌋', wTiles: 3, hTiles: 3 },
                skeleton: { col: 30, row: 7, x: 1525, y: 400, label: 'Monster Skeleton', cat: 'creature', icon: '💀', wTiles: 1, hTiles: 1 },
                portal: { col: 34, row: 7, x: 1725, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
            }
        };

        this.animTime = 0;
        this.hoverTile = null; // { col, row }
        this.createDOM();
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

                /* --- LEFT: HIERARCHY PANEL --- */
                .gt-sb-hierarchy {
                    width: 230px;
                    background: #141417;
                    border-right: 1px solid #27272a;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    z-index: 10;
                }

                .gt-sb-panel-header {
                    height: 30px;
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

                .gt-sb-hierarchy-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 6px 0;
                    display: flex;
                    flex-direction: column;
                }

                .gt-sb-hierarchy-list::-webkit-scrollbar {
                    width: 4px;
                }
                .gt-sb-hierarchy-list::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 2px;
                }

                .gt-sb-tree-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                    color: #d4d4d8;
                    cursor: pointer;
                    transition: all 0.1s ease;
                    border-left: 2px solid transparent;
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

                .gt-sb-tree-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-sb-tree-coord {
                    font-size: 9.5px;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    background: rgba(56, 189, 248, 0.1);
                    padding: 1px 5px;
                    border-radius: 3px;
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
                    width: 250px;
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

                /* =============================================================== */
                /* 3. DOCKED GROWTOPIA BACKPACK DRAWER (BOTTOM)                     */
                /* =============================================================== */
                .gt-sb-drawer {
                    height: 155px;
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

                /* Backpack Slots Grid */
                .gt-sb-palette-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
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
                    cursor: pointer;
                    transition: all 0.12s ease;
                    height: 32px;
                    box-sizing: border-box;
                }

                .gt-sb-chip:hover {
                    background: #222228;
                    border-color: #3f3f46;
                    transform: translateY(-1px);
                }

                .gt-sb-chip.active {
                    background: #11261b;
                    border-color: #22c55e;
                }

                .gt-sb-chip-left {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #e4e4e7;
                }

                .gt-sb-chip-check {
                    width: 14px;
                    height: 14px;
                    border-radius: 3px;
                    border: 1px solid #52525b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: transparent;
                }

                .gt-sb-chip.active .gt-sb-chip-check {
                    background: #22c55e;
                    border-color: #22c55e;
                    color: #ffffff;
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
                <!-- Left: Hierarchy Tree -->
                <div class="gt-sb-hierarchy">
                    <div class="gt-sb-panel-header">
                        <span>▼ HIERARCHY</span>
                        <span id="gt-sb-hierarchy-count">11 Objects</span>
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
                        <span class="gt-sb-stage-badge-title">SCENE VIEW (CELL-CENTER SNAPPED)</span>
                    </div>

                    <!-- Top Right Badge -->
                    <div class="gt-sb-stage-badge-topright">
                        <span id="gt-sb-grid-info">GRID: 50px PERSEGI | CELL-CENTER SNAP READY</span>
                    </div>

                    <!-- Bottom Scale Ruler Track -->
                    <div class="gt-sb-stage-ruler">
                        <div style="color: #38bdf8;"><span>🏁</span> <span>[Col 2: 125px] SPAWN</span></div>
                        <div style="color: #64748b;"><span>────── 50px TILE MATRIX (CELL-CENTER SNAPPED) ──────</span></div>
                        <div style="color: #a855f7;"><span>🌀</span> <span>[Col 34: 1725px] FINISH</span></div>
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
                        <span>🎒</span> <span>PROJECT BACKPACK ASSETS</span>
                    </div>

                    <!-- Growtopia Category Tabs -->
                    <div class="gt-sb-category-bar">
                        <button class="gt-sb-cat-btn active" data-cat="all">
                            <span>🎒 Semua</span>
                            <span class="gt-sb-cat-count" id="count-all">9/9</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="solid">
                            <span>🧱 Objek Padat</span>
                            <span class="gt-sb-cat-count" id="count-solid">4/4</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="creature">
                            <span>👥 Makhluk &amp; Karakter</span>
                            <span class="gt-sb-cat-count" id="count-creature">3/3</span>
                        </button>
                        <button class="gt-sb-cat-btn" data-cat="fluid">
                            <span>🌊 Cairan Bahaya</span>
                            <span class="gt-sb-cat-count" id="count-fluid">2/2</span>
                        </button>
                    </div>
                </div>

                <!-- Slots Grid -->
                <div class="gt-sb-palette-grid">
                    <!-- Kategori: Objek Padat & Rintangan -->
                    <div class="gt-sb-chip ${this.state.hasPlatforms ? 'active' : ''}" data-prop="hasPlatforms" data-cat="solid">
                        <div class="gt-sb-chip-left"><span>🧱</span><span>Pijakan Melayang</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasSpikes ? 'active' : ''}" data-prop="hasSpikes" data-cat="solid">
                        <div class="gt-sb-chip-left"><span>⚠️</span><span>Rintangan Duri</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasChest ? 'active' : ''}" data-prop="hasChest" data-cat="solid">
                        <div class="gt-sb-chip-left"><span>🪙</span><span>Koin &amp; Peti Harta</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasPortal ? 'active' : ''}" data-prop="hasPortal" data-cat="solid">
                        <div class="gt-sb-chip-left"><span>🌀</span><span>Portal Finish</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>

                    <!-- Kategori: Karakter & Makhluk Hidup -->
                    <div class="gt-sb-chip ${this.state.hasNpc ? 'active' : ''}" data-prop="hasNpc" data-cat="creature">
                        <div class="gt-sb-chip-left"><span>🧙</span><span>Karakter NPC</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasSlime ? 'active' : ''}" data-prop="hasSlime" data-cat="creature">
                        <div class="gt-sb-chip-left"><span>🟢</span><span>Monster Slime</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasSkeleton ? 'active' : ''}" data-prop="hasSkeleton" data-cat="creature">
                        <div class="gt-sb-chip-left"><span>💀</span><span>Monster Skeleton</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>

                    <!-- Kategori: Cairan Lingkungan & Bahaya -->
                    <div class="gt-sb-chip ${this.state.hasLava ? 'active' : ''}" data-prop="hasLava" data-cat="fluid">
                        <div class="gt-sb-chip-left"><span>🌋</span><span>Kolam Lava</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
                    <div class="gt-sb-chip ${this.state.hasWater ? 'active' : ''}" data-prop="hasWater" data-cat="fluid">
                        <div class="gt-sb-chip-left"><span>🌊</span><span>Kolam Air</span></div>
                        <div class="gt-sb-chip-check">✓</div>
                    </div>
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

        this.bindEvents();
        this.renderHierarchy();
        this.renderInspector();
    }

    renderHierarchy() {
        if (!this.hierarchyList) return;
        const positions = this.state.positions;
        let html = '';

        for (const [key, obj] of Object.entries(positions)) {
            // Check visibility
            let isVisible = true;
            if (key === 'slime' && !this.state.hasSlime) isVisible = false;
            if (key === 'skeleton' && !this.state.hasSkeleton) isVisible = false;
            if (key === 'npc' && !this.state.hasNpc) isVisible = false;
            if (key === 'platforms' && !this.state.hasPlatforms) isVisible = false;
            if (key === 'spikes' && !this.state.hasSpikes) isVisible = false;
            if (key === 'chest' && !this.state.hasChest) isVisible = false;
            if (key === 'coins' && !this.state.hasCoins) isVisible = false;
            if (key === 'lava' && !this.state.hasLava) isVisible = false;
            if (key === 'water' && !this.state.hasWater) isVisible = false;
            if (key === 'portal' && !this.state.hasPortal) isVisible = false;

            if (!isVisible) continue;

            const isSelected = this.state.selectedId === key;
            html += `
                <div class="gt-sb-tree-item ${isSelected ? 'active' : ''}" data-id="${key}">
                    <div class="gt-sb-tree-left">
                        <span>${obj.icon}</span>
                        <span>${obj.label}</span>
                    </div>
                    <span class="gt-sb-tree-coord">Col ${obj.col}</span>
                </div>
            `;
        }

        this.hierarchyList.innerHTML = html;

        // Click handler to select
        this.hierarchyList.querySelectorAll('.gt-sb-tree-item').forEach(item => {
            item.addEventListener('click', () => {
                AudioManager.playClick();
                this.state.selectedId = item.getAttribute('data-id');
                this.renderHierarchy();
                this.renderInspector();
            });
        });
    }

    renderInspector() {
        if (!this.inspectorContent) return;
        const selId = this.state.selectedId;
        const obj = this.state.positions[selId];

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
                    <span style="font-size: 9px; color: #38bdf8;">ID: ${selId}</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Category</span>
                    <span class="gt-sb-prop-val" style="color: #a855f7;">${obj.cat.toUpperCase()}</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Grid Tile [Col, Row]</span>
                    <span class="gt-sb-prop-val" style="color: #38bdf8;">[Col: ${obj.col}, Row: ${obj.row}]</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Tile Center X</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-col" value="${obj.col}" min="0" max="35" step="1" title="Geser Kolom Grid (0..35)" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">World Pos (X, Y)</span>
                    <span class="gt-sb-prop-val">(${obj.x}, ${obj.y})</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Cell Snap Mode</span>
                    <span class="gt-sb-prop-val" style="color: #22c55e;">Cell-Center (+25px)</span>
                </div>
            </div>

            <div class="gt-sb-inspector-card">
                <div class="gt-sb-card-title">⚙️ ENTITY PROPERTIES</div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Status</span>
                    <span class="gt-sb-prop-val" style="color: #22c55e;">● Active</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Tile Footprint</span>
                    <span class="gt-sb-prop-val">${obj.wTiles || 1} x ${obj.hTiles || 1} Tile</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Ground Alignment</span>
                    <span class="gt-sb-prop-val" style="color: #f59e0b;">Row 8 (Ground Y: 400)</span>
                </div>
            </div>
        `;

        const inpCol = this.inspectorContent.querySelector('#gt-sb-inp-col');
        if (inpCol) {
            inpCol.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 0 && val <= 35) {
                    obj.col = val;
                    obj.x = val * 50 + 25;
                    this.renderHierarchy();
                    this.renderInspector();
                }
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

        // Growtopia Backpack Categories & Component Chips
        const catButtons = overlay.querySelectorAll('.gt-sb-cat-btn');
        const chips = overlay.querySelectorAll('.gt-sb-chip');

        const updateCategoryCounts = () => {
            const counts = {
                all: { active: 0, total: chips.length },
                solid: { active: 0, total: 0 },
                creature: { active: 0, total: 0 },
                fluid: { active: 0, total: 0 }
            };

            chips.forEach(chip => {
                const cat = chip.getAttribute('data-cat');
                const prop = chip.getAttribute('data-prop');
                const isActive = !!this.state[prop];

                if (counts[cat]) {
                    counts[cat].total++;
                    if (isActive) counts[cat].active++;
                }
                if (isActive) counts.all.active++;
            });

            for (const [k, v] of Object.entries(counts)) {
                const el = overlay.querySelector(`#count-${k}`);
                if (el) el.textContent = `${v.active}/${v.total}`;
            }

            this.renderHierarchy();
        };

        // Hitung status awal
        updateCategoryCounts();

        // Kategori Filter Tab Click
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedCat = btn.getAttribute('data-cat');

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

        // Component Palette Toggle Chips
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                AudioManager.playClick();
                const prop = chip.getAttribute('data-prop');
                this.state[prop] = !this.state[prop];
                if (this.state[prop]) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
                updateCategoryCounts();
            });
        });

        // Canvas Mouse Hover for Tile Position Tracker
        if (this.canvas) {
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const W = this.canvas.width;
                const worldW = this.state.worldWidth || 1800;
                const scale = W / worldW; // uniform 1:1 scale covering full width

                const worldX = mouseX / scale;
                const worldY = mouseY / scale;

                const col = Math.floor(worldX / 50);
                const row = Math.floor(worldY / 50);

                if (col >= 0 && col < 36 && row >= 0) {
                    this.hoverTile = { col, row };

                    if (this.gridInfoEl) {
                        let layerName = 'LANGIT (SKY)';
                        if (row === 8) layerName = 'TANAH (SURFACE)';
                        else if (row > 8 && row <= 11) layerName = 'SUBSOIL (DIRT)';
                        else if (row > 11 && row < Math.floor(this.canvas.height / (50 * scale)) - 1) layerName = 'CAVERN (STONE)';
                        else if (row >= Math.floor(this.canvas.height / (50 * scale)) - 1) layerName = 'BEDROCK';

                        this.gridInfoEl.textContent = `TILE: [Col: ${col}, Row: ${row}] (Center: ${col * 50 + 25}px) | ${layerName}`;
                    }
                } else {
                    this.hoverTile = null;
                }
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.hoverTile = null;
                if (this.gridInfoEl) {
                    this.gridInfoEl.textContent = `GRID: 50px PERSEGI | CELL-CENTER SNAP READY`;
                }
            });

            // Canvas Click for Tile Selection / Object Focus
            this.canvas.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const W = this.canvas.width;
                const worldW = this.state.worldWidth || 1800;
                const scale = W / worldW;
                const worldClickX = mouseX / scale;
                const clickedCol = Math.floor(worldClickX / 50);

                // Cari objek yang menempati kolom ini
                let matchedId = null;
                for (const [k, obj] of Object.entries(this.state.positions)) {
                    const startCol = obj.col;
                    const endCol = obj.col + (obj.wTiles || 1) - 1;
                    if (clickedCol >= startCol && clickedCol <= endCol) {
                        matchedId = k;
                        break;
                    }
                }

                if (matchedId) {
                    AudioManager.playClick();
                    this.state.selectedId = matchedId;
                    this.renderHierarchy();
                    this.renderInspector();
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

        // Keyboard ESC
        this._escHandler = (e) => {
            if (this._isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
                AudioManager.playClick();
                this.hide();
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
        const worldData = {
            id: `world-${Date.now()}`,
            name: this.state.name || 'Dunia Kreasiku',
            biome: this.state.biome,
            timeOfDay: this.state.timeOfDay,
            worldWidth: this.state.worldWidth || 1800,
            worldHeight: this.state.worldHeight || 850,
            hasLava: this.state.hasLava,
            hasWater: this.state.hasWater,
            hasSpikes: this.state.hasSpikes,
            hasPlatforms: this.state.hasPlatforms,
            hasSlime: this.state.hasSlime,
            hasSkeleton: this.state.hasSkeleton,
            hasNpc: this.state.hasNpc,
            hasChest: this.state.hasChest,
            hasCoins: this.state.hasCoins,
            hasPortal: this.state.hasPortal
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
    // TRUE MINIATURE MAP ENGINE (STANDARDIZED CELL-CENTER MATRIX)
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
            const sunX = toX(275); // Center Col 5.5
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

        // Zona Bahaya Snap Presisi Grid 50px:
        // Water: Cols 11, 12, 13 (x = 550..700, 3 kotak penuh)
        // Lava: Cols 20, 21, 22 (x = 1000..1150, 3 kotak penuh)
        const waterStartCol = 11;
        const waterEndCol = 13;
        const lavaStartCol = 20;
        const lavaEndCol = 22;

        const poolDepthRow = Math.min(11, bedrockRow - 1);

        // 5. MENGGAMBAR STRATA BAWAH TANAH (DIRT ➔ STONE ➔ BEDROCK)
        for (let col = 0; col < 36; col++) {
            const rx = toX(col * 50);
            const rw = cellSize + 0.5;

            const inWater = this.state.hasWater && col >= waterStartCol && col <= waterEndCol;
            const inLava = this.state.hasLava && col >= lavaStartCol && col <= lavaEndCol;

            for (let r = groundRow; r < totalRows; r++) {
                const ry = toY(r * 50);
                const rh = cellSize + 0.5;

                // A. KASUS JURANG CAIRAN (Row 8 s/d poolDepthRow)
                if (r <= poolDepthRow) {
                    if (inWater) {
                        const waveY = (r === groundRow) ? (groundY + Math.sin(t * 3 + col * 0.8) * 3) : ry;
                        ctx.fillStyle = '#0284c7';
                        ctx.fillRect(rx, waveY, rw, rh + (ry - waveY));
                        if (r === groundRow) {
                            ctx.fillStyle = '#7dd3fc';
                            ctx.fillRect(rx, waveY, rw, 3);
                        }
                        continue;
                    }
                    if (inLava) {
                        const lavaWaveY = (r === groundRow) ? (groundY + Math.sin(t * 2 + col * 0.9) * 2) : ry;
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(rx, lavaWaveY, rw, rh + (ry - lavaWaveY));
                        if (r === groundRow) {
                            ctx.fillStyle = '#f97316';
                            ctx.fillRect(rx, lavaWaveY, rw, 3);
                            // Gelembung lava
                            const bubbleY = lavaWaveY - Math.abs(Math.sin(t * 4 + col)) * 8;
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath();
                            ctx.arc(rx + rw / 2, bubbleY, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        continue;
                    }
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

        // 6. PIJAKAN MELAYANG (MODULAR 2-TILE PLATFORMS DI ROW 5 & 6)
        if (this.state.hasPlatforms) {
            const platforms = [
                { col: 8, row: 6, wTiles: 2 },  // Cols 8..9 (x: 400..500)
                { col: 12, row: 5, wTiles: 2 }, // Cols 12..13 (x: 600..700, jembatan air)
                { col: 17, row: 6, wTiles: 2 }, // Cols 17..18 (x: 850..950)
                { col: 21, row: 5, wTiles: 2 }, // Cols 21..22 (x: 1050..1150, jembatan lava)
                { col: 27, row: 6, wTiles: 2 }  // Cols 27..28 (x: 1350..1450)
            ];

            platforms.forEach((p, idx) => {
                const px = toX(p.col * 50);
                const py = toY(p.row * 50);
                const pw = p.wTiles * cellSize;
                const ph = Math.max(6, 18 * scale);

                // Pijakan Balok Sempurna Menempel Garis Grid
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px, py, pw, ph);
                ctx.strokeStyle = surfaceColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(px, py, pw, ph);

                // Koin Emas Berputar di Atas Pijakan (Tepat di Tile Tengah atas Platform)
                if (this.state.hasCoins) {
                    const coinX = px + pw / 2;
                    const coinY = py - 18 * scale;
                    const coinW = Math.max(4, Math.abs(Math.sin(t * 3 + idx)) * (8 * scale));

                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.ellipse(coinX, coinY, coinW, 8 * scale, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });
        }

        // 7. RINTANGAN DURI (SPIKES TEPAT DI TENGAH TILE 50px DI ROW 7, KAKI DI ROW 8)
        if (this.state.hasSpikes) {
            const spikeCols = [7, 16, 26];
            spikeCols.forEach(col => {
                const px = toX(col * 50);
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
            });
        }

        // 8. PETI HARTA (CHEST CENTERED DI TILE COL 15, ROW 7)
        if (this.state.hasChest) {
            const chestObj = this.state.positions.chest || { col: 15, x: 775 };
            const cx = toX(chestObj.col * 50 + 25);
            const cw = Math.max(12, 30 * scale);
            const ch = Math.max(10, 24 * scale);
            const cy = groundY - ch;

            ctx.fillStyle = '#b45309';
            ctx.fillRect(cx - cw / 2, cy, cw, ch);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cx - cw / 2, cy, cw, ch);
            // Kunci emas tengah
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 2, cy + ch / 2 - 2, 4, 4);

            // Label mini "CHEST"
            ctx.fillStyle = '#fbbf24';
            ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
            ctx.textAlign = 'center';
            ctx.fillText('CHEST', cx, cy - 4);
        }

        // 9. KARAKTER NPC (CENTERED DI TILE COL 6, ROW 7)
        if (this.state.hasNpc) {
            const npcObj = this.state.positions.npc || { col: 6, x: 325 };
            const npcX = toX(npcObj.col * 50 + 25);
            const nw = Math.max(10, 24 * scale);
            const nh = Math.max(14, 38 * scale);
            const npcY = groundY - nh;

            // Badan Ungu NPC
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(npcX - nw / 2, npcY, nw, nh);
            ctx.strokeStyle = '#d8b4fe';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(npcX - nw / 2, npcY, nw, nh);

            // Mata Kuning
            ctx.fillStyle = '#fde047';
            ctx.fillRect(npcX - 4, npcY + 6, 3, 3);
            ctx.fillRect(npcX + 2, npcY + 6, 3, 3);

            // Balon Interaksi [E]
            const bubbleY = npcY - 10 * scale + Math.sin(t * 4) * 2;
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(npcX - 10, bubbleY - 10, 20, 12);
            ctx.strokeStyle = '#c084fc';
            ctx.strokeRect(npcX - 10, bubbleY - 10, 20, 12);
            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 9px 'JetBrains Mono'";
            ctx.textAlign = 'center';
            ctx.fillText('[E]', npcX, bubbleY - 1);
        }

        // 10. MONSTER SLIME (CENTERED DI TILE COL 10, ROW 7)
        if (this.state.hasSlime) {
            const slimeObj = this.state.positions.slime || { col: 10, x: 525 };
            const slimeBaseX = toX(slimeObj.col * 50 + 25);
            const patrolOffset = Math.sin(t * 1.5) * (14 * scale); // Patroli di dalam petak
            const jumpOffset = Math.abs(Math.sin(t * 3)) * (20 * scale);
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

            // Mata Slime
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(smX - 4, smY - 3, 3, 4);
            ctx.fillRect(smX + 2, smY - 3, 3, 4);
        }

        // 11. MONSTER SKELETON (CENTERED DI TILE COL 30, ROW 7)
        if (this.state.hasSkeleton) {
            const skelObj = this.state.positions.skeleton || { col: 30, x: 1525 };
            const skelBaseX = toX(skelObj.col * 50 + 25);
            const patrolOffset = Math.sin(t * 1.2) * (16 * scale);
            const skX = skelBaseX + patrolOffset;
            const skW = Math.max(9, 22 * scale);
            const skH = Math.max(14, 38 * scale);
            const skY = groundY - skH;

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(skX - skW / 2, skY, skW, skH);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(skX - skW / 2, skY, skW, skH);

            // Mata Merah Skeleton
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(skX - 4, skY + 6, 3, 3);
            ctx.fillRect(skX + 2, skY + 6, 3, 3);
        }

        // 12. PLAYER AVATAR (CENTERED DI TILE COL 2, ROW 7, KAKI DI ROW 8)
        const playerObj = this.state.positions.player || { col: 2, x: 125 };
        const playerX = toX(playerObj.col * 50 + 25);
        const pw = Math.max(10, 24 * scale);
        const ph = Math.max(14, 38 * scale);
        const playerY = groundY - ph;

        // Badan Player (Cyan Kotak)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(playerX - pw / 2, playerY, pw, ph);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(playerX - pw / 2, playerY, pw, ph);

        // Mata Putih
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playerX - 3, playerY + 6, 3, 4);
        ctx.fillRect(playerX + 3, playerY + 6, 3, 4);

        // Tag Spawn
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', playerX, playerY - 4);

        // 13. FINISH EXIT PORTAL (CENTERED DI TILE COL 34, ROW 7)
        if (this.state.hasPortal) {
            const portalObj = this.state.positions.portal || { col: 34, x: 1725 };
            const portalX = toX(portalObj.col * 50 + 25);
            const portalR = Math.max(14, 24 * scale);
            const portalY = groundY - cellSize / 2;

            ctx.save();
            ctx.translate(portalX, portalY);
            ctx.rotate(t * 3);

            // Cincin Luar
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, portalR, 0, Math.PI * 1.6);
            ctx.stroke();

            // Cincin Dalam
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, portalR * 0.6, 0, Math.PI * 1.4);
            ctx.stroke();

            ctx.restore();

            // Inti Cahaya
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.arc(portalX, portalY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label "GOAL"
            ctx.fillStyle = '#38bdf8';
            ctx.font = `bold ${Math.max(8, 9 * scale)}px 'JetBrains Mono'`;
            ctx.textAlign = 'center';
            ctx.fillText('GOAL', portalX, portalY - portalR - 4);
        }

        // ===============================================================
        // 14. MINIATURE SQUARE GRID OVERLAY (100% KOTAK PERSEGI PRESISI)
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

                // Indikator Kolom Grid pada Garis Utama
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
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)'; // Hijau Lantai
                    ctx.lineWidth = 1.5;
                } else if (isBedrockLine) {
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'; // Abu-abu Bedrock
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.lineWidth = 1;
                }

                ctx.beginPath();
                ctx.moveTo(0, ry);
                ctx.lineTo(W, ry);
                ctx.stroke();

                // Indikator Label Baris
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

                ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.fillRect(hx, hy, cellSize, cellSize);

                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(hx, hy, cellSize, cellSize);
                ctx.setLineDash([]);
            }

            ctx.restore();
        }

        // ===============================================================
        // 15. UNITY TRANSFORM GIZMOS & CELL-CENTER HIGHLIGHT
        // ===============================================================
        if (this.state.showGizmos && this.state.selectedId) {
            const selId = this.state.selectedId;
            const selObj = this.state.positions[selId];
            if (selObj) {
                // Selalu membungkus petak tile [col, row] yang tepat
                const boxX = toX(selObj.col * 50);
                const boxY = toY(selObj.row * 50);
                const boxW = (selObj.wTiles || 1) * cellSize;
                const boxH = (selObj.hTiles || 1) * cellSize;

                ctx.save();
                // Bounding selection box tepat di batas sel grid
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(boxX, boxY, boxW, boxH);
                ctx.setLineDash([]);

                // Transform handles (Corner squares di sudut petak)
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
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.fillRect(boxX, boxY - 18, Math.max(70, boxW), 16);
                ctx.strokeStyle = '#38bdf8';
                ctx.strokeRect(boxX, boxY - 18, Math.max(70, boxW), 16);

                ctx.fillStyle = '#38bdf8';
                ctx.font = "bold 9px 'JetBrains Mono'";
                ctx.textAlign = 'center';
                ctx.fillText(`Col ${selObj.col}, Row ${selObj.row} (${selObj.x})`, boxX + Math.max(70, boxW) / 2, boxY - 6);

                ctx.restore();
            }
        }
    }

    show() {
        if (!this.overlay) return;
        this._isOpen = true;
        this.overlay.classList.remove('hidden');

        // Pastikan ukuran canvas langsung cocok dengan viewport layar penuh
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
