# World Campaign: Federation vs Britannia and revised E.U. (integrated)

**Authority:** User-approved campaign planning as of 2026-10-15.
**Target:** `feature/federation-war-campaign-structure`; do not merge this branch to `main` without explicit approval.
**Integration status (2026-10-15):** All ten approved scenario branches merged into this feature branch with an octopus merge; new scenario registrations, shared engine survival/Elite eligibility, geographical underlays, standalone menu, and World Campaign runtime IDs are now integrated. No gameplay tests or simulations were run. The root `main` branch was not modified.

## Four independent campaigns

| Campaign key | Player engine side | Opponent | Scope |
| --- | --- | --- | --- |
| `eu` | `eu` | Britannia | **Revised**: no Hawaii or California; Atlantic-only Panama and eastern Pendragon pending; Rockies added |
| `britannia` | `britannia` | E.U. | **Unchanged**: original route ending in Operation Stonehenge |
| `britannia-federation` | `britannia` | Federation | **Updated**: three shared Global Conflicts first, then the eight approved regional objectives, Luoyang finale |
| `federation-britannia` | `cf` | Britannia | **Added**: seven tiers, three shared and ten China-side objectives |

Campaign IDs are NOT engine combat sides. The existing localStorage version-1 progress format stores the four campaigns independently. The `federation-britannia` player side is **`cf`**.

## Britannia vs Federation — revised six-tier structure (11 objectives)

| Tier | Chapter | Objectives |
| --- | --- | --- |
| 1 | Global Conflicts | War for Australia; Conquest of Area 18; Division of Japan |
| 2 | Opening Battles | Invasion of the Philippines; Defense of Indochina |
| 3 | Securing the Flanks | Strait of Malacca; Invasion of Korea; Iraq–Iran Campaign |
| 4 | Invasion of South China | Invasion of South China |
| 5 | The Yangtze Front | Battle of the Yangtze River |
| 6 | The Imperial Capital | Battle of Luoyang |

The shared conflicts are required for unlocking the campaign's existing regional wars. Mission identifiers and completed-result records remain unchanged.

## Chinese Federation — approved seven-tier structure (13 objectives)

All objectives in a tier are required; order within a tier is unrestricted. The scenario may launch only if `scenarioId` is non-null and its runtime model includes the correct side.

| Tier | Title | Campaign objective ID | Runtime scenario ID | Future scenario ID / notes |
| --- | --- | --- | --- | --- |
| 1 | Global Conflicts | `federation-britannia-australia` | `war-for-australia` | Shared |
| 1 | Global Conflicts | `federation-britannia-area-18` | `area-18` | Shared |
| 1 | Global Conflicts | `federation-britannia-division-japan` | `division-japan` | Shared |
| 2 | Asian War | `federation-britannia-indochina` | `conquest-indochina` | Existing Chinese offensive |
| 2 | Asian War | `federation-britannia-philippines` | `philippines-invasion` | Existing Chinese defense (approved exception) |
| 3 | Pacific Expansion | `federation-britannia-hawaii` | `invasion-hawaii` | Chinese conversion integrated |
| 3 | Pacific Expansion | `federation-britannia-new-zealand` | `cf-new-zealand` | Integrated |
| 4 | American Beachheads | `federation-britannia-panama-pacific` | `cf-panama` | Pacific-only integrated; attack from Pacific ONLY |
| 4 | American Beachheads | `federation-britannia-pacific-northwest` | `cf-pacific-northwest` | Integrated |
| 5 | Central American War | `federation-britannia-central-america` | `cf-central-america` | Integrated |
| 6 | Western America | `federation-britannia-california` | `invasion-california` | Chinese conversion integrated |
| 6 | Western America | `federation-britannia-mexican-heartland` | `cf-mexico` | Integrated |
| 7 | Final Offensive | `federation-britannia-pendragon-west` | `cf-pendragon` | Western finale integrated; approach from California/western Nevada |

**Nonnegotiable tier relationship:** Chinese Pacific Panama is Tier **4**; California is Tier **6**. The Chinese campaign has two American routes: (Hawaii -> Pacific Northwest -> California) and (Pacific Panama -> Central America -> Mexico). Both culminate at Pendragon West. New Zealand is a major separate southern-Pacific invasion in the same early-Pacific tier, not a prerequisite geographically for reaching America.

