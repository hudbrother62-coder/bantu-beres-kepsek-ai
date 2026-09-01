import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  FileCheck2,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

const productPoints = [
  'Satu profil sekolah untuk seluruh dokumen',
  'Instruksi tambahan agar hasil tidak baku',
  'Regenerate dengan prompt dan data yang sama',
  'Ekspor Word, PDF, dan Excel',
];

const modules = [
  { icon: BarChart3, title: 'Mutu & PBD', text: 'Analisis indikator, akar masalah, dan prioritas sekolah.' },
  { icon: GraduationCap, title: 'KSP & Kurikulum', text: 'Susun KSP dari karakteristik dan kebutuhan nyata sekolah.' },
  { icon: FileCheck2, title: 'RKJM, RKT & RKAS', text: 'Hubungkan sasaran, program, indikator, dan anggaran.' },
  { icon: ClipboardCheck, title: 'Kinerja & Supervisi', text: 'Rencana kinerja, observasi, bukti, dan tindak lanjut.' },
  { icon: FileStack, title: 'Administrasi Lengkap', text: 'Program, SOP, SK, surat tugas, notulen, dan laporan.' },
  { icon: LayoutDashboard, title: 'Dashboard Terhubung', text: 'Pantau profil, dokumen, program, dan kehadiran guru.' },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header shell-width">
        <Brand />
        <nav className="landing-nav" aria-label="Navigasi halaman utama">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
        </nav>
        <div className="landing-header__actions">
          <ThemeToggle />
          <Link className="button button--ghost" href="/login">Masuk</Link>
          <Link className="button button--primary landing-signup" href="/daftar">Daftar gratis</Link>
        </div>
      </header>

      <main>
        <section className="hero shell-width">
          <div className="hero__copy">
            <span className="eyebrow"><Sparkles aria-hidden="true" /> Operating System Administrasi Sekolah Berbasis AI</span>
            <h1>Lebih sedikit waktu menyusun dokumen. Lebih banyak waktu memimpin sekolah.</h1>
            <p>Bantu Beres Kepsek AI menghubungkan profil sekolah, data mutu, perencanaan, kurikulum, administrasi, dan kinerja dalam satu workspace yang mudah digunakan.</p>
            <div className="hero__actions">
              <Link className="button button--primary button--large" href="/daftar">Mulai rapikan sekolah <ArrowRight aria-hidden="true" /></Link>
              <Link className="button button--soft button--large" href="/login">Saya sudah punya akun</Link>
            </div>
            <div className="hero__checks">
              {productPoints.map((point) => <span key={point}><Check aria-hidden="true" /> {point}</span>)}
            </div>
          </div>

          <div className="hero-product" aria-label="Pratinjau dashboard Bantu Beres Kepsek AI">
            <div className="hero-product__top">
              <div><span className="hero-product__logo">BB</span><strong>Dashboard Kepala Sekolah</strong></div>
              <span className="status-pill status-pill--success">Data terhubung</span>
            </div>
            <div className="hero-product__body">
              <div className="mini-stat-row">
                <article><small>Kelengkapan profil</small><strong>86%</strong><i><span style={{ width: '86%' }} /></i></article>
                <article><small>Dokumen tersusun</small><strong>24</strong><em>+6 bulan ini</em></article>
                <article><small>Program berjalan</small><strong>8</strong><em>3 perlu tindak lanjut</em></article>
              </div>
              <div className="hero-product__grid">
                <article className="mini-panel mini-panel--wide">
                  <header><div><small>Prioritas sekolah</small><strong>Perencanaan berbasis data</strong></div><BarChart3 /></header>
                  <div className="priority-list"><span><i className="dot dot--violet" /> Literasi & numerasi <b>Berjalan</b></span><span><i className="dot dot--blue" /> Penguatan kompetensi guru <b>Terjadwal</b></span><span><i className="dot dot--teal" /> Budaya sekolah aman <b>Berjalan</b></span></div>
                </article>
                <article className="mini-panel generator-card"><Sparkles /><small>AI Document Studio</small><strong>Buat RKT dari prioritas sekolah</strong><button type="button">Mulai generate <ArrowRight /></button></article>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="shell-width"><span><ShieldCheck /> Data tiap akun dipisahkan dengan RLS</span><span><FileCheck2 /> Dokumen dapat diperiksa dan diedit</span><span><Sparkles /> Gemini Flash + fallback otomatis</span></div>
        </section>

        <section className="landing-section shell-width" id="fitur">
          <div className="section-heading"><span className="eyebrow">SATU SISTEM, BANYAK PEKERJAAN BERES</span><h2>Dibangun mengikuti alur kerja kepala sekolah</h2><p>Bukan sekadar kumpulan template. Setiap modul memakai profil dan konteks sekolah yang sama agar dokumen saling konsisten.</p></div>
          <div className="module-grid">{modules.map(({ icon: Icon, title, text }) => <article className="module-card" key={title}><span><Icon /></span><h3>{title}</h3><p>{text}</p><ArrowRight /></article>)}</div>
        </section>

        <section className="workflow-section" id="cara-kerja">
          <div className="shell-width workflow-grid">
            <div className="section-heading section-heading--left"><span className="eyebrow">CARA KERJA</span><h2>Dari data sekolah menjadi dokumen yang siap ditinjau</h2><p>Isi sekali, gunakan berulang kali. Kepala sekolah tetap memegang keputusan akhir di setiap tahap.</p></div>
            <ol className="workflow-list"><li><span>01</span><div><strong>Lengkapi profil dan kondisi sekolah</strong><p>Identitas, visi-misi, kekuatan, tantangan, prioritas, serta data Rapor Pendidikan.</p></div></li><li><span>02</span><div><strong>Pilih dokumen dan beri arahan</strong><p>Tambahkan konteks khusus atau impor data Excel agar hasil tidak generik.</p></div></li><li><span>03</span><div><strong>Tinjau, edit, regenerate, ekspor</strong><p>Simpan beberapa versi lalu unduh ke Word, PDF, atau Excel.</p></div></li></ol>
          </div>
        </section>

        <section className="landing-cta shell-width"><div><span className="eyebrow eyebrow--light">WORKSPACE KEPALA SEKOLAH</span><h2>Mulai dari satu profil sekolah. Bereskan pekerjaan sepanjang tahun.</h2><p>Akun dapat digunakan di perangkat kerja kepala sekolah tanpa membatasi jumlah sesi login.</p></div><Link className="button button--light button--large" href="/daftar">Buat akun sekolah <ArrowRight /></Link></section>
      </main>

      <footer className="landing-footer shell-width"><Brand compact /><p>Asisten digital untuk perencanaan, kurikulum, administrasi, dan kinerja sekolah.</p><span>© 2026 Bantu Beres Kepsek AI</span></footer>
    </div>
  );
}
