# Approved 40 commanders — implementation branch

Branch: `feature/approved-40-commanders-20261012`. Based on `main` on 12 October 2026. **Do not merge without playtesting.**

## Scope

- All 40 user-approved additional commander records, for 98 total (58 pre-existing + 40 new).
- Existing 58 commander definitions and base ratings remain byte-for-byte identical.
- The 40 additions have assigned stars, recruit costs, branches, mobility ratings, signature skills and active commands.
- Branch-local support for interception, overwatch, targeting/jamming, morale effects, city economy/sabotage, reinforcement, elite modification, defensive fire, combined-arm encirclement and AI ability use.
- Faction support for the approved independent/guest characters in Conquest HQ. These are recruits available to three major powers; they are not a new playable country.
- Corrected special cases: Xia Wang must be city-capturing infantry; Shamna protection expires at recipient turn; Tianzi discount only for land purchases; Sarah jamming blocks after-attack reposition; border captures grant Xia Wang the city-output-based windfall.

## Artwork status

33 / 40 new commander portrait URLs are indexed in `tools/approved-40-portrait-sources.json`.
They are **provisional HTTPS hotlinks**, not local copies, because the available GitHub file interface could not import binary artwork. External hosts can refuse hotlinking or remove images. The existing 58 portraits remain local and unchanged.

Still requiring confirmed portraits:
- Pierre Anou
- Xu Xinfeng
- Colonel Ren
- Cheng Zhong
- Huang Qian
- Mutsuki Minase
- Indira Tharoor

Do not substitute a different character's portrait simply to fill a blank slot. For robust Pages hosting, replace provisional links with properly sourced and appropriately licensed local assets, then rebuild the art manifest using the usual art pipeline.

## Checks completed

- Browser-facing JavaScript bundles `dist/engine.js` and `dist/engine/ai.js` parse.
- All engine data modules + game engine + AI execute in an isolated JS environment; `createGame('britannia','normal')` succeeds.
- A newly created Conquest game has 98 officers, 176 starting units, and 168 cities.
- Four active newcomer skills (Shalio, Chloe, Tianzi, Cheng Zhong) were exercised in a smoke check; each returned `ok: true`.
- Existing 58 commander entries and starting ratings were compared against `main` and found unchanged.
- No new test files were added.

## Remaining release checks

- Browser-based playtest in Conquest and scenario modes, especially overwatch, support-fire timing, AI tactical selection, save/load and city capture.
- Confirm each remote portrait actually loads in the target browser. Missing or blocked sources currently leave blank portrait slots.
- Audit some obscure spinoff character references and default faction assignments for historical scenario dates before applying scenario-specific placements.
- Consider tuning new skills after combat simulation; these are first-pass starting values, not measured balance outcomes.

`main` is unchanged. This branch is intentionally separate for review.