import { useState } from 'react';
import type { Transaction } from '../lib/types';
import { emptyIntake, buildIntakeTransaction, type IntakeForm } from '../lib/intake';
import { TYPES, SPACE_TYPES, PRIORITIES, REQUESTING_GROUPS } from '../lib/txnOptions';
import { Button, Field, Input, Select, Textarea } from './ui';

// The reusable real estate request intake form. `submit` decides where the
// request lands (internal: api.createTransaction; public: anon insert). On
// success it shows a confirmation and can reset for another submission.
export default function IntakeRequestForm({
  mode,
  defaultRequestor,
  submit,
}: {
  mode: 'internal' | 'public';
  defaultRequestor?: { name?: string; email?: string };
  submit: (t: Partial<Transaction>) => Promise<void>;
}) {
  const [form, setForm] = useState<IntakeForm>(() => ({
    ...emptyIntake(),
    requestor: defaultRequestor?.name || '',
    requestor_email: defaultRequestor?.email || '',
  }));
  const set = (k: keyof IntakeForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canSubmit = form.project.trim() && form.requestor.trim() && form.justification.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      await submit(buildIntakeTransaction(form));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong submitting the request.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>
        <h2 className="text-lg font-bold text-slate-900">Request submitted</h2>
        <p className="mt-1 text-sm text-slate-600">
          {mode === 'public'
            ? 'Thank you — your request has been sent to the Real Estate team. They will follow up with you.'
            : 'Added to the Transactions board at the Intake stage, ready for the team to work.'}
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setForm({
              ...emptyIntake(),
              requestor: defaultRequestor?.name || '',
              requestor_email: defaultRequestor?.email || '',
            });
            setDone(false);
          }}
          className="mt-4"
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Project / Requirement name *">
        <Input value={form.project} onChange={(e) => set('project', e.target.value)} required placeholder="e.g. Andover lab expansion" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Requesting group">
          <Select value={form.requesting_group} onChange={(e) => set('requesting_group', e.target.value)}>
            <option value="">—</option>
            {REQUESTING_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <Field label="Request type">
          <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Space type">
          <Select value={form.space_type} onChange={(e) => set('space_type', e.target.value)}>
            <option value="">—</option>
            {SPACE_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business unit / region">
          <Input value={form.business_unit} onChange={(e) => set('business_unit', e.target.value)} placeholder="e.g. North America — OCS" />
        </Field>
        <Field label="Desired location / market">
          <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, region, or specific site" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Size needed (SF)">
          <Input type="number" value={form.target_sqft} onChange={(e) => set('target_sqft', e.target.value)} />
        </Field>
        <Field label="Desired occupancy">
          <Input type="date" value={form.occupancy_date} onChange={(e) => set('occupancy_date', e.target.value)} />
        </Field>
        <Field label="Term (yrs)">
          <Input type="number" step="0.5" value={form.term_years} onChange={(e) => set('term_years', e.target.value)} />
        </Field>
        <Field label="Est. annual budget ($)">
          <Input type="number" value={form.budget_annual} onChange={(e) => set('budget_annual', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Priority / urgency">
          <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Your name *">
          <Input value={form.requestor} onChange={(e) => set('requestor', e.target.value)} required />
        </Field>
        <Field label="Your email">
          <Input type="email" value={form.requestor_email} onChange={(e) => set('requestor_email', e.target.value)} />
        </Field>
      </div>

      <Field label="Business justification / description *">
        <Textarea
          rows={4}
          value={form.justification}
          onChange={(e) => set('justification', e.target.value)}
          placeholder="What is driving this request, headcount / program context, timing, and any constraints…"
        />
      </Field>

      <Field label="Supporting link (optional)">
        <Input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://… (shared doc, floor plan, etc.)" />
      </Field>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="flex items-center justify-end gap-3">
        {!canSubmit && <span className="text-xs text-slate-400">Name, project, and justification are required.</span>}
        <Button type="submit" disabled={!canSubmit || busy}>
          {busy ? 'Submitting…' : 'Submit request'}
        </Button>
      </div>
    </form>
  );
}
