# Knightmare Conquest

A browser-based turn-based hex strategy game themed on **Code Geass**. Three powers
fight a world war with Knightmare Frames: the **Holy Britannian Empire**, the **Europia United (E.U.)** and the
**Chinese Federation**. It is a sister project of *Galactic Command* (the LOGH game) and keeps the same systems.

## Regional scenarios

The **Scenarios** menu offers two independent, single-session campaigns. Neither overwrites
persistent Conquest progress, and both use standard strategic AI and city-based province capture.

- **The Invasion of Japan** (110 × 84 hexes): the established Britannia,
  Black Knights and Chinese Federation scenario, including the turn-10 alliance change.
- **The European War** (120 × 80 hexes, 2017 a.t.b.): an alternate continental war
  inspired by *Akito the Exiled*. Europia United controls 28 western/central European cities;
  Euro Britannia controls 16 cities in eastern Europe, western Russia and the Black Sea
  theatre. Both powers are playable and hostile from the outset. The regional map has its
  own coastline, forests, mountains, city provinces, naval ports and starting fleets.
  A hundred starting formations include Leila, Akito, Ryo, Ayano, Yukiya and Smilas
  against Shin, Julius Kingsley, Ashley and Manfredi. The E.U. has more cities and
  higher initial economic income; Euro Britannia fields concentrated eastern spearheads
  and a larger starting treasury. The only victory condition is ownership of **all 44 cities**,
  with no scripted deadline. Normal, Hard and Challenge are available.

`dist/scenarios-europe.js` holds the self-contained scenario rules and
`dist/europe-landmask.js` contains a packed 120 × 80 European tactical coastline.
The landscape was sampled from the repository's pre-existing world geography and
European coastal polygon data; it does not request external mapping services.
Run `node --test tests/europe.test.cjs` to test its configuration and rules.

## Features

- **Conquest on a full world map:** 180 × 76 hexes (13,680 total) that wrap east–west around the globe, 168 cities, much finer coastlines, strategically anchored mountain/desert bottlenecks, oceans, forests,
  mountains, deserts, tundra and the impassable Himalaya. Britannia holds the Americas, Area 11 (Japan) and
  Pacific bases; the E.U. holds Europe, Russia, Siberia and Africa; the Federation holds Asia from
  Tehran to Taipei. Australia and the Middle Eastern Federation are neutral and defend themselves.
- **City-controlled provinces:** each initially owned land hex is permanently assigned to the nearest city of its starting faction. Capturing a city transfers its entire province, not neighboring cities' land; moving a unit or landing from a carrier does not repaint hexes. Destroyed cities pass their provinces to another surviving friendly city, and surrender transfers remaining territory to the victor. Previously saved conquests acquire city provinces on load.
- **Surrender at zero cities:** a power surrenders only when it has lost every city; its armies disband and its mines
  and half its stockpiles pass to the conqueror. A capital (Pendragon, Paris, Luoyang) is its richest city, not a
  knockout. Defeat every rival to win, or hold the most cities at the 120-turn armistice. Lose your last city and the
  war is lost.
- **Knightmares only, in three branches** (infantry, armor and artillery), ten per power:
  | Branch | Class | Britannia | E.U. | Federation |
  |---|---|---|---|---|
  | Infantry | Scout | Glasgow | Alexander Drone | Gun-Ru |
  | Infantry | Assault (+55% vs Armor and cities) | Gloucester | Estrella Close-Combat | Burai Kai |
  | Infantry | Raider (5 move) | Gracchus | Alexander Type-02 | Chuyen |
  | Armor | Line | Sutherland | Estrella | Gekka |
  | Armor | Mainline | Vincent Ward | Alexander Mass-Production | Akatsuki |
  | Armor | Heavy (range 1–2) | Vincent Commander Model | Panzer-Wespe | Akatsuki Command Model Zikisan |
  | Armor | Super-heavy (range 1–2) | Brighton | Alexander Type-02 Elite | Akatsuki Zikisan Air Glide |
  | Artillery | Fire support (range 1) | Liverpool | Gardmare | Gekka Rocket |
  | Artillery | Rocket (range 2, splash) | Sutherland Air | Panzer-Hummel | Akatsuki Missile |
  | Artillery | Siege (range 2, +100% vs cities) | Gareth | Panzer-Hummel Gun Battery | Akatsuki Heavy Weapons |
  Sutherland Air and the Akatsuki Zikisan Air Glide fly (they ignore terrain movement costs). Frames named as a
  configuration (Close-Combat, Elite, Rocket, Missile, Heavy Weapons, Gun Battery) are the game's loadouts of a wiki
  frame. The Middle Eastern Federation garrisons field the Bamides.
