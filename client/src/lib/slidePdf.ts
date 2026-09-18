// Per-transaction slide deck as a print-optimized HTML document — one 16:9 slide
// per transaction, styled to the TransMedics design system. Opens in a new tab
// and invokes the browser's print dialog, where the user chooses "Save as PDF".
// Dependency-free, so it renders the brand exactly (Mulish, crimson, eyebrow
// labels, stat cards, flowing-line motif, confidentiality footer).

import type { Property, Lease, Transaction, FieldDef } from './types';
import {
  slideModelFor,
  DECK,
  DECK_FONT_STACK,
  CONFIDENTIAL,
  deckDateLabel,
  type SlideModel,
  type ChipTone,
} from './brandDeck';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CHIP_CSS: Record<ChipTone, string> = {
  crimson: `background:#${DECK.crimson};color:#fff;`,
  coral: `background:#${DECK.coral};color:#fff;`,
  slate: `background:#${DECK.cream};color:#${DECK.slate};border:1px solid #${DECK.warmGray};`,
  success: `background:#${DECK.success};color:#fff;`,
  neutral: `background:#${DECK.cream};color:#${DECK.charcoal};border:1px solid #${DECK.warmGray};`,
};

// Low-contrast flowing-line motif + ghosted hexagon watermark, bleeding off the
// bottom-right corner (the only permitted "texture" in the system).
const MOTIF = `
<svg class="motif" viewBox="0 0 600 400" aria-hidden="true">
  <g fill="none" stroke="#${DECK.crimson}" stroke-width="2" opacity="0.06">
    <path d="M-20 320 C 160 220, 300 420, 640 260"/>
    <path d="M-20 360 C 180 280, 320 460, 640 300"/>
    <path d="M-20 280 C 140 200, 280 380, 640 220"/>
  </g>
  <path d="M470 250 l70 40 l0 80 l-70 40 l-70 -40 l0 -80 z"
        fill="none" stroke="#${DECK.crimson}" stroke-width="2" opacity="0.08"/>
</svg>`;

function chip(text: string, tone: ChipTone): string {
  return `<span class="chip" style="${CHIP_CSS[tone]}">${esc(text)}</span>`;
}

