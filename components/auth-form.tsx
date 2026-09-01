'use client';

import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail, School, UserRound } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, signupAction } from '@/app/actions';
import type { ActionState } from '@/lib/types';

const initialState: ActionState = { ok: false, message: '' };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary button--wide" type="submit" disabled={pending}>
      <span>{pending ? 'Memproses…' : children}</span>
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

function ErrorText({ values }: { values?: string[] }) {
  return values?.[0] ? <small className="field-error">{values[0]}</small> : null;
}

export function AuthForm({ mode, next = '/dashboard' }: { mode: 'login' | 'signup'; next?: string }) {
  const action = mode === 'login' ? loginAction : signupAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form className="auth-form" action={formAction}>
      {mode === 'login' ? <input type="hidden" name="next" value={next} /> : null}

      {mode === 'signup' ? (
        <div className="form-section">
          <div className="field-row field-row--two">
            <label className="field">
              <span>Nama kepala sekolah</span>
              <span className="input-shell">
                <UserRound aria-hidden="true" />
                <input name="principalName" placeholder="Nama lengkap" required autoComplete="name" />
              </span>
              <ErrorText values={state.fieldErrors?.principalName} />
            </label>
            <label className="field">
              <span>No. WhatsApp <em>opsional</em></span>
              <span className="input-shell input-shell--plain">
                <input name="phone" placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" />
              </span>
            </label>
          </div>

          <label className="field">
            <span>Nama sekolah</span>
            <span className="input-shell">
              <School aria-hidden="true" />
              <input name="schoolName" placeholder="Contoh: SMP Negeri 1 Pontianak" required />
            </span>
            <ErrorText values={state.fieldErrors?.schoolName} />
          </label>

          <div className="field-row field-row--three">
            <label className="field">
              <span>Jenjang</span>
              <select name="level" defaultValue="SD">
                <option>TK</option>
                <option>SD</option>
                <option>SMP</option>
                <option>SMA</option>
                <option>SMK</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue="Negeri">
                <option>Negeri</option>
                <option>Swasta</option>
              </select>
            </label>
            <label className="field">
              <span>Tahun pelajaran</span>
              <input name="academicYear" defaultValue="2026/2027" required />
            </label>
          </div>

          <label className="field">
            <span>NPSN <em>opsional</em></span>
            <input name="npsn" placeholder="8 digit NPSN" inputMode="numeric" />
          </label>
        </div>
      ) : null}

      <label className="field">
        <span>Email</span>
        <span className="input-shell">
          <Mail aria-hidden="true" />
          <input name="email" type="email" placeholder="kepsek@sekolah.sch.id" required autoComplete="email" />
        </span>
        <ErrorText values={state.fieldErrors?.email} />
      </label>

      <label className="field">
        <span>Password</span>
        <span className="input-shell">
          <LockKeyhole aria-hidden="true" />
          <input name="password" type="password" placeholder="Minimal 6 karakter" minLength={6} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </span>
        <ErrorText values={state.fieldErrors?.password} />
      </label>

      {state.message ? <p className="form-message form-message--error" role="alert">{state.message}</p> : null}

      <SubmitButton>{mode === 'login' ? 'Masuk ke workspace' : 'Buat akun sekolah'}</SubmitButton>

      <p className="auth-switch">
        {mode === 'login' ? 'Belum memiliki akun? ' : 'Sudah memiliki akun? '}
        <Link href={mode === 'login' ? '/daftar' : '/login'}>
          {mode === 'login' ? 'Daftarkan sekolah' : 'Masuk di sini'}
        </Link>
      </p>
    </form>
  );
}
