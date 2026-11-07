'use strict';

// Keep the window on its original monitor across changes in Windows display
// scaling and layout. Electron's display bounds and window bounds are both DIP.
function followKioskDisplay(window, screen, displayId) {
  let pending;

  function fit() {
    if (window.isDestroyed() || !window.isKiosk()) return;
    const displays = screen.getAllDisplays();
    if (!displays.length) return;
    const display = displays.find(candidate => candidate.id === displayId) ?? screen.getPrimaryDisplay();
    displayId = display.id;
    const { bounds } = display;
    const actual = window.getBounds();
    if (actual.x !== bounds.x || actual.y !== bounds.y ||
        actual.width !== bounds.width || actual.height !== bounds.height) {
      window.setBounds(bounds);
    }
  }

  function scheduleFit() {
    if (pending) return;
    pending = setImmediate(() => {
      pending = undefined;
      fit();
    });
  }

  // Windows needs a resizable native window to enter fullscreen, but manual
  // dragging should never move or resize the child's playground.
  window.on('will-move', event => event.preventDefault());
  window.on('will-resize', event => event.preventDefault());
  window.once('show', scheduleFit);
  window.on('enter-full-screen', scheduleFit);
  const displayEvents = ['display-metrics-changed', 'display-added', 'display-removed'];
  for (const event of displayEvents) screen.on(event, scheduleFit);
  window.once('closed', () => {
    clearImmediate(pending);
    for (const event of displayEvents) screen.off(event, scheduleFit);
  });
  fit();
}

module.exports = { followKioskDisplay };
