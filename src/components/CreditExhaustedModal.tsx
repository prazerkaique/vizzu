// ═══════════════════════════════════════════════════════════════
// VIZZU - Modal de Créditos Esgotados (2 Camadas)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Plan, CREDIT_PACKAGES, INDIVIDUAL_CREDIT_PRICE } from '../hooks/useCredits';
import { usePlans } from '../contexts/PlansContext';
import { supabase } from '../services/supabaseClient';
import type { VizzuTheme } from '../contexts/UIContext';

const MAX_FEATURES_COLLAPSED = 5;

interface Props {
 isOpen: boolean;
 onClose: () => void;
 creditsNeeded: number;
 currentCredits: number;
 editBalance?: number;
 currentPlan: Plan;
 billingPeriod: 'monthly' | 'yearly';
 actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic';
 daysUntilRenewal?: number;
 onBuyCredits: (amount: number) => void;
 onUpgradePlan: (planId: string) => void;
 onSetBillingPeriod: (period: 'monthly' | 'yearly') => void;
 isCheckoutLoading?: boolean;
 theme?: VizzuTheme;
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
 editBalance = 0,
 currentPlan,
 billingPeriod,
 actionContext,
 daysUntilRenewal = 30,
 onBuyCredits,
 onUpgradePlan,
 onSetBillingPeriod,
 isCheckoutLoading = false,
 theme = 'dark',
}) => {
 const [layer, setLayer] = useState<1 | 2>(1);
 const [selectedCredits, setSelectedCredits] = useState<number>(10);
 const [isAnimating, setIsAnimating] = useState(false);
 const [generationsToday, setGenerationsToday] = useState<number | null>(null);

 const { plans, allPlans, masterFeatures, planIncluded, planPersona, planCta } = usePlans();
 const isDark = theme !== 'light';
 const isInsufficient = currentCredits > 0 && currentCredits < creditsNeeded;
 const isZero = currentCredits === 0;
 const isTrial = currentPlan.id === 'free';
 // Compra proativa: usuário clicou em "Comprar mais" sem ter tentado gerar
 const isProactive = currentCredits >= creditsNeeded && actionContext === 'generic';

 // Reset layer when modal opens + fetch social proof
 useEffect(() => {
 if (isOpen) {
 // Compra proativa → abre direto na Layer 2 (planos completos)
 setLayer(isProactive ? 2 : 1);
 setIsAnimating(true);
 setTimeout(() => setIsAnimating(false), 300);
 supabase.rpc('count_generations_today').then(({ data }) => {
  if (data !== null) setGenerationsToday(data);
 });
 }
 }, [isOpen]);

 if (!isOpen) return null;

 const actionText = ACTION_CONTEXT_TEXT[actionContext] || ACTION_CONTEXT_TEXT.generic;

 // Calcular preço dos créditos (preço fixo — bate com Stripe)
 const getCreditPackagePrice = (amount: number) => {
 return (amount * INDIVIDUAL_CREDIT_PRICE).toFixed(2).replace('.', ',');
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
 {isProactive
  ? 'Recarregue seus créditos'
  : isTrial && isZero
   ? 'Gostou do que viu?'
   : isInsufficient
    ? 'Quase lá!'
    : 'Recarregue e continue criando'}
 </h2>

 {/* Subtítulo */}
 <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
 {isProactive ? (
 <>Garanta mais créditos para continuar criando sem interrupções. Você tem <span className="text-[#FF6B6B] font-semibold">{currentCredits}</span> crédito{currentCredits !== 1 ? 's' : ''} restante{currentCredits !== 1 ? 's' : ''}.</>
 ) : isTrial && isZero ? (
 <>Seu teste gratuito de 5 imagens acabou. Escolha um plano para continuar transformando seus produtos.</>
 ) : isInsufficient ? (
 <>Faltam <span className="text-[#FF6B6B] font-semibold">{creditsNeeded - currentCredits}</span> créditos para {actionText}. Recarregue e sua imagem fica pronta.</>
 ) : (
 <>Você precisa de <span className="text-[#FF6B6B] font-semibold">{creditsNeeded}</span> crédito{creditsNeeded !== 1 ? 's' : ''} para {actionText}.</>
 )}
 </p>

 {/* Social proof */}
 {generationsToday !== null && generationsToday > 10 && (
 <div className={`text-center text-[10px] mb-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
 <i className="fas fa-fire-alt mr-1 text-[#FF6B6B]"></i>
 {generationsToday.toLocaleString('pt-BR')} imagens geradas hoje no Vizzu
 </div>
 )}

 {/* Saldo atual */}
 {!isTrial && (
 <div className={`text-center text-xs mb-6 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
 <i className="fas fa-wallet mr-1.5"></i>
 Seu saldo atual: <span className="font-semibold">{currentCredits} créditos</span>{editBalance > 0 && <span className="text-emerald-400 ml-1">+ {editBalance} edição</span>}
 {daysUntilRenewal && daysUntilRenewal <= 30 && (
 <span className="ml-1">· Renova em {daysUntilRenewal} dias</span>
 )}
 </div>
 )}

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
 R$ {INDIVIDUAL_CREDIT_PRICE.toFixed(2).replace('.', ',')}/crédito
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
 {isTrial ? (
 <>
  {/* Trial: CTA principal é escolher plano */}
  <button
  onClick={handleGoToPlans}
  className="w-full py-3.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:-translate-y-0.5"
  >
  <i className="fas fa-rocket mr-2"></i>
  Escolher meu plano
  </button>
  <p className={`text-[10px] text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
  A partir de R$ 107/mês no plano anual · Cancele quando quiser
  </p>
 </>
 ) : (
 <>
  {/* CTA Principal */}
  <button
  onClick={() => { if (!isCheckoutLoading) onBuyCredits(10); }}
  disabled={isCheckoutLoading}
  className={'w-full py-3.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2' + (isCheckoutLoading ? ' opacity-70 cursor-not-allowed' : ' hover:opacity-90 hover:-translate-y-0.5')}
  >
  {isCheckoutLoading ? (
  <><i className="fas fa-circle-notch fa-spin text-xs"></i>Gerando link seguro...</>
  ) : (
  <><i className="fas fa-bolt mr-2"></i>Comprar 10 créditos - R$ {getCreditPackagePrice(10)}</>
  )}
  </button>

  {/* CTA Secundário */}
  {nextPlan ? (
  <button
  onClick={() => { if (!isCheckoutLoading) onUpgradePlan(nextPlan.id); }}
  disabled={isCheckoutLoading}
  className={`w-full py-3.5 rounded-xl font-semibold text-sm border transition-all ${isCheckoutLoading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'} ${isDark ? 'border-zinc-600 text-gray-600 hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B]' : 'border-gray-300 text-gray-700 hover:border-[#FF6B6B] hover:text-[#FF6B6B]'}`}
  >
  {isCheckoutLoading ? (
  <><i className="fas fa-circle-notch fa-spin text-xs mr-2"></i>Processando...</>
  ) : (
  <><i className="fas fa-arrow-up mr-2"></i>Fazer upgrade pro {nextPlan.name} - {nextPlan.limit} créd/mês</>
  )}
  </button>
  ) : (
  <button
  onClick={() => { if (!isCheckoutLoading) onBuyCredits(25); }}
  disabled={isCheckoutLoading}
  className={`w-full py-3.5 rounded-xl font-semibold text-sm border transition-all ${isCheckoutLoading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'} ${isDark ? 'border-zinc-600 text-gray-600 hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B]' : 'border-gray-300 text-gray-700 hover:border-[#FF6B6B] hover:text-[#FF6B6B]'}`}
  >
  {isCheckoutLoading ? (
  <><i className="fas fa-circle-notch fa-spin text-xs mr-2"></i>Processando...</>
  ) : (
  <><i className="fas fa-plus mr-2"></i>Comprar 25 créditos - R$ {getCreditPackagePrice(25)}</>
  )}
  </button>
  )}
 </>
 )}
 </div>

 {/* Chips de créditos rápidos (para Pro e Premier) */}
 {(currentPlan.id === 'pro' || currentPlan.id === 'premier' || currentPlan.id === 'enterprise' || currentPlan.id === 'master') && (
 <div className="flex gap-2 justify-center mt-4">
 {[10, 25, 50].map(amount => (
 <button
 key={amount}
 onClick={() => { if (!isCheckoutLoading) onBuyCredits(amount); }}
 disabled={isCheckoutLoading}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isCheckoutLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-gray-50 text-gray-500 hover:bg-[#FF6B6B]/20 hover:text-[#FF6B6B] hover:ring-1 hover:ring-[#FF6B6B]/50' : 'bg-gray-100 text-gray-600 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]'}`}
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
 No plano {nextPlan.name} você ganha mais créditos mensais por um custo menor
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
 // CAMADA 2: Modal Expandido (Planos — espelho do SettingsPage)
 // ═══════════════════════════════════════════════════════════════
 const renderExpandedModal = () => {
 const isOnPaidPlan = currentPlan.id !== 'free';
 const displayPlans = allPlans.filter(p => p.id !== 'test' && p.id !== 'master' && !(p.id === 'free' && isOnPaidPlan));

 return (
 <div className={`relative w-full max-w-[1100px] max-h-[90vh] mx-4 rounded-2xl overflow-hidden transition-all duration-300 ${isAnimating ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'} bg-white border border-gray-200`} style={{ backdropFilter: 'blur(20px)' }}>
 {/* Header */}
 <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white border-gray-200">
 {isProactive ? (
 <div />
 ) : (
 <button
 onClick={handleBackToCompact}
 className="flex items-center gap-2 text-sm font-medium transition-colors text-gray-500 hover:text-gray-900"
 >
 <i className="fas fa-arrow-left"></i>
 Voltar
 </button>
 )}
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-400"
 >
 <i className="fas fa-times"></i>
 </button>
 </div>

 <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-6">
 {/* Título */}
 <div className="text-center mb-6">
 <h2 className="text-3xl font-bold font-serif mb-2 text-gray-900">Planos e Preços</h2>
 <p className="text-sm text-gray-500">
 {isProactive
  ? <>Você tem <span className="text-[#FF6B6B] font-semibold">{currentCredits}</span> crédito{currentCredits !== 1 ? 's' : ''}. Recarregue ou faça upgrade para criar sem parar.</>
  : 'Escolha o plano ideal para seu negócio'}
 </p>
 </div>

 {/* Card de assinatura atual */}
 <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl p-5 mb-6 max-w-2xl mx-auto">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <p className="text-[10px] uppercase tracking-wider font-medium mb-1 text-gray-400">Plano Atual</p>
 <p className="text-sm font-bold text-gray-900">{currentPlan.name}</p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wider font-medium mb-1 text-gray-400">Período</p>
 <p className="text-sm font-bold text-gray-900">{billingPeriod === 'yearly' ? 'Anual' : 'Mensal'}</p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wider font-medium mb-1 text-gray-400">Créditos</p>
 <p className="text-sm font-bold text-gray-900">{currentCredits}{editBalance > 0 && <span className="text-emerald-500 text-xs ml-1">+{editBalance}</span>}</p>
 </div>
 {daysUntilRenewal && daysUntilRenewal <= 30 && (
 <div>
 <p className="text-[10px] uppercase tracking-wider font-medium mb-1 text-gray-400">Renova em</p>
 <p className="text-sm font-bold text-gray-900">{daysUntilRenewal} dias</p>
 </div>
 )}
 </div>
 </div>

 {/* Toggle Mensal/Anual */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Mensal</span>
 <button
 onClick={() => onSetBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
 className={`relative w-12 h-6 rounded-full transition-colors ${billingPeriod === 'yearly' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]' : 'bg-gray-300'}`}
 >
 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`}></div>
 </button>
 <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>Anual</span>
 </div>

 {/* Social proof */}
 <div className="flex items-center justify-center gap-4 mb-6">
 <div className="flex -space-x-2">
 {[1,2,3,4].map(i => (
 <div key={i} className="bg-gray-200 border-white w-6 h-6 rounded-full border-2 flex items-center justify-center">
 <i className="fas fa-user text-gray-400 text-[7px]"></i>
 </div>
 ))}
 </div>
 <p className="text-xs text-gray-500">Usado por <span className="text-gray-900 font-medium">+500 criadores</span> no Brasil</p>
 </div>

 {/* Cards dos Planos — espelho do SettingsPage */}
 <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${displayPlans.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 mb-6`}>
 {displayPlans.map(plan => {
 const isCurrentPlanCard = plan.id === currentPlan.id;
 const isTrialPlan = plan.id === 'free';
 const isEnterprise = plan.id === 'enterprise';
 const isPro = plan.id === 'pro';
 const isPremier = plan.id === 'premier';
 const price = (isTrialPlan || isEnterprise) ? 0 : (billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly);
 const persona = planPersona[plan.id] || '';
 const annualSavings = (isTrialPlan || isEnterprise) ? 0 : Math.round((plan.priceMonthly - plan.priceYearly) * 12);
 const included = planIncluded[plan.id] || new Set();
 const allFeatures = masterFeatures.map(f => ({ name: f, has: included.has(f) }));
 const collapsedFeatures = allFeatures.slice(0, MAX_FEATURES_COLLAPSED);

 return (
 <div
 key={plan.id}
 className={`relative rounded-2xl p-5 transition-all flex flex-col ${
 isCurrentPlanCard
  ? 'bg-white border-2 border-[#FF9F43] shadow-sm'
  : isTrialPlan
   ? 'bg-gray-50/80 border border-dashed border-gray-300'
   : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'
 }`}
 >
 {/* Badge */}
 {isCurrentPlanCard && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white text-[10px] font-bold rounded-full whitespace-nowrap">SEU PLANO</span>
 </div>
 )}
 {isPro && !isCurrentPlanCard && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="bg-gray-800 text-white px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap">MAIS POPULAR</span>
 </div>
 )}
 {isPremier && !isCurrentPlanCard && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="bg-gray-800 text-white px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap">MELHOR VALOR</span>
 </div>
 )}
 {isEnterprise && !isCurrentPlanCard && (
 <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
 <span className="bg-purple-600 text-white px-3 py-1 text-[10px] font-bold rounded-full whitespace-nowrap">ENTERPRISE</span>
 </div>
 )}

 <div className="pt-1 flex flex-col flex-1">
 <h3 className="text-lg font-bold font-serif text-gray-900">{plan.name}</h3>
 <p className="text-[10px] text-gray-400 mb-2">{persona}</p>

 {/* Gerações em destaque */}
 <div className="mb-3">
 {isEnterprise ? (
 <span className="text-xl font-extrabold text-gray-900">Sob consulta</span>
 ) : (
 <>
 <span className="text-3xl font-extrabold text-gray-900">{plan.limit}</span>
 <span className="text-xs text-gray-500 ml-1">gerações{isTrialPlan ? '' : '/mês'}</span>
 </>
 )}
 </div>

 {/* Preço */}
 <div className="mb-1">
 {isEnterprise ? (
 <span className="text-xl font-bold text-gray-900">Personalizado</span>
 ) : isTrialPlan ? (
 <span className="text-xl font-bold text-gray-900">Grátis</span>
 ) : (
 <>
 <span className="text-xl font-bold text-gray-900">
 R$ {Number.isInteger(price) ? price : price.toFixed(2).replace('.', ',')}
 </span>
 <span className="text-xs text-gray-400">/mês</span>
 </>
 )}
 </div>

 {/* Economia anual */}
 {!isTrialPlan && !isEnterprise && billingPeriod === 'yearly' ? (
 <p className="text-emerald-600 text-[10px] font-medium mb-3">
 <i className="fas fa-tag text-[8px] mr-1"></i>
 Economize R$ {annualSavings.toLocaleString('pt-BR')}/ano
 </p>
 ) : (
 <div className="mb-3 h-[14px]">
 {isTrialPlan && <span className="text-gray-400 text-[10px]">Uso único, não renova</span>}
 {isEnterprise && <span className="text-gray-400 text-[10px]">Valores sob medida</span>}
 </div>
 )}

 {/* Features */}
 <ul className="space-y-1.5 mb-3 flex-1">
 {collapsedFeatures.map((feat, i) => (
 <li key={i} className="flex items-start gap-2 text-[11px]">
 {feat.has ? (
 <i className="fas fa-check text-[9px] mt-0.5 shrink-0 text-emerald-500/70"></i>
 ) : (
 <span className="w-[9px] shrink-0"></span>
 )}
 <span className={feat.has ? 'text-gray-600' : 'text-gray-300'}>{feat.name}</span>
 </li>
 ))}
 </ul>

 {/* Botão CTA — espelho do SettingsPage */}
 <button
 onClick={() => {
 if (isCurrentPlanCard || isCheckoutLoading) return;
 if (isEnterprise) {
 window.open('https://wa.me/5544991534082?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20plano%20Enterprise%20da%20Vizzu.', '_blank');
 return;
 }
 onUpgradePlan(plan.id);
 }}
 disabled={isCurrentPlanCard || (isCheckoutLoading && !isEnterprise)}
 className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
 isCurrentPlanCard
  ? 'bg-gray-100 text-gray-400 cursor-default'
  : isCheckoutLoading && !isEnterprise
   ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
  : isPro
   ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90'
  : isTrialPlan
   ? 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
   : 'bg-gray-900 hover:bg-gray-800 text-white'
 }`}
 >
 {isCheckoutLoading && !isCurrentPlanCard && !isEnterprise ? (
 <><i className="fas fa-circle-notch fa-spin text-xs"></i>Processando...</>
 ) : isCurrentPlanCard ? 'Plano atual' : isEnterprise ? (<><i className="fab fa-whatsapp mr-1.5"></i>Falar com especialista</>) : isTrialPlan ? 'Testar grátis' : 'Contratar'}
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Meios de pagamento */}
 <div className="flex items-center justify-center gap-3 mb-6">
 <span className="text-gray-400 text-[10px]">Pagamento seguro via</span>
 <div className="flex items-center gap-2">
 <span className="bg-gray-100 text-gray-500 border-gray-200 px-2 py-0.5 rounded text-[10px] font-medium border">Pix</span>
 <span className="bg-gray-100 text-gray-500 border-gray-200 px-2 py-0.5 rounded text-[10px] font-medium border">Cartão</span>
 <span className="bg-gray-100 text-gray-500 border-gray-200 px-2 py-0.5 rounded text-[10px] font-medium border">Boleto</span>
 </div>
 <i className="fas fa-lock text-[9px] text-gray-300"></i>
 </div>

 {/* Seção de Créditos Avulsos — espelho do SettingsPage */}
 <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-200">
 <i className="fas fa-coins text-sm text-gray-600"></i>
 </div>
 <div>
 <h4 className="font-semibold text-sm text-gray-900">Créditos adicionais</h4>
 <p className="text-xs text-gray-400">R$ {INDIVIDUAL_CREDIT_PRICE.toFixed(2).replace('.', ',')}/crédito</p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 {CREDIT_PACKAGES.map((amount) => (
 <button
 key={amount}
 onClick={() => { if (!isCheckoutLoading) { setSelectedCredits(amount); onBuyCredits(amount); } }}
 disabled={isCheckoutLoading}
 className={'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300 border rounded-xl p-3 transition-all text-center group' + (isCheckoutLoading ? ' opacity-60 cursor-not-allowed' : '')}
 >
 <p className="text-xl font-bold text-gray-900">{amount}</p>
 <p className="text-[10px] text-gray-400 mb-1">créditos</p>
 <p className="text-xs font-semibold text-gray-700">
 R$ {getCreditPackagePrice(amount)}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* Footer — link WhatsApp */}
 <p className="text-gray-400 text-center text-xs mt-6">
 Precisa de mais? <a href="https://wa.me/5544991534082?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20planos%20personalizados%20da%20Vizzu." target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">Entre em contato</a> para planos personalizados.
 </p>
 </div>
 </div>
 );
 };

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
