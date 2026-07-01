import { useMemo, useState } from 'react';
import { Button, Modal } from './ui';

// Minimal shape the picker needs from a column definition.
interface Col {
  key: string;
  label: string;
  group: string;
}

// "Columns" button + modal for choosing which columns a table shows, in what
// order. Shown columns can be reordered and removed; hidden columns are grouped
// by source (this tab, custom fields, related tabs) and can be added.
export default function ColumnPicker({
  all,
  visible,
  onChange,
  onReset,
}: {
  all: Col[];
  visible: string[];
  onChange: (keys: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  const byKey = useMemo(() => new Map(all.map((c) => [c.key, c])), [all]);
  const shown = visible.map((k) => byKey.get(k)).filter(Boolean) as Col[];
  const hiddenByGroup = useMemo(() => {
    const shownSet = new Set(visible);
    const groups = new Map<string, Col[]>();
    for (const c of all) {
      if (shownSet.has(c.key)) continue;
      if (!groups.has(c.group)) groups.set(c.group, []);
      groups.get(c.group)!.push(c);
    }
    return groups;
  }, [all, visible]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= visible.length) return;
    const next = visible.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const removeCol = (key: string) => onChange(visible.filter((k) => k !== key));
  const addCol = (key: string) => onChange([...visible, key]);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        ⚙ Columns
      </Button>
      {open && (
        <Modal title="Table columns" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shown ({shown.length})
              </div>
              <div className="space-y-1">
                {shown.map((c, i) => (
                  <div
                    key={c.key}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5"
                  >
                    <span className="flex-1 text-sm text-slate-800">
                      {c.label}
                      <span className="ml-2 text-xs text-slate-400">{c.group}</span>
                    </span>
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === shown.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeCol(c.key)}
                      className="text-rose-500 hover:text-rose-700"
                      title="Remove column"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {shown.length === 0 && (
                  <p className="text-sm text-slate-400">No columns shown. Add some below.</p>
                )}
              </div>
            </div>

            {[...hiddenByGroup.entries()].map(([group, cols]) => (
              <div key={group}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Add · {group}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cols.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => addCol(c.key)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
                    >
                      + {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between border-t border-slate-200 pt-3">
              <Button variant="ghost" onClick={onReset}>
                Reset to defaults
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
