/* Reduce oversized regional scenario starting armies without changing Conquest or saved games.
 * Ships and their embarked troops are treated as indivisible starting groups. */
(function(root){
  'use strict';
  function hash(value) {
    let h=2166136261;
    for(const ch of String(value)) {h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function reduce(g) {
    if(!g || g.mode!=='scenario' || !Array.isArray(g.units))return null;
    const groupedUnitIds=new Map();
    for(const group of g.scenario?.groups||[])
      for(const id of group.units||[])if(!groupedUnitIds.has(id))
        groupedUnitIds.set(id,group.id||group.name);
    const bundles=g.units.map(rootUnit=>{
      const members=[],seen=new Set();
      function collect(u) {
        if(!u || seen.has(u))return;
        seen.add(u);members.push(u);
        for(const passenger of u.cargo||[])collect(passenger);
      }
      collect(rootUnit);
      const group=members.map(u=>groupedUnitIds.get(u.id)).find(Boolean);
      const role=rootUnit.cargo?.length?'transport':rootUnit.type;
      const bucket=(group || Math.floor(rootUnit.c/12)+':'+Math.floor(rootUnit.r/12))+':'+role;
      return {root:rootUnit,members,weight:members.length,side:rootUnit.side,
        protected:members.some(u=>Boolean(u.cmd)),bucket,
        priority:hash(String(rootUnit.id)+':'+rootUnit.c+':'+rootUnit.r)};
    });
    const original=bundles.reduce((n,b)=>n+b.weight,0);
    if(original<=80)return null;
    const sides=[...new Set(bundles.map(b=>b.side))];
    const counts=Object.fromEntries(sides.map(side=>[side,bundles.filter(b=>b.side===side)
      .reduce((sum,b)=>sum+b.weight,0)]));
    const target=Math.round(original/2);
    const quotas=Object.fromEntries(sides.map(side=>[side,Math.floor(counts[side]/2)]));
    let extra=target-Object.values(quotas).reduce((a,b)=>a+b,0);
    for(const side of sides.filter(side=>counts[side]%2).sort((a,b)=>hash(a)-hash(b))){
      if(extra--<=0)break;
      quotas[side]++;
    }
    const keptRoots=new Set(),keptIds=new Set();
    function keep(bundle) {
      keptRoots.add(bundle.root);
      for(const u of bundle.members)keptIds.add(u.id);
    }
    for(const side of sides) {
      const units=bundles.filter(b=>b.side===side),quota=quotas[side];
      let protectedWeight=0;
      for(const b of units.filter(b=>b.protected)
        .sort((a,b)=>a.priority-b.priority)){
        // Named commanders take priority over anonymous formations.
        if(protectedWeight+b.weight<=quota) {
          keep(b);protectedWeight+=b.weight;
        }
      }
      const candidates=units.filter(b=>!keptRoots.has(b.root));
      const buckets=new Map();
      for(const b of candidates) {
        if(!buckets.has(b.bucket))buckets.set(b.bucket,[]);
        buckets.get(b.bucket).push(b);
      }
      for(const list of buckets.values())list.sort((a,b)=>a.priority-b.priority);
      const names=[...buckets.keys()].sort((a,b)=>hash(a)-hash(b));
      const ordered=[];
      let pending=true;
      while(pending) {
        pending=false;
        for(const name of names) {
          const candidate=buckets.get(name).shift();
          if(candidate){ordered.push(candidate);pending=true;}
        }
      }
      // A transport and its cargo cannot be split without destroying deployment rules.
      // Subset sum selects the nearest possible quota, normally the exact half.
      const remaining=Math.max(0,quota-protectedWeight);
      const maxWeight=Math.max(0,...ordered.map(b=>b.weight));
      const limit=remaining+maxWeight;
      const reachable=Array(limit+1).fill(null);
      reachable[0]={bundle:null,previous:null};
      for(const b of ordered)
        for(let n=limit;n>=b.weight;n--)
          if(!reachable[n]&&reachable[n-b.weight])
            reachable[n]={bundle:b,previous:reachable[n-b.weight]};
      let best=0;
      for(let n=1;n<=limit;n++)
        if(reachable[n] && (Math.abs(n-remaining)<Math.abs(best-remaining) ||
          (Math.abs(n-remaining)===Math.abs(best-remaining)&&n<best)))best=n;
      for(let item=reachable[best];item?.bundle;item=item.previous)keep(item.bundle);
    }
    g.units=g.units.filter(u=>keptRoots.has(u));
    if(Array.isArray(g.scenario?.groups))
      g.scenario.groups=g.scenario.groups.map(gr=>({
        ...gr,units:(gr.units||[]).filter(id=>keptIds.has(id))
      })).filter(gr=>gr.units.length);
    if(g.startUnits)for(const side of Object.keys(g.startUnits))
      g.startUnits[side]=g.units.filter(u=>u.side===side).length;
    const retained=bundles.filter(b=>keptRoots.has(b.root))
      .reduce((sum,b)=>sum+b.weight,0);
    g.scenario.initialForceReduction={before:original,after:retained};
    return g.scenario.initialForceReduction;
  }
  root.KnightmareScenarioForces={reduce};
  if(typeof module!=='undefined'&&module.exports)module.exports={reduce};
})(typeof window!=='undefined'?window:globalThis);
