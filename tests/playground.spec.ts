import { expect, test, type Page } from '@playwright/test';

async function openParentArea(page: Page) {
  const parents = page.getByRole('button', { name: 'Área dos pais: segure por 2 segundos' });
  await parents.hover();
  await page.mouse.down();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3500 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('starts in the garden and turns a key or a click into a discovery', async ({ page }) => {
  await expect(page.locator('body')).toHaveAttribute('data-world', 'garden');
  await expect(page.getByRole('button', { name: 'Jardim', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O mundo floresce');
  await page.keyboard.press('a');
  await expect(page.locator('.creation-key')).toHaveText('A');
  await expect(page.locator('#playground')).toHaveClass(/has-played/);
  await page.waitForTimeout(100);
  await page.locator('#playground').click({ position: { x: 230, y: 230 } });
  await expect(page.locator('.creation')).toHaveCount(2);
});

test('control keys play without activating focused controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Oceano', exact: true }).focus();
  for (const key of ['Enter', 'Space', 'Escape', 'Tab', 'Control', 'Alt', 'Shift', 'Backspace']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(100);
  }
  await expect(page.locator('body')).toHaveAttribute('data-world', 'garden');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.creation')).toHaveCount(8);
  expect(page.url()).toBe('http://127.0.0.1:5173/');
});

test('key repetition and fast playing stay bounded, and symbols render as text', async ({ page }) => {
  await page.keyboard.down('a');
  for (let index = 0; index < 15; index++) await page.keyboard.down('a');
  await page.keyboard.up('a');
  await expect(page.locator('.creation')).toHaveCount(1);

  await page.keyboard.type('bcdefghijklmnopqrstuv', { delay: 100 });
  await expect(page.locator('.creation')).toHaveCount(12);
  await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '<', code: 'Comma' })));
  await expect(page.locator('.creation-key').last()).toHaveText('<');
  expect(await page.locator('.creation-key').last().evaluate(element => element.childElementCount)).toBe(0);
  await expect(page.locator('.creation')).toHaveCount(12);
});

test('world changes and mute choices survive reopening', async ({ page }) => {
  await page.getByRole('button', { name: 'Oceano', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-world', 'ocean');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Um mar todinho');
  await page.getByRole('button', { name: 'Céu', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-world', 'sky');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ganha asas');
  await page.getByRole('button', { name: 'Desativar sons', exact: true }).click();
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-world', 'sky');
  await expect(page.getByRole('button', { name: 'Ativar sons suaves', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('parent area needs a hold, pauses playing, and preserves calm mode', async ({ page }) => {
  const parents = page.getByRole('button', { name: 'Área dos pais: segure por 2 segundos' });
  await parents.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Segure');
  await openParentArea(page);
  await expect(page.getByRole('heading', { name: 'Atualizações' })).toHaveCount(0);
  await page.keyboard.press('z');
  await expect(page.locator('.creation')).toHaveCount(0);
  await page.getByRole('switch', { name: /Movimentos tranquilos/ }).check();
  await expect(page.locator('body')).toHaveClass(/calm/);
  await page.getByRole('button', { name: 'Voltar à brincadeira', exact: true }).last().click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/calm/);
  await page.keyboard.press('b');
  await expect(page.locator('.creation-key')).toHaveText('B');
});

test('fits a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Céu', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await openParentArea(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});

test('audio starts only after playing and respects the mute control', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    const probe = { contexts: 0, oscillators: 0, states: [] as string[] };
    Object.assign(window, { soundProbe: probe });
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts++;
        probe.states.push(this.state);
        this.addEventListener('statechange', () => probe.states.push(this.state));
      }
      createOscillator(): OscillatorNode {
        probe.oscillators++;
        return super.createOscillator();
      }
    };
  });
  await page.reload();
  const probe = () => page.evaluate(() => (window as unknown as {
    soundProbe: { contexts: number; oscillators: number; states: string[] };
  }).soundProbe);
  expect((await probe()).contexts).toBe(0);
  await page.keyboard.press('a');
  await expect.poll(async () => (await probe()).states).toContain('running');
  const sounded = (await probe()).oscillators;
  expect(sounded).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Desativar sons', exact: true }).click();
  await page.waitForTimeout(100);
  await page.keyboard.press('b');
  expect((await probe()).oscillators).toBe(sounded);
  await page.getByRole('button', { name: 'Ativar sons suaves', exact: true }).click();
  await expect.poll(async () => (await probe()).oscillators).toBeGreaterThan(sounded);
});
