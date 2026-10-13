'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');

function rich(g, side) {
  g.economy[side] = { credits: 999999, industry: 999999, science: 999999, sakuradite: 999999 };
}
test('one warhead across construction and stockpile for every faction and conquest', () => {
  for (const era of ['world', 'ufn2018'])
    for (const side of (era === 'world' ? ['britannia','eu','cf'] : ['britannia','eb','cf'])) {
      const g = E.createGame(side,'normal','conquest',77,era);
      g.turn = E.fleijaLabTurn(g);
      g.phase = side;
      rich(g,side);
      const cities = g.stations.filter(s => s.owner === side).slice(0,2);
      assert.equal(cities.length,2);
      for (const c of cities) c.lab=3;
      assert.equal(E.startProject(g,cities[0].id).ok,true);
      assert.match(E.projectReason(g,cities[1]),/(?:Only one|share one) F.L.E.I.J.A./);
      assert.equal(E.startProject(g,cities[1].id).ok,false);
      g.turn+=E.FLEIJA.turns;
      E.beginTurn(g,side,false);
      assert.equal(g.arsenal[side],1);
      assert.match(E.projectReason(g,cities[1]),/(?:Only one|share one) F.L.E.I.J.A./);
      const sea = g.tiles.find(t => t.terrain==='sea' && E.blastArea(g,t).every(p =>
        !E.stationAt(g,p) && !E.unitAt(g,p) && !E.siteAt(g,p)));
      assert.ok(sea);
      assert.equal(E.launch(g,side,sea.c,sea.r).ok,true);
      assert.equal(g.arsenal[side],0);
      assert.equal(E.projectReason(g,cities[1]),null);
    }
});

test('older saves cap arsenals and refund cancelled projects', () => {
  const g = E.createGame('britannia','normal','conquest',71);
  const cities = g.stations.filter(s=>s.owner==='britannia').slice(0,2);
  g.arsenal={britannia:3};
  cities.forEach((s,i)=>s.project={side:'britannia',started:20,ready:24+i});
  const credit=g.economy.britannia.credits;
  const loaded=E.migrateSave(E.packSave(g));
  assert.ok(loaded);
  assert.equal(loaded.arsenal.britannia,1);
  assert.equal(loaded.stations.filter(s=>s.project?.side==='britannia').length,0);
  assert.equal(loaded.economy.britannia.credits,credit+2*E.FLEIJA.cost.credits);
});

test('three-hex coverage and 2+2 Eliminator timing beat second warhead despite phase order', () => {
  const g=E.createGame('britannia','normal','conquest',87,'ufn2018');
  assert.equal(E.ELIMINATOR.range,3);
  assert.equal(E.ELIMINATOR.research,2);
  assert.equal(E.ELIMINATOR.turns,2);
  const defender=g.stations.find(s=>s.owner==='cf'&&s.name==='Luoyang');
  assert.ok(defender);
  g.units=[];
  g.fleijaDetonated=9;
  assert.equal(E.eliminatorTurn(g),11);
  g.turn=11;
  g.phase='cf';
  defender.lab=3;
  rich(g,'cf');
  assert.equal(E.startEliminator(g,defender.id).ok,true);
  assert.equal(defender.eliminatorProject.ready,13);
  g.turn=13;
  g.phase='britannia';
  g.arsenal={britannia:1};
  const nearby=E.within(g,defender,4);
  const at5=nearby.find(t=>E.distance(t,defender,g)===3);
  const at6=nearby.find(t=>E.distance(t,defender,g)===4);
  assert.ok(at5 && at6);
  assert.equal(E.eliminatorDefender(g,'britannia',at5)?.city?.id,defender.id);
  assert.equal(E.eliminatorDefender(g,'britannia',at6),null);
  const hit=E.launch(g,'britannia',defender.c,defender.r);
  assert.equal(hit.ok,true,hit.reason);
  assert.equal(hit.intercepted,true);
  assert.equal(defender.eliminatorProject,null);
  assert.equal(defender.eliminator,0);
  assert.equal(g.arsenal.britannia,0);
});

