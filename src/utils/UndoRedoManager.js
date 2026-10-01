import { AudioManager } from './AudioManager.js';

class UndoRedoManagerClass {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.listeners = new Set();
        this.initKeybindings();
    }

    initKeybindings() {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', (e) => {
            // Abaikan jika sedang mengetik di input / textarea
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                return;
            }

            // Jika SceneBuilder modal sedang terbuka, biarkan ia menangani undo/redo internalnya sendiri
            const sbOverlay = document.getElementById('gt-scene-builder-overlay');
            if (sbOverlay && sbOverlay.style.display !== 'none' && sbOverlay.classList.contains('show')) {
                return;
            }

            // Ctrl+Z atau Cmd+Z
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        // Ctrl+Shift+Z -> Redo
                        e.preventDefault();
                        this.redo();
                    } else {
                        // Ctrl+Z -> Undo
                        e.preventDefault();
                        this.undo();
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    // Ctrl+Y -> Redo
                    e.preventDefault();
                    this.redo();
                }
            }
        });
    }

    push(action) {
        if (!action || typeof action.undo !== 'function' || typeof action.redo !== 'function') return;
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Reset redo setiap kali ada aksi baru
        this.notify();
    }

    undo() {
        if (this.undoStack.length === 0) {
            if (AudioManager && typeof AudioManager.playClick === 'function') {
                AudioManager.playClick();
            }
            this.showToast('ℹ️ Tidak ada aksi untuk di-Undo (Kosong)', 0x64748b);
            return null;
        }

        const action = this.undoStack.pop();
        try {
            action.undo();
        } catch (err) {
            console.error('Error saat Undo:', err);
        }
        this.redoStack.push(action);
        this.notify();

        if (AudioManager && typeof AudioManager.playClick === 'function') {
            AudioManager.playClick();
        }
        const desc = action.description || 'Aksi';
        this.showToast(`↩️ Undo: ${desc}`, 0x38bdf8);
        return action;
    }

    redo() {
        if (this.redoStack.length === 0) {
            if (AudioManager && typeof AudioManager.playClick === 'function') {
                AudioManager.playClick();
            }
            this.showToast('ℹ️ Tidak ada aksi untuk di-Redo (Kosong)', 0x64748b);
            return null;
        }

        const action = this.redoStack.pop();
        try {
            action.redo();
        } catch (err) {
            console.error('Error saat Redo:', err);
        }
        this.undoStack.push(action);
        this.notify();

        if (AudioManager && typeof AudioManager.playClick === 'function') {
            AudioManager.playClick();
        }
        const desc = action.description || 'Aksi';
        this.showToast(`↪️ Redo: ${desc}`, 0x22c55e);
        return action;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        try {
            listener(this);
        } catch (e) {
            console.error(e);
        }
        return () => this.listeners.delete(listener);
    }

    notify() {
        for (const listener of this.listeners) {
            try {
                listener(this);
            } catch (e) {
                console.error(e);
            }
        }
    }

    showToast(message, color = 0x38bdf8) {
        if (window.__templateGame && window.__templateGame.scene) {
            const scenes = window.__templateGame.scene.getScenes(true);
            const activeScene = scenes.find(s => s && s.scene && s.scene.isActive());
            if (activeScene && typeof activeScene.showFloatingToast === 'function') {
                activeScene.showFloatingToast(message, color);
            }
        }
    }
}

export const UndoRedoManager = new UndoRedoManagerClass();
