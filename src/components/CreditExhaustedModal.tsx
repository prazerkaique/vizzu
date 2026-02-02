// ═══════════════════════════════════════════════════════════════
// VIZZU - Modal de Créditos Esgotados (2 Camadas)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Plan, CREDIT_PACKAGES } from '../hooks/useCredits';
import { usePlans } from '../contexts/PlansContext';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 creditsNeeded: number;
 currentCredits: number;
 currentPlan: Plan;
 billingPeriod: 'monthly' | 'yearly';
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic';
 daysUntilRenewal?: number;
 onBuyCredits: (amount: number) => void;
 onUpgradePlan: (planId: string) => void;
 onSetBillingPeriod: (period: 'monthly' | 'yearly') => void;
 theme?: 'dark' | 'light';
}

// Textos de contexto da ação
const ACTION_CONTEXT_TEXT: Record<string, string> = {
 studio: 'gerar este fundo de estúdio',
 cenario: 'criar este cenário',
 lifestyle: 'gerar este modelo',
 video: 'criar este vídeo',
 provador: 'usar o Provador Virtual',
 generic: 'continuar',
};

export const CreditExhaustedModal: React.FC<Props> = ({
 isOpen,
 onClose,
 creditsNeeded,
 currentCredits,
 currentPlan,
 billingPeriod,
 actionContext,
 daysUntilRenewal = 30,
 onBuyCredits,
 onUpgradePlan,
 onSetBillingPeriod,
 theme = 'dark',
}) => {
 const [layer, setLayer] = useState<1 | 2>(1);
 const [selectedCredits, setSelectedCredits] = useState<number>(10);
 const [isAnimating, setIsAnimating] = useState(false);

 const { plans } = usePlans();
 const isDark = theme === 'dark';
 const isInsufficient = currentCredits > 0 && currentCredits < creditsNeeded;
 const isZero = currentCredits === 0;

 // Reset layer when modal opens
 useEffect(() => {
 if (isOpen) {
 setLayer(1);
 setIsAnimating(true);
 setTimeout(() => setIsAnimating(false), 300);
 }
 }, [isOpen]);

 if (!isOpen) return null;

 const actionText = ACTION_CONTEXT_TEXT[actionContext] || ACTION_CONTEXT_TEXT.generic;

 // Calcular preço dos créditos baseado no plano
 const getCreditPackagePrice = (amount: number) => {
 return (amount * currentPlan.creditPrice).toFixed(2).replace('.', ',');
 };

 // Encontrar próximo plano para upgrade
 const getNextPlan = () => {
 const planIndex = plans.findIndex(p => p.id === currentPlan.id);
 return planIndex < plans.length - 1 ? plans[planIndex + 1] : null;
 };

 const nextPlan = getNextPlan();

 // Handler para transição entre camadas
 const handleGoToPlans = () => {
 setIsAnimating(true);
 setTimeout(() => {
 setLayer(2);
 setIsAnimating(false);
 }, 200);
 };

 const handleBackToCompact = () => {
 setIsAnimating(true);
 setTimeout(() => {
 setLayer(1);
 setIsAnimating(false);
 }, 200);
 };

 // ═══════════════════════════════════════════════════════════════
 // CAMADA 1: Modal Compacto
 // ═══════════════════════════════════════════════════════════════
 const renderCompactModal = () => (
 <div className={`relative w-full max-w-[420px] mx-4 rounded-2xl overflow-hidden transition-all duration-300 ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'} ${isDark ? 'bg-white/95 border border-gray-200' : 'bg-white border border-gray-200'}`} style={{ backdropFilter: 'blur(20px)' }}>
 {/* Close button */}
 <button
 onClick={onClose}
 className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-50 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}
 >
 <i className="fas fa-times"></i>
 </button>

 <div className="p-8">
 {/* Ilustração/Ícone */}
 <div className="flex justify-center mb-6">
 <div className="relative">
 <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#FF6B9D]/20 flex items-center justify-center">
 <i className="fas fa-coins text-3xl text-[#FF6B6B]"></i>
 </div>
 {/* Animação de moedas */}
 <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center animate-bounce">
 <span className="text-white text-xs font-bold">0</span>
 </div>
 </div>
 </div>

 {/* Título */}
 <h2 className={`text-xl font-bold font-serif text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
 {isInsufficient ? 'Créditos insuficientes' : 'Seus créditos acabaram'}
 </h2>

 {/* Subtítulo */}
 <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
 {isInsufficient ? (
 <>Você tem <span className="text-[#FF6B6B] font-semibold">{currentCredits}</span> créditos, mas precisa de <span className="text-[#FF6B6B] font-semibold">{creditsNeeded}</span> para {actionText}.</>
 ) : (
 <>Você precisa de <span className="text-[#FF6B6B] font-semibold">{creditsNeeded}</span> créditos para {actionText}.</>
 )}
 </p>

 {/* Saldo atual */}
 <div className={`text-center text-xs mb-6 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
 <i className="fas fa-wallet mr-1.5"></i>
 Seu saldo atual: <span className="font-semibold">{currentCredits} créditos</span>
 {daysUntilRenewal && daysUntilRenewal <= 30 && (
 <span className="ml-1">· Renova em {daysUntilRenewal} dias</span>
 )}
 </div>

 {/* Badge especial para plano atual */}
 {currentPlan.id === 'basic' && nextPlan && (
 <div className="flex justify-center mb-4">
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FF6B6B]/20 text-[#FF6B6B]">
 <i className="fas fa-gift"></i>
 Ganhe {nextPlan.limit - currentPlan.limit} créditos extras com upgrade
 </span>
 </div>
 )}

 {currentPlan.id === 'premier' && (
 <div className="flex justify-center mb-4">
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
 <i className="fas fa-crown"></i>
 Você tem o melhor preço: R$ {currentPlan.creditPrice.toFixed(2).replace('.', ',')}/crédito
 </span>
 </div>
 )}

 {/* Renovação próxima */}
 {daysUntilRenewal && daysUntilRenewal <= 3 && (
 <div className={`p-3 rounded-lg mb-4 text-xs ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
 <i className="fas fa-lightbulb mr-1.5"></i>
 Seus créditos renovam em {daysUntilRenewal} dia{daysUntilRenewal !== 1 ? 's' : ''}. Prefere aguardar?
 </div>
 )}

 {/* CTAs dinâmicos baseados no plano */}
 <div className="space-y-3">
 {/* CTA Principal */}
 <button
 onClick={() => onBuyCredits(10)}
 className="w-full py-3.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:-translate-y-0.5 "
 >
 <i className="fas fa-bolt mr-2"></i>
 Comprar 10 créditos - R$ {getCreditPackagePrice(10)}
 </button>

 {/* CTA Secundário */}
 {nextPlan ? (
 <button
 onClick={() => onUpgradePlan(nextPlan.id)}
 className={`w-full py-3.5 rounded-xl font-semibold text-sm border transition-all hover:-translate-y-0.5 ${isDark ? 'border-zinc-600 text-gray-600 hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B]' : 'border-gray-300 text-gray-700 hover:border-[#FF6B6B] hover:text-[#FF6B6B]'}`}
 >
 <i className="fas fa-arrow-up mr-2"></i>
 Fazer upgrade pro {nextPlan.name} - {nextPlan.limit} créd/mês
 </button>
 ) : (
 <button
 onClick={() => onBuyCredits(25)}
 className={`w-full py-3.5 rounded-xl font-semibold text-sm border transition-all hover:-translate-y-0.5 ${isDark ? 'border-zinc-600 text-gray-600 hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B]' : 'border-gray-300 text-gray-700 hover:border-[#FF6B6B] hover:text-[#FF6B6B]'}`}
 >
 <i className="fas fa-plus mr-2"></i>
 Comprar 25 créditos - R$ {getCreditPackagePrice(25)}
 </button>
 )}
 </div>

 {/* Chips de créditos rápidos (para Pro e Premier) */}
 {(currentPlan.id === 'pro' || currentPlan.id === 'premier' || currentPlan.id === 'enterprise') && (
 <div className="flex gap-2 justify-center mt-4">
 {[10, 25, 50].map(amount => (
 <button
 key={amount}
 onClick={() => onBuyCredits(amount)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-gray-50 text-gray-500 hover:bg-[#FF6B6B]/20 hover:text-[#FF6B6B] hover:ring-1 hover:ring-[#FF6B6B]/50' : 'bg-gray-100 text-gray-600 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]'}`}
 >
 {amount} créd. R${getCreditPackagePrice(amount)}
 </button>
 ))}
 </div>
 )}

 {/* Info de economia (para Starter) */}
 {currentPlan.id === 'basic' && nextPlan && (
 <p className={`text-[10px] text-center mt-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
 <i className="fas fa-info-circle mr-1"></i>
 No plano {nextPlan.name} você paga R$ {nextPlan.creditPrice.toFixed(2).replace('.', ',')}/crédito (economia de {Math.round((1 - nextPlan.creditPrice / currentPlan.creditPrice) * 100)}%)
 </p>
 )}

 {/* Link para ver todos os planos */}
 <button
 onClick={handleGoToPlans}
 className="w-full mt-4 text-[#FF6B6B] text-sm font-medium hover:text-[#FF6B6B] transition-colors flex items-center justify-center gap-1"
 >
 Ver todos os planos
 <i className="fas fa-arrow-right text-xs"></i>
 </button>
 </div>
 </div>
 );

 // ═══════════════════════════════════════════════════════════════
 // CAMADA 2: Modal Expandido (Planos)
 // ═══════════════════════════════════════════════════════════════
 const renderExpandedModal = () => (
 <div className={`relative w-full max-w-[1100px] max-h-[90vh] mx-4 rounded-2xl overflow-hidden transition-all duration-300 ${isAnimating ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'} ${isDark ? 'bg-white/95 border border-gray-200' : 'bg-white border border-gray-200'}`} style={{ backdropFilter: 'blur(20px)' }}>
 {/* Header */}
 <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${isDark ? 'bg-white/95 border-gray-200' : 'bg-white border-gray-200'}`}>
 <button
 onClick={handleBackToCompact}
 className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
 >
 <i className="fas fa-arrow-left"></i>
 Voltar
 </button>
 <button
 onClick={onClose}
 className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-50 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}
 >
 <i className="fas fa-times"></i>
 </button>
 </div>

 <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-6">
 {/* Título */}
 <div className="text-center mb-6">
 <h2 className={`text-2xl font-bold font-serif mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
 Escolha o melhor plano para você
 </h2>
 <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
 Transforme suas fotos de produtos em imagens profissionais com IA
 </p>
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex justify-center mb-8">
 <div className={`inline-flex items-center gap-1 p-1 rounded-full ${isDark ? 'bg-gray-50' : 'bg-gray-100'}`}>
 <button
 onClick={() => onSetBillingPeriod('monthly')}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-white text-gray-900 ' : isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
 >
 Mensal
 </button>
 <button
 onClick={() => onSetBillingPeriod('yearly')}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billingPeriod === 'yearly' ? 'bg-white text-gray-900 ' : isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
 >
 Anual
 <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">-20%</span>
 </button>
 </div>
 </div>

 {/* Cards de Planos */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
 {plans.filter(p => p.id !== 'enterprise').map((plan) => {
 const isCurrentPlan = plan.id === currentPlan.id;
 const isPremier = plan.id === 'premier';
 const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;

 return (
 <div
 key={plan.id}
 className={`relative rounded-2xl p-5 transition-all ${isCurrentPlan ? 'ring-2 ring-[#FF6B6B]' : ''} ${isPremier ? 'ring-2 ring-amber-500' : ''} ${isDark ? 'bg-gray-50/50 border border-gray-200' : 'bg-gray-50 border border-gray-200'}`}
 >
 {/* Badge */}
 {isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#FF6B6B] text-white uppercase">
 Plano Atual
 </span>
 </div>
 )}
 {isPremier && !isCurrentPlan && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase flex items-center gap-1">
 <i className="fas fa-star text-[8px]"></i>
 Melhor Valor
 </span>
 </div>
 )}

 {/* Nome do plano */}
 <h3 className={`text-lg font-bold font-serif mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
 {plan.name}
 </h3>

 {/* Créditos */}
 <p className={`text-sm mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
 <span className="text-[#FF6B6B] font-semibold">{plan.limit}</span> créditos/mês
 </p>

 {/* Preço */}
 <div className="mb-4">
 <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
 R$ {price.toFixed(2).replace('.', ',')}
 </span>
 <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>/mês</span>
 </div>

 {/* Botão */}
 <button
 onClick={() => !isCurrentPlan && onUpgradePlan(plan.id)}
 disabled={isCurrentPlan}
 className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${isCurrentPlan ? isDark ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] text-white hover:opacity-90 hover:-translate-y-0.5'}`}
 >
 {isCurrentPlan ? 'Plano Atual' : plan.priceMonthly > currentPlan.priceMonthly ? 'Fazer upgrade' : 'Mudar plano'}
 </button>

 {/* Features */}
 <div className="mt-4 space-y-2">
 {plan.features.slice(0, 4).map((feature, idx) => (
 <div key={idx} className={`flex items-start gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
 <i className="fas fa-check text-emerald-500 mt-0.5 text-[10px]"></i>
 <span>{feature}</span>
 </div>
 ))}
 {plan.features.length > 4 && (
 <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
 +{plan.features.length - 4} recursos
 </p>
 )}
 </div>

 {/* Preço por crédito */}
 <p className={`text-[10px] mt-3 pt-3 border-t ${isDark ? 'border-gray-200 text-zinc-500' : 'border-gray-200 text-gray-400'}`}>
 R$ {plan.creditPrice.toFixed(2).replace('.', ',')}/crédito
 </p>
 </div>
 );
 })}
 </div>

 {/* Seção de Créditos Avulsos */}
 <div className={`rounded-2xl p-5 ${isDark ? 'bg-gray-50/30 border border-gray-200' : 'bg-gray-50 border border-gray-200'}`}>
 <div className="flex items-center gap-2 mb-4">
 <i className="fas fa-credit-card text-[#FF6B6B]"></i>
 <h3 className={`text-lg font-bold font-serif ${isDark ? 'text-white' : 'text-gray-900'}`}>
 Comprar Créditos Avulsos
 </h3>
 </div>

 <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
 Seu preço: <span className="text-[#FF6B6B] font-semibold">R$ {currentPlan.creditPrice.toFixed(2).replace('.', ',')}/crédito</span> (baseado no plano {currentPlan.name})
 </p>

 {/* Grid de pacotes */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 {CREDIT_PACKAGES.map((amount) => (
 <button
 key={amount}
 onClick={() => setSelectedCredits(amount)}
 className={`p-3 rounded-xl border-2 transition-all ${selectedCredits === amount ? 'border-[#FF6B6B] bg-[#FF6B6B]/10' : isDark ? 'border-gray-200 hover:border-zinc-600' : 'border-gray-200 hover:border-gray-300'}`}
 >
 <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{amount}</p>
 <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>créditos</p>
 <p className={`text-sm font-semibold mt-1 ${selectedCredits === amount ? 'text-[#FF6B6B]' : isDark ? 'text-gray-600' : 'text-gray-700'}`}>
 R$ {getCreditPackagePrice(amount)}
 </p>
 </button>
 ))}
 </div>

 <button
 onClick={() => onBuyCredits(selectedCredits)}
 className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF6B9D] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
 >
 <i className="fas fa-shopping-cart mr-2"></i>
 Comprar {selectedCredits} créditos - R$ {getCreditPackagePrice(selectedCredits)}
 </button>
 </div>
 </div>
 </div>
 );

 // ═══════════════════════════════════════════════════════════════
 // RENDER
 // ═══════════════════════════════════════════════════════════════
 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
 onClick={onClose}
 />

 {/* Modal */}
 <div className="relative z-10 flex items-center justify-center w-full">
 {layer === 1 ? renderCompactModal() : renderExpandedModal()}
 </div>

 {/* Estilos de animação */}
 <style>{`
 @keyframes fadeIn {
 from { opacity: 0; }
 to { opacity: 1; }
 }
 .animate-fadeIn {
 animation: fadeIn 0.2s ease-out;
 }
 `}</style>
 </div>
 );
};