function slideHtml(m: SlideModel, dateLabel: string, page: number, total: number): string {
  const chips = m.chips.map((c) => chip(c.text, c.tone)).join('');
  const stats = m.stats
    .map(
      (s) => `
      <div class="stat">
        <div class="stat-value">${esc(s.value)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`,
    )
    .join('');
  const fields = m.fields
    .map(
      (f) => `
      <div class="field">
        <div class="field-label">${esc(f.label)}</div>
        <div class="field-value">${esc(f.value)}</div>
      </div>`,
    )
    .join('');

  const docs = m.links.length
    ? `<div class="docs">
        <div class="docs-label">Documents &amp; Links</div>
        <div class="docs-list">
          ${m.links
            .map(
              (l) =>
                `<a class="doclink" href="${esc(l.href)}" target="_blank" rel="noreferrer">${esc(l.label)} <span class="ext">&#8599;</span></a>`,
            )
            .join('')}
        </div>
      </div>`
    : '';

  const activity =
    m.comments.length > 0
      ? m.comments
          .map(
            (c) => `
        <div class="note">
          <div class="note-meta">${esc(c.stamp)}${c.author ? ' · ' + esc(c.author) : ''}</div>
          <div class="note-text">${esc(c.text)}</div>
        </div>`,
          )
          .join('')
      : m.notes
        ? `<div class="note"><div class="note-text">${esc(m.notes)}</div></div>`
        : `<div class="note-empty">No activity recorded.</div>`;

  return `
  <section class="slide">
    ${MOTIF}
    <div class="wordmark">TransMedics</div>
    <div class="content">
      <div class="eyebrow">${esc(m.eyebrow)}</div>
      <h1 class="title">${esc(m.title)}</h1>
      ${m.subtitle ? `<div class="subtitle">${esc(m.subtitle)}</div>` : ''}
      <div class="chips">${chips}</div>

      <div class="stats">${stats}</div>

      <div class="lower">
        <div class="fields-col">
          <div class="col-label">Deal Detail</div>
          <div class="fields">${fields}</div>
        </div>
        <div class="notes-col">
          <div class="col-label">Latest Activity</div>
          <div class="notes">${activity}</div>
        </div>
      </div>
      ${docs}
    </div>
    <div class="footer">
      <span class="confidential">${CONFIDENTIAL}</span>
      <span class="pageinfo">${esc(dateLabel)} · ${page} / ${total}</span>
    </div>
  </section>`;
}

export function buildDeckHtml(
  txns: Transaction[],
  propName: Map<number, string>,
  leaseName: Map<number, string>,
  defs: FieldDef[],
): string {
  const dateLabel = deckDateLabel();
  const total = txns.length;
  const slides = txns
    .map((t, i) => slideHtml(slideModelFor(t, propName, leaseName, defs), dateLabel, i + 1, total))
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>TransMedics — Transaction Status</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,300;0,400;0,600;0,700;0,800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #${DECK.warmGray}; }
  body { font-family: ${DECK_FONT_STACK}; color: #${DECK.charcoal}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .slide {
    position: relative; width: 1280px; height: 720px; margin: 24px auto; padding: 64px 84px 56px;
    background: #${DECK.paper}; overflow: hidden; box-shadow: 0 10px 40px rgba(48,47,50,0.18);
    border-top: 8px solid #${DECK.crimson};
  }
  .motif { position: absolute; right: -40px; bottom: -30px; width: 620px; height: 420px; pointer-events: none; }
  .wordmark {
    position: absolute; top: 40px; right: 84px; font-weight: 800; font-size: 20px;
    letter-spacing: -0.01em; color: #${DECK.crimson};
  }
  .content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; }
  .eyebrow { font-weight: 800; font-size: 13px; letter-spacing: 0.14em; color: #${DECK.crimson}; text-transform: uppercase; }
  .title { font-weight: 700; font-size: 46px; line-height: 1.05; letter-spacing: -0.02em; color: #${DECK.charcoal}; margin-top: 10px; }
  .subtitle { font-weight: 300; font-size: 19px; color: #${DECK.gray}; margin-top: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .chip { font-weight: 700; font-size: 12px; letter-spacing: 0.02em; padding: 6px 14px; border-radius: 999px; }

  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 24px; }
  .stat { background: #${DECK.cream}; border-radius: 16px; padding: 18px 20px; }
  .stat-value { font-weight: 700; font-size: 30px; letter-spacing: -0.02em; color: #${DECK.crimson}; line-height: 1.1; }
  .stat-label { font-weight: 800; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #${DECK.gray}; margin-top: 6px; }

  .lower { display: grid; grid-template-columns: 1.15fr 1fr; gap: 32px; margin-top: 26px; flex: 1; min-height: 0; }
  .col-label { font-weight: 800; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #${DECK.slate}; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #${DECK.warmGray}; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; align-content: start; }
  .field-label { font-weight: 800; font-size: 10px; letter-spacing: 0.10em; text-transform: uppercase; color: #${DECK.gray}; }
  .field-value { font-weight: 400; font-size: 15px; color: #${DECK.charcoal}; margin-top: 2px; }
  .notes { display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
  .note { background: #${DECK.cream}; border-left: 3px solid #${DECK.rose}; border-radius: 8px; padding: 10px 14px; }
  .note-meta { font-weight: 700; font-size: 11px; color: #${DECK.slate}; }
  .note-text { font-size: 14px; line-height: 1.5; color: #${DECK.charcoal}; margin-top: 3px; white-space: pre-wrap; }
  .note-empty { font-size: 14px; color: #${DECK.gray}; font-style: italic; }

  .docs { margin-top: 18px; }
  .docs-label { font-weight: 800; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #${DECK.slate}; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #${DECK.warmGray}; }
  .docs-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .doclink { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #${DECK.crimson}; text-decoration: none; background: #${DECK.cream}; border: 1px solid #${DECK.warmGray}; padding: 7px 14px; border-radius: 999px; }
  .doclink .ext { color: #${DECK.rose}; font-weight: 700; }

  .footer { position: absolute; left: 84px; right: 84px; bottom: 26px; display: flex; justify-content: space-between; align-items: center; z-index: 2; }
  .confidential { font-weight: 800; font-size: 10px; letter-spacing: 0.14em; color: #${DECK.gray}; }
  .pageinfo { font-size: 11px; color: #${DECK.gray}; }

  @page { size: 1280px 720px; margin: 0; }
  @media print {
    html, body { background: #fff; }
    .slide { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
    .slide:last-child { page-break-after: auto; break-after: auto; }
    .toolbar { display: none !important; }
  }
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 12px; align-items: center; justify-content: center;
    background: #${DECK.charcoal}; color: #fff; padding: 12px; font-size: 14px; }
  .toolbar button { font-family: inherit; font-weight: 700; font-size: 13px; padding: 8px 18px; border: 0; border-radius: 999px; background: #${DECK.crimson}; color: #fff; cursor: pointer; }
</style>
</head>
<body>
  <div class="toolbar">
    <span>${total} transaction slide${total === 1 ? '' : 's'} — use “Save as PDF” in the print dialog.</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${slides}
</body>
</html>`;
}

// Open the deck in a new tab and trigger the print dialog once fonts have loaded.
export function exportSlidesPdf(
  txns: Transaction[],
  propName: Map<number, string>,
  leaseName: Map<number, string>,
  defs: FieldDef[],
): boolean {
  if (txns.length === 0) return true;
  const html = buildDeckHtml(txns, propName, leaseName, defs);
  const win = window.open('', '_blank');
  if (!win) return false; // popup blocked
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Give webfonts/layout a beat before invoking print.
  const go = () => setTimeout(() => win.focus(), 400);
  if (win.document.readyState === 'complete') go();
  else win.addEventListener('load', go);
  return true;
}
