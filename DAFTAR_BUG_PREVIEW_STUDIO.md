# 📋 Laporan Analisis Bug & Solusi: Preview & Live Simulation Studio (SceneBuilderModal)

Dokumen ini berisi inventarisasi lengkap bug, anomali fisika, tabrakan kontrol, dan masalah desinkronisasi pada fitur **Preview / Live Simulation Studio** ([SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js)).

> 💡 **Pembaruan Arsitektur (Pure World View / Level Overview):**
> Sesuai keputusan desain terbaru:
> 1. Karakter simulasi uji coba (`🏃 PEMAIN (WASD)`) telah dinonaktifkan dari kanvas preview agar tampilan preview berfungsi 100% sebagai **World View / Level Editor murni** (seperti *Super Mario Maker* / *Unity Scene View*).
> 2. Kotak garis putus-putus cyan (`📷 AREA KAMERA AWAL`) telah **dihapus sepenuhnya** untuk tampilan dunia yang bersih dan leluasa tanpa gangguan garis.
> 3. Indikator posisi spawn tetap diwakili secara akurat oleh Pintu Putih (`🚪 Letak Spawn`).
> 4. Alur pengujian gameplay terpusat: tombol **"▶ Terapkan & Mainkan"** mengekspor seluruh state ke `ProjectManager` dan menjalankannya langsung di engine Phaser `CustomWorldScene` (100% identik dengan apa yang didesain di preview).

---

## 📊 Ringkasan Inventarisasi Bug

| No | Nama Bug | Kategori | Status | Lokasi File & Baris |
|---|---|---|---|---|
| **1** | Karakter Tembus Pijakan Lebar (*Platform Pass-Through*) | Fisika / Collision | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:5236-5246](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L5236) |
| **2** | Teleportasi Melompat Bawah Pijakan (*Snap-To-Top Glitch*) | Fisika / Collision | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:5250-5256](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L5250) |
| **3** | Batas Bedrock Di-hardcode di Row 13 (Tembok Gaib) | Logika Dunia / Batas | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:5220-5232](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L5220) |
| **4** | Floating Quick Toolbar Muncul Saat Sedang Uji Gerak | UI / Interaksi | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:3080-3086](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L3080) |
| **5** | Tombol Panah (Arrow Keys) Menggeser Objek Editor Saat Main | Input / Kontrol | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:3426-3440](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L3426) |
| **6** | Angka Desimal Ruler Pecah Belasan Digit (*Float Precision*) | Tampilan UI | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:1512-1514](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L1512) |
| **7** | Koin, Duri, & Lava Bersifat Pasif Tanpa Respon Tabrakan | Gameplay / Fitur | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:5265-5310](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L5265) |
| **8** | Batas Lebar Dunia `worldWidth` Berpotensi Tertahan di 1800px | Konfigurasi / Batas | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:5220](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L5220) |
| **9** | Grid / Petak Kanvas Tidak Bisa Diklik Pada Baris Tertentu | Input / Raycast Kanvas | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:3008-3026](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L3008) |
| **10** | Objek Menimpa / Duplikat di Petak yang Sama (Stacking) | Validasi Posisi / Grid | ✅ **SELESAI DIPERBAIKI** | [SceneBuilderModal.js:1890-1980](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L1890) |
| **11** | Tampilan Game Tidak Sesuai Preview (Air, Lava & Bedrock) | Render & Sinkronisasi | ✅ **SELESAI DIPERBAIKI** | [CustomWorldScene.js:510-580](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L510) |
| **12** | Slime (Bola Hijau) & Skeleton (Putih) Jatuh ke Jurang / Turun dari Langit | Fisika Monster / Gravitasi | ✅ **SELESAI DIPERBAIKI** | [CustomWorldScene.js:830-905](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L830) |
| **13** | Game Freeze / Hang Saat Pemain Menyentuh Monster | Audio / Error Callback | ✅ **SELESAI DIPERBAIKI** | [CustomWorldScene.js:1607-1645](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L1607) |

