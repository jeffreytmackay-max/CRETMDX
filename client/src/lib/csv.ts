// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes (""),
// and commas/newlines inside quotes. Returns an array of rows (arrays of cells).
export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      endField();
      i++;
    } else if (c === '\r') {
      i++;
    } else if (c === '\n') {
      endField();
      endRow();
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field.length > 0 || row.length > 0) {
    endField();
    endRow();
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
