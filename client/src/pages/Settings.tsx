import { useState } from 'react';
import { getApiKey, setApiKey } from '../lib/ai';
import { resetData } from '../lib/store';
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
          <p className="mb-4 text-sm text-slate-600">
            This app stores your portfolio in this browser. You can reset it back to the seeded
            sample portfolio at any time.
          </p>
          <Button variant="danger" onClick={reset}>
            Reset to sample data
          </Button>
        </Card>
      </div>
    </div>
  );
}
