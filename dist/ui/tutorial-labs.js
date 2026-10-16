/* Isolated practical academy: optional chapters use real engine actions where available. */
'use strict';
const TRAINING_LABS=[
{id:'combat',group:'Combat Academy',name:'Damage and counterfire',description:'Range, previews and retaliation',setup(g,t){labReset(g,t);labUnit(g,t,'hero','gloucester',2,4);labUnit(g,t,'enemy','estrella',4,4,'eu').hp=1;},steps:[
{title:'Move into range',text:'Move Gloucester to the gold hex. Infantry assault weapons reach 1 hex; read the green movement and red attack markers.',type:'move',who:'hero',at:[3,4]},
{title:'Attack the defender',text:'Attack the blue Estrella. Point at it first to inspect predicted damage and counterfire. Some artillery weapons prevent retaliation.',type:'destroy',who:'enemy',at:[4,4]},
{title:'Understand counterfire',text:'What makes some attacks costly even when you damage the enemy?',answers:['The enemy can return fire if its weapon and rules permit','Every attack permanently reduces maximum HP','Cities always counterattack at infinite range'],correct:0}]},
{id:'cities',group:'Combat Academy',name:'City shields and capture',description:'Bombard, refresh, occupy',setup(g,t){labReset(g,t);labUnit(g,t,'hero','gloucester',4,4);g.stations[1].shield=1;},steps:[
{title:'Bombard a defended city',text:'Select Gloucester and attack Relay Outpost. Its shield is low for training; normal cities require sustained fire and their garrisons must be cleared.',type:'shield',at:[5,4]},
{title:'Refresh your unit',text:'End the turn before occupying the city. Normal city shields regenerate on future turns, but damage or disruptions can reduce recovery.',type:'turn'},
{title:'Capture Relay Outpost',text:'Move your Gloucester onto the highlighted city. Every non-ship unit class, including Artillery, can capture when defenses are zero.',type:'capture',at:[5,4]},
{title:'Shield regeneration',text:'What happens to the captured city defense on later friendly turns?',answers:['It can regenerate gradually','It instantly returns to maximum on capture','It can never recover'],correct:0}]},
{id:'classes',group:'Combat Academy',name:'Unit classes and roles',description:'Infantry, Armor, Artillery',setup(g,t){labReset(g,t);labUnit(g,t,'inf','gloucester',2,3);labUnit(g,t,'armor','sutherland',2,4);labUnit(g,t,'art','sutherland_air',2,5);},steps:[
{title:'Examine Infantry',text:'Select Gloucester. Infantry specializes in flexible movement, assault, and capturing cities.',type:'select',who:'inf',at:[2,3]},
{title:'Examine Armor',text:'Select Sutherland. Armor provides stronger front-line protection; some types attack again after a kill.',type:'select',who:'armor',at:[2,4]},
{title:'Examine Artillery',text:'Select Sutherland Air. This Rocket Artillery has minimum and maximum attack range 2 and can deal splash damage.',type:'select',who:'art',at:[2,5]},
{title:'Choose your long-range support',text:'Which formation has a range-2 rocket attack but cannot attack adjacent targets?',answers:['Sutherland Air Rocket Artillery','Gloucester Assault Infantry','Sutherland Light Armor'],correct:0}]},
{id:'economy',group:'Strategic Command',name:'Economy and production',description:'Income, resources and factory choices',setup(g,t){labReset(g,t);labUnit(g,t,'hero','gloucester',3,4);g.economy.britannia={credits:1200,industry:340,science:100,sakuradite:35};},steps:[
{title:'Read city output',text:'Select Headquarters. Cities provide Credits, Industry and Science; Sakuradite supplies higher-tier technology. Conquest research converts progress into Command HQ opportunities.',type:'city',at:[1,4]},
{title:'Buy a unit',text:'Open the city Factory and purchase a basic Infantry frame. Check how its price uses Credits and Industry and that new units act next turn.',type:'recruit'},
{title:'Budget choice',text:'When is upgrading a factory preferable to buying another basic Knightmare?',answers:['When you need access to higher-tier frames and can fund the upgrade','Whenever you have no resources','Because factory upgrades make all units free'],correct:0}]},
{id:'repairs',group:'Combat Academy',name:'Repair and reinforce',description:'Restore HP vs. add formation strength',setup(g,t){labReset(g,t);let u=labUnit(g,t,'hurt','gloucester',2,4);u.hp=Math.round(E.maxHP(u)*.5);labUnit(g,t,'fresh','sutherland',3,4);g.economy.britannia.credits=2500;},steps:[
{title:'Inspect damaged HP',text:'Select the Gloucester at half health.',type:'select',who:'hurt',at:[2,4]},
{title:'Restore 20% maximum HP',text:'Click Repair. It costs Credits, consumes actions, and restores up to 20% of the formation maximum HP.',type:'repair',who:'hurt'},
{title:'Inspect a fresh unit',text:'Select the neighboring Sutherland. It has just one frame.',type:'select',who:'fresh',at:[3,4]},
{title:'Add a frame',text:'Click Add frame to reinforce it. Reinforcement increases formation size and maximum HP; it is not the same as repairing.',type:'reinforce',who:'fresh'},
{title:'Which option?',text:'A two-frame formation is damaged but has no missing frames. What restores its HP?',answers:['Repair','Add frame','End the campaign'],correct:0}]},
{id:'terrain',group:'Combat Academy',name:'Terrain and positioning',description:'Cover, attrition and blocked terrain',setup(g,t){labReset(g,t);labUnit(g,t,'hero','gloucester',2,4);labTile(g,3,4,'forest');labTile(g,3,3,'mountain');labTile(g,4,4,'desert');},steps:[
{title:'Take forest cover',text:'Move Gloucester into the forest hex. Forest cover reduces damage taken by 15%; forest does not currently add movement cost.',type:'move',who:'hero',at:[3,4]},
{title:'Compare terrain',text:'Mountains give 25% cover, deserts cause 3% turn-start attrition, and peaks are impassable. Which provides stronger cover?',answers:['Mountains','Forests','Open plains'],correct:0}]},
{id:'controls',group:'Strategic Command',name:'Turn controls and orders',description:'Undo, cycling units and destinations',setup(g,t){labReset(g,t);labUnit(g,t,'hero','gloucester',2,4);labUnit(g,t,'other','sutherland',2,5);},steps:[
{title:'Make an ordinary move',text:'Move Gloucester to the highlighted hex. Ordinary moves can be undone; captures and other irreversible actions cannot.',type:'move',who:'hero',at:[3,4]},
{title:'Undo it',text:'Press Undo (Z) and confirm Gloucester returns to its original position.',type:'undo',who:'hero',at:[2,4]},
{title:'Choose your next unit',text:'Select the Sutherland. Next Unit cycles ready units; Hold skips attacking, End Turn refreshes actions, and Do All Orders Now handles eligible remaining orders.',type:'select',who:'other',at:[2,5]},
{title:'Set a standing order',text:'Press Set destination for Sutherland, then click the gold hex. The unit will attempt to move there on future turns, but it will not automatically attack.',type:'goto',who:'other',at:[5,5]},
{title:'How do standing orders work?',text:'Which behavior is correct?',answers:['The unit tries to follow its route on future turns without automatically attacking','The unit captures every enemy city immediately','The unit gains unlimited movement points'],correct:0}]},
{id:'naval',group:'Advanced Warfare',name:'Naval warfare and ports',description:'Friendly port repair and amphibious capture',setup(g,t){labReset(g,t);[[2,4],[3,4],[4,4]].forEach(p=>labTile(g,p[0],p[1],'sea'));g.stations[0].portLevel=2;g.stations[0].portOwner='britannia';g.stations[0].portAt={c:2,r:4};const ship=labUnit(g,t,'ship','carrier_battleship',2,4);ship.hp=Math.round(E.maxHP(ship)*.55);labUnit(g,t,'amph','portman',4,4);g.economy.britannia.credits=3500;},steps:[
{title:'Inspect a docked ship',text:'Select Carrier-Battleship at the friendly Headquarters port. Docking never repairs HP automatically.',type:'select',who:'ship',at:[2,4]},
{title:'Repair at a friendly port',text:'Use Repair. Warships must occupy an owned port to repair; shipyards have a separate one-unit-per-turn production slot.',type:'repair',who:'ship'},
{title:'Select an amphibious Knightmare',text:'Select Portman in the sea. Amphibious Knightmares fight afloat and can make landings; ordinary land units become transports.',type:'select',who:'amph',at:[4,4]},
{title:'Land on a coastal city',text:'Move Portman from the sea to undefended Relay Outpost to capture it.',type:'capture',at:[5,4]},
{title:'Independent port ownership',text:'Which rule is correct?',answers:['A port may have a different owner from the adjacent city','The city and port always change owners together','Warships receive automatic healing each turn in port'],correct:0}]},
{id:'elites',group:'Advanced Warfare',name:'Research and Elite Forces',description:'Permanent HQ research and unique Elite levels',setup(g,t){labReset(g,t);labUnit(g,t,'regular','gloucester',2,4);let e=labUnit(g,t,'elite','elite_cornelia_gloucester',4,4);e.eliteLevel=3;e.hp=E.maxHP(e);},steps:[
{title:'Inspect a regular frame',text:'Select Gloucester and inspect its real statistics. Command HQ research can enhance combat and unlock new capabilities between operations.',type:'select',who:'regular',at:[2,4]},
{title:'Inspect a loaned Elite',text:'Select the Elite Gloucester and compare its HP, attack and defense. This Lv.3 training unit is loaned: you are not unlocking it permanently.',type:'select',who:'elite',at:[4,4]},
{title:'Elite progression',text:'Elite Forces use fragments and levels. Their unique mechanics develop at levels 3 and 5. What is true?',answers:['Permanent HQ unlocks carry between operations, but the tutorial loan does not','Any regular unit becomes Elite after one kill','Elite upgrades are automatically free'],correct:0},
{title:'Research resources',text:'Which currency is used for permanent Command HQ research?',answers:['Command tokens','City defense shields','Units’ remaining movement'],correct:0}]},
{id:'groups',group:'Advanced Warfare',name:'Army groups and automation',description:'Build a group and assign a destination',setup(g,t){labReset(g,t);labUnit(g,t,'first','gloucester',2,4);labUnit(g,t,'second','sutherland',2,5);},steps:[
{title:'Form an army group',text:'Create a temporary two-unit army group with the real engine. Groups can be managed from Army Groups during Conquest or regional battles.',type:'action',button:'Form training army group',op:'group-create'},
{title:'Give the group an objective',text:'Press Set group destination, then click the highlighted hex. The group routes through ordinary standing orders.',type:'action',button:'Set group destination',op:'group-route',at:[6,4]},
{title:'Limits of automation',text:'Which statement describes army groups?',answers:['They coordinate standing orders but units still obey regular movement and combat rules','They automatically win every battle','They produce units for free'],correct:0}]},
{id:'fleija',group:'Advanced Warfare',name:'F.L.E.I.J.A. and Eliminators',description:'Blast rings and a live intercepted strike',setup(g,t){labReset(g,t);g.arsenal||={};g.arsenal.britannia=1;g.stations[2].eliminator=1;labUnit(g,t,'hero','gloucester',2,4);},steps:[
{title:'Consider the blast radius',text:'F.L.E.I.J.A. has a ground-zero hex and dangerous surrounding rings. Select the correct fact.',answers:['Nearby hexes can also suffer severe damage','The blast affects only the exact target unit','The blast cannot damage a city'],correct:0},
{title:'Test a ready Eliminator',text:'Eastern Citadel holds a ready Eliminator. Launch a disposable training warhead at that city to demonstrate a real engine interception.',type:'action',button:'Fire test warhead',op:'test-fleija',at:[9,4]},
{title:'Defensive technology',text:'What does an Eliminator do?',answers:['Intercept one nearby incoming F.L.E.I.J.A. warhead, then expend its charge','Block every future warhead permanently','Increase factory production every turn'],correct:0}]}
];
const TRAINING_LAB_INDEX=Object.fromEntries(TRAINING_LABS.map(x=>[x.id,x]));
function labReset(g,t){g.units=[];g.nextId=1;t.ids={};t.notes={};g.roster={};g.armyGroups=[];g.stations[1].shield=0;}
function labTile(g,c,r,terrain){const x=E.tile(g,c,r);if(x)x.terrain=terrain;}
function labUnit(g,t,k,type,c,r,side='britannia'){const u=E.newUnit(g,type,side,c,r,1);t.ids[k]=u.id;return u;}
function labUnitByKey(k){return game.units.find(u=>u.id===tutorialState?.ids?.[k]);}
function labData(){return TRAINING_LAB_INDEX[tutorialState?.lab];}
function labStepData(){return labData()?.steps[tutorialState?.step];}
function labTarget(){const p=labStepData()?.at;return p?{c:p[0],r:p[1]}:null;}
function labFocusPoint(){return labTarget()||labUnitByKey(labStepData()?.who)||game?.stations?.[0];}
function labFocus(){const p=labFocusPoint();if(p)centerOn(p);}
function tutorialHub(){
  if(isTutorial())tutorialExit();
  startMenu();
  const groups=[...new Set(TRAINING_LABS.map(x=>x.group))];
  modal.innerHTML='<div class="overlay"><section class="dialog wide tutorial-hub" role="dialog" aria-modal="true" aria-label="Training Academy">'+
    '<div class="dialog-head"><div><div class="eyebrow">FIELD TRAINING</div><h2>Training Academy</h2><p>Choose a practical chapter. No drill replaces a save, spends permanent HQ resources, or grants permanent unlocks.</p></div><button class="small" data-action="tutorial-hub-close">Close</button></div>'+
    '<div class="tutorial-hub-grid"><button class="tutorial-hub-basic" data-action="tutorial-basic"><strong>Basic Training</strong><span>Select · Move · Attack · Capture · Produce · Assign</span><small>Original introductory battlefield</small></button>'+
    groups.map(group=>'<section class="tutorial-hub-group"><h3>'+esc(group)+'</h3>'+
      TRAINING_LABS.filter(x=>x.group===group).map(x=>'<button data-tutorial-lab="'+x.id+'"><strong>'+esc(x.name)+'</strong><small>'+esc(x.description)+'</small></button>').join('')+'</section>').join('')+'</div>'+
    '<div class="dialog-footer"><small>Advanced drills are simulated temporary battles. Strategic weapons use isolated Conquest mechanics and never affect a saved operation.</small></div></section></div>';
}
function labStart(id){
  const lesson=TRAINING_LAB_INDEX[id];if(!lesson)return;
  withScenarios(()=>{
    tutorialScenario();resetSession();game=tutorialMakeGame();
    tutorialState={lab:id,step:0,ids:{},notes:{}};lesson.setup(game,tutorialState);
    setWorld();zoom=1;selection=null;closeModal();render();labFocus();tutorialPaint();
  });
}
function labAllowHex(p){
  const s=labStepData(),goal=labTarget();if(!s)return false;
  if(!goal||p.c===goal.c&&p.r===goal.r)return true;
  if(game.units.some(u=>u.side===game.player&&u.c===p.c&&u.r===p.r))return true;
  if(game.stations.some(x=>x.owner===game.player&&x.c===p.c&&x.r===p.r))return true;
  toast('Follow the gold objective marker.');return false;
}
function labAllowButton(d){
  const actions=['zoom-in','zoom-out','fit','home','toggle-minimap','toggle-objective','sound','mobile-unit-toggle','close','help','help-close','next','undo','end','goto','goto-cancel','wait','repair','reinforce','details','do-all-orders','army-groups','army-create'];
  return actions.includes(d.action)||d.station!==undefined||d.shop!==undefined||d.branch!==undefined||d.recruit!==undefined||d.armyRoute!==undefined||d.armyEdit!==undefined;
}
function labCheck(){
  const s=labStepData();if(!s)return;
  const u=labUnitByKey(s.who),goal=labTarget();let good=false;
  switch(s.type){
    case 'select':good=!!u&&selection?.kind==='unit'&&selection.id===u.id;break;
    case 'city':good=selection?.kind==='station'&&selection.id===0;break;
    case 'move':good=!!u&&u.c===goal.c&&u.r===goal.r;break;
    case 'destroy':good=!u||u.hp<=0;break;
    case 'shield':good=game.stations[1].shield<=0;break;
    case 'capture':good=game.stations[1].owner===game.player;break;
    case 'recruit':good=game.units.some(v=>v.side===game.player&&!Object.values(tutorialState.ids).includes(v.id));break;
    case 'repair':good=!!u&&u.hp>(tutorialState.notes['before-'+s.who]||0);break;
    case 'reinforce':good=!!u&&u.stack>=2;break;
    case 'undo':good=!!u&&u.c===goal.c&&u.r===goal.r;break;
    case 'goto':good=!!u&&u.goto?.c===goal.c&&u.goto?.r===goal.r;break;
    case 'action':if(s.op==='group-route'){const gr=E.armyGroup(game,tutorialState.notes.group);good=gr?.destination?.c===goal.c&&gr?.destination?.r===goal.r;}break;
  }
  if(good)labNext();
}
function labNext(){
  if(!isTutorial()||!tutorialState?.lab)return;
  tutorialState.step++;
  const s=labStepData();
  if(s?.type==='repair')tutorialState.notes['before-'+s.who]=labUnitByKey(s.who)?.hp||0;
  render();labFocus();
}
function labAnswer(n){
  const s=labStepData();if(!s?.answers)return;
  if(n!==s.correct){toast('Not quite. Re-read the explanation and choose again.');return;}
  labNext();
}
function labEndTurn(){
  if(labStepData()?.type!=='turn'){toast('Finish the current objective first.');return;}
  closeModal();undoStack=[];E.finishWarTurn(game,game.turn);game.turn++;E.beginTurn(game,game.player,true);
  render();labNext();
}
function labAction(op){
  const s=labStepData();if(s?.op!==op)return;
  let result;
  if(op==='group-create'){
    const a=labUnitByKey('first'),b=labUnitByKey('second');
    result=E.createArmyGroup(game,a.id);
    if(result.ok){E.addArmyGroupUnit(game,result.group.id,b.id);tutorialState.notes.group=result.group.id;}
  }else if(op==='group-route'){
    const id=tutorialState.notes.group;if(!E.armyGroup(game,id))return toast('Missing army group.');
    armyGroupStartRouting(id);return;
  }else if(op==='test-fleija'){
    const oldMode=game.mode;
    try{game.mode='conquest';result=E.launch(game,game.player,9,4);}
    finally{game.mode=oldMode;}
    if(result?.ok)tutorialState.notes.intercepted=!!result.intercepted;
  }
  if(result&&!result.ok){toast(result.reason||'Training action unavailable.');return;}
  if(op==='group-create'&&result?.ok)labNext();
  if(op==='test-fleija'&&result?.ok){toast(result.intercepted?'Eliminator intercepted the warhead; the charge was consumed.':'No interception: warhead detonated.',true);labNext();}
}
function labPaint(){
  const lesson=labData(),s=labStepData();if(!lesson)return;
  const n=tutorialState.step,done=!s,count=lesson.steps.length;
  const panel=document.createElement('section');panel.id='tutorial-coach';panel.className='tutorial-coach-lab';panel.setAttribute('aria-label','Training Academy lesson');
  panel.innerHTML='<div class="tutorial-label"><span>'+esc(lesson.group)+'</span><span>'+(done?'Complete':'Step '+(n+1)+' of '+count)+'</span></div>'+
    '<div class="tutorial-meter"><i style="width:'+(100*Math.min(n,count)/count)+'%"></i></div>'+
    '<h3>'+esc(done?'Lesson complete':s.title)+'</h3>'+
    '<p>'+esc(done?'You completed '+lesson.name+'. Select another drill or return to the main menu.':s.text)+'</p>'+
    (!done&&s.answers?'<div class="tutorial-choices">'+s.answers.map((a,i)=>'<button type="button" data-tutorial-answer="'+i+'">'+esc(a)+'</button>').join('')+'</div>':'')+
    (!done&&s.type==='action'?'<button class="primary tutorial-primary" data-tutorial-op="'+s.op+'">'+esc(s.button)+'</button>':'')+
    '<div class="tutorial-actions">'+
    (!done&&s.type==='turn'?'<button class="primary" data-action="end">End turn</button>':'')+
    (!done&&s.at?'<button data-action="tutorial-focus">Show objective</button>':'')+
    '<button data-action="tutorial-hub">All lessons</button><button data-action="tutorial-exit">Main menu</button></div>';
  app.appendChild(panel);
}
