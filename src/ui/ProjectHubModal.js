import { AudioManager } from '../utils/AudioManager.js';
import { ExportGameModal } from './ExportGameModal.js';
import { SceneBuilderModal } from './SceneBuilderModal.js';
import { ProjectManager } from '../utils/ProjectManager.js';

export class ProjectHubModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.currentTab = 'projects'; // 'projects' | 'templates' | 'tutorials' | 'learn'
        this.selectedProjectId = null; // null = Project List, string = Scene Manager for that Project
        this.searchQuery = '';
        this.createDOM();
    }

    createDOM() {
        const oldEl = document.getElementById('gt-unity-hub-overlay');
        if (oldEl) oldEl.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'gt-unity-hub-overlay';
        this.overlay.className = 'gt-uhub-overlay hidden';

        this.overlay.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

                .gt-uhub-overlay {
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
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 24px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-uhub-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                /* Unity Hub Window Container */
                .gt-uhub-window {
                    position: relative;
                    width: min(1080px, 96vw);
                    height: min(680px, 92vh);
                    background: #181818;
                    border: 1px solid #333333;
                    border-radius: 12px;
                    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: uhubEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes uhubEnter {
                    0% { transform: scale(0.96); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                /* Title Bar (Mac/Windows style) */
                .gt-uhub-topbar {
                    height: 44px;
                    background: #1e1e1e;
                    border-bottom: 1px solid #2d2d2d;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 16px;
                    flex-shrink: 0;
                }

                .gt-uhub-topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gt-uhub-logo {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: 0.3px;
                }

                .gt-uhub-logo-icon {
                    width: 20px;
                    height: 20px;
                    background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    color: #fff;
                    font-weight: 900;
                }

                .gt-uhub-logo-badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    background: rgba(56, 189, 248, 0.15);
                    color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.3);
                    border-radius: 4px;
                }

                .gt-uhub-topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .gt-uhub-user-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 10px;
                    background: #282828;
                    border-radius: 20px;
                    border: 1px solid #383838;
                }

                .gt-uhub-avatar {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: #0284c7;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 800;
                    color: #fff;
                }

                .gt-uhub-username {
                    font-size: 12px;
                    color: #e0e0e0;
                    font-weight: 500;
                }

                .gt-uhub-close-btn {
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

                .gt-uhub-close-btn:hover {
                    background: #e11d48;
                    color: #ffffff;
                }


                /* Main Body (Sidebar + Content) */
                .gt-uhub-main {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                }

                /* Sidebar */
                .gt-uhub-sidebar {
                    width: 210px;
                    background: #1c1c1c;
                    border-right: 1px solid #2b2b2b;
                    padding: 16px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .gt-uhub-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 9px 14px;
                    border-radius: 6px;
                    color: #a3a3a3;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    border: 1px solid transparent;
                }

                .gt-uhub-nav-item:hover {
                    background: #262626;
                    color: #e5e5e5;
                }

                .gt-uhub-nav-item.active {
                    background: #2b2b2b;
                    color: #ffffff;
                    font-weight: 600;
                }

                .gt-uhub-nav-icon {
                    font-size: 15px;
                    width: 18px;
                    text-align: center;
                }

                .gt-uhub-sidebar-divider {
                    height: 1px;
                    background: #2b2b2b;
                    margin: 12px 6px;
                }

                .gt-uhub-sidebar-footer {
                    margin-top: auto;
                    padding: 12px 10px;
                    background: #222222;
                    border-radius: 8px;
                    border: 1px solid #2e2e2e;
                    font-size: 11px;
                    color: #94a3b8;
                    line-height: 1.4;
                }

                /* Content Area */
                .gt-uhub-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    background: #141414;
                }

                .gt-uhub-content-header {
                    padding: 20px 28px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    border-bottom: 1px solid #242424;
                }

                .gt-uhub-content-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }

                .gt-uhub-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .gt-uhub-search-box {
                    position: relative;
                    width: 220px;
                }

                .gt-uhub-search-input {
                    width: 100%;
                    height: 34px;
                    background: #222222;
                    border: 1px solid #333333;
                    border-radius: 6px;
                    padding: 0 10px 0 32px;
                    font-size: 12.5px;
                    color: #ffffff;
                    outline: none;
                    box-sizing: border-box;
                    transition: border-color 0.15s;
                }

                .gt-uhub-search-input:focus {
                    border-color: #0284c7;
                }

                .gt-uhub-search-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 13px;
                    color: #737373;
                }

                .gt-uhub-btn-primary {
                    height: 34px;
                    padding: 0 18px;
                    background: #0284c7;
                    border: none;
                    border-radius: 6px;
                    color: #ffffff;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-uhub-btn-primary:hover {
                    background: #0ea5e9;
                    box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
                }

                /* Table List View (Like Unity Hub Projects) */
                .gt-uhub-table-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 28px;
                }

                .gt-uhub-table-header {
                    display: grid;
                    grid-template-columns: 2.2fr 1.2fr 1.2fr 1.4fr;
                    padding: 12px 14px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #737373;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #222222;
                }

                .gt-uhub-table-header.gt-uhub-cols-3 {
                    grid-template-columns: 3fr 1.2fr 1.6fr;
                }

                .gt-uhub-row {
                    display: grid;
                    grid-template-columns: 2.2fr 1.2fr 1.2fr 1.4fr;
                    align-items: center;
                    padding: 14px;
                    border-bottom: 1px solid #202020;
                    border-radius: 6px;
                    transition: background 0.15s ease;
                }

                .gt-uhub-row.gt-uhub-cols-3 {
                    grid-template-columns: 2.6fr 1.2fr 1.8fr;
                }

                .gt-uhub-row:hover {
                    background: #1e1e1e;
                }

                .gt-uhub-col-name {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .gt-uhub-project-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #f5f5f5;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gt-uhub-project-path {
                    font-size: 11px;
                    color: #666666;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-uhub-badge-platform {
                    font-size: 11.5px;
                    color: #a3a3a3;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-uhub-col-date {
                    font-size: 12px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .gt-uhub-badge-tag {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .gt-tag-sandbox {
                    background: rgba(2, 132, 199, 0.18);
                    color: #38bdf8;
                    border: 1px solid rgba(2, 132, 199, 0.35);
                }

                .gt-tag-tutorial {
                    background: rgba(16, 185, 129, 0.15);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .gt-tag-sample {
                    background: rgba(168, 85, 247, 0.15);
                    color: #c084fc;
                    border: 1px solid rgba(168, 85, 247, 0.3);
                }

                .gt-uhub-back-btn {
                    height: 32px;
                    padding: 0 12px;
                    background: #202020;
                    border: 1px solid #383838;
                    border-radius: 6px;
                    color: #94a3b8;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-uhub-back-btn:hover {
                    background: #2b2b2b;
                    color: #38bdf8;
                    border-color: #0284c7;
                }

                .gt-badge-count {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 700;
                    background: rgba(56, 189, 248, 0.12);
                    color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.3);
                }

                .gt-badge-start-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    background: rgba(34, 197, 94, 0.18);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.35);
                    margin-left: 6px;
                }

                .gt-badge-next {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    color: #94a3b8;
                    font-family: 'JetBrains Mono', monospace;
                }

                .gt-badge-final {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #eab308;
                }

                .gt-uhub-col-action {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }

                /* Pure CSS Folder Icon */
                .css-folder-icon {
                    display: inline-block;
                    position: relative;
                    width: 14px;
                    height: 10px;
                    background-color: currentColor;
                    border-radius: 0 2px 2px 2px;
                    flex-shrink: 0;
                    vertical-align: middle;
                    margin-right: 4px;
                    transition: transform 0.15s ease;
                }

                .css-folder-icon::before {
                    content: '';
                    position: absolute;
                    bottom: 100%;
                    left: 0;
                    width: 6px;
                    height: 2.5px;
                    background-color: currentColor;
                    border-radius: 1.5px 1.5px 0 0;
                }

                .css-folder-icon::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.28);
                    border-radius: 1px 2px 2px 2px;
                }

                .gt-uhub-btn-open {
                    padding: 6px 14px;
                    background: #1e1e24;
                    border: 1px solid #32323f;
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    white-space: nowrap;
                    transition: all 0.15s ease;
                }

                .gt-uhub-btn-open:hover {
                    background: #2a2a38;
                    border-color: #4b4b5e;
                    color: #ffffff;
                }

                .btn-open-project {
                    background: rgba(14, 165, 233, 0.12);
                    border: 1px solid rgba(14, 165, 233, 0.35);
                    color: #38bdf8;
                }

                .btn-open-project:hover {
                    background: #0284c7;
                    border-color: #0284c7;
                    color: #ffffff;
                    box-shadow: 0 2px 10px rgba(2, 132, 199, 0.35);
                }

                .btn-open-project svg {
                    transition: transform 0.15s ease;
                }

                .btn-open-project:hover svg {
                    transform: translateY(-1px);
                }

                .btn-delete-project, .btn-delete-scene {
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    color: #f87171;
                    border-radius: 6px;
                    padding: 6px 10px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }

                .btn-delete-project:hover, .btn-delete-scene:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                    color: #ffffff;
                    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.4);
                }

                .btn-delete-project svg, .btn-delete-scene svg {
                    transition: transform 0.15s ease;
                }

                .btn-delete-project:hover svg, .btn-delete-scene:hover svg {
                    transform: scale(1.08);
                }

                .gt-btn-icon-subtle {
                    width: 34px;
                    height: 34px;
                    padding: 0;
                    background: #1e1e24;
                    border: 1px solid #32323f;
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 19px;
                    line-height: 1;
                    font-weight: 500;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }

                .gt-btn-icon-subtle:hover {
                    background: #2a2a38;
                    border-color: #4b4b5e;
                    color: #ffffff;
                }

                /* Templates Grid View */
                .gt-uhub-templates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                    padding: 16px 28px;
                }

                .gt-uhub-template-card {
                    background: #1c1c1c;
                    border: 1px solid #2b2b2b;
                    border-radius: 8px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    transition: all 0.2s ease;
                }

                .gt-uhub-template-card:hover {
                    border-color: #0284c7;
                    background: #222222;
                    transform: translateY(-2px);
                }

                .gt-uhub-card-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-uhub-card-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    background: #262626;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .gt-uhub-card-title {
                    font-size: 14.5px;
                    font-weight: 600;
                    color: #ffffff;
                }

                .gt-uhub-card-desc {
                    font-size: 12px;
                    color: #8c8c8c;
                    line-height: 1.45;
                    flex: 1;
                }

                /* New Project Creation Wizard Modal (Nested) */
                .gt-uhub-wizard-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    padding: 20px;
                }

                .gt-uhub-wizard-card {
                    width: min(520px, 90%);
                    background: #202020;
                    border: 1px solid #383838;
                    border-radius: 10px;
                    padding: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.8);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .gt-uhub-wizard-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }

                .gt-uhub-wizard-desc {
                    font-size: 13px;
                    color: #a3a3a3;
                    line-height: 1.45;
                }

                .gt-uhub-wizard-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 8px;
                }

                .gt-uhub-btn-cancel {
                    padding: 8px 16px;
                    background: transparent;
                    border: 1px solid #444444;
                    color: #cccccc;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                }

                .gt-uhub-btn-cancel:hover {
                    background: #2e2e2e;
                }
            </style>

            <div class="gt-uhub-window">
                <!-- Topbar Window -->
                <div class="gt-uhub-topbar">
                    <div class="gt-uhub-topbar-left">
                        <div class="gt-uhub-logo">
                            <div class="gt-uhub-logo-icon">▲</div>
                            <span>Projects</span>
                        </div>
                    </div>
                    <div class="gt-uhub-topbar-right">
                        <button class="gt-uhub-close-btn" id="gt-uhub-close-btn" title="Tutup Hub (ESC)">✕</button>
                    </div>
                </div>


                <!-- Main Layout (Sidebar + Content) -->
                <div class="gt-uhub-main">
                    <!-- Left Sidebar -->
                    <div class="gt-uhub-sidebar">
                        <div class="gt-uhub-nav-item active" data-tab="projects">
                            <span>Projects</span>
                        </div>

                    </div>

                    <!-- Right Content Area -->
                    <div class="gt-uhub-content" id="gt-uhub-content-container">
                        <!-- Konten akan dirender secara dinamis oleh JavaScript -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Bind Window Close Event
        this.overlay.querySelector('#gt-uhub-close-btn').addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        // Bind Sidebar Tab Navigation
        this.overlay.querySelectorAll('.gt-uhub-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.overlay.querySelectorAll('.gt-uhub-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentTab = item.getAttribute('data-tab');
                this.renderContent();
            });
        });


        // Render initial tab content
        this.renderContent();
    }

    renderContent() {
        const container = this.overlay.querySelector('#gt-uhub-content-container');
        if (!container) return;

        if (this.currentTab === 'projects') {
            this.renderProjectsTab(container);
        }
    }

    renderProjectsTab(container) {
        if (!this.selectedProjectId) {
            this.renderProjectsList(container);
        } else {
            this.renderProjectDetailScenes(container, this.selectedProjectId);
        }
    }

    renderProjectsList(container) {
        const projects = ProjectManager.getProjects();

        const formatDate = (proj) => {
            let ts = proj.createdAt;
            if (!ts && proj.id && proj.id.startsWith('proj_')) {
                const parts = proj.id.split('_');
                const parsed = parseInt(parts[1], 10);
                if (!isNaN(parsed) && parsed > 1000000000000) {
                    ts = parsed;
                }
            }
            if (!ts) ts = Date.now();
            try {
                const d = new Date(ts);
                const dateStr = d.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                const timeStr = d.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `${dateStr}, ${timeStr}`;
            } catch {
                return 'Hari ini';
            }
        };

        const projectRowsHTML = projects.map((proj) => {
            const scenesCount = (proj.scenes || []).length;
            const startScene = (proj.scenes || []).find(s => s.id === proj.startingSceneId) || (proj.scenes || [])[0];
            const startSceneName = startScene ? startScene.name : 'Belum ada level';

            return `
                <div class="gt-uhub-row gt-uhub-cols-3" data-name="${(proj.name || '').toLowerCase()}">
                    <div class="gt-uhub-col-name">
                        <span class="gt-uhub-project-name">
                            ${proj.name || 'Project Tanpa Judul'}
                        </span>

                    </div>
                    <div class="gt-uhub-col-date">
                        ${formatDate(proj)}
                    </div>
                    <div class="gt-uhub-col-action" style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                        <button class="gt-uhub-btn-open btn-open-project" data-id="${proj.id}" title="Buka Project" style="padding: 6px 10px;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" style="width: 16px; height: 16px; flex-shrink: 0; display: block;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                            </svg>
                        </button>
                        <button class="gt-uhub-btn-open btn-play-project" data-id="${proj.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 12px; height: 12px; flex-shrink: 0; display: block;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                            <span>Play</span>
                        </button>
                        <button class="btn-delete-project" data-id="${proj.id}" title="Hapus Project">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" style="width: 15px; height: 15px; flex-shrink: 0; display: block;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <div>
                    <h1 class="gt-uhub-content-title">Projects</h1>
                </div>
                <div class="gt-uhub-header-actions">
                    <div class="gt-uhub-search-box">
                        <span class="gt-uhub-search-icon">🔍</span>
                        <input type="text" class="gt-uhub-search-input" id="gt-uhub-search" placeholder="Search projects..." value="${this.searchQuery}" />
                    </div>
                    <button class="gt-uhub-btn-primary" id="gt-uhub-btn-new-project">
                        <span>+</span> Buat Project Baru
                    </button>
                </div>
            </div>

            <div class="gt-uhub-table-container">
                <div class="gt-uhub-table-header gt-uhub-cols-3">
                    <div>Project Name</div>
                    <div>Date Created</div>
                    <div style="text-align: right;">Action</div>
                </div>

                ${projectRowsHTML || `
                    <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 13px;">
                        Belum ada project game. Klik tombol <strong>+ Buat Project Baru</strong> untuk mulai membuat game!
                    </div>
                `}
            </div>
        `;

        // Search filter
        const searchInput = container.querySelector('#gt-uhub-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                container.querySelectorAll('.gt-uhub-row').forEach(row => {
                    const name = row.getAttribute('data-name') || '';
                    row.style.display = name.includes(this.searchQuery) ? 'grid' : 'none';
                });
            });
        }

        // Buka Project (Drilldown)
        container.querySelectorAll('.btn-open-project').forEach(btn => {
            btn.addEventListener('click', () => {
                const projId = btn.getAttribute('data-id');
                AudioManager.playClick();
                this.selectedProjectId = projId;
                this.renderContent();
            });
        });

        // Mainkan Project langsung
        container.querySelectorAll('.btn-play-project').forEach(btn => {
            btn.addEventListener('click', () => {
                const projId = btn.getAttribute('data-id');
                const proj = ProjectManager.getProject(projId);
                if (proj) this.playProject(proj);
            });
        });

        // Hapus Project
        container.querySelectorAll('.btn-delete-project').forEach(btn => {
            btn.addEventListener('click', () => {
                const projId = btn.getAttribute('data-id');
                const proj = ProjectManager.getProject(projId);
                const pName = proj ? proj.name : 'project ini';
                if (confirm(`Yakin ingin menghapus ${pName}? Semua scene di dalamnya akan ikut terhapus.`)) {
                    ProjectManager.deleteProject(projId);
                    AudioManager.playClick();
                    this.renderContent();
                }
            });
        });

        // Buat Project Baru Dialog
        const btnNewProj = container.querySelector('#gt-uhub-btn-new-project');
        if (btnNewProj) {
            btnNewProj.addEventListener('click', () => {
                this.showCreateProjectDialog();
            });
        }
    }

    renderProjectDetailScenes(container, projectId) {
        const project = ProjectManager.getProject(projectId);
        if (!project) {
            this.selectedProjectId = null;
            this.renderProjectsList(container);
            return;
        }

        const biomeIcons = {
            desert: '🏜️ Gurun',
            snow: '❄️ Salju',
            dirt: '🌲 Hutan',
            cave: '🌋 Gua',
            hongkong: '🏙️ Hong Kong (Parallax)'
        };

        const sceneRowsHTML = (project.scenes || []).map((scene, idx) => {
            const isStart = (scene.id === project.startingSceneId) || (!project.startingSceneId && idx === 0);
            const biomeLabel = biomeIcons[scene.biome] || '🌍 Kustom';

            return `
                <div class="gt-uhub-row" data-name="${(scene.name || '').toLowerCase()}" style="display: flex; align-items: center; justify-content: space-between; padding: 13px 20px; border-bottom: 1px solid #27272a; gap: 16px; transition: background 0.15s ease;">
                    <!-- Kiri: Nomor, Nama Level & Info -->
                    <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
                        <span style="font-size: 12px; font-weight: 800; color: #38bdf8; font-family: 'JetBrains Mono', monospace; background: rgba(56, 189, 248, 0.12); padding: 4px 10px; border-radius: 6px; flex-shrink: 0; border: 1px solid rgba(56, 189, 248, 0.25);">
                            #${idx + 1}
                        </span>
                        <div style="min-width: 0;">
                            <span style="font-size: 14.5px; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${scene.name || 'Level ' + (idx + 1)}
                            </span>
                        </div>
                    </div>

                    <!-- Kanan: Tombol Aksi -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                        <button class="btn-edit-scene" data-scene-id="${scene.id}" title="Ubah Nama Level" style="padding: 7px 16px; background: #0284c7; border: 1px solid #38bdf8; color: #ffffff; border-radius: 6px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">
                            Edit
                        </button>
                        <button class="btn-test-scene" data-scene-id="${scene.id}" title="Mainkan Stage Ini" style="padding: 7px 14px; background: #27272a; border: 1px solid #3f3f46; color: #f4f4f5; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 12px; height: 12px; flex-shrink: 0; display: block;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                            <span>Play</span>
                        </button>
                        ${(project.scenes.length > 1) ? `
                            <button class="btn-delete-scene" data-scene-id="${scene.id}" title="Hapus Level">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" style="width: 14px; height: 14px; flex-shrink: 0; display: block;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <button class="gt-uhub-back-btn" id="btn-back-to-projects">
                        <span>←</span> Kembali
                    </button>
                    <div>
                        <h1 class="gt-uhub-content-title">
                            <span id="gt-header-proj-name" title="Klik untuk ubah nama project" style="cursor: pointer;">${project.name}</span>
                        </h1>
                    </div>
                </div>
                <div class="gt-uhub-header-actions" style="display: flex; align-items: center; gap: 8px;">
                    <button class="gt-btn-icon-subtle" id="btn-add-scene-to-proj" title="Tambah Scene Baru">
                        +
                    </button>
                    <button class="gt-uhub-btn-primary" id="btn-play-full-project" style="background: #16a34a; display: inline-flex; align-items: center; gap: 6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 14px; height: 14px; flex-shrink: 0; display: block;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                        <span>Play this project</span>
                    </button>
                </div>
            </div>

            <div class="gt-uhub-table-container">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid #27272a; color: #64748b; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    <div>Daftar</div>
                    <div style="text-align: right;">Aksi</div>
                </div>

                ${sceneRowsHTML || `
                    <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 13px;">
                        Belum ada scene di project ini. Klik <strong>+ Tambah Scene Baru</strong> untuk membuat stage pertama!
                    </div>
                `}
            </div>
        `;

        // Tombol Kembali
        container.querySelector('#btn-back-to-projects').addEventListener('click', () => {
            AudioManager.playClick();
            this.selectedProjectId = null;
            this.renderContent();
        });

        // Ganti Nama Project (klik nama project)
        const headerProjName = container.querySelector('#gt-header-proj-name');
        if (headerProjName) {
            headerProjName.addEventListener('click', () => {
                const newName = prompt(`Ubah Nama Project:`, project.name);
                if (newName && newName.trim() && newName.trim() !== project.name) {
                    ProjectManager.renameProject(project.id, newName.trim());
                    AudioManager.playClick();
                    this.renderContent();
                }
            });
        }

        // Mainkan Full Project
        container.querySelector('#btn-play-full-project').addEventListener('click', () => {
            this.playProject(project);
        });


        // Tambah Scene Baru ke Project (Dialog Wizard Dinamis)
        container.querySelector('#btn-add-scene-to-proj').addEventListener('click', () => {
            AudioManager.playClick();
            this.showCreateSceneDialog(project);
        });

        // Edit / Rename Scene
        container.querySelectorAll('.btn-edit-scene').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-scene-id');
                const targetScene = (project.scenes || []).find(s => s.id === sId);
                if (targetScene) {
                    AudioManager.playClick();
                    this.showEditSceneDialog(project, targetScene);
                }
            });
        });

        // Test Scene Tunggal
        container.querySelectorAll('.btn-test-scene').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-scene-id');
                const targetScene = (project.scenes || []).find(s => s.id === sId);
                if (targetScene) {
                    this.hide();
                    AudioManager.playClick();
                    if (this.scene && this.scene.scene) {
                        this.scene.scene.start('CustomWorldScene', { worldData: targetScene, projectId: project.id, sceneId: sId });
                    }
                }
            });
        });

        // Hapus Scene
        container.querySelectorAll('.btn-delete-scene').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-scene-id');
                const targetScene = (project.scenes || []).find(s => s.id === sId);
                const sName = targetScene ? targetScene.name : 'scene ini';
                if (confirm(`Hapus "${sName}" dari project ${project.name}?`)) {
                    ProjectManager.deleteSceneFromProject(project.id, sId);
                    AudioManager.playClick();
                    this.renderContent();
                }
            });
        });
    }

    showEditSceneDialog(project, scene) {
        const oldDialog = document.getElementById('gt-uhub-edit-scene-dialog');
        if (oldDialog) oldDialog.remove();

        const dialog = document.createElement('div');
        dialog.id = 'gt-uhub-edit-scene-dialog';
        dialog.className = 'gt-uhub-wizard-overlay';
        dialog.innerHTML = `
            <div class="gt-uhub-wizard-card" style="width: min(440px, 94vw);">
                <div class="gt-uhub-wizard-title">✏️ Ubah Nama Level</div>
                <div class="gt-uhub-wizard-desc">
                    Ketik nama baru untuk level ini lalu tekan Simpan.
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 5px;">NAMA LEVEL</label>
                        <input type="text" id="gt-edit-scene-name" style="width: 100%; height: 36px; background: #141414; border: 1px solid #3b4252; border-radius: 6px; padding: 0 12px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" value="${scene.name || ''}" />
                    </div>
                </div>
                <div class="gt-uhub-wizard-actions" style="margin-top: 20px;">
                    <button class="gt-uhub-btn-cancel" id="btn-cancel-edit-scene">Batal</button>
                    <button class="gt-uhub-btn-primary" id="btn-save-edit-scene" style="padding: 0 20px;">
                        <span>✓</span> Simpan Perubahan
                    </button>
                </div>
            </div>
        `;

        const win = this.overlay.querySelector('.gt-uhub-window') || document.body;
        win.appendChild(dialog);

        const input = dialog.querySelector('#gt-edit-scene-name');
        input.focus();
        input.select();

        const saveHandler = () => {
            const newName = input.value.trim();
            if (newName && newName !== scene.name) {
                ProjectManager.renameScene(project.id, scene.id, newName);
                AudioManager.playSuccess();
                dialog.remove();
                this.renderContent();
            } else {
                dialog.remove();
            }
        };

        dialog.querySelector('#btn-save-edit-scene').addEventListener('click', saveHandler);
        dialog.querySelector('#btn-cancel-edit-scene').addEventListener('click', () => {
            AudioManager.playClick();
            dialog.remove();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveHandler();
            if (e.key === 'Escape') dialog.remove();
        });
    }

    showCreateSceneDialog(project) {
        const oldDialog = document.getElementById('gt-uhub-create-scene-dialog');
        if (oldDialog) oldDialog.remove();

        const nextNum = (project.scenes || []).length + 1;
        const dialog = document.createElement('div');
        dialog.id = 'gt-uhub-create-scene-dialog';
        dialog.className = 'gt-uhub-wizard-overlay';
        dialog.innerHTML = `
            <div class="gt-uhub-wizard-card" style="width: min(440px, 94vw);">
                <div class="gt-uhub-wizard-title">✨ Tambah Scene / Level Baru</div>
                <div class="gt-uhub-wizard-desc">
                    Tentukan nama level untuk stage ke-${nextNum} ini.
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 5px;">NAMA LEVEL</label>
                        <input type="text" id="gt-new-scene-name" placeholder="Misal: Level ${nextNum} • Area Petualangan" style="width: 100%; height: 36px; background: #141414; border: 1px solid #3b4252; border-radius: 6px; padding: 0 12px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" value="Level ${nextNum} • Area Petualangan" />
                    </div>
                </div>
                <div class="gt-uhub-wizard-actions" style="margin-top: 20px;">
                    <button class="gt-uhub-btn-cancel" id="btn-cancel-create-scene">Batal</button>
                    <button class="gt-uhub-btn-primary" id="btn-submit-create-scene" style="padding: 0 20px;">
                        <span>✓</span> Buat &amp; Buka Editor Scene
                    </button>
                </div>
            </div>
        `;

        this.overlay.querySelector('.gt-uhub-window').appendChild(dialog);

        const selectedBiome = 'dirt';

        const inputName = dialog.querySelector('#gt-new-scene-name');
        inputName.focus();
        inputName.select();

        const cancelBtn = dialog.querySelector('#btn-cancel-create-scene');
        cancelBtn.addEventListener('click', () => dialog.remove());

        const submitBtn = dialog.querySelector('#btn-submit-create-scene');
        const doCreate = () => {
            const name = inputName.value.trim() || `Level ${nextNum} • Area Petualangan`;
            const created = ProjectManager.addSceneToProject(project.id, {
                name,
                biome: selectedBiome,
                worldWidth: 3600,
                worldHeight: 1000
            });

            dialog.remove();
            this.hide();
            AudioManager.playClick();

            if (created) {
                const builder = new SceneBuilderModal(this.scene, {
                    projectId: project.id,
                    sceneId: created.id,
                    name: created.name,
                    biome: created.biome
                });
                builder.loadWorldData(created, project.id, created.id);
                builder.show();
            }
        };

        submitBtn.addEventListener('click', doCreate);
        inputName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doCreate();
            else if (e.key === 'Escape') dialog.remove();
        });
    }

    showCreateProjectDialog() {
        const oldDialog = document.getElementById('gt-uhub-create-proj-dialog');
        if (oldDialog) oldDialog.remove();

        const dialog = document.createElement('div');
        dialog.id = 'gt-uhub-create-proj-dialog';
        dialog.className = 'gt-uhub-wizard-overlay';
        dialog.innerHTML = `
            <div class="gt-uhub-wizard-card">
                <div class="gt-uhub-wizard-title">✨ Buat Project Baru</div>
                <div class="gt-uhub-wizard-desc">
                    Project adalah wadah game utuh yang dapat berisi banyak scene/level berurutan.
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 6px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">NAMA PROJECT</label>
                        <input type="text" id="gt-new-proj-name" placeholder="Misal: Petualangan Ksatria Naga" style="width: 100%; height: 36px; background: #141414; border: 1px solid #3b4252; border-radius: 6px; padding: 0 12px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" value="Petualangan Baru" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">DESKRIPSI (OPSIONAL)</label>
                        <input type="text" id="gt-new-proj-desc" placeholder="Game platformer 2D dengan beberapa stage tantangan" style="width: 100%; height: 36px; background: #141414; border: 1px solid #3b4252; border-radius: 6px; padding: 0 12px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" value="Game petualangan multi-scene" />
                    </div>
                </div>
                <div class="gt-uhub-wizard-actions">
                    <button class="gt-uhub-btn-cancel" id="btn-cancel-create-proj">Batal</button>
                    <button class="gt-uhub-btn-primary" id="btn-submit-create-proj" style="padding: 0 20px;">
                        <span>✓</span> Buat &amp; Buka Project
                    </button>
                </div>
            </div>
        `;

        this.overlay.querySelector('.gt-uhub-window').appendChild(dialog);

        const inputName = dialog.querySelector('#gt-new-proj-name');
        inputName.focus();
        inputName.select();

        const cancelBtn = dialog.querySelector('#btn-cancel-create-proj');
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
        });

        const submitBtn = dialog.querySelector('#btn-submit-create-proj');
        const doCreate = () => {
            const name = inputName.value.trim() || 'Petualangan Baru';
            const desc = dialog.querySelector('#gt-new-proj-desc').value.trim();
            const newProj = ProjectManager.createProject(name, desc);
            AudioManager.playClick();
            dialog.remove();
            this.selectedProjectId = newProj.id;
            this.renderContent();
        };

        submitBtn.addEventListener('click', doCreate);
        inputName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doCreate();
            else if (e.key === 'Escape') dialog.remove();
        });
    }

    playProject(project) {
        if (!project || !Array.isArray(project.scenes) || project.scenes.length === 0) {
            alert('Project ini belum memiliki scene!');
            return;
        }

        const startScene = project.scenes.find(s => s.id === project.startingSceneId) || project.scenes[0];
        if (startScene) {
            this.hide();
            AudioManager.playClick();
            if (this.scene && this.scene.scene) {
                this.scene.scene.start('CustomWorldScene', {
                    worldData: startScene,
                    projectId: project.id,
                    sceneId: startScene.id
                });
            }
        }
    }








    showNewProjectWizard() {
        this.hide();
        AudioManager.playClick();
        const builder = new SceneBuilderModal(this.scene);
        builder.show();
    }

    launchScene(sceneKey) {
        this.hide();
        AudioManager.playClick();
        if (this.scene && this.scene.scene) {
            this.scene.scene.start(sceneKey, { isNewGame: true });
        }
    }

    show() {
        if (!this.overlay) this.createDOM();
        this.overlay.classList.remove('hidden');
        this._isOpen = true;
        AudioManager.playClick();
        this.renderContent();
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this._isOpen = false;
        AudioManager.playClick();
    }

    isOpen() {
        return this._isOpen;
    }
}
