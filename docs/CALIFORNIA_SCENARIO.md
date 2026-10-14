# Invasion of California — scenario delivery and audit

**Scenario ID:** `invasion-california`  
**Campaign objective:** `eu-california`, E.U. tier 5  
**Branch:** `scenario/eu-california` (unmerged from `feature/campaign-world-map`)

## Playable scope

- 160 × 120 north-up WGS84 hex grid, -127° to -112° longitude and 31.5° to 45° latitude. Southern Oregon provides a northern land approach; California is defended by Britannia.
- GSHHS intermediate-resolution shoreline sampling at **less than 20% land = sea; 20–80% = mixed coast; over 80% = land**. Connected Pacific coastal routes are retained. Its visual coastline uses the existing GSHHG atlas aligned to this geographic grid.
- 63 cities (12 E.U. Oregon staging settlements and 51 Britannian Californian targets), 21 independent capturable naval ports.
- Sierra Nevada, Cascades, Coast Ranges, Central Valley, Mojave and Colorado deserts, woodland, and named pass openings. Geographic river lines provide underlay context, not artificial naval canals.
- E.U. northern Army Groups plus four carrier-led Pacific invasions with embarked armies and amphibious escorts; Britannian fortified cities, inland reserves, naval squadrons and defensive groups.
- Existing AI's multi-front `europe` doctrine, standard faction frames, scenario research, capture rules and difficulty scaling, including Elite start conversions.
- Victory requires all hostile cities; no turn limit. California is **not** the campaign finale. The separate `eu-pendragon` tier-6 objective remains pending.

## Focused runtime audit

Created both playable factions on Normal, Hard, Challenge and Elite with the actual game engine. Audited hex movement and geographic access using the engine's adjacency and distance functions:

| Check | Result |
| --- | --- |
| Geographic terrain/shore mask | 19,200 tiles; 194 mixed-coast hexes |
| Land path from Medford to every city | Pass: 63/63 |
| City locations and unique occupied hexes | Pass: all dry land, no collisions |
| Port access to a navigable neighboring water hex | Pass: 21/21 |
| Ports reachable from E.U. offshore fleets | Pass: 21/21 |
| Starting ships on navigable Pacific water | Pass |
| Elite scenario conversion and Elite AI production | Pass: 164 starting Elite formations; naval carriers remain conventional |
| Early win detection | Pass: no premature victory at scenario creation |

The connected Pacific network reached 4,778 sea/coast hexes. 77 separate tiny water/coast components were not used for the fleet or any port; no objective depends on those isolated waters. The 20–80% classification itself is not modified by city/port placement.

## Multi-seed AI runtime exercises

Using engine `beginTurn`, `aiProduction`, and `aiOrder`, performed **12 initial runs** (Normal/Hard/Challenge/Elite × seeds 11, 71, 151), two turns per run with up to 24 actors per side per turn: **no runtime errors**, active amphibious disembarkations, land/naval movement, attacks and captures. Normal, Hard and Challenge seized Fort Bragg and Crescent City; Elite reached Santa Barbara.

A separate **six-turn** Normal run (seed 71; up to 32 actors per side per turn) completed without an error; E.U. cities grew from **12 to 20**. Captures included Crescent City, Yreka, Fort Bragg, Arcata, Ventura, Mount Shasta, Oxnard and Eureka, confirming northern inland advances alongside coastal attacks.

These are bounded engine-level simulation runs, not an exhaustive full-conquest balance proof or manual browser playthrough. Random seeds yielded identical early outcomes per difficulty under this deterministic opening.

## Registration and isolation

- Standalone Scenarios: `dist/scenarios-california.js`, loaded via `dist/index.html` and advertised in `dist/ui/scenario-screens.js`.
- Strategic Campaign: `dist/war-campaign.js` maps `eu-california` to `invasion-california` at tier 5 and leaves `eu-pendragon` as the separate tier-6 finale.
- Shared Elite eligibility expanded **only** to include the new scenario in both `src/engine/16-world-setup.part.js` and generated `dist/engine.js`; existing faction frame stats have not been changed.
- No regression tests added; branch left unmerged.

## Preview

Serve the `dist/` directory from this branch as a static website, then select **Scenarios → Invasion of California**. Campaign Mode obeys normal earlier-tier unlock prerequisites.
