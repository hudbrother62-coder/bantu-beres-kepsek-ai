import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  School,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { getRecentDocumentGroups } from '@/lib/data';
import { getDocumentLabel } from '@/lib/document-catalog';
import type { AttendanceEntry, PlanningItem, SchoolContext } from '@/lib/types';
import { formatDate, formatMonth } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

function completionPercent(context: SchoolContext, school: { npsn: string | null; name: string }) {
  const checkpoints = [
    school.name,
    school.npsn,
    context.address,
    context.city,
    context.province,
    context.vision,
    context.mission,
    context.goals,
    context.priorities?.length,
    context.teacherCount,
  ];
  return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
}

function attendanceRate(entry?: AttendanceEntry) {
  if (!entry) return null;
  const total = entry.present + entry.sick + entry.leave + entry.absent;
  return total > 0 ? Math.round((entry.present / total) * 1000) / 10 : null;
}

export default async function DashboardPage() {
  const { workspace, groups } = await getRecentDocumentGroups(6);
  const context = (workspace.school.school_context ?? {}) as SchoolContext;
  const planningItems = Array.isArray(context.planningItems) ? (context.planningItems as PlanningItem[]) : [];
  const attendance = Array.isArray(context.attendance) ? (context.attendance as AttendanceEntry[]) : [];
  const completedDocuments = groups.reduce(
    (total, group) => total + (group.kepsek_generations?.filter((item) => item.status === 'completed').length ?? 0),
    0,
  );
  const activePrograms = planningItems.filter((item) => item.status === 'Berjalan').length;
  const profileCompletion = completionPercent(context, workspace.school);
  const latestAttendance = attendance.toSorted((a, b) => b.month.localeCompare(a.month))[0];
  const rate = attendanceRate(latestAttendance);
  const upcoming = planningItems
    .filter((item) => item.status !== 'Selesai')
    .toSorted((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))
    .slice(0, 4);

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="eyebrow eyebrow--light">WORKSPACE {workspace.school.academic_year}</span>
          <h1>Selamat bekerja, {workspace.profile.principal_name.split(' ')[0]}.</h1>
          <p>Data {workspace.school.name} sudah menjadi sumber bersama untuk perencanaan, dokumen, program, dan kinerja.</p>
          <div className="dashboard-hero__actions">
            <Link className="button button--light" href="/generator"><Sparkles /> Buat dokumen baru</Link>
            <Link className="button button--glass" href="/profil-sekolah"><School /> Perbarui profil</Link>
          </div>
        </div>
        <div className="dashboard-hero__meter">
          <div className="completion-ring" style={{ '--progress': `${profileCompletion * 3.6}deg` } as React.CSSProperties}><span><strong>{profileCompletion}%</strong><small>Profil lengkap</small></span></div>
          <p>{profileCompletion < 80 ? 'Lengkapi profil agar hasil dokumen makin spesifik.' : 'Profil siap menjadi dasar dokumen sekolah.'}</p>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--violet"><FileCheck2 /></span><div><small>Versi dokumen</small><strong>{completedDocuments}</strong><p>Dari {groups.length} kelompok dokumen terbaru</p></div><Link href="/dokumen" aria-label="Buka pustaka dokumen"><ArrowRight /></Link></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--blue"><CalendarClock /></span><div><small>Program berjalan</small><strong>{activePrograms}</strong><p>{planningItems.length} program tercatat</p></div><Link href="/program-kerja" aria-label="Buka program kerja"><ArrowRight /></Link></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--teal"><UsersRound /></span><div><small>Kehadiran guru</small><strong>{rate === null ? '—' : `${rate}%`}</strong><p>{latestAttendance ? formatMonth(latestAttendance.month) : 'Belum ada ringkasan'}</p></div><Link href="/kehadiran" aria-label="Buka kehadiran guru"><ArrowRight /></Link></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--amber"><TrendingUp /></span><div><small>Prioritas sekolah</small><strong>{context.priorities?.length ?? 0}</strong><p>Menjadi dasar PBD dan RKT</p></div><Link href="/analisis-mutu" aria-label="Buka analisis mutu"><ArrowRight /></Link></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-documents">
          <header className="panel-heading"><div><span className="eyebrow">DOKUMEN TERBARU</span><h2>Pustaka kerja Anda</h2><p>Setiap regenerate tersimpan sebagai versi terpisah.</p></div><Link className="text-link" href="/dokumen">Lihat semua <ArrowRight /></Link></header>
          {groups.length ? <div className="document-list">{groups.map((group) => {
            const latest = group.kepsek_generations?.[0];
            return <Link className="document-row" href="/dokumen" key={group.id}><span className="document-row__icon"><FileText /></span><span className="document-row__copy"><strong>{latest?.content?.title || getDocumentLabel(group.document_type)}</strong><small>{getDocumentLabel(group.document_type)} · {formatDate(group.created_at)}</small></span><span className={latest?.status === 'completed' ? 'status-pill status-pill--success' : latest?.status === 'error' ? 'status-pill status-pill--danger' : 'status-pill'}>{latest?.status === 'completed' ? `Versi ${latest.variant_number}` : latest?.status || 'Baru'}</span><ArrowRight /></Link>;
          })}</div> : <div className="empty-state"><span><FileText /></span><h3>Belum ada dokumen</h3><p>Mulai dari KSP, RKT, program kerja, atau dokumen administrasi lain.</p><Link className="button button--primary" href="/generator">Buka Generator AI</Link></div>}
        </article>

        <aside className="panel priority-panel">
          <header className="panel-heading"><div><span className="eyebrow">PRIORITAS</span><h2>Fokus sekolah</h2></div><Link className="icon-button icon-button--quiet" href="/profil-sekolah" aria-label="Edit prioritas"><ArrowRight /></Link></header>
          {context.priorities?.length ? <ol className="priority-cards">{context.priorities.slice(0, 5).map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol> : <div className="empty-state empty-state--compact"><CircleAlert /><p>Isi prioritas sekolah agar RKT dan PBD lebih terarah.</p></div>}
        </aside>

        <article className="panel upcoming-panel">
          <header className="panel-heading"><div><span className="eyebrow">AGENDA PROGRAM</span><h2>Tindak lanjut terdekat</h2></div><Link className="text-link" href="/program-kerja">Kelola <ArrowRight /></Link></header>
          {upcoming.length ? <div className="agenda-list">{upcoming.map((item) => <div className="agenda-row" key={item.id}><span className={`agenda-status agenda-status--${item.status.toLowerCase()}`}><CheckCircle2 /></span><div><strong>{item.title}</strong><small>{item.category} · {item.owner || 'PIC belum diisi'}</small></div><time>{item.startDate ? formatDate(item.startDate, { day: '2-digit', month: 'short' }) : '—'}</time></div>)}</div> : <div className="empty-state empty-state--compact"><CalendarClock /><p>Belum ada agenda. Tambahkan program kerja pertama.</p></div>}
        </article>

        <article className="panel quick-panel">
          <header className="panel-heading"><div><span className="eyebrow">AKSI CEPAT</span><h2>Mulai dari kebutuhan hari ini</h2></div></header>
          <div className="quick-grid"><Link href="/generator?type=rkt"><span className="quick-icon quick-icon--violet">RKT</span><div><strong>Susun RKT</strong><small>Dari prioritas sekolah</small></div><ArrowRight /></Link><Link href="/generator?type=sk-surat-notulen"><span className="quick-icon quick-icon--blue">SK</span><div><strong>Buat SK / Surat</strong><small>Administrasi formal</small></div><ArrowRight /></Link><Link href="/generator?type=supervisi-akademik"><span className="quick-icon quick-icon--teal">SV</span><div><strong>Program Supervisi</strong><small>Observasi & tindak lanjut</small></div><ArrowRight /></Link><Link href="/generator?type=analisis-mutu-pbd"><span className="quick-icon quick-icon--amber">PBD</span><div><strong>Analisis Mutu</strong><small>Masalah ke prioritas</small></div><ArrowRight /></Link></div>
        </article>
      </section>
    </div>
  );
}
