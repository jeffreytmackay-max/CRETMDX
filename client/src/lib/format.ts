export const usd = (n: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(n || 0);

export const usdCompact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n || 0);

export const num = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

export const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

export const fmtDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(+d)) return s;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Months until a date (negative if past).
export const monthsUntil = (s?: string): number => {
  if (!s) return Infinity;
  const d = new Date(s);
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
};

export const daysUntil = (s?: string): number => {
  if (!s) return Infinity;
  return Math.round((+new Date(s) - Date.now()) / (1000 * 60 * 60 * 24));
};
