# Site Axio Cinematográfico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site institucional da Axio como filme interativo controlado pelo scroll, pronto para receber os vídeos do Google Flow por cena.

**Architecture:** Astro estático gera uma página única com HTML semântico na ordem da história (funciona sem JS). Um `SceneDirector` em TS fixa um palco, converte progresso de scroll em cena ativa + progresso local, faz scrub do vídeo e dirige as sobreposições DOM via GSAP. Cenas cujo vídeo ainda não existe renderizam só tipografia sobre fundo atmosférico (sem placeholders de imagem).

**Tech Stack:** Astro 5, TypeScript, GSAP + ScrollTrigger, Lenis, Vitest, Playwright, ffmpeg (script de encode), Vercel.

**Spec:** `docs/superpowers/specs/2026-10-05-site-axio-cinematografico-design.md`

## Global Constraints

- Cores: azul `#001A3E`, fundo `#010A18`, laranja `#FF6B23` só em olhos/energia/foco/CTA.
- Proibido no conteúdo: "chatbot", preços, porte da empresa, prova social, lorem ipsum.
- Slogan: "Chega quando a operação mais precisa." Tese: "A Axio não entrega sistema. Entrega resultado."
- Cena `proof` existe na config com `enabled: false`.
- CTA: texto e href vêm de `src/content/site.ts` (`cta.label`, `cta.href`); enquanto pendente, `cta.href = "#final"` e `cta.label = "Ativar a Axio"` (marcado `// PENDENTE cliente`).
- Sem placeholders de imagem/vídeo: mídia só é referenciada se o arquivo existir em `public/scenes/<id>/`.
- Breakpoints de verificação: 360, 768, 1440, 2560. Lighthouse mobile ≥ 90.
- Logo: `public/brand/logo.png` (copiado de `../logo.png`), nunca recolorido.

## Review Focus

1. Vídeo ausente ou que falha no decode → cena mostra texto + fundo, sem quebra nem espaço vazio (teste no Task 2 e Task 4).
2. `prefers-reduced-motion` / sem JS → página legível, todo texto visível na ordem (Task 3 e Task 8).
3. Salto pelo índice de capítulos → cena e vídeo corretos no destino, sem textos de cenas intermediárias presos (Task 6).
4. Resize/rotação no meio do scroll → faixas recalculadas, troca desktop↔mobile de mídia (Task 4).
5. iOS Safari → vídeo `muted playsinline`, scrub sem autoplay bloqueado (Task 4, verificação manual).

---

