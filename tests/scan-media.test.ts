import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanMedia } from '../scripts/scan-media.mjs';

describe('scanMedia', () => {
  it('pasta inexistente → objeto vazio', () => {
    expect(scanMedia(join(tmpdir(), 'nao-existe-axio'))).toEqual({});
  });
  it('lista só arquivos existentes', () => {
    const root = mkdtempSync(join(tmpdir(), 'axio-'));
    mkdirSync(join(root, 'impact'));
    mkdirSync(join(root, 'city'));
    writeFileSync(join(root, 'impact', 'desktop.mp4'), '');
    const out = scanMedia(root);
    expect(out.city).toEqual({});
    expect(out.impact.desktop).toMatch(/^\/scenes\/impact\/desktop\.mp4\?v=[0-9a-f]{10}$/);
  });
  it('a versão no endereço muda quando o arquivo muda (cache imutável de 1 ano)', () => {
    const root = mkdtempSync(join(tmpdir(), 'axio-'));
    mkdirSync(join(root, 'story'));
    const f = join(root, 'story', 'desktop.mp4');
    writeFileSync(f, 'a');
    const before = scanMedia(root).story.desktop;
    writeFileSync(f, 'b');
    expect(scanMedia(root).story.desktop).not.toBe(before);
  });
});
