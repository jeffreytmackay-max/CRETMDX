import type { SortDir } from '../lib/table';
import { Select } from './ui';

// Sort + group toolbar shared by record pages (Properties, Leases).
export function SortGroupBar({
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  groupKey,
  setGroupKey,
  sortChoices,
  groupChoices,
}: {
  sortKey: string;
  setSortKey: (k: string) => void;
  sortDir: SortDir;
  setSortDir: (d: SortDir) => void;
  groupKey: string;
  setGroupKey: (k: string) => void;
  sortChoices: { key: string; label: string }[];
  groupChoices: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Sort</span>
        <div className="w-40">
          <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {sortChoices.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Group</span>
        <div className="w-40">
          <Select value={groupKey} onChange={(e) => setGroupKey(e.target.value)}>
            {groupChoices.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
