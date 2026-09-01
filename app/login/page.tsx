import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Masuk' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <header className="auth-page__header"><Brand /><ThemeToggle /></header>
      <section className="auth-card">
        <Link className="back-link" href="/"><ArrowLeft /> Kembali ke halaman utama</Link>
        <div className="auth-card__heading"><span className="auth-card__icon">BB</span><div><span className="eyebrow">AKSES WORKSPACE</span><h1>Selamat datang kembali</h1><p>Masuk menggunakan email dan password akun kepala sekolah.</p></div></div>
        {params.registered === '1' ? <p className="form-message form-message--success"><CheckCircle2 /> Pendaftaran berhasil. Jika diminta, konfirmasi email terlebih dahulu lalu masuk.</p> : null}
        {params.error === 'confirmation' ? <p className="form-message form-message--error">Tautan konfirmasi tidak valid atau sudah kedaluwarsa.</p> : null}
        <AuthForm mode="login" next={params.next || '/dashboard'} />
      </section>
      <p className="auth-page__foot">Data sekolah dilindungi oleh autentikasi dan Row Level Security Supabase.</p>
    </main>
  );
}
