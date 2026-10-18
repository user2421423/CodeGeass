# Gameplay tournament report

Source: 09458d5 (audited main; batch-local provenance in summary.json); engine SHA-256: edfc1194dfd2a6e851828ec85e0be490ec67286525256cba232faab81500b80a.

42 recorded / 42 planned matches; 0 failed or timed out.

All sides use the shipped AI. Player selection changes difficulty boosts and turn order. This is an AI diagnostic, not a human win-rate estimate.

Unresolved matches are censored at the stated horizon and are not defeats or draws. Confidence intervals are Wilson 95% intervals for observed victories by that horizon, using successful runs only; failures are shown separately. Each group fixes scenario, player, difficulty and horizon. Repeated seeds across horizons are never pooled. Intervals are descriptive screens, not multiple-comparison-corrected proof of balance.

| Scenario / selected faction / difficulty / horizon | Seeds | Wins | Unresolved | Failed | Victory interval | City share mean [min–max] | Attacks / turn | Landings | Stalled runs | Quiet-front runs |
|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|
| area-18/britannia/normal/100 | 2 | 2/2 | 0 | 0 | 34.2%–100.0% | 100.0% [100.0%–100.0%] | 36.4 | 575 | 0 | — |
| eu-greenland/britannia/normal/50 | 8 | 3/8 | 5 | 0 | 13.7%–69.4% | 93.1% [83.3%–100.0%] | 15.9 | 2995 | 5 | — |
| eu-greenland/britannia/normal/100 | 1 | 0/1 | 1 | 0 | 0.0%–79.3% | 83.3% [83.3%–83.3%] | 8.6 | 634 | 1 | 1 |
| invasion-turkey/eu/normal/50 | 8 | 4/8 | 2 | 0 | 21.5%–78.5% | 64.6% [0.0%–100.0%] | 35.7 | 2764 | 0 | — |
| area-18/britannia/normal/20 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 57.0% [48.8%–65.1%] | 45.0 | 426 | 0 | — |
| invasion-turkey/britannia/normal/50 | 8 | 1/8 | 4 | 0 | 2.2%–47.1% | 42.6% [0.0%–100.0%] | 36.4 | 2700 | 0 | — |
| eu-greenland/eu/normal/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 5.6% [5.6%–5.6%] | 49.4 | 170 | 0 | — |
| eu-greenland/eu/normal/50 | 8 | 0/8 | 1 | 0 | 0.0%–32.4% | 0.7% [0.0%–5.6%] | 22.2 | 2049 | 1 | — |
| eu-greenland/eu/normal/100 | 2 | 0/2 | 0 | 0 | 0.0%–65.8% | 0.0% [0.0%–0.0%] | 23.9 | 444 | 0 | — |
| invasion-turkey/britannia/normal/100 | 1 | 0/1 | 0 | 0 | 0.0%–79.3% | 0.0% [0.0%–0.0%] | 33.4 | 390 | 0 | — |

## Ranked screening findings

- **eu-greenland/britannia/normal/50**: repeated dominance; investigate objectives and hold-out seeds.
- **eu-greenland/eu/normal/50**: repeated disadvantage; investigate objectives and hold-out seeds.

## Simulation errors and reproductions


## Measurement limits

- Production choices count newly observed formations after aiProduction; scripted reinforcements are separate. Rejected build attempts and added frames are not counted as new formations.
- Losses count observed live formation disappearance, including surrender/disbanding and carrier cargo losses; they are not exclusively combat kills.
- Sea landings count actual sea-to-land movements and carrier disembarkation onto land. They do not establish successful invasions.
- A stalled side retains cities but has neither a city ownership change nor formation loss for eight turns (configurable). This is a territorial/attrition proxy, not a geometric front diagnosis.
- JSON retains production by faction/type, per-turn resources, city transfers, landing events, stalls and errors. CSV contains one row per match.
- Compare equal scenario/player/difficulty/seed/horizon configurations, then confirm promising patterns on unused seeds and longer horizons.
