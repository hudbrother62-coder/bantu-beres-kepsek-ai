# Bantu Beres – Asisten AI Kepala Sekolah

Asisten kerja khusus kepala sekolah untuk menghubungkan Profil dan Memori Sekolah dengan PBD, KSP, RKJM, RKT, RKAS Assistant, program kegiatan, dokumen, dan pengelolaan kinerja.

## Status deployment

- Frontend responsif desktop dan mobile siap dipublikasikan di Vercel.
- Supabase Auth, database, RLS, dan Storage sudah terhubung.
- AI aktif otomatis saat sedikitnya satu kunci Gemini server-side terbaca.
- Jika AI belum aktif, tampilan menampilkan status yang jelas dan tidak menghasilkan data simulasi.

## Fitur

- Landing page profesional, animasi halus, dan tampilan glass yang terang.
- Login, pendaftaran, onboarding, dan workspace sekolah dengan akses tim penuh tanpa berbagi kata sandi.
- Profil serta Memori Sekolah sebagai sumber data utama.
- Unggah dokumen ke bucket Supabase privat.
- Dashboard, agenda, proyek, Pusat Dokumen, editor, status persetujuan, dan ekspor.
- Alur KSP, PBD, RKJM, RKT, RKAS, administrasi kegiatan, SOP, dan kinerja.
- Backend Gemini dengan rotasi tiga key dan urutan Flash lalu Flash-Lite.
- Asisten AI untuk percakapan bebas yang menggunakan Profil, dokumen Memori Sekolah, dan riwayat privat setiap akun.
- Tim Sekolah dengan tautan undangan satu kali; tiap anggota memakai email sendiri dan mempunyai akses kerja yang sama.
- Pustaka Format yang membuka folder asli Google Drive tanpa menyalin ulang file.
- Panduan operasional lengkap dalam satu halaman dan menu mobile ringkas.

## Arsitektur

```text
Browser
  ├── UI responsif
  ├── Supabase Auth + tabel kepsek_* + Storage privat
  └── Vercel Functions /api
       ├── validasi token Supabase
       ├── verifikasi kepemilikan sekolah
       └── Gemini (rotasi key dan fallback model)
```

URL dan publishable key Supabase boleh digunakan oleh browser. Perlindungan data tetap dilakukan oleh RLS. Service-role key dan kunci Gemini tidak boleh dimasukkan ke repository atau frontend.

## Database

Migration produksi:

```text
supabase/migrations/20260902140000_kepsek_core.sql
supabase/migrations/20260902143000_kepsek_workspace_v1.sql
supabase/migrations/20260902230500_harden_agenda_privileges.sql
supabase/migrations/20260903015000_add_kepsek_assistant_messages.sql
supabase/migrations/20260903143000_add_full_access_team_and_library.sql
```

Semua objek aplikasi ini menggunakan awalan `kepsek_` agar tidak bertabrakan dengan aplikasi lain di project Supabase yang sama. Migration tidak menghapus tabel atau data yang sudah ada.

## Konfigurasi AI

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
Kode juga menerima alias `GEMINI_KEY_1` sampai `GEMINI_KEY_3`, serta `GEMINI_API_KEY` atau `GOOGLE_API_KEY` untuk slot pertama.

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
