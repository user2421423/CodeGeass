# Knightmare Conquest

A browser-based turn-based hex strategy game themed on **Code Geass**. Three powers
fight a world war with Knightmare Frames: the **Holy Britannian Empire**, the **Europia United (E.U.)** and the
**Chinese Federation**. It is a sister project of *Galactic Command* (the LOGH game) and keeps the same systems.

## Regional scenarios

The **Scenarios** menu contains fourteen independent regional wars. Each scenario
automatically saves progress in its own scenario slot (one active scenario save
at a time), separate from Conquest and Campaign. Scenarios do not import HQ
research or grant persistent HQ rewards. All use ordinary combat, city-based
province capture, and the regional AI. Normal, Hard, Challenge, and Elite are
available. Regional scenarios disable F.L.E.I.J.A. and generally end only when
one power, or an allied coalition where applicable, conquers its enemies.

| Scenario | Battlefield | Starting situation and objective |
| --- | --- | --- |
| **The Invasion of Japan** | 110 × 84 · 44 cities | Britannia (31 cities) and the Black Knights (5) are initially allied against China (8); the alliance dissolves on turn 10. Full conquest, not a turn-60 score. |
| **The Division of Japan** | 110 × 84 · 44 cities | Britannia, Europia United and China control central, northern and western Japan respectively; all are hostile from turn one. |
| **The European War** | 120 × 80 · 44 cities | Europia United defends 28 western and central European cities against Euro Britannia's 16 eastern cities. |
| **Operation Stonehenge** | 120 × 96 · 37 cities | Britannia starts with no cities, twelve loaded carrier-battleships and 25 amphibious escorts off the Atlantic coast; Europia United owns every city in Britain, Ireland, France, Iberia and the Low Countries. Only the two powers fight. |
| **The Bering Strait Crisis** | 120 × 80 · 28 cities | Britannia in Alaska and the Aleutians fights Europia United in eastern Siberia and Kamchatka, with naval assaults across the Bering Sea. |
| **Invasion of Siberia** | 160 × 88 · 49 cities | Britannia begins at eastern Siberian footholds and Pacific coast bases against the E.U.'s defended Lena, Yenisei and Trans-Siberian corridor. Total conquest with no turn limit; Arctic and Pacific ports are independently capturable. |
| **Invasion of South Africa** | 144 × 108 · 47 cities | Four Britannian carrier-led landing forces begin offshore with no cities. The E.U. holds Cape Town, Johannesburg, Pretoria, Durban and the wider southern African theatre, defending 16 ports and inland industrial centers. Capture every city, or as the E.U. defeat the cityless invaders. |
| **Crossing the Urals** | 120 × 90 · 40 cities | Britannia attacks the E.U. across the Ural mountain passes and industrial railway corridors. Complete city conquest without a turn limit. |
| **Invasion of Turkey** | 144 × 104 · 59 cities | Britannian armies and naval forces advance from Syria and Iraq into E.U.-held Turkey. The Bosporus and Dardanelles are navigable; total conquest wins. |
| **Panama Campaign** | 156 × 100 · 30 cities | Europia United starts with Caribbean and Pacific carrier fleets and no cities; Britannia holds fortified Panama, including canal locks and independently capturable ports. The canal links both seas, land crosses only at marked bridges, and all cities must fall without a turn limit. |\n| **Invasion of St. Petersburg and Moscow** | 128 × 88 · 41 cities | Britannian field armies advance from their Volga footholds against fortified E.U. Russian cities, culminating in Moscow and St. Petersburg. Complete city conquest wins. |
| **The Conquest of Indochina** | 120 × 104 · 44 cities | Britannia holds most of mainland Southeast Asia while the Chinese Federation invades from northern Vietnam and southern China. |
| **The Invasion of the Philippines** | 144 × 112 · 37 cities | China holds all 34 Philippine cities; Britannia starts from three offshore bases at Koror, Peleliu and Colonia and launches a carrier-supported naval invasion. |
| **The War for Australia** | 132 × 92 · 48 cities | Britannia holds eastern Australia (20 cities), China the north (14), and Europia the west (14); all three are hostile. |
| **The Conquest of Area 18** | 120 × 88 · 50 cities | Britannia fights Europia United and China across the Arabian Peninsula, Mesopotamia, Persia and the Levant. All three are hostile. |

