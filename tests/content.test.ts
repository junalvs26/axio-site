import { describe, it, expect } from 'vitest';
import * as site from '../src/content/site';
import { scenes } from '../src/scenes/config';

const allText = JSON.stringify(site);

describe('conteúdo', () => {
  it('não contém termos proibidos', () => {
    expect(allText).not.toMatch(/chatbot|R\$|lorem|pequena empresa|startup pequena/i);
  });
  it('usa slogan e tese da spec', () => {
    expect(site.slogan).toBe('Chega quando a operação mais precisa.');
    expect(site.thesis).toBe('A Axio não entrega sistema. Entrega resultado.');
  });
  it('toda cena habilitada tem ao menos um beat e um rótulo de capítulo', () => {
    for (const s of scenes.filter((s) => s.enabled)) {
      expect(site.beats[s.id]?.length, s.id).toBeGreaterThan(0);
      expect(site.chapters[s.id], s.id).toBeTruthy();
    }
  });
  it('beats têm "at" entre 0 e 1', () => {
    for (const list of Object.values(site.beats)) for (const b of list) {
      expect(b.at).toBeGreaterThanOrEqual(0);
      expect(b.at).toBeLessThanOrEqual(1);
    }
  });
  it('as três frentes aparecem na cena de ação', () => {
    const t = JSON.stringify(site.beats.action);
    for (const f of ['Axio OS', 'Consultoria de IA', 'Parceria tecnológica']) expect(t).toContain(f);
  });
});
