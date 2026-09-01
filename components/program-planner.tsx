'use client';

import { CalendarDays, CheckCircle2, Plus, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { savePlanningItemsAction } from '@/app/actions';
import type { PlanningItem, PlanningStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const blankItem: Omit<PlanningItem, 'id'> = {
  title: '', category: 'Program Sekolah', owner: '', startDate: '', endDate: '', output: '', status: 'Direncanakan', notes: '',
};

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `program-${Date.now()}`;
}

export function ProgramPlanner({ initialItems, defaultOwner }: { initialItems: PlanningItem[]; defaultOwner: string }) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<Omit<PlanningItem, 'id'>>({ ...blankItem, owner: defaultOwner });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, startSaving] = useTransition();
  const sorted = useMemo(() => items.toSorted((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999')), [items]);
  const complete = items.filter((item) => item.status === 'Selesai').length;

  function beginAdd() {
    setDraft({ ...blankItem, owner: defaultOwner });
    setEditingId(null);
    setOpen(true);
  }

  function beginEdit(item: PlanningItem) {
    const { id, ...rest } = item;
    setDraft(rest);
    setEditingId(id);
    setOpen(true);
  }

  function commitDraft() {
    if (draft.title.trim().length < 2) {
      setMessage('Nama program wajib diisi.');
      return;
    }
    setItems((current) => editingId
      ? current.map((item) => item.id === editingId ? { ...draft, id: editingId, title: draft.title.trim() } : item)
      : [...current, { ...draft, id: newId(), title: draft.title.trim() }]);
    setOpen(false);
    setMessage('Perubahan lokal siap disimpan.');
  }

  function remove(item: PlanningItem) {
    if (!window.confirm(`Hapus program “${item.title}”?`)) return;
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    setMessage('Program dihapus dari daftar lokal. Klik Simpan semua perubahan.');
  }

  function save() {
    startSaving(async () => {
      const result = await savePlanningItemsAction(items);
      setMessage(result.message);
    });
  }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">PROGRAM KERJA</span><h1>Ubah prioritas menjadi agenda yang terpantau</h1><p>Catat PIC, waktu, keluaran, status, dan tindak lanjut setiap program sekolah.</p></div><div className="page-heading__actions"><button className="button button--soft" type="button" onClick={beginAdd}><Plus /> Tambah program</button><button className="button button--primary" type="button" onClick={save} disabled={saving}><Save />{saving ? 'Menyimpan…' : 'Simpan semua'}</button></div></section>

      <section className="stat-grid stat-grid--compact"><article className="mini-stat"><small>Total program</small><strong>{items.length}</strong></article><article className="mini-stat"><small>Sedang berjalan</small><strong>{items.filter((item) => item.status === 'Berjalan').length}</strong></article><article className="mini-stat"><small>Selesai</small><strong>{complete}</strong></article><article className="mini-stat"><small>Progres</small><strong>{items.length ? Math.round((complete / items.length) * 100) : 0}%</strong></article></section>
      {message ? <p className="form-message form-message--success"><CheckCircle2 />{message}</p> : null}

      {open ? <section className="panel inline-editor"><header><div><span className="eyebrow">{editingId ? 'EDIT PROGRAM' : 'PROGRAM BARU'}</span><h2>{editingId ? 'Perbarui rincian program' : 'Tambahkan agenda sekolah'}</h2></div><button className="icon-button icon-button--quiet" type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button></header><div className="form-grid">
        <label className="field field--wide"><span>Nama program</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Contoh: Pendampingan numerasi kelas awal" /></label>
        <label className="field"><span>Kategori</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as PlanningItem['category'] })}><option>Program Sekolah</option><option>Kinerja</option><option>Supervisi</option><option>Sosialisasi</option><option>Lainnya</option></select></label>
        <label className="field"><span>PIC</span><input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} /></label>
        <label className="field"><span>Mulai</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
        <label className="field"><span>Selesai</span><input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
        <label className="field"><span>Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PlanningStatus })}><option>Direncanakan</option><option>Berjalan</option><option>Selesai</option><option>Tertunda</option></select></label>
        <label className="field field--wide"><span>Keluaran / bukti</span><input value={draft.output} onChange={(event) => setDraft({ ...draft, output: event.target.value })} placeholder="Contoh: Modul, daftar hadir, foto, laporan evaluasi" /></label>
        <label className="field field--wide"><span>Catatan</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      </div><footer><button className="button button--soft" type="button" onClick={() => setOpen(false)}>Batal</button><button className="button button--primary" type="button" onClick={commitDraft}><CheckCircle2 /> Terapkan</button></footer></section> : null}

      <section className="panel table-panel">
        {sorted.length ? <div className="responsive-table"><table><thead><tr><th>Program</th><th>Jadwal</th><th>PIC & keluaran</th><th>Status</th><th aria-label="Aksi" /></tr></thead><tbody>{sorted.map((item) => <tr key={item.id}><td><button className="table-title-button" type="button" onClick={() => beginEdit(item)}><strong>{item.title}</strong><small>{item.category}</small></button></td><td><span className="table-date"><CalendarDays />{item.startDate ? formatDate(item.startDate, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum dijadwalkan'}</span><small>{item.endDate ? `s.d. ${formatDate(item.endDate, { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</small></td><td><strong>{item.owner || 'PIC belum diisi'}</strong><small>{item.output || 'Keluaran belum diisi'}</small></td><td><select className={`status-select status-select--${item.status.toLowerCase()}`} value={item.status} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: event.target.value as PlanningStatus } : candidate))}><option>Direncanakan</option><option>Berjalan</option><option>Selesai</option><option>Tertunda</option></select></td><td><button className="icon-button icon-button--danger" type="button" onClick={() => remove(item)} aria-label={`Hapus ${item.title}`}><Trash2 /></button></td></tr>)}</tbody></table></div> : <div className="empty-state empty-state--large"><span><CalendarDays /></span><h2>Belum ada program kerja</h2><p>Tambahkan agenda pertama untuk mulai memantau pelaksanaan prioritas sekolah.</p><button className="button button--primary" type="button" onClick={beginAdd}><Plus /> Tambah program</button></div>}
      </section>
    </div>
  );
}
