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
- Units are 1–3 frames; commanders ride on units and give bonuses; morale, terrain and counter-fire matter. As in WC4,
  attack scales with remaining frame (`power()`: 40% + 60% × health, so 70% at half).
- Capture cities for income, build Knightmares in city factories, upgrade cities, research HQ technology.
- **Surrender at zero cities (Conquest):** a major power surrenders only when its last city falls (`move()` checks after
  every capture; campaign missions never surrender). Its units disband, its mines and half its stockpiles pass to the
  conqueror (`surrender`, `annexDeposits`, `annexStrategic`). A capital is just the richest city. Defeat every rival,
  or hold the most cities at the 120-turn armistice; losing your last city loses the war.
- Between operations, **command tokens** buy HQ research, recruit commanders, promote them and buy their stars.

**Campaign:** three story arcs as WC4-style campaigns, each played from either side: Season 1 and R2 (Black Knights or
Britannia) and the Euro Britannia War from Akito the Exiled (Euro Britannia or the E.U.): 6 campaigns and 58 missions on
hand-built tactical maps,
reached from the start menu. Rules in `dist/campaign.js` and `dist/missions.js` (every mission is built and checked in
`tests/core.test.cjs`); screens in `dist/ui/campaign-screens.js` (one mission boots in `tests/ui-smoke.cjs`). Mission balance is first-pass. See §4.

## 2. Running, testing and deploying

- **Run locally:** serve `dist/` with any static server (`python3 -m http.server -d dist`) and open it.
- **Tests:** a deliberately small (YAGNI) safety net, not a full rules suite. `node --test tests/core.test.cjs` checks
  that Conquest starts coherently for every power, the core breakthrough and movement rules, that a rival AI turn runs,
  and that every campaign mission builds with valid references. `node tests/ui-smoke.cjs` loads the scripts
  `index.html` lists in a stubbed DOM, plays a turn for all three Conquest powers and boots a campaign mission.
  `node tools/validate_assets.cjs --tracked` checks the published artwork. Node 22. Add a focused test only when a
  rule is fragile enough to need one. Node was not installed on the machine this was built on; the same tests were run through the macOS
  JavaScriptCore shell (`/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc`) with a
  small `require` shim.
- **Deploy:** `.github/workflows/pages.yml` uploads `dist/` to GitHub Pages on every push to `main` after `core.test.cjs`, the UI smoke test and the tracked-asset check pass.
- **Formatting:** Prettier with `.prettierrc` (`printWidth 120`, `singleQuote`, `arrowParens: avoid`).

### Artwork handoff status

Published artwork is tracked and deployed from `dist/assets/art/`: **70 Knightmare sprites (31 Conquest frames
including the Bamides, 19 Elite Forces, 11 campaign frames, 9 naval frames), 58 commander portraits and 3 building
pictures (`buildings/city` drawn for every city, `buildings/port` on every port hex, `buildings/mine` on every mine
on its own hex and in the mine panel; `ART.drawBuilding` / `ART.building`)**, registered
synchronously by `manifest.js`. Source provenance and preparation details are recorded in
`ASSETS.md` and `sources.json`. The ignored `dist/local-art/` directory is only a local preparation/override
workspace and is never required by GitHub Pages. Every Knightmare type and commander has published art; procedural art is
only a runtime safety fallback.
To add or replace public artwork, prepare it locally, run `tools/publish_art.py`, validate, commit and push.

## 3. Code layout

Everything ships from `dist/`; there is no bundler. Scripts load in this order from `index.html`:

| File | Role |
|---|---|
| `dist/engine/frames.js`, `commanders.js`, `research.js`, `world.js` | Engine data only, published on `root.KnightmareData` (like `missions.js`): factions, Knightmare classes, frames, lineups and Elite Forces; commanders, ranks, medals and ratings; the HQ tech tree; the world map (`WORLD_ROWS`, generated by `tools/build_map.py`; currently 180 × 76), `CITY_DATA`, `CITY_TWEAKS` (per-city balance overrides of starting income, industry and defenses, applied by `cityBase` in `engine.js`), `ARMY_DATA`, `GARRISONS`, ports, fleets and Sakuradite deposits. |
| `dist/engine.js` | The deterministic rules engine (`window.Knightmare`, aliased `E` in the UI; `module.exports` for Node). No DOM. Reads the data files (requiring them under Node), then terrain, combat, sea transport, economy, Sakuradite, F.L.E.I.J.A., standing orders, pathfinding (`goalField`, `massOf`), profile/roster logic. Seeded LCG via `random(g)`. |
| `dist/engine/ai.js` | The AI: rival high command (`aiProduction`), theaters (`aiPlan`, `FRONT`), carriers and unit orders (`aiOrder`). Loads after `engine.js` and adds its exports to `E`; it reads the rules it needs from `E.internal` (non-enumerable, not part of the API). Under Node, `engine.js` requires it, so `require('../dist/engine.js')` is the whole engine. |
| `dist/art.js` | `ART`: procedural SVG for every Knightmare (`SPECS` body plans and paint), cities and original-design commander busts (`LOOKS`), cached as images for the canvas. Public images load synchronously from `assets/art/manifest.js`, built by `tools/publish_art.py`; drawn art remains the fallback. Optional localhost override: `local-art/manifest.json` (git-ignored folder `dist/local-art/`; `tools/local_art_prepare.py` turns raw files in `local-art/raw/` into game-ready images and runs `tools/local_art_manifest.py`) layers the owner's own files over the drawings via `ART.useLocal`. |
| `dist/icons.js` | `ICONS`: inline SVG sprite (credits, industry, research, Sakuradite, command token, attack/defense/move/range, factory, refinery, sea) and the HP ring. |
| `dist/audio.js` | `SFX`: Web Audio synthesized sounds per class and faction voice, Landspinner movement, MVS slash, batteries, the F.L.E.I.J.A. detonation. |
| `dist/ui/*.js` | The UI, as classic scripts sharing one global scope (load order matters only for code that runs at load time; the boot is last): `core.js` (state, constants, saving, modal helpers), `hud.js` (start screen, top bar, F.L.E.I.J.A. targeting, unit and city panels, orders, dock), `turns.js` (end turn, rival-turn playback with Skip, rewards, results), `dialogs.js` (factory, Elite Forces, HQ research, commanders, Commander Info, Knightmare archive, world powers, field manual), `campaign-screens.js`, `view.js` (camera, hit-testing, map input), `effects.js`, `input.js` (keyboard, buttons, WebMCP tools) and `renderer.js` (minimap, cached terrain layer, cities, units, overlays, frame loop). The terrain layer (`mapLayer`: terrain, territory, coastlines and borders) is redrawn only when the zoom, canvas size or a hex's `owner`/`terrain` changes, or the camera pans past its margin; anything else it draws needs `mapLayerCache = null` when it changes. |
| `dist/game.js` | Boots the UI once every `ui/*.js` file has loaded. |
| `dist/style.css`, `dist/battlefield.css` | Base styles and the WC4 reskin from Galactic Command; Knightmare Conquest additions are at the end of `battlefield.css`. |
| `tools/build_map.py` | Hand-drawn continent outlines (lon/lat) rasterized to the hex grid, with `REDRAW` regions from real coastlines (`tools/data/coast.json`, see §Map); `tools/check_map.py` locks the rest; `--inject dist/engine/world.js` rewrites the `// <world>` block. `tools/preview_map.py` renders a PNG (Pillow). |
| `tests/` | `core.test.cjs` (engine and campaign integrity) and `ui-smoke.cjs` (loads the scripts `index.html` lists, in its order). |

