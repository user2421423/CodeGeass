# Commander skill rework

Branch: `feature/commander-skills-rework`. Changes affect Conquest and campaigns; main is not changed by this branch.

Permanent personal damage, critical, penetration, resistance and counter-fire modifiers are stored in `COMMANDERS[id].stats` and displayed under Base stats. Conditional effects and support mechanics live in `fx`; active commands live in `action`. Existing combat calculations combine them once. These are starting balance values, with reduced permanent bonuses where a stronger situational skill was added.

## Shared rules

- Commands recharge every three turns of their own faction. Targets are explicitly selectable; dead, confused and embarked commanders cannot cast.
- Designations, morale wards, aura suppression, inspiration and siege marks expire at the source faction’s next turn. Damage marks use the strongest applicable mark rather than stacking.
- Short reposition grants movement only, consumes terrain movement costs, and cannot embark a land unit or board a carrier. It never restricts full movement already restored by the frame.
- Once-per-turn skills retain their stamps across Zero’s extra activation. Tactical Command does not reset existing kill-chain counters.
- First-hit defensive skills apply to direct enemy attacks, not counter-fire, splash or strategic weapons, and refresh once per global round.
- Cornelia starts at Mobility 6. Older roster records migrate once; tokens spent on her former fifth and sixth Mobility stars are refunded (220 / 360). Rank, other ratings and medals remain intact.
- Gao Hai increases only the normal credit income of the friendly city he occupies. Local support skills require a living commander on the map.

## Roster

