# Story Mode pacing — seeded AI-versus-AI playtests

## Method

- Run on 23 October 2026 using the current `story-mode-longer-battles-20-turns` experimental mission registry and the game's actual engine, AI decision-making, production, scripted events, and win/loss hooks.
- **Normal difficulty, seeds 11 and 37**, with both factions controlled by the AI; end each game at the Story Mode victory or failure screen, up to 36 simulated turns.
- Baseline is the *same loaded engine* with the experimental pacing transformation disabled, not a separate claim about the latest moving `main` HEAD.
- 18 selected missions, 2 seeds per mission = **36 experimental** and **36 baseline** playthroughs. Seeded AI runs are diagnostic; human tactical play will differ.
- No runtime exceptions in any of the 36 experimental playthroughs.

## Summary

| Metric | Baseline | Experimental |
| --- | ---: | ---: |
| Average turns to mission outcome | 8.47 | **15.64** |
| AI victories | 22 / 36 | **25 / 36** |
| Missions ending before turn 10 | 19 / 36 | **10 / 36** |
| Outcomes on turns 14–22 | 3 / 36 | **19 / 36** |
| Outcomes after turn 25 | 0 / 36 | **4 / 36** |

## Per-mission comparisons

Cell entries are `turn(result)` for seeds **11 / 37**; W = AI won the selected player's mission, L = AI lost.

| Mission | Baseline | Experimental | Observation |
| --- | --- | --- | --- |
| Shinjuku Ghetto — Black Knights (`bk1`) | 12L / 2L | 7L / 7W | Still short; Zero vulnerable |
| Battle of Narita — Black Knights (`bk3`) | 6L / 5W | 7W / 6W | Wins too early to satisfy long-battle goal |
| Fall of Tokyo (`br1`) | 17L / 10W | **18W / 20W** | Strong fit |
| Black Rebellion — Britannia (`br5`) | 11W / 11W | **19W / 19W** | Strong fit |
| Stolen Empress (`cf3`) | 6W / 5L | 12L / 18W | Sometimes loses Xingke too early |
| Battle of Xiaopei — Federation (`cf7`) | 18L / 6W | 30L / 20W | One long deadline failure |
| Narva — Euro Britannia (`eb_narva`) | 14W / 11W | **15W / 15W** | Improved and consistent |
| Gallia Grande — E.U. (`eu_ark`) | 8W / 7W | **14W / 19W** | Improved |
| Black Rebellion — Black Knights (`bk4`) | 5W / 5W | 9W / 7W | Still fast |
| Second Battle of Tokyo — Black Knights (`bk7`) | 6W / 7W | **19W / 14W** | Substantial improvement |
| Assault on Narita — Britannia (`br4`) | 10L / 9W | 13W / 32L | One hard deadline failure |
| Return of Black Knights — Britannia (`br7`) | 10L / 11W | 19W / 16L | Better duration, mixed balance |
| Chinese Consulate (`cf1`) | 4W / 4W | 5W / 5W | Still very short |
| Fall of High Eunuchs (`cf10`) | 4W / 4W | 6W / 6W | Still very short |
| Assault on Weisswolf — Euro Britannia (`eb_assault`) | 2L / 2L | 18L / 21L | Commander Shin consistently dies; pre-existing failure made later |
| Battle of Slonim — E.U. (`eu_slonim`) | 10L / 11L | 13L / 18L | Leila consistently dies |
| Defense of Warsaw — E.U. (`eu_front`) | 13W / 13W | **20W / 20W** | Strong fit |
| Stop Apollo's Chariot (`eu_apollo`) | 13L / 13L | 28L / 28L | Objective unmet by AI on all tested seeds; pre-existing problem |

## Notes and recommendations

1. The dynamic duration improvement is meaningful, but a blanket map resize is not sufficient. Missions with commander-loss conditions can still fail early, and high-mobility missions can still end on turn 5–9 despite a larger map.
2. Keep the stronger results in Fall of Tokyo, Britannian Black Rebellion, Narva, Gallia Grande, Black Knights' Second Battle of Tokyo, and Warsaw.
3. Further targeted mission-by-mission design is needed for Chinese Consulate, Fall of High Eunuchs, Shinjuku, Black Knights' Narita, and Black Knights' Black Rebellion; these are not close to 20 turns.
4. Investigate commander protection and early tactical AI for Xingke, Shin, and Leila missions. Do not assume adding formations alone fixes survivability.
5. Stop Apollo's Chariot fails both baseline and experimental seeded AI. Check its composite `capture` plus Ayano `reach` objective/pathfinding separately rather than merely extending the timer.
6. Results are a small **selected** Normal-mode sample, not estimates for every one of the 63 modified missions. Difficulty modes, diverse seeds, and human-play testing remain outstanding.

Nothing in these experiments was merged into `main`.

---

## Follow-up pass — 26 October 2026

This appendix supersedes the first-pass performance figures **for the current experimental branch**. The 23 October comparisons above remain as historical evidence of the initial rebalance.

