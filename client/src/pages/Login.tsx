import { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { Brand } from '../components/Logo';
import { Button, Field, Input } from '../components/ui';

// Full-screen sign-in gate shown when the cloud backend is configured but no
// user is authenticated. Sign-up is available but an admin can disable open
// sign-ups in the Supabase dashboard to keep the portfolio private.
export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'in') {
        await signIn(email, password);
        // onAuthStateChange in App will swap to the app automatically.
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('in');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            {mode === 'in' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mb-4 text-sm text-slate-500">
            {mode === 'in'
              ? 'Sign in to access the shared portfolio.'
              : 'Create an account to access the shared portfolio.'}
          </p>
          <form className="space-y-3" onSubmit={submit}>
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && <div className="text-sm font-medium text-rose-600">{error}</div>}
            {info && <div className="text-sm font-medium text-emerald-600">{info}</div>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'in' ? (
              <button className="font-medium text-blue-600" onClick={() => setMode('up')}>
                Need an account? Create one
              </button>
            ) : (
              <button className="font-medium text-blue-600" onClick={() => setMode('in')}>
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
