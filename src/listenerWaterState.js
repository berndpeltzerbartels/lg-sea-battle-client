export function listenerWaterState({ submarine = false, depthOffset = 0, periscopeOffset = -1.6, sinking = false, cameraY = 0 }) {
  if (sinking) return { underwater: cameraY < -.08, deepSubmerged: cameraY < -1.5 };
  return {
    underwater: submarine && Math.abs(depthOffset) > .8,
    deepSubmerged: submarine && Math.abs(depthOffset) > Math.abs(periscopeOffset) + .05
  };
}
