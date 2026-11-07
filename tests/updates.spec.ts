/// <reference path="../src/desktop.d.ts" />
import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    updateHarness: {
      ready: boolean;
      installs: number;
      checks: number;
      releaseSnapshot(): void;
      publish(state: Partial<UpdateState>): void;
      key(): void;
    };
  }
}

async function startDesktop(page: Page) {
  await page.addInitScript(() => {
    const initial: UpdateState = { version: '2.0.0', status: 'idle' };
    let state = initial;
    let first = true;
    let snapshot: ((state: UpdateState) => void) | undefined;
    let notify: ((state: UpdateState) => void) | undefined;
    let sendKey: ((key: GiuliaKey) => void) | undefined;
    function publish(changes: Partial<UpdateState>) {
      state = { ...initial, ...changes };
      notify?.(state);
      return state;
    }
    const harness: Window['updateHarness'] = window.updateHarness = {
      ready: false,
      installs: 0,
      checks: 0,
      publish,
      releaseSnapshot: () => snapshot?.(initial),
      key: () => sendKey?.({ key: 'Enter', code: 'Enter', type: 'keydown', repeat: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }),
    };
    window.giulia = {
      isDesktop: true, platform: 'win32', preview: false,
      ready: () => { harness.ready = true; },
      onKey: callback => { sendKey = callback; return () => { sendKey = undefined; }; },
      updates: {
        onChange: callback => { notify = callback; return () => { notify = undefined; }; },
        getState: () => {
          if (!first) return Promise.resolve(state);
          first = false;
          return new Promise(resolve => { snapshot = resolve; });
        },
        check: async () => {
          harness.checks++;
          return harness.checks === 1
            ? publish({ status: 'error', message: 'Confira a conexão e tente novamente.' })
            : publish({ status: 'current' });
        },
        install: async () => {
          harness.installs++;
          return publish({ status: 'downloading', latest: '2.1.0', progress: 48 });
        },
      },
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.updateHarness.ready);
}

async function holdParentButton(page: Page) {
  await page.locator('#parents').hover();
  await page.mouse.down();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3500 });
  await page.mouse.up();
}

test('a new version survives a stale startup snapshot and needs a parent to install', async ({ page }) => {
  await startDesktop(page);
  await page.evaluate(() => {
    window.updateHarness.publish({ status: 'available', latest: '2.1.0' });
    window.updateHarness.releaseSnapshot();
    window.updateHarness.key();
  });
  await expect(page.locator('#parents')).toHaveAttribute('aria-description', 'Nova versão disponível');
  await expect(page.locator('.creation')).toHaveCount(1);
  await page.locator('#parents').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => window.updateHarness.installs)).toBe(0);
  await holdParentButton(page);
  await expect(page.locator('#installed-version')).toHaveText('Versão instalada 2.0.0');
  await expect(page.locator('#update-status')).toContainText('2.1.0');
  await expect(page.locator('#update-status')).toContainText('reiniciar');
  await page.getByRole('button', { name: 'Atualizar agora' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '48');
  await expect(page.locator('#update-percent')).toHaveText('48%');
  await expect(page.getByRole('button', { name: 'Atualizar agora' })).not.toBeVisible();
  expect(await page.evaluate(() => window.updateHarness.installs)).toBe(1);
  await page.evaluate(() => window.updateHarness.publish({ status: 'restarting' }));
  await expect(page.locator('#update-status')).toContainText('Reiniciando o app');
});

test('a parent can retry a failed manual update check', async ({ page }) => {
  await startDesktop(page);
  await page.evaluate(() => window.updateHarness.releaseSnapshot());
  await holdParentButton(page);
  await page.getByRole('button', { name: 'Verificar atualização' }).click();
  await expect(page.locator('#update-status')).toHaveText('Confira a conexão e tente novamente.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('#update-status')).toHaveText('Você já está na versão mais recente.');
  expect(await page.evaluate(() => [window.updateHarness.checks, window.updateHarness.installs])).toEqual([2, 0]);
});
