# Contributing to edoc

1. Branch off `main`: `area/short-description` (e.g. `backend/progress-tables`).
2. Push daily. Open a pull request by the end of your day, as a draft if unfinished.
3. Start the PR title with the plan day and area: `D4 backend: auto-deploy to staging`.
4. Checks must pass. Approval is not required, but say in the PR what you changed so the others can look. Anyone can review anything; the owner of the area is the natural reviewer.
5. We squash-merge. Merging to `main` deploys to staging automatically.
6. Production releases are tagged (`v0.3.0`) and need two approvals.

## Environments
| Env | Deploys from | Database |
| --- | --- | --- |
| Dev | local or PR preview | per-person / per-PR branch |
| Staging | every merge to `main` | staging project |
| Production | tagged release | production project |

## Secrets
Never commit keys. Copy `edoc-galaxy/.env.example` to `edoc-galaxy/.env.local`. Staging and production values live in Vercel. If a secret leaks, rotate it the same day.

## Changing the API or database
Post the new shape in the team channel before merging. Database changes ship as migration files, never by hand.
