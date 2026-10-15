/* Mobile-only progressive disclosure of unit orders. Event delegation survives HUD redraws. */
(function () {
  document.addEventListener('click', function (event) {
    const toggle = event.target.closest('[data-action="mobile-unit-toggle"]');
    if (!toggle) return;
    const dock = toggle.closest('.selection-dock');
    if (!dock) return;
    event.preventDefault();
    event.stopPropagation();
    const expanded = dock.classList.toggle('mobile-unit-expanded');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Orders ▴' : 'Orders ▾';
  }, true);
})();
