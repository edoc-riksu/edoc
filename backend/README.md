# edoc backend — Backend 1 (execution, judging, scoring)

Day 1 vertical slice: a player's Python code is executed through a
self-hosted Piston instance, judged against an encounter's test cases, and
scored server-side. The backend is the sole source of truth for verdicts —
the frontend never computes a score.

## Architecture

```
Frontend
   |
FastAPI (app/api)
   |
JudgeService / ExecutionService (app/services)
   |
TestHarness (app/judge)  --uses-->  Comparator (app/judge/comparator.py)
   |
PistonClient (app/execution/piston_client.py)
   |
Piston (self-hosted, Docker)
   |
Isolated Python execution
```

- **PistonClient** is the only thing that knows Piston's wire format. It
  normalizes every response into our own `ExecutionResult` — nothing else in
  the app touches Piston's JSON shape.
- **TestHarness** runs a submission against a list of test cases and judges
  each one with the comparator. It knows nothing about scoring or HTTP.
- **scoring_service** turns a list of per-test outcomes into points and one
  overall `Verdict`, using a fixed priority order (`SYSTEM_ERROR` >
  `COMPILATION_ERROR` > `TIME_LIMIT_EXCEEDED` > `RUNTIME_ERROR` >
  `WRONG_ANSWER` > `ACCEPTED`).
- **JudgeService** (SUBMIT) and **ExecutionService** (RUN) are the two
  entry points. RUN only ever touches sample tests and returns an
  informational, unscored result; SUBMIT runs sample + hidden tests and
  returns the authoritative verdict.
- **EncounterService** loads encounters from versioned JSON files under
  `encounters/`. No database yet — this is the seam where Backend 2's
  persistence layer plugs in later without any API change.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/v1/encounters/{id}` | Public encounter view (prompt, starter code, sample tests only — never hidden tests, hints, or the failure explanation) |
| POST | `/api/v1/executions/run` | RUN — code against sample tests only, unscored |
| POST | `/api/v1/submissions` | SUBMIT — code against sample + hidden tests, scored, authoritative |

Full schemas are in `/docs` (Swagger UI) once the server is running.

## Encounter format

See `encounters/python/py-001/v1.json` for a full example. Each encounter
is a versioned JSON file at `encounters/{language}/{id}/v{n}.json`, validated
against the `Encounter` Pydantic model in `app/schemas/encounter.py`. Hidden
test inputs/outputs, hints, and the failure explanation are stripped before
anything is returned to a client — enforced by `EncounterPublic`, a
separate model the API is typed to return instead of `Encounter`.

## Verdicts

`ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`,
`COMPILATION_ERROR`, `SYSTEM_ERROR`. Python has no separate compile stage in
Piston, so `COMPILATION_ERROR` is unused for now but kept for when another
language is added.

**Documented assumption:** Piston doesn't return an explicit "timed out"
flag. We treat "no exit code + a kill signal present" as a timeout
(`app/execution/piston_client.py::_normalize`). This is indistinguishable
from an OOM kill in the raw response — worth revisiting once we see real
signal behaviour from our own instance under load.

## Security

This service executes untrusted player code. Rules enforced in this
codebase:
- No `exec()`/`eval()` anywhere in the application process.
- Player code only ever runs inside Piston's sandbox, never in the FastAPI
  process itself.
- `run_timeout` is always passed to Piston per the encounter's configured
  limit.
- Hidden test inputs/outputs and the failure explanation are never
  serialized into any API response (see `EncounterPublic`,
  `SubmissionResult`, `RunResponse`).

**Not claimed:** this is not a statement that the system is
production-secure. Piston's own sandbox (isolate/cgroups, run as configured
in its Docker image) is the actual isolation boundary, and that has not
been audited here. Network egress from the Piston container, resource
limits under concurrent load, and abuse/rate-limiting are explicitly out of
scope for Day 1 (rate limiting is Backend 2's "costs and rate limits"
responsibility).

## Logging

Structured-ish logging via the standard `logging` module
(`app/core/logging.py`). Submission/execution logs include encounter ID,
submission ID, verdict, and runtime — never the player's source code or
hidden expected outputs.

## Running it

### With Docker (full stack, including Piston)

```bash
docker compose up --build
```

Piston ships with no language packages installed. After the `piston`
container is up, install Python once:

```bash
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language":"python","version":"3.10.0"}'
```

The backend is then at `http://localhost:8000`, docs at
`http://localhost:8000/docs`.

