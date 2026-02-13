// ═══════════════════════════════════════════════════════════════
import type { VizzuTheme } from '../../contexts/UIContext';
// VIZZU - Selection Checkbox (modo seleção em cards de imagem)
// ═══════════════════════════════════════════════════════════════

interface SelectionCheckboxProps {
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: () => void;
  theme?: VizzuTheme;
}

export default function SelectionCheckbox({
  isSelected,
  isSelectionMode,
  onToggle,
  theme = 'dark',
}: SelectionCheckboxProps) {
  const isDark = theme !== 'light';

  if (!isSelectionMode) return null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={
        'absolute top-2 left-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 ' +
        (isSelected
          ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF9F43] text-white shadow-md'
          : isDark
            ? 'bg-black/40 border border-white/20 text-transparent hover:border-white/40'
            : 'bg-white/80 border border-gray-300 text-transparent hover:border-gray-400')
      }
    >
      {isSelected && <i className="fas fa-check text-[10px]" />}
    </button>
  );
}
