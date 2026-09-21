import type { Transaction } from './types';

// Total dollar value of a deal = lease term (years) × estimated annual cost.
// Returns 0 when a term hasn't been entered yet.
export const dealValue = (t: Pick<Transaction, 'estimated_value' | 'term_years'>): number =>
  (t.estimated_value || 0) * (t.term_years || 0);
