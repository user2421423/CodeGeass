# Scenario improvements: priorities 1–4

Branch: `preview/scenario-improvements-1-4`, based on main `fe21e19`.

## 1. Canada and Philippines playable geography

Canada's polygon-aware sea cuts separate Vancouver Island, Newfoundland,
Baffin Island, Prince Edward Island and other coastal islands from adjoining
land. City placement now stays on the city's physical island, including when
finding a usable harbour. Victoria–Nanaimo and St. John's–Corner Brook remain
connected internally. The atlas ends at 74°N, so the dedicated Arctic mask and
anchors above 73.5°N are preserved.

The central Visayas mask is resampled from the existing local coast polygons.
Bacolod and Dumaguete share Negros; Cebu, Bohol, Panay, Samar and Leyte retain
their sea separations. The Philippine theatre keeps 37 cities and 31 ports.

`node tools/refine-island-coasts.cjs` reproduces the generated masks and the
coordinate ledger without network access. It uses 25 samples per cell,
polygon identity and protected city anchors. There are 183 Canadian sea-cell
corrections and 20 Philippine land/sea changes (net +16 land cells).

These changes affect new scenario starts. Existing saves retain their stored
map and unit coordinates; no live army is silently moved onto a new coastline.

## 2. Indochina rendering

Indochina now uses the geographic atlas with the same centre-sampled transform
as the tactical grid. The Mekong and Red River overlays remain visible.
The scenario selection images and detailed Indochina/Canada map backdrops
have been regenerated using the browser renderer.

## 3. Terrain, passes and operational AI

Mountain movement costs 2 in these regional scenarios:

- Crossing the Urals and Crossing the Rocky Mountains
- Both Battle of Pendragon variants
- Mexico, Central America and the Pacific Northwest
- Turkey, Iraq–Iran, Indochina and South China

Existing plains and pass corridors cost 1. Float, terrain-ignoring skills and
the existing retrofit exemption retain their movement benefit. The briefing
and terrain panels show the applicable cost. Other scenario movement costs,
including Invasion of Japan, Division of Japan and War for Australia, remain
unchanged.

AI route fields use the regional costs, charge the entered hex during reverse
pathfinding, distinguish terrain-ignoring formations, and invalidate on terrain
changes. The AI now consumes declared operational fronts/routes, the Rockies'
three army axes, and threatened counterattack hubs/defense belts. These are
preferences among reachable objectives. Local defensive objectives remain
eligible even when a formation has an offensive theater assignment; only real
nearby hostile formations activate them.

## 4. Large battles and army controls

Terrain-only route fields are reused across turns, target costs are evaluated
once per selection/sort, and tactical scoring avoids repeated column lookups
and unused commander ally scans. Legal candidate moves and attacks are retained.
Before adding terrain and operational behavior, the pure optimization produced
identical seeded two-round Rockies state/result fingerprints for both sides.

The Army Groups dialog adds:

- **Organize unassigned formations**: creates groups from existing armies,
  nearby units and fleets, including carrier cargo. Existing groups are kept.
- **Hold all groups**: stops group automation.
- **Capture remaining cities with all armies**: arms ground groups' existing
  conquest/assault orders for normal execution. Ship-only groups are skipped.

Scenarios allow 40 groups of up to 24 units; world Conquest retains 12 groups.
Organization changes membership only. It does not create formations, spend
resources or execute orders. Repeating it with no unassigned units is a no-op.
The 350-formation Britannian Rockies roster fits into 20 groups.

## Opening performance sample

Average milliseconds per complete AI round, averaged over both player
orientations, one seed (`20261007`), normal difficulty and three rounds:

| Scenario | Earlier audit baseline | Branch | Reduction |
| --- | ---: | ---: | ---: |
| Rockies | 13,316.5 | 9,124.1 | 31.5% |
| Pendragon, eastern | 5,127.0 | 2,901.6 | 43.4% |
| Pendragon, western | 8,393.8 | 4,529.8 | 46.0% |
| Central America | 7,051.2 | 3,103.5 | 56.0% |

These are short, sequential samples from the same runtime, not frame-rate or
win-rate measurements. Operational and terrain behavior also changes on this
branch, so the full comparison is not a claim of identical gameplay outcomes.

## Validation

- All 312 faction/difficulty scenario initializations succeed, with unique city
  names, cities on land and no formations on blocked terrain.
- All 37 scenarios complete a two-round normal-difficulty opening simulation.
- Focused assertions cover Canadian island separation and internal connectivity,
  Philippine island placement, Canada save round-trip, regional and exempted
  movement costs, weighted reverse routes, all-roster army organization,
  idempotence, bulk orders, three Rockies axes and a staffed Pendragon response.
- Existing Philippine mask reproduction/hex audit and Turkey hex audit pass.
- Desktop/mobile browser checks cover Indochina rendering and all three new
  army controls: 20 groups, 350 formations, zero unassigned, no page errors and
  no horizontal overflow in the 390px mobile viewport.
- Source bundles and scenario catalog build; published artwork validation passes.
- Coast regeneration is byte-for-byte idempotent.

Two pre-existing audit failures were reproduced on both this branch and the
unaltered `fe21e19` baseline: `indochina_hex_audit.cjs` expects Ho Chi Minh City's
port to be adjacent (the current data places it three hexes away), and
`pendragon_hex_audit.cjs` expects the older 48-city layout (the current layout
has 70). Neither audit's expectations are changed in this work.

Opening simulations check execution and performance, not campaign win rates
or long-run balance. The legacy Node balance loader includes a browser-only
Central America underlay; these runs omit that rendering module while using
the actual scenario and engine modules.
