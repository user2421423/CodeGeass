#!/usr/bin/env node
'use strict';
// Regression: army groups have unlimited members; the number of groups is
// still capped. Run after building the engine bundles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../dist/engine.js');
require('../dist/engine/army-groups.js');

function gameWithUnits(count) {
  const g = E.createGame('britannia', 'normal', 'conquest', 20261018, 'world');
  g.units = [];
  const positions = g.tiles.filter(p => p.terrain === 'plains' &&
    !E.stationAt(g, p)).slice(0, count);
  assert.equal(positions.length, count, 'Enough free land for the test');
  const members = positions.map(p => E.newUnit(g, 'sutherland', g.player, p.c, p.r));
  assert.equal(g.units.length, count);
  return {g, members};
}

// A player can add arbitrarily many units, move them between groups, and
// remove them without affecting other members.
const {g, members} = gameWithUnits(90);
const first = E.createArmyGroup(g);
assert.equal(first.ok, true);
for (const u of members) {
  const result = E.addArmyGroupUnit(g, first.group.id, u.id);
  assert.equal(result.ok, true, result.reason || 'Assignment must succeed');
}
assert.equal(first.group.units.length, 90, '90 units fit into one group');
assert.equal(E.addArmyGroupUnit(g, first.group.id, members[0].id).ok, false,
  'Duplicate membership is still rejected');
const second = E.createArmyGroup(g);
assert.equal(second.ok, true);
assert.equal(E.addArmyGroupUnit(g, second.group.id, members[0].id).ok, true,
  'Moving a member from an oversized group succeeds');
assert.equal(first.group.units.length, 89);
assert.equal(second.group.units.length, 1);
assert.equal(E.removeArmyGroupUnit(g, first.group.id, members[1].id).ok, true);
assert.equal(first.group.units.length, 88);
E.armyGroupPrune(g);
assert.equal(first.group.units.length, 88, 'Prune retains all surviving members');

// Empty groups retire automatically on removal, reassignment and casualties.
const removed = E.createArmyGroup(g, members[89].id);
assert.equal(removed.ok, true);
const removal = E.removeArmyGroupUnit(g, removed.group.id, members[89].id);
assert.equal(removal.ok, true);
assert.equal(removal.disbanded, true);
assert.equal(E.armyGroup(g, removed.group.id), undefined);
const transferred = E.createArmyGroup(g, members[88].id);
assert.equal(transferred.ok, true);
assert.equal(E.addArmyGroupUnit(g, second.group.id, members[88].id).ok, true);
assert.equal(E.armyGroup(g, transferred.group.id), undefined);
const fallen = E.createArmyGroup(g, members[87].id);
assert.equal(fallen.ok, true);
members[87].hp = 0;
E.armyGroupPrune(g);
assert.equal(E.armyGroup(g, fallen.group.id), undefined);

// Scenario auto-organization should still assign every unit when just one
// group slot remains, rather than stopping at the old 24-unit cap.
const {g: scenario, members: reinforcements} = gameWithUnits(85);
scenario.mode = 'scenario';
scenario.scenario = {groups: []};
for (let i = 0; i < 39; i++)
  assert.equal(E.createArmyGroup(scenario, reinforcements[i].id).ok, true);
const organized = E.organizeScenarioArmies(scenario);
assert.equal(organized.ok, true);
assert.equal(organized.created, 1);
assert.equal(organized.assigned, reinforcements.length - 39);
assert.equal(organized.remaining, 0);
assert.equal(E.armyGroups(scenario).length, 40);
assert.equal(E.armyGroups(scenario).at(-1).units.length, 46);
assert.equal(E.createArmyGroup(scenario).ok, false,
  'Existing number-of-groups limit remains intact');

// The three UI paths must not silently reintroduce a 24-member cutoff.
const ui = fs.readFileSync('dist/ui/army-groups.js', 'utf8');
assert.doesNotMatch(ui, /\$\{live\.length\}\/24 units/);
assert.match(ui, /chosen\.slice\(1\)/, 'Multi-selection creation adds all selected units');
assert.doesNotMatch(ui, /gr\.units\.length\s*>=\s*24/);
assert.doesNotMatch(ui, /live\.slice\(0,5\)/, 'Group overview hides member-type previews');
// An army has one order dropdown on the overview and detail screens.
assert.match(ui, /data-army-order=/, 'Army group order dropdown is available');
assert.match(ui, /armyGroupOrderSelect\(v, 'overview'\)/, 'Overview uses the order dropdown');
assert.match(ui, /armyGroupOrderSelect\(gr, 'detail'\)/, 'Details use the same dropdown');
assert.match(ui, /data-army-disband=/, 'Each group can be deleted');
assert.doesNotMatch(ui, /data-army-stance=/, 'Old separate stance buttons are removed');
assert.doesNotMatch(ui, /data-army-conquer=/, 'Old capture toggle button is removed');
assert.doesNotMatch(ui, /\$\{strategicOverlayControls\(\)\}/, 'Off / All Army Groups buttons are hidden');
const input = fs.readFileSync('dist/ui/input.js', 'utf8');
assert.match(input, /e\.target\.dataset\.armyOrder/, 'Dropdown change events are handled');
assert.match(input, /E\.setArmyGroupConquest\(game, id, true\)/, 'Capture order is enabled by dropdown');
assert.match(input, /window\.confirm/, 'Deleting a group requires confirmation');

// Render dropdown HTML independently: the currently active order must be selected.
const selectorSource = ui.slice(ui.indexOf('function armyGroupOrderSelect'),
  ui.indexOf('function activeArmyGroup'));
const renderSelector = new Function('E', 'esc', 'interactive', 'armyGroupLabel',
  selectorSource + '\nreturn armyGroupOrderSelect;')(
  E, value => value, () => true, gr => gr.name || 'Army group');
for (const [stance, label] of Object.entries(E.ARMY_GROUP_STANCES)) {
  const html = renderSelector({ id: 12, stance }, 'overview');
  assert.ok(html.includes(`<option value="${stance}" selected>${label}</option>`),
    `${label} is preselected`);
}
const conquest = renderSelector({ id: 12, stance: 'assault', autoConquer: true }, 'detail');
assert.ok(conquest.includes('<option value="conquer" selected>Capture Remaining Cities</option>'),
  'Capture Remaining Cities is preselected when active');
assert.ok(conquest.includes('data-army-order="12:detail"'), 'Details route order changes correctly');
console.log('Unlimited army-group membership, auto-disband and order dropdown UI: PASS');
