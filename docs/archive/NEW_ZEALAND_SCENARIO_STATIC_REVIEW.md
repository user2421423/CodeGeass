# Chinese Federation Invasion of New Zealand — static review

**Branch:** `scenario/cf-new-zealand`, based on `feature/federation-war-campaign-structure`  
**Runtime scenario ID:** `cf-new-zealand`  
**Registration:** standalone `E.scenarios.newZealand`, `E.scenarios.byId['cf-new-zealand']`  
**Status:** new standalone scenario code committed; **not merged**; central World Campaign registry unchanged.

## Scenario and playable geography

- 160 × 160 north-up, 25,600-hex, non-wrapping regional battlefield, WGS84 bounds 160.0–179.8°E and 32.0–48.8°S.
- Static shoreline mask generated from GSHHG intermediate coastline data; 37 sample positions per hex classify **<20% sampled land as sea**, **20–80% as mixed coast**, **>80% as inland land**. The original geography-derived row-major mask is embedded as run-length data in `dist/scenarios-new-zealand.js`.
- Static classification counts: **23,199 sea**, **352 mixed coast**, **2,049 inland land**. Non-sea terrain has three separate connected landmasses: **North Island 1,379 cells, South Island 1,002, Stewart Island 20**. The coast includes Cook Strait and both South Island coasts.
- The renderer's existing worldwide GSHHG **geographic underlay is explicitly enabled** for `cf-new-zealand` using the same geographic bounds/centre-sampled projection as the tactical hex grid. The gameplay hexes do not create the geographic shore outlines. Regional river polylines are rendered separately; rivers are illustrative geographic obstacles, not artificial navigable sea routes.
- Topographic terrain concentrates mountains in the **Southern Alps**, Fiordland and central North Island volcanic/highland regions; forests cover parts of the Northland, central North Island and West Coast, leaving the **Canterbury Plains** and eastern lowlands accessible.

## Static placements and access review

- **63 unique cities and fortified facilities**; includes every specifically requested city and the military facilities at **Whenuapai, Waiouru and Ohakea**, plus strategic ports at Picton, Lyttelton and Bluff. Wellington is the Britannian capital. All cities start Britannian, with **zero Federation city ownership**.
- **All 63 city anchors** can be matched to a distinct valid land/coast hex on their assigned physical island using static reproduction of nearest-hex and island labeling; none displaced by more than four hexes from its geographic coordinate. No city begins in water.
- **20 independent naval port hexes** can be assigned separately from city hexes and immediately adjacent to coastal land; all 20 are in the same contiguous open-sea component.
- Static sea classification produces one large connected open-water component (**23,198 cells**) and one isolated interior sea-classified hex near 174.73°E, 36.99°S within mixed coastal tiles. No starting fleet or port is anchored at the isolated cell. Ships use the connected open water and the normal coastal terrain rules; the isolated cell is not an inter-island water shortcut.
- All **seven Chinese expeditionary staging coordinates** fall on sea-classified hexes. The separate North and South Islands cannot acquire a land-only connection; Cook Strait remains an open-water crossing.

## Force balance and existing systems

- The Federation has **seven simultaneous offshore invasion fleets**, carrying **30 Chinese carrier-battleships**, **29 Chinese amphibious units** and **58 carrier-borne ground formations**. Cargo capacity totals **60 slots**, and each individual fleet's cargo count is within its own carriers' two-formation-per-ship capacity.
- Britannia begins with **38 defensive Army Group sources and 124 starting ground formations**, plus **59 naval formations in 18 squadrons** (including **27 carrier-battleships**). Defensive formations are dispersed among both islands and Stewart Island; key cities, Cook Strait, both coasts and mountain corridors have garrisons.
- The game uses standard faction-specific `E.typeFor` units, existing Chinese and Britannian named commanders, amphibious cargo/deployment, independent port capture, conventional defensive AI (`aiDoctrine:'europe'`), movement/pathfinding, economy and Army Group orders.
- Normal, Hard, Challenge and Elite are supported. On Hard/Challenge, rival forces and income scale through existing scenario patterns. The new runtime ID was added to the **source and generated engine** Elite eligibility/roster allowlists so the established China–Britannia Elite pipeline applies; carrier hulls remain standard.
- No scripted turn ceiling or scenario-specific AI cheats. Federation victory requires taking **all 63 Britannian cities**; Britannia wins on destruction of the invasion when no Federation troops remain and it holds all cities. The existing AI handles replenishment, strategic fronts, carrier landings, city guarding, naval interception and counterattacks.

## Files and integration boundaries

Scenario implementation: `dist/scenarios-new-zealand.js`  
Script loading: `dist/index.html`  
Standalone scenario selection: `dist/ui/scenario-screens.js`  
Geographical projection and river overlay: `dist/ui/geography.js`  
Elite scenario allowlists and side mapping: `src/engine/16-world-setup.part.js`, `dist/engine.js`

The World Campaign scaffold continues to reserve `federation-britannia-new-zealand` with a **null `scenarioId`**; later integration can set it to `cf-new-zealand` once the branch is reviewed/approved. **No edit was made to the central World Campaign registry.**

## Verification limits and follow-up risks

This review is **static**. No regression tests were added; no tests, game launches, AI turns or simulations were run, as requested. Actual AI amphibious synchronization, frame rate with ~25,600 hexes and hundreds of units, visual underlay at every zoom level, and in-game Elite conversions have therefore **not been dynamically verified**. The GSHHG coastline mask uses a 37-point *estimate* of clipped-hex land share, not exact polygon-area integration, so narrow fjords and small inlets remain discretization-sensitive. These are validation limits, not claims of observed runtime failures.
