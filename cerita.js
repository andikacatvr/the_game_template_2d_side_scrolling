// ===============================================================
// 📝 SKELETON / CONFIG DASAR TEMPLATE GAME 2D
// ===============================================================
// File ini adalah pusat konfigurasi utama untuk murid:
// 1. Ubah Nama & Gambar Hero Karakter
// 2. Tentukan Misi / Quest & Isi Tas
// 3. Tambah Level / Map Baru Cukup dengan Menambah Data di DAFTAR_MAP!
// ===============================================================

export const CONFIG_SKELETON = {
    // 1. Informasi Proyek
    judulGame: "Game Petualangan 2D",
    subJudul: "Dunia Eksplorasi Kreatif",
    namaKelompok: "Kelompok Juara Digital",

    // 2. Setelan Dasar Hero / Karakter Utama
    player: {
        nama: "Hero Cilik",
        // ⭐ DROP & PLAY: Cukup tulis nama file gambar di folder public/aset_murid/
        // Contoh: "hero_contoh.png" atau "karakter.png" (kosongkan "" jika ingin pakai kotak kuning bawaan)
        gambar: "hero_contoh.png",
        warna: "#fffb00",     // Warna fallback jika tidak pakai gambar
        kecepatan: 220,       // Kecepatan jalan default (bisa diubah live via /inspect slider)
        kekuatanLompat: 440,  // Daya lompat default (bisa diubah live via /inspect slider)
        hpMaksimal: 3         // Jumlah nyawa awal (hati)
    },

    // 3. Setelan Awal Quest / Misi
    questAwal: {
        judul: "Misi Pertama: Menjelajahi Dunia",
        deskripsi: "Lompati platform, ambil koin berharga, dan temukan gerbang portal untuk lanjut ke level berikutnya!",
        selesai: false
    },

    // 4. Tas / Inventaris Awal (Bisa kosong atau isi item awal)
    inventoryAwal: [
        { id: 'item_kunci', nama: 'Kunci Perunggu', deskripsi: 'Kunci misterius pembuka peti rahasia.', icon: '🗝️' }
    ],

    // 5. Pengaturan Kamera & Zoom
    kamera: {
        zoomAwal: 0.85,        // 0.85 = Normal (85%)
        zoomMinimal: 0.85,     // 0.85 = Lebih Luas
        zoomMaksimal: 1.6      // 1.6 = Detail Dekat
    }
};

// ===============================================================
// 🗺️ DAFTAR_MAP: SISTEM LEVEL BERBASIS DATA (DATA-DRIVEN)
// ===============================================================
// ⭐ MURID/GURU BISA MEMBUAT LEVEL BARU TANPA CODING SAMA SEKALI!
// Cukup salin 1 blok objek di bawah ini dan ubah posisinya sesuka hati.
// ===============================================================
export const DAFTAR_MAP = [
    {
        id: 'map_salju',
        nama: 'Level 1: Lembah Bersalju',
        background: 'bg_scene1.png', // Gambar di folder public atau public/aset_murid/
        warnaLangit: '#0b1329',
        lebarDunia: 1280,
        spawn: { x: 160, y: 360 },

        // Platform tempat melompat { x, y, lebar, tinggi }
        platform: [
            { x: 440, y: 340, lebar: 180, tinggi: 24 },
            { x: 720, y: 260, lebar: 200, tinggi: 24 },
            { x: 980, y: 320, lebar: 160, tinggi: 24 }
        ],

        // Koin / Harta Karun { x, y, id, nama, icon }
        koin: [
            { x: 720, y: 205, id: 'koin_emas', nama: 'Koin Emas Murni', icon: '🪙' }
        ],

        // Rintangan Duri / Hazard { x, y, lebar }
        duri: [
            { x: 580, y: 430, lebar: 90 }
        ],

        // Karakter NPC yang bisa diajak ngobrol
        npc: {
            nama: "Penjaga Gerbang",
            posisiX: 200,
            posisiY: 396,
            portrait: "npc_portrait",
            dialog: [
                "Halo petualang! Selamat datang di Lembah Bersalju.",
                "Lompatlah ke platform di atas dan ambil Koin Emas!",
                "Setelah mendapatkan koin, masuki Portal Gerbang di ujung kanan untuk lanjut ke Level 2!"
            ]
        },

        // Portal Pintu ke Level Berikutnya
        portal: {
            posisiX: 1180,
            posisiY: 395,
            tujuanMapId: 'Scene2', // Otomatis berpindah ke Scene 2: Teluk Victoria Hong Kong!
            pesanTerkunci: "Gerbang Terkunci! Kamu harus mengambil Koin Emas terlebih dahulu.",
            pesanTerbuka: "Gerbang Terbuka! Berlayar menuju Scene 2: Teluk Hong Kong..."
        }
    },

    {
        id: 'map_hutan',
        nama: 'Level 2: Hutan Purba Misterius',
        background: '', // Kosong = otomatis pakai warna tema langit hutan
        warnaLangit: '#062817', // Hijau tua hutan malam
        warnaPlatform: '#14532d',
        lebarDunia: 1400,
        spawn: { x: 140, y: 360 },

        // Platform melayang lebih menantang
        platform: [
            { x: 360, y: 330, lebar: 160, tinggi: 24 },
            { x: 620, y: 250, lebar: 180, tinggi: 24 },
            { x: 900, y: 190, lebar: 200, tinggi: 24 },
            { x: 1180, y: 280, lebar: 160, tinggi: 24 }
        ],

        // Koin permata hutan
        koin: [
            { x: 900, y: 135, id: 'zamrud_hutan', nama: 'Permata Zamrud Hutan', icon: '💎' }
        ],

        // Duri rintangan di lantai
        duri: [
            { x: 490, y: 430, lebar: 80 },
            { x: 760, y: 430, lebar: 90 }
        ],

        // NPC Level 2
        npc: {
            nama: "Pemandu Rimba",
            posisiX: 220,
            posisiY: 396,
            portrait: "npc_portrait",
            dialog: [
                "Hebat, kamu berhasil menembus sampai ke Level 2: Hutan Purba!",
                "Di sini tebingnya lebih tinggi. Gunakan tombol lompat dengan tepat!",
                "Dapatkan Permata Zamrud di platform tertinggi untuk menyelesaikan petualangan!"
            ]
        },

        // Portal Akhir Petualangan / Kembali ke Level 1
        portal: {
            posisiX: 1300,
            posisiY: 395,
            tujuanMapId: 'map_salju', // Bisa lanjut ke map berikutnya atau tamat
            pesanTerkunci: "Gerbang Terkunci! Ambil Permata Zamrud terlebih dahulu.",
            pesanTerbuka: "Selamat! Kamu telah berhasil menaklukkan seluruh level petualangan!"
        }
    }
];
