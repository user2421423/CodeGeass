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
