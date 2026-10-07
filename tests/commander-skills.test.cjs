const test = require('node:test'), assert = require('node:assert/strict'), E = require('../dist/engine.js');
function blank(side = 'britannia') {
  const g = E.createGame(side, 'normal', 'conquest', 123);
  g.cols = g.rows = 16; g.wrap = false; g.units = []; g.nextId = 1; g.sites = [];
  g.tiles = Array.from({ length: 256 }, (_, n) => ({ c: n % 16, r: Math.floor(n / 16), terrain: 'plains' }));
  g.stations = E.MAJORS.map((owner, id) => ({ id, owner, name: owner, c: id * 7, r: 0, tier: 3, shield: 200,
    maxShield: 200, income: 100, industry: 10, science: 1, capitalOf: owner }));
  g.phase = side; g.over = null; g.fallen = {}; g.officers = {}; g.roster = {};
  for (const owner of E.MAJORS) g.economy[owner] = { credits: 5000, industry: 5000, science: 0, sakuradite: 500 };
  return g;
}
const unit = (g, cmd, side = g.player, cls = 'light', c = 5, r = 5, stack = 1) => E.newUnit(g, E.typeFor(side, cls), side, c, r, stack, cmd);
const hit = (g, a, d) => E.preview(g, a.id, d.c, d.r);
function ratio(actual, baseline, expected) { assert(Math.abs(actual - baseline * expected) <= 2, `${actual} versus ${baseline} × ${expected}`); }

test('Base stats are separate, applied once and visible; Cornelia mobility migrates once with upgrade refunds', () => {
  assert.equal(Object.keys(E.COMMANDERS).length, 58);
  for (const c of Object.values(E.COMMANDERS)) for (const field of ['dmg', 'dmgBranch', 'crit', 'critBonus', 'pen', 'taken', 'counter', 'move'])
    assert(!(field in c.fx), `${c.short}: permanent ${field} is still in its signature`);
  const p = { tokens: 10, roster: { cornelia: { rank: 4, ratings: { infantry: 4, armor: 6, artillery: 4, mobility: 6 }, medals: ['valor'] } } };
  E.roster(p); assert.equal(p.tokens, 590); assert.equal(p.roster.cornelia.ratings.mobility, 6);
  E.roster(p); assert.equal(p.tokens, 590); assert.equal(p.roster.cornelia.rank, 4); assert.deepEqual(p.roster.cornelia.medals, ['valor']);
  const g = blank(), corn = unit(g, 'cornelia');
  assert.equal(E.movement(g, corn), E.TYPES[corn.type].move + 2 + 4);
  assert(!E.COMMANDERS.cornelia.desc.includes('+2 movement'));
  const x = unit(g, 'xingke', 'cf', 'light', 9, 5), enemy = unit(g, null, 'eu', 'light', 10, 5);
  const pr = hit(g, x, enemy), t = E.TYPES[x.type], st = E.COMMANDERS.xingke.stats;
  ratio(pr.crit, t.crit + st.crit, 1); assert.equal(pr.armorPen, t.pen + st.pen);
  assert(E.commanderStatsText('xingke').includes('Critical chance'));
  const save = JSON.parse(JSON.stringify(E.createGame('britannia', 'normal', 'conquest', 123))); assert(E.migrateSave(save));
});

test('Cornelia inspires adjacent allies on the first kill, without refreshing movement or stacking', () => {
  const g = blank(), corn = unit(g, 'cornelia'), ally = unit(g, null, 'britannia', 'light', 5, 6), enemy = unit(g, null, 'eu', 'light', 6, 5);
  enemy.hp = 1; assert(E.attack(g, corn.id, 6, 5).destroyed);
  assert.equal(ally.assaultInspired.value, 0.15); assert.equal(corn.moved, true); assert.equal(corn.chain, 1, 'only the frame’s normal breakthrough');
  const target = unit(g, null, 'eu', 'light', 6, 6);
  const buff = hit(g, ally, target).unit; delete ally.assaultInspired;
  ratio(buff, hit(g, ally, target).unit, 1.15);
  ally.assaultInspired = { side: 'britannia', value: 0.15 };
  E.beginTurn(g, 'eu', false); assert(ally.assaultInspired);
  E.beginTurn(g, 'britannia', false); assert(!ally.assaultInspired);
});

