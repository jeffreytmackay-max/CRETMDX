import { useState } from 'react';
import { getApiKey, setApiKey } from '../lib/ai';
import { resetData, clearData, exportData, importData } from '../lib/store';
import { clearAllPdfs, exportAllPdfs, importPdfs } from '../lib/pdfStore';
import { Button, Card, Field, Input, SectionTitle } from '../components/ui';

export default function Settings() {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const masked = getApiKey();

  function save() {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function reset() {
    if (confirm('Reset all data back to the seeded sample portfolio? This clears your edits.')) {
      resetData();
      location.reload();
    }
  }

  const [busy, setBusy] = useState('');

  async function exportBackup() {
    setBusy('Preparing export…');
    try {
      const payload = {
        app: 'cretmdx',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: exportData(),
        pdfs: await exportAllPdfs(),
      };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transmedics-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy('');
    }
  }

  async function importBackup(file: File) {
    if (
      !confirm(
        'Importing replaces ALL data in this browser with the contents of the file. Continue?',
      )
    )
      return;
    setBusy('Importing…');
    try {
      const obj = JSON.parse(await file.text());
      if (!obj || typeof obj !== 'object' || !obj.data) {
        alert('That file is not a valid portfolio export.');
        return;
      }
      importData(obj.data);
      if (Array.isArray(obj.pdfs)) await importPdfs(obj.pdfs);
      location.reload();
    } catch {
      alert('Could not read that file. Make sure it is a portfolio export (.json).');
    } finally {
      setBusy('');
    }
  }

  async function clearAll() {
    if (
      confirm(
        'Clear ALL data and start empty? This removes every property, lease, transaction, and ' +
          'attached PDF in THIS browser, and does not re-load the sample portfolio. This cannot be undone.',
      )
    ) {
      clearData();
      await clearAllPdfs();
      location.reload();
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">AI configuration and data management</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Anthropic API Key</SectionTitle>
          <p className="mb-4 text-sm text-slate-600">
            Used to read uploaded lease PDFs with Claude and translate foreign-language documents.
            Your key is stored <strong>only in this browser</strong> (local storage) and is sent
            directly to Anthropic — it never touches any other server.
          </p>
          <Field label="API Key">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={save}>Save key</Button>
            {masked && (
              <Button variant="ghost" onClick={() => { setKey(''); setApiKey(''); }}>
                Remove
              </Button>
            )}
            {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <div className="mb-1 font-medium text-slate-700">How to get a key</div>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Go to{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  console.anthropic.com
                </a>{' '}
                and sign in (or create an account).
              </li>
              <li>Open <strong>Settings → API Keys</strong> and click <strong>Create Key</strong>.</li>
              <li>Add a little credit under <strong>Billing</strong> if prompted.</li>
              <li>Copy the key (starts with <code>sk-ant-</code>) and paste it above.</li>
            </ol>
            <p className="mt-2 text-xs text-slate-500">
              Usage is billed to your own Anthropic account. Abstracting a lease typically costs a
              few cents.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Data</SectionTitle>
          <p className="mb-3 text-sm text-slate-600">
            Your portfolio is stored <strong>only in this browser</strong> on this device — there is
            no shared server. Changes here do not affect the app on any other device or browser, and
            each new browser starts with the sample portfolio.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={reset}>
              Reset to sample data
            </Button>
            <Button variant="danger" onClick={clearAll}>
              Clear all data (start empty)
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            <strong>Reset</strong> reloads the sample portfolio. <strong>Clear all</strong> empties
            everything in this browser and does not re-seed — use this to start from a blank
            portfolio.
          </p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Backup &amp; Transfer Between Devices</SectionTitle>
          <p className="mb-4 text-sm text-slate-600">
            Because data lives in this browser, use Export to download your entire portfolio (every
            property, lease, transaction, and attached PDF) as a single file. Then open the app on
            another device and use Import to load it there. The same file is also a full backup.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={exportBackup}>⤓ Export data</Button>
            <label className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              ⤒ Import data
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importBackup(f);
                  e.target.value = '';
                }}
              />
            </label>
            {busy && <span className="text-sm text-slate-500">{busy}</span>}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Import <strong>replaces</strong> everything currently in this browser. Want automatic
            live sync across devices instead? That needs a shared database — ask and we'll set it up.
          </p>
        </Card>
      </div>
    </div>
  );
}
