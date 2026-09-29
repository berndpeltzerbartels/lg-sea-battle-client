export function roleHotkeys({ role, members = [], playerId, depthChargesReady = true, radarModes = false, torpedoScope = false,
  submarine = false, depth = 'surface', periscopeAvailable = false, observationScope = false }) {
  if (submarine) {
    const keys = [];
    if (role === 'flak') keys.push(['B', 'Brücke'], ['↑ ↓ ← →', 'Zielen'], ['Leertaste', 'Feuern'], ['A', 'Ausrichten'], ['⇧A', 'Flugabwehr']);
    else {
      if (depth === 'surface') keys.push(['F', 'Flak']);
      keys.push(['↑ ↓', 'Fahrt'], ['← →', observationScope ? 'Blickrichtung' : 'Ruder']);
      if (depth === 'surface' || torpedoScope) keys.push(['Leertaste', 'Torpedo']);
      if (periscopeAvailable) keys.push(['1', 'Sehrohr voraus'], ['2', '360°-Sehrohr'], ['3', 'Boot auf Peilung']);
      if (torpedoScope || observationScope) keys.push(['Z', 'Vergrößerung']);
    }
    if (depth !== 'surface') keys.push(['⇧↑', 'Auftauchen']);
    if (depth !== 'submerged') keys.push(['⇧↓', 'Abtauchen']);
    if (radarModes) keys.push(['R', 'Radar wechseln']);
    return keys;
  }
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
    if (role === 'lookout') keys.push(['Z', 'Fernglas'], ['U', 'U-Boot warnen'], ['L', 'Flugzeug warnen'],
      ['C', free('cannon') ? 'Kanone ausrichten & übernehmen' : 'Kanone: Zustimmung anfragen'],
      ['F', free('flak') ? 'Flak ausrichten & übernehmen' : 'Flak: Zustimmung anfragen']);
    else {
      keys.push(['Leertaste', 'Feuern'], ['⇧A', 'Flugabwehr']);
      if (role === 'cannon') keys.push(['Z', 'Vergrößerung']);
    }
  }
  if (depthChargesReady && ['bridge', 'lookout', 'flak'].includes(role)) keys.push(['W', 'Wasserbomben']);
  if (radarModes) keys.push(['R', 'Radar wechseln']);
  return keys;
}
