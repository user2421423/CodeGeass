# E.U. Crossing the Rocky Mountains — integrator handoff

**Repository:** `user2421423/CodeGeass`
**Feature branch:** `scenario/eu-rocky-mountains`
**Runtime ID:** `eu-rocky-mountains`
**Standalone module:** `dist/scenarios-rocky-mountains.js`
**Player side:** `eu` (Britannia also available as an alternate standalone side)
**Map:** 224 columns × 168 rows, WGS84 bounds west -116.05, east -98.20, north 45.40, south 36.20.
**Campaign sequence:** E.U. tier 6, directly before E.U. tier 7 eastern Pendragon attack.

Do not merge into main until the central integrator has evaluated these steps. This feature branch does **not** edit the engine, global UI, renderer, campaign registry, index HTML or existing California/Pendragon scenarios. It contains no regression tests. No tests/simulations were run.

## 1. Script registration

In `dist/index.html`, insert **exactly one** script reference after the other scenario modules and before `war-campaign.js` (and before `game.js`):

```html
<script src="scenarios-rocky-mountains.js"></script>
```

The module self-registers on load:

```js
Knightmare.scenarios.byId['eu-rocky-mountains']
Knightmare.scenarios.rockyMountains
```

The exported API provides `create(player='eu', difficulty='normal', seed=201740)`, `objective`, `winner`, `onTurn`, `strategicScore`, `orderGroup`, `geo`, `locate`, `paintRelief`, `cityData`, `armyGroups`, `roads`, `rivers`, `lakes` and `mountainPasses`.

## 2. Mandatory geographical renderer integration

**Important:** the current shared `dist/ui/geography.js` does not recognize the new scenario ID. Without this one-time integrator edit, the renderer chooses Japan's atlas instead of the Rocky Mountain region, even though the scenario data and tactical terrain are present.

Inside `paintJapan(ctx, g, left, right, top, bottom, scale)`, near existing flags for `california`, `pendragon`, and `urals`, add:

```js
const rockyMountains = g.scenario.id === 'eu-rocky-mountains';
```

Extend the existing `centreSampledRegion` Boolean expression:

```js
const centreSampledRegion = australia || middleEast || iraqIran || malacca ||
  siberia || southernAfrica || urals || turkey || brazil || california ||
  canada || caribbean || greatLakes || greenland || hawaii || eastCoast ||
  panama || pendragon || korea || southChina || yangtze || luoyang ||
  rockyMountains;
```

**Do not** add a second projection, adjust the existing `KOREA_LAND`, move the coastline atlas, or reproject to Web Mercator. The existing `centreSampledRegion` path transforms the GSHHG global atlas using the same centre-sampled WGS84 coordinates as `geo()` and `locate()`:

```js
const x = R - SQ*R/2 + (lon - bounds.west) *
    SQ*R*g.cols / (bounds.east - bounds.west);
const y = R - 0.75*R + (bounds.north - lat) *
    1.5*R*g.rows / (bounds.north - bounds.south);
```

Immediately **after** the existing region's province/owner-tint `ctx.restore()`, and **before** the optional Greenland ice cap and final coastline strokes, call the scenario's georeferenced painter:

```js
if (rockyMountains) {
  E.scenarios.byId['eu-rocky-mountains']
    .paintRelief(ctx, g, { R, SQ, left, right, top, bottom });
}
```

This painter draws WGS84 irregular massif envelopes, basins, the Great Salt Lake, and named river courses. Those geographical polylines are **approximate control-point geometry, not surveyed elevation contours or a high-resolution DEM**. The background GSHHG atlas is genuine geographic coastline, but full high-resolution mountain relief is a remaining integration task. For a genuinely elevation-derived underlay, obtain and locally bundle an appropriately resampled **USGS 3DEP DEM** for the exact WGS84 bounds above (or equivalent licensed terrain data), and use it for both relief coloring and mountainous-hex classification. Do not substitute generic bands or draw a false impassable ridge. Keep the overlay visual only; gameplay routes are governed by scenario terrain tiles.

Also note the Great Salt Lake is an inland `sea` mask, not a shipping theater. Its georeferenced underlay polygon is supplied in `g.scenario.lakes`. Rivers represent headwaters and are not turned into fictitious navigable seas.

