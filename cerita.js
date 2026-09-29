// ===============================================================
// SKELETON / CONFIG DASAR TEMPLATE GAME 2D
// ===============================================================
// File ini adalah pusat konfigurasi utama untuk murid:
// 1. Ubah Nama & Gambar Hero Karakter
// 2. Tentukan Misi / Quest & Isi Tas
// 3. Tambah Level / Map Baru Cukup dengan Menambah Data di DAFTAR_MAP!
// ===============================================================

export const CONFIG_SKELETON = {
    // 1. Informasi Proyek
    judulGame: "The Game Template",
    subJudul: "Dunia Eksplorasi Kreatif",
    namaKelompok: "Kelompok Juara Digital",

    // 2. Setelan Dasar Hero / Karakter Utama
    player: {
        nama: "Hero Cilik",
        // DROP & PLAY: Cukup tulis nama file gambar di folder public/aset_murid/
        // Contoh: "hero_contoh.png" atau "karakter.png" (kosongkan "" jika ingin pakai kotak kuning bawaan)
        gambar: "hero_contoh.png",
        warna: "#fffb00",     // Warna fallback jika tidak pakai gambar
        kecepatan: 220,       // Kecepatan jalan default (bisa diubah live via /inspect slider)
        kekuatanLompat: 440,  // Daya lompat default (bisa diubah live via /inspect slider)
        hpMaksimal: 3         // Jumlah nyawa awal
    },

    // 3. Setelan Awal Quest / Misi
    questAwal: {
        judul: "Tutorial: Kuasai Kontrol & Command Game",
        deskripsi: "Bicara dengan Pemandu Engine, coba command console (/speed, /jump, /god), ambil Koin Emas, dan capai Portal petualangan!",
        selesai: false
    },

    // 4. Tas / Inventaris Awal (Bisa kosong atau isi item awal)
    inventoryAwal: [
        { id: 'item_kunci', nama: 'Kunci Perunggu', deskripsi: 'Kunci misterius pembuka peti rahasia.', icon: '' }
    ],

    // 5. Pengaturan Kamera & Zoom
    kamera: {
        zoomAwal: 1.0,        // 1.0 = Normal 100% (Pixel-perfect 1:1, tajam & konsisten tanpa blur)
        zoomMinimal: 0.8,     // 0.8 = Lebih Luas
        zoomMaksimal: 1.6      // 1.6 = Detail Dekat
    }
};

// ===============================================================
// DAFTAR_MAP: SISTEM LEVEL BERBASIS DATA (DATA-DRIVEN)
// ===============================================================
// MURID/GURU BISA MEMBUAT LEVEL BARU TANPA CODING SAMA SEKALI!
// Cukup salin 1 blok objek di bawah ini dan ubah posisinya sesuka hati.
// ===============================================================
export const DAFTAR_MAP = [
    {
        id: 'map_salju',
        nama: 'Level 1: Lembah Bersalju',
        background: 'bg_scene1.png', // Gambar di folder public atau public/aset_murid/
        warnaLangit: '#0b1329',
        lebarDunia: 1280,
        spawn: { x: 175, y: 350 }, // Berdiri pas di tengah Kolom 3 (x: 150..200)

        // Platform tempat melompat { x, y, lebar, tinggi } - Seluruh balok menempel presisi di petak grid 50px
        platform: [
            { x: 475, y: 312, lebar: 150, tinggi: 24 }, // Kolom 8, 9, 10 (x: 400..550), Pijakan tepat di garis y = 300
            { x: 750, y: 212, lebar: 200, tinggi: 24 }, // Kolom 13, 14, 15, 16 (x: 650..850), Pijakan tepat di garis y = 200
            { x: 975, y: 262, lebar: 150, tinggi: 24 }  // Kolom 18, 19, 20 (x: 900..1050), Pijakan tepat di garis y = 250
        ],

        // Koin / Harta Karun { x, y, id, nama, icon } - Tepat di titik tengah sel Kolom 14, Row 2 (x: 700..750, y: 100..150)
        koin: [
            { x: 725, y: 125, id: 'koin_emas', nama: 'Koin Emas Murni', icon: '' }
        ],

        // Rintangan Duri / Hazard { x, y, lebar } - Memenuhi persis 2 petak grid Kolom 11 & 12 (x: 550..650)
        duri: [
            { x: 600, y: 388, lebar: 100 }
        ],

        // Karakter NPC yang bisa diajak ngobrol - Tepat di titik tengah sel Kolom 4 (x: 200..250, center = 225)
        npc: {
            nama: "Pemandu Engine (Tutorial Master)",
            posisiX: 225,
            posisiY: 378,
            portrait: "npc_portrait",
            dialog: [
                "Halo calon kreator game! Selamat datang di Arena Eksplorasi 2D.",
                "Game ini dirancang untuk kamu modifikasi sesuka hati secara live!",
                "Tekan tombol [F] kapan saja di dekatku untuk melihat Tur Interaktif pengenalan seluruh tombol engine (File, Add Object, Wrench Edit, Scripting, Inspect, & Console)!",
                "Atau coba ketik command /speed 350 atau /jump 550 di console bawah untuk melompati rintangan di depan!"
            ]
        },

        // Portal Pintu ke Level Berikutnya - Tepat di titik tengah sel Kolom 23 (x: 1150..1200, center = 1175)
        portal: {
            posisiX: 1175,
            posisiY: 376,
            tujuanMapId: 'Scene2', // Otomatis berpindah ke Scene 2: Teluk Victoria Hong Kong!
            pesanTerkunci: "Gerbang Terkunci! Kamu harus mengambil Koin Emas terlebih dahulu.",
            pesanTerbuka: "Gerbang Terkunci! Berlayar menuju Scene 2: Teluk Hong Kong..."
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
            { x: 900, y: 135, id: 'zamrud_hutan', nama: 'Permata Zamrud Hutan', icon: '' }
        ],

        // Duri rintangan di lantai
        duri: [
            { x: 490, y: 406, lebar: 80 },
            { x: 760, y: 406, lebar: 90 }
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
