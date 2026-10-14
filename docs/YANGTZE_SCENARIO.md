# Battle of the Yangtze River — standalone regional scenario

- Branch: `scenario/bf-yangtze` (from `feature/federation-war-campaign-structure`).
- Scenario ID: `bf-yangtze`, registered only in Standalone Scenarios. The central World Campaign registry remains untouched.
- Playable factions: Holy Britannian Empire and Chinese Federation; Normal, Hard, Challenge and Elite.
- 196 × 122 north-up WGS84 hexes; 60 cities, from Yichang and Jingzhou through Wuhan, Jiujiang, Anqing, Wuhu and Nanjing to Zhenjiang.
- Britannia starts south of the Yangtze with seven major attacking Army Groups. Federation positions include northern fortified lines, contested south-bank enclaves and a strategic reserve.
- Nine named crossing corridors, separate capturable river ports and shallow-water units using the existing Portman/Shui Gun Ru models. There are no implausible ocean carrier battles in shallow upper reaches.
- Main navigable channel is a simplified geographical polyline through historical bends. Han, Qingjiang, Gan and other tributaries appear as geographical underlay only; shallow rivers are **not** imaginary navy routes.
- Land and naval tactics use existing engine rules. Named bridge decks are mixed `coast` hexes: ground troops and vessels can traverse them. All other shoreline hexes use sampled 20–80% water-coverage classification.
- Two-sided AI retains the existing `europe` multi-front operational doctrine and standard emergency city-defense, offensive redirection, reinforcement and combat mechanics. The Federation AI now activates emergency objectives at threatened crossing corridors once Britannian ground units establish a north-bank bridgehead, concentrating otherwise standard defensive fronts and counters. The northern reserve is physically deployed inland rather than assumed available at every crossing.
- Victory is **control of all 60 cities**, with no turn limit.

## Design and connectivity review

Map construction includes explicit runtime assertions for the continuous main river waterway, each port's adjacency and river-network access, and traversable land routes across the river. These are part of normal scenario creation, not a new regression-test suite.

**Limitations:** the river's hex width is expanded relative to real geography so ships and bridges work on a roughly 4–5 km hex grid; named tributaries are explanatory map features and do not independently constrain ordinary land movement. No gameplay simulations or automated regression tests have been run for this branch. Verify actual opening balance and ship/passability behavior with manual playtesting before merging.
