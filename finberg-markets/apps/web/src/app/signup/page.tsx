'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', username: '', acceptTerms: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.acceptTerms) { setError('Please accept the terms'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/proxy/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, marketingOptIn: false }),
      });
      if (!res.ok) { setError('Could not create account'); return; }
      router.push('/chart');
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border border-bg-elevated bg-bg-subtle rounded-xl p-8">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Username">
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input"
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
            />
          </Field>
          <Field label="Email">
            <input
              required type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Password (min 12 chars)">
            <input
              required type="password" minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
              className="mt-0.5"
            />
            I accept the Terms of Service and Privacy Policy.
          </label>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 rounded bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>
      <style jsx>{`
        .input {
          width: 100%;
          background: #151c2b;
          border: 1px solid #1f2937;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          color: #e6ebf2;
        }
        .input:focus { outline: 2px solid #26a69a; outline-offset: 0; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="text-xs text-text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
