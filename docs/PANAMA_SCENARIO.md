# Panama Campaign — implementation and focused audit

**Branch:** `scenario/eu-panama` (based on `feature/campaign-world-map`)  
**Scenario:** `eu-panama` / **Panama Campaign**  
**Scope:** standalone Scenarios and E.U. Campaign Mode Tier 4. No changes to `main`, the global unit roster, or shared AI rules.

## Geography and water access

- Regional projection uses WGS84 bounds **84.35°W–76.75°W, 6.85°N–11.12°N**, on a **156 × 100** odd-row-offset hex grid.
- The independently stored 2-bit `dist/panama-landmask.js` uses GSHHG intermediate-resolution shoreline and **hex-area land coverage**: less than 20% land = sea, 20–80% = mixed coast, above 80% = inland terrain. The scenario converts inland samples into plains, jungle/forest or mountains in documented real-world regional belts.
- Terrain includes the Chiriquí highlands, Cordillera Central, jungles of Darién, coastal plains and both marine approaches.
- The **Panama Canal** consists of 17 connected navigable hexes from its Caribbean entrance through Gatún/Gamboa to the Pacific entrance. Canal water cells are `sea` and only two established canal crossings (Centennial Bridge and Bridge of the Americas) are `coast` for dual-use land and naval transit.
- Removing the canal route disconnects the Caribbean and Pacific navigable networks; adding it yields a finite ship path of **17** from the Atlantic to the Pacific mouth. The waterway does not carve through unrelated inland mountains or jungle.
- **30 occupied cities**, including Panama City, Colón, Balboa, David, Santiago, Gatún, Gamboa and Darién settlements. **14 independently capturable ports**, all adjacent to city hexes and connected to the navigable sea network. E.U. starts with no cities.

## Forces and AI

- Four named Europian expeditions launch from two Caribbean and two Pacific approaches, supported by **26 carriers** and **46 initially embarked ground formations**, plus amphibious escorts.
- Britannia controls every city, with fortifications at canal mouths and key locks, coastal naval squadrons, defensive Army Groups and mobile inland formations.
- Each army is organized in scenario groups; operational fronts prioritize Colón, Balboa and the western landings. The shared stateful European theatre doctrine coordinates air-sea lift, landings, rival troop concentration, defense, counterattacks and reinforcement. Canal guards are released to the mobile AI when their garrison city falls.
- **Normal, Hard, Challenge and Elite** are selectable; Elite converts starting combat formations to the factions' own eligible Elite Forces, leaving conventional carriers unchanged. No scripted turn limit. E.U. wins only after every Britannian city falls; Britannia wins when the invasion is destroyed without losing a city.

## Focused runtime checks (in-memory only; no regression tests added)

- Created all 8 combinations of both sides × four difficulties: **8/8 initialized**, with 30 cities, 14 ports, 46 initially carried units, and a navigable canal on each.
- Verified all 14 ports are on the same traversable maritime network. Verified the canal remains the only Atlantic–Pacific sea connection inside the regional map.
- Checked city/port occupancy, live ship route fields, dual-use bridge terrain, and **no premature victory on turn 1 or turn 1001**; capturing every enemy city does trigger the E.U. victory.
- Exercised multi-seed full two-side AI turns (including production and tactical orders):
  - Normal, seed 101, 3 turns: **315 moves, 69 attacks, 44 deployments, 6 E.U. cities captured**, no exceptions.
  - Hard, seed 202, 3 turns: **309 moves, 73 attacks, 45 deployments, 7 E.U. cities captured**, no exceptions.
  - Challenge, seed 303, 3 turns: **297 moves, 70 attacks, 42 deployments, 5 E.U. cities captured**, no exceptions.
  - Elite, seed 404, 9 turns: initial staging through turn 4, then first landings turn 5; **9 E.U. cities captured by turn 9**, no exceptions.
- Compiled updated UI and campaign registry JavaScript without syntax errors. Confirmed regular Campaign launch respects locked tiers while the Panama-only quick-play option launches a non-progressing preview.
- The existing repository test suite was not extended or changed. Browser visual verification still requires opening the public branch preview; runtime simulations above exercise the actual engine without browser UI.

## Play

- **Scenarios → Panama Campaign**: launch as Europia United or Britannia and choose difficulty.
- When earlier E.U. Campaign tiers are completed, normal Tier 4 Panama battles register wins toward the next tier.
