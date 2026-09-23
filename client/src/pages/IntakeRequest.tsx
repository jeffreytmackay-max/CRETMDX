import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { currentEmail } from '../lib/auth';
import IntakeRequestForm from '../components/IntakeRequestForm';
import { Card } from '../components/ui';

// Internal "New Request" page for signed-in users. Submissions create a
// transaction at the Intake stage directly. Also surfaces the public link that
// anyone can use without logging in.
export default function IntakeRequest() {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    currentEmail().then((e) => setEmail(e || ''));
  }, []);

  const publicUrl = `${window.location.origin}${window.location.pathname}#/submit`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-slate-900">New Real Estate Request</h1>
      <p className="mt-1 text-sm text-slate-500">
        Submit a new real estate need. It lands on the Transactions board at the Intake stage,
        ready for the Real Estate team to work.
      </p>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium text-slate-700">Shareable link (no login required)</div>
          <div className="truncate text-xs text-slate-500">{publicUrl}</div>
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>

      <Card className="mt-4 p-6">
        <IntakeRequestForm
          mode="internal"
          defaultRequestor={{ email }}
          submit={(t) => api.createTransaction(t).then(() => {})}
        />
      </Card>
    </div>
  );
}
