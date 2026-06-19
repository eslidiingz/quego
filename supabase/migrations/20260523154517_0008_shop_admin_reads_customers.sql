-- Shop admin needs the customer's display_name and phone to render the
-- today board and booking detail. The default profiles SELECT policy only
-- exposes self + super_admin. Add a narrow policy that exposes any
-- profile who has a booking in a shop this user manages.

CREATE POLICY profiles_select_shop_admin_customers ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.shop_admins sa ON sa.shop_id = b.shop_id
      WHERE b.customer_id = profiles.id
        AND sa.user_id    = auth.uid()
    )
  );
