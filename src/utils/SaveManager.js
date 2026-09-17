// ===============================================================
// SAVE & LOAD MANAGER (LOCALSTORAGE)
// ===============================================================
export const SaveManager = {
    KEY: 'template_game_save_v1',
    save(data) {
        try {
            const payload = {
                ...data,
                timestamp: Date.now(),
                dateStr: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            };
            localStorage.setItem(this.KEY, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.error('Save error:', e);
            return false;
        }
    },
    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Load error:', e);
            return null;
        }
    },
    hasSave() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            return !!data && typeof data === 'object';
        } catch (e) {
            return false;
        }
    },
    clear() {
        try {
            localStorage.removeItem(this.KEY);
        } catch (e) {}
    }
};
