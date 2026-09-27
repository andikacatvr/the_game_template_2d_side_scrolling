// ===============================================================
// HTML TUTORIAL GUIDE BANNER (INTERACTIVE STEP-BY-STEP TRACKER)
// ===============================================================
// Komponen UI HTML untuk menampilkan petunjuk langkah tutorial aktif:
// 1. Tampilan Banner Cyberpunk/Clean di bagian atas tengah layar
// 2. Indikator langkah dinamis (1/6, 2/6, dst)
// 3. Efek animasi saat langkah berhasil diselesaikan (Centang Hijau + Glow)
// ===============================================================

export class HTMLTutorialGuide {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.currentStep = 0;
        this.steps = options.steps || [];
        this.dom = null;
        this.initDOM();

        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    initDOM() {
        const old = document.getElementById('gt-tutorial-guide-banner');
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = 'gt-tutorial-guide-banner';
        this.dom.className = 'gt-tut-banner';

        const isEngineBar = !!document.getElementById('gt-engine-menubar') || !!this.scene.engineMenuBar;
        const topPos = isEngineBar ? '42px' : '14px';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=JetBrains+Mono:wght@700&display=swap');

                .gt-tut-banner {
                    position: fixed;
                    top: ${topPos};
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 99980;
                    pointer-events: auto;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gt-tut-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 16px;
                    background: rgba(15, 23, 42, 0.88);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1.5px solid rgba(56, 189, 248, 0.4);
                    border-radius: 9999px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.2);
                    color: #f8fafc;
                    font-size: 13px;
                    cursor: default;
                    transition: all 0.25s ease;
                }

                .gt-tut-card:hover {
                    border-color: #38bdf8;
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.35);
                }

                .gt-tut-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0284c7, #0369a1);
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 3px 8px;
                    border-radius: 9999px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
                }

                .gt-tut-badge.completed {
                    background: linear-gradient(135deg, #10b981, #059669);
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
                }

                .gt-tut-body {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .gt-tut-title {
                    font-weight: 700;
                    font-size: 12.5px;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gt-tut-desc {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .gt-tut-arrow-icon {
                    font-size: 14px;
                    color: #fbbf24;
                    animation: gt-tut-bounce 1s infinite alternate ease-in-out;
                }

                @keyframes gt-tut-bounce {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-4px); }
                }

                .gt-tut-dots {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-left: 6px;
                    padding-left: 10px;
                    border-left: 1px solid rgba(255, 255, 255, 0.15);
                }

                .gt-tut-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: rgba(148, 163, 184, 0.3);
                    transition: all 0.25s ease;
                }

                .gt-tut-dot.active {
                    background: #38bdf8;
                    box-shadow: 0 0 8px #38bdf8;
                    transform: scale(1.3);
                }

                .gt-tut-dot.done {
                    background: #10b981;
                }
            </style>

            <div class="gt-tut-card" id="gt-tut-card">
                <span class="gt-tut-arrow-icon">⬇</span>
                <span class="gt-tut-badge" id="gt-tut-badge">Tutorial 1/6</span>
                <div class="gt-tut-body">
                    <span class="gt-tut-title" id="gt-tut-title">Ikuti Tanda Panah</span>
                    <span class="gt-tut-desc" id="gt-tut-desc">Dekati dan bicara dengan Pemandu Engine</span>
                </div>
                <div class="gt-tut-dots" id="gt-tut-dots"></div>
            </div>
        `;

        document.body.appendChild(this.dom);
        this.renderDots();
        this.updateStep(this.currentStep);
    }

    renderDots() {
        const dotsContainer = this.dom.querySelector('#gt-tut-dots');
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';

        this.steps.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = `gt-tut-dot ${idx === this.currentStep ? 'active' : (idx < this.currentStep ? 'done' : '')}`;
            dotsContainer.appendChild(dot);
        });
    }

    updateStep(stepIndex) {
        this.currentStep = Math.max(0, Math.min(stepIndex, this.steps.length - 1));
        const step = this.steps[this.currentStep];
        if (!step || !this.dom) return;

        const badge = this.dom.querySelector('#gt-tut-badge');
        const title = this.dom.querySelector('#gt-tut-title');
        const desc = this.dom.querySelector('#gt-tut-desc');

        if (badge) {
            badge.textContent = `Langkah ${this.currentStep + 1}/${this.steps.length}`;
            badge.classList.toggle('completed', this.currentStep === this.steps.length - 1);
        }
        if (title) title.innerHTML = step.title;
        if (desc) desc.textContent = step.desc;

        this.renderDots();

        // Pop pulse animation
        const card = this.dom.querySelector('#gt-tut-card');
        if (card) {
            card.style.transform = 'scale(1.04)';
            setTimeout(() => {
                if (card) card.style.transform = 'scale(1)';
            }, 200);
        }
    }

    destroy() {
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
