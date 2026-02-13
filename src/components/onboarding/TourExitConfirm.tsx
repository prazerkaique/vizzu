import { useEffect } from 'react';

interface TourExitConfirmProps {
  theme: 'dark' | 'light';
  onContinue: () => void;
  onExit: () => void;
}

export function TourExitConfirm({ theme, onContinue, onExit }: TourExitConfirmProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onContinue();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onContinue} />

      {/* Modal */}
      <div className={
        'relative rounded-2xl p-6 max-w-sm w-full shadow-2xl ' +
        (isDark ? 'bg-neutral-900 border border-neutral-700' : 'bg-white border border-gray-200')
      }>
        <div className="text-center">
          <div className={
            'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ' +
            (isDark ? 'bg-neutral-800' : 'bg-gray-100')
          }>
            <i className={'fas fa-door-open text-lg ' + (isDark ? 'text-neutral-400' : 'text-gray-500')} />
          </div>

          <h3 className={'text-lg font-bold mb-2 ' + (isDark ? 'text-white' : 'text-gray-900')}>
            Sair do tour?
          </h3>
          <p className={'text-sm mb-6 ' + (isDark ? 'text-neutral-400' : 'text-gray-500')}>
            Você pode acessar o tour novamente nas configurações.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onContinue}
              className={
                'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ' +
                (isDark
                  ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300')
              }
            >
              Continuar tour
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
            >
              Sim, sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
