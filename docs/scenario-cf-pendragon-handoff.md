# Dual Battle of Pendragon — scenario branch integration handoff

**Branch:** `scenario/cf-pendragon` (created from `feature/federation-war-campaign-structure`). **Do not merge as part of this handoff.** This branch intentionally changes only the two scenario modules and this handoff document.

## Implemented runtime contracts

| Mission | Scenario ID | Module | Attacker | Direction | Initial armies |
| --- | --- | --- | --- | --- | ---: |
| E.U. Pendragon — Eastern Offensive | `eu-pendragon` | `dist/scenarios-pendragon.js` | `eu` | Utah/eastern Nevada **westward** | 223 |
| Chinese Pendragon — Western Offensive | `cf-pendragon` | `dist/scenarios-pendragon-cf.js` | `cf` | California/western Nevada **eastward** | 234 |

Britannia starts with **288** units on the E.U. eastern map and **311** on the Chinese western map. These are independent tactical scenarios using the **same** WGS84 geographic city data, ridges, roads and imperial fortress coordinates.

### Fixed map geometry — both scenarios

- Tactical resolution: **180 columns × 126 rows**, staggered pointy-top hexes, land theatre.
- WGS84 map bounds: **west -121.25°, east -111.55°, north 41.05°, south 34.80°**.
- Projection: `{centerLon:-116.4,centerLat:37.925,angle:0,uMin:-4.85*cos(37.925°),uMax:4.85*cos(37.925°),vMin:-3.125,vMax:3.125}`.
- Established fictional capital remains at **Pendragon (-117°, 37.5°)**.
- Existing imperial fortification coordinates unchanged: Imperial Citadel (-117.15,37.70), Western Gate (-117.54,37.48), Eastern Gate (-116.52,37.55), Southern Gate (-116.98,37.05), Northern Gate (-117.04,38.02), Imperial Air Command (-116.92,37.85), Royal Arsenal (-116.60,37.27).
- Existing Nevada / eastern California cities retained; added or explicitly situated Utah/eastern Nevada cities include Wendover, Tooele, Delta, Fillmore, Richfield, Milford, Beaver, Cedar City, Enterprise, Saint George, Kanab, Panguitch, McGill, Baker, Mesquite. Northern Great Basin additions include Fernley, Lovelock, Winnemucca and Elko.
- Mountain corridors reuse the known Nevada ranges and add House, Snake, Mineral, Wasatch, Pine Valley and San Rafael relief, plus I-80, US-50, US-6, US-395, I-15, US-89 and desert valley connections. All terrain corridors remain normally traversable, with no synthetic closed mountain ring, no wrap, no scripted teleportation and no naval land bridge.

**Coordinate transform (already in shared scenario code, preserve exactly):**
```js
const row = Math.round((bounds.north - latitude) * rows /
  (bounds.north - bounds.south) - 0.5);
const col = Math.round((longitude - bounds.west) * cols /
  (bounds.east - bounds.west) - 0.5 - 0.5 * (row & 1));
// For full precision use the scenario's clamp and its locate()/geographicAt().
```

### Scenario A — western Chinese Federation

**China-controlled staging cities**: Reno, Carson City, Truckee, South Lake Tahoe, Fernley, Lovelock, Fallon, Gabbs, Hawthorne, Bridgeport, Lee Vining, Mammoth Lakes, Bishop, Big Pine, Dyer, Independence, Lone Pine, Ridgecrest and Mojave. China controls none of the imperial fortress cities or Utah staging towns.

**Chinese commander-led Army Groups** (first commander in each formation): Xingke at Reno, Xianglin at Carson City, Hong Gu at Truckee, Cao at Fallon, Gao Hai at Gabbs, Zhao Hao at Hawthorne, Chao Lei Feng at Mammoth Lakes, Chao Meiling at Bishop, Xu Lifeng at Independence and Rakshata at Ridgecrest. Additional heavy/rocket/siege/assault formations deploy from the named bases.

**Britannian defense**: Suzaku and Bismarck at Pendragon; Cornelia/Schneizel at the Citadel; Gino at Air Command; Jeremiah at Royal Arsenal; Guilford/Darlton at the **western** imperial gate; Anya at northern gate; Villetta at southern gate; Oldrin at eastern gate; Nonette at Tonopah; Kewell at Goldfield; Monica at Lida; Dorothea at Silver Peak; Luciano at Round Mountain; Manfredi at Austin; Augustus at Eureka, alongside uncommanded supporting groups and rear-line armies.

**Operational axes**: northwestern basin (Reno/Fallon/Gabbs) → northern gate; Sierra/Owens Valley (Truckee/Mammoth/Bishop/Dyer) → western gate; southern armor (Independence/Lone Pine/Ridgecrest/Mojave) → southern gate. Britannia has distributed reserves at Pendragon, Tonopah, Goldfield, Round Mountain, and the imperial defenses.

### Scenario B — eastern Europia United

**E.U.-controlled staging cities**: Wendover, Tooele, Delta, Fillmore, Richfield, Milford, Beaver, Cedar City, Enterprise, Saint George, Kanab, Panguitch, Mesquite, Ely, McGill, Baker, Lund, Pioche, Panaca, Caliente, Hiko and Alamo. **No E.U.-owned western California/Nevada city remains.** Reno, Carson City, Truckee, Fallon, Hawthorne, Bishop, Ridgecrest and Mojave belong to Britannia.

**E.U. commander-led Army Groups**: Akito at Tooele, Leila at Wendover, Smilas/Yukiya at Delta, Fernando/Oscar at Richfield, Ayano at Milford, Marirrosa at Beaver, Ryo at Cedar City, Klaus at Saint George, Anna at Ely, Pierre at McGill, Margaret at Pioche and Olivia at Caliente, with additional assault/siege/rocket units.

