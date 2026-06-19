ALTER TABLE shop_staff
  ADD COLUMN IF NOT EXISTS provides_service boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN shop_staff.provides_service IS
  'When false, this staff member does not serve customers (e.g. manager, housekeeper): excluded from booking capacity, the customer staff-picker, and booking assignment. Their shop_staff_services rows are kept empty.';