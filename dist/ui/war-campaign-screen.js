/* New strategic World Campaign menu. No combat/Conquest logic is changed.
   Uses the 2017 GSHHG political atlas and an isolated worldSnapshot. */
'use strict';
const WC = KnightmareWarCampaign;
let wcFaction='eu',wcTier=1,wcMission=null,wcDifficulty='normal',
    wcCanvas=null,wcAtlas=null,wcWorld=null,wcHovered=null,
    wcView={zoom:1,x:0,y:0},wcDrag=null,wcFeedback='';
const WC_ROUTES={
  eu:[
    ['eu-bering','eu-canada'],
    ['eu-greenland','eu-canada'],['eu-caribbean','eu-panama-atlantic'],
    ['eu-new-york','eu-great-lakes'],['eu-canada','eu-great-lakes'],
    ['eu-great-lakes','eu-rocky-mountains'],
    ['eu-rocky-mountains','eu-pendragon-east']
  ],
  britannia:[
    ['britannia-bering','britannia-siberia'],['britannia-siberia','britannia-urals'],
    ['britannia-urals','britannia-western-russia'],['britannia-turkey','britannia-european-war'],
    ['britannia-western-russia','britannia-european-war'],
    ['britannia-european-war','britannia-stonehenge']
  ],
  'britannia-federation':[
    ['britannia-federation-indochina','britannia-federation-south-china'],
    ['britannia-federation-south-china','britannia-federation-yangtze'],
    ['britannia-federation-yangtze','britannia-federation-luoyang'],
    ['britannia-federation-korea','britannia-federation-luoyang']
  ],
  'federation-britannia':[
    ['federation-britannia-philippines','federation-britannia-hawaii'],
    ['federation-britannia-indochina','federation-britannia-new-zealand'],
    ['federation-britannia-hawaii','federation-britannia-pacific-northwest'],
    ['federation-britannia-hawaii','federation-britannia-panama-pacific'],
    ['federation-britannia-panama-pacific','federation-britannia-central-america'],
    ['federation-britannia-central-america','federation-britannia-mexican-heartland'],
    ['federation-britannia-pacific-northwest','federation-britannia-california'],
    ['federation-britannia-california','federation-britannia-pendragon-west'],
    ['federation-britannia-mexican-heartland','federation-britannia-pendragon-west']
  ]
};
function wcProgress(){return WC.load(localStorage);}
function wcMapColor(){return E.FACTIONS[WC.campaignSide(wcFaction)].color;}
function wcState(m){return WC.state(wcProgress(),wcFaction,m.id);}
function wcSafe(s){return esc(s);}
function wcFlag(f){return (ART.flagSVG(WC.campaignSide(f))||'');}
function wcActiveMissions(){return WC.registry[wcFaction].flatMap(t=>t.missions);}
function wcProject(lon,lat){
  return {x:(lon+180)/360*wcCanvas.width,
          y:(74-lat)/128*wcCanvas.height};
}
function wcScreen(m) {
  const p=wcProject(m.marker[0],m.marker[1]);
  return {x:p.x*wcView.zoom+wcView.x,y:p.y*wcView.zoom+wcView.y};
}
function wcConstrain(){
  if(!wcCanvas)return;
  wcView.zoom=Math.max(1,Math.min(4.5,wcView.zoom));
  wcView.x=Math.max(wcCanvas.width*(1-wcView.zoom),Math.min(0,wcView.x));
  wcView.y=Math.max(wcCanvas.height*(1-wcView.zoom),Math.min(0,wcView.y));
}
function wcBuildAtlas(){
  wcWorld=WC.worldSnapshot(E,wcFaction,wcProgress());
  wcAtlas=document.createElement('canvas');
  wcAtlas.width=1800;
  wcAtlas.height=Math.round(1800*mapH(wcWorld)/mapW(wcWorld));
  const b=wcAtlas.getContext('2d');
  b.setTransform(wcAtlas.width/mapW(wcWorld),0,0,wcAtlas.height/mapH(wcWorld),0,0);
  if(!GEOGRAPHY.paint(b,wcWorld,0,mapW(wcWorld),0,mapH(wcWorld),0.14)){
    b.fillStyle='#16384e';
    b.fillRect(0,0,mapW(wcWorld),mapH(wcWorld));
  }
}
function wcDraw(){
  if(!wcCanvas || !wcAtlas)return;
  wcConstrain();
  const c=wcCanvas.getContext('2d'),w=wcCanvas.width,h=wcCanvas.height;
  c.clearRect(0,0,w,h);
  c.fillStyle='#0e293d';c.fillRect(0,0,w,h);
  c.drawImage(wcAtlas,wcView.x,wcView.y,w*wcView.zoom,h*wcView.zoom);
  c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
  const all=wcActiveMissions(), color=wcMapColor(),
        current=WC.unlockedTier(wcProgress(),wcFaction);
  // Only tactical direction for the browsed/current front, never unit orders.
  for(const [from,to] of WC_ROUTES[wcFaction]){
    const a=WC.ALL[from],b=WC.ALL[to];
    if(!a||!b||Math.min(a.tier,b.tier)>current+1||
      (a.tier!==wcTier && b.tier!==wcTier))continue;
    const p=wcScreen(a),q=wcScreen(b);
    if(Math.abs(p.x-q.x)>w*.62)continue; // Hide paths crossing the dateline wrap.
    const angle=Math.atan2(q.y-p.y,q.x-p.x);
    c.save();c.strokeStyle=color+'9c';c.fillStyle=color;
    c.lineWidth=1.8;c.setLineDash([7,6]);c.beginPath();
    c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);
    const d=11,tx=q.x-Math.cos(angle)*17,ty=q.y-Math.sin(angle)*17;
    c.beginPath();c.moveTo(tx,ty);
    c.lineTo(tx-Math.cos(angle-.52)*d,ty-Math.sin(angle-.52)*d);
    c.lineTo(tx-Math.cos(angle+.52)*d,ty-Math.sin(angle+.52)*d);
    c.closePath();c.fill();c.restore();
  }
  // Geographically bounded overlays are visual objectives only. Actual political
  // recoloring is on the isolated GSHHG worldSnapshot's LAND hex ownership.
  for(const m of all){
    const state=wcState(m),show=m.tier===wcTier || m.id===wcMission;
    if(!show)continue;
    const [west,south,east,north]=m.bounds,
          a=wcProject(west,north),b=wcProject(east,south);
    let x=a.x*wcView.zoom+wcView.x,y=a.y*wcView.zoom+wcView.y,
        rw=(b.x-a.x)*wcView.zoom,rh=(b.y-a.y)*wcView.zoom;
    c.save();c.strokeStyle=state==='completed'?color:state==='locked'?'#8fa1af80':'#f1d38d';
    c.lineWidth=m.id===wcMission?2.8:1.25;
    c.setLineDash(state==='locked'?[3,5]:[7,4]);
    if(m.polygon){
      c.beginPath();
      m.polygon.forEach(([lon,lat],i)=>{
        const p=wcProject(lon,lat),sx=p.x*wcView.zoom+wcView.x,sy=p.y*wcView.zoom+wcView.y;
        if(i)c.lineTo(sx,sy);else c.moveTo(sx,sy);
      });
      c.closePath();c.stroke();
    }else c.strokeRect(x,y,rw,rh);
    c.restore();
  }
  for(const m of all){
    const s=wcState(m),p=wcScreen(m),chosen=m.id===wcMission,
          onTier=m.tier===wcTier,
          rad=chosen?11: onTier?8:5;
    if(p.x<0||p.x>w||p.y<0||p.y>h)continue;
    c.save();
    c.globalAlpha=s==='locked' ? .46 : onTier || chosen ? 1 : .70;
    c.fillStyle=s==='completed'?color:s==='locked'?'#5b7284':s==='planned'?'#e5b766':'#f3e3c0';
    c.strokeStyle=chosen?'#fff9e5':'#081d2d';
    c.lineWidth=chosen?3:2.2;
    c.beginPath();c.arc(p.x,p.y,rad,0,Math.PI*2);c.fill();c.stroke();
    if(m.final){
      c.beginPath();c.arc(p.x,p.y,rad+5,0,Math.PI*2);
      c.strokeStyle='#f4d48b';c.lineWidth=2;c.stroke();
    }
    c.fillStyle='#132433';c.textAlign='center';c.textBaseline='middle';
    c.font='bold '+Math.max(10,rad*1.25)+'px system-ui';
    if(s==='completed')c.fillText('✓',p.x,p.y+.5);
    else if(s==='locked')c.fillText('·',p.x,p.y);
    else if(s==='planned')c.fillText('!',p.x,p.y);
    if(onTier || chosen || m.id===wcHovered){
      c.globalAlpha=1;c.textAlign='center';c.textBaseline='top';
      c.font='600 11px system-ui';
      const label=m.title.length>22?m.region:m.title;
      const tw=c.measureText(label).width;
      c.fillStyle='#0b1a28e8';c.fillRect(p.x-tw/2-7,p.y+rad+5,tw+14,18);
      c.fillStyle='#f4f0de';c.fillText(label,p.x,p.y+rad+8);
    }
    c.restore();
  }
  c.restore();
}
function wcResize(){
  if(!wcCanvas || !wcCanvas.isConnected)return;
  const ratio=Math.min(window.devicePixelRatio||1,2),
        w=Math.max(520,Math.round(wcCanvas.clientWidth*ratio)),
        h=Math.max(250,Math.round(wcCanvas.clientHeight*ratio));
  if(wcCanvas.width!==w || wcCanvas.height!==h){
    wcCanvas.width=w;wcCanvas.height=h;
    wcView={zoom:1,x:0,y:0};
  }
  wcDraw();
}
function wcPick(x,y){
  let nearest=null,best=32*32*(window.devicePixelRatio||1)**2;
  for(const m of wcActiveMissions()){
    const p=wcScreen(m),d=(x-p.x)**2+(y-p.y)**2;
    if(d<best){nearest=m;best=d;}
  }
  return nearest;
}
function wcAttach(){
  wcCanvas=modal.querySelector('#wc-map');
  if(!wcCanvas)return;
  wcResize();
  wcCanvas.onpointerdown=e=>{
    const r=wcCanvas.getBoundingClientRect();
    wcDrag={x:e.clientX,y:e.clientY,originX:wcView.x,originY:wcView.y,moved:false};
    wcCanvas.setPointerCapture(e.pointerId);
  };
  wcCanvas.onpointermove=e=>{
    if(wcDrag){
      const dx=(e.clientX-wcDrag.x)*wcCanvas.width/wcCanvas.clientWidth,
            dy=(e.clientY-wcDrag.y)*wcCanvas.height/wcCanvas.clientHeight;
      if(Math.abs(dx)+Math.abs(dy)>4)wcDrag.moved=true;
      if(wcDrag.moved){wcView.x=wcDrag.originX+dx;wcView.y=wcDrag.originY+dy;wcDraw();}
    }else{
      const r=wcCanvas.getBoundingClientRect(),
            m=wcPick((e.clientX-r.left)*wcCanvas.width/r.width,(e.clientY-r.top)*wcCanvas.height/r.height);
      wcHovered=m?.id||null;
      wcCanvas.title=m?m.title+' · Tier '+m.tier:'Drag to pan, scroll to zoom';
      wcCanvas.style.cursor=m?'pointer':'grab';
      wcDraw();
    }
  };
  wcCanvas.onpointerup=e=>{
    const drag=wcDrag;wcDrag=null;
    if(!drag?.moved){
      const r=wcCanvas.getBoundingClientRect(),
            m=wcPick((e.clientX-r.left)*wcCanvas.width/r.width,(e.clientY-r.top)*wcCanvas.height/r.height);
      if(m){wcMission=m.id;wcTier=m.tier;wcRefresh();}
    }
  };
  wcCanvas.onpointercancel=()=>{wcDrag=null;};
  wcCanvas.onwheel=e=>{
    e.preventDefault();
    const r=wcCanvas.getBoundingClientRect(),
          x=(e.clientX-r.left)*wcCanvas.width/r.width,
          y=(e.clientY-r.top)*wcCanvas.height/r.height,
          prev=wcView.zoom,next=Math.max(1,Math.min(4.5,prev*(e.deltaY<0?1.16:1/1.16))),
          f=next/prev;
    wcView.x=x-(x-wcView.x)*f;wcView.y=y-(y-wcView.y)*f;
    wcView.zoom=next;wcDraw();
  };
}
function wcMissionPanel(){
  const p=wcProgress(),m=WC.ALL[wcMission],status=m?WC.state(p,wcFaction,m.id):null,
        row=WC.registry[wcFaction].find(t=>t.number===wcTier),
        done=row.missions.filter(o=>WC.completed(p,wcFaction,o.id)).length,
        unlocked=WC.unlockedTier(p,wcFaction),
        battle=getSave(WC.BATTLE_KEY),
        resume=battle && !battle.over && battle.warCampaign?.faction===wcFaction;
  let html='<div class="wc-detail-header"><span class="wc-tag">TIER '+wcTier+
    ' · '+done+'/'+row.missions.length+' COMPLETE</span><h3>'+wcSafe(row.title)+'</h3></div>'+
    '<div class="wc-objectives">'+row.missions.map(o=>{
      const state=WC.state(p,wcFaction,o.id);
      return '<button class="wc-objective '+(o.id===wcMission?'active ':'')+state+
        '" data-wc-mission="'+o.id+'"><span class="wc-state">'+
        (state==='completed'?'✓':state==='locked'?'◇':state==='planned'?'!':'●')+
        '</span><span>'+wcSafe(o.title)+'</span></button>';
    }).join('')+'</div>';
  if(!row.missions.length)
    html+='<div class="wc-detail"><h2>No objectives in this tier</h2><p>This tier has no registered regional battles.</p></div>';
  if(m){
    html+='<div class="wc-detail"><div class="wc-tag">'+(m.final?'FINAL OBJECTIVE · ':'')+
      'TIER '+m.tier+' · '+wcSafe(m.region)+'</div><h2>'+wcSafe(m.title)+'</h2>'+
      '<p>'+wcSafe(m.description)+'</p><div class="wc-record">Status: <b>'+
      (status==='completed'?'Secured':status==='locked'?'Locked':status==='planned'?'Planned — Scenario Not Yet Implemented':'Ready for deployment')+'</b></div>';
    if(status==='locked'){
      html+='<p class="wc-warning">Complete every required war in Tier '+unlocked+' to unlock this objective.</p>';
      if(m.status==='planned')html+='<p class="wc-warning">Planned — Scenario Not Yet Implemented.</p>';
    }else if(status==='planned')html+='<p class="wc-warning">Planned — Scenario Not Yet Implemented. This objective cannot be played or completed.</p>';
    else if(!E.scenarios?.byId?.[m.scenarioId])
      html+='<p class="wc-warning">This regional scenario module is not registered.</p>';
    else{
      html+='<label class="wc-diff-label" for="wc-difficulty">Battle difficulty</label><select class="select" id="wc-difficulty">'+
        ['normal','hard','challenge','elite'].map(d=>'<option value="'+d+'"'+(wcDifficulty===d?' selected':'')+'>'+wcSafe(E.DIFFICULTIES[d]?.name||d)+'</option>').join('')+'</select>';
      html+='<button class="primary wc-launch" data-action="wc-launch">'+(status==='completed'?'Replay regional war':'Launch regional war')+'</button>';
    }
    if(status==='completed')html+='<p class="wc-record">Campaign victory recorded for '+wcSafe(E.FACTIONS[WC.campaignSide(wcFaction)].name)+'.</p>';
    html+='</div>';
  }
  if(resume)html+='<button class="wc-resume" data-action="wc-resume">Continue Campaign battle · turn '+battle.turn+'</button>';
  return html;
}
function wcRefresh(){
  const p=wcProgress(),tiers=WC.registry[wcFaction],
        complete=tiers.flatMap(t=>t.missions).filter(m=>WC.completed(p,wcFaction,m.id)).length,
        total=tiers.flatMap(t=>t.missions).length,
        unlocked=WC.unlockedTier(p,wcFaction);
  const top=modal.querySelector('#wc-progress');
  if(top)top.textContent=total ? complete+'/'+total+' territories secured · Tier '+Math.min(unlocked,tiers.length)+' of '+tiers.length : 'No registered battles';
  const tabs=modal.querySelector('#wc-tiers');
  if(tabs)tabs.innerHTML=tiers.map(t=>'<button class="'+(t.number===wcTier?'current ':'')+
    (t.number>unlocked?'locked':'')+'" data-wc-tier="'+t.number+'" aria-pressed="'+(t.number===wcTier)+'">'+
    '<b>'+t.number+'</b><small>'+wcSafe(t.title)+'</small></button>').join('');
  const pane=modal.querySelector('#wc-panel');
  if(pane)pane.innerHTML=wcMissionPanel();
  wcDraw();
}
function warCampaignDialog(message=''){
  // A finished/abandoned Campaign battle must never become a new standalone
  // scenario. Its save remains in the dedicated Campaign battle slot.
  if(game.mode==='scenario' || game.mode==='campaign'){
    resetSession();game=E.createGame('britannia');setWorld();selection=null;
    zoom=3.2;render();
  }
  wcFeedback=message;
  const p=wcProgress();wcFaction=p.selectedFaction;
  wcTier=Math.min(WC.unlockedTier(p,wcFaction),WC.registry[wcFaction].length);
  const row=WC.registry[wcFaction][wcTier-1];
  wcMission=(row.missions.find(m=>!WC.completed(p,wcFaction,m.id))||row.missions[0])?.id||null;
  wcHovered=null;wcView={zoom:1,x:0,y:0};
  modal.innerHTML='<div class="overlay"><section class="dialog wc-dialog" role="dialog" aria-modal="true" aria-label="World Campaign">'+
    '<div class="wc-heading"><div><div class="eyebrow">Code Geass · Grand Strategy</div><h2>Campaign Mode</h2>'+
    '<p id="wc-progress"></p></div>'+
    '<div><button class="small close" data-action="wc-back">Back to menu</button></div></div>'+
    '<div class="wc-factions">'+WC.FACTIONS.map(f=>'<button class="'+(f===wcFaction?'active':'')+
    '" data-wc-faction="'+f+'" style="--wc-faction-color:'+E.FACTIONS[WC.campaignSide(f)].color+'">'+
    '<span class="wc-flag">'+wcFlag(f)+'</span>'+wcSafe(WC.CAMPAIGN_INFO[f].label)+'</button>').join('')+'</div>'+
    (message?'<p class="wc-feedback" role="status">'+wcSafe(message)+'</p>':'')+
    '<div class="wc-layout"><section class="wc-stage"><div class="wc-map-area"><canvas id="wc-map" aria-label="Strategic campaign world map: click regional objectives, drag to pan, use mouse wheel to zoom"></canvas>'+
    '<div class="wc-map-controls"><button data-action="wc-zoom-out" aria-label="Zoom out">−</button><button data-action="wc-reset" aria-label="Fit world map">WORLD</button><button data-action="wc-zoom-in" aria-label="Zoom in">+</button></div>'+
    '<div class="wc-map-legend"><span>● Ready</span><span>✓ Secured</span><span>! Planned</span><span>◇ Locked</span></div></div>'+
    '<div class="wc-tier-strip" id="wc-tiers"></div></section>'+
    '<aside class="wc-panel" id="wc-panel"></aside></div>'+
    '<p class="wc-footnote">Territorial colors show your Campaign victories only. Conquest and standalone Scenarios are unchanged. Drag to pan · scroll to zoom.</p></section></div>';
  wcCanvas=modal.querySelector('#wc-map');
  wcBuildAtlas();wcAttach();wcRefresh();focusDialog();
}
function wcSelectFaction(f){
  if(!WC.FACTIONS.includes(f))return;
  if(!WC.chooseFaction(localStorage,f)){toast('Unable to save your selected Campaign faction.');return;}
  wcFaction=f;wcTier=Math.min(WC.unlockedTier(wcProgress(),f),WC.registry[f].length);
  wcMission=WC.registry[f][wcTier-1].missions[0]?.id||null;
  // Rebuild political map from initial 2017 geography for this faction's own wins.
  warCampaignDialog();
}
function wcLaunch(){
  const m=WC.ALL[wcMission];
  if(!m)return;
  const info=WC.launch(wcProgress(),wcFaction,m.id,E.scenarios?.byId);
  if(!info.ok){toast(info.reason,true);return;}
  confirmReplace(WC.BATTLE_KEY,'war-campaign',()=>{
    scenarioKind=info.scenarioId;
    scenarioSide=info.battleSide;
    scenarioDifficulty=wcDifficulty;
    startScenario(info.battleSide,info.context);
  });
}
function wcResume(){
  const g=getSave(WC.BATTLE_KEY);
  if(!g?.warCampaign || g.warCampaign.faction!==wcFaction){toast('No active Campaign battle for this faction.');return;}
  loadGame(g);
}
document.addEventListener('click',function(e){
  const b=e.target.closest('button');if(!b || b.disabled)return;
  const d=b.dataset;
  if(d.wcFaction){wcSelectFaction(d.wcFaction);return;}
  if(d.wcTier){wcTier=Number(d.wcTier);wcMission=WC.registry[wcFaction][wcTier-1].missions[0]?.id||null;wcRefresh();return;}
  if(d.wcMission){wcMission=d.wcMission;wcTier=WC.ALL[wcMission].tier;wcRefresh();return;}
  if(d.action==='war-campaign'){withScenarios(()=>warCampaignDialog());return;}
  if(d.action==='wc-back'){startMenu();return;}
  if(d.action==='wc-return'){warCampaignDialog(game.warCampaign?.announcement || '');return;}
  if(d.action==='wc-launch'){wcLaunch();return;}
  if(d.action==='wc-resume'){wcResume();return;}
  if(d.action==='wc-reset'){wcView={zoom:1,x:0,y:0};wcDraw();return;}
  if(d.action==='wc-zoom-in'||d.action==='wc-zoom-out'){
    const prev=wcView.zoom,f=d.action==='wc-zoom-in'?1.35:1/1.35;
    const next=Math.max(1,Math.min(4.5,prev*f)),cx=wcCanvas.width/2,cy=wcCanvas.height/2;
    wcView.x=cx-(cx-wcView.x)*next/prev;
    wcView.y=cy-(cy-wcView.y)*next/prev;wcView.zoom=next;wcDraw();
  }
});
document.addEventListener('change',function(e){
  if(e.target.id==='wc-difficulty')wcDifficulty=E.DIFFICULTIES[e.target.value]?e.target.value:'normal';
});
window.addEventListener('resize',function(){if(modal.querySelector('[aria-label="World Campaign"]'))wcResize();});