The new Stonehenge map is cropped to Western Europe. Britannia receives an expeditionary stipend until it captures ports; old three-faction Stonehenge saves are not compatible.

The regional maps include separate terrain and coastline data, starting army
groups and fleets, functional ports and city economies. Their rules and
geography are covered by the dedicated tests in `tests/area18.test.cjs`,
`tests/australia.test.cjs`, `tests/bering.test.cjs`,
`tests/division-japan.test.cjs`, `tests/europe.test.cjs`,
`tests/indochina.test.cjs`, `tests/philippines.test.cjs`,
`tests/scenario.test.cjs`, and `tests/stonehenge.test.cjs`.
Longer AI playtests have dedicated tools and GitHub Actions workflows; a
successful regression test is not itself proof that a scenario is balanced.

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
  Regular units in each class now share the same gameplay profile across all three
  factions (including HP, attack, armor, movement and range); their names, sprites and lore differ.
  The regular Sutherland Air and Akatsuki Zikisan Air Glide use standard class movement despite
  their flight-themed designs. Elite Forces and scenario-only special units can have distinct
  mechanics. Named configurations (Close-Combat, Elite, Rocket, Missile, Heavy Weapons, Gun
  Battery) represent loadouts of existing frames. The Middle Eastern Federation fields Bamides.
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
- **F.L.E.I.J.A., the superweapon (Conquest only):** research-lab level III and
  strategic weapons unlock on turn 15 in the 2017 world conquest, or turn 5 in
  the 2018 U.F.N. conquest. A warhead costs 1,800 credits, 450 industry,
  300 science and 150 Sakuradite, and takes four turns. Each faction can hold
  **at most one** warhead in total, counting both ready stock and unfinished
  projects. In 2018, Britannia and Euro Britannia share a **single** warhead
  allowance, although their economies and conventional armies remain separate;
  a funded human Britannian player receives first claim over the allied AI.
  Rival warhead construction is public intelligence. Detonations destroy units
  and can permanently ruin cities, mines and terrain, with weaker effects in
  the surrounding rings.

  After the first detonation, **Eliminator research takes two turns**, followed
  by **two turns to build** a charge at a level-III lab. Each charge costs
  1,200 credits, 300 industry, 250 science and 60 Sakuradite. A faction may
  have up to three charges total, whether building, waiting in cities or
  carried by units. Ready Eliminators automatically intercept one hostile
  warhead targeted within their defensive radius; both the charge and the
  attacking warhead are spent. Charges can be handed to adjacent friendly
  units, carried into battle (including aboard carriers), and transferred
  at most once per turn. Rival defensive project sites and charge locations
  are classified from both the player and enemy AI. **Current implemented
  coverage is three hexes**, measured from the charge's city or carrier unit;
  this is the actual code value, not a five-hex radius.
- **Sea transport:** a land unit steps onto a sea hex to embark and stops; embarked units sail 5 hexes a
  turn, cannot fire or return fire and take 50% extra damage; landing on a coast ends the move (and captures an
  undefended city).
- **Navies and ports (Conquest):** every power fields the same navy under its own names: amphibious Knightmares
  that fight at sea and cross the coast without stopping, and Carrier-Battleships whose two formations launch onto
  the beach ready to move and attack. Ports on coastal cities build and repair them; a Naval research branch improves
  them, and the AI carries out its own carrier invasions.
- **Standing orders:** select a unit, choose Set destination (or press G), and
  click a hex. Units follow the route on subsequent turns; orders can be
  changed or cancelled.
- **Army Group Assault:** create a player army group and choose Advance,
  Assault or Hold Position. Assault plans and assembles around hostile
  objectives, assigns separate staging hexes, automatically fires legal
  attacks and captures cities when defenses fall. Advance moves without
  attacking; Hold Position disables group automation while preserving
  manually issued orders.
