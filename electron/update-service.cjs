'use strict';

const path = require('node:path');
const { createHash, randomUUID, verify } = require('node:crypto');
const fs = process.versions.electron ? require('original-fs') : require('node:fs');

const RUNTIME = 1;
const MAX_ASAR = 32 * 1024 * 1024;
const MAX_MANIFEST = 16 * 1024;
const RELEASES = 'https://github.com/mibess/pequeno-mundo-da-giulia/releases';
const MANIFEST_URL = `${RELEASES}/latest/download/giulia-update.json`;
const assetURL = version => `${RELEASES}/download/v${version}/giulia-app-${version}.asar`;
const stable = /^(?:0|[1-9]\d{0,8})\.(?:0|[1-9]\d{0,8})\.(?:0|[1-9]\d{0,8})$/;
const allowedHosts = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com']);
const allowedURL = url => url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname);

function compare(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  return left.map((n, i) => n - right[i]).find(n => n !== 0) || 0;
}

function verifyManifest(data, publicKey) {
  const { version, runtime, sha256, size, signature } = data ?? {};
  if (typeof version !== 'string' || !stable.test(version) || !Number.isSafeInteger(runtime) || runtime < 1 ||
      !Number.isSafeInteger(size) || size < 1 || size > MAX_ASAR || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256) ||
      typeof signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) {
    throw new Error('Manifesto de atualização inválido.');
  }
  const canonical = Buffer.from(JSON.stringify([version, runtime, sha256, size]));
  if (!verify(null, canonical, publicKey, Buffer.from(signature, 'base64'))) throw new Error('Assinatura de atualização inválida.');
  return { version, runtime, sha256, size, signature };
}

function verifyPayload(bytes, manifest) {
  if (bytes.length !== manifest.size || createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) {
    throw new Error('O arquivo de atualização não corresponde à assinatura.');
  }
}

// A production request can use only the GitHub release host and its known CDN
// redirects. Tests can inject a transport for an isolated, signed fixture feed.
async function fetchBytes(url, limit, onBytes, permitURL = allowedURL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), onBytes ? 120_000 : 12_000);
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      const location = new URL(url);
      if (!permitURL(location)) throw new Error('Destino de atualização inválido.');
      const response = await fetch(location, {
        signal: controller.signal, redirect: 'manual', cache: 'no-store',
        headers: { Accept: 'application/octet-stream', 'User-Agent': 'Pequeno-Mundo-da-Giulia-Updater' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get('location');
        await response.body?.cancel();
        if (!next) throw new Error('Redirecionamento inválido.');
        url = new URL(next, location).href;
        continue;
      }
      if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit) {
        throw new Error('Não foi possível ler a atualização.');
      }
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > limit) throw new Error('Arquivo de atualização muito grande.');
        chunks.push(chunk);
        onBytes?.(size);
      }
      return Buffer.concat(chunks, size);
    }
    throw new Error('Limite de redirecionamentos excedido.');
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function atomicWrite(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, data, { flag: 'wx', mode: 0o600, flush: true });
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
}

function readBounded(file, limit) {
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.size > limit) throw new Error('Arquivo de atualização inválido.');
  return fs.readFileSync(file);
}

