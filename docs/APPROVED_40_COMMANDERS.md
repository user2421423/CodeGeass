# Commander expansion — 39 approved additions (local-art build)

Branch: `feature/approved-40-commanders-20261012` (historical branch name retained). Based on `main`; **not merged**.

## Scope and roster

- **97 total commanders:** 58 existing commanders plus 39 approved additions.
- Xu Xinfeng was explicitly removed from the commander roster, base ratings, portrait manifest and expansion source catalogue. His now-unused Crimson Dynasty skill logic was also removed.
- Every pre-existing commander record and rating remains unchanged.
- All retained newcomers have their previously defined recruitment, faction, ratings and signature skills.
- Gameplay changes are isolated to this feature branch.

## Portraits: entirely self-contained

- All **39 new portraits** are checked-in JPEGs at `dist/assets/art/portraits/<commander-id>-approved.jpg`.
- All **58 existing portraits** remain checked in as they were before the expansion.
- `dist/assets/art/manifest.json` and its companion `manifest.js` have **97 local relative portrait paths**, none HTTP(S).
- `dist/art.js` was restored to the original **local-only image loader** from `main`; its temporary remote-host whitelist and hotlink support have been removed.
- `tools/approved-40-portrait-sources.json` has been rewritten to contain **39 local artwork paths**, no external links.
- Images are 256×256 JPEG thumbnail crops of researched character source imagery, so some may need further visual review or adjustment. Source resolution varies, particularly for minor-character anime stills. Remote hosts are not contacted at runtime.
- Pre-existing `dist/assets/art/sources.json` retains original provenance URLs as static build/reference metadata; those URLs are **not runtime asset dependencies**. Original artwork may have third-party copyright or license restrictions; confirm permissions before public distribution.

## Checks performed

- All 97 portrait entries were verified against the Git tree: all files exist as non-empty local binaries.
- Full executable `dist/` JS, CSS, HTML and art manifests were scanned for URL references. The only HTTP(S) text in runtime files is the non-network XML namespace `http://www.w3.org/2000/svg`, while a comment in `dist/ui/japan-coastlines.js` mentions its upstream data source.
- Original 58 commander records and ratings were previously compared against `main` and found unmodified.
- Engine and AI bundles previously passed syntax and a Conquest initialization smoke check. A post-update roster/art verification is recommended before merge.
- No new test files added.

## Remaining release checks

- Browser visual audit of all 39 portrait crops, including character identification.
- Playtest active signature skills and AI tactical use in Conquest and scenarios.
- Validate offline asset loading in a fresh browser and confirm existing saves behave correctly.

`main` is unchanged; this branch has not been merged.
