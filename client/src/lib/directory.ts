// Small, self-populating option lists for the "people & firms" dropdown fields
// on transactions (Assigned To, Internal Lead, External Broker, Legal Rep).
// Options come from two sources, merged: values already present on existing
// records (auto-harvested) plus any names the user adds inline (persisted here).
// Kept in localStorage so the lists survive reloads without a backend table.

const key = (role: string) => `cretmdx:dir:${role}`;

export function getDirectory(role: string): string[] {
  try {
    const raw = localStorage.getItem(key(role));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function addToDirectory(role: string, name: string): string[] {
  const clean = name.trim();
  const cur = getDirectory(role);
  if (clean && !cur.includes(clean)) cur.push(clean);
  try {
    localStorage.setItem(key(role), JSON.stringify(cur));
  } catch {
    /* storage unavailable */
  }
  return cur;
}

// Merge harvested + persisted + the current value into a sorted, de-duped list.
export function mergeOptions(...lists: (string[] | (string | undefined)[])[]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const v of list) {
      const s = (v || '').trim();
      if (s) set.add(s);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
