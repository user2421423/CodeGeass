# Permanent Eliminator escorts: controlled AI experiments

**Status:** Experimental, not approved for merging. `main` and PR #48 are unchanged.

## Design implemented

- Keep one Eliminator guarding the highest-value friendly city cluster.
- Prefer available Tier 1 commanders for the remaining mobile charges.
- Allow eligible healthy **regular land combat units** to carry spare charges **permanently**, rather than requiring a handoff to Tier 1 commanders.
- Prefer valuable field formations when deciding where mobile carriers should maneuver, without disabling normal combat orders.
- Do not inspect enemy classified Eliminator sites, projects, or stockpiles.
- Preserve existing range, charge cap, research costs, launch mechanics, and transfer restrictions.

The experiment is based on PR #48 (starting commit `d91938563a8be614b4a1495fc8940793da0446a2`) and remains an independent feature branch.

## Validation

- Source-build synchronization: passed.
- Dedicated Eliminator tests: passed, including ordinary pickup, Tier 1 pickup priority, and ordinary-carrier missile interception.
- Full project regression suite, UI smoke, asset checks, and map validation: passed.
- [Eight-pair four-way screen](https://github.com/user2421423/CodeGeass/actions/runs/38383964778): all 9 jobs succeeded.
- [Thirty-pair three-way confirmation](https://github.com/user2421423/CodeGeass/actions/runs/38384775420): all **31 jobs succeeded** (30 matched simulations + validation).

## Full 30-pair results against pinned `main`

Identical seeds, game rules and turn counts. Fifteen 2017 wars at 45 turns and fifteen 2018 wars at 35 turns. Baseline `main` AI: `1cf9ca4f01d66d9acb1b7284fa710d95f2d1ee7d`. City/Tier 1 AI: `d91938563a8be614b4a1495fc8940793da0446a2`.

| Metric | Main baseline | Existing city/Tier 1 AI | Permanent escort + positioning |
|---|---:|---:|---:|
| Intercepted / launched, 2017 | 62 / 144 | 63 / 144 | 62 / 144 |
| Intercepted / launched, 2018 | 65 / 100 | 68 / 99 | 66 / 102 |
| **Total interceptions** | **127 / 244 (52.05%)** | **131 / 243 (53.91%)** | **128 / 246 (52.03%)** |
| **Mobile interceptions** | **75** | **10** | **8** |
| Avg. frontline unit value protected | 3.49% | 2.91% | **4.03%** |
| Avg. all friendly army value protected | **8.06%** | 7.25% | 7.72% |
| Avg. weighted city protection | 24.62% | 24.45% | **25.37%** |
| Avg. simultaneously carried charges per active side-turn | **0.866** | 0.237 | 0.313 |
| Carrier charge losses | 9 | **0** | 7 |

### Interpretation

Regular carriers plus formation-aware positioning improve measured frontline exposure coverage compared with both the original `main` and city-focused AI. The gain over `main` is 0.54 percentage points (4.03% versus 3.49%) and is not accompanied by an overall improvement in interceptions. Average friendly-army protection is also below `main`.

The severe collapse in mobile interception (**75 → 8**) remains. Even with more ordinary carriers, ready charges appear insufficiently mobilized into defended frontline areas at the moments enemy warheads target them. Potential remaining bottlenecks include regular-carrier eligibility, spare-charge lab locations, short retrieval routes, and timing of movement relative to F.L.E.I.J.A. launches; the experiment has not established which dominates.

### Decision

**Do not merge.** This is a working implementation of the approved permanent-carrier rule, with passing functional and regression tests, but it has **not** met the acceptance target of restoring mobile interception effectiveness while maintaining city defense. Keep the branch available for further isolated adjustments. No changes were made to `main` or PR #48.
