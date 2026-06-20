-- Consolidated baseline schema for Quego (single-file migration)
-- Generated from verified pg_dump of prod on 2026-06-20 (replaces 60 incremental migrations)
-- btree_gist is required by the bookings EXCLUDE-overlap constraints and is NOT shipped by default on fresh Supabase projects.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'confirmed',
    'cancelled',
    'completed'
);


--
-- Name: rate_limit_hit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rate_limit_hit(p_bucket text, p_limit integer, p_window_seconds integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (bucket, count, reset_at)
  values (p_bucket, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set count = case when r.reset_at < now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;


--
-- Name: tg_bookings_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_bookings_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end
$$;


--
-- Name: tg_customers_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_customers_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end
$$;


--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    summary text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE admin_audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_audit_logs IS 'Admin action audit trail (OPP-18): who(admin_id) did what(action) to which entity(entity_type/entity_id) when(created_at); meta jsonb for extras. RLS deny-all; service-role only. Written fail-silent from admin server actions via writeAuditLog().';


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    booking_date date NOT NULL,
    slot_time time without time zone NOT NULL,
    service_duration_minutes integer NOT NULL,
    status public.booking_status DEFAULT 'confirmed'::public.booking_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_id uuid,
    service_id uuid,
    service_name text,
    service_price numeric(10,2),
    time_range tsrange GENERATED ALWAYS AS (tsrange((booking_date + slot_time), ((booking_date + slot_time) + make_interval(mins => service_duration_minutes)))) STORED,
    cancelled_by text,
    coming_ack_at timestamp with time zone,
    CONSTRAINT bookings_cancelled_by_check CHECK (((cancelled_by IS NULL) OR (cancelled_by = ANY (ARRAY['customer'::text, 'shop'::text])))),
    CONSTRAINT bookings_customer_name_check CHECK (((length(btrim(customer_name)) >= 1) AND (length(btrim(customer_name)) <= 100))),
    CONSTRAINT bookings_customer_phone_check CHECK (((customer_phone IS NULL) OR (customer_phone ~ '^[0-9]{9,10}$'::text))),
    CONSTRAINT bookings_service_duration_minutes_check CHECK ((((service_duration_minutes >= 10) AND (service_duration_minutes <= 480)) AND ((service_duration_minutes % 10) = 0))),
    CONSTRAINT bookings_service_price_check CHECK (((service_price IS NULL) OR (service_price >= (0)::numeric))),
    CONSTRAINT bookings_slot_time_check CHECK (((((EXTRACT(minute FROM slot_time))::integer % 10) = 0) AND ((EXTRACT(second FROM slot_time))::integer = 0)))
);


--
-- Name: COLUMN bookings.service_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.service_id IS 'Bookable service chosen (NULL for legacy/implicit single-service shops). SET NULL on delete keeps history.';


--
-- Name: COLUMN bookings.service_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.service_name IS 'Snapshot of the service name at booking time (survives rename/delete).';


--
-- Name: COLUMN bookings.service_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.service_price IS 'Snapshot of the service price at booking time (NULL = unpriced).';


--
-- Name: COLUMN bookings.cancelled_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.cancelled_by IS 'Who cancelled the booking: ''customer'' (self-service cancel) or ''shop'' (shop-initiated). NULL when not cancelled or source unknown (legacy / ex-no_show rows). Drives the cancel-source badge and which party receives the LINE cancellation push.';


--
-- Name: category_service_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_service_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT category_service_presets_description_check CHECK (((description IS NULL) OR (length(description) <= 500))),
    CONSTRAINT category_service_presets_duration_minutes_check CHECK (((duration_minutes >= 10) AND (duration_minutes <= 480) AND ((duration_minutes % 10) = 0))),
    CONSTRAINT category_service_presets_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
    CONSTRAINT category_service_presets_price_check CHECK (((price IS NULL) OR (price >= (0)::numeric)))
);


--
-- Name: TABLE category_service_presets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.category_service_presets IS 'Admin-curated service presets per shop category (e.g. barber -> ตัดผมชาย 30m). Shops import these into their own shop_services catalogue. Mirrors shop_services field rules; duration is a 10-min multiple in [10,480].';


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    pin_hash text,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    failed_pin_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    line_user_id text,
    referral_code text,
    phone_verified_at timestamp with time zone,
    CONSTRAINT customers_name_check CHECK (((name IS NULL) OR ((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 100)))),
    CONSTRAINT customers_phone_check CHECK ((phone ~ '^[0-9]{9,10}$'::text))
);