| Commander | Base combat modifiers, in addition to branch/rank/Mobility | Signature |
|---|---|---|
| Suzaku Kururugi | Critical chance +20 percentage points · Damage taken −5% | **Live On:** Morale never falls below Steady. Once per round, takes 50% less damage from a direct hit while below 40% HP. |
| Cornelia li Britannia | Branch ratings, rank and Mobility | **Witch of Britannia:** Her first kill each turn inspires adjacent allies: +15% attack damage for the rest of that turn (does not stack). |
| Bismarck Waldstein | Damage +8% · Armor penetration +20 percentage points | **Future Sight:** The first direct enemy attack against his unit each round deals 30% less damage. |
| Julius Kingsley | Damage taken −10% · Counter-fire +25% | **Imperial Stratagem:** Every 3 turns, designate an enemy within 2 hexes: allies within 2 hexes of Julius deal +20% damage to it until his next turn. |
| Schneizel el Britannia | Branch ratings, rank and Mobility | **The White Prince:** Friendly ranged units within 2 hexes deal +20% attack damage to enemies adjacent to a friendly non-Artillery formation. Command aura: 2 hexes, +12% damage. |
| Gino Weinberg | Damage +10% · Armor penetration +10 percentage points | **Mobile Assault:** Once per turn, may reposition up to 2 hexes after attacking. Does not grant another attack. |
| Anya Alstreim | Artillery damage +15% | **Focused Bombardment:** Attacking the same city on consecutive turns adds +10% damage to its defenses per turn, up to +30%. Changing targets resets the bonus. |
| Luciano Bradley | Armor damage +10% on attacks | **Vampire of Britannia:** Attacks deal +25% damage to enemies below half HP. His first kill each turn restores 8% HP; receives 10% more counter-fire. |
| Jeremiah Gottwald | Damage taken −10% | **Geass Canceller:** Morale never falls below Steady. Every 3 turns, restore himself and adjacent allies to at least Steady and block morale-disrupting attacks/actions until his next turn. |
| Shin Hyuga Shaing | Branch ratings, rank and Mobility | **Geass of Despair:** Each attack also lowers the surviving target’s morale by 1. |
| Rolo Lamperouge | Branch ratings, rank and Mobility | **Time Stop:** The first attack each turn prevents counter-fire but costs 5% maximum HP afterward; this cost cannot destroy his unit. |
| Gilbert G.P. Guilford | Branch ratings, rank and Mobility | **Bodyguard:** Adjacent commander-led allies take 20% less damage from their first direct enemy attack each round. Multiple bodyguards do not stack. |
| Andreas Darlton | Infantry damage +15% | **Father of the Glaston Knights:** Adjacent friendly units recover one extra morale step each turn. |
| Ashley Ashra | Damage +15% on attacks | **Relentless Pursuit:** His first kill each turn grants a reposition of up to 2 hexes; it does not grant an extra attack. |
| Leila Malcal | Branch ratings, rank and Mobility | **Coordinated Withdrawal:** Command aura: 2 hexes, +12% damage. Every 3 turns, allies within 2 hexes that have fired regain movement without regaining their attacks. |
| Akito Hyuga | Infantry damage +10% · Critical chance +20 percentage points · Counter-fire +10% | **Brain Raid:** While no friendly unit is adjacent, attacks deal +30% damage but his unit takes 15% more damage. |
| Ryo Sayama | Armor damage +10% | **Hot-Blooded Charge:** Attacks deal +25% damage after moving at least 2 hexes that turn; receives 10% more counter-fire. |
| Ayano Kosaka | Infantry damage +20% | **Kosaka Swordplay:** Receives 30% less counter-fire when attacking an adjacent enemy. |
| Yukiya Naruse | Critical chance +10 percentage points · Critical multiplier +0.10 | **Target Designation:** Attacking an enemy marks it: subsequent allied attacks deal +15% damage until Yukiya’s next turn. |
| Oscar Hammel | Branch ratings, rank and Mobility | **Shield of wZERO:** His unit and adjacent friendly units take 10% less damage. |
| Klaus Warwick | Branch ratings, rank and Mobility | **Field Supply:** Friendly units within 2 hexes pay half to repair; his own unit recovers 8% HP each turn. |
| Anna Clément | Branch ratings, rank and Mobility | **Clément Engineering:** Friendly units within 2 hexes recover 1 extra morale and 5% of their frame each turn. |
| Gene Smilas | Counter-fire +15% | **Defensive Doctrine:** Friendly units within 2 hexes counter-fire 25% harder if they held position on their preceding turn and have not moved since. |
| Fernando Noriega | Branch ratings, rank and Mobility | **Star of Madrid:** His unit and units within 1 hex never drop below low morale (no diminished or confused). |
| Marirrosa Noriega | Branch ratings, rank and Mobility | **Coordinated Fire:** Deals +10% damage for each other friendly unit adjacent to the target, up to +30%. |
| Li Xingke | Damage +5% · Critical chance +20 percentage points · Armor penetration +10 percentage points | **Divine Tiger:** Attacks against commander-led enemies deal +25% damage. |
| Zhou Xianglin | Branch ratings, rank and Mobility | **Thirty-Six Stratagems:** Command aura: 1 hex, +10% damage; nearby allies recover morale faster. Every 3 turns, mark an enemy within 2 hexes: allies within 2 hexes of Xianglin can attack it without counter-fire until her next turn. |
| Hong Gu | Damage +4% · Damage taken −4% | **Steady Ranks:** Takes 20% less damage while at least two friendly units are adjacent. |
| General Cao | Branch ratings, rank and Mobility | **Liaodong Garrison:** Takes 25% less damage on or next to a friendly city. |
| Gao Hai | Branch ratings, rank and Mobility | **Palace Treasury:** While occupying a friendly city, increases that city’s credit income by 25%. Does not increase industry, science or Sakuradite output. |
| Zhao Hao | Branch ratings, rank and Mobility | **Palace Intrigue:** Attacking an enemy commander suppresses that commander’s damage aura until Zhao Hao’s next turn. |
| Chao Lei Feng | Armor damage +10% | **Rebel Tiger:** Attacks deal +25% damage against enemies at full HP. |
| Chao Meiling | Branch ratings, rank and Mobility | **Iron Resolve:** Takes 30% less damage while below half its frame. |
| Xu Lifeng | Infantry damage +10% | **Monkey King:** Receives 25% less counter-fire in adjacent combat. Once per turn, may reposition up to 1 hex after attacking. |
| Rakshata Chawla | Artillery damage +10% | **Prototype Engineering:** Her unit and friendly units within 2 hexes gain +10 percentage points of armor penetration. Multiple copies do not stack. |
| Lelouch vi Britannia / Zero | Branch ratings, rank and Mobility | **Tactical Command:** Every 3 turns, a friendly unit within 2 hexes that has acted may move and attack again. Its existing kill-chain limit is not reset. Command aura: 2 hexes, +10% damage. |
| Kallen Kōzuki | Critical chance +15 percentage points | **Ace of the Black Knights:** Her first kill each turn grants another attack. If the frame already grants that attack, she instead gains a reposition of up to 2 hexes. |
| Kyoshiro Tohdoh | Branch ratings, rank and Mobility | **Miracle Worker:** Adjacent friendly units counter-fire 25% harder and take 10% less damage. With 2 or more friendly units beside him, his own unit counter-fires 40% harder and takes 20% less damage. |
| C.C. | Branch ratings, rank and Mobility | **Code Bearer:** Never confused; her unit repairs 5% of its frame each turn. Once per operation, a blow that would destroy it leaves it at 1 HP instead. |
| Kaname Ohgi | Branch ratings, rank and Mobility | **Organizer:** Adjacent friendly units recover a morale step each turn even when surrounded, and cannot fall below Low morale. |
| Nagisa Chiba | Branch ratings, rank and Mobility | **Fourth Holy Sword:** +12% damage and counter-fire for each other friendly unit next to the target, up to +36%. |
| Shōgo Asahina | Branch ratings, rank and Mobility | **Rapid Assault:** Attacking an enemy that has already been attacked this turn: +35% critical chance and no counter-fire. |
| Ryōga Senba | Branch ratings, rank and Mobility | **Veteran’s Guard:** If his unit held position on its preceding turn and has not moved since, the first direct enemy attack against it each round deals 40% less damage. |
| Kōsetsu Urabe | Branch ratings, rank and Mobility | **Final Stand:** Below 40% of its frame, his unit deals 50% more damage and counter-fire. When it is destroyed, friendly units within 2 hexes gain High morale. |
| Kento Sugiyama | Branch ratings, rank and Mobility | **Special Operations:** Capturing a city restores 25% of the unit’s frame and cuts a turn off the city’s battery recharge and F.L.E.I.J.A. devastation. |
| Yoshitaka Minami | Branch ratings, rank and Mobility | **Ikaruga Fire Control:** Friendly Artillery within 2 hexes of his unit gets +1 range. |
| Shinichirō Tamaki | Branch ratings, rank and Mobility | **Reckless Charge:** His first attack after moving deals 35% more damage, but his unit takes 25% more counter-fire. |
| Tatewaki Katase | Branch ratings, rank and Mobility | **Prepared Position:** Friendly units within 1 hex take 15% less damage on mountains or next to a friendly city; friendly cities within 2 hexes restore 12% more defenses each turn. |
| Naomi Inoue | Branch ratings, rank and Mobility | **Resistance Logistics:** Friendly units within 2 hexes pay 30% less to repair and reinforce and repair 5% more at friendly cities. |
| Villetta Nu | Critical chance +10 percentage points | **Elite Pursuit:** Attacks deal +25% damage to enemies that moved during their preceding turn. |
| Kewell Soresi | Counter-fire +15% | **Purist Discipline:** Adjacent commanderless allies cannot fall below Low morale. |
| Monica Krushevsky | Damage taken −10% | **Imperial Guard:** Her unit and adjacent allies take 10% less damage. Multiple copies do not stack. |
| Dorothea Ernst | Damage +10% · Armor penetration +10 percentage points | **Combined Arms:** Deals +25% attack damage while adjacent to an ally from a different combat branch. |
| Nonette Enneagram | Counter-fire +15% | **Veteran of the Round:** Capturing a city restores 20% HP and raises her unit to High morale. |
| Michele Manfredi | Armor damage +10% · Damage taken −10% · Counter-fire +10% | **Order Commander:** Nearby Armor units gain +15% attack damage when adjacent to another friendly Armor unit. Command aura: 1 hex, +10% damage. |
| Andrea Farnese | Artillery damage +15% | **Grand Duke’s Offensive:** His first attack against city defenses each turn marks the city: subsequent allied attacks deal +20% damage to its defenses until his next turn. |
| Michael Augustus | Branch ratings, rank and Mobility | **Staff Officer:** Adjacent allies recover one extra morale step each turn and pay 20% less to repair. Command aura: 1 hex, +10% damage. |
| Lelouch vi Britannia | Branch ratings, rank and Mobility | **Geass: Absolute Obedience:** Command aura reaches 3 hexes with +15% damage. Royal Geass lowers nearby enemy morale by 2. |

## Validation

Run `node --test tests/*.test.cjs`, `node tests/ui-smoke.cjs`, `python tests/art_pipeline_test.py` and `node tools/validate_assets.cjs --tracked`. Dedicated commander regressions cover conditional bonuses, active targets, cooldown/expiry, preview purity, movement, kill chains, economy, save migration and AI actions.

The new rules are deterministic. Campaign simulations and short Conquest runs check runtime behavior; they do not establish long-run balance or prove that every mission is winnable.
