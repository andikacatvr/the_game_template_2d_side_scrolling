import { AudioManager } from '../utils/AudioManager.js';

export class SceneBuilderModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.animFrameId = null;

        // Default State
        this.state = {
            name: 'Gurun Api Tengkorak',
            biome: 'desert', // 'dirt' | 'snow' | 'desert' | 'cave'
            timeOfDay: 'day', // 'day' | 'sunset' | 'night'
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
            worldWidth: 1800
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
                @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');

                .gt-sb-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.88);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.2s ease, visibility 0.2s ease;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-sb-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-sb-card {
                    position: relative;
                    width: min(840px, 96vw);
                    max-height: min(640px, 94vh);
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 12px;
                    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: sbEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes sbEnter {
                    0% { transform: scale(0.96); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .gt-sb-overlay.hidden .gt-sb-card {
                    transform: scale(0.96);
                    opacity: 0;
                }

                /* Header */
                .gt-sb-header {
                    height: 48px;
                    background: #1e1e1e;
                    border-bottom: 1px solid #2d2d2d;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px;
                    flex-shrink: 0;
                }

                .gt-sb-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-sb-badge-icon {
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
                }

                .gt-sb-title {
                    font-size: 14.5px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                }

                .gt-sb-logo-tag {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 7px;
                    background: rgba(56, 189, 248, 0.15);
                    color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.3);
                    border-radius: 4px;
                }

                .gt-sb-close-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: transparent;
                    border: none;
                    color: #9e9e9e;
                    font-size: 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }

                .gt-sb-close-btn:hover {
                    background: #e11d48;
                    color: #ffffff;
                }

                /* Body Studio */
                .gt-sb-body {
                    padding: 18px 20px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: #141414;
                    flex: 1;
                }

                .gt-sb-body::-webkit-scrollbar {
                    width: 6px;
                }
                .gt-sb-body::-webkit-scrollbar-thumb {
                    background: #282828;
                    border-radius: 3px;
                }

                /* Live Canvas Preview */
                .gt-sb-preview-wrap {
                    position: relative;
                    width: 100%;
                    height: 185px;
                    background: #0f172a;
                    border: 1px solid #333333;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
                }

                #gt-sb-canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }

                .gt-sb-preview-badge {
                    position: absolute;
                    top: 10px;
                    left: 12px;
                    padding: 3px 8px;
                    background: rgba(0, 0, 0, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #38bdf8;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    backdrop-filter: blur(4px);
                }

                .gt-sb-preview-badge::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 6px #22c55e;
                }

                /* Settings Row */
                .gt-sb-row {
                    display: grid;
                    grid-template-columns: 1.1fr 1.4fr;
                    gap: 14px;
                }

                @media (max-width: 680px) {
                    .gt-sb-row {
                        grid-template-columns: 1fr;
                    }
                }

                .gt-sb-section {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 8px;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-sb-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-sb-input-wrap {
                    display: flex;
                    gap: 8px;
                }

                .gt-sb-input {
                    flex: 1;
                    background: #121214;
                    border: 1px solid #333338;
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: #f4f4f5;
                    font-size: 13px;
                    font-family: 'Jost', sans-serif;
                    outline: none;
                }

                .gt-sb-input:focus {
                    border-color: #38bdf8;
                }

                .gt-sb-btn-random {
                    background: #27272a;
                    border: 1px solid #3f3f46;
                    color: #f4f4f5;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-sb-btn-random:hover {
                    background: #323238;
                    border-color: #52525b;
                }

                /* Biome Selector Grid */
                .gt-sb-biomes {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }

                .gt-sb-biome-btn {
                    background: #121214;
                    border: 1px solid #2e2e33;
                    border-radius: 6px;
                    padding: 8px 4px;
                    color: #a1a1aa;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.15s ease;
                }

                .gt-sb-biome-btn:hover {
                    background: #1f1f23;
                    border-color: #3f3f46;
                    color: #ffffff;
                }

                .gt-sb-biome-btn.active {
                    background: #172554;
                    border-color: #38bdf8;
                    color: #38bdf8;
                    box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
                }

                /* Palette Component Chips */
                .gt-sb-palette-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 8px;
                }

                .gt-sb-chip {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 7px;
                    padding: 7px 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-sb-chip:hover {
                    background: #202024;
                    border-color: #38383e;
                }

                .gt-sb-chip.active {
                    background: #13271d;
                    border-color: #22c55e;
                }

                .gt-sb-chip-left {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #e4e4e7;
                }

                .gt-sb-chip-check {
                    width: 14px;
                    height: 14px;
                    border-radius: 3px;
                    border: 1.5px solid #52525b;
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

                /* Footer */
                .gt-sb-footer {
                    padding: 12px 20px;
                    background: #181818;
                    border-top: 1px solid #282828;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    flex-shrink: 0;
                }

                .gt-sb-status-text {
                    font-size: 12px;
                    font-weight: 600;
                    color: #94a3b8;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-sb-btn-enter {
                    background: linear-gradient(135deg, #0284c7 0%, #0284c7 50%, #38bdf8 100%);
                    border: 1px solid #38bdf8;
                    color: #ffffff;
                    padding: 8px 22px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s ease;
                    box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);
                }

                .gt-sb-btn-enter:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.55);
                    filter: brightness(1.1);
                }
            </style>

            <div class="gt-sb-card" id="gt-sb-card">
                <!-- Header -->
                <div class="gt-sb-header">
                    <div class="gt-sb-header-left">
                        <span class="gt-sb-badge-icon">🛠️</span>
                        <span class="gt-sb-title">Scene &amp; World Creator Studio</span>
                        <span class="gt-sb-logo-tag">Visual Builder</span>
                    </div>
                    <button class="gt-sb-close-btn" id="gt-sb-close-btn" title="Close (ESC)">✕</button>
                </div>

                <!-- Body -->
                <div class="gt-sb-body">
                    <!-- Live Preview Viewport -->
                    <div class="gt-sb-preview-wrap">
                        <canvas id="gt-sb-canvas" width="760" height="200"></canvas>
                        <div class="gt-sb-preview-badge">LIVE STAGE PREVIEW</div>
                    </div>

                    <!-- Row 1: Setting & Biome -->
                    <div class="gt-sb-row">
                        <!-- Left: Nama Level -->
                        <div class="gt-sb-section">
                            <div class="gt-sb-section-title">
                                <span>🏷️ Nama Dunia / Level</span>
                            </div>
                            <div class="gt-sb-input-wrap">
                                <input type="text" class="gt-sb-input" id="gt-sb-input-name" value="${this.state.name}" placeholder="Beri nama dunia kamu..." />
                                <button class="gt-sb-btn-random" id="gt-sb-btn-random" title="Pilih nama acak keren">🎲 Acak</button>
                            </div>
                        </div>

                        <!-- Right: Tema Lantai / Biome -->
                        <div class="gt-sb-section">
                            <div class="gt-sb-section-title">
                                <span>🌍 Tema Medan &amp; Lantai</span>
                            </div>
                            <div class="gt-sb-biomes">
                                <button class="gt-sb-biome-btn ${this.state.biome === 'desert' ? 'active' : ''}" data-biome="desert">
                                    <span style="font-size: 15px;">🏜️</span>
                                    <span>Gurun Pasir</span>
                                </button>
                                <button class="gt-sb-biome-btn ${this.state.biome === 'snow' ? 'active' : ''}" data-biome="snow">
                                    <span style="font-size: 15px;">❄️</span>
                                    <span>Puncak Salju</span>
                                </button>
                                <button class="gt-sb-biome-btn ${this.state.biome === 'dirt' ? 'active' : ''}" data-biome="dirt">
                                    <span style="font-size: 15px;">🌲</span>
                                    <span>Hutan Dirt</span>
                                </button>
                                <button class="gt-sb-biome-btn ${this.state.biome === 'cave' ? 'active' : ''}" data-biome="cave">
                                    <span style="font-size: 15px;">🌋</span>
                                    <span>Gua Obsidian</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Row 2: Komponen Palette (The Unity Asset Drawer) -->
                    <div class="gt-sb-section">
                        <div class="gt-sb-section-title">
                            <span>📦 Komponen Bahaya, Monster &amp; Objek (Klik untuk Tambah/Hapus)</span>
                        </div>
                        <div class="gt-sb-palette-grid">
                            <!-- Lava -->
                            <div class="gt-sb-chip ${this.state.hasLava ? 'active' : ''}" data-prop="hasLava">
                                <div class="gt-sb-chip-left"><span>🌋</span><span>Kolam Lava</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Water -->
                            <div class="gt-sb-chip ${this.state.hasWater ? 'active' : ''}" data-prop="hasWater">
                                <div class="gt-sb-chip-left"><span>🌊</span><span>Kolam Air</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Spikes -->
                            <div class="gt-sb-chip ${this.state.hasSpikes ? 'active' : ''}" data-prop="hasSpikes">
                                <div class="gt-sb-chip-left"><span>⚠️</span><span>Rintangan Duri</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Platforms -->
                            <div class="gt-sb-chip ${this.state.hasPlatforms ? 'active' : ''}" data-prop="hasPlatforms">
                                <div class="gt-sb-chip-left"><span>🧱</span><span>Pijakan Melayang</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Slime Monster -->
                            <div class="gt-sb-chip ${this.state.hasSlime ? 'active' : ''}" data-prop="hasSlime">
                                <div class="gt-sb-chip-left"><span>🟢</span><span>Monster Slime</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Skeleton Monster -->
                            <div class="gt-sb-chip ${this.state.hasSkeleton ? 'active' : ''}" data-prop="hasSkeleton">
                                <div class="gt-sb-chip-left"><span>💀</span><span>Monster Skeleton</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- NPC Story -->
                            <div class="gt-sb-chip ${this.state.hasNpc ? 'active' : ''}" data-prop="hasNpc">
                                <div class="gt-sb-chip-left"><span>🧙</span><span>Karakter NPC</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Chest & Coins -->
                            <div class="gt-sb-chip ${this.state.hasChest ? 'active' : ''}" data-prop="hasChest">
                                <div class="gt-sb-chip-left"><span>🪙</span><span>Koin &amp; Peti Harta</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                            <!-- Portal Finish -->
                            <div class="gt-sb-chip ${this.state.hasPortal ? 'active' : ''}" data-prop="hasPortal">
                                <div class="gt-sb-chip-left"><span>🌀</span><span>Portal Finish</span></div>
                                <div class="gt-sb-chip-check">✓</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Action Bar -->
                <div class="gt-sb-footer">
                    <span class="gt-sb-status-text" id="gt-sb-status">✨ Siap Dimainkan Secara Instan</span>
                    <button class="gt-sb-btn-enter" id="gt-sb-btn-enter">
                        <span>🚀 Buat &amp; Masuki Dunia (Enter World)</span>
                        <span>➔</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.canvas = this.overlay.querySelector('#gt-sb-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.bindEvents();
    }

    bindEvents() {
        const overlay = this.overlay;
        const closeBtn = overlay.querySelector('#gt-sb-close-btn');
        const enterBtn = overlay.querySelector('#gt-sb-btn-enter');
        const randomBtn = overlay.querySelector('#gt-sb-btn-random');
        const nameInput = overlay.querySelector('#gt-sb-input-name');

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

        // Biome Buttons
        overlay.querySelectorAll('.gt-sb-biome-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playClick();
                overlay.querySelectorAll('.gt-sb-biome-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.biome = btn.getAttribute('data-biome');
            });
        });

        // Component Palette Toggle Chips
        overlay.querySelectorAll('.gt-sb-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                AudioManager.playClick();
                const prop = chip.getAttribute('data-prop');
                this.state[prop] = !this.state[prop];
                if (this.state[prop]) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                AudioManager.playClick();
                this.hide();
            });
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                AudioManager.playClick();
                this.hide();
            }
        });

        // Tombol Eksekusi "🚀 Buat & Masuki Dunia"
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                this.executeEnterWorld();
            });
        }

        // Keyboard ESC
        this._escHandler = (e) => {
            if (this._isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
                AudioManager.playClick();
                this.hide();
            }
        };
        window.addEventListener('keydown', this._escHandler);
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
    // LIVE INTERACTIVE CANVAS PREVIEW (THE UNITY SCENE VIEW)
    // ===============================================================
    startPreviewLoop() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

        const render = () => {
            if (!this._isOpen) return;
            this.animTime += 0.05;
            this.drawPreview();
            this.animFrameId = requestAnimationFrame(render);
        };
        this.animFrameId = requestAnimationFrame(render);
    }

    drawPreview() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const t = this.animTime;

        ctx.clearRect(0, 0, w, h);

        // 1. Sky Gradient berdasarkan Biome
        let skyTop = '#0284c7';
        let skyBottom = '#38bdf8';
        let groundSurface = '#15803d'; // Forest
        let groundSub = '#78350f';

        if (this.state.biome === 'snow') {
            skyTop = '#1e293b';
            skyBottom = '#60a5fa';
            groundSurface = '#f1f5f9';
            groundSub = '#334155';
        } else if (this.state.biome === 'desert') {
            skyTop = '#b45309';
            skyBottom = '#f59e0b';
            groundSurface = '#f59e0b';
            groundSub = '#92400e';
        } else if (this.state.biome === 'cave') {
            skyTop = '#090d16';
            skyBottom = '#1e1b4b';
            groundSurface = '#374151';
            groundSub = '#111827';
        }

        const grad = ctx.createLinearGradient(0, 0, 0, h - 50);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(1, skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 2. Parallax Mountain Silhouettes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, h - 50);
        for (let x = 0; x <= w; x += 60) {
            const my = (h - 90) + Math.sin(x * 0.02 + 1) * 20;
            ctx.lineTo(x, my);
        }
        ctx.lineTo(w, h - 50);
        ctx.closePath();
        ctx.fill();

        // 3. Ground & Underground
        const groundY = h - 45;

        // Base ground fill
        ctx.fillStyle = groundSub;
        ctx.fillRect(0, groundY, w, 45);

        // Surface grass / snow / sand layer
        ctx.fillStyle = groundSurface;
        ctx.fillRect(0, groundY, w, 10);

        // 4. Water Pool
        if (this.state.hasWater) {
            const wx = 180;
            const ww = 80;
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(wx, groundY + 2, ww, 43);
            // Water ripples
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const rip = Math.sin(t * 2) * 2;
            ctx.fillRect(wx + 10, groundY + 6 + rip, 30, 2);
            ctx.fillRect(wx + 45, groundY + 14 - rip, 25, 2);
        }

        // 5. Lava Pool
        if (this.state.hasLava) {
            const lx = 370;
            const lw = 90;
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(lx, groundY + 2, lw, 43);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(lx, groundY + 2, lw, 5);

            // Lava bubbles
            const bY1 = groundY + 20 - ((t * 20) % 25);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(lx + 25, bY1, 3, 0, Math.PI * 2);
            ctx.arc(lx + 65, bY1 - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. Spikes
        if (this.state.hasSpikes) {
            const sx = 300;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(sx, groundY);
            ctx.lineTo(sx + 8, groundY - 14);
            ctx.lineTo(sx + 16, groundY);
            ctx.moveTo(sx + 16, groundY);
            ctx.lineTo(sx + 24, groundY - 14);
            ctx.lineTo(sx + 32, groundY);
            ctx.closePath();
            ctx.fill();
        }

        // 7. Floating Platforms
        if (this.state.hasPlatforms) {
            // Plat 1 di atas kolam air
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(195, groundY - 50, 50, 10);
            ctx.fillStyle = groundSurface;
            ctx.fillRect(195, groundY - 50, 50, 3);

            // Plat 2 di atas kolam lava
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(390, groundY - 55, 55, 10);
            ctx.fillStyle = groundSurface;
            ctx.fillRect(390, groundY - 55, 55, 3);

            // Floating Coins
            if (this.state.hasCoins) {
                const coinBob = Math.sin(t * 3) * 3;
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(220, groundY - 65 + coinBob, 5, 0, Math.PI * 2);
                ctx.arc(418, groundY - 70 + coinBob, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 8. Player Hero (Start Point)
        const px = 50;
        const py = groundY - 26;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px, py, 18, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 4, py + 6, 4, 4);
        ctx.fillRect(px + 11, py + 6, 4, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 6, py + 8, 2, 2);
        ctx.fillRect(px + 13, py + 8, 2, 2);

        // 9. Friendly NPC
        if (this.state.hasNpc) {
            const nx = 120;
            const ny = groundY - 26;
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(nx, ny, 18, 26);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(nx + 4, ny + 6, 3, 3);
            ctx.fillRect(nx + 11, ny + 6, 3, 3);

            // Dialogue bubble
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(nx - 4, ny - 16, 26, 12);
            ctx.fillStyle = '#000000';
            ctx.font = '8px sans-serif';
            ctx.fillText('[E]', nx + 4, ny - 7);
        }

        // 10. Monster Slime
        if (this.state.hasSlime) {
            const slimeHop = Math.abs(Math.sin(t * 3)) * 12;
            const slx = 510;
            const sly = groundY - 14 - slimeHop;
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(slx + 10, sly + 6, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(slx + 5, sly + 2, 3, 3);
            ctx.fillRect(slx + 11, sly + 2, 3, 3);
        }

        // 11. Monster Skeleton
        if (this.state.hasSkeleton) {
            const skx = 580;
            const sky = groundY - 24;
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(skx, sky, 16, 24);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(skx + 4, sky + 5, 3, 3);
            ctx.fillRect(skx + 9, sky + 5, 3, 3);
        }

        // 12. Chest
        if (this.state.hasChest) {
            const cx = 650;
            const cy = groundY - 14;
            ctx.fillStyle = '#b45309';
            ctx.fillRect(cx, cy, 18, 14);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx + 7, cy + 5, 4, 4);
        }

        // 13. Portal Finish
        if (this.state.hasPortal) {
            const ptx = w - 40;
            const pty = groundY - 22;
            const rot = t * 2;
            ctx.save();
            ctx.translate(ptx, pty);
            ctx.rotate(rot);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(ptx, pty, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    show() {
        if (!this.overlay) return;
        this._isOpen = true;
        this.overlay.classList.remove('hidden');
        this.startPreviewLoop();

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