- **War Report:** a persistent, HUD-accessible report records turn-by-turn
  city changes, destroyed and produced units, damage, commander losses,
  landings, strategic weapons and economic activity. View the latest turn,
  territorial history, all-faction statistics and army-group performance;
  it does not interrupt every turn with a modal. Existing saves begin
  tracking from their first post-upgrade turn without fabricating history.
- **Strategic AI:** Conquest rivals group objectives into offensive and defensive
  fronts, assess threats and route-aware reinforcements, maintain persistent
  assignments and gather formations at rally points. Regional wars use
  scenario-specific doctrines, including multi-front commitments and limited
  transfers between theaters. The dedicated commander recovery planner and
  automatic city repair pass are enabled for Division/European-style scenario
  doctrines and specifically for the Philippines invasion. Other invasion-style
  `assault` doctrines retain their existing behavior.
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
- **Difficulty:** Normal, Hard, Challenge and Elite are available in regional
  scenarios, with upgraded or additional rival units, research, stronger
  commanders and resources according to the mode. Elite scenarios feature
  one-frame Elite Forces and enhanced opposing officers; Campaign reward
  rules remain separate.
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

The browser serves `dist/index.html` and the ordered classic JavaScript
scripts under `dist/`; no npm install or runtime bundler is required.

- `dist/engine.js`, `dist/engine/*.js` and `dist/engine/ai.js`:
  game rules, unit data, commanders, technology, AI and army groups.
- `dist/scenarios*.js` and `dist/*-landmask.js`: fourteen standalone regional
  scenarios, maps and starting armies. `dist/missions.js` and
  `dist/campaign.js` implement the story campaign.
- `dist/ui/*.js`: HUD, input, rendering, scenario selection, army-group
  controls, turns and `war-report.js`; `dist/game.js` starts the UI.
- `dist/art.js`, `dist/icons.js`, `dist/audio.js` and
  `dist/assets/art/`: art, icons, sound and finished image assets.

The large generated entrypoints (`dist/engine.js`,
`dist/engine/ai.js`, `dist/missions.js`, `dist/ui/renderer.js`,
`dist/ui/hud.js`) are built from editable `src/**/*.part.js` fragments.
After changing those fragments, run `node tools/build_sources.cjs` and commit
the regenerated `dist/` output. See [the source guide](src/README.md).

## Tests and simulations

The repository includes engine, AI, map, scenario, army-group, F.L.E.I.J.A.,
War Report, roster-parity and save-compatibility regression tests:

```sh
node tools/build_sources.cjs --check
node --test tests/*.test.cjs
node tests/ui-smoke.cjs
node tools/validate_assets.cjs --tracked
python3 tools/check_map.py
```

For longer gameplay/balance checks, see the scripts under `tools/` and
scenario-specific workflows in `.github/workflows/`. For example, a seeded
50-turn Philippines AI simulation:

```sh
node tools/philippines_balance_sim.cjs 11 50 britannia normal
```

Simulations measure observed outcomes, not guaranteed faction win rates;
repeat with multiple seeds, players and difficulties before assessing balance.

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


## Japan scenario notes

The original **Invasion of Japan** scenario uses a 110 × 84 north-up tactical
grid with 44 cities. Britannia begins with 31 cities, the Black Knights with
five, and the Chinese Federation with eight (all of Kyushu begins Chinese).
Britannia and the Black Knights start allied and become enemies on turn 10.
All three factions ultimately compete for **total city conquest**; an
incomplete war no longer ends in a 60-turn score or an earlier strategic
stronghold victory. This scenario saves automatically in the shared scenario
slot and does not overwrite Conquest or Campaign progress.

The **Division of Japan** is a separate 2017 alternate-history scenario with
the same 44-city map, three initially hostile powers, and persistent
multi-front AI. Both are covered by `tests/scenario.test.cjs` and
`tests/division-japan.test.cjs`.

For more representative results, use the current per-scenario and long-run
simulation tools rather than historical Japan balance tables from older
versions of the victory and economy rules.
