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
  assert.match(read('ui/notifications.js'), /SFX\.play\('ui-turn'/);
  assert.match(read('ui/notifications.js'), /summaryCollapseTimeout/);
  assert.match(read('audio.js'), /'ui-strategic'\(t\)/);
});

function turnReportHarness(storage = new Map()) {
  const timers = new Map();
  let nextTimer = 1;
  const container = {
    hidden: true,
    details: null,
    querySelector(selector) { return selector === 'details' ? this.details : null; },
    set innerHTML(html) {
      this.html = html;
      const events = {};
      const summaryEvents = {};
      const summary = {
        addEventListener(event, fn) { summaryEvents[event] = fn; },
        fire(event) { summaryEvents[event]?.(); }
      };
      this.details = {
        open: html.startsWith('<details open>'),
        addEventListener(event, fn) { events[event] = fn; },
        querySelector(selector) { return selector === 'summary' ? summary : null; },
        fire(event) { events[event]?.(); },
        summary
      };
    }
  };
  const context = {
    console,
    game: { player: 'britannia', turn: 2 },
    E: { ensureWarReport: () => ({ turns: {} }) },
    count: String,
    $: id => id === 'turn-summary' ? container : null,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    setTimeout: (fn, delay) => {
      const id = nextTimer++;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: id => timers.delete(id)
  };
  vm.createContext(context);
  vm.runInContext(read('ui/notifications.js'), context);
  return {
    context, container, storage,
    fireCollapseTimeout() {
      const entry = [...timers.entries()].find(([, timer]) => timer.delay === 8000);
      assert.ok(entry, 'expanded report should schedule automatic minimization');
      timers.delete(entry[0]);
      entry[1].fn();
    }
  };
}

test('minimized Turn Report stays minimized on future turns and after refresh', () => {
  const h = turnReportHarness();
  h.context.showTurnSummary(1, { blocked: [] });
  assert.equal(h.container.details.open, true);

  h.container.details.summary.fire('click');
  h.container.details.open = false;
  h.container.details.fire('toggle');
  assert.equal(h.storage.get('knightmare-turn-summary-collapsed'), '1');

  h.context.showTurnSummary(2, { blocked: [] });
  assert.equal(h.container.details.open, false, 'next turn must not reopen a minimized report');
  assert.match(h.container.html, /TURN 2 REPORT/);

  const refreshed = turnReportHarness(h.storage);
  refreshed.context.showTurnSummary(3, { blocked: [] });
  assert.equal(refreshed.container.details.open, false, 'page refresh preserves collapsed preference');

  refreshed.container.details.summary.fire('click');
  refreshed.container.details.open = true;
  refreshed.container.details.fire('toggle');
  refreshed.context.showTurnSummary(4, { blocked: [] });
  assert.equal(refreshed.container.details.open, true, 'manual expansion re-enables expanded reports');
  assert.equal(h.storage.get('knightmare-turn-summary-collapsed'), '0');
});

test('automatic Turn Report minimization also remains minimized until expanded', () => {
  const h = turnReportHarness();
  h.context.showTurnSummary(1, { blocked: [] });
  h.fireCollapseTimeout();
  assert.equal(h.container.details.open, false);
  h.context.showTurnSummary(2, { blocked: [] });
  assert.equal(h.container.details.open, false);

  h.container.details.summary.fire('click');
  h.container.details.open = true;
  h.container.details.fire('toggle');
  assert.equal(h.storage.get('knightmare-turn-summary-collapsed'), '0');
});
