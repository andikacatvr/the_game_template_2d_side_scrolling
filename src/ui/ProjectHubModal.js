import { AudioManager } from '../utils/AudioManager.js';

export class ProjectHubModal {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = options;
        this._isOpen = false;
        this.currentTab = 'projects'; // 'projects' | 'templates' | 'tutorials' | 'learn'
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

                /* Notice Banner (Like Unity legal notice) */
                .gt-uhub-banner {
                    background: #252525;
                    border-bottom: 1px solid #303030;
                    padding: 7px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11.5px;
                    color: #b0b0b0;
                }

                .gt-uhub-banner-link {
                    color: #38bdf8;
                    text-decoration: none;
                    font-weight: 600;
                    cursor: pointer;
                }

                .gt-uhub-banner-link:hover {
                    text-decoration: underline;
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

                .gt-uhub-row {
                    display: grid;
                    grid-template-columns: 2.2fr 1.2fr 1.2fr 1.4fr;
                    align-items: center;
                    padding: 14px;
                    border-bottom: 1px solid #202020;
                    border-radius: 6px;
                    transition: background 0.15s ease;
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

                .gt-uhub-col-action {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                }

                .gt-uhub-btn-open {
                    padding: 6px 16px;
                    background: #252525;
                    border: 1px solid #383838;
                    border-radius: 5px;
                    color: #ffffff;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s ease;
                }

                .gt-uhub-btn-open:hover {
                    background: #0284c7;
                    border-color: #0284c7;
                    color: #ffffff;
                    box-shadow: 0 0 10px rgba(2, 132, 199, 0.4);
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
                            <span>Game Creator Hub</span>
                            <span class="gt-uhub-logo-badge">Phaser 4 Engine</span>
                        </div>
                    </div>
                    <div class="gt-uhub-topbar-right">
                        <div class="gt-uhub-user-badge">
                            <div class="gt-uhub-avatar">AC</div>
                            <span class="gt-uhub-username">Murid Developer</span>
                        </div>
                        <button class="gt-uhub-close-btn" id="gt-uhub-close-btn" title="Tutup Hub (ESC)">✕</button>
                    </div>
                </div>

                <!-- Unity-style Notice Banner -->
                <div class="gt-uhub-banner">
                    <span>💡 <b>Edu-Engine Mode Aktif</b>: Bangun dunia game 2D dengan cepat lewat perintah <code>/create</code> dan template modular.</span>
                    <span class="gt-uhub-banner-link" id="gt-uhub-banner-guide">Panduan Koding →</span>
                </div>

                <!-- Main Layout (Sidebar + Content) -->
                <div class="gt-uhub-main">
                    <!-- Left Sidebar -->
                    <div class="gt-uhub-sidebar">
                        <div class="gt-uhub-nav-item active" data-tab="projects">
                            <span class="gt-uhub-nav-icon">📁</span>
                            <span>Projects</span>
                        </div>
                        <div class="gt-uhub-nav-item" data-tab="templates">
                            <span class="gt-uhub-nav-icon">🗂️</span>
                            <span>Templates</span>
                        </div>
                        <div class="gt-uhub-nav-item" data-tab="tutorials">
                            <span class="gt-uhub-nav-icon">📖</span>
                            <span>Tutorials</span>
                        </div>
                        <div class="gt-uhub-nav-item" data-tab="learn">
                            <span class="gt-uhub-nav-icon">⚡</span>
                            <span>Console Commands</span>
                        </div>

                        <div class="gt-uhub-sidebar-divider"></div>

                        <div class="gt-uhub-sidebar-footer">
                            <b>Tips Developer:</b><br/>
                            Tekan tombol <b>+/create</b> di dalam game untuk memanggil mantra kode secara langsung.
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

        // Banner Guide click
        this.overlay.querySelector('#gt-uhub-banner-guide').addEventListener('click', () => {
            this.currentTab = 'learn';
            this.overlay.querySelectorAll('.gt-uhub-nav-item').forEach(i => {
                i.classList.toggle('active', i.getAttribute('data-tab') === 'learn');
            });
            this.renderContent();
        });

        // Render initial tab content
        this.renderContent();
    }

    renderContent() {
        const container = this.overlay.querySelector('#gt-uhub-content-container');
        if (!container) return;

        if (this.currentTab === 'projects') {
            this.renderProjectsTab(container);
        } else if (this.currentTab === 'templates') {
            this.renderTemplatesTab(container);
        } else if (this.currentTab === 'tutorials') {
            this.renderTutorialsTab(container);
        } else if (this.currentTab === 'learn') {
            this.renderLearnTab(container);
        }
    }

    renderProjectsTab(container) {
        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <h1 class="gt-uhub-content-title">Projects</h1>
                <div class="gt-uhub-header-actions">
                    <div class="gt-uhub-search-box">
                        <span class="gt-uhub-search-icon">🔍</span>
                        <input type="text" class="gt-uhub-search-input" id="gt-uhub-search" placeholder="Search projects..." value="${this.searchQuery}" />
                    </div>
                    <button class="gt-uhub-btn-primary" id="gt-uhub-btn-new-project">
                        <span>+</span> New World
                    </button>
                </div>
            </div>

            <div class="gt-uhub-table-container">
                <div class="gt-uhub-table-header">
                    <div>Name</div>
                    <div>Type</div>
                    <div>Modified</div>
                    <div style="text-align: right;">Action</div>
                </div>

                <!-- Row 1: Sandbox World (Scene 3) -->
                <div class="gt-uhub-row" data-name="sandbox world scene 3">
                    <div class="gt-uhub-col-name">
                        <span class="gt-uhub-project-name">
                            <span>🌟</span> Sandbox World (Scene 3)
                        </span>
                        <span class="gt-uhub-project-path">src/scenes/Scene3.js</span>
                    </div>
                    <div>
                        <span class="gt-uhub-badge-tag gt-tag-sandbox">Creative Canvas</span>
                    </div>
                    <div class="gt-uhub-badge-platform">
                        <span>● Siap Diedit</span>
                    </div>
                    <div class="gt-uhub-col-action">
                        <button class="gt-uhub-btn-open" id="btn-open-scene3">
                            <span>▶</span> Open World
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Search filter
        const searchInput = container.querySelector('#gt-uhub-search');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            container.querySelectorAll('.gt-uhub-row').forEach(row => {
                const name = row.getAttribute('data-name');
                row.style.display = name.includes(this.searchQuery) ? 'grid' : 'none';
            });
        });

        // Launch buttons
        container.querySelector('#btn-open-scene3').addEventListener('click', () => {
            this.launchScene('Scene3');
        });

        // New Project Wizard
        container.querySelector('#gt-uhub-btn-new-project').addEventListener('click', () => {
            this.showNewProjectWizard();
        });
    }

