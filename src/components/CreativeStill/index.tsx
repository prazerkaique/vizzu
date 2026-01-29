import React, { useState, useCallback, useEffect } from 'react';
import {
  Product,
  CreativeStillTemplate,
  CreativeStillGeneration,
  CreativeStillWizardState,
  CreativeStillAdditionalProduct,
} from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Plan } from '../../hooks/useCredits';
import { CreativeStillWizard } from './CreativeStillWizard';
import { CreativeStillResults } from './CreativeStillResults';

// ============================================================
// CONSTANTES
// ============================================================

export const AESTHETIC_PRESETS = [
  { id: 'minimal', label: 'Minimal', description: 'Clean, simples, espaço branco', icon: 'fa-minimize' },
  { id: 'luxury', label: 'Luxo', description: 'Premium, elegante, sofisticado', icon: 'fa-gem' },
  { id: 'organic', label: 'Orgânico', description: 'Natural, terroso, botânico', icon: 'fa-leaf' },
  { id: 'urban', label: 'Urban', description: 'Street, concreto, industrial', icon: 'fa-city' },
  { id: 'tropical', label: 'Tropical', description: 'Vibrante, plantas, verão', icon: 'fa-sun' },
  { id: 'editorial', label: 'Editorial', description: 'Magazine, artístico, bold', icon: 'fa-newspaper' },
];

