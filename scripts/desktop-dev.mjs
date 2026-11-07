import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:5173';
let electron;
let stopping = false;
const env = { ...process.env, GIULIA_DEV_URL: url };
delete env.ELECTRON_RUN_AS_NODE;
const vite = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'inherit', env });

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  electron?.kill();
  vite.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
vite.on('error', (error) => { console.error(error.message); stop(1); });
vite.on('exit', (code) => { if (!stopping) stop(code || 1); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !stopping; attempt += 1) {
    await delay(200);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.ok && vite.exitCode === null) { ready = true; break; }
    } catch { /* Vite is still starting. */ }
  }
  if (!ready && !stopping) throw new Error('O servidor de desenvolvimento não iniciou.');
  if (!stopping) {
    electron = spawn(require('electron'), [root, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit', env });
    electron.on('error', (error) => { console.error(error.message); stop(1); });
    electron.on('exit', (code) => stop(code || 0));
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
