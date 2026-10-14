# Battle of Luoyang — World Campaign finale

**Branch:** `scenario/bf-luoyang` (from `feature/federation-war-campaign-structure`)  
**Scenario ID:** `battle-luoyang`  
**Files:** `dist/scenarios-luoyang.js`, plus registration in `dist/index.html` and the standalone Scenarios menu in `dist/ui/scenario-screens.js`.  
**Campaign status:** standalone-ready; the central World Campaign registry retains its planned/null scenario ID until separate integration. The existing Luoyang Story Mode mission is unchanged.

## Battlefield and operational intent

- **174 × 116** inland regional hexes, **20,184** total, from 108.55°–118.45°E and 31.65°–38.20°N.
- **83 cities**, of which **52 begin under the Chinese Federation** and **31 under Britannia**. Luoyang, Zhengzhou, Kaifeng, Sanmenxia, Pingdingshan, Jiaozuo, Gongyi, Yanshi, Mengjin and many other towns anchor multiple successive defensive layers.
- **239 separately movable starting formations**, **142 Federation** and **97 Britannian**. Army Groups are editable with the existing destination UI and use standard faction types, stacks, equipment, production and combat.
- The northern assault approaches from Anyang/Handan/Hebi after the Korean operations. Southern axes deploy from Nanyang, Dengzhou, Xuchang and Luohe after South China/Yangtze victories. Eastern groups deploy at Shangqiu, Heze and Zhoukou; a western column attacks via Xichuan/Zhenping.
- The Federation holds a heavily fortified outer belt, a Yellow River line and a reinforced imperial heartland. **Luoyang's 880-point initial shield is finite** and uses standard shield/fortress mechanics, not invulnerability or an extra victory trigger.

## Geographic underlay

The regional scenario explicitly selects the **existing GSHHG atlas** with the centre-sampled geographic transform. Terrain uses the Taihang/Funiu/Qinling foothill highlands, the Songshan approaches, broad cultivated Henan plain, woodland and passable roads. The Yellow River has its own centreline-following playable inland water corridor. Its six dry strategic crossing hexes are at Sanmenxia, Mengjin, Gongyi, Zhengzhou, Kaifeng and Lankao. Existing embarkation/landing mechanics permit less safe crossings away from the designated bridgeheads; they are not an impassable wall. Secondary rivers (Luo, Yi, Qin and upper Huai) are geographical strokes only, not invented blocked waterways. There are no invented deep-water fleets or ports in central Henan.

## Static geography and integrity review

**Read-only geometry and data inspection; no turn simulations, battle tests or regression test files.**

- All **83** geographic city records have unique names, valid factions and coordinates inside the theatre bounds.
- All **61** starting formation definitions reference an existing, appropriately owned staging city, an existing unit class and an existing commander where named.
- The rasterized Yellow River occupies **170 tactical hexes before** the six dry bridge/ford cells are cleared (**164 water hexes afterward**).
- All six bridge cells lie precisely on the river raster. Each has dry neighbours **on both banks**, with no artificial permanent obstruction of the crossing.
- The steepest impassable mountain zones cover approximately **1,031 hexes** before road openings; the dry non-peak land and the bridging system form **one connected land component**, containing all cities.
- Every city is placeable on an unoccupied passable hex; the largest nearest-dry-cell adjustment is **3 hexes**, confined to steep terrain or dense neighboring settlements.
- Luoyang explicitly uses the **canonical 2017 Chinese Federation lineup** (including native Chuyen super-heavy and Gun-Ru siege/rocket artillery), avoiding the engine's generic Britannian fallback for world-only Chinese variants. No global roster or unit stats were changed.
- The shared four-difficulty Elite scenario logic was extended to `battle-luoyang`, with Britannian and Federation Elite rosters, the existing rival commander rank rules, and Xingke's Shen Hu signature mapping.
- The existing AI has a new scenario-gated Federation garrison planner for Luoyang and its threatened approaches. Unassigned reserves remain under the ordinary multi-front offensive AI; lost cities release their defenders to retake positions.
- Victory is checked only when **one faction owns every city**. No turn limit, scripted unit spawning, hidden combat buffs, unique production costs or changes to global unit balance.

## Scope and limitations

This is a **static map/pathfinding audit**, not a combat-balance claim. We intentionally did **not** run AI-vs-AI seeds, turn simulations, automated tests or a live browser playthrough. The full tactical quality of Elite AI, multi-turn reserve reactions, and economic balance cannot be certified without playtesting. The central World Campaign registry has deliberately not been updated or merged, as requested.
