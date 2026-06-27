// TransMedics interlocking-"m" monogram + wordmark.
// Approximation of the brand mark (soft, fully-rounded stadium terminals) for
// in-app use; swap in the official SVG here if/when supplied.

export function Monogram({
  className = '',
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path
        d="M14 53 V31 A9 9 0 0 1 32 31 V53 M32 31 A9 9 0 0 1 50 31 V53"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({
  subtitle = 'Real Estate Portfolio',
  onDark = false,
}: {
  subtitle?: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Monogram className={`h-7 w-7 flex-shrink-0 ${onDark ? 'text-white' : 'text-blue-600'}`} />
      <div className="leading-none">
        <div className={`text-lg font-bold tracking-tight ${onDark ? 'text-white' : 'text-slate-900'}`}>
          TransMedics
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
