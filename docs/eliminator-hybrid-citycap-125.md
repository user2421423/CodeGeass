# 2017 bounded production hybrid, CAP 1.25

**Separate, unmerged experimental branch**. Same 2017 stationary-charge positioning as anchors-only PR #72, plus forward-lab production priority capped at 1.25× each lab's baseline `eliminatorCoverageValue` for an existing mobile-capable side. Before the first charge exists, no forward bonus is granted. 2018 uses unmodified baseline AI.

Compare in the sibling [CAP 0.50 branch's 26-seed four-way CI](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-hybrid-citycap.yml) against CAP 0.50, anchors-only and original defensive AI. This branch intentionally has no new regression-test files. No offensive F.L.E.I.J.A. changes; no `main` changes.

## Results — completed paired comparison (HOLD; best city coverage, weaker field protection)

[All 27 GitHub Actions jobs passed](https://github.com/user2421423/CodeGeass/actions/runs/38557249804): existing Node suite, source/build sync and UI smoke; 20 matched 2017 four-way simulations; six unchanged-gameplay 2018 trials.

| 2017 metric | Baseline AI | Anchors-only | CAP 0.50 | CAP 1.25 |
|---|---:|---:|---:|---:|
| Incoming strikes | 187 | 188 | 193 | 189 |
| Intercepted | 80 | 83 | 88 | 84 |
| Mobile interceptions | 1 | 1 | 3 | 3 |
| Carrier losses | 7 | 5 | 8 | 5 |
| Mean army protection | 10.29% | 9.97% | 8.93% | **9.60%** |
| Mean frontline protection | 11.10% | 10.27% | 8.16% | **9.66%** |
| Mean weighted city coverage | 19.59% | 20.35% | 18.29% | **20.70%** |

CAP 1.25 is the most city-protective variant, +1.11 percentage points versus untouched baseline. It protects less army value (-0.69 pt) and less frontline value (-1.44 pt) than original, though carrier losses fall 7→5. Relative to anchors-only, city coverage improves +0.35 pt, while frontline coverage falls 0.61 pt. All comparisons use the same engine, only the defensive AI bundle differs; larger sample sizes are needed to establish stability.

**Decision: keep this a draft, unmerged.** It is the stronger of the two capped hybrids but not demonstrably superior overall. Consider one further, explicit *value-preserving* defensive production gate (that withholds a lab bonus when it abandons essential city/field protection), or accept the baseline depending on priorities; never assert broad improvement without new matched evidence. `main` unchanged.