## 3. Standalone Scenarios interface

In `dist/ui/scenario-screens.js`, add one tuple to `SCENARIO_KINDS`:

```js
['eu-rocky-mountains','Crossing the Rocky Mountains','101 cities · 2 sides'],
```

Add matching text to `SCENARIO_BLURBS` / `SCENARIO_TEXT`:

```js
'eu-rocky-mountains': {
  eu: 'Command northern, central and southern Army Groups from the eastern plains. Break Britannian mountain defensive belts through Wyoming, the Colorado Front Range and the southern plateau, then capture all western cities.',
  britannia: 'Hold Front Range cities, the Continental Divide crossings and western basins. Commit Wyoming, Colorado Slope and Wasatch reserves to threatened passes.'
},
```

Use the existing menu setup and save conventions. No new scenario state machine, objectives UI, scoring system or turn limit is needed.

## 4. Existing Elite rules

The current `dist/engine.js` allowlists omit new scenario IDs. Integration should add `'eu-rocky-mountains'` to **three** existing arrays:

1. The eligibility ID list in `eliteScenario(g)`.
2. The eligibility ID list in `prepareEliteEurope(g)`.
3. The Britannia/E.U. sides-ID list inside `prepareEliteEurope(g)`.

Until that integration is done, the scenario's `create()` temporarily presents `eu-pendragon` to `prepareEliteEurope(g)` **only during the initial Elite force conversion** and immediately restores `eu-rocky-mountains`. This enables initial Elite unit conversion without changing shared files on this branch, but it does **not** enable every subsequent engine-gated Elite AI production behavior for the unregistered ID. Remove the temporary alias after all three allowlists are updated.

Normal, Hard and Challenge use the existing scenario difficulty patterns, with rival funding and formation stack increases. Elite starts use the established equipment/faction and commander rules via the compatibility bridge.

## 5. E.U. World Campaign

In `dist/war-campaign.js` the existing E.U. tier-6 `rocky-mountains` row intentionally has `scenarioId: null`. On integration **replace only that null** with `'eu-rocky-mountains'`. Do not create another campaign entry or change its stable battle ID.

The E.U. tier-7 `pendragon-east` row must remain assigned to the separate eastern-Pendragon agent; do not point it at the old west-invasion scenario until that agent's changes are integrated.

Leave California, the prior E.U. Pendragon deployment, the shared campaign UI, all Britannian and Chinese campaigns, and existing geographical atlas behavior unchanged otherwise.

## 6. Terrain, command groups, and caveats

- Tactical mountain/forest/desert/plains tiles are deterministic from named irregular WGS84 mountain range envelopes, lower basins, named pass locations, and real road corridor control points.
- 23 lower-cost crossings include Sherman Summit, South Pass, Togwotee, Powder River, Eisenhower/Loveland, Berthoud, Vail, Monarch, Independence, Wolf Creek, Red Mountain, Raton, Parleys and Weber Canyon.
- Every mountain tile remains traversable; named passes and roads form preferable corridors without teleportation or arbitrary gates. Rivers are visual features and do not function as impassable seawater.
- Three E.U. field-army groups: Northern Army, Central Army, Southern Army.
- Britannian defensive groups: Northern Mountain Line, Continental Divide Line, Western Basin Line, Front Range Line, Central Divide Line, Western Slope Line, Southern Mountain Line, Utah Outer Line. Four reserves: Wasatch Reserve, Wyoming Reserve, Western Slope Reserve, Southern Reserve.
- The existing `aiDoctrine:'europe'` handles broad scenario operations. `onTurn()` supplements this with orders for nearby reserves toward threatened pass hexes when it is Britannia's phase. Its actual behavior has **not** been simulated.
- Victory triggers only when one side owns **all 101 cities**; no turn limit, pass-score thresholds or special win objectives.
- No code tests, automated test runs, playtesting, AI simulations or geographical pixel-by-pixel audit have been performed as requested.
- **Unresolved:** authoritative elevation-derived underlay and exact mountain mask alignment, shared-renderer ID enablement, UI and campaign registration, engine-wide ongoing Elite AI eligibility, and AI balance/pathfinding behavior in live play.

USGS DEM source for the integrator: https://www.usgs.gov/3d-elevation-program/about-3dep-products-services
