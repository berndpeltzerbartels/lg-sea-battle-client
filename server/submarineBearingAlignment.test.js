import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function updateSubmarineBearingAlignment(');
const fn = source.slice(start, source.indexOf('\nfunction ', start + 1));
const constants = ['submarineBearingAlignTolerance', 'submarineBearingAlignRudderGain',
  'submarineBearingAlignMinRudder', 'submarineBearingAlignStopSpeed', 'torpedoBoatMaxRudderDegrees',
  'torpedoBoatForwardTurnStrength', 'torpedoBoatReverseTurnStrength'].map(name =>
  source.match(new RegExp(`const ${name} = [^;]+;`))[0]).join('\n');

const simulate = new Function('initialHeading', 'target', 'speed', 'dt', `
  ${constants}
  ${fn}
  const submarineMode = true;
  const submarinePeriscopeModes = { alignToBearing: 'align', forwardScope: 'forward' };
  let submarinePeriscopeMode = 'align', submarineBearingAlignPendingAscent = false;
  let submarineBearingAlignReturnToStop = false, submarineBearingAlignTarget = target;
  let heading = initialHeading, turnVelocity = 0, rudderDegrees = 0, nextPlayerStateSendTime = 0;
  const canUseSubmarineTorpedoScope = () => true;
  const updateSubmarinePeriscopeModeUi = () => {};
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const shortestAngleDelta = (a, b) => Math.atan2(Math.sin(b-a), Math.cos(b-a));
  const getPlayerMaxRudderDegrees = () => torpedoBoatMaxRudderDegrees;
  let completedAt = null;
  for (let t = 0; t < 180; t += dt) {
    updateSubmarineBearingAlignment(dt);
    const strength = speed >= 0 ? torpedoBoatForwardTurnStrength : torpedoBoatReverseTurnStrength;
    const targetRate = rudderDegrees / torpedoBoatMaxRudderDegrees * strength * clamp(Math.abs(speed)/4.2, 0, 1);
    turnVelocity += (targetRate - turnVelocity) * Math.min(1, dt*2);
    heading += turnVelocity * dt;
    if (submarinePeriscopeMode === 'forward' && completedAt === null) completedAt = t;
    if (completedAt !== null && t - completedAt > 5) break;
  }
  return { completedAt, error: Math.abs(shortestAngleDelta(heading, target)) * 180 / Math.PI };
`);

for (const speed of [1, 4, 8, -3]) {
  for (const dt of [1/60, 1/20]) {
    for (const [from, to] of [[0, 90], [0, -90], [179, -179], [0, 1], [0, 170]]) {
      test(`bearing settles accurately: speed=${speed} dt=${dt} ${from} to ${to}`, () => {
        const result = simulate(from*Math.PI/180, to*Math.PI/180, speed, dt);
        assert.notEqual(result.completedAt, null, 'Must finish instead of oscillating indefinitely');
        assert.ok(result.error <= .8, `Settled error ${result.error} degrees`);
      });
    }
  }
}
