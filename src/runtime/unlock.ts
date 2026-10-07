import { animate, createTimeline, scrambleText, set, splitText, stagger } from 'animejs';

/**
 * Abertura "Role para desbloquear o futuro.": o rótulo assenta, "desbloquear" é decifrado como uma
 * senha com uma varredura laranja por baixo, e "o futuro." acende letra a letra e fica pulsando.
 * Só no modo cinema; o texto já está no HTML, inteiro, para quem não tem JS ou prefere menos movimento.
 */
export function playUnlock(): void {
  const root = document.querySelector<HTMLElement>('.unlock');
  if (!root) return;
  const lead = root.querySelector<HTMLElement>('.unlock__lead')!;
  // O scramble reescreve o texto do alvo: a palavra fica num span próprio, separada da varredura.
  const key = root.querySelector<HTMLElement>('.unlock__word')!;
  const scan = root.querySelector<HTMLElement>('.unlock__scan')!;
  const future = root.querySelector<HTMLElement>('.unlock__future')!;
  const cue = root.parentElement?.querySelector<HTMLElement>('.scroll-cue');
  const { chars } = splitText(future, { chars: true, accessible: true });

  // Estado inicial aplicado já, no mesmo quadro: nada aparece inteiro e depois some.
  set(lead, { opacity: 0, letterSpacing: '.9em' });
  set(key, { opacity: 0 });
  set(scan, { scaleX: 0, opacity: 0 });
  set(chars, { opacity: 0, y: '.35em', filter: 'blur(10px)' });
  if (cue) set(cue, { opacity: 0 });
  root.classList.add('is-ready');

  createTimeline({ defaults: { ease: 'outExpo' } })
    .add(lead, { opacity: 1, letterSpacing: '.42em', duration: 1100 }, 150)
    .add(key, { opacity: [{ to: 1, duration: 200 }], duration: 200 }, 450)
    .add(key, {
      textContent: scrambleText({ chars: 'a-z', cursor: '_', override: true, revealRate: 16, settleDuration: 380 }),
      duration: 1300,
    }, 450)
    .add(scan, { scaleX: [0, 1], opacity: [{ to: 1, duration: 150 }, { to: 0, duration: 500, delay: 650 }], duration: 1100, ease: 'inOutQuart' }, 500)
    .add(chars, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 900, delay: stagger(55) }, 1500)
    .add(cue ?? [], { opacity: 1, duration: 800 }, 2300)
    .then(() => {
      // Energia contínua em "o futuro.": brilho que respira devagar.
      animate(future, { '--glow': [0.35, 0.85], duration: 2400, ease: 'inOutSine', loop: true, alternate: true });
    });
}
