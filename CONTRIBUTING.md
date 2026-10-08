# Contributing to edoc

1. Branch off `main`: `area/short-description` (e.g. `backend/progress-tables`).
2. Push daily. Open a pull request by the end of your day, as a draft if unfinished.
3. Start the PR title with the plan day and area: `D4 backend: auto-deploy to staging`.
4. Checks must pass and one teammate must approve. Anyone can review anything; the owner of the area is the natural reviewer.
5. We squash-merge. Merging to `main` deploys to staging automatically.
6. Production releases are tagged (`v0.3.0`) and need two approvals.

## Environments
| Env | Deploys from | Database |
| --- | --- | --- |
| Dev | local or PR preview | per-person / per-PR branch |
| Staging | every merge to `main` | staging project |
| Production | tagged release | production project |

## Secrets
Never commit keys. Copy `.env.example` to `.env.local`. Staging and production values live in Vercel. If a secret leaks, rotate it the same day.

## Changing the API or database
Post the new shape in the team channel before merging. Database changes ship as migration files, never by hand.

## UI building blocks

Use `<Panel>` (`src/components/ui/Panel.js`) or the `.hud-panel` classes for any glass surface instead of writing `bg-slate-950/xx backdrop-blur` by hand. Options: `density="dense"` for text-heavy panels, `elevation="raised | flat | inset"`, a header (`title`, `icon`, `actions`), and states (`interactive`, `active`, `locked`). Headings and the five nav labels use Orbitron (`font-display`); everything else is sans-serif.
