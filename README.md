# LIP House — Sistem Live Siteplan Digital (Interactive Mockup)

**Live Demo:** https://lip-house-siteplan.vercel.app

Prototipe web interaktif (Frontend-only) untuk presentasi sistem **Live Siteplan Digital LIP House**, menggantikan siteplan tempel di dinding dengan peta vektor SVG real-time yang dapat diekspor ke **1 file PDF penuh (4 halaman A4 Landscape, tanpa ZIP)**.

## Fitur Utama
- **4 Lokasi Siteplan Vektor CAD (Total 200 Kavling):**
  1. **LIP Residence 1 — Mendalo** (`48` kavling: Blok A, B, C)
  2. **LIP Residence 2 — Mayang** (`54` kavling: Blok A, B, C, D)
  3. **LIP Residence 3 — Kenali** (`42` kavling: Blok A, B)
  4. **LIP Residence 4 — Paal Merah** (`56` kavling: Blok A, B, C, D)
- **6 Status Warna Matte Arsitektural:**
  - **Open** (`#4E8C5F`) — Unit tersedia
  - **Minat** (`#D6AE48`) — Calon konsumen berminat
  - **Booking — Belum Lock** (`#CC733C`, border putus-putus) — Belum terkunci, menunggu berkas lengkap
  - **SP3K — Unit Terkunci** (`#30548E`) — Berkas disetujui bank
  - **Akad / Cash** (`#6E518A`) — Terjual / closing final
  - **Reject** (`#B94B50`) — Pengajuan / berkas ditolak
- **Mode Demo 3 Role:** `Admin` (update status 1 klik + catatan singkat), `Pimpinan` (read-only + rekap & log perubahan), dan `Marketing` (read-only fokus lapangan + filter cepat *Open & Booking*, tanpa catatan internal/log admin).
- **Peta Interaktif:** Pencarian nomor blok (`A31`, `B1`, `C12`) dengan animasi pulse, filter warna di legenda, drag/pan, zoom (`Ctrl + Scroll` / tombol `+`/`-`), responsif desktop & mobile bottom-sheet.
- **Export 1 File PDF Penuh (4 Halaman Vektor):** Dilengkapi pratinjau cetak A4 Landscape + aturan `@media print` murni berbasis SVG vektor sehingga nomor blok tetap tajam saat di-zoom.
- **Persistensi Lokal:** Perubahan status otomatis tersimpan di `localStorage` browser selama demo, lengkap dengan tombol **Reset Data**.

## Tech Stack
- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4**
- **Lucide React**

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```
