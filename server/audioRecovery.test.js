import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioRecovery } from '../src/audioRecovery.js';
import { createFlakSound } from '../src/flakSound.js';
import { createCannonSound } from '../src/cannonSound.js';

test('recovery waits for the first gesture and leaves hidden tabs alone', () => {
  let context = null, hidden = false, calls = 0, time = 0;
  const recovery = createAudioRecovery({ getContext: () => context, hidden: () => hidden,
    now: () => time, recover: () => calls++ });
  recovery.check(true);
  assert.equal(calls, 0);
  context = { state: 'suspended' }; hidden = true; time = 1000;
  recovery.check(true);
  assert.equal(calls, 0);
  hidden = false; recovery.check(true);
  assert.equal(calls, 1);
});

test('interrupted audio retries at most once a second and stops retrying once running', () => {
  const context = { state: 'interrupted' };
  let time = 0, calls = 0;
  const recovery = createAudioRecovery({ getContext: () => context, hidden: () => false,
    now: () => time, recover: () => calls++ });
  for (time = 0; time < 3000; time++) recovery.check();
  assert.equal(calls, 3);
  context.state = 'running'; time = 3000; recovery.check();
  assert.equal(calls, 3);
  recovery.check(true); // Return from another tab/page, even if the context reports running.
  assert.equal(calls, 4);
  recovery.check(true);
  assert.equal(calls, 4);
});

test('closed contexts and disposed output or failed engine loading can recover without a new gesture', () => {
  let context = { state: 'closed' }, rebuild = true, calls = 0, time = 0;
  const recovery = createAudioRecovery({ getContext: () => context, needsRebuild: () => rebuild,
    hidden: () => false, now: () => time, recover: () => { calls++; context = { state: 'running' }; rebuild = false; } });
  recovery.check();
  assert.equal(calls, 1);
  rebuild = true; time = 1000; recovery.check();
  assert.equal(calls, 2);
  time = 2000; recovery.check();
  assert.equal(calls, 2);
});

for (const [name, factory] of [['flak/loops', createFlakSound], ['cannon/explosions', createCannonSound]]) {
  test(`${name}: transient download failure retries after backoff, without redownloading a successful sample`, async () => {
    const oldFetch = globalThis.fetch, oldNow = Date.now;
    let time = 10000, loads = 0, errors = 0, decodes = 0;
    try {
      Date.now = () => time;
      globalThis.fetch = async () => { loads++; return { ok: loads > 1, status: 503, arrayBuffer: async () => new ArrayBuffer(1) }; };
      const sound = factory({ context: { currentTime: 0, state: 'running', destination: {},
        decodeAudioData: async () => { decodes++; return { duration: 1 }; } }, url: '/sample.wav', report: () => errors++ });
      await sound.unlock();
      assert.equal(errors, 1);
      await sound.unlock();
      assert.equal(loads, 1);
      time += 5000;
      await Promise.all([sound.unlock(), sound.unlock()]);
      assert.equal(loads, 2);
      assert.equal(decodes, 1);
      await sound.unlock();
      assert.equal(loads, 2);
      sound.dispose();
    } finally { globalThis.fetch = oldFetch; Date.now = oldNow; }
  });
}