### Rules and missions changed

- Introduced `minimumVictoryTurn: 13` for all 88 Story Mode missions, enforced by the campaign's actual victory checker. **Defeats remain immediate**, including losses of required officers or cities.
- Brought short objective deadlines, story briefings, and special hold conditions into alignment. Hold missions targeting 16 turns generally complete on turn 17, according to the campaign's `g.turn > hold` condition.
- Added counterattack phases to selected short missions and tested ordinary troop/position changes in Shinjuku, Port Yokosuka, Guilford's Execution Trap, the Forbidden City, Slonim, and other operations.
- Reworked **Cripple the Avalon (`ufn10`)** so Xingke must be within **3 hexes** of the captured Primary Float System and the position must be held through turn 16. Reworked **For Tianzi (`ufn12`)** so Xingke must be within **4 hexes** of the Representative Assembly after the Bridge is captured, with a turn-16 consolidation requirement. These preserve Xingke's proximity rather than only testing whether he survived.
- The existing Apollo's Chariot update uses capture of launch control plus Ayano survival because the old exact-hex requirement caused consistent AI failures.

### Normal-mode evidence

An AI-versus-AI sweep tested **88 missions × two seeds (11 and 37) = 176 outcomes**. Its results were updated using subsequent direct, three-seed reruns for the changed Port Yokosuka and UFN operations; other missions' outcomes were unchanged by those objective-local patches. This is therefore a **stitched validated snapshot**, not a claim that all 176 trials were rerun simultaneously against the latest commit.

| Metric | Latest validated Normal-mode sample |
| --- | ---: |
| Missions represented | 88 / 88 |
| Outcomes | 176 |
| Victories / defeats | **135 / 41** |
| Mean battle duration | **approximately 17.5 turns** |
| Median duration | 17 turns |
| Outcomes before turn 13 | **0** |
| Outcomes between turns 13–22 | **145 / 176** |
| Outcomes after turn 22 | **31 / 176** |
| Missions initialized at all four difficulty levels | **352 / 352**, with no initialization errors |

Representative sampled results (turn and result; seed 11 / seed 37):

| Mission | Seed 11 | Seed 37 |
| --- | --- | --- |
| Shinjuku Ghetto (`bk1`) | 13 W | 21 W |
| Black Knights' Port Yokosuka (`bk_yokosuka`) | 14 W | 13 W |
| Guilford's Execution Trap (`br_execution`) | 17 W | 17 W |
| Defense of the Forbidden City (`br_mausoleum`) | 17 W | 17 W |
| Britannian Black Rebellion (`br5`) | 19 W | 19 W |
| Britannian Kagoshima (`br_kagoshima`) | 19 W | 19 W |
| Euro Britannian Slonim (`eb_slonim`) | 13 W | 13 W |
| Cripple the Avalon (`ufn10`) | 17 W | 17 W |
| For Tianzi (`ufn12`) | 17 W | 17 W |
| Apollo's Chariot (`eu_apollo`) | 23 W | 24 W |

The updated UFN proximity missions were also tested on seed 71, both winning at turn 17. The Shinjuku, Guilford, Forbidden City, and Euro Britannian Slonim fixes also passed seed 71 in targeted tests.

### Important limits

1. **The 13-turn guarantee is a victory floor, not a guarantee against early defeat.** A required officer can still be killed on turn 2, and difficult modes must remain capable of losing immediately. Thus "none below 13" describes the tested **Normal-mode outcomes**, not an unconditional property of every battle on every difficulty or seed.
2. Eight additional UFN difficulty trials showed that challenge and elite AI can cause deaths before turn 13: for example, `ufn10` lost at turn 7 on Challenge and turn 2 on Elite; `ufn12` lost at turn 6 on Hard and turn 2 on Challenge and Elite. Adding ordinary escort formations did **not** consistently correct these outcomes; that ineffective change was not committed.
3. Multiple missions still end in defeat on both tested Normal seeds, including Black Knights' Shikine, Britannian Middle Eastern Federation, Chinese Federation `cf4` / `cf5`, Euro Britannian Weisswolf assault, E.U. Slonim, and the E.U. lakeside extraction. Such results establish **AI difficulty and potential objective/pathfinding issues**, not that human players cannot win.
4. **Seventy sampled outcomes occurred exactly on turn 13.** Some of these achieve their tactical objective earlier and remain in play until the floor, so reaching 13 turns does not prove all of them offer active combat for the full duration. Better late-stage counterattacks and mission-specific scripts remain the next qualitative tuning step.
5. These AI games are seeded approximations to human tactics and do not establish a win-rate target, performance on existing saves, or full coverage of all seeds and difficulties.

### Recommendation

Keep the experimental branch separate from `main`. The requested *Normal-mode 13-turn minimum target* is met in the 176 tested outcomes, but before merging, separately balance Hard/Challenge/Elite commander survivability, resolve persistent AI losses, and playtest whether the turn-13 floor actually adds engagement rather than empty waiting.

