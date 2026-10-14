# Eliminator defensive AI — isolate production vs anchor placement

**No merge to main.** This is a controlled follow-up to [PR #69](https://github.com/user2421423/CodeGeass/pull/69), in which 20 matched 2017 wars improved mobile interceptions and carrier survival but diminished city-value coverage, and [PR #70](https://github.com/user2421423/CodeGeass/pull/70), which proved inert.

## Experimental design

Compare **four** 2017 defensive AIs using the *same game engine and seeds*, replacing only `dist/engine/ai.js`:

1. **Baseline** — original diagnostic AI, `6e452e5ca7f3148c9392d37701c1e93897a3386e`.
2. **Production-only** (this branch) — preserve the original stationary charge assignment, but enable 2017 forward-city laboratory priority and public-battlefield threatened-city score. Original 2018 unchanged.
3. **Anchors-only** (sibling `experiment/eliminator-2017-anchors-only`) — retain the forward-threat second-anchor/primary-capital policy but **disable** forward-city lab ranking; original 2018 unchanged.
4. **Combined PR #69** — changes both production and anchors.

The distinction isolates whether the measured 2017 gains and city protection loss originate in lab/build prioritization, charge positioning, or their interaction. This is ablation, not a claim of improvement.

## CI

The [four-way matched workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-production-anchor-ablation.yml) runs 20 paired 2017 wars (45 turns), plus six matched 2018 wars (35 turns) with strict equivalence assertions against the original AI for all three experimental variants; full Node tests, build-sync, UI smoke. It collects attacks, interceptions (fixed/mobile), charge production/transfer, carrier losses, army/frontline and weighted-city protection. Twenty 2017 + six 2018 matrix jobs + validation = 27 jobs, within the connector job-list page limit.

**No enemy Eliminator secrets, interception mechanics, Tier 1 offensive F.L.E.I.J.A. targeting, 2018 gameplay or `main` changes.**

## Results

Pending.

## Completed four-way ablation — 20 matched 2017 wars, 6 neutral 2018 controls

[All 27 jobs succeeded](https://github.com/user2421423/CodeGeass/actions/runs/38552666399). Each seed used identical game rules, switching only defensive AI. All six 2018 seeds passed strict full-gameplay neutrality against the original AI for all three candidates.

| 2017 outcome | Baseline | Production-only | Anchors-only | Combined |
|---|---:|---:|---:|---:|
| Missile launches | 187 | 189 | 188 | 188 |
| Missile interceptions | 80 | 85 | 83 | 85 |
| Mobile interceptions | 1 | 7 | 1 | 9 |
| Carrier losses | 7 | 5 | 5 | 4 |
| Mean army coverage | 10.29% | 10.43% | 9.97% | 10.19% |
| Mean frontline coverage | 11.10% | 12.12% | 10.27% | 11.55% |
| Mean weighted city coverage | 19.59% | 16.86% | 20.35% | 17.71% |

**Diagnosis:** The additional 2017 forward-city *production* score is the major driver of improved mobile interception and the loss of weighted city coverage. Changing *stationary anchor* assignments independently mildly improves weighted city coverage but does not increase mobile interceptions above baseline. The prior combined change does not resolve this trade-off. Neither feature is compelling enough to merge independently.

**Next:** a separately branched restrained-production/anchor hybrid using weaker forward lab priority and a high-value city anchor. Measure new candidate against these four controls, not only the combined candidate. Do not modify `main`.
