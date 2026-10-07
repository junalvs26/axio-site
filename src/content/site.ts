import type { SceneId } from '../scenes/types';

export interface BeatItem { title: string; text: string }

export interface Beat {
  kind: 'kicker' | 'title' | 'line' | 'list' | 'step' | 'cta';
  text: string;
  /** Usado em 'step' (número/nome do passo). */
  title?: string;
  items?: BeatItem[];
  /** Momento (progresso local 0–1 da cena) em que o beat entra. */
  at: number;
  /** Momento em que o beat sai (opcional): para frases que se substituem. */
  until?: number;
}

export const slogan = 'Chega quando a operação mais precisa.';
export const thesis = 'A Axio não entrega sistema. Entrega resultado.';

export const meta = {
  title: 'Axio — Chega quando a operação mais precisa',
  description:
    'A Axio coloca inteligência artificial em operação dentro de empresas: Axio OS, consultoria de IA e parceria tecnológica.',
};

// PENDENTE cliente: texto e destino definitivos do CTA.
export const cta = { label: 'Ativar a Axio', href: '#final' };

/**
 * Serviços, lidos com calma depois da história. RASCUNHO para revisão do cliente, escrito a partir de
 * DEFINICAO-PRODUTO-AXIO.md. Sem "chatbot" (proibido na spec §2).
 */
export const services = {
  title: 'O que a sua empresa precisa hoje.',
  intro: 'Cada serviço entra sozinho ou combinado, na ordem que a sua operação pede.',
  items: [
    { name: 'Sistemas', text: 'Desenvolvemos os sistemas e programas de que a sua operação precisa, integrados ao que você já usa, e seguimos ao lado depois da entrega.' },
    { name: 'Automações', text: 'O trabalho repetitivo passa a rodar sozinho: cadastros, atualização do CRM, retornos e relatórios, sem ninguém precisar digitar.' },
    { name: 'Agentes automatizados', text: 'Agentes de IA que atendem, qualificam e fazem o segundo contato na hora certa, lendo o histórico da operação para responder com contexto.' },
    { name: 'Consultoria de IA', text: 'Identificamos onde a inteligência artificial gera resultado na sua operação e conduzimos a aplicação, do diagnóstico até o uso real.' },
    { name: 'Auditoria de performance', text: 'Medimos o que a operação entrega hoje (atendimento, tempo de resposta, conversão) e mostramos onde está a perda e o que atacar primeiro.' },
  ],
};

/** Rótulos curtos do índice de capítulos. */
export const chapters: Partial<Record<SceneId, string>> = {
  prelude: 'Sinal',
  impact: 'Chegada',
  awakening: 'Olhar',
  city: 'Cidade',
  analysis: 'Varredura',
  action: 'Ação',
  solution: 'Solução',
  transformation: 'Avanço',
  final: 'Ativar',
};

export const beats: Partial<Record<SceneId, Beat[]>> = {
  prelude: [
    { kind: 'title', text: 'Role para desbloquear o futuro.', at: 0, until: 0.35 },
  ],
  impact: [
    { kind: 'kicker', text: 'Sinal detectado', at: 0.2 },
  ],
  awakening: [
    { kind: 'title', text: 'Axio', at: 0.22 },
    { kind: 'line', text: slogan, at: 0.3 },
  ],
  city: [
    { kind: 'kicker', text: 'O que a Axio faz', at: 0.08 },
    { kind: 'title', text: 'A Axio enxerga tudo o que a sua empresa produz — e coloca isso para trabalhar.', at: 0.1 },
    { kind: 'line', text: 'Conversas, sistemas e decisões viram uma memória única da operação. Em cima dela, a inteligência artificial organiza, lembra e age na hora certa.', at: 0.3 },
  ],
  analysis: [
    { kind: 'kicker', text: 'Varredura', at: 0.08 },
    {
      kind: 'list',
      text: 'Pontos cegos identificados',
      at: 0.1,
      items: [
        { title: 'Informação espalhada', text: 'O que a empresa sabe está em conversas, planilhas e na cabeça de cada pessoa.' },
        { title: 'Oportunidade perdida', text: 'O que esfria sem ninguém perceber só aparece quando já é tarde.' },
        { title: 'Decisão às cegas', text: 'Sem visibilidade, investimento e prioridade viram aposta.' },
        { title: 'Processo manual', text: 'Gente qualificada gastando o dia com o que poderia rodar sozinho.' },
      ],
    },
  ],
  action: [
    { kind: 'kicker', text: 'Em movimento', at: 0.04 },
    { kind: 'step', title: 'Axio', text: 'Colocamos inteligência artificial para operar dentro da sua empresa, em qualquer setor.', at: 0.06 },
    { kind: 'step', title: 'Axio OS', text: 'Nosso sistema operacional. A camada que reúne o que a sua operação produz e coloca IA trabalhando em cima disso.', at: 0.3 },
    { kind: 'step', title: 'Consultoria de IA', text: 'Identificamos onde a inteligência artificial gera resultado na sua operação e conduzimos a aplicação.', at: 0.54 },
    { kind: 'step', title: 'Parceria tecnológica', text: 'Desenvolvemos os sistemas e programas de que a sua empresa precisa, e seguimos ao lado depois da entrega.', at: 0.78 },
  ],
  solution: [
    { kind: 'kicker', text: 'Solução', at: 0.08 },
    { kind: 'title', text: thesis, at: 0.1 },
    {
      kind: 'list',
      text: 'Como funciona',
      at: 0.36,
      items: [
        { title: 'Diagnóstico', text: 'Entendemos a operação e mapeamos os pontos cegos.' },
        { title: 'Implantação', text: 'A solução entra em operação real, não em ambiente de teste.' },
        { title: 'Evolução', text: 'Acompanhamos, ajustamos e ampliamos conforme a operação pede.' },
      ],
    },
  ],
  transformation: [
    { kind: 'kicker', text: 'Avanço', at: 0.08 },
    { kind: 'title', text: 'Você não precisa sustentar a operação sozinho.', at: 0.1 },
    { kind: 'line', text: 'A Axio fica como infraestrutura: presente, precisa e trabalhando enquanto a empresa avança.', at: 0.3 },
  ],
  final: [
    { kind: 'kicker', text: 'Missão iniciada', at: 0.08 },
    { kind: 'title', text: 'Sua operação pede inteligência. A Axio chega.', at: 0.1 },
    { kind: 'cta', text: cta.label, at: 0.3 },
  ],
};
