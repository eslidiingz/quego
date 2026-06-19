insert into public.category_service_presets (category_id, name, duration_minutes, price, sort_order)
select c.id, v.name, v.duration_minutes, v.price, v.sort_order
from public.shop_categories c
cross join (values
  ('ตัดผมชาย', 30, 150, 0),
  ('ตัดผมเด็ก', 30, 120, 1),
  ('สกินเฟด (Skin Fade)', 40, 300, 2),
  ('ตัดผม + สระไดร์', 40, 250, 3),
  ('โกนหนวด / กันจอน', 20, 100, 4),
  ('แต่งทรงหนวดเครา', 30, 150, 5),
  ('ย้อมสีผมชาย', 60, 600, 6),
  ('ดัดวอลลุ่มชาย', 90, 1200, 7)
) as v(name, duration_minutes, price, sort_order)
where c.slug = 'barber'
  and not exists (
    select 1 from public.category_service_presets p
    where p.category_id = c.id
      and lower(btrim(p.name)) = lower(btrim(v.name))
  );