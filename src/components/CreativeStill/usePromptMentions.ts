// ═══════════════════════════════════════════════════════════════
// VIZZU - usePromptMentions Hook (Creative Still)
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef } from 'react';
import type { MentionItem, CompositionProduct } from './promptParser';
import { buildMentionMap, filterMentions } from './promptParser';

interface UsePromptMentionsOpts {
  selectedAngles: string[];
  anglesConfig: Array<{ id: string; label: string; icon: string }>;
  referenceCount: number;
  compositionProducts: CompositionProduct[];
  prompt: string;
  setPrompt: (value: string) => void;
  onPromptChange?: () => void; // chamado quando o prompt muda (para limpar optimizedPrompt)
}

interface UsePromptMentionsReturn {
  showDropdown: boolean;
  filteredItems: MentionItem[];
  selectedIndex: number;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSelect: (item: MentionItem) => void;
  dismiss: () => void;
  mentionItems: MentionItem[]; // lista completa de mentions disponíveis
}

export function usePromptMentions(opts: UsePromptMentionsOpts): UsePromptMentionsReturn {
  const {
    selectedAngles,
    anglesConfig,
    referenceCount,
    compositionProducts,
    prompt,
    setPrompt,
    onPromptChange,
  } = opts;

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const mentionStartRef = useRef<number>(-1);

  // Lista completa de mentions disponíveis
  const mentionItems = useMemo(
    () => buildMentionMap(selectedAngles, anglesConfig, referenceCount, compositionProducts),
    [selectedAngles, anglesConfig, referenceCount, compositionProducts],
  );

  // Items filtrados pelo query atual
  const filteredItems = useMemo(
    () => filterMentions(mentionItems, mentionQuery),
    [mentionItems, mentionQuery],
  );

  const dismiss = useCallback(() => {
    setShowDropdown(false);
    setSelectedIndex(0);
    setMentionQuery('');
    mentionStartRef.current = -1;
  }, []);

  // Detecta @ e gerencia o dropdown
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setPrompt(value);
    onPromptChange?.();

    // Procurar o último @ antes do cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      dismiss();
      return;
    }

    // Verificar se tem espaço entre o @ e o cursor (indica fim da mention)
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

    // Se o @ está no início ou precedido por espaço/newline
    const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && lastAtIndex !== 0) {
      dismiss();
      return;
    }

    // Se tem espaço no query e já encontrou um match, não é mais mention query
    // Mas permitir query sem espaço (ex: @detalhefrente)
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      dismiss();
      return;
    }

    // Temos uma mention query ativa
    mentionStartRef.current = lastAtIndex;
    setMentionQuery(textAfterAt);

    const filtered = filterMentions(mentionItems, textAfterAt);
    if (filtered.length > 0) {
      setShowDropdown(true);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  }, [setPrompt, onPromptChange, mentionItems, dismiss]);

  // Inserir mention no texto
  const handleSelect = useCallback((item: MentionItem) => {
    const startPos = mentionStartRef.current;
    if (startPos === -1) {
      dismiss();
      return;
    }

    // Substituir do @ até o cursor com o displayText + espaço
    const before = prompt.slice(0, startPos);
    // Encontrar o fim da query (primeiro espaço/newline ou fim)
    const afterAt = prompt.slice(startPos);
    const queryEnd = afterAt.search(/[\s\n]|$/);
    const after = prompt.slice(startPos + queryEnd);

    const newText = before + item.displayText + ' ' + after.trimStart();
    setPrompt(newText);
    onPromptChange?.();
    dismiss();
  }, [prompt, setPrompt, onPromptChange, dismiss]);

  // Navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
  }, [showDropdown, filteredItems, selectedIndex, handleSelect, dismiss]);

  return {
    showDropdown,
    filteredItems,
    selectedIndex,
    handleKeyDown,
    handleChange,
    handleSelect,
    dismiss,
    mentionItems,
  };
}
