import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Property, Lease, Transaction } from '../lib/types';
import { usdCompact, num, fmtDate } from '../lib/format';
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner, Textarea } from '../components/ui';
import { SortGroupBar } from '../components/SortGroupBar';
import { sortRows, groupRows, type SortDir, type SortOption, type GroupOption } from '../lib/table';
import { parseCsv } from '../lib/csv';
import {
  addTxnAttachment,
  listTxnAttachments,
  deleteTxnAttachment,
  deleteTxnAttachmentsFor,
  openTxnAttachment,
  type TxnAttachment,
} from '../lib/pdfStore';

// Links are stored in the transaction's `links` text column as a JSON array of
// { name, url }. Older records may hold plain newline/comma-separated URLs, so
// parse both shapes.
interface TxLink {
  name: string;
  url: string;
}
function parseLinks(s?: string): TxLink[] {
  const t = (s || '').trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr
          .map((x) => ({ name: String(x?.name || ''), url: String(x?.url || '') }))
          .filter((x) => x.url);
      }
    } catch {
      /* fall through to legacy parsing */
    }
  }
  return t
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((url) => ({ name: '', url }));
}
function serializeLinks(links: TxLink[]): string {
  const clean = links
    .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
    .filter((l) => l.url);
  return clean.length ? JSON.stringify(clean) : '';
}

