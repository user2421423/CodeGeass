# Chinese Federation vs E.U. — Conquest of Central Europe

**Scenario ID:** `cf-eu-central-europe`  
**Campaign objective:** `federation-eu-central-europe`, mission 12 / Tier 5  
**Owner:** `scenario/cf-eu-central-europe`  
**PR target:** `feature/federation-vs-eu-campaign-architecture`  
**Owned runtime:** `dist/scenarios-cf-eu-central-europe.js` (standalone; no helper load dependencies).

## Boundaries and order of battle

The theatre covers **Poland, Czechia, Slovakia, Hungary and Austria** as the E.U. defensive heartland (82 station cities). Chinese Federation reserves stage from the Kaliningrad/Baltic, western Belarus, western Ukraine, Romania and the western Balkans (20 station cities). All 102 cities use real settlement coordinates; the game's fictional ownership does not imply real geopolitical control.

**Germany is completely excluded:** no German city, no German occupation/province tile, no German naval staging, no German route and no German victory objective. Foreign land outside the playable country masks is `offmap`, not counterfeit water. The existing `european-war` module and its geographical assets are never touched.

- Geography: 156 × 100 centre-sampled offset hexes, WGS84 extent roughly 9.2°–28.0° E / 44.55°–56.15° N. Source rings are simplified Natural Earth polygons distributed as `johan/world.geo.json` (per-country geo.json); Germany's country ring is not imported. Three coastal/border settlement points receive **city-placement-only** allowances for simplification (Swinoujscie, Klaipeda, Belgrade), without assigning German terrain.
- Rivers: Vistula, Oder, Danube, Tisza, Morava and Drava; city bridge approaches exempt river-edge movement penalty.
- Relief: Sudetes, Tatras, Carpathians and Alps, with named pass clearances; forests in Silesia, Bohemia and the Carpathian foothills. Mountain hexes cost 2.
- Ports: **Baltiysk, Klaipeda, Swinoujscie, Kolobrzeg, Gdynia, Gdansk**. Each is an independent, capturable navigable sea hex with `portAt`, `portLevel` and `portOwner`. Baltic ships use faction-correct carrier/amphibious-frame fleets. Inland waterways are not erroneously connected to the Baltic.
- Production: all cities carry income, industry, science, fort shields and normal city production fields. Starting funding and standard income/recruitment/research/repair are exposed through normal engine hooks. `meta.elite`, `meta.eliteRosterOnly` and per-faction `eliteRosters` preserve Elite/HQ ownership and restriction behavior.
- Armies: named commanders and separately commandable Army Groups; dedicated northern/Vistula, Galician/Carpathian, Hungarian/Danube and Alpine operational axes, plus E.U. defensive industrial hubs. Data-only `meta.ai.operationalAxes` and `doctrine:'europe'` require no engine changes.
- Initial formation balance: **Chinese Federation 227 land + 10 naval = 237 formations; E.U. 187 land + 10 naval = 197 formations.** Large E.U. industrial and city advantage is offset by Chinese superiority in deployable starting field formations. This is a provisional starting state pending full combat simulation.
- Player and AI: both `cf` and `eu` supported; Normal, Hard, Challenge and Elite. Hard/Challenge strengthen the non-player's land stacks; Elite uses the standard European Elite conversion. No scripted enemy-only win conditions or force eliminations.

## Victory and progression

The scenario has no clock (`turnLimit: null`) and is won only when **every one of the 102 station cities** belongs to one faction. `winner(g)` returns the victorious side with an authentic conquest reason; no artificial completion flag, side-specific result, hardcoded medals, or shared reward override is added. Campaign-tier 5 credit and rewards are **integrator-owned**.

## Verification performed in isolated JavaScript runtime

The scenario source passed JavaScript compilation with `new Function` and module registration in an isolated runtime. An **engine-interface simulation harness**, not the full game engine, confirmed construction for both faction choices and Normal, Hard, Challenge and Elite before final unit-count rebalance. In those checks:

- 102 stations and both faction rosters were instantiated in each difficulty.
- All 6 port cells were independent sea tiles, with **788 / 788 deep-water cells connected** and each port in that connected basin.
- Units spawned on distinct cells in the harness; offmap tiles did not receive cities.
- No automatic winner at setup; forcing all cities to CF or EU returned the corresponding correct victory result; no turn limit.
- A simplified mobile-size proxy used 15,600 tile cells, 5,509 offmap cells and 788 navigable sea cells. **This is not a device frame-rate benchmark.**

**Important limitations:** The real `dist/engine.js` and `dist/engine/ai.js` are generated outputs not committed on the architecture branch. Full Node seeded simulations, genuine AI production/combat behavior, save/reload, real HQ and reward hooks, asset checks, browser/mobile rendering and regression baseline comparison **have not been executed** in the connected environment. Unit-count balance is therefore unproven, especially on Normal; do not mark the battle integrator-ready on the basis of the structural harness alone. The attempted reconstruction of generated bundles was blocked by the available execution interface's per-invocation tool-call limit.

## Integrator-only wiring

The **single campaign integrator**, not this scenario PR, must make the following shared edits:

1. In `dist/scenario-manifest.js` add to `SCENARIO_MANIFEST`:
   `{id:"cf-eu-central-europe",title:"Conquest of Central Europe",note:"102 cities · 2 sides · no Germany"}`
2. Add `'scenarios-cf-eu-central-europe.js'` to `SCENARIO_FILES` after normal engine loading, with no geography helper.
3. Run `node tools/generate-scenario-catalog.cjs`, updating `dist/scenario-catalog.js`.
4. In `dist/war-campaign.js`, replace the `federation-eu-central-europe` mission's null `scenarioId` with `cf-eu-central-europe` **only when actual full-engine tests pass**.
5. Verify the world campaign Central Europe political mask excludes German geography, including on route overlays. This is separate from the tactical mask.
6. Integrate rewards/save progression and refresh `tools/data/sim_baseline.txt` only with justified new-scenario lines (no differences to established scenarios).

## Required full-engine verification before integration

Run from a checked-out repository with the built source bundles:

```bash
python3 tools/build_sources.py
node --check dist/scenarios-cf-eu-central-europe.js
node tools/scenario_sim.cjs cf-eu-central-europe cf normal 11 5
node tools/scenario_sim.cjs cf-eu-central-europe eu normal 11 5
node tools/scenario_sim.cjs cf-eu-central-europe cf normal 29 30
node tools/scenario_sim.cjs cf-eu-central-europe eu normal 29 30
node tools/scenario_sim.cjs cf-eu-central-europe cf normal 47 60
node tools/scenario_sim.cjs cf-eu-central-europe eu normal 47 60
node tools/scenario_sim.cjs --all
node tools/validate_assets.cjs --tracked
```

Repeat 11/29/47 (and additional seeds) for Hard, Challenge and Elite; inspect winning rates, first-turn losses, Army Group targets, port mobility, navy production, industry/science, authentic research, repair, siege/counterattacks, total-city conquest, saves/reloads and reward award. Spot-check actual devices at different browser zooms. Adjust scenario-owned formation counts (more player-friendly units or fewer enemies) before asking for shared engine changes. Do **not** alter `main` or `european-war`.