### Task 1: Scaffold e design tokens

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Base.astro`, `src/pages/index.astro`, `public/brand/logo.png`, `.gitignore`

**Interfaces:** Produces: variáveis CSS `--c-navy`, `--c-ink`, `--c-orange`, `--f-display`, `--f-text`, `--f-mono`; layout `Base.astro` com slot.

- [ ] `git init` em `site axio/`; `npm create astro@latest . -- --template minimal --typescript strict`; instalar `gsap lenis` e dev `vitest @playwright/test`.
- [ ] Fontes via Google Fonts: Unbounded (display), Inter Tight (texto), JetBrains Mono. `font-display: swap`, preload só da display.
- [ ] Tokens em `tokens.css`; `body { background: var(--c-ink); color: #E8EDF5 }`.
- [ ] Verificar: `npm run build` passa; `npx vitest run` roda (0 testes).
- [ ] Commit `chore: scaffold astro + tokens`.

### Task 2: Config de cenas e mapeamento de scroll

**Files:** Create `src/scenes/types.ts`, `src/scenes/config.ts`, `src/scenes/timeline.ts`; Test `tests/timeline.test.ts`

**Interfaces:** Produces:
- `type SceneId = 'impact'|'awakening'|'city'|'analysis'|'action'|'solution'|'transformation'|'proof'|'final'`
- `interface Scene { id: SceneId; range: [number, number]; enabled: boolean; media: { desktop?: string; mobile?: string; poster?: string } }`
- `scenes: Scene[]` com faixas da spec (impact 0–.12, awakening .12–.20, city .20–.30, analysis .30–.42, action .42–.68, solution .68–.78, transformation .78–.88, final .88–1).
- `locate(progress: number, list: Scene[]): { scene: Scene; local: number }`
- `normalizeRanges(list: Scene[]): Scene[]` — remove desabilitadas e reescala faixas para cobrir 0–1 contíguo.

- [ ] Testes: `locate(0)` → impact local 0; `locate(0.16)` → awakening local 0.5; `locate(1)` → final local 1; `locate(-0.2)` e `locate(1.3)` são clamp; `normalizeRanges` sem lacunas e `proof` ausente; mídia vazia não lança.
- [ ] Rodar → FAIL; implementar; rodar → PASS.
- [ ] Script `scripts/scan-media.mjs` (roda em `prebuild`) preenche `media` só com arquivos existentes em `public/scenes/<id>/{desktop.mp4,mobile.mp4,poster.avif}` → gera `src/scenes/media.generated.json`. Teste: diretório vazio → objetos `{}`.
- [ ] Commit `feat: scene config and scroll mapping`.

### Task 3: Conteúdo e página editorial (sem JS)

**Files:** Create `src/content/site.ts`, `src/components/Scene.astro`, `src/components/beats/*.astro`; Modify `src/pages/index.astro`; Test `tests/content.test.ts`

**Interfaces:** Produces `site.ts` exportando `slogan`, `thesis`, `cta`, `beats: Record<SceneId, Beat[]>` com `interface Beat { kind: 'title'|'line'|'list'|'step'; text: string; items?: string[]; at: number /* 0–1 local */ }`. Cada `Scene.astro` renderiza `<section id={id} data-scene={id}>` com os beats como HTML semântico (h1 só no awakening).

- [ ] Copy (da spec §4): city "Toda empresa produz mais informação do que consegue enxergar."; analysis lista [informação espalhada, oportunidade perdida, decisão às cegas, processo manual]; action steps [Axio, Axio OS, Consultoria de IA, Parceria tecnológica] com 1–2 linhas cada sem inventar fatos; solution tese + diagnóstico → implantação → evolução; transformation "Você não precisa sustentar a operação sozinho."
- [ ] Teste: nenhum texto em `site.ts` casa `/chatbot|R\$|lorem|pequena empresa/i`; todo `SceneId` habilitado tem ≥1 beat.
- [ ] Playwright com JS desabilitado: todas as seções visíveis em ordem, h1 único.
- [ ] Commit `feat: editorial content layer`.

### Task 4: SceneDirector (palco, scrub, troca de mídia)

**Files:** Create `src/runtime/director.ts`, `src/runtime/media.ts`, `src/components/Stage.astro`; Test `tests/media.test.ts`, `e2e/director.spec.ts`

**Interfaces:**
- Consumes: `locate`, `normalizeRanges`, `scenes`.
- Produces: `class SceneDirector { constructor(root: HTMLElement, list: Scene[]); start(): void; goTo(id: SceneId): void; on(evt: 'scene'|'progress', cb): void; destroy(): void }`; `pickSource(scene: Scene, viewport: {w:number;h:number}): string|undefined` (retrato → mobile, senão desktop, fallback para o outro).

- [ ] Testes unit de `pickSource`: retrato com mobile → mobile; retrato sem mobile → desktop; nenhum → undefined.
- [ ] Implementar: Lenis + ScrollTrigger pin do `Stage` por altura total (`scenes × 100vh`, ajustável por cena); `progress` → `video.currentTime = local * duration` via rAF; pré-carrega atual + próxima (`preload="auto"`), demais `none`; `video` com `muted playsinline`, `aria-hidden`; erro de decode → remove vídeo, mantém fundo; crossfade 400ms entre cenas; `ScrollTrigger.refresh` + re-pick de fonte em resize/orientationchange (debounce 200ms).
- [ ] E2E: sem arquivos de mídia, scroll até 100% sem erros de console; com mp4 de teste de 2s em `e2e/fixtures`, currentTime cresce com scroll.
- [ ] Commit `feat: scene director`.

### Task 5: Beats animados e texto "processado"

**Files:** Create `src/runtime/beats.ts`, `src/runtime/decode.ts`; Test `tests/decode.test.ts`

**Interfaces:** Produces `decodeFrame(target: string, t: number, seed: number): string` (t 0–1; t=1 retorna target; preserva espaços e tamanho); `bindBeats(director: SceneDirector): void` mostra beat quando `local ≥ beat.at`, esconde ao voltar.

- [ ] Testes de `decodeFrame`: t=1 igual ao alvo; mesmo comprimento em qualquer t; espaços mantidos; determinístico por seed.
- [ ] Beats posicionados como anotação de HUD (linhas finas, mono para rótulos), sem cards/glass.
- [ ] Commit `feat: narrative beats`.

### Task 6: Navegação e CTA persistente

**Files:** Create `src/components/Nav.astro`, `src/runtime/nav.ts`

**Interfaces:** Consumes `SceneDirector.goTo`, evento `scene`.

- [ ] Barra fixa: logo (link topo), índice de capítulos (só habilitados, rótulos curtos), botão CTA `site.cta`. Capítulo ativo marcado com `aria-current`. Teclado completo, foco visível laranja.
- [ ] E2E: clicar "Axio OS" → cena `action` ativa, beats de cenas anteriores ocultos, nenhum beat de `analysis` visível; CTA visível em todos os pontos de scroll a 360px.
- [ ] Commit `feat: chapter nav and persistent cta`.

### Task 7: Microinterações

**Files:** Create `src/runtime/particles.ts`, `src/runtime/cursor.ts`, `src/runtime/sound.ts`

- [ ] Canvas de partículas leve (≤ 120 partículas, pausa fora da viewport e em aba oculta); cursor desloca brilho/partículas com easing (só `pointer: fine`); micro-shake CSS no fim de `impact` (≤ 6px, 300ms); sound toggle desligado por padrão, só carrega áudio se ligado e se `public/sound/*` existir.
- [ ] Verificar: Performance panel sem long tasks > 50ms no scroll.
- [ ] Commit `feat: micro-interactions`.

### Task 8: Capacidade, mobile e reduced motion

**Files:** Create `src/runtime/capability.ts`; Test `tests/capability.test.ts`; Modify `src/pages/index.astro`

**Interfaces:** Produces `tier(env: { reducedMotion: boolean; saveData: boolean; deviceMemory?: number; effectiveType?: string }): 'full'|'lite'|'static'`.

- [ ] Testes: reducedMotion → static; saveData → lite; deviceMemory 2 → lite; '3g' → lite; padrão → full.
- [ ] `static`: não inicia director, posters (se existirem) como `<img loading=lazy>`; `lite`: sem partículas/cursor, scrub mantido. Mobile: tipografia maior, beats de analysis/solution condensados, sem cursor.
- [ ] Commit `feat: capability tiers`.

### Task 9: Pipeline de mídia e deploy

**Files:** Create `scripts/encode.sh`, `vercel.json`, `README.md`

- [ ] `encode.sh <master> <sceneId> <desktop|mobile>`: ffmpeg H.264 `-g 1` (all-intra, scrub suave), 1920px desktop / 1080×1920 mobile, sem áudio, `-movflags +faststart`; extrai frame 0 para `poster.avif`.
- [ ] `vercel.json` com cache longo para `/scenes/*`. README: como adicionar vídeo de uma cena.
- [ ] Deploy de teste na Vercel (`npx vercel`), registrar URL.
- [ ] Commit `chore: media pipeline and deploy`.

### Task 10: Revisões finais

- [ ] Revisão visual (impeccable/finish) com screenshots 360/768/1440/2560.
- [ ] UX: CTA sempre encontrável, nav clara, texto legível sobre vídeo (contraste AA).
- [ ] Performance: Lighthouse mobile ≥ 90, LCP < 2,5s.
- [ ] Reduced motion + JS desligado.
- [ ] Corrigir achados; commit `fix: review pass`.
