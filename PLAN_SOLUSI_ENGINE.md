# 📋 Blueprint & Action Plan: Solusi Permasalahan Game Creator Engine

Dokumen ini berisi analisis akar masalah, arsitektur teknis, dan rencana kerja terstruktur untuk menyelesaikan 3 permasalahan utama pada template game engine:

---

## 1. 🎯 Sistem Quest & Interaksi Player - NPC - Objektif

### 🔍 Masalah Saat Ini
1. Jendela Quest (`[Quest]` di HUD / shortcut `Q`) hanya menampilkan teks statis dan belum terhubung ke gameplay.
2. NPC yang memiliki dialog (diedit lewat tool Wrench 🔧) belum dapat memberikan misi kepada player.
3. Belum ada pelacak progres objektif (misal: hitungan koin $X/Y$, mengalahkan monster, atau mencapai portal finish).

### 🛠️ Solusi Arsitektur
Membuat modul terpusat **`QuestManager.js`** yang bertindak sebagai *State Machine*:
- **Status Misi**: `NOT_STARTED` ➔ `IN_PROGRESS` ➔ `COMPLETED`
- **Tipe Objektif**:
  - `TALK_TO_NPC`: Berbicara dengan NPC tertentu.
  - `COLLECT_ITEMS`: Mengumpulkan $N$ koin atau item permata.
  - `DEFEAT_MONSTERS`: Mengeliminasi musuh.
  - `REACH_PORTAL`: Menemukan gerbang portal rahasia.

### 📝 Alur Interaksi
1. **Player mendekat ke NPC** ➔ Muncul prompt interaksi `[E] Bicara`.
2. **NPC memberikan Quest** ➔ Dialog pengantar misi muncul, quest masuk ke tab aktif, dan status berubah menjadi `IN_PROGRESS`.
3. **HUD Quest Tracker Real-Time** ➔ Menampilkan status di bawah HP bar (contoh: `🪙 Koin: 1/3`).
4. **Penyelesaian Misi** ➔ Saat objektif terpenuhi, player kembali ke NPC atau menyentuh portal ➔ Muncul suara kemenangan, efek partikel, dan reward (membuka level berikutnya atau drop item).

---

## 2. 📦 Mekanisme Download & Hasil Akhir Game (Standalone .ZIP)

### 🔍 Masalah Saat Ini
1. Tombol ekspor tersembunyi di dalam menu `File ▾` ➔ `📦 Ekspor Game (.ZIP)` sehingga pengguna kesulitan menemukannya.
2. Generator ekspor (`ExportGameModal.js`) baru membaca `placedObjects`, **belum membaca susunan balok modular tanah yang digali/dipasang melalui Grid System (`gridWorldBlocks`)**.

### 🛠️ Solusi Arsitektur
1. **Output Hasil Akhir Game**:
   - Menghasilkan file **`.ZIP` murni (Pure Standalone Game)**:
     - `index.html`: Berkas HTML ringan siap main.
     - `game.js`: Bundle game Phaser 3 yang sudah mencakup peta, karakter, balok, koin, rintangan, dan quest buatan pengguna tanpa dev tools/console engine.
     - **Bisa langsung dimainkan offline** hanya dengan mengekstrak file dan klik dua kali `index.html` di browser mana pun (Chrome, Edge, Firefox), atau diunggah ke Itch.io / GameJolt.
2. **Perbaikan Serialisasi Data Dunia**:
   - Memastikan generator membaca seluruh balok dari `this.gridWorldBlocks` dan `this.platforms` sehingga 100% peta yang dibangun pemain ikut terunduh secara presisi.
3. **Penyederhanaan Akses Tombol**:
   - Menambahkan tombol langsung **`📥 Export`** di Top Menu Bar agar terlihat jelas dan dapat diakses dengan 1 kali klik.

---

## 3. 👁️ Penyelarasan Mode Preview (Playtest 1:1 Tanpa Mismatch)

### 🔍 Masalah Saat Ini
1. Tombol `Preview` di menu atas memicu `SceneBuilderModal.js`, yaitu kanvas 2D terpisah dengan data bawaan (*Gurun Api Tengkorak*), bukan menampilkan scene game aktif.
2. Tampilan di Preview menggunakan grafik 2D datar tanpa shader, tanpa partikel, dan tidak menampilkan balok/posisi yang sedang aktif dimainkan.

### 🛠️ Solusi Arsitektur
1. **Mengubah `Preview` Menjadi `Mode Playtest Murni`**:
   - Saat tombol **`Preview`** diklik:
     - Sembunyikan semua UI Engine (Menu bar, toolbar vertikal 🔨/🧱/🔧, grid overlay, inspect).
     - Aktifkan gameplay 100% murni persis seperti saat game dimainkan orang lain.
     - Tampilkan tombol minimalis di pojok layar: `[ESC] Kembali ke Editor`.
   - **Hasil**: Tampilan Preview menjadi **100% identik** karena berjalan langsung di engine dan scene yang sama tanpa selisih visual sedikit pun.

---

## 🚀 Rencana Eksekusi (Action Plan)

| No | Tahap | File Terkait | Estimasi Langkah |
|---|---|---|---|
| 1 | **Mode Preview Murni (Playtest Mode)** | `EngineMenuBar.js`, `GameScene.js` | Sembunyikan HUD engine saat preview aktif & kembalikan saat tekan ESC |
| 2 | **Export & Download Fix (.ZIP)** | `ExportGameModal.js`, `EngineMenuBar.js` | Sinkronisasi `gridWorldBlocks` ke bundler ZIP & taruh tombol cepat di bar atas |
| 3 | **Sistem Quest Dinamis** | `QuestManager.js`, `QuestModal.js`, `GameScene.js` | Buat state machine misi, dialog NPC bertahap, dan tracker koin/portal di HUD |
