# Commander expansion — 38 approved additions (local-art build)

Branch: `feature/approved-40-commanders-20261012` (historical branch name retained). Based on `main`; **not merged**.

## Scope and roster

- **96 total commanders:** 58 existing commanders plus 38 approved additions.
- Xu Xinfeng, Orpheus Zevon, Ash Phoenix, Shalio and Shamna have been explicitly removed from commander records, base ratings, art manifests and expansion catalogue. Their now-obsolete unique skills and portrait binaries were removed.
- Every pre-existing commander record and rating remains unchanged.
- The 35 previously retained newcomers retain their recruitment, faction, ratings and signature skills. Chao Jie Lun, Vritra Mahat and Zi Dien have been added as Chinese Federation commanders with distinct combat passives. These are separate from the rejected Xu Lifeng and High Eunuchs. Black Knights are now explicitly allowed to recruit/assign the existing JLF commander Tatewaki Katase through the shared eligibility rules.
- Gameplay changes are isolated to this feature branch.

## Portraits: entirely self-contained

- All **38 retained new portraits** are checked-in JPEGs at `dist/assets/art/portraits/<commander-id>-approved.jpg`.
- All **58 existing portraits** remain checked in as they were before the expansion.
- `dist/assets/art/manifest.json` and its companion `manifest.js` have **96 local relative portrait paths**, none HTTP(S).
- `dist/art.js` was restored to the original **local-only image loader** from `main`; its temporary remote-host whitelist and hotlink support have been removed.
- `tools/approved-40-portrait-sources.json` has been rewritten to contain **38 local artwork paths**, no external links.
- Images are 256×256 JPEG thumbnail crops of researched character source imagery, so some may need further visual review or adjustment. Source resolution varies, particularly for minor-character anime stills. Remote hosts are not contacted at runtime.
- Pre-existing `dist/assets/art/sources.json` retains original provenance URLs as static build/reference metadata; those URLs are **not runtime asset dependencies**. Original artwork may have third-party copyright or license restrictions; confirm permissions before public distribution.

## Checks performed

- All 96 portrait entries were verified against the Git tree: all files exist as non-empty local binaries.
- Full executable `dist/` JS, CSS, HTML and art manifests were scanned for URL references. The only HTTP(S) text in runtime files is the non-network XML namespace `http://www.w3.org/2000/svg`, while a comment in `dist/ui/japan-coastlines.js` mentions its upstream data source.
- Original 58 commander records and ratings were previously compared against `main` and found unmodified.
- Engine and AI bundles previously passed syntax and a Conquest initialization smoke check. A post-update roster/art verification is recommended before merge.
- New passive effects were integrated into source and compiled engine without creating test files.
- All 3 new portrait JPGs are embedded in the Git branch. The self-contained art manifest has no external asset references.
- Four more commanders remain needed to reach a round 100.
- No new test files added.

## Remaining release checks

- Browser visual audit of all 38 portrait crops, including character identification.
- Playtest active signature skills and AI tactical use in Conquest and scenarios.
- Validate offline asset loading in a fresh browser and confirm existing saves behave correctly.

`main` is unchanged; this branch has not been merged.