--
-- Name: COLUMN customers.line_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.line_user_id IS 'LINE Messaging API userId bound via the in-app deep-link flow. Nullable; partial-unique on non-null values. Phone remains the identity key; this is an optional notification channel handle.';


--
-- Name: COLUMN customers.referral_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.referral_code IS 'OPP-15 stable per-customer referral code (generated lazily on first /me/credit view/share). Nullable; partial-unique on non-null. Attributes a new customer (referee) to this referrer at PIN setup.';


--
-- Name: COLUMN customers.phone_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.phone_verified_at IS 'When the customer proved phone ownership via Firebase OTP at signup (first PIN setup). Null = legacy/unverified.';


--
-- Name: line_link_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_link_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    customer_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE line_link_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.line_link_codes IS 'Short-lived single-use codes binding a logged-in customer to a LINE userId via the OA chat. 10-min TTL; consumed_at marks redemption. RLS deny-all; service-role access only.';


--
-- Name: line_message_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_message_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient text NOT NULL,
    direction text NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    line_message_id text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT line_message_log_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text]))),
    CONSTRAINT line_message_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'dropped'::text, 'over_quota'::text, 'failed'::text, 'received'::text])))
);


--
-- Name: TABLE line_message_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.line_message_log IS 'Audit/metering of LINE sends (incl. dropped/over_quota) and inbound webhook deliveries — keeps fail-silent pushes observable. RLS deny-all; service-role access only. line_message_id is the dedupe key for redelivered webhooks.';


