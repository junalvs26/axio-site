# Site Axio — Experiência Cinematográfica · Design Spec

Data: 2026-10-05 · Status: aguardando revisão

## 1. Objetivo

Site institucional da Axio em formato de filme interativo controlado pelo scroll. O visitante deve
sair com a sensação: "eu não entrei em um site, eu assisti ao início de uma missão" — e entender o
que a Axio faz, como resolve e por que é diferente.

## 2. Estratégia (fonte: respostas do cliente)

- **Marca:** Axio. Axio OS = sistema operacional próprio (produto).
- **Frentes principais:** Axio OS · Consultoria de IA · Parceria tecnológica (desenvolvimento de
  sistemas e programas).
- **Público:** empresas de todos os setores (comunicação geral, sem nicho).
- **Diferencial / tese:** "A Axio não entrega sistema. Entrega resultado."
- **Tom:** tecnológico, premium, confiável.
- **Slogan (padrão):** "Chega quando a operação mais precisa."
- **Permitido:** IA, sistema, infraestrutura, inteligência.
- **Proibido:** "chatbot", preços, porte da empresa, prova social inventada, lorem ipsum.
- **Pendentes (não bloqueiam a spec):** CTA final e destino, canais/links, prova social (Cena 08).

## 3. Metáfora

O robô de guerra futurista é a Axio como infraestrutura: chega, analisa, age, sustenta. Não é herói,
não é mascote. O visor horizontal em cápsula deriva do "O" do logo; os dois pontos do logo viram
sensores. Laranja #FF6B23 só nos olhos, energia, elementos interativos e CTA.

## 4. Roteiro (ordem final)

| # | Cena | Scroll | Imagem | Conteúdo DOM |
|---|---|---|---|---|
| 01 | impact | 0–12% | Escuro, partículas, robô atravessa o céu e cai, impacto, poeira, tremor | nenhum (apenas indicador de scroll) |
| 02 | awakening | 12–20% | Close extremo, visor acende laranja, luz no metal | logo + slogan |
| 03 | city | 20–30% | Cidade noturna, chuva; gestor numa sala de vidro, sobrecarregado; robô vira a cabeça | "Toda empresa produz mais informação do que consegue enxergar." |
| 04 | analysis | 30–42% | Holograma projetado pelo robô; câmera atravessa dados | pontos cegos: informação espalhada · oportunidade perdida · decisão às cegas · processo manual |
| 05 | action | 42–68% | Robô levanta e caminha; cada passo = capítulo | 1 Axio · 2 Axio OS · 3 Consultoria de IA · 4 Parceria tecnológica |
| 06 | solution | 68–78% | Interior do robô, energia laranja nos cabos | tese + método: diagnóstico → implantação → evolução |
| 07 | transformation | 78–88% | Cidade ganha luz; gestor avança; robô ao lado | "Você não precisa sustentar a operação sozinho." |
| 08 | proof | — | reservada, desligada por flag | (futuro) |
| 09 | final | 88–100% | Robô no ponto mais iluminado olha para a câmera; push-in nos olhos | CTA (pendente) |

Copys acima são versão inicial; textos finais revisados na implementação, sempre sem inventar fatos.

## 5. Arquitetura

- **Stack:** Astro (estático, rápido, zero JS por padrão) + GSAP ScrollTrigger + Lenis (scroll
  suave) + TypeScript. Deploy de teste na Vercel.
- **Motor de cena:** cada cena é um módulo com `config.ts` (faixa de scroll, mídia, beats de texto)
  + vídeo. Um `SceneDirector` único faz o pin do palco e mapeia progresso → `video.currentTime`
  e → timeline GSAP das sobreposições DOM. Crossfade/máscara entre cenas para parecer um plano só.
- **Mídia por cena:** `public/scenes/<cena>/` com `desktop.mp4` (16:9, H.264 all-intra/keyframe a
  cada frame para scrub suave, 1920–2560px), `mobile.mp4` (9:16), `poster.avif`. O master 8K do
  Flow é arquivado; web recebe encodes derivados (script ffmpeg no repo).
- **Carregamento:** cena atual + próxima pré-carregadas; demais lazy. Poster aparece até o vídeo
  estar pronto.
- **Conteúdo independente da animação:** todo texto é HTML semântico na ordem da história. Sem JS
  ou com `prefers-reduced-motion`, o site vira uma página editorial com posters estáticos.
- **Navegação:** barra mínima fixa com logo, índice de capítulos (pula para a cena) e CTA sempre
  visível.

## 6. Direção visual

- Fundos: azul quase preto (#010A18) → #001A3E; gradientes só atmosféricos.
- Laranja #FF6B23 raro: olhos, energia, foco, CTA.
- Tipografia: display geométrica (ex.: "Unbounded" ou "Space Grotesk" — escolha final na
  implementação, ecoando os terminais arredondados do logo) + texto "Inter Tight"/"IBM Plex Sans";
  mono discreta para dados ("JetBrains Mono").
- Sem cards flutuantes, glassmorphism pesado, neon RGB, estética de dashboard.
- Informação aparece como HUD/anotação do visor do robô, ancorada à imagem.

## 7. Microinterações

Cursor desloca levemente o brilho dos olhos e partículas (canvas leve); texto "processado"
(decodificação de caracteres curta); micro-shake no impacto; hover com linha laranja; som
opcional desligado por padrão com toggle.

## 8. Mobile e fallbacks

- Mobile: vídeos verticais próprios, narrativa condensada (cenas 04 e 06 viram sequências
  curtas de beats), texto maior, sem efeitos de cursor.
- Dispositivo fraco (`deviceMemory`/`saveData`/conexão lenta): posters + transições CSS.
- Reduced motion: sem scrub, sem shake; posters estáticos.
- Acessibilidade: contraste AA, foco visível, vídeos `aria-hidden`, texto real legível por leitor.

## 9. Produção de vídeo

Prompts do Google Flow por cena em `docs/flow-prompts.md`. Cada cena deve terminar num quadro
compatível com o início da próxima (continuidade). Implementação do site só começa quando as
cenas tiverem vídeo real (sem placeholders, por decisão do cliente); a estrutura pode ser
preparada antes.

## 10. Verificação

Revisões: visual, UX, performance (Lighthouse ≥ 90 mobile, LCP < 2,5s com poster), responsividade
(360 / 768 / 1440 / 2560), reduced motion e sem JS.