- **Doctrines:** Britannian Armor +8% damage; E.U. Artillery +10% damage; Federation Infantry 15% cheaper.
- **Sakuradite, the fourth resource:** mined at six deposits. Japan holds 70 of the world's 120 base output: the
  great mine on **Mount Fuji** (40 a turn, its own hex beside Tokyo), Hokkaido and Kyushu (15 each, worked from
  Sapporo and Fukuoka). Stonehenge (worked from London) and the Qaidam Basin yield 20 and start with a level-1
  refinery; the Rocky Mountains yield 10. As in the lore, Japan's output is allocated internationally: the power
  controlling a Japanese deposit keeps 60% of what it extracts and every other surviving major power receives 20%
  (a surrendered power's share stays with the controller). Every surviving major power also draws 5 a turn of its
  own, tied to no deposit. Opening income is about 25 Britannia / 21 E.U. / 21 Federation. A refinery extracts 25% / 50% / 75% / 100% (+15 credits) of a deposit at levels 0–3. Per frame:
  raider 2, mainline and rocket 3, heavy 5, siege 8, super-heavy 10; Type II amphibious 3, Carrier-Battleship 15;
  basic frames need none. Elite Forces cost 5 / 10 / 15 by rarity (Rare / Epic / Legendary), whatever their level.
  Mines have no defenses: Infantry or Armor seize one by moving onto it. Every power starts with 100. (Balance
  values, not canon quantities.)
- **F.L.E.I.J.A., the superweapon:** conquest-only rather than permanent HQ research. Research Lab III unlocks for
  every major power on turn 15; a city with a level-3 lab can then build a warhead for 1,800 credits, 450 industry,
  300 research and 150 Sakuradite over 4 turns, building nothing else meanwhile. Every power
  is alerted ("INTELLIGENCE: Strategic weapons research detected in …") and the AI goes for that city; capturing it
  ends the project. Launch from the arsenal button at any hex, as many warheads a turn as you hold: a full-screen
  warning, a white-pink flash and an expanding sphere. Ground zero: every unit erased, a city there destroyed for
  the rest of the war, leaving only ruins on the map (a power that loses its last city this way surrenders to the
  launcher; you cannot strike your own last city), a Sakuradite deposit there never
  produces again, and the land turned into a permanent crater. The ring: units left at 10% with collapsed
  morale; cities lose their defenses and a level of every building. On the world map the blast is the target hex
  plus two rings. The first successful detonation starts Eliminator research for every power; 3 turns later a
  level-3 lab can build a **F.L.E.I.J.A. Eliminator** charge for 1,200 credits, 300 industry, 250 research and
  60 Sakuradite over 3 turns; a power may hold up to three at once (ready or under construction), one per city. The
  AI builds them before anything else as soon as it can, and starts a new warhead as soon as it has fired the last.
  Each charge is tied to its city, protects targets within 3 hexes and automatically neutralizes one
  incoming warhead; capture or ruin destroys it. The AI uses the same rules. (First-pass numbers.)
- **Sea transport:** a land unit steps onto a sea hex to embark and stops; embarked units sail 5 hexes a
  turn, cannot fire or return fire and take 50% extra damage; landing on a coast ends the move (and captures an
  undefended city).
- **Navies and ports (Conquest):** every power fields the same navy under its own names: amphibious Knightmares
  that fight at sea and cross the coast without stopping, and Carrier-Battleships whose two formations launch onto
  the beach ready to move and attack. Ports on coastal cities build and repair them; a Naval research branch improves
  them, and the AI carries out its own carrier invasions.
- **Standing orders:** select a unit, choose Set destination (or press G) and click any hex. It moves toward it at
  the start of each of your turns until it arrives; change the destination or stop it at any time on your turn.
- **Theaters (Conquest AI):** each rival groups objectives into fronts, ranks them, retains armies on a front for
  several turns, and masses offensives at rally cities. Garrisons protect key locations; all remaining field units
  serve active offensive or defensive fronts. There is no strategic reserve or percentage cap on defenders.
- **Same systems as Galactic Command:** move once / attack once, one-click red-hex attacks with damage preview, undo
  move (Z), 1–3-frame units, veterancy, morale, terrain, counter-fire, breakthroughs, fortress batteries (60 damage + 10% of target maximum HP, no cap;
  range 2, or 3 with Battery Overcharge; always 2-turn recharge), cities with factory and research lab (levels 1–3) plus a Sakuradite refinery where there is a
  deposit, repairs and reinforcement.
- **Production Command (Conquest):** each city can queue one exact normal unit to auto-produce every turn, or stay
  manual. Global controls handle building auto-upgrades, 1–3-frame formation size, bulk upgrades and protected
  credit/industry/Sakuradite reserves. A queue waits if its chosen unit is unavailable rather than substituting another
  frame, and all automated orders use the same legality checks as manual ones.
- **Commanders:** 58 named commanders (22 Britannian, 11 E.U., 10 Federation, 14 Black Knights and JLF
  who lead Federation units in Conquest, and the campaign-only Emperor Lelouch), each with one signature ability:
  Permanent combat modifiers are visible separately under **Base stats**. Cornelia's speed comes from Mobility 6,
  while *Witch of Britannia* inspires adjacent allies after a kill. Bismarck anticipates the first attack each round;
  Julius designates targets, Leila enables coordinated withdrawals, Jeremiah cancels morale disruption and Rolo
  prevents counter-fire at an HP cost. Support, formation, pursuit, duel and siege skills give commanders distinct roles.
  See [the full commander rework](docs/COMMANDER_REWORK.md) for the 58-commander roster and exact starting values.
  Operation commanders are fixed; your own commanders are recruited with command tokens, promoted through eleven ranks
  (frame 112%–160%), given branch stars (up to 6) and medals.
- **HQ research with command tokens:** 40 technologies in six trees (Infantry, Armor, Artillery, Sakuradite, Naval,
  Cities), tiers II–IV unlocked by victories, kept across operations and factions.
- **Difficulty:** Normal, Hard and Challenge, as in Galactic Command (rival research, upgraded and extra units,
  higher commander ranks, richer treasuries) with ×1.5 / ×2 token rewards.
- **Campaign mastery rewards:** 1★ still clears a mission and unlocks the next. Reaching 2★ and 3★ for the first time across any difficulty awards story-relevant Elite Force fragments, while each difficulty keeps its own token rewards. Every campaign also pays one-time rewards at 50%, 75% and 100% of its total stars.
- **Presentation:** strategy HUD, faction-coloured plates, HP rings, strength bars, commander portrait pins, a
  minimap, procedural terrain, drawn fallbacks for every Knightmare and commander, published image support, synthesized sound, camera shake.
- **Published artwork:** finished sprites and portraits live in tracked `dist/assets/art/`. The startup manifest loads
  before the UI, with drawn art for missing or failed images. Raw downloads remain ignored. See **Publish artwork** below.
- **Rival turns:** off-screen rival moves resolve instantly; press **Skip** to finish a rival turn at once.

## Run the game

Serve `dist/` with any static server and open it, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Then open http://localhost:8000. Opening `dist/index.html` directly also works in most browsers. There is no build
step and no dependency.

## Code layout

Everything ships from `dist/` as plain scripts that `index.html` loads in order; there is no bundler.

- `engine.js`: the deterministic rules (combat, movement, economy, Sakuradite, F.L.E.I.J.A., standing orders,
  pathfinding). Its data lives in `engine/frames.js`, `engine/commanders.js`, `engine/research.js` and
  `engine/world.js`; `engine/ai.js` adds the rival AI. In Node, `require('./dist/engine.js')` loads all of them.
- `missions.js` and `campaign.js`: campaign missions and their rules.
- `art.js`, `icons.js`, `audio.js`: drawn art, icons and synthesized sound.
- `ui/*.js`: the interface, one file per system (core state, HUD, turns, dialogs, campaign screens, camera, effects,
  input, renderer); `game.js` starts it.

## Tests (optional)

The repository keeps only a small YAGNI-focused safety net: core engine/campaign integrity, one UI smoke path, and validation of the public assets that actually deploy.

```sh
node --test tests/*.test.cjs
node tests/ui-smoke.cjs
node tools/validate_assets.cjs --tracked
```

## Publish artwork

The live game ships 70 finished Knightmare sprites (Conquest, Elite Forces, campaign and naval frames) and
58 commander portraits. Credits and source provenance are in `ASSETS.md`
and `dist/assets/art/sources.json`. To update the artwork from local raw inputs or a processed bundle:

```sh
# Only needed when preparing raw downloads (requires Pillow and NumPy):
python3 tools/local_art_prepare.py
# Copies only finished images; never copies raw downloads:
python3 tools/publish_art.py
git add dist/assets/art
node tools/validate_assets.cjs --tracked
git commit -m "Publish finished Knightmare and commander artwork"
git push origin main
```

Use `python3 tools/publish_art.py --source /path/to/processed-art` for an extracted processed folder. Public image
filenames include content hashes so changed images cannot be confused with cached old versions. GitHub Actions
checks the game and every referenced public file before deploying. Raw sources remain local; finished public assets
are tracked. The saved face crops and enclosed-background seeds in `tools/art-crops.json` and
`tools/art-backgrounds.json` are the preparation defaults; local recipe files override them.

## Map tools

`tools/build_map.py` rasterizes the hand-drawn continent outlines into the hex grid and can rewrite the generated block
in `dist/engine/world.js` (`python3 tools/build_map.py --inject dist/engine/world.js`). `tools/preview_map.py` renders
the grid to a PNG (needs Pillow).

Unofficial fan game based on Code Geass. Unit and character names follow the Code Geass wiki; drawn artwork is
original and generated in code; imported images are credited in ASSETS.md.


## Scenario Mode: Japan invasion

The **Invasion of Japan** is a self-contained regional war opened from **Scenarios** in the main menu.
Before launching, choose Britannia, the Black Knights or the Chinese Federation, inspect the map,
and choose Normal, Hard or Challenge difficulty. There is no battle save/resume: Conquest and
Campaign saves are not affected and persistent HQ upgrades are not applied.

- **Map:** North-up, unrotated Japan on a tighter 110 × 84 tactical grid
  (9,240 hexes, approximately 1,341 land). The four main Japanese islands
  and selected Japanese offshore islets use detailed GSHHG coastlines.
  Korea, Russia, and other non-Japanese polygons are excluded from Scenario
  Mode without changing the global Conquest map. Scenario Mode starts
  zoomed in on the selected faction (Nagoya for Britannia, Kyoto for the
  Black Knights, Fukuoka for China). Exactly five rings of coastal sea hexes
  remain playable: 1,933 navigable sea tiles connect all nine ports and 14
  starting naval formations; 5,966 deep-ocean tiles become impassable
  background. Faction territorial colors, all 44 cities, and the navigable
  Kanmon Strait remain intact.
- **Starting factions:** Britannia 31 cities / 20 units (14 land, 6 naval), Black Knights 5 cities / 13 units,
  Chinese Federation 8 cities / 29 units. All cities and land on Kyushu begin Chinese.
  This includes 14 naval and 48 land formations.
- **Naval infrastructure:** 9 coastal ports, 14 starting warships/amphibious Knightmares;
  Mount Fuji, Sapporo and Fukuoka work Japan's three Sakuradite deposits.
- **Army groups:** 26 named starting army groups and fleets. During a scenario, open
  **Army Groups** to locate a formation or set a shared map-click destination for all
  reachable member units. Group orders use the normal standing-order route rules.
- **Diplomacy:** Britannia and the Black Knights begin allied. At the start of turn 10
  their alliance ends and all three powers become hostile.
- **Objectives:** faction-specific strategic stronghold and territorial goals, with
  a 60-turn regional score fallback. AI income and rival stacks scale by difficulty.
- **Implementation:** a dedicated regional-game initializer does not build the full
  Conquest world first. Scenario runs do not save or grant persistent profile rewards.

**Still to develop:** new scripted battles and uprisings, naval supply and reinforcement
routes (starting fleets are implemented), full economic and military balancing, extended
50–60-turn AI simulations, browser performance profiling, and final UX polish.

Automated regression coverage: `tests/scenario.test.cjs`.

### Japan starting-force balance check

Britannia's opening formations were reduced from **38 to 20 total**, retaining six naval
formations, four key named commanders and fourteen land formations. The Black Knights
remain on 13 and the Chinese Federation on 29 (62 formations total).

A baseline set of seven deterministic Normal-difficulty AI-vs-AI runs using multiple
seeds and player perspectives was completed after this change. In the three trials where
Britannia was the selected side, it met its victory requirements on turns 32, 38 and 47.
The remaining four trials ended with the selected BK/Chinese player eliminated while
Britannia held most of the Japanese cities; these are **not** proof of an overall Britannian
victory, because the current scenario engine closes a session on player elimination.

The previous (pre-rebalance) starting income was 554 credits / 301 industry for
Britannia, versus BK 96 / 49 and CF 100 / 55. Those **historical simulation
results do not apply to the newer economic balance**.

### Japan scenario economy (Normal difficulty)

| Starting economy (per turn) | Britannia | China | Black Knights |
| --- | ---: | ---: | ---: |
| Credits | 400 | 320 | 300 |
| Industry | 220 | 185 | 175 |
| Research | 42 | 34 | 32 |
| Sakuradite | 28 | 15 | 12 |

Starting stockpiles equal **four turns of China's income** and **two turns
for Britannia and the Black Knights**, across all four resources:

| Initial stockpile | Britannia | China | Black Knights |
| --- | ---: | ---: | ---: |
| Credits | 800 | 1,280 | 600 |
| Industry | 440 | 740 | 350 |
| Research | 84 | 136 | 64 |
| Sakuradite | 56 | 60 | 24 |
Japan city production runs at 40% of the base Conquest city yield; fixed
faction command funding brings total opening income to the targets above.
Unlike a flat income override, losing or capturing cities changes actual
income, while the external budget does not automatically follow captured
cities. Hard and Challenge increase rival income and starting stockpiles
together, preserving the four-turn Chinese reserve and two-turn reserves
for the other factions at every difficulty.

These values passed all scenario economic and capture regression checks.
Two preliminary 60-turn AI-vs-AI simulations of the revised economy finished
successfully: the Britannia-selected seed 101 game ended with a Britannian
armistice victory (32 cities at turn 60); the China-selected seed 202 game
ended with a Chinese strategic victory (30 cities at turn 60). These are
early smoke/balance indicators only: a larger multi-seed sample, including
Black Knights games, is still needed before calling the scenario balanced.
