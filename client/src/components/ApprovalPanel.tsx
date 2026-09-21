import type { Transaction, Approval } from '../lib/types';
import { dealValue } from '../lib/deal';
import { doaBand, requiredRoles, approvalStatus } from '../lib/process';
import { usd } from '../lib/format';

// DOA (Delegation of Authority) approval gate. Reads the deal's total contract
// value, shows the matching approver tier from the matrix, and records each
// required sign-off (who + date). The $50–100K band adds a Finance review when
// the deal is flagged unbudgeted.
export default function ApprovalPanel({
  t,
  onChange,
}: {
  t: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
}) {
  const value = dealValue(t);
  const band = doaBand(value);
  const roles = requiredRoles(t);
  const status = approvalStatus(t);
  const today = new Date().toISOString().slice(0, 10);
  const approvalFor = (role: string): Approval | undefined => (t.approvals || []).find((a) => a.role === role);

  function setRole(role: string, patch: Partial<Approval>) {
    const list = [...(t.approvals || [])];
    const i = list.findIndex((a) => a.role === role);
    if (i >= 0) list[i] = { ...list[i], ...patch };
    else list.push({ role, ...patch });
    onChange({ approvals: list });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">DOA Approval</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
            {band.label}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            status.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {status.label}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
        <span>
          Total contract value: <strong className="tabular-nums">{value > 0 ? usd(value) : '—'}</strong>
        </span>
        <label className="flex items-center gap-1">
          Budgeted?
          <select
            value={t.budgeted == null ? '' : t.budgeted ? 'yes' : 'no'}
            onChange={(e) =>
              onChange({ budgeted: e.target.value === '' ? undefined : e.target.value === 'yes' })
            }
            className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-xs"
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      {value === 0 && (
        <p className="mb-2 text-xs text-amber-700">
          Enter a lease term so the total contract value (and required approvers) can be determined.
        </p>
      )}

      <div className="space-y-1.5">
        {roles.map((role) => {
          const a = approvalFor(role);
          const approved = !!a?.date;
          return (
            <div key={role} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-2 py-1.5">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setRole(role, { date: e.target.checked ? today : undefined })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={approved ? 'font-medium text-slate-800' : 'text-slate-600'}>{role}</span>
              </label>
              <input
                value={a?.approver || ''}
                onChange={(e) => setRole(role, { approver: e.target.value })}
                placeholder="Approver name"
                className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs"
              />
              <span className="w-20 text-right text-xs text-slate-400">{a?.date || ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
