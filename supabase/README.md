# Supabase schema

Folder ini menyimpan migrasi khusus Bantu Beres Kepsek AI yang sudah
tercatat pada proyek Supabase bersama:

- `20260831150731_kepsek_ai_core.sql`
- `20260831150816_kepsek_ai_indexes.sql`
- `20260901032343_harden_kepsek_ownership.sql`

Proyek remote juga memuat migrasi aplikasi lain. Jangan menghapus, memperbaiki
history, atau menjalankan reset database dari repositori ini. Untuk perubahan
berikutnya, buat migrasi baru yang hanya menyentuh objek berawalan `kepsek_`,
tinjau SQL, lalu jalankan melalui alur migrasi Supabase.
