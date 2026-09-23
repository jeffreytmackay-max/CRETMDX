// Shared transaction vocabulary, used by the Transactions board and the intake
// request form so the option lists never drift apart.
export const TYPES = [
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
export const SPACE_TYPES = ['NOP', 'Office', 'Lab', 'Aviation', 'Multi-Use', 'Other'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

// The three entry lanes from the transaction-process flowchart.
export const REQUESTING_GROUPS = ['Aviation', 'Commercial', 'Corporate'];