    renderTemplatesTab(container) {
        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <h1 class="gt-uhub-content-title">Starter Templates</h1>
                <p style="font-size: 13px; color: #888; margin: 0;">Pilih template awal untuk dijadikan pondasi pembuatan game baru.</p>
            </div>

            <div class="gt-uhub-templates-grid">
                <div class="gt-uhub-template-card">
                    <div class="gt-uhub-card-header">
                        <div class="gt-uhub-card-icon">🧱</div>
                        <div>
                            <div class="gt-uhub-card-title">Blank Platformer</div>
                            <span class="gt-uhub-badge-tag gt-tag-sandbox">Scene 3 Sandbox</span>
                        </div>
                    </div>
                    <div class="gt-uhub-card-desc">
                        Kanvas berlantai kosong yang bersih. Siap ditambah platform melayang, NPC, dialog, dan koin dengan perintah <b>/create</b>.
                    </div>
                    <button class="gt-uhub-btn-open" style="width: 100%; justify-content: center; margin-top: auto;" id="btn-tmpl-sandbox">
                        Gunakan Template Ini →
                    </button>
                </div>

                <div class="gt-uhub-template-card">
                    <div class="gt-uhub-card-header">
                        <div class="gt-uhub-card-icon">🌃</div>
                        <div>
                            <div class="gt-uhub-card-title">Parallax & Weather</div>
                            <span class="gt-uhub-badge-tag gt-tag-sample">Advanced</span>
                        </div>
                    </div>
                    <div class="gt-uhub-card-desc">
                        Template level dengan 3 lapis latar parallax (langit, gedung, ombak laut) dan simulasi butir hujan menukik miring.
                    </div>
                    <button class="gt-uhub-btn-open" style="width: 100%; justify-content: center; margin-top: auto;" id="btn-tmpl-hk">
                        Buka & Pelajari Kode →
                    </button>
                </div>

                <div class="gt-uhub-template-card">
                    <div class="gt-uhub-card-header">
                        <div class="gt-uhub-card-icon">🗺️</div>
                        <div>
                            <div class="gt-uhub-card-title">Data-Driven RPG</div>
                            <span class="gt-uhub-badge-tag gt-tag-tutorial">cerita.js</span>
                        </div>
                    </div>
                    <div class="gt-uhub-card-desc">
                        Membangun level tanpa koding file baru! Cukup isi daftar platform, koin, rintangan, dan portal di file <b>cerita.js</b>.
                    </div>
                    <button class="gt-uhub-btn-open" style="width: 100%; justify-content: center; margin-top: auto;" id="btn-tmpl-snow">
                        Mainkan Contoh →
                    </button>
                </div>
            </div>
        `;

        container.querySelector('#btn-tmpl-sandbox').addEventListener('click', () => this.launchScene('Scene3'));
        container.querySelector('#btn-tmpl-hk').addEventListener('click', () => this.launchScene('Scene2'));
        container.querySelector('#btn-tmpl-snow').addEventListener('click', () => this.launchScene('GameScene'));
    }

    renderTutorialsTab(container) {
        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <h1 class="gt-uhub-content-title">Tutorial Levels</h1>
                <p style="font-size: 13px; color: #888; margin: 0;">Mainkan petualangan tutorial resmi untuk memahami mekanika game.</p>
            </div>

            <div class="gt-uhub-table-container">
                <div class="gt-uhub-table-header">
                    <div>Tutorial</div>
                    <div>Topik Pelajaran</div>
                    <div>Status</div>
                    <div style="text-align: right;">Action</div>
                </div>

                <div class="gt-uhub-row">
                    <div class="gt-uhub-col-name">
                        <span class="gt-uhub-project-name">🏔️ Level 1: Lembah Bersalju</span>
                        <span class="gt-uhub-project-path">Tutorial Dasar</span>
                    </div>
                    <div>
                        <span style="font-size: 12px; color: #cbd5e1;">Gerak Karakter, Lompat, Koin Emas, Portal</span>
                    </div>
                    <div>
                        <span class="gt-uhub-badge-tag gt-tag-tutorial">Level Pemula</span>
                    </div>
                    <div class="gt-uhub-col-action">
                        <button class="gt-uhub-btn-open" id="btn-tut-1">▶ Mulai Level 1</button>
                    </div>
                </div>

                <div class="gt-uhub-row">
                    <div class="gt-uhub-col-name">
                        <span class="gt-uhub-project-name">🌃 Level 2: Teluk Hong Kong</span>
                        <span class="gt-uhub-project-path">Tutorial Mahakarya</span>
                    </div>
                    <div>
                        <span style="font-size: 12px; color: #cbd5e1;">Parallax 3-Layer, Cuaca Hujan, Kapal Feri</span>
                    </div>
                    <div>
                        <span class="gt-uhub-badge-tag gt-tag-sample">Level Lanjut</span>
                    </div>
                    <div class="gt-uhub-col-action">
                        <button class="gt-uhub-btn-open" id="btn-tut-2">▶ Mulai Level 2</button>
                    </div>
                </div>
            </div>
        `;

        container.querySelector('#btn-tut-1').addEventListener('click', () => this.launchScene('GameScene'));
        container.querySelector('#btn-tut-2').addEventListener('click', () => this.launchScene('Scene2'));
    }

