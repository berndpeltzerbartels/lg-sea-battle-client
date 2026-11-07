// The server deadline describes an active hunt, not continuous visual contact.
export function isSubmarineDetectionVisible(detection, ship, serverTime) {
  return !!(ship?.vehicleType === 'submarine' && ship.state === 'active'
    && detection?.lifeId === ship.lifeId
    && Number.isFinite(detection.until) && Number.isFinite(serverTime) && detection.until > serverTime);
}
