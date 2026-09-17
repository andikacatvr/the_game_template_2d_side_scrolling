// ===============================================================
// ⚙️ SETTINGS MANAGER (AUDIO, GAMEPLAY, DISPLAY & CONTROLS)
// ===============================================================
export const SettingsManager = {
    KEY: 'template_game_settings_v1',
    data: {
        musicVolume: 80,       // 0 - 100
        sfxVolume: 90,         // 0 - 100
        dialogueSpeedFast: false // false: Normal (OFF), true: Fast (ON)
    },

    init() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.data = { ...this.data, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    },

    save() {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    },

    get musicVolume() {
        return this.data.musicVolume;
    },
    setMusicVolume(val) {
        this.data.musicVolume = Math.max(0, Math.min(100, val));
        this.save();
    },

    get sfxVolume() {
        return this.data.sfxVolume;
    },
    setSfxVolume(val) {
        this.data.sfxVolume = Math.max(0, Math.min(100, val));
        this.save();
    },

    get dialogueSpeedFast() {
        return !!this.data.dialogueSpeedFast;
    },
    toggleDialogueSpeed() {
        this.data.dialogueSpeedFast = !this.data.dialogueSpeedFast;
        this.save();
        return this.data.dialogueSpeedFast;
    }
};

SettingsManager.init();
