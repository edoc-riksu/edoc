# contracts/

The shapes the frontend and the backend agree on. Build screens against these; the mock API (`uvicorn app.mock_main:app --port 8001`, run from `backend/`) returns the same shapes.

Anything inside `contracts/` changes by pull request, with the owner's review (see CONTRIBUTING.md).

| File | What it describes | Status |
| --- | --- | --- |
| `encounter.schema.json` + `example-encounter.json` | `GET /api/v1/encounters/{id}` | Live in `backend/` |
| `encounter-list.schema.json` + `example-encounter-list.json` | `GET /api/v1/encounters?module=` | Live in `backend/` |
| `run-result.schema.json` + `example-run-result.json` | `POST /api/v1/executions/run` | Live in `backend/` |
| `submission-result.schema.json` + `example-submission-*.json` | `POST /api/v1/submissions` | Live in `backend/` |
| `hint.schema.json` + `example-hint.json` | `POST /api/v1/encounters/{id}/hints` | **Proposed.** Not built yet (plan Days 22 and 37). The hint text already exists in each encounter file. |

Base URL: `NEXT_PUBLIC_EXECUTION_API_URL` (mock: `http://localhost:8001`, real local: `http://localhost:8000`). Staging URL to be added once the service is deployed.

## Rules that never change

- **Hidden tests are never returned.** Encounters expose `sample_tests` only. Submissions return a pass/fail per hidden test id and a score, never inputs or expected outputs.
- **Run is informational, Submit is the result.** Only a submission's `verdict` and `score` count for progress and damage. A run result must never be used to award anything.
- **Verdicts** (submission only): `ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `SYSTEM_ERROR`. If several tests fail, the worst one wins in this order: `SYSTEM_ERROR`, `COMPILATION_ERROR`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `WRONG_ANSWER`, `ACCEPTED`.
- **Encounter id** matches `^[a-z]+-\d{3}$` (for example `py-001`). **Code** is at most 20,000 characters.
- **Output** `stdout` and `stderr` in a run result are cut to 4,000 characters each.
- **Attempts and time.** A submission may carry `attempt_number` (which try this is, default 1) and `elapsed_ms`. The service does not count attempts itself; the caller passes the number in and the result repeats it back with `first_attempt_clear` (true only for an accepted first try). Neither changes the score yet.
- **Defeat.** When the player's code was wrong, the result carries `defeat`: the encounter's main concept (`id`, `name`, `note`) and the explanation written for it. It is `null` for an accepted run and when our own system failed. This is the only place the explanation is ever sent.
- **Score** is `earned` out of `total` points. Sample tests are worth 0, hidden tests carry the points.

## Errors

All errors use the FastAPI shape, with the HTTP status carrying the meaning.

| Status | Body | When |
| --- | --- | --- |
| 404 | `{"detail": "Encounter not found"}` | Unknown encounter id |
| 422 | `{"detail": [{"loc": ["body","code"], "msg": "...", "type": "..."}]}` | Bad id pattern, code too long, missing field |
| 503 | `{"detail": "Execution backend is unavailable"}` | Run only: the sandbox is down |
| 409 | `{"detail": "Ask hint level 1 first"}` | Hints only: an earlier hint level has not been asked yet |

A submission can't be judged when the sandbox is down; it comes back as a normal 200 with `verdict: "SYSTEM_ERROR"`, `score.earned: 0` and an empty `tests` list. Treat that as "try again", not as a loss.

## Hints (proposed)

Three levels per encounter: 1 is a nudge, 2 points at the approach, 3 is the walkthrough. Asking is a `POST`, not a `GET`, because asking costs the player and will be recorded.

Request: `{"level": 1}`. Response: see `example-hint.json`. `cost.fuel` is a placeholder (always 0 until the cost rules are decided on Day 37).

The public encounter carries `hint_levels` (always 3 today), so the console can draw the right number of hint buttons without a separate call.

### Decisions

Agreed in the review of PR #22 (Frontend 2). Backend 2 still to confirm decision 2:

1. **Hints are asked in order.** A player can ask for level N only after asking levels 1 to N-1. Asking for a later level too early returns `409` with `{"detail": "Ask hint level 1 first"}`. Asking for a level already asked again is fine and returns the same text. Otherwise a player could buy the walkthrough for the price of a nudge.
2. **The fuel balance lives in Backend 2's database.** Backend 2's service checks and deducts the fuel. This service only reports the cost (`cost.fuel`) and never looks at the balance.
3. **The encounter has a `hint_levels` field**, always 3 for now. It mirrors `levels_total` in the hint response.

### Still open

- How the hints service knows which player is asking, so it can enforce the order. It needs the player identity from Backend 2's session (hint usage per player is plan Day 36).
- Whether sample tests need a plain-English description for the console to show why a test failed. Not added yet; `id`, `input` and `expected_output` only.

## Encounter order and concepts

- **Order.** Every encounter has an `order` (1, 2, 3, ...) inside its module. The list endpoint returns encounters in play order, so a screen never sorts them itself.
- **Concept tags.** Every encounter has at least one concept. The first is its **main concept** (`concept` in the list): it is the concept named when a player is defeated. Tags come from one agreed list, `backend/encounters/concepts.json` (`id`, `name`, `note`), so the same idea is never spelled two ways.
- **Hint tiers.** Every encounter has exactly three hint levels, checked when the encounter file is loaded. That is why `hint_levels` is always 3.

## Not covered yet

Attempts, first-attempt rate and time (plan Day 13), the session, and the module list (Backend 2). The submission `submission_id` is generated per request and is not stored yet; saving it is Backend 2's work.