    renderLearnTab(container) {
        container.innerHTML = `
            <div class="gt-uhub-content-header">
                <h1 class="gt-uhub-content-title">In-Game Console Commands</h1>
                <p style="font-size: 13px; color: #888; margin: 0;">Daftar perintah mantra ajaib yang bisa diketik di Chat Bar saat bermain.</p>
            </div>

            <div class="gt-uhub-table-container">
                <div class="gt-uhub-table-header">
                    <div>Perintah</div>
                    <div>Deskripsi</div>
                    <div>Fungsi Edukasi</div>
                </div>

                <div class="gt-uhub-row">
                    <div><code style="color: #38bdf8; font-weight: bold;">/create [elemen]</code></div>
                    <div>Mengambil kumpulan template kode siap pakai (tile, npc, dialogue, quest, dll).</div>
                    <div><span class="gt-uhub-badge-tag gt-tag-sandbox">World Builder</span></div>
                </div>

                <div class="gt-uhub-row">
                    <div><code style="color: #f59e0b; font-weight: bold;">/inspect</code></div>
                    <div>Membuka slider live kecepatan, gravitasi, dan melacak baris kode secara real-time.</div>
                    <div><span class="gt-uhub-badge-tag gt-tag-sample">Live Inspector</span></div>
                </div>

                <div class="gt-uhub-row">
                    <div><code style="color: #34d399; font-weight: bold;">/tp &lt;scene&gt;</code></div>
                    <div>Teleportasi instan antar scene (Scene1, Scene2, Scene3, Title).</div>
                    <div><span class="gt-uhub-badge-tag gt-tag-tutorial">Navigation</span></div>
                </div>

                <div class="gt-uhub-row">
                    <div><code style="color: #cbd5e1; font-weight: bold;">/speed &lt;angka&gt;</code></div>
                    <div>Mengubah kecepatan lari karakter utama secara langsung.</div>
                    <div><span class="gt-uhub-badge-tag" style="background:#262626; color:#aaa;">Variable</span></div>
                </div>

                <div class="gt-uhub-row">
                    <div><code style="color: #cbd5e1; font-weight: bold;">/jump &lt;angka&gt;</code></div>
                    <div>Mengubah daya lompat karakter utama secara langsung.</div>
                    <div><span class="gt-uhub-badge-tag" style="background:#262626; color:#aaa;">Variable</span></div>
                </div>
            </div>
        `;
    }

