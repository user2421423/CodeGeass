# Adding or changing a regional scenario

A regional scenario lives in its own files. Shared code (engine, AI, map drawing, menus) reads what it needs from
the scenario itself and never names a scenario ID. One scenario can be built by one session without touching
anyone else's files.

## Files a new scenario adds or edits

| File | What goes there |
| --- | --- |
| `dist/scenarios-<name>.js` | the scenario module: map, cities, armies, `create`, `onTurn`, `objective`, `winner`, and `meta` (below) |
| `dist/<name>-landmask.js` etc. | its own map data, if any |
| `dist/scenario-manifest.js` | one line in `SCENARIO_MANIFEST` (menu order, title, note) and its files in `SCENARIO_FILES`, each after the files it uses |
| `docs/<NAME>_SCENARIO.md` | design notes |
| `dist/war-campaign.js` | only if it becomes a World Campaign objective (Campaigns lane) |

`dist/index.html` does not list scenarios: they load in the background after the start menu appears.

## `meta`: what shared code reads from a scenario

Set it on the module object right before it registers in `E.scenarios`. Leave out anything that does not apply.

```js
api.meta = {
  elite: true,                 // Elite difficulty converts starting formations (sides = api.sides); 'japan' for the Japan conversion
  expeditionSide: 'eu',        // this side may hold no city and stays in play while its units survive
  saveVersion: 2,              // saves of this scenario with another g.scenario.version cannot be loaded
  eliteRosterOnly: true,       // Elite recruitment is limited to g.scenario.eliteRosters
  groupsStartEmbarked: true,   // army groups begin aboard carriers (army-group editing imports the ships)
  ai: {
    doctrine: 'europe',        // 'europe' | 'division' | 'invasion'; default 'assault'
    guards: 'indochina',       // special guard planner: 'indochina' | 'luoyang' | 'division'
    recovery: true,            // commander recovery and city repair even with the assault doctrine
    islandDefense: { side: 'cf', invaderBases: ['Koror'] }, // defender never counter-invades these bases
    operationalAxes: { invader: 'eu', defender: 'britannia', axes: { 'Group name': ['City', 'City'] }, defenderHubs: ['City'] },
    routeBias: 'cf',           // this side's armies favor g.scenario.offensiveAxes
    riverlineDefense: { side: 'cf', attacker: 'britannia', river: 'Yangtze' }, // uses g.scenario.rivers and bridges
    synchronizedFlotillas: true, // carriers with the same invasionGroup plan one landing
  },
  map: {
    centreSampled: true,       // hex grid sampled at hex centres over g.scenario.bounds
    land: 'korea',             // coastline source: 'korea' | 'australia' | 'philippines' | 'greenland'
    painter: 'beringGeographic', // whole-map painter: 'beringGeographic' | 'beringGrid'
    europeanRegion: true,      // continental European shoreline
    coastBuffer: 1,            // sea hexes tinted beyond the coast (default 2)
    homeZoom: 5.4,             // opening zoom (default 2.15)
    overviewMarkers: true,     // cities and units stay readable when zoomed out
    overlays: ['regionalRivers'], // drawing overlays in ui/geography.js, by name
  },
  text: { era, intro, diplomacy, elite, focus: { side: 'City' } }, // scenario menu; focus = opening camera city
  blurbs: { side: 'Faction card text' },
};
```

Overlay names: `reliefZones`, `greenland`, `philippines`, `lakes`, `yangtzeRiver`, `regionalRivers`, `yellowRiver`,
`uralsRivers`, `turkey`, `westernRussiaRivers`, `mexicoAtlas`, `roads`, `indochinaRivers`. A scenario can also draw
its own relief by defining `api.paintRelief(ctx, g, { R, SQ, left, right, top, bottom })` (see the Rocky Mountains).
A new kind of behavior goes into shared code as a new named switch, never as `g.scenario.id === '...'`.

## Check before merging

```bash
python3 tools/build_sources.py
node tools/scenario_sim.cjs <scenario-id> <side> normal 11 5
node tools/scenario_sim.cjs --all > /tmp/now.txt && diff tools/data/sim_baseline.txt /tmp/now.txt
node tools/validate_assets.cjs --tracked
```

A new scenario adds lines to the baseline; regenerate `tools/data/sim_baseline.txt` with `--all` in the same commit
and say so. Any other difference in the baseline means existing behavior changed.
