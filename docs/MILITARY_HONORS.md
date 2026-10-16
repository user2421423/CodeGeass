# Military Honors — feature branch design
## Principles
Honors record achievements; they cannot be equipped, transferred, purchased, or used to modify attack, defense, critical chance, or movement. Only recruited HQ commanders (`u.personal`) receive permanent service histories. Scripted commanders (`u.personal === false`) can receive operation-only recognition on the result screen.

## Original decorations and difficulty variants
| Decoration | Requirement |
|---|---|
| Order of Valor | Personally destroy a hostile commander-led unit (one award event per commander and operation) |
| Conqueror's Star | Personally capture an enemy capital (one citation per capital per operation, regardless of recaptures) |
| Marksman Ribbon | Personally destroy five enemy units directly in one operation (carrier cargo casualties do not count) |
| Campaign Ribbon | Make at least one direct attack, kill, or capture in a victorious Story Mode, Conquest or standalone Scenario operation |
| Bronze Laurel — Hard | Highest-contributing recruited HQ commander in a successful Hard Conquest |
| Silver Laurel — Challenge | Highest-contributing recruited HQ commander in a successful Challenge Conquest |
| Golden Laurel — Elite | Highest-contributing recruited HQ commander in a successful Elite Conquest |

Laurels are not awarded for Story Mode or standalone Scenarios. A conquest with no qualified personal HQ commander gives no Laurel. Contribution scoring: capital +10, commander defeat +5, other city capture +3, up to five direct kills +1 each. Ties: capitals, commander defeats, kills, commander ID. There is no standalone service points currency.

## Appearance
The seven transparent original medal renders are combined into `dist/assets/art/medals/medals.webp`, ordered: Valor, Conqueror, Marksman, Campaign, Bronze Laurel, Silver Laurel, Golden Laurel. Each slot is 128 × 128 pixels; the complete WebP sprite is 896 × 128 pixels. `dist/ui/honors.js` handles accessible labels and sprite positioning. `dist/honors.css` styles the Hall of Honors, Commander Info and post-operation award summaries.

## Persistence and recovery
`profile.roster[k].honors` is an array of `{ id, citations: [{ operation, difficulty, reason, turn, claimId }] }`. Additional victories add citations beneath the same decoration. `profile.honorClaims` prevents duplicate claims when a completed save is reopened; normal mission/conquest reward claims reuse their existing claim ID. Scenarios claim only honors, not command tokens or Elite fragments.

Story Mode missions can set their victory state outside the conquest victory checker; result-screen finalization ensures the Campaign Ribbon still awards after participation.

The existing shared `profile.medals` inventory and previously equipped `profile.roster[k].medals` are migrated once to `profile.legacyHonors`, preserving counts and any known *former equipped owner*, without claiming the former owner actually earned the award. Prior operation saves with the old `game.medalsEarned` format are also preserved in the historical archive when claimed. No rank, commission, star, commander ownership, or currency data is reset.

## Interface
Access the Hall of Honors from Command HQ → Commanders. The Hall shows the seven award designs, decorated HQ officers, detailed per-commander records, and a collapsible Legacy Honors section. Commander Info shows earned decorations and citations. Commander cards show a compact rack of the three most distinguished awards; excess honors are summarized. Operation result screens show both permanent HQ citations and temporary scripted recognition. No each-turn award pop-ups.
