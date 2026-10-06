# Knightmare Conquest: handoff

This document is for whoever picks up the project next, human or AI. It explains what the game is, how the code is
organised, every system built so far, and the working conventions the owner expects.

- Location: `/Users/aveev/Desktop/Coding/CodeGeass` (owner’s local copy); remote: `https://github.com/user2421423/CodeGeass`.
- Sister project: *Galactic Command* (the LOGH game, repository `user2421423/LOGH`). This game was ported from it and
  keeps its systems, file layout and conventions.

## 1. Premise

Knightmare Conquest is a browser turn-based hex strategy game in the style of **World Conqueror 4** (EasyTech),
themed on **Code Geass**. For now it has one mode, **Conquest**: a full world map in 2017 a.t.b. where the Holy
Britannian Empire, the Europia United and the Chinese Federation fight each other (and the neutral powers) with
Knightmare Frames.

- Move each unit once and attack once per turn; click a green hex to move, a red hex to attack at once.
- Units are 1–3 frames; commanders ride on units and give bonuses; morale, terrain and counter-fire matter.
- Capture cities for income, build Knightmares in city factories, upgrade cities, research HQ technology.
- **WC4 surrender rule:** a power whose capital falls surrenders; its cities pass to the conqueror and its units
  disband. Take every rival capital, or hold the most cities at the 120-turn armistice.
- Between operations, **command tokens** buy HQ research, recruit commanders, promote them and buy their stars.

