'use strict';
// Source sections are concatenated in lexical order into classic-script browser entrypoints.
// Preserve their original shared closure, globals, and load order for save/behavior compatibility.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BUNDLES = {
  "dist/engine.js": [
    "src/engine/00-bootstrap.part.js",
    "src/engine/01-elite-forces.part.js",
    "src/engine/02-commander-rules.part.js",
    "src/engine/03-commander-development.part.js",
    "src/engine/04-action-validation.part.js",
    "src/engine/05-hex-geometry.part.js",
    "src/engine/06-terrain.part.js",
    "src/engine/07-save-compatibility.part.js",
    "src/engine/08-movement-and-deployment.part.js",
    "src/engine/09-combat.part.js",
    "src/engine/10-economy.part.js",
    "src/engine/11-city-automation.part.js",
    "src/engine/12-allegiances.part.js",
    "src/engine/13-sakuradite.part.js",
    "src/engine/14-fleija.part.js",
    "src/engine/15-turns-and-fortresses.part.js",
    "src/engine/16-world-setup.part.js",
    "src/engine/17-pathfinding.part.js",
    "src/engine/18-standing-orders-and-api.part.js"
  ],
  "dist/engine/ai.js": [
    "src/ai/00-dependencies.part.js",
    "src/ai/01-strategic-planning.part.js",
    "src/ai/02-fronts.part.js",
    "src/ai/03-guard-assignment.part.js",
    "src/ai/04-recovery.part.js",
    "src/ai/05-naval.part.js",
    "src/ai/06-production.part.js",
    "src/ai/07-tactical-orders.part.js"
  ],
  "dist/missions.js": [
    "src/missions/00-shared-maps.part.js",
    "src/missions/01-black-knights.part.js",
    "src/missions/02-britannia.part.js",
    "src/missions/03-season-one-additions.part.js",
    "src/missions/04-season-two-maps.part.js",
    "src/missions/05-season-two-missions.part.js",
    "src/missions/06-akito-battlefields.part.js",
    "src/missions/07-europe-missions.part.js",
    "src/missions/08-campaign-registry.part.js"
  ],
  "dist/ui/renderer.js": [
    "src/renderer/00-minimap.part.js",
    "src/renderer/01-map-primitives.part.js",
    "src/renderer/02-structures-and-units.part.js",
    "src/renderer/03-combat-vfx.part.js",
    "src/renderer/04-map-caching.part.js",
    "src/renderer/05-frame-painting.part.js"
  ],
  "dist/ui/hud.js": [
    "src/hud/00-start-menu.part.js",
    "src/hud/01-superweapons.part.js",
    "src/hud/02-unit-selection.part.js",
    "src/hud/03-city-panels.part.js",
    "src/hud/04-orders-and-actions.part.js",
    "src/hud/05-command-dock.part.js"
  ]
};
function assemble(parts) {
  return parts.map(part => fs.readFileSync(path.join(ROOT, part), 'utf8')).join('');
}
function run(check = false) {
  let failed = false;
  for (const [target, parts] of Object.entries(BUNDLES)) {
    const result = assemble(parts);
    const filename = path.join(ROOT, target);
    if (check) {
      if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== result) {
        console.error('Outdated generated script: ' + target + ' (run node tools/build_sources.cjs)');
        failed = true;
      } else {
        console.log('Verified ' + target);
      }
    } else {
      fs.writeFileSync(filename, result);
      console.log('Built ' + target);
    }
  }
  return !failed;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(a => a !== '--check')) {
    console.error('Usage: node tools/build_sources.cjs [--check]');
    process.exitCode = 2;
  } else if (!run(args.includes('--check'))) {
    process.exitCode = 1;
  }
}
module.exports = { BUNDLES, assemble, run };
