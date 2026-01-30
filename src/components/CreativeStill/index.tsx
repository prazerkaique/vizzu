import React, { useState, useCallback, useEffect } from 'react';
import {
 Product,
 CreativeStillTemplate,
 CreativeStillGeneration,
 CreativeStillWizardState,
} from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Plan } from '../../hooks/useCredits';
import { CreativeStillWizard } from './CreativeStillWizard';
import { CreativeStillResults } from './CreativeStillResults';

// ============================================================
// CONSTANTES
// ============================================================

export const PRODUCT_SCALES = [
 { id: 'close-up', label: 'Close-up', description: 'Bem próximo, destaque nos detalhes', icon: 'fa-magnifying-glass-plus' },
 { id: 'medium', label: 'Médio', description: 'Enquadramento intermediário', icon: 'fa-expand' },
 { id: 'full', label: 'Completo', description: 'Produto inteiro visível com contexto', icon: 'fa-up-right-and-down-left-from-center' },
 { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles' },
];

export const MOOD_SEASONS = [
 { id: 'verao_tropical', label: 'Verão Tropical', icon: 'fa-sun' },
 { id: 'alto_verao_resort', label: 'Alto Verão Resort', icon: 'fa-umbrella-beach' },
 { id: 'primavera_floral', label: 'Primavera Floral', icon: 'fa-seedling' },
 { id: 'inverno_urbano', label: 'Inverno Urbano', icon: 'fa-snowflake' },
 { id: 'outono_rustico', label: 'Outono Rústico', icon: 'fa-leaf' },
 { id: 'colecao_festa', label: 'Coleção Festa', icon: 'fa-champagne-glasses' },
 { id: 'basics_atemporal', label: 'Basics Atemporal', icon: 'fa-circle' },
 { id: 'ai_choose', label: 'IA Escolhe', icon: 'fa-wand-magic-sparkles' },
 { id: 'custom', label: 'Personalizado', icon: 'fa-pen' },
];

export const VISUAL_STYLES = [
 { id: 'clean_natural', label: 'Clean Natural', description: 'Cores fiéis, sem grão, neutro. Ideal para catálogo.', icon: 'fa-droplet' },
 { id: 'warm_soft', label: 'Warm & Soft', description: 'Tons dourados, leve desaturação, grão sutil.', icon: 'fa-sun' },
 { id: 'cool_crisp', label: 'Cool & Crisp', description: 'Tons azulados, alto contraste, sem grão.', icon: 'fa-snowflake' },
 { id: 'film_analog', label: 'Filme Analógico', description: 'Tons quentes, contraste suave, grão de película.', icon: 'fa-film' },
 { id: 'vintage_faded', label: 'Vintage Faded', description: 'Baixo contraste, pretos lavados, grão moderado.', icon: 'fa-clock-rotate-left' },
 { id: 'moody_dark', label: 'Moody / Dark', description: 'Sombras profundas, tons escuros, grão sutil.', icon: 'fa-moon' },
 { id: 'vibrant_pop', label: 'Vibrante Pop', description: 'Saturação alta, cores vivas, sem grão.', icon: 'fa-palette' },
 { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir o melhor estilo.', icon: 'fa-wand-magic-sparkles' },
 { id: 'custom', label: 'Personalizado', description: 'Descreva o estilo visual desejado.', icon: 'fa-pen' },
];

export const RESOLUTIONS = [
 { id: '2k', label: '2K', description: 'Resolução padrão' },
 { id: '4k', label: '4K', description: 'Alta resolução' },
];

export const LIGHTING_OPTIONS = [
 { id: 'natural_soft', label: 'Natural Suave', description: 'Luz do dia suave, sombras gentis', icon: 'fa-cloud-sun' },
 { id: 'golden_hour', label: 'Golden Hour', description: 'Tons quentes de pôr do sol', icon: 'fa-sun' },
 { id: 'leaf_shadows', label: 'Sombras de Folha', description: 'Luz filtrada por folhas', icon: 'fa-leaf' },
 { id: 'studio_soft', label: 'Estúdio Soft', description: 'Iluminação profissional softbox', icon: 'fa-lightbulb' },
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


// Mapeamento de categorias para tipo de produto (para apresentações condicionais)
export type ProductTypeGroup = 'clothing' | 'footwear' | 'bags' | 'accessories' | 'headwear' | 'fullpiece';

export const CATEGORY_TO_TYPE: Record<string, ProductTypeGroup> = {
 // Topo
 'Camisetas': 'clothing', 'Blusas': 'clothing', 'Regatas': 'clothing', 'Tops': 'clothing',
 'Camisas': 'clothing', 'Bodies': 'clothing', 'Jaquetas': 'clothing', 'Casacos': 'clothing',
 'Blazers': 'clothing', 'Moletons': 'clothing',
 // Baixo
 'Calças': 'clothing', 'Shorts': 'clothing', 'Bermudas': 'clothing', 'Saias': 'clothing',
 'Leggings': 'clothing', 'Shorts Fitness': 'clothing',
 // Peças inteiras
 'Vestidos': 'fullpiece', 'Macacões': 'fullpiece', 'Jardineiras': 'fullpiece',
 'Biquínis': 'clothing', 'Maiôs': 'clothing',
 // Calçados
 'Calçados': 'footwear', 'Tênis': 'footwear', 'Sandálias': 'footwear', 'Botas': 'footwear',
 // Cabeça
 'Bonés': 'headwear', 'Chapéus': 'headwear', 'Tiaras': 'headwear', 'Lenços': 'clothing',
 // Acessórios
 'Bolsas': 'bags', 'Cintos': 'accessories', 'Relógios': 'accessories', 'Óculos': 'accessories',
 'Bijuterias': 'accessories', 'Acessórios': 'accessories', 'Outros Acessórios': 'accessories',
};

// Tipos de produto para upload (quando não vem do catálogo)
export const PRODUCT_TYPES_FOR_UPLOAD = [
 { id: 'clothing' as ProductTypeGroup, label: 'Roupa', description: 'Camiseta, calça, vestido, etc.', icon: 'fa-shirt' },
 { id: 'footwear' as ProductTypeGroup, label: 'Calçado', description: 'Tênis, bota, sandália, etc.', icon: 'fa-shoe-prints' },
 { id: 'bags' as ProductTypeGroup, label: 'Bolsa', description: 'Bolsa, mochila, clutch, etc.', icon: 'fa-bag-shopping' },
 { id: 'headwear' as ProductTypeGroup, label: 'Chapéu / Boné', description: 'Chapéu, boné, tiara, etc.', icon: 'fa-hat-cowboy' },
 { id: 'accessories' as ProductTypeGroup, label: 'Acessório', description: 'Óculos, relógio, cinto, etc.', icon: 'fa-gem' },
];

// Todas as apresentações possíveis
export const ALL_PRESENTATIONS = [
 { id: 'open', label: 'Aberto / Estendido', description: 'Peça aberta e esticada', icon: 'fa-expand', types: ['clothing', 'fullpiece'] },
 { id: 'folded', label: 'Dobrado', description: 'Dobrado com cuidado', icon: 'fa-shirt', types: ['clothing'] },
 { id: 'hanging', label: 'Pendurado', description: 'Pendurado em cabide ou gancho', icon: 'fa-grip-lines', types: ['clothing', 'fullpiece'] },
 { id: 'rolled', label: 'Enrolado', description: 'Enrolado de forma estilosa', icon: 'fa-toilet-paper', types: ['clothing'] },
 { id: 'natural', label: 'Jogado Natural', description: 'Solto de forma casual e natural', icon: 'fa-wind', types: ['clothing', 'fullpiece'] },
 { id: 'standing', label: 'Em Pé', description: 'Posicionado em pé, ereto', icon: 'fa-shoe-prints', types: ['footwear'] },
 { id: 'side_view', label: 'Vista Lateral', description: 'Lateral mostrando o perfil', icon: 'fa-arrows-left-right', types: ['footwear'] },
 { id: 'pair', label: 'Par Cruzado', description: 'Par sobreposto em composição', icon: 'fa-xmarks-lines', types: ['footwear'] },
 { id: 'flat_lay', label: 'Flat Lay', description: 'Deitado visto de cima', icon: 'fa-arrow-down', types: ['footwear', 'bags', 'headwear', 'accessories'] },
 { id: 'upright', label: 'Em Pé / Ereto', description: 'Posicionado verticalmente', icon: 'fa-arrow-up', types: ['bags'] },
 { id: 'open_bag', label: 'Aberta', description: 'Bolsa aberta mostrando interior', icon: 'fa-box-open', types: ['bags'] },
 { id: 'worn_style', label: 'Estilo Vestido', description: 'Posicionado como se estivesse sendo usado', icon: 'fa-user', types: ['headwear', 'accessories'] },
 { id: 'display', label: 'Em Display', description: 'Em suporte ou expositor', icon: 'fa-display', types: ['accessories', 'headwear'] },
 { id: 'custom', label: 'Personalizado', description: 'Descreva como quer exibir', icon: 'fa-pen', types: ['clothing', 'fullpiece', 'footwear', 'bags', 'headwear', 'accessories'] },
 { id: 'ai_choose', label: 'IA Escolhe', description: 'Deixar a IA decidir', icon: 'fa-wand-magic-sparkles', types: ['clothing', 'fullpiece', 'footwear', 'bags', 'headwear', 'accessories'] },
];

// Helper: filtrar apresentações por tipo de produto
export const getPresentationsForType = (typeGroup: ProductTypeGroup | null) => {
 if (!typeGroup) return ALL_PRESENTATIONS.filter(p => p.id === 'ai_choose');
 return ALL_PRESENTATIONS.filter(p => p.types.includes(typeGroup));
};

// Helper: obter tipo do produto pela categoria
export const getProductTypeGroup = (category?: string): ProductTypeGroup | null => {
 if (!category) return null;
 return CATEGORY_TO_TYPE[category] || null;
};

// Mantido por compatibilidade (usado no review step)
export const PRODUCT_PRESENTATIONS = ALL_PRESENTATIONS;

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
 // Step 1 - Produtos
 mainProduct: null,
 mainProductView: 'front',
 mainProductHighlight: 'front',
 productPresentation: 'ai_choose',
 customPresentationText: '',
 productScale: 'ai_choose',
 additionalProducts: [],

 // Step 2 - Cenário
 surfaceDescription: '',
 surfaceReference: null,
 environmentDescription: '',
 environmentReference: null,
 compositionElements: [],
 compositionReference: null,
 moodSeason: 'ai_choose',
 customMoodSeason: '',

 // Step 3 - Estética Fotográfica
 lighting: 'ai_choose',
 customLighting: '',
 lightingReference: null,
 lensModel: 'ai_choose',
 cameraAngle: 'ai_choose',
 depthOfField: 50,
 visualStyle: 'ai_choose',
 customVisualStyle: '',
 visualStyleReference: null,

 // Step 4 - Frame & Configs
 frameRatio: '4:5',
 resolution: '2k',
 variationsCount: 2,
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

 const handleStartNew = () => {
 setWizardState({ ...INITIAL_WIZARD_STATE });
 setView('wizard');
 };

 const handleUseTemplate = (template: CreativeStillTemplate) => {
 setWizardState({
 ...INITIAL_WIZARD_STATE,
 surfaceDescription: template.surface_description,
 environmentDescription: template.environment_description || '',
 moodSeason: template.mood_season || 'ai_choose',
 productPresentation: template.product_presentation || 'ai_choose',
 productScale: (template.product_scale as CreativeStillWizardState['productScale']) || 'ai_choose',
 lighting: template.lighting,
 lensModel: template.lens_model,
 cameraAngle: template.camera_angle,
 depthOfField: template.depth_of_field,
 visualStyle: template.visual_style || 'ai_choose',
 frameRatio: template.frame_ratio,
 resolution: (template.resolution as CreativeStillWizardState['resolution']) || '2k',
 variationsCount: template.default_variations || 2,
 });
 setView('wizard');
 };

 const handleGenerate = async () => {
 if (!wizardState.mainProduct) return;

 const creditsNeeded = wizardState.variationsCount;
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
 settings_snapshot: {
 mainProductView: wizardState.mainProductView,
 mainProductHighlight: wizardState.mainProductHighlight,
 productPresentation: wizardState.productPresentation,
 customPresentationText: wizardState.customPresentationText,
 productScale: wizardState.productScale,
 surfaceDescription: wizardState.surfaceDescription,
 surfaceReference: wizardState.surfaceReference ? 'attached' : null,
 environmentDescription: wizardState.environmentDescription,
 environmentReference: wizardState.environmentReference ? 'attached' : null,
 compositionElements: wizardState.compositionElements.map(el => ({
 description: el.description,
 hasImage: !!el.image,
 })),
 compositionReference: wizardState.compositionReference ? 'attached' : null,
 moodSeason: wizardState.moodSeason,
 customMoodSeason: wizardState.customMoodSeason,
 lighting: wizardState.lighting,
 customLighting: wizardState.customLighting,
 lightingReference: wizardState.lightingReference ? 'attached' : null,
 lensModel: wizardState.lensModel,
 cameraAngle: wizardState.cameraAngle,
 depthOfField: wizardState.depthOfField,
 visualStyle: wizardState.visualStyle,
 customVisualStyle: wizardState.customVisualStyle,
 visualStyleReference: wizardState.visualStyleReference ? 'attached' : null,
 frameRatio: wizardState.frameRatio,
 resolution: wizardState.resolution,
 variationsCount: wizardState.variationsCount,
 // Dados do produto
 product_image_url: (() => {
 const p = wizardState.mainProduct!;
 const view = wizardState.mainProductView === 'both' ? 'front' : wizardState.mainProductView;
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
 },
 variations_requested: wizardState.variationsCount,
 resolution: wizardState.resolution,
 variation_urls: [],
 variation_1_url: null,
 variation_2_url: null,
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
 variation_urls: [],
 variation_1_url: null,
 variation_2_url: null,
 variations_requested: wizardState.variationsCount,
 selected_variation: null,
 reference_image_url: null,
 resolution: wizardState.resolution,
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
 let webhookFailed = false;

 const poll = async () => {
 if (Date.now() - pollStart > POLL_TIMEOUT) {
 reject(new Error('Tempo limite excedido'));
 return;
 }
 try {
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
 } else if (webhookFailed) {
 // Webhook falhou e status ainda pending — não vai mudar
 reject(new Error('Falha na comunicação com o servidor de geração.'));
 } else {
 setTimeout(poll, POLL_INTERVAL);
 }
 } catch (pollErr) {
 reject(pollErr);
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
 })
 .then(res => {
 if (!res.ok) {
 console.error('Webhook retornou erro:', res.status);
 webhookFailed = true;
 }
 })
 .catch(err => {
 console.error('Erro ao chamar webhook n8n:', err);
 webhookFailed = true;
 });

 // Dar tempo pro webhook responder antes de começar polling
 setTimeout(poll, 2000);
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
 variation_urls: [],
 variation_1_url: null,
 variation_2_url: null,
 variations_requested: wizardState.variationsCount,
 selected_variation: null,
 reference_image_url: null,
 resolution: wizardState.resolution,
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
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? '' : 'bg-cream')} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 {onBack && (
 <button onClick={onBack} className={(isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-gray-900') + ' p-2 -ml-2 rounded-lg transition-colors'}>
 <i className="fas fa-arrow-left"></i>
 </button>
 )}
 <div className={'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl ' + (isDark ? 'bg-white/10 border border-white/15' : 'bg-white/60 border border-gray-200/60 shadow-sm')}>
 <i className={'fas fa-palette text-sm ' + (isDark ? 'text-neutral-200' : 'text-[#1A1A1A]')}></i>
 </div>
 <div>
 <h1 className={(isDark ? 'text-white' : 'text-[#1A1A1A]') + ' text-lg font-extrabold'}>Still Criativo®</h1>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>Composições artísticas para Instagram e e-commerce</p>
 </div>
 </div>
 <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ' + (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
 <i className="fas fa-coins text-[10px]"></i>
 <span>1 crédito/variação</span>
 </div>
 </div>

 {/* Novo Still */}
 <div className="mb-8">
 <button
 onClick={() => handleStartNew()}
 className={'group relative overflow-hidden rounded-xl p-5 text-left transition-all hover:scale-[1.02] w-full ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-amber-500/50' : 'bg-white border-2 border-gray-200 hover:border-amber-400 ')}
 >
 <div className="flex items-start gap-4">
 <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (isDark ? 'bg-gradient-to-r from-amber-500/20 to-[#FF9F43]/15' : 'bg-gradient-to-r from-amber-100 to-[#FF9F43]/10')}>
 <i className={'fas fa-wand-magic-sparkles text-lg ' + (isDark ? 'text-amber-400' : 'text-amber-500')}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm mb-1'}>Novo Still</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs leading-relaxed'}>
 4 passos: Produto, Cenário, Estética e Frame. Controle total sobre cada detalhe.
 </p>
 </div>
 </div>
 </button>
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
 className={'group rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-amber-500/50' : 'bg-white border border-gray-200 hover:border-amber-400 ')}
 >
 <div className={'aspect-square flex items-center justify-center ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 {(() => {
 const urls = gen.variation_urls?.length ? gen.variation_urls : [gen.variation_1_url, gen.variation_2_url].filter(Boolean) as string[];
 const displayUrl = gen.selected_variation != null && urls[gen.selected_variation - 1]
 ? urls[gen.selected_variation - 1]
 : urls[0] || null;
 return displayUrl ? (
 <img src={displayUrl} alt="" className="w-full h-full object-cover" />
 ) : (
 <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
 );
 })()}
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
 className={'group rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] ' + (isDark ? 'bg-neutral-900 border border-neutral-800 hover:border-[#E91E8C]/50' : 'bg-white border border-gray-200 hover:border-[#E91E8C]/50 ')}
 >
 <div className={'aspect-square flex items-center justify-center relative ' + (isDark ? 'bg-neutral-800' : 'bg-gray-100')}>
 {(() => {
 const urls = gen.variation_urls?.length ? gen.variation_urls : [gen.variation_1_url, gen.variation_2_url].filter(Boolean) as string[];
 const displayUrl = gen.selected_variation != null && urls[gen.selected_variation - 1]
 ? urls[gen.selected_variation - 1]
 : urls[0] || null;
 return displayUrl ? (
 <img src={displayUrl} alt="" className="w-full h-full object-cover" />
 ) : (
 <i className={'fas fa-image text-2xl ' + (isDark ? 'text-neutral-700' : 'text-gray-300')}></i>
 );
 })()}
 <div className="absolute top-2 right-2">
 <i className="fas fa-heart text-[#E91E8C] text-sm drop-"></i>
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
 surface_description: wizardState.surfaceDescription,
 environment_description: wizardState.environmentDescription || null,
 elements_description: wizardState.compositionElements.map(e => e.description).join('; ') || null,
 elements_images: [],
 mood_season: wizardState.moodSeason || null,
 product_presentation: wizardState.productPresentation || null,
 product_scale: wizardState.productScale || null,
 lighting: wizardState.lighting,
 lens_model: wizardState.lensModel,
 camera_angle: wizardState.cameraAngle,
 depth_of_field: wizardState.depthOfField,
 visual_style: wizardState.visualStyle,
 frame_ratio: wizardState.frameRatio,
 resolution: wizardState.resolution,
 default_variations: wizardState.variationsCount,
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
