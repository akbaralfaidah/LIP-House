# PRD — Interactive Mockup: Sistem Live Siteplan LIP House

## 1. Tujuan Mockup
Membangun prototipe web interaktif (Frontend-only, tanpa backend) untuk dipresentasikan kepada manajemen **LIP House** sebagai tahap persetujuan sebelum masuk ke pengembangan penuh. Mockup ini harus membuktikan bahwa sistem menyelesaikan masalah utama klien: mengganti siteplan tempel di dinding yang sering telat update menjadi peta digital real-time yang bisa diekspor menjadi **1 file PDF penuh (4 halaman, tanpa ZIP)**.

## 2. Tech Stack & Arsitektur Mockup
- **Framework:** Vite + React + TypeScript
- **Styling:** Tailwind CSS + Lucide React (icons)
- **State & Persistence:** React State + `localStorage` (perubahan status langsung tersimpan di browser saat demo, plus tombol "Reset Data Demo")
- **Visual Style:** Clean Corporate Light Mode (latar putih/slate terang agar 6 warna kavling kontras tajam di layar HP maupun saat dicetak ke PDF). Hindari dark mode.
- **Responsive:** Wajib nyaman digunakan di desktop (atasan/admin) maupun smartphone (marketing/survei lapangan).

## 3. Ruang Lingkup Data Dummy (4 Lokasi Siteplan)
Buat **4 proyek perumahan** yang masing-masing memiliki layout peta SVG vektor **berbeda dan realistis** (memiliki jalan utama, jalan blok, area fasum/taman/masjid, dan barisan kavling berlabel kode blok seperti `A1`, `A31`, `B1`, `C12`).
1. **LIP Residence 1 — Mendalo** (48 kavling: Blok A, B, C)
2. **LIP Residence 2 — Mayang** (54 kavling: Blok A, B, C, D)
3. **LIP Residence 3 — Kenali** (42 kavling: Blok A, B)
4. **LIP Residence 4 — Paal Merah** (56 kavling: Blok A, B, C, D)

**Aturan Ketat Data per Kavling (Sesuai Permintaan Klien):**
- Karena mayoritas rumah subsidi dengan ukuran seragam, **JANGAN tampilkan field luas tanah, luas bangunan, atau spesifikasi teknis rumit.**
- Fokus data per unit hanya pada:
  1. `id` & `blockCode` (contoh: `A31`, `B1`)
  2. `status` (1 dari 6 status resmi)
  3. `updatedAt` (timestamp terakhir diubah)
  4. `updatedBy` (nama admin pengubah)
  5. `note` (catatan singkat opsional, misal: "Menunggu kelengkapan berkas KTP/KK")

## 4. Sistem 6 Warna & Status Kavling
Gunakan palet warna kontras tinggi yang tetap terbaca jelas saat dicetak PDF:
1. **Open** (`#22C55E` — Hijau) — Unit tersedia
2. **Minat** (`#EAB308` — Kuning) — Calon konsumen berminat
3. **Booking** (`#F97316` — Oranye) — **Belum Lock** (tampilkan sub-label/keterangan: *"Belum terkunci, menunggu berkas lengkap"*, beri efek border putus-putus halus di peta agar secara visual berbeda dengan unit terkunci)
4. **SP3K** (`#2563EB` — Biru) — **Unit Terkunci** (berkas disetujui bank)
5. **Akad / Cash** (`#7C3AED` — Ungu) — Terjual / Closing final
6. **Reject** (`#EF4444` — Merah) — Pengajuan/berkas ditolak

## 5. Manajemen 3 Role + Demo Role Switcher
Sediakan **Role Switcher Bar** tipis dan elegan di bagian paling atas aplikasi (dengan label *"Mode Preview Demo:"*) agar klien bisa langsung mencoba perbedaan 3 role tanpa perlu login ulang:

