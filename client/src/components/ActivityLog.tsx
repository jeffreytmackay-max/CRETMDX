import { useEffect, useState } from 'react';
import type { NoteEntry } from '../lib/types';
import { currentEmail } from '../lib/auth';
import { Button, Textarea } from './ui';

// Format an ISO timestamp as a readable local date + time.
export function fmtStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// A reusable timestamped activity log. Each added note is stamped with the
// current date/time (and the signed-in user's email when available). When a
// `persist` callback is supplied (i.e. the record already exists), adds and
// removes save immediately; otherwise they're kept in state and saved with the
// parent form.
export default function ActivityLog({
  entries,
  onChange,
  persist,
  label = 'Activity Log (dated notes)',
}: {
  entries: NoteEntry[];
  onChange: (entries: NoteEntry[]) => void;
  persist?: (entries: NoteEntry[]) => Promise<void>;
  label?: string;
}) {
  const [newNote, setNewNote] = useState('');
  const [me, setMe] = useState('');
  const [saving, setSaving] = useState('');
  useEffect(() => {
    currentEmail().then((e) => setMe(e || ''));
  }, []);

  async function apply(next: NoteEntry[]) {
    onChange(next);
    if (persist) {
      setSaving('Saving…');
      try {
        await persist(next);
        setSaving('Saved ✓');
        setTimeout(() => setSaving(''), 1500);
      } catch {
        setSaving('Save failed — will save with the form.');
      }
    }
  }

  const add = () => {
    const text = newNote.trim();
    if (!text) return;
    const entry: NoteEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      text,
      author: me || undefined,
    };
    apply([...(entries || []), entry]);
    setNewNote('');
  };
  const remove = (id: string) => apply((entries || []).filter((n) => n.id !== id));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {saving && <span className="text-xs text-slate-400">· {saving}</span>}
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Textarea
            rows={2}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a dated note — stamped with the date/time when you add it…"
          />
        </div>
        <Button variant="ghost" onClick={add}>
          + Add
        </Button>
      </div>
      {(entries || []).length > 0 && (
        <div className="mt-2 space-y-2">
          {[...(entries || [])].reverse().map((n) => (
            <div key={n.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {fmtStamp(n.ts)}
                  {n.author ? ` · ${n.author}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-700">{n.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
