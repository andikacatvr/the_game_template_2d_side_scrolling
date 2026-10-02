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
     * @param {string} desc 
     * @returns {Object} project baru
     */
    static createProject(name = 'Petualangan Baru', desc = 'Game 2D multi-scene') {
        const projects = this.getProjects();
        const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        // Buat default scene pertama di dalam project baru
        const initialScene = {
            id: 'scene_' + Date.now() + '_1',
            name: 'Level 1 • Awal Petualangan',
            biome: 'dirt',
            worldWidth: 3600,
            worldHeight: 1000,
            hasLava: false,
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
                { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
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
            worldWidth: sceneData.worldWidth || 3600,
            worldHeight: sceneData.worldHeight || 1000,
            hasLava: false,
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
                    { id: 'portal_1', type: 'portal', col: 70, row: 7, x: 3525, y: 400, label: 'Goal Portal Finish', cat: 'solid', icon: '🌀', wTiles: 1, hTiles: 1 }
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
     */
    static getNextScene(projectId, currentSceneId) {
        const proj = this.getProject(projectId);
        if (!proj || !Array.isArray(proj.scenes) || proj.scenes.length <= 1) return null;

        // 1. Cek visual connections dari Flow Graph terlebih dahulu jika ada
        if (Array.isArray(proj.connections) && proj.connections.length > 0) {
            const conn = proj.connections.find(c => c.fromSceneId === currentSceneId);
            if (conn && conn.toSceneId) {
                const target = proj.scenes.find(s => s.id === conn.toSceneId);
                if (target) return target;
            }
        }

        // 2. Fallback sekuensial jika belum ada koneksi node kustom
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
        if (!proj) return { connections: [], positions: {} };
        return {
            connections: Array.isArray(proj.connections) ? proj.connections : [],
            positions: (proj.flowGraphPositions && typeof proj.flowGraphPositions === 'object') ? proj.flowGraphPositions : {}
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
