/** Chuva fina, poeira e faíscas do impacto. Leve: ≤ 120 partículas, pausa em aba oculta. */
interface P { x: number; y: number; vx: number; vy: number; life: number; kind: 'rain' | 'dust' | 'spark' }

const MAX = 120;

export function startParticles(canvas: HTMLCanvasElement, stage: HTMLElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let w = 0, h = 0, raf = 0, running = true;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const ps: P[] = [];

  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (kind: P['kind']): P =>
    kind === 'rain'
      ? { kind, x: Math.random() * w * 1.2, y: -20, vx: -1.2, vy: 14 + Math.random() * 8, life: 1 }
      : kind === 'dust'
        ? { kind, x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .2, vy: -.1 - Math.random() * .2, life: 1 }
        : { kind, x: w / 2 + (Math.random() - .5) * w * .3, y: h * .78, vx: (Math.random() - .5) * 9, vy: -4 - Math.random() * 8, life: 1 };

  const onImpact = () => { for (let i = 0; i < 36; i++) ps.push(spawn('spark')); };
  stage.addEventListener('impact', onImpact);

  const frame = () => {
    if (!running) return;
    const rain = Number(stage.dataset.rain ?? .5);
    let rainCount = 0;
    for (const p of ps) if (p.kind === 'rain') rainCount++;
    if (rainCount < rain * 70 && ps.length < MAX) ps.push(spawn('rain'));
    if (ps.length < MAX && Math.random() < .08) ps.push(spawn('dust'));

    ctx.clearRect(0, 0, w, h);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx; p.y += p.vy;
      if (p.kind === 'spark') { p.vy += .35; p.life -= .018; }
      if (p.kind === 'dust') p.life -= .003;
      if (p.y > h + 30 || p.life <= 0 || p.x < -40) { ps.splice(i, 1); continue; }
      if (p.kind === 'rain') {
        ctx.strokeStyle = 'rgba(160,185,220,.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 1.6, p.y + p.vy * 1.6); ctx.stroke();
      } else if (p.kind === 'dust') {
        ctx.fillStyle = `rgba(200,215,235,${.25 * p.life})`; ctx.fillRect(p.x, p.y, 1.4, 1.4);
      } else {
        ctx.fillStyle = `rgba(255,107,35,${p.life})`; ctx.fillRect(p.x, p.y, 2, 2);
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const onVis = () => {
    running = !document.hidden;
    cancelAnimationFrame(raf);
    if (running) raf = requestAnimationFrame(frame);
  };

  let resizeId = 0;
  const onResize = () => { clearTimeout(resizeId); resizeId = window.setTimeout(resize, 150); };
  resize();
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  return () => {
    running = false; cancelAnimationFrame(raf);
    clearTimeout(resizeId);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    stage.removeEventListener('impact', onImpact);
  };
}
