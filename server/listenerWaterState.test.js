import test from 'node:test';
import assert from 'node:assert/strict';
import { listenerWaterState } from '../src/listenerWaterState.js';
test('a sinking surface boat uses actual camera depth for the same underwater mix', () => {
  assert.deepEqual(listenerWaterState({sinking:true,cameraY:1}),{underwater:false,deepSubmerged:false});
  assert.deepEqual(listenerWaterState({sinking:true,cameraY:-.2}),{underwater:true,deepSubmerged:false});
  assert.deepEqual(listenerWaterState({sinking:true,cameraY:-2}),{underwater:true,deepSubmerged:true});
  assert.deepEqual(listenerWaterState({sinking:false,cameraY:-2}),{underwater:false,deepSubmerged:false});
});
test('normal U-boat acoustics retain their depth thresholds', () => {
  assert.deepEqual(listenerWaterState({submarine:true,depthOffset:-1.6}),{underwater:true,deepSubmerged:false});
  assert.deepEqual(listenerWaterState({submarine:true,depthOffset:-6.16}),{underwater:true,deepSubmerged:true});
});
