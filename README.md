# Bantu Beres KEPSEK AI

Asisten kerja khusus kepala sekolah untuk menghubungkan Profil dan Memori Sekolah dengan PBD, KSP, RKJM, RKT, RKAS Assistant, program kegiatan, dokumen, dan pengelolaan kinerja.

## Status deployment

- Frontend responsif desktop dan mobile siap dipublikasikan di Vercel.
- Supabase Auth, database, RLS, dan Storage sudah terhubung.
- AI sengaja dinonaktifkan sampai kunci Gemini server-side dipasang.
- Saat AI belum aktif, tampilan menampilkan status yang jelas dan tidak menghasilkan data simulasi.

## Fitur

- Landing page profesional, animasi halus, dan tampilan glass yang terang.
- Login, pendaftaran, onboarding, dan workspace khusus kepala sekolah.
- Profil serta Memori Sekolah sebagai sumber data utama.
- Unggah dokumen ke bucket Supabase privat.
- Dashboard, agenda, proyek, Pusat Dokumen, editor, status persetujuan, dan ekspor.
- Alur KSP, PBD, RKJM, RKT, RKAS, administrasi kegiatan, SOP, dan kinerja.
- Backend Gemini dengan tiga key dan urutan Flash lalu Flash-Lite, siap diaktifkan kemudian.

## Arsitektur

```text
Browser
  ├── UI responsif
  ├── Supabase Auth + tabel kepsek_* + Storage privat
  └── Vercel Functions /api
       ├── validasi token Supabase
       ├── verifikasi kepemilikan sekolah
       └── Gemini (nonaktif sampai key tersedia)
```

URL dan publishable key Supabase boleh digunakan oleh browser. Perlindungan data tetap dilakukan oleh RLS. Service-role key dan kunci Gemini tidak boleh dimasukkan ke repository atau frontend.

## Database

Migration produksi:

```text
supabase/migrations/20260902143000_kepsek_workspace_v1.sql
```

Semua objek aplikasi ini menggunakan awalan `kepsek_` agar tidak bertabrakan dengan aplikasi lain di project Supabase yang sama. Migration tidak menghapus tabel atau data yang sudah ada.

## Mengaktifkan AI nanti

Tambahkan environment variable server-side berikut di Vercel:

```text
GEMINI_AUTH_KEY_1
GEMINI_AUTH_KEY_2
GEMINI_AUTH_KEY_3
GEMINI_PRIMARY_MODEL
GEMINI_FALLBACK_MODEL
MAX_INLINE_FILE_BYTES
```

Setelah satu key tersedia, endpoint `/api/config` otomatis mengubah `aiConfigured` menjadi `true`. Kunci tidak pernah dikirim ke browser.

## Pemeriksaan lokal

```bash
npm test
npm run build
```

Untuk melihat UI statis:

```bash
python3 -m http.server 3000
```

## Vercel

`vercel.json` memaksa preset `Other`, menjalankan pemeriksaan build, mempertahankan Vercel Functions dalam folder `api/`, mengatur SPA rewrite, dan memasang security headers. Tidak ada pola `functions: "api/*.js"` yang menyebabkan error deployment lama.

Hasil AI selalu berupa draft dan tidak menggantikan ARKAS, e-Kinerja, Rapor Pendidikan, atau sistem resmi pemerintah.
