-- Remove loyalty points, stamp-card promotions, and referrals.
--
-- These features were removed from the application; this migration drops the
-- schema that backed them. This is an additive, dated migration — the baseline
-- (20260620000000_baseline_schema.sql) is intentionally left untouched.
--
-- Tables are dropped child -> parent so foreign-key dependencies unwind
-- cleanly. Dropping a table also removes its own PK, CHECK/FK constraints,
-- indexes, and triggers, so those need no separate statements. `IF EXISTS`
-- keeps the migration idempotent / safe to re-run.

-- Stamp ledger -> promotion definitions (FK: promotion_stamps -> shop_promotions).
DROP TABLE IF EXISTS public.promotion_stamps;
DROP TABLE IF EXISTS public.shop_promotions;

-- Loyalty ledger references referrals (FK: loyalty_ledger.referral_id -> referrals),
-- so drop the ledger first, then the referrals table.
DROP TABLE IF EXISTS public.loyalty_ledger;
DROP TABLE IF EXISTS public.referrals;

-- Referral-attribution column on customers plus its partial-unique index.
DROP INDEX IF EXISTS public.customers_referral_code_uniq;
ALTER TABLE public.customers DROP COLUMN IF EXISTS referral_code;
