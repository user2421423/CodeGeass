'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function components(g) {
  const labels = new Int32Array(g.tiles.length).fill(-1);
  let n = 0;
  for (let i = 0; i < g.tiles.length; i++) {
    const source = g.tiles[i];
    if (source.terrain === 'sea' || !source.owner || labels[i] !== -1) continue;
    const queue = [source];
    labels[i] = n;
    for (let head = 0; head < queue.length; head++)
      for (const t of E.internal.adjacent(g, queue[head])) {
        const j = t.r * g.cols + t.c;
        if (t.terrain === 'sea' || t.owner !== source.owner || labels[j] >= 0) continue;
        labels[j] = n;
        queue.push(t);
      }
    n++;
  }
  return labels;
}

for (const [era, iraq] of [['world', 'neutral'], ['ufn2018', 'britannia']]) {
  test(era + ': audit every city zone, land component, border and island', () => {
    const g = E.createGame('britannia', 'normal', 'conquest', 8181, era);
    assert.equal(g.stations.length, 168);
    const cities = new Map(g.stations.map(s => [s.id, s]));
    const land = components(g);
    const anchored = new Set(g.stations.map(s => land[s.r * g.cols + s.c]));
    let provinces = 0;
    for (const t of g.tiles) {
      const centre = t.provinceCity == null ? null : cities.get(t.provinceCity);
      if (t.terrain === 'sea' || !t.owner) {
        assert.equal(centre, null, 'unowned or sea hex has no city province');
        continue;
      }
      if (!centre) continue; // Tiny isolated islands beyond city influence.
      provinces++;
      assert.equal(centre.owner, t.owner, 'province faction at ' + t.c + ',' + t.r);
      if (anchored.has(land[t.r * g.cols + t.c]))
        assert.equal(land[centre.r * g.cols + centre.c], land[t.r * g.cols + t.c],
          'city zone crosses water despite a same-landmass city: ' + centre.name +
          ' at ' + t.c + ',' + t.r);
    }
    assert.ok(provinces >= 4500, 'all established provinces still exist');
    for (const s of g.stations)
      assert.equal(E.tile(g, s.c, s.r).owner, s.owner, 'city control ' + s.name);

    // Landlocked northern Iraq is not a province of Caucasian Tbilisi.
    assert.equal(E.tile(g, 110, 22).owner, iraq);
    assert.notEqual(g.stations.find(s => s.id === E.tile(g, 110, 22).provinceCity)?.name,
      'Tbilisi');
    // The Iranian north shore of the Persian Gulf belongs to Tehran's side,
    // not Dubai's city zone across water. The southern shore remains Arabic.
    for (const c of [116, 117, 118, 119]) {
      assert.equal(E.tile(g, c, 26).owner, 'cf', 'Iranian north Gulf shore, col ' + c);
    }
    assert.equal(E.tile(g, 118, 28).owner, iraq, 'Arabian south shore preserved');
    assert.equal(E.tile(g, 116, 26).provinceCity != null, true);
    // Japan's four playable island cores are Britannian; the Korean coast
    // stays Federation territory. They must not share a city zone.
    for (const [c,r] of [[155,24],[157,23],[159,22],[161,18]])
      assert.equal(E.tile(g,c,r).owner, 'britannia','Japanese island '+c+','+r);
    assert.equal(E.tile(g, 153, 22).owner, 'cf', 'Korea stays Federation territory');
    assert.equal(E.tile(g, 161, 50).owner, 'neutral', 'Cape York stays Australia');
  });

  test(era + ': saved game keeps legitimate captures and repairs old cross-sea provinces', () => {
    const g = E.createGame('britannia', 'normal', 'conquest', 222, era);
    const kyoto = g.stations.find(s => s.name === 'Kyoto');
    for (const t of g.tiles)
      if (t.provinceCity === kyoto.id) E.setTileOwner(g, t, 'cf');
    kyoto.owner = 'cf';
    const load = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
    assert.ok(load);
    assert.equal(load.stations.find(s => s.name === 'Kyoto').owner, 'cf');
    assert.equal(E.tile(load, kyoto.c, kyoto.r).owner, 'cf');
    assert.equal(E.tile(load, kyoto.c, kyoto.r).provinceCity, kyoto.id);
  });
}

