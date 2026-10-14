# Crossing the Urals: geographic and pathfinding audit

**Branch:** `scenario/britannia-urals`, based on `feature/campaign-world-map`.

## Checked map and setup
- The north-up theatre is **120 × 90**, with **10,800 connected traversable land hexes** from 51°E to 75°E and 49°N to 67°N.
- **40 city centres**, 17 Britannian and 23 E.U.; city geo coordinates are projected to the game's centre-sampled hex grid.
- **123 starting land formations** in **23 Army Groups**; no starting unit overlaps another, and every land province is assigned a city and faction.
- Terrain: **595 mountains**, **5,340 forests**, **4,865 plains**. There are no sea, off-map, or impassable-peak hexes.
- Six pass valleys provide faster corridors across the north–south Ural chain. Forest and mountain movement costs follow the existing engine.
- Eight displayed rivers (Kama, Chusovaya, Belaya, Ural, Iset, Tobol, Tura, Pechora), plus three named supply corridors, are grounded in the geography. River strokes are visual; they do not impede pathfinding.
- Coastline 20–80% audit is not applicable to this wholly landlocked regional map. No invented inland naval ports.

## Executed checks
Both factions were instantiated on Normal, Hard, Challenge and Elite. Every difficulty produced valid city/unit data and route-aware operational AI fronts with the European scenario doctrine. Elite conversion and save migration were checked. The starting land graph is connected and every city is reachable.

### Two-turn multi-seed AI smoke simulations
| Seed | Player | Moves | Attacks | Captures | Runtime errors |
|---|---|---:|---:|---:|---:|
| 11 | Britannia | 167 | 9 | 0 | 0 |
| 29 | E.U. | 164 | 7 | 0 | 0 |
| 71 | Britannia | 167 | 15 | 1 | 0 |

## Repeatable checks
`node --test tests/urals.test.cjs`

`node tools/urals_sim.cjs britannia normal 11 5`

`node tools/urals_sim.cjs eu hard 29 5`

Longer-run competitive balance is not established by these smoke tests.
