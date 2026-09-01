import { Bot, CheckCircle2, CircleAlert, Database, KeyRound, LockKeyhole, School, ServerCog } from 'lucide-react';
import Link from 'next/link';
import { getAiConfiguration, requireWorkspace } from '@/lib/data';

export const metadata = { title: 'Pengaturan' };

export default async function SettingsPage() {
  const [workspace, ai] = await Promise.all([requireWorkspace(), Promise.resolve(getAiConfiguration())]);
  const aiReady = ai.keyCount > 0;
  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">PENGATURAN</span><h1>Status workspace dan integrasi</h1><p>Lihat koneksi utama yang digunakan untuk mengamankan data dan membuat dokumen.</p></div></section>

      <section className="settings-grid">
        <article className="panel settings-card"><header><span className="settings-icon settings-icon--violet"><Bot /></span><div><small>MESIN DOKUMEN</small><h2>Google Gemini</h2></div><span className={aiReady ? 'status-pill status-pill--success' : 'status-pill status-pill--warning'}>{aiReady ? <CheckCircle2 /> : <CircleAlert />}{aiReady ? 'Siap' : 'Mode template'}</span></header><dl><div><dt>Model utama</dt><dd>{ai.primaryModel}</dd></div><div><dt>Model cadangan</dt><dd>{ai.fallbackModel}</dd></div><div><dt>API key aktif</dt><dd>{ai.keyCount} dari 3 slot</dd></div></dl><p>{aiReady ? 'Permintaan akan berpindah model dan key bila layanan utama mengalami kegagalan.' : 'Generator tetap menghasilkan kerangka dokumen yang dapat diedit. Secret Gemini perlu ditambahkan pada lingkungan deployment untuk hasil AI penuh.'}</p></article>

        <article className="panel settings-card"><header><span className="settings-icon settings-icon--blue"><Database /></span><div><small>DATA & AUTENTIKASI</small><h2>Supabase</h2></div><span className="status-pill status-pill--success"><CheckCircle2 /> Terhubung</span></header><dl><div><dt>Akun</dt><dd>{workspace.email || 'Email terverifikasi'}</dd></div><div><dt>Sekolah</dt><dd>{workspace.school.name}</dd></div><div><dt>Isolasi data</dt><dd>Row Level Security</dd></div></dl><p>Profil, konteks sekolah, program, kehadiran, serta semua versi dokumen hanya dapat diakses oleh pemilik akun.</p></article>

        <article className="panel settings-card"><header><span className="settings-icon settings-icon--teal"><School /></span><div><small>WORKSPACE</small><h2>Identitas sekolah</h2></div><Link className="button button--soft button--small" href="/profil-sekolah">Edit profil</Link></header><dl><div><dt>Jenjang</dt><dd>{workspace.school.level}</dd></div><div><dt>Status</dt><dd>{workspace.school.status}</dd></div><div><dt>Tahun ajaran</dt><dd>{workspace.school.academic_year}</dd></div></dl><p>Satu akun kepala sekolah memiliki satu workspace sekolah sebagai sumber konteks bersama.</p></article>
      </section>

      <section className="panel security-note"><span><LockKeyhole /></span><div><span className="eyebrow">PRIVASI & KEAMANAN</span><h2>Kontrol tetap berada pada kepala sekolah</h2><p>Hasil AI adalah draf kerja. Verifikasi data, regulasi, nomor surat, tanggal, pembiayaan, serta pejabat pengesah sebelum dokumen digunakan resmi.</p></div><div className="security-badges"><span><KeyRound /> Sesi aman</span><span><ServerCog /> RLS aktif</span><span><Database /> Versi tersimpan</span></div></section>
    </div>
  );
}
