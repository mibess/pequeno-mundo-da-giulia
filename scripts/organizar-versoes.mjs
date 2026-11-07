import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, renameSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const release = join(root, 'release');
const versions = join(release, 'Versões');
const staging = join(release, '.preparo');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = manifest.version;
const title = 'Pequeno Mundo da Giulia';
const appName = `${title}.app`;
const stable = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)';
const artifactPattern = new RegExp(`^Giulia-(mac|win)-(arm64|x64)-(${stable})\\.zip(\\.blockmap)?$`);
const currentPattern = new RegExp(`^Versões/(${stable})$`);
const migrate = process.argv.slice(2).includes('--migrar');
const nativeDir = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
const currentLink = join(release, 'Atual');
const openLink = join(root, 'ABRIR AQUI');
const versionDir = join(versions, version);
const destinationApp = join(versionDir, 'Neste Mac', appName);
const stat = path => lstatSync(path, { throwIfNoEntry: false });
const reportPath = path => relative(root, path);

// Inspect every parent, including already-existing ones. A directory symlink must
// never allow a move or cleanup to escape the project.
function directory(path) {
  if (path === root) return;
  directory(dirname(path));
  const existing = stat(path);
  if (!existing) mkdirSync(path);
  else if (!existing.isDirectory()) throw new Error(`Pasta esperada em ${reportPath(path)}. O item existente foi preservado.`);
}

function validLink(path, pattern) {
  const existing = stat(path);
  if (!existing) return null;
  if (existing.isSymbolicLink()) {
    const target = readlinkSync(path);
    if (pattern.test(target)) return target;
  }
  throw new Error(`O item ${reportPath(path)} já existe e não é um atalho gerenciado. Ele foi preservado.`);
}

function updateLink(path, target, pattern) {
  if (validLink(path, pattern) === target) return;
  const temp = `${path}.${randomUUID()}.tmp`;
  symlinkSync(target, temp, 'dir');
  try { renameSync(temp, path); }
  finally { if (stat(temp)) unlinkSync(temp); }
}

function bundleVersion(path) {
  if (!stat(path)?.isDirectory()) throw new Error(`Aplicativo inválido em ${reportPath(path)}.`);
  const plist = join(path, 'Contents', 'Info.plist');
  const value = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', plist], { encoding: 'utf8' }).trim();
  if (value('CFBundleIdentifier') !== manifest.build.appId || !stat(join(path, 'Contents', 'MacOS', title))?.isFile()) {
    throw new Error(`O aplicativo em ${reportPath(path)} não corresponde ao projeto.`);
  }
  return value('CFBundleShortVersionString');
}

function requireClosed(path) {
  const binary = join(path, 'Contents', 'MacOS', title);
  const check = spawnSync('/usr/sbin/lsof', ['-n', '-P', '-t', binary], { encoding: 'utf8' });
  if (check.status === 1 && !check.stdout && !check.stderr) return;
  if (check.status === 0 && check.stdout) throw new Error(`Feche ${reportPath(path)} e execute o organizador novamente.`);
  throw new Error(`Não foi possível verificar se ${reportPath(path)} está aberto.`);
}

function collectArchives(source) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const match = artifactPattern.exec(entry.name);
    if (!match || !entry.isFile()) continue;
    const [, platform, , foundVersion, blockmap] = match;
    if (!migrate && foundVersion !== version) continue;
    const folder = join(versions, foundVersion, platform === 'mac' ? 'Mac' : 'Windows', ...(blockmap ? ['.metadados'] : []));
    directory(folder);
    const from = join(source, entry.name);
    const to = join(folder, entry.name);
    if (!stat(from).size) throw new Error(`Arquivo vazio em ${reportPath(from)}.`);
    const existing = stat(to);
    if (existing) throw new Error(`Já existe ${reportPath(to)}. Para publicar uma recompilação, aumente a versão no package.json. Os dois arquivos foram preservados.`);
    renameSync(from, to);
    console.log(reportPath(to));
  }
}

