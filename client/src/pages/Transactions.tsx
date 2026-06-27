import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Property, Transaction } from '../lib/types';
import { usdCompact, num, fmtDate } from '../lib/format';
import { Button, Field, Input, Modal, Select, Spinner } from '../components/ui';

const STAGES = ['Prospecting', 'LOI', 'Negotiation', 'Legal', 'Executed', 'Closed'];
const TYPES = ['New Lease', 'Renewal', 'Expansion', 'Disposition', 'Acquisition', 'Sublease'];

const STAGE_ACCENT: Record<string, string> = {
  Prospecting: 'border-t-slate-400',
  LOI: 'border-t-[#c45957]',
  Negotiation: 'border-t-[#ff7f41]',
  Legal: 'border-t-amber-400',
  Executed: 'border-t-emerald-400',
  Closed: 'border-t-emerald-600',
};

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Transaction> | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = async () => {
    const [t, p] = await Promise.all([api.transactions(), api.properties()]);
    setTxns(t);
    setProperties(p);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const byStage = useMemo(() => {
    const m: Record<string, Transaction[]> = {};
    for (const s of STAGES) m[s] = [];
    for (const t of txns) (m[t.stage] ||= []).push(t);
    return m;
  }, [txns]);

  const totals = useMemo(() => {
    const open = txns.filter((t) => !['Closed', 'Executed'].includes(t.stage));
    const weighted = open.reduce((s, t) => s + t.estimated_value * (t.probability / 100), 0);
    const gross = open.reduce((s, t) => s + t.estimated_value, 0);
    return { weighted, gross, count: open.length };
  }, [txns]);

  async function moveTo(id: number, stage: string) {
    const t = txns.find((x) => x.id === id);
    if (!t || t.stage === stage) return;
    // optimistic update
    setTxns((prev) => prev.map((x) => (x.id === id ? { ...x, stage } : x)));
    await api.updateTransaction(id, { stage });
  }

  async function save(form: Partial<Transaction>) {
    if (form.id) await api.updateTransaction(form.id, form);
    else await api.createTransaction(form);
    setEditing(null);
    load();
  }
  async function remove(id: number) {
    if (!confirm('Delete this transaction?')) return;
    await api.deleteTransaction(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaction Pipeline</h1>
          <p className="text-sm text-slate-500">
            {totals.count} open deals · {usdCompact(totals.weighted)} weighted ·{' '}
            {usdCompact(totals.gross)} gross
          </p>
        </div>
        <Button onClick={() => setEditing({ stage: 'Prospecting', type: 'New Lease', probability: 50 })}>
          + Add Deal
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto scroll-touch p-4 md:p-6">
        {STAGES.map((stage) => {
          const items = byStage[stage] || [];
          const stageValue = items.reduce((s, t) => s + t.estimated_value, 0);
          return (
            <div
              key={stage}
              className="flex w-72 flex-shrink-0 flex-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId !== null) moveTo(dragId, stage);
                setDragId(null);
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-700">{stage}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  {items.length}
                </span>
              </div>
              <div className="mb-2 px-1 text-xs text-slate-400">{usdCompact(stageValue)}</div>
              <div className="flex-1 space-y-2 rounded-xl bg-slate-100/70 p-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-lg border border-l-0 border-t-2 ${STAGE_ACCENT[stage]} border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => setEditing(t)}
                        className="text-left text-sm font-medium text-slate-800 hover:text-blue-600"
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="text-xs text-slate-300 hover:text-rose-500"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t.type} · {t.market}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        {usdCompact(t.estimated_value)}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {t.probability}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{num(t.target_sqft)} sf</span>
                      <span>{fmtDate(t.target_close_date)}</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">Drop deals here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <TxForm
          initial={editing}
          properties={properties}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TxForm({
  initial,
  properties,
  onSave,
  onClose,
}: {
  initial: Partial<Transaction>;
  properties: Property[];
  onSave: (t: Partial<Transaction>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Transaction>>(initial);
  const set = (k: keyof Transaction, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={form.id ? 'Edit Deal' : 'Add Deal'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Deal Name">
          <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property (optional)">
            <Select
              value={form.property_id ?? ''}
              onChange={(e) => set('property_id', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">— None —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Market">
            <Input value={form.market || ''} onChange={(e) => set('market', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target SF">
            <Input
              type="number"
              value={form.target_sqft ?? 0}
              onChange={(e) => set('target_sqft', parseInt(e.target.value || '0'))}
            />
          </Field>
          <Field label="Est. Value">
            <Input
              type="number"
              value={form.estimated_value ?? 0}
              onChange={(e) => set('estimated_value', parseFloat(e.target.value || '0'))}
            />
          </Field>
          <Field label="Probability %">
            <Input
              type="number"
              value={form.probability ?? 0}
              onChange={(e) => set('probability', parseInt(e.target.value || '0'))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Broker">
            <Input value={form.broker || ''} onChange={(e) => set('broker', e.target.value)} />
          </Field>
          <Field label="Internal Lead">
            <Input value={form.lead || ''} onChange={(e) => set('lead', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <Input type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} />
          </Field>
          <Field label="Target Close">
            <Input
              type="date"
              value={form.target_close_date || ''}
              onChange={(e) => set('target_close_date', e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
