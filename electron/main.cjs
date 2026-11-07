'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, dialog, globalShortcut, Menu, powerMonitor, screen, session } = require('electron');
const { EXIT_ACCELERATOR, isExitShortcut, normalizeKey, resolveDevURL } = require('./input-policy.cjs');
const { followKioskDisplay } = require('./windows-kiosk.cjs');

// The synthesizer is created only on a real first input in the renderer. Relayed
// desktop keyboard events arrive over IPC and do not grant a DOM user gesture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const preview = process.argv.includes('--preview');
let mainWindow = null;
let quitting = false;
let devURL = null;

function releaseWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
  }
}

function quitSafely() {
  if (quitting) return;
  quitting = true;
  releaseWindow();
  globalShortcut.unregisterAll();
  app.quit();
}

function failSafely(message) {
  if (quitting) return;
  releaseWindow();
  dialog.showErrorBox('Giulia — não foi possível abrir', message);
  quitSafely();
}

module.exports = function startDesktop(runtime) {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    devURL = resolveDevURL(process.env.GIULIA_DEV_URL, app.isPackaged);
    Menu.setApplicationMenu(null);

    // Never enter kiosk mode unless a system-wide adult exit is available.
    const registered = globalShortcut.register(EXIT_ACCELERATOR, quitSafely);
    if (!registered && !preview) {
      failSafely('O atalho Control + Alt + Shift + Q está sendo usado por outro aplicativo. Feche esse aplicativo e tente novamente. A tela não foi bloqueada.');
      return;
    }

    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on('will-download', (event) => event.preventDefault());
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (details, callback) => {
        const requested = new URL(details.url);
        const allowed = devURL && requested.host === new URL(devURL).host &&
          ['http:', 'ws:'].includes(requested.protocol);
        callback({ cancel: !allowed });
      },
    );

    const windowsDisplay = process.platform === 'win32' && !preview
      ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
      : null;

    mainWindow = new BrowserWindow({
      title: 'Giulia — um mundo de descobertas',
      ...(windowsDisplay?.bounds ?? { width: 1440, height: 960, minWidth: 960, minHeight: 640 }),
      show: false,
      frame: preview,
      backgroundColor: '#fbf8f1',
      autoHideMenuBar: true,
      resizable: preview || Boolean(windowsDisplay),
      minimizable: preview,
      maximizable: preview,
      fullscreenable: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true,
        webviewTag: false,
        devTools: preview,
        // Keyboard input is relayed through IPC after Chromium defaults are blocked.
        // Permit the offline synthesizer to start on that first relayed interaction.
        autoplayPolicy: 'no-user-gesture-required',
        additionalArguments: preview ? ['--giulia-preview'] : [],
      },
    });

    const localPage = path.join(__dirname, '..', 'dist', 'index.html');
    const pageURL = devURL ?? pathToFileURL(localPage).href;
    runtime.connect(mainWindow, pageURL, quitSafely);

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    mainWindow.webContents.on('will-frame-navigate', (event) => event.preventDefault());
    mainWindow.webContents.on('will-redirect', (event) => event.preventDefault());
    mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
    mainWindow.webContents.on('context-menu', (event) => event.preventDefault());
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // This also suppresses browser commands such as reload, zoom, Escape and Tab.
      event.preventDefault();
      if (isExitShortcut(input)) {
        quitSafely();
        return;
      }
      const key = normalizeKey(input);
      if (key && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send('giulia:key', key);
    });

    mainWindow.on('close', (event) => {
      if (!preview && !quitting) event.preventDefault();
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.on('leave-full-screen', () => {
      if (!preview && !quitting && mainWindow && !mainWindow.isDestroyed()) mainWindow.setKiosk(true);
    });
    const recoverOrQuit = () => { if (!runtime.recoverBeforeReady()) quitSafely(); };
    mainWindow.on('unresponsive', recoverOrQuit);
    mainWindow.webContents.on('render-process-gone', recoverOrQuit);
    mainWindow.on('query-session-end', () => { quitting = true; });
    powerMonitor.on('shutdown', () => {
      quitting = true;
      releaseWindow();
      globalShortcut.unregisterAll();
    });

    mainWindow.once('ready-to-show', () => {
      if (!mainWindow || quitting) return;
      if (!preview) {
        // The floating level is below the taskbar on Windows.
        mainWindow.setAlwaysOnTop(true, windowsDisplay ? 'pop-up-menu' : 'floating');
        mainWindow.setKiosk(true);
        if (windowsDisplay) followKioskDisplay(mainWindow, screen, windowsDisplay.id);
      }
      mainWindow.show();
      mainWindow.focus();
    });

    await mainWindow.loadURL(pageURL);
  }).catch((error) => { if (!runtime.recoverBeforeReady()) failSafely(error.message); });

  app.on('before-quit', (event) => {
    if (!preview && !quitting) event.preventDefault();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => {
    quitting = true;
    app.quit();
  });

  // Development and host shutdown retain a clean, non-interactive way to stop.
  process.on('SIGINT', quitSafely);
  process.on('SIGTERM', quitSafely);
};
