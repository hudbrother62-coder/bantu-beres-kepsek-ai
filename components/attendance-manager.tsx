'use client';

import { CheckCircle2, Plus, Save, Trash2, UsersRound } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { saveAttendanceAction } from '@/app/actions';
import type { AttendanceEntry } from '@/lib/types';
import { formatMonth } from '@/lib/utils';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function attendanceRate(item: AttendanceEntry) {
  const total = item.present + item.sick + item.leave + item.absent;
  return total ? Math.round((item.present / total) * 1000) / 10 : 0;
}

export function AttendanceManager({ initialItems, teacherCount }: { initialItems: AttendanceEntry[]; teacherCount: number }) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<Omit<AttendanceEntry, 'id'>>({ month: currentMonth(), teacherTotal: teacherCount, present: 0, sick: 0, leave: 0, absent: 0, notes: '' });
  const [message, setMessage] = useState('');
  const [saving, startSaving] = useTransition();
  const sorted = useMemo(() => items.toSorted((a, b) => b.month.localeCompare(a.month)), [items]);
  const latest = sorted[0];

  function addOrUpdate() {
    if (!/^\d{4}-\d{2}$/.test(draft.month)) return setMessage('Pilih bulan yang valid.');
    const entry: AttendanceEntry = { ...draft, id: items.find((item) => item.month === draft.month)?.id ?? (crypto.randomUUID?.() || `hadir-${Date.now()}`) };
    setItems((current) => current.some((item) => item.month === entry.month) ? current.map((item) => item.month === entry.month ? entry : item) : [...current, entry]);
    setMessage('Ringkasan bulan diterapkan. Klik Simpan semua perubahan.');
  }

  function edit(item: AttendanceEntry) {
    const { id: _id, ...rest } = item;
    setDraft(rest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remove(item: AttendanceEntry) {
    if (!window.confirm(`Hapus ringkasan ${formatMonth(item.month)}?`)) return;
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    setMessage('Ringkasan dihapus dari daftar lokal. Klik Simpan semua perubahan.');
  }

  function save() {
    startSaving(async () => setMessage((await saveAttendanceAction(items)).message));
  }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">KEHADIRAN GURU</span><h1>Ringkasan yang mudah dipantau, bukan daftar individu</h1><p>Catat agregat bulanan untuk melihat tren disiplin tanpa menyimpan data pribadi guru.</p></div><button className="button button--primary" type="button" onClick={save} disabled={saving}><Save />{saving ? 'Menyimpan…' : 'Simpan semua'}</button></section>

      <section className="attendance-overview"><article className="attendance-score panel"><span><UsersRound /></span><div><small>Kehadiran terbaru</small><strong>{latest ? `${attendanceRate(latest)}%` : '—'}</strong><p>{latest ? formatMonth(latest.month) : 'Belum ada ringkasan'}</p></div></article><article className="panel attendance-form"><header><div><span className="eyebrow">INPUT BULANAN</span><h2>Tambah atau perbarui ringkasan</h2></div></header><div className="attendance-fields"><label className="field"><span>Bulan</span><input type="month" value={draft.month} onChange={(event) => setDraft({ ...draft, month: event.target.value })} /></label><label className="field"><span>Jumlah guru</span><input type="number" min="0" value={draft.teacherTotal} onChange={(event) => setDraft({ ...draft, teacherTotal: Number(event.target.value) })} /></label><label className="field"><span>Hadir</span><input type="number" min="0" value={draft.present} onChange={(event) => setDraft({ ...draft, present: Number(event.target.value) })} /></label><label className="field"><span>Sakit</span><input type="number" min="0" value={draft.sick} onChange={(event) => setDraft({ ...draft, sick: Number(event.target.value) })} /></label><label className="field"><span>Izin</span><input type="number" min="0" value={draft.leave} onChange={(event) => setDraft({ ...draft, leave: Number(event.target.value) })} /></label><label className="field"><span>Tanpa keterangan</span><input type="number" min="0" value={draft.absent} onChange={(event) => setDraft({ ...draft, absent: Number(event.target.value) })} /></label><label className="field field--wide"><span>Catatan</span><input value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Contoh: Rekap 20 hari efektif" /></label><button className="button button--soft" type="button" onClick={addOrUpdate}><Plus /> Terapkan bulan</button></div></article></section>
      {message ? <p className="form-message form-message--success"><CheckCircle2 />{message}</p> : null}

      <section className="panel table-panel"><header className="panel-heading"><div><span className="eyebrow">RIWAYAT</span><h2>Tren ringkasan bulanan</h2><p>Angka hadir, sakit, izin, dan tanpa keterangan dihitung sebagai agregat hari-orang.</p></div></header>{sorted.length ? <div className="responsive-table"><table><thead><tr><th>Bulan</th><th>Guru</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Tanpa keterangan</th><th>Tingkat hadir</th><th aria-label="Aksi" /></tr></thead><tbody>{sorted.map((item) => <tr key={item.id}><td><button type="button" className="table-title-button" onClick={() => edit(item)}><strong>{formatMonth(item.month)}</strong><small>{item.notes || 'Tanpa catatan'}</small></button></td><td>{item.teacherTotal}</td><td>{item.present}</td><td>{item.sick}</td><td>{item.leave}</td><td>{item.absent}</td><td><span className={attendanceRate(item) >= 90 ? 'status-pill status-pill--success' : 'status-pill status-pill--warning'}>{attendanceRate(item)}%</span></td><td><button className="icon-button icon-button--danger" type="button" onClick={() => remove(item)} aria-label={`Hapus ${formatMonth(item.month)}`}><Trash2 /></button></td></tr>)}</tbody></table></div> : <div className="empty-state empty-state--large"><span><UsersRound /></span><h2>Belum ada ringkasan</h2><p>Isi rekap bulan berjalan untuk mulai melihat tren kehadiran.</p></div>}</section>
    </div>
  );
}