1. **Admin (Update Siteplan)**
   - Akses penuh melihat 4 siteplan dan rekap statistik.
   - Bisa mengklik kavling mana saja untuk mengubah status (6 tombol warna instan sekali klik) + menambah/mengedit catatan singkat.
   - Perubahan langsung meng-update warna di SVG, angka statistik dashboard, log aktivitas, dan isi export PDF secara real-time.
   - Bisa Download **1 PDF Full (Semua Siteplan)**.
2. **Pimpinan / Kepala Penjualan (Live Monitoring)**
   - **Read-Only** (tidak bisa mengubah status kavling; jika klik kavling hanya muncul detail status, catatan, dan waktu update terakhir).
   - Melihat Dashboard Ringkasan Eksekutif (total agregat 4 lokasi + perbandingan per lokasi + grafik/bar proporsi 6 status + Log Perubahan Terakhir).
   - Bisa Download **1 PDF Full (Semua Siteplan)**.
3. **Marketing Internal**
   - **Read-Only** (fokus cepat mengecek ketersediaan kavling di lapangan lewat HP).
   - Akses cepat filter status (misal sekali klik hanya sorot unit `Open` dan `Booking - Belum Lock`).
   - Tidak melihat log aktivitas admin dan tidak melihat catatan internal sensitif.
   - Bisa Download **1 PDF Full (Semua Siteplan)**.

## 6. Fitur Utama yang Wajib Berfungsi di Mockup
1. **Dashboard Overview (Ringkasan 4 Lokasi):**
   - Total KPI keseluruhan unit dari 4 lokasi berdasarkan 6 status warna.
   - 4 Kartu Proyek (nama lokasi, total unit, bar distribusi warna mini, timestamp update terakhir, tombol "Buka Peta").
   - Tombol CTA utama yang menonjol: **"Export Semua Siteplan (1 PDF)"**.
2. **Interactive Siteplan Viewer (Peta Digital):**
   - Tab navigasi cepat untuk pindah antar 4 siteplan.
   - Kontrol **Zoom In (+), Zoom Out (-), Reset View**, dan **Drag/Pan** yang mulus di mouse maupun layar sentuh HP.
   - **Pencarian Nomor Blok** (ketik `A31` atau `B1` → peta menyorot/highlight kavling tersebut dengan animasi pulse).
   - **Filter Status Warna** (klik salah satu warna di legenda → kavling dengan status lain dibuat agak transparan/dimmed agar fokus langsung terlihat).
   - **Klik Kavling:** Di desktop muncul side-panel kanan; di mobile muncul bottom-sheet.
     - Mode Admin: langsung pilih 1 dari 6 status + input catatan singkat + tombol Simpan.
     - Mode Pimpinan/Marketing: tampilan info ringkas status & keterangan lock/belum lock.
3. **Export 1 PDF Full (Multi-Halaman, Tanpa ZIP) — Wajib Bekerja Nyata:**
   - Disediakan tombol **"Export 4 Siteplan (1 PDF)"** di Header/Dashboard dan opsi **"Export Siteplan Ini (PDF)"** di halaman peta.
   - Implementasikan menggunakan **Dedicated Print View (`@media print`)** dengan aturan `@page { size: A4 landscape; margin: 10mm; }` dan `break-after: page` per lokasi (plus mode Preview Modal PDF sebelum cetak/simpan).
   - Hasil cetak PDF **harus berbasis vektor SVG murni** (bukan canvas/screenshot buram) sehingga nomor blok `A31`/`B1` tetap tajam 100% saat di-zoom.
   - Struktur tiap halaman PDF (total 4 halaman dalam 1 file PDF):
     - Header: Logo teks **LIP HOUSE**, Nama Lokasi Siteplan, Tanggal & Jam Cetak Live, keterangan "Halaman X dari 4".
     - Tengah: Peta SVG Full Color sesuai status real-time terakhir.
     - Bawah/Samping: Legenda 6 warna + Tabel Rekap Jumlah & Persentase Unit per status.