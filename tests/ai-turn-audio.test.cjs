const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('AI turns silence existing audio and block new effects without changing user sound preference', () => {
  let oscillators = 0;
  const gains = [];
  const param = () => ({value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}});
  class AudioContextStub {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 4000; this.destination = {}; }
    createGain() { const gain = {gain: param(), connect() {}}; gains.push(gain); return gain; }
    createDynamicsCompressor() { return {connect() {}}; }
    createOscillator() { oscillators++; return {frequency: param(), connect() {}, start() {}, stop() {}}; }
    createBiquadFilter() { return {Q: param(), frequency: param(), connect() {}}; }
    createBuffer() { return {getChannelData: () => new Float32Array(6000)}; }
    createBufferSource() { return {connect() {}, start() {}, stop() {}}; }
  }
  const ctx = vm.createContext({
    localStorage: {getItem: () => null, setItem() {}},
    window: {AudioContext: AudioContextStub, addEventListener() {}},
    Math,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/audio.js'), 'utf8'), ctx);
  const run = src => vm.runInContext(src, ctx);
  run("SFX.play('move')");
  assert(oscillators > 0, 'normal player movement makes sounds');
  assert.equal(gains[0].gain.value, 0.5, 'master starts at the normal volume');
  const before = oscillators;
  run('SFX.setAiTurn(true)');
  assert.equal(gains[0].gain.value, 0, 'already scheduled player sounds are muted immediately');
  run("SFX.play('move'); SFX.play('fleija'); SFX.play('thor');");
  assert.equal(oscillators, before, 'AI movement and strategic weapon sounds are not scheduled');
  assert.equal(run('SFX.enabled'), true, 'the player sound preference stays on');
  run('SFX.setAiTurn(false)');
  assert.equal(gains[0].gain.value, 0.5, 'normal volume resumes on the player turn');
  run("SFX.play('move')");
  assert(oscillators > before, 'player sounds resume');
  run('SFX.toggle(); SFX.setAiTurn(true); SFX.setAiTurn(false)');
  assert.equal(gains[0].gain.value, 0, 'the user mute setting stays respected after AI playback');
  assert.equal(run('SFX.enabled'), false);
});
