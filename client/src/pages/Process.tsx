import { Card, SectionTitle } from '../components/ui';
import { STAGES, DOA_MATRIX, PROCESS_STEPS, PROCESS_PHASES } from '../lib/process';

// In-app reference for the Real Estate Transaction Process. Rendered from the
// same model that powers the Transactions board, so it never drifts from the
// live workflow, DOA matrix, and checklist.

const LEGAL_ROUTES = [
  { category: 'NOPs', route: 'Route to Peter Klein' },
  { category: 'Aviation', route: 'Route to Soar Aviation' },
  { category: 'Corporate leases', route: 'Consult General Counsel' },
];

export default function Process() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Real Estate Transaction Process</h1>
      <p className="mt-1 text-sm text-slate-500">
        The end-to-end workflow, approval matrix, and legal routing that the Transactions board follows.
      </p>

      {/* Workflow stages */}
      <Card className="mt-6 p-6">
        <SectionTitle>Workflow stages</SectionTitle>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STAGES.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{s}</span>
              {i < STAGES.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </Card>

      {/* Steps by phase */}
      <Card className="mt-6 p-6">
        <SectionTitle>Process steps</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {PROCESS_PHASES.map((phase) => (
            <div key={phase} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{phase}</div>
              <ul className="space-y-2">
                {PROCESS_STEPS.filter((s) => s.phase === phase).map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        background: s.kind === 'decision' ? '#FFE7D6' : '#EFECEA',
                        color: s.kind === 'decision' ? '#B45309' : '#57534E',
                      }}
                    >
                      {s.kind}
                    </span>
                    <span className="font-medium text-slate-700">{s.label}</span>
                    {s.detail && <span className="text-slate-400"> — {s.detail}</span>}
                    {s.options && (
                      <span className="text-slate-400"> ({s.options.join(' / ')})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Legal routing */}
      <Card className="mt-6 p-6">
        <SectionTitle>Legal review routing</SectionTitle>
        <p className="mt-1 text-sm text-slate-500">Routed by transaction / space type.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {LEGAL_ROUTES.map((r) => (
            <div key={r.category} className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">{r.category}</div>
              <div className="text-sm text-slate-500">{r.route}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* DOA matrix */}
      <Card className="mt-6 p-6">
        <SectionTitle>DOA approval — by total contract value</SectionTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Total contract value</th>
                <th className="px-3 py-2">Required approvers</th>
              </tr>
            </thead>
            <tbody>
              {DOA_MATRIX.map((b) => (
                <tr key={b.label} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{b.label}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {b.approvers}
                    {b.financeIfUnbudgeted && (
                      <span className="text-slate-400"> · plus Finance review if unbudgeted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Total contract value = lease term (years) × estimated annual cost, computed on each transaction.
        </p>
      </Card>
    </div>
  );
}
