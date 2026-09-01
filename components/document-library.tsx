'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Save,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { saveGenerationContentAction } from '@/app/actions';
import { getDocumentLabel } from '@/lib/document-catalog';
import { exportDocx, exportPdf, exportXlsx } from '@/lib/export-document';
import type { KepsekGeneration, KepsekGenerationGroup } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function firstViewable(group?: KepsekGenerationGroup) {
  return group?.kepsek_generations?.find((item) => item.status === 'completed' && item.content) ??
    group?.kepsek_generations?.[0];
}

export function DocumentLibrary({ groups }: { groups: KepsekGenerationGroup[] }) {
  const firstGroup = groups[0];
  const firstGeneration = firstViewable(firstGroup);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('semua');
  const [selectedGroupId, setSelectedGroupId] = useState(firstGroup?.id ?? '');
  const [selectedGenerationId, setSelectedGenerationId] = useState(firstGeneration?.id ?? '');
  const [body, setBody] = useState(firstGeneration?.content?.body ?? '');
  const [message, setMessage] = useState('');
  const [saving, startSaving] = useTransition();

  const types = useMemo(
    () => Array.from(new Set(groups.map((group) => group.document_type))),
    [groups],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups.filter((group) => {
      const latest = firstViewable(group);
      const matchesType = type === 'semua' || group.document_type === type;
      const haystack = `${getDocumentLabel(group.document_type)} ${latest?.content?.title ?? ''} ${group.additional_instruction}`.toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [groups, query, type]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? firstGroup;
  const selectedGeneration = selectedGroup?.kepsek_generations?.find(
    (item) => item.id === selectedGenerationId,
  ) ?? firstViewable(selectedGroup);
  const content = selectedGeneration?.content;

  function selectGroup(group: KepsekGenerationGroup) {
    const generation = firstViewable(group);
    setSelectedGroupId(group.id);
    setSelectedGenerationId(generation?.id ?? '');
    setBody(generation?.content?.body ?? '');
    setMessage('');
  }

  function selectVersion(generation: KepsekGeneration) {
    setSelectedGenerationId(generation.id);
    setBody(generation.content?.body ?? '');
    setMessage('');
  }

  function save() {
    if (!selectedGeneration || !content) return;
    startSaving(async () => {
      const result = await saveGenerationContentAction(selectedGeneration.id, body);
      setMessage(result.message);
    });
  }

  if (!groups.length) {
    return (
      <div className="page-stack">
        <section className="page-heading"><div><span className="eyebrow">PUSTAKA DOKUMEN</span><h1>Semua dokumen sekolah dalam satu ruang</h1><p>Versi hasil generate dan hasil edit akan tersimpan otomatis di sini.</p></div></section>
        <section className="panel empty-state empty-state--large"><span><FolderOpen /></span><h2>Pustaka masih kosong</h2><p>Buat dokumen pertama dari profil dan prioritas sekolah Anda.</p><Link className="button button--primary" href="/generator"><Sparkles /> Buka Generator AI</Link></section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">PUSTAKA DOKUMEN</span><h1>Riwayat dokumen yang bisa terus disempurnakan</h1><p>Pilih versi, edit isinya, simpan, lalu unduh dalam format kerja yang Anda perlukan.</p></div><Link className="button button--primary" href="/generator"><Sparkles /> Dokumen baru</Link></section>

      <section className="library-layout">
        <aside className="panel library-list-panel">
          <div className="library-filters">
            <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari dokumen…" aria-label="Cari dokumen" /></label>
            <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter jenis dokumen"><option value="semua">Semua jenis</option>{types.map((item) => <option value={item} key={item}>{getDocumentLabel(item)}</option>)}</select>
          </div>
          <div className="library-list">
            {filtered.length ? filtered.map((group) => {
              const latest = firstViewable(group);
              return <button type="button" className={selectedGroup?.id === group.id ? 'library-card is-selected' : 'library-card'} onClick={() => selectGroup(group)} key={group.id}><span className="library-card__icon"><FileText /></span><span><strong>{latest?.content?.title || getDocumentLabel(group.document_type)}</strong><small>{getDocumentLabel(group.document_type)} · {formatDate(group.created_at)}</small><em>{group.kepsek_generations?.length ?? 0} versi</em></span></button>;
            }) : <div className="empty-state empty-state--compact"><Search /><p>Tidak ada dokumen yang cocok.</p></div>}
          </div>
        </aside>

        <article className="panel library-editor-panel">
          {selectedGeneration && content ? <>
            <header className="library-editor-header"><div><span className="eyebrow">{getDocumentLabel(selectedGroup?.document_type ?? '')}</span><h2>{content.title}</h2><p>{content.summary}</p></div><span className={content.mode === 'template' ? 'status-pill status-pill--warning' : 'status-pill status-pill--success'}>{content.mode === 'template' ? <AlertTriangle /> : <CheckCircle2 />}{content.mode === 'template' ? 'Template' : selectedGeneration.model || 'AI'}</span></header>
            <div className="version-bar"><span>Versi:</span>{selectedGroup?.kepsek_generations?.map((generation) => <button type="button" disabled={!generation.content} className={generation.id === selectedGeneration.id ? 'is-active' : ''} onClick={() => selectVersion(generation)} key={generation.id}>V{generation.variant_number}</button>)}</div>
            <div className="result-toolbar"><button className="button button--soft button--small" type="button" onClick={save} disabled={saving}><Save />{saving ? 'Menyimpan…' : 'Simpan edit'}</button><span className="toolbar-spacer" /><div className="export-actions"><button type="button" onClick={() => void exportDocx(content.title, body)}><FileText /> Word</button><button type="button" onClick={() => void exportPdf(content.title, body)}><Download /> PDF</button><button type="button" onClick={() => void exportXlsx(content.title, body)}><FileSpreadsheet /> Excel</button></div></div>
            {message ? <p className="form-message form-message--success"><CheckCircle2 />{message}</p> : null}
            <label className="document-editor library-document-editor"><span>Isi dokumen</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={32} spellCheck /></label>
            <footer className="library-editor-footer"><span>Dibuat {formatDate(selectedGeneration.created_at)}</span><span>{body.length.toLocaleString('id-ID')} karakter</span></footer>
          </> : <div className="empty-state empty-state--large"><AlertTriangle /><h2>Versi belum selesai</h2><p>Pilih versi lain atau buat dokumen baru.</p></div>}
        </article>
      </section>
    </div>
  );
}
