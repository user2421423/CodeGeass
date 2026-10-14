# World Campaign: Federation vs Britannia and revised E.U. (approved skeleton)

**Authority:** User-approved campaign planning as of 2026-10-15.
**Target:** `feature/federation-war-campaign-structure`; do not merge this branch to `main` without explicit approval.
**Scope:** Registry/UI/documentation only. This scaffold does not implement scenarios, alter maps, change AI, or run tests/simulations.

## Four independent campaigns

| Campaign key | Player engine side | Opponent | Scope |
| --- | --- | --- | --- |
| `eu` | `eu` | Britannia | **Revised**: no Hawaii or California; Atlantic-only Panama and eastern Pendragon pending; Rockies added |
| `britannia` | `britannia` | E.U. | **Unchanged**: original route ending in Operation Stonehenge |
| `britannia-federation` | `britannia` | Federation | **Unchanged**: eight previously approved objectives, Luoyang finale |
| `federation-britannia` | `cf` | Britannia | **Added**: seven tiers, three shared and ten China-side objectives |

Campaign IDs are NOT engine combat sides. The existing localStorage version-1 progress format stores the four campaigns independently. The `federation-britannia` player side is **`cf`**.

## Chinese Federation — approved seven-tier structure (13 objectives)

All objectives in a tier are required; order within a tier is unrestricted. The scenario may launch only if `scenarioId` is non-null and its runtime model includes the correct side.

| Tier | Title | Campaign objective ID | Runtime scenario ID *now* | Future scenario ID / notes |
| --- | --- | --- | --- | --- |
| 1 | Global Conflicts | `federation-britannia-australia` | `war-for-australia` | Shared |
| 1 | Global Conflicts | `federation-britannia-area-18` | `area-18` | Shared |
| 1 | Global Conflicts | `federation-britannia-division-japan` | `division-japan` | Shared |
| 2 | Asian War | `federation-britannia-indochina` | `conquest-indochina` | Existing Chinese offensive |
| 2 | Asian War | `federation-britannia-philippines` | `philippines-invasion` | Existing Chinese defense (approved exception) |
| 3 | Pacific Expansion | `federation-britannia-hawaii` | **null** | `invasion-hawaii` AFTER conversion to `cf` |
| 3 | Pacific Expansion | `federation-britannia-new-zealand` | **null** | `cf-new-zealand` |
| 4 | American Beachheads | `federation-britannia-panama-pacific` | **null** | `cf-panama`; attack from Pacific ONLY |
| 4 | American Beachheads | `federation-britannia-pacific-northwest` | **null** | `cf-pacific-northwest` |
| 5 | Central American War | `federation-britannia-central-america` | **null** | `cf-central-america` |
| 6 | Western America | `federation-britannia-california` | **null** | `invasion-california` AFTER conversion to `cf` |
| 6 | Western America | `federation-britannia-mexican-heartland` | **null** | `cf-mexico` |
| 7 | Final Offensive | `federation-britannia-pendragon-west` | **null** | `cf-pendragon`; approach from California/western Nevada |

**Nonnegotiable tier relationship:** Chinese Pacific Panama is Tier **4**; California is Tier **6**. The Chinese campaign has two American routes: (Hawaii -> Pacific Northwest -> California) and (Pacific Panama -> Central America -> Mexico). Both culminate at Pendragon West. New Zealand is a major separate southern-Pacific invasion in the same early-Pacific tier, not a prerequisite geographically for reaching America.

**Existing Philippine scenario exception:** The Chinese player currently owns all Philippine cities and repels Britannia's invasion from Palau/Yap. Reuse this existing scenario in this campaign without fabricating the reverse invasion. Both `philippines-invasion` and `conquest-indochina` also appear in the opposite Britannia-vs-Federation campaign with side `britannia`, while the China-side entries use `cf`. Victory is recorded separately per campaign.

## Revised E.U. — approved seven-tier structure (13 objectives)

| Tier | Title | Campaign objective IDs | Status |
| --- | --- | --- | --- |
| 1 | Global Conflicts | `eu-australia`, `eu-area-18`, `eu-division-japan` | Existing shared scenarios |
| 2 | Bering Strait | `eu-bering` | Existing |
| 3 | Overseas Invasions | `eu-brazil`, `eu-greenland`, `eu-caribbean` | Existing |
| 4 | Continental Landings | `eu-panama-atlantic`, `eu-new-york`, `eu-canada` | Panama **planned** until Caribbean-only deployment |
| 5 | American Interior | `eu-great-lakes` | Existing |
| 6 | Crossing the Rocky Mountains | `eu-rocky-mountains` | **Planned**, `eu-rocky-mountains` scenario to be created |
| 7 | Final Offensive | `eu-pendragon-east` | **Planned** until eastern-approach version of `eu-pendragon` is delivered |

