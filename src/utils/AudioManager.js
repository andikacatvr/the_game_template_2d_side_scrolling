import { SettingsManager } from './SettingsManager.js';

// ===============================================================
// AUDIO MANAGER (SYNTHESIZED SFX & AMBIENT BGM)
// Web Audio API Procedural Synthesizer tanpa butuh file audio eksternal!
// ===============================================================
class AudioManagerClass {
    constructor() {
        this.ctx = null;
        this.bgmTimer = null;
        this.bgmActive = false;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    get sfxGain() {
        return (SettingsManager.sfxVolume / 100);
    }

    get musicGain() {
        return (SettingsManager.musicVolume / 100);
    }

    // SFX 1: Jump (rising cheerful chirp)
    playJump() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

        gain.gain.setValueAtTime(0.25 * this.sfxGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    // SFX 2: Coin (retro bright 2-tone)
    playCoin() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.28 * this.sfxGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // SFX 3: Hurt / Spike (crunchy bass hit)
    playHurt() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);

        gain.gain.setValueAtTime(0.35 * this.sfxGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    // SFX 4: Dialogue Blip (subtle typewriter pip)
    playDialogBeep() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420 + Math.random() * 60, now);

        gain.gain.setValueAtTime(0.08 * this.sfxGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // SFX 5: UI Click
    playClick() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.15 * this.sfxGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    // SFX 6: Success / Level Complete
    playSuccess() {
        this.init();
        if (!this.ctx || this.sfxGain <= 0) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.28 * this.sfxGain, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.38);
        });
    }

    // Ambient Gentle BGM Generator (Looping peaceful chords)
    startAmbientBGM() {
        if (this.bgmActive) return;
        this.bgmActive = true;
        this.init();

        const chords = [
            [261.63, 329.63, 392.00], // C
            [220.00, 261.63, 329.63], // Am
            [174.61, 220.00, 261.63], // F
            [196.00, 246.94, 293.66]  // G
        ];
        let chordIdx = 0;

        const playNextChord = () => {
            if (!this.bgmActive) return;
            if (this.ctx && this.musicGain > 0) {
                const now = this.ctx.currentTime;
                const chord = chords[chordIdx];
                chord.forEach((freq) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);

                    gain.gain.setValueAtTime(0.001, now);
                    gain.gain.linearRampToValueAtTime(0.035 * this.musicGain, now + 1.2);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 4.0);
                });
            }
            chordIdx = (chordIdx + 1) % chords.length;
            this.bgmTimer = setTimeout(playNextChord, 4000);
        };

        playNextChord();
    }

    stopAmbientBGM() {
        this.bgmActive = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

export const AudioManager = new AudioManagerClass();
