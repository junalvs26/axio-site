# Site Axio

Experiência cinematográfica controlada pelo scroll. Astro + Lenis, sem framework de UI.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # testes unitários
npm run e2e      # testes no navegador (build isolado com vídeo de teste)
npm run build    # gera dist/
```

## Adicionar o vídeo de uma cena

Cenas: `impact`, `awakening`, `city`, `analysis`, `action`, `solution`, `transformation`, `final`
(`proof` está reservada e desligada em `src/scenes/config.ts`).

```bash
bash scripts/encode.sh caminho/do/master-flow.mp4 impact desktop   # 16:9 → 1920px + poster
bash scripts/encode.sh caminho/do/master-flow-vertical.mp4 impact mobile  # 9:16 → 1080×1920
```

O script grava em `public/scenes/<cena>/` e atualiza `src/scenes/media.generated.json`.
Nenhum código precisa mudar: o site só usa mídia que existe. Prompts de geração em
[`docs/flow-prompts.md`](docs/flow-prompts.md).

Quando uma cena ganha vídeo, o visor desenhado em CSS deixa de aparecer nela.

## Onde mexer

| O quê | Onde |
|---|---|
| Textos, slogan, CTA | `src/content/site.ts` |
| Ordem e duração de cada cena no scroll | `src/scenes/config.ts` |
| Luz, visor e chuva por cena | `src/runtime/cues.ts` |
| Composição de cada cena | `src/components/Scene.astro` |
| Som ambiente (opcional) | coloque `public/sound/ambience.mp3`; o botão "Som" aparece sozinho |

## Pendências do cliente

- CTA definitivo (texto e destino) — `src/content/site.ts`, `cta`.
- Canais (Instagram etc.).
- Cena de prova (`proof`) quando houver cases.

## Modos

- **full**: cinema completo com partículas e cursor.
- **lite** (economia de dados, pouca memória, 3G): sem partículas/cursor.
- **static** (`prefers-reduced-motion`) e **sem JS**: página editorial com todo o conteúdo.