---

## 🔍 Pembahasan Detail & Rencana Solusi Kode

### 1. 🕳️ Karakter Jatuh Menembus Pijakan Lebar (*Platform Pass-Through*)
* **Masalah:**
  Platform pijakan melayang di game biasanya membentang 3 sampai 5 petak (`ent.wTiles = 3..5`). Namun pengecekan lantai kandidat hanya mengecek petak kolom pertama (`pCol === eCol`).
* **Dampak:**
  Begitu karakter berjalan ke petak ke-2, ke-3, atau ke-4 dari platform yang sama, `pCol === eCol` menghasilkan `false` dan karakter langsung jatuh ke bawah menembus platform!
* **Kode Bermasalah:**
  ```javascript
  // SceneBuilderModal.js: Baris 5225
  if (['platforms', 'dirt', 'chest'].includes(ent.type)) {
      const eCol = ent.col;
      const eRow = (ent.row !== undefined) ? ent.row : 7;
      if (pCol === eCol) { // ❌ HANYA CEK PETAK PERTAMA
          floorCandidates.push(eRow * 50);
      }
  }
  ```
* **Solusi Kode yang Benar:**
  ```javascript
  if (['platforms', 'dirt', 'chest'].includes(ent.type)) {
      const eCol = ent.col;
      const wTiles = ent.wTiles || 1;
      const eRow = (ent.row !== undefined) ? ent.row : 7;
      // ✅ Cek seluruh bentangan petak platform dari eCol sampai eCol + wTiles - 1
      if (pCol >= eCol && pCol < eCol + wTiles) {
          floorCandidates.push(eRow * 50);
      }
  }
  ```

---

### 2. 🚀 Teleportasi Aneh Saat Melompat dari Bawah Pijakan (*Snap-To-Top Glitch*)
* **Masalah:**
  Pijakan di game 2D bertipe *one-way platform* (pemain bisa melompat menembus dari bawah ke atas, lalu mendarat di atasnya saat jatuh ke bawah). Di preview, kode tidak mengecek arah kecepatan jatuh (`tp.vy >= 0`).
* **Dampak:**
  Ketika pemain melompat ke atas dan kepalanya mengenai batas bawah platform, pemain seketika tersentak dan ter-teleportasi langsung ke atas permukaan platform.
* **Kode Bermasalah:**
  ```javascript
  // SceneBuilderModal.js: Baris 5234
  for (const fl of floorCandidates) {
      if (tp.y <= fl + 14 && (tp.y + tp.vy >= fl - 2 || tp.y >= fl - 2)) {
          targetFloor = fl;
          break;
      }
  }
  ```
* **Solusi Kode yang Benar:**
  ```javascript
  for (const fl of floorCandidates) {
      // ✅ Hanya anggap sebagai lantai jika karakter sedang jatuh ke bawah (tp.vy >= 0)
      if (tp.vy >= 0 && tp.y <= fl + 14 && (tp.y + tp.vy >= fl - 2 || tp.y >= fl - 2)) {
          targetFloor = fl;
          break;
      }
  }
  ```

---

