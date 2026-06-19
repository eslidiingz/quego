-- SEC-RLS (CRITICAL): the app reads every table through the service-role
-- client (which bypasses RLS), so these anon/authenticated SELECT policies are
-- unnecessary. The shops policy in particular exposed pin_hash + owner PII to
-- the publishable key. Dropping all three restores clean deny-all on these
-- tables, matching the documented security model. Explicitly authorized by the
-- user.
DROP POLICY IF EXISTS "approved shops readable by anyone" ON public.shops;
DROP POLICY IF EXISTS "active categories readable by anon" ON public.shop_categories;
DROP POLICY IF EXISTS "hours readable for approved shops" ON public.shop_business_hours;