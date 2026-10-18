'use strict';
// Read-only fronts reconstructed from the AI's persisted assignment records.
// A quiet front is one whose living members have not attacked/captured/lost a
// formation for N turns. Traveling or holding orders can legitimately be quiet.
function frontsObserver(stallTurns) {
  const tracked=new Map(), unitFront=new Map(), intervals=[], timeline=[];
  const identity=(g,u)=>{
    const state=g.ai?.[u.side], assignment=state?.assignments?.[u.id];
    const id=assignment?.front ?? state?.operations?.[u.id];
    return id == null ? null : {side:u.side,id:String(id)};
  };
  const get=(side,id,turn)=>{
    const key=side+'/'+id;
    if(!tracked.has(key))tracked.set(key,{side,id,lastActivity:turn-1,seen:turn,attacks:0,active:null});
    return tracked.get(key);
  };
  return {
    intervals,timeline,
    remember(g,live) { for(const u of live){const f=identity(g,u);if(f)unitFront.set(u.id,f);else unitFront.delete(u.id);} },
    activity(g,u,kind) {
      const front=identity(g,u)||unitFront.get(u.id);if(!front)return;
      const f=get(front.side,front.id,g.turn);f.lastActivity=g.turn;
      if(kind==='attack')f.attacks++;
      f.active=null;
    },
    turn(g,live) {
      const groups=new Map();
      for(const u of live) {
        const front=identity(g,u);if(!front)continue;
        const key=front.side+'/'+front.id;
        if(!groups.has(key))groups.set(key,{...front,members:[]});
        groups.get(key).members.push(u.id);
      }
      const rows=[];
      for(const group of groups.values()) {
        const f=get(group.side,group.id,g.turn);
        // A front which vanished and reappeared starts a new observation window.
        if(f.seen<g.turn-1){f.lastActivity=g.turn-1;f.active=null;}
        f.seen=g.turn;
        const quiet=g.turn-f.lastActivity;
        if(quiet>=stallTurns) {
          if(!f.active){f.active={side:f.side,front:f.id,fromTurn:f.lastActivity+1,throughTurn:g.turn};intervals.push(f.active);}
          else f.active.throughTurn=g.turn;
        }
        rows.push({...group,attacks:f.attacks,quietTurns:quiet,
          state:g.ai?.[group.side]?.fronts?.[group.id]?.state||null});
      }
      timeline.push({turn:g.turn,fronts:rows});
    }
  };
}
module.exports={frontsObserver};
