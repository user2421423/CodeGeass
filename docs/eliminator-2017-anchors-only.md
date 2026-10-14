# Anchors-only 2017 Eliminator defense ablation

**Unmerged experimental branch** from `experiment/eliminator-launch-diagnostics`. This retains PR #69's 2017 forward-threat stationary-anchor allocation (capital preference, limited second forward-city charge) but restores baseline laboratory production priorities by forcing the forward-city lab score to zero. Its 2018 stationary city anchor allocator is unchanged from baseline.

It is not intended to merge independently. The sibling `experiment/eliminator-2017-production-only` contains the [20-seed four-way simulation workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-production-anchor-ablation.yml), which compares this branch's pinned AI bundle with the production-only variant, combined PR #69, and original baseline. Do not infer anything until those simulations finish; do not change `main`.

## Measured result

[Four-way AI trials, 27/27 jobs passed](https://github.com/user2421423/CodeGeass/actions/runs/38552666399). Across twenty identical 2017 seeds, anchors-only intercepted 83/188 versus 80/187 baseline, with mobile interceptions unchanged at 1; carrier losses improved 7→5, mean weighted-city coverage improved 19.59%→20.35%, but mean army coverage slipped 10.29%→9.97% and frontline coverage 11.10%→10.27%. Six 2018 neutrality comparisons produced identical outcomes.

**Hold, do not merge.** This isolates a promising city-protection lever, not a decisive all-around force-defense improvement. A separate restrained-production hybrid may recover mobile interception advantages without sacrificing the higher city coverage.
