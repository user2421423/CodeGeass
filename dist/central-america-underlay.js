/* Central American Offensive — scenario-local geographic underlay.
 * Load after ui/geography.js, before ui/renderer.js. Does not modify shared
 * renderers or any other campaign and keeps the 184x168 gameplay grid separate
 * from the GSHHG coast geometry displayed under the hexes. */
(function(root){
  'use strict';
  if(typeof GEOGRAPHY==='undefined'||!GEOGRAPHY.shapes?.land)
    throw Error('Central America geography requires ui/geography.js first');
  const atlas=GEOGRAPHY,originalPaint=atlas.paint;
  const WORLD_ROWS=76,LAT_TOP=74,LAT_SPAN=128;
  const worldX=lon=>(lon+180)*SQ*R/2+R-SQ*R/2;
  const worldY=lat=>R+(LAT_TOP-lat)*1.5*R*(WORLD_ROWS-1)/LAT_SPAN;
  const bounds={west:-94.4,east:-81.4,north:18.7,south:7.45};
  const leftX=worldX(bounds.west),rightX=worldX(bounds.east),
    topY=worldY(bounds.north),bottomY=worldY(bounds.south);
  const geometry=atlas.shapes.land.filter(s=>
    s.bounds[0]<=rightX&&s.bounds[2]>=leftX&&
    s.bounds[1]<=bottomY&&s.bounds[3]>=topY);
  if(!geometry.length)throw Error('Missing GSHHG polygons for Central America');
  const usePaths=typeof Path2D!=='undefined'&&
    typeof Path2D.prototype.addPath==='function';
  const combined=usePaths?new Path2D():null;
  if(combined)for(const g of geometry){
    if(g.path)combined.addPath(g.path);
    else for(const p of [g.points]){
      if(p.length<3)continue;
      combined.moveTo(p[0][0],p[0][1]);
      for(let i=1;i<p.length;i++)combined.lineTo(p[i][0],p[i][1]);
      combined.closePath();
    }
  }
  function landPath(ctx){
    if(combined)return combined;
    ctx.beginPath();
    for(const s of geometry){
      const pts=s.points;
      if(pts.length<3)continue;
      ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.closePath();
    }
    return null;
  }
  function tileHex(ctx,t,radius=R+.8){
    const x=SQ*R*(t.c+.5*(t.r&1))+R,y=1.5*R*t.r+R;
    for(let i=0;i<6;i++){
      const angle=(60*i-30)*Math.PI/180;
      const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
      if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    }
    ctx.closePath();
  }
  let ownerCache={tiles:null,revision:-1,bySide:null};
  function politicalTiles(g){
    const version=g.mapRevision||0;
    if(ownerCache.tiles===g.tiles&&ownerCache.revision===version)return ownerCache.bySide;
    const bySide=new Map();
    for(const t of g.tiles)if(t.terrain!=='sea'&&t.owner){
      if(!bySide.has(t.owner))bySide.set(t.owner,[]);
      bySide.get(t.owner).push(t);
    }
    ownerCache={tiles:g.tiles,revision:version,bySide};
    return bySide;
  }
  function paint(ctx,g,left,right,top,bottom,scale){
    const b=g.scenario.bounds;
    const spanLon=b.east-b.west,spanLat=b.north-b.south;
    const sx=SQ*R*g.cols/spanLon,sy=1.5*R*g.rows/spanLat;
    const mapX=lon=>R-SQ*R/2+(lon-b.west)*sx;
    const mapY=lat=>R-.75*R+(b.north-lat)*sy;
    const A=2*g.cols/spanLon;
    const D=g.rows*LAT_SPAN/(spanLat*(WORLD_ROWS-1));
    const tx=mapX(b.west)-A*worldX(b.west);
    const ty=mapY(b.north)-D*worldY(b.north);
    ctx.save();
    ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
    const ocean=ctx.createLinearGradient(0,top,0,bottom);
    ocean.addColorStop(0,'#1e506d');
    ocean.addColorStop(1,'#103b58');
    ctx.fillStyle=ocean;ctx.fillRect(left,top,right-left,bottom-top);
    // World coastline polygons form an actual geographic underlay, *not*
    // a silhouette made out of the tactical hexes.
    ctx.save();ctx.transform(A,0,0,D,tx,ty);
    const outline=landPath(ctx);
    ctx.fillStyle='#7e9f81';
    if(outline)ctx.fill(outline);else ctx.fill();
    ctx.save();
    if(outline)ctx.clip(outline);else ctx.clip();
    // Undo the atlas transform while keeping the real geographic coastline
    // as a clip so province colours cannot flood from one shore to the other.
    ctx.transform(1/A,0,0,1/D,-tx/A,-ty/D);
    for(const [side,tiles] of politicalTiles(g)){
      const owner=g.factions?.[side]||E.FACTIONS[side];
      if(!owner?.color)continue;
      ctx.fillStyle=owner.color;ctx.globalAlpha=.81;
      ctx.beginPath();
      for(const t of tiles){
        const x=SQ*R*(t.c+.5*(t.r&1))+R,y=1.5*R*t.r+R;
        if(x<left-2*R||x>right+2*R||y<top-2*R||y>bottom+2*R)continue;
        tileHex(ctx,t);
      }
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle='rgba(219,236,218,.65)';
    ctx.lineWidth=Math.max(0.7,1.3/Math.max(scale,.5));
    if(outline)ctx.stroke(outline);else {landPath(ctx);ctx.stroke();}
    ctx.restore();
    // Lake Nicaragua and Lake Managua are real freshwater basins. Their
    // water hexes come from the sampled shoreline mask; the following
    // geographic polygons prevent the continental atlas from hiding them.
    for(const points of Object.values(g.scenario.lakes||{})){
      if(!points?.length)continue;
      ctx.beginPath();
      points.forEach(([lon,lat],i)=>{
        const x=mapX(lon),y=mapY(lat);
        if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      });
      ctx.closePath();
      ctx.fillStyle='#235b78';ctx.fill();
      ctx.lineWidth=Math.max(1,Math.min(2.5,scale));
      ctx.strokeStyle='#78b8c2';ctx.stroke();
    }
    // Rivers are natural-scale geographic lines; they do not create
    // artificial ship passages or sever land movement connections.
    ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=.82;
    ctx.strokeStyle='#63c6df';ctx.lineWidth=Math.max(1.1,Math.min(3,1.5*scale));
    for(const points of Object.values(g.scenario.rivers||{})){
      if(!points?.length)continue;
      ctx.beginPath();points.forEach(([lon,lat],i)=>{
        if(i)ctx.lineTo(mapX(lon),mapY(lat));
        else ctx.moveTo(mapX(lon),mapY(lat));
      });ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Volcanic peaks are plotted on their real locations. Only their
    // terrain classification affects gameplay; these markers are visual.
    if(scale>=.6)for(const [name,lon,lat] of g.scenario.volcanoes||[]){
      const x=mapX(lon),y=mapY(lat);
      if(x<left-2*R||x>right+2*R||y<top-2*R||y>bottom+2*R)continue;
      const s=R*.20;
      ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s*.83,y+s*.65);
      ctx.lineTo(x-s*.83,y+s*.65);ctx.closePath();
      ctx.fillStyle='rgba(78,57,58,.86)';ctx.fill();
      ctx.lineWidth=1.2;ctx.strokeStyle='#e0aa85';ctx.stroke();
    }
    ctx.restore();
    return true;
  }
  atlas.paint=function(ctx,g,left,right,top,bottom,scale){
    if(g?.mode==='scenario'&&g.scenario?.id==='cf-central-america')
      return paint(ctx,g,left,right,top,bottom,scale);
    return originalPaint.call(this,ctx,g,left,right,top,bottom,scale);
  };
})(typeof window!=='undefined'?window:globalThis);
