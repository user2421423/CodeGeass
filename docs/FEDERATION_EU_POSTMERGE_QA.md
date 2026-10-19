# Federation vs E.U. — Post-merge simulation audit

This branch was created from `main` **after** campaign PR #141 was merged. Its sole purpose is to trigger and inspect real-engine Federation/E.U. AI simulations plus comparative regressions on the merged code. No gameplay changes in this branch.

CI: `.github/workflows/federation-eu-integration.yml`. Runs both factions on every new scenario through all four difficulties, 3 normal seeds for 6 turns, and 1 seed for 18 turns. Also checks real-engine initialization, ports, serialization and existing campaign deterministic behavior. PR should remain unmerged; main retains the campaign.
