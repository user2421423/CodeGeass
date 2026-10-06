# Knightmare Conquest

A browser turn-based hex strategy game in the style of **World Conqueror 4**, themed on **Code Geass**. Three powers
fight a world war with Knightmare Frames: the **Holy Britannian Empire**, the **Europia United (E.U.)** and the
**Chinese Federation**. It is a sister project of *Galactic Command* (the LOGH game) and keeps the same systems.

## Features

- **Conquest on a full world map:** 100 × 42 hexes that wrap east–west around the globe, 107 cities, oceans, forests,
  mountains, deserts, tundra and the impassable Himalaya. Britannia holds the Americas, Area 11 (Japan), Euro
  Britannia (Russia to Turkey) and Pacific bases; the E.U. holds Europe and Africa; the Federation holds Asia from
  Tehran to Taipei. Australia and the Middle Eastern Federation are neutral and defend themselves.
- **WC4 surrender rule:** when a power's capital falls (Pendragon, Paris, Luoyang) it surrenders: its cities pass to
  the conqueror and its armies disband. Take every rival capital to win, or hold the most cities at the 120-turn
  armistice. Lose your capital and the war is lost.
- **Knightmares only, in three branches** (WC4's infantry, tanks and artillery), ten per power:
  | Branch | Class | Britannia | E.U. | Federation |
  |---|---|---|---|---|
  | Infantry | Scout | Glasgow | Alexander Drone | Gun-Ru |
  | Infantry | Assault (+55% vs Armor and cities) | Gloucester | Amanecer | Guren Type-01 |
  | Infantry | Raider (5 move) | Gracchus | Alexander Type-02 | Chuyen |
  | Armor | Line | Sutherland | Estrella | Gekka |
  | Armor | Mainline | Vincent Ward | Alexander Valiant | Akatsuki |
  | Armor | Heavy (range 1–2) | Brighton | Alexander Redorga | Wang Hu |
  | Armor | Super-heavy (range 1–2) | Gawain | Alexander Liberte | Shen Hu |
  | Artillery | Fire support (range 1) | Liverpool | Gardmare | Guren Type-Hei |
  | Artillery | Rocket (range 2, splash) | Gareth | Panzer-Hummel | Zangetsu |
  | Artillery | Siege (range 2, +100% vs cities) | Zetland | Panzer-Wespe | Sutherland Sieg |
  The Middle Eastern Federation garrisons field the Bamides.
- **Doctrines:** Britannian Armor +8% damage; E.U. Artillery +10% damage; Federation Infantry 15% cheaper.
- **Sea transport (WC4-style):** a land unit steps onto a sea hex to embark and stops; embarked units sail 5 hexes a
  turn, cannot fire or return fire and take 50% extra damage; landing on a coast ends the move (and captures an
  undefended city).
- **Same systems as Galactic Command:** move once / attack once, one-click red-hex attacks with damage preview, undo
  move (Z), 1–3-frame units, veterancy, morale, terrain, counter-fire, breakthroughs, fortress batteries (40% of a
  frame, range 3), cities with factory / research lab / Sakuradite refinery (levels 1–3), repairs and reinforcement.
- **Commanders (WC4 generals):** 35 named commanders (14 Britannian, 11 E.U., 10 Federation), each with one signature
  ability: Suzaku's *Live On*, Cornelia's *Witch of Britannia*, Bismarck's *Excalibur*, Julius Kingsley's *Geass
  Command*, Leila's *wZERO Feint*, Akito's *Brain Raid*, Li Xingke's *Divine Tiger*, Zhou Xianglin's *Stratagem* and
  more. Operation commanders are fixed; your own commanders are recruited with command tokens, promoted through
  eleven ranks (frame 112%–160%), given branch stars (up to 6) and medals.
- **HQ research with command tokens:** 36 technologies in five trees (Infantry, Armor, Artillery, Sakuradite,
  Cities), tiers II–IV unlocked by victories, kept across operations and factions.
- **Difficulty:** Normal, Hard and Challenge, as in Galactic Command (rival research, upgraded and extra units,
  higher commander ranks, richer treasuries) with ×1.5 / ×2 token rewards.
- **Presentation:** WC4-style HUD, faction-coloured plates, HP rings, strength bars, commander portrait pins, a
  minimap, procedural terrain, original drawn Knightmares and portraits, synthesized sound, camera shake.
- **Your own art, locally:** drop images in the git-ignored `dist/local-art/` folder and run
  `python3 tools/local_art_manifest.py`; the game uses them on your machine and nothing is committed or deployed.
- **Rival turns:** off-screen rival moves resolve instantly; press **Skip** to finish a rival turn at once.

## Run the game

Serve `dist/` with any static server and open it, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Then open http://localhost:8000. Opening `dist/index.html` directly also works in most browsers. There is no build
step and no dependency.

## Tests (optional)

With Node.js 22:

```sh
node --test tests/engine.test.cjs
node tests/ui-smoke.cjs
```

## Map tools

`tools/build_map.py` rasterizes the hand-drawn continent outlines into the hex grid and can rewrite the generated
block in `dist/engine.js` (`python3 tools/build_map.py --inject dist/engine.js`). `tools/preview_map.py` renders the
grid to a PNG (needs Pillow).

Unofficial fan game based on Code Geass. Unit and character names follow the Code Geass wiki; all artwork is
original and drawn in code. Gameplay draws on EasyTech's World Conqueror 4.
