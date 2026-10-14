# Invasion of Korea — standalone scenario

## Scope and compatibility

**Scenario ID:** `invasion-korea` (`E.scenarios.byId`)  
**Theatre:** Korean Peninsula, Jeju, Tsushima and Japanese staging bases  
**Branch:** `scenario/bf-korea` from `feature/federation-war-campaign-structure`  
**Players:** Holy Britannian Empire (`britannia`), Chinese Federation (`cf`)  
**Difficulties:** Normal, Hard, Challenge, Elite  
**Victory:** Capture **every** enemy-owned theatre city; **no turn limit**. Both sides can win by conquest.

This is an independent regional scenario, registered in the standalone Scenarios selector and loaded by `dist/index.html`. The **central World Campaign registry is not edited**, so the previously planned campaign entry stays unplayable until separately integrated.

## Geography

The **184 × 160** north-up playable hex grid spans longitudes **123.5°–137° E** and latitudes **31°–43.5° N**. `dist/korea-landmask.js` is sampled from the existing `tools/data/coast.json` Korean GSHHG-derived coastline plus `dist/ui/japan-coastlines.js` high-resolution Japanese shapes, with **37 samples per hex**. Classification is exactly **below 20% land = sea**, **20–80% land = mixed, navigable coast**, **above 80% land = solid land**. In this geometry, 20,652 hexes are sea, 837 mixed coast, and 7,951 solid land. `dist/korea-coastlines.js` provides the correspondingly sampled geographic underlay for the scenario map projection. The renderer paints the underlay and named rivers.

The Korean mainland, the Jeju island cities and the Japanese staging cities occupy physically distinct land components, with naval access linking their coasts. The terrain differentiates the west-coast corridor and western plains from **Taebaek and Sobaek mountains**, the **Kaema/northern plateau**, forests and eastern coastal narrows. The **Yalu, Tumen, Taedong, Imjin, Han, Nakdong, Geum and Yeongsan** are rendered from geographic polylines. River valleys receive woodland movement penalties outside identified crossing approaches; rivers are **not** treated as ocean or ship-navigable channels.

At this scale, some narrow Japanese coastal straits are represented by mixed-coast hexes instead of dedicated pure-water cells; this does **not** bridge Korea or Jeju to Japan and does not obstruct their naval connections.

## Starting deployment and strategy

The Federation initially owns **46 Korean cities** including Seoul, Pyongyang, Busan, Incheon, Kaesong, Wonsan, Hamhung, Chongjin, Rason and Jeju. It has fortified coastal guns, several inland and river-defense lines, reserve Army Groups, named commanders and intercepting naval fleets. Britannia owns **nine Japanese staging cities**: Fukuoka, Sasebo, Nagasaki, Kitakyushu, Shimonoseki, Hiroshima, Iwakuni, Matsuyama and Maizuru.

Britannia attacks with five independently organized, carrier-borne formations:

1. **Korea Strait Assault** against southeastern Korea.
2. **Yellow Sea Expedition** around Jeju and southwestern approaches.
3. **Incheon Strike Force** toward the Seoul–Incheon industrial corridor.
4. **East Sea Offensive** against the Wonsan/east-coast corridor.
5. **Northern Coastal Flank** targeting northern and northeastern positions.

The attack fleet has carrier battleships carrying real embedded land-unit cargo plus amphibious escort groups. Federation fleets, coastal ports and ground armies use existing faction-standard classes and the shared tactical/strategic AI; the scenario does not override world rules. Army Groups use the existing task-force command interface.

**Normal** uses baseline funding and defenses. **Hard/Challenge** strengthen opposing forces and funding; **Elite** uses existing faction-specific Elite conversion, officer and AI logic without modifying shared mechanics. Fleet carriers themselves remain conventional.

## Static construction audit

- 55 distinct theatre city placements were resolved on playable land.
- All **28 named harbours** occupy distinct navigable sea hexes adjacent to their cities and can change hands independently of the city.
- All 28 harbours are connected to the same main naval component, so the Yellow Sea, Korea Strait and Sea of Japan approaches remain linked.
- All five Britannian offshore invasion anchors fall on open sea and connect to the main naval component.
- Korea, Jeju and Japanese bases are not falsely joined by land across the Korea Strait.
- The 20–80% classification and geographic-renderer transform agree on the map's bounds and grid origin.
- Scenario and renderer files pass static JavaScript syntax parsing and the standalone HTML loader references all scenario assets.

**Requested limitation:** No gameplay simulations or regression tests were run or added. Tactical AI balance, campaign win timing, prolonged resource economy and every individual move sequence remain **unverified at runtime**.
