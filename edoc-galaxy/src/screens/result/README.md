# Result scenes

The victory ("Encounter cleared") and defeat ("Hull depleted") scenes, and how a real judging result reaches them.

Frontend 1 owns this folder and the approach screen. The console (Frontend 2) is not changed by it.

## How a result reaches the scene

`ApproachScreen` passes two optional callbacks to `CodeConsole`:

| Prop | Call it when | Payload |
| --- | --- | --- |
| `onVictory` | a submission comes back `ACCEPTED` | `{ result, hullBefore, hullAfter, attempts }` |
| `onDefeat` | the hull reached 0 after a submission | `{ result, attempts }` |

`result` is the submission result exactly as the API returns it (`contracts/submission-result.schema.json`). Pass it on untouched: a wrong answer carries `defeat` (the main concept with its note, and the explanation written for it), and that is what the defeat scene teaches. If a result has no `defeat` (an older service, a built-in encounter), the scene falls back to the encounter's own explanation, then to a line for the verdict.

Until the console calls them, nothing changes: it keeps its own banner and defeat dialog. When it does call them it should skip its own banner and dialog, or two dialogs will stack and fight over focus.

What the approach screen does with them:

- Victory: the scene shows the numbers. "Next obstacle" (or "Dock" after the last one) fades the console out and moves on, exactly as the console's own Continue does today (`onPass`).
- Defeat: the scene names the concept and shows the explanation. Rematch is the only way out (no Escape). It resets the hull to 100 and starts the console fresh on the same encounter.

## Pieces

- `resultProps.js`: pure functions that turn a result into scene props. Tested in `resultProps.test.js`. Hidden tests are only ever counted ("2 hidden tests"), never named.
- `ResultHost.js`: picks the scene for a result.
- `EncounterCleared.js`, `HullDepleted.js`: the scenes (props only, nothing fetched or saved).
- The `/art/...` review pages are closed (404) on the live production site and open in development and on Vercel preview builds. Set `SHOW_ART_PREVIEWS=1` to open them anywhere (see `src/art/previewAccess.js`).
- `/art/results`: a review page that feeds the scenes API-shaped results. `?scene=win|winFull|lose|loseLoops|loseNoApi`, `&calm=1`.

## New suit unlocked

`SuitUnlocked.js` is the scene for a pilot earning a suit (today only the Starfarer set, which the hangar unlocks when every encounter of a module is cleared). It is the hangar's own 3D bay with the hangar's own Loadout panel on the right (same place, same glass, same buttons) and nothing else on screen: the pilot's explorer stands on the podium in the base suit, the light flashes, and they are in the new suit. Props only, like the two scenes above:

```js
<SuitUnlocked explorerId="mira" suitName="Starfarer set" reason="You cleared every encounter in Python Basics."
  blurb="..." onEquip={...} onLater={...} muted calm />   // buttons: "Equip Suit" and "Later"
```

- `HangarSuitStage.js` loads `screens/hangar/hangarBayScene.js` as it is (nothing in the hangar is edited) and only when the scene mounts. If 3D can't start it falls back to the code-drawn `art/SuitScene.js`.
- `suitModels.js` pairs each explorer with their base and Starfarer models. It copies the lists in `HangarScreen.js` (which does not export them): add a new explorer or model in both places.
- `suitProps.js`: `suitUnlockedProps({ suit, moduleName, explorer })` builds the props (`explorer` is the pilot's `user.explorer`); `SUIT_UNLOCK_MOCK` is the mock data the review page uses. Tested in `suitProps.test.js`.
- Nothing is wired yet. When the progress check reports a newly cleared module, show this scene with the pilot's explorer, then send them to the hangar on `onEquip` (the hangar does the equipping and saving).
- `/art/suit` is the review page (mock data, explorer picker). `?calm=1` shows reduced motion; "Phone shape" shows the tall layout. It needs WebGL, like the hangar.

## Module cleared

`ModuleCleared.js` is the scene for a pilot solving the last encounter of a module. Props only, like the others:

```js
<ModuleCleared moduleName="Python Basics" planetName="Python" backdrop="/art/modules/python-surface.jpg" cleared={10} total={10}
  reward="New suit unlocked: Starfarer set" nextLabel="Next: Loops" onContinue={...} muted calm />
```

- It looks like the rest of the app: the module map's own painting fills the screen (dimmed; `backdrop`, or a code-drawn night sky without one), a medal floats inside a ring of lamps (one per encounter, 3 to 24 drawn), and one glass panel on the right - the hangar's panel - says "Module cleared" with the module name, the encounter count, the reward line and one button. On narrow windows the panel is a sheet along the bottom, as in the hangar. The lamps light one after another, a pulse leaves the ring, a tick is drawn and sparks fly out; then the panel slides in. Reduced motion (`calm`) shows the finished picture with the panel in place.
- `moduleProps.js`: `moduleClearedProps({ module, cleared, total, planetId, planetName, reward, nextTitle })` builds the props (`backdrop` is the planet's module-map painting from `backdropFor(planetId)`; `nextLabel` is "Next: <title>" or "Back to the module map"); `MODULE_CLEARED_MOCK` is the mock data. Tested in `moduleProps.test.js`.
- Nothing is wired yet. When the progress check reports that a module just became complete, show this scene first; if that module also earned a suit, `onContinue` goes on to `SuitUnlocked`. `reward` is where that suit line goes.
- `/art/module-cleared` is the review page (mock data, encounter count, reward and last-module switches, painting on/off, reduced motion, phone shape).