### Engine conventions

- Game state `g` is plain JSON, saved to `localStorage` (conquest saves in compact form, see below). Key fields: `game: 'knightmare'`, `rulesVersion`,
  `player`, `order` (turn order, player first), `phase`, `turn`, `wrap`, `cols/rows`, `tiles`, `units`, `stations`
  (the cities), `economy`, `tech` (per side), `officers` (operation commanders), `roster` (copy of your commanders),
  `fallen` (surrendered powers), `difficulty`, `log`, `over`.
- Hex grid: odd-r offset coordinates (`c`, `r`). The world wraps east–west: always pass `g` to `distance(a, b, g)`;
  `tile()` and `adjacent()` wrap columns. `within(g, p, n)` lists hexes in range.
- `unitAt`/`stationAt` use occupancy indexes (WeakMaps keyed by the arrays); `move()` keeps them current. If code
  ever moves a unit by assigning `u.c/u.r` directly, call `reindex(g, u, from)` or the index self-heals on a miss.
- Every player action has a `…Reason(g, …)` function returning `null` or a human-readable reason; the UI shows it on
  disabled buttons. Shortfalls read "Need N more credits / command tokens" and render as red costs instead.
- Saves are gated by `RULES_VERSION` (currently 3) in `migrateSave`; bump it when save shape or rules change.
- Compact conquest saves (`E.packSave` / `E.unpackSave`, used by `save()`, `getSave()` and undo): terrain is stored only
  where it differs from `WORLD_ROWS`, every other per-hex field (`owner`, `provinceCity`, any new one) as runs in map
  order (`[value, count]`, or `[count]` where absent), and destroyed units are dropped. About 7x smaller (≈0.9 MB →
  ≈0.12 MB). `migrateSave` unpacks first, so full-format saves still load. Campaign saves stay whole (small maps).
  Version 3 added Sakuradite; every older save was made on the old 100 × 42 map and is rejected.
- `createGame(player, difficulty, 'conquest', seed)`. Cities and armies are placed by longitude/latitude and snap to
  the nearest free land hex, so they can be edited without touching coordinates. The high-resolution conquest map rejects older 100 × 42 saves rather than misplacing them.
- Commander abilities are data (`fx` on each commander: `dmg`, `dmgBranch`, `crit`, `move`, `taken`, `counter`,
  `reflect`, `terror`, `aura`, `rally`, `refire`, `floor`, `calm`, `regen`, `repairHalf`, `reassure`, `cityGuard`,
  `belowHalf`, `counterTaken`, `artist`, `vsCity`, `captureHeal`, `opening`, `ignoreTerrain`, `rearguard`) read by
  `power()`, `preview()`, `movement()` and `beginTurn()`. Commanders with `action` get the morale strike
  (`feint()`): Julius, Leila, Xianglin.

### Browser storage keys

| Key | Contents |
|---|---|
| `knightmare-conquest-profile` | The persistent **profile**: `tokens`, `wins`, `cleared` (`'conquest:world:<difficulty>': true`), `research`, `roster` (your commanders), `medals`, `elites`, `campaign` (overall best stars), `campaignDifficulty` (per-difficulty best stars) and `campaignMilestones` (claimed 50% / 75% / 100% campaign rewards). |
| `knightmare-conquest-save` | The current Conquest save. |
| `knightmare-conquest-mission` | The campaign mission in progress (kept apart from the Conquest save). |
| `knightmare-conquest-sound` | `'on'` / `'off'`. |

## 4. Systems

### Knightmares (30 faction frames + the neutral Bamides)
- Three branches with ten classes; each power builds its own frame for every class (see the README table).
  Class stats come from `CLASSES`; a few frames tweak them (Gun-Ru sturdier but slower, Liverpool and Gardmare
  glass cannons, Panzer-Hummel armored and slow, Alexander Type-02 Elite faster and lighter; Sutherland Air and
  Akatsuki Zikisan Air Glide float). Frames named as a configuration are game loadouts of a wiki frame.
- **Infantry:** Scout, Assault (+55% vs Armor and city defenses), Raider (5 movement). **Armor:** Line and Mainline
  (a kill grants one more shot per turn), Heavy and Super-heavy (range 1–2; fire again after every kill, the first
  also restores movement). **Artillery:** Fire support (range 1), Rocket (exactly range 2, 45% splash), Siege
  (exactly range 2, +100% vs cities). Artillery draws no counter-fire and cannot capture.
- Doctrines: Britannian Armor +8% damage, E.U. Artillery +10% damage, Federation Infantry 15% cheaper.
- 1–3 frames per unit (+70% HP, +45% attack per extra frame; each extra frame costs 85%). Veterancy 0–5 from kills.