function collectNativeApp(source) {
  if (process.platform !== 'darwin') return;
  const rawDir = join(source, nativeDir);
  if (stat(rawDir) && !stat(rawDir).isDirectory()) throw new Error(`Pasta inválida em ${reportPath(rawDir)}.`);
  const from = join(rawDir, appName);
  if (!stat(from)) return;
  const foundVersion = bundleVersion(from);
  if (foundVersion !== version) {
    console.log(`Aplicativo de preparo da versão ${foundVersion} preservado. A versão do projeto é ${version}.`);
    return;
  }
  directory(dirname(destinationApp));
  if (stat(destinationApp)) throw new Error(`Já existe ${reportPath(destinationApp)}. Para publicar uma recompilação, aumente a versão no package.json. Os dois aplicativos foram preservados.`);
  requireClosed(from);
  renameSync(from, destinationApp);
  console.log(reportPath(destinationApp));
}

function moveLegacyBuildFiles() {
  const buildFolders = ['mac', 'mac-arm64', 'win-unpacked', 'win-arm64-unpacked', '.icon-ico'];
  for (const name of [...buildFolders, 'builder-debug.yml']) {
    const from = join(release, name);
    const to = join(staging, name);
    const existing = stat(from);
    if (!existing) continue;
    if (stat(to) || !(buildFolders.includes(name) ? existing.isDirectory() : existing.isFile())) {
      console.log(`Item preservado em ${reportPath(from)}. O destino já existe ou o tipo é inesperado.`);
      continue;
    }
    const bundle = join(from, appName);
    if (process.platform === 'darwin' && name.startsWith('mac') && stat(bundle)) requireClosed(bundle);
    renameSync(from, to);
  }
}

function newer(left, right) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  const firstDiff = a.findIndex((value, index) => value !== b[index]);
  return firstDiff >= 0 && a[firstDiff] > b[firstDiff];
}

function promoteCompleteVersion() {
  const missing = [];
  for (const platform of ['mac', 'win']) {
    const folder = join(versionDir, platform === 'mac' ? 'Mac' : 'Windows');
    if (stat(folder) && !stat(folder).isDirectory()) throw new Error(`Pasta inválida em ${reportPath(folder)}.`);
    for (const arch of ['arm64', 'x64']) {
      const name = `Giulia-${platform}-${arch}-${version}.zip`;
      const item = stat(join(folder, name));
      if (!item?.isFile() || !item.size) missing.push(name);
    }
  }
  const localFolder = dirname(destinationApp);
  if (stat(localFolder) && !stat(localFolder).isDirectory()) throw new Error(`Pasta inválida em ${reportPath(localFolder)}.`);
  if (!stat(destinationApp)?.isDirectory()) missing.push(appName);
  if (missing.length) {
    console.log(`Versão ${version} parcial. Faltam ${missing.join(', ')}. O atalho Atual foi mantido.`);
    return;
  }
  if (process.platform !== 'darwin') {
    console.log('Pacotes organizados. Finalize a promoção dos atalhos no Mac.');
    return;
  }
  if (readdirSync(localFolder).some(name => name !== appName && name !== '.DS_Store')) {
    throw new Error(`Há outros itens em ${reportPath(localFolder)}. Confira a pasta antes de promover a versão.`);
  }
  if (bundleVersion(destinationApp) !== version) throw new Error(`A versão do aplicativo não corresponde a ${version}.`);
  const currentTarget = validLink(currentLink, currentPattern);
  if (currentTarget && newer(basename(currentTarget), version)) {
    console.log(`A versão ${version} foi arquivada. Atual continua apontando para ${basename(currentTarget)}.`);
    return;
  }
  updateLink(currentLink, `Versões/${version}`, currentPattern);
  updateLink(openLink, 'release/Atual/Neste Mac', /^release\/Atual\/Neste Mac$/);
  console.log(`Versão atual ${version}. Abra “ABRIR AQUI” na pasta do projeto.`);
}

async function organize() {
  if (!new RegExp(`^${stable}$`).test(version)) throw new Error('Use uma versão estável no formato 1.2.3.');
  if (process.argv.slice(2).some(arg => arg !== '--migrar')) throw new Error('O único argumento aceito é --migrar.');
  directory(staging);
  const lock = join(staging, '.organizando.lock');
  try { mkdirSync(lock); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error(`Outro organizador está em execução. Se a execução anterior foi interrompida, remova a pasta vazia ${reportPath(lock)} e tente novamente.`);
  }
  try {
    directory(versionDir);
    validLink(currentLink, currentPattern);
    validLink(openLink, /^release\/Atual\/Neste Mac$/);
    const source = migrate ? release : staging;
    collectNativeApp(source);
    collectArchives(source);
    if (migrate) moveLegacyBuildFiles();
    promoteCompleteVersion();
  } finally { rmdirSync(lock); }
}

organize().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