### 3. 🧱 Batas Bedrock Di-hardcode di Row 13 (Tembok Gaib)
* **Masalah:**
  Ketinggian dunia game di [cerita.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/cerita.js#L61) dan `CustomWorldScene` adalah 1000px (20 baris dari Row 0 sampai Row 19). Bedrock ada di Row 19 (y = 950px). Namun fisika preview menaruh bedrock keras di Row 13 (`y = 650px`) dan loop tanah hanya sampai Row 13.
* **Dampak:**
  Pemain tidak bisa menggali atau menjelajahi gua di bawah baris 13 karena ada lantai tak kasat mata di y = 650px.
* **Kode Bermasalah:**
  ```javascript
  // SceneBuilderModal.js: Baris 5207-5211
  floorCandidates.push(13 * 50); // ❌ HARDCODED ROW 13
  for (let r = 8; r < 13; r++) { // ❌ HANYA CEK SAMPAI ROW 13
  ```
* **Solusi Kode yang Benar:**
  ```javascript
  const totalRows = Math.floor((this.state.worldHeight || 1000) / 50);
  const bedrockRow = totalRows - 1; // Row 19 (y = 950px)
  floorCandidates.push(bedrockRow * 50);
  for (let r = 8; r < bedrockRow; r++) {
  ```

---

### 4. 🛠️ Floating Quick Toolbar Muncul Saat Sedang Uji Gerak
* **Masalah:**
  Event `mousedown` kanvas tidak membedakan apakah mode edit atau mode uji gerak (`isTestPlayMode`) yang sedang aktif.
* **Dampak:**
  Saat pengguna mengklik kanvas di tengah-tengah menguji karakter, muncul kotak seleksi biru dan toolbar floating cepat (`1x1`, `Hapus`, `Tanah`, `Pijakan`, `Air`, `Lava`) yang menutupi pandangan layar.
* **Solusi Kode yang Benar:**
  Tambahkan pengecekan awal pada listener `mousedown`:
  ```javascript
  this.canvas.addEventListener('mousedown', (e) => {
      // Jika sedang mode uji gerak, abaikan seleksi kotak & jangan munculkan quick toolbar
      if (this.isTestPlayMode) return;
      ...
  });
  ```

---

### 5. 🎯 Tombol Panah (Arrow Keys) Menggeser Objek Editor Saat Main
* **Masalah:**
  Di handler `keydown`, tombol panah (ArrowLeft, ArrowRight, ArrowUp, ArrowDown) dicegat untuk `nudgeSelectedEntity()` (menggeser objek yang dipilih di editor), sementara di `keyup` tombol panah merilis jalan pemain.
* **Dampak:**
  Jika pemain bermain menggunakan panah keyboard, karakter tidak bergerak, dan objek yang sedang terpilih di editor malah tidak sengaja tergeser posisinya.
* **Solusi Kode yang Benar:**
  ```javascript
  if (this.isTestPlayMode) {
      // ✅ Arahkan tombol panah ke pergerakan pemain
      if (e.key === 'ArrowLeft') this.testKeys.a = true;
      if (e.key === 'ArrowRight') this.testKeys.d = true;
      if (e.key === 'ArrowUp') { e.preventDefault(); this.testKeys.w = true; }
      if (e.key === 'ArrowDown') this.testKeys.s = true;
  } else {
      // Mode Edit normal: tombol panah menggeser objek
      this.nudgeSelectedEntity(...);
  }
  ```

---

### 6. 🔢 Angka Desimal Ruler Pecah Belasan Digit
* **Masalah:**
  Posisi pixel entitas player di ruler bawah dicetak langsung tanpa pembulatan.
* **Dampak:**
  Menghasilkan teks tidak rapi: `[Col 39: 1995.96906666667018px] SPAWN`.
* **Solusi Kode yang Benar:**
  ```javascript
  // SceneBuilderModal.js: Baris 1512
  if (rulerSpawn && pEnt) rulerSpawn.textContent = `[Col ${pEnt.col}: ${Math.round(pEnt.x)}px] SPAWN`;
  if (rulerFinish && fEnt) rulerFinish.textContent = `[Col ${fEnt.col}: ${Math.round(fEnt.x)}px] FINISH`;
  ```

---

### 7. 🪙 Koin & Rintangan Duri Bersifat Pasif Tanpa Respon
* **Masalah:**
  Di preview kanvas, koin dan duri/lava hanya digambar secara visual tanpa adanya collision loop dengan `testPlayer`.
* **Dampak:**
  Pemain bisa menembus koin tanpa efek suara/koleksi, dan menembus duri tanpa efek respawn. Pembuat level tidak bisa memvalidasi tingkat kesulitan rintangan secara akurat di preview.
* **Solusi Kode yang Benar:**
  Tambahkan deteksi overlap sederhana di loop `testPlayer`:
  - Ambil Koin: Jika menyentuh koin, beri efek sparkle, mainkan suara koin (`AudioManager.playCoin()`), dan tandai koin terambil di sesi preview.
  - Kena Duri/Lava: Jika menyentuh duri/lava, mainkan suara hit dan kembalikan pemain ke titik Pintu Spawn.

---

### 8. 📐 Batas Lebar Dunia `worldWidth` Berpotensi Tertahan di 1800px
* **Masalah:**
  Batas horizontal di `testPlayer` menggunakan fallback `const worldW = this.state.worldWidth || 1800;`.
* **Dampak:**
  Jika map panjang (3000px atau 3600px), pemain bisa tertahan di 1785px jika properti `worldWidth` belum terinisialisasi sempurna.
* **Solusi Kode yang Benar:**
  Gunakan nilai `this.state.worldWidth || 3000` secara seragam di seluruh fungsi.

---

### 9. 🖱️ Grid / Petak Kanvas Tidak Bisa Diklik Pada Baris Tertentu
* **Masalah:**
  Fungsi kalkulasi mouse ke grid (`getTileFromMouse`) tidak memperhitungkan rasio CSS scaling (`rect.width` vs `canvas.width`), serta pembatas baris atas/bawah terpotong karena skala vertikal kanvas memotong baris 8 ke bawah.
* **Dampak:**
  Pengguna tidak bisa mengklik petak pada baris tanah (Row 8) atau pinggiran kanvas untuk menempatkan objek atau memilih entitas.
* **Solusi Kode yang Benar:**
  ```javascript
  const rect = this.canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? (this.canvas.width / rect.width) : 1;
  const scaleY = rect.height > 0 ? (this.canvas.height / rect.height) : 1;
  const mouseX = Math.max(0, Math.min(this.canvas.width, (e.clientX - rect.left) * scaleX));
  const mouseY = Math.max(0, Math.min(this.canvas.height, (e.clientY - rect.top) * scaleY));
  ```
  Dan skala kanvas vertikal disetel `scale = H / worldH` sehingga seluruh 20 baris (Row 0..19) terlihat penuh dan dapat diklik.

---

### 10. 🛑 Objek Menimpa / Duplikat di Petak yang Sama (Stacking / Overlap)
* **Masalah:**
  1. Penempatan entitas via tombol panel/palette, penempelan salinan (paste), dan import data map lama menaruh banyak objek di koordinat yang sama.
  2. Fungsi pemisahan `preventAllOverlaps` sebelumnya memanggil `findFreeSlot` tanpa meneruskan peta petak yang sudah dikunci (`occupiedMap`), sehingga slot pengganti bisa bertabrakan lagi dengan objek lain atau terhalang balok tanah modular.
  3. Saat mouse menyeret objek (`_globalMouseMove`), posisi live di Phaser terupdate, namun jika perpindahan ditolak saat dilepas (`_globalMouseUp`), posisi Phaser tidak direvert sehingga objek tertinggal menimpa objek lain.
  4. Di engine game Phaser (`CustomWorldScene`), data entitas dijalankan tanpa filter pembersihan duplikat sehingga objek yang bertumpuk dari file lama langsung dirender menumpuk.
* **Dampak:**
  - Terlihat NPC menumpuk di atas platform atau menumpuk tepat di atas kepala NPC lain.
  - Balok platform, duri, peti, slime, atau koin menembus satu sama lain di sel yang sama.
* **Solusi Kode yang Benar:**
  - **Pencegahan Ketat di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L2030):**
    - `getOccupyingEntity` dan `findFreeSlot` diperbarui dengan parsing integer ketat (`parseInt`) dan mendukung `extraOccupiedMap` (peta kunci terintegrasi).
    - `preventAllOverlaps` memprioritaskan urutan entitas (Player, Portal, Platform, NPC, Monster, dll.), mengunci setiap petak `(col, row)` ke dalam `occupiedMap`, dan memindahkan setiap objek yang berbenturan ke petak terdekat yang benar-benar kosong.
    - Drag & drop mouse otomatis mengembalikan (`revert`) posisi visual & fisika di Phaser jika kotak tujuan ditolak.
  - **Sanitasi Otomatis di [CustomWorldScene.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L80):**
    - Ditambahkan fungsi `sanitizeEntities()` yang berjalan saat scene diinisialisasi (`init`). Setiap objek dipetakan ke grid terisolasi. Jika terdeteksi dua objek berbagi koordinat yang sama, objek kedua otomatis digeser ke petak kosong terdekat sebelum dirender ke kanvas permainan.

