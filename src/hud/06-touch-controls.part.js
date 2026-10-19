
/* Touch-landscape HUD controls. The top bar folds its command menus behind ☰ and the
   selection dock collapses its orders; both states survive render() and updateSelection().
   Layout lives in hud-mobile.css; on desktop these controls are hidden. */
let hudMenuOpen = false,
  dockExpanded = false;
// Footer buttons carry both labels; the stylesheet shows the short one on compact screens.
function hudLabel(long, short) {
  return `<span class="hud-label-long">${long}</span><span class="hud-label-short">${short}</span>`;
}
function setHudMenuOpen(open) {
  hudMenuOpen = open;
  document.querySelector('.topbar.hud-v2')?.classList.toggle('hud-menu-open', open);
  document.querySelector('.hud-menu-toggle')?.setAttribute('aria-expanded', String(open));
}
function cancelRouting() {
  if (!routing) return;
  routing = null;
  updateSelection();
  toast('Destination unchanged.');
}
// Capture phase: these are view toggles, so the game's own click handler never sees them.
document.addEventListener('click', e => {
  const b = e.target.closest?.('button');
  const action = b?.dataset.action;
  if (action === 'hud-menu-toggle' || action === 'mobile-unit-toggle' || action === 'route-cancel') {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'hud-menu-toggle') setHudMenuOpen(!hudMenuOpen);
    else if (action === 'route-cancel') cancelRouting();
    else {
      dockExpanded = !dockExpanded;
      b.closest('.selection-dock')?.classList.toggle('mobile-unit-expanded', dockExpanded);
      b.setAttribute('aria-expanded', String(dockExpanded));
    }
    return;
  }
  // Choosing a command, or tapping anywhere outside the menus, folds them away.
  if (hudMenuOpen && (!e.target.closest?.('.hud-nav') || b?.classList.contains('hud-menu-action'))) setHudMenuOpen(false);
}, true);
