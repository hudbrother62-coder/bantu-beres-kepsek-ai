import { ImageResponse } from 'next/og';

export const alt = 'Bantu Beres Kepsek AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#111025', color: '#ffffff', padding: 76, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: 560, background: '#7657ff', filter: 'blur(120px)', opacity: 0.4, right: -160, top: -180 }} />
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: 420, background: '#0ca6a6', filter: 'blur(140px)', opacity: 0.22, left: -120, bottom: -240 }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(145deg,#9c8bff,#5a3ee6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>BB</div><div style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 30 }}>Bantu Beres</b><span style={{ color: '#bfb9e9', fontSize: 21 }}>Kepsek AI</span></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 930 }}><span style={{ color: '#9e90ff', fontSize: 20, letterSpacing: 3, fontWeight: 700 }}>ASISTEN DIGITAL KEPALA SEKOLAH</span><div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 800, marginTop: 20 }}>Perencanaan, kurikulum, administrasi, dan kinerja—dalam satu sistem.</div></div>
        <div style={{ display: 'flex', gap: 28, color: '#d9d6ee', fontSize: 20 }}><span>Profil sekolah terhubung</span><span>•</span><span>Dokumen dapat diedit</span><span>•</span><span>Ekspor Word · PDF · Excel</span></div>
      </div>
    </div>,
    size,
  );
}
