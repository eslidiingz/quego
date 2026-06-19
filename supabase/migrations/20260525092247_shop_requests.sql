-- Shop-owner self-service signup queue. A signed-up customer submits a
-- request to open a shop; super_admin approves (creates shop + bumps role)
-- or rejects (with optional reason).
--
-- Unique partial index keeps users from spamming: at most one pending request
-- per user. After a decision (approved/rejected) they can submit again.

CREATE TYPE shop_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE shop_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name        text NOT NULL,
  category_id      uuid REFERENCES categories(id) ON DELETE SET NULL,
  status           shop_request_status NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz,
  decided_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  -- Once approved, link back to the shop that was created from this request.
  shop_id          uuid REFERENCES shops(id) ON DELETE SET NULL
);

CREATE INDEX shop_requests_status_created_idx
  ON shop_requests(status, created_at DESC);

-- One pending request per user — keeps the admin queue clean.
CREATE UNIQUE INDEX shop_requests_user_pending_uniq
  ON shop_requests(user_id) WHERE status = 'pending';

ALTER TABLE shop_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit their own request.
CREATE POLICY shop_requests_insert_self ON shop_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users see their own; super_admin sees all (for the queue).
CREATE POLICY shop_requests_select_self_or_super ON shop_requests FOR SELECT
  USING (user_id = auth.uid() OR internal.auth_user_role() = 'super_admin');

-- Only super_admin can approve/reject (UPDATE) or scrap (DELETE).
CREATE POLICY shop_requests_update_super ON shop_requests FOR UPDATE
  USING (internal.auth_user_role() = 'super_admin');

CREATE POLICY shop_requests_delete_super ON shop_requests FOR DELETE
  USING (internal.auth_user_role() = 'super_admin');