import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'build');
mkdirSync(output, { recursive: true });

function browserPath() {
  const explicit = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (explicit) return explicit;
  const standard = chromium.executablePath();
  if (existsSync(standard)) return standard;

  // Reuse a local Playwright browser; icon generation never downloads assets.
  const cache = process.platform === 'darwin'
    ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
    : process.platform === 'win32'
      ? join(process.env.LOCALAPPDATA || homedir(), 'ms-playwright')
      : join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ms-playwright');
  if (existsSync(cache)) {
    const versions = readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort().reverse();
    for (const version of versions) {
      const candidates = [
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
        'chrome-win64/chrome.exe', 'chrome-win/chrome.exe',
        'chrome-linux64/chrome', 'chrome-linux/chrome',
      ];
      for (const candidate of candidates) {
        const path = join(cache, version, candidate);
        if (existsSync(path)) return path;
      }
    }
  }
  throw new Error('Instale o navegador com npx playwright install chromium ou defina CHROMIUM_EXECUTABLE_PATH.');
}

const flower = readFileSync(join(root, 'public', 'flower.svg'), 'utf8')
  .replace('<svg ', '<svg x="236" y="224" width="552" height="552" ');
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="84" y="84" width="856" height="856" rx="190" fill="#F8F6EF"/>
  <rect x="85.5" y="85.5" width="853" height="853" rx="188.5" fill="none" stroke="#E7E6D9" stroke-width="3"/>
  ${flower}
</svg>`;

const browser = await chromium.launch({ headless: true, executablePath: browserPath() });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><head><style>html,body{margin:0;width:1024px;height:1024px;background:transparent}svg{display:block}</style></head><body>${artwork}</body></html>`);
  await page.screenshot({ path: join(output, 'icon.png'), omitBackground: true });
} finally {
  await browser.close();
}

if (process.platform === 'darwin') {
  const temporary = mkdtempSync(join(tmpdir(), 'giulia-icon-'));
  const iconset = join(temporary, 'Giulia.iconset');
  mkdirSync(iconset);
  try {
    for (const size of [16, 32, 128, 256, 512]) {
      for (const scale of [1, 2]) {
        const pixels = size * scale;
        const filename = `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
        execFileSync('sips', ['-z', String(pixels), String(pixels), join(output, 'icon.png'), '--out', join(iconset, filename)], { stdio: 'ignore' });
      }
    }
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(output, 'icon.icns')]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

console.log(`Ícone criado em ${output}${process.platform === 'darwin' ? ' (PNG e ICNS).' : ' (PNG). Gere o ICNS em um Mac.'}`);
