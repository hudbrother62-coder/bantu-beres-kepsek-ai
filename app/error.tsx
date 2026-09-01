'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="state-page"><span>!</span><h1>Terjadi kendala</h1><p>Workspace belum dapat dimuat. Coba ulangi tanpa mengubah data Anda.</p><button className="button button--primary" type="button" onClick={reset}>Coba lagi</button></main>;
}