// Device-local safety net for links, keyed by transaction id. Guarantees links
// persist across reloads even if the cloud `links` column isn't there yet; the
// cloud copy (when present) is preferred and syncs across devices.
const LINKS_KEY = 'cretmdx:txnlinks';
function readLinkMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LINKS_KEY) || '{}');
  } catch {
    return {};
  }
}
function getLocalLinks(id: number): string {
  return readLinkMap()[String(id)] || '';
}
function setLocalLinks(id: number, val: string): void {
  const m = readLinkMap();
  if (val) m[String(id)] = val;
  else delete m[String(id)];
  try {
    localStorage.setItem(LINKS_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}
function linkHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Internal corporate real estate (occupier) workflow, matching the lease-tracker
// the team uses: from intake through site search, legal terms, execution, done.
const STAGES = [
  'To Be Assigned',
  'Site Search',
  'Negotiating Legal Terms',
  'Lease Execution',
  'Completed',
];
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
const SPACE_TYPES = ['NOP', 'Office', 'Lab', 'Aviation', 'Multi-Use', 'Other'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const PROGRESS = ['Planning', 'In Progress', 'Complete'];
const COI_STATUSES = ['Not Started', 'Sent to Landlord', 'Received', 'N/A'];

const STAGE_ACCENT: Record<string, string> = {
  'To Be Assigned': 'border-t-slate-400',
  'Site Search': 'border-t-[#c45957]',
  'Negotiating Legal Terms': 'border-t-[#ff7f41]',
  'Lease Execution': 'border-t-amber-400',
  Completed: 'border-t-emerald-600',
};

const PRIORITY_BADGE: Record<string, string> = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};
const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const TX_SORTS: SortOption<Transaction>[] = [
  { key: 'stage', label: 'Stage', get: (t) => STAGES.indexOf(t.stage) },
  { key: 'name', label: 'Name', get: (t) => t.name || '' },
  { key: 'type', label: 'Type', get: (t) => t.type || '' },
  { key: 'priority', label: 'Priority', get: (t) => PRIORITY_RANK[t.priority || ''] ?? 99 },
  { key: 'progress', label: 'Status', get: (t) => t.progress || '' },
  { key: 'space_type', label: 'Space Type', get: (t) => t.space_type || '' },
  { key: 'assigned_to', label: 'Assigned To', get: (t) => t.assigned_to || '' },
  { key: 'date_needed_by', label: 'Date Needed', get: (t) => t.date_needed_by || '' },
  { key: 'estimated_value', label: 'Annual Cost', get: (t) => t.estimated_value || 0 },
];
const TX_GROUPS: GroupOption<Transaction>[] = [
  { key: 'none', label: 'None', get: () => '' },
  { key: 'stage', label: 'Stage', get: (t) => t.stage || '—', order: STAGES },
  { key: 'type', label: 'Type', get: (t) => t.type || '—', order: TYPES },
  { key: 'priority', label: 'Priority', get: (t) => t.priority || '—', order: PRIORITIES },
  { key: 'progress', label: 'Status', get: (t) => t.progress || '—', order: PROGRESS },
  { key: 'space_type', label: 'Space Type', get: (t) => t.space_type || '—', order: SPACE_TYPES },
  { key: 'assigned_to', label: 'Assigned To', get: (t) => t.assigned_to || '—' },
];

// --- CSV import: map common/tracker headers to transaction fields ---
const FIELD_SYNONYMS: Record<string, string> = {
  name: 'name', transaction: 'name', project: 'name', projecttransactionname: 'name',
  descriptionofrequirement: 'name', requirement: 'name', deal: 'name', dealname: 'name',
  type: 'type', transactiontype: 'type',
  stage: 'stage', workflowstage: 'stage', realestateworkflowstage: 'stage',
  status: 'progress', progress: 'progress',
  priority: 'priority',
  spacetype: 'space_type',
  assignedto: 'assigned_to', owner: 'assigned_to', assignee: 'assigned_to',
  dateneededby: 'date_needed_by', needby: 'date_needed_by', neededby: 'date_needed_by',
  coistatus: 'coi_status', coi: 'coi_status',
  securitydeposit: 'deposit_status', deposit: 'deposit_status', depositstatus: 'deposit_status',
  market: 'market', region: 'market', regionbusinessunit: 'market', businessunit: 'market',
  targetsf: 'target_sqft', sf: 'target_sqft', squarefeet: 'target_sqft', targetsqft: 'target_sqft',
  estimatedvalue: 'estimated_value', estvalue: 'estimated_value', annualcost: 'estimated_value',
  estannualcost: 'estimated_value', value: 'estimated_value',
  probability: 'probability', confidence: 'probability',
  broker: 'broker', externalbroker: 'broker',
  lead: 'lead', internallead: 'lead', internalleadrequestor: 'lead',
  notes: 'notes', comments: 'notes', comment: 'notes',
  startdate: 'start_date', targetclose: 'target_close_date', targetclosedate: 'target_close_date',
};
const NUM_FIELDS = ['target_sqft', 'estimated_value', 'probability'];
const DATE_FIELDS = ['date_needed_by', 'start_date', 'target_close_date'];

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function mapHeaders(headers: string[]): string[] {
  return headers.map((h) => FIELD_SYNONYMS[normHeader(h)] || '');
}
function csvNumber(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}
function csvDate(v: string): string {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(+d)) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  }
  return s;
}
function rowToTxn(row: string[], fields: string[]): Partial<Transaction> {
  const t: Record<string, unknown> = {};
  fields.forEach((f, idx) => {
    if (!f) return;
    const raw = (row[idx] ?? '').trim();
    if (raw === '') return;
    if (NUM_FIELDS.includes(f)) t[f] = csvNumber(raw);
    else if (DATE_FIELDS.includes(f)) t[f] = csvDate(raw);
    else t[f] = raw;
  });
  if (!t.stage) t.stage = 'To Be Assigned';
  if (!t.type) t.type = 'New Lease';
  return t as Partial<Transaction>;
}

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const propName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const leaseName = useMemo(() => new Map(leases.map((l) => [l.id, l.lease_name])), [leases]);
  const [editing, setEditing] = useState<Partial<Transaction> | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [sortKey, setSortKey] = useState('stage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupKey, setGroupKey] = useState('none');
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');

  async function importTransactions(rows: Partial<Transaction>[]) {
    for (const r of rows) await api.createTransaction(r);
    await load();
  }

  const filteredTxns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return txns;
    return txns.filter((t) =>
      [
        t.name, t.type, t.stage, t.market, t.space_type, t.progress, t.priority,
        t.assigned_to, t.coi_status, t.deposit_status,
        t.property_id != null ? propName.get(t.property_id) : '',
        t.lease_id != null ? leaseName.get(t.lease_id) : '',
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [txns, search, propName, leaseName]);

  const listGroups = useMemo(() => {
    const sorted = sortRows(filteredTxns, TX_SORTS.find((s) => s.key === sortKey), sortDir);
    const groupOpt = groupKey === 'none' ? undefined : TX_GROUPS.find((g) => g.key === groupKey);
    return groupRows(sorted, groupOpt);
  }, [filteredTxns, sortKey, sortDir, groupKey]);

  const load = async () => {
    const [tRaw, p, l] = await Promise.all([api.transactions(), api.properties(), api.leases()]);
    // Prefer the cloud links value; fall back to the device-local copy.
    const t = tRaw.map((x) => ({ ...x, links: x.links || getLocalLinks(x.id) }));
    setTxns(t);
    setProperties(p);
    setLeases(l);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  // Deep-link from a Property/Lease: open a specific transaction (?open=).
  const [searchParams, setSearchParams] = useSearchParams();
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    const openId = searchParams.get('open');
    if (!openId || txns.length === 0) return;
    const t = txns.find((x) => x.id === Number(openId));
    if (!t) return;
    openedRef.current = true;
    setView('list');
    setEditing(t);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [txns, searchParams, setSearchParams]);

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
    try {
      const saved = form.id
        ? await api.updateTransaction(form.id, form)
        : await api.createTransaction(form);
      const id = saved?.id ?? form.id;
      if (id != null) {
        // Always keep a device-local copy of the links so they never get lost.
        setLocalLinks(id, form.links || '');
        if (files) for (const f of files) await addTxnAttachment(id, f);
      }
      setEditing(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Could not save this transaction: ' + msg);
    }
  }
  async function remove(id: number) {
    if (!confirm('Delete this transaction?')) return;
    await api.deleteTransaction(id);
    await deleteTxnAttachmentsFor(id);
    setLocalLinks(id, '');
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-medium">
            {(['board', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1.5 capitalize transition ${
                  view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setImporting(true)}>
            ⤒ Import CSV
          </Button>
          <Button
            onClick={() =>
              setEditing({
                stage: 'To Be Assigned',
                type: 'New Lease',
                probability: 50,
                priority: 'Medium',
                progress: 'Planning',
              })
            }
          >
            + Add Transaction
          </Button>
        </div>
      </div>

      {view === 'list' && (
        <div className="flex-1 overflow-y-auto scroll-touch p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SortGroupBar
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              groupKey={groupKey}
              setGroupKey={setGroupKey}
              sortChoices={TX_SORTS}
              groupChoices={TX_GROUPS}
            />
            <div className="sm:w-64">
              <Input
                type="search"
                placeholder="Filter by name, stage, assignee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Card className="overflow-x-auto scroll-touch">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Need By</th>
                  <th className="px-4 py-3 text-right">Annual Cost</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {listGroups.map((g) => (
                  <Fragment key={g.key || 'all'}>
                    {groupKey !== 'none' && (
                      <tr className="bg-slate-50/70">
                        <td
                          colSpan={9}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {g.key} <span className="text-slate-400">· {g.rows.length}</span>
                        </td>
                      </tr>
                    )}
                    {g.rows.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            className="text-left font-medium text-slate-800 hover:text-blue-600 hover:underline"
                            onClick={() => setEditing(t)}
                          >
                            {t.name}
                          </button>
                          <div className="text-xs text-slate-400">
                            {[t.space_type, t.market].filter(Boolean).join(' · ')}
                            {parseLinks(t.links).length > 0 && ` · 🔗 ${parseLinks(t.links).length}`}
                          </div>
                          {(t.property_id || t.lease_id) && (
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                              {t.property_id && propName.get(t.property_id) && (
                                <button
                                  onClick={() => navigate(`/properties?expand=${t.property_id}`)}
                                  className="text-blue-600 hover:underline"
                                >
                                  🏢 {propName.get(t.property_id)}
                                </button>
                              )}
                              {t.lease_id && leaseName.get(t.lease_id) && (
                                <button
                                  onClick={() => navigate(`/leases?view=${t.lease_id}`)}
                                  className="text-blue-600 hover:underline"
                                >
                                  📄 {leaseName.get(t.lease_id)}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.type}</td>
                        <td className="px-4 py-3 text-slate-600">{t.stage}</td>
                        <td className="px-4 py-3">
                          {t.priority && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                PRIORITY_BADGE[t.priority] || 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t.priority}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.progress || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{t.assigned_to || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtDate(t.date_needed_by)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {t.estimated_value ? usdCompact(t.estimated_value) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                            onClick={() => setEditing(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-medium text-rose-600 hover:underline"
                            onClick={() => remove(t.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {filteredTxns.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                      {txns.length === 0 ? 'No transactions yet.' : 'No matching transactions.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {view === 'board' && (
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
                      <span>{[t.type, t.space_type].filter(Boolean).join(' · ')}</span>
                      {parseLinks(t.links).length > 0 && (
                        <span title={`${parseLinks(t.links).length} link(s)`}>
                          🔗 {parseLinks(t.links).length}
                        </span>
                      )}
                      {t.notes && <span title="Has notes">📝</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {t.priority && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_BADGE[t.priority] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.priority}
                        </span>
                      )}
                      {t.progress && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {t.progress}
                        </span>
                      )}
                      {t.estimated_value > 0 && (
                        <span className="ml-auto text-sm font-semibold text-slate-700">
                          {usdCompact(t.estimated_value)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{t.assigned_to || (t.target_sqft ? `${num(t.target_sqft)} sf` : '')}</span>
                      <span>
                        {t.date_needed_by
                          ? `Need by ${fmtDate(t.date_needed_by)}`
                          : fmtDate(t.target_close_date)}
                      </span>
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
      )}

      {editing && (
        <TxForm
          initial={editing}
          properties={properties}
          leases={leases}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && (
        <CsvImport onClose={() => setImporting(false)} onImport={importTransactions} />
      )}
    </div>
  );
}

function CsvImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (rows: Partial<Transaction>[]) => Promise<void>;
}) {
  const [parsed, setParsed] = useState<{
    txns: Partial<Transaction>[];
    headers: string[];
    fields: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function onFile(file: File) {
    setError('');
    setParsed(null);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) {
        setError('That file has a header but no data rows.');
        return;
      }
      const headers = rows[0];
      const fields = mapHeaders(headers);
      if (!fields.includes('name')) {
        setError(
          'No name column found. Include a header like "Name", "Transaction", or ' +
            '"Description of Requirement".',
        );
        return;
      }
      const txns = rows
        .slice(1)
        .map((r) => rowToTxn(r, fields))
        .filter((t) => String(t.name || '').trim() !== '');
      setParsed({ txns, headers, fields });
    } catch {
      setError('Could not read that file. Make sure it is a .csv export.');
    }
  }

  async function run() {
    if (!parsed) return;
    setBusy(`Importing ${parsed.txns.length}…`);
    try {
      await onImport(parsed.txns);
      onClose();
    } catch (e) {
      setError('Import failed: ' + (e instanceof Error ? e.message : 'unknown error'));
    } finally {
      setBusy('');
    }
  }

  const ignored = parsed ? parsed.headers.filter((_, i) => !parsed.fields[i]) : [];

  return (
    <Modal title="Import Transactions from CSV" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload a CSV (e.g. exported from your tracker). The first row must be column headers.
          Recognized columns include Name/Description, Type, Stage, Status, Priority, Space Type,
          Assigned To, Date Needed By, COI Status, Security Deposit, Market, Target SF, and Notes.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />

        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-800">
                Found {parsed.txns.length} transaction{parsed.txns.length === 1 ? '' : 's'}.
              </div>
              {ignored.length > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  Ignored columns: {ignored.join(', ')}
                </div>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Name</th>
                    <th className="px-3 py-1.5 text-left">Stage</th>
                    <th className="px-3 py-1.5 text-left">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.txns.slice(0, 50).map((t, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-700">{t.name}</td>
                      <td className="px-3 py-1.5 text-slate-500">{t.stage}</td>
                      <td className="px-3 py-1.5 text-slate-500">{t.priority || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {busy && <span className="text-sm text-slate-500">{busy}</span>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={run} disabled={!parsed || !!busy || parsed.txns.length === 0}>
            {parsed ? `Import ${parsed.txns.length}` : 'Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TxForm({
  initial,
  properties,
  leases,
  onSave,
  onClose,
}: {
  initial: Partial<Transaction>;
  properties: Property[];
  leases: Lease[];
  onSave: (t: Partial<Transaction>, files?: File[]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Transaction>>(initial);
  const set = (k: keyof Transaction, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [pending, setPending] = useState<File[]>([]);
  const [existing, setExisting] = useState<TxnAttachment[]>([]);
  const [links, setLinks] = useState<TxLink[]>(parseLinks(initial.links));
  const setLink = (i: number, patch: Partial<TxLink>) =>
    setLinks((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

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
          onSave({ ...form, links: serializeLinks(links) }, pending);
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
          <Field label="Workflow Stage">
            <Select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Space Type">
            <Select value={form.space_type || ''} onChange={(e) => set('space_type', e.target.value)}>
              <option value="">—</option>
              {SPACE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority || ''} onChange={(e) => set('priority', e.target.value)}>
              <option value="">—</option>
              {PRIORITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.progress || ''} onChange={(e) => set('progress', e.target.value)}>
              <option value="">—</option>
              {PROGRESS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date Needed By">
            <Input
              type="date"
              value={form.date_needed_by || ''}
              onChange={(e) => set('date_needed_by', e.target.value)}
            />
          </Field>
          <Field label="Assigned To">
            <Input value={form.assigned_to || ''} onChange={(e) => set('assigned_to', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="COI Status">
            <Select value={form.coi_status || ''} onChange={(e) => set('coi_status', e.target.value)}>
              <option value="">—</option>
              {COI_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Security Deposit">
            <Input
              value={form.deposit_status || ''}
              onChange={(e) => set('deposit_status', e.target.value)}
              placeholder="e.g. Deposit Sent to LL"
            />
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Linked Lease">
            <Select
              value={form.lease_id ?? ''}
              onChange={(e) => set('lease_id', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">— None —</option>
              {(form.property_id
                ? leases.filter((l) => l.property_id === form.property_id)
                : leases
              ).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lease_name}
                  {l.property_name ? ` — ${l.property_name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          {form.stage === 'Completed' && !form.lease_id && (
            <div className="flex items-end pb-2 text-xs text-amber-600">
              Tip: link the lease this completed transaction produced.
            </div>
          )}
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
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1/3 shrink-0">
                  <Input
                    value={l.name}
                    onChange={(e) => setLink(i, { name: e.target.value })}
                    placeholder="Label (e.g. LOI)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={l.url}
                    onChange={(e) => setLink(i, { url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                {l.url && (
                  <a
                    href={linkHref(l.url)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open link"
                    className="text-slate-400 hover:text-blue-600"
                  >
                    ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLinks((ls) => ls.filter((_, idx) => idx !== i))}
                  className="text-rose-400 hover:text-rose-600"
                  title="Remove link"
                >
                  ✕
                </button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => setLinks((ls) => [...ls, { name: '', url: '' }])}>
              + Add link
            </Button>
          </div>
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
