// Dependency-free multi-sheet Excel export. Produces a SpreadsheetML 2003
// workbook (.xls) that Excel, Numbers, and Google Sheets open natively with one
// tab per sheet — no library needed. Numbers export as numbers; everything else
// as text (dates as YYYY-MM-DD strings to avoid timezone surprises).

export interface Sheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

function esc(v: unknown): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '<Cell><Data ss:Type="String"></Data></Cell>';
  if (typeof v === 'number' && Number.isFinite(v))
    return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
}

// Excel sheet names: max 31 chars and none of : \ / ? * [ ]
function sheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);
}

function worksheet(s: Sheet): string {
  const header =
    '<Row>' +
    s.headers
      .map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(h)}</Data></Cell>`)
      .join('') +
    '</Row>';
  const body = s.rows.map((r) => '<Row>' + r.map(cell).join('') + '</Row>').join('');
  return `<Worksheet ss:Name="${esc(sheetName(s.name))}"><Table>${header}${body}</Table></Worksheet>`;
}

export function buildWorkbook(sheets: Sheet[]): string {
  return (
    '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
    ' xmlns:o="urn:schemas-microsoft-com:office:office"' +
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    '<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/>' +
    '<Interior ss:Color="#EFECEA" ss:Pattern="Solid"/></Style></Styles>' +
    sheets.map(worksheet).join('') +
    '</Workbook>'
  );
}

export function downloadWorkbook(filename: string, sheets: Sheet[]): void {
  const xml = buildWorkbook(sheets);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