--
-- Name: loyalty_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_phone text NOT NULL,
    kind text NOT NULL,
    amount integer NOT NULL,
    booking_id uuid,
    referral_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loyalty_ledger_customer_phone_check CHECK ((customer_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT loyalty_ledger_kind_check CHECK ((kind = ANY (ARRAY['earn'::text, 'referral'::text, 'adjust'::text])))
);


--
-- Name: TABLE loyalty_ledger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.loyalty_ledger IS 'OPP-15 informational loyalty points (no payment rail). Append-only; balance = SUM(amount) per customer_phone. kind: earn (completed booking, idempotent via unique(booking_id,kind)) | referral (released reward, idempotent via unique(referral_id)) | adjust. RLS deny-all; service-role only.';


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    bucket text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    reset_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_phone text NOT NULL,
    referee_phone text NOT NULL,
    referral_code text NOT NULL,
    status text DEFAULT 'held'::text NOT NULL,
    hold_until timestamp with time zone NOT NULL,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referrals_no_self CHECK ((referrer_phone <> referee_phone)),
    CONSTRAINT referrals_referee_phone_check CHECK ((referee_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT referrals_referrer_phone_check CHECK ((referrer_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['held'::text, 'released'::text, 'void'::text])))
);


--
-- Name: TABLE referrals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referrals IS 'OPP-15 referral attribution: one row per referred new customer (referee_phone unique). status held -> released after a 3-day anti-abuse hold once the referee has a completed booking. RLS deny-all; service-role only.';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    customer_phone text NOT NULL,
    customer_name text,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_comment_check CHECK (((comment IS NULL) OR ((length(btrim(comment)) >= 1) AND (char_length(comment) <= 1000)))),
    CONSTRAINT reviews_customer_phone_check CHECK ((customer_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'Customer star reviews (1-5 integer + optional comment) for completed bookings. One review per booking (unique booking_id). RLS deny-all; access via service-role only. customer_phone is the identity key (mirrors bookings); customer_name is a display snapshot, masked at render for PDPA.';


--
-- Name: shop_business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    is_open boolean DEFAULT false NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT open_before_close CHECK (((is_open = false) OR (open_time < close_time))),
    CONSTRAINT open_requires_times CHECK ((((is_open = false) AND (open_time IS NULL) AND (close_time IS NULL)) OR ((is_open = true) AND (open_time IS NOT NULL) AND (close_time IS NOT NULL)))),
    CONSTRAINT shop_business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: shop_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


--
-- Name: shop_customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_customer_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    customer_phone text NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_customer_notes_customer_phone_check CHECK ((customer_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT shop_customer_notes_note_check CHECK (((length(btrim(note)) >= 1) AND (char_length(note) <= 2000)))
);


--
-- Name: TABLE shop_customer_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shop_customer_notes IS 'OPP-14 CRM-lite: a shop''s private internal note about a customer, keyed by (shop_id, customer_phone). One editable row per pair. Phone is the cross-booking identity key (mirrors bookings/reviews). RLS deny-all; service-role access only. Notes are private to the owning shop.';


--
-- Name: COLUMN shop_customer_notes.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shop_customer_notes.note IS 'Free-text internal note (1..2000 chars), e.g. allergy / "ลูกค้าประจำ ชอบฟอง". Never shown to the customer.';


--
-- Name: shop_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_services_description_check CHECK (((description IS NULL) OR (length(description) <= 500))),
    CONSTRAINT shop_services_duration_minutes_check CHECK (((duration_minutes >= 10) AND (duration_minutes <= 480) AND ((duration_minutes % 10) = 0))),
    CONSTRAINT shop_services_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
    CONSTRAINT shop_services_price_check CHECK (((price IS NULL) OR (price >= (0)::numeric)))
);


--
-- Name: TABLE shop_services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shop_services IS 'Bookable services offered by a shop (e.g. haircut, coloring). Duration drives slot generation; price is optional.';


--
-- Name: shop_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    role text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provides_service boolean DEFAULT true NOT NULL
);


--
-- Name: COLUMN shop_staff.provides_service; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shop_staff.provides_service IS 'When false, this staff member does not serve customers (e.g. manager, housekeeper): excluded from booking capacity, the customer staff-picker, and booking assignment. Their shop_staff_services rows are kept empty.';


--
-- Name: shop_staff_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_staff_services (
    staff_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    description text,
    address text,
    contact_phone text,
    owner_name text NOT NULL,
    owner_phone text NOT NULL,
    owner_email text,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pin_hash text,
    service_duration_minutes integer DEFAULT 30 NOT NULL,
    province text,
    district text,
    subdistrict text,
    failed_pin_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    line_user_id text,
    reschedule_cancel_cutoff_hours integer DEFAULT 0 NOT NULL,
    line_group_id text,
    phone_verified_at timestamp with time zone,
    handle text,
    logo_key text,
    cover_key text,
    CONSTRAINT shops_cover_key_fmt CHECK (((cover_key IS NULL) OR ((char_length(cover_key) <= 256) AND (cover_key ~~ 'shops/%'::text)))),
    CONSTRAINT shops_cutoff_hours_range CHECK (((reschedule_cancel_cutoff_hours >= 0) AND (reschedule_cancel_cutoff_hours <= 168))),
    CONSTRAINT shops_handle_format CHECK (((handle IS NULL) OR ((handle ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'::text) AND ((char_length(handle) >= 3) AND (char_length(handle) <= 30))))),
    CONSTRAINT shops_logo_key_fmt CHECK (((logo_key IS NULL) OR ((char_length(logo_key) <= 256) AND (logo_key ~~ 'shops/%'::text)))),
    CONSTRAINT shops_service_duration_minutes_check CHECK (((service_duration_minutes >= 5) AND (service_duration_minutes <= 480))),
    CONSTRAINT shops_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])))
);


--
-- Name: COLUMN shops.pin_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.pin_hash IS 'scrypt-hashed PIN (NULL until the shop owner sets it on first login).';


--
-- Name: COLUMN shops.service_duration_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.service_duration_minutes IS 'Typical duration of a single service appointment, in minutes.';


--
-- Name: COLUMN shops.province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.province IS 'Thai province (จังหวัด), canonical name from src/lib/location/thailand.ts. Nullable for legacy rows; required by the shop form. Filtered by exact-equality on the discovery page.';


--
-- Name: COLUMN shops.district; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.district IS 'Thai district/เขต/อำเภอ (canonical name belonging to province). Nullable for legacy rows; required by the shop form.';


--
-- Name: COLUMN shops.subdistrict; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.subdistrict IS 'Thai sub-district/แขวง/ตำบล (canonical name belonging to district). Nullable for legacy rows; required by the shop form.';


--
-- Name: COLUMN shops.line_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.line_user_id IS 'LINE Messaging API userId bound via the shop LINE Login (OAuth) connect flow. Nullable; partial-unique on non-null values. Used to push booking notifications to the shop owner.';


--
-- Name: COLUMN shops.phone_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.phone_verified_at IS 'When the shop owner proved phone ownership via Firebase OTP at registration. Null = legacy/unverified.';


--
-- Name: COLUMN shops.logo_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.logo_key IS 'R2 object key for the shop avatar/logo (1:1, ~512px PNG). NULL = no logo; app renders category-icon fallback. Public URL derived from NEXT_PUBLIC_R2_PUBLIC_BASE_URL. Written only by the service layer.';


--
-- Name: COLUMN shops.cover_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shops.cover_key IS 'R2 object key for the shop cover/banner (~8:3, ~1600x600 JPEG). NULL = no cover; app renders bg-luxury-gradient fallback. Written only by the service layer.';


--
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    service_id uuid NOT NULL,
    service_name text NOT NULL,
    preferred_staff_id uuid,
    requested_date date NOT NULL,
    customer_phone text NOT NULL,
    customer_name text NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    notified_at timestamp with time zone,
    fulfilled_booking_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT waitlist_entries_customer_name_check CHECK (((length(btrim(customer_name)) >= 1) AND (length(btrim(customer_name)) <= 100))),
    CONSTRAINT waitlist_entries_customer_phone_check CHECK ((customer_phone ~ '^[0-9]{9,10}$'::text)),
    CONSTRAINT waitlist_entries_service_name_check CHECK (((length(btrim(service_name)) >= 1) AND (length(btrim(service_name)) <= 120))),
    CONSTRAINT waitlist_entries_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'notified'::text, 'fulfilled'::text, 'cancelled'::text])))
);


