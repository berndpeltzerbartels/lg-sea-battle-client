export function shipVisibleAtRadarDepth(underwater, vehicleType, depthState) {
  const submerged = vehicleType === 'submarine' && (depthState === 'periscope' || depthState === 'submerged');
  return underwater ? vehicleType !== 'scout-plane' : !submerged;
}

export function torpedoVisibleAtRadarDepth(underwater, torpedo) {
  return torpedo?.state === 'running' && (underwater || !(torpedo.y < -1));
}

export function torpedoTargetAtDepth(launchY, contact, scale) {
  if (!contact || contact.vehicleType === 'scout-plane') return false;
  // Match the server's torpedoDepthCanDamageShip gate, including depth transitions.
  if (launchY < -1) {
    return contact.vehicleType === 'submarine' && Number.isFinite(contact.y)
      && contact.y < -1.87 * scale
      && Math.abs(launchY - (contact.y + .2 * scale)) <= .5 * scale;
  }
  return contact.vehicleType !== 'submarine' || contact.depthState === 'surface';
}
