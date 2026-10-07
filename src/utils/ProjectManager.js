// ===============================================================
// PROJECT & MULTI-SCENE MANAGER
// ===============================================================
// Mengelola struktur hierarki Game:
// 1 Project -> Memiliki Banyak Scene (Level 1, Level 2, Level 3...)
// Mendukung penyimpanan lokal (localStorage), migrasi data lama,
// dan logika sekuensial portal antar-scene.
// ===============================================================

export class ProjectManager {
    static STORAGE_KEY = 'gt_projects';
    static LEGACY_WORLDS_KEY = 'gt_custom_worlds';

    /**
     * Mengambil semua project tersimpan, otomatis migrasi jika data lama ditemukan.
     * @returns {Array<Object>}
     */
    static getProjects() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw !== null) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    return list;
                }
            }
        } catch (e) {
            console.warn('[ProjectManager] Gagal membaca storage:', e);
        }

        // Jalankan migrasi dari legacy gt_custom_worlds hanya jika storage belum pernah ada (first-time init)
        return this.migrateLegacyWorlds();
    }

    /**
     * Simpan daftar project ke localStorage
     * @param {Array<Object>} projects 
     */
    static saveProjects(projects) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {
            console.error('[ProjectManager] Gagal menyimpan projects:', e);
        }
    }

    /**
     * Mengambil project berdasarkan ID
     * @param {string} projectId 
     * @returns {Object|null}
     */
    static getProject(projectId) {
        const projects = this.getProjects();
        return projects.find(p => p.id === projectId) || null;
    }

    /**
     * Membuat Project baru (wadah untuk banyak scene)
     * @param {string} name 
    /**
     * Menghasilkan kumpulan petak lava tidak beraturan (prosedural / irregular)
     * pada dua baris paling bawah dunia (Row 18 dan Row 19).
     * Posisi berubah-ubah dan acak setiap kali dunia/scene baru dibuat.
     * @param {number} totalCols Total petak horizontal (default 72 untuk 3600px)
     * @param {number} startRow Baris atas lava (default 18)
     * @param {number} endRow Baris bawah lava (default 19)
     * @returns {Array<Object>} Daftar entitas lava
     */
    static generateIrregularBottomLava(totalCols = 72, startRow = 18, endRow = 19) {
        const lavaEntities = [];
        let inPool = Math.random() > 0.3;
        let poolStep = 0;
        let poolLength = Math.floor(Math.random() * 5) + 3;

        for (let c = 0; c < totalCols; c++) {
            poolStep++;
            if (poolStep >= poolLength) {
                inPool = !inPool || (Math.random() > 0.3);
                poolStep = 0;
                poolLength = inPool ? (Math.floor(Math.random() * 6) + 3) : (Math.floor(Math.random() * 3) + 1);
            }

            // Tentukan kedalaman lava di kolom ini:
            // 0 = celah tanah alami (stepping ground)
            // 1 = lava di Row 19 saja (dangkal)
            // 2 = lava di Row 18 & Row 19 (kubangan lahar dalam)
            let depth = 0;
            if (inPool) {
                depth = (Math.random() > 0.32) ? 2 : 1;
            } else {
                if (Math.random() > 0.65) {
                    depth = 1;
                }
            }

            if (depth >= 1) {
                lavaEntities.push({
                    id: `lava_${c}_${endRow}`,
                    type: 'lava',
                    col: c,
                    row: endRow,
                    x: c * 50 + 25,
                    y: endRow * 50 + 25,
                    label: 'Lava Vulkanik',
                    cat: 'fluid',
                    icon: '🌋',
                    wTiles: 1,
                    hTiles: 1
                });
            }

            if (depth >= 2) {
                lavaEntities.push({
                    id: `lava_${c}_${startRow}`,
                    type: 'lava',
                    col: c,
                    row: startRow,
                    x: c * 50 + 25,
                    y: startRow * 50 + 25,
                    label: 'Lava Vulkanik',
                    cat: 'fluid',
                    icon: '🌋',
                    wTiles: 1,
                    hTiles: 1
                });
            }
        }

        return lavaEntities;
    }

    /**
     * Membuat project baru dengan scene awal bersih & lava acak di 2 baris bawah
     * @param {string} name 
     * @param {string} desc 
     * @returns {Object} project baru
     */
    static createProject(name = 'Petualangan Baru', desc = 'Game 2D multi-scene') {
        const projects = this.getProjects();
        const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        // Buat default scene pertama di dalam project baru (Full Dirt dengan lava acak di Row 18 & 19)
        const initialScene = {
            id: 'scene_' + Date.now() + '_1',
            name: 'Level 1 • Awal Petualangan',
            biome: 'dirt',
            bgType: 'color',
            bgColor: '#dcff78',
            worldWidth: 3600,
            worldHeight: 1000,
            hasLava: true,
            hasWater: false,
            hasSpikes: false,
            hasPlatforms: false,
            hasSlime: false,
            hasSkeleton: false,
            hasNpc: false,
            hasChest: false,
            hasCoins: false,
            hasPortal: true,
            terrainTiles: Array.from({ length: 72 }, (_, i) => `${i},8`),
            dugTiles: [],
            entities: [
                { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Letak Spawn (Pintu Putih)', cat: 'spawn', icon: '🚪', wTiles: 1, hTiles: 1 },
                { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 },
                ...this.generateIrregularBottomLava(72, 18, 19)
            ]
        };

        const newProject = {
            id,
            name: name.trim() || 'Petualangan Baru',
            desc: desc.trim() || 'Game 2D multi-scene',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            startingSceneId: initialScene.id,
            scenes: [initialScene]
        };

        projects.unshift(newProject);
        this.saveProjects(projects);
        return newProject;
    }

    /**
     * Menghapus sebuah project
     * @param {string} projectId 
     */
    static deleteProject(projectId) {
        let projects = this.getProjects();
        projects = projects.filter(p => p.id !== projectId);
        this.saveProjects(projects);

        // Bersihkan legacy worlds agar tidak dibangkitkan ulang saat project kosong
        try {
            localStorage.removeItem(this.LEGACY_WORLDS_KEY);
        } catch (e) {}
    }

    /**
     * Menambah scene baru ke dalam project tertentu
     * @param {string} projectId 
     * @param {Object} sceneData 
     * @returns {Object|null} scene baru
     */
    static addSceneToProject(projectId, sceneData = {}) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return null;

        const sceneId = sceneData.id || ('scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
        const sceneCount = (proj.scenes || []).length;

        const newScene = {
            ...sceneData,
            id: sceneId,
            name: sceneData.name || `Level ${sceneCount + 1} • Area Petualangan`,
            biome: sceneData.biome || 'dirt',
            bgType: sceneData.bgType || (sceneData.biome === 'hongkong' ? 'hongkong' : 'color'),
            bgColor: sceneData.bgColor || (sceneData.biome === 'hongkong' ? '#050813' : '#dcff78'),
            worldWidth: sceneData.worldWidth || 3600,
            worldHeight: sceneData.worldHeight || 1000,
            hasLava: true,
            hasWater: false,
            hasSpikes: false,
            hasPlatforms: false,
            hasSlime: false,
            hasSkeleton: false,
            hasNpc: false,
            hasChest: false,
            hasCoins: false,
            hasPortal: true,
            terrainTiles: sceneData.terrainTiles || Array.from({ length: 72 }, (_, i) => `${i},8`),
            dugTiles: sceneData.dugTiles || [],
            entities: Array.isArray(sceneData.entities) && sceneData.entities.length > 0
                ? sceneData.entities
                : [
                    { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Letak Spawn (Pintu Putih)', cat: 'spawn', icon: '🚪', wTiles: 1, hTiles: 1 },
                    { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 },
                    ...this.generateIrregularBottomLava(72, 18, 19)
                ]
        };

        if (!Array.isArray(proj.scenes)) proj.scenes = [];
        proj.scenes.push(newScene);

        if (!proj.startingSceneId) {
            proj.startingSceneId = sceneId;
        }

        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return newScene;
    }

    /**
     * Memperbarui data scene di dalam project
     * @param {string} projectId 
     * @param {string} sceneId 
     * @param {Object} updatedData 
     */
    static updateSceneInProject(projectId, sceneId, updatedData) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj || !Array.isArray(proj.scenes)) return false;

        const idx = proj.scenes.findIndex(s => s.id === sceneId);
        if (idx !== -1) {
            proj.scenes[idx] = {
                ...proj.scenes[idx],
                ...updatedData,
                id: sceneId
            };
            proj.updatedAt = Date.now();
            this.saveProjects(projects);
            return true;
        }
        return false;
    }

    /**
     * Menghapus scene dari dalam project
     * @param {string} projectId 
     * @param {string} sceneId 
     */
    static deleteSceneFromProject(projectId, sceneId) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj || !Array.isArray(proj.scenes)) return false;

        proj.scenes = proj.scenes.filter(s => s.id !== sceneId);

        // Jika starting scene yang dihapus, set ke scene pertama yang tersisa
        if (proj.startingSceneId === sceneId) {
            proj.startingSceneId = proj.scenes.length > 0 ? proj.scenes[0].id : null;
        }

        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Mengatur scene awal (starting level)
     * @param {string} projectId 
     * @param {string} sceneId 
     */
    static setStartingScene(projectId, sceneId) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return false;

        proj.startingSceneId = sceneId;
        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Mengubah nama dan deskripsi Project secara dinamis
     */
    static renameProject(projectId, name, desc = null) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return false;

        if (name && name.trim()) proj.name = name.trim();
        if (desc !== null) proj.desc = desc.trim();
        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Mengubah nama scene secara dinamis
     */
    static renameScene(projectId, sceneId, newName) {
        if (!newName || !newName.trim()) return false;
        return this.updateSceneInProject(projectId, sceneId, { name: newName.trim() });
    }

    /**
     * Mengubah quest scene/project secara dinamis
     */
    static updateSceneQuest(projectId, sceneId, questData) {
        return this.updateSceneInProject(projectId, sceneId, { quest: questData });
    }

    /**
     * Mengubah posisi urutan scene (Move Up / Move Down)
     */
    static moveScene(projectId, sceneId, direction = 'up') {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj || !Array.isArray(proj.scenes)) return false;

        const idx = proj.scenes.findIndex(s => s.id === sceneId);
        if (idx === -1) return false;

        const targetIdx = (direction === 'up') ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= proj.scenes.length) return false;

        // Swap posisi
        const temp = proj.scenes[idx];
        proj.scenes[idx] = proj.scenes[targetIdx];
        proj.scenes[targetIdx] = temp;

        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Duplikasi sebuah scene
     */
    static duplicateScene(projectId, sceneId) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj || !Array.isArray(proj.scenes)) return null;

        const target = proj.scenes.find(s => s.id === sceneId);
        if (!target) return null;

        const cloned = JSON.parse(JSON.stringify(target));
        cloned.id = 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        cloned.name = `${target.name || 'Level'} (Salinan)`;

        const originalIdx = proj.scenes.findIndex(s => s.id === sceneId);
        proj.scenes.splice(originalIdx + 1, 0, cloned);

        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return cloned;
    }

    /**
     * Menemukan scene berikutnya secara sekuensial (untuk portal warp)
     * @param {string} projectId 
     * @param {string} currentSceneId 
     * @returns {Object|null}
    /**
     * Menemukan scene berikutnya secara visual dari Flow Graph
     * @param {string} projectId 
     * @param {string} currentSceneId 
     * @returns {Object|null}
     */
    static getNextScene(projectId, currentSceneId) {
        const proj = this.getProject(projectId);
        if (!proj || !Array.isArray(proj.scenes) || proj.scenes.length <= 1) return null;

        // 1. Jika konfigurasi Flow Graph aktif (array connections ada):
        // Logika rute 100% dipatuhi sesuai garis kabel Flow Graph!
        if (proj.hasConfiguredFlowGraph || Array.isArray(proj.connections)) {
            const connections = Array.isArray(proj.connections) ? proj.connections : [];
            const conn = connections.find(c => c.fromSceneId === currentSceneId);
            if (conn && conn.toSceneId) {
                const target = proj.scenes.find(s => s.id === conn.toSceneId);
                if (target) return target;
            }
            // JIKA GARIS KABELNYA PUTUS / TIDAK TERHUBUNG KE SCENE LAIN:
            // Scene ini berhenti di sini dan TIDAK AKAN melompat ke scene berikutnya!
            return null;
        }

        // 2. Fallback sekuensial HANYA untuk project lawas yang belum pernah membuka Flow Graph
        const idx = proj.scenes.findIndex(s => s.id === currentSceneId);
        if (idx !== -1 && idx + 1 < proj.scenes.length) {
            return proj.scenes[idx + 1];
        }
        return null;
    }

    /**
     * Menyimpan data visual node flow graph (koneksi antar scene dan koordinat node)
     */
    static saveFlowGraph(projectId, { connections, positions }) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return false;

        if (Array.isArray(connections)) {
            proj.connections = connections;
            proj.hasConfiguredFlowGraph = true;
        }
        if (positions && typeof positions === 'object') {
            proj.flowGraphPositions = positions;
        }
        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Mengambil data koneksi dan posisi node flow graph
     */
    static getFlowGraph(projectId) {
        const proj = this.getProject(projectId);
        if (!proj) return { connections: null, positions: {}, hasConfiguredFlowGraph: false };
        return {
            connections: Array.isArray(proj.connections) ? proj.connections : null,
            hasConfiguredFlowGraph: !!proj.hasConfiguredFlowGraph,
            positions: (proj.flowGraphPositions && typeof proj.flowGraphPositions === 'object') ? proj.flowGraphPositions : {}
        };
    }

    /**
     * Menyimpan data visual graph logika interaksi NPC & Quest untuk scene tertentu
     */
    static saveQuestLogic(projectId, sceneId, questGraph) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return false;

        if (!proj.questLogicMap || typeof proj.questLogicMap !== 'object') {
            proj.questLogicMap = {};
        }

        const targetKey = sceneId || (proj.scenes && proj.scenes[0] ? proj.scenes[0].id : 'default');
        proj.questLogicMap[targetKey] = questGraph;
        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Mengambil data visual graph logika interaksi NPC & Quest
     */
    static getQuestLogic(projectId, sceneId) {
        const proj = this.getProject(projectId);
        const targetKey = sceneId || (proj && proj.scenes && proj.scenes[0] ? proj.scenes[0].id : 'default');
        if (proj && proj.questLogicMap && proj.questLogicMap[targetKey]) {
            return proj.questLogicMap[targetKey];
        }

        // Default Starter Quest Logic interaktif
        return {
            nodes: [
                {
                    id: 'node_npc_start',
                    type: 'npc_trigger',
                    title: 'Bicara dengan Kapten',
                    x: 60,
                    y: 120,
                    config: {
                        speakerName: 'Kapten Chen',
                        avatar: '🧙',
                        promptText: 'Tekan E untuk bicara'
                    }
                },
                {
                    id: 'node_check_coins',
                    type: 'condition_coins',
                    title: 'Syarat 3 Koin Emas',
                    x: 360,
                    y: 100,
                    config: {
                        reqCoins: 3,
                        consume: false
                    }
                },
                {
                    id: 'node_dlg_success',
                    type: 'dialogue',
                    title: 'Dialog Misi Selesai',
                    x: 680,
                    y: 60,
                    config: {
                        speakerName: 'Kapten Chen',
                        lines: [
                            'Hebat sekali pengelana! Kamu berhasil mengumpulkan 3 koin emas!',
                            'Sebagai hadiahnya, portal kemenangan di ujung kanan sudah kubuka sihirnya!',
                            'Masuklah ke portal untuk menyelesaikan level.'
                        ]
                    }
                },
                {
                    id: 'node_act_unlock',
                    type: 'action_unlock',
                    title: 'Buka Kunci Portal Finish',
                    x: 990,
                    y: 60,
                    config: {
                        target: 'portal',
                        rewardHp: 20
                    }
                },
                {
                    id: 'node_dlg_fail',
                    type: 'dialogue',
                    title: 'Dialog Koin Kurang',
                    x: 680,
                    y: 280,
                    config: {
                        speakerName: 'Kapten Chen',
                        lines: [
                            'Halo pengelana! Portal di ujung kanan masih terkunci segel sihir.',
                            'Tolong kumpulkan minimal 3 koin emas di pulau ini agar gerbang portal bisa aktif!'
                        ]
                    }
                }
            ],
            wires: [
                { fromNode: 'node_npc_start', fromPort: 'talk', toNode: 'node_check_coins', toPort: 'exec' },
                { fromNode: 'node_check_coins', fromPort: 'pass', toNode: 'node_dlg_success', toPort: 'exec' },
                { fromNode: 'node_check_coins', fromPort: 'fail', toNode: 'node_dlg_fail', toPort: 'exec' },
                { fromNode: 'node_dlg_success', fromPort: 'next', toNode: 'node_act_unlock', toPort: 'exec' }
            ]
        };
    }

    /**
     * Menetapkan scene awal permainan
     */
    static setStartingScene(projectId, sceneId) {
        const projects = this.getProjects();
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return false;
        proj.startingSceneId = sceneId;
        proj.updatedAt = Date.now();
        this.saveProjects(projects);
        return true;
    }

    /**
     * Migrasi dari data lama gt_custom_worlds ke struktur Project baru
     */
    static migrateLegacyWorlds() {
        let legacyWorlds = [];
        try {
            const raw = localStorage.getItem(this.LEGACY_WORLDS_KEY);
            if (raw) legacyWorlds = JSON.parse(raw);
        } catch (e) {}

        const projects = [];

        // Buat project dari legacy worlds jika ada
        if (Array.isArray(legacyWorlds) && legacyWorlds.length > 0) {
            const scenes = legacyWorlds.map((cw, idx) => ({
                id: cw.id || ('scene_migrated_' + idx + '_' + Date.now()),
                name: cw.name || `Level ${idx + 1} • Kustom`,
                biome: cw.biome || 'desert',
                timeOfDay: cw.timeOfDay || 'day',
                worldWidth: cw.worldWidth || 3600,
                worldHeight: cw.worldHeight || 1000,
                hasLava: cw.hasLava !== undefined ? cw.hasLava : true,
                hasWater: cw.hasWater !== undefined ? cw.hasWater : true,
                hasSpikes: cw.hasSpikes !== undefined ? cw.hasSpikes : true,
                hasPlatforms: cw.hasPlatforms !== undefined ? cw.hasPlatforms : true,
                hasSlime: cw.hasSlime !== undefined ? cw.hasSlime : true,
                hasSkeleton: cw.hasSkeleton !== undefined ? cw.hasSkeleton : true,
                hasNpc: cw.hasNpc !== undefined ? cw.hasNpc : true,
                hasChest: cw.hasChest !== undefined ? cw.hasChest : true,
                hasCoins: cw.hasCoins !== undefined ? cw.hasCoins : true,
                hasPortal: cw.hasPortal !== undefined ? cw.hasPortal : true,
                entities: Array.isArray(cw.entities) ? cw.entities : []
            }));

            projects.push({
                id: 'proj_kreasiku_default',
                name: 'Project Kreasiku',
                desc: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                startingSceneId: scenes[0].id,
                scenes: scenes
            });
        }

        // Tambahkan satu starter project jika kosong sama sekali
        if (projects.length === 0) {
            projects.push({
                id: 'proj_petualangan_legenda',
                name: 'Petualangan Legenda',
                desc: 'Contoh project multi-level dengan rute portal sekuensial',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                startingSceneId: 'scene_lvl1_dirt',
                scenes: [
                    {
                        id: 'scene_lvl1_dirt',
                        name: 'Level 1 • Awal Petualangan',
                        biome: 'dirt',
                        bgType: 'color',
                        bgColor: '#dcff78',
                        worldWidth: 3600,
                        worldHeight: 1000,
                        terrainTiles: Array.from({ length: 72 }, (_, i) => `${i},8`),
                        dugTiles: [],
                        entities: [
                            { id: 'player_1', type: 'player', col: 2, row: 7, x: 125, y: 400, label: 'Letak Spawn (Pintu Putih)', cat: 'spawn', icon: '🚪', wTiles: 1, hTiles: 1 },
                            { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
                        ]
                    },
                    {
                        id: 'scene_lvl2_desert',
                        name: 'Level 2 • Gurun Api Tengkorak',
                        biome: 'desert',
                        worldWidth: 3600,
                        worldHeight: 1000,
                        entities: []
                    },
                    {
                        id: 'scene_lvl3_cave',
                        name: 'Level 3 • Labirin Gua Tersembunyi',
                        biome: 'cave',
                        worldWidth: 3600,
                        worldHeight: 1000,
                        entities: []
                    }
                ]
            });
        }

        this.saveProjects(projects);

        // Tandai migrasi selesai dengan membersihkan legacy worlds
        try {
            localStorage.removeItem(this.LEGACY_WORLDS_KEY);
        } catch (e) {}

        return projects;
    }
}
