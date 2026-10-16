# Deployment runbook

This is the one-time, account-level setup CONTRIBUTING.md assumes already exists ("Merging to `main` deploys to staging automatically"). It can't be done from a code change or a PR — it needs someone with admin access to the `edoc-riksu` GitHub org and a Vercel account to click through it once. Written so that person doesn't have to reconstruct it from scratch.

## 1. Connect the repo to Vercel

1. Sign in to [vercel.com](https://vercel.com) with an account that has (or can get) access to the `edoc-riksu` GitHub org.
2. **Add New... -> Project**, import `edoc-riksu/edoc`.
3. Framework preset: Next.js (auto-detected). Set **Root Directory** to `edoc-galaxy`: the web app lives in that folder, and the repo root has no `package.json`. Build command, output directory and install command can stay default.
4. Do not deploy yet — set environment variables first (next section), then deploy.

This single step is what makes "every merge to `main` auto-deploys to staging" and "every PR gets a preview URL" true — it's handled by Vercel's GitHub integration, not by a GitHub Actions workflow.

## 2. Environment variables (per CONTRIBUTING.md's environments table)

In the Vercel project's **Settings -> Environment Variables**, add, per environment:

| Variable | Development | Preview (per-PR) | Production |
| --- | --- | --- | --- |
| `DATABASE_URL` | dev DB branch | a per-PR or shared staging DB branch | production DB connection string |
| `AUTH_SECRET` | any local value | a real random secret | a real random secret (different from preview) |
| `APP_ENV` | `development` | `staging` | `production` |

Generate `AUTH_SECRET` values with something like `openssl rand -base64 32` — don't reuse the same value across environments.

Never put real values in `.env.example` or any committed file — see `.gitignore` and `CONTRIBUTING.md`'s Secrets section.

## 3. Provisioning the database

No Postgres instance exists yet for any environment. Pick one managed provider (Neon, Supabase and Vercel Postgres all work fine with Prisma) and:

1. Create a **production** database and a **staging** database (separate instances, not just separate schemas — this matches the environments table in `CONTRIBUTING.md`).
2. For local development, each person creates their own branch/database (or uses the provider's branching feature) and points their own `.env.local` at it.
3. Put each environment's connection string into the matching Vercel environment variable from step 2.
4. Once `DATABASE_URL` is live for an environment, run `npm run db:migrate:deploy` from inside `edoc-galaxy/` (migrations are in `edoc-galaxy/prisma/`) against it to create the `users` and `progress` tables.

## 4. Production releases

Per `CONTRIBUTING.md`: production deploys from a tagged release (`v0.3.0`-style) and needs two approvals. In Vercel, set the **Production Branch** to track tags rather than `main` directly if it isn't already, or confirm the team's intended flow (tag -> promote the corresponding deployment to production in the Vercel dashboard) and document whichever is chosen here.

## 5. Confirming it worked

Once connected, `GET /api/health` (in `edoc-galaxy/src/app/api/health/`) on both the staging and production URLs should return `{"status":"ok", ...}`. If it returns a 500 with a missing-env-var message, an environment variable from step 2 is missing for that environment.

## 6. Gotcha: a leftover Neon marketplace integration silently overrides `DATABASE_URL`

If sign-up/sign-in fail live with `P2021: table does not exist`, even though `DATABASE_URL` in **Settings -> Environment Variables** is set correctly and the target database's tables genuinely exist, check **Settings -> Storage** for a connected Neon integration (it can be connected even if its own page shows a "Connect to Project" button — that button offers connecting *another* project, it doesn't mean this one is disconnected).

A connected Neon/Postgres marketplace integration injects its own `DATABASE_URL` (plus a dozen `DATABASE_PG*`/`DATABASE_POSTGRES_*` variables) into every build, and this takes priority over the project's own manually-set `DATABASE_URL` — even over a value forced via `vercel deploy --env`. The symptom is identical no matter how many times you edit or redeploy. Confirm by hitting a route that prints `process.env.DATABASE_URL`'s hostname at runtime; if it doesn't match what you set, look for a connected Storage integration and remove it (Settings -> Storage -> the integration -> Settings -> Delete).
