# Going live: v1 behind an invite (plan Week 8)

The steps from "everything merged" to "testers are playing on production", for plan Days 50 to 55. Each step names who can do it. The account-level setup it builds on is in [DEPLOYMENT.md](DEPLOYMENT.md), and what to watch once it's live is in MONITORING.md (PR #106).

**Status on 27 November 2026 (plan Day 57):** nothing below has been run on production yet, because it needs the Vercel and Neon logins. Staging fails the release check on content: 3 encounters instead of 40+ (see "Release check on staging" at the end).

## Before starting: what must be merged

The release is whatever is on `main` when it's tagged. These open pull requests are part of v1 and should go in first (all have green CI, and were checked merged together: 182 tests pass, and the build passes):

| Order | PR | What |
| --- | --- | --- |
| any | #87 | Restore check, migration safety check, health checks the database |
| 1st | #88 | Completion records and mastery. **Then** #100 (profile API) |
| 1st | #101 | Shared rate limits and daily budget. **Then** #105 (abuse checks). **Then** #117 (invite gate) |
| any | #102, #103, #104, #106 | Lists module, read cache, Day 47 bug fixes, monitoring and metrics |
| after #102 | #115 (Frontend 1) | py-049, py-050 |
| any | this PR | Release tooling |

## Day 50: production environment set up

Needs the Neon and Vercel logins, and for step 3 a server.

