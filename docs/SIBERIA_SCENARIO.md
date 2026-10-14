# Invasion of Siberia — branch verification

Branch: `scenario/britannia-siberia`, branched from `feature/campaign-world-map`.
No merge into `main` or into the parent feature branch.

## Scope

- Standalone scenario ID: `britannia-siberia`, selectable as Britannia or E.U.
- Campaign objective: `britannia-siberia` in the existing Tier 3; the South Africa placeholder and all other tiers remain intact.
- Regional map: 160 × 88 (14,080 tactical hexes) from 55° to 180° E and 47° to 79° N.
- 49 real named settlements (13 Britannian footholds, 36 E.U. cities); 9 independent naval ports.
- 19-sample GSHHG coastline coverage. 20–80% mixed shore remains `coast`; land/sea and coastal cells are stored separately.
- Arctic tundra is tagged by biome while retaining the game's standardized playable `plains` type; no new combat terrain stats.
- Eastern Britannian Army Groups, strong E.U. defensive cities and reserve formations, railway cities, Arctic and Pacific naval contingents.
- Rivers: Lena, Yenisei, Ob, Irtysh, Angara and Amur rendered from geographic coordinates. They are visual overlays, not new water-path mechanics.
- Uses the shared European-style multi-front scenario AI with persistent column assignments, reinforced cities, strategic redeployment and production; no shared AI or faction stats changed.
- Normal, Hard, Challenge and Elite difficulty supported by the existing regional rules.
- Victory strictly requires every city to be owned by one faction. No turn limit.

## Reproducibility

```sh
node tools/build_sources.cjs --check
node tools/siberia_hex_audit.cjs
node --test tests/siberia.test.cjs tests/war-campaign.test.cjs
node --test tests/*.test.cjs
for side in britannia eu; do
  for seed in 11 29 47; do node tools/siberia_sim.cjs "$seed" 3 "$side"; done
done
```

The branch's GitHub Actions workflow runs the same verification. The static coastline counts describe the mask, not a substitute for simulation results. Multi-seed AI results must be read from the action logs; do not claim balancing or completion based on a short smoke test.
