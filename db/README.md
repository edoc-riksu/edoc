# Database design (plan day 2)

Postgres, one database per environment (dev, staging, production). Plain SQL migrations, applied in filename order. Nothing here talks to a database yet; accounts and the API arrive on day 3 and later.

## What each browser value becomes

| Today (localStorage key) | Table and column |
| --- | --- |
| `HUD_PILOT_CALLSIGN` | `users.callsign` |
| `HUD_PILOT_PROGRESS` (`pilotProgress`) | `sector_progress.lessons_completed`, one row per user and planet |
| `HUD_PRACTICE_CLEARED` | `practice_clears`, one row per cleared lesson |
| `HUD_FUEL_CELLS` | `pilot_profiles.fuel_cells` |
| `HUD_PILOT_MODE` | `pilot_profiles.flight_mode` |
| `HUD_RANKED_RATING` | `pilot_profiles.ranked_rating` |
| `HUD_BATTLE_RECORD` | `pilot_profiles.battle_wins`, `battle_losses`, `battle_best_wave` |
| `HUD_STREAK_COUNT`, `HUD_STREAK_LAST_DATE` | `pilot_profiles.streak_count`, `streak_last_date` |
| `HUD_SOUND_ENABLED`, `HUD_NIGHT_VISION` | `pilot_profiles.settings` (JSON) |

## Decisions

- **Progress is one number per planet.** Lessons unlock strictly in order, so `lessons_completed` is the whole state. The upper limit per planet stays in code until modules and encounters get tables (day 8).
- **Practice clears are separate** so certificates, badges and mastery keep meaning "reached in order". Practice is never locked.
- **No credentials in `users` yet.** Day 3 decides between a password hash and an auth provider's user id.
- **Scores are not trusted from the browser.** The server will write progress after scoring a submission (plan day 26); these tables only store the result.

## Not in this migration (on purpose)

- Attempts and scoring history: day 9.
- Encounters, modules and concept mastery: days 8 and 23.
- Salvage artifacts and Workshop projects (`HUD_SALVAGE_ARTIFACTS`, `HUD_WORKSHOP_PROJECTS`): they belong with the Shipyard and Workshop work, later than v1 day 2.
- Comm-Link posts and follows (`HUD_COMM_FEED`, `HUD_COMM_FOLLOWING`): the feed is seeded locally; no shared data is planned for the first two months.

## Apply it

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_users_and_progress.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed/001_sectors.sql
```

Never edit a migration after it has run on staging. Add `0002_...sql` instead. Dev databases can be wiped and rebuilt; staging and production cannot.

## Open questions

- Neon or Supabase? Supabase's built-in auth would replace most of day 3.
- Do we want a migration runner (a small script that records which files ran) before day 8, or keep applying files by hand until then?
