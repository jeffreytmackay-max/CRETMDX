# CRETMDX — Corporate Real Estate Portfolio Management Tool

A full-stack tool for managing a corporate real estate portfolio, covering four
core workflows plus an interactive location map:

| Module | What it does |
| --- | --- |
| **Dashboard** | Portfolio KPIs, upcoming critical dates, portfolio mix, pipeline value. |
| **Map** | Leaflet / OpenStreetMap view of every site, color-coded by property type, with detail popups. |
| **Properties** | CRUD for buildings — location, type, rentable area, market, coordinates. |
| **Lease Administration** | CBRE-style lease abstracts grouped into General, Dates, Area, Financial, Parking, and Options sections (execution & rent-start dates, duration, usable area, loss factor, building type/use, lead broker, rent-calc type, currency, parking). Critical-date tracking, auto-generated rent schedules, and **AI PDF abstraction** — upload one or many lease PDFs and Claude extracts the terms (including the new fields), summarizes options/clauses/notes, and translates foreign-language clauses. Original PDFs are attached to each lease record. |
| **Compare Leases** | Side-by-side comparison of up to four leases, with the most favorable value highlighted per row (incl. computed rent/SF, effective rent/SF, and total base rent over term). |
| **Reports** | Rent roll, lease-expiration schedule, projected rent obligations by year, critical dates, deal pipeline, and a portfolio summary — each with **CSV export** and **Print / Save-as-PDF**. Individual leases also export a one-page printable abstract. |
| **Settings** | Store your Anthropic API key (browser-only) for the PDF abstraction feature, and reset to the sample portfolio. |
| **Transaction Management** | Drag-and-drop deal pipeline (kanban) across stages with weighted/gross value rollups. |
| **Financial Modeling** | Lease-vs-buy NPV comparison with cash-flow projections, recommendation, and year-by-year detail. |

## Branding

The UI follows the **TransMedics Brand & Collateral System** — crimson (`#9D2235`)
primary deepening to wine, warm coral/peach accents, charcoal ink on warm-neutral
surfaces, soft warm-tinted elevation, pill-rounded controls / 16px cards, the
**Mulish** typeface (Avenir Next substitute), and the interlocking-"m" monogram.
Brand tokens are centralized: the Tailwind color scales are remapped in
`client/src/index.css` (`@theme`) and chart/marker colors live in
`client/src/lib/brand.ts`, with the logo in `client/src/components/Logo.tsx`.

## Tech stack

- **Backend** — Node.js (Express) + the built-in `node:sqlite` database (zero native
  dependencies). REST API under `/api`.
- **Frontend** — Vite + React + TypeScript, Tailwind CSS v4, React Router,
  [react-leaflet](https://react-leaflet.js.org/) for the map, and
  [Recharts](https://recharts.org/) for charts.
- **Data** — A SQLite file is created and seeded with a realistic 12-property
  sample portfolio (offices, industrial, retail, warehouse) across US markets.

## Two ways to run

This project ships in two modes:

1. **Browser-only (no server)** — the app runs entirely in the browser with the
   sample portfolio built in and your edits saved to `localStorage`. This is what
   gets deployed to GitHub Pages and what the single-file build uses. No backend
   needed.
2. **Full-stack (shared database)** — the original Express + `node:sqlite` API with
   a real database. Restore it by pointing `client/src/lib/api.ts` back at `fetch`
   (the file documents this) and running the server below.

### Open it instantly (single file)

```bash
npm --prefix client install
npm --prefix client run build:single
# Open the result in any browser — no server required:
#   client/dist-single/index.html
```

A prebuilt copy is also committed at the repo root as **`CRETMDX-app.html`** — just
download and open it.

### Deploy a live link (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds the app and publishes it to
GitHub Pages on every push. GitHub Pages requires the repo to be **public** (free
plan) or on a paid plan. Once enabled, the link is:
`https://jeffreytmackay-max.github.io/CRETMDX/`

## Full-stack getting started

```bash
# 1. Install all dependencies (root, server, client)
npm run install:all

# 2. Seed the database with the sample portfolio
npm run seed

# 3. Start the API (:4000) and the web app (:5173) together
npm run dev
```

Then open **http://localhost:5173**. The Vite dev server proxies `/api` to the
backend, so no extra configuration is needed.

### Other commands

| Command | Description |
| --- | --- |
| `npm run dev:server` | Run only the API (port 4000). |
| `npm run dev:client` | Run only the web app (port 5173). |
| `npm run seed` | Reset and reseed the database. |
| `npm run build` | Production build of the client. |
| `npm run start` | Run the compiled server (after `npm --prefix server run build`). |

## Project layout

```
server/
  src/
    db.ts          # node:sqlite connection + schema
    seed.ts        # sample portfolio data
    finance.ts     # NPV, rent schedules, lease-vs-buy math
    crud.ts        # generic REST CRUD router factory
    routes…/       # registered in index.ts
    index.ts       # Express app + dashboard/financial endpoints
client/
  src/
    pages/         # Dashboard, Map, Properties, Leases, Transactions, Financial
    components/    # shared UI primitives
    lib/           # api client, types, formatters
```

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Portfolio KPIs and critical dates. |
| `GET/POST/PUT/DELETE` | `/api/properties` | Property CRUD. |
| `GET/POST/PUT/DELETE` | `/api/leases` | Lease CRUD. |
| `GET` | `/api/leases-enriched` | Leases joined with property info. |
| `GET` | `/api/leases/:id/schedule` | Generated rent schedule for a lease. |
| `GET/POST/PUT/DELETE` | `/api/transactions` | Deal pipeline CRUD. |
| `POST` | `/api/financial/compare` | Lease-vs-buy NPV comparison. |

## AI lease abstraction (PDF → structured lease)

The Lease Administration page has an **Abstract PDF** button. Upload a lease
document and Claude (`claude-opus-4-8`) reads it — including scanned pages and
non-English leases — and returns a structured abstract (rent, dates, escalations,
options, etc.) plus an English summary and a translation of the key clauses. The
extracted values pre-fill the lease form for you to review and save.

You can upload **multiple PDFs at once** — each is abstracted in turn and you
review/assign them in a batch screen before saving. The **original PDF is stored
with the lease** (in IndexedDB, so it doesn't hit the localStorage quota) and can
be reopened from the lease list or detail view via the 📄 button.

This runs entirely in the browser using **your own Anthropic API key**, entered
under **Settings**. The key is stored only in your browser's local storage and is
sent directly to the Anthropic API (`anthropic-dangerous-direct-browser-access`)
— it never passes through any other server. Get a key at
[console.anthropic.com](https://console.anthropic.com/settings/keys); usage is
billed to your account (typically a few cents per lease).

> To hide the key server-side instead, move the `abstractLeasePdf` call in
> `client/src/lib/ai.ts` behind an endpoint on the Express backend and pass the
> key via a server env var.

## Notes

- The map uses OpenStreetMap tiles, which require outbound internet access to
  `*.tile.openstreetmap.org`. In a restricted network the markers still render
  on a blank background.
- `node:sqlite` is run with `--experimental-sqlite`; the runtime prints a harmless
  experimental-feature warning.