---

### 11. 🎮 Tampilan Game Tidak Sesuai Preview (Air, Lava, & Bedrock Row 19)
* **Masalah:**
  Di engine game Phaser (`CustomWorldScene`), air dan lava hanya di-render jika berada di baris 8 (`row === 8`), sehingga balok air/lava melayang di udara atau di dalam gua tidak muncul di gameplay. Selain itu, bedrock dasar (Row 19) belum dirender penuh per kolom.
* **Dampak:**
  Pemain melihat rintangan air/lava di editor preview, namun saat bermain di game (`CustomWorldScene`), rintangan tersebut hilang atau posisi objek tidak sejajar dengan preview.
* **Solusi Kode yang Benar:**
  - Mengubah struktur data air dan lava di `CustomWorldScene` menjadi `waterTileMap` dan `lavaTileMap` berbasis Set (`col,row`) yang membaca seluruh baris dari 0 sampai 19.
  - Memastikan balok Bedrock tak tertembus (Row 19) di-generate untuk setiap kolom dunia dari 0 sampai `totalCols`.
  - Sinkronisasi Y-offset antara canvas preview dan Phaser physics bodies.

---

### 12. 🟢💀 Monster (Slime Hijau & Skeleton Putih) Jatuh ke Jurang / Jatuh Saat di Udara
* **Masalah:**
  Di engine game Phaser ([CustomWorldScene.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L830)), slime dan skeleton dibuat menggunakan dynamic physics body (`this.physics.add.existing(container)`) dengan collider platform dan tanpa menonaktifkan gravitasi dunia (`allowGravity = true`).
