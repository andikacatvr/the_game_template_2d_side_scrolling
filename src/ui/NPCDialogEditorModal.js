// ===============================================================
// NPC DIALOG EDITOR MODAL (WRENCH / GROWTOPIA STYLE)
// ===============================================================
// GUI Modal untuk mengedit nama dan baris dialog percakapan NPC:
// 1. Input Nama Karakter / Speaker
// 2. Textarea Baris Dialog (1 baris = 1 kalimat percakapan)
// 3. Tombol "Tes Dialog Langsung" untuk melihat efek typewriter live
// 4. Tombol "Simpan Perubahan" untuk menyimpan ke NPC & save data
// ===============================================================

import { AudioManager } from '../utils/AudioManager.js';

export class NPCDialogEditorModal {
    constructor(scene) {
        this.scene = scene;
        this.targetNpc = null;
        this.dom = null;
        this.onSaveCallback = null;

        this.createDOM();

        // Bersihkan otomatis saat scene berganti atau restart
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    createDOM() {
        const id = 'gt-npc-dialog-editor-modal';
        const old = document.getElementById(id);
        if (old) old.remove();

        this.dom = document.createElement('div');
        this.dom.id = id;
        this.dom.className = 'gt-npc-editor-overlay hidden';

        this.dom.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');

                .gt-npc-editor-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(4, 8, 19, 0.75);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s ease;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 16px;
                    box-sizing: border-box;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .gt-npc-editor-overlay.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .gt-npc-editor-card {
                    position: relative;
                    width: min(540px, 95vw);
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 13, 22, 0.98) 100%);
                    border: 2px solid #f59e0b;
                    border-radius: 10px;
                    padding: 24px 28px;
                    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.25);
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    transform: scale(1);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    color: #f8fafc;
                }

                .gt-npc-editor-overlay.hidden .gt-npc-editor-card {
                    transform: scale(0.94);
                }

                /* Header */
                .gt-npc-editor-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(245, 158, 11, 0.25);
                    padding-bottom: 12px;
                }

                .gt-npc-editor-title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .gt-npc-editor-icon-badge {
                    width: 32px;
                    height: 32px;
                    background: rgba(245, 158, 11, 0.15);
                    border: 1.5px solid #f59e0b;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                }

                .gt-npc-editor-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #fbbf24;
                    letter-spacing: 0.3px;
                }

                .gt-npc-editor-subtitle {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 1px;
                }

                .gt-npc-editor-close-btn {
                    width: 28px;
                    height: 28px;
                    background: #1e293b;
                    border: 1px solid #475569;
                    border-radius: 6px;
                    color: #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.15s ease;
                }

                .gt-npc-editor-close-btn:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                    color: #ffffff;
                }

                /* Form Fields */
                .gt-npc-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .gt-npc-label {
                    font-size: 12px;
                    font-weight: 700;
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .gt-npc-label-hint {
                    font-size: 10.5px;
                    font-weight: 500;
                    color: #94a3b8;
                }

                .gt-npc-input {
                    background: #090d16;
                    border: 1.5px solid #334155;
                    border-radius: 6px;
                    padding: 9px 12px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #ffffff;
                    outline: none;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    font-family: inherit;
                }

                .gt-npc-input:focus {
                    border-color: #f59e0b;
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
                }

                .gt-npc-textarea {
                    background: #090d16;
                    border: 1.5px solid #334155;
                    border-radius: 6px;
                    padding: 10px 12px;
                    font-size: 13px;
                    line-height: 1.55;
                    color: #f8fafc;
                    outline: none;
                    resize: vertical;
                    min-height: 110px;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    font-family: inherit;
                }

                .gt-npc-textarea:focus {
                    border-color: #f59e0b;
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
                }

                .gt-npc-line-counter {
                    font-size: 11px;
                    color: #f59e0b;
                    font-weight: 600;
                    align-self: flex-end;
                }

                /* Action Footer */
                .gt-npc-editor-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 14px;
                    gap: 10px;
                }

                .gt-npc-btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    outline: none;
                    transition: all 0.15s ease;
                }

                .gt-npc-btn-test {
                    background: #1e293b;
                    border: 1.5px solid #64748b;
                    color: #38bdf8;
                }

                .gt-npc-btn-test:hover {
                    background: #0284c7;
                    border-color: #38bdf8;
                    color: #ffffff;
                    box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
                }

                .gt-npc-btn-save {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border: 1.5px solid #fbbf24;
                    color: #0f172a;
                    font-weight: 800;
                }

                .gt-npc-btn-save:hover {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
                    transform: translateY(-1px);
                }

                .gt-npc-btn-save:active {
                    transform: translateY(1px);
                }
            </style>

            <div class="gt-npc-editor-card" id="gt-npc-editor-card">
                <div class="gt-npc-editor-header">
                    <div class="gt-npc-editor-title-wrap">
                        <div class="gt-npc-editor-icon-badge">🔧</div>
                        <div>
                            <div class="gt-npc-editor-title">Edit NPC &amp; Percakapan</div>
                            <div class="gt-npc-editor-subtitle">Sesuaikan nama dan kalimat dialog karakter di game</div>
                        </div>
                    </div>
                    <button class="gt-npc-editor-close-btn" id="gt-npc-editor-close-btn" title="Tutup">✕</button>
                </div>

                <div class="gt-npc-form-group">
                    <label class="gt-npc-label" for="gt-npc-name-input">
                        <span>Nama Karakter (Speaker)</span>
                        <span class="gt-npc-label-hint">Ditampilkan di badge atas dialog</span>
                    </label>
                    <input type="text" id="gt-npc-name-input" class="gt-npc-input" placeholder="Contoh: Penjaga Gerbang" />
                </div>

                <div class="gt-npc-form-group">
                    <label class="gt-npc-label" for="gt-npc-dialog-input">
                        <span>Isi Percakapan Dialog</span>
                        <span class="gt-npc-label-hint">1 baris baru = 1 kalimat percakapan</span>
                    </label>
                    <textarea id="gt-npc-dialog-input" class="gt-npc-textarea" placeholder="Tulis dialog di sini...&#10;Tekan Enter untuk baris berikutnya."></textarea>
                    <div class="gt-npc-line-counter" id="gt-npc-line-counter">0 baris dialog</div>
                </div>

                <div class="gt-npc-editor-footer">
                    <button class="gt-npc-btn gt-npc-btn-test" id="gt-npc-btn-test">
                        <span>▶</span> Tes Dialog Langsung
                    </button>
                    <div style="display: flex; gap: 8px;">
                        <button class="gt-npc-btn gt-npc-btn-save" id="gt-npc-btn-save">
                            <span>💾</span> Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.dom);

        // Bind DOM Elements
        this.nameInput = this.dom.querySelector('#gt-npc-name-input');
        this.dialogInput = this.dom.querySelector('#gt-npc-dialog-input');
        this.lineCounter = this.dom.querySelector('#gt-npc-line-counter');
        this.closeBtn = this.dom.querySelector('#gt-npc-editor-close-btn');
        this.testBtn = this.dom.querySelector('#gt-npc-btn-test');
        this.saveBtn = this.dom.querySelector('#gt-npc-btn-save');

        // Close on overlay background click
        this.dom.addEventListener('click', (e) => {
            if (e.target === this.dom) {
                this.close();
            }
        });

        // Close button
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Update line counter as user types
        this.dialogInput.addEventListener('input', () => {
            this.updateCounter();
        });

        // Test dialog button
        this.testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = this.nameInput.value.trim() || 'NPC';
            const lines = this.parseLines();
            this.close();
            if (this.scene && this.scene.dialogBox) {
                this.scene.dialogBox.start(name, lines);
            }
        });

        // Save button
        this.saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.save();
        });
    }

    parseLines() {
        const raw = this.dialogInput.value || '';
        const lines = raw.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);
        return lines.length > 0 ? lines : ['...'];
    }

    updateCounter() {
        const lines = this.parseLines();
        this.lineCounter.textContent = `${lines.length} baris dialog`;
    }

    open(npcRef = null, onSave = null) {
        this.targetNpc = npcRef;
        this.onSaveCallback = onSave;

        // Ambil data nama dan dialog dari npcRef atau scene
        let currentName = 'Penjaga Gerbang';
        let currentDialog = ['Halo petualang! Selamat datang di Lembah Bersalju.'];

        if (npcRef) {
            if (npcRef.name) currentName = npcRef.name;
            else if (npcRef.nama) currentName = npcRef.nama;

            if (Array.isArray(npcRef.dialog)) currentDialog = npcRef.dialog;
            else if (Array.isArray(npcRef.lines)) currentDialog = npcRef.lines;
            else if (typeof npcRef.dialog === 'string') currentDialog = [npcRef.dialog];
        } else if (this.scene && this.scene.npcData) {
            currentName = this.scene.npcData.name || currentName;
            currentDialog = this.scene.npcData.dialog || currentDialog;
        }

        this.nameInput.value = currentName;
        this.dialogInput.value = currentDialog.join('\n');
        this.updateCounter();

        if (this.dom) {
            this.dom.classList.remove('hidden');
        }
        AudioManager.playClick();
        this.nameInput.focus();
    }

    save() {
        const newName = this.nameInput.value.trim() || 'NPC';
        const newLines = this.parseLines();

        if (this.targetNpc) {
            this.targetNpc.name = newName;
            this.targetNpc.nama = newName;
            this.targetNpc.dialog = newLines;
        }

        if (this.scene) {
            if (this.scene.npcData) {
                this.scene.npcData.name = newName;
                this.scene.npcData.dialog = newLines;
            }
            if (this.scene.showFloatingToast) {
                this.scene.showFloatingToast(`✅ Dialog NPC "${newName}" Berhasil Diperbarui!`, 0x22c55e);
            }
        }

        if (typeof this.onSaveCallback === 'function') {
            this.onSaveCallback({ name: newName, dialog: newLines });
        }

        AudioManager.playSuccess();
        this.close();
    }

    close() {
        if (this.dom) {
            this.dom.classList.add('hidden');
        }
        AudioManager.playClick();
    }

    isOpen() {
        return !!(this.dom && !this.dom.classList.contains('hidden'));
    }

    destroy() {
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
