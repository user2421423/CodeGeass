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

**Campaign (in progress):** two story campaigns, the Black Knights (10 missions) and Britannia (11), on hand-built
tactical maps. The rules are done (`dist/campaign.js`, `dist/missions.js`, tested in `tests/campaign.test.cjs`);
the screens are not built and `index.html` does not load the two files yet, so players cannot reach it. See §4.

## 2. Running, testing and deploying

- **Run locally:** serve `dist/` with any static server (`python3 -m http.server -d dist`) and open it.
- **Tests (local only):** `node --test tests/*.test.cjs` (engine, campaign and artwork loading tests) and `node tests/ui-smoke.cjs`
  (loads all UI scripts in a stubbed DOM and clicks through every dialog and a rival turn for all three powers).
  Node 22. Node was not installed on the machine this was built on; the same tests were run through the macOS
  JavaScriptCore shell (`/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc`) with a
  small `require` shim.
- **Deploy:** `.github/workflows/pages.yml` uploads `dist/` to GitHub Pages on every push to `main` after engine, artwork-loading, UI smoke and tracked-asset checks pass.
- **Formatting:** Prettier with `.prettierrc` (`printWidth 120`, `singleQuote`, `arrowParens: avoid`).

### Artwork handoff status

Published artwork is tracked and deployed from `dist/assets/art/`: **45 Knightmare sprites (31 Conquest frames, 9
Elite Forces, 5 campaign frames) and 58 commander portraits**, registered synchronously by `manifest.js`. Source provenance and preparation details are recorded in
`ASSETS.md` and `sources.json`. The ignored `dist/local-art/` directory is only a local preparation/override
workspace and is never required by GitHub Pages. Every Knightmare type and commander has published art except the two
campaign-only Japanese Army vehicles (tank and rocket artillery), which use their drawings; procedural art is otherwise
only a runtime safety fallback.
To add or replace public artwork, prepare it locally, run `tools/publish_art.py`, validate, commit and push.

## 3. Code layout

Everything ships from `dist/`; there is no bundler. Scripts load in this order from `index.html`:

| File | Role |
|---|---|
| `dist/engine.js` | The deterministic rules engine (`window.Knightmare`, aliased `E` in the UI; `module.exports` for Node). No DOM. Factions, Knightmare classes and lineups, commanders, tech tree, terrain, combat, sea transport, economy, AI, the world map (`WORLD_ROWS`, `CITY_DATA`, `ARMY_DATA`, `GARRISONS`), profile/roster logic. Seeded LCG via `random(g)`. |
| `dist/art.js` | `ART`: procedural SVG for every Knightmare (`SPECS` body plans and paint), cities and original-design commander busts (`LOOKS`), cached as images for the canvas. Public images load synchronously from `assets/art/manifest.js`, built by `tools/publish_art.py`; drawn art remains the fallback. Optional localhost override: `local-art/manifest.json` (git-ignored folder `dist/local-art/`; `tools/local_art_prepare.py` turns raw files in `local-art/raw/` into game-ready images and runs `tools/local_art_manifest.py`) layers the owner's own files over the drawings via `ART.useLocal`. |
| `dist/icons.js` | `ICONS`: inline SVG sprite (credits, industry, research, Sakuradite, command token, attack/defense/move/range, factory, refinery, sea) and the HP ring. |
| `dist/audio.js` | `SFX`: Web Audio synthesized sounds per class and faction voice, Landspinner movement, MVS slash, batteries, the F.L.E.I.J.A. detonation. |
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
- Saves are gated by `RULES_VERSION` (currently 3) in `migrateSave`; bump it when save shape or rules change.
  Version 2 replaced the frame lineup and version 3 added Sakuradite. Version 2 saves are upgraded by `upgradeSave`
  (deposits placed, Sakuradite stockpiles added, refineries away from a deposit converted into the 15 credits a level
  they used to export); version 1 saves reference retired frames and are rejected.
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
  glass cannons, Panzer-Hummel armored and slow, Alexander Type-02 Elite faster and lighter; Sutherland Air and
  Akatsuki Zikisan Air Glide float). Frames named as a configuration are game loadouts of a wiki frame.
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
- 107 cities: Britannia 27, E.U. 43, Federation 29, neutral 8. The political map follows the first season (2017):
  Russia, Siberia and the Balkans are E.U.; Euro Britannia's knights start on Britannia's Atlantic coast. Income: capital 65 (50 plus the 15 its old
  refinery exported), tier 3 30, tier 2 20, tier 1 12 credits; industry 6 per tier (capital 30). Defenses
  180/240/300 by tier, 400 for fortress cities, 600 for capitals.
- Buildings, each to level 3: Knightmare factory (unlocks tiers, +10 industry, +60 defense), research lab
  (+8 research), and a Sakuradite refinery only where there is a deposit. One unit per city per turn; new units act
  next turn.

