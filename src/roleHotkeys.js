import { describeBindings } from '../public/controller-bindings.js';

import { roleHotkeys } from '../public/role-hotkeys.js';
export { roleHotkeys };

// Derive controller hints from the same position/depth/occupancy rules as keyboard hints.
export function gamepadHotkeys(keys, controllerName = '', profile = null) {
  if (profile?.custom) {
    const b = profile.bindings, hints = [];
    const add = (action, label) => { if (b[action]?.length) hints.push([describeBindings(b[action]), label]); };
    add('stationPrevious', 'Vorherige freie Position'); add('stationNext', 'Nächste freie Position'); add('help', 'Hilfe');
    for (const [key, label] of keys) {
      const actions = { '↑ ↓': label === 'Fahrt' ? ['directY', 'up', 'down'] : ['aimY', 'aimUp', 'aimDown'], '← →': label === 'Ruder' ? ['directX', 'left', 'right'] : ['aimX', 'aimLeft', 'aimRight'],
        '↑ ↓ ← →': ['aimX', 'aimY', 'aimLeft', 'aimRight', 'aimUp', 'aimDown'], Leertaste: ['fire'],
        Z: ['zoom'], W: ['depth-charge'], A: ['align'], '3': ['align'], '⇧↑': ['ascend'], '⇧↓': ['dive'],
        '1': ['forward-scope'], '2': ['observation-scope'] }[key] ?? [];
      for (const action of actions) add(action, label);
    }
    if (keys.some(([key, label]) => key === '↑ ↓' && label === 'Fahrt')) add('throttleHold', 'Gas festhalten');
    return hints;
  }
  if (/^057e-2019-N64 Controller$/i.test(controllerName)) {
    const names = { '↑ ↓': 'Stick / C ↑ ↓', '← →': 'Stick / C ← →',
      '↑ ↓ ← →': 'Stick / C-Tasten · auch diagonal', Leertaste: 'Gewählte Feuertaste' };
    return [['Steuerkreuz ← / →', 'Freie Position zurück / weiter'],
      ...keys.filter(([key]) => names[key]).map(([key, label]) => [names[key],
        label === 'Fahrt' ? 'Stick direkt · C-Tasten halten die Gasstufe'
          : label === 'Ruder' ? 'Stick direkt · C-Tasten halten den Ausschlag' : label])];
  }
  const hints = [['△', 'Nächste freie Position'], ['L1 / R1', 'Freie Position zurück / weiter'], ['Options', 'Hilfe']];
  if (keys.some(([key, label]) => key === '↑ ↓' && label === 'Fahrt'))
    hints.push(['L3', 'Gas festhalten · Stick ↑ / ↓ löst auf der Brücke']);
  for (const [key, label] of keys) {
    if (key === 'A' && keys.some(([key]) => key === '3')) continue;
    const mapped = { '↑ ↓': 'Stick ↑ / ↓', '← →': 'Stick ← / →', '↑ ↓ ← →': 'Linker Stick · auch diagonal',
      Leertaste: 'R2', Z: 'L2', W: '□', A: '○', '⇧↑': 'Steuerkreuz ↑', '⇧↓': 'Steuerkreuz ↓',
      '1': 'Steuerkreuz ←', '2': 'Steuerkreuz →', '3': '○' }[key];
    if (mapped) hints.push([mapped, label === 'Fahrt' ? 'Fahrt nach Ausschlag · ohne Feststellung: loslassen = Stop'
      : label === 'Ruder' ? 'Ruder nach Ausschlag · loslassen: mittschiffs' : label]);
  }
  return hints;
}
