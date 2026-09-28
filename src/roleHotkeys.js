export function roleHotkeys({ role, members = [], playerId, depthChargesReady = true, radarModes = false, torpedoScope = false }) {
  const free = station => !members.some(m => m.station === station && m.playerId !== playerId);
  const keys = [];
  for (const [station, key, label] of [['bridge', 'B', 'Brücke'], ['lookout', 'O', 'Ausguck'], ['flak', 'F', 'Flak'], ['cannon', 'C', 'Kanone']]) {
    if (station !== role && free(station)) keys.push([key, label]);
  }
  if (role === 'bridge') {
    keys.push(['↑ ↓', 'Fahrt'], ['← →', 'Ruder'], ['Leertaste', 'Torpedo'], ['T', 'Torpedo-Präzision']);
    if (torpedoScope) keys.push(['Z', 'Vergrößerung']);
    if (['flak', 'cannon', 'lookout'].some(free)) keys.push(['A / ⇧A', 'Freie Posten ausrichten']);
  } else {
    keys.push(['↑ ↓ ← →', role === 'lookout' ? 'Blickrichtung' : 'Zielen'], ['A', 'Ausrichten']);
    if (role === 'lookout') keys.push(['Z', 'Fernglas'], ['⇧C / ⇧F', 'Kanone / Flak ausrichten']);
    else {
      keys.push(['Leertaste', 'Feuern'], ['⇧A', 'Flugabwehr']);
      if (role === 'cannon') keys.push(['Z', 'Vergrößerung']);
    }
  }
  if (depthChargesReady && ['bridge', 'lookout'].includes(role)) keys.push(['W', 'Wasserbomben']);
  if (radarModes) keys.push(['R', 'Radar wechseln']);
  return keys;
}