* **Dampak:**
  - Jika pengguna menempatkan monster di langit/udara (seperti Row 0, 1, 2) untuk rintangan terbang, atau menempatkannya di atas celah/jurang galian, gravitasi Phaser langsung menarik monster jatuh ke bawah hingga lenyap ke dasar layar.
  - Untuk slime, animasi melompat naik-turun (tween) bertabrakan dengan tarikan gravitasi fisik ke bawah sehingga slime terlempar atau jatuh menembus tanah.
  - Untuk skeleton, ketika berpatroli dan ujung langkahnya melewati tepi balok pijakan, gravitasi langsung menjatuhkannya ke jurang. Sementara di preview editor, monster diam dan berpatroli rapi di baris/ketinggian yang ditentukan pembuat level tanpa pernah jatuh.
* **Solusi Kode yang Benar:**
  - Menyetel `container.body.moves = false;` pada monster slime dan skeleton. Di Phaser 3 Arcade Physics, `body.moves = false` membuat physics body kebal terhadap gravitasi dan gaya luar, namun hitbox otomatis mengikuti pergerakan posisi visual container setiap tick.
  - Menggerakkan slime melompat (18px) dan berpatroli (12px) menggunakan Phaser Tween dengan interpolasi `Sine`.
  - Menggerakkan skeleton berpatroli (16px) menggunakan Phaser Tween horizontal bolak-balik tanpa gaya gravitasi yang bisa menjatuhkannya ke jurang.
  - Menghapus collider platform yang tidak diperlukan karena ketinggian monster sepenuhnya dikunci di petak grid desainnya.

