# edoc · Galaxy

A standalone, interactive galaxy map: a nebula sky with drifting stars and passing ships, a dotted route of planets, and a pilot's shuttle you can send to any world.

## Run it

```bash
npm install
npm run dev        # http://localhost:8000
```

`npm run build && npm start` serves the production build on the same port.

## How to use it

| Action | What happens |
| --- | --- |
| Mouse wheel / trackpad | Slides along the route; snaps to the nearest planet |
| Drag (mouse or touch) | Same, by hand; a flick moves one planet |
| Arrow keys, PageUp/PageDown, Home/End | Step between planets |
| Click a planet, or a dot on the right edge | Select it |
| Hover a planet | Shows its name and colours it in |
| Move the mouse | Stars, nebula and planets shift in layers; the shuttle leans toward the pointer and leaves stardust |
| Click empty space | Ripple and a burst of stardust |
| **Fly to …** / rocket icon / Enter | Launch the shuttle to the selected planet |
| Gear icon | Motion (full or reduced), star density, passing ships |

Reduced motion is switched on automatically when your system asks for it.

## Where things live

- `src/galaxy/Galaxy.js` the screen: input, camera, planets, card and controls
- `src/galaxy/sky.js` nebula, star layers, shooting stars, the dotted route
- `src/galaxy/ships.js` ship drawings and the passing-ship system
- `src/galaxy/hero.js` the pilot's shuttle, trails, warp streaks
- `src/galaxy/planet.js` spinning planets drawn on a canvas
- `src/galaxy/layout.js` the planet list and the route (edit `PLANETS` to rename or add worlds)
- `src/galaxy/audio.js` small synthesized sound effects (no audio files)

Everything is drawn in code: there are no image or audio files, and every asset is original.
