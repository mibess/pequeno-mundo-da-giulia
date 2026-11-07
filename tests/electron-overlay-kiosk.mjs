import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createPackage } from '@electron/asar';
import { _electron } from 'playwright';

// Explicit native regression: copy the stock runtime and sign a local fixture
// with an ephemeral key. Neither the actual user's cache nor release keys enter
// this test. A 15-second watchdog always releases its brief kiosk window.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const { UpdateStore } = require('../electron/update-service.cjs');
const temp = fs.mkdtempSync(path.join(tmpdir(), 'giulia-overlay-'));
let application;
let watchdog;
let closed = false;
try {
  const stock = require('electron');
  const template = process.platform === 'darwin' ? path.resolve(stock, '../../..') : path.dirname(stock);
  const bundle = path.join(temp, path.basename(template));
  fs.cpSync(template, bundle, { recursive: true, verbatimSymlinks: true, mode: fs.constants.COPYFILE_FICLONE });
  const resources = path.join(bundle, process.platform === 'darwin' ? 'Contents/Resources' : 'resources');
  const source = path.join(temp, 'fonte');
  fs.mkdirSync(source);
  fs.cpSync(path.join(root, 'dist'), path.join(source, 'dist'), { recursive: true });
  fs.cpSync(path.join(root, 'electron'), path.join(source, 'electron'), { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const testKey = publicKey.export({ format: 'pem', type: 'spki' });
  fs.writeFileSync(path.join(source, 'electron/update-public.pem'), testKey);
  const meta = { name: 'giulia-overlay-fixture', version: '1.1.0', main: 'electron/bootstrap.cjs' };
  const saveMeta = () => fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify(meta));
  saveMeta();
  await createPackage(source, path.join(resources, 'app.asar'));

  for (const immutable of ['bootstrap.cjs', 'update-service.cjs', 'update-public.pem']) fs.unlinkSync(path.join(source, 'electron', immutable));
  meta.main = 'electron/main.cjs';
  meta.version = '1.1.1';
  saveMeta();
  const archive = path.join(temp, 'overlay.asar');
  await createPackage(source, archive);
  const bytes = fs.readFileSync(archive);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const signature = sign(null, Buffer.from(JSON.stringify([meta.version, 1, sha256, bytes.length])), privateKey).toString('base64');
  const profile = path.join(temp, 'perfil 100%');
  const cache = path.join(profile, 'giulia-updates-v1');
  new UpdateStore(cache, '1.1.0', publicKey).stage({ version: meta.version, runtime: 1, sha256, size: bytes.length, signature }, bytes);

  // The stock executable is named Electron even though this fixture has a
  // packaged app.asar. This built-in Electron flag selects packaged semantics.
  const env = { ...process.env, ELECTRON_FORCE_IS_PACKAGED: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  application = await _electron.launch({
    executablePath: path.join(bundle, path.relative(template, stock)),
    args: [`--user-data-dir=${profile}`], env, timeout: 10_000,
  });
  watchdog = setTimeout(() => application.process().kill('SIGKILL'), 15_000);
  application.on('close', () => { closed = true; });
  const page = await application.firstWindow({ timeout: 6_000 });
  page.setDefaultTimeout(5_000);
  await page.locator('#playground').waitFor();
  assert.match(page.url(), /1\.1\.1\.asar\/dist\/index\.html$/);
  assert.equal(await page.evaluate(async () => (await window.giulia.updates.getState()).version), meta.version);
  assert.equal(await application.evaluate(({ app, BrowserWindow }) => app.isPackaged && BrowserWindow.getAllWindows()[0].isKiosk()), true);
  const state = new UpdateStore(cache, '1.1.0', publicKey).state;
  assert.equal(state.current, meta.version, 'renderer of verified overlay acknowledged startup');
  assert.equal(state.trial, null);
  await application.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.focus();
    win.webContents.focus();
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  });
  await page.locator('.creation').waitFor();
  const closing = application.waitForEvent('close', { timeout: 5_000 });
  await application.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Q', modifiers: ['control', 'alt', 'shift'] });
  }).catch(error => { if (!/closed|destroyed/i.test(error.message)) throw error; });
  await closing;
  console.log('PASS real packaged kiosk started signed ASAR from an isolated profile, confirmed UI health, played with Escape and closed with the adult chord.');
} finally {
  if (application && !closed) await application.evaluate(({ app }) => app.exit(1)).catch(() => application.process().kill('SIGKILL'));
  clearTimeout(watchdog);
  fs.rmSync(temp, { recursive: true, force: true });
}