---

### 13. ❄️ Game Freeze / Hang Saat Pemain Menyentuh Monster
* **Masalah:**
  Di fungsi tabrakan [CustomWorldScene.js:1611](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/scenes/CustomWorldScene.js#L1611), terdapat pemanggilan `AudioManager.playHazardHit()`. Namun di [AudioManager.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/utils/AudioManager.js), method yang tersedia bernama `playHurt()`.
* **Dampak:**
  Begitu pemain menyentuh monster, terjadi error runtime `TypeError: AudioManager.playHazardHit is not a function`. Di dalam callback Arcade Physics Phaser, error yang tidak tertangkap langsung menghentikan loop rendering frame Phaser (`requestAnimationFrame`), sehingga layar permainan seketika membeku (*freeze*).
* **Solusi Kode yang Benar:**
  - Menambahkan method alias `playHazardHit() { this.playHurt(); }` di [AudioManager.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/utils/AudioManager.js#L95).
  - Membungkus pemanggilan audio dan efek visual di `handleHazardDamage()` dengan `try/catch` dan *safe null checking* agar masalah suara/efek tidak pernah lagi menyebabkan game freeze.

---

### 14. 📁 Hierarchy Panel Kepanjangan & Sistem Folder Kategori Otomatis
* **Masalah:**
  Daftar objek di panel Hierarchy ditampilkan datar (*flat list*). Ketika pengguna menaruh banyak monster (misalnya 11 Slime dan 4 Skeleton), daftar item memanjang ke bawah dan menyulitkan navigasi.
* **Solusi Kode yang Benar:**
  - Membuat sistem Folder Kategori Otomatis di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L23):
    1. `🚪 Titik Awal & Akhir` (`player`, `portal`)
    2. `👾 Monster & Musuh` (`slime`, `skeleton`)
    3. `🧙 Karakter & NPC` (`npc`)
    4. `🧱 Pijakan & Blok` (`platforms`, `dirt`)
    5. `⚠️ Rintangan & Bahaya` (`spikes`, `water`, `lava`)
    6. `🪙 Koleksi & Peti` (`coins`, `chest`)
  - Setiap folder dapat di-collapse/expand dengan mengklik header folder atau menggunakan tombol `📁 Buka/Tutup`.
  - **Strict Category Locking**: Objek monster otomatis masuk ke folder `Monster & Musuh`. Drag & drop reordering di Hierarchy hanya diizinkan di dalam folder kategori yang sama; aksi drop ke folder kategori lain diblokir/ditolak sehingga objek tidak bisa tercampur ke kategori lain.
  - **Auto-Unfold on Select**: Memilih objek dari kanvas akan membuka folder kategori tempat objek berada secara otomatis.

---

### 15. ⚡ Folder Buka/Tutup Hierarchy Macet & Animasi Kurang Smooth
* **Masalah:**
  1. Saat objek di dalam folder (misal `Pijakan #1`) sedang aktif terseleksi, fungsi `renderHierarchy()` selalu memaksa folder terbuka kembali (*force auto-unfold*), sehingga saat pengguna mengeklik header folder untuk menutupnya, folder menolak tertutup dan langsung terbuka lagi.
  2. Klik header sebelumnya memicu render ulang seluruh DOM (`innerHTML = ...`), yang menghilangkan status CSS dan terasa lambat/kaku.
* **Solusi Kode yang Benar:**
  - Menghapus pengecekan paksa auto-unfold di dalam `renderHierarchy()`. Auto-unfold sekarang hanya dipanggil saat pengguna memilih objek baru dari kanvas lewat `ensureEntityFolderVisible(id)`.
  - Menerapkan animasi **CSS Grid Accordion Smooth** (`grid-template-rows: 1fr` <-> `0fr`, transisi `0.22s cubic-bezier(0.4, 0, 0.2, 1)`) dan rotasi panah halus pada `.gt-sb-folder-wrapper` dan `.gt-sb-folder-arrow`.
  - Event klik pada header folder sekarang langsung mengubah CSS class di DOM secara instan tanpa perlu merusak dan membangun ulang seluruh elemen list.

---

### 16. 🎨 Penggantian Dropdown Preset Latar dengan Pemilih Warna Kustom Langsung
* **Permintaan:**
  Dropdown preset latar (Pegunungan Salju, Hong Kong, Hutan Purba, dll) yang memakan tempat dihapus, namun fitur kustomisasi warna latar dunia (langit) dipertahankan.
* **Solusi Kode yang Benar:**
  - Menghapus elemen `<select id="gt-sb-select-bg">` di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L1393).
  - Menggantinya dengan modul **Pemilih Warna Kustom**:
    1. Kotak *Color Swatch* interaktif (`#gt-sb-color-preview`): Menampilkan warna langit aktif saat ini, dan membuka palette color picker saat diklik.
    2. Input teks HEX (`#gt-sb-color-hex`): Pengguna bisa mengetik atau menempelkan kode warna HEX apa pun (misal `#062817`, `#090D16`, `#DCFF78`).
    3. Input warna asli (`#gt-sb-color-picker`): Menghubungkan dialog warna bawaan peramban.
  - Perubahan warna langsung sinkron secara realtime ke kanvas preview Scene Builder dan dunia permainan Phaser (`CustomWorldScene`).

