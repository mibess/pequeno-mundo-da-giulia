'use strict';

// This is the installed entry point. A downloaded ASAR supplies the playground
// and desktop window, but never replaces this bootstrap, updater or public key.
const path = require('node:path');
const fs = require('node:fs');
const { app, ipcMain } = require('electron');
const { UpdateService, UpdateStore } = require('./update-service.cjs');

if (!app.requestSingleInstanceLock()) app.exit(0);
else start();

function start() {
  const bundledRoot = path.dirname(__dirname);
  const bundled = require(path.join(bundledRoot, 'package.json')).version;
  let store = null;
  let selection = { version: bundled, archive: null, trial: false };
  if (app.isPackaged && ['darwin', 'win32'].includes(process.platform)) {
    try {
      const key = fs.readFileSync(path.join(__dirname, 'update-public.pem'), 'utf8');
      store = new UpdateStore(path.join(app.getPath('userData'), 'giulia-updates-v1'), bundled, key);
      selection = store.select();
    } catch {
      // A missing/unwritable cache must never stop offline play.
      store = null;
    }
  }

  let window;
  let quitForRestart;
  let expectedURL;
  let healthy = false;
  let recovering = false;
  let healthTimer;
  const service = new UpdateService({
    version: selection.version, store,
    onChange(state) {
      if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send('giulia:updates:change', state);
    },
    restart() {
      app.relaunch();
      quitForRestart();
    },
  });

  function allowed(event) {
    if (!window || window.isDestroyed() || event.sender !== window.webContents) return false;
    const frame = event.senderFrame;
    return frame && frame === window.webContents.mainFrame && frame.url === expectedURL;
  }

  function recoverBeforeReady() {
    if (!selection.archive || healthy) return false;
    if (recovering) return true;
    recovering = true;
    clearTimeout(healthTimer);
    try {
      store.reject(selection.version);
      app.relaunch();
    } finally { app.exit(1); }
    return true;
  }

  ipcMain.on('giulia:ready', event => {
    if (healthy || recovering || !allowed(event)) return;
    if (selection.trial) {
      try { store.acknowledge(selection.version); }
      catch { recoverBeforeReady(); return; }
    }
    healthy = true;
    clearTimeout(healthTimer);
    if (store) {
      setTimeout(() => service.check(), 2_000).unref();
      setInterval(() => service.check(), 6 * 60 * 60 * 1000).unref();
    }
  });

  const actions = { state: () => service.state, check: () => service.check(), install: () => service.install() };
  for (const [name, action] of Object.entries(actions)) {
    ipcMain.handle(`giulia:updates:${name}`, event => {
      if (!allowed(event)) throw new Error('Janela de atualização inválida.');
      return action();
    });
  }

  const root = selection.archive || bundledRoot;
  try {
    if (selection.archive) {
      const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      if (metadata.version !== selection.version) throw new Error('A versão do pacote não corresponde à assinatura.');
      healthTimer = setTimeout(recoverBeforeReady, 45_000);
      healthTimer.unref();
    }
    require(path.join(root, 'electron', 'main.cjs'))({
      connect(win, url, quit) { window = win; expectedURL = url; quitForRestart = quit; },
      recoverBeforeReady,
    });
  } catch (error) {
    if (!recoverBeforeReady()) throw error;
  }
}
