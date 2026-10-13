'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
require('../dist/engine/ai.js');
const invasion = require('../dist/scenarios.js');
const division = require('../dist/scenarios-division-japan.js');

const city = (g, name) => g.stations.find(s => s.name === name);

test('Division registers as a separate 44-city scenario without mutating Invasion', () => {
  assert.equal(division.id, 'division-japan');
  assert.equal(E.scenarios.japan, invasion);
  assert.equal(E.scenarios.byId['division-japan'], division);
  assert.equal(E.scenarios.byId['invasion-japan'], invasion);
  assert.deepEqual(division.sides, ['britannia','eu','cf']);
  assert.deepEqual(Object.fromEntries(Object.entries(division.regions)
    .map(([side,cities])=>[side,cities.length])), {eu:12,britannia:15,cf:17});
  const names=Object.values(division.regions).flat();
  assert.equal(new Set(names).size,44);
  assert.deepEqual(names.slice().sort(), invasion.cityData.map(c=>c[0]).sort());
  const old=invasion.create('britannia','normal',11);
  assert.equal(old.scenario.id,'invasion-japan');
  assert.deepEqual(invasion.sides,['britannia','bk','cf']);
  assert.equal(E.foe(old,'britannia','bk'),false);
});

test('All three factions begin with real territory, armies, fleets and commanders', () => {
  const expected={britannia:15,eu:12,cf:17};
  for(const player of division.sides){
    const g=division.create(player,'normal',11);
    assert.equal(g.mode,'scenario');
    assert.equal(g.scenario.id,'division-japan');
    assert.equal(g.player,player);
    assert.equal(g.phase,player);
    assert.equal(g.turn,1);
    assert.equal(g.teams,null);
    assert.equal(g.stations.length,44);
    assert.equal(g.tiles.length,9240);
    assert.deepEqual(new Set(g.order),new Set(division.sides));
    assert.equal(g.units.length,92);
    assert.equal(new Set(g.units.map(u=>E.key(u))).size,92,'no overlapping starting units');
    for(const side of division.sides){
      assert.equal(g.stations.filter(s=>s.owner===side).length,expected[side]);
      assert.equal(g.units.filter(u=>u.side===side&&!E.TYPES[u.type].naval).length,side==='britannia'?32:24);
      assert.equal(g.units.filter(u=>u.side===side&&E.TYPES[u.type].naval).length,4);
      const named=g.units.filter(u=>u.side===side&&u.cmd);
      assert.equal(named.length,9,side+' receives nine named commanders');
      assert.equal(new Set(named.map(u=>u.cmd)).size,9);
      assert.ok(named.every(u=>E.COMMANDERS[u.cmd]?.side===side));
      assert.equal(g.startUnits[side],side==='britannia'?36:28);
      assert.ok(g.stations.some(s=>s.owner===side&&s.portAt&&s.portOwner===side),
        side+' needs a functional controlled shipyard');
    }
    for(const side of division.sides)
      for(const other of division.sides)
        if(side!==other)assert.equal(E.foe(g,side,other),true);
    assert.equal(E.checkVictory(g),null);
    assert.equal(g.scenario.phase,'three-way-war');
    assert.equal(g.scenario.turnLimit,undefined);
    assert.ok(g.scenario.groups.every(gr=>gr.units.every(id=>
      g.units.some(u=>u.id===id&&u.side===gr.side))));
    for(const u of g.units){
      const t=E.tile(g,u.c,u.r);
      assert.equal(E.TYPES[u.type].naval ? t.terrain==='sea' : t.owner===u.side,
        true, 'formation must be deployed on legal territory or at sea');
    }
    assert.ok(E.income(g,'britannia').industry>E.income(g,'eu').industry,
      'Britannia has stronger industry despite fewer cities than China');
  }
});

