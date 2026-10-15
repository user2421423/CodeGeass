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
 document.addEventListener('click',e=>{if(!e.target.closest('.hud-nav'))document.querySelector('.topbar.hud-v2')?.classList.remove('wc4-menu-open')});
 setup();
})();