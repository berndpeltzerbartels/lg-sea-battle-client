// A short server notice confirms detection; it does not describe ongoing tracking.
export function isSubmarineDetectionVisible(detection, ship, serverTime) {
  return !!(ship?.vehicleType === 'submarine' && ship.state === 'active'
    && ship.depthState === 'periscope' && detection?.lifeId === ship.lifeId
    && Number.isFinite(detection.until) && Number.isFinite(serverTime) && detection.until > serverTime);
}
