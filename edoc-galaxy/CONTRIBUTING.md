# Working on edoc-galaxy

## Where things live
- `src/galaxy/` - Frontend 1: the galaxy map (canvas, planets, ships, audio).
- `src/console/` - Frontend 2: the console. Do not edit F1 files from here, and vice versa.
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
Branch from the latest `main` (`frontend/<thing>`), open a PR, wait for "CI / checks" and one approving review.
