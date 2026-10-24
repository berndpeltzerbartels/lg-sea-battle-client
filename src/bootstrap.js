const trace = (step, detail) => window.__seaBattleTrace?.(step, detail);
trace('bootstrap entered');

async function probeTvStartup() {
  const checkpoint = label => window.__seaBattleDiagnosticCheckpoint?.(label);
  const pause = () => new Promise(resolve => setTimeout(resolve, 2000));
  const status = document.createElement('aside');
  status.id = 'tvDiagnosticStatus';
  status.style.cssText = 'position:fixed;inset:0;background:#071b2a;color:white;padding:40px;z-index:1000;font:24px sans-serif;';
  document.body.append(status);
  const phase = label => {
    status.textContent = `TV-Diagnose: ${label}`;
    checkpoint(label);
  };
  phase('Browser ohne Spiel und Babylon');
  await pause();
  phase('Einfaches Spielmodul laden');
  await import('./instrumentHelpers.js');
  phase('Einfaches Spielmodul erfolgreich');
  await pause();
  phase('Babylon-Mathematik laden');
  await import('@babylonjs/core/Maths/math.vector.js');
  phase('Babylon-Mathematik erfolgreich');
  await pause();
  phase('Babylon-Grafikmodule laden');
  await import('@babylonjs/core/Engines/engine.js');
  await import('@babylonjs/core/scene.js');
  phase('Babylon-Grafikmodule erfolgreich');
  await pause();
  status.remove();
  checkpoint('Vollständiges Spiel starten');
}

// Observe module initialization before a browser can redact the global error.
async function start() {
  if (new URLSearchParams(location.search).get('tv-diagnostic') === '1') await probeTvStartup();
  trace('importing game module');
  await import('./main.js');
  trace('game module initialization complete');
  if (new URLSearchParams(location.search).get('tv-diagnostic') === '1') {
    window.__seaBattleDiagnosticCheckpoint?.('Spielinitialisierung abgeschlossen');
  }
}
start().catch(error => {
  trace('game module initialization failed', error);
  window.__seaBattleShowStartupError('Spielstart fehlgeschlagen', error);
});
