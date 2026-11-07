import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { _electron as electron } from 'playwright';

// Explicitly invoked integration test: briefly enters the real kiosk mode.
// An independent test-process watchdog kills Electron after 15 seconds even if
// the application's normal exit stops working. Do not include in routine CI.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const packaged = process.argv.includes('--packaged');
const packagedPath = process.platform === 'win32'
  ? join(root, 'release', '.preparo', process.arch === 'arm64' ? 'win-arm64-unpacked' : 'win-unpacked', 'Pequeno Mundo da Giulia.exe')
  : join(root, 'release', 'Versões', require('../package.json').version, 'Neste Mac', 'Pequeno Mundo da Giulia.app', 'Contents', 'MacOS', 'Pequeno Mundo da Giulia');
const profile = await mkdtemp(join(tmpdir(), 'giulia-kiosk-smoke-'));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.GIULIA_DEV_URL;
let app;
let watchdog;
let exited = false;

try {
  app = await electron.launch({
    executablePath: packaged ? packagedPath : require('electron'),
    args: [...(packaged ? [] : [root]), `--user-data-dir=${profile}`],
    cwd: root,
    env,
    timeout: 10_000,
  });
  watchdog = setTimeout(() => app.process().kill('SIGKILL'), 15_000);
  app.on('close', () => { exited = true; });
  const page = await app.firstWindow({ timeout: 5_000 });
  page.setDefaultTimeout(5_000);
  await page.locator('#playground').waitFor();
  await page.waitForFunction(() => !document.hidden && !window.giulia.preview);
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), packaged);
  assert.match(page.url(), packaged ? /app\.asar\/dist\/index\.html$/ : /\/dist\/index\.html$/);
  assert.equal(await page.locator('.mode-badge').textContent(), 'Modo protegido');
  const before = await app.evaluate(({ BrowserWindow, globalShortcut }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.focus();
    window.webContents.focus();
    return {
      kiosk: window.isKiosk(),
      top: window.isAlwaysOnTop(),
      exitRegistered: globalShortcut.isRegistered('Control+Alt+Shift+Q'),
      minimize: window.isMinimizable(),
      resize: window.isResizable(),
    };
  });
  assert.deepEqual(before, { kiosk: true, top: true, exitRegistered: true, minimize: false, resize: process.platform === 'win32' });
  if (process.platform === 'win32') {
    const geometry = await app.evaluate(({ BrowserWindow, screen }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const bounds = window.getBounds();
      return { bounds, display: screen.getDisplayMatching(bounds).bounds, fullscreen: window.isFullScreen() };
    });
    assert.equal(geometry.fullscreen, true);
    assert.deepEqual(geometry.bounds, geometry.display, 'kiosk covers the whole Windows display, including the taskbar area');
  }
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  assert.equal(app.windows().length, 1, 'normal close is prevented in child mode');
  await app.evaluate(({ app }) => app.quit());
  assert.equal(app.windows().length, 1, 'ordinary application quit is prevented');
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  });
  await page.locator('.creation').waitFor();
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isKiosk()), true, 'Escape becomes a playful input and retains kiosk');
  const closed = app.waitForEvent('close', { timeout: 5_000 });
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Q', modifiers: ['control', 'alt', 'shift'] });
  }).catch(error => {
    if (!/closed|destroyed/i.test(error.message)) throw error;
  });
  await closed;
  assert.equal(exited, true);
  console.log(`PASS ${packaged ? 'packaged app' : 'development'} real kiosk: fullscreen kiosk, always on top, close/ordinary quit blocked, Escape plays, adult exit closes cleanly.`);
} finally {
  if (app && !exited) {
    // Failure cleanup must not call app.quit(), which kiosk intentionally blocks.
    await app.evaluate(({ app }) => app.exit(1)).catch(() => app.process().kill('SIGKILL'));
  }
  clearTimeout(watchdog);
  await rm(profile, { recursive: true, force: true });
}
