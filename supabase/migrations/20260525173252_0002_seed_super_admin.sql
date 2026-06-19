-- Seed super-admin: phone 0811129499 / password @Admin1234!
-- The hash format is "scrypt$N$r$p$saltBase64$keyBase64" and is verified
-- in src/lib/auth/password.ts.
insert into public.admins (phone, password_hash, name)
values (
  '0811129499',
  'scrypt$16384$8$1$ahnMa9rLNm6qv0P2Y3V7Iw==$s4HVkXBx5XgLJsXueQq6goMNo3UQmS4LELFPpCHdQOwP5qFf1/3OLXLivT/CKesBJXtfgViiTi70O0nOxIoGIQ==',
  'Super Admin'
)
on conflict (phone) do nothing;
