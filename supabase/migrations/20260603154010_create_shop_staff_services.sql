
CREATE TABLE IF NOT EXISTS shop_staff_services (
  staff_id   uuid NOT NULL REFERENCES shop_staff(id)    ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES shop_services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_service
  ON shop_staff_services(service_id);