test('AI targeting is unaffected by secret enemy Eliminators', () => {
  const g=E.createGame('britannia','normal','conquest',108);
  g.turn=40;
  g.units=[];
  g.stations.find(s=>s.owner==='eu').income=1000;
  const before=E.aiLaunchTarget(g,'britannia');
  assert.ok(before);
  for(const s of g.stations.filter(s=>s.owner==='eu'||s.owner==='cf')){
    s.eliminator=1;
    s.eliminatorProject={side:s.owner,started:35,ready:40};
  }
  const after=E.aiLaunchTarget(g,'britannia');
  assert.deepEqual([after?.c,after?.r],[before.c,before.r]);
});

test('hostile Eliminator intelligence is hidden in map, city, powers, launch and AI notices',()=>{
  const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  const map=read('src/renderer/05-frame-painting.part.js');
  const hud=read('src/hud/01-superweapons.part.js');
  const city=read('src/hud/03-city-panels.part.js');
  const powers=read('dist/ui/dialogs.js');
  const turns=read('dist/ui/turns.js');
  assert.match(map,/s\.owner === game\.player && \(s\.eliminatorProject \|\| s\.eliminator\)/);
  assert.match(city,/if \(ours && ep\)/);
  assert.match(city,/if \(ours && s\.eliminator\)/);
  assert.doesNotMatch(hud,/E\.eliminatorDefender\(game, game\.player, p\)/);
  assert.match(hud,/Defensive site classified/);
  assert.match(powers,/eliminatorProjects = side === game\.player/);
  assert.match(turns,/shot\.defender === game\.player/);
  assert.doesNotMatch(turns,/Eliminator development detected in/);
});

test('2018 Britannian allies share one warhead slot across construction and ready arsenals', () => {
  for (const [human, builder, partner] of [
    ['britannia','britannia','eb'],
    ['eb','eb','britannia'],
    ['cf','britannia','eb'],
    ['cf','eb','britannia'],
  ]) {
    const g=E.createGame(human,'normal','conquest',702,'ufn2018');
    const first=g.stations.find(s=>s.owner===builder);
    const second=g.stations.find(s=>s.owner===partner);
    first.lab=second.lab=3;
    rich(g,builder); rich(g,partner);
    g.turn=E.fleijaLabTurn(g);
    g.phase=builder;
    const cost=E.FLEIJA.cost.credits;
    const beforeBuilder=g.economy[builder].credits;
    const beforePartner=g.economy[partner].credits;
    assert.deepEqual(E.fleijaPoolSides(g,builder),['britannia','eb']);
    assert.equal(E.startProject(g,first.id).ok,true);
    assert.equal(E.fleijaWarheadCount(g,partner),1);
    assert.equal(g.economy[builder].credits,beforeBuilder-cost);
    assert.equal(g.economy[partner].credits,beforePartner);
    g.phase=partner;
    assert.match(E.projectReason(g,second),/share one F.L.E.I.J.A./);
    assert.equal(E.startProject(g,second.id).ok,false);
    g.turn+=E.FLEIJA.turns;
    E.beginTurn(g,builder,false);
    assert.equal(g.arsenal[builder],1);
    assert.equal(g.arsenal[partner]||0,0);
    assert.equal(E.fleijaWarheadCount(g,partner),1);
    g.phase=partner;
    assert.match(E.projectReason(g,second),/share one F.L.E.I.J.A./);
    g.phase=builder;
    const sea=g.tiles.find(t=>t.terrain==='sea'&&E.blastArea(g,t).every(p=>
      !E.stationAt(g,p)&&!E.unitAt(g,p)&&!E.siteAt(g,p)));
    assert.ok(sea);
    assert.equal(E.launch(g,builder,sea.c,sea.r).ok,true);
    assert.equal(E.fleijaWarheadCount(g,partner),0);
    g.phase=partner;
    assert.equal(E.projectReason(g,second),null);
    assert.equal(E.startProject(g,second.id).ok,true);
    assert.equal(g.economy[partner].credits,beforePartner-cost);
  }
});

