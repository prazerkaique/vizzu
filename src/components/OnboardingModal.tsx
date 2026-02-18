import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onSaveProfile: (name: string, whatsapp: string, segment: string) => Promise<boolean>;
  onComplete: () => void;
  isLoading: boolean;
}

const SEGMENTS = [
  'Moda Feminina',
  'Moda Masculina',
  'Calçados',
  'Acessórios',
  'Infantil',
  'Fitness',
  'Praia',
  'Cosméticos',
  'Decoração',
  'Outro',
];

const SALES_CHANNELS = [
  { value: 'ecommerce', label: 'E-commerce (loja virtual)' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'redes-sociais', label: 'Redes sociais (Instagram, etc.)' },
  { value: 'outros', label: 'Outros' },
];

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onSaveProfile, onComplete, isLoading }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [segment, setSegment] = useState('');
  const [segmentCustom, setSegmentCustom] = useState('');
  const [sellsOnline, setSellsOnline] = useState<boolean | null>(null);
  const [salesChannels, setSalesChannels] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [instagramOpened, setInstagramOpened] = useState(false);

  if (!isOpen) return null;

  const finalSegment = segment === 'Outro' ? (segmentCustom.trim() || 'Outro') : segment;
  const isStep1Valid =
    name.trim().length > 0 &&
    whatsapp.replace(/\D/g, '').length >= 10 &&
    segment !== '' &&
    (segment !== 'Outro' || segmentCustom.trim().length > 0) &&
    sellsOnline !== null &&
    (sellsOnline === false || salesChannels.length > 0);

  const toggleChannel = (ch: string) => {
    setSalesChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handleContinue = async () => {
    if (!isStep1Valid) return;
    setError('');

    // Montar segmento completo com info de venda online
    let fullSegment = finalSegment;
    if (sellsOnline) {
      fullSegment += ` | Vende online: ${salesChannels.join(', ')}`;
    } else {
      fullSegment += ' | Não vende online';
    }

    const success = await onSaveProfile(name, whatsapp, fullSegment);
    if (success) {
      setStep(2);
    } else {
      setError('Erro ao salvar. Tente novamente.');
    }
  };

  const handleOpenInstagram = () => {
    window.open('https://instagram.com/vizzu.pro', '_blank');
    setInstagramOpened(true);
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(92vh, 92dvh)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 sm:px-8 pt-6 pb-4">
          <img src="/Logo2Black.png" alt="Vizzu" className="h-6 mb-4" />

          {/* Step badges */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1
              ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
              : 'bg-green-500 text-white'
            }`}>
              {step > 1 ? <i className="fas fa-check text-xs"></i> : '1'}
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2
              ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
              : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
          </div>

          <h2
            className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {step === 1 ? 'Vamos configurar sua loja' : 'Ganhe créditos grátis!'}
          </h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            {step === 1
              ? 'Precisamos de algumas informações para personalizar sua experiência.'
              : 'Siga o Vizzu no Instagram e desbloqueie seus créditos do plano gratuito.'}
          </p>
        </div>

        {/* Divisor */}
        <div className="mx-6 sm:mx-8 border-t border-gray-200 flex-shrink-0" />

        {/* Corpo */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Nome da loja */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nome da loja *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Moda Bella"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B] transition-colors"
                  autoFocus
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  WhatsApp *
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500">
                    <i className="fab fa-whatsapp text-lg"></i>
                  </div>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(formatWhatsApp(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B] transition-colors"
                  />
                </div>
              </div>

              {/* Segmento */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Segmento *
                </label>
                <select
                  value={segment}
                  onChange={e => { setSegment(e.target.value); if (e.target.value !== 'Outro') setSegmentCustom(''); }}
                  className={`w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B] transition-colors appearance-none bg-white ${segment ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  <option value="" disabled>Selecione seu segmento</option>
                  {SEGMENTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Campo para especificar "Outro" */}
                {segment === 'Outro' && (
                  <input
                    type="text"
                    value={segmentCustom}
                    onChange={e => setSegmentCustom(e.target.value)}
                    placeholder="Especifique seu segmento"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B] transition-colors mt-2"
                    autoFocus
                  />
                )}
              </div>

              {/* Vende online? */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Você vende online? *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSellsOnline(true); }}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sellsOnline === true
                      ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 text-[#FF6B6B]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSellsOnline(false); setSalesChannels([]); }}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sellsOnline === false
                      ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 text-[#FF6B6B]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    Não
                  </button>
                </div>

                {/* Canais de venda */}
                {sellsOnline === true && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">Por onde você vende?</p>
                    <div className="flex flex-wrap gap-2">
                      {SALES_CHANNELS.map(ch => (
                        <button
                          key={ch.value}
                          type="button"
                          onClick={() => toggleChannel(ch.value)}
                          className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${salesChannels.includes(ch.value)
                            ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 text-[#FF6B6B]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </p>
              )}
            </div>
          ) : (
            /* Step 2 — Instagram */
            <div className="flex flex-col items-center text-center py-4">
              {/* Ícone Instagram */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center mb-5">
                <i className="fab fa-instagram text-white text-4xl"></i>
              </div>

              <p className="text-lg font-bold text-gray-900 mb-1">@vizzu.pro</p>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">
                Siga a gente no Instagram e desbloqueie seus <span className="font-bold text-[#FF6B6B]">5 créditos grátis</span> para criar imagens incríveis!
              </p>

              {/* Botão abrir Instagram */}
              <button
                onClick={handleOpenInstagram}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${instagramOpened
                  ? 'border-2 border-green-500 bg-green-50 text-green-600'
                  : 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:shadow-lg hover:shadow-[#FD1D1D]/25'
                }`}
              >
                <i className="fab fa-instagram"></i>
                {instagramOpened ? 'Instagram aberto!' : 'Seguir @vizzu.pro'}
                {!instagramOpened && <i className="fas fa-external-link-alt text-[10px] opacity-70"></i>}
                {instagramOpened && <i className="fas fa-check text-xs"></i>}
              </button>

              {/* Botão "Já segui" — só aparece após abrir Instagram */}
              {instagramOpened && (
                <button
                  onClick={handleFinish}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/25 transition-all mt-3 animate-[fadeIn_0.3s_ease-out]"
                >
                  <i className="fas fa-gift"></i>
                  Já segui! Liberar meus créditos
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 sm:px-8 pb-6 pt-2">
          {step === 1 ? (
            <button
              onClick={handleContinue}
              disabled={!isStep1Valid || isLoading}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all ${isStep1Valid && !isLoading
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:shadow-lg hover:shadow-[#FF6B6B]/25'
                : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Salvando...
                </span>
              ) : (
                'Continuar'
              )}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-2"
            >
              Pular por agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
