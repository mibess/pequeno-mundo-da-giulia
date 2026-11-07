'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('giulia', {
  isDesktop: true,
  platform: process.platform,
  preview: process.argv.includes('--giulia-preview'),
  ready: () => ipcRenderer.send('giulia:ready'),
  updates: {
    getState: () => ipcRenderer.invoke('giulia:updates:state'),
    check: () => ipcRenderer.invoke('giulia:updates:check'),
    install: () => ipcRenderer.invoke('giulia:updates:install'),
    onChange(callback) {
      if (typeof callback !== 'function') throw new TypeError('onChange requires a callback.');
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('giulia:updates:change', listener);
      return () => ipcRenderer.removeListener('giulia:updates:change', listener);
    },
  },
  onKey(callback) {
    if (typeof callback !== 'function') throw new TypeError('onKey requires a callback.');
    // Expose the input data only, never the privileged Electron event.
    const listener = (_event, input) => callback(input);
    ipcRenderer.on('giulia:key', listener);
    return () => ipcRenderer.removeListener('giulia:key', listener);
  },
});
