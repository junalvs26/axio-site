/** Olhos e atmosfera seguem o cursor com atraso. Só em ponteiro fino; o laço dorme quando o alvo é alcançado. */
export function startCursor(stage: HTMLElement): void {
  if (!matchMedia('(pointer: fine)').matches) return;
  let tx = 0, ty = 0, x = 0, y = 0, lx = '', ly = '', raf = 0;
  const loop = () => {
    x += (tx - x) * .06; y += (ty - y) * .06;
    const mx = x.toFixed(3), my = y.toFixed(3);
    if (mx !== lx) stage.style.setProperty('--mx', (lx = mx));
    if (my !== ly) stage.style.setProperty('--my', (ly = my));
    raf = Math.abs(tx - x) + Math.abs(ty - y) > .001 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
}
