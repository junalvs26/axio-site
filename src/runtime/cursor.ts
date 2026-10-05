/** Olhos e atmosfera seguem o cursor com atraso. Só em ponteiro fino. */
export function startCursor(stage: HTMLElement): void {
  if (!matchMedia('(pointer: fine)').matches) return;
  let tx = 0, ty = 0, x = 0, y = 0;
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const loop = () => {
    x += (tx - x) * .06; y += (ty - y) * .06;
    stage.style.setProperty('--mx', x.toFixed(3));
    stage.style.setProperty('--my', y.toFixed(3));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
