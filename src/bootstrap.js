// Import failures (including top-level initialization) must be observed before
// the browser can reduce them to a source-less global "Script error." event.
import('./main.js').catch(error => {
  window.__seaBattleShowStartupError('Spielstart fehlgeschlagen', error);
});
