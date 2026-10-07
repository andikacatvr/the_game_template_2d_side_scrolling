// ===============================================================
// VISUAL QUEST & NPC LOGIC GRAPH (FOLDER-BASED MACRO & MICRO ENGINE)
// ===============================================================
// Arsitektur 2 Tingkat (Hierarchical State Graph):
// 1. MACRO VIEW (Alur Cerita Global):
//    - Folder-folder logika (New Folder 1, New Folder 2, dst.)
//    - Dihubungkan dengan kabel alur sekuensial (Out ➔ In)
//    - Pengguna bebas me-rename nama folder kapan saja.
// 2. MICRO VIEW (Isi Logika Internal Folder):
//    - Klik 2x / Buka folder untuk masuk ke kanvas detail
//    - Berisi NPC Trigger, Syarat Koin/Item, Dialog RPG, Buka Portal, & Selesai.
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
    },
    folder_complete: {
        type: 'folder_complete',
        category: 'action',
        title: 'Babak / Folder Selesai',
        icon: '🏁',
        badgeColor: '#059669',
        headerBg: 'linear-gradient(135deg, #047857, #10b981)',
        desc: 'Menandai folder ini selesai dan melanjutkan alur cerita ke folder berikutnya.',
        defaultConfig: {
            bannerMsg: '🎉 Babak misi selesai! Lanjut ke babak berikutnya.',
            rewardCoins: 5
        },
        inputs: [
            { id: 'exec', label: 'Tamat (In)', color: '#94a3b8' }
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
        this.draggedFolderId = null;
        this.dragOffset = { x: 0, y: 0 };

        this.wiring = null; // { type: 'node'|'folder', fromId, fromPort, startX, startY, currentX, currentY }
        this.selectedSourcePort = null; // Port selection state
        this.selectedSourceFolderPort = null;

        this.selectedNodeId = null;
        this.selectedFolderId = null;

        // Folder & Sub-graph state
        this.currentFolderId = null; // null = Macro View (Overview Folder), string = Micro View (Inside Folder)
        this.folders = [];
        this.folderWires = [];

        // Active folder's internal graph
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

                /* Breadcrumb Navigation */
                .gt-qg-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11.5px;
                    font-weight: 700;
                    color: #cbd5e1;
                    padding: 0 4px;
                }

                .gt-qg-breadcrumb-item {
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: color 0.15s ease;
                }

                .gt-qg-breadcrumb-item:hover {
                    color: #38bdf8;
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

                .gt-qg-btn-folder {
                    background: linear-gradient(135deg, #b45309, #f59e0b);
                    border: 1px solid #fbbf24;
                    color: #fff;
                }

                .gt-qg-btn-folder:hover {
                    background: linear-gradient(135deg, #92400e, #d97706);
                }

                /* Left Sidebar Bar (Explorer Folders + Operators) */
                .gt-qg-palette {
                    position: absolute;
                    top: 60px;
                    left: 18px;
                    bottom: 24px;
                    width: 240px;
                    background: rgba(15, 23, 42, 0.94);
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

                /* Folder Explorer Section */
                .gt-qg-folder-section {
                    border-bottom: 1px solid #1e293b;
                    padding-bottom: 8px;
                    margin-bottom: 8px;
                }

                .gt-qg-folder-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #111827;
                    border: 1px solid #1f2937;
                    border-radius: 6px;
                    padding: 6px 8px;
                    margin-bottom: 5px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-qg-folder-item:hover {
                    background: #1e293b;
                    border-color: #f59e0b;
                }

                .gt-qg-folder-item.active {
                    background: rgba(245, 158, 11, 0.15);
                    border-color: #fbbf24;
                }

                .gt-qg-folder-item-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .gt-qg-folder-item-actions {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .gt-qg-folder-action-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 11px;
                    padding: 2px 4px;
                    border-radius: 4px;
                }

                .gt-qg-folder-action-btn:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
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
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 6px;
                    color: #cbd5e1;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .gt-qg-palette-item:hover {
                    background: #1e293b;
                    border-color: #38bdf8;
                    color: #fff;
                    transform: translateX(3px);
                }

                /* Canvas Viewport */
                .gt-qg-canvas-viewport {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }

                .gt-qg-canvas-wrap {
                    position: absolute;
                    width: 6000px;
                    height: 4000px;
                    transform-origin: 0 0;
                }

                .gt-qg-svg-layer {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 10;
                }

                .gt-qg-svg-layer * {
                    pointer-events: stroke;
                }

                .gt-qg-wire-hit {
                    fill: none;
                    stroke: transparent;
                    stroke-width: 24px;
                    cursor: pointer;
                }

                .gt-qg-wire {
                    fill: none;
                    stroke-width: 3px;
                    filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.5));
                    transition: stroke 0.15s ease, stroke-width 0.15s ease;
                }

                .gt-qg-wire:hover, .gt-qg-wire-hit:hover + .gt-qg-wire {
                    stroke: #ef4444 !important;
                    stroke-width: 4.5px !important;
                    cursor: pointer;
                }

                .gt-qg-wire-folder {
                    fill: none;
                    stroke: url(#gtQGFolderGrad);
                    stroke-width: 3.5px;
                    stroke-dasharray: 8, 4;
                    animation: gtQGDash 1.2s linear infinite;
                    filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
                }

                @keyframes gtQGDash {
                    to { stroke-dashoffset: -24; }
                }

                .gt-qg-live-wire {
                    fill: none;
                    stroke: #38bdf8;
                    stroke-width: 3px;
                    stroke-dasharray: 6, 6;
                    animation: gtQGDash 1s linear infinite;
                }

                .gt-qg-nodes-layer {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    pointer-events: none;
                }

                /* Node Card (Micro View) */
                .gt-qg-node {
                    position: absolute;
                    width: 220px;
                    background: rgba(15, 23, 42, 0.94);
                    border: 1px solid #1e293b;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.65);
                    cursor: default;
                    pointer-events: auto;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .gt-qg-node:hover {
                    border-color: #38bdf8;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.25);
                }

                .gt-qg-node.selected {
                    border-color: #a855f7 !important;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(168, 85, 247, 0.45) !important;
                }

                .gt-qg-node-header {
                    padding: 8px 12px;
                    border-top-left-radius: 7px;
                    border-top-right-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
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

                /* FOLDER NODE CARD (Macro View) */
                .gt-qg-folder-card {
                    position: absolute;
                    width: 260px;
                    background: rgba(15, 23, 42, 0.95);
                    border: 2px solid #f59e0b;
                    border-radius: 10px;
                    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.75), 0 0 20px rgba(245, 158, 11, 0.2);
                    cursor: default;
                    pointer-events: auto;
                    transition: all 0.2s ease;
                }

                .gt-qg-folder-card:hover {
                    border-color: #fbbf24;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 26px rgba(251, 191, 36, 0.35);
                    transform: translateY(-2px);
                }

                .gt-qg-folder-card.selected {
                    border-color: #38bdf8 !important;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 26px rgba(56, 189, 248, 0.5) !important;
                }

                .gt-qg-folder-header {
                    padding: 10px 14px;
                    background: linear-gradient(135deg, #b45309, #d97706);
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: grab;
                }

                .gt-qg-folder-header:active {
                    cursor: grabbing;
                }

                .gt-qg-folder-title {
                    font-size: 13px;
                    font-weight: 800;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gt-qg-folder-body {
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    background: #0b101b;
                }

                .gt-qg-folder-preview {
                    font-size: 11px;
                    color: #94a3b8;
                    line-height: 1.4;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 10px;
                }

                .gt-qg-folder-btn-open {
                    width: 100%;
                    padding: 7px 10px;
                    background: linear-gradient(135deg, #1e293b, #334155);
                    border: 1px solid #475569;
                    color: #38bdf8;
                    font-size: 11px;
                    font-weight: 800;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-qg-folder-btn-open:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #fff;
                }

                .gt-qg-folder-ports {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px 10px 12px;
                    background: #070a12;
                    border-top: 1px solid #1e293b;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                }

                /* Right Parameters Inspector */
                .gt-qg-inspector {
                    position: absolute;
                    top: 60px;
                    right: 18px;
                    bottom: 24px;
                    width: 280px;
                    background: rgba(15, 23, 42, 0.94);
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
                    padding: 6px 10px;
                    font-family: inherit;
                }

                .gt-qg-field-input:focus, .gt-qg-field-textarea:focus {
                    outline: none;
                    border-color: #38bdf8;
                }

                .gt-qg-hint {
                    position: absolute;
                    bottom: 24px;
                    left: 275px;
                    background: rgba(15, 23, 42, 0.9);
                    border: 1px solid #1e293b;
                    border-radius: 6px;
                    padding: 6px 14px;
                    font-size: 11px;
                    color: #94a3b8;
                    z-index: 50;
                    pointer-events: none;
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

                    <!-- Breadcrumbs -->
                    <div class="gt-qg-breadcrumb" id="gt-qg-breadcrumb">
                        <span class="gt-qg-breadcrumb-item" id="bc-root">🌐 Alur Utama (Peta Folder)</span>
                    </div>

                    <div style="width: 1px; height: 16px; background: #334155;"></div>

                    <button class="gt-qg-btn gt-qg-btn-folder" id="btn-qg-add-folder" title="Buat Folder Baru untuk Mengelompokkan Alur Cerita">
                        <span>➕ New Folder</span>
                    </button>
                    <button class="gt-qg-btn" id="btn-qg-auto-layout" title="Rapikan Tata Letak Node Secara Otomatis">
                        <span>📐 Auto-Layout</span>
                    </button>
                    <button class="gt-qg-btn" id="btn-qg-simulate" style="color: #4ade80; border-color: rgba(74, 222, 128, 0.4);" title="Uji Simulasi Interaksi Logika">
                        <span>▶ Uji Simulasi</span>
                    </button>
                    <button class="gt-qg-btn" id="btn-qg-reset-default" title="Kembalikan ke Contoh Alur Misi Default">
                        <span>🔄 Reset Logika</span>
                    </button>
                </div>

                <div class="gt-qg-topbar-right">
                    <button class="gt-qg-btn" id="btn-qg-zoom-in" title="Perbesar Graph">+</button>
                    <button class="gt-qg-btn" id="btn-qg-zoom-out" title="Perkecil Graph">−</button>
                    <button class="gt-qg-btn" id="btn-qg-zoom-reset" title="Reset Zoom &amp; Pan">100%</button>
                </div>
            </div>

            <!-- Left Sidebar (Folder Explorer + Node Palette) -->
            <div class="gt-qg-palette">
                <!-- Folder Explorer Section -->
                <div class="gt-qg-palette-header">
                    <span>📁 DAFTAR FOLDER</span>
                    <button class="gt-qg-folder-action-btn" id="btn-qg-palette-add-folder" title="Tambah Folder Baru" style="color: #f59e0b; font-weight: bold;">+ New</button>
                </div>
                <div class="gt-qg-palette-list" id="gt-qg-folder-explorer-list" style="max-height: 180px; border-bottom: 1px solid #1e293b;">
                    <!-- Rendered Folder List -->
                </div>

                <!-- Operators Palette (Micro View or Info) -->
                <div id="gt-qg-palette-operators-section" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="gt-qg-palette-header" id="gt-qg-palette-ops-header">
                        <span>⚡ OPERATOR &amp; NODE</span>
                    </div>
                    <div class="gt-qg-palette-list" id="gt-qg-palette-ops-list">
                        <!-- Rendered Operators or Macro Guide -->
                    </div>
                </div>
            </div>

            <div class="gt-qg-hint" id="gt-qg-hint">
                💡 <b>Tips:</b> Tarik kabel dari port <b>Selesai (Out)</b> ke <b>Masuk (In)</b> untuk menghubungkan alur cerita antar-folder. Klik 2x kotak folder untuk membuka isinya!
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
                            <linearGradient id="gtQGFolderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#f59e0b" />
                                <stop offset="100%" stop-color="#a855f7" />
                            </linearGradient>
                        </defs>
                        <g id="gt-qg-wires-group"></g>
                        <path id="gt-qg-live-wire" class="gt-qg-live-wire" d="" style="display: none;"></path>
                    </svg>
                    <div class="gt-qg-nodes-layer" id="gt-qg-nodes-layer"></div>
                </div>
            </div>

            <!-- Right Parameters Inspector -->
            <div class="gt-qg-inspector" id="gt-qg-inspector">
                <div class="gt-qg-inspector-header">
                    <span>⚙️ Parameters</span>
                </div>
                <div class="gt-qg-inspector-body" id="gt-qg-inspector-body">
                    <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 40px;">
                        Pilih salah satu folder atau node untuk mengubah nama atau parameter logika di sini.
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
        this.folderExplorerList = this.dom.querySelector('#gt-qg-folder-explorer-list');
        this.paletteOpsList = this.dom.querySelector('#gt-qg-palette-ops-list');
        this.paletteOpsHeader = this.dom.querySelector('#gt-qg-palette-ops-header');
        this.breadcrumbEl = this.dom.querySelector('#gt-qg-breadcrumb');
        this.hintEl = this.dom.querySelector('#gt-qg-hint');
    }

    loadData() {
        if (!this.projectId) {
            const projects = ProjectManager.getProjects();
            if (projects.length > 0) this.projectId = projects[0].id;
        }

        const questData = ProjectManager.getQuestLogic(this.projectId, this.sceneId);

        // Migrasi atau muat data folder
        if (Array.isArray(questData.folders) && questData.folders.length > 0) {
            this.folders = JSON.parse(JSON.stringify(questData.folders));
            this.folderWires = Array.isArray(questData.folderWires) ? JSON.parse(JSON.stringify(questData.folderWires)) : [];
        } else {
            // Migrasi otomatis data flat lama menjadi "New Folder 1"
            const legacyNodes = Array.isArray(questData.nodes) && questData.nodes.length > 0 ? questData.nodes : [];
            const legacyWires = Array.isArray(questData.wires) && questData.wires.length > 0 ? questData.wires : [];
            this.folders = [
                {
                    id: 'folder_default_' + Date.now().toString(36),
                    name: 'New Folder 1',
                    x: 80,
                    y: 120,
                    nodes: JSON.parse(JSON.stringify(legacyNodes)),
                    wires: JSON.parse(JSON.stringify(legacyWires))
                }
            ];
            this.folderWires = [];
        }

        // Validasi folder aktif
        if (this.currentFolderId && !this.folders.some(f => f.id === this.currentFolderId)) {
            this.currentFolderId = null;
        }

        this.syncActiveFolderData();
        this.renderAll();
        this.applyTransform();
    }

    syncActiveFolderData() {
        if (this.currentFolderId) {
            const folder = this.folders.find(f => f.id === this.currentFolderId);
            if (folder) {
                this.nodes = folder.nodes || [];
                this.wires = folder.wires || [];
            }
        }
    }

    saveData() {
        if (!this.projectId) return;

        // Sinkronisasi data folder aktif jika sedang di Micro View
        if (this.currentFolderId) {
            const folder = this.folders.find(f => f.id === this.currentFolderId);
            if (folder) {
                folder.nodes = this.nodes;
                folder.wires = this.wires;
            }
        }

        // Sediakan fallback flat nodes/wires untuk engine lama
        const firstFolder = this.folders[0];
        const flatNodes = firstFolder ? firstFolder.nodes : [];
        const flatWires = firstFolder ? firstFolder.wires : [];

        ProjectManager.saveQuestLogic(this.projectId, this.sceneId, {
            folders: this.folders,
            folderWires: this.folderWires,
            nodes: flatNodes,
            wires: flatWires
        });
    }

    renderAll() {
        this.renderBreadcrumbs();
        this.renderSidebarFolders();
        this.renderSidebarPalette();

        if (this.currentFolderId === null) {
            // MACRO VIEW (Folder Nodes & Folder Wires)
            this.hintEl.innerHTML = `💡 <b>Alur Global:</b> Tarik kabel dari port <b>Selesai (Out)</b> ke <b>Masuk (In)</b> untuk menyambungkan antar-folder. Klik 2x kotak folder untuk membuka isinya!`;
            this.renderFolderNodes();
            this.renderFolderWires();
            this.renderFolderInspector();
        } else {
            // MICRO VIEW (Detail Nodes & Logic Wires inside folder)
            const currentFolder = this.folders.find(f => f.id === this.currentFolderId);
            const folderName = currentFolder ? currentFolder.name : 'Folder';
            this.hintEl.innerHTML = `📁 <b>Di Dalam: ${folderName}</b>. Klik operator di kiri untuk menambah node, dan sambungkan logika interaksinya.`;
            this.renderNodes();
            this.renderWires();
            this.renderNodeInspector();
        }
    }

    renderBreadcrumbs() {
        if (!this.breadcrumbEl) return;
        if (this.currentFolderId === null) {
            this.breadcrumbEl.innerHTML = `
                <span class="gt-qg-breadcrumb-item" style="color: #f59e0b;">🌐 Alur Utama (Peta Folder)</span>
            `;
        } else {
            const currentFolder = this.folders.find(f => f.id === this.currentFolderId);
            const name = currentFolder ? currentFolder.name : 'Folder';
            this.breadcrumbEl.innerHTML = `
                <span class="gt-qg-breadcrumb-item" id="bc-back-macro" title="Kembali ke Alur Utama">🏠 Alur Utama</span>
                <span style="color: #64748b;">➔</span>
                <span class="gt-qg-breadcrumb-item" style="color: #38bdf8;">📁 ${name}</span>
                <button class="gt-qg-btn" id="btn-bc-back" style="padding: 2px 7px; font-size: 10px; margin-left: 6px; background: rgba(56, 189, 248, 0.15); border-color: #38bdf8; color: #38bdf8;">
                    <span>⬅ Kembali</span>
                </button>
            `;
            this.breadcrumbEl.querySelector('#bc-back-macro')?.addEventListener('click', () => this.closeFolderToMacro());
            this.breadcrumbEl.querySelector('#btn-bc-back')?.addEventListener('click', () => this.closeFolderToMacro());
        }
    }

    renderSidebarFolders() {
        if (!this.folderExplorerList) return;
        this.folderExplorerList.innerHTML = '';

        this.folders.forEach((folder, idx) => {
            const item = document.createElement('div');
            item.className = `gt-qg-folder-item ${(this.currentFolderId === folder.id || this.selectedFolderId === folder.id) ? 'active' : ''}`;
            item.setAttribute('data-folder-id', folder.id);

            const nodeCount = Array.isArray(folder.nodes) ? folder.nodes.length : 0;
            item.innerHTML = `
                <div class="gt-qg-folder-item-title" title="${folder.name} (${nodeCount} nodes)">
                    <span>📁</span>
                    <span class="gt-qg-folder-label">${folder.name}</span>
                </div>
                <div class="gt-qg-folder-item-actions">
                    <span style="font-size: 9.5px; color: #64748b; margin-right: 2px;">${nodeCount}</span>
                    <button class="gt-qg-folder-action-btn btn-rename" title="Ganti Nama">✏️</button>
                    <button class="gt-qg-folder-action-btn btn-open" title="Buka Isi Folder">🔍</button>
                    ${this.folders.length > 1 ? `<button class="gt-qg-folder-action-btn btn-del" title="Hapus Folder" style="color: #ef4444;">🗑️</button>` : ''}
                </div>
            `;

            // Rename on pencil click
            item.querySelector('.btn-rename')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.promptRenameFolder(folder.id);
            });

            // Open folder
            item.querySelector('.btn-open')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFolder(folder.id);
            });

            // Delete folder
            item.querySelector('.btn-del')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFolder(folder.id);
            });

            // Click item to select or open
            item.addEventListener('click', () => {
                if (this.currentFolderId === null) {
                    this.selectFolder(folder.id);
                } else {
                    this.openFolder(folder.id);
                }
            });

            this.folderExplorerList.appendChild(item);
        });
    }

    renderSidebarPalette() {
        if (!this.paletteOpsList) return;
        this.paletteOpsList.innerHTML = '';

        if (this.currentFolderId === null) {
            // Di Macro View: Tampilkan info & panduan alur
            this.paletteOpsHeader.innerHTML = `<span>⚡ PANDUAN ALUR CERITA</span>`;
            this.paletteOpsList.innerHTML = `
                <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; padding: 6px;">
                    <p style="margin: 0 0 8px 0; color: #f1f5f9; font-weight: 700;">🌐 Mode Peta Cerita Global</p>
                    <p style="margin: 0 0 8px 0;">Di kanvas ini, kamu mengatur urutan babak cerita lewat garis penghubung:</p>
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; padding: 8px; font-size: 10.5px; color: #fbbf24; margin-bottom: 8px;">
                        <b>1. Tarik Garis:</b> Hubungkan port <b>Selesai (Out)</b> di folder awal ke port <b>Masuk (In)</b> di folder berikutnya.
                    </div>
                    <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; padding: 8px; font-size: 10.5px; color: #38bdf8;">
                        <b>2. Buka Folder:</b> Klik 2x pada kotak folder untuk menyusun detail dialog dan misinya!
                    </div>
                </div>
            `;
        } else {
            // Di Micro View: Tampilkan Operator & Node
            const cur = this.folders.find(f => f.id === this.currentFolderId);
            this.paletteOpsHeader.innerHTML = `<span>⚡ OPERATOR &amp; NODE</span>`;
            this.paletteOpsList.innerHTML = `
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
                <div class="gt-qg-palette-item" data-type="folder_complete" title="Tandai folder selesai dan lanjut ke folder berikutnya" style="border-color: #059669; color: #34d399;">
                    <span>🏁</span> Selesai (Lanjut Folder)
                </div>
            `;

            // Bind click to add node inside folder
            this.paletteOpsList.querySelectorAll('.gt-qg-palette-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.getAttribute('data-type');
                    this.addNode(type);
                });
            });
        }
    }

    // ===============================================================
    // MACRO VIEW: RENDER FOLDER NODES & FOLDER WIRES
    // ===============================================================
    renderFolderNodes() {
        this.nodesLayer.innerHTML = '';

        this.folders.forEach(folder => {
            const card = document.createElement('div');
            card.className = `gt-qg-folder-card ${this.selectedFolderId === folder.id ? 'selected' : ''}`;
            card.id = `qg-folder-${folder.id}`;
            card.setAttribute('data-folder-id', folder.id);
            card.style.left = `${folder.x || 80}px`;
            card.style.top = `${folder.y || 120}px`;

            // Rangkum isi node di dalam folder
            const nodeCount = Array.isArray(folder.nodes) ? folder.nodes.length : 0;
            let previewText = `${nodeCount} Node Logika`;
            if (nodeCount > 0) {
                const firstType = folder.nodes[0]?.type;
                const tmpl = QUEST_NODE_TEMPLATES[firstType];
                previewText = `${nodeCount} Node: ${tmpl?.icon || '⚙️'} ${folder.nodes[0]?.title || 'Awal'}`;
                if (nodeCount > 1) previewText += ` ➔ ...`;
            }

            card.innerHTML = `
                <div class="gt-qg-folder-header" data-drag-handle="folder" title="Tahan & geser untuk memindahkan posisi folder">
                    <div class="gt-qg-folder-title">
                        <span>📁</span>
                        <span class="folder-title-text">${folder.name}</span>
                    </div>
                    <button class="gt-qg-folder-action-btn btn-card-rename" title="Ganti Nama" style="color: #fff; font-size: 12px;">✏️</button>
                </div>
                <div class="gt-qg-folder-body">
                    <div class="gt-qg-folder-preview">${previewText}</div>
                    <button class="gt-qg-folder-btn-open btn-card-open" title="Buka isi folder untuk mengedit logika internal">
                        <span>🔍 Buka Isi Folder (Klik 2x)</span>
                    </button>
                </div>
                <div class="gt-qg-folder-ports">
                    <div class="gt-qg-port-item in" title="Titik Masuk Alur Cerita">
                        <div class="gt-qg-port-dot is-in" data-folder="${folder.id}" data-fport="in" style="border-color: #38bdf8;"></div>
                        <span>Masuk (In)</span>
                    </div>
                    <div class="gt-qg-port-item out" title="Titik Selesai Alur Cerita">
                        <div class="gt-qg-port-dot is-out" data-folder="${folder.id}" data-fport="out" style="border-color: #f59e0b;"></div>
                        <span>Selesai (Out)</span>
                    </div>
                </div>
            `;

            // Event Listeners pada kartu folder
            card.addEventListener('mousedown', (e) => {
                if (e.target.closest('.gt-qg-port-dot')) return;
                this.selectFolder(folder.id);
            });

            // Double click to open folder
            card.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.openFolder(folder.id);
            });

            // Rename button on card
            card.querySelector('.btn-card-rename')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.promptRenameFolder(folder.id);
            });

            // Open button on card
            card.querySelector('.btn-card-open')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFolder(folder.id);
            });

            this.nodesLayer.appendChild(card);
        });
    }

    renderFolderWires() {
        this.wiresGroup.innerHTML = '';

        this.folderWires.forEach((wire, index) => {
            const outDot = this.dom.querySelector(`.gt-qg-port-dot.is-out[data-folder="${wire.fromFolder}"][data-fport="out"]`);
            const inDot = this.dom.querySelector(`.gt-qg-port-dot.is-in[data-folder="${wire.toFolder}"][data-fport="in"]`);

            if (!outDot || !inDot) return;

            const outRect = outDot.getBoundingClientRect();
            const inRect = inDot.getBoundingClientRect();
            const wrapRect = this.canvasWrap.getBoundingClientRect();

            const x1 = (outRect.left + outRect.width / 2 - wrapRect.left) / this.zoom;
            const y1 = (outRect.top + outRect.height / 2 - wrapRect.top) / this.zoom;
            const x2 = (inRect.left + inRect.width / 2 - wrapRect.left) / this.zoom;
            const y2 = (inRect.top + inRect.height / 2 - wrapRect.top) / this.zoom;

            const dx = Math.max(80, Math.abs(x2 - x1) * 0.55);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            // Hitbox
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('d', d);
            hitPath.setAttribute('class', 'gt-qg-wire-hit');
            hitPath.setAttribute('title', 'Klik garis untuk memutus sambungan antar-folder');

            const delHandler = (e) => {
                e.stopPropagation();
                AudioManager.playClick();
                this.folderWires.splice(index, 1);
                this.saveData();
                this.renderFolderWires();
            };
            hitPath.addEventListener('click', delHandler);

            // Wire path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', 'gt-qg-wire-folder');
            path.setAttribute('title', 'Klik garis untuk memutus sambungan antar-folder');
            path.addEventListener('click', delHandler);

            this.wiresGroup.appendChild(hitPath);
            this.wiresGroup.appendChild(path);
        });
    }

    renderFolderInspector() {
        if (!this.inspectorBody) return;
        const folder = this.folders.find(f => f.id === this.selectedFolderId);
        if (!folder) {
            this.inspectorBody.innerHTML = `
                <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 40px; line-height: 1.5;">
                    Pilih salah satu folder di kanvas atau buat folder baru dengan tombol <b>+ New Folder</b>.
                </div>
            `;
            return;
        }

        const nodeCount = Array.isArray(folder.nodes) ? folder.nodes.length : 0;
        this.inspectorBody.innerHTML = `
            <div class="gt-qg-field">
                <span class="gt-qg-field-label">Nama Folder</span>
                <input type="text" class="gt-qg-field-input" id="inp-folder-name" value="${folder.name}" />
            </div>

            <div style="font-size: 11px; color: #94a3b8; background: #090e17; border: 1px solid #1e293b; border-radius: 6px; padding: 10px; margin-top: 8px;">
                <div style="margin-bottom: 6px;">Total Node di Dalam: <b style="color: #38bdf8;">${nodeCount}</b></div>
                <div>ID Folder: <code style="font-size: 9.5px; color: #64748b;">${folder.id}</code></div>
            </div>

            <button class="gt-qg-btn gt-qg-btn-primary" id="btn-insp-open-folder" style="width: 100%; justify-content: center; padding: 8px; margin-top: 10px;">
                <span>🔍 Buka &amp; Edit Isi Folder</span>
            </button>

            ${this.folders.length > 1 ? `
            <button class="gt-qg-btn" id="btn-insp-del-folder" style="width: 100%; justify-content: center; padding: 6px; margin-top: 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                <span>🗑️ Hapus Folder Ini</span>
            </button>` : ''}
        `;

        const inpName = this.inspectorBody.querySelector('#inp-folder-name');
        if (inpName) {
            inpName.addEventListener('input', () => {
                folder.name = inpName.value;
                this.saveData();
                this.renderSidebarFolders();
                const cardTitle = this.dom.querySelector(`#qg-folder-${folder.id} .folder-title-text`);
                if (cardTitle) cardTitle.textContent = folder.name;
            });
        }

        this.inspectorBody.querySelector('#btn-insp-open-folder')?.addEventListener('click', () => {
            this.openFolder(folder.id);
        });

        this.inspectorBody.querySelector('#btn-insp-del-folder')?.addEventListener('click', () => {
            this.deleteFolder(folder.id);
        });
    }

    // ===============================================================
    // MICRO VIEW: RENDER DETAIL NODES & WIRES INSIDE FOLDER
    // ===============================================================
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
            } else if (node.type === 'folder_complete') {
                summaryText = `Lanjut ke: <b>Folder Berikutnya</b>`;
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

            // Hitbox
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('d', d);
            hitPath.setAttribute('class', 'gt-qg-wire-hit');
            hitPath.setAttribute('title', 'Klik garis untuk memutus sambungan logika');

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

            this.wiresGroup.appendChild(hitPath);
            this.wiresGroup.appendChild(path);
        });
    }

    renderNodeInspector() {
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
            `;
        } else if (node.type === 'chest_trigger') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Nama Peti</span>
                    <input type="text" class="gt-qg-field-input" id="inp-qg-chest-name" value="${node.config.chestName || 'Peti Kuno'}" />
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Hadiah Koin</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-chest-coins" value="${node.config.rewardCoins || 5}" min="1" max="99" />
                </div>
            `;
        } else if (node.type === 'give_reward') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Tipe Hadiah</span>
                    <select class="gt-qg-field-input" id="inp-qg-reward-type">
                        <option value="hp" ${node.config.rewardType === 'hp' ? 'selected' : ''}>Pulihkan Darah (HP)</option>
                        <option value="coins" ${node.config.rewardType === 'coins' ? 'selected' : ''}>Bonus Koin Emas</option>
                    </select>
                </div>
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Jumlah Bonus</span>
                    <input type="number" class="gt-qg-field-input" id="inp-qg-reward-amount" value="${node.config.amount || 25}" min="1" max="100" />
                </div>
            `;
        } else if (node.type === 'folder_complete') {
            fieldsHTML += `
                <div class="gt-qg-field">
                    <span class="gt-qg-field-label">Pesan Banner Selesai</span>
                    <input type="text" class="gt-qg-field-input" id="inp-qg-complete-msg" value="${node.config.bannerMsg || '🎉 Babak misi selesai! Lanjut ke babak berikutnya.'}" />
                </div>
            `;
        }

        fieldsHTML += `
            <button class="gt-qg-btn" id="btn-qg-delete-node" style="width: 100%; justify-content: center; padding: 7px; margin-top: 10px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
                <span>🗑️ Hapus Node Ini</span>
            </button>
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

        const inpCompMsg = this.inspectorBody.querySelector('#inp-qg-complete-msg');
        if (inpCompMsg) {
            inpCompMsg.addEventListener('input', () => {
                node.config.bannerMsg = inpCompMsg.value;
                this.saveData();
            });
        }

        const btnDelete = this.inspectorBody.querySelector('#btn-qg-delete-node');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                this.deleteNode(node.id);
            });
        }
    }

    // ===============================================================
    // FOLDER MANAGEMENT METHODS
    // ===============================================================
    addNewFolder(customName = null) {
        const count = this.folders.length + 1;
        const folderName = customName || `New Folder ${count}`;
        const newFolderId = `folder_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 3)}`;

        // Penempatan otomatis di samping folder terakhir
        const lastFolder = this.folders[this.folders.length - 1];
        const posX = lastFolder ? (lastFolder.x + 320) : 80;
        const posY = lastFolder ? lastFolder.y : 120;

        const newFolder = {
            id: newFolderId,
            name: folderName,
            x: posX,
            y: posY,
            nodes: [
                {
                    id: `node_npc_${Date.now().toString(36)}`,
                    type: 'npc_trigger',
                    title: 'Bicara dengan Karakter',
                    x: 60,
                    y: 120,
                    config: {
                        speakerName: 'Karakter',
                        avatar: '🧙',
                        promptText: 'Tekan E untuk bicara'
                    }
                },
                {
                    id: `node_dlg_${Date.now().toString(36)}`,
                    type: 'dialogue',
                    title: 'Pesan Dialog',
                    x: 340,
                    y: 100,
                    config: {
                        speakerName: 'Karakter',
                        lines: ['Halo! Selesaikan tugas di folder ini.']
                    }
                }
            ],
            wires: []
        };

        this.folders.push(newFolder);
        this.selectedFolderId = newFolderId;
        AudioManager.playClick();
        this.saveData();
        this.renderAll();
    }

    promptRenameFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;
        const newName = prompt(`Ubah nama folder:`, folder.name);
        if (newName !== null && newName.trim().length > 0) {
            folder.name = newName.trim();
            this.saveData();
            this.renderAll();
        }
    }

    deleteFolder(folderId) {
        if (this.folders.length <= 1) {
            alert('Minimal harus ada 1 folder dalam alur logika!');
            return;
        }
        if (!confirm(`Hapus folder ini beserta seluruh node di dalamnya?`)) return;

        this.folders = this.folders.filter(f => f.id !== folderId);
        this.folderWires = this.folderWires.filter(w => w.fromFolder !== folderId && w.toFolder !== folderId);
        if (this.currentFolderId === folderId) {
            this.currentFolderId = null;
        }
        if (this.selectedFolderId === folderId) {
            this.selectedFolderId = this.folders[0]?.id || null;
        }
        AudioManager.playClick();
        this.saveData();
        this.renderAll();
    }

    selectFolder(folderId) {
        this.selectedFolderId = folderId;
        this.dom.querySelectorAll('.gt-qg-folder-card').forEach(c => {
            c.classList.toggle('selected', c.getAttribute('data-folder-id') === folderId);
        });
        this.renderSidebarFolders();
        this.renderFolderInspector();
    }

    openFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;
        this.currentFolderId = folderId;
        this.pan = { x: 40, y: 40 };
        this.zoom = 1;
        this.syncActiveFolderData();
        AudioManager.playClick();
        this.renderAll();
        this.applyTransform();
    }

    closeFolderToMacro() {
        if (this.currentFolderId) {
            this.saveData();
        }
        this.currentFolderId = null;
        this.pan = { x: 40, y: 40 };
        this.zoom = 1;
        AudioManager.playClick();
        this.renderAll();
        this.applyTransform();
    }

    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        this.dom.querySelectorAll('.gt-qg-node').forEach(n => {
            n.classList.toggle('selected', n.getAttribute('data-node-id') === nodeId);
        });
        this.renderNodeInspector();
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

    // ===============================================================
    // EVENTS & USER INTERACTIONS
    // ===============================================================
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

        // Tombol Tambah Folder
        this.dom.querySelector('#btn-qg-add-folder')?.addEventListener('click', () => this.addNewFolder());
        this.dom.querySelector('#btn-qg-palette-add-folder')?.addEventListener('click', () => this.addNewFolder());

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
                if (confirm('Reset logika misi ke contoh default New Folder 1 & Kapten Chen?')) {
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

        // Zoom & Pan Buttons
        this.dom.querySelector('#btn-qg-zoom-in')?.addEventListener('click', () => {
            this.zoom = Math.min(2.0, this.zoom + 0.15);
            this.applyTransform();
        });
        this.dom.querySelector('#btn-qg-zoom-out')?.addEventListener('click', () => {
            this.zoom = Math.max(0.4, this.zoom - 0.15);
            this.applyTransform();
        });
        this.dom.querySelector('#btn-qg-zoom-reset')?.addEventListener('click', () => {
            this.zoom = 1;
            this.pan = { x: 30, y: 30 };
            this.applyTransform();
        });

        // Mouse Down Handler (Port click, Drag Node/Folder, Canvas Pan)
        this.dom.addEventListener('mousedown', (e) => {
            const dragNodeHandle = e.target.closest('[data-drag-handle="true"]');
            const dragFolderHandle = e.target.closest('[data-drag-handle="folder"]');
            const portDot = e.target.closest('.gt-qg-port-dot');

            // 1. INTERAKSI PORT (KABEL)
            if (portDot) {
                e.preventDefault();
                e.stopPropagation();

                // Kasus Folder Port (Macro View)
                const isFolderPort = portDot.hasAttribute('data-folder');
                if (isFolderPort) {
                    const fId = portDot.getAttribute('data-folder');
                    const fPort = portDot.getAttribute('data-fport'); // 'in' | 'out'

                    // Jika klik port IN setelah klik port OUT
                    if (fPort === 'in' && this.selectedSourceFolderPort) {
                        if (this.selectedSourceFolderPort.folderId !== fId) {
                            // Hapus kabel lama jika ada
                            this.folderWires = this.folderWires.filter(w => !(w.fromFolder === this.selectedSourceFolderPort.folderId && w.toFolder === fId));
                            this.folderWires.push({
                                fromFolder: this.selectedSourceFolderPort.folderId,
                                toFolder: fId
                            });
                            AudioManager.playSuccess();
                            this.saveData();
                            this.renderFolderWires();
                        }
                        this.clearPortSelection();
                        return;
                    }

                    // Jika klik port OUT
                    if (fPort === 'out') {
                        this.selectSourceFolderPort(fId, portDot);
                        const rect = portDot.getBoundingClientRect();
                        const wrapRect = this.canvasWrap.getBoundingClientRect();
                        const startX = (rect.left + rect.width / 2 - wrapRect.left) / this.zoom;
                        const startY = (rect.top + rect.height / 2 - wrapRect.top) / this.zoom;

                        this.wiring = {
                            type: 'folder',
                            fromFolderId: fId,
                            startX,
                            startY,
                            currentX: startX,
                            currentY: startY
                        };
                        this.liveWirePath.style.display = 'block';
                        return;
                    }
                }

                // Kasus Node Port (Micro View)
                const portNodeId = portDot.getAttribute('data-node');
                const portId = portDot.getAttribute('data-port');

                if (portDot.classList.contains('is-in') && this.selectedSourcePort) {
                    if (this.selectedSourcePort.nodeId !== portNodeId) {
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

                if (portDot.classList.contains('is-out')) {
                    this.selectSourcePort(portNodeId, portId, portDot);
                    const rect = portDot.getBoundingClientRect();
                    const wrapRect = this.canvasWrap.getBoundingClientRect();
                    const startX = (rect.left + rect.width / 2 - wrapRect.left) / this.zoom;
                    const startY = (rect.top + rect.height / 2 - wrapRect.top) / this.zoom;

                    this.wiring = {
                        type: 'node',
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

            // Bersihkan seleksi port jika klik sembarang
            if (this.selectedSourcePort || this.selectedSourceFolderPort) {
                if (!e.target.closest('.gt-qg-port-dot')) {
                    this.clearPortSelection();
                }
            }

            // 2. DRAGGING FOLDER CARD (Macro View)
            if (dragFolderHandle) {
                e.preventDefault();
                const folderCard = dragFolderHandle.closest('.gt-qg-folder-card');
                const fId = folderCard.getAttribute('data-folder-id');
                this.draggedFolderId = fId;

                const folder = this.folders.find(f => f.id === fId);
                if (folder) {
                    this.dragOffset = {
                        x: (e.clientX / this.zoom) - (folder.x || 80),
                        y: (e.clientY / this.zoom) - (folder.y || 120)
                    };
                }
                return;
            }

            // 3. DRAGGING NODE CARD (Micro View)
            if (dragNodeHandle) {
                e.preventDefault();
                const nodeCard = dragNodeHandle.closest('.gt-qg-node');
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

            // 4. PANNING KANVAS
            if (e.target.closest('.gt-qg-palette') || e.target.closest('.gt-qg-inspector') || e.target.closest('.gt-qg-topbar')) return;
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        });

        // Mouse Move Handler
        window.addEventListener('mousemove', (e) => {
            // Drag Live Wire
            if (this.wiring) {
                const wrapRect = this.canvasWrap.getBoundingClientRect();
                const curX = (e.clientX - wrapRect.left) / this.zoom;
                const curY = (e.clientY - wrapRect.top) / this.zoom;

                const dx = Math.max(60, Math.abs(curX - this.wiring.startX) * 0.55);
                const d = `M ${this.wiring.startX} ${this.wiring.startY} C ${this.wiring.startX + dx} ${this.wiring.startY}, ${curX - dx} ${curY}, ${curX} ${curY}`;
                this.liveWirePath.setAttribute('d', d);
                return;
            }

            // Drag Folder Card
            if (this.draggedFolderId) {
                const folder = this.folders.find(f => f.id === this.draggedFolderId);
                if (folder) {
                    folder.x = Math.max(20, Math.round(e.clientX / this.zoom - this.dragOffset.x));
                    folder.y = Math.max(20, Math.round(e.clientY / this.zoom - this.dragOffset.y));
                    const card = this.dom.querySelector(`#qg-folder-${folder.id}`);
                    if (card) {
                        card.style.left = `${folder.x}px`;
                        card.style.top = `${folder.y}px`;
                    }
                    this.renderFolderWires();
                }
                return;
            }

            // Drag Node Card
            if (this.draggedNodeId) {
                const node = this.nodes.find(n => n.id === this.draggedNodeId);
                if (node) {
                    node.x = Math.max(20, Math.round(e.clientX / this.zoom - this.dragOffset.x));
                    node.y = Math.max(20, Math.round(e.clientY / this.zoom - this.dragOffset.y));
                    const card = this.dom.querySelector(`#qg-node-${node.id}`);
                    if (card) {
                        card.style.left = `${node.x}px`;
                        card.style.top = `${node.y}px`;
                    }
                    this.renderWires();
                }
                return;
            }

            // Panning Kanvas
            if (this.isPanning) {
                this.pan.x = e.clientX - this.panStart.x;
                this.pan.y = e.clientY - this.panStart.y;
                this.applyTransform();
            }
        });

        // Mouse Up Handler
        window.addEventListener('mouseup', (e) => {
            if (this.wiring) {
                const portDot = e.target.closest('.gt-qg-port-dot');
                if (portDot && portDot.classList.contains('is-in')) {
                    if (this.wiring.type === 'folder' && portDot.hasAttribute('data-folder')) {
                        const targetFolderId = portDot.getAttribute('data-folder');
                        if (targetFolderId !== this.wiring.fromFolderId) {
                            this.folderWires = this.folderWires.filter(w => !(w.fromFolder === this.wiring.fromFolderId && w.toFolder === targetFolderId));
                            this.folderWires.push({
                                fromFolder: this.wiring.fromFolderId,
                                toFolder: targetFolderId
                            });
                            AudioManager.playSuccess();
                            this.saveData();
                            this.renderFolderWires();
                        }
                    } else if (this.wiring.type === 'node' && portDot.hasAttribute('data-node')) {
                        const targetNodeId = portDot.getAttribute('data-node');
                        const targetPortId = portDot.getAttribute('data-port');
                        if (targetNodeId !== this.wiring.fromNodeId) {
                            this.wires = this.wires.filter(w => !(w.fromNode === this.wiring.fromNodeId && w.fromPort === this.wiring.fromPortId));
                            this.wires.push({
                                fromNode: this.wiring.fromNodeId,
                                fromPort: this.wiring.fromPortId,
                                toNode: targetNodeId,
                                toPort: targetPortId
                            });
                            AudioManager.playSuccess();
                            this.saveData();
                            this.renderWires();
                        }
                    }
                }
                this.wiring = null;
                this.liveWirePath.style.display = 'none';
                this.clearPortSelection();
            }

            if (this.draggedFolderId || this.draggedNodeId) {
                this.draggedFolderId = null;
                this.draggedNodeId = null;
                this.saveData();
            }

            this.isPanning = false;
        });

        // Wheel Zoom
        this.dom.addEventListener('wheel', (e) => {
            if (e.target.closest('.gt-qg-palette') || e.target.closest('.gt-qg-inspector')) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            this.zoom = Math.min(2.0, Math.max(0.4, this.zoom + delta));
            this.applyTransform();
        }, { passive: false });
    }

    selectSourcePort(nodeId, portId, portEl) {
        this.clearPortSelection();
        this.selectedSourcePort = { nodeId, portId };
        portEl.classList.add('is-source-active');
    }

    selectSourceFolderPort(folderId, portEl) {
        this.clearPortSelection();
        this.selectedSourceFolderPort = { folderId };
        portEl.classList.add('is-source-active');
    }

    clearPortSelection() {
        this.selectedSourcePort = null;
        this.selectedSourceFolderPort = null;
        this.dom.querySelectorAll('.gt-qg-port-dot').forEach(d => {
            d.classList.remove('is-source-active');
        });
    }

    applyTransform() {
        if (!this.canvasWrap) return;
        this.canvasWrap.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
        const btnReset = this.dom.querySelector('#btn-qg-zoom-reset');
        if (btnReset) btnReset.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    autoLayout() {
        if (this.currentFolderId === null) {
            // Auto layout folder cards
            this.folders.forEach((f, idx) => {
                f.x = 80 + idx * 340;
                f.y = 120 + (idx % 2 === 1 ? 50 : 0);
            });
            this.pan = { x: 40, y: 40 };
            this.zoom = 1;
            this.applyTransform();
            this.saveData();
            this.renderFolderNodes();
            this.renderFolderWires();
        } else {
            // Auto layout internal nodes
            this.nodes.forEach((n, idx) => {
                n.x = 60 + idx * 280;
                n.y = 100 + (idx % 2 === 1 ? 60 : 0);
            });
            this.pan = { x: 30, y: 30 };
            this.zoom = 1;
            this.applyTransform();
            this.saveData();
            this.renderNodes();
            this.renderWires();
        }
    }

    // Modal Simulasi Interaktif
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
        const targetNodes = this.currentFolderId ? this.nodes : (this.folders[0]?.nodes || []);
        const targetWires = this.currentFolderId ? this.wires : (this.folders[0]?.wires || []);

        const updateSim = () => {
            const condNode = targetNodes.find(n => n.type === 'condition_coins');
            const reqCoins = (condNode && condNode.config.reqCoins) || 3;
            const isPass = simCoins >= reqCoins;

            const wiresFromCond = targetWires.filter(w => w.fromNode === (condNode?.id));
            const passWire = wiresFromCond.find(w => w.fromPort === 'pass');
            const failWire = wiresFromCond.find(w => w.fromPort === 'fail');

            const passTarget = passWire ? targetNodes.find(n => n.id === passWire.toNode) : null;
            const failTarget = failWire ? targetNodes.find(n => n.id === failWire.toNode) : null;

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
                        🎉 Portal / Babak berikutnya akan TERBUKA saat pemain bicara dengan NPC!
                    </div>
                ` : `
                    <div style="margin-top: 8px; font-size: 11px; color: #fca5a5;">
                        🔒 Misi belum tercapai dan NPC meminta koin lagi.
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

        simDialog.querySelector('#btn-close-sim')?.addEventListener('click', () => simDialog.remove());
        simDialog.querySelector('#btn-done-sim')?.addEventListener('click', () => simDialog.remove());
        simDialog.querySelector('#btn-sim-dec')?.addEventListener('click', () => {
            simCoins = Math.max(0, simCoins - 1);
            AudioManager.playClick();
            updateSim();
        });
        simDialog.querySelector('#btn-sim-inc')?.addEventListener('click', () => {
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
