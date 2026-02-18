import React, { useState, useEffect } from 'react';

interface Props {
  /** Timestamp (Date.now()) de quando a geração começou */
  startTime: number;
  /** Tempo em ms para mostrar o banner de alta demanda (default: 240000 = 4 min) */
  thresholdMs?: number;
  /** Callback ao clicar "Continuar em segundo plano" */
  onContinueInBackground: () => void;
  /** Mostrar link discreto desde o início (default: true) */
  showDiscreteLink?: boolean;
}

export const SlowServerBanner: React.FC<Props> = ({
  startTime,
  thresholdMs = 240000,
  onContinueInBackground,
  showDiscreteLink = true,
}) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const showWarning = elapsed >= thresholdMs;

  return (
    <div className="w-full flex flex-col items-center gap-3 mt-4">
      {/* Banner de alta demanda — aparece após threshold */}
      {showWarning && (
        <div className="w-full max-w-md mx-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex items-start gap-2.5">
            <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5 text-sm flex-shrink-0"></i>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 leading-snug">
                Nossos servidores estão com alta demanda
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Sua geração continua rodando! Você pode voltar ao Vizzu normalmente — quando a imagem ficar pronta, ela aparece na sua <span className="font-semibold">Galeria</span>.
              </p>
              <button
                onClick={onContinueInBackground}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/25 transition-all"
              >
                <i className="fas fa-check"></i>
                Entendi, voltar ao Vizzu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link discreto — sempre visível (antes do banner aparecer) */}
      {showDiscreteLink && !showWarning && (
        <button
          onClick={onContinueInBackground}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          Continuar em segundo plano
          <i className="fas fa-arrow-right text-[9px]"></i>
        </button>
      )}
    </div>
  );
};
