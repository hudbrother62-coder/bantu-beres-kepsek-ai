'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Save,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { saveGenerationContentAction } from '@/app/actions';
import { documentCatalog, type DocumentDefinition } from '@/lib/document-catalog';
import { exportDocx, exportPdf, exportXlsx } from '@/lib/export-document';
import { readReferenceFile } from '@/lib/import-file';
import type { GenerationContent } from '@/lib/types';

type GenerateResponse = {
  groupId: string;
  generationId: string;
  variantNumber: number;
  documentType: string;
  model: string;
  mode: 'ai' | 'template';
  content: GenerationContent;
};

const categoryOrder = ['Perencanaan', 'Kurikulum', 'Mutu & PBD', 'Kinerja', 'Administrasi'];

function DocumentChoice({ item, selected, onSelect }: { item: DocumentDefinition; selected: boolean; onSelect: () => void }) {
  return <button className={selected ? `document-choice document-choice--${item.accent} is-selected` : `document-choice document-choice--${item.accent}`} type="button" onClick={onSelect}><span>{item.shortTitle.slice(0, 3).toUpperCase()}</span><div><strong>{item.shortTitle}</strong><small>{item.description}</small></div><CheckCircle2 /></button>;
}

export function GeneratorStudio({ initialType = 'ksp', profileReady }: { initialType?: string; profileReady: boolean }) {
  const [documentType, setDocumentType] = useState(initialType);
  const [instruction, setInstruction] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, startSaving] = useTransition();
  const definition = documentCatalog.find((item) => item.id === documentType) ?? documentCatalog[0];
  const grouped = useMemo(
    () => categoryOrder.map((category) => ({ category, items: documentCatalog.filter((item) => item.category === category) })),
    [],
  );

  function chooseType(id: string) {
    setDocumentType(id);
    setResult(null);
    setBody('');
    setError('');
    setNotice('');
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setFileLoading(true);
    setError('');
    try {
      setSourceText(await readReferenceFile(file));
      setSourceName(file.name);
    } catch (fileError) {
      setSourceText('');
      setSourceName('');
      setError(fileError instanceof Error ? fileError.message : 'File belum dapat dibaca.');
    } finally {
      setFileLoading(false);
    }
  }

  async function generate(regenerate = false) {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          regenerate && result
            ? { groupId: result.groupId }
            : { documentType, additionalInstruction: instruction, sourceText, sourceName },
        ),
      });
      const data = (await response.json()) as GenerateResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Dokumen belum dapat dibuat.');
      setResult(data);
      setBody(data.content.body);
      setNotice(data.mode === 'template' ? 'Mode template digunakan karena Gemini belum tersedia. Tambahkan API key untuk hasil AI penuh.' : `Selesai dengan ${data.model}.`);
      window.setTimeout(() => document.getElementById('generation-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Dokumen belum dapat dibuat.');
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!result) return;
    startSaving(async () => {
      const state = await saveGenerationContentAction(result.generationId, body);
      setNotice(state.message);
      if (!state.ok) setError(state.message);
    });
  }

  return (
    <div className="page-stack generator-page">
      <section className="page-heading"><div><span className="eyebrow">AI DOCUMENT STUDIO</span><h1>Buat dokumen dari kondisi nyata sekolah</h1><p>Pilih dokumen, beri arahan khusus, lalu tinjau hasilnya sebelum diekspor.</p></div><span className={profileReady ? 'status-pill status-pill--success' : 'status-pill status-pill--warning'}>{profileReady ? <CheckCircle2 /> : <AlertTriangle />}{profileReady ? 'Profil siap' : 'Profil perlu dilengkapi'}</span></section>
      {!profileReady ? <p className="callout callout--warning"><AlertTriangle /><span><strong>Hasil akan lebih baik setelah profil sekolah dilengkapi.</strong><small>Tambahkan visi, kondisi, tantangan, dan prioritas sekolah.</small></span><Link href="/profil-sekolah">Lengkapi profil</Link></p> : null}

      <section className="generator-layout">
        <aside className="generator-types panel">
          <header><span className="step-badge">1</span><div><h2>Pilih dokumen</h2><p>{documentCatalog.length} jenis siap digunakan</p></div></header>
          <div className="document-choice-groups">{grouped.map(({ category, items }) => <section key={category}><h3>{category}</h3>{items.map((item) => <DocumentChoice item={item} selected={item.id === documentType} onSelect={() => chooseType(item.id)} key={item.id} />)}</section>)}</div>
        </aside>

        <div className="generator-config panel">
          <header className="generator-config__header"><span className={`generator-doc-icon generator-doc-icon--${definition.accent}`}>{definition.shortTitle.slice(0, 3).toUpperCase()}</span><div><span className="eyebrow">DOKUMEN TERPILIH</span><h2>{definition.title}</h2><p>{definition.description}</p></div></header>
          <div className="generator-steps"><span className="is-active"><b>1</b>Pilih</span><i /><span className="is-active"><b>2</b>Arahkan</span><i /><span><b>3</b>Tinjau</span></div>
          <label className="field generator-instruction"><span>Instruksi tambahan kepala sekolah <em>opsional</em></span><textarea rows={7} value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={3000} placeholder="Contoh: Fokuskan RKT pada peningkatan numerasi kelas awal, pelatihan guru setiap bulan, dan indikator yang bisa dipantau per triwulan." /><small>{instruction.length}/3000 karakter</small></label>

          <div className="import-box"><div><UploadCloud /><span><strong>Tambahkan data referensi</strong><small>TXT, MD, CSV, JSON, atau XLSX · maksimal 5 MB</small></span></div><label className="button button--soft button--small"><Paperclip /> {fileLoading ? 'Membaca…' : 'Pilih file'}<input type="file" accept=".txt,.md,.csv,.json,.xlsx" hidden onChange={(event) => void handleFile(event.target.files?.[0])} disabled={fileLoading} /></label></div>
          {sourceName ? <div className="file-pill"><FileSpreadsheet /><span><strong>{sourceName}</strong><small>{sourceText.length.toLocaleString('id-ID')} karakter digunakan sebagai konteks</small></span><button className="icon-button icon-button--quiet" type="button" onClick={() => { setSourceName(''); setSourceText(''); }} aria-label="Hapus file"><X /></button></div> : null}
          {error ? <p className="form-message form-message--error" role="alert"><AlertTriangle /> {error}</p> : null}
          <button className="button button--primary button--wide button--large generator-submit" type="button" disabled={loading} onClick={() => void generate(false)}>{loading ? <LoaderCircle className="spin" /> : <Sparkles />}{loading ? 'Menyusun dokumen…' : `Generate ${definition.shortTitle}`}</button>
          <p className="privacy-note">Data referensi hanya disimpan pada riwayat dokumen akun Anda dan dilindungi RLS.</p>
        </div>
      </section>

      {result ? <section className="generation-result panel" id="generation-result">
        <header className="result-header"><div><span className="eyebrow">HASIL · VERSI {result.variantNumber}</span><h2>{result.content.title}</h2><p>{result.content.summary}</p></div><div className="result-header__meta"><span className={result.mode === 'ai' ? 'status-pill status-pill--success' : 'status-pill status-pill--warning'}>{result.mode === 'ai' ? <Sparkles /> : <FileJson />}{result.mode === 'ai' ? result.model : 'Mode template'}</span></div></header>
        {notice ? <p className={result.mode === 'ai' ? 'form-message form-message--success' : 'form-message form-message--warning'}>{result.mode === 'ai' ? <CheckCircle2 /> : <AlertTriangle />}{notice}</p> : null}
        <div className="result-toolbar"><button className="button button--soft button--small" type="button" onClick={save} disabled={saving}><Save />{saving ? 'Menyimpan…' : 'Simpan edit'}</button><button className="button button--soft button--small" type="button" onClick={() => void generate(true)} disabled={loading}><RefreshCw />Regenerate prompt sama</button><span className="toolbar-spacer" /><div className="export-menu"><span><Download /> Ekspor</span><ChevronDown /><div><button type="button" onClick={() => void exportDocx(result.content.title, body)}><FileText /> Word (.docx)</button><button type="button" onClick={() => void exportPdf(result.content.title, body)}><FileText /> PDF (.pdf)</button><button type="button" onClick={() => void exportXlsx(result.content.title, body)}><FileSpreadsheet /> Excel (.xlsx)</button></div></div></div>
        <div className="editor-grid"><div className="document-editor"><label htmlFor="document-body">Editor dokumen</label><textarea id="document-body" value={body} onChange={(event) => setBody(event.target.value)} spellCheck rows={34} /></div><aside className="quality-panel"><section><h3><CheckCircle2 /> Pemeriksaan mutu</h3>{result.content.qualityChecks.length ? <ul>{result.content.qualityChecks.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Tidak ada catatan khusus.</p>}</section><section><h3><AlertTriangle /> Perlu perhatian</h3>{result.content.warnings.length ? <ul>{result.content.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Tidak ada peringatan dari generator.</p>}</section><p className="quality-reminder">Kepala sekolah tetap perlu memverifikasi data, regulasi, tanggal, nomor surat, dan pengesahan sebelum digunakan secara resmi.</p></aside></div>
      </section> : null}
    </div>
  );
}
