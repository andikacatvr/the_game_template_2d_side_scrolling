// ===============================================================
// VISUAL SCENE FLOW GRAPH (NODE-BASED MULTI-SCENE ROUTING ENGINE)
// ===============================================================
// Menghubungkan alur antar-scene/level secara visual berbasis Node & Kabel (Bezier Spline).
// Terinspirasi dari Unreal Blueprints, RapidMiner, dan Blender Shader Nodes.
// ===============================================================

import { ProjectManager } from '../utils/ProjectManager.js';
import { AudioManager } from '../utils/AudioManager.js';
import { QuestLogicGraphView } from './QuestLogicGraphView.js';

export class SceneFlowGraphView {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.projectId = options.projectId || null;
        this.onOpenScene = options.onOpenScene || null;
        this.onAddScene = options.onAddScene || null;

        this.graphMode = 'scenes'; // 'scenes' | 'quests'
        this.questLogicView = null;
        this.questLogicWrap = null;

        this.pan = { x: 40, y: 40 };
        this.zoom = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.draggedNodeId = null;
        this.dragOffset = { x: 0, y: 0 };

        this.wiring = null; // { fromSceneId, startX, startY, currentX, currentY }
        this.selectedSourcePort = null; // Untuk mode sambung via klik port

        this.connections = [];
        this.nodePositions = {};

        this.dom = null;
        this.canvasWrap = null;
        this.svgLayer = null;
        this.nodesLayer = null;