**Transfers:** `eu-hawaii` and `eu-california` were removed from the E.U. campaign registry. The standalone scenario files still exist; their conversion/deployment changes are **not** part of this scaffold.

**Two Panama variants:** E.U. keeps runtime scenario ID `eu-panama` but must attack from the **Caribbean/Atlantic only**. Chinese `cf-panama` attacks from the **Pacific only**. Same underlying map/canal geography; different attacking fleets, starting sides and army dispositions. Both scenarios remain distinct playable entries after integration.

**Two Pendragon variants:** E.U. keeps runtime scenario ID `eu-pendragon` but is redeployed east of Pendragon, from Utah/eastern Nevada, following the newly approved Rocky Mountains battle. Chinese `cf-pendragon` attacks from the California/western Nevada side. Both retain the fortified capital and full city-conquest objective. The existing E.U. scenario starts largely in the west and must be revised before activation.

### Save compatibility and progress integrity

- Existing campaign storage keys and unaltered objective IDs are preserved.
- `eu-hawaii` and `eu-california` no longer appear as E.U. objectives; their saved E.U. victories **do not transfer** to the Federation.
- The *campaign objective IDs* `eu-panama-atlantic` and `eu-pendragon-east` are intentionally new. Old `eu-panama` or `eu-pendragon` victory records do not count toward the newly directed battles. **Runtime scenario IDs stay `eu-panama` and `eu-pendragon`** once correctly updated.
- While E.U. Panama and Pendragon are pending, they are deliberately non-launchable in World Campaign Mode, even if their old standalone versions still exist.
- Standalone Scenarios and legacy saves are otherwise not modified by this scaffold. No fabricated victory, no automatic completion, no cross-campaign win credit.
- Any changes to persistent runtime saves for the reworked standalone scenarios should be handled consciously by the implementing AI; do not silently reinterpret old saves.

## Integration contract for scenario AIs

**Canonical machine-readable handoff:** `docs/FEDERATION_SCENARIO_HANDOFFS.json`.

1. Branch independently from `feature/federation-war-campaign-structure`. One branch per scenario task. Do not merge.
2. **Own only your scenario module(s) and scenario-local helpers.** Do not change `dist/war-campaign.js`, `dist/ui/war-campaign-screen.js`, `dist/war-campaign.css`, this spec or the handoff JSON; do not modify `main`.
3. For new modules, register the runtime scenario in `E.scenarios.byId`, expose `id`, `sides`, `create(player,difficulty,seed)`, `winner`, etc. Use `cf` for China. Make it independently selectable after integration. Do not modify the central World Campaign registry or wire up script tags in `dist/index.html` on your branch; report needed script ordering to the integrator.
4. Hawaii and California **reuse** existing geographical maps and runtime IDs but change E.U. attacking assets to Federation equivalents. Panama and Pendragon retain the existing E.U. runtime IDs while creating new Chinese IDs.
5. Do not adopt the already-used `eu-hawaii`, `eu-california`, `eu-panama` or `eu-pendragon` as **new** campaign objective IDs. Campaign IDs and runtime scenario IDs are different namespaces.
6. Victory generally requires capturing all enemy cities without a turn limit; no scenario-specific artificial shortcuts. Support Normal, Hard, Challenge and Elite, standard equipment, named commanders, Army Groups and naval AI where appropriate.
7. Preserve geography, accurate coastlines and the 20–80% mixed-coast standard. If a shared engine/Elite eligibility change is essential, describe it for the integrator rather than independently editing shared engine modules.
8. **No new regression tests, no automated tests or simulations.** Only static review and concise notes on potential issues, per current instruction.
9. Return branch name, commit SHA, changed paths, exact runtime scenario ID, expected script load placement, whether `cf`/`eu` is in `sides`, and any unresolved integration issue.

**Integrator only (after branches are complete):** Reconcile scenario branches, add new script tags to `dist/index.html`, review scenario/Elite registrations and `E.scenarios.byId`, replace matching `scenarioId:null` registry entries **only** when the appropriate faction version is genuinely ready. Then review world-map route arrows and political overlays. No merge to main without explicit instruction.

## Preserved other campaigns

`britannia` (Britannia vs E.U.) remains unchanged. `britannia-federation` retains its existing eight approved objectives: Philippines invasion, Indochina defense, Malacca, Korea, Iraq–Iran, South China, Yangtze and Luoyang finale. Previously unimplemented entries remain planned.

**Current work is a campaign skeleton only; it does not imply scenario completion.**
