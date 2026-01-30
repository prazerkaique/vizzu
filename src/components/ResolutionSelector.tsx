// ═══════════════════════════════════════════════════════════════
// VIZZU - Resolution Selector Component
// Seletor de resolução 2K/4K para geração de imagens
// ═══════════════════════════════════════════════════════════════

import React from 'react';

export type Resolution = '2k' | '4k';

interface ResolutionSelectorProps {
  resolution: Resolution;
  onChange: (resolution: Resolution) => void;
  canUse4K: boolean;           // baseado no plano (Pro/Business/Scale)
  onUpgradeClick: () => void;  // abre modal de planos
  theme?: 'dark' | 'light';
  disabled?: boolean;
}

export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  resolution,
  onChange,
  canUse4K,
  onUpgradeClick,
  theme = 'dark',
  disabled = false,
}) => {
  const isDark = theme === 'dark';

  const handleClick = (res: Resolution) => {
    if (disabled) return;

    if (res === '4k' && !canUse4K) {
      // Usuário Free/Starter tentando selecionar 4K
      onUpgradeClick();
      return;
    }

    onChange(res);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
        Resolução
      </label>
      <div className={`flex rounded-lg p-0.5 ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
        {/* Botão 2K */}
        <button
          type="button"
          onClick={() => handleClick('2k')}
          disabled={disabled}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            resolution === '2k'
              ? isDark
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm'
                : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm'
              : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>2K</span>
          <span className={`text-[10px] ${resolution === '2k' ? 'text-white/80' : isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
            [1x]
          </span>
        </button>

        {/* Botão 4K */}
        <button
          type="button"
          onClick={() => handleClick('4k')}
          disabled={disabled}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            !canUse4K
              ? isDark
                ? 'text-neutral-600 cursor-pointer'
                : 'text-gray-400 cursor-pointer'
              : resolution === '4k'
                ? isDark
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm'
                  : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {!canUse4K && (
            <i className="fas fa-lock text-[10px]"></i>
          )}
          <span>4K</span>
          <span className={`text-[10px] ${
            !canUse4K
              ? isDark ? 'text-neutral-600' : 'text-gray-400'
              : resolution === '4k'
                ? 'text-white/80'
                : isDark ? 'text-neutral-500' : 'text-gray-400'
          }`}>
            [2x]
          </span>
        </button>
      </div>

      {/* Mensagem para usuários sem acesso ao 4K */}
      {!canUse4K && (
        <p className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
          <i className="fas fa-info-circle mr-1"></i>
          4K disponível no plano Pro ou superior
        </p>
      )}
    </div>
  );
};

export default ResolutionSelector;
