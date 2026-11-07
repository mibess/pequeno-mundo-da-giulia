const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isExitShortcut, normalizeKey, resolveDevURL } = require('../electron/input-policy.cjs');

test('only the complete adult chord exits; keyup and ordinary Q remain playful', () => {
  const chord = { type: 'keyDown', code: 'KeyQ', key: 'Q', control: true, alt: true, shift: true, meta: false };
  assert.equal(isExitShortcut(chord), true);
  for (const modifier of ['control', 'alt', 'shift']) {
    assert.equal(isExitShortcut({ ...chord, [modifier]: false }), false);
  }
  assert.equal(isExitShortcut({ ...chord, type: 'keyUp' }), false);
  assert.equal(isExitShortcut({ ...chord, meta: true }), false);
  assert.equal(isExitShortcut({ type: 'keyDown', key: 'q', code: 'KeyQ' }), false);
  assert.equal(isExitShortcut({ ...chord, key: 'œ' }), true, 'physical Q works with Option/Alt keyboard layouts');
});

test('input forwarded across the bridge contains only bounded key fields', () => {
  assert.deepEqual(normalizeKey({ type: 'keyUp', key: 'Escape', code: 'Escape', control: true, isAutoRepeat: true, secret: 'not forwarded' }), {
    type: 'keyup', key: 'Escape', code: 'Escape', repeat: true,
    ctrlKey: true, altKey: false, metaKey: false, shiftKey: false,
  });
  assert.equal(normalizeKey({ type: 'char', key: 'a' }), null);
});

test('development content is restricted to the local development origin and ignored in a package', () => {
  assert.equal(resolveDevURL('http://localhost:5173', false), 'http://localhost:5173/');
  assert.equal(resolveDevURL('http://127.0.0.1:5173/', false), 'http://127.0.0.1:5173/');
  assert.equal(resolveDevURL('https://example.com', true), null);
  assert.equal(resolveDevURL(undefined, false), null);
  for (const value of ['https://example.com', 'http://localhost:5000', 'http://localhost:5173/elsewhere', 'http://localhost:5173/?x=1', 'http://user:pass@localhost:5173']) {
    assert.throws(() => resolveDevURL(value, false));
  }
});
