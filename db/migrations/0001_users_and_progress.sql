-- 0001: users and progress (plan day 2).
-- Mirrors what PilotContext keeps in browser localStorage today, so signing in
-- on a new device can restore a pilot. Attempts, encounters and modules arrive
-- later (plan days 8-9) and are intentionally not here.
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_users_and_progress.sql

begin;

-- Keeps updated_at honest without every query having to remember it.
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- A pilot account. Credentials are deliberately absent: how people sign in
-- (day 3) decides whether a password hash or an auth-provider id lives here.
create table users (
  id          uuid primary key default gen_random_uuid(),
  -- Same rule the UI applies: upper-case A-Z, 0-9 and underscore, max 18.
  callsign    text not null,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint users_callsign_format check (callsign ~ '^[A-Z0-9_]{1,18}$'),
  constraint users_callsign_unique unique (callsign)
);
create unique index users_email_unique on users (lower(email)) where email is not null;
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();

-- One row per pilot: the single values PilotContext persists.
create table pilot_profiles (
  user_id         uuid primary key references users (id) on delete cascade,
  fuel_cells      integer not null default 150 check (fuel_cells >= 0),
  flight_mode     text not null default 'PRACTICE'
                  check (flight_mode in ('PRACTICE', 'RANKED', 'PROCTORED', 'CAMPUS')),
  ranked_rating   integer not null default 1000 check (ranked_rating >= 0),
  battle_wins     integer not null default 0 check (battle_wins >= 0),
  battle_losses   integer not null default 0 check (battle_losses >= 0),
  battle_best_wave integer not null default 0 check (battle_best_wave >= 0),
  streak_count    integer not null default 0 check (streak_count >= 0),
  streak_last_date date,
  -- Per-person toggles: { "sound_enabled": bool, "night_vision": bool }.
  settings        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger pilot_profiles_set_updated_at before update on pilot_profiles
  for each row execute function set_updated_at();

-- The six planets. Ids are the strings the frontend already uses as
-- pilotProgress keys (src/lib/planetarySystem.js), loaded by db/seed.
create table sectors (
  id          text primary key,
  name        text not null,
  sort_order  integer not null unique
);

-- pilotProgress: how many lessons a pilot has cleared in order on each planet.
-- Lessons unlock strictly in sequence, so one number per planet is enough.
-- The upper bound (lessons in that sector) lives in code until modules and
-- encounters get tables on day 8.
create table sector_progress (
  user_id            uuid not null references users (id) on delete cascade,
  sector_id          text not null references sectors (id),
  lessons_completed  integer not null default 0 check (lessons_completed >= 0),
  updated_at         timestamptz not null default now(),
  primary key (user_id, sector_id)
);
create trigger sector_progress_set_updated_at before update on sector_progress
  for each row execute function set_updated_at();

-- practiceCleared: lessons cleared in Practice mode beyond the real frontier.
-- Kept apart from sector_progress on purpose, so certificates, badges and
-- mastery keep meaning "reached in order".
create table practice_clears (
  user_id       uuid not null references users (id) on delete cascade,
  sector_id     text not null references sectors (id),
  lesson_index  integer not null check (lesson_index >= 0),
  cleared_at    timestamptz not null default now(),
  primary key (user_id, sector_id, lesson_index)
);

commit;
