export function roleHotkeys({ role, members = [], playerId, depthChargesReady = true, radarModes = false, torpedoScope = false }) {
  const free = station => !members.some(m => m.station === station && m.playerId !== playerId);
  const keys = [];
  for (const [station, key, label] of [['bridge', 'B', 'Brücke'], ['lookout', 'O', 'Ausguck'], ['flak', 'F', 'Flak'], ['cannon', 'C', 'Kanone']]) {
    if (role === 'lookout' && ['flak', 'cannon'].includes(station)) continue;
    if (station !== role && free(station)) keys.push([key, label]);
  }
  if (role === 'bridge') {
    keys.push(['↑ ↓', 'Fahrt'], ['← →', 'Ruder'], ['Leertaste', 'Torpedo'], ['T', 'Torpedo-Präzision']);
    if (torpedoScope) keys.push(['Z', 'Vergrößerung']);
    if (['flak', 'cannon', 'lookout'].some(free)) keys.push(['A', 'Geschütze ausrichten'], ['⇧A', 'Flugabwehr']);
  } else {
    keys.push(['↑ ↓ ← →', role === 'lookout' ? 'Blickrichtung' : 'Zielen'], ['A', 'Ausrichten']);
    if (role === 'lookout') keys.push(['Z', 'Fernglas'],
      ['C', free('cannon') ? 'Kanone ausrichten & übernehmen' : 'Kanone: Zustimmung anfragen'],
      ['F', free('flak') ? 'Flak ausrichten & übernehmen' : 'Flak: Zustimmung anfragen']);
    else {
      keys.push(['Leertaste', 'Feuern'], ['⇧A', 'Flugabwehr']);
      if (role === 'cannon') keys.push(['Z', 'Vergrößerung']);
    }
  }
  if (depthChargesReady && ['bridge', 'lookout'].includes(role)) keys.push(['W', 'Wasserbomben']);
  if (radarModes) keys.push(['R', 'Radar wechseln']);
  return keys;
}
