// Solara Bay v7 — keyboard input + the debug/test API the screenshot and
// playtest drivers use (same surface as the play driver expects).

export function makeInput() {
  const keys = {};
  const pressed = new Set();
  const handlers = { keydown: [], keyup: [], press: [] };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressed.add(e.code);
    keys[e.code] = true;
    for (const h of handlers.keydown) h(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    for (const h of handlers.keyup) h(e.code);
  });

  function on(event, fn) { handlers[event].push(fn); }

  // Debug API: drivers drive the real key path, never private state.
  function setKeys(map) {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const [k, v] of Object.entries(map)) keys[k] = !!v;
  }
  function press(code) {
    pressed.add(code);
    for (const h of handlers.press) h(code);
    setTimeout(() => pressed.delete(code), 50);
  }
  function consume(code) {
    if (pressed.has(code)) { pressed.delete(code); return true; }
    return false;
  }

  return { keys, pressed, on, setKeys, press, consume };
}
