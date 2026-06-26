import { Router } from 'express';
import { db } from './db.js';

// Generic CRUD router factory for a table with an integer `id` primary key.
export function crudRouter(table: string, columns: string[]) {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const cols = columns.filter((c) => req.body[c] !== undefined);
    if (cols.length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => normalize(req.body[c]));
    const info = db
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
      .run(...values);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/:id', (req, res) => {
    const cols = columns.filter((c) => req.body[c] !== undefined);
    if (cols.length === 0) return res.status(400).json({ error: 'No valid fields provided' });
    const assignments = cols.map((c) => `${c} = ?`).join(', ');
    const values = cols.map((c) => normalize(req.body[c]));
    db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(
      ...values,
      Number(req.params.id),
    );
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.delete('/:id', (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(Number(req.params.id));
    res.status(204).end();
  });

  return router;
}

// node:sqlite only accepts null | number | bigint | string | Uint8Array.
function normalize(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v as string | number;
}
