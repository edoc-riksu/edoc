# edoc

A space-cockpit coding academy: fly a galaxy map, land on a language planet, solve encounters in the ship's console.

## Run it locally (about 5 minutes)

Requires Node 20 or newer and Git.

```
git clone https://github.com/<your-org>/edoc.git
cd edoc
npm ci
cp .env.example .env.local   # on Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:8000. If the page looks stale after pulling changes, stop the server and run `npm run dev` again.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS v4, Three.js with @react-three/fiber, Framer Motion. Everything is plain JavaScript for now.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/app` | Routes: landing, `/cockpit`, `/about`, global styles |
| `src/components` | Cockpit shell, windshield, terminal; `modules/` for each HUD screen, `ui/` for shared visuals |
| `src/context/PilotContext.js` | Pilot state and progress (currently in the browser only) |
| `src/lib` | Planet and lesson data, in-browser sandboxes (JS, Python, TS), lesson tests |

## Working together

Read [CONTRIBUTING.md](CONTRIBUTING.md) for branches, pull requests, environments and secrets. Never commit real `.env` values.
