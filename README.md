# Bantu Beres – Asisten AI Kepala Sekolah

Asisten kerja khusus kepala sekolah untuk menghubungkan Profil dan Memori Sekolah dengan PBD, KSP, RKJM, RKT, RKAS Assistant, program kegiatan, dokumen, dan pengelolaan kinerja.

## Status deployment

- Frontend responsif desktop dan mobile siap dipublikasikan di Vercel.
- Supabase Auth, database, RLS, dan Storage sudah terhubung.
- AI aktif otomatis saat sedikitnya satu kunci GroqCloud server-side terbaca.
- Jika AI belum aktif, tampilan menampilkan status yang jelas dan tidak menghasilkan data simulasi.

## Fitur

- Landing page profesional, animasi halus, dan tampilan glass yang terang.
- Login, pendaftaran, onboarding, dan workspace sekolah dengan akses tim penuh tanpa berbagi kata sandi.
- Sesi tersimpan pada perangkat dan berakhir otomatis setelah dua jam tanpa aktivitas; keluar hanya memutus sesi perangkat tersebut.
- Profil serta Memori Sekolah sebagai sumber data utama.
- Unggah dokumen ke bucket Supabase privat.
- Dashboard, agenda, proyek, Pusat Dokumen, editor, status persetujuan, dan ekspor.
- Alur KSP, PBD, RKJM, RKT, RKAS, administrasi kegiatan, SOP, dan kinerja.
- Backend GroqCloud dengan rotasi tiga key dan urutan Flash lalu Flash-Lite.
- BYOK GroqCloud per akun: disimpan sebagai AES-256-GCM ciphertext dan dipakai setelah key aplikasi.
- Pipeline dokumen bertahap: pemetaan bukti dan template, pemeriksaan acuan pemerintah terkini, penyusunan lengkap, audit mutu independen, dan perbaikan otomatis bila hasil belum memenuhi ambang.
- Pemilih template dari Memori Sekolah, registri acuan pendidikan terverifikasi, skor mutu, pratinjau terformat, serta ekspor Word/PDF/Excel tanpa simbol Markdown.
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
       ├── verifikasi akses workspace dan memori sekolah
       ├── registri standar pendidikan + pemeriksaan Google Search resmi
       └── GroqCloud (rotasi key, fallback model, quality gate)
```

URL dan publishable key Supabase boleh digunakan oleh browser. Perlindungan data tetap dilakukan oleh RLS. Service-role key dan kunci GroqCloud tidak boleh dimasukkan ke repository atau frontend.

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
GROQ_API_KEY_1
GROQ_API_KEY_2
GROQ_API_KEY_3
MODEL_DIPILIH_OTOMATIS
MODEL_CADANGAN_OTOMATIS
MAX_INLINE_FILE_BYTES
```

Setelah satu key tersedia, endpoint `/api/config` otomatis mengubah `aiConfigured` menjadi `true`. Kunci tidak pernah dikirim ke browser.
Kode juga menerima alias `GROQ_API_KEY_1` sampai `GROQ_API_KEY_3`, serta `GROQ_API_KEY` atau `GROQ_API_KEY` untuk slot pertama.

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

Hasil AI berupa dokumen kerja lengkap yang siap ditinjau, diedit, dan disetujui kepala sekolah. Bantu Beres tidak menggantikan pengesahan atau penginputan pada ARKAS, e-Kinerja, Rapor Pendidikan, dan sistem resmi pemerintah.

## Perubahan ke GroqCloud (8 November 2026)

AI menggunakan GroqCloud melalui `https://api.groq.com/openai/v1`. Pengguna dapat menambahkan key GroqCloud pribadi (`gsk_...`) lewat **Pengaturan AI**, lengkap dengan panduan pembuatan key di https://console.groq.com/keys. Key disimpan terenkripsi dan dipakai setelah key aplikasi. Model dipilih otomatis memakai endpoint GroqCloud Models API, dengan fallback. Pengaturan server opsional: `GROQ_API_KEY_1` s.d. `GROQ_API_KEY_3`. API key Gemini yang lama tidak dipakai untuk pemanggilan AI.

**Syarat database:** Jalankan migration `20261108000100_add_groq_provider.sql` sebelum merilis server baru, karena penyimpanan key per pengguna memerlukan provider `groq` yang terpisah dari baris lama `gemini`. Semua key lama dibiarkan utuh dan tidak dipakai kembali.

**Perbedaan kemampuan:** GroqCloud Chat Completions tidak menerima PDF mentah untuk analisis. PDF tetap tersimpan, namun pembacaan otomatis PDF membutuhkan ekstraksi teks menjadi TXT atau konversi halaman menjadi gambar. Gambar JPEG/PNG/WEBP diproses oleh model vision jika tersedia pada key. Sistem pemeriksaan standar menggunakan registri resmi yang telah ada, tetapi tidak mengklaim akses Google Search real-time. Jangan menganggap referensi model telah diverifikasi web secara langsung.

Setelah pembaruan, pengguna menerima notifikasi tentang perubahan provider, key yang perlu diganti, dan pemilihan model otomatis.
