import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Property, Transaction } from '../lib/types';
import { usdCompact, num, fmtDate } from '../lib/format';
import { Button, Field, Input, Modal, Select, Spinner, Textarea } from '../components/ui';
import {
  addTxnAttachment,
  listTxnAttachments,
  deleteTxnAttachment,
  deleteTxnAttachmentsFor,
  openTxnAttachment,
  type TxnAttachment,
} from '../lib/pdfStore';

// Split a links textarea (one URL per line) into a clean list.
function parseLinks(s?: string): string[] {
  return (s || '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Internal corporate real estate (occupier) lifecycle — from an internal request
// through approval and execution, rather than a brokerage sales pipeline.
const STAGES = ['Requested', 'Evaluating', 'Negotiating', 'Pending Approval', 'Executing', 'Completed'];
const TYPES = [
  'New Lease',
  'Renewal',
  'Expansion',
  'Relocation',
  'Consolidation',
  'Disposition',
  'Sublease',
  'Acquisition',
  'Build-to-Suit',
];

const STAGE_ACCENT: Record<string, string> = {
  Requested: 'border-t-slate-400',
  Evaluating: 'border-t-[#c45957]',
  Negotiating: 'border-t-[#ff7f41]',
  'Pending Approval': 'border-t-amber-400',
  Executing: 'border-t-emerald-400',
  Completed: 'border-t-emerald-600',
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
    const open = txns.filter((t) => t.stage !== 'Completed');
    const annualCost = open.reduce((s, t) => s + (t.estimated_value || 0), 0);
    const sf = open.reduce((s, t) => s + (t.target_sqft || 0), 0);
    return { annualCost, sf, count: open.length };
  }, [txns]);

  async function moveTo(id: number, stage: string) {
    const t = txns.find((x) => x.id === id);
    if (!t || t.stage === stage) return;
    // optimistic update
    setTxns((prev) => prev.map((x) => (x.id === id ? { ...x, stage } : x)));
    await api.updateTransaction(id, { stage });
  }

  async function save(form: Partial<Transaction>, files?: File[]) {
    let id = form.id;
    if (id) await api.updateTransaction(id, form);
    else id = (await api.createTransaction(form)).id;
    if (files && id) for (const f of files) await addTxnAttachment(id, f);
    setEditing(null);
    load();
  }
  async function remove(id: number) {
    if (!confirm('Delete this transaction?')) return;
    await api.deleteTransaction(id);
    await deleteTxnAttachmentsFor(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Real Estate Transactions</h1>
          <p className="text-sm text-slate-500">
            {totals.count} active · {num(totals.sf)} sf in motion ·{' '}
            {usdCompact(totals.annualCost)} est. annual cost
          </p>
        </div>
        <Button onClick={() => setEditing({ stage: 'Requested', type: 'New Lease', probability: 50 })}>
          + Add Transaction
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
                    onClick={() => setEditing(t)}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer rounded-lg border border-l-0 border-t-2 ${STAGE_ACCENT[stage]} border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-blue-300`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-left text-sm font-medium text-slate-800">{t.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(t.id);
                        }}
                        className="text-xs text-slate-300 hover:text-rose-500"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {t.type} · {t.market}
                      </span>
                      {parseLinks(t.links).length > 0 && (
                        <span title={`${parseLinks(t.links).length} link(s)`}>
                          🔗 {parseLinks(t.links).length}
                        </span>
                      )}
                      {t.notes && <span title="Has notes">📝</span>}
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
                  <div className="py-6 text-center text-xs text-slate-400">
                    Drop transactions here
                  </div>
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
  onSave: (t: Partial<Transaction>, files?: File[]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Transaction>>(initial);
  const set = (k: keyof Transaction, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [pending, setPending] = useState<File[]>([]);
  const [existing, setExisting] = useState<TxnAttachment[]>([]);

  useEffect(() => {
    if (form.id) listTxnAttachments(form.id).then(setExisting);
  }, [form.id]);

  async function removeExisting(id: number) {
    await deleteTxnAttachment(id);
    if (form.id) setExisting(await listTxnAttachments(form.id));
  }

  return (
    <Modal title={form.id ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form, pending);
        }}
      >
        <Field label="Project / Transaction Name">
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
          <Field label="Region / Business Unit">
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
          <Field label="Est. Annual Cost">
            <Input
              type="number"
              value={form.estimated_value ?? 0}
              onChange={(e) => set('estimated_value', parseFloat(e.target.value || '0'))}
            />
          </Field>
          <Field label="Confidence %">
            <Input
              type="number"
              value={form.probability ?? 0}
              onChange={(e) => set('probability', parseInt(e.target.value || '0'))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="External Broker">
            <Input value={form.broker || ''} onChange={(e) => set('broker', e.target.value)} />
          </Field>
          <Field label="Internal Lead / Requestor">
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

        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Context, next steps, key terms…"
          />
        </Field>

        <Field label="Links">
          <Textarea
            rows={2}
            value={form.links || ''}
            onChange={(e) => set('links', e.target.value)}
            placeholder="One link per line — e.g. https://drive.google.com/…"
          />
          {parseLinks(form.links).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {parseLinks(form.links).map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:underline"
                >
                  🔗 {u.replace(/^https?:\/\//, '').slice(0, 40)}
                </a>
              ))}
            </div>
          )}
        </Field>

        <Field label="Attachments">
          <input
            type="file"
            multiple
            onChange={(e) => {
              setPending((p) => [...p, ...Array.from(e.target.files || [])]);
              e.target.value = '';
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          {(existing.length > 0 || pending.length > 0) && (
            <div className="mt-2 space-y-1">
              {existing.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openTxnAttachment(a)}
                    className="truncate text-blue-600 hover:underline"
                  >
                    📎 {a.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExisting(a.id)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {pending.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600">📎 {f.name} (new)</span>
                  <button
                    type="button"
                    onClick={() => setPending((p) => p.filter((_, idx) => idx !== i))}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-1 text-xs text-slate-400">
            Files are stored on this device. For files everyone can see, paste a shared link above.
          </div>
        </Field>

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
