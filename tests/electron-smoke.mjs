import assert from 'node:assert/strict';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { _electron as electron } from 'playwright';

// Native smoke test runs only in the ordinary, closable preview window.
// Build first with npm run build; no app fullscreen/desktop lock is activated.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
await access(join(root, 'dist', 'index.html'));
const profile = await mkdtemp(join(tmpdir(), 'giulia-electron-smoke-'));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.GIULIA_DEV_URL;
let app;
let timeout;

try {
  app = await electron.launch({
    executablePath: require('electron'),
    args: [root, '--preview', `--user-data-dir=${profile}`],
    cwd: root,
    env,
    timeout: 25_000,
  });
  timeout = setTimeout(() => app.process().kill('SIGKILL'), 45_000);
  const page = await app.firstWindow();
  page.setDefaultTimeout(7_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('#playground').waitFor();
  await page.waitForFunction(() => !document.hidden);
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].focus();
    BrowserWindow.getAllWindows()[0].webContents.focus();
  });
  const nativeKey = (keyCode, modifiers = []) => app.evaluate(({ BrowserWindow }, input) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    contents.sendInputEvent({ type: 'keyDown', ...input });
    contents.sendInputEvent({ type: 'keyUp', ...input });
  }, { keyCode, modifiers });
  assert.match(page.url(), /^file:/, 'packaged UI loads offline from dist');

  const security = await app.evaluate(({ BrowserWindow, globalShortcut }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const prefs = window.webContents.getLastWebPreferences();
    return {
      kiosk: window.isKiosk(),
      alwaysOnTop: window.isAlwaysOnTop(),
      sandbox: prefs.sandbox,
      contextIsolation: prefs.contextIsolation,
      nodeIntegration: prefs.nodeIntegration,
      exitAvailable: globalShortcut.isRegistered('Control+Alt+Shift+Q'),
    };
  });
  assert.deepEqual(security, {
    kiosk: false, alwaysOnTop: false, sandbox: true,
    contextIsolation: true, nodeIntegration: false, exitAvailable: true,
  });
  assert.deepEqual(await page.evaluate(() => ({
    desktop: window.giulia.isDesktop,
    preview: window.giulia.preview,
    platform: window.giulia.platform,
    node: typeof window.require,
    process: typeof window.process,
    quit: typeof window.giulia.quit,
  })), {
    desktop: true, preview: true, platform: process.platform,
    node: 'undefined', process: 'undefined', quit: 'undefined',
  });
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/);

  // No prior click or DOM gesture: observe the actual sound graph started by the
  // first native key through the isolated preload bridge.
  await page.evaluate(() => {
    window.__smoke = { contexts: [], nativeKeys: [], domKeys: 0, creations: 0, started: 0 };
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = new Proxy(NativeAudioContext, {
      construct(Target, args) {
        const context = Reflect.construct(Target, args);
        window.__smoke.contexts.push(context);
        const originalCreate = context.createOscillator.bind(context);
        context.createOscillator = () => {
          const oscillator = originalCreate();
          const originalStart = oscillator.start.bind(oscillator);
          oscillator.start = (...values) => {
            window.__smoke.started++;
            return originalStart(...values);
          };
          return oscillator;
        };
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        window.__smoke.analyser = analyser;
        const originalCompressor = context.createDynamicsCompressor.bind(context);
        context.createDynamicsCompressor = () => {
          const compressor = originalCompressor();
          compressor.connect(analyser);
          return compressor;
        };
        return context;
      },
    });
    window.giulia.onKey(key => window.__smoke.nativeKeys.push(key));
    document.addEventListener('keydown', () => window.__smoke.domKeys++);
    new MutationObserver(records => {
      window.__smoke.creations += records.reduce((sum, record) => sum + record.addedNodes.length, 0);
    }).observe(document.querySelector('#creations'), { childList: true });
  });
  assert.equal(await page.evaluate(() => window.__smoke.contexts.length), 0, 'startup stays silent');
  await nativeKey('A');
  await page.waitForFunction(() => window.__smoke.creations === 1).catch(async error => {
    console.error(await page.evaluate(() => ({ hidden: document.hidden, keys: window.__smoke.nativeKeys, domKeys: window.__smoke.domKeys, creations: window.__smoke.creations, contexts: window.__smoke.contexts.length })));
    throw error;
  });
  await page.waitForFunction(() => window.__smoke.contexts[0]?.state === 'running');
  await page.waitForFunction(() => {
    const samples = new Float32Array(512);
    window.__smoke.analyser.getFloatTimeDomainData(samples);
    return samples.some(value => Math.abs(value) > 0.00001);
  });
  const firstInput = await page.evaluate(() => ({
    domKeys: window.__smoke.domKeys,
    keys: window.__smoke.nativeKeys,
    oscillators: window.__smoke.started,
  }));
  assert.equal(firstInput.domKeys, 0, 'browser-default key dispatch is suppressed');
  assert.equal(firstInput.oscillators, 2, 'first key plays one softly layered note');
  assert.deepEqual(firstInput.keys.filter(key => key.type === 'keydown').map(key => key.code), ['KeyA']);
  assert.equal(await page.locator('.creation-key').textContent(), 'A');

  // Unmodified and shortcut keys keep the same page alive and create play.
  const origin = page.url();
  for (const [key, modifiers] of [['Escape', []], ['W', ['control']], ['R', ['control']], ['R', ['meta']], ['F5', []], ['Tab', []], ['Backspace', []]]) {
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => window.__smoke.creations);
    await nativeKey(key, modifiers);
    await page.waitForFunction(value => window.__smoke?.creations > value, before);
    assert.equal(page.url(), origin, `${key} does not navigate`);
  }
  assert.equal(await page.evaluate(() => window.__smoke.domKeys), 0);
  assert.equal(app.windows().length, 1);

  const popup = await page.evaluate(() => window.open('https://example.com'));
  assert.equal(popup, null, 'external windows are denied');
  await page.evaluate(() => { location.href = 'https://example.com'; });
  await page.waitForTimeout(150);
  assert.equal(page.url(), origin, 'external navigation is denied');
  assert.equal(app.windows().length, 1);

  const closed = app.waitForEvent('close', { timeout: 10_000 });
  // Send the main-process native chord as a single event so the test does not
  // leave modifiers held when the application exits midway through key dispatch.
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({
      type: 'keyDown', keyCode: 'Q', modifiers: ['control', 'alt', 'shift'],
    });
  }).catch(error => {
    if (!/closed|destroyed/i.test(error.message)) throw error;
  });
  await closed;
  assert.deepEqual(errors, []);
  console.log('PASS native Electron smoke: offline load, isolated bridge, first-key audio signal, shortcut suppression, blocked external navigation, adult exit.');
} finally {
  clearTimeout(timeout);
  if (app) await app.close().catch(() => {});
  await rm(profile, { recursive: true, force: true });
}