**Britannian defense**: Suzaku/Bismarck at Pendragon; Cornelia/Schneizel at the Citadel; Gino at Air Command; Jeremiah at Arsenal; Guilford/Darlton at the **eastern** gate; Anya at northern gate; Villetta at southern gate; Oldrin at western gate; Nonette at Tonopah; Kewell at Goldfield; Monica at Rachel; Dorothea at Warm Springs; Luciano at Round Mountain; Manfredi at Austin and Augustus at Eureka, with reserves at Las Vegas/Nellis and scattered cities.

**Operational axes**: Wendover/Tooele/Delta/Ely → northern imperial gate; Milford/Baker/McGill/Pioche → eastern imperial gate; Cedar City/Saint George/Caliente/Alamo → southern approaches and Royal Arsenal.

Both variants retain the standard scenario AI doctrine (`aiDoctrine:'europe'`), giving both sides the existing city-target and multi-front offensive AI. `operationalFronts` and `counterattackBases` are descriptive scenario metadata; **the shared AI does not currently interpret them as scripted orders**. Britannian groups therefore have actual starting forces and objectives through the generic AI, rather than a fabricated scenario-only AI hook.

### Victory, difficulty and Elite status

- Every city must belong to the winning faction, not merely Pendragon. No turn limit and no special spawning rules.
- Normal, Hard, Challenge and Elite accepted. Hard and Challenge use the established rival-side stack adjustments.
- Existing equipment is selected via `E.typeFor(side, class, g)` and commanders via `E.COMMANDERS`; neither scenario adds new unit types or new commanders.
- In Elite, E.U. uses the existing `E.prepareEliteEurope` path. For `cf-pendragon`, the factory temporarily provides the existing `battle-luoyang` ID **only during initial Elite preparation**, then restores `cf-pendragon`. This enables the correct Chinese/Britannian **initial** Elite setup, including the existing unit-roster and named-officer rules, without modifying the shared engine.

**Important unresolved integration dependency**: `dist/engine.js` has a fixed scenario-ID whitelist in **both** `eliteScenario(g)` and `prepareEliteEurope(g)`. To enable ongoing Elite factory/AI recruitment and all generic Elite behavior in the new Chinese scenario, the **integrator must add `'cf-pendragon'` to both whitelists** in the integration branch. Only the starting Elite conversion is implemented autonomously on this isolated branch; do not claim complete ongoing Elite support until that engine integration is done. The compatibility bridge can then be removed or simplified.

## Exact renderer and loader changes for the integrator — DO NOT change on this branch

1. **Loader** `dist/index.html`: immediately after the existing
   ```html
   <script src="scenarios-pendragon.js"></script>
   ```
   insert
   ```html
   <script src="scenarios-pendragon-cf.js"></script>
   ```
   The Chinese module requires the E.U. module first so both reuse `root.PENDRAGON_SHARED.defineScenario`. No separate geographic file needs loading.

2. **Atlas registration** `dist/ui/geography.js`, in `paintJapan(...)` near the existing `pendragon` declaration, replace exactly:
   ```js
   const pendragon = g.scenario.id === 'eu-pendragon';
   ```
   with:
   ```js
   const pendragon = g.scenario.id === 'eu-pendragon' ||
     g.scenario.id === 'cf-pendragon';
   ```
   Keep `pendragon` inside `centreSampledRegion` and the later `if(pendragon && g.scenario.roads)` block unchanged. This ensures the geographic atlas and road underlay use `g.scenario.bounds` and the existing **full-column/full-row centre-sampled WGS84 projection** for both IDs. Otherwise China will silently fall back to the incompatible Japan-style projection. Do not add an independent tile cache.

3. **Campaign registry** `dist/war-campaign.js`: for the existing E.U. mission suffix `'pendragon-east'`, change its `scenarioId` from `null` to `'eu-pendragon'`; for the existing Federation mission suffix `'pendragon-west'`, change `null` to `'cf-pendragon'`. Preserve both mission suffixes, campaign factions, prerequisite order and final-tier positions. Their campaign display geographic bounds may also be updated to `[-121.25,34.8,-111.55,41.05]` so region previews do not clip Utah. Do not confuse mission suffixes with runtime IDs.

4. **Engine** `dist/engine.js`: add `'cf-pendragon'` to the two Elite scenario-ID allowlists described above. Do not change Elite ranks, unit stats, other scenarios or general balance.

5. Existing standalone E.U. module still registers `E.scenarios.byId['eu-pendragon']`. Chinese module separately registers `E.scenarios.byId['cf-pendragon']`. Campaign UI/renderer/shared engine were deliberately untouched in this branch.

## Open risks and validation handoff

- **No tests, simulations or playtesting have been run**, as instructed. Army Group placement, dynamic AI counteroffensives, memory/performance with 180×126 hexes and several hundred units, and visual atlas alignment remain **unverified in live gameplay**.
- Chinese new-ID atlas display requires the integrator renderer change; its ongoing Elite production requires the integrator engine change.
- The shared global atlas depicts real geographic land/terrain context but is not a local DEM/topographic raster. Mountain terrain and roads are WGS84-coordinate-derived in the scenario; if a dedicated elevation imagery underlay is later desired it should be integrated globally in the renderer, not duplicated per capital variant.
- The E.U. military locations are entirely eastern; Britannian garrisons exist in the western rear because *all* territory except E.U. staging must ultimately be conquered.
- Exact source of truth for station coordinates, forces, starting owners and difficulty behavior is the two committed JavaScript modules.
