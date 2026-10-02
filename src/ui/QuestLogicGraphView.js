// ===============================================================
// VISUAL QUEST & NPC LOGIC GRAPH (NODE-BASED VISUAL SCRIPTING)
// ===============================================================
// Menghubungkan interaksi karakter NPC, syarat koin/item,
// percakapan dialog, dan aktivasi portal finish secara visual.
// Terinspirasi dari Unreal Blueprints, RapidMiner, dan Blender Shader Nodes.
// ===============================================================

import { ProjectManager } from '../utils/ProjectManager.js';
import { AudioManager } from '../utils/AudioManager.js';

export const QUEST_NODE_TEMPLATES = {
    npc_trigger: {
        type: 'npc_trigger',
        category: 'trigger',
        title: 'Bicara dengan NPC',
        icon: '🧙',
        badgeColor: '#9333ea',
        headerBg: 'linear-gradient(135deg, #7e22ce, #9333ea)',
        desc: 'Dipicu ketika pemain mendekati NPC dan menekan tombol interaksi (E / Klik).',
        defaultConfig: {
            speakerName: 'Kapten Chen',
            avatar: '🧙',
            promptText: 'Tekan E untuk bicara'
        },
        inputs: [],
        outputs: [
            { id: 'talk', label: 'Bicara (Talk)', color: '#c084fc' }
        ]
    },
    chest_trigger: {
        type: 'chest_trigger',
        category: 'trigger',
        title: 'Buka Peti Harta',
        icon: '📦',
        badgeColor: '#b45309',
        headerBg: 'linear-gradient(135deg, #b45309, #d97706)',
        desc: 'Dipicu ketika pemain membuka peti harta karun.',
        defaultConfig: {
            chestName: 'Peti Kuno',
            rewardCoins: 5
        },
        inputs: [],
        outputs: [
            { id: 'open', label: 'Dibuka (Open)', color: '#f59e0b' }
        ]
    },
    condition_coins: {
        type: 'condition_coins',
        category: 'condition',
        title: 'Syarat Koin Emas',
        icon: '🪙',
        badgeColor: '#d97706',
        headerBg: 'linear-gradient(135deg, #b45309, #f59e0b)',
        desc: 'Mengecek apakah koin pemain memenuhi jumlah minimal.',
        defaultConfig: {
            reqCoins: 3,
            consume: false
        },
        inputs: [
            { id: 'exec', label: 'Cek (In)', color: '#94a3b8' }
        ],
        outputs: [
            { id: 'pass', label: '✓ Cukup (True)', color: '#22c55e' },
            { id: 'fail', label: '✗ Kurang (False)', color: '#ef4444' }
        ]
    },
    condition_item: {
        type: 'condition_item',
        category: 'condition',
        title: 'Syarat Item / Kunci',
        icon: '🔑',
        badgeColor: '#0284c7',
        headerBg: 'linear-gradient(135deg, #0284c7, #38bdf8)',
        desc: 'Mengecek apakah pemain membawa item pencarian tertentu.',
        defaultConfig: {
            itemName: 'Kunci Gerbang Kuno',
            itemIcon: '🔑'
        },
        inputs: [
            { id: 'exec', label: 'Cek (In)', color: '#94a3b8' }
        ],
        outputs: [
            { id: 'pass', label: '✓ Membawa Item', color: '#22c55e' },
            { id: 'fail', label: '✗ Belum Ada', color: '#ef4444' }
        ]
    },
    dialogue: {
        type: 'dialogue',
        category: 'action',
        title: 'Pesan Dialog Teks',
        icon: '💬',
        badgeColor: '#2563eb',
        headerBg: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
        desc: 'Menampilkan kotak percakapan typewriter untuk pemain.',
        defaultConfig: {
            speakerName: 'Kapten Chen',
            lines: [
                'Halo pengelana! Selamat datang di area ini.',
                'Selesaikan tugas untuk membuka jalan keluar.'
            ]
        },
        inputs: [
            { id: 'exec', label: 'Tampil (In)', color: '#94a3b8' }
        ],
        outputs: [
            { id: 'next', label: 'Selesai ➜', color: '#60a5fa' }
        ]
    },
    action_unlock: {
        type: 'action_unlock',
        category: 'action',
        title: 'Buka Kunci Portal Finish',
        icon: '🌀',
        badgeColor: '#059669',
        headerBg: 'linear-gradient(135deg, #047857, #10b981)',
        desc: 'Membuka segel kunci portal kemenangan agar pemain bisa lanjut ke level berikutnya.',
        defaultConfig: {
            target: 'portal',
            bannerMsg: '🎉 Portal Kemenangan Terbuka! Silakan Masuk.',
            rewardHp: 20
        },
        inputs: [
            { id: 'exec', label: 'Aktifkan (In)', color: '#94a3b8' }
        ],
        outputs: []
    },
    give_reward: {
        type: 'give_reward',
        category: 'action',
        title: 'Beri Hadiah Pemain',
        icon: '❤️',
        badgeColor: '#e11d48',
        headerBg: 'linear-gradient(135deg, #be123c, #f43f5e)',
        desc: 'Memulihkan HP darah pemain atau memberikan koin bonus.',
        defaultConfig: {
            rewardType: 'hp', // 'hp' | 'coins' | 'score'
            amount: 25
        },
        inputs: [
            { id: 'exec', label: 'Beri (In)', color: '#94a3b8' }
        ],
        outputs: []
    }
};

export class QuestLogicGraphView {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.projectId = options.projectId || null;
        this.sceneId = options.sceneId || null;
        this.onBackToSceneFlow = options.onBackToSceneFlow || null;

        this.pan = { x: 30, y: 30 };
        this.zoom = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.draggedNodeId = null;
        this.dragOffset = { x: 0, y: 0 };

        this.wiring = null; // { fromNodeId, fromPortId, startX, startY, currentX, currentY }
        this.selectedSourcePort = null; // { nodeId, portId }

        this.selectedNodeId = null;

        this.nodes = [];
        this.wires = [];

        this.dom = null;
        this.canvasWrap = null;
        this.svgLayer = null;
        this.wiresGroup = null;
        this.liveWirePath = null;
        this.nodesLayer = null;
        this.inspectorPanel = null;

