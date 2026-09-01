import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Daftarkan Sekolah' };

export default function SignupPage() {
  return (
    <main className="auth-page auth-page--signup">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <header className="auth-page__header"><Brand /><ThemeToggle /></header>
      <section className="auth-card auth-card--wide">
        <Link className="back-link" href="/"><ArrowLeft /> Kembali ke halaman utama</Link>
        <div className="auth-card__heading"><span className="auth-card__icon">BB</span><div><span className="eyebrow">SATU AKUN KEPALA SEKOLAH</span><h1>Siapkan workspace sekolah</h1><p>Isi identitas dasar. Detail sekolah dapat dilengkapi setelah masuk.</p></div></div>
        <AuthForm mode="signup" />
      </section>
      <p className="auth-page__foot">Dengan mendaftar, Anda menyatakan memiliki kewenangan mengelola data sekolah tersebut.</p>
    </main>
  );
}
