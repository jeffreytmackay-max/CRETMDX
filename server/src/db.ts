import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const DB_PATH = process.env.CRETMDX_DB || join(dataDir, 'cretmdx.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT DEFAULT 'USA',
      lat REAL,
      lng REAL,
      property_type TEXT DEFAULT 'Office',
      rentable_sqft INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
      lease_name TEXT NOT NULL,
      counterparty TEXT,
      lease_type TEXT DEFAULT 'Direct',
      role TEXT DEFAULT 'Tenant',
      commencement_date TEXT,
      expiration_date TEXT,
      rentable_sqft INTEGER DEFAULT 0,
      base_rent_annual REAL DEFAULT 0,
      escalation_pct REAL DEFAULT 0,
      opex_psf REAL DEFAULT 0,
      free_rent_months INTEGER DEFAULT 0,
      ti_allowance_psf REAL DEFAULT 0,
      security_deposit REAL DEFAULT 0,
      renewal_options TEXT,
      notice_period_months INTEGER DEFAULT 6,
      status TEXT DEFAULT 'Active',
      execution_date TEXT,
      rent_start_date TEXT,
      duration_months INTEGER DEFAULT 0,
      usable_sqft INTEGER DEFAULT 0,
      loss_factor REAL DEFAULT 0,
      building_type TEXT,
      property_use TEXT,
      lead_broker TEXT,
      rent_calc_type TEXT,
      currency TEXT DEFAULT 'USD',
      parking_spaces INTEGER DEFAULT 0,
      parking_rate_monthly REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      type TEXT DEFAULT 'New Lease',
      stage TEXT DEFAULT 'Prospecting',
      market TEXT,
      target_sqft INTEGER DEFAULT 0,
      estimated_value REAL DEFAULT 0,
      probability INTEGER DEFAULT 50,
      broker TEXT,
      lead TEXT,
      start_date TEXT,
      target_close_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      discount_rate REAL DEFAULT 0.08,
      term_years INTEGER DEFAULT 10,
      inputs TEXT,
      result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
