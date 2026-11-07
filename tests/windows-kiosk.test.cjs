'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { setImmediate: nextTurn } = require('node:timers/promises');
const { followKioskDisplay } = require('../electron/windows-kiosk.cjs');

test('kiosk fills the selected display at fractional scaling and follows monitor changes', async () => {
  // 1920 × 1080 hardware pixels, 125% scale. The taskbar also reserves 40 DIP.
  const selected = { id: 2, bounds: { x: -1536, y: 0, width: 1536, height: 864 }, scaleFactor: 1.25 };
  const primary = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
  let displays = [primary, selected];
  const screen = Object.assign(new EventEmitter(), {
    getAllDisplays: () => displays,
    getPrimaryDisplay: () => primary,
  });
  let actual = { x: -1536, y: 0, width: 1440, height: 824 };
  const window = Object.assign(new EventEmitter(), {
    getBounds: () => actual,
    setBounds: value => { actual = { ...value }; },
    isDestroyed: () => false,
    isKiosk: () => true,
  });
  followKioskDisplay(window, screen, selected.id);
  assert.deepEqual(actual, selected.bounds, 'uses the entire selected display in DIP');

  selected.bounds = { x: -1280, y: -80, width: 1280, height: 720 };
  selected.scaleFactor = 1.5;
  screen.emit('display-metrics-changed', {}, selected, ['scaleFactor', 'bounds']);
  await nextTurn();
  assert.deepEqual(actual, selected.bounds, 'keeps the same display after a DPI change');

  displays = [primary];
  screen.emit('display-removed', {}, selected);
  await nextTurn();
  assert.deepEqual(actual, primary.bounds, 'falls back to the primary display after unplugging');
  window.emit('closed');
  assert.equal(screen.listenerCount('display-metrics-changed'), 0);
});
