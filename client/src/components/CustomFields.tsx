import { useEffect, useState } from 'react';
import type { FieldDef, FieldEntity } from '../lib/types';
import { getFieldDefs } from '../lib/fields';
import { Field, Input, Select } from './ui';

// Renders the user-defined custom fields for a record type and binds their
// values to a `custom` JSON map. Self-loads the field definitions for the given
// entity, so any field added in Settings shows up here automatically.
export default function CustomFields({
  entity,
  value,
  onChange,
}: {
  entity: FieldEntity;
  value: Record<string, unknown> | undefined;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [defs, setDefs] = useState<FieldDef[]>([]);

  useEffect(() => {
    let alive = true;
    getFieldDefs(entity).then((d) => {
      if (alive) setDefs(d);
    });
    return () => {
      alive = false;
    };
  }, [entity]);

  if (defs.length === 0) return null;

  const cur = value || {};
  const set = (key: string, v: unknown) => onChange({ ...cur, [key]: v });

  return (
    <>
      {defs.map((d) => {
        const v = cur[d.field_key];
        if (d.field_type === 'checkbox') {
          return (
            <label key={d.field_key} className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(v)}
                onChange={(e) => set(d.field_key, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">{d.label}</span>
            </label>
          );
        }
        if (d.field_type === 'select') {
          const opts = (d.options || '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
          return (
            <Field key={d.field_key} label={d.label}>
              <Select value={(v as string) ?? ''} onChange={(e) => set(d.field_key, e.target.value)}>
                <option value="">—</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          );
        }
        const inputType = d.field_type === 'number' ? 'number' : d.field_type === 'date' ? 'date' : 'text';
        return (
          <Field key={d.field_key} label={d.label}>
            <Input
              type={inputType}
              value={(v as string | number) ?? ''}
              onChange={(e) =>
                set(d.field_key, d.field_type === 'number' ? Number(e.target.value) : e.target.value)
              }
            />
          </Field>
        );
      })}
    </>
  );
}

// Read-only display of custom field values (used in detail panels).
export function CustomFieldsView({
  entity,
  value,
}: {
  entity: FieldEntity;
  value: Record<string, unknown> | undefined;
}) {
  const [defs, setDefs] = useState<FieldDef[]>([]);
  useEffect(() => {
    let alive = true;
    getFieldDefs(entity).then((d) => {
      if (alive) setDefs(d);
    });
    return () => {
      alive = false;
    };
  }, [entity]);

  const cur = value || {};
  const shown = defs.filter((d) => {
    const v = cur[d.field_key];
    return v !== undefined && v !== '' && v !== null;
  });
  if (shown.length === 0) return null;

  return (
    <>
      {shown.map((d) => {
        const v = cur[d.field_key];
        const text = d.field_type === 'checkbox' ? (v ? 'Yes' : 'No') : String(v);
        return (
          <div key={d.field_key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{d.label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{text}</dd>
          </div>
        );
      })}
    </>
  );
}
