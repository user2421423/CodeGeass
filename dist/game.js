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
// Regional scenarios load after the menu is up; the menu then shows any saved scenario.
loadScenarios().then(() => {
  if (!modal.querySelector('[aria-label="Operation setup"]')) return;
  // Branch preview: open the redesigned scenario browser directly when requested.
  if (new URLSearchParams(window.location.search).get('scenarioPreview') === '1') scenarioDialog();
  else startMenu();
}, e => toast(e.message, true));
