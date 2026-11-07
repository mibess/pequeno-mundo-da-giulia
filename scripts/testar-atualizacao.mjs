import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const [executable, from, to] = process.argv.slice(2);
if (!executable || !/^\d+\.\d+\.\d+$/.test(from) || !/^\d+\.\d+\.\d+$/.test(to) || from === to) {
  throw new Error('Uso: node scripts/testar-atualizacao.mjs <executável> <versão-instalada> <versão-publicada>');
}
await access(executable);

async function freeLoopbackPort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

const profile = await mkdtemp(join(tmpdir(), 'giulia-update-e2e-'));
const [browserPort, inspectorPort] = await Promise.all([freeLoopbackPort(), freeLoopbackPort()]);
const endpoint = `http://127.0.0.1:${browserPort}`;
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.GIULIA_DEV_URL;
const child = spawn(resolve(executable), [
  '--preview', `--user-data-dir=${profile}`,
  '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${browserPort}`,
  `--inspect=127.0.0.1:${inspectorPort}`,
], { env, stdio: 'ignore' });

let browser;
let latestPID = child.pid;
let startupError;
child.once('error', error => { startupError = error; });

async function connect(previousEndpoint) {
  const until = Date.now() + 75_000;
  let lastError;
  while (Date.now() < until) {
    if (startupError) throw startupError;
    if (!previousEndpoint && child.exitCode !== null) throw new Error(`O aplicativo encerrou com código ${child.exitCode}.`);
    try {
      const info = await (await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1000) })).json();
      if (info.webSocketDebuggerUrl && info.webSocketDebuggerUrl !== previousEndpoint) {
        browser = await chromium.connectOverCDP(info.webSocketDebuggerUrl, { timeout: 3000 });
        const session = await browser.newBrowserCDPSession();
        const { processInfo } = await session.send('SystemInfo.getProcessInfo');
        latestPID = processInfo.find(process => process.type === 'browser')?.id;
        await session.detach();
        const context = browser.contexts()[0];
        const page = context.pages()[0] || await context.waitForEvent('page', { timeout: 7000 });
        page.setDefaultTimeout(10_000);
        await page.locator('#playground').waitFor();
        assert.equal(await page.evaluate(() => window.giulia?.preview), true);
        return { page, websocket: info.webSocketDebuggerUrl };
      }
    } catch (error) {
      lastError = error;
    }
    await delay(300);
  }
  throw new Error(`O aplicativo não abriu a janela esperada após ${previousEndpoint ? 'reiniciar' : 'iniciar'}.`, { cause: lastError });
}

// CDP page.keyboard bypasses Electron's before-input-event. Deliver the key
// through the real native window on this disposable, loopback-only instance.
async function playKey() {
  const url = `http://127.0.0.1:${inspectorPort}/json/list`;
  const targets = await (await fetch(url, { signal: AbortSignal.timeout(4000) })).json();
  const socket = new WebSocket(targets[0].webSocketDebuggerUrl);
  const signal = AbortSignal.timeout(5000);
  try {
    await once(socket, 'open', { signal });
    const reply = once(socket, 'message', { signal });
    socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: {
      returnByValue: true,
      expression: `(() => {
        const electron = process.getBuiltinModule('module').createRequire(process.execPath)('electron');
        const window = electron.BrowserWindow.getAllWindows()[0];
        window.focus();
        window.webContents.focus();
        window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'A' });
        window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'A' });
        return process.pid;
      })()`,
    } }));
    const result = JSON.parse((await reply)[0].data);
    assert.equal(result.result?.result?.value, latestPID, 'tecla enviada ao processo reiniciado');
  } finally {
    socket.close();
  }
}

try {
  const initial = await connect();
  const { page } = initial;
  assert.equal((await page.evaluate(() => window.giulia.updates.getState())).version, from);
  await page.locator('[data-world="ocean"]').click();
  console.log(`Aplicativo ${from} aberto. Aguardando a verificação automática da publicação ${to}.`);
  await page.waitForFunction(async expected => {
    const state = await window.giulia.updates.getState();
    return state.status === 'available' && state.latest === expected;
  }, to, { timeout: 75_000, polling: 500 }).catch(async error => {
    console.error('Estado da verificação automática:', await page.evaluate(() => window.giulia.updates.getState()));
    throw error;
  });

  await page.locator('#parents').hover();
  await page.mouse.down();
  await page.locator('#parent-dialog[open]').waitFor();
  await page.mouse.up();
  console.log('Atualização anunciada. Instalando pela Área dos pais.');
  await page.getByRole('button', { name: 'Atualizar agora', exact: true }).click();

  const oldPID = latestPID;
  const replacement = await connect(initial.websocket);
  assert.notEqual(latestPID, oldPID, 'o próprio aplicativo iniciou um novo processo');
  const runningPath = decodeURIComponent(new URL(replacement.page.url()).pathname);
  assert.ok(runningPath.endsWith(`/giulia-updates-v1/${to}.asar/dist/index.html`), runningPath);
  const state = await replacement.page.evaluate(() => window.giulia.updates.getState());
  assert.equal(state.version, to, 'o código da atualização está em execução');
  assert.equal(await replacement.page.locator('[data-world="ocean"]').getAttribute('aria-pressed'), 'true', 'o mundo escolhido foi preservado');
  await playKey();
  await replacement.page.locator('.creation-key').filter({ hasText: /^A$/ }).first().waitFor();
  const saved = JSON.parse(await readFile(join(profile, 'giulia-updates-v1', 'state.json'), 'utf8'));
  assert.equal(saved.current, to);
  assert.equal(saved.trial, null);
  assert.equal(saved.pending, null);
  console.log(`PASS ${process.platform}/${process.arch}: ${from} → ${to}, aviso automático, instalação, reinício, preferência e tecla A conferidos.`);
} finally {
  // Both process IDs come from the launched test instance. Close the new app
  // before deleting its profile, including when an assertion fails on Windows.
  if (browser?.isConnected()) {
    const session = await browser.newBrowserCDPSession().catch(() => null);
    await session?.send('Browser.close').catch(() => {});
    await browser.close().catch(() => {});
  }
  if (latestPID && latestPID !== child.pid) {
    try { process.kill(latestPID); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  child.kill();
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
}
