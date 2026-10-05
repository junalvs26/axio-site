import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error módulo .mjs sem tipos
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
    expect(scanMedia(root)).toEqual({ impact: { desktop: '/scenes/impact/desktop.mp4' }, city: {} });
  });
});
