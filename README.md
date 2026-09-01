# Bantu Beres Kepsek AI

Asisten digital kepala sekolah untuk profil sekolah, perencanaan berbasis data,
KSP, RKJM, RKT, RKAS, kurikulum, supervisi, pengelolaan kinerja, SOP, surat,
notulen, program kerja, kehadiran guru, serta pustaka dokumen.

## Stack

- Next.js 16 + React 19
- Supabase Auth, Postgres, dan Row Level Security
- Gemini Flash dengan rotasi tiga API key dan model fallback
- Vercel

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi URL dan publishable key Supabase.
3. Isi minimal satu API key Gemini untuk hasil AI. Tanpa key, aplikasi memakai
   mesin template transparan agar alur tetap dapat diuji.
4. Jalankan `npm install`, lalu `npm run dev`.

Semua kunci Gemini hanya dibaca di server. Jangan menambahkan file `.env*`
berisi nilai rahasia ke Git.