export const LIGHTING_OPTIONS = [
  { id: 'natural_soft', label: 'Natural Suave', description: 'Luz do dia suave, sombras gentis', icon: 'fa-cloud-sun' },
  { id: 'golden_hour', label: 'Golden Hour', description: 'Tons quentes de pôr do sol', icon: 'fa-sun' },
  { id: 'leaf_shadows', label: 'Sombras de Folha', description: 'Luz filtrada por folhas', icon: 'fa-leaf' },
  { id: 'studio_soft', label: 'Estúdio Soft', description: 'Iluminação profissional softbox', icon: 'fa-lightbulb' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const CAMERA_TYPES = [
  { id: 'iphone', label: 'iPhone', description: 'Natural, autêntico', icon: 'fa-mobile-screen' },
  { id: 'dslr', label: 'DSLR Pro', description: 'Qualidade profissional', icon: 'fa-camera' },
  { id: 'film_35mm', label: 'Film 35mm', description: 'Estética analógica', icon: 'fa-film' },
  { id: 'medium_format', label: 'Medium Format', description: 'Editorial high-end', icon: 'fa-expand' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const LENS_OPTIONS = [
  { id: 'canon_24mm_f14', label: 'Canon EF 24mm f/1.4L II', category: 'wide', description: 'Wide dramático' },
  { id: 'sony_24mm_gm', label: 'Sony 24mm f/1.4 GM', category: 'wide', description: 'Sharp, moderno' },
  { id: 'sigma_35mm_art', label: 'Sigma 35mm f/1.4 Art', category: 'standard', description: 'Nitidez extrema' },
  { id: 'leica_35mm', label: 'Leica Summilux 35mm f/1.4', category: 'standard', description: 'Look analógico' },
  { id: 'canon_50mm_f12', label: 'Canon EF 50mm f/1.2L', category: 'standard', description: 'Bokeh cremoso' },
  { id: 'zeiss_50mm', label: 'Zeiss Planar 50mm f/1.4', category: 'standard', description: 'Vintage, suave' },
  { id: 'sony_85mm_gm', label: 'Sony 85mm f/1.4 GM', category: 'portrait', description: 'Rei do portrait' },
  { id: 'canon_85mm_f12', label: 'Canon EF 85mm f/1.2L', category: 'portrait', description: 'Bokeh suave' },
  { id: 'canon_100mm_macro', label: 'Canon 100mm f/2.8L Macro', category: 'macro', description: 'Detalhes extremos' },
  { id: 'sony_90mm_macro', label: 'Sony 90mm f/2.8 Macro G', category: 'macro', description: 'Textura perfeita' },
  { id: 'ai_choose', label: 'IA Escolhe', category: 'ai', description: 'Melhor lente para a composição' },
];

export const CAMERA_ANGLES = [
  { id: 'top_down', label: 'Top-Down (90°)', description: 'Diretamente de cima', icon: 'fa-arrow-down' },
  { id: '45deg', label: '45°', description: 'Vista angular', icon: 'fa-arrows-turn-right' },
  { id: 'eye_level', label: 'Eye-Level', description: 'Frontal', icon: 'fa-arrows-left-right' },
  { id: 'low_angle', label: 'Low Angle', description: 'De baixo', icon: 'fa-arrow-up' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const COLOR_TONES = [
  { id: 'natural', label: 'Natural', description: 'Cores reais' },
  { id: 'warm', label: 'Warm', description: 'Tons dourados, aconchegantes' },
  { id: 'cool', label: 'Cool', description: 'Tons azulados, nítidos' },
  { id: 'neutral', label: 'Neutro', description: 'Equilibrado, sem cast' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir' },
];

export const COLOR_STYLES = [
  { id: 'vibrant', label: 'Vibrante', description: 'Saturado, impactante' },
  { id: 'muted', label: 'Suave', description: 'Dessaturado, soft' },
  { id: 'film', label: 'Film', description: 'Look analógico' },
  { id: 'faded', label: 'Faded', description: 'Desbotado, vintage' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir' },
];

export const PRODUCT_PRESENTATIONS = [
  { id: 'open', label: 'Aberto / Estendido', description: 'Peça aberta e esticada', icon: 'fa-expand' },
  { id: 'folded', label: 'Dobrado', description: 'Dobrado com cuidado', icon: 'fa-shirt' },
  { id: 'hanging', label: 'Pendurado', description: 'Pendurado em cabide ou gancho', icon: 'fa-grip-lines' },
  { id: 'rolled', label: 'Enrolado', description: 'Enrolado de forma estilosa', icon: 'fa-toilet-paper' },
  { id: 'natural', label: 'Jogado Natural', description: 'Solto de forma casual e natural', icon: 'fa-wind' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const PRODUCT_PLACEMENTS = [
  { id: 'center', label: 'Centralizado', description: 'Centro da composição', icon: 'fa-crosshairs' },
  { id: 'left_third', label: 'Terço Esquerdo', description: 'Regra dos terços, à esquerda', icon: 'fa-align-left' },
  { id: 'right_third', label: 'Terço Direito', description: 'Regra dos terços, à direita', icon: 'fa-align-right' },
  { id: 'slight_left', label: 'Levemente Esquerda', description: 'Deslocado sutil para esquerda', icon: 'fa-arrow-left' },
  { id: 'slight_right', label: 'Levemente Direita', description: 'Deslocado sutil para direita', icon: 'fa-arrow-right' },
  { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const FRAME_RATIOS = [
  { id: '1:1', label: '1:1', description: 'Feed quadrado', icon: 'fa-square' },
  { id: '4:5', label: '4:5', description: 'Feed vertical', icon: 'fa-rectangle-portrait' },
  { id: '9:16', label: '9:16', description: 'Stories/Reels', icon: 'fa-mobile-screen' },
  { id: '16:9', label: '16:9', description: 'Banner', icon: 'fa-rectangle-wide' },
];

const INITIAL_WIZARD_STATE: CreativeStillWizardState = {
  mode: 'simple',
  mainProduct: null,
  mainProductView: 'front',
  productPresentation: 'ai_choose',
  additionalProducts: [],
  aestheticPreset: null,
  aestheticCustom: '',
  colorTone: 'ai_choose',
  colorStyle: 'ai_choose',
  referenceImage: null,
  surfaceDescription: '',
  elementsDescription: '',
  elementsImages: [],
  lighting: 'ai_choose',
  frameRatio: '4:5',
  cameraType: 'ai_choose',
  lensModel: 'ai_choose',
  cameraAngle: 'ai_choose',
  depthOfField: 50,
  productPlacement: 'ai_choose',
  elementsPlacement: '',
  saveAsTemplate: false,
  templateName: '',
};

// ============================================================
// PROPS
// ============================================================

export interface CreativeStillProps {
  theme: 'dark' | 'light';
  products: Product[];
  userCredits: number;
  userId?: string;
  onDeductCredits: (amount: number, reason: string) => boolean;
  onAddHistoryLog: (action: string, details: string, status: 'success' | 'error' | 'pending', items: Product[], method: 'manual' | 'auto' | 'api' | 'ai' | 'bulk' | 'system', cost: number) => void;
  onCheckCredits?: (creditsNeeded: number, actionContext: string) => boolean;
  currentPlan?: Plan;
  onBack?: () => void;
  onOpenPlanModal?: () => void;
  initialProduct?: Product | null;
  onClearInitialProduct?: () => void;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

type View = 'home' | 'wizard' | 'results';

export const CreativeStill: React.FC<CreativeStillProps> = ({
  theme,
  products,
  userCredits,
  userId,
  onDeductCredits,
  onAddHistoryLog,
  onCheckCredits,
  currentPlan,
  onBack,
  onOpenPlanModal,
  initialProduct,
  onClearInitialProduct,
}) => {
  const [view, setView] = useState<View>('home');
  const [wizardState, setWizardState] = useState<CreativeStillWizardState>({ ...INITIAL_WIZARD_STATE });
  const [templates, setTemplates] = useState<CreativeStillTemplate[]>([]);
  const [generations, setGenerations] = useState<CreativeStillGeneration[]>([]);
  const [favorites, setFavorites] = useState<CreativeStillGeneration[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<CreativeStillGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  const isDark = theme === 'dark';

  // Se veio com produto pré-selecionado, vai direto pro wizard
  useEffect(() => {
    if (initialProduct) {
      setWizardState(prev => ({ ...prev, mainProduct: initialProduct }));
      setView('wizard');
      onClearInitialProduct?.();
    }
  }, [initialProduct, onClearInitialProduct]);

  // Carregar dados do Supabase
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoadingTemplates(true);
    try {
      // Templates
      const { data: tplData } = await supabase
        .from('creative_still_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (tplData) setTemplates(tplData as CreativeStillTemplate[]);

      // Gerações
      const { data: genData } = await supabase
        .from('creative_still_generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (genData) {
        setGenerations(genData as CreativeStillGeneration[]);
        setFavorites((genData as (CreativeStillGeneration & { is_favorite?: boolean })[]).filter(g => g.is_favorite));
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Still Criativo:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartNew = (mode: 'simple' | 'advanced') => {
    setWizardState({ ...INITIAL_WIZARD_STATE, mode });
    setView('wizard');
  };

  const handleUseTemplate = (template: CreativeStillTemplate) => {
    setWizardState({
      ...INITIAL_WIZARD_STATE,
      mode: template.mode,
      aestheticPreset: template.aesthetic_preset,
      aestheticCustom: template.aesthetic_custom || '',
      surfaceDescription: template.surface_description,
      elementsDescription: template.elements_description || '',
      lighting: template.lighting,
      cameraType: template.camera_type,
      lensModel: template.lens_model,
      cameraAngle: template.camera_angle,
      depthOfField: template.depth_of_field,
      colorTone: template.color_tone,
      colorStyle: template.color_style,
      frameRatio: template.frame_ratio,
    });
    setView('wizard');
  };

  const handleGenerate = async () => {
    if (!wizardState.mainProduct) return;

    const creditsNeeded = 2;
    if (onCheckCredits && !onCheckCredits(creditsNeeded, 'creative-still')) return;

    setIsGenerating(true);
    setGenerationProgress(10);
    setLoadingText('');
    setView('results');

    // Criar registro no Supabase com status 'pending'
    const { data: insertedGen, error: insertError } = await supabase
      .from('creative_still_generations')
      .insert({
        user_id: userId,
        product_id: wizardState.mainProduct.id || '',
        additional_products: wizardState.additionalProducts.map(p => ({
          product_id: p.product_id,
          product_name: p.product_name,
          product_image_url: p.product_image_url,
          position_description: p.position_description,
          source: p.source,
        })),
        product_image_url: (() => {
          const p = wizardState.mainProduct!;
          const view = wizardState.mainProductView;
          // Prioridade: Product Studio optimized → original images → legacy images
          if (p.generatedImages?.productStudio?.length) {
            const lastSession = p.generatedImages.productStudio[p.generatedImages.productStudio.length - 1];
            const img = lastSession.images?.find(i => i.angle === view);
            if (img?.url) return img.url;
          }
          if (view === 'back' && p.originalImages?.back?.url) return p.originalImages.back.url;
          if (p.originalImages?.front?.url) return p.originalImages.front.url;
          if (p.images?.[0]?.url) return p.images[0].url;
          return '';
        })(),
        product_detail_image_url: (() => {
          const p = wizardState.mainProduct!;
          if (p.generatedImages?.productStudio?.length) {
            const lastSession = p.generatedImages.productStudio[p.generatedImages.productStudio.length - 1];
            const img = lastSession.images?.find(i => i.angle === 'detail');
            if (img?.url) return img.url;
          }
          if (p.originalImages?.detail?.url) return p.originalImages.detail.url;
          return null;
        })(),
        product_name: wizardState.mainProduct!.name,
        product_category: wizardState.mainProduct!.category || '',
        product_color: wizardState.mainProduct!.color || '',
        settings_snapshot: {
          mode: wizardState.mode,
          mainProductView: wizardState.mainProductView,
          productPresentation: wizardState.productPresentation,
          aestheticPreset: wizardState.aestheticPreset,
          aestheticCustom: wizardState.aestheticCustom,
          colorTone: wizardState.colorTone,
          colorStyle: wizardState.colorStyle,
          surfaceDescription: wizardState.surfaceDescription,
          elementsDescription: wizardState.elementsDescription,
          elementsPlacement: wizardState.elementsPlacement,
          lighting: wizardState.lighting,
          frameRatio: wizardState.frameRatio,
          cameraType: wizardState.cameraType,
          lensModel: wizardState.lensModel,
          cameraAngle: wizardState.cameraAngle,
          depthOfField: wizardState.depthOfField,
          productPlacement: wizardState.productPlacement,
        },
        credits_used: creditsNeeded,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !insertedGen) {
      console.error('Erro ao criar geração:', insertError);
      setIsGenerating(false);
      setCurrentGeneration({
        id: crypto.randomUUID(),
        user_id: userId || '',
        template_id: null,
        product_id: wizardState.mainProduct.id || '',
        additional_products: [],
        settings_snapshot: {},
        variation_1_url: null,
        variation_2_url: null,
        selected_variation: null,
        reference_image_url: null,
        credits_used: 0,
        status: 'failed',
        error_message: 'Erro ao iniciar geração. Tente novamente.',
        created_at: new Date().toISOString(),
        completed_at: null,
      });
      return;
    }

    const generationId = insertedGen.id;

    // Progresso suave estilo Vizzu Studio (~2 min, desacelera ao se aproximar de 90%)
    let currentProg = 10;
    const progressInterval = setInterval(() => {
      const remaining = 90 - currentProg;
      const increment = Math.max(remaining * 0.08, 0.5);
      currentProg = Math.min(currentProg + increment, 90);
      setGenerationProgress(Math.round(currentProg));
    }, 1000);

    // Polling: verificar status a cada 3s até completar ou falhar (timeout 5min)
    const POLL_INTERVAL = 3000;
    const POLL_TIMEOUT = 300000;
    const pollStart = Date.now();

    try {
      const result = await new Promise<CreativeStillGeneration>((resolve, reject) => {
        const poll = async () => {
          if (Date.now() - pollStart > POLL_TIMEOUT) {
            reject(new Error('Tempo limite excedido'));
            return;
          }
          const { data, error } = await supabase
            .from('creative_still_generations')
            .select('*')
            .eq('id', generationId)
            .single();

          if (error) { reject(error); return; }

          if (data.status === 'completed') {
            resolve(data as CreativeStillGeneration);
          } else if (data.status === 'failed') {
            resolve(data as CreativeStillGeneration);
          } else {
            setTimeout(poll, POLL_INTERVAL);
          }
        };
        // Chamar webhook n8n para iniciar geração
        fetch('https://n8nwebhook.brainia.store/webhook/vizzu/still/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generation_id: generationId,
            user_id: userId,
          }),
        }).catch(err => console.error('Erro ao chamar webhook n8n:', err));
        poll();
      });

      clearInterval(progressInterval);
      setGenerationProgress(95);
      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress(100);
      setCurrentGeneration(result);

      // Recarregar lista
      loadData();

    } catch (err) {
      clearInterval(progressInterval);
      // Marcar como falha no Supabase
      await supabase
        .from('creative_still_generations')
        .update({ status: 'failed', error_message: 'Erro ao gerar imagem.' })
        .eq('id', generationId);

      const { data: failedGen } = await supabase
        .from('creative_still_generations')
        .select('*')
        .eq('id', generationId)
        .single();

      setCurrentGeneration((failedGen as CreativeStillGeneration) || {
        id: generationId,
        user_id: userId || '',
        template_id: null,
        product_id: wizardState.mainProduct.id || '',
        additional_products: [],
        settings_snapshot: {},
        variation_1_url: null,
        variation_2_url: null,
        selected_variation: null,
        reference_image_url: null,
        credits_used: 0,
        status: 'failed',
        error_message: 'Erro ao gerar imagem. Tente novamente.',
        created_at: new Date().toISOString(),
        completed_at: null,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentGeneration(null);
    setWizardState({ ...INITIAL_WIZARD_STATE });
    loadData(); // Recarregar listas ao voltar
  };

  // Toggle favorito
  const handleToggleFavorite = async (generationId: string, current: boolean) => {
    await supabase
      .from('creative_still_generations')
      .update({ is_favorite: !current })
      .eq('id', generationId);
    loadData();
  };

  // ============================================================
  // TELA INICIAL
  // ============================================================
  if (view === 'home') {
    return (
      <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-[#F5F5F7]')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (isDark ? 'bg-gradient-to-r from-amber-500/20 to-orange-400/20 border border-amber-500/30' : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25')}>
                <i className={'fas fa-palette text-sm ' + (isDark ? 'text-amber-400' : 'text-white')}></i>
              </div>
              <div>
                <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-semibold'}>Still Criativo</h1>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Composições artísticas para Instagram e e-commerce</p>
              </div>
            </div>
            <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ' + (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
              <i className="fas fa-coins text-[10px]"></i>
              <span>2 créditos/geração</span>
            </div>
          </div>

          {/* Como quer começar */}
          <div className="mb-8">
            <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>Como você quer começar?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Novo Still - Simples */}
              <button
                onClick={() => handleStartNew('simple')}
                className={'group relative overflow-hidden rounded-xl p-5 text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-amber-500/50' : 'bg-white border-2 border-gray-200 hover:border-amber-400 shadow-sm')}
              >
                <div className="flex items-start gap-4">
                  <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
                    <i className={'fas fa-wand-magic-sparkles text-lg ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
                  </div>
                  <div>
                    <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Modo Simples</h3>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs leading-relaxed'}>
                      3 passos rápidos. A IA escolhe câmera, lente, iluminação e cores automaticamente.
                    </p>
                  </div>
                </div>
                <div className={'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ' + (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')}>
                  Recomendado
                </div>
              </button>

              {/* Novo Still - Avançado */}
              <button
                onClick={() => handleStartNew('advanced')}
                className={'group relative overflow-hidden rounded-xl p-5 text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-amber-500/50' : 'bg-white border-2 border-gray-200 hover:border-amber-400 shadow-sm')}
              >
                <div className="flex items-start gap-4">
                  <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-purple-500/20' : 'bg-purple-100')}>
                    <i className={'fas fa-sliders text-lg ' + (isDark ? 'text-purple-400' : 'text-purple-500')}></i>
                  </div>
                  <div>
                    <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Modo Avançado</h3>
                    <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs leading-relaxed'}>
                      5 passos com controle total sobre câmera, lente, iluminação e coloração.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Stills Gerados */}
          <div className="mb-8">
            <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
              <i className="fas fa-images mr-2 text-xs opacity-50"></i>
              Stills Gerados
            </h2>
            {loadingTemplates ? (
              <div className={'rounded-xl p-8 text-center ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200')}>
                <i className="fas fa-spinner fa-spin text-lg text-neutral-500"></i>
              </div>
            ) : generations.length === 0 ? (
              <div className={'rounded-xl p-8 text-center ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
                <div className={'w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
                  <i className={'fas fa-images text-xl ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
                </div>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
                  Você ainda não gerou nenhum still.
                </p>
                <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-xs mt-1'}>
                  Crie seu primeiro still criativo e ele aparecerá aqui!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {generations.map(gen => (
                  <div
                    key={gen.id}
                    className={'group rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-amber-500/50' : 'bg-white border border-gray-200 hover:border-amber-400 shadow-sm')}
                  >
                    <div className={'aspect-square flex items-center justify-center ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {(gen.variation_1_url || gen.variation_2_url) ? (
                        <img src={(gen.selected_variation === 2 ? gen.variation_2_url : gen.variation_1_url) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                      )}
                    </div>
                    <div className="p-3">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>
                        {gen.status === 'completed' ? 'Still gerado' : gen.status === 'processing' ? 'Gerando...' : 'Falhou'}
                      </p>
                      <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                        {new Date(gen.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meus Stills Favoritos */}
          <div>
            <h2 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-semibold mb-3'}>
              <i className="fas fa-heart mr-2 text-xs opacity-50"></i>
              Meus Stills Favoritos
            </h2>
            {favorites.length === 0 ? (
              <div className={'rounded-xl p-8 text-center ' + (isDark ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-gray-50 border border-gray-200')}>
                <div className={'w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3 ' + (isDark ? 'bg-neutral-800' : 'bg-gray-200')}>
                  <i className={'fas fa-heart text-xl ' + (isDark ? 'text-neutral-600' : 'text-gray-400')}></i>
                </div>
                <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>
                  Nenhum favorito ainda.
                </p>
                <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-xs mt-1'}>
                  Favorite seus melhores stills para acessá-los rapidamente!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {favorites.map(gen => (
                  <div
                    key={gen.id}
                    className={'group rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-pink-500/50' : 'bg-white border border-gray-200 hover:border-pink-400 shadow-sm')}
                  >
                    <div className={'aspect-square flex items-center justify-center relative ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
                      {(gen.variation_1_url || gen.variation_2_url) ? (
                        <img src={(gen.selected_variation === 2 ? gen.variation_2_url : gen.variation_1_url) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
                      )}
                      <div className="absolute top-2 right-2">
                        <i className="fas fa-heart text-pink-500 text-sm drop-shadow"></i>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium truncate'}>Still favorito</p>
                      <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-0.5'}>
                        {new Date(gen.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // WIZARD
  // ============================================================
  if (view === 'wizard') {
    return (
      <CreativeStillWizard
        theme={theme}
        products={products}
        wizardState={wizardState}
        onUpdateState={(updates) => setWizardState(prev => ({ ...prev, ...updates }))}
        onGenerate={handleGenerate}
        onBack={() => setView('home')}
        userCredits={userCredits}
      />
    );
  }

  // ============================================================
  // RESULTADOS
  // ============================================================
  return (
    <CreativeStillResults
      theme={theme}
      generation={currentGeneration}
      wizardState={wizardState}
      isGenerating={isGenerating}
      progress={generationProgress}
      loadingText={loadingText}
      onBackToHome={handleBackToHome}
      onGenerateAgain={handleGenerate}
      onSaveTemplate={async (name: string) => {
        if (!userId) return;
        const { error } = await supabase
          .from('creative_still_templates')
          .insert({
            user_id: userId,
            name,
            mode: wizardState.mode,
            aesthetic_preset: wizardState.aestheticPreset,
            aesthetic_custom: wizardState.aestheticCustom || null,
            surface_description: wizardState.surfaceDescription,
            elements_description: wizardState.elementsDescription || null,
            elements_images: [],
            lighting: wizardState.lighting,
            camera_type: wizardState.cameraType,
            lens_model: wizardState.lensModel,
            camera_angle: wizardState.cameraAngle,
            depth_of_field: wizardState.depthOfField,
            color_tone: wizardState.colorTone,
            color_style: wizardState.colorStyle,
            frame_ratio: wizardState.frameRatio,
          });
        if (error) {
          console.error('Erro ao salvar template:', error);
        } else {
          loadData();
        }
      }}
    />
  );
};
