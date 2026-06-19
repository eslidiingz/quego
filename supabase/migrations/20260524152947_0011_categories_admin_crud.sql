-- Super admin CRUD on categories.
--
-- Migration 0010 left the table SELECT-only with one SECURITY DEFINER RPC
-- (upsert_category_by_name) handling shop-admin dedupe-on-typing. The admin
-- console needs direct CRUD: list every category (incl. zero-shop ones),
-- rename, and delete. Open up INSERT / UPDATE / DELETE policies gated on
-- internal.auth_user_role() = 'super_admin' so the upsert RPC keeps its
-- dedupe role and super admin gets straight table writes.

CREATE POLICY "categories_insert_super_admin" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (internal.auth_user_role() = 'super_admin');

CREATE POLICY "categories_update_super_admin" ON public.categories
  FOR UPDATE
  TO authenticated
  USING (internal.auth_user_role() = 'super_admin')
  WITH CHECK (internal.auth_user_role() = 'super_admin');

CREATE POLICY "categories_delete_super_admin" ON public.categories
  FOR DELETE
  TO authenticated
  USING (internal.auth_user_role() = 'super_admin');