class UpdateStore {
  constructor(dir, bundled, publicKey) {
    this.dir = dir;
    this.bundled = bundled;
    this.publicKey = publicKey;
    this.stateFile = path.join(dir, 'state.json');
    this.state = { current: null, previous: null, pending: null, trial: null, highest: bundled };
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    let stored;
    try { stored = JSON.parse(readBounded(this.stateFile, MAX_MANIFEST)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stored) {
      for (const key of Object.keys(this.state)) {
        if (typeof stored[key] === 'string' && stable.test(stored[key])) this.state[key] = stored[key];
      }
    }
  }

  save(changes) {
    const next = { ...this.state, ...changes };
    atomicWrite(this.stateFile, JSON.stringify(next));
    this.state = next;
  }

  archive(version) { return path.join(this.dir, `${version}.asar`); }

  verifiedArchive(version) {
    if (!stable.test(version) || compare(version, this.bundled) <= 0) throw new Error('Versão de atualização inválida.');
    const manifest = verifyManifest(JSON.parse(readBounded(path.join(this.dir, `${version}.json`), MAX_MANIFEST)), this.publicKey);
    if (manifest.version !== version || manifest.runtime !== RUNTIME) throw new Error('Atualização incompatível.');
    const file = this.archive(version);
    verifyPayload(readBounded(file, manifest.size), manifest);
    return file;
  }

  // Before loading a new ASAR, persist the trial marker. A crash or power loss
  // before renderer readiness leaves the previous working release available.
  select() {
    if (this.state.trial) this.save({ trial: null, pending: null });
    const pending = this.state.pending;
    if (pending && (pending !== this.state.highest || compare(pending, this.state.current || this.bundled) <= 0)) {
      this.save({ pending: null });
    }
    for (const [slot, version] of Object.entries({ pending: this.state.pending, current: this.state.current, previous: this.state.previous })) {
      if (!version || compare(version, this.bundled) <= 0) continue;
      let archive;
      try { archive = this.verifiedArchive(version); }
      catch { this.save({ [slot]: null }); continue; }
      if (slot === 'pending') this.save({ trial: version });
      if (slot === 'previous') this.save({ current: version, previous: null });
      return { version, archive, trial: slot === 'pending' };
    }
    return { version: this.bundled, archive: null, trial: false };
  }

  acknowledge(version) {
    if (this.state.trial !== version) return;
    this.save({ previous: this.state.current, current: version, pending: null, trial: null });
  }

  reject(version) {
    if (this.state.trial === version) this.save({ pending: null, trial: null });
    else if (this.state.current === version) this.save({ current: this.state.previous, previous: null });
  }

  stage(manifest, bytes) {
    manifest = verifyManifest(manifest, this.publicKey);
    if (manifest.runtime !== RUNTIME || compare(manifest.version, this.state.highest) <= 0 || compare(manifest.version, this.bundled) <= 0) {
      throw new Error('Atualização incompatível ou anterior à instalada.');
    }
    verifyPayload(bytes, manifest);
    atomicWrite(this.archive(manifest.version), bytes);
    atomicWrite(path.join(this.dir, `${manifest.version}.json`), JSON.stringify(manifest));
    this.save({ pending: manifest.version, trial: null, highest: manifest.version });
  }
}

class UpdateService {
  constructor({ store, version, onChange, restart, download = fetchBytes }) {
    Object.assign(this, { store, version, onChange, restart, download });
    this.state = { status: store ? 'idle' : 'unsupported', version };
    this.available = null;
    this.busy = null;
  }

  set(status, fields = {}) {
    this.state = { status, version: this.version, ...fields };
    this.onChange(this.state);
    return this.state;
  }

  check() {
    if (!this.store || this.state.status === 'restarting') return Promise.resolve(this.state);
    if (this.busy) return this.busy;
    this.busy = this.checkFeed().finally(() => { this.busy = null; });
    return this.busy;
  }

  async checkFeed() {
    this.set('checking');
    this.available = null;
    try {
      const bytes = await this.download(MANIFEST_URL, MAX_MANIFEST);
      const manifest = verifyManifest(JSON.parse(bytes), this.store.publicKey);
      const latest = manifest.version;
      if (compare(latest, this.version) <= 0) return this.set('current');
      if (manifest.runtime !== RUNTIME) return this.set('unsupported', { latest, message: 'Esta versão precisa de um novo aplicativo para computador.' });
      if (compare(latest, this.store.state.highest) <= 0) return this.set('error', { message: 'A atualização anterior não abriu. A versão recuperada está em uso.' });
      this.available = manifest;
      return this.set('available', { latest });
    } catch {
      return this.set('error', { message: 'Não foi possível verificar a atualização. Você pode continuar brincando e tentar novamente.' });
    }
  }

  install() {
    if (this.busy) return this.busy;
    if (!this.available || this.state.status === 'restarting') return Promise.resolve(this.state);
    this.busy = this.installAvailable().finally(() => { this.busy = null; });
    return this.busy;
  }

  async installAvailable() {
    const manifest = this.available;
    const latest = manifest.version;
    this.set('downloading', { latest, progress: 0 });
    try {
      const bytes = await this.download(assetURL(latest), manifest.size, count => {
        const progress = Math.min(100, Math.floor(count * 100 / manifest.size));
        if (progress !== this.state.progress) this.set('downloading', { latest, progress });
      });
      this.store.stage(manifest, bytes);
      this.available = null;
      this.set('restarting', { latest });
      this.restart();
      return this.state;
    } catch {
      return this.set('error', { latest, message: 'Não foi possível instalar a atualização. A brincadeira continua na versão atual.' });
    }
  }
}

module.exports = { RUNTIME, UpdateService, UpdateStore, verifyManifest, verifyPayload, fetchBytes, allowedURL };
