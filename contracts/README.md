# contracts/

The shapes the frontend and the backend agree on. Build screens against these; the mock API (`uvicorn app.mock_main:app --port 8001`, run from `backend/`) returns the same shapes.

Anything inside `contracts/` changes by pull request, with the owner's review (see CONTRIBUTING.md).

| File | What it describes | Status |
| --- | --- | --- |
| `encounter.schema.json` + `example-encounter.json` | `GET /api/v1/encounters/{id}` | Live in `backend/` |
| `run-result.schema.json` + `example-run-result.json` | `POST /api/v1/executions/run` | Live in `backend/` |
| `submission-result.schema.json` + `example-submission-*.json` | `POST /api/v1/submissions` | Live in `backend/` |
| `hint.schema.json` + `example-hint.json` | `POST /api/v1/encounters/{id}/hints` | **Proposed.** Not built yet (plan Days 22 and 37). The hint text already exists in each encounter file. |

Base URL: `NEXT_PUBLIC_EXECUTION_API_URL` (mock: `http://localhost:8001`, real local: `http://localhost:8000`). Staging URL to be added once the service is deployed.

## Rules that never change

- **Hidden tests are never returned.** Encounters expose `sample_tests` only. Submissions return a pass/fail per test id and a score, never inputs or expected outputs of hidden tests.
- **Run is informational, Submit is the result.** Only a submission's `verdict` and `score` count for progress and damage. A run result must never be used to award anything.
- **Verdicts** (submission only): `ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `SYSTEM_ERROR`. If several tests fail, the worst one wins in this order: `SYSTEM_ERROR`, `COMPILATION_ERROR`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `WRONG_ANSWER`, `ACCEPTED`.
- **Encounter id** matches `^[a-z]+-\d{3}$` (for example `py-001`). **Code** is at most 20,000 characters.
- **Output** `stdout` and `stderr` in a run result are cut to 4,000 characters each.
- **Score** is `earned` out of `total` points. Sample tests are worth 0, hidden tests carry the points.

## Errors

All errors use the FastAPI shape, with the HTTP status carrying the meaning.

| Status | Body | When |
| --- | --- | --- |
| 404 | `{"detail": "Encounter not found"}` | Unknown encounter id |
| 422 | `{"detail": [{"loc": ["body","code"], "msg": "...", "type": "..."}]}` | Bad id pattern, code too long, missing field |
| 503 | `{"detail": "Execution backend is unavailable"}` | Run only: the sandbox is down |

A submission can't be judged when the sandbox is down; it comes back as a normal 200 with `verdict: "SYSTEM_ERROR"`, `score.earned: 0` and an empty `tests` list. Treat that as "try again", not as a loss.

## Hints (proposed)

Three levels per encounter: 1 is a nudge, 2 points at the approach, 3 is the walkthrough. Asking is a `POST`, not a `GET`, because asking costs the player and will be recorded.

Request: `{"level": 1}`. Response: see `example-hint.json`. `cost.fuel` is a placeholder (always 0 until the cost rules are decided on Day 37).

Open questions for the team, to settle before building:

1. Must levels be asked in order (1 before 2 before 3), or can a player jump to 3?
2. Where does the player's fuel balance live (Backend 2's database), and does this service check it or only report the cost?
3. Does the public encounter need a `hint_levels` field, or is "always 3" fine?

## Not covered yet

Attempts, first-attempt rate and time (plan Day 13), the session, and the module list (Backend 2). The submission `submission_id` is generated per request and is not stored yet; saving it is Backend 2's work.