### Map, terrain and the sea
- 180 × 76 wrapping hexes (2° per column, 74°N to 54°S; 13,680 hexes total), generated by `tools/build_map.py`. The denser grid keeps coastlines, islands and straits much closer to the WC4 world-map feel.
- Coastline pass (`HEX_LAND` / `HEX_SEA` in `tools/build_map.py`, exact hexes applied after the lon/lat lists): Cornwall
  and north-east Scotland, southern Kyushu, Shikoku/Kii and eastern Tohoku, Gujarat and Tamil Nadu, Galicia, Portugal and
  the Algarve, Korea's south-west coast, northern Norway and four Australian coasts are land; the Tsugaru Strait
  (Hokkaido is an island), the Gulf of Carpentaria, a north-east Iberian hex and a stray islet off Brittany are sea.
  Hexes that would bridge a strait at 2° per hex are left out (Italy's heel, India's tip, southern Sweden, western
  Kyushu, the Low Countries' coast); Kyushu stays joined to Honshu. Regenerate with
  `python3 tools/build_map.py --inject dist/engine/world.js`.
- Real coastlines (`REDRAW` in `tools/build_map.py`): the British Isles, Europe's Mediterranean and Iberian coasts
  (with the Adriatic, Balkans, Aegean and Bosporus), Korea, the Philippines and Sulawesi are rasterized from Natural
  Earth 1:10m land outlines (public domain), clipped to those regions in `tools/data/coast.json` by
  `tools/prepare_coast.py`. A hex there is land when a region-set share of its area is land (40% Europe, 45% Korea so
  the Korea Strait stays open, 30% for the island chains), sampled on ~50 points per hex. They overwrite the
  hand-drawn raster and `HEX_LAND`/`HEX_SEA` inside those regions. `FIX_LAND`/`FIX_SEA` apply last, for gameplay:
  Honshu joined to Hokkaido, Calabria land so Sicily stays joined to Italy (Messina closed), sea at Dover, the North
  Channel, the Bosporus/Dardanelles and the Dalmatian coast (so the Adriatic reaches Otranto), Taipei's old hex, the
  hex east of Chennai and southern Tamil Nadu, Iceland's Westfjords, and the Gulf of Suez (106,26), so Africa and Asia
  meet only by sea. Small Mediterranean islands drop out at these shares; Sardinia stays, given to the E.U. by
  `TERRITORY` in `world.js` (land hexes no city's territory reaches, assigned by hand).
- Coast hexes (`w` in `WORLD_ROWS`, terrain `coast`): part land, part water. Land units stand and fight there as on
  land (an embarked unit that reaches one lands; nobody embarks onto one), warships sail through them (never into a
  city), one unit per hex. Coast land belongs to a city province like any other land hex. `tools/coast_hexes.py` picks them from the drawn GSHHG
  coastline (sea hexes at least 15% land, land hexes under 50% land), skipping cities, ports, mines, starting units,
  the deliberate fix lists and the strategic straits, and only where the hex touches one stretch of shore, so coast
  never joins landmasses or opens a channel. `build_map.py` applies `tools/data/coast_hexes.json` last; older saves
  pick the hexes up in `migrateCoastalTerrain`. Cities, mines and starting armies are placed on solid land only.
- Map lock: `tools/data/map_locked.txt` is the approved map. `python3 tools/check_map.py` (run in CI) fails when a hex
  outside the `REDRAW` regions and fix lists changes, or when `world.js` is out of date with `build_map.py`;
  `--update` refreshes the lock after an approved change. `core.test.cjs` checks the islands, straits and joins
  gameplay relies on, and that every city sits within one hex of its coordinates. To redraw another region from real
  coastlines, add it to `REDRAW`, run `tools/prepare_coast.py` with ne_10m_land.geojson, then `build_map.py --inject`.
- Plains 1; forest 2 (−15% damage); mountains 2 (−25%); desert 1 (3% attrition); tundra 2 (2.5% attrition);
  Himalaya and Greenland ice cap impassable. Julius and float units ignore movement costs.
- **Movement rebalance for the denser world:** Conquest applies a +1 mobility bonus to every land unit after its
  frame-specific base move is calculated (so special/elite frames scale too). Campaign maps keep their original
  movement values. Typical Conquest movement is Scout 5, Assault 4, Raider 6, Line 5, Mainline/Heavy 4,
  Super-heavy 3, Support 3, Rocket 4, Siege 2. Weapon ranges are unchanged.
- **Sea:** stepping from land onto a sea hex embarks the unit (ends its move). Embarked units sail 5 hexes (+1/+2
  with Naval Transports), cannot fire or counter-fire, take +50% damage (+25% with Landing Craft), cannot repair or
  reinforce. Landing on a coast takes a step and ends the move.
- **Navies** (`NAVAL[side] = { amphibious, amphibious2, carrier }`, `navalTypes(g, side)`; Conquest only, outside the
  ten-class lineups, `naval: 'amphibious' | 'ship'` on the frame). Every power's equivalent units share one stat block
  (`AMPHIBIOUS`, `AMPHIBIOUS_II`, `CARRIER`); only names, models and art differ: Britannia's Portman, Portman II and
  Dreadnought-class Carrier-Battleship, the E.U.'s Panzer-Frosch, Panzer-Frosch II and Charlemagne-class carrier, the
  Federation's Shui Gun-Ru, Shui Gun-Ru II and Federation carrier. Each power starts with 4 carriers and 6 amphibious
  formations (`NAVY_DATA`) and 4 ports (`PORT_DATA`: two level 2, two level 1).
  - Amphibious (210/45/17; type II 260/55/22 with Aquatic Combat +15% from a sea hex): base move 1 (3 on land in
    Conquest), sea move 6/7 from one pool (`reachable`: a sea hex costs `landMove`, a land hex `terrain × seaMove`),
    so crossing the coast never ends the move. 10 at sea when starting next to a friendly carrier. +25% against
    embarked transports and warships. `atSea()` is false for naval frames: they fire and counter-fire at sea.
  - Carrier-Battleship (520/82/44, range 1–2, move 10, sea only, one per build, cannot be reinforced): `capacity` 2.
    It is `cls: 'support'` but overrides the class's `noCounter`: any unit with the range returns its fire.
    Moving a Knightmare onto it boards it (`move` returns `loaded`; the unit leaves `g.units` for `ship.cargo`, its
    action ends). `deploy(g, shipId, i, c, r)` launches onto an empty, non-enemy land hex next to the ship with a full
    move and attack; not on the boarding turn (`boardedTurn`), and no re-boarding after launching (`deployedTurn`).
    Sinking the carrier destroys its cargo; damage does not. `allUnits(g)` includes cargo.
  - Ports (`BUILDINGS.port`, `s.portLevel`, `s.portAt`, `s.portOwner`): a coastal city's port sits on one adjacent sea
    hex (`portSite`). Level 1 builds amphibious frames, level 2 carriers (they appear on or beside the port hex);
    naval units berthed there repair `PORT.repair` (10/20/30%, +10% for carriers with Damage Control). Capturing the
    city leaves the port with its old owner while that owner's ship sits in it; `beginTurn` hands it over once clear.
  - Naval research branch (`naval.*`): Naval Logistics (transports 6, then 7 with a level-3 port), Amphibious Systems
    (+1 sea), Landing Craft (+25% instead of +50%), Naval Gunnery (+15% carrier damage), Damage Control, Rapid Launch
    Systems (+10% on the first attack the turn a unit launches, level-3 port). `normalizeResearch` moves the old
    `sakura.transport` / `sakura.landing` levels over (applied in `applyTech`, `research` and the UI's profile load).
  - AI: ports (one level 2, up to three in all), a fleet of up to 4 carriers and 6 amphibious formations, and carrier
    operations (`aiCarrier`): a carrier waits off a coast where troops with nothing to attack on their landmass (or
    Infantry/Armor far from any target) gather; they board; once full or after three turns it sails for the best
    landing hex (`landingScore`: on an enemy landmass, no more defenders within 3 than it carries, near an undefended
    city) and `aiLaunch` puts every formation ashore and plays its turn. Damaged empty carriers go home to repair.
    Hard and Challenge keep navies naval (amphibious frames upgrade to type II; reinforcement copies are land units).
- **Strategic geography:** deterministic terrain anchors make the Alps/Carpathians, Caucasus, Urals, Zagros, Andes,
  Korea, Sahara/Arabia, Gobi/Taklamakan, Outback and Malay corridor meaningful. The Himalayas have an expanded
  impassable core with routes around the western/eastern ends.

### Cities and economy
- 149 cities: Britannia 39, E.U. 56, Federation 42, neutral 12. The political map follows the first season (2017):
  Russia, Siberia and the Balkans are E.U.; Euro Britannia's knights start on Britannia's Atlantic coast. Income: capital 65 (50 plus the 15 its old
  refinery exported), tier 3 30, tier 2 20, tier 1 12 credits; industry 6 per tier (capital 30). Defenses
  180/240/300 by tier, 400 for fortress cities, 600 for capitals.
- Buildings, each to level 3: Knightmare factory (unlocks tiers, +10 industry, +60 defense), research lab
  (+8 research), and a Sakuradite refinery only where there is a deposit. One unit per city per turn; new units act
  next turn. `recruitOptions` deploys a new unit only on the city hex (a naval unit only on the port's sea hex), so a
  unit standing there blocks production until it moves off (Elite Forces too). AI city guards stand beside their city
  until an enemy comes within 2 hexes of it, so they leave the factory free. Like a player, `aiProduction` step 1b
  first clears its factories: a ready unit standing on a quiet city gets its normal orders (`aiOrder`); on a city with
  an enemy within 2 hexes it steps to the best-cover hex beside it so the city can build another defender, but only
  when the side can pay for its cheapest unit (otherwise it holds the city). The UI animates these moves from
  `g.vacated`. In the UI, clicking a selected unit that
  stands on a city selects the city (and back), and the dock shows a City button for it.
- **Production Command (player Conquest only):** optional automation stored in `g.automation`. Each owned city has
  exactly one local choice: an exact normal unit type to auto-produce every turn, or Off for manual production. There
  are no per-city Balanced/Armor/Artillery/etc. policies and no per-city building toggles. Global settings control
  automatic building upgrades, 1–3-frame formation size and protected resource reserves. If a queued unit needs a
  higher factory or port, the global upgrader prioritizes that prerequisite; otherwise the queue simply waits and never
  substitutes another unit. Automation runs after income is collected at the start of the player's turn and calls the
  normal `buildReason/build` and `buyReason/recruit` paths, so Lab III timing, F.L.E.I.J.A. project locks, port
  rules, factory tiers and the one-unit-per-city limit cannot be bypassed. Protected credit/industry/Sakuradite reserves
  are checked before every purchase. Production Command can bulk-upgrade one factory/lab/refinery/port level in all
  eligible cities, clear all unit queues, run configured production immediately, or set a one-click F.L.E.I.J.A.
  reserve. One `AUTOMATED LOGISTICS` summary is logged/shown per run instead of per-city popups.
- **Starting front-line pass:** Normal conquest now begins with 38 Britannian, 47 E.U. and 40 Federation field units,
  concentrated around North America/Atlantic, Area 11, Europe/Mediterranean, Siberia, China/Korea, India/Iran and
  Southeast Asia instead of trying to garrison all 149 cities.
- **Starting balance:** the E.U. starts with 53 formations, the Federation 55 and Britannia 48 (`g.startUnits`). `CITY_TWEAKS`
  levels opening income at about 700 credits / 380 industry / 110 research for each power: ten secondary E.U. cities
  yield 14 / 8 instead of 20 / 12 and thirty peripheral ones (Siberia, the North Atlantic, Africa) 8 / 4 / 1 instead of
  12 / 6 / 2; eleven secondary Britannian cities and Hong Kong, Chongqing and Wuhan yield 25 / 15 / 4 instead of
  20 / 12 / 3. The Federation's western and northeastern frontier
  cities (Tehran 380, Kabul, Tashkent, Almaty, Urumqi, Ulaanbaatar, Harbin, Vladivostok 300) start with stronger defenses,
  and five extra 2-frame formations hold those fronts.
- **AI world-scale tuning:** threat/guard/search radii are enlarged for 180 × 76. Overseas offensives assemble nearby
  land units at coasts, count embarked escorts toward the convoy, reward coordinated embarkation and strongly prefer
  landing once a viable coast is reached. Sea transitions are also less over-penalized in the strategic goal field.

### Sakuradite (the fourth resource)
- Engine block "Sakuradite" (above `beginTurn`): `SAKURADITE` (starting stockpile 100, extraction
  `[0.25, 0.5, 0.75, 1]` by refinery level, 15 export credits at level 3, `cost` by class — raider 2, medium and
  rocket 3, heavy 5, siege 8, super 10 — `elite` by rarity 5/10/15, and `allocation`) and `RESOURCE_SITES`
  (`[name, lon, lat, base, starting refinery, terrain]`). Frames can override the class cost with their own
  `sakuradite` (Type II amphibious 3, Carrier-Battleship 15). All numbers are balance values.
- International allocation: `depositShares(g, d)` splits a deposit's extraction. A Japanese deposit
  (`SAKURADITE.allocation.sites`) held by a live major power gives 20% to each other surviving major and the rest
  (60%) to the controller; a surrendered power's share stays with the controller; neutral-held deposits, other
  deposits and campaign maps go wholly to the owner. `income()` sums the unrounded shares, adds
  `SAKURADITE.national` (5 for every surviving major power in Conquest, tied to no deposit) and rounds once. Opening
  income: 25 Britannia / 21 E.U. / 21 Federation.
- `g.sites`: `{ id, name, c, r, base, city, owner?, refinery? }`. A deposit whose hex holds a city is worked from it
  (`city` = station id; the city's `refinery` building sets extraction and the deposit changes hands with the city).
  Otherwise it is a mine on its own hex (`city: null`, own `owner` and `refinery`), seized by Infantry or Armor moving
  onto it (`seizeDeposit`, called from `move()`; the result carries `seized`). Mines have no defenses.
- Placement: Mount Fuji (40, set just west of Tokyo so it is its own mountain hex, refinery 1 at the start), Hokkaido
  (15, Sapporo), Kyushu (15, Fukuoka), Stonehenge (20, London, refinery 1), Rocky Mountains (10, own hex), Qaidam Basin
  (20, own hex, refinery 1). Japan = 70 of 120.
- Economy: `economy[side].sakuradite`; `income()` adds `sakuradite`; `price()` adds `sakuradite` (by class, extra frames
  at 85%, the Federation's Infantry discount applies); `spend()` deducts every resource; `shortfall()` names
  Sakuradite. Helpers: `depositHost`, `depositOwner`, `depositOf(g, city)`, `siteAt`, `depositYield`, `cityYield`,
  `refineReason`/`refine` (mines on their own hex). A surrendering power's mines and half its stockpile pass on.
- AI: mines seed `goalField` (Fuji −5, nearly a capital's −6; others −1); `assignGuards` keeps a guard on Fuji and up to
  two on any threatened mine; moving onto a rival mine scores +550 (Fuji) / +250; refinery upgrades come first each
  turn; lighter frames leave Sakuradite for one heavy frame once a level-3 factory exists; super-heavy saving only
  starts with the Sakuradite in hand; tier-I frames are fallbacks when Sakuradite runs short.

### F.L.E.I.J.A. (the superweapon)
- Engine block "F.L.E.I.J.A." (after the Sakuradite block): `FLEIJA` holds every number (blast `radius` 2, `cost`
  1,800 credits / 450 industry / 300 research / 150 Sakuradite, `turns` 4, `lab` 3, `labTurn` 15,
  inner-ring `ringHP` 0.1, outer-ring `outerHP` 0.55 and `outerShield` 0.35,
  `aiThreshold` 1500). Ground zero is erased, ring 1 is catastrophic, ring 2 is a weaker blast fringe.
  The Eliminator protection radius is 3 on the high-resolution world.
- Access: F.L.E.I.J.A. is conquest-only and has no HQ node. Research Lab III unlocks on turn 15 for every major power;
  `hasFleija(g, side)` uses that same universal turn gate, while `projectReason` still requires Lab III in the city.
- State: `s.project = { side, started, ready }` on a city; `g.arsenal[side]` warheads; `g.launched[side]` the turn
  of the last launch; `g.fleijaDetonated` is the turn of the first successful blast
  (`true` in older saves) and `eliminatorTurn(g)` = that + `ELIMINATOR.research` (3);
  `s.eliminatorProject = { side, started, ready }` and `s.eliminator = 1` hold the defensive project/charge;
  `g.ruins` lists the cities destroyed this conquest (`{ name, c, r, owner, capital, turn }`, drawn by the renderer and
  described in the terrain panel); `g.launches` (this AI turn's strikes, played
  by the UI like `g.strikes`). Tile terrain `crater` (movement 2, no cover).
- Rules: `projectReason`/`startProject` (logs the INTELLIGENCE line), `cityBusyReason` blocks units and buildings in
  a city with a project, `strategicTurn` (called from `beginTurn`) completes warheads, `dropProject` on capture,
  destruction or surrender (`annexStrategic` also empties the loser's arsenal).
  `launchReason`/`launch(g, side, c, r)`: no limit a turn, from any owned city (the nearest is the visual origin);
  a power cannot strike its own last city.
  `blastArea(g, p, radius)` is the target plus `radius` rings. Ground zero: units killed, a city destroyed for
  the rest of the conquest (`destroyCity`: it leaves `g.stations` and becomes an entry in `g.ruins`; project,
  Eliminator and automation entry dropped; its deposit too), a deposit
  removed from `g.sites` (`destroyDeposit`; the result lists them in `depleted`), a permanent crater. A rival whose
  last city was erased surrenders to the launcher. Ring: units to 10% and their morale floor; cities
  `ruin(…, 1)` (defenses 0, one level off each building and the output it added, never below founding values from
  `CITY_DATA`). A factory at level 0 is rebuilt for 110 credits / 25 industry.
- F.L.E.I.J.A. Eliminator: `ELIMINATOR` is conquest-only. The first successful F.L.E.I.J.A. detonation starts its
  research for every power; it becomes buildable `research` (3) turns later, announced by `strategicTurn`. A level-3 lab builds a charge for 1,200 credits / 300 industry / 250 research /
  60 Sakuradite over 3 turns; a power holds at most `ELIMINATOR.max` (3) charges, ready or under construction, one
  per city (`sideEliminators`). The completed charge is tied to its city and automatically intercepts one enemy
  warhead targeted within range 3; the attacking warhead and defensive charge are both consumed and no blast occurs.
  Capture, surrender or F.L.E.I.J.A. ruin destroys the project/charge. `eliminatorReason`, `startEliminator`,
  `eliminatorDefender` and `dropEliminator` implement it.
- AI: `aiLaunchTarget` scores units (price × health, ring 75%), cities by what the blast destroys (ground zero adds
  the city's output, +3000 if it is its owner's last city; projects +2000; a live capital in the inner
  ring +1500 only with the launcher's capturing units within 4 hexes), a rival deposit at ground zero 25 × its base,
  skips any blast touching its own units or cities and fires at 1500+. `aiProduction` step 0b launches every ready
  warhead. Step 2b: once Eliminators are available, it starts every charge it can afford up to the cap in
  `eliminatorCity` (a free lab-3 city outside its other charges' cover, capital first, then the richest) and saves for
  the next one before anything else; with no such city, step 3 raises a lab in `eliminatorCity(g, side, true)` first.
  Step 2c starts one warhead at a time in `fleijaCity` (best lab, then farthest from the enemy) once it holds the
  Sakuradite or earns 15+ a turn, with no wait after a launch, saving credits/industry when ready; step 3 begins
  preparing that city's lab five turns before turn 15, but Lab III itself cannot be built before turn 15.
  `aiLaunchTarget` prefers unprotected targets but will spend a warhead to burn an Eliminator protecting a target
  worth at least 1.5× the normal threshold. Rival strategic projects seed `goalField` at −8 (above capitals), attacks on them score
  +120 and a power guards its own project city like its capital.
- UI (`ui/hud.js`; `strategicText` in `ui/dialogs.js`): `arsenalButton` (top bar), `strikeMode` targeting with a blast preview, `confirmLaunch`,
  `launchAt`, `fleijaSequence` (the `#fleija-alert` warning in `index.html`, `SFX.play('fleija')`, the `flash`
  overlay and the `fleija` sphere effect; it plays for rival launches during `endTurn` even after Skip),
  `projectPanel` in the city panel, `strategicText` in World powers, ruins and project markers on the map.
  Eliminator projects/ready charges use cyan map rings; protected launch confirmations warn that the warhead will be
  consumed, and `fleijaSequence` shows a separate "F.L.E.I.J.A. eliminated" interception state instead of a blast.
- Fortress batteries on capitals and fortress cities (Tokyo Settlement, St. Petersburg, Gibraltar, Cairo/El Alamein,
  Liaodong, Singapore, Panama, Pearl Harbor): range 2 (+1 with Battery Overcharge), 60 + 10% of the target's maximum HP with no cap, always 2-turn recharge. Fortifications research adds 100 city defense HP per level (up to +500).

### Elite Forces
- Nineteen persistent single-frame hero units (`ELITE_FORCES`, frames `elite_*`), one HQ tab per faction:
  - Britannia (4): Cornelia's Gloucester (starter), Lancelot, Mordred, Lancelot Albion.
  - E.U. (5): Leila's Alexander (starter), Akito's Alexander Liberte, and Ryo's, Ayano's and Yukiya's Valiants.
  - Chinese Federation (5): Xu Lifeng's Chuyen (starter), Guren Type-01, Wang Hu, Akatsuki Zikisan, Shen Hu.
  - Black Knights (5, `availableTo: ['bk']`): Guren Mk-II, Tohdoh's Gekka (starter), Gawain, Shinkirō, Guren
    S.E.I.T.E.N. They fight in the Black Knights campaign; their fragments come from campaign first clears.
- Unlocked and levelled (1–5) in HQ with fragments: a Conquest victory pays the winner's Elite Forces, and a first
  campaign clear at each difficulty pays the mission side's. Signature abilities at Lv.3 and Lv.5; each deploys once
  per Conquest operation from the factory's Elite Forces tab. `applyElites` applies HQ levels to your own units only.
  `elitePrice` adds Sakuradite by rarity (`SAKURADITE.elite`: Rare 5, Epic 10, Legendary 15), independent of level.
  The E.U. and Federation elites reuse existing Alexander, Shen Hu, Chuyen, Guren and Zikisan sprites.

### Campaign
- Campaign-only sides `bk` (Order of the Black Knights, doctrine: +10% damage from forest, mountains or ruins) and
  `jlf` (Japan Liberation Front, 10% less damage in forest or mountains), never in Conquest (`MAJORS` is unchanged).
- Campaign-only frames (`campaign: true`): Burai, Akatsuki Flight-Enabled, Zangetsu, Raikō, Japanese battle tank and
  rocket artillery, Shen Hu, V.V.'s Siegfried, and Euro Britannia's Vercingetorix (Shin), Ahura Mazda (Ashley) and
  Canterbury siege gun.
- Campaign-only side `eb` (Euro Britannia, doctrine Knightly Orders: units led by a commander deal +10% damage), with
  `LINEUPS.eb` (Britannia's 2017 frames plus the Canterbury; three artillery frames: Liverpool, Sutherland Air, Canterbury). Like `bk` and `jlf` it never appears in Conquest. The 2010 Japanese battle tank is deliberately far weaker than even a Glasgow
  (120 HP / 28 attack / 7 armor / 2 move); Tohdoh's three-tank commander formation is the conventional force that can
  still contest a Knightmare unit. Named aces in missions are Elite Force frames at Elite level 3. `LINEUPS` gives the
  two new sides factory lineups; missions can override lineups (`g.lineup`) or restrict builds (`g.buildable`).
- Engine support: alliances (`g.teams`, checked with `foe()`), city-ruin (`u`) and crater (`c`) terrain, rule hooks
  (`hooks.turn/capture/kill/decide/objective/title`), AI production limited to `g.campaign.production`, defenders
  that hold near their post (`u.hold`), and campaign goals in the AI's goal field. F.L.E.I.J.A. projects are
  Conquest-only (`hasFleija`).
- `campaign.js` builds a mission (`createMission(id)`), runs its events (dialogue queue, reinforcements, landslides,
  Sakuradite eruptions and F.L.E.I.J.A. blasts with a warning a turn ahead, Gefjun Disturber shutdowns, frame
  upgrades, city shields), decides victory and defeat and grades 3 stars. A 1★ clear still unlocks the next mission.
  Each difficulty independently pays 60 tokens for its first clear and 30 per newly earned star, scaled by difficulty.
  Overall mission performance pays targeted Elite fragments once across all difficulties: 2★ gives 4 and 3★ gives
  another 10. Each campaign also has one-time star milestones at 50% (100 tokens), 75% (12 fragments for that
  campaign's featured Elite) and 100% (200 tokens + 20 featured-Elite fragments). `profile.campaign` stores overall
  best stars, `profile.campaignDifficulty` stores per-difficulty bests and `profile.campaignMilestones` stores claimed
  milestones. Missions unlock in order within a campaign; each campaign's first mission is always open. Ground-zero blasts kill outright
  (C.C.'s Code Bearer does not save her). `remove: [commanders]` takes a unit off the field without a loss or a kill
  (Kallen's capture at Xiaopei).
- Campaigns (`CAMPAIGNS` and `SEASONS` at the end of `missions.js`, assembled from mission ids so saved stars carry
  over):
  - Black Knights S1 (9): Shinjuku Ghetto, Lake Kawaguchi, Narita, Port Yokosuka, Rescue of Tohdoh, Shikine and Kamine
    Islands (the Gawain), Fukuoka Base (allied with Britannia against Sawasaki), Special Administrative Zone, Black
    Rebellion.
  - Britannia S1 (10): Invasion of Japan, Shinjuku, the Middle Eastern Federation's last stand (Area 18), Saitama,
    Narita, Port Yokosuka Blockade, Chofu Detention Center, Shikine and Kamine, Fukuoka Base, Black Rebellion.
  - Black Knights R2 (12): Battle of Babel Tower, Black Knights' Rescue Operation, Battle over the Pacific, Second Port
    Yokosuka, Skirmish at Zhengzhou, Xiaopei, Mausoleum of the Eighty-Eight Emperors, Geass Order, Kagoshima,
    Second Tokyo, Mount Fuji, Damocles. Kagoshima now correctly precedes the Second Assault on Tokyo Settlement.
  - Britannia R2 (11): Return of the Black Knights, Pacific, Second Port Yokosuka, Xiaopei, Mausoleum, Kagoshima,
    Second Tokyo, Second Battle of Kamejima Island / Ragnarök, Emperor Lelouch, Mount Fuji, Damocles.
  - Euro Britannia (8): Narva, Slonim, European Front (`br6`, Kingsley's offensive), Coup at Sankt Petersburg (Shin
    against Suzaku), the Gallia Grande, Siege and Assault of Castle Weisswolf, the Fall of Europia (2018, Paris).
  - E.U. (8): Narva, Ryo's Ambush, Slonim (orbital drop), Defense of Warsaw, the Gallia Grande, Siege and Assault of
    Castle Weisswolf, Smilas's Coup in Paris. Sources: Akito the Exiled and the Code Geass wiki's battle pages; the Fall
    of Europia follows the wiki's "E.U. Campaign" (Britannia's conquest of Europe in R2).
  - Air battles (Pacific, Damocles) are drawn as land maps of open sky and cloud. Naval battles put warships on
    single-hex gun fortresses; units cross the water as transports. New missions follow the Normal convention:
    `normalOnly` extra player formations and `skipNormal` enemy formations.
- Mission difficulty (`DIFFICULTIES` in `campaign.js`, chosen in the briefing): Normal keeps enemy units, city
  defenses and authored formation stack sizes at full/original strength. Its easier balance comes from selected
  difficult scenarios receiving a favorable force-count pass plus 50% more starting resources. Normal does not alter
  mission turn limits. Missions
  whose objective is simply to hold through a given turn keep no separate failure timer. Hard and Challenge reuse
  Conquest's enemy research, upgrades, reinforcements, ranks and income.
- Campaign maps keep the original movement, sea speed and AI search radii (`aiRange(g)`); the larger Conquest values
  apply to the 180 × 76 world only.
- Screens (`ui/campaign-screens.js`): a start-menu row opens mission select (tabs per campaign, locks, best
  stars), then a briefing (story, star goals, failure terms, forces, commanders, map preview). In a mission: a dialogue
  box plays `g.campaign.queue`, `campaignFeed()` turns `g.campaign.fx` into blast and Gefjun effects and flags new
  warnings (drawn as pulsing hexes), star chips beside the objective track each goal, and the result screen grades
  stars and offers retry or the next mission. Campaign maps do not wrap: the camera clamps to the map and zoom 1 fits
  it. A mission saves under its own key (`knightmare-conquest-mission`), so it never replaces the conquest save.

### Commanders
- 58 commanders. Conquest's 35, plus the commander expansion (Zero, Kallen, Tohdoh, C.C., Ohgi, Chiba, Asahina, Senba,
  Urabe, Sugiyama, Minami, Tamaki, Katase, Inoue for the Black Knights and JLF; Villetta, Kewell, Monica, Dorothea,
  Nonette, Manfredi, Farnese and Augustus for Britannia) and campaign-only Emperor Lelouch.
- Black Knights and JLF commanders have their own HQ tab and, in Conquest, lead Chinese Federation units
  (`ALLIES = { cf: ['bk', 'jlf'] }`, `serves(k, side)` in `assignReason` and the UI's assignment list).
- Their signature skills (engine block "Black Knights and JLF commanders", first-pass numbers): Zero's Tactical
  Command (`action.kind: 'command'`, `feint(g, id, targetId)`, `commandTargets`; the AI uses it after Zero's own
  orders), Kallen `ace`, Tohdoh `miracle`, C.C. `undying` (`kill(…, force)` skips it for F.L.E.I.J.A.) with floor −2,
  Ohgi `organizer`, Chiba `artist`, Asahina `followUp` (reads `u.struck`), Senba `guard` (needs `u.held`, set at turn
  start and cleared by `move()`), Urabe `lastStand`/`martyr`, Sugiyama `specialOps`, Minami `spotter`, Tamaki
  `charge`, Katase `prepared`, Inoue `logistics` (`reinforceCost(type, g, side, u)`).
- A fourth rating, **Mobility** (1–6 stars), replaces fixed movement bonuses: 3★ +1 movement up to 6★ +4.
- Starters Suzaku and Cornelia (Britannia), Leila and Akito (E.U.), Xingke and Xianglin (Federation).
  Recruit prices 400 / 300 / 200 tokens by stars. Eleven ranks from Second Lieutenant (112% frame) to Marshal (160%).
  Branch stars (Infantry, Armor, Artillery, Mobility) up to 6; medals as in Galactic Command.
- Operation commanders on the map: Bismarck, Suzaku, Cornelia, Shin, Julius, Ashley (Britannia); Smilas, Akito,
  Leila, Ryo, Ayano (E.U.); Xingke, Cao, Hong Gu, Xianglin, Lei Feng (Federation).

### HQ research, tokens, difficulty
- 40 technologies in six trees: Infantry (9), Armor (9), Artillery (7), Sakuradite (4: VARIS Rifles, Blaze Luminous
  Generators, Energy Filler Network, Float System), Naval (6, see Navies) and Cities (5). F.L.E.I.J.A. has no HQ node.
  Tiers II–IV after 2, 4 and 7 victories.
- Tokens only for the first win at each difficulty: 250 + 150 conquest + banked research (5 : 1, capped at 300),
  ×1.5 Hard, ×2 Challenge, +150 for the first win ever.
- Difficulty works as in Galactic Command, applied to both rival powers and the neutrals.

### Standing orders (player go-to)
- `u.goto = { c, r }` (saved with the unit). `setGoto` / `clearGoto` / `gotoReason` validate: warships need a sea hex,
  other non-amphibious units a land hex, and a route must exist (`goalField(g, side, [[dest, 0]], only)`).
  Routes stay on land when the destination is on the unit's landmass, keep warships at sea, and may embark otherwise.
- `runGotos(g, side)` runs in `endTurn` at the start of the player's turn, after city automation. Nearest orders go
  first; each unit moves to the reachable free hex with the lowest route cost, never attacks, and the order ends on
  arrival (or beside an occupied or defended destination). Its report (moved/arrived/blocked/lost) is animated and
  toasted.
- A unit on standing orders doesn't count as waiting for a manual move (`hasOrders`), so N and the end-turn
  reminder skip it unless it can fire.
- UI: `routing` (unit id) makes the next map click call `setGoto`. G or the dock/panel buttons enter it; Escape
  cancels. The map shows a gold ⚑ badge, a dashed route and a destination marker; `gotoText` and `gotoReportText`
  word it.

### AI
- `aiPlan(g, side)` runs once per AI turn: garrisons (`assignGuards`: the capital keeps 2–4 defenders), then in
  Conquest the theaters (`planFronts`). Campaign missions keep one side-wide `goalField`.
- Threats (`threatTo`): any enemy within 5 hexes. In Conquest a coastal city or mine is also threatened by a loaded
  carrier within its sail + 1, an amphibious frame within its sea move + 1, or an embarked transport within its
  sail + 1. Garrisons and defensive fronts both use it.
- In Conquest, fortress cities (the strait guns) and level-2+ naval bases always keep one land defender. Warships are
  never picked as garrisons.
- The geography pass opened the strategic straits (Malacca, Otranto, Danish Straits, Bosporus, Bab-el-Mandeb,
  Hudson, Tsugaru). At this scale the Malacca gap leaves Singapore on the Sumatra landmass, so it's an island
  fortress the AI holds, reinforces and attacks by sea.
- **Theaters (Conquest):** `frontObjectives` collects enemy cities within 20 hexes of own cities or units, every
  rival capital and F.L.E.I.J.A. project, Sakuradite mines (Fuji always), and own threatened cities, capital and
  mines. Objectives within 16 hexes cluster into fronts. Front ids are the anchor objective's key and re-form around
  old anchors, so they stay stable.
  - Each front is scored (best objective + half the rest; values in `frontObjectives`, minus distance from own cities)
    and sized (desired strength 1.5 × the enemy strength near its objectives; defensive fronts 1.2 × the menace less
    garrisons). Priority is discounted when half the army could not meet the need.
  - Strength is `unitStrength`: frames × health × generation, ×1.5 commanders, ×1.5 Elite Forces.
  - Fighting fronts: every emergency (threatened capital/project, or a defensive front under 60% of its menace) plus
    the four best others. A 10% reserve waits at the capital and is released to any emergency.
  - The rest of the army is split 50/25/15/10 by rank, capped by need. The front furthest below its target takes the
    nearest free unit.
  - Assignments are sticky for 4 turns (`g.ai[side].assignments`), unless the front is gone, the unit is 60+ hexes
    away, or a vital emergency within 15 hexes needs it. Front states live in `g.ai[side].fronts`.
  - Offensives stage at the own city nearest the target (the nearest coastal city when overseas) and stay
    ASSEMBLING until half the assigned strength is there (or ahead of it), or for 3 turns. Then ATTACKING, back to
    ASSEMBLING after losing 55% of the attack force. Opening an offensive on the player logs a dispatch.
  - Each front has its own lazily built `goalField(g, side, seeds)`: the rally city while assembling, otherwise its
    objectives (plus the enemy units menacing defended cities), and when attacking, other targets at +4 path cost.
  - Units ahead of an assembling rally hold their ground. A front still gathering keeps its troops ashore; one bound
    overseas lets a lone formation embark where no enemy is within 8 hexes.
  - Carriers carry only formations whose fronts head for the same landmass; idle ones wait off the best overseas
    rally city.
  - Tunables are in `FRONT` (exported); `aiPlan`, `unitStrength` and `FRONT` are exported for tests.
- `aiProduction`: batteries, repairs, saving for super-heavies (then the largest super-heavy formation affordable),
  one building upgrade, reinforcements, then production with no army cap; the treasury is the limit. Factories
  serving the front furthest below its need build first, and put what that front asks for (`frontNeeds`: by the
  enemy's and its own composition) at the top of their menu. Each factory builds a 3- or 2-frame formation of the
  first menu frame it can afford that way; a lone frame is built only when no factory can afford any formation that
  turn (otherwise the money is saved). Sakuradite held back for a project only blocks purchases that spend Sakuradite.
- `aiOrder`: moves along the unit's front field, scores attacks, and otherwise embarks only in convoys.
- In 25-turn all-AI simulations the Federation now survives to turn 25 in 11 of 12 games (it was always eliminated
  before); the E.U. still leads. Balance is first-pass.
- Balance is first-pass: in all-AI simulations any of the three powers can come out ahead depending on the seed.

## 5. Working with the owner

- Treat the owner as the commander: carry out requests fully and report plainly what changed.
- **Do not run tests or browser checks unless the owner asks.** Keep `core.test.cjs` and `ui-smoke.cjs` passing when
  rules change, since the owner may ask for a test run and deploys depend on them.
- Commit each completed request (push once a remote exists; deploys happen from `main`).
- Terminology: say **commanders** and **Knightmares / units**, not admirals or fleets. Britannia is the default side.
- Keep explanations short and concrete; tables are welcome for lists of changes.
- When numbers are first-pass balance guesses, say so so the owner can tune them.
