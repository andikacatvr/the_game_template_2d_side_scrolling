import Phaser from 'phaser';
import { CONFIG_SKELETON, DAFTAR_MAP } from '../../cerita.js';
import { hexToNum } from '../utils/helpers.js';
import bgScene1 from '../assets/bg_scene1.png';
import bgTitle from '../assets/bg_title.jpg';
import titleLogo from '../assets/title_logo.png';
import npcPortrait from '../assets/npc_portrait.png';
import npcFireflyImg from '../assets/npc_firefly.png';

// ===============================================================
// 1. BOOT SCENE: TEXTURE GENERATOR (POLOSAN / SKELETON)
// ===============================================================
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.image('bg_scene1', bgScene1);
        this.load.image('bg_title', bgTitle);
        this.load.image('title_logo', titleLogo);
        this.load.image('npc_portrait', npcPortrait);
        this.load.image('npc_firefly', npcFireflyImg);

        // Hong Kong Victoria Harbour Parallax Assets
        this.load.image('hk_layer_1_sky', '/assets/hongkong/layer_1_sky_500.png');
        this.load.image('hk_layer_2_city', '/assets/hongkong/layer_2_city_500.png');
        this.load.image('hk_layer_3_boat', '/assets/hongkong/layer_3_boat_scaled.png');
        this.load.image('hk_layer_4_waves', '/assets/hongkong/layer_4_waves_500.png');
        this.load.image('hk_layer_5_pier', '/assets/hongkong/layer_5_pier_500.png');

        // ⭐ Aset Murid: Karakter (Drop & Play)
        if (CONFIG_SKELETON.player && CONFIG_SKELETON.player.gambar) {
            const fileName = CONFIG_SKELETON.player.gambar.replace(/^\/+/, '');
            this.load.image('custom_player', `/aset_murid/${fileName}`);
        }

        // ⭐ Aset Murid: Background dari DAFTAR_MAP
        if (Array.isArray(DAFTAR_MAP)) {
            DAFTAR_MAP.forEach(m => {
                if (m.background && typeof m.background === 'string' && m.background.trim() !== '') {
                    const cleanBg = m.background.replace(/^\/+/, '');
                    if (cleanBg !== 'bg_scene1' && cleanBg !== 'bg_scene1.png') {
                        const path = cleanBg.includes('/') ? `/${cleanBg}` : `/aset_murid/${cleanBg}`;
                        this.load.image(m.id + '_bg', path);
                    }
                }
            });
        }
    }

    create() {
        this.generateSkeletonTextures();
        const urlParams = new URLSearchParams(window.location.search);
        const sceneParam = urlParams.get('scene');
        if (sceneParam && this.scene.manager.getScene(sceneParam)) {
            this.scene.start(sceneParam);
            return;
        }
        this.scene.start('TitleScene');
    }

    generateSkeletonTextures() {
        // Player (Minimalist Hero Box)
        const pColor = hexToNum(CONFIG_SKELETON.player.warna, 0x38bdf8);
        if (this.textures.exists('skeleton_player')) {
            this.textures.remove('skeleton_player');
        }
        const pG = this.make.graphics({ x: 0, y: 0, add: false });
        pG.fillStyle(pColor, 1);
        pG.fillRoundedRect(0, 0, 32, 44, 5);
        pG.lineStyle(1.5, 0xffffff, 0.9);
        pG.strokeRoundedRect(0, 0, 32, 44, 5);
        // Eyes
        pG.fillStyle(0xffffff, 1);
        pG.fillRect(6, 12, 7, 7);
        pG.fillRect(19, 12, 7, 7);
        pG.fillStyle(0x0f172a, 1);
        pG.fillRect(9, 14, 4, 4);
        pG.fillRect(22, 14, 4, 4);
        pG.generateTexture('skeleton_player', 32, 44);

        // ===============================================================
        // TILESET TANAH & PLATFORM BERSALJU (SNOW & PERMAFROST)
        // ===============================================================
        
        // 1. Tile Salju Tengah (tile_grass_mid / snow ground)
        const tgMid = this.make.graphics({ x: 0, y: 0, add: false });
        tgMid.fillStyle(0x111a2c, 1); // Tanah beku gelap (permafrost)
        tgMid.fillRect(0, 0, 32, 32);
        // Bayangan bawah tumpukan salju
        tgMid.fillStyle(0x475569, 1);
        tgMid.fillRect(0, 0, 32, 10);
        // Salju dasar biru-putih
        tgMid.fillStyle(0x94a3b8, 1);
        tgMid.fillRect(0, 0, 32, 7);
        // Lapisan salju putih tebal
        tgMid.fillStyle(0xe2e8f0, 1);
        tgMid.fillRect(0, 0, 32, 5);
        // Kilau salju murni paling atas
        tgMid.fillStyle(0xffffff, 1);
        tgMid.fillRect(0, 0, 32, 3);
        // Gundukan salju kecil
        tgMid.fillStyle(0xe2e8f0, 1);
        tgMid.fillRect(3, 5, 5, 2);
        tgMid.fillRect(14, 5, 6, 3);
        tgMid.fillRect(25, 5, 4, 2);
        // Kristal es kecil di dalam tanah beku
        tgMid.fillStyle(0x1e2d42, 1);
        tgMid.fillRect(8, 16, 5, 4);
        tgMid.fillRect(22, 22, 6, 4);
        tgMid.fillStyle(0x38bdf8, 0.6); // kilau es
        tgMid.fillRect(9, 17, 2, 2);
        tgMid.fillRect(24, 23, 2, 2);
        tgMid.generateTexture('tile_grass_mid', 32, 32);

        // 2. Tile Salju Kiri (tile_grass_left - tebing salju kiri)
        const tgLeft = this.make.graphics({ x: 0, y: 0, add: false });
        tgLeft.fillStyle(0x111a2c, 1);
        tgLeft.fillRoundedRect(0, 0, 32, 32, { tl: 6, bl: 4, tr: 0, br: 0 });
        tgLeft.fillStyle(0x475569, 1);
        tgLeft.fillRoundedRect(0, 0, 32, 10, { tl: 6, tr: 0, bl: 0, br: 0 });
        tgLeft.fillStyle(0x94a3b8, 1);
        tgLeft.fillRoundedRect(0, 0, 32, 7, { tl: 6, tr: 0, bl: 0, br: 0 });
        tgLeft.fillStyle(0xe2e8f0, 1);
        tgLeft.fillRoundedRect(0, 0, 32, 5, { tl: 6, tr: 0, bl: 0, br: 0 });
        tgLeft.fillStyle(0xffffff, 1);
        tgLeft.fillRoundedRect(0, 0, 32, 3, { tl: 6, tr: 0, bl: 0, br: 0 });
        // Salju menggantung di tebing kiri
        tgLeft.fillStyle(0xe2e8f0, 1);
        tgLeft.fillRect(0, 5, 4, 5);
        tgLeft.fillRect(10, 5, 5, 3);
        tgLeft.fillStyle(0x38bdf8, 0.6);
        tgLeft.fillRect(14, 18, 4, 3);
        tgLeft.generateTexture('tile_grass_left', 32, 32);

        // 3. Tile Salju Kanan (tile_grass_right - tebing salju kanan)
        const tgRight = this.make.graphics({ x: 0, y: 0, add: false });
        tgRight.fillStyle(0x111a2c, 1);
        tgRight.fillRoundedRect(0, 0, 32, 32, { tr: 6, br: 4, tl: 0, bl: 0 });
        tgRight.fillStyle(0x475569, 1);
        tgRight.fillRoundedRect(0, 0, 32, 10, { tr: 6, tl: 0, bl: 0, br: 0 });
        tgRight.fillStyle(0x94a3b8, 1);
        tgRight.fillRoundedRect(0, 0, 32, 7, { tr: 6, tl: 0, bl: 0, br: 0 });
        tgRight.fillStyle(0xe2e8f0, 1);
        tgRight.fillRoundedRect(0, 0, 32, 5, { tr: 6, tl: 0, bl: 0, br: 0 });
        tgRight.fillStyle(0xffffff, 1);
        tgRight.fillRoundedRect(0, 0, 32, 3, { tr: 6, tl: 0, bl: 0, br: 0 });
        // Salju menggantung di tebing kanan
        tgRight.fillStyle(0xe2e8f0, 1);
        tgRight.fillRect(28, 5, 4, 5);
        tgRight.fillRect(18, 5, 5, 3);
        tgRight.fillStyle(0x38bdf8, 0.6);
        tgRight.fillRect(10, 20, 4, 3);
        tgRight.generateTexture('tile_grass_right', 32, 32);

        // 4. Tile Tanah Beku Bawah (tile_dirt_sub)
        const tgDirt = this.make.graphics({ x: 0, y: 0, add: false });
        tgDirt.fillStyle(0x0a101d, 1); // Tanah dalam dingin beku
        tgDirt.fillRect(0, 0, 32, 32);
        tgDirt.fillStyle(0x141f30, 1);
        tgDirt.fillRect(4, 4, 10, 8);
        tgDirt.fillRect(18, 14, 10, 10);
        tgDirt.fillStyle(0x1f2e45, 1);
        tgDirt.fillRect(6, 6, 4, 3);
        tgDirt.fillRect(20, 16, 5, 4);
        tgDirt.fillStyle(0x38bdf8, 0.4); // Kristal es
        tgDirt.fillRect(7, 7, 2, 2);
        tgDirt.fillRect(21, 17, 2, 2);
        tgDirt.generateTexture('tile_dirt_sub', 32, 32);

        // 5. Floating Platform Tiles dengan Salju di Atasnya
        // Mid
        const tpMid = this.make.graphics({ x: 0, y: 0, add: false });
        tpMid.fillStyle(0x1e293b, 1); // Batu slate dingin
        tpMid.fillRect(0, 0, 32, 24);
        // Tumpukan salju di atas platform
        tpMid.fillStyle(0x94a3b8, 1);
        tpMid.fillRect(0, 0, 32, 6);
        tpMid.fillStyle(0xe2e8f0, 1);
        tpMid.fillRect(0, 0, 32, 4);
        tpMid.fillStyle(0xffffff, 1);
        tpMid.fillRect(0, 0, 32, 2);
        // Icicles kecil menggantung
        tpMid.fillStyle(0xe2e8f0, 0.9);
        tpMid.fillRect(8, 6, 2, 3);
        tpMid.fillRect(22, 6, 2, 4);
        tpMid.lineStyle(1, 0x0f172a, 0.8);
        tpMid.strokeRect(0, 6, 32, 18);
        tpMid.generateTexture('tile_plat_mid', 32, 24);

        // Left Cap
        const tpLeft = this.make.graphics({ x: 0, y: 0, add: false });
        tpLeft.fillStyle(0x1e293b, 1);
        tpLeft.fillRoundedRect(0, 0, 32, 24, { tl: 5, bl: 5, tr: 0, br: 0 });
        tpLeft.fillStyle(0x94a3b8, 1);
        tpLeft.fillRoundedRect(0, 0, 32, 6, { tl: 5, tr: 0, bl: 0, br: 0 });
        tpLeft.fillStyle(0xe2e8f0, 1);
        tpLeft.fillRoundedRect(0, 0, 32, 4, { tl: 5, tr: 0, bl: 0, br: 0 });
        tpLeft.fillStyle(0xffffff, 1);
        tpLeft.fillRoundedRect(0, 0, 32, 2, { tl: 5, tr: 0, bl: 0, br: 0 });
        tpLeft.fillStyle(0xe2e8f0, 0.9);
        tpLeft.fillRect(14, 6, 2, 3);
        tpLeft.lineStyle(1, 0x0f172a, 0.8);
        tpLeft.strokeRoundedRect(0, 6, 32, 18, { tl: 5, bl: 5, tr: 0, br: 0 });
        tpLeft.generateTexture('tile_plat_left', 32, 24);

        // Right Cap
        const tpRight = this.make.graphics({ x: 0, y: 0, add: false });
        tpRight.fillStyle(0x1e293b, 1);
        tpRight.fillRoundedRect(0, 0, 32, 24, { tr: 5, br: 5, tl: 0, bl: 0 });
        tpRight.fillStyle(0x94a3b8, 1);
        tpRight.fillRoundedRect(0, 0, 32, 6, { tr: 5, tl: 0, bl: 0, br: 0 });
        tpRight.fillStyle(0xe2e8f0, 1);
        tpRight.fillRoundedRect(0, 0, 32, 4, { tr: 5, tl: 0, bl: 0, br: 0 });
        tpRight.fillStyle(0xffffff, 1);
        tpRight.fillRoundedRect(0, 0, 32, 2, { tr: 5, tl: 0, bl: 0, br: 0 });
        tpRight.fillStyle(0xe2e8f0, 0.9);
        tpRight.fillRect(18, 6, 2, 3);
        tpRight.lineStyle(1, 0x0f172a, 0.8);
        tpRight.strokeRoundedRect(0, 6, 32, 18, { tr: 5, br: 5, tl: 0, bl: 0 });
        tpRight.generateTexture('tile_plat_right', 32, 24);

        // Fallback backward compatibility textures
        const gG = this.make.graphics({ x: 0, y: 0, add: false });
        gG.fillStyle(0x111a2c, 1);
        gG.fillRect(0, 0, 400, 32);
        gG.fillStyle(0xe2e8f0, 1);
        gG.fillRect(0, 0, 400, 6);
        gG.fillStyle(0xffffff, 1);
        gG.fillRect(0, 0, 400, 2);
        gG.generateTexture('skeleton_ground', 400, 32);

        const bG = this.make.graphics({ x: 0, y: 0, add: false });
        bG.fillStyle(0x1e293b, 1);
        bG.fillRoundedRect(0, 0, 130, 24, 4);
        bG.fillStyle(0xe2e8f0, 1);
        bG.fillRoundedRect(0, 0, 130, 4, 2);
        bG.lineStyle(2, 0x334155, 1);
        bG.strokeRoundedRect(0, 0, 130, 24, 4);
        bG.generateTexture('skeleton_platform', 130, 24);

        // Collectible Item (Koin Emas)
        const coinG = this.make.graphics({ x: 0, y: 0, add: false });
        coinG.fillStyle(0xf59e0b, 1);
        coinG.fillCircle(12, 12, 11);
        coinG.fillStyle(0xfde047, 1);
        coinG.fillCircle(12, 12, 7);
        coinG.fillStyle(0xffffff, 0.8);
        coinG.fillRect(8, 8, 4, 4);
        coinG.generateTexture('skeleton_item', 24, 24);

        // Test Hazard Duri
        const hazG = this.make.graphics({ x: 0, y: 0, add: false });
        hazG.fillStyle(0xef4444, 1);
        hazG.beginPath();
        hazG.moveTo(0, 24);
        hazG.lineTo(12, 0);
        hazG.lineTo(24, 24);
        hazG.closePath();
        hazG.fillPath();
        hazG.generateTexture('skeleton_hazard', 24, 24);

        // NPC (Mysterious Purple Elder Box)
        const npcColor = hexToNum(CONFIG_SKELETON.npc?.warna || '#a855f7', 0xa855f7);
        if (this.textures.exists('skeleton_npc')) {
            this.textures.remove('skeleton_npc');
        }
        const npcG = this.make.graphics({ x: 0, y: 0, add: false });
        npcG.fillStyle(npcColor, 1);
        npcG.fillRoundedRect(0, 0, 32, 44, 5);
        npcG.lineStyle(1.5, 0xd8b4fe, 0.9);
        npcG.strokeRoundedRect(0, 0, 32, 44, 5);
        // Hood / Hat accent
        npcG.fillStyle(0x581c87, 1);
        npcG.fillRect(0, 0, 32, 10);
        // Eyes
        npcG.fillStyle(0xfde047, 1); // Glowing golden eyes
        npcG.fillRect(7, 14, 6, 6);
        npcG.fillRect(19, 14, 6, 6);
        npcG.generateTexture('skeleton_npc', 32, 44);

        // Portal / Gerbang Level (Archway with glowing crystal core)
        const portG = this.make.graphics({ x: 0, y: 0, add: false });
        // Outer stone arch
        portG.fillStyle(0x1e293b, 1);
        portG.fillRoundedRect(0, 0, 44, 60, 10);
        portG.lineStyle(2, 0x38bdf8, 0.8);
        portG.strokeRoundedRect(0, 0, 44, 60, 10);
        // Inner portal glow
        portG.fillStyle(0x0284c7, 0.7);
        portG.fillRoundedRect(6, 8, 32, 46, 8);
        portG.fillStyle(0x38bdf8, 0.9);
        portG.fillCircle(22, 30, 9);
        portG.fillStyle(0xffffff, 1);
        portG.fillCircle(22, 30, 4);
        portG.generateTexture('skeleton_portal', 44, 60);

        // ===============================================================
        // DUNGEON ENEMY (Prajurit Kegelapan — Merah Gelap 32×44)
        // ===============================================================
        const enemyG = this.make.graphics({ x: 0, y: 0, add: false });
        // Tubuh
        enemyG.fillStyle(0x7f1d1d, 1); // merah tua
        enemyG.fillRoundedRect(0, 0, 32, 44, 5);
        enemyG.lineStyle(1.5, 0xfca5a5, 0.9);
        enemyG.strokeRoundedRect(0, 0, 32, 44, 5);
        // Helm besi
        enemyG.fillStyle(0x450a0a, 1);
        enemyG.fillRect(0, 0, 32, 12);
        enemyG.fillStyle(0x7f1d1d, 1);
        enemyG.fillRect(4, 8, 24, 6);
        // Mata merah menyala
        enemyG.fillStyle(0xff0000, 1);
        enemyG.fillRect(7,  14, 6, 6);
        enemyG.fillRect(19, 14, 6, 6);
        enemyG.fillStyle(0xff6666, 1);
        enemyG.fillRect(9,  16, 3, 3);
        enemyG.fillRect(21, 16, 3, 3);
        // Senjata pedang kecil di sisi kanan
        enemyG.fillStyle(0x9ca3af, 1);
        enemyG.fillRect(29, 20, 4, 16);
        enemyG.fillRect(26, 20, 10, 3);
        enemyG.generateTexture('dungeon_enemy', 32, 44);

        // ===============================================================
        // DUNGEON RANGED MAGE (Penyihir Kegelapan — Jubah Ungu 32×44)
        // ===============================================================
        if (this.textures.exists('dungeon_mage')) this.textures.remove('dungeon_mage');
        const mageG = this.make.graphics({ x: 0, y: 0, add: false });
        mageG.fillStyle(0x3b0764, 1);
        mageG.fillRoundedRect(0, 0, 32, 44, 5);
        mageG.lineStyle(1.5, 0xc084fc, 0.9);
        mageG.strokeRoundedRect(0, 0, 32, 44, 5);
        // Hood / Tudung
        mageG.fillStyle(0x581c87, 1);
        mageG.fillRect(0, 0, 32, 14);
        // Mata Cyan Menyala
        mageG.fillStyle(0x38bdf8, 1);
        mageG.fillRect(7,  14, 6, 6);
        mageG.fillRect(19, 14, 6, 6);
        mageG.fillStyle(0xffffff, 1);
        mageG.fillRect(9,  16, 2, 2);
        mageG.fillRect(21, 16, 2, 2);
        // Tongkat Sihir
        mageG.fillStyle(0x78350f, 1);
        mageG.fillRect(28, 12, 3, 26);
        mageG.fillStyle(0xd946ef, 1);
        mageG.fillCircle(29, 10, 5);
        mageG.fillStyle(0xffffff, 0.9);
        mageG.fillCircle(29, 10, 2);
        mageG.generateTexture('dungeon_mage', 32, 44);

        // Proyektil Bola Sihir Musuh (proj_dark_orb 16×16)
        if (this.textures.exists('proj_dark_orb')) this.textures.remove('proj_dark_orb');
        const orbG = this.make.graphics({ x: 0, y: 0, add: false });
        orbG.fillStyle(0x7e22ce, 0.45);
        orbG.fillCircle(8, 8, 8);
        orbG.fillStyle(0xd946ef, 0.85);
        orbG.fillCircle(8, 8, 5.5);
        orbG.fillStyle(0xffffff, 1);
        orbG.fillCircle(8, 8, 2.5);
        orbG.generateTexture('proj_dark_orb', 16, 16);

        // ===============================================================
        // WEAPON TEXTURES (Senjata yang bisa dipungut player)
        // ===============================================================

        // 1. PEDANG (weapon_sword) — 20×48px, blade perak, guard emas
        const swG = this.make.graphics({ x: 0, y: 0, add: false });
        // Handle
        swG.fillStyle(0x92400e, 1);
        swG.fillRoundedRect(7, 34, 6, 14, 2);
        // Guard (cross-guard)
        swG.fillStyle(0xfbbf24, 1);
        swG.fillRect(0, 31, 20, 5);
        swG.lineStyle(1, 0xf59e0b, 1);
        swG.strokeRect(0, 31, 20, 5);
        // Blade
        swG.fillStyle(0xe2e8f0, 1);
        swG.fillRect(8, 4, 4, 28);
        // Blade edge highlight
        swG.fillStyle(0xffffff, 1);
        swG.fillRect(9, 4, 2, 26);
        // Tip
        swG.fillStyle(0xe2e8f0, 1);
        swG.fillTriangle(8, 4, 12, 4, 10, 0);
        swG.generateTexture('weapon_sword', 20, 48);

        // 2. KAPAK (weapon_axe) — 32×40px, kepala kapak abu besi
        const axG = this.make.graphics({ x: 0, y: 0, add: false });
        // Gagang
        axG.fillStyle(0x78350f, 1);
        axG.fillRect(13, 10, 6, 30);
        // Kepala kapak
        axG.fillStyle(0x6b7280, 1);
        axG.fillTriangle(4, 2, 20, 10, 4, 22);
        axG.fillRect(4, 2, 16, 20);
        axG.fillStyle(0x9ca3af, 1);
        axG.fillTriangle(4, 2, 20, 2, 20, 10);
        // Edge highlight
        axG.fillStyle(0xe5e7eb, 1);
        axG.fillRect(4, 3, 3, 18);
        // Spike kecil di atas
        axG.fillStyle(0x6b7280, 1);
        axG.fillTriangle(14, 0, 18, 0, 16, 4);
        axG.generateTexture('weapon_axe', 32, 40);

        // 3. BUSUR (weapon_bow) — 16×44px, kayu cokelat + tali
        const bwG = this.make.graphics({ x: 0, y: 0, add: false });
        // Badan busur (arc)
        bwG.lineStyle(3, 0x92400e, 1);
        bwG.beginPath();
        bwG.arc(16, 22, 14, Math.PI * 0.55, Math.PI * 1.45, false);
        bwG.strokePath();
        // Tali
        bwG.lineStyle(1.5, 0xfef3c7, 1);
        bwG.beginPath();
        bwG.moveTo(7, 6);
        bwG.lineTo(7, 38);
        bwG.strokePath();
        bwG.generateTexture('weapon_bow', 20, 44);

        // 4. EFEK SLASH — 48×48px transparan dgn goresan putih/biru
        const slashG = this.make.graphics({ x: 0, y: 0, add: false });
        slashG.lineStyle(3, 0xffffff, 0.9);
        slashG.beginPath();
        slashG.moveTo(4, 44);
        slashG.lineTo(44, 4);
        slashG.strokePath();
        slashG.lineStyle(5, 0x60a5fa, 0.5);
        slashG.beginPath();
        slashG.moveTo(8, 44);
        slashG.lineTo(44, 8);
        slashG.strokePath();
        slashG.lineStyle(2, 0xffffff, 0.4);
        slashG.beginPath();
        slashG.moveTo(2, 38);
        slashG.lineTo(38, 2);
        slashG.strokePath();
        slashG.generateTexture('fx_slash', 48, 48);

        // 5. PROYEKTIL PANAH — 16×6px horizontal
        const arrG = this.make.graphics({ x: 0, y: 0, add: false });
        arrG.fillStyle(0xfef3c7, 1);
        arrG.fillRect(2, 2, 10, 2);
        arrG.fillStyle(0x92400e, 1);
        arrG.fillRect(0, 1, 4, 4);
        arrG.fillStyle(0x60a5fa, 0.9);
        arrG.fillTriangle(12, 0, 16, 3, 12, 6);
        arrG.generateTexture('proj_arrow', 16, 6);

        // ===============================================================
        // EFEK EMBUN & KABUT (DEW & MIST TEXTURES)
        // ===============================================================
        
        // 1. Dew Droplet Kecil (8x8)
        const dewSm = this.make.graphics({ x: 0, y: 0, add: false });
        dewSm.lineStyle(1, 0x0f172a, 0.35);
        dewSm.strokeCircle(4, 4, 3);
        dewSm.fillStyle(0xe2e8f0, 0.28);
        dewSm.fillCircle(4, 4, 3);
        dewSm.fillStyle(0xffffff, 0.9);
        dewSm.fillRect(2, 2, 2, 2);
        dewSm.generateTexture('fx_dew_drop_sm', 8, 8);

        // 2. Dew Droplet Sedang (16x16)
        const dewMd = this.make.graphics({ x: 0, y: 0, add: false });
        dewMd.lineStyle(1.5, 0x0f172a, 0.4);
        dewMd.strokeCircle(8, 8, 6.5);
        dewMd.fillStyle(0xe2e8f0, 0.22);
        dewMd.fillCircle(8, 8, 6.5);
        dewMd.fillStyle(0xffffff, 0.95);
        dewMd.fillCircle(6, 6, 2);
        dewMd.fillStyle(0x94a3b8, 0.3);
        dewMd.fillCircle(10, 10, 2);
        dewMd.generateTexture('fx_dew_drop_md', 16, 16);

        // 3. Dew Droplet Besar / Teardrop (20x26)
        const dewLg = this.make.graphics({ x: 0, y: 0, add: false });
        dewLg.lineStyle(1.5, 0x0f172a, 0.45);
        dewLg.strokeRoundedRect(2, 2, 16, 22, 8);
        dewLg.fillStyle(0xe2e8f0, 0.22);
        dewLg.fillRoundedRect(2, 2, 16, 22, 8);
        dewLg.fillStyle(0xffffff, 0.95);
        dewLg.fillCircle(7, 7, 2.5);
        dewLg.fillStyle(0xffffff, 0.45);
        dewLg.fillCircle(12, 16, 2);
        dewLg.generateTexture('fx_dew_drop_lg', 20, 26);

        // 4. Kabut / Mist Cloud Soft (240x80)
        const mistG = this.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 5; i++) {
            const alpha = 0.04 - i * 0.006;
            mistG.fillStyle(0xc8d6e5, Math.max(0.008, alpha));
            mistG.fillEllipse(120, 40, 230 - i * 25, 75 - i * 10);
            mistG.fillEllipse(80, 45, 120 - i * 15, 60 - i * 8);
            mistG.fillEllipse(160, 35, 130 - i * 15, 65 - i * 8);
        }
        mistG.generateTexture('fx_mist_cloud', 240, 80);

        // 5. Partikel Butir Embun Halus (4x4)
        const dewPart = this.make.graphics({ x: 0, y: 0, add: false });
        dewPart.fillStyle(0xffffff, 0.7);
        dewPart.fillCircle(2, 2, 1.5);
        dewPart.generateTexture('fx_dew_part', 4, 4);

        // ===============================================================
        // SEAMLESS FOG TEXTURES (KABUT MENGALIR REALISTIS)
        // ===============================================================

        // 6. Dense Rolling Fog Texture (512x220)
        const fogCanvas = this.textures.createCanvas('fx_fog_dense', 512, 220);
        if (fogCanvas) {
            const fCtx = fogCanvas.context;
            const fogBlobs = [
                { cx: 80,  cy: 110, rx: 110, ry: 75, a: 0.22 },
                { cx: 210, cy: 125, rx: 135, ry: 85, a: 0.26 },
                { cx: 350, cy: 95,  rx: 125, ry: 75, a: 0.24 },
                { cx: 470, cy: 115, rx: 105, ry: 70, a: 0.22 },
                { cx: 140, cy: 150, rx: 95,  ry: 55, a: 0.18 },
                { cx: 290, cy: 75,  rx: 105, ry: 60, a: 0.17 },
                { cx: 420, cy: 140, rx: 115, ry: 65, a: 0.20 }
            ];

            fogBlobs.forEach(b => {
                [-512, 0, 512].forEach(ox => {
                    const x = b.cx + ox;
                    const grad = fCtx.createRadialGradient(x, b.cy, 8, x, b.cy, Math.max(b.rx, b.ry));
                    grad.addColorStop(0, `rgba(185, 210, 225, ${b.a})`);
                    grad.addColorStop(0.5, `rgba(160, 190, 210, ${b.a * 0.55})`);
                    grad.addColorStop(1, 'rgba(150, 180, 200, 0)');
                    fCtx.fillStyle = grad;
                    fCtx.beginPath();
                    fCtx.ellipse(x, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
                    fCtx.fill();
                });
            });
            fogCanvas.refresh();
        }

        // 7. Ground Fog Wisps (512x100) - Kabut Merayap di Permukaan Tanah
        const gFogCanvas = this.textures.createCanvas('fx_fog_ground', 512, 100);
        if (gFogCanvas) {
            const gCtx = gFogCanvas.context;
            const gBlobs = [
                { cx: 60,  cy: 65, rx: 95,  ry: 38, a: 0.30 },
                { cx: 180, cy: 55, rx: 115, ry: 42, a: 0.34 },
                { cx: 310, cy: 70, rx: 105, ry: 40, a: 0.32 },
                { cx: 440, cy: 60, rx: 110, ry: 38, a: 0.30 }
            ];
            gBlobs.forEach(b => {
                [-512, 0, 512].forEach(ox => {
                    const x = b.cx + ox;
                    const grad = gCtx.createRadialGradient(x, b.cy, 6, x, b.cy, Math.max(b.rx, b.ry));
                    grad.addColorStop(0, `rgba(200, 220, 235, ${b.a})`);
                    grad.addColorStop(0.6, `rgba(175, 200, 220, ${b.a * 0.5})`);
                    grad.addColorStop(1, 'rgba(175, 200, 220, 0)');
                    gCtx.fillStyle = grad;
                    gCtx.beginPath();
                    gCtx.ellipse(x, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
                    gCtx.fill();
                });
            });
            gFogCanvas.refresh();
        }

        // 8. Dynamic Rain Drop Texture (slanted sleek pixel rain)
        const rainG = this.make.graphics({ x: 0, y: 0, add: false });
        rainG.fillStyle(0x93c5fd, 0.75);
        rainG.fillRect(0, 0, 2, 12);
        rainG.fillStyle(0xffffff, 0.9);
        rainG.fillRect(0, 2, 1, 8);
        rainG.generateTexture('fx_rain_drop', 2, 12);

        // 9. Victoria Pearl Item (glowing circular pearl)
        const pearlG = this.make.graphics({ x: 0, y: 0, add: false });
        pearlG.fillStyle(0x38bdf8, 0.35);
        pearlG.fillCircle(14, 14, 14);
        pearlG.fillStyle(0xe0f2fe, 0.95);
        pearlG.fillCircle(14, 14, 9);
        pearlG.fillStyle(0xffffff, 1);
        pearlG.fillCircle(12, 11, 4);
        pearlG.generateTexture('hk_pearl_item', 28, 28);
    }
}
