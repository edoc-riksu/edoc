# edoc

A space-cockpit coding academy: fly a galaxy map, land on a language planet, solve encounters in the ship's console.

## What is in this repo

| Folder | What it holds |
| --- | --- |
| `edoc-galaxy/` | The web app (Next.js). Galaxy map, approach and landing screens, sign-in, and the code console. Vercel deploys from this folder. |
| `backend/` | The Python service that runs and judges a player's code (Backend 1). See `backend/README.md`. |

## Run the web app locally (about 5 minutes)

Requires Node 20 or newer and Git.

```
git clone https://github.com/edoc-riksu/edoc.git
cd edoc/edoc-galaxy
npm ci
npm run dev
```

Open the address it prints (http://localhost:4173). If the page looks stale after pulling changes, stop the server and run `npm run dev` again. Environment variable names are in `edoc-galaxy/.env.example`; copy it to `edoc-galaxy/.env.local` and never commit real values.

## Stack

Next.js 15 (App Router), React 19, plain CSS with design tokens, scenes drawn in code on canvas, lucide-react icons. Everything is plain JavaScript for now.

## Working together

Read [CONTRIBUTING.md](CONTRIBUTING.md) for branches, pull requests, environments and secrets, and [edoc-galaxy/CONTRIBUTING.md](edoc-galaxy/CONTRIBUTING.md) for who owns which folder in the app.

## The earlier prototype

The first cockpit prototype used to live at the top of this repo. It was removed from `main` once the galaxy app replaced it. It is still in the history at the tag `legacy-cockpit-final`.
