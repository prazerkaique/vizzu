import { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { TourExitConfirm } from './TourExitConfirm';

// ═══════════════════════════════════════════════════════════════
// OnboardingProgress — Card stepper no topo do Dashboard
// Mostra as 5 etapas do onboarding com progresso visual
// ═══════════════════════════════════════════════════════════════

interface OnboardingProgressProps {
  theme: 'dark' | 'light';
}

export function OnboardingProgress({ theme }: OnboardingProgressProps) {
  const { navigateTo } = useUI();
  const { steps, currentStep, completedCount, totalSteps, dismissOnboarding } = useOnboarding();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isDark = theme === 'dark';

  const allDone = completedCount === totalSteps;

  return (
    <>
      <div className={
        'rounded-2xl p-5 mb-4 relative overflow-hidden ' +
        (isDark
          ? 'bg-neutral-900/80 backdrop-blur-xl border border-neutral-800'
          : 'bg-white/80 backdrop-blur-xl border border-gray-200')
      }>
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF9F43]/10 rounded-full -translate-y-1/2 translate-x-1/2" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center">
              <i className="fas fa-compass text-white text-sm" />
            </div>
            <div>
              <h2 className={'text-sm font-bold ' + (isDark ? 'text-white' : 'text-gray-900')}>
                Copiloto Vizzu
              </h2>
              <p className={'text-[10px] ' + (isDark ? 'text-neutral-500' : 'text-gray-400')}>
                {allDone ? 'Tudo explorado!' : 'Primeiros passos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={
              'text-xs font-medium px-2 py-1 rounded-full ' +
              (isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500')
            }>
              {completedCount}/{totalSteps}
            </span>

            {!allDone && (
              <button
                onClick={() => setShowExitConfirm(true)}
                className={
                  'text-[10px] font-medium transition-colors ' +
                  (isDark ? 'text-neutral-600 hover:text-neutral-400' : 'text-gray-400 hover:text-gray-600')
                }
              >
                Pular tutorial
              </button>
            )}
          </div>
        </div>

        {/* Step badges */}
        <div className="relative flex items-center gap-1.5 mb-5">
          {steps.map((step, i) => {
            const isCompleted = step.isCompleted;
            const isCurrent = currentStep?.id === step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Badge */}
                <button
                  onClick={() => {
                    if (!allDone) navigateTo(step.targetPage);
                  }}
                  className={
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ' +
                    (isCompleted
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white shadow-sm'
                      : isCurrent
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white ring-4 ring-[#FF6B6B]/20 shadow-lg'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                          : 'bg-gray-100 text-gray-400 border border-gray-200')
                  }
                >
                  {isCompleted ? <i className="fas fa-check text-[10px]" /> : step.number}
                </button>

                {/* Linha conectora */}
                {i < steps.length - 1 && (
                  <div className={
                    'flex-1 h-0.5 mx-1 rounded-full ' +
                    (isCompleted
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]'
                      : isDark ? 'bg-neutral-800' : 'bg-gray-200')
                  } />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step detail OU parabéns */}
        {allDone ? (
          <div className="text-center py-2">
            <div className="text-2xl mb-2">
              <i className="fas fa-party-horn text-[#FF9F43]" />
            </div>
            <h3 className={'text-sm font-bold mb-1 ' + (isDark ? 'text-white' : 'text-gray-900')}>
              Parabéns! Você explorou todas as ferramentas.
            </h3>
            <p className={'text-xs mb-3 ' + (isDark ? 'text-neutral-400' : 'text-gray-500')}>
              Agora é só criar. Boas vendas!
            </p>
            <button
              onClick={dismissOnboarding}
              className={
                'px-4 py-2 rounded-xl text-xs font-medium transition-colors ' +
                (isDark
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }
            >
              Fechar Copiloto
            </button>
          </div>
        ) : currentStep && (
          <div className={
            'flex items-start gap-3 rounded-xl p-3 ' +
            (isDark ? 'bg-neutral-800/50' : 'bg-gray-50')
          }>
            <div className={
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' +
              (isDark ? 'bg-neutral-700' : 'bg-white shadow-sm border border-gray-200')
            }>
              <i className={
                'fas ' + currentStep.icon + ' text-sm ' +
                (isDark ? 'text-neutral-300' : 'text-gray-600')
              } />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={'text-sm font-bold mb-0.5 ' + (isDark ? 'text-white' : 'text-gray-900')}>
                {currentStep.title}
              </h3>
              <p className={
                'text-xs leading-relaxed mb-3 ' +
                (isDark ? 'text-neutral-400' : 'text-gray-500')
              }>
                {currentStep.description}
              </p>

              <button
                onClick={() => navigateTo(currentStep.targetPage)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90 transition-opacity"
              >
                Começar <i className="fas fa-arrow-right ml-1 text-[10px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showExitConfirm && (
        <TourExitConfirm
          theme={theme}
          onContinue={() => setShowExitConfirm(false)}
          onExit={() => {
            dismissOnboarding();
            setShowExitConfirm(false);
          }}
        />
      )}
    </>
  );
}
