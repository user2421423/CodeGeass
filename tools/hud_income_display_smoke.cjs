#!/usr/bin/env node
'use strict';
// Ensure the battle HUD visibly shows resource income under each balance.
// Run after: node tools/build_sources.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/hud/02-unit-selection.part.js','utf8');
const compiled=fs.readFileSync('dist/ui/hud.js','utf8');
const css=fs.readFileSync('dist/battlefield.css','utf8');
const begin=source.indexOf('function resource(');
const end=source.indexOf('// Costs render as resource tokens',begin);
assert.ok(begin>=0 && end>begin,'Find the resource component');
const fn=source.slice(begin,end);
assert.ok(compiled.includes(fn),'Built HUD matches its source section');
const resource=new Function('count','esc','ICONS',`${fn}\nreturn resource;`)(
  n=>Number(n).toLocaleString('en-US'),
  s=>String(s),
  {use:icon=>`<i data-icon="${icon}"></i>`},
);
for(const [icon,name] of [
  ['credits','Credits'],['industry','Industry'],['research','Research'],['sakuradite','Sakuradite']
]){
  const result=resource(icon,name,'description',1970,420);
  assert.match(result,/class="res-values"/,'Balance and rate stay together');
  assert.match(result,/>1,970<\/b>/,'Resource balance is visible');
  assert.match(result,/hud-income positive/,'Positive rate is visibly marked');
  assert.match(result,/\+420<small class="income-unit">\/turn<\/small>/,'Per-turn amount is visible');
  assert.match(result,/aria-label="[^"]*Per turn: \+420/,'Screen reader retains the income rate');
}
assert.match(resource('credits','Credits','description',250,-10),/hud-income negative/);
assert.match(resource('credits','Credits','description',250,-10),/−10<small class="income-unit">\/turn<\/small>/);
const token=resource('token','Tokens','HQ',200);
assert.doesNotMatch(token,/hud-income/,'Non-income resources should not show /turn');
assert.match(css,/\.hud-v2 \.resource \.hud-income\s*\{\s*display:\s*block/,'HUD makes income visible');
assert.doesNotMatch(css,/\.hud-v2 \.resource \.hud-income\s*\{\s*display:\s*none/,'No hidden income rule');
assert.match(css,/\.hud-v2 \.resource \.res-values\s*\{[^}]*flex-direction:\s*column/,'Income is beneath balance');
console.log('HUD balances and visible per-turn income: PASS');
