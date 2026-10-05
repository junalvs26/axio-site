/** Ambiência opcional: desligada por padrão; só carrega o áudio quando o visitante liga. */
export function bindSound(button: HTMLButtonElement | null): void {
  if (!button) return;
  const src = button.dataset.src!;
  let audio: HTMLAudioElement | null = null;
  button.addEventListener('click', () => {
    audio ??= Object.assign(new Audio(src), { loop: true, volume: .35 });
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    if (on) audio.play().catch(() => button.setAttribute('aria-pressed', 'false'));
    else audio.pause();
  });
}
