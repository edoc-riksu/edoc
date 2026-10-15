# edoc: rules for Claude sessions

Read README.md, CONTRIBUTING.md and edoc-galaxy/CONTRIBUTING.md first. The web app lives in `edoc-galaxy/`; `backend/` is the Python judging service. Every teammate runs their own session on their own clone and branch; these rules keep those sessions consistent.

## Product names that never change

Do not rename, reorder, remove or re-label these, in UI text, code identifiers or routes, unless the user explicitly asks for that exact change.

Top-level navigation (5 sections):
- Star Chart Radar
- Flight Academy
- Space Missions
- The Comm-Link
- Fuel Upgrades

Comm-Link tabs (5):
- Pilot Logs
- Roster Ranks
- Shipyard
- Cap Log
- Fleet Ops

## Do not change without team agreement

These are shared by everyone. If a task seems to need a change here, stop and ask the user to check with the team first, then keep the change minimal.

- The backend's judging and scoring (`backend/app/judge`, `backend/app/services`). The frontend never computes a verdict or a score.
- The shared files of the app: `edoc-galaxy/package.json`, `edoc-galaxy/package-lock.json`, `edoc-galaxy/src/app/globals.css`, `edoc-galaxy/src/app/layout.js`.
- Lesson lock order: lessons unlock strictly in sequence. Practice is never locked.

## Product rules (from the v1 spec)

- Damage comes from failing tests, never from a syntax error while the player is still typing.
- When the player loses, teach the concept that beat them, then offer a rematch.
- While someone is writing code, the ship goes quiet, visually and audibly.
- Every asset is original: no licensed characters, ships or worlds, even as placeholders.
- Keyboard use, contrast and reduced motion must keep working.

## Code conventions

- Plain JavaScript (`.js`), Next.js App Router. There is no `tsconfig.json`; do not add TypeScript files without agreement.
- Match the existing style: `"use client"` where needed, lucide-react icons, plain CSS. Colours and fonts come from the tokens in `edoc-galaxy/src/app/globals.css`; use the shared Button and Panel from `edoc-galaxy/src/ui` instead of writing new ones.
- Keep to your own folder (see `edoc-galaxy/CONTRIBUTING.md`). Do not edit another person's files from your branch.
- Prefer small, focused changes. Do not reformat or reorganise files you were not asked to touch.

## Working rules

- Work on a branch named `area/short-description`; never commit to `main`.
- Keep pull requests small and start the title with the plan day and area, for example `D12 frontend: cockpit frame`.
- Never commit secrets or a real `.env` file. Use `.env.example` for variable names only.
- Changing an API or database shape: say so in the team channel before merging.
- Before finishing, run `npm run build` inside `edoc-galaxy/` and fix anything it reports.

## Who owns what

The owner is the natural reviewer, but nobody is locked out of any file.

| Area | Owner |
| --- | --- |
| World: galaxy map, approach, landing, planet surface, parallax, animation | Iris (Frontend 1) |
| Console: code editor, encounter screen, hull and damage, companion panel, profile, sign-in screens | Frontend 2 |
| Running and scoring code: execution service, test harness, encounter API | Backend 1 |
| Platform: accounts, saved progress, database, deployments, CI | Srija (Backend 2) |
| Coordination: plan, testing, content pipeline | Coordinator |
