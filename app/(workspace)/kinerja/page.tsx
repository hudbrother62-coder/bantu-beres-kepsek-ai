import { ArrowRight, CalendarCheck2, CheckCircle2, ClipboardCheck, FileCheck2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getRecentDocumentGroups } from '@/lib/data';
import { getDocumentLabel } from '@/lib/document-catalog';
import type { PlanningItem, SchoolContext } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Kinerja & Supervisi' };

export default async function PerformancePage() {
  const { workspace, groups } = await getRecentDocumentGroups(30);
  const context = workspace.school.school_context as SchoolContext;
  const items = (Array.isArray(context.planningItems) ? context.planningItems as PlanningItem[] : [])
    .filter((item) => item.category === 'Kinerja' || item.category === 'Supervisi');
  const evidenceGroups = groups.filter((group) => ['pengelolaan-kinerja', 'supervisi-akademik', 'laporan-kegiatan'].includes(group.document_type));
  const completed = items.filter((item) => item.status === 'Selesai').length;

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">KINERJA & SUPERVISI</span><h1>Rencana, pelaksanaan, bukti, dan refleksi dalam satu alur</h1><p>Gunakan program kerja untuk memantau aksi, lalu simpan dokumen kinerja dan supervisi sebagai bukti dukung.</p></div><Link className="button button--primary" href="/generator?type=pengelolaan-kinerja"><Sparkles /> Susun dokumen kinerja</Link></section>

      <section className="performance-path panel"><div><span>01</span><ClipboardCheck /><strong>Rencanakan</strong><small>Sasaran dan indikator</small></div><i /><div><span>02</span><CalendarCheck2 /><strong>Laksanakan</strong><small>Program dan supervisi</small></div><i /><div><span>03</span><FileCheck2 /><strong>Buktikan</strong><small>Dokumen dan artefak</small></div><i /><div><span>04</span><CheckCircle2 /><strong>Refleksikan</strong><small>Hasil dan tindak lanjut</small></div></section>

      <section className="stat-grid stat-grid--compact"><article className="mini-stat"><small>Agenda kinerja</small><strong>{items.length}</strong></article><article className="mini-stat"><small>Berjalan</small><strong>{items.filter((item) => item.status === 'Berjalan').length}</strong></article><article className="mini-stat"><small>Selesai</small><strong>{completed}</strong></article><article className="mini-stat"><small>Bukti dokumen</small><strong>{evidenceGroups.length}</strong></article></section>

      <section className="dashboard-grid performance-grid">
        <article className="panel performance-agenda"><header className="panel-heading"><div><span className="eyebrow">AGENDA</span><h2>Kinerja dan supervisi</h2><p>Kelola seluruh rincian melalui Program Kerja.</p></div><Link className="text-link" href="/program-kerja">Kelola <ArrowRight /></Link></header>{items.length ? <div className="agenda-list">{items.map((item) => <div className="agenda-row" key={item.id}><span className={`agenda-status agenda-status--${item.status.toLowerCase()}`}><CheckCircle2 /></span><div><strong>{item.title}</strong><small>{item.owner || 'PIC belum diisi'} · {item.output || 'Bukti belum ditentukan'}</small></div><time>{item.startDate ? formatDate(item.startDate, { day: '2-digit', month: 'short' }) : '—'}</time></div>)}</div> : <div className="empty-state empty-state--compact"><CalendarCheck2 /><p>Belum ada agenda berkategori Kinerja atau Supervisi.</p><Link className="button button--soft button--small" href="/program-kerja">Tambah agenda</Link></div>}</article>

        <article className="panel evidence-panel"><header className="panel-heading"><div><span className="eyebrow">BUKTI DUKUNG</span><h2>Dokumen terkait</h2><p>Versi dokumen tersimpan di pustaka akun.</p></div><Link className="text-link" href="/dokumen">Pustaka <ArrowRight /></Link></header>{evidenceGroups.length ? <div className="document-list">{evidenceGroups.slice(0, 6).map((group) => { const latest = group.kepsek_generations?.[0]; return <Link className="document-row" href="/dokumen" key={group.id}><span className="document-row__icon"><FileCheck2 /></span><span className="document-row__copy"><strong>{latest?.content?.title || getDocumentLabel(group.document_type)}</strong><small>{getDocumentLabel(group.document_type)} · {formatDate(group.created_at)}</small></span><ArrowRight /></Link>; })}</div> : <div className="empty-state empty-state--compact"><FileCheck2 /><p>Belum ada dokumen kinerja atau supervisi.</p></div>}</article>

        <article className="panel quick-panel performance-templates"><header className="panel-heading"><div><span className="eyebrow">TEMPLATE AI</span><h2>Susun bukti yang konsisten</h2></div></header><div className="quick-grid"><Link href="/generator?type=pengelolaan-kinerja"><span className="quick-icon quick-icon--violet">KIN</span><div><strong>Pengelolaan Kinerja</strong><small>Sasaran, indikator, refleksi</small></div><ArrowRight /></Link><Link href="/generator?type=supervisi-akademik"><span className="quick-icon quick-icon--teal">SUP</span><div><strong>Supervisi Akademik</strong><small>Instrumen dan tindak lanjut</small></div><ArrowRight /></Link><Link href="/generator?type=laporan-kegiatan"><span className="quick-icon quick-icon--amber">LAP</span><div><strong>Laporan Kegiatan</strong><small>Hasil, bukti, evaluasi</small></div><ArrowRight /></Link></div></article>
      </section>
    </div>
  );
}
