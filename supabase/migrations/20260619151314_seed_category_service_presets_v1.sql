-- Seed default service presets for the 8 categories that lacked them after the v2
-- taxonomy (barber already had its 8 from 20260604164519). Mirrors the remote
-- migration of the same version.
--
-- Presets are the import templates a shop copies on /shop/services (copy, not link;
-- the shop edits price/duration afterwards). Prices/durations here are market
-- ESTIMATES — clinic especially needs ops validation before relying on them.
--
-- NOTE: this guards only on EXACT name, so for hair / massage-spa (which already
-- had the 2026-06-05 curated sets under different names) it created near-duplicate
-- rows. Those are removed by the immediately-following migration
-- 20260619152308_dedup_v2_preset_name_collisions.sql. Keeping this file faithful
-- to what actually ran (rather than pre-filtering) so the repo == remote history.
--
-- duration_minutes must be a multiple of 10 (table check constraint).
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

insert into category_service_presets (category_id, name, duration_minutes, price, sort_order, is_active)
select c.id, v.name, v.duration_minutes, v.price, v.sort_order, true
from (values
  -- ทำผม
  ('hair', 'สระไดร์',                 30, 200,   1),
  ('hair', 'ตัดผมหญิง',              40, 350,   2),
  ('hair', 'ทำสีผม',                 120, 1500,  3),
  ('hair', 'ไฮไลต์ / บาลายาจ',       180, 3000,  4),
  ('hair', 'ยืด / รีบอนดิ้ง',         180, 2000,  5),
  ('hair', 'ดัดผม',                  150, 2000,  6),
  ('hair', 'ทรีตเมนต์ผม',            60, 700,   7),
  -- ทำเล็บ
  ('nails', 'ทาสีเจล (มือ)',          60, 400,   1),
  ('nails', 'ทาสีเจล (เท้า)',         60, 450,   2),
  ('nails', 'ต่อเล็บ PolyGel / อะคริลิค', 120, 1200, 3),
  ('nails', 'เพ้นท์ / ติดอะไหล่',     30, 200,   4),
  ('nails', 'สปามือ',                40, 450,   5),
  ('nails', 'สปาเท้า',               40, 500,   6),
  ('nails', 'ถอด / รื้อเล็บ',         30, 150,   7),
  -- นวด & สปา
  ('massage-spa', 'นวดแผนไทย',        60, 300,   1),
  ('massage-spa', 'นวดน้ำมัน / อโรมา', 60, 600,   2),
  ('massage-spa', 'นวดเท้า',          60, 300,   3),
  ('massage-spa', 'นวดคอ บ่า ไหล่',   30, 250,   4),
  ('massage-spa', 'ขัดผิว / สครับ',    60, 900,   5),
  ('massage-spa', 'ประคบสมุนไพร',     90, 700,   6),
  ('massage-spa', 'สปาแพ็กเกจ',       120, 1800,  7),
  -- ต่อขนตา & คิ้ว
  ('lash-brow', 'ต่อขนตาคลาสสิก',     90, 700,   1),
  ('lash-brow', 'ต่อขนตา Volume',     120, 1200,  2),
  ('lash-brow', 'รีฟิลขนตา',          60, 500,   3),
  ('lash-brow', 'ลิฟต์ขนตา (lash lift)', 60, 800,  4),
  ('lash-brow', 'แต่งทรง / แวกซ์คิ้ว', 20, 150,   5),
  ('lash-brow', 'เพ้นท์คิ้ว / ไฮยา',   60, 900,   6),
  -- แวกซ์ขน
  ('waxing', 'แวกซ์ใต้วงแขน',         20, 250,   1),
  ('waxing', 'แวกซ์แขน',             30, 450,   2),
  ('waxing', 'แวกซ์ขา (เต็มขา)',      40, 800,   3),
  ('waxing', 'แวกซ์หนวด / ใบหน้า',    20, 150,   4),
  ('waxing', 'แวกซ์บิกินี / บราซิเลียน', 40, 900, 5),
  -- ทรีตเมนต์ผิวหน้า
  ('facial', 'ทรีตเมนต์หน้าใส',       60, 800,   1),
  ('facial', 'กดสิว / คลีนผิว',       60, 800,   2),
  ('facial', 'มาส์ก / ไฮยา',          40, 600,   3),
  ('facial', 'นวดหน้า / ยกกระชับ',    60, 900,   4),
  ('facial', 'ผลัดเซลล์ผิว (peeling)', 40, 1200,  5),
  -- คลินิกความงาม
  ('clinic', 'ปรึกษาแพทย์ / ประเมินผิว', 30, 0,   1),
  ('clinic', 'ฉีดโบท็อกซ์ (ต่อโซน)',   30, 2500,  2),
  ('clinic', 'ฉีดฟิลเลอร์ (ต่อ cc)',   40, 9000,  3),
  ('clinic', 'เลเซอร์หน้าใส',         30, 1500,  4),
  ('clinic', 'เลเซอร์กำจัดขน (ต่อจุด)', 30, 1200,  5),
  ('clinic', 'HIFU ยกกระชับ',         60, 8000,  6),
  ('clinic', 'เมโสหน้าใส',            30, 2000,  7),
  -- สักคิ้ว & สักลาย
  ('pmu-tattoo', 'สักคิ้ว 3 มิติ / ไมโครเบลดดิ้ง', 120, 4000, 1),
  ('pmu-tattoo', 'สักปากชมพู',         120, 4500,  2),
  ('pmu-tattoo', 'สักอายไลเนอร์',      90, 3500,  3),
  ('pmu-tattoo', 'เติม / รีทัชคิ้ว',    60, 1200,  4),
  ('pmu-tattoo', 'สักลายเล็ก (tattoo)', 60, 1500,  5),
  ('pmu-tattoo', 'เจาะหู / ร่างกาย',    20, 400,   6)
) as v(slug, name, duration_minutes, price, sort_order)
join shop_categories c on c.slug = v.slug
where not exists (
  select 1 from category_service_presets p
  where p.category_id = c.id and p.name = v.name
);