test('2017 factions retain independent warhead slots',()=>{
  const g=E.createGame('britannia','normal','conquest',71,'world');
  g.turn=15;
  rich(g,'britannia');rich(g,'eu');
  const brit=g.stations.find(s=>s.owner==='britannia');
  const eu=g.stations.find(s=>s.owner==='eu');
  brit.lab=eu.lab=3;
  g.phase='britannia';
  assert.equal(E.startProject(g,brit.id).ok,true);
  g.phase='eu';
  assert.equal(E.startProject(g,eu.id).ok,true);
  assert.equal(E.fleijaWarheadCount(g,'britannia'),1);
  assert.equal(E.fleijaWarheadCount(g,'eu'),1);
});

test('human Britannian commander gets first funded claim ahead of allied AI',()=>{
  for(const human of ['britannia','eb']){
    const ally=human==='britannia'?'eb':'britannia';
    const g=E.createGame(human,'normal','conquest',803,'ufn2018');
    g.turn=5;
    rich(g,human); rich(g,ally);
    const humanCity=g.stations.find(s=>s.owner===human);
    const allyCity=g.stations.find(s=>s.owner===ally);
    humanCity.lab=allyCity.lab=3;
    assert.equal(E.fleijaPlayerPriority(g,ally),true);
    g.phase=ally;
    E.aiProduction(g);
    assert.equal(E.fleijaWarheadCount(g,ally),0,'AI must defer a free slot to an eligible human');
    g.phase=human;
    assert.equal(E.startProject(g,humanCity.id).ok,true);
    assert.equal(E.fleijaWarheadCount(g,ally),1);
  }
});

test('allied AI can construct if the Britannian player is unable to do so',()=>{
  for(const human of ['britannia','eb']){
    const ally=human==='britannia'?'eb':'britannia';
    const g=E.createGame(human,'normal','conquest',914,'ufn2018');
    g.turn=5;
    rich(g,ally);
    const allyCity=g.stations.find(s=>s.owner===ally);
    allyCity.lab=3;
    for(const c of g.stations.filter(s=>s.owner===human))c.lab=0;
    assert.equal(E.fleijaPlayerPriority(g,ally),false);
    g.phase=ally;
    E.aiProduction(g);
    assert.equal(E.fleijaWarheadCount(g,ally),1,'AI ally should use an unclaimed shared slot');
    assert.equal(g.stations.filter(s=>s.project?.side===ally).length,1);
  }
});

test('old 2018 saves reconcile alliance stock and projects, retaining player priority',()=>{
  const g=E.createGame('eb','normal','conquest',929,'ufn2018');
  const brit=g.stations.find(s=>s.owner==='britannia');
  const euro=g.stations.find(s=>s.owner==='eb');
  const before=g.economy.britannia.credits;
  g.arsenal={britannia:1,eb:0,cf:1};
  brit.project={side:'britannia',started:5,ready:9};
  euro.project={side:'eb',started:5,ready:9};
  const saved=E.migrateSave(E.packSave(g));
  assert.ok(saved);
  assert.equal(saved.arsenal.britannia,0);
  assert.equal(saved.arsenal.eb,0);
  assert.equal(saved.stations.find(s=>s.id===euro.id).project?.side,'eb');
  assert.equal(saved.stations.find(s=>s.id===brit.id).project,null);
  assert.equal(saved.economy.britannia.credits,before+E.FLEIJA.cost.credits);
  assert.equal(saved.fleijaWarheadCount,undefined);
  assert.equal(E.fleijaWarheadCount(saved,'britannia'),1);
  assert.equal(E.fleijaWarheadCount(saved,'cf'),1);
  const swapped=E.createGame('cf','normal','conquest',929,'ufn2018');
  swapped.arsenal={britannia:1,eb:1};
  const previous=E.migrateSave(E.packSave(swapped));
  assert.equal(E.fleijaWarheadCount(previous,'eb'),1);
  assert.equal(previous.arsenal.britannia+previous.arsenal.eb,1);
});
