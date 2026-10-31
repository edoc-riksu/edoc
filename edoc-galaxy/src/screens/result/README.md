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
- `/art/results`: a review page that feeds the scenes API-shaped results. `?scene=win|winFull|lose|loseLoops|loseNoApi`, `&calm=1`.
