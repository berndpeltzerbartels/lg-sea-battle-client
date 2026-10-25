import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSnapshotWithDeadline } from '../src/snapshotRequest.js';

test('a browser ignoring abort cannot stall the next position confirmation', async () => {
  const original = globalThis.fetch;
  let release;
  const controller = new AbortController();
  try {
    globalThis.fetch = () => new Promise(resolve => { release = resolve; });
    await assert.rejects(fetchSnapshotWithDeadline('/state', {}, 10, controller), /Zeitlimit/);
    assert.equal(controller.signal.aborted, true);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ships: [] }) });
    const result = await fetchSnapshotWithDeadline('/state', {}, 100);
    assert.deepEqual(result.snapshot, { ships: [] });
    release({ ok: true, json: async () => ({ ships: ['stale'] }) });
    assert.deepEqual(result.snapshot, { ships: [] });
  } finally { globalThis.fetch = original; }
});

test('the deadline also covers a stalled response body', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
    await assert.rejects(fetchSnapshotWithDeadline('/state', {}, 10), /Zeitlimit/);
  } finally { globalThis.fetch = original; }
});