---

### 17. 🏷️ Penghapusan Badge "Col" di Panel Hierarchy
* **Penjelasan:**
  Label `Col X` menunjukkan nomor kolom grid (koordinat horizontal). Informasi koordinat ini sudah ditampilkan lengkap dan detail di panel Inspector kanan (Kolom, Baris, X, Y, Lebar), sehingga menampilkannya di setiap baris item Hierarchy membuat daftar terlihat penuh dan ramai.
* **Solusi Kode yang Benar:**
  - Menghapus elemen `<span class="gt-sb-tree-coord">Col ${ent.col}</span>` dari baris item di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L1685).
  - Tampilan item Hierarchy kini bersih, rapi, dan minimalis.

---

### 18. 🧹 Clean Up Panel Inspector Menjadi Ringkas & Dinamis
* **Masalah:**
  Panel Inspector sebelumnya menampilkan banyak teks statis dan kontrol yang tidak relevan dengan objek tertentu (misalnya pada Player Spawn terdapat input lebar blok, teks auto-merge, dimensi tile statis, dan card aksi kosong).
* **Solusi Kode yang Benar di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js#L2855):**
  - **Hapus Teks Statis:** Menghapus koordinat mentah `World Pos (X, Y)`, `Dimensi Tile`, dan kotak hijau `Auto-Merge`.
  - **Dinamis Sesuai Tipe Objek:** Input `Panjang Pijakan` sekarang HANYA muncul pada objek pijakan (`platforms`).
  - **Sembunyikan Aksi Kosong:** Card `⚡ AKSI OBJEK` hanya ditampilkan jika objek bisa diduplikasi atau dihapus (tidak lagi memunculkan card kosong berbadge kunci pada Player Spawn).
  - Menyelaraskan batas Kolom dan Baris secara dinamis sesuai ukuran dunia aktif.

---

### 19. 💡 Pembersihan Badge Petunjuk Hotbar "Drag / Klik Item ke Kanvas"
* **Konteks:**
  Kotak petunjuk `💡 Drag / Klik Item ke Kanvas` pada header drawer hotbar bawah dihapus agar antarmuka studio terlihat lebih bersih, rapi, dan tidak memakan ruang visual.
* **Solusi Kode yang Benar di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js):**
  - Menghapus kontainer `.gt-sb-drawer-right` dan badge `.gt-sb-drawer-hint`.
  - Menghapus aturan CSS terkait `.gt-sb-drawer-hint` dan `.gt-sb-drawer-right`.

