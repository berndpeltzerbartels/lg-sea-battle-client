export function submarineSeaMotionFactor(depthState, depthOffset = 0) {
  return depthState === "surface" && depthOffset >= -0.01 ? 0.25 : 0;
}