test('Julius and Xianglin target explicitly; buffs require a nearby source and expire on its next turn', () => {
  for (const cmd of ['julius', 'xianglin']) {
    const side = cmd === 'julius' ? 'britannia' : 'cf', g = blank(side), source = unit(g, cmd), ally = unit(g, null, side, 'light', 5, 6), enemy = unit(g, null, 'eu', 'light', 6, 6);
    const before = hit(g, ally, enemy);
    assert(!E.feint(g, source.id, 999).ok); assert.equal(source.feintCD, 0);
    assert(E.feint(g, source.id, enemy.id).ok);
    if (cmd === 'julius') ratio(hit(g, ally, enemy).unit, before.unit, 1.2);
    else assert.equal(hit(g, ally, enemy).counterAllowed, false);
    source.c = 0; source.r = 15;
    if (cmd === 'xianglin') assert(hit(g, ally, enemy).counterAllowed);
    E.beginTurn(g, side, false); assert.equal(enemy.skillMarks.length, 0);
    assert.match(E.feintReason(g, source), /Ready in 2/);
  }
});

test('Jeremiah cleanses morale and blocks attacks/actions, but not encirclement; inactive sources cannot cast', () => {
  const g = blank(), j = unit(g, 'jeremiah'), ally = unit(g, null, 'britannia', 'light', 5, 6), shin = unit(g, 'shin', 'eu', 'light', 6, 6);
  ally.morale = -2; assert(E.feint(g, j.id).ok); assert.equal(ally.morale, 0);
  g.phase = 'eu'; assert(E.attack(g, shin.id, ally.c, ally.r).ok); assert.equal(ally.morale, 0);
  const emperor = unit(g, 'lelouch', 'eu', 'light', 6, 5);
  assert(E.feint(g, emperor.id).ok); assert.equal(ally.morale, 0);
  E.beginTurn(g, 'britannia', false); assert(!ally.moraleWard);
  j.hp = 0; assert.match(E.feintReason(g, j), /destroyed/);
  j.hp = 1; g.tiles.find(t => t.c === j.c && t.r === j.r).terrain = 'sea';
  assert.match(E.feintReason(g, j), /Embarked/);
});

test('Rolo prevents one counter per turn, pays nonlethal HP and cannot refresh it through Tactical Command', () => {
  const g = blank(), rolo = unit(g, 'rolo'), enemy = unit(g, null, 'eu', 'super', 6, 5, 3);
  assert(!hit(g, rolo, enemy).counterAllowed); rolo.hp = 1;
  assert(E.attack(g, rolo.id, enemy.c, enemy.r).ok); assert.equal(rolo.hp, 1);
  rolo.attacked = false; assert(hit(g, rolo, enemy).counterAllowed);
  g.turn++; assert(!hit(g, rolo, enemy).counterAllowed);
});

test('Bismarck, Suzaku and Guilford defensive procs are preview-pure and limited to one hit per round', () => {
  for (const cmd of ['bismarck', 'suzaku', 'guilford']) {
    const g = blank('eu'), gun = unit(g, null, 'eu', 'support', 5, 5), d = unit(g, cmd === 'guilford' ? 'suzaku' : cmd, 'britannia', 'super', 6, 5, 3);
    if (cmd === 'suzaku') d.hp = Math.floor(E.maxHP(d) * 0.35);
    if (cmd === 'guilford') unit(g, cmd, 'britannia', 'light', 6, 6);
    const first = hit(g, gun, d).unit; assert.equal(hit(g, gun, d).unit, first);
    const field = cmd === 'bismarck' ? 'foresightTurn' : cmd === 'suzaku' ? 'liveOnTurn' : 'bodyguardTurn';
    assert.equal(d[field], undefined); assert(E.attack(g, gun.id, d.c, d.r).ok); assert.equal(d[field], g.turn);
    assert(hit(g, gun, d).unit > first);
    g.turn++; assert.equal(hit(g, gun, d).unit, first);
  }
});

test('Gino, Ashley and Lifeng reposition without extra attacks; movement is capped and consumed', () => {
  for (const [cmd, side, distance] of [['gino','britannia',2], ['ashley','britannia',2], ['lifeng','cf',1]]) {
    const g = blank(side), u = unit(g, cmd, side, 'scout'), enemy = unit(g, null, 'eu', 'super', 6, 5, 3);
    if (cmd === 'ashley') enemy.hp = 1;
    assert(E.attack(g, u.id, enemy.c, enemy.r).ok); assert.equal(u.skillReposition, distance); assert(u.attacked);
    const reachable = [...E.reachable(g, u).keys()]; assert(reachable.length);
    for (const key of reachable) { const [c,r] = key.split(',').map(Number); assert(E.distance(u,{c,r},g) <= distance); }
    const [c,r] = reachable[0].split(',').map(Number); assert(E.move(g,u.id,c,r).ok);
    assert.equal(u.skillReposition,0); assert(u.attacked); assert.equal(E.reachable(g,u).size,0);
  }
});