        this.init();
    }

    init() {
        this.createDOM();
        this.loadProjectData();
        this.bindEvents();
    }

    createDOM() {
        this.dom = document.createElement('div');
        this.dom.className = 'gt-flow-container';
        this.dom.innerHTML = `
            <style>
                .gt-flow-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #090a0f;
                    background-image: 
                        radial-gradient(circle, rgba(56, 189, 248, 0.12) 1px, transparent 1px),
                        radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 28px 28px, 14px 14px;
                    background-position: 0 0, 14px 14px;
                    overflow: hidden;
                    user-select: none;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                /* Toolbar Kontrol Flow Graph */
                .gt-flow-toolbar {
                    position: absolute;
                    top: 14px;
                    left: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 100;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    padding: 5px 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
                }

                .gt-flow-btn {
                    background: #182234;
                    border: 1px solid #334155;
                    color: #cbd5e1;
                    font-size: 11.5px;
                    font-weight: 700;
                    padding: 5px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                }

                .gt-flow-btn:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #ffffff;
                    box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
                }

                .gt-flow-btn-primary {
                    background: linear-gradient(135deg, #0284c7, #2563eb);
                    border: 1px solid #38bdf8;
                    color: #ffffff;
                }

                .gt-flow-btn-primary:hover {
                    background: linear-gradient(135deg, #0369a1, #1d4ed8);
                }

                .gt-flow-hint {
                    position: absolute;
                    bottom: 14px;
                    left: 20px;
                    font-size: 11px;
                    color: #64748b;
                    background: rgba(15, 23, 42, 0.8);
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid #1e293b;
                    pointer-events: none;
                    z-index: 90;
                }

                /* World / Canvas Transform Wrap */
                .gt-flow-canvas-wrap {
                    position: absolute;
                    inset: 0;
                    transform-origin: 0 0;
                }

                /* SVG Wires Layer */
                .gt-flow-svg-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 10000px;
                    height: 10000px;
                    pointer-events: none;
                    z-index: 10;
                }

                /* Wire Path Style */
                .gt-flow-wire {
                    fill: none;
                    stroke: #38bdf8;
                    stroke-width: 3.5px;
                    stroke-linecap: round;
                    cursor: pointer;
                    pointer-events: stroke;
                    transition: stroke 0.15s ease, stroke-width 0.15s ease;
                    filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.45));
                }

                .gt-flow-wire-hit {
                    fill: none;
                    stroke: transparent;
                    stroke-width: 24px;
                    stroke-linecap: round;
                    cursor: pointer;
                    pointer-events: stroke;
                }

                .gt-flow-wire-hit:hover + .gt-flow-wire,
                .gt-flow-wire:hover {
                    stroke: #ef4444 !important;
                    stroke-width: 5.5px !important;
                    filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.8));
                }

                .gt-flow-wire-pulse {
                    fill: none;
                    stroke: #ffffff;
                    stroke-width: 1.5px;
                    stroke-dasharray: 6 12;
                    animation: gtFlowDash 1.2s linear infinite;
                    pointer-events: none;
                }

                @keyframes gtFlowDash {
                    from { stroke-dashoffset: 36; }
                    to { stroke-dashoffset: 0; }
                }

                .gt-flow-live-wire {
                    fill: none;
                    stroke: #38bdf8;
                    stroke-width: 3px;
                    stroke-dasharray: 5 5;
                    animation: gtLiveDash 0.8s linear infinite;
                    pointer-events: none;
                    filter: drop-shadow(0 0 10px #38bdf8);
                }

                @keyframes gtLiveDash {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }

                /* Nodes Layer */
                .gt-flow-nodes-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 10000px;
                    height: 10000px;
                    pointer-events: none;
                    z-index: 20;
                }

                /* Node Card */
                .gt-flow-node {
                    position: absolute;
                    width: 270px;
                    background: #0e1420;
                    border: 1px solid #1e293b;
                    border-radius: 10px;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.75), 0 0 15px rgba(0, 0, 0, 0.4);
                    pointer-events: auto;
                    transition: box-shadow 0.2s ease, border-color 0.2s ease;
                    display: flex;
                    flex-direction: column;
                }

                .gt-flow-node:hover {
                    border-color: #38bdf8;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.25);
                }

                .gt-flow-node.is-start {
                    border-color: #10b981;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(16, 185, 129, 0.25);
                }

                .gt-flow-node-header {
                    padding: 9px 12px;
                    background: #141c2c;
                    border-bottom: 1px solid #1e293b;
                    border-top-left-radius: 9px;
                    border-top-right-radius: 9px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: grab;
                }

                .gt-flow-node-header:active {
                    cursor: grabbing;
                }

                .gt-flow-node-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    max-width: 170px;
                }

                .gt-flow-start-badge {
                    font-size: 9px;
                    font-weight: 800;
                    background: #10b981;
                    color: #064e3b;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .gt-flow-node-body {
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-flow-node-meta {
                    font-size: 11px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-flow-biome-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    background: rgba(56, 189, 248, 0.1);
                    color: #38bdf8;
                    padding: 2px 7px;
                    border-radius: 4px;
                    border: 1px solid rgba(56, 189, 248, 0.25);
                }

                .gt-flow-node-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 4px;
                }

                .gt-flow-node-btn {
                    flex: 1;
                    padding: 5px 8px;
                    background: #1a2233;
                    border: 1px solid #334155;
                    border-radius: 5px;
                    color: #e2e8f0;
                    font-size: 10.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: all 0.15s ease;
                }

                .gt-flow-node-btn:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #fff;
                }

                /* Ports Row */
                .gt-flow-ports {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px 10px 12px;
                    background: #0a0f19;
                    border-bottom-left-radius: 9px;
                    border-bottom-right-radius: 9px;
                    border-top: 1px solid #172033;
                    position: relative;
                }

                .gt-flow-port-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #94a3b8;
                    position: relative;
                }

                .gt-flow-port-item.out {
                    flex-direction: row-reverse;
                }

                .gt-flow-port-dot {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #38bdf8;
                    background: #0b111e;
                    cursor: crosshair;
                    transition: all 0.15s ease;
                    box-sizing: border-box;
                }

                .gt-flow-port-dot:hover {
                    background: #38bdf8;
                    box-shadow: 0 0 10px #38bdf8;
                    transform: scale(1.25);
                }

                .gt-flow-port-dot.is-out {
                    border-color: #a855f7;
                }

                .gt-flow-port-dot.is-out:hover {
                    background: #a855f7;
                    box-shadow: 0 0 10px #a855f7;
                }

                .gt-flow-port-dot.is-source-active {
                    background: #a855f7 !important;
                    border-color: #f472b6 !important;
                    box-shadow: 0 0 18px #c084fc !important;
                    transform: scale(1.4) !important;
                    animation: gtPulsePort 1s ease-in-out infinite alternate;
                }

                @keyframes gtPulsePort {
                    from { box-shadow: 0 0 8px #c084fc; }
                    to { box-shadow: 0 0 20px #e879f9; transform: scale(1.5); }
                }

                .gt-flow-port-dot.is-hovered {
                    background: #22c55e !important;
                    border-color: #22c55e !important;
                    box-shadow: 0 0 14px #22c55e !important;
                    transform: scale(1.35) !important;
                }
            </style>

            <!-- Control Bar Atas -->
            <div class="gt-flow-toolbar">
                <div class="gt-flow-subtabs" style="display: inline-flex; background: #090e17; border: 1px solid #1e293b; border-radius: 6px; padding: 2px; gap: 2px; margin-right: 4px;">
                    <button class="gt-flow-subtab" id="btn-flow-tab-scenes" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border: none; background: #0284c7; color: #fff; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Alur Rute Antar-Scene">
                        <span>🎬 Rute Level</span>
                    </button>
                    <button class="gt-flow-subtab" id="btn-flow-tab-quests" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border: none; background: transparent; color: #94a3b8; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Logika Interaksi NPC &amp; Misi (Visual Scripting)">
                        <span>⚡ Logika NPC &amp; Misi</span>
                    </button>
                </div>

                <button class="gt-flow-btn gt-flow-btn-primary" id="btn-flow-add-scene" title="Tambah Level Baru ke Project">
                    <span>+</span> Tambah Scene
                </button>
                <button class="gt-flow-btn" id="btn-flow-auto-layout" title="Rapikan Tata Letak Node Secara Otomatis">
                    <span>📐</span> Auto-Layout
                </button>
                <button class="gt-flow-btn" id="btn-flow-clear-conns" title="Hapus Semua Kabel Koneksi">
                    <span>🗑️</span> Reset Rute
                </button>
                <div style="width: 1px; height: 16px; background: #334155;"></div>
                <button class="gt-flow-btn" id="btn-flow-zoom-in" title="Perbesar Graph">+</button>
                <button class="gt-flow-btn" id="btn-flow-zoom-out" title="Perkecil Graph">−</button>
                <button class="gt-flow-btn" id="btn-flow-zoom-reset" title="Reset Zoom &amp; Pan">100%</button>
            </div>

            <div class="gt-flow-hint">
                💡 <b>Tips Alur:</b> Tarik kabel dari <b>Portal Out (Ungu)</b> ke <b>Spawn In (Biru)</b> scene tujuan untuk menghubungkan level! Klik garis merah untuk putus rute.
            </div>

            <div class="gt-flow-canvas-wrap" id="gt-flow-canvas-wrap">
                <svg class="gt-flow-svg-layer" id="gt-flow-svg-layer">
                    <defs>
                        <linearGradient id="gtFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#a855f7" />
                            <stop offset="100%" stop-color="#38bdf8" />
                        </linearGradient>
                    </defs>
                    <g id="gt-flow-wires-group"></g>
                    <path id="gt-flow-live-wire" class="gt-flow-live-wire" d="" style="display: none;"></path>
                </svg>
                <div class="gt-flow-nodes-layer" id="gt-flow-nodes-layer"></div>
            </div>
        `;

        this.container.appendChild(this.dom);
        this.canvasWrap = this.dom.querySelector('#gt-flow-canvas-wrap');
        this.svgLayer = this.dom.querySelector('#gt-flow-svg-layer');
        this.wiresGroup = this.dom.querySelector('#gt-flow-wires-group');
        this.liveWirePath = this.dom.querySelector('#gt-flow-live-wire');
        this.nodesLayer = this.dom.querySelector('#gt-flow-nodes-layer');
    }

    loadProjectData() {
        if (!this.projectId) {
            const projects = ProjectManager.getProjects();
            if (projects.length > 0) this.projectId = projects[0].id;
        }

        const project = this.projectId ? ProjectManager.getProject(this.projectId) : null;
        if (!project || !Array.isArray(project.scenes)) {
            this.connections = [];
            this.nodePositions = {};
            this.renderNodes([]);
            this.renderWires();
            return;
        }

        const flow = ProjectManager.getFlowGraph(this.projectId);
        this.nodePositions = (flow.positions && typeof flow.positions === 'object') ? { ...flow.positions } : {};

        // Inisialisasi posisi default jika belum ada
        project.scenes.forEach((sc, idx) => {
            if (!this.nodePositions[sc.id]) {
                this.nodePositions[sc.id] = {
                    x: 60 + (idx % 3) * 320,
                    y: 80 + Math.floor(idx / 3) * 190
                };
            }
        });

        // HANYA hubungkan secara default 1 -> 2 -> 3 jika project BELUM pernah mengonfigurasi Flow Graph
        if (flow.connections === null && !flow.hasConfiguredFlowGraph && project.scenes.length > 1) {
            this.connections = [];
            for (let i = 0; i < project.scenes.length - 1; i++) {
                this.connections.push({
                    fromSceneId: project.scenes[i].id,
                    fromPort: 'portal',
                    toSceneId: project.scenes[i + 1].id,
                    toPort: 'entry'
                });
            }
            this.saveGraph();
        } else {
            this.connections = Array.isArray(flow.connections) ? [...flow.connections] : [];
        }

        this.renderNodes(project.scenes);
        this.renderWires();
        this.applyTransform();
    }

    renderNodes(scenes) {
        this.nodesLayer.innerHTML = '';
        const project = this.projectId ? ProjectManager.getProject(this.projectId) : null;
        const startId = project ? project.startingSceneId : null;

        scenes.forEach(scene => {
            const pos = this.nodePositions[scene.id] || { x: 80, y: 80 };
            const isStart = (scene.id === startId) || (!startId && scenes[0]?.id === scene.id);

            const card = document.createElement('div');
            card.className = `gt-flow-node ${isStart ? 'is-start' : ''}`;
            card.id = `flow-node-${scene.id}`;
            card.setAttribute('data-scene-id', scene.id);
            card.style.left = `${pos.x}px`;
            card.style.top = `${pos.y}px`;

            const biomeIcons = {
                dirt: '🌲 Hutan / Tanah',
                snow: '❄️ Salju',
                desert: '🏜️ Gurun',
                cave: '🌋 Gua',
                hongkong: '🏙️ Hong Kong'
            };

            card.innerHTML = `
                <div class="gt-flow-node-header" data-drag-handle="true">
                    <div class="gt-flow-node-title" title="${scene.name}">
                        <span>🎬</span>
                        <span>${scene.name}</span>
                    </div>
                    ${isStart ? '<span class="gt-flow-start-badge">★ START</span>' : ''}
                </div>
                <div class="gt-flow-node-body">
                    <div class="gt-flow-node-meta">
                        <span class="gt-flow-biome-tag">${biomeIcons[scene.biome] || '🌲 Dirt'}</span>
                        <span style="font-family: monospace; font-size: 10px; color: #64748b;">${scene.worldWidth || 3600}x${scene.worldHeight || 1000}</span>
                    </div>
                    <div class="gt-flow-node-actions">
                        <button class="gt-flow-node-btn btn-open-scene" title="Buka Level ini di Kanvas Editor Dunia">
                            <span>✏️</span> Edit
                        </button>
                        <button class="gt-flow-node-btn btn-open-quest" title="Atur Logika Interaksi NPC, Koin &amp; Misi (Visual Scripting)" style="color: #c084fc; border-color: rgba(192, 132, 252, 0.4);">
                            <span>⚡</span> Misi
                        </button>
                        ${!isStart ? `
                            <button class="gt-flow-node-btn btn-set-start" title="Jadikan Level ini Sebagai Titik Mulai Permainan">
                                <span>★</span> Start
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="gt-flow-ports">
                    <div class="gt-flow-port-item in" title="Titik Masuk Pemain (Spawn Door)">
                        <div class="gt-flow-port-dot is-in" data-port="entry" data-scene="${scene.id}"></div>
                        <span>🚪 Spawn</span>
                    </div>
                    <div class="gt-flow-port-item out" title="Titik Keluar Kemenangan (Portal Finish)">
                        <div class="gt-flow-port-dot is-out" data-port="portal" data-scene="${scene.id}"></div>
                        <span>Portal 🌀</span>
                    </div>
                </div>
            `;

            // Klik Ganda pada Kartu untuk Langsung Buka Scene
            card.addEventListener('dblclick', (e) => {
                if (e.target.closest('button') || e.target.closest('.gt-flow-port-dot')) return;
                AudioManager.playClick();
                if (typeof this.onOpenScene === 'function') {
                    this.onOpenScene(scene.id, scene);
                }
            });

            // Tombol Edit Scene
            const editBtn = card.querySelector('.btn-open-scene');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                if (typeof this.onOpenScene === 'function') {
                    this.onOpenScene(scene.id, scene);
                }
            });

            // Tombol Buka Logika Misi Scene
            const questBtn = card.querySelector('.btn-open-quest');
            if (questBtn) {
                questBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    AudioManager.playClick();
                    this.switchGraphMode('quests', scene.id);
                });
            }

            // Tombol Set Starting Level
            const setStartBtn = card.querySelector('.btn-set-start');
            if (setStartBtn) {
                setStartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    AudioManager.playSuccess();
                    ProjectManager.setStartingScene(this.projectId, scene.id);
                    this.loadProjectData();
                });
            }

            this.nodesLayer.appendChild(card);
        });
    }

    renderWires() {
        this.wiresGroup.innerHTML = '';

        this.connections.forEach((conn, index) => {
            const outDot = this.dom.querySelector(`.gt-flow-port-dot.is-out[data-scene="${conn.fromSceneId}"]`);
            const inDot = this.dom.querySelector(`.gt-flow-port-dot.is-in[data-scene="${conn.toSceneId}"]`);

            if (!outDot || !inDot) return;

            const outRect = outDot.getBoundingClientRect();
            const inRect = inDot.getBoundingClientRect();
            const wrapRect = this.canvasWrap.getBoundingClientRect();

            // Koordinat relatif terhadap kanvas
            const x1 = (outRect.left + outRect.width / 2 - wrapRect.left) / this.zoom;
            const y1 = (outRect.top + outRect.height / 2 - wrapRect.top) / this.zoom;
            const x2 = (inRect.left + inRect.width / 2 - wrapRect.left) / this.zoom;
            const y2 = (inRect.top + inRect.height / 2 - wrapRect.top) / this.zoom;

            const dx = Math.max(70, Math.abs(x2 - x1) * 0.55);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            // Path Hitbox Tebal Transparan (24px) agar sangat mudah di-klik putus kabel
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('d', d);
            hitPath.setAttribute('class', 'gt-flow-wire-hit');
            hitPath.setAttribute('title', 'Klik garis untuk memutuskan koneksi portal');

            const delHandler = (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.removeConnection(index);
            };
            hitPath.addEventListener('click', delHandler);

            // Path Kabel Utama
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'gt-flow-wire');
            path.setAttribute('stroke', 'url(#gtFlowGrad)');
            path.setAttribute('title', 'Klik untuk memutus kabel koneksi ini');
            path.addEventListener('click', delHandler);

            // Path Efek Denyut Alur (Pulse Flow Animation)
            const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pulse.setAttribute('d', d);
            pulse.setAttribute('class', 'gt-flow-wire-pulse');

            this.wiresGroup.appendChild(hitPath);
            this.wiresGroup.appendChild(path);
            this.wiresGroup.appendChild(pulse);
        });
    }

    selectSourcePort(sceneId, portEl) {
        this.clearPortSelection();
        this.selectedSourcePort = sceneId;
        if (portEl) portEl.classList.add('is-source-active');
        const hintEl = this.dom.querySelector('.gt-flow-hint');
        if (hintEl) {
            hintEl.innerHTML = `🔗 <b>Mode Sambung Rute:</b> Port Portal terpilih! Sekarang klik port <b>Spawn (Biru)</b> pada level tujuan untuk menyambungkan alur.`;
            hintEl.style.color = '#38bdf8';
        }
    }

    clearPortSelection() {
        this.selectedSourcePort = null;
        if (this.dom) {
            this.dom.querySelectorAll('.gt-flow-port-dot').forEach(d => {
                d.classList.remove('is-source-active');
                d.classList.remove('is-hovered');
            });
            const hintEl = this.dom.querySelector('.gt-flow-hint');
            if (hintEl) {
                hintEl.innerHTML = `💡 <b>Tips Alur:</b> Klik atau tarik kabel dari <b>Portal Out (Ungu)</b> ke <b>Spawn In (Biru)</b> scene tujuan untuk menghubungkan level! Klik garis merah untuk putus rute.`;
                hintEl.style.color = '#94a3b8';
            }
        }
    }

    removeConnection(index) {
        if (index >= 0 && index < this.connections.length) {
            this.connections.splice(index, 1);
            this.saveGraph();
            this.renderWires();
        }
    }

    saveGraph() {
        if (!this.projectId) return;
        ProjectManager.saveFlowGraph(this.projectId, {
            connections: this.connections,
            positions: this.nodePositions
        });
    }

    applyTransform() {
        this.canvasWrap.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    }

    bindEvents() {
        // 1. Dragging Node & Pan Canvas
        this.dom.addEventListener('mousedown', (e) => {
            const dragHandle = e.target.closest('[data-drag-handle="true"]');
            const portDot = e.target.closest('.gt-flow-port-dot');

            // Kasus A: Interaksi Port (Klik atau Tarik)
            if (portDot) {
                e.preventDefault();
                e.stopPropagation();
                const portSceneId = portDot.getAttribute('data-scene');

                // Jika sedang memilih port tujuan (Klik port IN setelah klik port OUT)
                if (portDot.classList.contains('is-in') && this.selectedSourcePort) {
                    if (this.selectedSourcePort !== portSceneId) {
                        this.connections = this.connections.filter(c => c.fromSceneId !== this.selectedSourcePort);
                        this.connections.push({
                            fromSceneId: this.selectedSourcePort,
                            fromPort: 'portal',
                            toSceneId: portSceneId,
                            toPort: 'entry'
                        });
                        AudioManager.playSuccess();
                        this.saveGraph();
                    }
                    this.clearPortSelection();
                    this.renderWires();
                    return;
                }

                // Klik port OUT untuk mode drag ATAU klik
                if (portDot.classList.contains('is-out')) {
                    const fromSceneId = portDot.getAttribute('data-scene');
                    this.selectSourcePort(fromSceneId, portDot);

                    const rect = portDot.getBoundingClientRect();
                    const wrapRect = this.canvasWrap.getBoundingClientRect();
                    const startX = (rect.left + rect.width / 2 - wrapRect.left) / this.zoom;
                    const startY = (rect.top + rect.height / 2 - wrapRect.top) / this.zoom;

                    this.wiring = {
                        fromSceneId,
                        startX,
                        startY,
                        currentX: startX,
                        currentY: startY
                    };

                    this.liveWirePath.style.display = 'block';
                    return;
                }
            }

            // Batalkan seleksi port jika klik di tempat lain
            if (this.selectedSourcePort && !e.target.closest('.gt-flow-port-dot')) {
                this.clearPortSelection();
            }

            // Kasus B: Menggeser Node Card
            if (dragHandle) {
                e.preventDefault();
                const nodeCard = dragHandle.closest('.gt-flow-node');
                const sceneId = nodeCard.getAttribute('data-scene-id');
                this.draggedNodeId = sceneId;

                const pos = this.nodePositions[sceneId] || { x: 0, y: 0 };
                this.dragOffset = {
                    x: (e.clientX / this.zoom) - pos.x,
                    y: (e.clientY / this.zoom) - pos.y
                };
                return;
            }

            // Kasus C: Pan Canvas (Klik di luar node)
            if (!e.target.closest('.gt-flow-node') && !e.target.closest('.gt-flow-toolbar')) {
                this.isPanning = true;
                this.panStart = {
                    x: e.clientX - this.pan.x,
                    y: e.clientY - this.pan.y
                };
            }
        });

        window.addEventListener('mousemove', (e) => {
            // Live Wiring Preview
            if (this.wiring) {
                const wrapRect = this.canvasWrap.getBoundingClientRect();
                const cx = (e.clientX - wrapRect.left) / this.zoom;
                const cy = (e.clientY - wrapRect.top) / this.zoom;

                const dx = Math.max(50, Math.abs(cx - this.wiring.startX) * 0.5);
                const d = `M ${this.wiring.startX} ${this.wiring.startY} C ${this.wiring.startX + dx} ${this.wiring.startY}, ${cx - dx} ${cy}, ${cx} ${cy}`;
                this.liveWirePath.setAttribute('d', d);

                // Highlight port di bawah kursor jika cocok
                this.dom.querySelectorAll('.gt-flow-port-dot.is-in').forEach(dot => {
                    const r = dot.getBoundingClientRect();
                    const isInside = (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8);
                    dot.classList.toggle('is-hovered', isInside);
                });
                return;
            }

            // Dragging Node Card
            if (this.draggedNodeId) {
                const nx = Math.round((e.clientX / this.zoom) - this.dragOffset.x);
                const ny = Math.round((e.clientY / this.zoom) - this.dragOffset.y);

                this.nodePositions[this.draggedNodeId] = { x: nx, y: ny };
                const nodeEl = this.dom.querySelector(`#flow-node-${this.draggedNodeId}`);
                if (nodeEl) {
                    nodeEl.style.left = `${nx}px`;
                    nodeEl.style.top = `${ny}px`;
                }
                this.renderWires();
                return;
            }

            // Panning
            if (this.isPanning) {
                this.pan.x = e.clientX - this.panStart.x;
                this.pan.y = e.clientY - this.panStart.y;
                this.applyTransform();
            }
        });

        window.addEventListener('mouseup', (e) => {
            // Selesaikan Penarikan Kabel
            if (this.wiring) {
                const hoveredInPort = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gt-flow-port-dot.is-in');
                if (hoveredInPort) {
                    const toSceneId = hoveredInPort.getAttribute('data-scene');
                    if (toSceneId && toSceneId !== this.wiring.fromSceneId) {
                        // Tambahkan / perbarui koneksi
                        this.connections = this.connections.filter(c => c.fromSceneId !== this.wiring.fromSceneId);
                        this.connections.push({
                            fromSceneId: this.wiring.fromSceneId,
                            fromPort: 'portal',
                            toSceneId: toSceneId,
                            toPort: 'entry'
                        });
                        AudioManager.playSuccess();
                        this.saveGraph();
                    }
                }

                this.dom.querySelectorAll('.gt-flow-port-dot').forEach(d => d.classList.remove('is-hovered'));
                this.liveWirePath.style.display = 'none';
                this.wiring = null;
                this.renderWires();
                return;
            }

            if (this.draggedNodeId) {
                this.draggedNodeId = null;
                this.saveGraph();
            }

            if (this.isPanning) {
                this.isPanning = false;
            }
        });

        // Zoom dengan Scroll Wheel
        this.dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.min(1.8, Math.max(0.4, this.zoom + delta));
            this.zoom = parseFloat(newZoom.toFixed(2));
            this.applyTransform();
            this.updateZoomBtn();
            this.renderWires();
        }, { passive: false });

        // Toolbar Buttons
        const btnAdd = this.dom.querySelector('#btn-flow-add-scene');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                AudioManager.playClick();
                if (typeof this.onAddScene === 'function') {
                    this.onAddScene();
                }
            });
        }

        const btnAuto = this.dom.querySelector('#btn-flow-auto-layout');
        if (btnAuto) {
            btnAuto.addEventListener('click', () => {
                AudioManager.playClick();
                this.autoLayout();
            });
        }

        const btnClear = this.dom.querySelector('#btn-flow-clear-conns');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm('Putus semua kabel koneksi rute antar scene?')) {
                    AudioManager.playClick();
                    this.connections = [];
                    this.saveGraph();
                    this.renderWires();
                }
            });
        }

        // Sub-tabs Mode Switching
        const btnTabScenes = this.dom.querySelector('#btn-flow-tab-scenes');
        if (btnTabScenes) {
            btnTabScenes.addEventListener('click', () => {
                AudioManager.playClick();
                this.switchGraphMode('scenes');
            });
        }

        const btnTabQuests = this.dom.querySelector('#btn-flow-tab-quests');
        if (btnTabQuests) {
            btnTabQuests.addEventListener('click', () => {
                AudioManager.playClick();
                this.switchGraphMode('quests');
            });
        }

        const btnZIn = this.dom.querySelector('#btn-flow-zoom-in');
        if (btnZIn) btnZIn.addEventListener('click', () => this.adjustZoom(0.15));

        const btnZOut = this.dom.querySelector('#btn-flow-zoom-out');
        if (btnZOut) btnZOut.addEventListener('click', () => this.adjustZoom(-0.15));

        const btnZReset = this.dom.querySelector('#btn-flow-zoom-reset');
        if (btnZReset) {
            btnZReset.addEventListener('click', () => {
                this.zoom = 1;
                this.pan = { x: 40, y: 40 };
                this.applyTransform();
                this.updateZoomBtn();
                this.renderWires();
            });
        }
    }

    switchGraphMode(mode, sceneId = null) {
        this.graphMode = mode;

        if (mode === 'quests') {
            let targetSceneId = sceneId;
            if (!targetSceneId) {
                const project = this.projectId ? ProjectManager.getProject(this.projectId) : null;
                const flow = this.projectId ? ProjectManager.getFlowGraph(this.projectId) : null;
                if (flow && flow.startingSceneId) {
                    targetSceneId = flow.startingSceneId;
                } else if (project && project.scenes && project.scenes.length > 0) {
                    targetSceneId = project.scenes[0].id;
                }
            }

            // Sembunyikan container alur scene
            this.dom.style.display = 'none';

            // Bersihkan instance quest view lama jika berbeda scene/project
            if (this.questLogicView && (this.questLogicView.sceneId !== targetSceneId || this.questLogicView.projectId !== this.projectId)) {
                this.questLogicView.destroy();
                this.questLogicView = null;
            }

            if (!this.questLogicView) {
                this.questLogicView = new QuestLogicGraphView(this.container, {
                    projectId: this.projectId,
                    sceneId: targetSceneId,
                    onBackToSceneFlow: () => this.switchGraphMode('scenes')
                });
            } else {
                if (this.questLogicView.dom) {
                    this.questLogicView.dom.style.display = 'flex';
                }
                this.questLogicView.refresh();
            }
        } else {
            // Mode 'scenes'
            if (this.questLogicView && this.questLogicView.dom) {
                this.questLogicView.dom.style.display = 'none';
            }
            this.dom.style.display = 'block';

            // Update status tombol tab di SceneFlow toolbar
            const btnScenes = this.dom.querySelector('#btn-flow-tab-scenes');
            const btnQuests = this.dom.querySelector('#btn-flow-tab-quests');
            if (btnScenes) {
                btnScenes.style.background = '#0284c7';
                btnScenes.style.color = '#fff';
            }
            if (btnQuests) {
                btnQuests.style.background = 'transparent';
                btnQuests.style.color = '#94a3b8';
            }

            this.loadProjectData();
            setTimeout(() => {
                this.renderWires();
            }, 50);
        }
    }

    adjustZoom(delta) {
        this.zoom = parseFloat(Math.min(1.8, Math.max(0.4, this.zoom + delta)).toFixed(2));
        this.applyTransform();
        this.updateZoomBtn();
        this.renderWires();
    }

    updateZoomBtn() {
        const btnZReset = this.dom.querySelector('#btn-flow-zoom-reset');
        if (btnZReset) btnZReset.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    autoLayout() {
        const project = this.projectId ? ProjectManager.getProject(this.projectId) : null;
        if (!project || !Array.isArray(project.scenes)) return;

        project.scenes.forEach((sc, idx) => {
            this.nodePositions[sc.id] = {
                x: 60 + idx * 340,
                y: 120 + (idx % 2 === 1 ? 60 : 0)
            };
            const nodeEl = this.dom.querySelector(`#flow-node-${sc.id}`);
            if (nodeEl) {
                nodeEl.style.left = `${this.nodePositions[sc.id].x}px`;
                nodeEl.style.top = `${this.nodePositions[sc.id].y}px`;
            }
        });

        this.pan = { x: 40, y: 40 };
        this.zoom = 1;
        this.applyTransform();
        this.updateZoomBtn();
        this.saveGraph();
        this.renderWires();
    }

    refresh() {
        this.loadProjectData();
        if (this.questLogicView) {
            this.questLogicView.refresh();
        }
    }

    destroy() {
        if (this.questLogicView) {
            this.questLogicView.destroy();
            this.questLogicView = null;
        }
        if (this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
        }
    }
}
