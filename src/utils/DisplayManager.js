// ===============================================================
// 🖥️ DISPLAY MANAGER: PENGATUR RESOLUSI & FULLSCREEN LAYAR
// ===============================================================
export class DisplayManager {
    static init() {
        if (this._initialized) return;
        this._initialized = true;
        this.resolutions = [
            { id: 'fit', label: 'Layar Penuh (Full-Bleed 100%)', desc: 'Menyesuaikan layar browser penuh tanpa bar hitam' },
            { id: '1280x720', label: '1280 x 720 (Besar HD)', width: 1280, height: 720 },
            { id: '960x540', label: '960 x 540 (Sedang)', width: 960, height: 540 },
            { id: '800x450', label: '800 x 450 (Kecil Asli)', width: 800, height: 450 }
        ];
        this.currentIdx = 0; // Default Auto-fit full view
        try {
            const saved = localStorage.getItem('template_game_resolution');
            if (saved) {
                const foundIdx = this.resolutions.findIndex(r => r.id === saved);
                if (foundIdx !== -1) this.currentIdx = foundIdx;
            }
        } catch (e) {}

        this.applyResolution();
        window.addEventListener('resize', () => {
            if (this.resolutions[this.currentIdx].id === 'fit') {
                this.applyResolution();
            }
        });
    }

    static get current() {
        this.init();
        return this.resolutions[this.currentIdx];
    }

    static cycleNext() {
        this.init();
        this.currentIdx = (this.currentIdx + 1) % this.resolutions.length;
        try {
            localStorage.setItem('template_game_resolution', this.resolutions[this.currentIdx].id);
        } catch (e) {}
        this.applyResolution();
        return this.resolutions[this.currentIdx];
    }

    static applyResolution() {
        const container = document.getElementById('game-container');
        if (!container) return;
        const res = this.resolutions[this.currentIdx];
        if (res.id === 'fit') {
            container.style.width = '100vw';
            container.style.height = '100vh';
        } else {
            const maxW = window.innerWidth - 20;
            const maxH = window.innerHeight - 20;
            let w = res.width;
            let h = res.height;
            if (w > maxW || h > maxH) {
                const ratio = Math.min(maxW / w, maxH / h);
                w = Math.floor(w * ratio);
                h = Math.floor(h * ratio);
            }
            container.style.width = `${w}px`;
            container.style.height = `${h}px`;
        }
    }

    static toggleFullscreen(scene) {
        if (scene && scene.scale) {
            if (scene.scale.isFullscreen) {
                scene.scale.stopFullscreen();
            } else {
                scene.scale.startFullscreen();
            }
        } else {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
    }
}

DisplayManager.init();