**Existing Philippine scenario exception:** The Chinese player currently owns all Philippine cities and repels Britannia's invasion from Palau/Yap. Reuse this existing scenario in this campaign without fabricating the reverse invasion. Both `philippines-invasion` and `conquest-indochina` also appear in the opposite Britannia-vs-Federation campaign with side `britannia`, while the China-side entries use `cf`. Victory is recorded separately per campaign.

## Revised E.U. — approved seven-tier structure (13 objectives)

| Tier | Title | Campaign objective IDs | Status |
| --- | --- | --- | --- |
| 1 | Global Conflicts | `eu-australia`, `eu-area-18`, `eu-division-japan` | Existing shared scenarios |
| 2 | Bering Strait | `eu-bering` | Existing |
| 3 | Overseas Invasions | `eu-brazil`, `eu-greenland`, `eu-caribbean` | Existing |
| 4 | Continental Landings | `eu-panama-atlantic`, `eu-new-york`, `eu-canada` | Panama Atlantic-only variant integrated |
| 5 | American Interior | `eu-great-lakes` | Existing |
| 6 | Crossing the Rocky Mountains | `eu-rocky-mountains` | Integrated: `eu-rocky-mountains` |
| 7 | Final Offensive | `eu-pendragon-east` | Integrated: `eu-pendragon` eastern attack |

**Transfers:** `eu-hawaii` and `eu-california` were removed from the E.U. campaign registry. The former E.U. standalone variants have been converted to Chinese offensive scenarios, and both are loaded into the game.

**Two Panama variants:** E.U. keeps runtime scenario ID `eu-panama` but must attack from the **Caribbean/Atlantic only**. Chinese `cf-panama` attacks from the **Pacific only**. Same underlying map/canal geography; different attacking fleets, starting sides and army dispositions. Both scenarios remain distinct playable entries after integration.

**Two Pendragon variants:** E.U. keeps runtime scenario ID `eu-pendragon` but is redeployed east of Pendragon, from Utah/eastern Nevada, following the newly approved Rocky Mountains battle. Chinese `cf-pendragon` attacks from the California/western Nevada side. Both retain the fortified capital and full city-conquest objective. The existing E.U. scenario starts largely in the west and must be revised before activation.

### Save compatibility and progress integrity

- Existing campaign storage keys and unaltered objective IDs are preserved.
- `eu-hawaii` and `eu-california` no longer appear as E.U. objectives; their saved E.U. victories **do not transfer** to the Federation.
- The *campaign objective IDs* `eu-panama-atlantic` and `eu-pendragon-east` are intentionally new. Old `eu-panama` or `eu-pendragon` victory records do not count toward the newly directed battles. **Runtime scenario IDs stay `eu-panama` and `eu-pendragon`** once correctly updated.
- E.U. Atlantic Panama and Eastern Pendragon are now active. Their campaign objective IDs remain distinct from older records.
- Standalone Scenarios and legacy saves are otherwise not modified by this scaffold. No fabricated victory, no automatic completion, no cross-campaign win credit.
- Any changes to persistent runtime saves for the reworked standalone scenarios should be handled consciously by the implementing AI; do not silently reinterpret old saves.

## Integration contract for scenario AIs

**Canonical machine-readable integration record:** `docs/FEDERATION_SCENARIO_HANDOFFS.json`. The original development branches are merged; the rules below remain guidelines for future follow-up changes.

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

`britannia` (Britannia vs E.U.) remains unchanged. As of 2026-10-16, `britannia-federation` starts with the same three shared Global Conflicts as every other World Campaign (War for Australia, Area 18 and Division of Japan). Its eight existing regional objectives retain their mission IDs, battle definitions and internal order; the five former tiers become tiers 2–6, ending at Luoyang. Completed mission IDs remain valid in existing progress saves.

**Integrated, not playtested:** Scenario source and entry points are present on this feature branch. Runtime gameplay, 2D atlas visual accuracy at all zoom levels, Army Group AI performance, save migration and balance remain unverified pending explicit test authorization.
