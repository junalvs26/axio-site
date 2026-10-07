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

/** Sem WebCodecs: o palco usa o <video> (fallback de navegadores antigos). */
const withoutWebCodecs = (page: Page) => page.addInitScript(() => { delete (window as { VideoDecoder?: unknown }).VideoDecoder; });
const frame = (page: Page) => page.locator('.stage__frames').evaluate((c) => Number(c.dataset.frame ?? -1));

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
    await expect(page.locator('[data-scene="final"] .cta-final')).toBeVisible();
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

  test('topo tem só a marca, e ela volta ao início', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.nav a')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(0);
    await scrollToScene(page, 'action', 0.5);
    await page.locator('.nav__brand').click();
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 4000 }).toBeLessThan(50);
  });

  test('vídeo da cena acompanha o scroll (quadros no canvas)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await scrollToScene(page, 'city', 0.1);
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/, { timeout: 5000 });
    await expect(page.locator('.stage__video.is-active')).toHaveCount(0);
    const f1 = await frame(page);
    await scrollToScene(page, 'city', 0.8);
    await expect.poll(() => frame(page), { timeout: 3000 }).toBeGreaterThan(f1 + 12);
    await expect(page.locator('.visor')).toHaveCSS('opacity', '0');
  });

  test('parado no topo, o palco já mostra o vídeo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/, { timeout: 5000 });
    expect(await frame(page)).toBe(0);
  });

  test('sem WebCodecs, o <video> acompanha o scroll', async ({ page }) => {
    await withoutWebCodecs(page);
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
  });

  test('celular: nada vaza na horizontal em nenhuma cena', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    for (const id of order) {
      await scrollToScene(page, id, 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  });
});

test('salto instantâneo não deixa cena intermediária presa no meio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await scrollToScene(page, 'analysis', 0.1); // só o kicker aceso
  await scrollToScene(page, 'final', 0.5); // pula direto, sem passar pelo resto
  // a cena pulada fica inteira, já saída (como se tivesse rolado por ela), nunca no meio
  await expect(page.locator('[data-scene="analysis"] .beat.is-on')).toHaveCount(0);
  await expect(page.locator('[data-scene="analysis"] .beat').last()).toHaveCSS('--in', '1.000');
  await scrollToScene(page, 'impact', 0.2); // volta direto ao início
  await expect(page.locator('[data-scene="final"] .beat.is-on')).toHaveCount(0);
});

test.describe('revisão final', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('vai e volta rápido entre cenas sem o palco ficar vazio', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'city', 0.2);
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/, { timeout: 5000 });
    for (let k = 0; k < 3; k++) {
      await page.evaluate(() => { const el = document.querySelector<HTMLElement>('[data-scene="city"]')!; scrollTo(0, el.offsetTop + 50); });
      await page.waitForTimeout(30);
      await page.evaluate(() => { const el = document.querySelector<HTMLElement>('[data-scene="final"]')!; scrollTo(0, el.offsetTop + 50); });
      await page.waitForTimeout(30);
    }
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/);
    // assenta no quadro da cena final (60,5 s × 24 fps em diante)
    await expect.poll(() => frame(page), { timeout: 3000 }).toBeGreaterThan(60 * 24);
  });

  test('se o JS falhar, o conteúdo continua visível', async ({ page }) => {
    await page.route('**/_astro/*.js', (r) => r.abort());
    await page.goto('/');
    await page.waitForTimeout(5000);
    const beat = page.locator('.beat', { hasText: 'A Axio enxerga tudo o que a sua empresa produz' });
    await expect(beat).toHaveCSS('opacity', '1');
  });

  test('resize sem mudar orientação não reabre o vídeo', async ({ page }) => {
    const opened: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/scenes/story/') && r.url().includes('.json')) opened.push(r.url()); });
    await page.goto('/');
    await scrollToScene(page, 'city', 0.3);
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/, { timeout: 5000 });
    await page.setViewportSize({ width: 1440, height: 820 });
    await page.waitForTimeout(800);
    expect(opened).toHaveLength(1);
    await expect(page.locator('.stage__frames')).toHaveClass(/is-active/);
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

  test('vídeo mobile quebrado cai para o desktop (<video>)', async ({ page }) => {
    await withoutWebCodecs(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/scenes/story/mobile.mp4*', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await scrollToScene(page, 'city', 0.3);
    await expect(page.locator('.stage__video.is-active')).toHaveAttribute('src', /^\/scenes\/story\/desktop\.mp4\?v=/, { timeout: 6000 });
  });

  test('índice de quadros quebrado cai para o <video>', async ({ page }) => {
    await page.route('**/scenes/story/desktop.json*', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await scrollToScene(page, 'city', 0.3);
    await expect(page.locator('.stage__video.is-active')).toHaveAttribute('src', /^\/scenes\/story\/desktop\.mp4\?v=/, { timeout: 6000 });
    await expect(page.locator('.stage__frames')).not.toHaveClass(/is-active/);
  });

  test('beats invisíveis não recebem foco', async ({ page }) => {
    await page.goto('/');
    await scrollToScene(page, 'impact', 0.3);
    await expect(page.locator('.cta-final')).toHaveCSS('visibility', 'hidden');
  });
});
