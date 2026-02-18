import React, { useState, useEffect } from 'react';

interface Props {
  /** Timestamp (Date.now()) de quando a geração começou */
  startTime: number;
  /** Tempo em ms para mostrar o banner de alta demanda (default: 480000 = 8 min) */
  thresholdMs?: number;
  /** Callback ao clicar "Continuar em segundo plano" */
  onContinueInBackground: () => void;
  /** Mostrar link discreto (default: true) — aparece após 2 min */
  showDiscreteLink?: boolean;
  /** Delay em ms para mostrar o link discreto (default: 120000 = 2 min) */
  discreteLinkDelayMs?: number;
}

export const SlowServerBanner: React.FC<Props> = ({
  startTime,
  thresholdMs = 480000,
  onContinueInBackground,
  showDiscreteLink = true,
  discreteLinkDelayMs = 120000,
}) => {
  // Debug: toggle no Painel Master seta 'vizzu-debug-slow' = '10000' (10s)
  const debugMs = typeof window !== 'undefined' ? Number(localStorage.getItem('vizzu-debug-slow') || '0') : 0;
  const effectiveThreshold = debugMs > 0 ? debugMs : thresholdMs;
  const effectiveDiscreteDelay = debugMs > 0 ? Math.min(debugMs / 2, 5000) : discreteLinkDelayMs;

  // Proteção: se startTime é no futuro ou muito antigo (>30 min), ignorar e usar "agora"
  const safeStartTime = (() => {
    const now = Date.now();
    const diff = now - startTime;
    if (diff < 0 || diff > 1800000) return now;
    return startTime;
  })();

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Date.now() - safeStartTime);
    const interval = setInterval(() => {
      setElapsed(Date.now() - safeStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [safeStartTime]);

  const showWarning = elapsed >= effectiveThreshold;
  const showLink = showDiscreteLink && elapsed >= effectiveDiscreteDelay && !showWarning;

  return (
    <div className="w-full flex flex-col items-center gap-3 mt-4">
      {/* Banner de alta demanda — aparece após threshold (8 min) */}
      {showWarning && (
        <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-[#FF6B6B]/20 bg-gradient-to-br from-white to-orange-50 shadow-lg shadow-[#FF6B6B]/10 animate-[fadeInScale_0.5s_ease-out]">
          {/* Barra gradiente no topo */}
          <div className="h-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]" />

          <div className="px-5 py-4">
            {/* Ícone + Título */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B6B]/15 to-[#FF9F43]/15 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-clock text-[#FF6B6B] text-base"></i>
              </div>
              <h3 className="text-base font-bold font-serif text-gray-900 leading-snug">
                Alta demanda nos servidores
              </h3>
            </div>

            {/* Descrição */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4 pl-[52px]">
              Sua geração continua rodando! Quando a imagem ficar pronta, ela aparece na sua <span className="font-semibold text-gray-800">Galeria</span>.
            </p>

            {/* Botão CTA */}
            <button
              onClick={onContinueInBackground}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/25 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
            >
              <i className="fas fa-check text-xs"></i>
              Entendi, voltar ao Vizzu
            </button>
          </div>
        </div>
      )}

      {/* Link discreto — aparece após 2 min (antes do banner de alta demanda) */}
      {showLink && (
        <button
          onClick={onContinueInBackground}
          className="text-xs text-gray-400 hover:text-[#FF6B6B] transition-colors flex items-center gap-1.5 group"
        >
          Continuar em segundo plano
          <i className="fas fa-arrow-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
        </button>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
