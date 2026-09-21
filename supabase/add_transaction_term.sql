-- Add a lease-term column to transactions so total deal value can be computed
-- as term_years × estimated_value (annual cost), plus a legal-representative
-- column. Safe to run repeatedly.
alter table if exists transactions
  add column if not exists term_years numeric,
  add column if not exists legal_rep text;

notify pgrst, 'reload schema';
