# Knightmare Conquest — complete Story Mode Normal audit

Audit date: 19 October 2026. Baseline `main`: `d85b878632b9652f5551f5cdd3a9eb71c35806f6`.

**Method:** 58 missions × 8 fixed seeds = 464 complete tactical AI-vs-AI engine simulations. All six Story campaigns included. No mainline game-balance changes. Automated players do **not** use human-style factory production or manual commander tactics; **0/8 is not a demonstration of logical impossibility or human failure rate**.

Source run: https://github.com/user2421423/CodeGeass/actions/runs/39185430135

## Executive summary

- 21/58 missions (36%) returned zero player-side AI wins.
- Six more missions returned only one or two victories out of eight.
- No engine exceptions, stalled/unresolved runs, or dangling city/commander objective references were detected.
- The most pressing category is immediate loss of a protected commander or protected objective city, sometimes by turn 1–4.
- A second category is timed objectives where the AI may not coordinate capture-and-escape sequencing. These require manual playtests before changing difficulty.
- **Major methodological gap:** In Story Mode, the built-in AI does not initiate ordinary factory production for any of the 58 player factions. Human players can build where eligible. This matters greatly for longer and defensive missions.

## Campaign scorecard

| Campaign | Missions | 0/8 AI wins | 1–2/8 AI wins |
|---|---:|---:|---:|
| Black Knights S1 | 9 | 3 | 0 |
| Britannia S1 | 10 | 1 | 2 |
| Black Knights R2 | 12 | 4 | 0 |
| Britannia R2 | 11 | 5 | 2 |
| Euro Britannia | 8 | 5 | 1 |
| E.U. | 8 | 3 | 1 |

## Priority 1 — Early catastrophic losses

**These are the strongest Normal difficulty balance concerns,** because losses occur before production and maneuver offer much opportunity. Suggestions are proposals, not implemented.

| Mission | Observed failure | Targeted intervention to test |
|---|---|---|
| `eu_ambush` | Akito eliminated on turn 1–2 | Start Akito behind cover, strengthen escort; inspect opening scripted blast |
| `bk_pacific` | Zero eliminated by turn 2 | Protect Zero's initial position; reduce nearby attacking ace pressure |
| `br_mausoleum` | Forbidden City or Schneizel lost from turn 2 | Fortify objective and immediate inner perimeter; strengthen Schneizel's escort |
| `br_kagoshima` | Settlement falls from turn 3 | Reinforce city's inner garrison; reduce early BK/CF attack formations |
| `bk5` | Zero lost from turn 4 | Strengthen/relocate Zero's guard in Babel Tower |
| `bk_yokosuka` | Zero dies around turn 4 | Extra screen near Zero before Britannian counterattack |
| `br_yokosuka` | Cornelia dies after Black Knights' turn-3 arrival | Fortify Cornelia's G-1; reconsider tanker-blast damage and attackers |
| `eb_ark` | Ashley dies by turn 4–5 | Strengthen Ashley's bridge defense |
| `eb_weisswolf` | Shin dies by turn 4 | Protect Shin rather than broadly increasing every formation |
| `eb_assault` | Shin dies by turn 5 | Improve Shin's retreat/escort formation |
| `eu_narva` | 132nd Regiment Column falls by turn 4–5 | Strengthen column garrison and first-contact defenders |
| `br7` | Sakuradite Refinery falls by turn 6 | Fortify refinery and Power Plant, not distant cities |
| `br6` | Eastern Field HQ lost by turn 6–7 | Move defensive reserves toward Eastern Field HQ |
| `br11` | Lelouch killed within first six turns | Protect Lelouch; verify defending forces in Damocles assault |
| `bk2` | Zero killed in seven of eight trials | Add protection to Zero; reduce initial Britannian pressure |

## Priority 2 — Deadline or scripted-objective bottlenecks

**A 0/8 AI result here is not enough to justify changing gameplay balance**: AI often fails to escort/reposition the named unit, while a player may be able to do so.

| Mission | Observed failure | Next investigation |
|---|---|---|
| `bk_tohdoh` | All eight timed out; allied enemies often eliminated but Tohdoh didn't reach Escape Route | Investigate Tohdoh's post-release path and ensure objective is signposted |
| `bk_rescue` | Six timeouts; two Zero deaths | Investigate combined capture→escape sequencing and disconnected start positions |
| `bk_yokosuka2` | Eight timeouts reaching Britannian Flagship | Improve approach force and shield breakdown; examine long route |
| `br_yokosuka2` | Eight timeouts reaching Black Knights Submarine | Improve initial attack group and path toward submarine |
| `eb_petersburg` | Four timeouts and four Shin deaths | Strengthen Shin's escort and reduce distance/shield pressure |
| `eu_paris` | Eight timeouts attempting to kill Smilas | Improve access to Smilas / remove obstructing defenders |

