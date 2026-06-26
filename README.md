# CRETMDX — Corporate Real Estate Portfolio Management Tool

A full-stack tool for managing a corporate real estate portfolio, covering four
core workflows plus an interactive location map:

| Module | What it does |
| --- | --- |
| **Dashboard** | Portfolio KPIs, upcoming critical dates, portfolio mix, pipeline value. |
| **Map** | Leaflet / OpenStreetMap view of every site, color-coded by property type, with detail popups. |
| **Properties** | CRUD for buildings — location, type, rentable area, market, coordinates. |
| **Lease Administration** | Lease abstracts, critical-date tracking (expiration + notice dates), and auto-generated rent schedules with escalations, free rent, OpEx and TI. |
| **Transaction Management** | Drag-and-drop deal pipeline (kanban) across stages with weighted/gross value rollups. |
| **Financial Modeling** | Lease-vs-buy NPV comparison with cash-flow projections, recommendation, and year-by-year detail. |

## Tech stack

- **Backend** — Node.js (Express) + the built-in `node:sqlite` database (zero native
  dependencies). REST API under `/api`.
- **Frontend** — Vite + React + TypeScript, Tailwind CSS v4, React Router,
  [react-leaflet](https://react-leaflet.js.org/) for the map, and
  [Recharts](https://recharts.org/) for charts.
- **Data** — A SQLite file is created and seeded with a realistic 12-property
  sample portfolio (offices, industrial, retail, warehouse) across US markets.

## Getting started

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

## Notes

- The map uses OpenStreetMap tiles, which require outbound internet access to
  `*.tile.openstreetmap.org`. In a restricted network the markers still render
  on a blank background.
- `node:sqlite` is run with `--experimental-sqlite`; the runtime prints a harmless
  experimental-feature warning.
