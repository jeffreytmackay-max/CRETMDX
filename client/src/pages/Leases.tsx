import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Lease, Property, ScheduleRow } from '../lib/types';
import { usd, usdCompact, num, fmtDate, monthsUntil } from '../lib/format';
import { abstractLeasePdf, abstractToLease, hasApiKey } from '../lib/ai';
import { savePdf, deletePdf, listPdfIds, openPdf } from '../lib/pdfStore';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';

type Filter = 'all' | 'expiring' | 'active';

export default function Leases() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Partial<Lease> | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [batch, setBatch] = useState<{ lease: Partial<Lease>; file: File }[] | null>(null);
  const [pdfIds, setPdfIds] = useState<Set<number>>(new Set());

  const load = async () => {
    const [l, p, ids] = await Promise.all([api.leases(), api.properties(), listPdfIds()]);
    setLeases(l);
    setProperties(p);
    setPdfIds(new Set(ids));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let rows = leases;
    if (filter === 'expiring')
      rows = rows.filter((l) => {
        const m = monthsUntil(l.expiration_date);
        return m >= 0 && m <= 18;
      });
    else if (filter === 'active') rows = rows.filter((l) => l.status === 'Active');

    const q = search.trim().toLowerCase();
    if (q)
      rows = rows.filter((l) =>
        [l.lease_name, l.counterparty, l.property_name, l.lease_type, l.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    return rows;
  }, [leases, filter, search]);

  async function save(form: Partial<Lease>, file?: File | null) {
    let id = form.id;
    if (id) await api.updateLease(id, form);
    else id = (await api.createLease(form)).id;
    if (file && id) await savePdf(id, file);
    setEditing(null);
    setEditingFile(null);
    load();
  }
  async function saveBatch(items: { lease: Partial<Lease>; file: File }[]) {
    for (const { lease, file } of items) {
      const created = await api.createLease(lease);
      if (created?.id) await savePdf(created.id, file);
    }
    setBatch(null);
    load();
  }
  async function remove(id: number) {
    if (!confirm('Delete this lease?')) return;
    await api.deleteLease(id);
    await deletePdf(id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lease Administration</h1>
          <p className="text-sm text-slate-500">
            Lease abstracts, critical dates, and rent schedules
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="ghost" onClick={() => setImporting(true)}>
            ⤓ Abstract PDF
          </Button>
          <Button onClick={() => setEditing({ status: 'Active', escalation_pct: 3, notice_period_months: 9 })}>
            + Add Lease
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(['all', 'active', 'expiring'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'expiring' ? 'Expiring ≤ 18 mo' : f}
            </button>
          ))}
        </div>
        <div className="sm:w-64">
          <Input
            type="search"
            placeholder="Search leases, tenants, properties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-x-auto scroll-touch">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Lease</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3 text-right">Sq Ft</th>
              <th className="px-5 py-3 text-right">Base Rent/yr</th>
              <th className="px-5 py-3">Expiration</th>
              <th className="px-5 py-3">Notice By</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const months = monthsUntil(l.expiration_date);
              const noticeDate = addMonths(l.expiration_date, -(l.notice_period_months || 0));
              const noticeMonths = monthsUntil(noticeDate);
              return (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                        onClick={() => setDetailId(l.id)}
                      >
                        {l.lease_name}
                      </button>
                      {pdfIds.has(l.id) && (
                        <button
                          title="View original PDF"
                          onClick={() => openPdf(l.id)}
                          className="text-xs text-rose-500 hover:text-rose-700"
                        >
                          📄
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {l.property_name} · {l.counterparty}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge>{l.lease_type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {num(l.rentable_sqft)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {usdCompact(l.base_rent_annual)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-700">{fmtDate(l.expiration_date)}</div>
                    <ExpiryPill months={months} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-700">{fmtDate(noticeDate)}</div>
                    {noticeMonths >= 0 && noticeMonths <= 6 && (
                      <span className="text-xs font-medium text-amber-600">action soon</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setEditing(l)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:underline"
                      onClick={() => remove(l.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {detailId !== null && (
        <LeaseDetail
          id={detailId}
          hasPdf={pdfIds.has(detailId)}
          onClose={() => setDetailId(null)}
        />
      )}
      {editing && (
        <LeaseForm
          initial={editing}
          initialFile={editingFile}
          hasPdf={!!editing.id && pdfIds.has(editing.id)}
          properties={properties}
          onSave={save}
          onClose={() => {
            setEditing(null);
            setEditingFile(null);
          }}
        />
      )}
      {importing && (
        <ImportPdf
          onClose={() => setImporting(false)}
          onSingle={(lease, file) => {
            setImporting(false);
            setEditingFile(file);
            setEditing(lease);
          }}
          onBatch={(items) => {
            setImporting(false);
            setBatch(items);
          }}
        />
      )}
      {batch && (
        <BatchReview
          items={batch}
          properties={properties}
          onSaveAll={saveBatch}
          onClose={() => setBatch(null)}
        />
      )}
    </div>
  );
}

function ImportPdf({
  onClose,
  onSingle,
  onBatch,
}: {
  onClose: () => void;
  onSingle: (lease: Partial<Lease>, file: File) => void;
  onBatch: (items: { lease: Partial<Lease>; file: File }[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string>('');
  const keyMissing = !hasApiKey();

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    const results: { lease: Partial<Lease>; file: File }[] = [];
    const failures: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Reading ${i + 1} of ${files.length}: ${files[i].name}`);
        try {
          const abstract = await abstractLeasePdf(files[i]);
          results.push({ lease: abstractToLease(abstract), file: files[i] });
        } catch (e) {
          failures.push(`${files[i].name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (results.length === 0) {
        setError(failures.join('\n') || 'No leases could be read.');
        return;
      }
      if (failures.length) setError(`Some files failed:\n${failures.join('\n')}`);
      if (results.length === 1 && failures.length === 0) {
        onSingle(results[0].lease, results[0].file);
      } else {
        onBatch(results);
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <Modal title="Abstract Leases from PDF" onClose={onClose}>
      {keyMissing ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            To read PDFs, add your Anthropic API key first. Claude reads each document — including
            scanned and non-English leases — and fills in the lease abstract for you.
          </p>
          <Link
            to="/settings"
            onClick={onClose}
            className="inline-block rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Settings →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload one or more lease PDFs. Claude extracts the key terms (rent, dates, options) and
            translates any foreign-language clauses. The original PDFs are attached to each lease,
            and you review everything before saving.
          </p>
          <Field label="Lease PDF(s)">
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </Field>
          {files.length > 0 && (
            <div className="text-xs text-slate-500">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </div>
          )}
          {error && (
            <div className="whitespace-pre-wrap rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={run}>
              {busy ? 'Reading…' : files.length > 1 ? `Abstract ${files.length} leases` : 'Abstract lease'}
            </Button>
          </div>
          {busy && (
            <p className="text-center text-xs text-slate-500">
              {progress || 'Working…'} — Claude takes ~15–40 seconds per lease.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function BatchReview({
  items,
  properties,
  onSaveAll,
  onClose,
}: {
  items: { lease: Partial<Lease>; file: File }[];
  properties: Property[];
  onSaveAll: (items: { lease: Partial<Lease>; file: File }[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(
    items.map((it) => ({ ...it, include: true, propertyId: '' as number | '' })),
  );
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function saveAll() {
    const selected = rows
      .filter((r) => r.include)
      .map((r) => ({
        lease: { ...r.lease, property_id: r.propertyId === '' ? undefined : r.propertyId },
        file: r.file,
      }));
    if (selected.length === 0) return;
    setSaving(true);
    await onSaveAll(selected);
  }

  const count = rows.filter((r) => r.include).length;

  return (
    <Modal title={`Review ${items.length} Abstracted Leases`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">
        Claude read these leases. Assign a property and uncheck any you don't want to import. You can
        fine-tune each one after saving.
      </p>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto scroll-touch pr-1">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={r.include}
                onChange={(e) => update(i, { include: e.target.checked })}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">
                  {r.lease.lease_name}
                </div>
                <div className="text-xs text-slate-500">
                  {r.lease.counterparty} · {usdCompact(r.lease.base_rent_annual || 0)}/yr ·{' '}
                  {num(r.lease.rentable_sqft || 0)} sf · exp {fmtDate(r.lease.expiration_date)}
                </div>
                <div className="mt-2">
                  <Select
                    value={r.propertyId}
                    onChange={(e) =>
                      update(i, { propertyId: e.target.value ? Number(e.target.value) : '' })
                    }
                  >
                    <option value="">— Assign property —</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={saveAll}>
          {saving ? 'Saving…' : `Save ${count} lease${count === 1 ? '' : 's'}`}
        </Button>
      </div>
    </Modal>
  );
}

function ExpiryPill({ months }: { months: number }) {
  if (months < 0) return <span className="text-xs font-medium text-slate-400">expired</span>;
  const cls =
    months <= 12 ? 'text-rose-600' : months <= 24 ? 'text-amber-600' : 'text-emerald-600';
  return <span className={`text-xs font-medium ${cls}`}>{months} mo remaining</span>;
}

function addMonths(date: string, months: number): string {
  if (!date) return '';
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

// Opens a print-friendly one-page lease abstract in a new window (Save as PDF).
function printAbstract(lease: Lease, termYears: number, schedule: ScheduleRow[]) {
  const facts: [string, string][] = [
    ['Property', lease.property_name || '—'],
    ['Counterparty', lease.counterparty || '—'],
    ['Role / Type', `${lease.role} · ${lease.lease_type}`],
    ['Commencement', fmtDate(lease.commencement_date)],
    ['Expiration', fmtDate(lease.expiration_date)],
    ['Term', `${termYears} years`],
    ['Rentable SF', num(lease.rentable_sqft)],
    ['Base Rent (Yr 1)', usd(lease.base_rent_annual)],
    ['Escalation', `${lease.escalation_pct}% / yr`],
    ['OpEx', `${usd(lease.opex_psf, 2)} / sf`],
    ['Free Rent', `${lease.free_rent_months} months`],
    ['TI Allowance', `${usd(lease.ti_allowance_psf, 2)} / sf`],
    ['Security Deposit', usd(lease.security_deposit)],
    ['Notice Period', `${lease.notice_period_months} months`],
    ['Renewal Options', lease.renewal_options || 'None'],
  ];
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(lease.lease_name)} — Lease Abstract</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;margin:32px;}
  h1{font-size:20px;margin:0 0 2px;} .sub{color:#64748b;font-size:13px;margin-bottom:18px;}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:22px 0 8px;}
  table{width:100%;border-collapse:collapse;font-size:13px;} td,th{padding:6px 8px;text-align:left;}
  .facts td:first-child{color:#64748b;width:38%;} .facts td:last-child{text-align:right;font-weight:600;}
  .facts tr{border-bottom:1px solid #f1f5f9;}
  .sched th{border-bottom:1px solid #cbd5e1;color:#64748b;font-size:11px;text-transform:uppercase;}
  .sched td{border-bottom:1px solid #f1f5f9;} .sched td.n,.sched th.n{text-align:right;font-variant-numeric:tabular-nums;}
  .notes{white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#334155;}
  @media print{body{margin:0;}}
</style></head><body>
  <h1>${esc(lease.lease_name)}</h1>
  <div class="sub">Lease Abstract · Generated ${esc(generated)}</div>
  <table class="facts">${facts.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
  <h2>Rent Schedule</h2>
  <table class="sched"><thead><tr><th>Year</th><th class="n">Base Rent</th><th class="n">OpEx</th><th class="n">Free Rent</th><th class="n">Net Cost</th></tr></thead>
  <tbody>${schedule
    .map(
      (r) =>
        `<tr><td>Year ${r.year}</td><td class="n">${esc(usd(r.baseRent))}</td><td class="n">${esc(usd(r.opex))}</td><td class="n">${r.freeRent ? '(' + esc(usd(r.freeRent)) + ')' : '—'}</td><td class="n">${esc(usd(r.netCost))}</td></tr>`,
    )
    .join('')}</tbody></table>
  ${lease.notes ? `<h2>Notes &amp; Abstract</h2><div class="notes">${esc(lease.notes)}</div>` : ''}
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups to print the abstract.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function LeaseDetail({
  id,
  hasPdf,
  onClose,
}: {
  id: number;
  hasPdf: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ lease: Lease; termYears: number; schedule: ScheduleRow[] } | null>(
    null,
  );
  useEffect(() => {
    api.leaseSchedule(id).then(setData);
  }, [id]);

  if (!data) {
    return (
      <Modal title="Lease Abstract" onClose={onClose}>
        <Spinner />
      </Modal>
    );
  }

  const { lease, termYears, schedule } = data;
  const totalRent = schedule.reduce((s, r) => s + r.baseRent, 0);
  const chartData = schedule.map((r) => ({
    year: `Y${r.year}`,
    'Base Rent': Math.round(r.baseRent),
    OpEx: Math.round(r.opex),
  }));

  const facts: [string, string][] = [
    ['Property', lease.property_name || '—'],
    ['Counterparty', lease.counterparty],
    ['Role / Type', `${lease.role} · ${lease.lease_type}`],
    ['Commencement', fmtDate(lease.commencement_date)],
    ['Expiration', fmtDate(lease.expiration_date)],
    ['Term', `${termYears} years`],
    ['Rentable SF', num(lease.rentable_sqft)],
    ['Base Rent (Yr 1)', usd(lease.base_rent_annual)],
    ['Escalation', `${lease.escalation_pct}% / yr`],
    ['OpEx', `${usd(lease.opex_psf, 2)} / sf`],
    ['Free Rent', `${lease.free_rent_months} months`],
    ['TI Allowance', `${usd(lease.ti_allowance_psf, 2)} / sf`],
    ['Security Deposit', usd(lease.security_deposit)],
    ['Notice Period', `${lease.notice_period_months} months`],
    ['Renewal Options', lease.renewal_options || 'None'],
  ];

  return (
    <Modal title={lease.lease_name} onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => printAbstract(lease, termYears, schedule)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          🖶 Print abstract / PDF
        </button>
        {hasPdf && (
          <button
            onClick={() => openPdf(id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            📄 View original PDF
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-medium text-slate-800">{v}</span>
          </div>
        ))}
      </div>

      {lease.notes && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes & Abstract
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{lease.notes}</p>
        </div>
      )}

      <div className="mt-5 mb-1 text-sm font-semibold text-slate-700">
        Rent Schedule · {usd(totalRent)} total base rent
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => usdCompact(v)} tick={{ fontSize: 10 }} width={50} />
            <Tooltip formatter={(v: number) => usd(v)} />
            <Area type="monotone" dataKey="Base Rent" stackId="1" stroke="#2563eb" fill="#bfdbfe" />
            <Area type="monotone" dataKey="OpEx" stackId="1" stroke="#7c3aed" fill="#ddd6fe" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-1.5 text-left">Year</th>
              <th className="px-3 py-1.5 text-right">Base Rent</th>
              <th className="px-3 py-1.5 text-right">OpEx</th>
              <th className="px-3 py-1.5 text-right">Free Rent</th>
              <th className="px-3 py-1.5 text-right">Net Cost</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((r) => (
              <tr key={r.year} className="border-t border-slate-100">
                <td className="px-3 py-1.5">Year {r.year}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.baseRent)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{usd(r.opex)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">
                  {r.freeRent ? `(${usd(r.freeRent)})` : '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">{usd(r.netCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function LeaseForm({
  initial,
  initialFile,
  hasPdf,
  properties,
  onSave,
  onClose,
}: {
  initial: Partial<Lease>;
  initialFile?: File | null;
  hasPdf?: boolean;
  properties: Property[];
  onSave: (l: Partial<Lease>, file?: File | null) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Lease>>(initial);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const set = (k: keyof Lease, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const numSet = (k: keyof Lease) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, parseFloat(e.target.value || '0'));

  return (
    <Modal title={form.id ? 'Edit Lease' : 'Add Lease'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form, file);
        }}
      >
        <Field label="Lease Name">
          <Input value={form.lease_name || ''} onChange={(e) => set('lease_name', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property">
            <Select
              value={form.property_id ?? ''}
              onChange={(e) => set('property_id', parseInt(e.target.value))}
            >
              <option value="">— Select —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Counterparty">
            <Input value={form.counterparty || ''} onChange={(e) => set('counterparty', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lease Type">
            <Select value={form.lease_type || 'Direct'} onChange={(e) => set('lease_type', e.target.value)}>
              <option>Direct</option>
              <option>Sublease</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status || 'Active'} onChange={(e) => set('status', e.target.value)}>
              <option>Active</option>
              <option>Pending</option>
              <option>Expired</option>
              <option>Terminated</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commencement">
            <Input type="date" value={form.commencement_date || ''} onChange={(e) => set('commencement_date', e.target.value)} />
          </Field>
          <Field label="Expiration">
            <Input type="date" value={form.expiration_date || ''} onChange={(e) => set('expiration_date', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rentable SF">
            <Input type="number" value={form.rentable_sqft ?? 0} onChange={numSet('rentable_sqft')} />
          </Field>
          <Field label="Base Rent/yr">
            <Input type="number" value={form.base_rent_annual ?? 0} onChange={numSet('base_rent_annual')} />
          </Field>
          <Field label="Escalation %">
            <Input type="number" step="0.1" value={form.escalation_pct ?? 0} onChange={numSet('escalation_pct')} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="OpEx $/sf">
            <Input type="number" step="0.1" value={form.opex_psf ?? 0} onChange={numSet('opex_psf')} />
          </Field>
          <Field label="Free Rent (mo)">
            <Input type="number" value={form.free_rent_months ?? 0} onChange={numSet('free_rent_months')} />
          </Field>
          <Field label="Notice (mo)">
            <Input type="number" value={form.notice_period_months ?? 0} onChange={numSet('notice_period_months')} />
          </Field>
        </div>
        <Field label="Renewal Options">
          <Input value={form.renewal_options || ''} onChange={(e) => set('renewal_options', e.target.value)} />
        </Field>
        <Field label="Notes / Abstract">
          <Textarea
            rows={form.notes ? 6 : 2}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Summary, translated clauses, or any notes…"
          />
        </Field>
        <Field label="Original PDF (optional)">
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <div className="mt-1 text-xs text-slate-500">
            {file
              ? `Attached: ${file.name}`
              : hasPdf
                ? 'A PDF is already attached. Choose a file to replace it.'
                : 'Attach the source lease document to keep it with this record.'}
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
