import type { Transaction } from '../lib/types';
import {
  visibleSteps,
  processProgress,
  processAnswers,
  legalRoute,
  PROCESS_PHASES,
  type ProcessStep,
} from '../lib/process';

// Guided process checklist mirroring the transaction-process flowchart. Only the
// steps applicable to this deal appear (decision answers reveal/hide branches).
// Tasks are checked off with a date; decisions are answered via a segmented picker.
export default function ProcessChecklist({
  t,
  onChange,
}: {
  t: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
}) {
  const steps = visibleSteps(t);
  const answers = processAnswers(t);
  const progress = processProgress(t);
  const today = new Date().toISOString().slice(0, 10);

  function setStep(id: string, patch: { done?: boolean; answer?: string; date?: string }) {
    const p = { ...(t.process || {}) };
    p[id] = { ...(p[id] || {}), ...patch };
    onChange({ process: p });
  }

  const byPhase = (phase: string) => steps.filter((s) => s.phase === phase);

  const renderStep = (s: ProcessStep) => {
    const st = (t.process || {})[s.id] || {};
    if (s.kind === 'decision') {
      return (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
          <div>
            <div className="text-sm text-slate-700">{s.label}</div>
            {s.detail && <div className="text-xs text-slate-400">{s.detail}</div>}
          </div>
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {(s.options || []).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setStep(s.id, { answer: st.answer === o ? undefined : o, date: today })}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  st.answer === o ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <label key={s.id} className="flex items-start gap-2 py-1.5">
        <input
          type="checkbox"
          checked={!!st.done}
          onChange={(e) => setStep(s.id, { done: e.target.checked, date: e.target.checked ? today : undefined })}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <div className="flex-1">
          <div className={`text-sm ${st.done ? 'font-medium text-slate-800' : 'text-slate-700'}`}>
            {s.label}
            {s.id === 'legal_review' && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                → {legalRoute(t).category}: {legalRoute(t).route}
              </span>
            )}
          </div>
          {s.detail && <div className="text-xs text-slate-400">{s.detail}</div>}
        </div>
        {st.done && st.date && <span className="text-xs text-slate-400">{st.date}</span>}
      </label>
    );
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Process Checklist</span>
        <div className="h-1.5 flex-1 rounded bg-slate-100">
          <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${progress.pct}%` }} />
        </div>
        <span className="text-xs text-slate-400">
          {progress.done}/{progress.total} · {progress.pct}%
        </span>
      </div>
      <div className="space-y-3">
        {PROCESS_PHASES.map((phase) => {
          const items = byPhase(phase);
          if (items.length === 0) return null;
          return (
            <div key={phase} className="rounded-lg border border-slate-200 p-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{phase}</div>
              <div className="divide-y divide-slate-100">{items.map(renderStep)}</div>
            </div>
          );
        })}
      </div>
      {answers.stay_go === 'Relocate' && (
        <p className="mt-2 text-xs text-slate-400">Relocation selected — proceeds to a market survey.</p>
      )}
    </div>
  );
}
