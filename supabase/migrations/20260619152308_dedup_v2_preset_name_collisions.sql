-- seed_category_service_presets_v1 guarded only on EXACT name, so the rows it
-- added for hair / massage-spa slipped past the pre-existing 2026-06-05 curated
-- sets (which use different names) and created near-duplicates. Keep the original
-- curated rows; drop the v1 additions for these two categories ONLY. The other 6
-- categories were empty, so their v1 rows are intentionally kept.
--
-- Names are matched exactly against what v1 inserted; none of them collide with a
-- 2026-06-05 name, so only the v1 rows are removed. Idempotent: once applied (or
-- on a DB where v1's hair/massage-spa rows never existed), this deletes nothing.
--
-- Apply via: Supabase Dashboard → SQL Editor, the Supabase MCP (apply_migration),
-- or `psql "<pooler connection string>" -f <this file>`. Idempotent.

delete from public.category_service_presets p
using public.shop_categories c
where p.category_id = c.id
  and (
    (c.slug = 'hair' and p.name in (
      'สระไดร์','ตัดผมหญิง','ทำสีผม','ไฮไลต์ / บาลายาจ','ยืด / รีบอนดิ้ง','ทรีตเมนต์ผม'
    ))
    or
    (c.slug = 'massage-spa' and p.name in (
      'นวดแผนไทย','นวดน้ำมัน / อโรมา','นวดเท้า','นวดคอ บ่า ไหล่','ขัดผิว / สครับ','ประคบสมุนไพร','สปาแพ็กเกจ'
    ))
  );
