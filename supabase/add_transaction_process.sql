-- Columns backing the Real Estate Transaction Process features: DOA approval
-- sign-offs, the budgeted flag that drives the $50–100K finance-review rule,
-- and the guided process-checklist state. Safe to run repeatedly.
alter table if exists transactions
  add column if not exists budgeted  boolean,
  add column if not exists approvals jsonb,
  add column if not exists process   jsonb;

notify pgrst, 'reload schema';
