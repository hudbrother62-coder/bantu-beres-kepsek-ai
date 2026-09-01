'use client';

import { Check, Save, School, Target, UsersRound } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveSchoolProfileAction } from '@/app/actions';
import type { ActionState, Workspace } from '@/lib/types';

const initialState: ActionState = { ok: false, message: '' };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="button button--primary" type="submit" disabled={pending}><Save /> {pending ? 'Menyimpan…' : 'Simpan seluruh profil'}</button>;
}

function FieldError({ state, name }: { state: ActionState; name: string }) {
  return state.fieldErrors?.[name]?.[0] ? <small className="field-error">{state.fieldErrors[name][0]}</small> : null;
}

export function SchoolProfileForm({ workspace }: { workspace: Workspace }) {
  const [state, action] = useActionState(saveSchoolProfileAction, initialState);
  const context = workspace.school.school_context ?? {};

  return (
    <form className="profile-form page-stack" action={action}>
      <section className="page-heading"><div><span className="eyebrow">SUMBER DATA UTAMA</span><h1>Profil & kondisi sekolah</h1><p>Data ini digunakan ulang oleh semua generator. Semakin lengkap isinya, semakin spesifik hasil dokumen.</p></div><SaveButton /></section>
      {state.message ? <p className={state.ok ? 'form-message form-message--success' : 'form-message form-message--error'} role="status">{state.ok ? <Check /> : null}{state.message}</p> : null}

      <section className="form-panel">
        <header><span className="form-panel__icon form-panel__icon--violet"><School /></span><div><h2>Identitas sekolah</h2><p>Identitas formal yang tampil di dokumen dan pengesahan.</p></div><span className="section-number">01</span></header>
        <div className="form-grid form-grid--three">
          <label className="field field--span-two"><span>Nama sekolah</span><input name="schoolName" defaultValue={workspace.school.name} required /><FieldError state={state} name="schoolName" /></label>
          <label className="field"><span>NPSN</span><input name="npsn" defaultValue={workspace.school.npsn || ''} inputMode="numeric" /></label>
          <label className="field"><span>Jenjang</span><select name="level" defaultValue={workspace.school.level}><option>TK</option><option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option></select></label>
          <label className="field"><span>Status</span><select name="status" defaultValue={workspace.school.status}><option>Negeri</option><option>Swasta</option></select></label>
          <label className="field"><span>Tahun pelajaran</span><input name="academicYear" defaultValue={workspace.school.academic_year} required /></label>
          <label className="field field--span-two"><span>Nama kepala sekolah</span><input name="principalName" defaultValue={workspace.profile.principal_name} required /><FieldError state={state} name="principalName" /></label>
          <label className="field"><span>No. kontak kepala sekolah</span><input name="principalPhone" defaultValue={workspace.profile.phone || ''} inputMode="tel" /></label>
        </div>
      </section>

      <section className="form-panel">
        <header><span className="form-panel__icon form-panel__icon--blue"><School /></span><div><h2>Alamat & kontak sekolah</h2><p>Lengkapi agar surat, laporan, dan halaman pengesahan siap digunakan.</p></div><span className="section-number">02</span></header>
        <div className="form-grid form-grid--three">
          <label className="field field--span-three"><span>Alamat lengkap</span><textarea name="address" rows={2} defaultValue={context.address || ''} /></label>
          <label className="field"><span>Desa/kelurahan</span><input name="village" defaultValue={context.village || ''} /></label>
          <label className="field"><span>Kecamatan</span><input name="district" defaultValue={context.district || ''} /></label>
          <label className="field"><span>Kabupaten/kota</span><input name="city" defaultValue={context.city || ''} /></label>
          <label className="field"><span>Provinsi</span><input name="province" defaultValue={context.province || ''} /></label>
          <label className="field"><span>Kode pos</span><input name="postalCode" defaultValue={context.postalCode || ''} inputMode="numeric" /></label>
          <label className="field"><span>Telepon sekolah</span><input name="phone" defaultValue={context.phone || ''} inputMode="tel" /></label>
          <label className="field"><span>Email sekolah</span><input name="email" type="email" defaultValue={context.email || ''} /></label>
          <label className="field field--span-two"><span>Website</span><input name="website" type="url" defaultValue={context.website || ''} placeholder="https://" /></label>
        </div>
      </section>

      <section className="form-panel">
        <header><span className="form-panel__icon form-panel__icon--teal"><Target /></span><div><h2>Arah pengembangan sekolah</h2><p>Menjaga konsistensi antara KSP, RKJM, RKT, program, dan pengelolaan kinerja.</p></div><span className="section-number">03</span></header>
        <div className="form-grid">
          <label className="field"><span>Visi sekolah</span><textarea name="vision" rows={3} defaultValue={context.vision || ''} placeholder="Rumusan visi sekolah" /></label>
          <label className="field"><span>Misi sekolah <em>satu butir per baris</em></span><textarea name="mission" rows={5} defaultValue={context.mission || ''} /></label>
          <label className="field"><span>Tujuan sekolah</span><textarea name="goals" rows={5} defaultValue={context.goals || ''} /></label>
        </div>
      </section>

      <section className="form-panel">
        <header><span className="form-panel__icon form-panel__icon--amber"><UsersRound /></span><div><h2>Kondisi & prioritas</h2><p>Masukkan fakta ringkas. AI akan membedakan fakta tersebut dari rekomendasi.</p></div><span className="section-number">04</span></header>
        <div className="form-grid form-grid--four compact-number-grid">
          <label className="field"><span>Peserta didik</span><input name="studentCount" type="number" min="0" defaultValue={context.studentCount ?? 0} /></label>
          <label className="field"><span>Guru</span><input name="teacherCount" type="number" min="0" defaultValue={context.teacherCount ?? 0} /></label>
          <label className="field"><span>Tenaga kependidikan</span><input name="staffCount" type="number" min="0" defaultValue={context.staffCount ?? 0} /></label>
          <label className="field"><span>Rombel</span><input name="rombelCount" type="number" min="0" defaultValue={context.rombelCount ?? 0} /></label>
        </div>
        <div className="form-grid form-grid--three">
          <label className="field"><span>Kekuatan <em>satu butir per baris</em></span><textarea name="strengths" rows={7} defaultValue={context.strengths?.join('\n') || ''} placeholder="Budaya kolaborasi guru…" /></label>
          <label className="field"><span>Tantangan <em>satu butir per baris</em></span><textarea name="challenges" rows={7} defaultValue={context.challenges?.join('\n') || ''} placeholder="Capaian numerasi belum merata…" /></label>
          <label className="field"><span>Prioritas <em>satu butir per baris</em></span><textarea name="priorities" rows={7} defaultValue={context.priorities?.join('\n') || ''} placeholder="Penguatan literasi dan numerasi…" /></label>
          <label className="field field--span-three"><span>Catatan Rapor Pendidikan / hasil evaluasi</span><textarea name="raporNotes" rows={6} defaultValue={context.raporNotes || ''} placeholder="Salin ringkasan indikator, temuan, atau catatan refleksi sekolah." /></label>
        </div>
      </section>

      <footer className="sticky-save"><div><strong>Satu kali simpan, digunakan di semua modul.</strong><span>Periksa kembali data sebelum membuat dokumen resmi.</span></div><SaveButton /></footer>
    </form>
  );
}
