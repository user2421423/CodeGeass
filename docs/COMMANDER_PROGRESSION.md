# Commander progression and Commission design

**Military rank:** Tactical Command (Second Lieutenant to Major) permits 2 combat stars and 4 Mobility stars; Operational Command (Lieutenant Colonel to Major General) permits 4 combat and 5 Mobility stars; High Command (Lieutenant General to Marshal) permits 6 combat and 6 Mobility stars. Rank does not determine generic skill slots.

**Commission:** Standard Commission has 1 generic skill slot, Distinguished 2, Legendary 3. All commissions may rank up; signature abilities do not consume generic slots. Initial Commission replaces storyTier and commander rarity stars, while campaign-mission stars and Elite Force levels remain separate.

**Global High Command:** The persistent player profile starts with 2 High Command positions, shared across factions. Every owned commander of rank Lieutenant General, General or Marshal occupies one. There is no one-Marshal rule. An HQ expansion method allows extra positions up to 6, with purchase validation. Prices for additional positions are unapproved and intentionally null/disabled.

**Retirement:** Retire a High Command officer to Major General, refund 90% of recorded costs for the rank promotions and purchased stars forfeited above the Operational limits, and release a position. There is no extra retirement fee. Commission level and generic skills remain intact. Excess medals return to the profile's inventory. Legacy spending without an itemized ledger can only be estimated from the old rank/initial ratings.

**Commission upgrades:** Permanent Standard → Distinguished → Legendary upgrades have engine validation and UI scaffolding. Prices remain null/disabled until approved, to prevent inventing or silently changing prices. Current recruitment, rank, star, generic skill and research costs remain unchanged.

**Migration:** Existing personal ratings above their rank's limits remain recorded but inactive until promoted. The once-only profile migration resolves existing global High Command over-cap situations by keeping the two highest-ranked officers, then demoting the remainder with a full refund of estimable forfeited purchases. New persistent commander records start at Second Lieutenant with Tactical-limited ratings; fixed operation commanders remain unchanged.

**Implementation:** Source files in src/engine are deployed via the standard build_sources scripts to create ignored dist/engine.js. Commander data and UI files in dist are tracked. Do not replace this build step with a hand-edited dist/engine.js.
