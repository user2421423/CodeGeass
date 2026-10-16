/* Knightmare Conquest UI: starts the game once every ui/*.js file has loaded (see ui/core.js). */
'use strict';
ART.onLocal = () => {
  render();
  if (modal.querySelector('[aria-label="Operation setup"]')) startMenu();
};
render();
startMenu();
registerTools();
requestMapFrame();
// Menus use metadata and static previews; battle modules stay on demand.
if (new URLSearchParams(window.location.search).get('scenarioPreview') === '1') scenarioDialog();