--
-- Name: TABLE waitlist_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.waitlist_entries IS 'OPP-05 waitlist: a customer asks to be notified when a slot opens for a fully-booked (shop_id, service_id, requested_date). Optional preferred_staff_id (NULL = any staff). status: waiting -> notified (LINE push sent, head-start to book) -> fulfilled (they booked) | cancelled (left the list). Phone is the identity key. RLS deny-all; service-role only.';


--
-- Name: COLUMN waitlist_entries.service_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.waitlist_entries.service_name IS 'Snapshot of the service name at join time (survives rename/delete), used in the LINE push.';


--
-- Name: COLUMN waitlist_entries.preferred_staff_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.waitlist_entries.preferred_staff_id IS 'Optional preferred staff (NULL = any staff). Availability re-check honours this preference.';


--
-- Name: COLUMN waitlist_entries.notified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.waitlist_entries.notified_at IS 'When the LINE "a slot opened" push was last sent. Gates roll-on re-notification (claim window).';


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: admins admins_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_phone_key UNIQUE (phone);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_no_overlap_noassign; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_no_overlap_noassign EXCLUDE USING gist (shop_id WITH =, time_range WITH &&) WHERE (((status = ANY (ARRAY['confirmed'::public.booking_status, 'completed'::public.booking_status])) AND (staff_id IS NULL)));


--
-- Name: bookings bookings_no_overlap_staff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_no_overlap_staff EXCLUDE USING gist (shop_id WITH =, staff_id WITH =, time_range WITH &&) WHERE (((status = ANY (ARRAY['confirmed'::public.booking_status, 'completed'::public.booking_status])) AND (staff_id IS NOT NULL)));


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: category_service_presets category_service_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_service_presets
    ADD CONSTRAINT category_service_presets_pkey PRIMARY KEY (id);


--
-- Name: customers customers_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: line_link_codes line_link_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_link_codes
    ADD CONSTRAINT line_link_codes_code_key UNIQUE (code);


--
-- Name: line_link_codes line_link_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_link_codes
    ADD CONSTRAINT line_link_codes_pkey PRIMARY KEY (id);


--
-- Name: line_message_log line_message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_message_log
    ADD CONSTRAINT line_message_log_pkey PRIMARY KEY (id);


--
-- Name: loyalty_ledger loyalty_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_ledger
    ADD CONSTRAINT loyalty_ledger_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (bucket);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: shop_business_hours shop_business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_business_hours
    ADD CONSTRAINT shop_business_hours_pkey PRIMARY KEY (id);


--
-- Name: shop_business_hours shop_business_hours_shop_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_business_hours
    ADD CONSTRAINT shop_business_hours_shop_id_day_of_week_key UNIQUE (shop_id, day_of_week);


--
-- Name: shop_categories shop_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_name_key UNIQUE (name);


--
-- Name: shop_categories shop_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_pkey PRIMARY KEY (id);


--
-- Name: shop_categories shop_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_slug_key UNIQUE (slug);


--
-- Name: shop_customer_notes shop_customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customer_notes
    ADD CONSTRAINT shop_customer_notes_pkey PRIMARY KEY (id);


--
-- Name: shop_customer_notes shop_customer_notes_shop_id_customer_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customer_notes
    ADD CONSTRAINT shop_customer_notes_shop_id_customer_phone_key UNIQUE (shop_id, customer_phone);


