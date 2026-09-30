import { AudioManager } from '../utils/AudioManager.js';

export class SceneBuilderModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.animFrameId = null;

        // Default State (100% matched with CustomWorldScene & Unity Inspector)
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

            // Entity Transforms (Editable in Inspector)
            positions: {
                player: { x: 100, y: 416, label: 'Player Spawn', cat: 'creature', icon: '👤' },
                npc: { x: 300, y: 416, label: 'NPC Guide', cat: 'creature', icon: '🧙' },
                water: { x: 630, y: 416, label: 'Kolam Air (560-700)', cat: 'fluid', icon: '🌊' },
                platforms: { x: 630, y: 280, label: 'Pijakan Melayang (x5)', cat: 'solid', icon: '🧱' },
                coins: { x: 630, y: 240, label: 'Koin Emas (x5)', cat: 'solid', icon: '🪙' },
                slime: { x: 520, y: 416, label: 'Monster Slime', cat: 'creature', icon: '🟢' },
                spikes: { x: 850, y: 416, label: 'Rintangan Duri (x3)', cat: 'solid', icon: '⚠️' },
                chest: { x: 800, y: 416, label: 'Peti Harta Karun', cat: 'solid', icon: '📦' },
                lava: { x: 1080, y: 416, label: 'Kolam Lava (1000-1160)', cat: 'fluid', icon: '🌋' },
                skeleton: { x: 1450, y: 416, label: 'Monster Skeleton', cat: 'creature', icon: '💀' },
                portal: { x: 1700, y: 416, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀' }
            }
        };

        this.animTime = 0;
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
                    width: 220px;
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
                    padding: 5px 10px;
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
                    color: #71717a;
                    font-family: 'JetBrains Mono', monospace;
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
                    background: rgba(18, 18, 22, 0.75);
                    backdrop-filter: blur(6px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
                    <button class="gt-sb-tool-toggle ${this.state.showGrid ? 'active' : ''}" id="gt-sb-btn-grid" title="Toggle Grid Miniatur 50px">
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
                        <span class="gt-sb-stage-badge-title">SCENE VIEW (1:1 MINIATURE MAP)</span>
                    </div>

                    <!-- Top Right Badge -->
                    <div class="gt-sb-stage-badge-topright">
                        <span id="gt-sb-grid-info">GRID: 50px MINIATUR | WORLD: 1800x450</span>
                    </div>

                    <!-- Bottom Scale Ruler Track -->
                    <div class="gt-sb-stage-ruler">
                        <div style="color: #38bdf8;"><span>🏁</span> <span>[x: 100] SPAWN</span></div>
                        <div style="color: #64748b;"><span>────── 50px TILE GRID MINIATUR (1800px) ──────</span></div>
                        <div style="color: #a855f7;"><span>🌀</span> <span>[x: 1700] FINISH</span></div>
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
                    <span class="gt-sb-tree-coord">${obj.x}px</span>
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
                        <span class="gt-sb-prop-label">World Width</span>
                        <span class="gt-sb-prop-val">1800 px</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">World Height</span>
                        <span class="gt-sb-prop-val">450 px</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Grid Tile Size</span>
                        <span class="gt-sb-prop-val" style="color: #38bdf8;">50 px</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Ground Baseline</span>
                        <span class="gt-sb-prop-val">416 px</span>
                    </div>
                    <div class="gt-sb-prop-row">
                        <span class="gt-sb-prop-label">Gravity Y</span>
                        <span class="gt-sb-prop-val">900 px/s²</span>
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
                    <span class="gt-sb-prop-label">Transform X</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-x" value="${obj.x}" step="10" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Transform Y</span>
                    <input type="number" class="gt-sb-prop-input" id="gt-sb-inp-y" value="${obj.y}" step="10" />
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Grid Snap (50px)</span>
                    <span class="gt-sb-prop-val" style="color: #22c55e;">Enabled</span>
                </div>
            </div>

            <div class="gt-sb-inspector-card">
                <div class="gt-sb-card-title">⚙️ ENTITY PROPERTIES</div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Status</span>
                    <span class="gt-sb-prop-val" style="color: #22c55e;">● Active</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Physics Body</span>
                    <span class="gt-sb-prop-val">Arcade 2D</span>
                </div>
                <div class="gt-sb-prop-row">
                    <span class="gt-sb-prop-label">Collision Layer</span>
                    <span class="gt-sb-prop-val">Default</span>
                </div>
            </div>
        `;

        const inpX = this.inspectorContent.querySelector('#gt-sb-inp-x');
        const inpY = this.inspectorContent.querySelector('#gt-sb-inp-y');

        if (inpX) {
            inpX.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                    obj.x = Math.max(0, Math.min(1800, val));
                    this.renderHierarchy();
                }
            });
        }
        if (inpY) {
            inpY.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                    obj.y = Math.max(50, Math.min(450, val));
                    this.renderHierarchy();
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

        // Canvas Click for raycasting selection
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const W = this.canvas.width;
                const sx = W / (this.state.worldWidth || 1800);
                const worldClickX = clickX / sx;

                // Cari objek terdekat
                let closestId = null;
                let minDist = 120; // threshold
                for (const [k, obj] of Object.entries(this.state.positions)) {
                    const dist = Math.abs(obj.x - worldClickX);
                    if (dist < minDist) {
                        minDist = dist;
                        closestId = k;
                    }
                }

                if (closestId) {
                    AudioManager.playClick();
                    this.state.selectedId = closestId;
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
        this.canvas.width = Math.max(600, Math.floor(rect.width));
        this.canvas.height = Math.max(200, Math.floor(rect.height));
    }

    executeEnterWorld() {
        AudioManager.playClick();
        const worldData = {
            id: `world-${Date.now()}`,
            name: this.state.name || 'Dunia Kreasiku',
            biome: this.state.biome,
            timeOfDay: this.state.timeOfDay,
            worldWidth: this.state.worldWidth || 1800,
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
    // TRUE MINIATURE MAP ENGINE (1:1 SCALE WORLD REPRESENTATION)
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

        // Skala koordinat dunia 1800 x 450 ke ukuran layar canvas saat ini
        const worldW = this.state.worldWidth || 1800;
        const worldH = 450;
        const sx = W / worldW;
        const sy = H / worldH;
        const groundY = 416 * sy;

        ctx.clearRect(0, 0, W, H);

        // 1. SKY GRADIENT BERDASARKAN BIOME
        let skyGradient = ctx.createLinearGradient(0, 0, 0, H);
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
        ctx.fillRect(0, 0, W, H);

        // 2. CELESTIAL SUN / MOON
        if (this.state.biome !== 'cave') {
            const sunX = 280 * sx;
            const sunY = 80 * sy;
            const sunR = Math.max(12, 28 * sy);

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

        // 3. PARALLAX SILHOUETTE MOUNTAINS (Identik dengan CustomWorldScene)
        ctx.fillStyle = this.state.biome === 'cave' ? '#111827' : (this.state.biome === 'desert' ? '#92400e' : '#1e293b');
        ctx.globalAlpha = 0.55;
        for (let x = 0; x < worldW + 200; x += 160) {
            ctx.beginPath();
            ctx.moveTo(x * sx, groundY);
            ctx.lineTo((x + 80) * sx, (240 + (x % 50)) * sy);
            ctx.lineTo((x + 160) * sx, groundY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // 4. TERRAIN MEDAN (TANAH SOLID, JURANG AIR, JURANG LAVA)
        let surfaceColor = '#15803d'; // Forest
        let subColor = '#78350f';

        if (this.state.biome === 'snow') {
            surfaceColor = '#f1f5f9';
            subColor = '#334155';
        } else if (this.state.biome === 'desert') {
            surfaceColor = '#f59e0b';
            subColor = '#b45309';
        } else if (this.state.biome === 'cave') {
            surfaceColor = '#374151';
            subColor = '#111827';
        }

        // Zona Bahaya Koordinat Asli:
        // Water: 560..700
        // Lava: 1000..1160
        const waterStart = 560;
        const waterEnd = 700;
        const lavaStart = 1000;
        const lavaEnd = 1160;

        // Gambar Ground Baseline
        const tileW = 16 * sx; // mini tile
        for (let x = 0; x < worldW; x += 16) {
            const inWater = this.state.hasWater && x >= waterStart && x <= waterEnd;
            const inLava = this.state.hasLava && x >= lavaStart && x <= lavaEnd;

            const rx = x * sx;
            const rw = tileW + 0.5; // anti gap artifact

            if (inWater) {
                // Kolam Air Miniatur
                const waveY = groundY + Math.sin(t * 3 + x * 0.05) * 2;
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(rx, waveY, rw, H - waveY);
                // Busa ombak air
                ctx.fillStyle = '#7dd3fc';
                ctx.fillRect(rx, waveY, rw, 2);
                continue;
            }

            if (inLava) {
                // Kolam Lava Miniatur
                const lavaWaveY = groundY + Math.sin(t * 2 + x * 0.08) * 1.5;
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(rx, lavaWaveY, rw, H - lavaWaveY);
                // Permukaan membara
                ctx.fillStyle = '#f97316';
                ctx.fillRect(rx, lavaWaveY, rw, 2.5);

                // Gelembung mini lava
                if ((x % 32) === 0) {
                    const bubbleY = lavaWaveY - Math.abs(Math.sin(t * 4 + x)) * 6;
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(rx + rw / 2, bubbleY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                continue;
            }

            // Lantai Padat (Permukaan Biome)
            ctx.fillStyle = surfaceColor;
            ctx.fillRect(rx, groundY, rw, 10 * sy);

            // Lapisan Bawah Tanah (Subsoil)
            ctx.fillStyle = subColor;
            ctx.fillRect(rx, groundY + 10 * sy, rw, H - (groundY + 10 * sy));
        }

        // 5. PIJAKAN MELAYANG (FLOATING PLATFORMS & KOIN)
        if (this.state.hasPlatforms) {
            const platforms = [
                { x: 420, y: 320, w: 100 },
                { x: 630, y: 280, w: 120 }, // Jembatan di atas kolam air
                { x: 920, y: 310, w: 90 },
                { x: 1080, y: 270, w: 130 }, // Jembatan di atas kolam lava
                { x: 1380, y: 300, w: 110 }
            ];

            platforms.forEach((p, idx) => {
                const px = p.x * sx;
                const py = p.y * sy;
                const pw = p.w * sx;
                const ph = Math.max(5, 14 * sy);

                // Pijakan Balok
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(px, py, pw, ph);
                ctx.strokeStyle = surfaceColor;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px, py, pw, ph);

                // Koin Emas Berputar di Atas Pijakan
                if (this.state.hasCoins) {
                    const coinX = px + pw / 2;
                    const coinY = py - 10 * sy;
                    const coinW = Math.max(3, Math.abs(Math.sin(t * 3 + idx)) * (6 * sy));

                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.ellipse(coinX, coinY, coinW, 6 * sy, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

        // 6. RINTANGAN DURI (SPIKES)
        if (this.state.hasSpikes) {
            const spikeXList = [380, 850, 1340];
            spikeXList.forEach(spX => {
                const px = spX * sx;
                const py = groundY;
                const sw = Math.max(6, 16 * sx);
                const sh = Math.max(8, 20 * sy);

                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + sw / 2, py - sh);
                ctx.lineTo(px + sw, py);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fca5a5';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        }

        // 7. PETI HARTA (CHEST)
        if (this.state.hasChest) {
            const chestObj = this.state.positions.chest || { x: 800 };
            const cx = chestObj.x * sx;
            const cy = groundY - 14 * sy;
            const cw = Math.max(10, 24 * sx);
            const ch = Math.max(8, 16 * sy);

            ctx.fillStyle = '#b45309';
            ctx.fillRect(cx, cy, cw, ch);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cx, cy, cw, ch);
            // Kunci emas tengah
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx + cw / 2 - 2, cy + ch / 2 - 2, 4, 4);

            // Label mini "CHEST"
            ctx.fillStyle = '#fbbf24';
            ctx.font = `bold ${Math.max(8, 9 * sy)}px 'JetBrains Mono'`;
            ctx.textAlign = 'center';
            ctx.fillText('CHEST', cx + cw / 2, cy - 4);
        }

        // 8. KARAKTER NPC (PENJELAJAH ROH)
        if (this.state.hasNpc) {
            const npcObj = this.state.positions.npc || { x: 300 };
            const npcX = npcObj.x * sx;
            const npcY = groundY - 26 * sy;
            const nw = Math.max(8, 18 * sx);
            const nh = Math.max(12, 26 * sy);

            // Badan Ungu NPC
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(npcX - nw / 2, npcY, nw, nh);
            ctx.strokeStyle = '#d8b4fe';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(npcX - nw / 2, npcY, nw, nh);

            // Mata Kuning
            ctx.fillStyle = '#fde047';
            ctx.fillRect(npcX - 3, npcY + 4, 2, 2);
            ctx.fillRect(npcX + 2, npcY + 4, 2, 2);

            // Balon Interaksi [E]
            const bubbleY = npcY - 8 * sy + Math.sin(t * 4) * 2;
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(npcX - 9, bubbleY - 8, 18, 10);
            ctx.strokeStyle = '#c084fc';
            ctx.strokeRect(npcX - 9, bubbleY - 8, 18, 10);
            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 8px 'JetBrains Mono'";
            ctx.textAlign = 'center';
            ctx.fillText('[E]', npcX, bubbleY);
        }

        // 9. MONSTER SLIME (PATROLI MELOMPAT MINI)
        if (this.state.hasSlime) {
            const slimeObj = this.state.positions.slime || { x: 520 };
            const slimeBaseX = slimeObj.x * sx;
            const patrolOffset = Math.sin(t * 1.5) * (40 * sx);
            const jumpOffset = Math.abs(Math.sin(t * 3)) * (14 * sy);
            const smX = slimeBaseX + patrolOffset;
            const smY = groundY - 10 * sy - jumpOffset;
            const smR = Math.max(5, 10 * sy);

            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(smX, smY, smR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#86efac';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Mata Slime
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(smX - 3, smY - 3, 2, 3);
            ctx.fillRect(smX + 1, smY - 3, 2, 3);
        }

        // 10. MONSTER SKELETON (PATROLI BERJALAN MINI)
        if (this.state.hasSkeleton) {
            const skelObj = this.state.positions.skeleton || { x: 1450 };
            const skelBaseX = skelObj.x * sx;
            const patrolOffset = Math.sin(t * 1.2) * (50 * sx);
            const skX = skelBaseX + patrolOffset;
            const skY = groundY - 24 * sy;
            const skW = Math.max(7, 16 * sx);
            const skH = Math.max(12, 24 * sy);

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(skX - skW / 2, skY, skW, skH);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(skX - skW / 2, skY, skW, skH);

            // Mata Merah Skeleton
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(skX - 3, skY + 4, 2, 2);
            ctx.fillRect(skX + 1, skY + 4, 2, 2);
        }

        // 11. PLAYER AVATAR (TITIK START SPAWN)
        const playerObj = this.state.positions.player || { x: 100 };
        const playerX = playerObj.x * sx;
        const playerY = groundY - 24 * sy;
        const pw = Math.max(8, 18 * sx);
        const ph = Math.max(12, 24 * sy);

        // Badan Player (Cyan Kotak)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(playerX - pw / 2, playerY, pw, ph);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(playerX - pw / 2, playerY, pw, ph);

        // Mata Putih
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playerX - 2, playerY + 4, 3, 3);
        ctx.fillRect(playerX + 3, playerY + 4, 3, 3);

        // Tag Spawn
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(8, 9 * sy)}px 'JetBrains Mono'`;
        ctx.textAlign = 'center';
        ctx.fillText('SPAWN', playerX, playerY - 4);

        // 12. FINISH EXIT PORTAL (PUSARAN PORTAL BERPUTAR)
        if (this.state.hasPortal) {
            const portalObj = this.state.positions.portal || { x: 1700 };
            const portalX = portalObj.x * sx;
            const portalY = (416 - 36) * sy;
            const portalR = Math.max(10, 20 * sy);

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
            ctx.arc(portalX, portalY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Label "GOAL"
            ctx.fillStyle = '#38bdf8';
            ctx.font = `bold ${Math.max(8, 9 * sy)}px 'JetBrains Mono'`;
            ctx.textAlign = 'center';
            ctx.fillText('GOAL', portalX, portalY - portalR - 3);
        }

        // ===============================================================
        // 13. MINIATURE GRID OVERLAY (50px GAME GRID SCALED DOWN PROPORTIONALLY)
        // ===============================================================
        if (this.state.showGrid) {
            ctx.save();
            ctx.lineWidth = 1;

            // Real game tile is 50px. Miniature grid step is: 50 * sx and 50 * sy
            const gridStepX = 50 * sx;
            const gridStepY = 50 * sy;

            // Draw Vertical Grid Lines
            for (let gx = 0; gx <= worldW; gx += 50) {
                const rx = gx * sx;
                const isMajor = (gx % 250) === 0;

                ctx.strokeStyle = isMajor ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx, H);
                ctx.stroke();

                // Draw coordinate text for major lines
                if (isMajor && gx > 0 && gx < worldW) {
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                    ctx.font = "8px 'JetBrains Mono'";
                    ctx.textAlign = 'center';
                    ctx.fillText(`${gx}`, rx, 14);
                }
            }

            // Draw Horizontal Grid Lines
            for (let gy = 0; gy <= worldH; gy += 50) {
                const ry = gy * sy;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
                ctx.beginPath();
                ctx.moveTo(0, ry);
                ctx.lineTo(W, ry);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ===============================================================
        // 14. UNITY TRANSFORM GIZMOS & SELECTION HIGHLIGHT
        // ===============================================================
        if (this.state.showGizmos && this.state.selectedId) {
            const selId = this.state.selectedId;
            const selObj = this.state.positions[selId];
            if (selObj) {
                const ox = selObj.x * sx;
                const oy = groundY - 20 * sy;

                ctx.save();
                // Bounding selection box
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(ox - 18 * sx, oy - 18 * sy, 36 * sx, 36 * sy);
                ctx.setLineDash([]);

                // Transform handles (Corner squares)
                ctx.fillStyle = '#ffffff';
                const corners = [
                    [ox - 18 * sx, oy - 18 * sy],
                    [ox + 18 * sx, oy - 18 * sy],
                    [ox - 18 * sx, oy + 18 * sy],
                    [ox + 18 * sx, oy + 18 * sy]
                ];
                corners.forEach(([cx, cy]) => {
                    ctx.fillRect(cx - 3, cy - 3, 6, 6);
                });

                // Coordinate Tag Badge
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(ox - 30, oy - 30 * sy, 60, 16);
                ctx.strokeStyle = '#38bdf8';
                ctx.strokeRect(ox - 30, oy - 30 * sy, 60, 16);

                ctx.fillStyle = '#38bdf8';
                ctx.font = "bold 9px 'JetBrains Mono'";
                ctx.textAlign = 'center';
                ctx.fillText(`x: ${Math.round(selObj.x)}`, ox, oy - 30 * sy + 11);

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
