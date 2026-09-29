export function shipVisibleAtRadarDepth(underwater, vehicleType, depthState) {
  const submerged = vehicleType === 'submarine' && (depthState === 'periscope' || depthState === 'submerged');
  return underwater ? vehicleType !== 'scout-plane' : !submerged;
}

export function torpedoVisibleAtRadarDepth(underwater, torpedo) {
  return torpedo?.state === 'running' && (underwater || !(torpedo.y < -1));
}
