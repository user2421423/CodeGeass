#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {differences,equivalent,approvedExact}=require('./check_sim_baseline.cjs');
const a='sim division-japan eu normal 11 2 aaaabbbb 11223344 cities={"britannia":17,"eu":10,"cf":17} errors=0';
const b='sim division-japan eu normal 11 2 ddddcccc 11223344 cities={"britannia":17,"eu":10,"cf":17} errors=0';
assert.equal(equivalent(a,b,'exact'),false);
assert.equal(equivalent(a,b,'observable'),true,'Intentional state-only change can be documented');
assert.equal(differences(a,b,'exact').length,1);
assert.equal(differences(a,b,'observable').length,0);
for(const changed of [
 b.replace('11223344','11223345'),
 b.replace('"cf":17','"cf":18'),
 b.replace('errors=0','errors=1'),
 b.replace('normal','hard'),
])assert.equal(differences(a,changed,'observable').length>0,true,
  'Observable comparison must fail changed outcomes/report/error/test identity');
const setupA='setup division-japan eu normal 12345678';
const setupB='setup division-japan eu normal 87654321';
assert.equal(differences(setupA,setupB,'observable').length,1,
  'Setup hash must remain strict');
const changedReport=b.replace('11223344','11223345');
const key=a.split(' ').slice(0,6).join(' ');
const allow={[key]:{expected:a,actual:changedReport,reason:'Audited known exact outcome'}};
assert.equal(approvedExact(key,a,changedReport,allow),true);
assert.equal(differences(a,changedReport,'observable',allow).length,0,
  'Exactly approved outcome can pass with documentation');
assert.equal(differences(a,changedReport.replace('errors=0','errors=1'),'observable',allow).length,1,
  'New errors are not permitted by narrow exception');
assert.equal(differences(a,changedReport.replace('"eu":10','"eu":11'),'observable',allow).length,1,
  'New city difference must fail even when one exact deviation is approved');
assert.equal(differences(a,changedReport,'observable',{}).length,1,
  'Deviation fails without an approved exact fingerprint pair');
console.log('Observable regression contract: PASS');