---

### 20. ⌨️ Sistem Shortcut Keyboard Lengkap & Modal Panduan (PC / Laptop)
* **Konteks:**
  Pengembangan game pada PC/laptop membutuhkan shortcut standar industri (Unity/Unreal/Figma/Blender) agar pembuatan level jauh lebih cepat dan intuitif.
* **Fitur & Shortcut yang Diterapkan di [SceneBuilderModal.js](file:///c:/Users/tryfi/OneDrive/foto-%20camera/Documents/andika/template_game2d/src/ui/SceneBuilderModal.js):**
  - **Edit & Clipboard:**
    - `Ctrl + C` : Salin (Copy) objek terpilih.
    - `Ctrl + V` : Tempel (Paste) objek di posisi kursor mouse atau slot kosong terdekat.
    - `Ctrl + X` : Potong (Cut) objek terpilih ke clipboard.
    - `Ctrl + D` : Duplikasi instan di samping tanpa menimpa objek lain.
    - `Del` / `Backspace` : Hapus objek terpilih atau area seleksi kotak.
    - `Ctrl + Z` : Undo (Batalkan aksi terakhir).
    - `Ctrl + Y` / `Ctrl + Shift + Z` : Redo (Ulangi aksi).
    - `Ctrl + A` : Pilih seluruh petak kanvas (Select All).
  - **Navigasi & Kanvas:**
    - `F` : Pusatkan kamera (Focus) ke objek terpilih.
    - `H` : Pusatkan kamera ke titik awal Spawn.
    - `G` : Nyalakan / matikan garis grid 50px (Toggle Grid).
    - `R` : Reset kamera ke awal level.
    - `Scroll Mouse` : Geser horizontal sepanjang level (Pan).
    - `Alt + Drag Klik` / `Klik Tengah` : Geser bebas kanvas.
  - **Presisi & Seleksi:**
    - `Panah (↑ ↓ ← →)` : Nudge (geser halus) objek 1 petak.
    - `Shift + Panah` : Perluas multi-seleksi kotak.
    - `Esc` : Batalkan seleksi / tutup modal bantuan / tutup studio.
  - **Penyimpanan & Game:**
    - `Ctrl + S` : Simpan perubahan level ke Proyek (mencegah dialog Save HTML bawaan peramban).
    - `Ctrl + Enter` : Simpan dan langsung mainkan ke dunia game (Play World).
    - `?` / `Ctrl + /` / `F1` : Membuka popup dialog Cheatsheet Shortcut Keyboard lengkap.
  - **Feedback UI Visual:**
    - Ditambahkan tombol **`💾 Simpan`** dan **`⌨️ Shortcut`** di toolbar kanan atas.
    - Floating Toast Notifications (`.gt-sb-toast`) dengan feedback visual saat copy, cut, paste, duplicate, delete, undo, redo, dan save berhasil dijalankan.

---

## 🚀 Rencana Eksekusi Perbaikan

1. **Fase 1 (Prioritas Tertinggi - Fisika & Gameplay):**
   - Perbaiki Bug #1 (Platform pass-through) & Bug #2 (Snap-to-top jump).
   - Perbaiki Bug #3 (Ketinggian dunia & Bedrock Row 19).
2. **Fase 2 (Prioritas Tinggi - Interaksi & Kontrol):**
   - Perbaiki Bug #4 (Nonaktifkan toolbar seleksi saat uji gerak).
   - Perbaiki Bug #5 (Dukungan Arrow Keys untuk uji gerak).
3. **Fase 3 (Penyempurnaan Tampilan & Feedback):**
   - Perbaiki Bug #6 (Pembulatan ruler pixel).
   - Tambahkan interaksi koleksi koin & respawn duri (Bug #7).
   - Sinkronisasi `worldWidth` 3000px seragam (Bug #8).