--
-- Name: shop_services shop_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_services
    ADD CONSTRAINT shop_services_pkey PRIMARY KEY (id);


--
-- Name: shop_staff shop_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_staff
    ADD CONSTRAINT shop_staff_pkey PRIMARY KEY (id);


--
-- Name: shop_staff_services shop_staff_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_staff_services
    ADD CONSTRAINT shop_staff_services_pkey PRIMARY KEY (staff_id, service_id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_logs_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_audit_logs_admin_id_idx ON public.admin_audit_logs USING btree (admin_id);


--
-- Name: admin_audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: admin_audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_audit_logs_entity_idx ON public.admin_audit_logs USING btree (entity_type, entity_id);


--
-- Name: bookings_customer_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_customer_phone_idx ON public.bookings USING btree (customer_phone);


--
-- Name: bookings_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_service_idx ON public.bookings USING btree (service_id);


--
-- Name: bookings_shop_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_shop_date_idx ON public.bookings USING btree (shop_id, booking_date);


--
-- Name: category_service_presets_category_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX category_service_presets_category_sort_idx ON public.category_service_presets USING btree (category_id, sort_order, name);


--
-- Name: category_service_presets_unique_name_per_category; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX category_service_presets_unique_name_per_category ON public.category_service_presets USING btree (category_id, lower(btrim(name)));


--
-- Name: customers_line_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_line_user_id_unique ON public.customers USING btree (line_user_id) WHERE (line_user_id IS NOT NULL);


--
-- Name: customers_referral_code_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_referral_code_uniq ON public.customers USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_staff_services_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_services_service ON public.shop_staff_services USING btree (service_id);


--
-- Name: line_link_codes_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_link_codes_customer_id_idx ON public.line_link_codes USING btree (customer_id);


--
-- Name: line_message_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_message_log_created_at_idx ON public.line_message_log USING btree (created_at);


--
-- Name: line_message_log_line_message_id_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX line_message_log_line_message_id_uq ON public.line_message_log USING btree (line_message_id) WHERE (line_message_id IS NOT NULL);


--
-- Name: line_message_log_recipient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_message_log_recipient_idx ON public.line_message_log USING btree (recipient);


--
-- Name: loyalty_ledger_booking_kind_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX loyalty_ledger_booking_kind_uniq ON public.loyalty_ledger USING btree (booking_id, kind) WHERE (booking_id IS NOT NULL);


--
-- Name: loyalty_ledger_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loyalty_ledger_phone_idx ON public.loyalty_ledger USING btree (customer_phone, created_at DESC);


--
-- Name: loyalty_ledger_referral_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX loyalty_ledger_referral_uniq ON public.loyalty_ledger USING btree (referral_id) WHERE (referral_id IS NOT NULL);


--
-- Name: referrals_referee_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referrals_referee_uniq ON public.referrals USING btree (referee_phone);


--
-- Name: referrals_referrer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referrals_referrer_idx ON public.referrals USING btree (referrer_phone);


--
-- Name: referrals_release_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referrals_release_idx ON public.referrals USING btree (status, hold_until);


--
-- Name: reviews_customer_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_customer_phone_idx ON public.reviews USING btree (customer_phone);


--
-- Name: reviews_shop_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_shop_id_idx ON public.reviews USING btree (shop_id);


--
-- Name: shop_business_hours_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_business_hours_shop_idx ON public.shop_business_hours USING btree (shop_id);


--
-- Name: shop_categories_sort_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_categories_sort_order_idx ON public.shop_categories USING btree (sort_order, name);


--
-- Name: shop_customer_notes_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_customer_notes_shop_idx ON public.shop_customer_notes USING btree (shop_id, customer_phone);


--
-- Name: shop_services_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_services_shop_idx ON public.shop_services USING btree (shop_id, sort_order, created_at);


--
-- Name: shop_staff_shop_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_staff_shop_id_idx ON public.shop_staff USING btree (shop_id);


--
-- Name: shops_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_category_idx ON public.shops USING btree (category_id);


--
-- Name: shops_contact_phone_live_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_contact_phone_live_unique ON public.shops USING btree (contact_phone) WHERE ((status <> 'rejected'::text) AND (contact_phone IS NOT NULL));


--
-- Name: shops_handle_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_handle_unique ON public.shops USING btree (handle) WHERE (handle IS NOT NULL);


--
-- Name: shops_line_group_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_line_group_id_key ON public.shops USING btree (line_group_id) WHERE (line_group_id IS NOT NULL);


--
-- Name: shops_line_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_line_user_id_unique ON public.shops USING btree (line_user_id) WHERE (line_user_id IS NOT NULL);


--
-- Name: shops_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_location_idx ON public.shops USING btree (province, district, subdistrict);


--
-- Name: shops_owner_email_live_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_owner_email_live_unique ON public.shops USING btree (lower(owner_email)) WHERE ((status <> 'rejected'::text) AND (owner_email IS NOT NULL));


--
-- Name: shops_owner_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_owner_phone_idx ON public.shops USING btree (owner_phone);


--
-- Name: shops_owner_phone_live_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_owner_phone_live_unique ON public.shops USING btree (owner_phone) WHERE (status <> 'rejected'::text);


--
-- Name: shops_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_status_idx ON public.shops USING btree (status);


--
-- Name: waitlist_entries_active_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX waitlist_entries_active_uniq ON public.waitlist_entries USING btree (shop_id, service_id, requested_date, customer_phone) WHERE (status = ANY (ARRAY['waiting'::text, 'notified'::text]));


--
-- Name: waitlist_entries_offer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_entries_offer_idx ON public.waitlist_entries USING btree (shop_id, requested_date, status, created_at);


--
-- Name: waitlist_entries_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_entries_phone_idx ON public.waitlist_entries USING btree (customer_phone, requested_date DESC);


--
-- Name: admins admins_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admins_set_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: bookings bookings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.tg_bookings_set_updated_at();


--
-- Name: customers customers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_customers_set_updated_at();


--
-- Name: shop_business_hours shop_business_hours_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shop_business_hours_set_updated_at BEFORE UPDATE ON public.shop_business_hours FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: shop_categories shop_categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shop_categories_set_updated_at BEFORE UPDATE ON public.shop_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: shops shops_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shops_set_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: waitlist_entries waitlist_entries_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER waitlist_entries_set_updated_at BEFORE UPDATE ON public.waitlist_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


--
-- Name: admin_audit_logs admin_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id);


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.shop_services(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.shop_staff(id) ON DELETE SET NULL;


--
-- Name: category_service_presets category_service_presets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_service_presets
    ADD CONSTRAINT category_service_presets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_categories(id) ON DELETE CASCADE;


--
-- Name: category_service_presets category_service_presets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_service_presets
    ADD CONSTRAINT category_service_presets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id);