        this.init();
    }

    init() {
        this.createDOM();
        this.loadData();
        this.bindEvents();
    }

    createDOM() {
        this.dom = document.createElement('div');
        this.dom.className = 'gt-quest-graph-container';
        this.dom.innerHTML = `
            <style>
                .gt-quest-graph-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #08090d;
                    background-image: 
                        radial-gradient(circle, rgba(168, 85, 247, 0.12) 1px, transparent 1px),
                        radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 28px 28px, 14px 14px;
                    background-position: 0 0, 14px 14px;
                    overflow: hidden;
                    user-select: none;
                    font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
                    display: flex;
                }

                /* Top Navigation & Sub-Tabs */
                .gt-qg-topbar {
                    position: absolute;
                    top: 12px;
                    left: 18px;
                    right: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 100;
                    pointer-events: none;
                }

                .gt-qg-topbar-left, .gt-qg-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    pointer-events: auto;
                    background: rgba(15, 23, 42, 0.88);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    padding: 5px 10px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
                }

                .gt-qg-subtabs {
                    display: inline-flex;
                    background: #090e17;
                    border: 1px solid #1e293b;
                    border-radius: 6px;
                    padding: 2px;
                    gap: 2px;
                }

                .gt-qg-subtab {
                    padding: 4px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                }

                .gt-qg-subtab:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.08);
                }

                .gt-qg-subtab.active {
                    background: #9333ea;
                    color: #fff;
                    box-shadow: 0 0 12px rgba(147, 51, 234, 0.4);
                }

                .gt-qg-btn {
                    background: #182234;
                    border: 1px solid #334155;
                    color: #cbd5e1;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 5px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.15s ease;
                }

                .gt-qg-btn:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #fff;
                }

                .gt-qg-btn-primary {
                    background: linear-gradient(135deg, #9333ea, #a855f7);
                    border: 1px solid #c084fc;
                    color: #fff;
                }

                .gt-qg-btn-primary:hover {
                    background: linear-gradient(135deg, #7e22ce, #9333ea);
                }

                /* Left Operators Palette Bar (RapidMiner Style) */
                .gt-qg-palette {
                    position: absolute;
                    top: 60px;
                    left: 18px;
                    bottom: 24px;
                    width: 220px;
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    z-index: 90;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
                    overflow: hidden;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                }

                .gt-qg-palette-header {
                    padding: 10px 14px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #a855f7;
                    border-bottom: 1px solid #1e293b;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(10, 15, 26, 0.6);
                }

                .gt-qg-palette-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .gt-qg-cat-title {
                    font-size: 9.5px;
                    font-weight: 800;
                    color: #64748b;
                    text-transform: uppercase;
                    margin: 8px 4px 2px 4px;
                }

                .gt-qg-palette-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 7px 10px;
                    background: #111827;
                    border: 1px solid #1e293b;
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-qg-palette-item:hover {
                    background: #1e293b;
                    border-color: #38bdf8;
                    color: #fff;
                    transform: translateX(3px);
                }

                /* Center Canvas Viewport */
                .gt-qg-canvas-viewport {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }

                .gt-qg-canvas-wrap {
                    position: absolute;
                    inset: 0;
                    transform-origin: 0 0;
                }

                .gt-qg-svg-layer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 10000px;
                    height: 10000px;
                    pointer-events: none;
                    z-index: 10;
                }

                /* Wires Style */
                .gt-qg-wire {
                    fill: none;
                    stroke: #a855f7;
                    stroke-width: 3.5px;
                    stroke-linecap: round;
                    cursor: pointer;
                    pointer-events: stroke;
                    transition: stroke 0.15s ease, stroke-width 0.15s ease;
                    filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.45));
                }

                .gt-qg-wire-hit {
                    fill: none;
                    stroke: transparent;
                    stroke-width: 24px;
                    stroke-linecap: round;
                    cursor: pointer;
                    pointer-events: stroke;
                }

                .gt-qg-wire-hit:hover + .gt-qg-wire,
                .gt-qg-wire:hover {
                    stroke: #ef4444 !important;
                    stroke-width: 5px !important;
                    filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.8));
                }

                .gt-qg-wire-pulse {
                    fill: none;
                    stroke: #ffffff;
                    stroke-width: 1.5px;
                    stroke-dasharray: 6 12;
                    animation: gtQGDash 1.2s linear infinite;
                    pointer-events: none;
                }

                @keyframes gtQGDash {
                    from { stroke-dashoffset: 36; }
                    to { stroke-dashoffset: 0; }
                }

                .gt-qg-live-wire {
                    fill: none;
                    stroke: #a855f7;
                    stroke-width: 3px;
                    stroke-dasharray: 5 5;
                    animation: gtQGLiveDash 0.8s linear infinite;
                    pointer-events: none;
                }

                @keyframes gtQGLiveDash {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }

                /* Node Cards */
                .gt-qg-nodes-layer {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    pointer-events: none;
                }

                .gt-qg-node {
                    position: absolute;
                    width: 230px;
                    background: #0d121d;
                    border: 1px solid #1e293b;
                    border-radius: 9px;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
                    pointer-events: auto;
                    cursor: default;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .gt-qg-node:hover {
                    border-color: #475569;
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
                }

                .gt-qg-node.selected {
                    border-color: #38bdf8 !important;
                    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4), 0 16px 36px rgba(0, 0, 0, 0.9) !important;
                }

                .gt-qg-node-header {
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                    cursor: grab;
                }

                .gt-qg-node-header:active {
                    cursor: grabbing;
                }

                .gt-qg-node-title {
                    font-size: 11.5px;
                    font-weight: 800;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-qg-node-type-badge {
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: rgba(0, 0, 0, 0.3);
                    color: rgba(255, 255, 255, 0.85);
                    text-transform: uppercase;
                }

                .gt-qg-node-body {
                    padding: 10px 12px;
                    font-size: 10.5px;
                    color: #94a3b8;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .gt-qg-node-desc {
                    line-height: 1.35;
                }

                .gt-qg-node-ports {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 10px 10px 10px;
                    border-top: 1px solid #172033;
                    background: #090e18;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                    min-height: 28px;
                }

                .gt-qg-ports-col {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .gt-qg-port-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #94a3b8;
                }

                .gt-qg-port-item.out {
                    flex-direction: row-reverse;
                }

                .gt-qg-port-dot {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #a855f7;
                    background: #0b111e;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-qg-port-dot:hover, .gt-qg-port-dot.is-hovered {
                    background: #22c55e !important;
                    border-color: #22c55e !important;
                    box-shadow: 0 0 14px #22c55e !important;
                    transform: scale(1.35) !important;
                }

                .gt-qg-port-dot.is-source-active {
                    background: #a855f7 !important;
                    border-color: #f472b6 !important;
                    box-shadow: 0 0 18px #c084fc !important;
                    transform: scale(1.4) !important;
                    animation: gtQGPulsePort 1s ease-in-out infinite alternate;
                }

                @keyframes gtQGPulsePort {
                    from { box-shadow: 0 0 8px #c084fc; }
                    to { box-shadow: 0 0 20px #e879f9; transform: scale(1.5); }
                }

                /* Right Parameters Inspector (RapidMiner Style) */
                .gt-qg-inspector {
                    position: absolute;
                    top: 60px;
                    right: 18px;
                    bottom: 24px;
                    width: 280px;
                    background: rgba(15, 23, 42, 0.92);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    z-index: 90;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
                    overflow: hidden;
                }

                .gt-qg-inspector-header {
                    padding: 10px 14px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #38bdf8;
                    border-bottom: 1px solid #1e293b;
                    background: rgba(10, 15, 26, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-qg-inspector-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .gt-qg-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .gt-qg-field-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                }

                .gt-qg-field-input, .gt-qg-field-textarea {
                    background: #090e17;
                    border: 1px solid #1e293b;
                    border-radius: 5px;
                    color: #f1f5f9;
                    font-size: 11px;
                    padding: 6px 8px;
                    outline: none;
                    transition: border-color 0.15s ease;
                }

                .gt-qg-field-input:focus, .gt-qg-field-textarea:focus {
                    border-color: #38bdf8;
                }

                .gt-qg-field-textarea {
                    min-height: 70px;
                    resize: vertical;
                    line-height: 1.4;
                }

                .gt-qg-hint {
                    position: absolute;
                    bottom: 14px;
                    left: 250px;
                    font-size: 11px;
                    color: #64748b;
                    background: rgba(15, 23, 42, 0.8);
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid #1e293b;
                    pointer-events: none;
                    z-index: 80;
                }
            </style>

            <!-- Top Toolbar Navigation -->
            <div class="gt-qg-topbar">
                <div class="gt-qg-topbar-left">
                    <!-- Sub-tabs Switcher -->
                    <div class="gt-qg-subtabs">
                        <button class="gt-qg-subtab" id="btn-tab-scene-flow" title="Kembali ke Alur Rute Antar-Scene">
                            <span>🎬 Rute Level</span>
                        </button>
                        <button class="gt-qg-subtab active" id="btn-tab-quest-logic" title="Logika Interaksi NPC &amp; Misi (Visual Scripting)">
                            <span>⚡ Logika NPC &amp; Quest</span>
                        </button>
                    </div>

                    <div style="width: 1px; height: 16px; background: #334155;"></div>

                    <button class="gt-qg-btn" id="btn-qg-auto-layout" title="Rapikan Tata Letak Node Secara Otomatis">
                        <span>📐</span> Auto-Layout
                    </button>
                    <button class="gt-qg-btn" id="btn-qg-simulate" style="color: #4ade80; border-color: rgba(74, 222, 128, 0.4);" title="Uji Simulasi Interaksi Logika">
                        <span>▶</span> Uji Simulasi
                    </button>
                    <button class="gt-qg-btn" id="btn-qg-reset-default" title="Kembalikan ke Contoh Alur Misi Default">
                        <span>🔄</span> Reset Logika
                    </button>
                </div>

                <div class="gt-qg-topbar-right">
                    <button class="gt-qg-btn" id="btn-qg-zoom-in" title="Perbesar Graph">+</button>
                    <button class="gt-qg-btn" id="btn-qg-zoom-out" title="Perkecil Graph">−</button>
                    <button class="gt-qg-btn" id="btn-qg-zoom-reset" title="Reset Zoom &amp; Pan">100%</button>
                </div>
            </div>

            <!-- Left Operators Palette (RapidMiner Style) -->
            <div class="gt-qg-palette">
                <div class="gt-qg-palette-header">
                    <span>⚡ Operator &amp; Node</span>
                </div>
                <div class="gt-qg-palette-list">
                    <div class="gt-qg-cat-title">1. Trigger (Pemicu)</div>
                    <div class="gt-qg-palette-item" data-type="npc_trigger" title="Dipicu ketika pemain bicara dengan NPC">
                        <span>🧙</span> NPC Trigger
                    </div>
                    <div class="gt-qg-palette-item" data-type="chest_trigger" title="Dipicu saat peti harta dibuka">
                        <span>📦</span> Peti Harta
                    </div>

                    <div class="gt-qg-cat-title">2. Kondisi (Logika)</div>
                    <div class="gt-qg-palette-item" data-type="condition_coins" title="Cek apakah koin pemain memenuhi syarat">
                        <span>🪙</span> Syarat Koin
                    </div>
                    <div class="gt-qg-palette-item" data-type="condition_item" title="Cek apakah pemain membawa item/kunci">
                        <span>🔑</span> Syarat Item
                    </div>

                    <div class="gt-qg-cat-title">3. Aksi &amp; Respon</div>
                    <div class="gt-qg-palette-item" data-type="dialogue" title="Tampilkan kotak pesan dialog ke pemain">
                        <span>💬</span> Pesan Dialog
                    </div>
                    <div class="gt-qg-palette-item" data-type="action_unlock" title="Buka segel portal finish agar bisa tamat">
                        <span>🌀</span> Buka Portal
                    </div>
                    <div class="gt-qg-palette-item" data-type="give_reward" title="Pulihkan HP atau beri koin bonus">
                        <span>❤️</span> Beri Hadiah
                    </div>
                </div>
            </div>

            <div class="gt-qg-hint" id="gt-qg-hint">
                💡 <b>Tips:</b> Klik node untuk edit parameter di kanan. Tarik port output (kanan) ke port input (kiri) untuk menyambung alur!
            </div>

            <!-- Canvas Viewport -->
            <div class="gt-qg-canvas-viewport" id="gt-qg-canvas-viewport">
                <div class="gt-qg-canvas-wrap" id="gt-qg-canvas-wrap">
                    <svg class="gt-qg-svg-layer" id="gt-qg-svg-layer">
                        <defs>
                            <linearGradient id="gtQGFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#a855f7" />
                                <stop offset="100%" stop-color="#38bdf8" />
                            </linearGradient>
                        </defs>
                        <g id="gt-qg-wires-group"></g>
                        <path id="gt-qg-live-wire" class="gt-qg-live-wire" d="" style="display: none;"></path>
                    </svg>
                    <div class="gt-qg-nodes-layer" id="gt-qg-nodes-layer"></div>
                </div>
            </div>

            <!-- Right Parameters Inspector (RapidMiner Style) -->
            <div class="gt-qg-inspector" id="gt-qg-inspector">
                <div class="gt-qg-inspector-header">
                    <span>⚙️ Parameters</span>
                </div>
                <div class="gt-qg-inspector-body" id="gt-qg-inspector-body">
                    <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 40px;">
                        Pilih salah satu node di kanvas untuk mengubah teks, dialog, atau parameter logika di sini.
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(this.dom);
        this.canvasWrap = this.dom.querySelector('#gt-qg-canvas-wrap');
        this.svgLayer = this.dom.querySelector('#gt-qg-svg-layer');
        this.wiresGroup = this.dom.querySelector('#gt-qg-wires-group');
        this.liveWirePath = this.dom.querySelector('#gt-qg-live-wire');
        this.nodesLayer = this.dom.querySelector('#gt-qg-nodes-layer');
        this.inspectorBody = this.dom.querySelector('#gt-qg-inspector-body');
    }

    loadData() {
        if (!this.projectId) {
            const projects = ProjectManager.getProjects();
            if (projects.length > 0) this.projectId = projects[0].id;
        }

        const questData = ProjectManager.getQuestLogic(this.projectId, this.sceneId);
        this.nodes = Array.isArray(questData.nodes) ? JSON.parse(JSON.stringify(questData.nodes)) : [];
        this.wires = Array.isArray(questData.wires) ? JSON.parse(JSON.stringify(questData.wires)) : [];

        this.renderNodes();
        this.renderWires();
        this.applyTransform();
        if (this.nodes.length > 0) {
            this.selectNode(this.nodes[0].id);
        }
    }

    saveData() {
        if (!this.projectId) return;
        ProjectManager.saveQuestLogic(this.projectId, this.sceneId, {
            nodes: this.nodes,
            wires: this.wires
        });
    }

    renderNodes() {
        this.nodesLayer.innerHTML = '';

        this.nodes.forEach(node => {
            const tmpl = QUEST_NODE_TEMPLATES[node.type] || QUEST_NODE_TEMPLATES.dialogue;
            const card = document.createElement('div');
            card.className = `gt-qg-node ${this.selectedNodeId === node.id ? 'selected' : ''}`;
            card.id = `qg-node-${node.id}`;
            card.setAttribute('data-node-id', node.id);
            card.style.left = `${node.x}px`;
            card.style.top = `${node.y}px`;

            // Inputs HTML
            const inputsHTML = (tmpl.inputs || []).map(inp => `
                <div class="gt-qg-port-item in" title="Input Titik Masuk Alur">
                    <div class="gt-qg-port-dot is-in" data-port="${inp.id}" data-node="${node.id}" style="border-color: ${inp.color};"></div>
                    <span>${inp.label}</span>
                </div>
            `).join('');

            // Outputs HTML
            const outputsHTML = (tmpl.outputs || []).map(out => `
                <div class="gt-qg-port-item out" title="Output Titik Keluar Alur">
                    <div class="gt-qg-port-dot is-out" data-port="${out.id}" data-node="${node.id}" style="border-color: ${out.color};"></div>
                    <span>${out.label}</span>
                </div>
            `).join('');

            // Preview summary text
            let summaryText = '';
            if (node.type === 'npc_trigger') {
                summaryText = `Bicara: <b>${node.config.speakerName || 'NPC'}</b>`;
            } else if (node.type === 'condition_coins') {
                summaryText = `Syarat: <b>${node.config.reqCoins || 3} Koin</b>`;
            } else if (node.type === 'dialogue') {
                const firstLine = (node.config.lines && node.config.lines[0]) || '';
                summaryText = `<i>"${firstLine.length > 28 ? firstLine.slice(0, 28) + '...' : firstLine}"</i>`;
            } else if (node.type === 'action_unlock') {
                summaryText = `Buka: <b>Portal Kemenangan</b>`;
            } else if (node.type === 'chest_trigger') {
                summaryText = `Peti: +${node.config.rewardCoins || 5} Koin`;
            } else if (node.type === 'give_reward') {
                summaryText = `Hadiah: +${node.config.amount || 20} ${node.config.rewardType?.toUpperCase() || 'HP'}`;
            }

            card.innerHTML = `
                <div class="gt-qg-node-header" data-drag-handle="true" style="background: ${tmpl.headerBg};">
                    <div class="gt-qg-node-title">
                        <span>${tmpl.icon}</span>
                        <span>${node.title || tmpl.title}</span>
                    </div>
                    <span class="gt-qg-node-type-badge">${tmpl.category}</span>
                </div>
                <div class="gt-qg-node-body">
                    <div class="gt-qg-node-desc">${summaryText}</div>
                </div>
                <div class="gt-qg-node-ports">
                    <div class="gt-qg-ports-col in">${inputsHTML}</div>
                    <div class="gt-qg-ports-col out">${outputsHTML}</div>
                </div>
            `;

            card.addEventListener('mousedown', (e) => {
                if (e.target.closest('.gt-qg-port-dot')) return;
                this.selectNode(node.id);
            });

            this.nodesLayer.appendChild(card);
        });
    }

    renderWires() {
        this.wiresGroup.innerHTML = '';

        this.wires.forEach((wire, index) => {
            const outDot = this.dom.querySelector(`.gt-qg-port-dot.is-out[data-node="${wire.fromNode}"][data-port="${wire.fromPort}"]`);
            const inDot = this.dom.querySelector(`.gt-qg-port-dot.is-in[data-node="${wire.toNode}"][data-port="${wire.toPort}"]`);

            if (!outDot || !inDot) return;

            const outRect = outDot.getBoundingClientRect();
            const inRect = inDot.getBoundingClientRect();
            const wrapRect = this.canvasWrap.getBoundingClientRect();

            const x1 = (outRect.left + outRect.width / 2 - wrapRect.left) / this.zoom;
            const y1 = (outRect.top + outRect.height / 2 - wrapRect.top) / this.zoom;
            const x2 = (inRect.left + inRect.width / 2 - wrapRect.left) / this.zoom;
            const y2 = (inRect.top + inRect.height / 2 - wrapRect.top) / this.zoom;

            const dx = Math.max(60, Math.abs(x2 - x1) * 0.55);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            // Hitbox tebal 24px transparan agar mudah di-klik
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('d', d);
            hitPath.setAttribute('class', 'gt-qg-wire-hit');
            hitPath.setAttribute('title', 'Klik garis ini untuk memutuskan sambungan logika');

            const delHandler = (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.wires.splice(index, 1);
                this.saveData();
                this.renderWires();
            };
            hitPath.addEventListener('click', delHandler);

            // Wire path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'gt-qg-wire');
            path.setAttribute('stroke', wire.fromPort === 'pass' ? '#22c55e' : (wire.fromPort === 'fail' ? '#ef4444' : 'url(#gtQGFlowGrad)'));
            path.setAttribute('title', 'Klik garis untuk memutus');
            path.addEventListener('click', delHandler);

            // Pulse
            const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pulse.setAttribute('d', d);
            pulse.setAttribute('class', 'gt-qg-wire-pulse');

            this.wiresGroup.appendChild(hitPath);
            this.wiresGroup.appendChild(path);
            this.wiresGroup.appendChild(pulse);
        });
    }

    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        this.dom.querySelectorAll('.gt-qg-node').forEach(n => {
            n.classList.toggle('selected', n.getAttribute('data-node-id') === nodeId);
        });
        this.renderInspector();
    }

    renderInspector() {
        if (!this.inspectorBody) return;
        const node = this.nodes.find(n => n.id === this.selectedNodeId);
        if (!node) {
            this.inspectorBody.innerHTML = `
                <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 40px;">
                    Pilih salah satu node di kanvas untuk mengubah teks, dialog, atau parameter logika di sini.
                </div>
            `;
            return;
        }

        const tmpl = QUEST_NODE_TEMPLATES[node.type] || QUEST_NODE_TEMPLATES.dialogue;

        let fieldsHTML = `
            <div class="gt-qg-field">
                <span class="gt-qg-field-label">Judul Kotak Node</span>
                <input type="text" class="gt-qg-field-input" id="inp-qg-title" value="${node.title || tmpl.title}" />
            </div>
        `;

        if (node.type === 'npc_trigger') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Nama Karakter NPC</span>
                    <input type="text" class="gt-qg-field-input" id="inp-qg-npc-name" value="${node.config.speakerName || 'Kapten Chen'}" />
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Teks Petunjuk Interaksi</span>
                    <input type="text" class="gt-qg-field-input" id="inp-qg-npc-prompt" value="${node.config.promptText || 'Tekan E untuk bicara'}" />
                </div>
            `;
        } else if (node.type === 'condition_coins') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Jumlah Koin Minimal Diperlukan</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-req-coins" value="${node.config.reqCoins || 3}" min="1" max="99" />
                </div>
                <div style="font-size: 10.5px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 8px; border-radius: 5px; border: 1px dashed rgba(245, 158, 11, 0.3); line-height: 1.4;">
                    🪙 Jika pemain memiliki koin ≥ nilai ini, alur akan mengalir ke pin <b>Hijau (Pass)</b>. Jika kurang, mengalir ke pin <b>Merah (Fail)</b>.
                </div>
            `;
        } else if (node.type === 'dialogue') {
            const linesStr = (node.config.lines || []).join('\n');
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Nama Pembicara</span>
                    <input type="text" class="gt-qg-field-input" id="inp-qg-dlg-speaker" value="${node.config.speakerName || 'Kapten Chen'}" />
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Isi Kalimat Dialog (1 baris = 1 dialog)</span>
                    <textarea class="gt-qg-field-textarea" id="inp-qg-dlg-lines" rows="4">${linesStr}</textarea>
                </div>
            `;
        } else if (node.type === 'action_unlock') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Objek Target</span>
                    <input type="text" class="gt-qg-field-input" value="Portal Finish Kemenangan" disabled style="opacity: 0.7;" />
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Bonus Pemulihan HP</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-reward-hp" value="${node.config.rewardHp || 20}" min="0" max="100" />
                </div>
                <div style="font-size: 10.5px; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 5px; border: 1px dashed rgba(16, 185, 129, 0.3); line-height: 1.4;">
                    🌀 Begitu node ini terpicu, segel portal finish langsung terbuka dan banner ucapan selamat muncul di layar!
                </div>
            `;
        } else if (node.type === 'chest_trigger') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Hadiah Koin dari Peti</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-chest-coins" value="${node.config.rewardCoins || 5}" min="1" max="100" />
                </div>
            `;
        } else if (node.type === 'give_reward') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Tipe Hadiah</span>
                    <select class="gt-qg-field-input" id="inp-qg-reward-type">
                        <option value="hp" ${node.config.rewardType === 'hp' ? 'selected' : ''}>Pulihkan HP Darah (+HP)</option>
                        <option value="coins" ${node.config.rewardType === 'coins' ? 'selected' : ''}>Koin Emas (+Coins)</option>
                    </select>
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Jumlah Hadiah</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-reward-amount" value="${node.config.amount || 25}" min="1" max="100" />
                </div>
            `;
        }

        fieldsHTML += `
            <div style="margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 12px;">
                <button class="gt-qg-btn" id="btn-qg-delete-node" style="width: 100%; justify-content: center; color: #f87171; border-color: rgba(248, 113, 113, 0.4); background: rgba(239, 68, 68, 0.08);">
                    <span>🗑️</span> Hapus Node Ini
                </button>
            </div>
        `;

        this.inspectorBody.innerHTML = fieldsHTML;

        // Bind Inspector Events
        const inpTitle = this.inspectorBody.querySelector('#inp-qg-title');
        if (inpTitle) {
            inpTitle.addEventListener('input', () => {
                node.title = inpTitle.value;
                this.saveData();
                this.renderNodes();
            });
        }

        const inpNpcName = this.inspectorBody.querySelector('#inp-qg-npc-name');
        if (inpNpcName) {
            inpNpcName.addEventListener('input', () => {
                node.config.speakerName = inpNpcName.value;
                this.saveData();
                this.renderNodes();
            });
        }

        const inpNpcPrompt = this.inspectorBody.querySelector('#inp-qg-npc-prompt');
        if (inpNpcPrompt) {
            inpNpcPrompt.addEventListener('input', () => {
                node.config.promptText = inpNpcPrompt.value;
                this.saveData();
            });
        }

        const inpReqCoins = this.inspectorBody.querySelector('#inp-qg-req-coins');
        if (inpReqCoins) {
            inpReqCoins.addEventListener('input', () => {
                node.config.reqCoins = parseInt(inpReqCoins.value, 10) || 1;
                this.saveData();
                this.renderNodes();
            });
        }

        const inpDlgSpeaker = this.inspectorBody.querySelector('#inp-qg-dlg-speaker');
        if (inpDlgSpeaker) {
            inpDlgSpeaker.addEventListener('input', () => {
                node.config.speakerName = inpDlgSpeaker.value;
                this.saveData();
            });
        }

        const inpDlgLines = this.inspectorBody.querySelector('#inp-qg-dlg-lines');
        if (inpDlgLines) {
            inpDlgLines.addEventListener('input', () => {
                node.config.lines = inpDlgLines.value.split('\n').filter(l => l.trim().length > 0);
                this.saveData();
                this.renderNodes();
            });
        }

        const inpRewardHp = this.inspectorBody.querySelector('#inp-qg-reward-hp');
        if (inpRewardHp) {
            inpRewardHp.addEventListener('input', () => {
                node.config.rewardHp = parseInt(inpRewardHp.value, 10) || 0;
                this.saveData();
            });
        }

        const inpChestCoins = this.inspectorBody.querySelector('#inp-qg-chest-coins');
        if (inpChestCoins) {
            inpChestCoins.addEventListener('input', () => {
                node.config.rewardCoins = parseInt(inpChestCoins.value, 10) || 1;
                this.saveData();
                this.renderNodes();
            });
        }

        const inpRewardType = this.inspectorBody.querySelector('#inp-qg-reward-type');
        const inpRewardAmount = this.inspectorBody.querySelector('#inp-qg-reward-amount');
        if (inpRewardType && inpRewardAmount) {
            inpRewardType.addEventListener('change', () => {
                node.config.rewardType = inpRewardType.value;
                this.saveData();
                this.renderNodes();
            });
            inpRewardAmount.addEventListener('input', () => {
                node.config.amount = parseInt(inpRewardAmount.value, 10) || 1;
                this.saveData();
                this.renderNodes();
            });
        }

        const btnDelete = this.inspectorBody.querySelector('#btn-qg-delete-node');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                this.deleteNode(node.id);
            });
        }
    }

    addNode(type, x = null, y = null) {
        const tmpl = QUEST_NODE_TEMPLATES[type];
        if (!tmpl) return;

        const id = `node_${type}_${Date.now().toString(36)}`;
        const wrapRect = this.canvasWrap.getBoundingClientRect();
        const posX = x !== null ? x : Math.round((wrapRect.width / 2 - 110 - this.pan.x) / this.zoom);
        const posY = y !== null ? y : Math.round((wrapRect.height / 2 - 80 - this.pan.y) / this.zoom);

        const newNode = {
            id,
            type,
            title: tmpl.title,
            x: Math.max(20, posX),
            y: Math.max(20, posY),
            config: JSON.parse(JSON.stringify(tmpl.defaultConfig))
        };

        this.nodes.push(newNode);
        AudioManager.playClick();
        this.saveData();
        this.renderNodes();
        this.selectNode(id);
    }

    deleteNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.wires = this.wires.filter(w => w.fromNode !== nodeId && w.toNode !== nodeId);
        AudioManager.playClick();
        this.saveData();
        this.renderNodes();
        this.renderWires();
        this.selectNode(this.nodes.length > 0 ? this.nodes[0].id : null);
    }

    bindEvents() {
        // Subtab: Kembali ke Scene Flow
        const btnTabSceneFlow = this.dom.querySelector('#btn-tab-scene-flow');
        if (btnTabSceneFlow) {
            btnTabSceneFlow.addEventListener('click', () => {
                AudioManager.playClick();
                if (typeof this.onBackToSceneFlow === 'function') {
                    this.onBackToSceneFlow();
                }
            });
        }

        // Palette Item Click / Drag
        this.dom.querySelectorAll('.gt-qg-palette-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                this.addNode(type);
            });
        });

        // Auto-Layout
        const btnAutoLayout = this.dom.querySelector('#btn-qg-auto-layout');
        if (btnAutoLayout) {
            btnAutoLayout.addEventListener('click', () => {
                AudioManager.playClick();
                this.autoLayout();
            });
        }

        // Simulation Mode
        const btnSimulate = this.dom.querySelector('#btn-qg-simulate');
        if (btnSimulate) {
            btnSimulate.addEventListener('click', () => {
                AudioManager.playSuccess();
                this.openSimulationDialog();
            });
        }

        // Reset default
        const btnReset = this.dom.querySelector('#btn-qg-reset-default');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Reset logika misi ke contoh default Kapten Chen & Syarat 3 Koin?')) {
                    AudioManager.playClick();
                    const proj = ProjectManager.getProject(this.projectId);
                    if (proj && proj.questLogicMap) {
                        delete proj.questLogicMap[this.sceneId || 'default'];
                        ProjectManager.saveProjects(ProjectManager.getProjects());
                    }
                    this.loadData();
                }
            });
        }

        // Zoom & Pan
        this.dom.querySelector('#btn-qg-zoom-in').addEventListener('click', () => {
            this.zoom = Math.min(2.0, this.zoom + 0.15);
            this.applyTransform();
        });
        this.dom.querySelector('#btn-qg-zoom-out').addEventListener('click', () => {
            this.zoom = Math.max(0.4, this.zoom - 0.15);
            this.applyTransform();
        });
        this.dom.querySelector('#btn-qg-zoom-reset').addEventListener('click', () => {
            this.zoom = 1;
            this.pan = { x: 30, y: 30 };
            this.applyTransform();
        });

        // Mouse Drag / Wiring / Panning
        this.dom.addEventListener('mousedown', (e) => {
            const dragHandle = e.target.closest('[data-drag-handle="true"]');
            const portDot = e.target.closest('.gt-qg-port-dot');

            // Kasus A: Interaksi Port (Klik atau Tarik)
            if (portDot) {
                e.preventDefault();
                e.stopPropagation();
                const portNodeId = portDot.getAttribute('data-node');
                const portId = portDot.getAttribute('data-port');

                // Jika sedang memilih target (Klik port IN setelah klik port OUT)
                if (portDot.classList.contains('is-in') && this.selectedSourcePort) {
                    if (this.selectedSourcePort.nodeId !== portNodeId) {
                        // Hapus koneksi lama dari port yang sama jika ada
                        this.wires = this.wires.filter(w => !(w.fromNode === this.selectedSourcePort.nodeId && w.fromPort === this.selectedSourcePort.portId));
                        this.wires.push({
                            fromNode: this.selectedSourcePort.nodeId,
                            fromPort: this.selectedSourcePort.portId,
                            toNode: portNodeId,
                            toPort: portId
                        });
                        AudioManager.playSuccess();
                        this.saveData();
                    }
                    this.clearPortSelection();
                    this.renderWires();
                    return;
                }

                // Klik port OUT untuk mode drag ATAU klik
                if (portDot.classList.contains('is-out')) {
                    this.selectSourcePort(portNodeId, portId, portDot);

                    const rect = portDot.getBoundingClientRect();
                    const wrapRect = this.canvasWrap.getBoundingClientRect();
                    const startX = (rect.left + rect.width / 2 - wrapRect.left) / this.zoom;
                    const startY = (rect.top + rect.height / 2 - wrapRect.top) / this.zoom;

                    this.wiring = {
                        fromNodeId: portNodeId,
                        fromPortId: portId,
                        startX,
                        startY,
                        currentX: startX,
                        currentY: startY
                    };

                    this.liveWirePath.style.display = 'block';
                    return;
                }
            }

            // Batalkan seleksi port jika klik di kanvas
            if (this.selectedSourcePort && !e.target.closest('.gt-qg-port-dot')) {
                this.clearPortSelection();
            }

            // Kasus B: Dragging Node
            if (dragHandle) {
                e.preventDefault();
                const nodeCard = dragHandle.closest('.gt-qg-node');
                const nodeId = nodeCard.getAttribute('data-node-id');
                this.draggedNodeId = nodeId;

                const node = this.nodes.find(n => n.id === nodeId);
                if (node) {
                    this.dragOffset = {
                        x: (e.clientX / this.zoom) - node.x,
                        y: (e.clientY / this.zoom) - node.y
                    };
                }
                return;
            }

            // Kasus C: Pan Canvas
            if (!e.target.closest('.gt-qg-node') && !e.target.closest('.gt-qg-palette') && !e.target.closest('.gt-qg-inspector') && !e.target.closest('.gt-qg-topbar')) {
                this.isPanning = true;
                this.panStart = {
                    x: e.clientX - this.pan.x,
                    y: e.clientY - this.pan.y
                };
            }
        });

        window.addEventListener('mousemove', (e) => {
            // Live Wiring
            if (this.wiring) {
                const wrapRect = this.canvasWrap.getBoundingClientRect();
                const cx = (e.clientX - wrapRect.left) / this.zoom;
                const cy = (e.clientY - wrapRect.top) / this.zoom;

                const dx = Math.max(50, Math.abs(cx - this.wiring.startX) * 0.5);
                const d = `M ${this.wiring.startX} ${this.wiring.startY} C ${this.wiring.startX + dx} ${this.wiring.startY}, ${cx - dx} ${cy}, ${cx} ${cy}`;
                this.liveWirePath.setAttribute('d', d);

                // Highlight port di bawah kursor
                this.dom.querySelectorAll('.gt-qg-port-dot.is-in').forEach(dot => {
                    const r = dot.getBoundingClientRect();
                    const isInside = (e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8);
                    dot.classList.toggle('is-hovered', isInside);
                });
                return;
            }

            // Drag Node
            if (this.draggedNodeId) {
                const nx = Math.round((e.clientX / this.zoom) - this.dragOffset.x);
                const ny = Math.round((e.clientY / this.zoom) - this.dragOffset.y);

                const node = this.nodes.find(n => n.id === this.draggedNodeId);
                if (node) {
                    node.x = nx;
                    node.y = ny;
                    const nodeEl = this.dom.querySelector(`#qg-node-${node.id}`);
                    if (nodeEl) {
                        nodeEl.style.left = `${nx}px`;
                        nodeEl.style.top = `${ny}px`;
                    }
                    this.renderWires();
                }
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
            // Selesaikan penarikan kabel
            if (this.wiring) {
                const hoveredInPort = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gt-qg-port-dot.is-in');
                if (hoveredInPort) {
                    const toNodeId = hoveredInPort.getAttribute('data-node');
                    const toPortId = hoveredInPort.getAttribute('data-port');

                    if (toNodeId && toNodeId !== this.wiring.fromNodeId) {
                        this.wires = this.wires.filter(w => !(w.fromNode === this.wiring.fromNodeId && w.fromPort === this.wiring.fromPortId));
                        this.wires.push({
                            fromNode: this.wiring.fromNodeId,
                            fromPort: this.wiring.fromPortId,
                            toNode: toNodeId,
                            toPort: toPortId
                        });
                        AudioManager.playSuccess();
                        this.saveData();
                    }
                }

                this.dom.querySelectorAll('.gt-qg-port-dot').forEach(d => d.classList.remove('is-hovered'));
                this.liveWirePath.style.display = 'none';
                this.wiring = null;
                this.renderWires();
                return;
            }

            if (this.draggedNodeId) {
                this.draggedNodeId = null;
                this.saveData();
            }

            if (this.isPanning) {
                this.isPanning = false;
            }
        });

        // Wheel Zoom
        this.dom.addEventListener('wheel', (e) => {
            if (e.target.closest('.gt-qg-palette') || e.target.closest('.gt-qg-inspector')) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            this.zoom = Math.max(0.4, Math.min(2.0, this.zoom + delta));
            this.applyTransform();
        }, { passive: false });
    }

    selectSourcePort(nodeId, portId, portEl) {
        this.clearPortSelection();
        this.selectedSourcePort = { nodeId, portId };
        if (portEl) portEl.classList.add('is-source-active');
        const hintEl = this.dom.querySelector('#gt-qg-hint');
        if (hintEl) {
            hintEl.innerHTML = `🔗 <b>Mode Sambung:</b> Port output terpilih! Sekarang klik port <b>Input (Kiri)</b> pada node tujuan untuk menghubungkan alur logika.`;
            hintEl.style.color = '#38bdf8';
        }
    }

    clearPortSelection() {
        this.selectedSourcePort = null;
        if (this.dom) {
            this.dom.querySelectorAll('.gt-qg-port-dot').forEach(d => {
                d.classList.remove('is-source-active');
                d.classList.remove('is-hovered');
            });
            const hintEl = this.dom.querySelector('#gt-qg-hint');
            if (hintEl) {
                hintEl.innerHTML = `💡 <b>Tips:</b> Klik node untuk edit parameter di kanan. Tarik port output (kanan) ke port input (kiri) untuk menyambung alur!`;
                hintEl.style.color = '#64748b';
            }
        }
    }

    applyTransform() {
        if (!this.canvasWrap) return;
        this.canvasWrap.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
        const zoomResetBtn = this.dom.querySelector('#btn-qg-zoom-reset');
        if (zoomResetBtn) {
            zoomResetBtn.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    autoLayout() {
        // Urutkan node ke dalam kolom berdasarkan dependensi alur
        let startX = 60;
        let startY = 100;
        this.nodes.forEach((n, idx) => {
            n.x = startX + (idx % 3) * 310;
            n.y = startY + Math.floor(idx / 3) * 200;
        });
        this.saveData();
        this.renderNodes();
        this.renderWires();
    }

    openSimulationDialog() {
        const old = document.getElementById('gt-qg-sim-modal');
        if (old) old.remove();

        const simDialog = document.createElement('div');
        simDialog.id = 'gt-qg-sim-modal';
        simDialog.style.cssText = `
            position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); font-family: 'Jost', sans-serif;
        `;

        let simCoins = 0;
        const updateSim = () => {
            const condNode = this.nodes.find(n => n.type === 'condition_coins');
            const reqCoins = (condNode && condNode.config.reqCoins) || 3;
            const isPass = simCoins >= reqCoins;

            const wiresFromCond = this.wires.filter(w => w.fromNode === (condNode?.id));
            const passWire = wiresFromCond.find(w => w.fromPort === 'pass');
            const failWire = wiresFromCond.find(w => w.fromPort === 'fail');

            const passTarget = passWire ? this.nodes.find(n => n.id === passWire.toNode) : null;
            const failTarget = failWire ? this.nodes.find(n => n.id === failWire.toNode) : null;

            const targetNode = isPass ? passTarget : failTarget;
            const resultMsg = targetNode ? (targetNode.title || targetNode.type) : '(Belum ada kabel tersambung)';

            simDialog.querySelector('#sim-coins-val').textContent = simCoins;
            simDialog.querySelector('#sim-status-box').innerHTML = `
                <div style="font-size: 13px; font-weight: 700; color: ${isPass ? '#22c55e' : '#ef4444'}; margin-bottom: 6px;">
                    ${isPass ? '✓ MEMENUHI SYARAT (PASS)' : '✗ BELUM MEMENUHI (FAIL)'}
                </div>
                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">
                    Alur mengalir ke: <b>${resultMsg}</b>
                </div>
                ${isPass ? `
                    <div style="margin-top: 8px; font-size: 11px; color: #4ade80;">
                        🎉 Portal finish akan TERBUKA saat pemain bicara dengan NPC!
                    </div>
                ` : `
                    <div style="margin-top: 8px; font-size: 11px; color: #fca5a5;">
                        🔒 Portal finish tetap TERKUNCI dan NPC meminta koin lagi.
                    </div>
                `}
            `;
        };

        simDialog.innerHTML = `
            <div style="width: 440px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); color: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 15px; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                        <span>▶</span> Simulasi Eksekusi Logika Quest
                    </h3>
                    <button id="btn-close-sim" style="background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;">✕</button>
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 8px;">Simulasikan Jumlah Koin Pemain:</div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button id="btn-sim-dec" style="padding: 6px 14px; background: #1e293b; border: 1px solid #334155; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold;">− 1</button>
                        <span style="font-size: 18px; font-weight: 800; color: #f59e0b; min-width: 40px; text-align: center;" id="sim-coins-val">0</span>
                        <button id="btn-sim-inc" style="padding: 6px 14px; background: #1e293b; border: 1px solid #334155; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold;">+ 1</button>
                    </div>
                </div>

                <div id="sim-status-box" style="background: #090e17; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; margin-bottom: 16px;"></div>

                <button id="btn-done-sim" style="width: 100%; padding: 8px; background: #0284c7; border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer;">
                    Tutup Simulasi
                </button>
            </div>
        `;

        document.body.appendChild(simDialog);

        simDialog.querySelector('#btn-close-sim').addEventListener('click', () => simDialog.remove());
        simDialog.querySelector('#btn-done-sim').addEventListener('click', () => simDialog.remove());
        simDialog.querySelector('#btn-sim-dec').addEventListener('click', () => {
            simCoins = Math.max(0, simCoins - 1);
            AudioManager.playClick();
            updateSim();
        });
        simDialog.querySelector('#btn-sim-inc').addEventListener('click', () => {
            simCoins++;
            AudioManager.playCoin();
            updateSim();
        });

        updateSim();
    }

    refresh() {
        this.loadData();
    }

    destroy() {
        if (this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
        }
    }
}
