# 🎮 Panduan The Game Template 2D (Phaser 4 Edition)

Template game edukasi ini ditenagai oleh engine **Phaser 4** (`v4.2.1`) yang modern, cepat, dan ringan. Dirancang dengan UI tombol berbahasa Inggris yang bersih, sistem partikel debu lompatan & kemilau koin (*coin sparkles*), serta karakter *Villain Gatekeeper* yang siap dikembangkan oleh murid!

---

## 📱 Fitur & Elemen UI yang Sudah Siap Pakai

### 1. Navbar Top / HUD
- **HP (Nyawa)**: Menampilkan status darah karakter dalam bentuk hati (`❤️ ❤️ ❤️`). Sudah dilengkapi sistem berkurang jika terkena rintangan & respawn otomatis.
- **Tombol `[📋 Quest]`**: Berada di atas; saat diklik atau ditekan tombol `[Q]`, membuka modal popup berisi misi dan tujuan petualangan.
- **Tombol `[🎒 Inventory]`**: Berada di kanan atas lengkap dengan angka jumlah barang; saat diklik atau ditekan tombol `[I]`, membuka kotak tas 4 slot.
- **Tombol `[🔍 Zoom]`**: Berada di samping kanan atas navbar; menampilkan persentase zoom saat ini dan bisa diklik untuk berpindah level zoom secara instan.

### 2. Kontrol Layar Sentuh (Android / Tablet)
- **Tombol Kiri [◀]** & **Kanan [▶]**: Berada di pojok kiri bawah layar untuk menggerakkan karakter secara responsif (*multi-touch*).
- **Tombol Atas [▲]**: Berada di pojok kanan bawah layar untuk melompat.
- *Tetap support keyboard PC (A/D/W, tombol panah, spasi, Q, I).*

### 3. Kamera Dinamis & Zoom In/Out
- **Laptop / PC**:
  - **Pinch 2 jari di Touchpad**: Dekatkan dua jari untuk zoom out, jauhkan dua jari untuk zoom in.
  - **Scroll Roda Mouse**: Putar ke atas untuk zoom in, ke bawah untuk zoom out.
  - **Keyboard**: Tombol `+` / `=` untuk zoom in, `-` untuk zoom out, dan `0` untuk reset ke 100%.
- **HP / Tablet (Layar Sentuh)**:
  - **Pinch 2 Jari**: Cubit/lebarkan 2 jari langsung di layar sentuh.
  - **Tombol HUD `[🔍]`**: Cukup tap tombol zoom di navbar untuk berpindah preset zoom (100% -> 125% -> 150% -> 85%).
- **Pengaturan Mudah di `cerita.js`**: Murid bisa mengatur `zoomAwal`, `zoomMinimal`, dan `zoomMaksimal` di file `cerita.js`.

---

## 📁 Struktur File Template (Modular)

```text
template_game2d/
├── cerita.js            <-- ⭐ Khusus Murid: Konfigurasi cerita, quest, item, & hero
├── index.html           <-- Halaman game responsif
├── main.js              <-- Entry point utama (~40 baris, inisialisasi Phaser)
├── src/
│   ├── assets/          <-- Gambar background, sprite, audio
│   ├── scenes/          <-- Tiap file = 1 Layar / Level Game
│   │   ├── BootScene.js    <-- Pembuatan tekstur & preload aset
│   │   ├── TitleScene.js   <-- Menu utama (New Game, Continue, Settings)
│   │   ├── GameScene.js    <-- Level 1 (Area Luar Salju)
│   │   └── DungeonScene.js <-- Level 2 (Area Dungeon Gua)
│   ├── ui/              <-- Komponen UI (DialogBox, SettingsModal)
│   └── utils/           <-- Utilitas (DisplayManager, AudioManager, SaveManager, helpers)
└── PANDUAN.md           <-- Dokumen panduan ini
```

---

---

## 🌟 3 Fitur Unggulan untuk Murid (Tanpa Koding Rumit!)

### 1. 🎨 Drop & Play: Pasang Karakter & Background Sendiri
Murid bisa menggambar karakter mereka di Canva, Paint, atau Pixel Art, lalu memasukkannya ke dalam game seketika:
1. Masukkan file gambar `.png` ke folder **`public/aset_murid/`** (contoh: `kucing_ninja.png`).
2. Buka [cerita.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/cerita.js) dan ubah bagian:
   ```javascript
   player: {
       nama: "Kucing Ninja",
       gambar: "kucing_ninja.png", // Otomatis dibaca dari public/aset_murid/
       ...
   }
   ```
3. Game otomatis memuat gambar tersebut! Jika dikosongkan (`gambar: ""`), game akan otomatis memakai kotak hero bawaan yang aman tanpa error.

---

### 2. 🎛️ Live Parameter Sliders & Real-Time Code Inspector (`/inspect`)
Fitur edukasi interaktif untuk mengenalkan konsep **"Variabel"**:
1. Di dalam game, buka kolom chat lalu ketik:
   ```text
   /inspect
   ```
2. Jendela **Live Code Inspector** akan muncul:
   * **🏃 Slider Kecepatan (100 - 600)**: Geser ke kanan untuk lari super kencang ala Sonic!
   * **🚀 Slider Daya Lompat (200 - 800)**: Geser ke kanan untuk lompat super tinggi!
   * **🌍 Slider Gravitasi (100 - 1400)**: Geser ke kiri untuk melayang seperti di bulan!
   * **Tombol `↺ Reset`**: Mengembalikan nilai variabel ke angka default di `cerita.js`.
3. **Real-time Code Highlighting**: Saat karakter berjalan, melompat, berbicara dengan NPC, mengambil koin, atau terkena duri, baris kode logika JavaScript di inspector akan otomatis menyala dan menebal secara live!

---

### 3. 🗺️ Data-Driven Map (Bikin Level Baru Tinggal Isi Daftar)
Mau bikin Level 2, Level 3, atau Level Es? Cukup buka [cerita.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/cerita.js) di bagian `DAFTAR_MAP`:
```javascript
export const DAFTAR_MAP = [
    {
        id: 'map_salju',
        nama: 'Level 1: Lembah Bersalju',
        background: 'bg_scene1.png',
        spawn: { x: 160, y: 360 },
        platform: [
            { x: 440, y: 340, lebar: 180, tinggi: 24 },
            { x: 720, y: 260, lebar: 200, tinggi: 24 }
        ],
        koin: [
            { x: 720, y: 205, id: 'koin_emas', nama: 'Koin Emas', icon: '🪙' }
        ],
        duri: [
            { x: 580, y: 430, lebar: 90 }
        ],
        npc: { nama: "Penjaga", dialog: ["Selamat datang!"] },
        portal: { posisiX: 1180, posisiY: 395, tujuanMapId: 'map_hutan' }
    },
    // Tambah level baru tinggal salin blok di atas!
];
```
Game langsung merender platform, koin, rintangan duri, NPC, dan portal pintu gerbang ke level berikutnya secara otomatis tanpa perlu coding file baru!

---

## 🚀 Cara Menjalankan

Jalankan server pengembangan di terminal:
```bash
npm run dev
```

Buka alamat berikut di browser:
👉 **`http://localhost:5173/`**

Bisa dimainkan dari laptop, komputer PC, maupun tablet / smartphone Android!