test('Kallen falls back to reposition on an existing frame breakthrough; Zero retains kill-chain counters', () => {
  const g = blank('cf'), k = unit(g,'kallen','cf','medium'), foe = unit(g,null,'eu','light',6,5), zero = unit(g,'zero','cf','support',5,6);
  foe.hp=1; E.attack(g,k.id,6,5); assert.equal(k.chain,1); assert.equal(k.skillReposition,2); assert(!k.attacked);
  k.attacked=true; assert(E.feint(g,zero.id,k.id).ok); assert.equal(k.chain,1); assert.equal(k.aceTurn,g.turn); assert.equal(k.skillReposition,0);
  const e = unit(g, 'kallen','cf','super',9,8), victim = unit(g,null,'eu','light',10,8); victim.hp=1;
  E.attack(g,e.id,victim.c,victim.r); assert(!e.moved); assert.equal(e.skillReposition,0,'native full movement must not be capped');
});

test('Leila restores only allied movement, respects cooldown, and does not restore attacks', () => {
  const g=blank('eu'), leila=unit(g,'leila'), ally=unit(g,null,'eu','light',5,6), fresh=unit(g,null,'eu','light',4,5);
  ally.moved=ally.attacked=true; assert(E.feint(g,leila.id).ok);
  assert.equal(ally.moved,false); assert.equal(ally.attacked,true); assert(ally.withdrawMove);
  assert(!fresh.withdrawMove); assert(E.reachable(g,ally).size); assert(!E.feint(g,leila.id).ok);
  assert(!E.attack(g,ally.id,0,0).ok);
});

test('Anya gains consecutive-city damage; Farnese and Yukiya mark subsequent allied attacks', () => {
  const g=blank(), anya=unit(g,'anya','britannia','support'), city=g.stations[1];
  city.c=6; city.r=5; city.shield=city.maxShield=1000;
  const base=E.preview(g,anya.id,city.c,city.r).shield;
  E.attack(g,anya.id,city.c,city.r); g.turn++; anya.attacked=false; anya.moved=false;
  ratio(E.preview(g,anya.id,city.c,city.r).shield,base,1.1);
  const other=unit(g,null,'eu','light',5,6); E.attack(g,anya.id,other.c,other.r); assert(!anya.focusCity);
  const f=blank(), far=unit(f,'farnese','britannia','support'), gun=unit(f,null,'britannia','support',6,6), c=f.stations[1];
  c.c=6;c.r=5;c.shield=c.maxShield=1000;
  const before=E.preview(f,gun.id,c.c,c.r).shield; E.attack(f,far.id,c.c,c.r);
  ratio(E.preview(f,gun.id,c.c,c.r).shield,before,1.2);
  E.beginTurn(f,'britannia',false); assert(!c.bombardMark);
  const h=blank('eu'), y=unit(h,'yukiya','eu','support'), friend=unit(h,null,'eu','light',6,6), d=unit(h,null,'britannia','super',6,5,3);
  const prev=hit(h,friend,d).unit; E.attack(h,y.id,d.c,d.r); ratio(hit(h,friend,d).unit,prev,1.15);
});

test('Luciano finishes wounded targets and heals; Lei Feng opens against undamaged targets; Xingke duels commanders', () => {
  const g=blank(), luc=unit(g,'luciano'), d=unit(g,null,'eu','super',6,5,3), base=hit(g,luc,d).unit;
  d.hp=Math.floor(E.maxHP(d)*.4); ratio(hit(g,luc,d).unit,base,1.25);
  luc.hp=E.maxHP(luc)-30; d.hp=1; const before=luc.hp; E.attack(g,luc.id,d.c,d.r); assert(luc.hp>before);
  const h=blank('cf'), lei=unit(h,'leifeng'), target=unit(h,null,'eu','super',6,5,3), full=hit(h,lei,target).unit;
  target.hp--; ratio(full,hit(h,lei,target).unit,1.25);
  const x=unit(h,'xingke','cf','light',9,5), e=unit(h,null,'eu','light',10,5), ordinary=hit(h,x,e).unit;
  e.cmd='zhaohao'; e.cmdRank=0; E.officer(h,'zhaohao').ratings.armor=3;
  ratio(hit(h,x,e).unit,ordinary,1.25);
});

