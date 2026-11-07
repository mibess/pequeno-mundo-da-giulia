import { createHash, randomUUID } from 'node:crypto';
import { existsSync, linkSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { setupBrowserControls } from './browser-controls.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = realpathSync(join(root, 'dist'));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version)) throw new Error('Versão inválida.');

function asset(folder, name) {
  if (!/^(?:\.\/)?[\w./-]+$/.test(name) || name.startsWith('/') || name.split('/').includes('..')) {
    throw new Error(`Referência de arquivo não suportada: ${name}`);
  }
  const path = realpathSync(resolve(folder, name));
  if (!path.startsWith(dist + sep) || !lstatSync(path).isFile()) throw new Error(`Arquivo fora de dist: ${name}`);
  return path;
}

const types = { '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
function dataUrl(path) {
  const type = types[extname(path)];
  if (!type) throw new Error(`Formato não suportado: ${path}`);
  return `data:${type};base64,${readFileSync(path).toString('base64')}`;
}

const htmlEntry = readFileSync(join(dist, 'index.html'), 'utf8');
const entries = { script: [], stylesheet: [], icon: [] };
for (const [tag] of htmlEntry.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
  const attributes = Object.fromEntries(Array.from(tag.matchAll(/\b([\w-]+)\s*=\s*(["'])(.*?)\2/g), match => [match[1], match[3]]));
  const key = tag.startsWith('<script') && attributes.type === 'module' ? 'script' : attributes.rel;
  if (!Object.hasOwn(entries, key)) throw new Error(`Entrada de dist não suportada: ${tag}`);
  entries[key].push(asset(dist, key === 'script' ? attributes.src : attributes.href));
}
for (const [key, paths] of Object.entries(entries)) {
  if (paths.length !== 1) throw new Error(`O arquivo portátil requer exatamente uma entrada ${key}.`);
}

const [stylesheet] = entries.stylesheet;
const cssSource = readFileSync(stylesheet, 'utf8');
if (/@import\b|<\/style/i.test(cssSource)) throw new Error('A folha de estilos exige outro formato de empacotamento.');
const css = cssSource.replace(/url\(\s*(["']?)([^()"']+)\1\s*\)/gi, (_, quote, url) => {
  return `url("${dataUrl(asset(dirname(stylesheet), url.trim()))}")`;
});
if (/url\(\s*(?!"data:)/i.test(css)) throw new Error('Referência de estilo pendente.');

const icon = dataUrl(entries.icon[0]);
const source = readFileSync(entries.script[0], 'utf8');
// The generated file must never need an imported module or another local file.
new Script(source); // Rejects static import/export and import.meta in a split build.
if (/\bimport\s*\(/.test(source)) throw new Error('O arquivo portátil requer o JavaScript em um único pacote.');
const imageAttributes = /\bsrc=(["'])([^"'<>]+)\1/gi;
let imageCount = 0;
const bundled = source.replace(imageAttributes, (_, quote, url) => {
  imageCount++;
  return `src=${quote}${dataUrl(asset(dist, url))}${quote}`;
});
if (!imageCount) throw new Error('A imagem da marca não foi encontrada no pacote.');

const script = `${bundled}\n;(${setupBrowserControls.toString()})();`.replace(/<\/script/gi, '<\\/script').replace(/\r\n?/g, '\n');
const hash = createHash('sha256').update(script).digest('base64');
const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f8f6ed">
<title>Pequeno Mundo da Giulia</title><link rel="icon" href="${icon}">
<style>${css}\nfooter .browser-hint{font-size:9px}#browser-fullscreen[hidden]{display:none}</style>
</head><body><div id="app"></div><script type="module">${script}</script></body></html>\n`;

let directory = root;
for (const segment of ['release', 'Versões', version, 'Windows']) {
  directory = join(directory, segment);
  if (!existsSync(directory)) mkdirSync(directory);
  if (!lstatSync(directory).isDirectory()) throw new Error(`Pasta esperada em ${directory}`);
}
const destination = join(directory, 'Brincar no navegador.html');
const temporary = `${destination}.${randomUUID()}.tmp`;
try {
  writeFileSync(temporary, html, { flag: 'wx' });
  // Publish the complete file without overwriting an existing release, even if
  // two builds finish at the same time. The temporary link lives on the same volume.
  try {
    linkSync(temporary, destination);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (!lstatSync(destination).isFile() || !readFileSync(destination).equals(Buffer.from(html))) {
      throw new Error(`A edição ${version} já contém outro arquivo portátil. Use um novo número de versão.`);
    }
  }
} finally {
  if (existsSync(temporary)) unlinkSync(temporary);
}
console.log(relative(root, destination));
