import { test, expect, type Page } from '@playwright/test';

const order = ['prelude', 'impact', 'awakening', 'city', 'analysis', 'action', 'solution', 'transformation', 'final'];

async function scrollToScene(page: Page, id: string, local: number) {
  await page.evaluate(([id, local]) => {
    const el = document.querySelector<HTMLElement>(`[data-scene="${id}"]`)!;
    const top = el.getBoundingClientRect().top + scrollY;
    // Progresso dos textos/luz: o trecho em que o quadro da cena fica fixo (altura − tela).
    window.scrollTo(0, top + (el.offsetHeight - innerHeight) * Number(local));
  }, [id, local] as const);
  await page.waitForTimeout(400);
}

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('todas as seções e textos aparecem em ordem, com h1 único', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('[data-scene]').evaluateAll((els) => els.map((e) => e.getAttribute('data-scene')));
    expect(ids).toEqual(order);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByText('A Axio não entrega sistema. Entrega resultado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Axio OS' })).toBeVisible();
  });
});

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('vira página editorial legível', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/is-cinema/);
    await expect(page.getByText('Você não precisa sustentar a operação sozinho.')).toBeVisible();
  });
});

test.describe('cinema', () => {
  test('percorre a história inteira sem erros de console', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/is-cinema/);
    for (const id of order) await scrollToScene(page, id, 0.9);
    await expect(page.locator('[data-chapter="final"]')).toHaveAttribute('aria-current', 'step');
    expect(errors).toEqual([]);
  });

  test('olhos acendem no despertar', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'awakening', 1);
    const ignite = await page.locator('.stage').evaluate((el) => el.style.getPropertyValue('--ignite'));
    expect(Number(ignite)).toBe(1);
  });

  test('passos da ação se substituem', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'action', 0.6);
    const on = page.locator('[data-scene="action"] .beat--step.is-on');
    await expect(on).toHaveCount(1);
    await expect(on).toContainText('Consultoria de IA');
  });

  test('índice de capítulos leva à cena certa', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('[data-chapter="action"]').click();
    await expect(page.locator('[data-chapter="action"]')).toHaveAttribute('aria-current', 'step', { timeout: 4000 });
    // cenas anteriores ficam no estado final, posteriores zeradas — nada preso no meio
    await expect(page.locator('[data-scene="analysis"] .beat.is-on')).toHaveCount(2);
    await expect(page.locator('[data-scene="solution"] .beat.is-on')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>('[data-scene="solution"]')!.offsetTop - innerHeight * 3));
    await page.locator('[data-chapter="city"]').click();
    await expect(page.locator('[data-chapter="city"]')).toHaveAttribute('aria-current', 'step', { timeout: 4000 });
    await expect(page.locator('[data-scene="action"] .beat.is-on')).toHaveCount(0);
  });

  test('vídeo da cena acompanha o scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await scrollToScene(page, 'city', 0.1);
    const video = page.locator('.stage__video.is-active');
    await expect(video).toHaveCount(1, { timeout: 5000 });
    const t1 = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    await scrollToScene(page, 'city', 0.8);
    await page.waitForTimeout(400);
    const t2 = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(t2).toBeGreaterThan(t1 + 0.5);
    await expect(page.locator('.visor')).toHaveCSS('opacity', '0');
  });

  test('CTA visível em qualquer ponto no celular', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    for (const id of order) {
      await scrollToScene(page, id, 0.5);
      await expect(page.locator('.nav__cta')).toBeInViewport();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
  });
});

test('salto instantâneo não deixa cena intermediária presa no meio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await scrollToScene(page, 'analysis', 0.1); // só o kicker aceso
  await scrollToScene(page, 'final', 0.5); // pula direto, sem passar pelo resto
  await expect(page.locator('[data-scene="analysis"] .beat.is-on')).toHaveCount(2);
  await scrollToScene(page, 'impact', 0.2); // volta direto ao início
  await expect(page.locator('[data-scene="final"] .beat.is-on')).toHaveCount(0);
});

test.describe('revisão final', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('troca rápida entre cenas nunca deixa vídeo de outra cena ativo', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'city', 0.2);
    await expect(page.locator('.stage__video.is-active')).toHaveCount(1, { timeout: 5000 });
    for (let k = 0; k < 3; k++) {
      await page.evaluate(() => { const el = document.querySelector<HTMLElement>('[data-scene="city"]')!; scrollTo(0, el.offsetTop + 50); });
      await page.waitForTimeout(30);
      await page.evaluate(() => { const el = document.querySelector<HTMLElement>('[data-scene="analysis"]')!; scrollTo(0, el.offsetTop + 50); });
      await page.waitForTimeout(30);
    }
    // logo após a troca nenhum vídeo da cena anterior pode continuar visível
    const stale = await page.locator('.stage__video.is-active').evaluateAll((vs) => vs.filter((v) => !v.getAttribute('src')?.includes('analysis')).length);
    expect(stale).toBe(0);
    await page.waitForTimeout(1500);
    const srcs = await page.locator('.stage__video.is-active').evaluateAll((vs) => vs.map((v) => v.getAttribute('src')));
    expect(srcs).toHaveLength(1);
    expect(srcs[0]).toMatch(/^\/scenes\/analysis\/desktop\.mp4\?v=/);
    await scrollToScene(page, 'action', 0.2);
    await expect(page.locator('.stage__video.is-active')).toHaveCount(0);
  });

  test('se o JS falhar, o conteúdo continua visível', async ({ page }) => {
    await page.route('**/_astro/*.js', (r) => r.abort());
    await page.goto('/');
    await page.waitForTimeout(5000);
    const beat = page.locator('.beat', { hasText: 'Toda empresa produz mais informação' });
    await expect(beat).toHaveCSS('opacity', '1');
  });

  test('resize sem mudar orientação não recarrega o vídeo', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'city', 0.3);
    const v = page.locator('.stage__video.is-active');
    await expect(v).toHaveCount(1, { timeout: 5000 });
    const slot = await v.getAttribute('data-slot');
    await page.setViewportSize({ width: 1440, height: 820 });
    await page.waitForTimeout(800);
    await expect(page.locator('.stage__video.is-active')).toHaveAttribute('data-slot', slot!);
  });

  test('parado, o palco não reescreve estilos a cada quadro', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'analysis', 0.5);
    await page.waitForTimeout(1500);
    const writes = await page.evaluate(() => new Promise<number>((res) => {
      let n = 0;
      const mo = new MutationObserver((m) => (n += m.length));
      mo.observe(document.querySelector('.stage')!, { attributes: true, attributeFilter: ['style', 'data-rain'] });
      mo.observe(document.querySelector('.nav')!, { attributes: true, attributeFilter: ['style'] });
      setTimeout(() => { mo.disconnect(); res(n); }, 1000);
    }));
    expect(writes).toBe(0);
  });

  test('vídeo mobile quebrado cai para o desktop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/scenes/city/mobile.mp4*', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await scrollToScene(page, 'city', 0.3);
    await expect(page.locator('.stage__video.is-active')).toHaveAttribute('src', /^\/scenes\/city\/desktop\.mp4\?v=/, { timeout: 6000 });
  });

  test('beats invisíveis não recebem foco', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'impact', 0.3);
    await expect(page.locator('.cta-final')).toHaveCSS('visibility', 'hidden');
  });
});