    showNewProjectWizard() {
        const wizard = document.createElement('div');
        wizard.className = 'gt-uhub-wizard-overlay';
        wizard.innerHTML = `
            <div class="gt-uhub-wizard-card">
                <h3 class="gt-uhub-wizard-title">➕ Buat Dunia / Scene Baru</h3>
                <div class="gt-uhub-wizard-desc">
                    Kamu bisa langsung membangun dunia baru di <b>Sandbox World (Scene 3)</b> menggunakan perintah <b>/create</b>, atau membuat file Scene terpisah.
                    <br/><br/>
                    <b>Pilihan Terbaik untuk Murid:</b>
                    <ol style="margin: 8px 0 0 16px; padding: 0;">
                        <li>Buka <b>Sandbox World (Scene 3)</b></li>
                        <li>Ketik <b>/create tile</b> untuk buat lantai</li>
                        <li>Ketik <b>/create npc</b> untuk tambah karakter</li>
                    </ol>
                </div>
                <div class="gt-uhub-wizard-actions">
                    <button class="gt-uhub-btn-cancel" id="btn-wizard-cancel">Tutup</button>
                    <button class="gt-uhub-btn-primary" id="btn-wizard-go-sandbox">Buka Sandbox Sekarang ➔</button>
                </div>
            </div>
        `;

        this.overlay.querySelector('.gt-uhub-window').appendChild(wizard);

        wizard.querySelector('#btn-wizard-cancel').addEventListener('click', () => wizard.remove());
        wizard.querySelector('#btn-wizard-go-sandbox').addEventListener('click', () => {
            wizard.remove();
            this.launchScene('Scene3');
        });
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