test('Akito isolation, Ryo movement and Dorothea mixed formations activate their conditional bonuses', () => {
  const g=blank('eu'), ak=unit(g,'akito'), d=unit(g,null,'britannia','light',6,5), solo=hit(g,ak,d).unit;
  unit(g,null,'eu','light',5,6); const supported=hit(g,ak,d).unit;
  // Adjacent commanders have an aura; commanderless allies do not.
  ratio(solo,supported,1.3);
  const r=blank('eu'), ryo=unit(r,'ryo'), target=unit(r,null,'britannia','light',6,5), stationary=hit(r,ryo,target).unit;
  ryo.movedDistance=2; ratio(hit(r,ryo,target).unit,stationary,1.25);
  const b=blank(), dor=unit(b,'dorothea'), victim=unit(b,null,'eu','light',6,5), plain=hit(b,dor,victim).unit;
  unit(b,null,'britannia','support',5,6); ratio(hit(b,dor,victim).unit,plain,1.25);
});

test('Swordplay reduces adjacent counter-fire; pursuit tracks actual movement rather than firing', () => {
  const g=blank('eu'), ay=unit(g,'ayano'), enemy=unit(g,null,'britannia','super',6,5,3);
  const protectedCounter=hit(g,ay,enemy).counter;
  ay.cmd=null; const ordinaryCounter=hit(g,ay,enemy).counter; assert(protectedCounter<ordinaryCounter);
  const b=blank(), v=unit(b,'villetta'), target=unit(b,null,'eu','light',6,5), before=hit(b,v,target).unit;
  target.moved=target.attacked=true; assert.equal(hit(b,v,target).unit,before,'firing is not movement');
  b.phase='eu'; target.moved=target.attacked=false; E.move(b,target.id,6,6); b.phase='britannia';
  ratio(hit(b,v,target).unit,before,1.25);
  E.beginTurn(b,'eu',false); b.phase='britannia'; assert.equal(hit(b,v,target).unit,before);
});

test('Formation, penetration and command-aura suppression are local and do not stack copies', () => {
  const g=blank('cf'), rak=unit(g,'rakshata','cf','support',5,6), u=unit(g,null), d=unit(g,null,'eu','light',6,5);
  const pen=hit(g,u,d).armorPen; unit(g,'rakshata','cf','support',4,5); assert.equal(hit(g,u,d).armorPen,pen);
  assert.equal(pen,E.TYPES[u.type].pen+.1);
  const h=blank('eu'), z=unit(h,'zhaohao','eu'), source=unit(h,'schneizel','britannia','super',6,5,3), ally=unit(h,null,'britannia','light',6,6), foe=unit(h,null,'eu','light',7,6);
  const boosted=hit(h,ally,foe).unit; E.attack(h,z.id,source.c,source.r); assert(source.auraDisrupted);
  assert(hit(h,ally,foe).unit<boosted); E.beginTurn(h,'eu',false); assert(!source.auraDisrupted);
});

test('Hong Gu defenses, Kewell morale and Manfredi Armor formation need nearby allies', () => {
  const g=blank('eu'), attacker=unit(g,null,'eu','support'), hong=unit(g,'honggu','cf','super',6,5,3), open=hit(g,attacker,hong).unit;
  unit(g,null,'cf','light',6,6); unit(g,null,'cf','light',7,5); ratio(hit(g,attacker,hong).unit,open,.8);
  const h=blank(), k=unit(h,'kewell'), ally=unit(h,null,'britannia','light',5,6); assert.equal(E.moraleFloor(h,ally),-1);
  ally.cmd='suzaku'; assert.equal(E.moraleFloor(h,ally),0);
  const b=blank(), man=unit(b,'manfredi','britannia','medium',5,6), tank=unit(b,null,'britannia','medium'), target=unit(b,null,'eu','light',6,5);
  const bonus=hit(b,tank,target).unit; man.hp=0; assert(hit(b,tank,target).unit<bonus);
});

test('Local logistics and palace income require a live nearby commander; treasury affects credits only', () => {
  const g=blank('eu'), klaus=unit(g,'klaus'), hurt=unit(g,null,'eu','light',6,5), full=E.repairCost(hurt);
  assert.equal(E.repairCost(hurt,g),Math.max(10,Math.round(full*.5))); klaus.c=0;klaus.r=15; assert.equal(E.repairCost(hurt,g),full);
  const b=blank('cf'), city=b.stations[2], before=E.income(b,'cf'), ga=unit(b,'gaohai','cf','light',city.c,city.r);
  const after=E.income(b,'cf'); assert.equal(after.credits,before.credits+25); assert.equal(after.industry,before.industry);
  assert.equal(E.cityYield(b,city).credits,125); ga.hp=0; assert.equal(E.income(b,'cf').credits,before.credits);
  const a=blank(), staff=unit(a,'augustus'), near=unit(a,null,'britannia','light',5,6), price=E.repairCost(near);
  assert.equal(E.repairCost(near,a),Math.max(10,Math.round(price*.8))); staff.hp=0; assert.equal(E.repairCost(near,a),price);
});