Campaign chapters (like Galactic Command's) are not built yet; the engine is conquest-only.

## 2. Running, testing and deploying

- **Run locally:** serve `dist/` with any static server (`python3 -m http.server -d dist`) and open it.
- **Tests (local only):** `node --test tests/*.test.cjs` (16 engine tests plus artwork loading tests) and `node tests/ui-smoke.cjs`
  (loads all UI scripts in a stubbed DOM and clicks through every dialog and a rival turn for all three powers).
  Node 22. Node was not installed on the machine this was built on; the same tests were run through the macOS
  JavaScriptCore shell (`/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc`) with a
  small `require` shim.
- **Deploy:** `.github/workflows/pages.yml` uploads `dist/` to GitHub Pages on every push to `main` after engine, artwork-loading, UI smoke and tracked-asset checks pass.
- **Formatting:** Prettier with `.prettierrc` (`printWidth 120`, `singleQuote`, `arrowParens: avoid`).

### Artwork handoff status

Published artwork is tracked and deployed from `dist/assets/art/`: **31 Knightmare sprites and 35 commander
portraits**, registered synchronously by `manifest.js`. Source provenance and preparation details are recorded in
`ASSETS.md` and `sources.json`. The ignored `dist/local-art/` directory is only a local preparation/override
workspace and is never required by GitHub Pages. All Knightmare types and commanders now have published image assets; procedural art remains only as a runtime safety fallback.
To add or replace public artwork, prepare it locally, run `tools/publish_art.py`, validate, commit and push.

## 3. Code layout

Everything ships from `dist/`; there is no bundler. Scripts load in this order from `index.html`:

| File | Role |
|---|---|
| `dist/engine.js` | The deterministic rules engine (`window.Knightmare`, aliased `E` in the UI; `module.exports` for Node). No DOM. Factions, Knightmare classes and lineups, commanders, tech tree, terrain, combat, sea transport, economy, AI, the world map (`WORLD_ROWS`, `CITY_DATA`, `ARMY_DATA`, `GARRISONS`), profile/roster logic. Seeded LCG via `random(g)`. |
| `dist/art.js` | `ART`: procedural SVG for every Knightmare (`SPECS` body plans and paint), cities and original-design commander busts (`LOOKS`), cached as images for the canvas. Public images load synchronously from `assets/art/manifest.js`, built by `tools/publish_art.py`; drawn art remains the fallback. Optional localhost override: `local-art/manifest.json` (git-ignored folder `dist/local-art/`; `tools/local_art_prepare.py` turns raw files in `local-art/raw/` into game-ready images and runs `tools/local_art_manifest.py`) layers the owner's own files over the drawings via `ART.useLocal`. |
| `dist/icons.js` | `ICONS`: inline SVG sprite (credits, industry, research, command token, attack/defense/move/range, factory, refinery, sea) and the HP ring. |
| `dist/audio.js` | `SFX`: Web Audio synthesized sounds per class and faction voice, Landspinner movement, MVS slash, batteries. |
| `dist/game.js` | The whole UI: start screen, wrapping world-map renderer (camera, minimap, terrain, tokens), input, panels, dock, dialogs (factory, HQ research, commanders, Commander Info, Knightmare archive, world powers, field manual, results), effects, rival-turn playback with Skip, saving. |
| `dist/style.css`, `dist/battlefield.css` | Base styles and the WC4 reskin from Galactic Command; Knightmare Conquest additions are at the end of `battlefield.css`. |
| `tools/build_map.py` | Hand-drawn continent outlines (lon/lat) rasterized to the hex grid; `--inject dist/engine.js` rewrites the `// <world>` block. `tools/preview_map.py` renders a PNG (Pillow). |
| `tests/` | `engine.test.cjs`, `ui-smoke.cjs`. |

### Engine conventions

- Game state `g` is plain JSON (saved whole to `localStorage`). Key fields: `game: 'knightmare'`, `rulesVersion`,
  `player`, `order` (turn order, player first), `phase`, `turn`, `wrap`, `cols/rows`, `tiles`, `units`, `stations`
  (the cities), `economy`, `tech` (per side), `officers` (operation commanders), `roster` (copy of your commanders),
  `fallen` (surrendered powers), `difficulty`, `log`, `over`.
- Hex grid: odd-r offset coordinates (`c`, `r`). The world wraps east–west: always pass `g` to `distance(a, b, g)`;
  `tile()` and `adjacent()` wrap columns. `within(g, p, n)` lists hexes in range.
- `unitAt`/`stationAt` use occupancy indexes (WeakMaps keyed by the arrays); `move()` keeps them current. If code
  ever moves a unit by assigning `u.c/u.r` directly, call `reindex(g, u, from)` or the index self-heals on a miss.
- Every player action has a `…Reason(g, …)` function returning `null` or a human-readable reason; the UI shows it on
  disabled buttons. Shortfalls read "Need N more credits / command tokens" and render as red costs instead.
- Saves are gated by `RULES_VERSION` (currently 1) in `migrateSave`; bump it when save shape or rules change.
- `createGame(player, difficulty, 'conquest', seed)`. Cities and armies are placed by longitude/latitude and snap to
  the nearest free land hex, so they can be edited without touching coordinates.
- Commander abilities are data (`fx` on each commander: `dmg`, `dmgBranch`, `crit`, `move`, `taken`, `counter`,
  `reflect`, `terror`, `aura`, `rally`, `refire`, `floor`, `calm`, `regen`, `repairHalf`, `reassure`, `cityGuard`,
  `belowHalf`, `counterTaken`, `artist`, `vsCity`, `captureHeal`, `opening`, `ignoreTerrain`, `rearguard`) read by
  `power()`, `preview()`, `movement()` and `beginTurn()`. Commanders with `action` get the morale strike
  (`feint()`): Julius, Leila, Xianglin.

### Browser storage keys

| Key | Contents |
|---|---|
| `knightmare-conquest-profile` | The persistent **profile**: `tokens`, `wins`, `cleared` (`'conquest:world:<difficulty>': true`), `research`, `roster` (your commanders), `medals`. |
| `knightmare-conquest-save` | The current game save. |
| `knightmare-conquest-sound` | `'on'` / `'off'`. |

## 4. Systems

### Knightmares (30 faction frames + the neutral Bamides)
- Three branches with ten classes; each power builds its own frame for every class (see the README table).
  Class stats come from `CLASSES`; a few frames tweak them (Gun-Ru sturdier but slower, Liverpool and Gardmare
  glass cannons, Panzer-Hummel armored and slow, Liberte faster and lighter, Shen Hu hits harder, Gawain floats).
- **Infantry:** Scout, Assault (+55% vs Armor and city defenses), Raider (5 movement). **Armor:** Line and Mainline
  (a kill grants one more shot per turn), Heavy and Super-heavy (range 1–2; fire again after every kill, the first
  also restores movement). **Artillery:** Fire support (range 1), Rocket (exactly range 2, 45% splash), Siege
  (exactly range 2, +100% vs cities). Artillery draws no counter-fire and cannot capture.
- Doctrines: Britannian Armor +8% damage, E.U. Artillery +10% damage, Federation Infantry 15% cheaper.
- 1–3 frames per unit (+70% HP, +45% attack per extra frame; each extra frame costs 85%). Veterancy 0–5 from kills.

### Map, terrain and the sea
- 100 × 42 wrapping hexes (3.6° per column, 74°N to 54°S), generated by `tools/build_map.py`.
- Plains 1; forest 2 (−15% damage); mountains 2 (−25%); desert 1 (3% attrition); tundra 2 (2.5% attrition);
  Himalaya and Greenland ice cap impassable. Julius and float units ignore movement costs.
- **Sea:** stepping from land onto a sea hex embarks the unit (ends its move). Embarked units sail 5 hexes (+1/+2
  with Naval Transports), cannot fire or counter-fire, take +50% damage (+25% with Landing Craft), cannot repair or
  reinforce. Landing on a coast takes a step and ends the move.

### Cities and economy
- 107 cities: Britannia 41, E.U. 29, Federation 29, neutral 8. Income: capital 50, tier 3 30, tier 2 20, tier 1 12
  credits; industry 6 per tier (capital 30). Defenses 180/240/300 by tier, 400 for fortress cities, 600 for capitals.
- Buildings, each to level 3: Knightmare factory (unlocks tiers, +10 industry, +60 defense), research lab
  (+8 research), Sakuradite refinery (+15 credits). One unit per city per turn; new units act next turn.
- Fortress batteries on capitals and fortress cities (Tokyo Settlement, St. Petersburg, Gibraltar, Cairo/El Alamein,
  Liaodong, Singapore, Panama, Pearl Harbor): range 3, 40% of the target's frame, 2-turn recharge.

### Commanders
- 35 commanders; starters Suzaku and Cornelia (Britannia), Leila and Akito (E.U.), Xingke and Xianglin (Federation).
  Recruit prices 400 / 300 / 200 tokens by stars. Eleven ranks from Second Lieutenant (112% frame) to Marshal (160%).
  Branch stars (Infantry, Armor, Artillery) up to 6; medals as in Galactic Command.
- Operation commanders on the map: Bismarck, Suzaku, Cornelia, Shin, Julius, Ashley (Britannia); Smilas, Akito,
  Leila, Ryo, Ayano (E.U.); Xingke, Cao, Hong Gu, Xianglin, Lei Feng (Federation).

### HQ research, tokens, difficulty
- 36 technologies in five trees: Infantry, Armor, Artillery, Sakuradite (VARIS, Naval Transports, Landing Craft,
  Blaze Luminous, Energy Filler Network, Float System) and Cities. Tiers II–IV after 2, 4 and 7 victories.
- Tokens only for the first win at each difficulty: 250 + 150 conquest + banked research (5 : 1, capped at 300),
  ×1.5 Hard, ×2 Challenge, +150 for the first win ever.
- Difficulty works as in Galactic Command, applied to both rival powers and the neutrals.

### AI
- `aiProduction`: batteries, repairs, saving for super-heavies, one building upgrade, reinforcements, then
  front-line production up to a soft cap of 14 + 0.9 × cities units.
- `aiOrder`: moves along a goal field (`goalField`: path cost over land and sea to the nearest wanted city, rival
  capitals weighted extra), scores attacks, garrisons threatened cities (`assignGuards`: the capital keeps 2–4
  defenders), and only embarks in convoys of three or more.
- Balance is first-pass: in all-AI simulations any of the three powers can come out ahead depending on the seed.

## 5. Working with the owner

- Treat the owner as the commander: carry out requests fully and report plainly what changed.
- **Do not run tests or browser checks unless the owner asks.** Keep the test files consistent with rule changes
  anyway, since the owner may ask for a test run.
- Commit each completed request (push once a remote exists; deploys happen from `main`).
- Terminology: say **commanders** and **Knightmares / units**, not admirals or fleets. Britannia is the default side.
- Keep explanations short and concrete; tables are welcome for lists of changes.
- When numbers are first-pass balance guesses, say so so the owner can tune them.
