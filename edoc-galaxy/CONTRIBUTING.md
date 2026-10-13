# Working on edoc-galaxy

## Where things live
- `src/galaxy/` - Frontend 1: the galaxy map (canvas, planets, ships, audio).
- `src/console/` - Frontend 2: the console. Do not edit F1 files from here, and vice versa.
- `src/art/` - Frontend 1: code-made scenes (cockpit, flight) and the sprites they use. `ArtCanvas` paints a scene and handles resize, pointer and reduced motion.
- `src/screens/` - Frontend 1: whole screens that sit on those scenes (approach so far).
- `src/data/` - mock data in the shape of the encounter API, until the real one is wired.
- `src/ui/` - shared Button, Panel, Segmented and text styles. Use these instead of writing new buttons or panels.
- `src/shell/` - TopBar and AppShell, the frame every page sits in.
- `src/app/` - routes only. Keep pages thin; put the real work in the folders above.

## Shared UI rules
- Buttons: `<Button variant="primary|secondary|ghost" size="sm|md|lg" icon={Icon} href="/path">`.
- Panels: `<Panel tone="default|teal|danger" size="sm|md|lg" title eyebrow actions>`.
- Text: `.t-display .t-title .t-label .t-body .t-small .t-muted`.
- Colours and fonts come from the tokens in `src/app/globals.css`. Do not hard-code hex values.

## Shared files (merge conflicts happen here)
`package.json`, `package-lock.json`, `src/app/globals.css`, `src/app/layout.js`.
Keep changes to these small, and pull `main` before editing them.

## Branches and PRs
Branch from the latest `main` (`frontend/<thing>`), open a PR and wait for "CI / checks" to pass. Approval is not required, but say in the PR what you changed so the others can look.

## Images and art (every asset is original)
Every image, icon, sprite, texture, sound and font in edoc must be made by us or be properly licensed. Nothing is copied from a mockup, a game, another site or an AI image of a known character or brand.
- Mockups are layout guides only. Do not crop, trace or export art from them. A watermark or stock mark in a mockup means it cannot ship.
- Put new art in `public/art/<area>/` and add one line to `public/art/ORIGIN.md`: file name, who made it, how (drawn in code, drawn by hand, generated, licensed), and the source or licence link if there is one.
- No line in `ORIGIN.md`, no merge. A reviewer or the author of the PR checks this before merging.
- Prefer drawing in code (canvas or SVG), as the galaxy planets are. It is original by construction and stays sharp at any size.
- If you are unsure where something came from, leave it out and ask Coordination.