test('Senba and Smilas require a completed stationary turn; movement invalidates their benefits', () => {
  const g=blank('cf'), sen=unit(g,'senba','cf','super',6,5,3), gun=unit(g,null,'eu','support',5,5), open=hit(g,gun,sen).unit;
  E.beginTurn(g,'cf',false); assert(!sen.guardReady); sen.held=true;
  g.turn++; E.beginTurn(g,'cf',false); assert(sen.guardReady); ratio(hit(g,gun,sen).unit,open,.6);
  assert(E.move(g,sen.id,6,6).ok); assert(!sen.guardReady);
  const h=blank('eu'), sm=unit(h,'smilas','eu','light',5,6), defender=unit(h,null,'eu','super',6,5,3), attack=unit(h,null,'britannia','light');
  const counter=hit(h,attack,defender).counter; defender.guardReady=defender.held=true;
  ratio(hit(h,attack,defender).counter,counter,1.25);
});

test('The AI casts designation, handles reposition, and remains deterministic with the new skills', () => {
  const scenario=()=>{ const g=blank(); unit(g,'julius'); unit(g,null,'eu','super',6,5,3); return g; };
  const a=scenario(), b=scenario(); const ar=E.aiOrder(a,1), br=E.aiOrder(b,1);
  assert(ar.some(o=>o.kind==='feint')); assert.deepEqual(ar,br); assert.deepEqual(a.units,b.units);
  const g=blank('eu'), leila=unit(g,'leila'), ally=unit(g,null,'eu','light',5,6); ally.moved=ally.attacked=true;
  unit(g,null,'britannia','super',6,6,3); const events=E.aiOrder(g,leila.id);
  assert(events.some(o=>o.kind==='feint'),'AI should use withdrawal after allied attacks');
});

test('Schneizel rewards a screened ranged formation; the frontline condition is checked at the target', () => {
  const g=blank(), gun=unit(g,null,'britannia','rocket'), target=unit(g,null,'eu','super',7,5,3), sch=unit(g,'schneizel','britannia','support',4,5);
  const open=hit(g,gun,target).unit;
  const screen=unit(g,null,'britannia','light',6,5); ratio(hit(g,gun,target).unit,open,1.2);
  screen.hp=0; assert.equal(hit(g,gun,target).unit,open);
  sch.c=0;sch.r=15; assert(hit(g,gun,target).unit<open,'damage aura must be local');
});

test('Temporary designations, cooldowns and once-per-round stamps survive save/load without refreshing', () => {
  const g=blank();g.mode='campaign';const j=unit(g,'julius'), d=unit(g,'bismarck','eu','super',6,5,3);
  E.feint(g,j.id,d.id); E.attack(g,j.id,d.c,d.r);
  const restored=E.migrateSave(JSON.parse(JSON.stringify(g))); assert(restored);
  const enemy=restored.units.find(v=>v.id===d.id), source=restored.units.find(v=>v.id===j.id);
  assert.equal(enemy.skillMarks[0].damage,.2);assert.equal(enemy.foresightTurn,g.turn);assert.equal(source.feintCD,3);
  E.beginTurn(restored,'eu',false);assert.equal(enemy.skillMarks.length,1);
  E.beginTurn(restored,'britannia',false);assert.equal(enemy.skillMarks.length,0);assert.equal(source.feintCD,2);
});

test('Short reposition cannot embark or inflate amphibious movement; native elite movement remains unrestricted', () => {
  const g=blank(), gin=unit(g,'gino','britannia','scout'), target=unit(g,null,'eu','super',6,5,3);
  E.attack(g,gin.id,target.c,target.r);const sea=E.tile(g,5,6);sea.terrain='sea';
  assert(!E.reachable(g,gin).has(E.key(sea)));
  const h=blank(), boat=E.newUnit(h,'portman','britannia',5,5,1,'gino');boat.moved=false;boat.attacked=true;boat.skillReposition=2;
  for(const t of h.tiles)t.terrain='sea';
  assert(E.reachable(h,boat).size);for(const key of E.reachable(h,boat).keys()){const[c,r]=key.split(',').map(Number);assert(E.distance(boat,{c,r},h)<=2);}
});
