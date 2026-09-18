// Per-transaction slide deck as an editable PowerPoint (.pptx). One 16:9 slide
// per transaction, laid out to the TransMedics design system with native shapes
// and text so the deck stays fully editable in PowerPoint / Keynote / Google
// Slides. pptxgenjs is imported lazily so it never weighs down initial load.

import type { Transaction, FieldDef } from './types';
import {
  slideModelFor,
  DECK,
  DECK_FONT,
  CONFIDENTIAL,
  deckDateLabel,
  deckFileStamp,
  type SlideModel,
  type ChipTone,
} from './brandDeck';

const CHIP_FILL: Record<ChipTone, { fill: string; color: string; line?: string }> = {
  crimson: { fill: DECK.crimson, color: 'FFFFFF' },
  coral: { fill: DECK.coral, color: 'FFFFFF' },
  slate: { fill: DECK.cream, color: DECK.slate, line: DECK.warmGray },
  success: { fill: DECK.success, color: 'FFFFFF' },
  neutral: { fill: DECK.cream, color: DECK.charcoal, line: DECK.warmGray },
};

const MARGIN = 0.7;
const PAGE_W = 13.333;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSlide(pptx: any, slide: any, m: SlideModel, dateLabel: string, page: number, total: number) {
  slide.background = { color: 'FFFFFF' };

  // Top crimson accent bar.
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: PAGE_W, h: 0.1, fill: { color: DECK.crimson } });

  // Wordmark, top-right.
  slide.addText('TransMedics', {
    x: PAGE_W - 3.2, y: 0.3, w: 2.5, h: 0.35, align: 'right',
    fontFace: DECK_FONT, fontSize: 14, bold: true, color: DECK.crimson,
  });

  // Eyebrow + title + subtitle.
  slide.addText(m.eyebrow, {
    x: MARGIN, y: 0.42, w: 9, h: 0.3,
    fontFace: DECK_FONT, fontSize: 10, bold: true, color: DECK.crimson, charSpacing: 2,
  });
  slide.addText(m.title, {
    x: MARGIN, y: 0.72, w: PAGE_W - MARGIN * 2, h: 0.75,
    fontFace: DECK_FONT, fontSize: 30, bold: true, color: DECK.charcoal,
  });
  if (m.subtitle) {
    slide.addText(m.subtitle, {
      x: MARGIN, y: 1.5, w: PAGE_W - MARGIN * 2, h: 0.35,
      fontFace: DECK_FONT, fontSize: 14, color: DECK.gray,
    });
  }

  // Chips row.
  let cx = MARGIN;
  const cy = m.subtitle ? 1.95 : 1.7;
  for (const c of m.chips) {
    const w = Math.max(1.0, 0.14 * c.text.length + 0.5);
    const s = CHIP_FILL[c.tone];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w, h: 0.36, rectRadius: 0.18,
      fill: { color: s.fill }, line: s.line ? { color: s.line, width: 1 } : { type: 'none' },
    });
    slide.addText(c.text, {
      x: cx, y: cy, w, h: 0.36, align: 'center', valign: 'middle',
      fontFace: DECK_FONT, fontSize: 10, bold: true, color: s.color,
    });
    cx += w + 0.12;
  }

  // Stat cards (four across).
  const statTop = cy + 0.62;
  const gap = 0.2;
  const statW = (PAGE_W - MARGIN * 2 - gap * 3) / 4;
  m.stats.forEach((st, i) => {
    const x = MARGIN + i * (statW + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: statTop, w: statW, h: 1.15, rectRadius: 0.14, fill: { color: DECK.cream }, line: { type: 'none' },
    });
    slide.addText(st.value, {
      x: x + 0.2, y: statTop + 0.16, w: statW - 0.4, h: 0.55,
      fontFace: DECK_FONT, fontSize: 22, bold: true, color: DECK.crimson,
    });
    slide.addText(st.label.toUpperCase(), {
      x: x + 0.2, y: statTop + 0.72, w: statW - 0.4, h: 0.3,
      fontFace: DECK_FONT, fontSize: 9, bold: true, color: DECK.gray, charSpacing: 1.5,
    });
  });

  // Lower area: Deal Detail (left, two sub-columns) + Latest Activity (right).
  // Reserve a bottom band for the Documents & Links row when the record has any.
  const hasLinks = m.links.length > 0;
  const docsY = 6.4;
  const lowerTop = statTop + 1.45;
  const lowerBottom = hasLinks ? docsY - 0.2 : 7.05;
  const lowerH = lowerBottom - (lowerTop + 0.45);
  const leftW = 7.3;
  const rightX = MARGIN + leftW + 0.4;
  const rightW = PAGE_W - MARGIN - rightX;

  slide.addText('DEAL DETAIL', {
    x: MARGIN, y: lowerTop, w: leftW, h: 0.28,
    fontFace: DECK_FONT, fontSize: 10, bold: true, color: DECK.slate, charSpacing: 2,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: MARGIN, y: lowerTop + 0.32, w: leftW, h: 0, line: { color: DECK.warmGray, width: 1 },
  });

  const shown = m.fields.slice(0, 10);
  const half = Math.ceil(shown.length / 2);
  const cols = [shown.slice(0, half), shown.slice(half)];
  cols.forEach((col, ci) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runs: any[] = [];
    col.forEach((f) => {
      runs.push({ text: f.label.toUpperCase(), options: { fontSize: 8, bold: true, color: DECK.gray, charSpacing: 1, breakLine: true } });
      runs.push({ text: f.value, options: { fontSize: 12, color: DECK.charcoal, breakLine: true } });
      runs.push({ text: ' ', options: { fontSize: 5, breakLine: true } });
    });
    if (runs.length) {
      slide.addText(runs, {
        x: MARGIN + ci * (leftW / 2), y: lowerTop + 0.45, w: leftW / 2 - 0.2, h: lowerH,
        fontFace: DECK_FONT, valign: 'top', lineSpacingMultiple: 1.0,
      });
    }
  });

  slide.addText('LATEST ACTIVITY', {
    x: rightX, y: lowerTop, w: rightW, h: 0.28,
    fontFace: DECK_FONT, fontSize: 10, bold: true, color: DECK.slate, charSpacing: 2,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: rightX, y: lowerTop + 0.32, w: rightW, h: 0, line: { color: DECK.warmGray, width: 1 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteRuns: any[] = [];
  if (m.comments.length) {
    m.comments.slice(0, 3).forEach((c) => {
      noteRuns.push({
        text: c.stamp + (c.author ? ' · ' + c.author : ''),
        options: { fontSize: 9, bold: true, color: DECK.slate, breakLine: true },
      });
      const text = c.text.length > 220 ? c.text.slice(0, 217) + '…' : c.text;
      noteRuns.push({ text, options: { fontSize: 11, color: DECK.charcoal, breakLine: true } });
      noteRuns.push({ text: ' ', options: { fontSize: 6, breakLine: true } });
    });
  } else if (m.notes) {
    const text = m.notes.length > 500 ? m.notes.slice(0, 497) + '…' : m.notes;
    noteRuns.push({ text, options: { fontSize: 11, color: DECK.charcoal } });
  } else {
    noteRuns.push({ text: 'No activity recorded.', options: { fontSize: 11, italic: true, color: DECK.gray } });
  }
  slide.addText(noteRuns, {
    x: rightX, y: lowerTop + 0.45, w: rightW, h: lowerH,
    fontFace: DECK_FONT, valign: 'top', lineSpacingMultiple: 1.05,
  });

  // Documents & Links — clickable hyperlinks along the bottom band.
  if (hasLinks) {
    slide.addText('DOCUMENTS & LINKS', {
      x: MARGIN, y: docsY, w: PAGE_W - MARGIN * 2, h: 0.26,
      fontFace: DECK_FONT, fontSize: 10, bold: true, color: DECK.slate, charSpacing: 2,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkRuns: any[] = [];
    const shownLinks = m.links.slice(0, 6);
    shownLinks.forEach((l, i) => {
      linkRuns.push({
        text: `${l.label}  ↗`,
        options: { fontSize: 11, bold: true, color: DECK.crimson, hyperlink: { url: l.href } },
      });
      if (i < shownLinks.length - 1) linkRuns.push({ text: '      ', options: { fontSize: 11 } });
    });
    slide.addText(linkRuns, {
      x: MARGIN, y: docsY + 0.28, w: PAGE_W - MARGIN * 2, h: 0.32,
      fontFace: DECK_FONT, valign: 'top',
    });
  }

  // Footer: confidentiality line + date / page.
  slide.addText(CONFIDENTIAL, {
    x: MARGIN, y: 7.05, w: 8, h: 0.3,
    fontFace: DECK_FONT, fontSize: 8, bold: true, color: DECK.gray, charSpacing: 2,
  });
  slide.addText(`${dateLabel} · ${page} / ${total}`, {
    x: PAGE_W - MARGIN - 4, y: 7.05, w: 4, h: 0.3, align: 'right',
    fontFace: DECK_FONT, fontSize: 9, color: DECK.gray,
  });
}

export async function exportSlidesPptx(
  txns: Transaction[],
  propName: Map<number, string>,
  leaseName: Map<number, string>,
  defs: FieldDef[],
): Promise<void> {
  if (txns.length === 0) return;
  const Pptx = (await import('pptxgenjs')).default;
  const pptx = new Pptx();
  pptx.defineLayout({ name: 'CRE_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'CRE_16x9';
  pptx.author = 'TransMedics CRE';
  pptx.company = 'TransMedics Group, Inc.';
  pptx.title = 'Transaction Status';

  const dateLabel = deckDateLabel();
  txns.forEach((t, i) => {
    const model = slideModelFor(t, propName, leaseName, defs);
    drawSlide(pptx, pptx.addSlide(), model, dateLabel, i + 1, txns.length);
  });

  await pptx.writeFile({ fileName: `transmedics-transactions-${deckFileStamp()}.pptx` });
}
