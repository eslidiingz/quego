-- Security audit 2026-10-23, finding L9 (docs/security/audit-2026-10-23.md).
--
-- line_link_codes backed the old typed link-code flow. LINE linking now goes
-- through LINE Login OAuth (/api/{shop,customer}/line/connect), and no code,
-- view, function or foreign key references the table any more. It held 2
-- stale rows.
--
-- The rest of L9 is settled: the 9 missing FK indexes landed in
-- 20261024000000_harden_db_functions_cron_fk_indexes.sql. The advisor's
-- "unused index" list is kept on purpose — on a database this small Postgres
-- prefers sequential scans, so idx_scan = 0 says nothing about real load.

drop table if exists public.line_link_codes;
