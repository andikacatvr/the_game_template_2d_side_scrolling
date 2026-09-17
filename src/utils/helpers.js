import Phaser from 'phaser';

// Typography System
export const FONT_TITLE = '"Grenze Gotisch", cursive, serif';
export const FONT_BODY = '"Jost", "Segoe UI", sans-serif';
export const FONT_CLEAN = '"Jost", sans-serif';

// High-DPI Super-Sampling untuk teks tajam bebas blur
if (typeof Phaser !== 'undefined' && Phaser.GameObjects) {
    if (Phaser.GameObjects.Text) {
        const origSetStyle = Phaser.GameObjects.Text.prototype.setStyle;
        Phaser.GameObjects.Text.prototype.setStyle = function (style, updateText, setDefaults) {
            if (!style) style = {};
            if (!style.fontFamily) style.fontFamily = FONT_BODY;
            if (style.resolution === undefined) {
                style.resolution = Math.max(3, (window.devicePixelRatio || 1) * 2);
            }
            return origSetStyle.call(this, style, updateText, setDefaults);
        };
    }

    if (Phaser.GameObjects.GameObjectFactory && Phaser.GameObjects.GameObjectFactory.prototype.text) {
        const origFactoryText = Phaser.GameObjects.GameObjectFactory.prototype.text;
        Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
            style = style || {};
            if (!style.fontFamily) style.fontFamily = FONT_BODY;
            if (style.resolution === undefined) {
                style.resolution = Math.max(3, (window.devicePixelRatio || 1) * 2);
            }
            const textObj = origFactoryText.call(this, x, y, text, style);
            if (textObj && textObj.setResolution) {
                textObj.setResolution(style.resolution);
            }
            return textObj;
        };
    }
}

export function hexToNum(input, defaultHex = 0x38bdf8) {
    if (input === undefined || input === null || input === '') return defaultHex;
    if (typeof input === 'number') return input;

    const str = String(input).trim().toLowerCase();

    // 1. Dukungan nama warna bahasa Indonesia
    const kamusWarna = {
        'merah': 0xef4444,
        'biru': 0x3b82f6,
        'hijau': 0x22c55e,
        'kuning': 0xfacc15,
        'ungu': 0xa855f7,
        'putih': 0xffffff,
        'hitam': 0x0f172a,
        'oranye': 0xf97316,
        'jingga': 0xf97316,
        'pink': 0xec4899,
        'merah muda': 0xec4899,
        'abu-abu': 0x64748b,
        'abu': 0x64748b,
        'emas': 0xf59e0b,
        'cokelat': 0x78350f,
        'coklat': 0x78350f,
        'cyan': 0x06b6d4,
        'toska': 0x14b8a6,
        'tosca': 0x14b8a6
    };
    if (kamusWarna[str]) return kamusWarna[str];

    // 2. Bersihkan prefix (# atau 0x)
    let hex = str.replace(/^#/, '').replace(/^0x/, '');

    // 3. Normalisasi format Hex (8-digit #RRGGBBAA, 4-digit #RGBA, 3-digit #RGB, 6-digit #RRGGBB)
    if (hex.length === 8 && /^[0-9a-f]{8}$/i.test(hex)) {
        // Buang 2 digit alpha di akhir (misal: #fffb00ff -> fffb00)
        hex = hex.slice(0, 6);
    } else if (hex.length === 4 && /^[0-9a-f]{4}$/i.test(hex)) {
        // Ambil 3 karakter RGB, abaikan alpha, lalu expand
        hex = hex.slice(0, 3).split('').map(c => c + c).join('');
    } else if (hex.length === 3 && /^[0-9a-f]{3}$/i.test(hex)) {
        // Expand 3-digit shorthand #RGB -> #RRGGBB
        hex = hex.split('').map(c => c + c).join('');
    }

    // Jika valid 6 digit hex
    if (/^[0-9a-f]{6}$/i.test(hex)) {
        const num = parseInt(hex, 16);
        return isNaN(num) ? defaultHex : num;
    }

    // 4. Fallback ke Phaser Color untuk nama CSS (misal: 'gold', 'royalblue', 'crimson', rgb(...))
    try {
        if (typeof Phaser !== 'undefined' && Phaser.Display && Phaser.Display.Color) {
            const parsed = Phaser.Display.Color.ValueToColor(str);
            if (parsed && typeof parsed.color === 'number' && parsed.color > 0) {
                return parsed.color;
            }
        }
    } catch {
        // Abaikan
    }

    return defaultHex;
}

export function isMobileOrTablet() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();

    // 1. Deteksi mutlak Desktop / PC / Laptop (Windows, macOS Desktop, Linux Desktop) -> Wajib FALSE
    const isWindowsPC = /windows nt|win32|win64/i.test(ua);
    const isMacDesktop = /macintosh|mac os x/i.test(ua) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isLinuxDesktop = /linux/i.test(ua) && !/android/i.test(ua);

    if (isWindowsPC || isMacDesktop || isLinuxDesktop) {
        return false;
    }

    // 2. Deteksi Android, Tablet, iPad, & Mobile
    const isAndroid = /android/i.test(ua);
    const isIPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || /ipad/i.test(ua);
    const isMobilePhone = /iphone|ipod|blackberry|iemobile|opera mini|mobile|crios/i.test(ua);
    const isTabletUA = /tablet|silk|kindle/i.test(ua);

    return isAndroid || isIPad || isMobilePhone || isTabletUA;
}
