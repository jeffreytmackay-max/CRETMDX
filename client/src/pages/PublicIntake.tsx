import { Brand } from '../components/Logo';
import IntakeRequestForm from '../components/IntakeRequestForm';
import { submitIntakePublic } from '../lib/intake';

// Standalone public request page, shown at #/submit outside the login gate.
// Anyone with the link can submit; the request is created directly at the
// Intake stage via the Supabase anon role.
export default function PublicIntake() {
  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <Brand />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-slate-900">Real Estate Request</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit a new real estate need to the TransMedics Real Estate team. Fields marked * are required.
        </p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <IntakeRequestForm mode="public" submit={submitIntakePublic} />
        </div>
        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          TransMedics Proprietary &amp; Confidential Information
        </p>
      </main>
    </div>
  );
}