// Fixed garrisons only; the multi-front planner may add threat-triggered responders anywhere.
const fixedGuards = plan => Object.keys(plan.guards).filter(id => !plan.guards[id].response);
test('Normal Division gives Britannia eight balanced reinforcements and a third reserve turn only', () => {
  for (const player of division.sides) {
    const g=division.create(player,'normal',125);
    const britannia=g.units.filter(u=>u.side==='britannia'&&!E.TYPES[u.type].naval);
    const reinforced=['Saitama','Yokohama','Kobe','Wakayama'];
    for(const name of reinforced) {
      const group=g.scenario.groups.find(gr=>gr.side==='britannia' && gr.origin===name && gr.units.length===2);
      assert.ok(group,'two defensive formations at '+name);
    }
    assert.equal(britannia.length,32);
    assert.equal(g.economy.britannia.credits,E.income(g,'britannia').credits*3);
    assert.equal(g.economy.eu.credits,E.income(g,'eu').credits*3);
    assert.equal(g.economy.cf.credits,E.income(g,'cf').credits*3);
    const plan=E.aiPlan(g,'britannia');
    const guardIds=fixedGuards(plan);
    assert.ok(guardIds.length>=6 && guardIds.length<=12,'dedicated frontline defenders');
    assert.ok(guardIds.every(id=>britannia.some(u=>u.id===Number(id))));
    assert.ok(guardIds.every(id=>!plan.assign[id]),'garrisons are withheld from offensives');
    assert.deepEqual(fixedGuards(E.aiPlan(g,'eu')),[]);
    assert.deepEqual(fixedGuards(E.aiPlan(g,'cf')),[]);
  }
  for (const difficulty of ['hard','challenge','elite']) {
    const g=division.create('britannia',difficulty,126);
    assert.equal(g.units.length,84,'other difficulties keep previous unit count');
    assert.equal(g.startUnits.britannia,28);
    assert.equal(g.economy.britannia.credits,E.income(g,'britannia').credits*2);
    assert.deepEqual(fixedGuards(E.aiPlan(g,'britannia')),[]);
  }
  const old=invasion.create('britannia','normal',127);
  assert.deepEqual(fixedGuards(E.aiPlan(old,'britannia')),[],'original Japan AI unaffected');
});

test('The three fronts reflect the approved political boundaries', () => {
  const g=division.create('eu','normal',11);
  for(const [name,side] of [
    ['Sapporo','eu'],['Sendai','eu'],['Niigata','eu'],['Chiba','eu'],['Narita','eu'],
    ['Tokyo Settlement','britannia'],['Mount Fuji','britannia'],['Nagoya','britannia'],
    ['Kyoto','britannia'],['Osaka','britannia'],['Kobe','britannia'],
    ['Hiroshima','cf'],['Shimonoseki','cf'],['Fukuoka','cf'],
    ['Nagasaki','cf'],['Kumamoto','cf'],['Takamatsu','cf'],
  ]) {
    const c=city(g,name);
    assert.equal(c.owner,side,name);
    assert.equal(E.tile(g,c.c,c.r).owner,side,'city tile owner '+name);
  }
  assert.equal(city(g,'Sapporo').capitalOf,'eu');
  assert.equal(city(g,'Tokyo Settlement').capitalOf,'britannia');
  assert.equal(city(g,'Fukuoka').capitalOf,'cf');
  for(const s of g.stations.filter(s=>s.portAt))
    assert.equal(s.portOwner,s.owner,s.name+' port belongs to city owner');
});

test('The division is a no-turn-limit total conquest, not a score-based mission', () => {
  for(const player of division.sides){
    const g=division.create(player,'normal',37);
    for(const side of division.sides){
      for(const s of g.stations)s.owner=side;
      city(g,'Kushiro').owner=player===side?'cf':player;
      if(city(g,'Kushiro').owner===side)
        city(g,'Kushiro').owner=division.sides.find(t=>t!==side);
      for(const turn of [1,61,120,200]){
        g.turn=turn;
        assert.equal(division.winner(g),null);
        assert.equal(E.checkVictory(g),null);
      }
      for(const s of g.stations)s.owner=side;
      assert.equal(division.winner(g)?.winner,side);
      assert.equal(E.checkVictory(g)?.winner,side);
      g.over=null;
    }
  }
});

