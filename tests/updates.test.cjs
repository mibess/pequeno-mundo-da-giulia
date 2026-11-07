'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash, generateKeyPairSync, sign } = require('node:crypto');
const { UpdateStore, UpdateService, verifyManifest, fetchBytes, allowedURL } = require('../electron/update-service.cjs');

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const bytes = Buffer.from('conteúdo de teste');
function manifest(version, payload = bytes, runtime = 1) {
  const sha256 = createHash('sha256').update(payload).digest('hex');
  const size = payload.length;
  const signature = sign(null, Buffer.from(JSON.stringify([version, runtime, sha256, size])), privateKey).toString('base64');
  return { version, runtime, sha256, size, signature };
}
function storeAt(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'giulia-atualizacoes-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return () => new UpdateStore(dir, '1.1.0', publicKey);
}

// This transport is injected by the test only. Production has no command-line,
// environment or renderer setting for changing either the feed or its trust key.
async function fixture(t, { archive = bytes, descriptor = manifest('1.1.1') } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/manifest') return res.writeHead(302, { Location: '/signed' }).end();
    if (req.url === '/signed') return res.end(JSON.stringify(descriptor));
    if (req.url === '/large') return res.end('0123456789');
    if (req.url === '/escape') return res.writeHead(302, { Location: 'http://example.invalid/private' }).end();
    res.end(archive);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const read = (name, max, progress) => fetchBytes(`${origin}/${name}`, max, progress, url => url.origin === origin);
  return { requests, read, download(url, max, progress) {
    return read(url.endsWith('.json') ? 'manifest' : 'archive', max, progress);
  } };
}

test('local signed feed installs once, restarts and commits only after renderer readiness', async t => {
  const open = storeAt(t);
  const feed = await fixture(t);
  const states = [];
  let restarts = 0;
  const service = new UpdateService({ store: open(), version: '1.1.0', download: feed.download,
    onChange: state => states.push(state), restart: () => { restarts++; } });
  await Promise.all([service.check(), service.check()]);
  assert.equal(service.state.status, 'available');
  await Promise.all([service.install(), service.install()]);
  assert.deepEqual(feed.requests, ['/manifest', '/signed', '/archive']);
  assert.equal(restarts, 1);
  assert.equal(service.state.status, 'restarting');
  assert.ok(states.some(state => state.progress === 100));
  assert.equal(open().state.current, null);
  const nextLaunch = open();
  assert.equal(nextLaunch.select().trial, true);
  assert.equal(nextLaunch.state.trial, '1.1.1');
  nextLaunch.acknowledge('1.1.1');
  assert.equal(open().select().version, '1.1.1');
  assert.equal(open().state.pending, null);
  assert.equal(open().state.trial, null);
});

test('a crash during a new trial restores the last healthy release and rejects replay', t => {
  const open = storeAt(t);
  let store = open();
  for (const version of ['1.1.1', '1.1.2']) {
    store.stage(manifest(version), bytes);
    store = open();
    assert.equal(store.select().version, version);
    store.acknowledge(version);
  }
  store.stage(manifest('1.1.3'), bytes);
  assert.equal(open().select().trial, true);
  // Process died before acknowledgement. The next bootstrap must not retry it.
  store = open();
  assert.equal(store.select().version, '1.1.2');
  assert.equal(store.state.trial, null);
  assert.throws(() => store.stage(manifest('1.1.3'), bytes));
  assert.throws(() => store.stage(manifest('1.1.1'), bytes));
  fs.writeFileSync(store.archive('1.1.2'), Buffer.alloc(bytes.length));
  assert.equal(open().select().version, '1.1.1', 'rehashes the running archive every launch');
  fs.writeFileSync(store.archive('1.1.1'), Buffer.alloc(bytes.length));
  assert.equal(open().select().archive, null, 'bundled app survives corruption of both overlays');
});

test('forged manifests, corrupt downloads and incompatible releases never activate', async t => {
  const open = storeAt(t);
  const legit = manifest('1.1.1');
  assert.throws(() => verifyManifest({ ...legit, version: '1.1.2' }, publicKey));
  assert.throws(() => verifyManifest({ ...legit, version: '../outside' }, publicKey));
  assert.throws(() => verifyManifest(legit, generateKeyPairSync('ed25519').publicKey));
  const store = open();
  const broken = await fixture(t, { archive: Buffer.alloc(bytes.length) });
  const service = new UpdateService({ store, version: '1.1.0', download: broken.download,
    onChange() {}, restart: () => assert.fail('cannot restart with invalid bytes') });
  await service.check();
  await service.install();
  assert.equal(service.state.status, 'error');
  assert.equal(open().state.pending, null);
  const newerRuntime = manifest('1.2.0', bytes, 2);
  service.download = async () => Buffer.from(JSON.stringify(newerRuntime));
  assert.equal((await service.check()).status, 'unsupported');
  assert.throws(() => store.stage(newerRuntime, bytes));
  assert.equal(open().select().version, '1.1.0');
});

test('downloads enforce bounds and exact HTTPS allowlist at each redirect', async t => {
  const feed = await fixture(t);
  await assert.rejects(feed.read('large', 5));
  await assert.rejects(feed.read('escape', 100), /Destino/);
  for (const address of ['http://github.com/file', 'https://github.com.evil.test/file', 'https://github.com:444/file', 'https://user@github.com/file']) {
    assert.equal(allowedURL(new URL(address)), false);
  }
  assert.equal(allowedURL(new URL('https://release-assets.githubusercontent.com/file')), true);
});
