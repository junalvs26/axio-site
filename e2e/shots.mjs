import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:4322/');
  await p.waitForTimeout(800);
  for (const [id, l] of [['impact', .3], ['awakening', .9], ['city', .8], ['analysis', .9], ['action', .4], ['solution', .9], ['transformation', .8], ['final', .8]]) {
    await p.evaluate(([id, l]) => { const el = document.querySelector(`[data-scene="${id}"]`); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * l); }, [id, l]);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${w}-${id}.png` });
  }
}
await b.close();