test('Hard and Challenge strengthen opposing armies and resources only', () => {
  for(const player of division.sides){
    const normal=division.create(player,'normal',41);
    const hard=division.create(player,'hard',41);
    const challenge=division.create(player,'challenge',41);
    const strength=(g,s)=>g.units.filter(u=>u.side===s&&!E.TYPES[u.type].naval)
      .reduce((n,u)=>n+u.stack,0);
    assert.deepEqual(normal.stations.map(s=>[s.name,s.owner]),
      challenge.stations.map(s=>[s.name,s.owner]));
    assert.equal(strength(normal,player),strength(hard,player)+(player==='britannia'?12:0));
    for(const side of division.sides.filter(s=>s!==player)){
      assert.ok(strength(hard,side)>=strength(normal,side));
      assert.ok(strength(challenge,side)>strength(hard,side));
      assert.ok(E.income(challenge,side).credits>E.income(hard,side).credits);
      assert.ok(E.income(hard,side).credits>E.income(normal,side).credits);
    }
  }
});

test('Scenario AI can plan, produce and act as either opposing power', () => {
  for(const player of division.sides){
    const g=division.create(player,'normal',51);
    for(const side of g.order.slice(1)){
      E.beginTurn(g,side,false);
      assert.doesNotThrow(()=>E.aiPlan(g,side));
      assert.doesNotThrow(()=>E.aiProduction(g));
      for(const id of g.units.filter(u=>u.side===side&&u.hp>0).slice(0,6).map(u=>u.id))
        assert.doesNotThrow(()=>E.aiOrder(g,id));
    }
  }
});

test('Elite Division Japan equips all three powers with single-frame elites and commanders at correct levels', () => {
  const expectedSignature={
    suzaku:'lancelot', cornelia:'cornelia_gloucester', xingke:'shen_hu',
    leila:'leila_alexander', akito:'akito_liberte',
    ryo:'ryo_valiant', ayano:'ayano_valiant'
  };
  for(const player of division.sides){
    const g=division.create(player,'elite',71);
    assert.equal(g.difficulty,'elite');
    assert.deepEqual(new Set(g.order),new Set(['britannia','eu','cf']));
    assert.equal(g.units.length,84);
    assert.ok(g.stations.every(s=>s.tier>=2),'elite starts with upgraded factories');
    for(const side of division.sides){
      if(side!==player)
        assert.ok(Object.keys(g.tech[side]).length>0,side+' has full research');
      const formations=g.units.filter(u=>u.side===side);
      assert.equal(formations.length,28);
      for(const u of formations){
        if(E.TYPES[u.type].naval==='ship'){
          assert.ok(!u.elite,'Carrier-battleships must remain regular');
          assert.equal(u.stack,1);
          continue;
        }
        assert.ok(u.elite,E.TYPES[u.type]?.name+' must be elite');
        assert.ok(E.TYPES[u.type]?.elite,u.type+' is an elite type');
        assert.equal(u.stack,1,'elites never start in multi-frame stacks');
        assert.equal(u.eliteStart,true);
        assert.equal(u.eliteLevel,side!==player && u.cmd?5:1);
        if(u.cmd && expectedSignature[u.cmd])
          assert.equal(u.elite,expectedSignature[u.cmd],u.cmd+' signature');
      }
    }
    const euShips=g.units.filter(u=>u.side==='eu'&&E.TYPES[u.type].naval==='ship');
    assert.equal(euShips.length,1);
    assert.ok(!euShips[0].elite);
    assert.equal(euShips[0].type,'eu_carrier');
    assert.equal(E.TYPES[euShips[0].type].side,'eu');
    assert.ok(g.units.filter(u=>u.side==='eu'&&E.TYPES[u.type].naval==='amphibious')
      .every(u=>u.elite==='panzer_frosch_ii'));
    assert.equal(E.checkVictory(g),null);
    for(const side of division.sides.filter(s=>s!==player))
      assert.equal(E.foe(g,player,side),true);
  }
});

