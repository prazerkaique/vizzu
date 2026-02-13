// ═══════════════════════════════════════════════════════════════
// VIZZU - Mention Dropdown (Creative Still)
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import type { MentionItem } from './promptParser';
import type { VizzuTheme } from '../../contexts/UIContext';

interface MentionDropdownProps {
  items: MentionItem[];
  selectedIndex: number;
  onSelect: (item: MentionItem) => void;
  visible: boolean;
  theme: VizzuTheme;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  angle: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'bg-blue-500/20', darkText: 'text-blue-400' },
  ref: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'bg-orange-500/20', darkText: 'text-orange-400' },
  product: { bg: 'bg-emerald-100', text: 'text-emerald-600', darkBg: 'bg-emerald-500/20', darkText: 'text-emerald-400' },
};

const TYPE_LABELS: Record<string, string> = {
  angle: 'Ângulos',
  ref: 'Referências',
  product: 'Produtos',
};

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  items,
  selectedIndex,
  onSelect,
  visible,
  theme,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const isDark = theme !== 'light';

  // Scroll item selecionado para visível
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!visible || items.length === 0) return null;

  // Agrupar por tipo para mostrar headers
  let lastType = '';

  return (
    <div
      ref={listRef}
      className={
        'absolute left-0 right-0 z-50 rounded-xl border shadow-xl overflow-y-auto max-h-56 ' +
        (isDark
          ? 'bg-neutral-900/95 border-neutral-700 backdrop-blur-xl'
          : 'bg-white/95 border-gray-200 backdrop-blur-xl')
      }
      style={{ bottom: '100%', marginBottom: 4 }}
      onMouseDown={(e) => e.preventDefault()} // Evita perder focus do textarea
    >
      {items.map((item, i) => {
        const showHeader = item.type !== lastType;
        lastType = item.type;
        const colors = TYPE_COLORS[item.type] || TYPE_COLORS.angle;
        const isSelected = i === selectedIndex;

        return (
          <React.Fragment key={item.type + '-' + item.id}>
            {showHeader && (
              <div
                className={
                  'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ' +
                  (isDark ? 'text-neutral-500 bg-neutral-800/50' : 'text-gray-400 bg-gray-50')
                }
              >
                {TYPE_LABELS[item.type] || item.type}
              </div>
            )}
            <button
              onClick={() => onSelect(item)}
              className={
                'w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ' +
                (isSelected
                  ? isDark
                    ? 'bg-neutral-700/60'
                    : 'bg-gray-100'
                  : isDark
                    ? 'hover:bg-neutral-800'
                    : 'hover:bg-gray-50')
              }
            >
              {/* Ícone */}
              <div
                className={
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ' +
                  (isDark ? colors.darkBg + ' ' + colors.darkText : colors.bg + ' ' + colors.text)
                }
              >
                <i className={'fas ' + item.icon + ' text-xs'}></i>
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <span
                  className={
                    'text-sm font-semibold ' +
                    (isDark ? colors.darkText : colors.text)
                  }
                >
                  {item.displayText}
                </span>
                <span
                  className={
                    'ml-2 text-xs truncate ' +
                    (isDark ? 'text-neutral-500' : 'text-gray-400')
                  }
                >
                  {item.label}
                </span>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
