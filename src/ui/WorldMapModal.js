import { AudioManager } from '../utils/AudioManager.js';
import { ProjectManager } from '../utils/ProjectManager.js';

// ===============================================================
// WORLD MAP MODAL (TORAM ONLINE STYLE INTERCONNECTED SCENE MAP)
// ===============================================================
// Peta dunia RPG real-time yang akurat mendeteksi lokasi pemain
// (baik di Tutorial / Story Campaign, maupun di Custom Projects),
// menampilkan graf rute jalan batu (cobblestone roads) antar-scene,
// dan mendukung fitur Quick Travel / Teleportasi instan.
// ===============================================================

export class WorldMapModal {
    static instance = null;

    static show(scene) {
        if (this.instance) {
            this.instance.close();
        }
        this.instance = new WorldMapModal(scene);
        this.instance.open();
    }

    static close() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }

    constructor(scene) {
        this.scene = scene;
        this.dom = null;
        this.realtimeLocation = this.detectRealtimePlayerLocation();
        
        // Peta yang aktif ditampilkan:
        // Jika pemain di custom world, buka project tersebut.
        // Jika pemain di GameScene/HongKongScene/dll (Tutorial & Story), buka Story Campaign.
        if (this.realtimeLocation.mode === 'custom' && this.realtimeLocation.projectId) {
            this.activeViewProjectId = this.realtimeLocation.projectId;
        } else {
            this.activeViewProjectId = 'story_campaign';
        }

        this.selectedSceneId = this.realtimeLocation.sceneId;
    }

    // Mendeteksi lokasi real-time pemain saat ini secara presisi
    detectRealtimePlayerLocation() {
        const sceneKey = this.scene && this.scene.scene ? this.scene.scene.key : '';

        if (sceneKey === 'GameScene') {
            return {
                mode: 'story',
                sceneId: 'GameScene',
                sceneName: 'Tutorial Part I',
                biome: 'snow'
            };
        }
        if (sceneKey === 'HongKongScene' || sceneKey === 'Scene2') {
            return {
                mode: 'story',
                sceneId: 'Scene2',
                sceneName: 'Tutorial Part II',
                biome: 'dirt'
            };
        }
        if (sceneKey === 'CrystalCaveScene') {
            return {
                mode: 'story',
                sceneId: 'CrystalCaveScene',
                sceneName: 'Level 3 • Labirin Gua Kristal',
                biome: 'cave'
            };
        }
        if (sceneKey === 'CustomWorldScene') {
            const sId = this.scene.sceneId || (this.scene.worldData ? this.scene.worldData.id : null);
            const sName = (this.scene.worldData && this.scene.worldData.name) ? this.scene.worldData.name : 'Custom Scene';
            return {
                mode: 'custom',
                projectId: this.scene.projectId || null,
                sceneId: sId,
                sceneName: sName,
                biome: (this.scene.worldData && this.scene.worldData.biome) || 'desert'
            };
        }
        if (sceneKey === 'Scene3') {
            return {
                mode: 'sandbox',
                sceneId: 'Scene3',
                sceneName: 'Sandbox World • Lab Koding',
                biome: 'dirt'
            };
        }
        return {
            mode: 'story',
            sceneId: 'GameScene',
            sceneName: 'Level 1 • Lembah Salju (Tutorial)',
            biome: 'snow'
        };
    }

    open() {
        AudioManager.playClick();
        this.buildDOM();
        document.body.appendChild(this.dom);
        this.bindEvents();
    }

    destroy() {
        if (this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
        }
        this.dom = null;
        WorldMapModal.instance = null;
    }

    close() {
        this.destroy();
    }

    // Mengambil daftar project yang tersedia untuk switcher
    getAvailableProjects() {
        return ProjectManager.getSelectableProjects();
    }

    // Mengambil data seluruh scene pada project/campaign yang sedang dilihat
    getScenesData() {
        let scenes = [];
        let projectName = '';

        if (this.activeViewProjectId === 'story_campaign') {
            projectName = 'Campaign Petualangan Utama (Tutorial)';
            scenes = [
                {
                    id: 'GameScene',
                    name: 'Tutorial Part I',
                    biome: 'snow',
                    worldWidth: 3000,
                    worldHeight: 1000,
                    hasSlime: true,
                    hasCoins: true,
                    hasPortal: true,
                    desc: 'Tempat mempelajari kontrol jalan, lompat, koin emas, dan dasar petualangan.'
                },
                {
                    id: 'Scene2',
                    name: 'Tutorial Part II',
                    biome: 'dirt',
                    worldWidth: 2200,
                    worldHeight: 850,
                    hasSkeleton: true,
                    hasPlatforms: true,
                    hasPortal: true,
                    desc: 'Pelabuhan malam Teluk Victoria dengan kapal tongkang terapung, rintangan vertikal, dan portal finish kemenangan.'
                }
            ];
        } else {
            const project = ProjectManager.getProject(this.activeViewProjectId);
            if (project && Array.isArray(project.scenes) && project.scenes.length > 0) {
                projectName = project.name || 'Project Game';
                scenes = project.scenes.map((s, idx) => ({
                    id: s.id,
                    name: s.name || `Level ${idx + 1}`,
                    biome: s.biome || 'desert',
                    worldWidth: s.worldWidth || 1800,
                    worldHeight: s.worldHeight || 850,
                    hasLava: s.hasLava,
                    hasWater: s.hasWater,
                    hasSpikes: s.hasSpikes,
                    hasSlime: s.hasSlime,
                    hasSkeleton: s.hasSkeleton,
                    hasNpc: s.hasNpc,
                    hasChest: s.hasChest,
                    hasCoins: s.hasCoins,
                    hasPortal: s.hasPortal,
                    entities: s.entities || [],
                    desc: `Dunia petualangan modular dengan tema ${s.biome}.`
                }));
            } else {
                projectName = 'Project Kreasiku';
                scenes = [
                    {
                        id: 'scene_default_1',
                        name: 'Level 1 • Area Baru',
                        biome: 'desert',
                        worldWidth: 1800,
                        worldHeight: 850,
                        hasPortal: true,
                        desc: 'Area petualangan baru.'
                    }
                ];
            }
        }

        // Tandai isCurrent secara real-time berdasarkan posisi aktual pemain
        scenes = scenes.map((s, idx) => ({
            ...s,
            index: idx + 1,
            isCurrent: (s.id === this.realtimeLocation.sceneId || (s.id === 'Scene2' && this.realtimeLocation.sceneId === 'HongKongScene') || (s.id === 'HongKongScene' && this.realtimeLocation.sceneId === 'Scene2'))
        }));

        // Pastikan selectedSceneId valid
        if (!this.selectedSceneId || !scenes.some(s => s.id === this.selectedSceneId)) {
            const cur = scenes.find(s => s.isCurrent);
            this.selectedSceneId = cur ? cur.id : scenes[0].id;
        }

        let connections = null;
        let hasConfiguredFlowGraph = false;

        if (this.activeViewProjectId !== 'story_campaign') {
            const project = ProjectManager.getProject(this.activeViewProjectId);
            if (project) {
                hasConfiguredFlowGraph = !!project.hasConfiguredFlowGraph;
                connections = Array.isArray(project.connections) ? project.connections : null;
            }
        }

        return {
            projectId: this.activeViewProjectId,
            projectName,
            scenes,
            connections,
            hasConfiguredFlowGraph
        };
    }

    getBiomeIcon(biome) {
        switch (biome) {
            case 'snow': return '❄️';
            case 'desert': return '🏜️';
            case 'cave': return '🌋';
            case 'dirt': return '🌲';
            default: return '🌍';
        }
    }

    getBiomeLandmarkSVG(biome) {
        switch (biome) {
            case 'snow':
                return `
                    <svg viewBox="0 0 100 80" class="gt-landmark-svg">
                        <!-- Pegunungan Salju & Awan Melayang Toram Style -->
                        <polygon points="50,10 75,55 25,55" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>
                        <polygon points="50,10 60,30 50,26 40,30" fill="#ffffff"/>
                        <polygon points="25,25 45,60 5,60" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2"/>
                        <polygon points="25,25 33,38 25,35 17,38" fill="#ffffff"/>
                        <polygon points="75,22 95,60 55,60" fill="#bfdbfe" stroke="#1e3a8a" stroke-width="2"/>
                        <polygon points="75,22 83,36 75,33 67,36" fill="#ffffff"/>
                        <!-- Pohon Cemara -->
                        <polygon points="35,45 42,62 28,62" fill="#1e293b"/>
                        <polygon points="35,45 39,52 35,50 31,52" fill="#ffffff"/>
                        <!-- Awan Putih -->
                        <ellipse cx="78" cy="18" rx="14" ry="5" fill="#f8fafc" opacity="0.95"/>
                        <ellipse cx="20" cy="16" rx="12" ry="4" fill="#f8fafc" opacity="0.9"/>
                    </svg>
                `;
            case 'desert':
                return `
                    <svg viewBox="0 0 100 80" class="gt-landmark-svg">
                        <!-- Piramida Gurun & Reruntuhan Pilar Kuno -->
                        <polygon points="50,15 88,60 12,60" fill="#d97706" stroke="#78350f" stroke-width="2"/>
                        <polygon points="50,15 88,60 50,60" fill="#b45309"/>
                        <!-- Pilar Reruntuhan -->
                        <rect x="22" y="32" width="6" height="26" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
                        <rect x="20" y="30" width="10" height="4" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
                        <rect x="72" y="36" width="6" height="22" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
                        <rect x="70" y="34" width="10" height="4" fill="#fde68a" stroke="#78350f" stroke-width="1.5"/>
                        <path d="M5,62 Q50,54 95,62" stroke="#78350f" stroke-width="2.5" fill="none"/>
                    </svg>
                `;
            case 'cave':
                return `
                    <svg viewBox="0 0 100 80" class="gt-landmark-svg">
                        <!-- Gunung Vulkanik & Mulut Gua Magma -->
                        <polygon points="50,12 85,62 15,62" fill="#334155" stroke="#0f172a" stroke-width="2"/>
                        <polygon points="50,12 85,62 60,62" fill="#1e293b"/>
                        <path d="M40,62 Q50,38 60,62 Z" fill="#090d16" stroke="#ef4444" stroke-width="2"/>
                        <ellipse cx="50" cy="56" rx="6" ry="3" fill="#f97316"/>
                        <path d="M48,25 L53,35 L47,44" stroke="#ef4444" stroke-width="2" fill="none"/>
                    </svg>
                `;
            case 'dirt':
            default:
                return `
                    <svg viewBox="0 0 100 80" class="gt-landmark-svg">
                        <!-- Bukit Hijau Asri & Pohon Rindang Marbaro -->
                        <ellipse cx="50" cy="60" rx="42" ry="14" fill="#65a30d" stroke="#365314" stroke-width="2"/>
                        <circle cx="50" cy="30" r="18" fill="#22c55e" stroke="#14532d" stroke-width="2"/>
                        <circle cx="36" cy="36" r="14" fill="#16a34a" stroke="#14532d" stroke-width="2"/>
                        <circle cx="64" cy="36" r="14" fill="#15803d" stroke="#14532d" stroke-width="2"/>
                        <rect x="46" y="44" width="8" height="18" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
                        <ellipse cx="22" cy="18" rx="12" ry="4" fill="#f8fafc" opacity="0.95"/>
                    </svg>
                `;
        }
    }

    // Menghitung layout node yang proporsional dan terpusat di kanvas (tanpa scrollbar)
    calculateNodeLayout(count) {
        const positions = [];

        if (count === 1) {
            positions.push({ x: 330, y: 240 });
        } else if (count === 2) {
            positions.push({ x: 200, y: 240 });
            positions.push({ x: 460, y: 240 });
        } else if (count === 3) {
            // Lengkungan 3 level (Tutorial -> Level 2 -> Level 3)
            positions.push({ x: 140, y: 270 });
            positions.push({ x: 330, y: 190 });
            positions.push({ x: 520, y: 270 });
        } else if (count === 4) {
            positions.push({ x: 120, y: 280 });
            positions.push({ x: 260, y: 190 });
            positions.push({ x: 400, y: 280 });
            positions.push({ x: 540, y: 190 });
        } else {
            // Serpentine multi-baris
            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / 3);
                const col = (row % 2 === 0) ? (i % 3) : (2 - (i % 3));
                const x = 140 + col * 190;
                const y = 140 + row * 150;
                positions.push({ x, y });
            }
        }
        return positions;
    }

    buildDOM() {
        const { projectName, scenes, connections, hasConfiguredFlowGraph } = this.getScenesData();
        const availableProjects = this.getAvailableProjects();

        const nodePositions = this.calculateNodeLayout(scenes.length);

        // Map scene.id ke posisi koordinat di kanvas
        const scenePosMap = new Map();
        scenes.forEach((s, idx) => {
            scenePosMap.set(s.id, nodePositions[idx] || { x: 150 + idx * 170, y: 240 });
        });

        // Tentukan koneksi rute yang aktif sesuai Flow Graph
        let activeConnections = [];
        if (this.activeViewProjectId === 'story_campaign') {
            for (let i = 0; i < scenes.length - 1; i++) {
                activeConnections.push({ fromSceneId: scenes[i].id, toSceneId: scenes[i + 1].id });
            }
        } else if (hasConfiguredFlowGraph || connections !== null) {
            activeConnections = Array.isArray(connections) ? connections : [];
        } else {
            // Fallback sekuensial hanya jika belum pernah membuka Flow Graph
            for (let i = 0; i < scenes.length - 1; i++) {
                activeConnections.push({ fromSceneId: scenes[i].id, toSceneId: scenes[i + 1].id });
            }
        }

        // Set koneksi aktif untuk validasi cepat
        const connectedPairs = new Set();
        activeConnections.forEach(c => {
            if (c.fromSceneId && c.toSceneId) {
                connectedPairs.add(`${c.fromSceneId}->${c.toSceneId}`);
            }
        });

        // Buat jalan setapak (paved cobblestone roads ala Toram Online)
        let roadsSVG = '';

        // 1. Gambar jalan yang BENAR-BENAR TERSAMBUNG di Flow Graph
        activeConnections.forEach(conn => {
            const p1 = scenePosMap.get(conn.fromSceneId);
            const p2 = scenePosMap.get(conn.toSceneId);
            if (p1 && p2) {
                roadsSVG += `
                    <!-- Shadow jalan batu tersambung -->
                    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#6e583c" stroke-width="14" stroke-linecap="round"/>
                    <!-- Cobblestone pavers -->
                    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#d3be96" stroke-width="10" stroke-linecap="round"/>
                    <!-- Garis pembagi batu tengah -->
                    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#937a57" stroke-width="2" stroke-dasharray="6,5"/>
                `;
            }
        });

        // 2. Gambar visual jalan putus (severed broken road) jika level berurutan tidak tersambung di Flow Graph
        for (let i = 0; i < scenes.length - 1; i++) {
            const s1 = scenes[i];
            const s2 = scenes[i + 1];
            const isConnected = connectedPairs.has(`${s1.id}->${s2.id}`) || connectedPairs.has(`${s2.id}->${s1.id}`);

            if (!isConnected) {
                const p1 = scenePosMap.get(s1.id);
                const p2 = scenePosMap.get(s2.id);
                if (p1 && p2) {
                    // Jalan hanya menjulur 28% dari masing-masing node lalu terputus
                    const p1Cut = {
                        x: p1.x + (p2.x - p1.x) * 0.28,
                        y: p1.y + (p2.y - p1.y) * 0.28
                    };
                    const p2Cut = {
                        x: p2.x + (p1.x - p2.x) * 0.28,
                        y: p2.y + (p1.y - p2.y) * 0.28
                    };
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;

                    roadsSVG += `
                        <!-- Ujung jalan putus dari Node 1 -->
                        <line x1="${p1.x}" y1="${p1.y}" x2="${p1Cut.x}" y2="${p1Cut.y}" stroke="#4a3720" stroke-width="14" stroke-linecap="square"/>
                        <line x1="${p1.x}" y1="${p1.y}" x2="${p1Cut.x}" y2="${p1Cut.y}" stroke="#8c7356" stroke-width="10" stroke-linecap="square"/>
                        <line x1="${p1Cut.x - 2}" y1="${p1Cut.y - 6}" x2="${p1Cut.x + 2}" y2="${p1Cut.y + 6}" stroke="#ef4444" stroke-width="2.5"/>

                        <!-- Celah Terputus (Garis retakan merah putus-putus & penanda putus) -->
                        <line x1="${p1Cut.x}" y1="${p1Cut.y}" x2="${p2Cut.x}" y2="${p2Cut.y}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="4,4" opacity="0.55"/>
                        <circle cx="${midX}" cy="${midY}" r="11" fill="#1b130a" stroke="#ef4444" stroke-width="1.5"/>
                        <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ef4444" font-family="'JetBrains Mono', monospace">✕</text>

                        <!-- Ujung jalan putus dari Node 2 -->
                        <line x1="${p2Cut.x}" y1="${p2Cut.y}" x2="${p2.x}" y2="${p2.y}" stroke="#4a3720" stroke-width="14" stroke-linecap="square"/>
                        <line x1="${p2Cut.x}" y1="${p2Cut.y}" x2="${p2.x}" y2="${p2.y}" stroke="#8c7356" stroke-width="10" stroke-linecap="square"/>
                        <line x1="${p2Cut.x - 2}" y1="${p2Cut.y - 6}" x2="${p2Cut.x + 2}" y2="${p2Cut.y + 6}" stroke="#ef4444" stroke-width="2.5"/>
                    `;
                }
            }
        }

        // Render setiap node
        const nodesHTML = scenes.map((scene, idx) => {
            const pos = nodePositions[idx] || { x: 150 + idx * 170, y: 240 };
            const isSelected = scene.id === this.selectedSceneId;
            const isCurrent = scene.isCurrent;

            return `
                <div class="gt-tmap-node ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-current' : ''}" 
                     style="left: ${pos.x}px; top: ${pos.y}px;"
                     data-id="${scene.id}" 
                     data-index="${idx}"
                     title="Klik untuk info scene: ${scene.name}">
                    
                    ${isCurrent ? `
                        <div class="gt-tmap-you-are-here">
                            <span class="gt-tmap-pin">📍</span>
                            <span class="gt-tmap-pin-text">KAMU DI SINI</span>
                        </div>
                    ` : ''}

                    <div class="gt-tmap-island-pedestal">
                        ${this.getBiomeLandmarkSVG(scene.biome)}
                    </div>

                    <div class="gt-tmap-label-plate">
                        <span class="gt-tmap-level-num">#${idx + 1}</span>
                        <span class="gt-tmap-level-name">${scene.name}</span>
                    </div>

                    ${isCurrent ? '<div class="gt-tmap-active-glow"></div>' : ''}
                </div>
            `;
        }).join('');

        const projectOptionsHTML = availableProjects.map(p => `
            <option value="${p.id}" ${p.id === this.activeViewProjectId ? 'selected' : ''}>
                ${p.name}
            </option>
        `).join('');

        this.dom = document.createElement('div');
        this.dom.className = 'gt-worldmap-overlay';
        this.dom.id = 'gt-worldmap-modal';

        this.dom.innerHTML = `
            <style>
                .gt-worldmap-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(6, 9, 15, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    animation: gtMapFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: none;
                }

                @keyframes gtMapFadeIn {
                    from { opacity: 0; transform: scale(0.97); }
                    to { opacity: 1; transform: scale(1); }
                }

                .gt-worldmap-container {
                    width: 1040px;
                    max-width: 95vw;
                    height: 620px;
                    max-height: 90vh;
                    background: #14110d;
                    border: 2px solid #5a452a;
                    border-radius: 14px;
                    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(217, 119, 6, 0.25);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }

                /* Header Ornate RPG */
                .gt-worldmap-header {
                    padding: 12px 22px;
                    background: linear-gradient(180deg, #241c14 0%, #17120c 100%);
                    border-bottom: 2px solid #4a3720;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-worldmap-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gt-worldmap-title-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    background: #3b2a16;
                    border: 1.5px solid #d97706;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    box-shadow: 0 0 12px rgba(217, 119, 6, 0.4);
                }

                .gt-worldmap-title {
                    font-size: 16.5px;
                    font-weight: 800;
                    color: #fef3c7;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }

                .gt-worldmap-subtitle {
                    font-size: 11px;
                    color: #d4a373;
                    margin-top: 3px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-worldmap-select {
                    background: #2b1f13;
                    border: 1px solid #6b4d2a;
                    border-radius: 5px;
                    color: #fde68a;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 2px 8px;
                    outline: none;
                    cursor: pointer;
                }

                .gt-worldmap-live-loc {
                    background: rgba(2, 132, 199, 0.2);
                    border: 1px solid #0284c7;
                    color: #38bdf8;
                    font-size: 10.5px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .gt-worldmap-close-btn {
                    width: 34px;
                    height: 34px;
                    border-radius: 6px;
                    background: #2b1f13;
                    border: 1px solid #5c4125;
                    color: #d4b087;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                    transition: all 0.15s ease;
                }

                .gt-worldmap-close-btn:hover {
                    background: #b91c1c;
                    border-color: #ef4444;
                    color: #ffffff;
                }

                /* Layout Tengah: Canvas Parchment + Side Panel */
                .gt-worldmap-body {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                    position: relative;
                }

                /* Parchment Map Area (Toram Online Style) */
                .gt-tmap-canvas-area {
                    flex: 1;
                    position: relative;
                    background: 
                        radial-gradient(ellipse at center, rgba(254, 243, 199, 0.18) 0%, rgba(120, 85, 45, 0.35) 100%),
                        linear-gradient(135deg, #dfc08a 0%, #caa468 45%, #b58d53 100%);
                    box-shadow: inset 0 0 60px rgba(72, 45, 17, 0.6);
                    overflow: hidden; /* Tidak ada scrollbar horizontal */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gt-tmap-world-grid {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }

                .gt-tmap-roads-svg {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }

                .gt-tmap-compass {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 80px;
                    height: 80px;
                    opacity: 0.35;
                    pointer-events: none;
                    z-index: 2;
                }

                /* Node Scene Landmark */
                .gt-tmap-node {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    z-index: 10;
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .gt-tmap-node:hover {
                    transform: translate(-50%, -54%) scale(1.08);
                    z-index: 25;
                }

                .gt-tmap-node.is-selected {
                    z-index: 30;
                }

                .gt-tmap-island-pedestal {
                    width: 90px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 8px 12px rgba(60, 36, 11, 0.55));
                    position: relative;
                }

                .gt-landmark-svg {
                    width: 86px;
                    height: 66px;
                    display: block;
                    transition: filter 0.2s;
                }

                .gt-tmap-node:hover .gt-landmark-svg {
                    filter: brightness(1.15) drop-shadow(0 0 8px #f59e0b);
                }

                .gt-tmap-label-plate {
                    margin-top: 2px;
                    background: linear-gradient(180deg, #3d2c1b 0%, #1e140a 100%);
                    border: 1.5px solid #c99853;
                    border-radius: 6px;
                    padding: 3px 8px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
                    max-width: 150px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .gt-tmap-node.is-selected .gt-tmap-label-plate {
                    background: linear-gradient(180deg, #78350f 0%, #451a03 100%);
                    border-color: #fde68a;
                    box-shadow: 0 0 14px rgba(245, 158, 11, 0.7);
                }

                .gt-tmap-level-num {
                    font-size: 10px;
                    font-weight: 800;
                    color: #fbbf24;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-tmap-level-name {
                    font-size: 11px;
                    font-weight: 700;
                    color: #fef3c7;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .gt-tmap-you-are-here {
                    position: absolute;
                    top: -28px;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    background: #0284c7;
                    border: 1.5px solid #e0f2fe;
                    color: #ffffff;
                    font-size: 9.5px;
                    font-weight: 800;
                    padding: 2px 7px;
                    border-radius: 12px;
                    box-shadow: 0 0 14px rgba(2, 132, 199, 0.9), 0 3px 6px rgba(0,0,0,0.6);
                    animation: gtPinBob 1.4s ease-in-out infinite;
                }

                @keyframes gtPinBob {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                .gt-tmap-active-glow {
                    position: absolute;
                    inset: -10px;
                    border-radius: 50%;
                    border: 2px dashed #0284c7;
                    pointer-events: none;
                    animation: gtGlowRotate 8s linear infinite;
                }

                @keyframes gtGlowRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Side Inspector Panel (Detail Scene & Teleport) */
                .gt-tmap-inspector {
                    width: 320px;
                    background: linear-gradient(180deg, #1e1710 0%, #140f09 100%);
                    border-left: 2px solid #4a3720;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    box-sizing: border-box;
                    color: #e5e7eb;
                }

                .gt-inspector-header {
                    border-bottom: 1px solid #3d2c1b;
                    padding-bottom: 12px;
                }

                .gt-inspector-tag {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 2px 7px;
                    border-radius: 4px;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }

                .gt-tag-current {
                    background: rgba(2, 132, 199, 0.25);
                    border: 1px solid #0284c7;
                    color: #38bdf8;
                }

                .gt-tag-available {
                    background: rgba(16, 185, 129, 0.2);
                    border: 1px solid #10b981;
                    color: #34d399;
                }

                .gt-inspector-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #fef3c7;
                    margin: 0;
                    line-height: 1.3;
                }

                .gt-inspector-biome {
                    font-size: 12px;
                    color: #fbbf24;
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .gt-inspector-stat-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    background: #19120b;
                    border: 1px solid #332213;
                    border-radius: 8px;
                    padding: 10px;
                }

                .gt-stat-box {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .gt-stat-label {
                    font-size: 10px;
                    color: #a8947d;
                    text-transform: uppercase;
                }

                .gt-stat-value {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: #fef08a;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-inspector-entities {
                    background: #19120b;
                    border: 1px solid #332213;
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .gt-entities-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: #d4a373;
                    text-transform: uppercase;
                }

                .gt-entities-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .gt-entity-badge {
                    font-size: 11px;
                    background: #2b1f13;
                    border: 1px solid #4a3720;
                    border-radius: 4px;
                    padding: 3px 6px;
                    color: #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gt-inspector-actions {
                    margin-top: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-btn-teleport {
                    height: 42px;
                    background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
                    border: 1.5px solid #38bdf8;
                    border-radius: 8px;
                    color: #ffffff;
                    font-size: 13.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
                    transition: all 0.15s ease;
                }

                .gt-btn-teleport:hover {
                    background: linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%);
                    box-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
                    transform: translateY(-1px);
                }

                .gt-btn-teleport:disabled {
                    background: #231c15;
                    border-color: #453424;
                    color: #786450;
                    cursor: not-allowed;
                    box-shadow: none;
                    transform: none;
                }

                .gt-tmap-hint {
                    font-size: 11px;
                    color: #a8947d;
                    text-align: center;
                    margin-top: 4px;
                }
            </style>

            <div class="gt-worldmap-container">
                <!-- Header -->
                <div class="gt-worldmap-header">
                    <div class="gt-worldmap-title-wrap">
                        <div class="gt-worldmap-title-icon">🗺️</div>
                        <div>
                            <h2 class="gt-worldmap-title">World Map • Peta Dunia RPG</h2>
                            <div class="gt-worldmap-subtitle">
                                <span>Peta:</span>
                                <select class="gt-worldmap-select" id="gt-worldmap-project-select">
                                    ${projectOptionsHTML}
                                </select>
                                <span class="gt-worldmap-live-loc">
                                    📍 Lokasi Real-time: ${this.realtimeLocation.sceneName}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button class="gt-worldmap-close-btn" id="gt-worldmap-btn-close" title="Tutup Peta (ESC / M)">✕</button>
                </div>

                <!-- Body -->
                <div class="gt-worldmap-body">
                    <!-- Parchment Canvas (Toram Online Style) -->
                    <div class="gt-tmap-canvas-area" id="gt-tmap-canvas-area">
                        <div class="gt-tmap-world-grid">
                            <!-- Compass Rose -->
                            <svg class="gt-tmap-compass" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#6e583c" stroke-width="2" stroke-dasharray="4,3"/>
                                <polygon points="50,8 55,45 50,42 45,45" fill="#78350f"/>
                                <polygon points="50,92 55,55 50,58 45,55" fill="#a8947d"/>
                                <polygon points="92,50 55,55 58,50 55,45" fill="#a8947d"/>
                                <polygon points="8,50 45,55 42,50 45,45" fill="#a8947d"/>
                                <text x="50" y="24" text-anchor="middle" font-size="12" font-weight="bold" fill="#5c4125">N</text>
                            </svg>

                            <!-- Cobblestone Roads -->
                            <svg class="gt-tmap-roads-svg" id="gt-tmap-roads">
                                ${roadsSVG}
                            </svg>

                            <!-- Node Scenes -->
                            <div id="gt-tmap-nodes-container">
                                ${nodesHTML}
                            </div>
                        </div>
                    </div>

                    <!-- Side Inspector Panel -->
                    <div class="gt-tmap-inspector" id="gt-tmap-inspector">
                        <!-- Konten di-update oleh updateInspector() -->
                    </div>
                </div>
            </div>
        `;
    }

    updateInspector() {
        const inspector = this.dom ? this.dom.querySelector('#gt-tmap-inspector') : null;
        if (!inspector) return;

        const { scenes } = this.getScenesData();
        const selected = scenes.find(s => s.id === this.selectedSceneId) || scenes[0];
        if (!selected) return;

        const isCurrent = (selected.id === this.realtimeLocation.sceneId);
        const biomeLabel = {
            snow: 'Puncak Bersalju',
            desert: 'Gurun & Reruntuhan Kuno',
            cave: 'Gua & Lahar Panas',
            dirt: 'Hutan Rimbun Asri'
        }[selected.biome] || 'Kustom';

        // Deteksi rintangan & entitas
        const entityBadges = [];
        if (selected.hasSlime) entityBadges.push('🟢 Slime Monster');
        if (selected.hasSkeleton) entityBadges.push('💀 Skeleton Archer');
        if (selected.hasSpikes) entityBadges.push('⚠️ Jebakan Duri');
        if (selected.hasLava) entityBadges.push('🔥 Danau Lahar');
        if (selected.hasWater) entityBadges.push('💧 Danau Air');
        if (selected.hasChest) entityBadges.push('📦 Peti Harta Karun');
        if (selected.hasNpc) entityBadges.push('🧙 NPC Dialog');
        if (selected.hasCoins) entityBadges.push('🪙 Koin Emas');
        if (selected.hasPortal) entityBadges.push('🌀 Portal Level');

        if (entityBadges.length === 0) {
            entityBadges.push('✨ Area Santai Tanpa Rintangan');
        }

        let portalRouteText = 'Rute Akhir 🏆';
        let portalRouteColor = '#34d399';

        if (this.activeViewProjectId !== 'story_campaign') {
            const nextSceneObj = ProjectManager.getNextScene(this.activeViewProjectId, selected.id);
            if (nextSceneObj) {
                portalRouteText = `➔ #${nextSceneObj.index || ''} ${nextSceneObj.name}`;
                portalRouteColor = '#38bdf8';
            } else {
                portalRouteText = 'Rute Putus / Tamat ✕';
                portalRouteColor = '#f87171';
            }
        } else if (selected.hasPortal) {
            portalRouteText = 'Tersedia ➔';
            portalRouteColor = '#38bdf8';
        }

        inspector.innerHTML = `
            <div class="gt-inspector-header">
                <span class="gt-inspector-tag ${isCurrent ? 'gt-tag-current' : 'gt-tag-available'}">
                    ${isCurrent ? '● LOKASI SAAT INI (REAL-TIME)' : '○ DAPAT DITELUSURI'}
                </span>
                <h3 class="gt-inspector-title">#${selected.index} ${selected.name}</h3>
                <div class="gt-inspector-biome">
                    <span>${this.getBiomeIcon(selected.biome)}</span>
                    <span>Tema: ${biomeLabel}</span>
                </div>
                ${selected.desc ? `<p style="font-size: 11px; color: #a8947d; margin: 6px 0 0 0; line-height: 1.4;">${selected.desc}</p>` : ''}
            </div>

            <div class="gt-inspector-stat-grid">
                <div class="gt-stat-box">
                    <span class="gt-stat-label">Panjang Dunia</span>
                    <span class="gt-stat-value">${selected.worldWidth} px</span>
                </div>
                <div class="gt-stat-box">
                    <span class="gt-stat-label">Tinggi Dunia</span>
                    <span class="gt-stat-value">${selected.worldHeight || 850} px</span>
                </div>
                <div class="gt-stat-box">
                    <span class="gt-stat-label">Alur Rute</span>
                    <span class="gt-stat-value" style="color: ${portalRouteColor}; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${portalRouteText}">${portalRouteText}</span>
                </div>
                <div class="gt-stat-box">
                    <span class="gt-stat-label">Status</span>
                    <span class="gt-stat-value" style="color: ${isCurrent ? '#38bdf8' : '#34d399'};">
                        ${isCurrent ? 'Sedang Dijejaki' : 'Terbuka'}
                    </span>
                </div>
            </div>

            <div class="gt-inspector-entities">
                <div class="gt-entities-title">Isi Dunia / Rintangan</div>
                <div class="gt-entities-list">
                    ${entityBadges.map(b => `<div class="gt-entity-badge">${b}</div>`).join('')}
                </div>
            </div>

            <div class="gt-inspector-actions">
                <button class="gt-btn-teleport" id="gt-btn-teleport-scene" ${isCurrent ? 'disabled' : ''}>
                    ${isCurrent ? '📍 Kamu Sedang Di Scene Ini' : '🚀 Quick Travel / Pindah Scene'}
                </button>
                <div class="gt-tmap-hint">
                    ${isCurrent ? 'Gunakan portal di ujung map untuk berpindah secara normal' : 'Pindah langsung ke titik awal scene ini'}
                </div>
            </div>
        `;

        // Event tombol teleport
        const btnTeleport = inspector.querySelector('#gt-btn-teleport-scene');
        if (btnTeleport && !isCurrent) {
            btnTeleport.addEventListener('click', () => {
                this.executeTeleport(selected);
            });
        }
    }

    executeTeleport(targetScene) {
        if (!targetScene) return;

        AudioManager.playLevelUp();

        if (this.scene && typeof this.scene.showWorldBanner === 'function') {
            this.scene.showWorldBanner(`🌀 Melakukan Quick Travel ke "${targetScene.name}"...`, '#0284c7');
        }

        const sceneId = targetScene.id;

        if (this.scene && this.scene.scene) {
            if (sceneId === 'GameScene') {
                this.scene.scene.start('GameScene');
            } else if (sceneId === 'HongKongScene' || sceneId === 'Scene2') {
                this.scene.scene.start('Scene2');
            } else if (sceneId === 'CrystalCaveScene') {
                this.scene.scene.start('CrystalCaveScene');
            } else if (sceneId === 'Scene3') {
                this.scene.scene.start('Scene3');
            } else {
                // Custom project scene
                const projId = (this.activeViewProjectId !== 'story_campaign') ? this.activeViewProjectId : null;
                this.scene.scene.start('CustomWorldScene', {
                    worldData: targetScene,
                    projectId: projId,
                    sceneId: targetScene.id,
                    hp: this.scene.hp || 3,
                    inventory: this.scene.inventory || []
                });
            }
        }

        this.close();
    }

    bindEvents() {
        if (!this.dom) return;

        // Tombol Close
        const btnClose = this.dom.querySelector('#gt-worldmap-btn-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                AudioManager.playClick();
                this.close();
            });
        }

        // Klik di luar jendela untuk tutup
        this.dom.addEventListener('click', (e) => {
            if (e.target === this.dom) {
                AudioManager.playClick();
                this.close();
            }
        });

        // Dropdown Switcher Project
        const projSelect = this.dom.querySelector('#gt-worldmap-project-select');
        if (projSelect) {
            projSelect.addEventListener('change', (e) => {
                this.activeViewProjectId = e.target.value;
                AudioManager.playClick();
                this.selectedSceneId = null;

                // Re-render konten
                const oldContainer = this.dom.querySelector('.gt-worldmap-container');
                if (oldContainer) {
                    this.buildDOM();
                    const newContainer = this.dom.querySelector('.gt-worldmap-container');
                    oldContainer.replaceWith(newContainer);
                    this.bindEvents();
                }
            });
        }

        // Klik node scene
        this.dom.querySelectorAll('.gt-tmap-node').forEach(node => {
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                const sceneId = node.getAttribute('data-id');
                this.selectedSceneId = sceneId;

                this.dom.querySelectorAll('.gt-tmap-node').forEach(n => n.classList.remove('is-selected'));
                node.classList.add('is-selected');

                this.updateInspector();
            });
        });

        // Inisialisasi inspector pertama kali
        this.updateInspector();

        // Keyboard Shortcut: ESC atau M untuk menutup
        this.keyHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
                e.stopPropagation();
                this.close();
            }
        };
        window.addEventListener('keydown', this.keyHandler, { once: true });
    }
}
