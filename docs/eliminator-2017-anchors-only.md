# Anchors-only 2017 Eliminator defense ablation

**Unmerged experimental branch** from `experiment/eliminator-launch-diagnostics`. This retains PR #69's 2017 forward-threat stationary-anchor allocation (capital preference, limited second forward-city charge) but restores baseline laboratory production priorities by forcing the forward-city lab score to zero. Its 2018 stationary city anchor allocator is unchanged from baseline.

It is not intended to merge independently. The sibling `experiment/eliminator-2017-production-only` contains the [20-seed four-way simulation workflow](https://github.com/user2421423/CodeGeass/actions/workflows/eliminator-production-anchor-ablation.yml), which compares this branch's pinned AI bundle with the production-only variant, combined PR #69, and original baseline. Do not infer anything until those simulations finish; do not change `main`.