## Priority 3 — Low-success missions

| Mission | Observed failure | Next investigation |
|---|---|---|
| `br1` | 1/8, seven timed out | First Britannian mission: improve speed of advance and formation strength |
| `br_mef` | 2/8, six timed out | Bolster assault units vs Bamides fortress |
| `br_xiaopei` | 1/8, loss of Schneizel or Mausoleum Road | Protect Schneizel and critical road |
| `br8` | 1/8, Government Bureau captured | Fortify Government Bureau |
| `eb_slonim` | 1/8, Ashley lost seven times | Support Ashley near front |
| `eu_slonim` | 1/8, Leila killed or deadline passed | Protect Leila and strengthen line-breaker |

## Every mission

| Campaign | Mission | Initial player / hostile / allied formations | AI wins / 8 | Earliest failed turn | Common failure |
|---|---|---:|---:|---:|---|
| Black Knights S1 | `bk1` | 11 / 8 / 0 | 6/8 | 5 | — |
| Black Knights S1 | `bk2` | 6 / 10 / 0 | 0/8 | 3 | Lelouch vi Britannia / Zero lost (7); Turn limit (1) |
| Black Knights S1 | `bk3` | 6 / 11 / 6 | 7/8 | 5 | — |
| Black Knights S1 | `bk_yokosuka` | 11 / 11 / 3 | 0/8 | 4 | Lelouch vi Britannia / Zero lost (8) |
| Black Knights S1 | `bk_tohdoh` | 8 / 9 / 0 | 0/8 | 15 | Turn limit (8) |
| Black Knights S1 | `bk_shikine` | 11 / 9 / 0 | 7/8 | 4 | — |
| Black Knights S1 | `bk_fukuoka` | 6 / 11 / 5 | 8/8 | — | — |
| Black Knights S1 | `bk_saz` | 11 / 10 / 0 | 8/8 | — | — |
| Black Knights S1 | `bk4` | 11 / 11 / 0 | 8/8 | — | — |
| Britannia S1 | `br1` | 9 / 10 / 0 | 1/8 | 17 | Turn limit (7); Victory (1) |
| Britannia S1 | `br2` | 7 / 3 / 0 | 7/8 | 5 | — |
| Britannia S1 | `br_mef` | 6 / 5 / 0 | 2/8 | 14 | Turn limit (6); Victory (2) |
| Britannia S1 | `br3` | 9 / 5 / 0 | 8/8 | — | — |
| Britannia S1 | `br4` | 11 / 8 / 0 | 4/8 | 6 | — |
| Britannia S1 | `br_yokosuka` | 10 / 3 / 0 | 0/8 | 4 | Cornelia li Britannia lost (8) |
| Britannia S1 | `br_tohdoh` | 14 / 8 / 0 | 4/8 | 6 | — |
| Britannia S1 | `br_shikine` | 8 / 8 / 0 | 8/8 | — | — |
| Britannia S1 | `br_fukuoka` | 6 / 10 / 0 | 8/8 | — | — |
| Britannia S1 | `br5` | 16 / 10 / 0 | 5/8 | 6 | — |
| Black Knights R2 | `bk5` | 4 / 6 / 1 | 0/8 | 4 | Lelouch vi Britannia / Zero lost (8) |
| Black Knights R2 | `bk_rescue` | 3 / 8 / 1 | 0/8 | 1 | Turn limit (6); Lelouch vi Britannia / Zero lost (2) |
| Black Knights R2 | `bk_pacific` | 11 / 10 / 0 | 0/8 | 2 | Lelouch vi Britannia / Zero lost (8) |
| Black Knights R2 | `bk_yokosuka2` | 8 / 10 / 0 | 0/8 | 13 | Turn limit (8) |
| Black Knights R2 | `bk_zhengzhou` | 7 / 7 / 0 | 8/8 | — | — |
| Black Knights R2 | `bk_xiaopei` | 11 / 14 / 0 | 5/8 | 13 | — |
| Black Knights R2 | `bk6` | 8 / 8 / 5 | 8/8 | — | — |
| Black Knights R2 | `bk_geass` | 9 / 11 / 0 | 8/8 | — | — |
| Black Knights R2 | `bk8` | 9 / 11 / 5 | 8/8 | — | — |
| Black Knights R2 | `bk7` | 10 / 12 / 0 | 7/8 | 7 | — |
| Black Knights R2 | `bk9` | 12 / 11 / 4 | 7/8 | 9 | — |
| Black Knights R2 | `bk10` | 10 / 12 / 5 | 6/8 | 11 | — |
| Britannia R2 | `br7` | 8 / 8 / 0 | 0/8 | 6 | Sakuradite Refinery lost (8) |
| Britannia R2 | `br_pacific` | 10 / 8 / 0 | 8/8 | — | — |
| Britannia R2 | `br_yokosuka2` | 9 / 8 / 0 | 0/8 | 13 | Turn limit (8) |
| Britannia R2 | `br_xiaopei` | 7 / 9 / 12 | 1/8 | 6 | Schneizel el Britannia lost (4); Mausoleum Road lost (3); Victory (1) |
| Britannia R2 | `br_mausoleum` | 7 / 14 / 8 | 0/8 | 2 | Vermillion Forbidden City lost (4); Schneizel el Britannia lost (4) |
| Britannia R2 | `br_kagoshima` | 11 / 14 / 0 | 0/8 | 3 | Kagoshima Settlement lost (8) |
| Britannia R2 | `br8` | 11 / 10 / 0 | 1/8 | 7 | Government Bureau lost (7); Victory (1) |
| Britannia R2 | `br_kamejima` | 4 / 7 / 0 | 4/8 | 14 | — |
| Britannia R2 | `br9` | 9 / 10 / 0 | 6/8 | 3 | — |
| Britannia R2 | `br10` | 10 / 12 / 0 | 6/8 | 8 | — |
| Britannia R2 | `br11` | 10 / 11 / 0 | 0/8 | 3 | Lelouch vi Britannia lost (8) |
| Euro Britannia | `eb_narva` | 10 / 8 / 0 | 8/8 | — | — |
| Euro Britannia | `eb_slonim` | 12 / 10 / 0 | 1/8 | 2 | Ashley Ashra lost (7); Victory (1) |
| Euro Britannia | `br6` | 11 / 14 / 0 | 0/8 | 6 | Eastern Field HQ lost (8) |
| Euro Britannia | `eb_petersburg` | 8 / 9 / 0 | 0/8 | 11 | Turn limit (4); Shin Hyuga Shaing lost (4) |
| Euro Britannia | `eb_ark` | 11 / 5 / 0 | 0/8 | 4 | Ashley Ashra lost (8) |
| Euro Britannia | `eb_weisswolf` | 13 / 12 / 0 | 0/8 | 4 | Shin Hyuga Shaing lost (8) |
| Euro Britannia | `eb_assault` | 9 / 9 / 0 | 0/8 | 5 | Shin Hyuga Shaing lost (8) |
| Euro Britannia | `eb_fall` | 10 / 12 / 4 | 6/8 | 4 | — |
| E.U. | `eu_narva` | 8 / 11 / 0 | 0/8 | 4 | 132nd Regiment Column lost (8) |
| E.U. | `eu_ambush` | 5 / 5 / 0 | 0/8 | 1 | Akito Hyuga lost (8) |
| E.U. | `eu_slonim` | 10 / 13 / 0 | 1/8 | 7 | Leila Malcal lost (4); Turn limit (3); Victory (1) |
| E.U. | `eu_front` | 13 / 12 / 0 | 6/8 | 12 | — |
| E.U. | `eu_ark` | 9 / 12 / 0 | 6/8 | 5 | — |
| E.U. | `eu_weisswolf` | 11 / 11 / 0 | 6/8 | 4 | — |
| E.U. | `eu_assault` | 9 / 9 / 0 | 8/8 | — | — |
| E.U. | `eu_paris` | 6 / 13 / 0 | 0/8 | 13 | Turn limit (8) |

## Interpretation and follow-up test requirements

1. **Manual playtests:** Prioritize early-loss missions in Priority 1, followed by timed/escort objectives.
2. **Production-aware AI baseline:** Run a second set of seeded tests in which the simulated player can use the same legal factories/reinforcements available to a human.
3. **Before adjusting any mission:** Try targeted Normal-only garrisons near its critical city or commander, rather than blanket stat buffs or movement/turn-limit changes.
4. **Regression:** Re-run the same eight seeds for all 58 missions after changes to detect collateral effects.
5. **Difficulty parity:** Preserve Hard, Challenge and Elite values unless an independent audit demonstrates they also need changes.

Note: the report summarizes deterministic results, not statistical estimates of human win rates; sample size is eight seeds per mission.