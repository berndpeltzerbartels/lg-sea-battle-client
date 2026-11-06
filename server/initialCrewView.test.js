import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('async function loadInitialCrewView(playerId) {');
const end = source.indexOf('\n}\n', start) + 2;
function load(response) {
  const fn = runInNewContext(source.slice(start, end) + '\nloadInitialCrewView', {
    gameEndpoint: path => path,
    fetch: async path => {
      assert.equal(path, '/game/crew/player-SUB-test');
      return response;
    }
  });
  return fn('player-SUB-test');
}
test('missing crew accepts empty successful responses as well as JSON null', async () => {
  for (const body of ['', ' \n ', 'null']) assert.equal(await load({ ok: true, status: 200, text: async () => body }), null);
  assert.equal(await load({ ok: true, status: 204 }), null);
  assert.equal(await load({ ok: false, status: 404 }), null);
});
test('real crew data remains intact and invalid nonempty JSON is reported', async () => {
  const crew = { shipId: 'boat', controller: 'player-SUB-test', station: 'bridge' };
  const result = await load({ ok: true, status: 200, text: async () => JSON.stringify(crew) });
  assert.equal(JSON.stringify(result), JSON.stringify(crew));
  await assert.rejects(load({ ok: true, status: 200, text: async () => '{broken' }));
});