PostgreSQL and Redis are defined in `docker-compose.yml` for Backend 2 and
future use, but **nothing in `app/` talks to them yet** — see "Deferred"
below.

### Without Docker (API only, no code execution)

```bash
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

`/health`, `/docs`, and `GET /api/v1/encounters/{id}` all work without
Piston. `POST /api/v1/executions/run` and `POST /api/v1/submissions` will
return `503` / a `SYSTEM_ERROR` verdict respectively if Piston isn't
reachable at `PISTON_BASE_URL` (default `http://localhost:2000`) — this is
a real, tested code path, not a guess.

### Tests

```bash
pytest tests/unit          # no Piston required
pytest -m integration       # requires a running, package-installed Piston (see above)
```

## Verified end-to-end (2026-10-06)

Full stack brought up with `docker compose up --build`, Python 3.10.0
installed into Piston, and confirmed live:

- `GET /health` → `{"status":"ok"}`
- `GET /api/v1/encounters/py-001` → hidden tests/hints/failure_explanation
  correctly absent
- `POST /api/v1/executions/run` with a correct solution → both sample
  tests pass, real stdout/stderr returned from the sandboxed run
- `POST /api/v1/submissions`: correct solution → `ACCEPTED`, 100/100;
  `print(a-b)` instead of `print(a+b)` → `WRONG_ANSWER`, 20/100;
  `raise ValueError(1)` → `RUNTIME_ERROR`, 0/100
- `pytest tests/unit` (21 tests) and `pytest -m integration` (4 tests,
  against the live containers above) — **25/25 passing**

Earlier in this project, Docker wasn't available and the public Piston
demo API had gone whitelist-only, so this path was implemented and unit
tested against mocked responses built from Piston's real documented API
shape, but not run live. It has since been verified for real, as above.

## Deferred to Day 2+

- No database wiring in `app/` (SQLAlchemy models, connections). Postgres
  and Redis are defined in `docker-compose.yml` but unused by the app.
  Submission records are computed and returned but not persisted —
  Backend 2 owns the submission/attempt/progress tables (week 2–3 per the
  team plan).
- Hints endpoint (`GET /encounters/{id}/hints/{tier}`) — hints exist in the
  encounter schema but there's no API for them yet; not required for the
  Day 1 scope given.
- Rate limiting / cost controls on execution (explicitly Backend 2's
  "costs and rate limits" responsibility).
- Function-call-style test cases (only stdin/stdout comparison is
  implemented; sufficient for `py-001` and the stated Day 1 scope).

## Day 2

- Two more encounters: `py-002` ("Print Numbers 1 to N", loops/multi-line
  output) and `py-003` ("Even or Odd", conditionals, including negative-number
  edge cases). All three verified live: correct solutions `ACCEPTED`
  100/100, broken ones correctly `WRONG_ANSWER` with partial credit.
- `tests/unit/test_all_encounters_valid.py` — every encounter file is now
  validated automatically by the test suite, not just by manually running
  `scripts/seed_encounters.py`.
- `scripts/new_encounter.py` — scaffolds a new, schema-valid encounter JSON
  stub (`python scripts/new_encounter.py py-004 "Title" --concepts foo
  bar`), so writing one of the ~40 planned encounters means filling in
  blanks instead of retyping the schema.
- `app/mock_main.py` — a second, Piston-free FastAPI app for Frontend 2.
  Same routes, same real Pydantic response shapes (built from real
  encounter data), but every run/submission is canned (`ACCEPTED`,
  full score). Run it on a separate port alongside the real backend:
  ```bash
  uvicorn app.mock_main:app --reload --port 8001
  ```
  This satisfies "fake responses published so frontend isn't blocked"
  without adding a mock branch inside the real scoring path.
