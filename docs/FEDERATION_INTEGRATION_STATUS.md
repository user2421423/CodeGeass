# Federation and E.U. World Campaign — integration status

**Branch:** `feature/federation-war-campaign-structure`
**Date:** 2026-10-15
**Repository:** `user2421423/CodeGeass`
**Status:** Ten independent scenario branches merged into this feature branch, including their Git commit ancestry. **Not merged into `main`.**

## Integrated scenarios

| Development branch | Runtime scenario(s) | Campaign objective(s) |
| --- | --- | --- |
| `scenario/cf-asian-war` | `conquest-indochina`, `philippines-invasion` | `federation-britannia-indochina`, `federation-britannia-philippines` |
| `scenario/cf-hawaii` | `invasion-hawaii` (Chinese conversion) | `federation-britannia-hawaii` |
| `scenario/cf-new-zealand` | `cf-new-zealand` | `federation-britannia-new-zealand` |
| `scenario/cf-panama` | `eu-panama` (Atlantic), `cf-panama` (Pacific) | `eu-panama-atlantic`, `federation-britannia-panama-pacific` |
| `scenario/cf-pacific-northwest` | `cf-pacific-northwest` | `federation-britannia-pacific-northwest` |
| `scenario/cf-central-america` | `cf-central-america` | `federation-britannia-central-america` |
| `scenario/cf-california` | `invasion-california` (Chinese conversion) | `federation-britannia-california` |
| `scenario/cf-mexico` | `cf-mexico` | `federation-britannia-mexican-heartland` |
| `scenario/cf-pendragon` | `eu-pendragon` (eastern), `cf-pendragon` (western) | `eu-pendragon-east`, `federation-britannia-pendragon-west` |
| `scenario/eu-rocky-mountains` | `eu-rocky-mountains` | `eu-rocky-mountains` |

Three shared opening scenarios remain in the Federation Tier 1; no duplicate maps were created for them. Seven-tier Federation and seven-tier E.U. registries are active. China attacks Panama in Tier 4 and California in Tier 6.

## Cross-branch bug fixes

- Integrated the 10 independent branches into one feature-branch merge commit, preserving their ancestors; central files were reconciled afterward rather than overwritten.
- Added all relevant cityless expedition IDs to scenario victory handling. Surviving attacking forces and carrier cargo are not automatically defeated when they hold no city; invading forces that lose the last foothold can continue if any survive.
- Corrected premature defender-win rules for California, Mexico, Pendragon and the Rocky Mountains; defender victory now waits for surviving opposing forces to be destroyed in these scenarios.
- Unified the new scenario IDs in the Elite eligibility lists, preparation roster routing and engine source modules. Hawaii/California/Panama use the correct Britannia–Chinese roster; E.U. Rockies uses the Britannia–E.U. roster.
- Removed temporary scenario-ID substitution workarounds from California, Central America, Pendragon and Rocky Mountains.
- Corrected Pacific Northwest Elite conversion to include embarked carrier cargo.
- Registered new runtime module scripts in `dist/index.html` in the correct dependency order, including Panama and Pendragon variant factories.
- Registered both sides' standalone scenario selections, edited stale E.U. Hawaii/California text, and activated all approved World Campaign runtime IDs.
- Registered the new scenario IDs in `dist/ui/geography.js`. Panama and Pendragon variants share underlying geography. New Zealand, Pacific Northwest, Central America, Mexico and the Rockies use their geographical atlas and WGS84-based terrain overlays **under the tactical hex grid**, with coast polygons independent from the hex mask. The Central America standalone geography helper loads after `ui/geography.js`.

## Source-only checks

The integrated scenario modules, geographic painter, campaign registry, UI and engine were examined for expected script references, scenario IDs, and missing registration fields. **JavaScript source syntax was parsed only, without executing the code**; all checked files parsed successfully.

**Not performed:** automated tests, runtime scenario creation, gameplay simulations, AI-turn tests, geographic screenshots, nav/pathfinding tests, performance benchmarks, browser smoke tests or save migration tests, in accordance with the earlier no-tests/no-simulations instruction.

## Remaining validation risk

- **Geographic precision:** the coast visual uses real GSHHG/Natural Earth atlas shapes and scenarios use WGS84-positioned terrain metadata. Relief for the Rocky Mountains, Mexico, New Zealand, Pacific Northwest and Central America is derived from curated geographic feature coordinates, **not a surveyed high-resolution digital elevation raster**; exact alignment and map quality require visual inspection.
- **AI behavior:** `operationalFronts` metadata describes strategic intentions but does not alone guarantee coordinated naval landings, reserve triggers or late-game convergent offensives. Runtime behavior is unverified.
- **Performance:** some battlefields contain tens of thousands of hexes and many units. Memory use, frame rate, and pathfinding performance have not been measured.
- **Saves:** old E.U. Hawaii/California victories do not transfer to China. New E.U. Panama/Pendragon campaign objective IDs avoid auto-credit for historical west/two-ocean battles. Historical standalone saves were not actively migrated.
- **Activation caveat:** scenario entries are wired and offered for launch but should be considered **statically integrated**, not certified stable, until gameplay testing is authorized.

## Core references

- `docs/FEDERATION_WAR_CAMPAIGN_STRUCTURE.md` — approved campaign tiers and persistent objective IDs
- `docs/FEDERATION_SCENARIO_HANDOFFS.json` — original scenario ownership and runtime ID manifest
- `dist/war-campaign.js` — authoritative campaign registry
- `dist/ui/geography.js` — regional geographic underlay and relief integrations
- `dist/index.html` — ordered script registration