test('Elite Division AI produces elite land forces and regular ships', () => {
  const g=division.create('britannia','elite',72);
  // Remove the opening city garrison to make the factory deployment hex available.
  const s=city(g,'Sendai'), eu='eu', id='leila_alexander';
  g.units=g.units.filter(u=>!(u.c===s.c&&u.r===s.r));
  g.economy[eu]={credits:100000,industry:100000,science:100000,sakuradite:100000};
  E.beginTurn(g,eu,false);
  assert.equal(E.aiEliteRecruitReason(g,s,id),null);
  const first=E.recruitAIElite(g,s.id,id);
  assert.equal(first.ok,true);
  assert.equal(first.unit.elite,id);
  assert.equal(first.unit.eliteLevel,1);
  assert.equal(first.unit.stack,1);
  assert.equal(first.unit.side,'eu');
  assert.equal(g.eliteDeployed[id],undefined,'AI has no once-per-elite limit');
  // One deployment per factory/turn still applies.
  assert.notEqual(E.aiEliteRecruitReason(g,s,id),null);
  g.units=g.units.filter(u=>u.id!==first.unit.id);
  g.turn+=1;
  E.beginTurn(g,eu,false);
  assert.equal(E.aiEliteRecruitReason(g,s,id),null);
  assert.equal(E.recruitAIElite(g,s.id,id).ok,true);
  const port=city(g,'Sapporo');
  g.units=g.units.filter(u=>!(u.c===port.portAt.c&&u.r===port.portAt.r));
  const navy=E.recruit(g,port.id,'eu_carrier',1);
  assert.equal(navy.ok,true,navy.reason);
  assert.equal(E.TYPES[navy.unit.type].naval,'ship');
  assert.ok(!navy.unit.elite);
});

test('Elite Division player uses HQ unlocks for land units and regular naval shipyards', () => {
  const g=division.create('eu','elite',73), s=city(g,'Sendai'), id='leila_alexander';
  g.units=g.units.filter(u=>!(u.c===s.c&&u.r===s.r));
  g.economy.eu={credits:100000,industry:100000,science:100000,sakuradite:100000};
  assert.match(E.eliteDeployReason(g,s,id,{}),/Locked/);
  const profile={elites:{[id]:{level:1,fragments:0}}};
  assert.equal(E.eliteDeployReason(g,s,id,profile),null);
  const first=E.deployElite(g,s.id,id,profile);
  assert.equal(first.ok,true);
  assert.equal(first.unit.eliteLevel,1);
  assert.equal(first.unit.stack,1);
  assert.ok(g.eliteDeployed[id]);
  const another=city(g,'Niigata');
  assert.match(E.eliteDeployReason(g,another,id,profile),/Already deployed/);
  const port=city(g,'Sapporo');
  g.units=g.units.filter(u=>!(u.c===port.portAt.c&&u.r===port.portAt.r));
  const navy=E.recruit(g,port.id,'eu_carrier',1);
  assert.equal(navy.ok,true,navy.reason);
  assert.ok(!navy.unit.elite);
});

test('Existing Invasion retains its Black Knights Elite roster and no Europia units', () => {
  const g=invasion.create('bk','elite',74);
  assert.deepEqual(invasion.sides,['britannia','bk','cf']);
  assert.ok(g.units.every(u=>u.side!=='eu'));
  assert.ok(g.units.every(u=>u.stack===1));
  assert.ok(g.units.filter(u=>E.TYPES[u.type].naval!=='ship')
    .every(u=>u.elite&&E.TYPES[u.type].elite));
  assert.ok(g.units.filter(u=>E.TYPES[u.type].naval==='ship').every(u=>!u.elite));
  assert.ok(E.navalTypes(g,'bk').includes('bk_carrier'));
});
