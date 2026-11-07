import { createPackage } from '@electron/asar';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { name, productName, version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const stableVersion = /^(?:0|[1-9]\d{0,8})(?:\.(?:0|[1-9]\d{0,8})){2}$/;
if (!stableVersion.test(version)) throw new Error('Use uma versão estável, como 1.2.3.');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('A tag precisa corresponder à versão em package.json.');
}
const runtime = 1;
const sizeLimit = 32 * 1024 * 1024;
const archiveName = `giulia-app-${version}.asar`;
const manifestName = 'giulia-update.json';
const feed = join(root, 'release', 'feed');
const publicKey = createPublicKey(await readFile(join(root, 'electron', 'update-public.pem')));
if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('A chave pública deve ser Ed25519.');

const args = process.argv.slice(2);
const verifyOnly = args[0] === '--verify';
if (args.length && (!verifyOnly || args.length > 2)) {
  throw new Error('Uso: node scripts/preparar-atualizacao.mjs [--verify [pasta]]');
}
const signedBytes = (manifest) => Buffer.from(JSON.stringify([
  manifest.version, manifest.runtime, manifest.sha256, manifest.size,
]));

async function stageFile(relative, dest) {
  const input = join(root, relative);
  const output = join(dest, relative);
  const stat = await lstat(input);
  if (stat.isDirectory()) {
    await mkdir(output, { recursive: true });
    for (const entry of (await readdir(input)).sort()) {
      if (entry === '.DS_Store') continue;
      if (entry.startsWith('.')) throw new Error(`Arquivo oculto inesperado em ${relative}/${entry}.`);
      await stageFile(join(relative, entry), dest);
    }
  } else if (stat.isFile()) {
    await mkdir(dirname(output), { recursive: true });
    await copyFile(input, output);
    await chmod(output, 0o644);
  } else {
    throw new Error(`Somente arquivos locais regulares podem entrar no pacote: ${relative}.`);
  }
}

async function verifyAssets(directory, expectedArchive) {
  const manifest = JSON.parse(await readFile(join(directory, manifestName), 'utf8'));
  const signature = Buffer.from(manifest.signature || '', 'base64');
  if (manifest.version !== version || manifest.runtime !== runtime ||
      manifest.size !== expectedArchive.length ||
      manifest.sha256 !== createHash('sha256').update(expectedArchive).digest('hex') ||
      signature.length !== 64 || signature.toString('base64') !== manifest.signature ||
      !verify(null, signedBytes(manifest), publicKey, signature)) {
    throw new Error('A versão, o conteúdo ou a assinatura do manifesto não correspondem a esta compilação.');
  }
  const archive = await readFile(join(directory, archiveName));
  if (!archive.equals(expectedArchive)) throw new Error('O ASAR assinado difere dos arquivos gerados para esta versão.');
}

const workspace = await mkdtemp(join(tmpdir(), 'giulia-update-build-'));
let pending;
try {
  const stage = join(workspace, 'app');
  await mkdir(stage);
  await stageFile('dist', stage);
  if (!(await lstat(join(stage, 'dist', 'index.html'))).isFile()) throw new Error('Gere a interface com npm run build.');
  // Only the updatable process and renderer are shipped. Bootstrap and trust
  // material always come from the original native installation.
  for (const file of ['main.cjs', 'input-policy.cjs', 'preload.cjs', 'windows-kiosk.cjs']) {
    await stageFile(join('electron', file), stage);
  }
  const metadata = { name, productName, version, main: 'electron/main.cjs', type: 'module' };
  await writeFile(join(stage, 'package.json'), JSON.stringify(metadata, null, 2) + '\n', { mode: 0o644 });
  const archivePath = join(workspace, archiveName);
  await createPackage(stage, archivePath);
  const expectedArchive = await readFile(archivePath);
  if (!expectedArchive.length || expectedArchive.length > sizeLimit) throw new Error('O pacote excede o limite de 32 MiB.');

  if (verifyOnly) {
    const directory = args[1] ? resolve(args[1]) : join(root, 'updates', version);
    await verifyAssets(directory, expectedArchive);
    console.log(`Assinatura e conteúdo da atualização ${version} conferidos com esta compilação.`);
  } else {
    const keyfile = process.env.GIULIA_UPDATE_KEY || join(root, '.release-keys', 'update-private.pem');
    const privateKey = createPrivateKey(await readFile(keyfile));
    if (privateKey.asymmetricKeyType !== 'ed25519' || !createPublicKey(privateKey).equals(publicKey)) {
      throw new Error('A chave privada não corresponde à chave de atualização deste aplicativo.');
    }
    const sha256 = createHash('sha256').update(expectedArchive).digest('hex');
    const manifest = { version, runtime, sha256, size: expectedArchive.length };
    manifest.signature = sign(null, signedBytes(manifest), privateKey).toString('base64');
    await mkdir(feed, { recursive: true });
    pending = await mkdtemp(join(feed, '.preparando-'));
    await copyFile(archivePath, join(pending, archiveName));
    await writeFile(join(pending, manifestName), JSON.stringify(manifest, null, 2) + '\n');
    await verifyAssets(pending, expectedArchive);
    const destination = join(feed, version);
    try {
      // Atomically expose both files together. An existing complete version
      // may be reproduced, but never overwritten with a different payload.
      await rename(pending, destination);
      pending = undefined;
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      await verifyAssets(destination, expectedArchive);
    }
    console.log(`Atualização pronta em release/feed/${version}/ (${basename(archivePath)}, ${manifest.size} bytes).`);
  }
} finally {
  if (pending) await rm(pending, { recursive: true, force: true });
  await rm(workspace, { recursive: true, force: true });
}
