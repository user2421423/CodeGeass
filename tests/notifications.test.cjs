'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..', 'dist');
const read = name => fs.readFileSync(path.join(base, name), 'utf8');

test('Section 10 script order and notification categories', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('ui/core.js') < html.indexOf('ui/notifications.js'));
  assert.ok(html.indexOf('ui/notifications.js') < html.indexOf('ui/hud.js'));
  const context = { console };
  vm.createContext(context);
  vm.runInContext(read('ui/notifications.js'), context);
  assert.equal(context.noticeKind('Unit deployed'), 'success');
  assert.equal(context.noticeKind('Movement blocked'), 'warning');
  assert.equal(context.noticeKind('The alliance has collapsed'), 'strategic');
  assert.equal(context.noticeKind('Income collected'), 'info');
});
test('War Report notification history and event wiring', () => {
  const report = read('ui/war-report.js');
  const input = read('ui/input.js');
  const turns = read('ui/turns.js');
  assert.match(report, /\['notifications','Notifications'\]/);
  assert.match(input, /case 'war-report-notifications'/);
  assert.match(turns, /showTurnSummary\(completedTurn, orders\)/);
  assert.match(turns, /showPoliticalReport\('THE ALLIANCE HAS COLLAPSED'/);
  assert.match(turns, /setAiPhase\(side\)/);
});
