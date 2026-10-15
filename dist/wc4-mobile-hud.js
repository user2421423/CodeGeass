(function(){
 const media=matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)');
 function setup(){
   document.querySelectorAll('button').forEach(b=>{const label=b.textContent.trim().replace(/^[↶↩⟲\\s]+/,'').trim(); if(/undo move/i.test(label))b.textContent='Undo'; else if(/do all orders now/i.test(label))b.textContent='Orders';});
   const hud=document.querySelector('.topbar.hud-v2'), nav=hud?.querySelector('.hud-nav'), footer=document.querySelector('.footer');
   if(!media.matches||!hud||!nav||!footer)return;
   if(!nav.querySelector('.wc4-nav-toggle')){
     const b=document.createElement('button');b.className='wc4-nav-toggle';b.type='button';b.textContent='☰';b.setAttribute('aria-label','Open game menus');
     b.style.cssText='position:absolute;inset:0;width:33px;height:32px;opacity:0;cursor:pointer;z-index:2';
     b.onclick=e=>{e.stopPropagation();hud.classList.toggle('wc4-menu-open');b.setAttribute('aria-expanded',String(hud.classList.contains('wc4-menu-open')))};
     nav.appendChild(b);
   }
 }
 new MutationObserver(setup).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
 // On touchscreens, give destination-picking an explicit cancellation control.
 function destinationCancel(){
   let button=document.querySelector('.wc4-destination-cancel');
   const active=media.matches && !!document.querySelector('.unit-dock-actions [data-action="goto"]') &&
     Array.from(document.querySelectorAll('.unit-dock-actions [data-action="goto"]')).some(b=>/Choose a hex/i.test(b.textContent));
   if(!active){button?.remove();return;}
   if(!button){
     button=document.createElement('button');
     button.type='button';button.className='wc4-destination-cancel';
     button.textContent='Cancel destination';
     button.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right));top:54px;z-index:110;background:#23343c;color:white;border:1px solid #aab5b2;border-radius:7px;padding:9px 12px;font:12px Arial,sans-serif';
     button.addEventListener('click',e=>{
       e.preventDefault();e.stopPropagation();
       // Use the existing Escape handler, preserving the game's own cancellation semantics.
       document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
       window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
       button.remove();
     });
     document.body.appendChild(button);
   }
 }
 new MutationObserver(destinationCancel).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
 destinationCancel();
 document.addEventListener('click',e=>{if(!e.target.closest('.hud-nav'))document.querySelector('.topbar.hud-v2')?.classList.remove('wc4-menu-open')});
 setup();
})();