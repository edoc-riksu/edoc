# Monitoring edoc

How to tell whether edoc is healthy, where to look, and what normal looks like. Written for whoever is on watch. Backend 2 owns this file.

Setting up the environments and alerts is in [DEPLOYMENT.md](DEPLOYMENT.md). This file is about watching them.

## The dashboards

| What you want to know | Where to look | Who has access |
| --- | --- | --- |
| Is the site up? | The uptime monitor for `/api/health` (DEPLOYMENT.md, alerts section) | Team email or channel |
| Are requests failing or slow? | Vercel: project, then **Observability** (errors, function duration per route) and **Logs** | Vercel team members |
| Is the database healthy? | Neon: project, then **Monitoring** (connections, compute, storage) | Neon project members |
| Are players playing, and is judging working? | `GET /api/admin/metrics`, or `node scripts/metrics.mjs` (below) | Anyone with `METRICS_TOKEN` |
| Is code running in the sandbox? | Execution service logs and its `/health` (DEPLOYMENT.md, execution service section) | Whoever runs the VM |

### Useful Vercel log searches

The web app logs one JSON line per event once deployed (`src/lib/logger.js`), so you can filter in Vercel's Logs view:

| Search for | What it means | Worry when |
| --- | --- | --- |
| `"level":"error"` | An unhandled error in a route (the player saw a 500) | Any, more than a few an hour |
| `Unhandled error in POST /api/approach/submissions` | Submitting is broken for someone | Any |
| `"message":"rate limited"` | A rate limit turned a request away; `scope` says which one (`signin-account`, `submission-day`, ...) | Many `signin-account` or `signin-ip` blocks in an hour: someone is guessing passwords |
| `failed sign-in attempt` | A wrong password | A burst for one address |
| `health check: database unreachable` | `/api/health` couldn't reach the database | Any |

## Platform metrics (`/api/admin/metrics`)

The numbers no hosting dashboard has, because they live in our own tables.

**Turning it on:** set `METRICS_TOKEN` to a long random value for the environment in Vercel (Settings, then Environment Variables). Without it the endpoint answers 404. Keep the token out of chat logs and screenshots.

**Reading it:**

```bash
cd edoc-galaxy
SITE_URL=https://edoc-drab.vercel.app METRICS_TOKEN=<token> node scripts/metrics.mjs
```

```
Players (total / new 24h / new 7d)    120 / 3 / 9
Active players (24h / 7d)             14 / 37
Submissions (24h / 7d)                50 / 640
Accepted share (24h)                  60%
  ACCEPTED                            30
  WRONG_ANSWER                        18
  RUNTIME_ERROR                       2
Sandbox runtime ms (p50 / p95 / max)  42 / 212 / 1980
Metrics query took                    85 ms
```

(Example numbers.) Or call it directly with `curl -H "Authorization: Bearer <token>" <site>/api/admin/metrics`.

| Number | Normal | Worry when |
| --- | --- | --- |
| Submissions (24h) | Follows how many testers are active | Drops to 0 while players are active: judging is down. Submissions that fail with `SYSTEM_ERROR` are not saved, so an outage shows up as a drop here. Check the execution service's `/health` |
| Accepted share | Roughly 40 to 70% | Under 20% for a day: an encounter may have a broken test. Check the verdicts by encounter in the database |
| `TIME_LIMIT_EXCEEDED` | A few | Suddenly many: the sandbox is overloaded or slow |
| Sandbox runtime p95 | Under 500 ms for our encounters | Over 2,000 ms: close to the 2 s time limit, players will start failing on time |
| Metrics query took | Under 1 s warm | Several seconds: the database is struggling |

## A two-minute daily check

1. The uptime monitor shows no downtime since yesterday.
2. `node scripts/metrics.mjs`: submissions look normal for the number of active players, and the accepted share and sandbox p95 are in range.
3. Vercel Logs: no new `"level":"error"` lines, and no burst of `rate limited` with `scope` `signin-account` or `signin-ip`.
4. Neon Monitoring: compute and storage well under the plan's limits.

Anything odd goes in the team channel, with the numbers.

## Load test (plan Day 46)

Run on **2026-11-15** against staging (`edoc-drab.vercel.app`, `main` at `e3f4713`). Reads only, plus one burst of sign-ins for an address that has no account. To repeat it:

```bash
cd edoc-galaxy
node scripts/load-test.mjs --url https://edoc-drab.vercel.app --levels 10,25,50 --requests 60 --signin-burst 15
```

60 requests per route at each level; times in milliseconds (p50 = half the requests were faster, p95 = all but the slowest 5%):

| Route | 10 at once: p50 / p95 | 25 at once: p50 / p95 | 50 at once: p50 / p95 |
| --- | --- | --- | --- |
| `GET /api/health` (no database) | 303 / 608 | 273 / 436 | 339 / 923 |
| `GET /api/planets` | 524 / 2457 | 777 / 3173 | 748 / 2903 |
| `GET /api/modules?planet=python` | 909 / 2463 | 1347 / 2485 | 1135 / 4161 |
| `GET /api/modules/python-basics` | 1178 / 3370 | 1997 / 3339 | 1672 / 2174 |
| `GET /api/encounters/py-001` | 719 / 1431 | 1149 / 3372 | 1137 / 1225 |
| Throughput | 9.2 per second | 14.0 per second | 19.7 per second |

**What it shows:**

- **No failures:** 900 of 900 requests succeeded at every level, with no errors or timeouts, and throughput grew with concurrency.
- **The database is the slow part.** The health route, which doesn't touch the database, stays around 300 ms. Every route that reads the database pays the cross-region connection cost from DEPLOYMENT.md section 7, so its median is 0.5 to 2 s and its slowest 5% take 2 to 4 s. That is slow but usable for menus and maps. It's the main thing to improve before many players arrive.
- **The fix is already written:** the encounter-read cache (#103) serves these routes from memory and Vercel's CDN for a minute at a time, so most of these requests will skip the database. Moving the database to the same region as the Vercel functions would cut the rest.
- **The sign-in limit did not hold:** 15 sign-ins sent at once all got through (`401` x15, none `429`). This is the gap found on Day 26: `main` still counts limits in each server's memory. The shared limiter (#101) and the abuse checks (#43's PR) fix it.

**Re-run after #101 and #103 are deployed.** Expected:
- The sign-in burst reports "limit held": at most 8 get through and the rest get `429`.
- The database-backed routes get much faster, with the median well under 500 ms once the cache is warm.
- Add the new numbers below this section with the date.

Not tested here:
- **Submitting code under load:** it runs real code in the sandbox, and the sandbox is not deployed yet (DEPLOYMENT.md, execution service section).
- **Writes such as sign-ups,** so staging data stays clean.
- **More than 50 at once.**
