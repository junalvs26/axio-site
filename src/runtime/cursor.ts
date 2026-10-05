/** Olhos e atmosfera seguem o cursor com atraso. Só em ponteiro fino. */
export function startCursor(stage: HTMLElement): void {
  if (!matchMedia('(pointer: fine)').matches) return;
  let tx = 0, ty = 0, x = 0, y = 0, lx = '', ly = '';
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const loop = () => {
    x += (tx - x) * .06; y += (ty - y) * .06;
    const mx = x.toFixed(3), my = y.toFixed(3);
    if (mx !== lx) stage.style.setProperty('--mx', (lx = mx));
    if (my !== ly) stage.style.setProperty('--my', (ly = my));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