### Sakuradite (the fourth resource)
- Engine block "Sakuradite" (above `beginTurn`): `SAKURADITE` (starting stockpile 50, extraction
  `[0.25, 0.5, 0.75, 1]` by refinery level, 15 export credits at level 3, `cost` by class) and `RESOURCE_SITES`
  (`[name, lon, lat, base, starting refinery, terrain]`). All numbers are first-pass.
- `g.sites`: `{ id, name, c, r, base, city, owner?, refinery? }`. A deposit whose hex holds a city is worked from it
  (`city` = station id; the city's `refinery` building sets extraction and the deposit changes hands with the city).
  Otherwise it is a mine on its own hex (`city: null`, own `owner` and `refinery`), seized by Infantry or Armor moving
  onto it (`seizeDeposit`, called from `move()`; the result carries `seized`). Mines have no defenses.
- Placement: Mount Fuji (40, set just west of Tokyo so it is its own mountain hex, refinery 1 at the start), Hokkaido
  (15, Sapporo), Kyushu (15, Fukuoka), Stonehenge (10, London), Rocky Mountains (10, own hex), Qaidam Basin (10, own
  hex). Japan = 70 of 100.
- Economy: `economy[side].sakuradite`; `income()` adds `sakuradite`; `price()` adds `sakuradite` (by class, extra frames
  at 85%, the Federation's Infantry discount applies); `spend()` deducts every resource; `shortfall()` names
  Sakuradite. Helpers: `depositHost`, `depositOwner`, `depositOf(g, city)`, `siteAt`, `depositYield`, `cityYield`,
  `refineReason`/`refine` (mines on their own hex). A surrendering power's mines and half its stockpile pass on.
- AI: mines seed `goalField` (Fuji −5, nearly a capital's −6; others −1); `assignGuards` keeps a guard on Fuji and up to
  two on any threatened mine; moving onto a rival mine scores +550 (Fuji) / +250; refinery upgrades come first each
  turn; lighter frames leave Sakuradite for one heavy frame once a level-3 factory exists; super-heavy saving only
  starts with the Sakuradite in hand; tier-I frames are fallbacks when Sakuradite runs short.

### F.L.E.I.J.A. (the superweapon)
- Engine block "F.L.E.I.J.A." (after the Sakuradite block): `FLEIJA` holds every number (blast `radius` 1, `cost`
  1,800 credits / 450 industry / 300 research / 150 Sakuradite, `turns` 4, `lab` 3, `labTurn` 15,
  `devastation` 10, `ringHP` 0.1, `aiThreshold` 1500, `aiRest` 8). All first-pass.
- Access: F.L.E.I.J.A. is conquest-only and has no HQ node. Research Lab III unlocks on turn 15 for every major power;
  `hasFleija(g, side)` uses that same universal turn gate, while `projectReason` still requires Lab III in the city.
- State: `s.project = { side, started, ready }` on a city; `g.arsenal[side]` warheads; `g.launched[side]` the turn
  of the last launch; `g.fleijaDetonated` unlocks countermeasures after the first successful blast;
  `s.eliminatorProject = { side, started, ready }` and `s.eliminator = 1` hold the defensive project/charge;
  `s.devastated` / mine `d.devastated` = the turn output resumes; `g.launches` (this AI turn's strikes, played
  by the UI like `g.strikes`). Tile terrain `crater` (movement 2, no cover).
- Rules: `projectReason`/`startProject` (logs the INTELLIGENCE line), `cityBusyReason` blocks units and buildings in
  a city with a project or in ruins, `strategicTurn` (called from `beginTurn`) completes warheads and keeps ruins at
  0 defenses, `dropProject` on capture, ruin or surrender (`annexStrategic` also empties the loser's arsenal).
  `launchReason`/`launch(g, side, c, r)`: one a turn, from any owned city (the nearest is the visual origin).
  `blastArea(g, p, radius)` is the target plus `radius` rings. Ground zero: units killed, city `ruin(…, Infinity)` +
  10 turns devastated (owner unchanged), mine refinery 0, crater. Ring: units to 10% and their morale floor; cities
  `ruin(…, 1)` (defenses 0, one level off each building and the output it added, never below founding values from
  `CITY_DATA`). A factory at level 0 is rebuilt for 110 credits / 25 industry.
- F.L.E.I.J.A. Eliminator: `ELIMINATOR` is conquest-only and unlocks only after the first successful F.L.E.I.J.A.
  detonation. A level-3 lab builds one charge per power for 1,200 credits / 300 industry / 250 research /
  100 Sakuradite over 3 turns. The completed charge is tied to its city and automatically intercepts one enemy
  warhead targeted within range 2; the attacking warhead and defensive charge are both consumed and no blast occurs.
  Capture, surrender or F.L.E.I.J.A. ruin destroys the project/charge. `eliminatorReason`, `startEliminator`,
  `eliminatorDefender` and `dropEliminator` implement it.
- AI: `aiLaunchTarget` scores units (price × health, ring 75%), cities by what the blast destroys (ruins score 0;
  projects +2000; a live capital +1500 only with the launcher's capturing units within 4 hexes), skips any blast
  touching its own units or cities and fires at 1500+. `aiProduction` step 0b launches; step 2b starts one warhead
  at a time in `fleijaCity` (best lab, then farthest from the enemy) once it holds the Sakuradite or earns 15+ a
  turn, saving credits/industry when ready and waiting `aiRest` turns after a launch; step 3 begins preparing that
  city's lab five turns before turn 15, but Lab III itself cannot be built before turn 15. After the first blast,
  AI powers prioritize one Eliminator charge and reserve its Sakuradite before resuming warhead production.
  `aiLaunchTarget` prefers unprotected targets but will spend a warhead to burn an Eliminator protecting a target
  worth at least 1.5× the normal threshold. Rival strategic projects seed `goalField` at −8 (above capitals), attacks on them score
  +120 and a power guards its own project city like its capital.
- UI (`game.js`): `arsenalButton` (top bar), `strikeMode` targeting with a blast preview, `confirmLaunch`,
  `launchAt`, `fleijaSequence` (the `#fleija-alert` warning in `index.html`, `SFX.play('fleija')`, the `flash`
  overlay and the `fleija` sphere effect; it plays for rival launches during `endTurn` even after Skip),
  `projectPanel` in the city panel, `strategicText` in World powers, ruins and project markers on the map.
  Eliminator projects/ready charges use cyan map rings; protected launch confirmations warn that the warhead will be
  consumed, and `fleijaSequence` shows a separate "F.L.E.I.J.A. eliminated" interception state instead of a blast.
- Fortress batteries on capitals and fortress cities (Tokyo Settlement, St. Petersburg, Gibraltar, Cairo/El Alamein,
  Liaodong, Singapore, Panama, Pearl Harbor): range 3, 40% of the target's frame, 2-turn recharge.

### Elite Forces
- Nine persistent single-frame hero units (`ELITE_FORCES`, frames `elite_*`): Cornelia's Gloucester, Lancelot,
  Guren Mk-II, Tohdoh's Gekka, Mordred, Gawain, Shinkirō, Lancelot Albion and Guren S.E.I.T.E.N. Unlocked and
  levelled (1–5) in HQ with fragments earned from victories; signature abilities at Lv.3 and Lv.5; each deploys once
  per operation from the factory's Elite Forces tab. `applyElites` applies your HQ levels to your own units only.

### Campaign (rules done, screens not built)
- Campaign-only sides `bk` (Order of the Black Knights, doctrine: +10% damage from forest, mountains or ruins) and
  `jlf` (Japan Liberation Front, 10% less damage in forest or mountains), never in Conquest (`MAJORS` is unchanged).
- Campaign-only frames (`campaign: true`): Burai, Akatsuki Flight-Enabled, Zangetsu, Raikō, Japanese battle tank and
  rocket artillery, and Shen Hu. Named aces in missions are Elite Force frames at Elite level 3. `LINEUPS` gives the
  two new sides factory lineups; missions can override lineups (`g.lineup`) or restrict builds (`g.buildable`).
- Engine support: alliances (`g.teams`, checked with `foe()`), city-ruin (`u`) and crater (`c`) terrain, rule hooks
  (`hooks.turn/capture/kill/decide/objective/title`), AI production limited to `g.campaign.production`, defenders
  that hold near their post (`u.hold`), and campaign goals in the AI's goal field. F.L.E.I.J.A. projects are
  Conquest-only (`hasFleija`).
- `campaign.js` builds a mission (`createMission(id)`), runs its events (dialogue queue, reinforcements, landslides,
  Sakuradite eruptions and F.L.E.I.J.A. blasts with a warning a turn ahead, Gefjun Disturber shutdowns, frame
  upgrades, city shields), decides victory and defeat, grades 3 stars and pays tokens (first clear 60, 30 per new star;
  progress in `profile.campaign`). Missions unlock in order.
- Still to do: the Campaign tab, mission select and briefing, the dialogue box, blast and warning effects, the star
  results screen, a camera for small non-wrapping maps, and loading `missions.js` and `campaign.js` in `index.html`.

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
- 36 technologies in five trees: Infantry, Armor, Artillery, Sakuradite (VARIS, Naval Transports, Landing Craft,
  Blaze Luminous, Energy Filler Network, Float System, F.L.E.I.J.A.) and Cities. Tiers II–IV after 2, 4 and 7
  victories.
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
