# Crossing the Suez Canal — Federation vs E.U.

**Runtime ID:** `cf-eu-suez`  
**World Campaign objective:** `federation-eu-suez` (Tier 3, mission 8)  
**Ownership:** scenario lane only; PR from `scenario/cf-eu-suez` into `feature/federation-vs-eu-campaign-architecture`.

## Battlefield

This standalone two-sided battle places the Chinese Federation in Sinai and the E.U. on the Egyptian west bank. A 144 × 112 hex map extends from 28.75–35.55°E and 27.65–32.05°N. It includes 46 cities with WGS84 anchors, including Cairo, Alexandria, Ismailia, Port Said, Suez, Mansoura, Damietta and the Nile Delta, as well as Sinai staging settlements. Political ownership is assigned to contiguous land provinces; sea is never colored as land.

The Mediterranean, the Gulf of Suez and Gulf of Aqaba have interpolated shorelines drawn from real named localities. The Suez Canal is actual navigable water and must be slightly exaggerated in width at tactical hex resolution. **Qantara, Ismailia and Suez** have designated dual-passable coast-hex bridge/ferry corridors for land crossings while remaining traversable to ships. Away from these corridors, the canal blocks direct overland movement. The Nile and its Rosetta/Damietta branches apply river crossing costs except at bridge cities.

E.U. heavy formations defend the west bank and interior; Federation spearheads strike on the northern, central and southern axes, supported by mobile reserves and fleets in the Mediterranean and Red Sea. The scenario uses existing named commanders, faction-correct formations, Elite Forces, production, repairs, research and capturable independent sea-hex ports. AI behavior is configured through scenario `meta.ai` rather than any global scenario-ID special case. Both sides can play Normal, Hard, Challenge and Elite, with shared HQ and medal rules intact.

The Federation's Sinai bases are cities, but **`expeditionSide:'cf'`** also preserves its units if its final city falls. E.U. wins only upon holding every theatre city **and** eliminating all surviving Chinese formations, including embarked cargo; China wins only by genuine total city conquest. There is no artificial turn limit.

## Integrator dependencies — not edited in scenario lane

1. Add `{id:'cf-eu-suez',title:'Crossing the Suez Canal',note:'46 cities · 2 sides · canal crossing'}` to `SCENARIO_MANIFEST` in `dist/scenario-manifest.js`.
2. Add `'scenarios-cf-eu-suez.js'` to `SCENARIO_FILES`, after shared scenario prerequisites; **no geography helper** or other local module is required.
3. Regenerate `dist/scenario-catalog.js`; update the integrator-owned baseline in `tools/data/sim_baseline.txt` if required by the added runtime.
4. Change the `null` scenario ID for objective `federation-eu-suez` to `cf-eu-suez` in the World Campaign registry **only after integrated verification**. Review the provisional Egypt strategic-map polygon separately so it does not color water, foreign land or off-mission regions.
5. No changes to shared AI, commanders, assets or engine systems are requested.

## Validation still required

The isolated scenario file is deliberately *not loaded through the shared manifest* on this branch. A runnable integrated checkout must execute: build/syntax checks, faction setup for all four difficulties, seeded short and extended AI simulations for both factions, offensive/defensive production, connected coast/canal ship travel and port captures, bridge crossing accessibility, save/reload, expedition-elimination victory, normal winnability, Elite/HQ/rewards, mobile visual performance and baseline/regression checks. **None of these full-engine runs should be reported as passed without actual execution.**

Commands after temporary integration on a local test checkout:

```
python3 tools/build_sources.py
node --check dist/scenarios-cf-eu-suez.js
node tools/federation_eu_campaign_smoke.cjs
node tools/scenario_sim.cjs cf-eu-suez cf normal 11 5
node tools/scenario_sim.cjs cf-eu-suez eu normal 11 5
node tools/scenario_sim.cjs cf-eu-suez cf normal 37 35
node tools/scenario_sim.cjs cf-eu-suez eu normal 37 35
node tools/scenario_sim.cjs --all
```

Repeat seeds 11, 19, 37, 73 at multiple difficulties; inspect win rates and capture locations. Prefer adding allied starting formations or reducing opposing counts for balance before altering mechanics. AI-v-AI victory rates are not a substitute for testing realistic player win conditions.
