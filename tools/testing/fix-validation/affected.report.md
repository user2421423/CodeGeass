# Gameplay tournament report

Source: a67c29b2d01700c96df736b225bd892bd4232cc7; engine SHA-256: 11b739be101503380bd7e7fb5d3a1c746cc8eb38bc0a633d72dcb71f302e3363.

20 recorded / 20 planned matches; 0 failed or timed out.

All sides use the shipped AI. Player selection changes difficulty boosts and turn order. This is an AI diagnostic, not a human win-rate estimate.

Unresolved matches are censored at the stated horizon and are not defeats or draws. Confidence intervals are Wilson 95% intervals for observed victories by that horizon, using successful runs only; failures are shown separately. Each group fixes scenario, player, difficulty and horizon. Repeated seeds across horizons are never pooled. Intervals are descriptive screens, not multiple-comparison-corrected proof of balance.

| Scenario / selected faction / difficulty / horizon | Seeds | Wins | Unresolved | Failed | Victory interval | City share mean [min–max] | Attacks / turn | Landings | Stalled runs | Quiet-front runs |
|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|
| cf-mexico/britannia/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 91.9% [91.3%–92.5%] | 22.5 | 259 | 0 | 0 |
| eu-panama/britannia/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 80.0% [80.0%–80.0%] | 13.0 | 132 | 0 | 0 |
| cf-pacific-northwest/britannia/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 76.2% [74.6%–77.8%] | 55.3 | 377 | 0 | 0 |
| bf-malacca/cf/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 74.1% [74.1%–74.1%] | 17.6 | 445 | 0 | 0 |
| cf-panama/britannia/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 71.7% [70.0%–73.3%] | 18.4 | 224 | 0 | 0 |
| bf-malacca/britannia/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 18.5% [18.5%–18.5%] | 11.4 | 460 | 0 | 0 |
| cf-mexico/cf/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 5.0% [5.0%–5.0%] | 13.6 | 220 | 0 | 0 |
| cf-panama/cf/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 3.3% [3.3%–3.3%] | 10.2 | 248 | 0 | 0 |
| cf-pacific-northwest/cf/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 0.8% [0.0%–1.6%] | 82.6 | 370 | 0 | 0 |
| eu-panama/eu/elite/5 | 2 | 0/2 | 2 | 0 | 0.0%–65.8% | 0.0% [0.0%–0.0%] | 6.8 | 150 | 0 | 0 |

## Ranked screening findings

No group meets the repeated-dominance/disadvantage screening threshold (at least eight independent seeds, plus lower victory interval above 50%, city share ≥80% throughout or city share ≤20% throughout).

## Simulation errors and reproductions


## Measurement limits

- Production choices count newly observed formations after aiProduction; scripted reinforcements are separate. Rejected build attempts and added frames are not counted as new formations.
- Losses count observed live formation disappearance, including surrender/disbanding and carrier cargo losses; they are not exclusively combat kills.
- Sea landings count actual sea-to-land movements and carrier disembarkation onto land. They do not establish successful invasions.
- A stalled side retains cities but has neither a city ownership change nor formation loss for eight turns (configurable). This is a territorial/attrition proxy, not a geometric front diagnosis.
- JSON retains production by faction/type, per-turn resources, city transfers, landing events, stalls and errors. CSV contains one row per match.
- Compare equal scenario/player/difficulty/seed/horizon configurations, then confirm promising patterns on unused seeds and longer horizons.