1. **Database.** In Neon, create a separate **production project** (not a branch of staging; see CONTRIBUTING.md's environments table). Choose the region Vercel's functions run in if possible: our staging pair is cross-region (DEPLOYMENT.md section 7). Turn on point-in-time restore for at least 7 days.
2. **Create the tables** with the production **direct** (non-pooled) connection string:
   ```bash
   cd edoc-galaxy
   DATABASE_URL="<prod direct>" npx prisma migrate deploy
   DATABASE_URL="<prod direct>" node scripts/seed.mjs
   ```
3. **Judging service.** Production needs its own server and stack (DEPLOYMENT.md section 10). Its host, monthly cost and account owner are still undecided: **this blocks go-live.** Until it exists, Run and Submit don't work on production.
4. **Vercel environment variables, Production only:**

   | Variable | Value |
   | --- | --- |
   | `APP_ENV` | `production` |
   | `DATABASE_URL` | prod **pooled** string, with `sslmode=require&connect_timeout=30` |
   | `AUTH_SECRET` | new: `openssl rand -base64 32`. Never staging's |
   | `EXECUTION_API_URL`, `NEXT_PUBLIC_EXECUTION_API_URL` | `https://<production judging service>` (both the same) |
   | `INVITE_ONLY` | `true` |
   | `METRICS_TOKEN` | new: `openssl rand -base64 24` |

5. **Check them** without ever printing them:
   ```bash
   npx vercel env pull .env.production.check --environment=production
   npx vercel env pull .env.staging.check --environment=preview
   node scripts/check-production-env.mjs .env.production.check --staging .env.staging.check
   # then delete both files; never commit them
   ```
   It must say `READY` (exit 0) or `READY WITH WARNINGS` where each warning is understood.

## Day 51: deployed to production

1. Tag the release on `main`: `git tag -a v1.0.0 -m "v1: one planet, invite-only" && git push origin v1.0.0`. Per CONTRIBUTING.md, a production release needs **two approvals**: record them on the release.
2. In Vercel, promote that commit's deployment to Production (or set the Production Branch so the tag deploys).
3. Run the release check (Day 54 below) against the production URL. Anything `FAIL` means roll back (below) and fix.

## Day 52: invite gate (PR #117)

Sign-up needs an invite on production by default. Create one invite per tester and send each their link:

```bash
DATABASE_URL="<prod direct>" SITE_URL="https://<production site>" \
  node scripts/invites.mjs create "tester 1" "tester 2" "tester 3" --days 14
DATABASE_URL="<prod direct>" node scripts/invites.mjs list           # who has signed up with which invite
DATABASE_URL="<prod direct>" node scripts/invites.mjs revoke <id>    # a leaked or unused invite
```

The codes are printed once and only their hash is stored, so copy them straight into the invites. For a class, use one code with `--uses 30`.

## Day 53: monitoring live

Every box must be ticked before testers get their invites:

- [ ] Uptime monitor on `https://<production site>/api/health` every 5 minutes, alerting on anything but 200 (DEPLOYMENT.md section 13). Named owner: ______
- [ ] Uptime monitor on `https://<judging service>/health`. Named owner: ______
- [ ] Vercel: alert on function errors. Neon: alert on storage and compute limits.
- [ ] `node scripts/metrics.mjs --url https://<production site>` works with `METRICS_TOKEN` (PR #106), and the first numbers are noted in MONITORING.md's normal ranges.
- [ ] While testers are playing, keep a watch running. It prints a line per round and the full table, with a beep, whenever something changes:
  ```bash
  node scripts/release-check.mjs --url https://<production site> --execution https://<judging service> --every 10
  ```

## Day 54: release check

**Automated.** Exit code 0 is a pass:

```bash
node scripts/release-check.mjs --url https://<production site> --execution https://<judging service>
```

| Check | Fails when | Usual fix |
| --- | --- | --- |
| health | not 200, wrong `APP_ENV`, database check failing | env vars (Day 50), DEPLOYMENT.md sections 6 and 7 |
| planets, content | no python planet, or fewer than 40 encounters indexed | run `node scripts/seed.mjs` against that database |
| encounter read, pages | any of them errors | read the Vercel function logs |
| signed-out guard | `/api/auth/me` isn't 401 without a session | `AUTH_SECRET` or a sign-in bug |
| invite gate | gate missing or off, or a made-up invite isn't refused | merge #117, `INVITE_ONLY` |
| metrics locked | `/api/admin/metrics` answers without a token | `METRICS_TOKEN` |
| art pages closed | `/art` is reachable in production (warning) | #116 |
| execution health, judges | judging service down, or the py-001 sample answer isn't ACCEPTED | DEPLOYMENT.md section 10 (`SYSTEM_ERROR` usually means step 5) |

**By hand, together** (plan: "Release check together"), on production with a fresh invite:

- [ ] Sign up with an invite link, choose explorer and suit, and reach the galaxy map
- [ ] Fly to Python, land, and open the first module
- [ ] Fail an encounter on purpose: the hull takes damage, the concept is taught, and a rematch is offered
- [ ] Use all three hint levels
- [ ] Clear the encounter, sign out, sign back in, and the progress is still there
- [ ] Profile shows the real attempts, stars and time
- [ ] The same invite link can't make a second account
- [ ] Once on a phone, and once with reduced motion turned on

## Day 55: fixes from tester feedback

Triage each report as **must-fix** (data loss, can't sign in or progress, wrong verdict, crash) or **later**. Must-fixes go through the usual branch and PR route, are merged to `main`, checked on staging, then released as `v1.0.x` with the same Day 51 steps and the release check.

## Rolling back

- **App:** in Vercel, Deployments, the last good production deployment, then **Instant Rollback**. Takes seconds and doesn't touch the database.
- **Database:** migrations are additive only (the safety check enforces this), so an app rollback never needs a database rollback. For lost or damaged data, restore a Neon branch as in DEPLOYMENT.md section 11.
- **Invites:** revoke a leaked code with `scripts/invites.mjs revoke`. Setting `INVITE_ONLY=true` and redeploying closes sign-up again if it was opened.

## Release check on staging, 27 November 2026

`node scripts/release-check.mjs --url https://edoc-drab.vercel.app --env staging --open`

```
WARN  health              448 ms  up, but this build's health check doesn't test the database yet (PR #87)
PASS  planets             926 ms  python planet, 1 module(s)
FAIL  content             928 ms  3 encounters in 1 module(s), expected 40+: re-run npm run db:seed
PASS  encounter read     1143 ms  py-001
PASS  page /              541 ms  renders
PASS  page /signin         45 ms  renders
PASS  page /signup         53 ms  renders
PASS  signed-out guard    255 ms  /api/auth/me is 401 without a session
WARN  invite gate         315 ms  not in this build (PR #117)
PASS  metrics locked       31 ms  HTTP 404 without a token
PASS  art pages closed    291 ms  /art is HTTP 404
```

The content failure is real. `main` has 40 encounters in several modules, but staging's index still holds the first 3 in one module: the seed hasn't been run since early on, so the module map and locking on staging don't match the game. Fix: `DATABASE_URL="<staging direct>" node scripts/seed.mjs` (Neon login needed). The two warnings clear once #87 and #117 are merged.
