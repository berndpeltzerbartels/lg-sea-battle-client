import { CONTROLLER_ACTIONS, controllerKey, resolveBindings, defaultBindings, readControllerProfiles,
  saveControllerProfile, bindingValue, describeBindings, captureControllerBinding, bindingConflicts, isAnalogAction } from './controller-bindings.js';

function mount(root) {
  if (root.dataset.mounted) return;
  root.dataset.mounted = 'true';
  const choice = root.querySelector('#controller-choice'), status = root.querySelector('#controller-connection');
  const message = root.querySelector('#controller-save-status'), save = root.querySelector('#controller-save');
  const defaults = root.querySelector('#controller-defaults'), panel = root.querySelector('#controller-capture');
  const conflicts = root.querySelector('#controller-conflicts');
  let selectedKey = null, draft = {}, capture = null, previousPads = '', dirty = false;
  const drafts = new Map();
  const rows = new Map([...root.querySelectorAll('[data-controller-action]')].map(row => [row.dataset.controllerAction, row]));
  const labels = Object.fromEntries([...rows].map(([key, row]) => [key, row.querySelector('.binding-label').textContent]));
  const getPads = () => { try { return Array.from(navigator.getGamepads?.() ?? []).filter(pad => pad && pad.connected !== false); } catch { return []; } };
  const getPad = pads => pads.find(pad => controllerKey(pad) === selectedKey);
  const copy = value => JSON.parse(JSON.stringify(value));
  const snapshot = pad => ({ axes: [...pad.axes], buttons: pad.buttons.map(b => ({ pressed: b.pressed, value: b.value })) });
  function cancel() {
    capture = null; panel.hidden = true;
    for (const row of rows.values()) delete row.dataset.capturing;
  }
  function render(pad) {
    for (const [action, row] of rows) {
      row.querySelector('[data-binding-value]').textContent = describeBindings(draft[action]);
      row.querySelector('[data-bind]').disabled = !pad;
      row.querySelector('[data-clear]').disabled = !pad;
    }
    const duplicates = bindingConflicts(draft);
    conflicts.textContent = duplicates.map(([a, b]) => `Doppelt belegt (gleichzeitig verfügbar): „${labels[a]}“ und „${labels[b]}“. Bitte eine andere Eingabe zuordnen oder eine Belegung löschen.`).join('\n');
    save.disabled = !pad || duplicates.length > 0;
    defaults.disabled = !pad;
  }
  function choose(pad) {
    cancel(); selectedKey = pad ? controllerKey(pad) : null;
    draft = selectedKey ? drafts.get(selectedKey)?.draft ?? copy(resolveBindings(pad, readControllerProfiles(localStorage)) ?? {}) : {};
    dirty = selectedKey ? drafts.get(selectedKey)?.dirty ?? false : false;
    message.textContent = dirty ? 'Änderungen noch nicht gespeichert.' : pad ? 'Die angezeigte Belegung kann getestet und geändert werden.' : 'Noch keine Änderungen gespeichert.';
    render(pad);
  }
  function changed(pad) {
    dirty = true; drafts.set(selectedKey, { draft, dirty });
    message.textContent = 'Änderungen noch nicht gespeichert.'; render(pad);
  }
  choice.addEventListener('change', () => choose(getPadByChoice()));
  function getPadByChoice() { return getPads().find(pad => controllerKey(pad) === choice.value); }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-bind], [data-clear]');
    if (!button) return;
    const pad = getPad(getPads()); if (!pad) return;
    cancel();
    if (button.dataset.clear) { draft[button.dataset.clear] = []; changed(pad); return; }
    const action = button.dataset.bind, row = rows.get(action);
    capture = { action, key: selectedKey, baseline: snapshot(pad), start: performance.now(), expires: performance.now() + 20000 };
    panel.hidden = false; row.dataset.capturing = 'true';
    root.querySelector('#controller-instruction').textContent = row.dataset.prompt;
    message.textContent = 'Messung läuft. Andere Bedienelemente bitte loslassen.';
  });
  root.querySelector('#controller-cancel').addEventListener('click', () => { cancel(); message.textContent = 'Messung abgebrochen. Die Belegung wurde nicht verändert.'; });
  const escape = event => { if (event.key === 'Escape' && capture) { cancel(); message.textContent = 'Messung abgebrochen. Die Belegung wurde nicht verändert.'; } };
  document.addEventListener('keydown', escape);
  save.addEventListener('click', () => {
    const pad = getPad(getPads()); if (!pad || bindingConflicts(draft).length || capture) return;
    try {
      saveControllerProfile(localStorage, pad, draft); dirty = false; drafts.set(selectedKey, { draft, dirty });
      message.textContent = 'Belegung gespeichert. Sie gilt für alle Fahrzeuge in diesem Browser. Du kannst jetzt zur Fahrzeugauswahl zurück.';
    } catch (error) { message.textContent = `Speichern nicht möglich: ${error.message}`; }
  });
  defaults.addEventListener('click', () => {
    const pad = getPad(getPads()); if (!pad) return;
    cancel(); draft = copy(defaultBindings(pad) ?? {}); changed(pad);
    message.textContent = 'Voreinstellung geladen, noch nicht gespeichert.';
  });
  function poll() {
    if (!root.isConnected) { clearInterval(timer); document.removeEventListener('keydown', escape); delete root.dataset.mounted; return; }
    const pads = getPads(), keys = JSON.stringify(pads.map(controllerKey));
    if (keys !== previousPads) {
      previousPads = keys; choice.replaceChildren();
      if (!pads.length) choice.add(new Option('Bitte eine Controller-Taste drücken', ''));
      for (const pad of pads) choice.add(new Option(pad.id, controllerKey(pad)));
      if (selectedKey && pads.some(p => controllerKey(p) === selectedKey)) choice.value = selectedKey;
      else choose(pads[0]);
    }
    const pad = getPad(pads);
    status.textContent = pad ? 'Controller erkannt. Wähle „Belegen“ und betätige danach die gewünschte Taste oder den Stick.'
      : 'Kein Controller sichtbar. Dieses Fenster anklicken und eine Controller-Taste drücken. Bereits gespeicherte Belegungen bleiben erhalten.';
    if (capture && pad) {
      if (performance.now() > capture.expires) { cancel(); message.textContent = 'Keine Eingabe erkannt. Die Belegung blieb unverändert; du kannst erneut „Belegen“ wählen.'; }
      else if (performance.now() - capture.start > 250) {
        const binding = captureControllerBinding(capture.baseline, pad, capture.action);
        if (binding) { draft[capture.action] = [binding]; cancel(); changed(pad); }
      }
    }
    for (const [action, row] of rows) {
      const value = pad ? bindingValue(pad, draft[action]) : 0;
      const text = isAnalogAction(action) ? `Test: ${Math.round(value * 100)} %` : value ? 'Test: betätigt' : '';
      const live = row.querySelector('[data-binding-live]'); if (live.textContent !== text) live.textContent = text;
    }
  }
  render(null); const timer = setInterval(poll, 50); poll();
}
function mountVisible() { const root = document.getElementById('controller-setup'); if (root && root.querySelectorAll('[data-controller-action]').length === CONTROLLER_ACTIONS.length) mount(root); }
mountVisible();
// XIS may insert this page and its frontlets without a full document reload.
new MutationObserver(mountVisible).observe(document.documentElement, { childList: true, subtree: true });
