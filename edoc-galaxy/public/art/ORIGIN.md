# Art origin

One line per file in `public/art/`. No line, no merge. See "Images and art" in CONTRIBUTING.md.

| File | Made by | How | Source or licence |
| --- | --- | --- | --- |
| (planets, sky and ships are drawn in code in `src/galaxy/`) | Frontend 1 | Drawn in code | Original |
| `src/art/scenes.js`: approach cockpit (hull, window, console, scanner lock) and flight scene (ship, trails) | Frontend 1 | Drawn in code (canvas, seeded) | Original. Not traced from the mockups. |
| `src/art/asteroid.js`: rock sprites and the large target rock | Frontend 1 | Generated per pixel from a seed (height map, lighting) | Original |
| `src/art/surface.js`: the planet's surface at dusk (sky, ringed neighbour planet, sun, three mountain ridges, crystal spires, dusty ground texture, foreground rocks) | Frontend 1 | Drawn in code and generated from noise; rocks reuse `asteroid.js` | Original |
| `src/art/lander.js`: the ship on the ground (scorch marks, fire, smoke, dust, sparks, debris, furrow) | Frontend 1 | Drawn in code | Original |
| `src/art/landing.js`: the descent and touchdown (planet below, cloud streaks, re-entry heat, camera shake, smooth, rough and crash versions) | Frontend 1 | Drawn in code | Original |
| `src/art/nebula.js`: gas clouds behind both scenes | Frontend 1 | Generated from noise | Original |
| `src/art/world.js`: the planet seen from the cockpit and in flight | Frontend 1 | Generated per pixel from noise | Original |
| `src/art/scenes.js`: the journey version of the flight scene (planet grows, ship pushes forward, arrival glow) | Frontend 1 | Drawn in code | Original |
| `src/art/cockpit.js`: the cockpit frame round the encounter console (canopy bar, window pillars, dash with dials and lamps) | Frontend 1 | Drawn in code | Original |
| `src/art/victory.js`: "Encounter cleared" (pulse, the rock breaking into shards, dust, shock ring, rays, the way opening) | Frontend 1 | Drawn in code, rock from `asteroid.js` | Original |
| `src/art/defeat.js`: "Hull depleted" (the drifting, venting ship with the rock behind it, alarm glow, sparks, wreckage) | Frontend 1 | Drawn in code, rock from `asteroid.js` | Original |
