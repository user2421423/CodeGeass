# Britannia–Federation World Campaign structure

This branch extends **World Campaign Mode** (the world-map regional battle progression), not the separate scripted Story Mode. It preserves the two existing E.U.–Britannia campaigns and adds two **independent conflicts**.

## Campaign tracks

| Campaign ID | Player faction | Opponent | Status |
| --- | --- | --- | --- |
| `eu` | Europia United | Britannia | Existing; unchanged |
| `britannia` | Holy Britannian Empire | Europia United | Existing; unchanged |
| `britannia-federation` | Holy Britannian Empire | Chinese Federation | Eight approved battles integrated |
| `federation-britannia` | Chinese Federation | Holy Britannian Empire | Empty planning track; no battles approved |

### Britannia vs Chinese Federation

Only the following **eight approved objectives** are present. Tier grouping below is a *provisional implementation scaffold*, not a newly approved narrative order.

| Tier | Objective | Implementation |
| --- | --- | --- |
| 1 – Opening Battles | Invasion of the Philippines | Reuses the existing `philippines-invasion` regional scenario as Britannia |
| 1 – Opening Battles | Defense of Indochina | Reuses `conquest-indochina` as Britannia |
| 2 – Securing the Flanks | Battle of the Strait of Malacca | Implemented as `bf-malacca` |
| 2 – Securing the Flanks | Invasion of Korea | Implemented as `invasion-korea` |
| 2 – Securing the Flanks | Iraq–Iran Campaign | Implemented as `britannia-iraq-iran`, grouped as one campaign battle |
| 3 – Invasion of South China | Invasion of South China | Implemented as `bf-south-china` |
| 4 – The Yangtze Front | Battle of the Yangtze River | Implemented as `bf-yangtze` |
| 5 – The Imperial Capital | Battle of Luoyang | Implemented as `battle-luoyang`, intended finale |

Malacca's strategic purpose is to cut off the Federation's western maritime access to Indonesia; South China advances north from Indochina; the Yangtze is a separate river-crossing war.

### Federation vs Britannia

No battles have been approved. The campaign appears in the faction selector with one empty planning tier and a clear message; it does not fabricate objectives, markers or unlocks. Once battles are selected, replace the empty `federationBritanniaRows` with approved objectives and meaningful tiers.

## Architecture

- The identifiers of the original `eu` and `britannia` campaign tracks are unchanged.
- New IDs distinguish **campaign identity** from **engine combat faction**. `britannia-federation` plays as `britannia`; `federation-britannia` plays as `cf`.
- All four campaign tracks have independent victory/progress maps under the existing version-1 local storage format. Existing progress and existing selected tracks remain readable.
- Map colors, flags, and territorial overlays use the actual engine faction, not the campaign ID.
- Unimplemented objectives have `scenarioId: null`: they cannot launch, complete, or advance a tier.
- The Federation planning tier is genuinely empty and cannot auto-complete.
- Regional Scenarios, Story Mode and ordinary Conquest are unaffected.
- Six new regional scenarios, AI integration and geographic underlays have been integrated. No regression tests or simulations were added or run.

All eight approved campaign rows now use their registered standalone scenario IDs. Further Federation-side missions remain unapproved, and no new scenarios may be added to that track without approval.
