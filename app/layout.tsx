import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bantu-beres-kepsek-ai.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bantu Beres Kepsek AI',
    template: '%s | Bantu Beres Kepsek AI',
  },
  description: 'Asisten digital kepala sekolah untuk perencanaan, kurikulum, administrasi, dan kinerja sekolah dalam satu sistem terhubung.',
  applicationName: 'Bantu Beres Kepsek AI',
  openGraph: {
    title: 'Bantu Beres Kepsek AI',
    description: 'Kelola data sekolah, susun dokumen berbasis kondisi nyata, dan rapikan pekerjaan kepala sekolah.',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0f16' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
