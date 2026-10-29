// Transactions PowerPoint export — a concise, paginated TABLE (one row per
// filtered transaction) rather than one detailed slide per deal. Branded to the
// TransMedics design system and fully editable. pptxgenjs is imported lazily so
// it never weighs down initial load.

import type { Transaction, FieldDef } from './types';
import { DECK, DECK_FONT, CONFIDENTIAL, deckDateLabel, deckFileStamp } from './brandDeck';
import { usd, num, fmtDate } from './format';
import { dealValue } from './deal';

const PAGE_W = 13.333;
const PAGE_H = 7.5;
const MARGIN = 0.5;
const ROWS_PER_SLIDE = 13;

interface TableColumn {
  label: string;
  w: number; // inches
  align: 'left' | 'right';
  value: (t: Transaction, propName: Map<number, string>) => string;
}

// The columns to include (chosen by the user). Edit this list to change the
// table. Widths sum to the usable width (PAGE_W - 2*MARGIN ≈ 12.33").
const COLUMNS: TableColumn[] = [
  { label: 'Transaction', w: 2.4, align: 'left', value: (t) => t.name || '' },
  { label: 'Type', w: 1.0, align: 'left', value: (t) => t.type || '' },
  { label: 'Stage', w: 1.4, align: 'left', value: (t) => t.stage || '' },
  { label: 'Status', w: 1.0, align: 'left', value: (t) => t.progress || '' },
  { label: 'Property', w: 1.7, align: 'left', value: (t, pn) => (t.property_id != null ? pn.get(t.property_id) || '' : '') },
  { label: 'Total Deal Value', w: 1.35, align: 'right', value: (t) => (dealValue(t) ? usd(dealValue(t)) : '') },
  { label: 'Est. Annual Cost', w: 1.35, align: 'right', value: (t) => (t.estimated_value ? usd(t.estimated_value) : '') },
  { label: 'Lease Expiration', w: 1.2, align: 'left', value: (t) => (t.date_needed_by ? fmtDate(t.date_needed_by) : '') },
  { label: 'Target SF', w: 0.93, align: 'right', value: (t) => (t.target_sqft ? num(t.target_sqft) : '') },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function drawSlide(
  pptx: any,
  slide: any,
  pageTxns: Transaction[],
  propName: Map<number, string>,
  dateLabel: string,
  totalCount: number,
  page: number,
  pageCount: number,
) {
  slide.background = { color: 'FFFFFF' };

  // Top crimson accent bar + wordmark.
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: PAGE_W, h: 0.1, fill: { color: DECK.crimson } });
  slide.addText('TransMedics', {
    x: PAGE_W - 3.2, y: 0.28, w: 2.5, h: 0.35, align: 'right',
    fontFace: DECK_FONT, fontSize: 14, bold: true, color: DECK.crimson,
  });

  // Title + subtitle.
  slide.addText('REAL ESTATE TRANSACTIONS', {
    x: MARGIN, y: 0.34, w: 9, h: 0.3,
    fontFace: DECK_FONT, fontSize: 10, bold: true, color: DECK.crimson, charSpacing: 2,
  });
  slide.addText('Transaction Status', {
    x: MARGIN, y: 0.62, w: 9, h: 0.5,
    fontFace: DECK_FONT, fontSize: 24, bold: true, color: DECK.charcoal,
  });
  slide.addText(`${totalCount} transaction${totalCount === 1 ? '' : 's'} · ${dateLabel}`, {
    x: MARGIN, y: 1.12, w: 9, h: 0.3,
    fontFace: DECK_FONT, fontSize: 11, color: DECK.gray,
  });

  // Build table rows: header + body.
  const header = COLUMNS.map((c) => ({
    text: c.label,
    options: { fill: { color: DECK.crimson }, color: 'FFFFFF', bold: true, align: c.align, valign: 'middle' },
  }));
  const body = pageTxns.map((t, i) =>
    COLUMNS.map((c) => ({
      text: c.value(t, propName),
      options: {
        align: c.align,
        valign: 'middle',
        color: DECK.charcoal,
        fill: { color: i % 2 === 1 ? DECK.cream : 'FFFFFF' },
      },
    })),
  );

  slide.addTable([header, ...body], {
    x: MARGIN,
    y: 1.55,
    w: PAGE_W - MARGIN * 2,
    colW: COLUMNS.map((c) => c.w),
    rowH: 0.34,
    fontFace: DECK_FONT,
    fontSize: 9,
    valign: 'middle',
    border: { type: 'solid', pt: 0.5, color: DECK.warmGray },
    margin: [2, 4, 2, 4],
  });

  // Footer: confidentiality line + date / page.
  slide.addText(CONFIDENTIAL, {
    x: MARGIN, y: PAGE_H - 0.42, w: 8, h: 0.3,
    fontFace: DECK_FONT, fontSize: 8, bold: true, color: DECK.gray, charSpacing: 2,
  });
  slide.addText(`${dateLabel} · ${page} / ${pageCount}`, {
    x: PAGE_W - MARGIN - 4, y: PAGE_H - 0.42, w: 4, h: 0.3, align: 'right',
    fontFace: DECK_FONT, fontSize: 9, color: DECK.gray,
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function exportSlidesPptx(
  txns: Transaction[],
  propName: Map<number, string>,
  _leaseName: Map<number, string>,
  _defs: FieldDef[],
): Promise<void> {
  if (txns.length === 0) return;
  const Pptx = (await import('pptxgenjs')).default;
  const pptx = new Pptx();
  pptx.defineLayout({ name: 'CRE_16x9', width: PAGE_W, height: PAGE_H });
  pptx.layout = 'CRE_16x9';
  pptx.author = 'TransMedics CRE';
  pptx.company = 'TransMedics Group, Inc.';
  pptx.title = 'Transaction Status';

  const dateLabel = deckDateLabel();
  const pages: Transaction[][] = [];
  for (let i = 0; i < txns.length; i += ROWS_PER_SLIDE) pages.push(txns.slice(i, i + ROWS_PER_SLIDE));

  pages.forEach((pageTxns, idx) => {
    drawSlide(pptx, pptx.addSlide(), pageTxns, propName, dateLabel, txns.length, idx + 1, pages.length);
  });

  await pptx.writeFile({ fileName: `transmedics-transactions-${deckFileStamp()}.pptx` });
}
