import { Select } from './ui';

// A dropdown for a person/firm field. Options are supplied by the parent
// (harvested from existing records + a persisted directory). Choosing
// "＋ Add new…" prompts for a name, adds it to the directory, and selects it —
// so the list grows without leaving free-text entry on the field itself.
const ADD = '__add_new__';

export default function PersonSelect({
  value,
  options,
  onChange,
  onAdd,
  placeholder = '— None —',
}: {
  value?: string;
  options: string[];
  onChange: (v: string) => void;
  onAdd?: (name: string) => void;
  placeholder?: string;
}) {
  // Always include the current value so an existing entry stays visible.
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Select
      value={value || ''}
      onChange={(e) => {
        const v = e.target.value;
        if (v === ADD) {
          const name = window.prompt('Add a name')?.trim();
          if (name) {
            onAdd?.(name);
            onChange(name);
          }
          return;
        }
        onChange(v);
      }}
    >
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value={ADD}>＋ Add new…</option>
    </Select>
  );
}