test('2017 save migration repairs Nuuk controlling Canadian mainland provinces', () => {
  const g = E.createGame('britannia', 'normal', 'conquest', 999, 'world');
  const nuuk = g.stations.find(s => s.name === 'Nuuk');
  const canada = E.tile(g, 55, 7);
  assert.equal(canada.owner, 'britannia');
  assert.notEqual(canada.provinceCity, nuuk.id);
  canada.provinceCity = nuuk.id; // Legacy incorrect straight-line assignment.
  const restored = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
  assert.ok(restored);
  assert.notEqual(E.tile(restored, 55, 7).provinceCity, nuuk.id);
  assert.equal(E.tile(restored, 55, 7).owner, 'britannia');
});

for (const [era, north, gulf] of [['world', 'eu', 'neutral'],
                                  ['ufn2018', 'eb', 'britannia']]) {
  test(era + ': migrated legacy Iraq and Gulf spillover respects changed cities', () => {
    const g = E.createGame('britannia', 'normal', 'conquest', 18, era);
    const tbilisi = g.stations.find(s => s.name === 'Tbilisi');
    const dubai = g.stations.find(s => s.name === 'Dubai');
    const iraq = E.tile(g, 110, 22), shore = E.tile(g, 116, 26);
    E.setTileOwner(g, iraq, north);
    iraq.provinceCity = tbilisi.id;
    E.setTileOwner(g, shore, gulf);
    shore.provinceCity = dubai.id;
    const loaded = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(g))));
    assert.ok(loaded);
    assert.equal(E.tile(loaded, 110, 22).owner,
      era === 'world' ? 'neutral' : 'britannia');
    assert.equal(E.tile(loaded, 116, 26).owner, 'cf');

    // A successful capture of Baghdad/Dubai must never be undone by migration.
    const captured = E.createGame('britannia', 'normal', 'conquest', 18, era);
    const capturedBaghdad = captured.stations.find(s => s.name === 'Baghdad');
    const capturedDubai = captured.stations.find(s => s.name === 'Dubai');
    capturedBaghdad.owner = north;
    capturedDubai.owner = 'cf';
    E.setTileOwner(captured, E.tile(captured, 110, 22), north);
    E.setTileOwner(captured, E.tile(captured, 116, 26), gulf);
    const resumed = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(captured))));
    assert.ok(resumed);
    assert.equal(E.tile(resumed, 110, 22).owner, north);
    assert.equal(E.tile(resumed, 116, 26).owner, gulf);
  });
}

for (const [era, sakhalinOwner] of [['world', 'eu'], ['ufn2018', 'eb']]) {
  test(era + ': Sakhalin remains Russian, separated from Britannian Hokkaido', () => {
    const g = E.createGame('britannia', 'normal', 'conquest', 1011, era);
    const sapporo = g.stations.find(s => s.name === 'Sapporo');
    for (const [c,r] of [[161,12],[160,13],[161,14],[160,15],[161,16]]) {
      const t = E.tile(g,c,r);
      assert.notEqual(t.terrain,'sea','Sakhalin coastal hex '+c+','+r);
      assert.equal(t.owner,sakhalinOwner,'Russian Sakhalin '+c+','+r);
      assert.notEqual(t.provinceCity,sapporo.id,'Sapporo cannot annex Sakhalin');
    }
    assert.equal(E.tile(g,161,18).owner,'britannia','Hokkaido remains Britannian');
    const legacy = E.createGame('britannia','normal','conquest',1011,era);
    for (const [c,r] of [[161,12],[160,13],[161,14],[160,15],[161,16]]) {
      const t = E.tile(legacy,c,r);
      E.setTileOwner(legacy,t,'britannia');
      t.provinceCity=sapporo.id;
    }
    const repaired = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(legacy))));
    assert.ok(repaired);
    for (const [c,r] of [[161,12],[160,13],[161,14],[160,15],[161,16]])
      assert.equal(E.tile(repaired,c,r).owner,sakhalinOwner,'legacy strait repair');
    // Real conquests are not reverted after the Russian city changes hands.
    const captured = E.createGame('britannia','normal','conquest',1011,era);
    captured.stations.find(s=>s.name==='Petropavlovsk').owner='britannia';
    E.setTileOwner(captured,E.tile(captured,161,14),'britannia');
    E.tile(captured,161,14).provinceCity=
      captured.stations.find(s=>s.name==='Petropavlovsk').id;
    const resumed = E.migrateSave(JSON.parse(JSON.stringify(E.packSave(captured))));
    assert.equal(E.tile(resumed,161,14).owner,'britannia','legitimate capture preserved');
  });
}
