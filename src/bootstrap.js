window.__seaBattleTrace?.("bootstrap entered; importing game module");
// Import failures (including top-level initialization) must be observed before
// the browser can reduce them to a source-less global "Script error." event.
import('./main.js').then(() => {
  window.__seaBattleTrace?.('game module initialization complete');
}).catch(error => {
  window.__seaBattleTrace?.('game module initialization failed', error);
  window.__seaBattleShowStartupError('Spielstart fehlgeschlagen', error);
});
