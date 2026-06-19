-- Category taxonomy v2 — settle on 9 seeded categories (PO + marketing consult,
-- owner ruled 2026-06-19). Mirrors the remote migration of the same version.
--
-- Decisions baked in here:
--   * Single PRIMARY category per shop stays (shops.category_id FK). Multi-category
--     is deferred to a future join table — NOT done here.
--   * Do NOT split นวด/สปา — one category; fine-grained intent lives at the service
--     level (discovery already matches on service name).
--   * "ทรีตเมนต์ผิวหน้า & คลินิก" is split into facial vs clinic (different intent,
--     price band, trust bar). Clinic is opened now per owner.
--   * slug = English, name = Thai (kept from day 1 to enable future /category SEO).
--
-- The 3 pre-existing rows (barber / massage / hair-salon) are RENAMED IN PLACE so
-- every shops.category_id keeps pointing at a valid row (no orphaned shops). The
-- other 6 categories are inserted, guarded by slug so this is safe to re-run.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

begin;

-- Rename/realign existing 3 rows in place (preserves shops.category_id; no orphans)
update shop_categories set name='นวด & สปา',  slug='massage-spa', icon='spa',         sort_order=4, updated_at=now() where slug='massage';
update shop_categories set name='ทำผม',        slug='hair',         icon='health_and_beauty', sort_order=1, updated_at=now() where slug='hair-salon';
update shop_categories set name='บาร์เบอร์',   slug='barber',       icon='content_cut', sort_order=2, updated_at=now() where slug='barber';

-- Insert the 6 new categories (idempotent: skip if slug already present)
insert into shop_categories (name, slug, icon, sort_order, is_active)
select v.name, v.slug, v.icon, v.sort_order, true
from (values
  ('ทำเล็บ',              'nails',      'back_hand',                3),
  ('ต่อขนตา & คิ้ว',     'lash-brow',  'visibility',               5),
  ('แวกซ์ขน',            'waxing',     'dry',                      6),
  ('ทรีตเมนต์ผิวหน้า',   'facial',     'face_retouching_natural',  7),
  ('คลินิกความงาม',      'clinic',     'medical_services',         8),
  ('สักคิ้ว & สักลาย',   'pmu-tattoo', 'gesture',                  9)
) as v(name, slug, icon, sort_order)
where not exists (select 1 from shop_categories c where c.slug = v.slug);

commit;
