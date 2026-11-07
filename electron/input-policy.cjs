'use strict';

const EXIT_ACCELERATOR = 'Control+Alt+Shift+Q';

function isExitShortcut(input) {
  return (input.type === 'keyDown' || input.type === 'keydown') &&
    (input.code === 'KeyQ' || String(input.key).toLowerCase() === 'q') &&
    Boolean(input.control ?? input.ctrlKey) &&
    Boolean(input.alt ?? input.altKey) &&
    Boolean(input.shift ?? input.shiftKey) &&
    !Boolean(input.meta ?? input.metaKey);
}

function normalizeKey(input) {
  if (input.type !== 'keyDown' && input.type !== 'keyUp') return null;
  return {
    type: input.type === 'keyDown' ? 'keydown' : 'keyup',
    key: String(input.key || ''),
    code: String(input.code || ''),
    repeat: Boolean(input.isAutoRepeat),
    altKey: Boolean(input.alt),
    ctrlKey: Boolean(input.control),
    metaKey: Boolean(input.meta),
    shiftKey: Boolean(input.shift),
  };
}

function resolveDevURL(value, packaged) {
  if (!value || packaged) return null;
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.port !== '5173' || url.pathname !== '/' || url.search || url.hash ||
      url.username || url.password) {
    throw new Error('GIULIA_DEV_URL must be http://127.0.0.1:5173 or http://localhost:5173.');
  }
  return url.href;
}

module.exports = { EXIT_ACCELERATOR, isExitShortcut, normalizeKey, resolveDevURL };
