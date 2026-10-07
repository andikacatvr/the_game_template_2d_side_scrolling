# 📦 Panduan Arsitektur Ekspor Game Standalone (.ZIP)
**Spesifikasi Paket Game Mandiri Siap Main untuk Karya Murid**

---

## 🎯 1. Tujuan & Filosofi Desain
Template game ini berfungsi sebagai **Game Creator Engine** ramah anak. Ketika murid selesai membuat atau memodifikasi dunia dan cerita mereka, tombol **"Ekspor Game (.ZIP)"** pada menu File bertujuan untuk menghasilkan **paket game utuh yang bersih dan siap dimainkan oleh siapa saja**.

### Prinsip Utama:
1. **Zero Setup / Zero Code Execution**: Penerima file tidak perlu menginstal VS Code, Node.js, Vite, Git, atau terminal.
2. **Offline & Zero CORS Error**: Cukup klik 2x `index.html` di komputer mana pun tanpa terkena blokir keamanan browser (`file:///`).
3. **Pure Player Experience**: Semua tool developer/editor dilepas total sehingga terasa seperti game indie profesional.

---

## 📂 2. Struktur File di Dalam Paket (.ZIP)

Setelah murid mengunduh dan mengekstrak file `.zip`, isi foldernya adalah sebagai berikut:

```text
📁 [Nama_Game_Kreasimu]/
├── 📄 index.html          --> Halaman utama (klik 2x untuk bermain langsung di browser)
├── 📄 game.js             --> Core engine khusus player (Phaser 3 + Game Logic murni)
├── 📄 data_game.js        --> Data dunia, level, peta, dan dialog NPC hasil kreasi murid
├── 📄 README.txt          --> Petunjuk singkat cara bermain untuk pemain baru
└── 📁 assets/             --> Folder aset visual esensial (skin karakter, koin, latar)
```

---

## 🧹 3. Pemilahan Komponen: Apa yang Dibuang vs Dipertahankan

### ❌ Komponen Developer yang DIHILANGKAN TOTAL:
Agar game bersih dan pemain tidak bingung dengan tombol teknis:
* **Engine Menu Bar**: Bar hitam di atas (`File`, `Edit`, `Inspect`, `Preview`, `Grid`, dll) ditiadakan.
* **Command Console**: Tombol mengambang `>_ Command` dan panel cheat developer dibuang.
* **Scene Builder / Studio & Flow Graph**: Modal F4, gizmo seleksi, palet objek, dan drawer editor dilepas.
* **Pemandu Engine**: Tur panah melayang dan tutorial teknis tidak dimunculkan.
* **Live Inspector**: Panel slider kecepatan hero, gravitasi, dan jump force disembunyikan.
* **Main Menu Engine**: Menu pilihan rute coding/sandbox bawaan dilewati; pemain langsung disuguhkan intro/level karya anak.

---

###  Komponen Gameplay yang DIPERTAHANKAN (Pure Game):
Pemain mendapatkan pengalaman bermain yang interaktif dan imersif:
1. **HUD Pemain Lengkap**:
   * ❤️ **HP Bar**: 3 hati, efek kedip merah saat terkena serangan monster/duri, serta game over modal jika HP habis.
   * 📜 **Tombol Quest**: Membuka popup misi cerita yang sudah ditulis oleh anak.
   * 🎒 **Tombol Inventory**: Membuka tas barang yang telah dipungut (kunci, permata, koin).
   * 🗺️ **Tombol Map**: Menampilkan denah dunia / mini-map petualangan.
   * ⚙️ **Tombol Settings**: Kontrol volume musik, efek suara (SFX), dan opsi ulangi level.
2. **Dunia & Cerita Hasil Kreasi Murid**:
   * Strata medan tanah, latar belakang langit, rintangan duri, air, dan lahar yang sudah disusun.
   * NPC ramah dengan balon dialog dan teks percakapan kustom.
   * Monster berpatroli (Slime dan Skeleton).
   * Pintu masuk (Spawn Door) dan Portal keluar (Goal Portal) untuk transisi ke level berikutnya hingga layar **Victory**.

---

## 🖥️ 4. Cara Menjalankan Game bagi Penerima

### A. Cara Offline (Paling Mudah & Utama)
1. **Unduh** file `.zip` game.
2. **Klik Kanan** file `.zip` $\rightarrow$ pilih **Extract All** (Ekstrak Semua).
3. Buka folder hasil ekstrak, lalu **Klik 2x file `index.html`**.
4. Game langsung berjalan di browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Opera) tanpa koneksi internet.

### B. Cara Online / Berbagi Link (Opsional)
Jika murid ingin membagikan link agar teman-temannya bisa main langsung lewat ponsel/tablet:
1. Buka [Netlify Drop](https://app.netlify.com/drop) atau [itch.io](https://itch.io).
2. Tarik (*drag and drop*) folder hasil ekstrak ke halaman tersebut.
3. Dalam beberapa detik, tautan web publik instan langsung aktif dan bisa disebarkan via WhatsApp/media sosial.

---

## 🛡️ 5. Rekayasa Teknis Anti-Rusak (Technical Safeguards)

Untuk menjamin game tidak mengalami error layar putih (*white screen*):

1. **Pencegahan CORS Error**:
   * Browser modern melarang perintah `fetch('data.json')` jika dijalankan dari protokol lokal `file:///`.
   * **Solusi**: Data game disimpan di file JavaScript (`window.GAME_DATA = { ... }` di `data_game.js`) dan dimuat menggunakan tag `<script src="./data_game.js"></script>`. Ini 100% aman dan kompatibel di semua browser.
2. **Audio Sintetis Bawaan (Web Audio API)**:
   * Efek suara loncat, ambil koin, sakit, dan menang dirangkai secara algoritmik menggunakan osilator audio browser bawaan (`AudioSynth`).
   * Game tidak akan hening atau error meskipun file audio eksternal tidak ditemukan.
3. **Data Terkunci Mandiri**:
   * Progres dan struktur map murid diekspor secara permanen ke dalam file, sehingga tidak akan terhapus atau tertimpa oleh cache `localStorage` di komputer pemain lain.
