'use client';

import { BarChart3, CheckCircle2, Plus, Save, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { saveQualityIndicatorsAction } from '@/app/actions';
import type { SchoolContext } from '@/lib/types';

type Indicator = NonNullable<SchoolContext['raporIndicators']>[number];
type EditableIndicator = Indicator & { clientId: string };

function blankIndicator(): EditableIndicator {
  return {
    clientId: crypto.randomUUID(),
    name: '',
    score: null,
    trend: 'Belum diisi',
    note: '',
  };
}

export function QualityContextManager({
  initialIndicators,
  initialNotes,
  strengths,
  challenges,
  priorities,
}: {
  initialIndicators: Indicator[];
  initialNotes: string;
  strengths: string[];
  challenges: string[];
  priorities: string[];
}) {
  const [indicators, setIndicators] = useState<EditableIndicator[]>(() =>
    initialIndicators.map((item, index) => ({ ...item, clientId: `saved-${index}` })),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState('');
  const [saving, startSaving] = useTransition();

  function update(index: number, patch: Partial<Indicator>) {
    setIndicators((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function save() {
    const cleaned = indicators.filter((item) => item.name.trim());
    startSaving(async () => {
      const result = await saveQualityIndicatorsAction(
        cleaned.map(({ clientId: _clientId, ...item }) => item),
        notes,
      );
      setIndicators(cleaned);
      setMessage(result.message);
    });
  }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">MUTU & PERENCANAAN BERBASIS DATA</span><h1>Mulai dari bukti, berakhir pada tindakan</h1><p>Ringkas indikator Rapor Pendidikan atau EDS agar generator dapat menyusun refleksi dan prioritas yang relevan.</p></div><div className="page-heading__actions"><Link className="button button--soft" href="/generator?type=analisis-mutu-pbd"><BarChart3 /> Susun analisis</Link><button className="button button--primary" type="button" onClick={save} disabled={saving}><Save />{saving ? 'Menyimpan…' : 'Simpan data mutu'}</button></div></section>
      {message ? <p className="form-message form-message--success"><CheckCircle2 />{message}</p> : null}

      <section className="quality-summary-grid">
        <article className="panel context-card context-card--strength"><header><TrendingUp /><div><span className="eyebrow">KEKUATAN</span><h2>Yang sudah baik</h2></div></header>{strengths.length ? <ul>{strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Belum diisi pada profil sekolah.</p>}<Link href="/profil-sekolah">Perbarui profil</Link></article>
        <article className="panel context-card context-card--challenge"><header><TrendingDown /><div><span className="eyebrow">TANTANGAN</span><h2>Yang perlu diperbaiki</h2></div></header>{challenges.length ? <ul>{challenges.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Belum diisi pada profil sekolah.</p>}<Link href="/profil-sekolah">Perbarui profil</Link></article>
        <article className="panel context-card context-card--priority"><header><BarChart3 /><div><span className="eyebrow">PRIORITAS</span><h2>Fokus tindak lanjut</h2></div></header>{priorities.length ? <ol>{priorities.map((item) => <li key={item}>{item}</li>)}</ol> : <p>Belum diisi pada profil sekolah.</p>}<Link href="/profil-sekolah">Perbarui profil</Link></article>
      </section>

      <section className="panel indicators-panel"><header className="panel-heading"><div><span className="eyebrow">INDIKATOR</span><h2>Ringkasan data mutu</h2><p>Masukkan skor hanya bila tersedia. Anda tetap bisa mencatat tren dan temuan kualitatif.</p></div><button className="button button--soft button--small" type="button" onClick={() => setIndicators((current) => [...current, blankIndicator()])}><Plus /> Tambah indikator</button></header>
        {indicators.length ? <div className="indicator-list">{indicators.map((item, index) => <div className="indicator-row" key={item.clientId}><label className="field indicator-name"><span>Nama indikator</span><input value={item.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Contoh: Kemampuan numerasi" /></label><label className="field indicator-score"><span>Skor (0–100)</span><input type="number" min="0" max="100" value={item.score ?? ''} onChange={(event) => update(index, { score: event.target.value === '' ? null : Number(event.target.value) })} /></label><label className="field indicator-trend"><span>Tren</span><select value={item.trend} onChange={(event) => update(index, { trend: event.target.value as Indicator['trend'] })}><option>Belum diisi</option><option>Naik</option><option>Tetap</option><option>Turun</option></select></label><label className="field indicator-note"><span>Temuan singkat</span><input value={item.note} onChange={(event) => update(index, { note: event.target.value })} placeholder="Sumber data, kesenjangan, atau konteks" /></label><button className="icon-button icon-button--danger indicator-remove" type="button" onClick={() => setIndicators((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus indikator ${index + 1}`}><Trash2 /></button></div>)}</div> : <div className="empty-state empty-state--compact"><BarChart3 /><p>Belum ada indikator. Tambahkan data Rapor Pendidikan atau hasil EDS yang paling penting.</p></div>}
      </section>

      <section className="panel quality-notes"><label className="field"><span>Catatan Rapor Pendidikan / EDS</span><textarea rows={8} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={6000} placeholder="Tuliskan temuan, sumber bukti, akar masalah awal, atau konteks yang perlu dipahami saat menyusun PBD." /><small>{notes.length}/6000 karakter</small></label><aside><strong>Alur PBD yang disarankan</strong><ol><li>Identifikasi indikator prioritas.</li><li>Refleksikan akar masalah dengan bukti.</li><li>Benahi melalui program dan anggaran.</li><li>Pantau indikator keberhasilannya.</li></ol></aside></section>
    </div>
  );
}
