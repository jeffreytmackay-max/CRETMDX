import { legalRoute } from '../lib/process';

// Shows where legal review routes for this deal (by type/space type) and offers
// to drop that routing into the Legal Representative field.
export default function LegalRouteHint({
  t,
  onUse,
}: {
  t: { type?: string; space_type?: string };
  onUse?: (name: string) => void;
}) {
  const r = legalRoute(t);
  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
      <span>
        Legal review routes to <strong className="text-slate-700">{r.category}</strong> → {r.route}
      </span>
      {onUse && (
        <button
          type="button"
          onClick={() => onUse(r.route)}
          className="font-medium text-blue-600 hover:underline"
        >
          Use
        </button>
      )}
    </div>
  );
}
