-- Custom public URL handle for shops: /shops/{handle} instead of /shops/{uuid}.
-- Nullable so legacy `rejected` tombstone rows (which can never surface
-- publicly) simply stay NULL and are excluded from the unique index.
alter table public.shops add column if not exists handle text;

-- Backfill every reachable (approved) shop with a deterministic, collision-proof
-- handle. A romanised base is derived from the name (Thai glyphs drop out via
-- the [^a-z0-9] strip); it is ALWAYS suffixed with a 6-char slice of the uuid so
-- two shops sharing a base ("... Hair Cut") never collide, and pure-Thai names
-- fall back to the "ran" prefix. Owners can rename to something prettier later.
update public.shops s
set handle =
  coalesce(
    nullif(
      trim(both '-' from
        left(trim(both '-' from regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g')), 20)
      ),
      ''
    ),
    'ran'
  )
  || '-' || left(replace(s.id::text, '-', ''), 6)
where s.handle is null
  and s.status = 'approved';

-- Format backstop mirroring the app-level isValidHandleFormat(): lowercase
-- alphanumerics + single hyphens, no leading/trailing hyphen, 3..30 chars.
-- (The app additionally forbids consecutive hyphens and reserved words; this
-- CHECK is the looser DB-level guard against gross violations / tampering.)
alter table public.shops
  add constraint shops_handle_format
  check (
    handle is null
    or (handle ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' and char_length(handle) between 3 and 30)
  );

-- A handle uniquely identifies a shop in the URL regardless of status, so the
-- uniqueness is global (NULLs — legacy rejected rows — are excluded).
create unique index if not exists shops_handle_unique
  on public.shops (handle)
  where handle is not null;