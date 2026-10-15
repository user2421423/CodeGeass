# Invasion of Turkey — scenario implementation and hex audit

**Branch:** `scenario/britannia-turkey` (based on `feature/campaign-world-map`; **not merged**).
**Scenario ID:** `invasion-turkey`.
**Campaign objective:** `britannia-turkey`, Britannian Tier 4.
**Game modes:** standalone Scenarios and unlockable world Campaign Mode. Story and all earlier Scenarios remain unchanged.

## Theatre, factions and victory

- Geographic window: 24.1°–45.6° E, 33.9°–43.5° N, north-up 144 × 104 tactical hexes (14,976 cells).
- Geographic landmask: GSHHS intermediate-resolution coastlines; sea/land and mountains/forests/river overlays share the region's actual coordinates.
- Forty-five E.U. settlements hold Anatolia and eastern Thrace, including Istanbul, Ankara, Izmir, Antalya, Trabzon, Diyarbakir, Canakkale, Edirne, Konya, Samsun and Erzurum. Fourteen Britannian settlements supply the offensive from northern Syria and Mesopotamia, including Aleppo, Antakya, Iskenderun, Gaziantep, Sanliurfa, Mardin and Mosul.
- Fourteen separate capturable naval harbours with adjacent deep-water hexes. Harbour ownership uses the unmodified engine's independent port-capture and naval-production mechanics.
- Fifty army detachments and thirteen fleet squadron deployments, amounting to 190 beginning units; standard Britannian and Europian unit types and commander rules.
- Both factions playable, on Normal/Hard/Challenge/Elite. Existing `europe` strategic doctrine orchestrates multi-front offensives, production, defensive recovery and amphibious operations.
- No scenario timer; complete conquest of **all 59 cities** is required for victory. The ordinary `E.checkVictory` and Campaign's verified-victory hook remain authoritative.

## Terrain and 20–80% mixed-coast review

The packed `dist/turkey-landmask.js` is the authoritative gameplay mask. It uses GSHHS geographic outlines on the scenario's staggered hex coordinates. An intermediate geographic review marked 647 mixed coast cells in the 20–80% sample band (hex centre plus six interior samples), including 78 cells where the sampled majority differed from centre-only classification. The reviewed mixed coast cells were treated as land/coast **except where that would block an explicitly navigable strait**.

This is a sampled 20–80% classification rather than a mathematically exact per-hex polygon-area integration; that difference should be kept in mind when inspecting fine coastal geography. The port and passage exceptions preserve playability in narrow, real waterways. The renderer overlays the vector coastline and draws the Bosporus and Dardanelles water channels.

To guard against false navigability, the module finds the **largest contiguous sea component** once after loading the mask. All fourteen port hexes and initial fleets are constrained to that basin, rather than arbitrarily opening shipyards on disconnected lakes or inlets.

## Mandatory connectivity checks

`tests/turkey.test.cjs` verifies:
- Aegean Sea -> Dardanelles -> Sea of Marmara -> Bosporus -> Black Sea and eastern Black Sea, using the game's actual hex adjacency.
- Eastern Mediterranean connects to the operational fleet basin.
- Mainland Ankara and Diyarbakir have an unbroken land route.
- **No land route connects Ankara to Edirne** across the straits.
- Every port is precisely one adjacent sea hex away from its city, on that same operational sea, with independent port ownership.
- Ship formations begin on valid sea hexes, land formations on valid land, and Army Group memberships and city anchors are legal.

`tools/turkey_hex_audit.cjs` exhaustively checks all 14,976 cell classifications against the committed packed mask, province assignment, terrain consistency, city geolocation, port positions and unit deployment.

## Simulation and regression

GitHub Actions workflow `.github/workflows/turkey-scenario.yml` executes:
- `node tools/build_sources.cjs`
- `node tools/turkey_hex_audit.cjs`
- `node --test tests/*.test.cjs`
- 16 five-turn, full-engine AI-versus-AI runs: Britannia and E.U. × four difficulties × seeds 11, 29
- Four twenty-turn full-engine strategic runs: both factions × seeds 11, 29

The earlier full-engine batch showed active land attacks, hundreds of naval orders, changing city ownership and no simulation exceptions on both sides in all sampled extended runs. A complete full-war victory balance study would require longer matches; a twenty-turn run checks the opening and middle-game operational systems, not definitive fairness or the end-game outcome.

## Preview and launch

Launch the static `dist/index.html` through a local HTTP server or a branch-specific static preview. Choose **Scenarios -> Invasion of Turkey** to start either faction at any difficulty. The Campaign Mode Britannian Tier 4 marker becomes playable upon unlocking its preceding tiers; a standalone victory does not grant Campaign progress.

Do not merge this branch until the user approves it.
