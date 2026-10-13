'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CLASSES, CLASS_ORDER, KNIGHTMARES, LINEUPS } = require('../dist/engine/frames.js');

const GAMEPLAY_KEYS = [
  'hp', 'attack', 'armor', 'move', 'min', 'max',
  'cost', 'industry', 'sakuradite', 'tier',
  'crit', 'critMult', 'pen', 'splash', 'siege',
  'noCounter', 'breakthrough', 'relentless', 'boarding',
  'float', 'naval', 'aquatic', 'seaMove', 'port', 'capacity',
];

function standardRoster(side) {
  return Object.fromEntries(
    Object.entries(KNIGHTMARES)
      .filter(([, unit]) => unit.side === side && !unit.elite &&
        !unit.campaign && !unit.naval && !unit.worldOnly)
      .map(([id, unit]) => [unit.cls, id]),
  );
}

const ROSTERS = {
  britannia: standardRoster('britannia'),
  europia: standardRoster('eu'),
  chineseFederation: standardRoster('cf'),
  chineseFederation2017: LINEUPS.cf2017,
  ufn2018: LINEUPS.bk,
  euroBritannia: LINEUPS.eb,
};

for (const [faction, roster] of Object.entries(ROSTERS)) {
  test(`${faction} regular roster has 10 matching classes with identical gameplay stats`, () => {
    assert.deepEqual(Object.keys(roster).sort(), [...CLASS_ORDER].sort(),
      `${faction}: missing or unexpected regular classes`);
    for (const cls of CLASS_ORDER) {
      const id = roster[cls];
      const unit = KNIGHTMARES[id];
      assert.ok(unit, `${faction}: ${cls} references unknown unit ${id}`);
      assert.equal(unit.cls, cls, `${faction}: ${id} is not ${cls} class`);
      assert.ok(!unit.elite && !unit.naval, `${faction}: ${id} must be a regular land unit`);
      const effective = { ...CLASSES[cls], ...unit };
      for (const key of GAMEPLAY_KEYS) {
        assert.equal(effective[key], CLASSES[cls][key],
          `${faction}: ${id} overrides ${cls}.${key}`);
      }
    }
  });
}

test('Euro Britannia deploys the correct medium, heavy, super and siege frames', () => {
  assert.equal(LINEUPS.eb.medium, 'vincent_ward');
  assert.equal(LINEUPS.eb.heavy, 'vincent_commander');
  assert.equal(LINEUPS.eb.super, 'brighton');
  assert.equal(LINEUPS.eb.siege, 'canterbury');
});
