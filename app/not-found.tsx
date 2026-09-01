import Link from 'next/link';

export default function NotFound() {
  return <main className="state-page"><span>404</span><h1>Halaman tidak ditemukan</h1><p>Alamat yang Anda buka tidak tersedia di Bantu Beres Kepsek AI.</p><Link className="button button--primary" href="/dashboard">Kembali ke dashboard</Link></main>;
}
