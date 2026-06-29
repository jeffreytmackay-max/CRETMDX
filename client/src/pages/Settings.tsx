import { useState } from 'react';
import { getApiKey, setApiKey } from '../lib/ai';
import { resetData, clearData, exportData, importData } from '../lib/store';
import { clearAllPdfs, exportAllPdfs, importPdfs } from '../lib/pdfStore';
import { Button, Card, Field, Input, SectionTitle } from '../components/ui';
import {
  getSupabaseConfig,
  setSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseConfigured,
} from '../lib/supabase';
import { signOut } from '../lib/auth';
import { pushLocalToCloud, exportAll, replaceAll } from '../lib/cloud';

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
      // Pull from whichever backend is live so the file reflects the data the
      // user actually sees: the cloud when connected, else this browser.
      const data = isSupabaseConfigured() ? await exportAll() : exportData();
      const payload = {
        app: 'cretmdx',
        version: 1,
        source: isSupabaseConfigured() ? 'cloud' : 'local',
        exportedAt: new Date().toISOString(),
        data,
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
    const cloud = isSupabaseConfigured();
    if (
      !confirm(
        cloud
          ? 'Importing REPLACES ALL data in the shared cloud database with the contents of the ' +
              'file (it affects every signed-in device). Continue?'
          : 'Importing replaces ALL data in this browser with the contents of the file. Continue?',
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
      if (cloud) {
        await replaceAll(obj.data);
      } else {
        importData(obj.data);
      }
      if (Array.isArray(obj.pdfs)) await importPdfs(obj.pdfs);
      location.reload();
    } catch (e) {
      alert(
        'Import failed: ' +
          (e instanceof Error ? e.message : 'Make sure it is a portfolio export (.json).'),
      );
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
        <div className="lg:col-span-2">
          <BackendCard />
        </div>

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
          <SectionTitle>Backup &amp; Download Current Data</SectionTitle>
          <p className="mb-4 text-sm text-slate-600">
            {isSupabaseConfigured() ? (
              <>
                <strong>Export</strong> downloads a single file with your <strong>current cloud
                data</strong> (every property, lease, and transaction) — a point-in-time backup you
                can keep or share. <strong>Import replaces the shared cloud data</strong> with a
                file's contents, so use it carefully. Attached PDFs are still stored per device.
              </>
            ) : (
              <>
                Use Export to download your entire portfolio (every property, lease, transaction, and
                attached PDF) as a single file. Then open the app on another device and use Import to
                load it there. The same file is also a full backup.
              </>
            )}
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
            Import <strong>replaces</strong> everything currently in this browser. For automatic live
            sync across devices, connect the cloud backend at the top of this page.
          </p>
        </Card>
      </div>
    </div>
  );
}

// Connect/disconnect the Supabase cloud backend and migrate local data up to it.
function BackendCard() {
  const cfg = getSupabaseConfig();
  const [url, setUrl] = useState(cfg.url);
  const [anonKey, setAnonKey] = useState(cfg.anonKey);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const connected = isSupabaseConfigured();

  function connect() {
    if (!/^https?:\/\/.+/.test(url.trim()) || anonKey.trim().length < 20) {
      setMsg('Enter a valid Project URL and anon key.');
      return;
    }
    setSupabaseConfig(url, anonKey);
    // Reload so the client is recreated and the sign-in gate appears.
    location.reload();
  }

  function disconnect() {
    if (
      confirm(
        'Disconnect this device from the cloud backend? The app will return to local browser-only ' +
          'data. Your cloud data is not deleted.',
      )
    ) {
      clearSupabaseConfig();
      location.reload();
    }
  }

  async function migrate() {
    if (
      !confirm(
        "Upload THIS browser's current portfolio to the cloud? This adds its properties, leases, " +
          'and transactions to the shared database (it does not remove anything already there).',
      )
    )
      return;
    setBusy('Uploading…');
    setMsg('');
    try {
      const data = exportData();
      const res = await pushLocalToCloud(data.properties, data.leases, data.transactions);
      setMsg(
        `Uploaded ${res.properties} properties, ${res.leases} leases, and ${res.transactions} ` +
          'transactions. Reload to see them.',
      );
    } catch (e) {
      setMsg('Upload failed: ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setBusy('');
    }
  }

  let host = '';
  try {
    host = new URL(getSupabaseConfig().url).host;
  } catch {
    /* ignore */
  }

  return (
    <Card className="p-5">
      <SectionTitle>Cloud Backend &amp; Live Sync</SectionTitle>
      {connected ? (
        <>
          <p className="mb-3 text-sm text-slate-600">
            Connected to <strong>{host}</strong>. Your portfolio is stored in the shared cloud
            database and stays in sync across every signed-in device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={migrate}>⬆ Upload this browser's data to the cloud</Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Sign out
            </Button>
            <Button variant="danger" onClick={disconnect}>
              Disconnect this device
            </Button>
          </div>
          {busy && <p className="mt-3 text-sm text-slate-500">{busy}</p>}
          {msg && <p className="mt-3 text-sm font-medium text-slate-700">{msg}</p>}
          <p className="mt-3 text-xs text-slate-500">
            Use <strong>Upload</strong> once, from the device that has your real portfolio, to seed
            the cloud. Other devices just sign in — they'll see the same data.
          </p>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">
            Connect a free Supabase project to store the portfolio in the cloud with sign-in and
            live sync across devices. Paste your project's URL and{' '}
            <strong>anon/public</strong> key (Supabase → Project Settings → API). The anon key is
            safe to use in the app; access is protected by login and row-level security.
          </p>
          <div className="space-y-3">
            <Field label="Project URL">
              <Input
                placeholder="https://xxxxxxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Anon / public key">
              <Input
                type="password"
                placeholder="eyJhbGci..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Button onClick={connect}>Connect</Button>
          </div>
          {msg && <p className="mt-3 text-sm font-medium text-rose-600">{msg}</p>}
          <p className="mt-3 text-xs text-slate-500">
            First time? You'll also need to run the one-time setup SQL (creating the tables and
            security rules) in your Supabase project. See <code>supabase/README.md</code> in the
            repository.
          </p>
        </>
      )}
    </Card>
  );
}
