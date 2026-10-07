# Knightmare Conquest

A browser turn-based hex strategy game in the style of **World Conqueror 4**, themed on **Code Geass**. Three powers
fight a world war with Knightmare Frames: the **Holy Britannian Empire**, the **Europia United (E.U.)** and the
**Chinese Federation**. It is a sister project of *Galactic Command* (the LOGH game) and keeps the same systems.

## Features

- **Conquest on a full world map:** 270 × 114 hexes (30,780 total) that wrap east–west around the globe, 149 cities, WC4-inspired British Isles silhouettes and finer coastlines worldwide, strategically anchored mountain/desert bottlenecks, oceans, forests,
  mountains, deserts, tundra and the impassable Himalaya. Britannia holds the Americas, Area 11 (Japan) and
  Pacific bases; the E.U. holds Europe, Russia, Siberia and Africa; the Federation holds Asia from
  Tehran to Taipei. Australia and the Middle Eastern Federation are neutral and defend themselves.
- **Surrender at zero cities:** a power surrenders only when it has lost every city; its armies disband and its mines
  and half its stockpiles pass to the conqueror. A capital (Pendragon, Paris, Luoyang) is its richest city, not a
  knockout. Defeat every rival to win, or hold the most cities at the 120-turn armistice. Lose your last city and the
  war is lost.
- **Knightmares only, in three branches** (WC4's infantry, tanks and artillery), ten per power:
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
- **Sakuradite, the fourth resource:** mined at six deposits. Japan holds 70 of the world's 100 base output, as in
  the lore: the great mine on **Mount Fuji** (40 a turn, its own hex beside Tokyo), Hokkaido and Kyushu (15 each,
  worked from Sapporo and Fukuoka); Stonehenge (worked from London), the Rocky Mountains and the Qaidam Basin yield
  10. A refinery extracts 25% / 50% / 75% / 100% (+15 credits) of a deposit at levels 0–3. Mainline, raider and
  rocket frames cost 5 Sakuradite a frame, heavy and siege 10, super-heavy 25; tier-I frames need none. Mines have no
  defenses: Infantry or Armor seize one by moving onto it. Every power starts with 50. (First-pass numbers.)
- **F.L.E.I.J.A., the superweapon:** conquest-only rather than permanent HQ research. Research Lab III unlocks for
  every major power on turn 15; a city with a level-3 lab can then build a warhead for 1,800 credits, 450 industry,
  300 research and 150 Sakuradite over 4 turns, building nothing else meanwhile. Every power
  is alerted ("INTELLIGENCE: Strategic weapons research detected in …") and the AI goes for that city; capturing it
  ends the project. Launch from the arsenal button at any hex, once a turn: a full-screen warning, a white-pink
  flash and an expanding sphere. Ground zero: every unit erased, a city devastated for 10 turns (no defenses,
  buildings back to level 0, no output), the land turned into a crater. The ring: units left at 10% with collapsed
  morale; cities lose their defenses and a level of every building. On the world map the blast is the target hex
  plus one ring (a hex is ~330 km). After the first successful detonation, a level-3 lab can build one
  **F.L.E.I.J.A. Eliminator** charge per power for 1,200 credits, 300 industry, 250 research and 100 Sakuradite over
  3 turns. The charge is tied to that city, protects targets within 2 hexes and automatically neutralizes one
  incoming warhead; capture or ruin destroys it. The AI uses the same rules. (First-pass numbers.)
- **Sea transport (WC4-style):** a land unit steps onto a sea hex to embark and stops; embarked units sail 5 hexes a
  turn, cannot fire or return fire and take 50% extra damage; landing on a coast ends the move (and captures an
  undefended city).
- **Navies and ports (Conquest):** every power fields the same navy under its own names: amphibious Knightmares
  that fight at sea and cross the coast without stopping, and Carrier-Battleships whose two formations launch onto
  the beach ready to move and attack. Ports on coastal cities build and repair them; a Naval research branch improves
  them, and the AI carries out its own carrier invasions.
- **Standing orders:** select a unit, choose Set destination (or press G) and click any hex. It moves toward it at
  the start of each of your turns until it arrives; change the destination or stop it at any time on your turn.
- **Theaters (Conquest AI):** each rival groups its objectives into fronts, ranks them, keeps armies on a front for
  several turns, masses an offensive at a rally city before it attacks, holds a strategic reserve at its capital for
  emergencies, and has its factories build what each front needs.
- **Same systems as Galactic Command:** move once / attack once, one-click red-hex attacks with damage preview, undo
  move (Z), 1–3-frame units, veterancy, morale, terrain, counter-fire, breakthroughs, fortress batteries (40% of a
  frame, range 3), cities with factory and research lab (levels 1–3) plus a Sakuradite refinery where there is a
  deposit, repairs and reinforcement.
- **Production Command (Conquest):** each city can queue one exact normal unit to auto-produce every turn, or stay
  manual. Global controls handle building auto-upgrades, 1–3-frame formation size, bulk upgrades and protected
  credit/industry/Sakuradite reserves. A queue waits if its chosen unit is unavailable rather than substituting another
  frame, and all automated orders use the same legality checks as manual ones.
- **Commanders (WC4 generals):** 58 named commanders (22 Britannian, 11 E.U., 10 Federation, 14 Black Knights and JLF
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
- **Presentation:** WC4-style HUD, faction-coloured plates, HP rings, strength bars, commander portrait pins, a
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

With Node.js 22:

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
original and generated in code; imported images are credited in ASSETS.md. Gameplay draws on EasyTech's World Conqueror 4.