--
-- Name: category_service_presets category_service_presets_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_service_presets
    ADD CONSTRAINT category_service_presets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admins(id);


--
-- Name: line_link_codes line_link_codes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_link_codes
    ADD CONSTRAINT line_link_codes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: loyalty_ledger loyalty_ledger_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_ledger
    ADD CONSTRAINT loyalty_ledger_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: loyalty_ledger loyalty_ledger_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_ledger
    ADD CONSTRAINT loyalty_ledger_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_business_hours shop_business_hours_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_business_hours
    ADD CONSTRAINT shop_business_hours_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_categories shop_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: shop_categories shop_categories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_categories
    ADD CONSTRAINT shop_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: shop_customer_notes shop_customer_notes_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customer_notes
    ADD CONSTRAINT shop_customer_notes_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_services shop_services_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_services
    ADD CONSTRAINT shop_services_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_staff_services shop_staff_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_staff_services
    ADD CONSTRAINT shop_staff_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.shop_services(id) ON DELETE CASCADE;


--
-- Name: shop_staff_services shop_staff_services_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_staff_services
    ADD CONSTRAINT shop_staff_services_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.shop_staff(id) ON DELETE CASCADE;


--
-- Name: shop_staff shop_staff_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_staff
    ADD CONSTRAINT shop_staff_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shops shops_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_categories(id) ON DELETE RESTRICT;


--
-- Name: shops shops_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: waitlist_entries waitlist_entries_fulfilled_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_fulfilled_booking_id_fkey FOREIGN KEY (fulfilled_booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: waitlist_entries waitlist_entries_preferred_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_preferred_staff_id_fkey FOREIGN KEY (preferred_staff_id) REFERENCES public.shop_staff(id) ON DELETE SET NULL;


--
-- Name: waitlist_entries waitlist_entries_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.shop_services(id) ON DELETE CASCADE;


--
-- Name: waitlist_entries waitlist_entries_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: category_service_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_service_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: line_link_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.line_link_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: line_message_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.line_message_log ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_business_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_business_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_customer_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_customer_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_services ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_staff_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_staff_services ENABLE ROW LEVEL SECURITY;

--
-- Name: shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

--
-- Name: waitlist_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


