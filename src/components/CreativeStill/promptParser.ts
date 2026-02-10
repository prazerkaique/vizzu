// ═══════════════════════════════════════════════════════════════
// VIZZU - Prompt Parser & Mention Map (Creative Still)
// ═══════════════════════════════════════════════════════════════

import { Product } from '../../types';

// ── Tipos ──

export interface MentionItem {
  type: 'angle' | 'ref' | 'product';
  id: string;          // angle ID (front, back...) ou ref1, produto1
  token: string;       // texto normalizado p/ matching: "frente", "ref1", "produto1"
  displayText: string; // texto exibido: "@frente", "@ref1", "@produto1"
  label: string;       // descrição: "Frente", "@ref1 - Referência 1", "Camiseta Polo"
  icon: string;        // FontAwesome class
}

export interface ParsedPrompt {
  globalPrompt: string;
  anglePrompts: Record<string, string>;
  refPrompts: Record<string, string>;
  productPrompts: Record<string, string>;
}

export interface CompositionProduct {
  product: Product;
  label: string;
  index: number;
}

// ── Helpers ──

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s.]+/g, '');
}

// ── Build Mention Map ──

export function buildMentionMap(
  selectedAngles: string[],
  anglesConfig: Array<{ id: string; label: string; icon: string }>,
  refCount: number,
  compositionProducts: CompositionProduct[],
): MentionItem[] {
  const items: MentionItem[] = [];

  // Ângulos selecionados
  for (const cfg of anglesConfig) {
    if (!selectedAngles.includes(cfg.id)) continue;
    const token = normalize(cfg.label);
    items.push({
      type: 'angle',
      id: cfg.id,
      token,
      displayText: '@' + token,
      label: cfg.label,
      icon: cfg.icon,
    });
  }

  // Referências
  for (let i = 0; i < refCount; i++) {
    const num = i + 1;
    items.push({
      type: 'ref',
      id: 'ref' + num,
      token: 'ref' + num,
      displayText: '@ref' + num,
      label: 'Referência ' + num,
      icon: 'fa-image',
    });
  }

  // Produtos de composição
  for (let i = 0; i < compositionProducts.length; i++) {
    const num = i + 1;
    const cp = compositionProducts[i];
    items.push({
      type: 'product',
      id: 'produto' + num,
      token: 'produto' + num,
      displayText: '@produto' + num,
      label: cp.product.name || 'Produto ' + num,
      icon: 'fa-box',
    });
  }

  return items;
}

// ── Parse Prompt ──

export function parsePromptMentions(
  text: string,
  mentionItems: MentionItem[],
): ParsedPrompt {
  const result: ParsedPrompt = {
    globalPrompt: '',
    anglePrompts: {},
    refPrompts: {},
    productPrompts: {},
  };

  if (!text.trim()) return result;

  // Build token→item map para lookup rápido
  const tokenMap = new Map<string, MentionItem>();
  for (const item of mentionItems) {
    tokenMap.set(item.token, item);
  }

  // Encontrar todas as posições de @ mentions válidos
  const mentionRegex = /@([a-zA-ZÀ-ú0-9_]+)/g;
  const mentions: Array<{ start: number; end: number; item: MentionItem }> = [];

  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(text)) !== null) {
    const rawToken = normalize(match[1]);
    const item = tokenMap.get(rawToken);
    if (item) {
      mentions.push({
        start: match.index,
        end: match.index + match[0].length,
        item,
      });
    }
  }

  // Sem mentions → tudo é global
  if (mentions.length === 0) {
    result.globalPrompt = text.trim();
    return result;
  }

  // Texto antes do primeiro mention = global
  result.globalPrompt = text.slice(0, mentions[0].start).trim();

  // Para cada mention, pegar o texto até o próximo mention
  for (let i = 0; i < mentions.length; i++) {
    const current = mentions[i];
    const nextStart = i + 1 < mentions.length ? mentions[i + 1].start : text.length;
    const instruction = text.slice(current.end, nextStart).trim();

    const { item } = current;
    if (item.type === 'angle') {
      result.anglePrompts[item.id] = instruction;
    } else if (item.type === 'ref') {
      result.refPrompts[item.id] = instruction;
    } else if (item.type === 'product') {
      result.productPrompts[item.id] = instruction;
    }
  }

  return result;
}

// ── Filter Mentions (para dropdown) ──

export function filterMentions(
  items: MentionItem[],
  query: string,
): MentionItem[] {
  if (!query) return items;
  const q = normalize(query);
  return items.filter(item => item.token.startsWith(q) || item.displayText.toLowerCase().startsWith('@' + q));
}
