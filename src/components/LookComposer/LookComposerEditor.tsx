// ═══════════════════════════════════════════════════════════════
// VIZZU - Look Composer Editor (Página 2 - Faseada)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, HistoryLog, SavedModel, LookComposition, MODEL_OPTIONS } from '../../types';
import { LookComposer as StudioLookComposer } from './LookComposerUI';
import { generateModeloIA } from '../../lib/api/studio';
import { LookComposerResult } from './LookComposerResult';
import { OptimizedImage } from '../OptimizedImage';
import { supabase } from '../../services/supabaseClient';
import { ResolutionSelector, Resolution } from '../ResolutionSelector';
import { Resolution4KConfirmModal, has4KConfirmation, savePreferredResolution, getPreferredResolution } from '../Resolution4KConfirmModal';
import { RESOLUTION_COST, canUseResolution, Plan } from '../../hooks/useCredits';
import type { VizzuTheme } from '../../contexts/UIContext';
import { useUI } from '../../contexts/UIContext';
import { useGeneration } from '../../contexts/GenerationContext';

interface LookComposerEditorProps {
 product: Product;
 products: Product[];
 userCredits: number;
 onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
 onAddHistoryLog: (action: string, details: string, status: HistoryLog['status'], items: Product[], method: HistoryLog['method'], cost: number, imageUrl?: string) => void;
 onBack: () => void;
 onCheckCredits?: (creditsNeeded: number, actionContext: 'studio' | 'cenario' | 'lifestyle' | 'video' | 'provador' | 'generic') => boolean;
 theme?: VizzuTheme;
 userId?: string;
 savedModels: SavedModel[];
 onSaveModel?: (model: SavedModel) => void;
 onOpenCreateModel?: () => void;
 pendingModelId?: string | null;
 onClearPendingModel?: () => void;
 modelLimit?: number;
 // Props para geração global
 isGenerating?: boolean;
 isMinimized?: boolean;
 generationProgress?: number;
 generationText?: string;
 onSetGenerating?: (value: boolean) => void;
 onSetMinimized?: (value: boolean) => void;
 onSetProgress?: (value: number) => void;
 onSetLoadingText?: (value: string) => void;
 isAnyGenerationRunning?: boolean;
 // Plano atual do usuário para verificar permissões de resolução
 currentPlan?: Plan;
 // Callback para abrir modal de planos (quando tentar usar 4K sem permissão)
 onOpenPlanModal?: () => void;
 editBalance?: number;
 onDeductEditCredits?: (amount: number, generationId?: string) => Promise<{ success: boolean; source?: 'edit' | 'regular' }>;
}

// Frases de loading (usadas durante o processo)
const LOADING_PHRASES = [
 "Preparando o modelo...",
 "Vestindo o look selecionado...",
 "Ajustando a composição...",
 "Aplicando o fundo escolhido...",
 "Processando texturas...",
 "Harmonizando cores e estilos...",
 "Finalizando detalhes...",
 "Otimizando a imagem...",
 "Quase pronto! Últimos ajustes..."
];

// Frases para a última etapa (rotacionam enquanto finaliza)
const FINALIZING_PHRASES = [
 "Aplicando detalhes finais...",
 "Melhorando iluminação...",
 "Otimizando qualidade...",
 "Ajustando cores e contraste...",
 "Refinando texturas...",
 "Suavizando bordas...",
 "Aprimorando nitidez...",
 "Balanceando tons...",
 "Quase lá! Últimos retoques..."
];

// ═══════════════════════════════════════════════════════════════
// PERSISTÊNCIA DE GERAÇÃO EM ANDAMENTO (para sobreviver ao F5)
// ═══════════════════════════════════════════════════════════════
const PENDING_GENERATION_KEY = 'vizzu_pending_generation';

interface PendingGenerationLookItem {
 name: string;
 image: string;
 slot: string;
}

interface PendingGeneration {
 oderId: string;
 productId: string;
 productName: string;
 productThumbnail?: string;
 startTime: number;
 viewsMode: 'front' | 'front-back';
 lookItems?: PendingGenerationLookItem[];
 modelThumbnail?: string;
}

const savePendingGeneration = (data: PendingGeneration) => {
 try {
 localStorage.setItem(PENDING_GENERATION_KEY, JSON.stringify(data));
 } catch (e) {
 console.error('Erro ao salvar geração pendente:', e);
 }
};

const getPendingGeneration = (): PendingGeneration | null => {
 try {
 const stored = localStorage.getItem(PENDING_GENERATION_KEY);
 if (stored) {
 return JSON.parse(stored);
 }
 } catch (e) {
 console.error('Erro ao ler geração pendente:', e);
 }
 return null;
};

const clearPendingGeneration = () => {
 try {
 localStorage.removeItem(PENDING_GENERATION_KEY);
 } catch (e) {
 console.error('Erro ao limpar geração pendente:', e);
 }
};

// Fundos pré-setados - com imagens de cenário completo e sceneHint para o prompt
const PRESET_BACKGROUNDS: Array<{
 id: string;
 name: string;
 url: string;
 category: string;
 icon: string;
 sceneHint: string;
}> = [
 { id: 'solid-color', name: 'Cor Sólida', url: '', category: 'solid', icon: 'fa-palette', sceneHint: 'solid colored background, studio lighting, model standing on matching colored floor' },
 { id: 'photo-studio', name: 'Estúdio Fotográfico', url: '/studio-bg-example.jpeg', category: 'estudio', icon: 'fa-camera', sceneHint: 'professional photo studio with gray seamless backdrop and floor, soft studio lighting' },
 { id: 'subway-station', name: 'Estação de Metrô', url: '/bg-metro.png', category: 'urbano', icon: 'fa-train-subway', sceneHint: 'subway station platform with colorful graffiti wall, model standing on tiled platform floor, urban underground setting with dramatic lighting' },
 { id: 'beach-promenade', name: 'Calçadão da Praia', url: '/bg-calcadao-praia.png', category: 'natureza', icon: 'fa-umbrella-beach', sceneHint: 'beachside promenade with palm trees, model standing on tiled walkway, golden hour sunlight, tropical coastal setting' },
 { id: 'botanical-garden', name: 'Jardim Botânico', url: '/bg-jardim-botanico.png', category: 'natureza', icon: 'fa-leaf', sceneHint: 'lush botanical garden pathway with tropical plants, model standing on stone path, natural dappled sunlight, green foliage' },
 { id: 'european-garden', name: 'Jardim Europeu', url: '/bg-jardim-europeu.png', category: 'natureza', icon: 'fa-fountain', sceneHint: 'elegant european formal garden with fountain, roses and hedges, model standing on stone pathway, romantic misty atmosphere' },
 { id: 'rooftop', name: 'Rooftop', url: '/bg-rooftop.png', category: 'urbano', icon: 'fa-building', sceneHint: 'modern rooftop terrace with city skyline, string lights overhead, model standing on concrete floor, golden hour sunset' },
 { id: 'cafe', name: 'Cafeteria', url: '/bg-cafeteria.png', category: 'interior', icon: 'fa-mug-hot', sceneHint: 'stylish cafe interior with brick walls, wooden furniture, warm natural light from large windows, model standing on wooden floor' },
 { id: 'tropical-beach', name: 'Praia', url: '/bg-praia.png', category: 'natureza', icon: 'fa-water', sceneHint: 'tropical beach with white sand and palm trees, turquoise ocean water, model standing on sandy beach, golden hour lighting' },
 { id: 'sunset-beach', name: 'Praia Pôr do Sol', url: '/bg-praia-por-do-sol.png', category: 'natureza', icon: 'fa-sun', sceneHint: 'beach at golden sunset, dramatic orange sky, waves crashing, model standing on wet sand with sun reflection, warm golden light' },
];

// Tipo para fundo salvo
interface SavedBackground {
 id: string;
 name: string;
 url?: string;
 base64?: string;
 color?: string;
 prompt?: string;
 createdAt: string;
}

type Step = 'product' | 'model' | 'look' | 'pose' | 'background' | 'views';
type ModelTab = 'generated' | 'presets' | 'create';
type LookMode = 'composer' | 'describe';
type BackgroundType = 'studio' | 'custom' | 'prompt';
type BackgroundMode = 'preset' | 'upload' | 'prompt' | 'saved';
type PoseMode = 'default' | 'custom';
type ViewsMode = 'front' | 'front-back';
type FramingMode = 'full-body' | 'upper-half' | 'lower-half' | 'face' | 'feet';

// Opções de enquadramento
const FRAMING_OPTIONS: { id: FramingMode; label: string; icon: string; description: string }[] = [
 { id: 'full-body', label: 'Corpo inteiro', icon: 'fa-person', description: 'Modelo inteiro, dos pés à cabeça' },
 { id: 'upper-half', label: 'Metade de cima', icon: 'fa-user', description: 'Da cintura pra cima' },
 { id: 'lower-half', label: 'Metade de baixo', icon: 'fa-shoe-prints', description: 'Da cintura pra baixo' },
 { id: 'face', label: 'Rosto', icon: 'fa-face-smile', description: 'Close-up no rosto/cabeça' },
 { id: 'feet', label: 'Pés', icon: 'fa-socks', description: 'Close-up nos pés' },
];

// Mapeamento: categoria → opções permitidas + default
const CATEGORY_TO_FRAMING: Record<string, { options: FramingMode[]; default: FramingMode }> = {
 // Cabeça
 'Bonés': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 'Chapéus': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 'Tiaras': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 'Lenços': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 // Topo
 'Camisetas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Blusas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Regatas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Tops': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Camisas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Jaquetas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Casacos': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Blazers': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Moletons': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Bodies': { options: ['upper-half', 'full-body'], default: 'full-body' },
 // Baixo
 'Calças': { options: ['lower-half', 'full-body'], default: 'full-body' },
 'Shorts': { options: ['lower-half', 'full-body'], default: 'full-body' },
 'Bermudas': { options: ['lower-half', 'full-body'], default: 'full-body' },
 'Saias': { options: ['lower-half', 'full-body'], default: 'full-body' },
 'Leggings': { options: ['lower-half', 'full-body'], default: 'full-body' },
 'Shorts Fitness': { options: ['lower-half', 'full-body'], default: 'full-body' },
 // Peças inteiras
 'Vestidos': { options: ['full-body', 'upper-half'], default: 'full-body' },
 'Macacões': { options: ['full-body', 'upper-half'], default: 'full-body' },
 'Jardineiras': { options: ['full-body', 'upper-half'], default: 'full-body' },
 // Pés
 'Tênis': { options: ['feet', 'lower-half', 'full-body'], default: 'feet' },
 'Sandálias': { options: ['feet', 'lower-half', 'full-body'], default: 'feet' },
 'Botas': { options: ['feet', 'lower-half', 'full-body'], default: 'feet' },
 'Calçados': { options: ['feet', 'lower-half', 'full-body'], default: 'feet' },
 // Acessórios de rosto
 'Óculos': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 'Bijuterias': { options: ['face', 'upper-half', 'full-body'], default: 'face' },
 // Acessórios de corpo
 'Bolsas': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Cintos': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Relógios': { options: ['upper-half', 'full-body'], default: 'full-body' },
 'Acessórios': { options: ['face', 'upper-half', 'full-body'], default: 'full-body' },
};

const getFramingForCategory = (category: string): { options: FramingMode[]; default: FramingMode } => {
 return CATEGORY_TO_FRAMING[category] || { options: ['full-body', 'upper-half', 'lower-half', 'face', 'feet'], default: 'full-body' };
};

// Interface para os steps de loading com thumbnails
interface LoadingStep {
 id: string;
 label: string;
 thumbnail?: string;
 type: 'setup' | 'product' | 'item' | 'finalize';
}

const STEPS: { id: Step; label: string; icon: string }[] = [
 { id: 'product', label: 'Produto', icon: 'fa-shirt' },
 { id: 'model', label: 'Modelo', icon: 'fa-user' },
 { id: 'look', label: 'Look', icon: 'fa-layer-group' },
 { id: 'pose', label: 'Pose', icon: 'fa-person-walking' },
 { id: 'background', label: 'Fundo', icon: 'fa-image' },
 { id: 'views', label: 'Gerar', icon: 'fa-wand-magic-sparkles' },
];

// Mapeamento de categorias para slots que devem ser bloqueados (peça principal)
const CATEGORY_TO_LOCKED_SLOTS: Record<string, (keyof LookComposition)[]> = {
 // Cabeça
 'Bonés': ['head'],
 'Chapéus': ['head'],
 'Tiaras': ['head'],
 'Lenços': ['head'],
 // Topo
 'Camisetas': ['top'],
 'Blusas': ['top'],
 'Regatas': ['top'],
 'Tops': ['top'],
 'Camisas': ['top'],
 'Jaquetas': ['top'],
 'Casacos': ['top'],
 'Blazers': ['top'],
 'Moletons': ['top'],
 'Bodies': ['top'],
 // Baixo
 'Calças': ['bottom'],
 'Shorts': ['bottom'],
 'Bermudas': ['bottom'],
 'Saias': ['bottom'],
 'Leggings': ['bottom'],
 'Shorts Fitness': ['bottom'],
 // Peças inteiras (bloqueiam top E bottom)
 'Vestidos': ['top', 'bottom'],
 'Macacões': ['top', 'bottom'],
 'Jardineiras': ['top', 'bottom'],
 // Pés
 'Tênis': ['feet'],
 'Sandálias': ['feet'],
 'Botas': ['feet'],
 'Calçados': ['feet'],
 // Acessórios (não bloqueiam nada específico por padrão)
 'Acessórios': [],
 'Bolsas': [],
 'Cintos': [],
 'Relógios': [],
 'Óculos': [],
 'Bijuterias': [],
};

export const LookComposerEditor: React.FC<LookComposerEditorProps> = ({
 product,
 products,
 userCredits,
 onUpdateProduct,
 onAddHistoryLog,
 onBack,
 onCheckCredits,
 theme = 'dark',
 userId,
 savedModels,
 onSaveModel,
 onOpenCreateModel,
 pendingModelId,
 onClearPendingModel,
 modelLimit = 10,
 isGenerating: globalIsGenerating = false,
 isMinimized = false,
 generationProgress = 0,
 generationText = '',
 onSetGenerating,
 onSetMinimized,
 onSetProgress,
 onSetLoadingText,
 isAnyGenerationRunning = false,
 currentPlan,
 onOpenPlanModal,
 editBalance = 0,
 onDeductEditCredits,
}) => {
 const { addCompletedProduct } = useGeneration();
 const { showToast } = useUI();
 // Estado da fase atual
 const [currentStep, setCurrentStep] = useState<Step>('product');

 // Estado do modelo
 const [modelTab, setModelTab] = useState<ModelTab>('generated');

 // Separar modelos gerados (custom) dos pré-definidos (default)
 const generatedModels = useMemo(() => savedModels.filter(m => !m.id.startsWith('default-')), [savedModels]);
 const presetModels = useMemo(() => savedModels.filter(m => m.id.startsWith('default-')), [savedModels]);
 const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

 // Auto-selecionar modelo criado a partir do LC e avançar para próximo passo
 useEffect(() => {
 if (pendingModelId) {
 setSelectedModelId(pendingModelId);
 setModelTab('generated');
 setCurrentStep('look');
 onClearPendingModel?.();
 }
 }, [pendingModelId]);

 // Estado do look
 const [lookMode, setLookMode] = useState<LookMode>('composer');
 const [lookComposition, setLookComposition] = useState<LookComposition>({});
 const [describedLook, setDescribedLook] = useState({
 top: '',
 bottom: '',
 shoes: '',
 accessories: ''
 });

 // Slots bloqueados baseados na categoria do produto principal
 const lockedSlots = useMemo(() => {
 return CATEGORY_TO_LOCKED_SLOTS[product.category] || [];
 }, [product.category]);

 // Estado da pose
 const [poseMode, setPoseMode] = useState<PoseMode>('default');
 const [customPosePrompt, setCustomPosePrompt] = useState('');

 // Estado do fundo
 const [backgroundType, setBackgroundType] = useState<BackgroundType>('studio');
 const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('preset');
 const [customBackground, setCustomBackground] = useState<string | null>(null);
 const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
 const [solidColor, setSolidColor] = useState('#ffffff');
 const [backgroundPrompt, setBackgroundPrompt] = useState('');
 const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
 const [showSaveBackgroundModal, setShowSaveBackgroundModal] = useState(false);
 const [newBackgroundName, setNewBackgroundName] = useState('');
 const [showBackgroundSourcePicker, setShowBackgroundSourcePicker] = useState(false);

 // Estado dos ângulos (views)
 const [viewsMode, setViewsMode] = useState<ViewsMode>('front');

 // Estado do enquadramento (framing) — filtrado pela categoria do produto
 const framingConfig = useMemo(() => getFramingForCategory(product.category), [product.category]);
 const [framing, setFraming] = useState<FramingMode>(() => getFramingForCategory(product.category).default);

 // Recalcular framing default quando a categoria do produto mudar
 useEffect(() => {
 setFraming(framingConfig.default);
 }, [framingConfig.default]);

 // Estado de geração
 const [localIsGenerating, setLocalIsGenerating] = useState(false);
 const [localProgress, setLocalProgress] = useState(0);
 const [localLoadingText, setLocalLoadingText] = useState('');
 const [phraseIndex, setPhraseIndex] = useState(0);
 const [finalizingPhraseIndex, setFinalizingPhraseIndex] = useState(0);
 const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
 const [timerStep, setTimerStep] = useState(0); // Step controlado por timer (2 min)

 // Estados para restauração após F5
 const [restoredLookItems, setRestoredLookItems] = useState<PendingGenerationLookItem[]>([]);
 const [restoredProductThumbnail, setRestoredProductThumbnail] = useState<string | null>(null);
 const [restoredModelThumbnail, setRestoredModelThumbnail] = useState<string | null>(null);

 // Estado do resultado
 const [showResult, setShowResult] = useState(false);
 const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
 const [generatedBackImageUrl, setGeneratedBackImageUrl] = useState<string | null>(null);
 const [generationId, setGenerationId] = useState<string | null>(null);

 // Estado de resolução (2K ou 4K)
 const [resolution, setResolution] = useState<Resolution>(() => getPreferredResolution());
 const [show4KConfirmModal, setShow4KConfirmModal] = useState(false);
 const [pending4KConfirm, setPending4KConfirm] = useState(false);

 // Verificar se plano permite 4K
 const canUse4K = currentPlan ? canUseResolution(currentPlan, '4k') : false;

 // Estado para upload de foto de costas inline
 const [uploadingBackFor, setUploadingBackFor] = useState<string | null>(null);
 const backImageInputRef = React.useRef<HTMLInputElement>(null);
 const [pendingUploadProductId, setPendingUploadProductId] = useState<string | null>(null);

 const handleUploadBackImage = useCallback(async (file: File, productId: string) => {
 if (!userId) return;
 setUploadingBackFor(productId);
 try {
 const fileName = `${userId}/${productId}/original_back_${Date.now()}.${file.name.split('.').pop()}`;
 const { error: uploadError } = await supabase.storage
 .from('products')
 .upload(fileName, file, { upsert: true });
 if (uploadError) throw uploadError;

 const publicUrl = `https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/${fileName}`;

 const { data: imageData, error: insertError } = await supabase
 .from('product_images')
 .insert({
 product_id: productId,
 user_id: userId,
 type: 'original',
 angle: 'back',
 storage_path: fileName,
 url: publicUrl,
 file_name: file.name,
 mime_type: file.type,
 is_primary: false
 })
 .select()
 .single();
 if (insertError) throw insertError;

 const targetProduct = products.find(p => p.id === productId);
 if (targetProduct) {
 onUpdateProduct(productId, {
 originalImages: {
 ...targetProduct.originalImages,
 back: { id: imageData.id, url: publicUrl, name: file.name }
 }
 });
 }
 } catch (error) {
 console.error('Erro ao fazer upload da foto de costas:', error);
 } finally {
 setUploadingBackFor(null);
 setPendingUploadProductId(null);
 }
 }, [userId, products, onUpdateProduct]);

 // Usar estado global se disponível
 const isGenerating = onSetGenerating ? globalIsGenerating : localIsGenerating;
 const currentProgress = onSetProgress ? generationProgress : localProgress;
 const currentLoadingText = onSetLoadingText ? generationText : localLoadingText;

 const isDark = theme !== 'light';

 // Carregar fundos salvos do localStorage
 useEffect(() => {
 const saved = localStorage.getItem(`vizzu-saved-backgrounds-${userId}`);
 if (saved) {
 try {
 setSavedBackgrounds(JSON.parse(saved));
 } catch (e) {
 console.error('Erro ao carregar fundos salvos:', e);
 }
 }
 }, [userId]);

 // ═══════════════════════════════════════════════════════════════
 // VERIFICAR GERAÇÃO PENDENTE AO CARREGAR (sobrevive ao F5)
 // ═══════════════════════════════════════════════════════════════
 const checkPendingGeneration = useCallback(async () => {
 const pending = getPendingGeneration();
 if (!pending || !userId) return;

 // Verificar se a geração ainda está em andamento (menos de 5 minutos)
 const elapsedMinutes = (Date.now() - pending.startTime) / 1000 / 60;
 if (elapsedMinutes > 5) {
 clearPendingGeneration();
 return;
 }

 // Verificar se a imagem já foi gerada no Supabase
 const { data: generation, error } = await supabase
 .from('generations')
 .select('id, output_image_url, status, error_message')
 .eq('user_id', userId)
 .eq('product_id', pending.productId)
 .order('created_at', { ascending: false })
 .limit(1)
 .single();

 if (error) {
 // Continuar fazendo polling
 return 'polling';
 }

 // Geração falhou - parar polling e notificar
 if (generation?.status === 'failed' || generation?.status === 'error') {
 clearPendingGeneration();
 const errorMsg = generation.error_message || 'Erro desconhecido na geração';
 console.error('Geração falhou em background:', errorMsg);
 return { status: 'failed', message: errorMsg };
 }

 if (generation?.output_image_url && generation.status === 'completed') {
 clearPendingGeneration();
 if (product) addCompletedProduct('look-composer', product.id);
 // Marcar como notificado para não duplicar toast no startup check
 if (userId) {
 const notifiedKey = `vizzu_bg_notified_${userId}`;
 const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
 notified.push(`lc-${generation.id}`);
 localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));
 }
 setGeneratedImageUrl(generation.output_image_url);

 // Buscar imagem de costas (se existir) na tabela product_images
 const { data: backImage } = await supabase
 .from('product_images')
 .select('url')
 .eq('generation_id', generation.id)
 .ilike('file_name', '%back%')
 .limit(1)
 .maybeSingle();

 setGeneratedBackImageUrl(backImage?.url || null);
 setGenerationId(generation.id);
 setShowResult(true);
 return 'completed';
 }

 // Ainda em andamento - mostrar tela de loading
 return 'polling';
 }, [userId]);

 // Verificar geração pendente ao montar e fazer polling
 useEffect(() => {
 const pending = getPendingGeneration();
 if (!pending || !userId) return;

 // Se tem geração pendente, mostrar tela de loading
 const setGenerating = onSetGenerating || setLocalIsGenerating;
 const setProgress = onSetProgress || setLocalProgress;

 setGenerating(true);

 // IMPORTANTE: Restaurar o generationStartTime para o timer funcionar
 setGenerationStartTime(pending.startTime);

 // Restaurar dados do look para exibir nos steps
 if (pending.lookItems) {
 setRestoredLookItems(pending.lookItems);
 }
 if (pending.productThumbnail) {
 setRestoredProductThumbnail(pending.productThumbnail);
 }
 if (pending.modelThumbnail) {
 setRestoredModelThumbnail(pending.modelThumbnail);
 }

 // Calcular progresso estimado baseado no tempo decorrido
 const elapsedMs = Date.now() - pending.startTime;
 const estimatedDurationMs = 2.3 * 60 * 1000; // 2.3 minutos
 const estimatedProgress = Math.min(95, Math.floor((elapsedMs / estimatedDurationMs) * 100));
 setProgress(estimatedProgress);

 // Fazer polling a cada 5 segundos
 const pollInterval = setInterval(async () => {
 const result = await checkPendingGeneration();

 if (result === 'completed') {
 clearInterval(pollInterval);
 setGenerating(false);
 setProgress(0);
 // Limpar dados restaurados
 setRestoredLookItems([]);
 setRestoredProductThumbnail(null);
 setRestoredModelThumbnail(null);
 setGenerationStartTime(null);
 setTimerStep(0);
 } else if (result && typeof result === 'object' && result.status === 'failed') {
 clearInterval(pollInterval);
 setGenerating(false);
 setProgress(0);
 setRestoredLookItems([]);
 setRestoredProductThumbnail(null);
 setRestoredModelThumbnail(null);
 setGenerationStartTime(null);
 setTimerStep(0);
 alert(`Erro na geração: ${result.message}`);
 } else if (result === 'polling') {
 // Atualizar progresso estimado
 const newElapsedMs = Date.now() - pending.startTime;
 const newProgress = Math.min(95, Math.floor((newElapsedMs / estimatedDurationMs) * 100));
 setProgress(newProgress);
 }
 }, 5000);

 // Timeout de 5 minutos
 const timeout = setTimeout(() => {
 clearInterval(pollInterval);
 clearPendingGeneration();
 setGenerating(false);
 setProgress(0);
 setRestoredLookItems([]);
 setRestoredProductThumbnail(null);
 setRestoredModelThumbnail(null);
 setGenerationStartTime(null);
 setTimerStep(0);
 alert('A geração expirou após 5 minutos. Tente novamente.');
 }, 5 * 60 * 1000);

 return () => {
 clearInterval(pollInterval);
 clearTimeout(timeout);
 };
 }, [userId, checkPendingGeneration, onSetGenerating, onSetProgress]);

 // Rotacionar frases de loading
 useEffect(() => {
 if (!isGenerating) return;
 const interval = setInterval(() => {
 setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
 }, 3000);
 return () => clearInterval(interval);
 }, [isGenerating]);

 useEffect(() => {
 if (isGenerating) {
 const setText = onSetLoadingText || setLocalLoadingText;
 setText(LOADING_PHRASES[phraseIndex]);
 }
 }, [phraseIndex, isGenerating, onSetLoadingText]);

 // Rotacionar frases de finalização (quando está na última etapa)
 useEffect(() => {
 if (!isGenerating) {
 setFinalizingPhraseIndex(0);
 return;
 }
 const interval = setInterval(() => {
 setFinalizingPhraseIndex(prev => (prev + 1) % FINALIZING_PHRASES.length);
 }, 2500); // Rotaciona a cada 2.5s
 return () => clearInterval(interval);
 }, [isGenerating]);

 // Modelo selecionado (movido para antes de loadingSteps que depende dele)
 const selectedModel = savedModels.find(m => m.id === selectedModelId);

 // Helper: Obter melhor imagem do produto (prioriza Product Studio otimizado)
 const getOptimizedProductImage = useCallback((p: Product): string | undefined => {
 // Primeiro tenta imagem otimizada do Product Studio
 if (p.generatedImages?.productStudio?.length) {
 const lastSession = p.generatedImages.productStudio[p.generatedImages.productStudio.length - 1];
 if (lastSession.images?.length) {
 const frontImage = lastSession.images.find(img => img.angle === 'front');
 if (frontImage?.url) return frontImage.url;
 if (lastSession.images[0]?.url) return lastSession.images[0].url;
 }
 }
 // Fallback para imagem original
 if (p.originalImages?.front?.url) return p.originalImages.front.url;
 if (p.images?.[0]?.url) return p.images[0].url;
 if (p.images?.[0]?.base64) return p.images[0].base64;
 return undefined;
 }, []);

 // ═══════════════════════════════════════════════════════════════
 // LOADING STEPS - Lista de passos para mostrar na tela de loading
 // (Movido para antes do timer useEffect para evitar erro de ordem)
 // ═══════════════════════════════════════════════════════════════
 const loadingSteps = useMemo<LoadingStep[]>(() => {
 const steps: LoadingStep[] = [];

 // Step 1: Preparando modelo IA
 // Usa dados restaurados se disponíveis (após F5)
 const modelThumbnail = selectedModel?.images?.front || selectedModel?.referenceImageUrl || restoredModelThumbnail;
 steps.push({
 id: 'model-setup',
 label: 'Preparando modelo IA',
 thumbnail: modelThumbnail || undefined,
 type: 'setup'
 });

 // Step 2: Produto principal
 // Usa dados restaurados se disponíveis (após F5) - Prioriza imagem otimizada do Product Studio
 const mainProductImage = getOptimizedProductImage(product) || restoredProductThumbnail;
 steps.push({
 id: `product-${product.id}`,
 label: product.name,
 thumbnail: mainProductImage || undefined,
 type: 'product'
 });

 // Steps 3+: Itens do look (da composição ou restaurados após F5)
 const hasLookComposition = lookMode === 'composer' && Object.keys(lookComposition).length > 0;
 const hasRestoredItems = restoredLookItems.length > 0;

 if (hasLookComposition) {
 // Usar dados atuais da composição
 Object.entries(lookComposition).forEach(([slot, item]) => {
 if (item && item.image) {
 steps.push({
 id: `look-${slot}`,
 label: item.name || slot,
 thumbnail: item.image,
 type: 'item'
 });
 }
 });
 } else if (hasRestoredItems) {
 // Usar dados restaurados após F5
 restoredLookItems.forEach(item => {
 steps.push({
 id: `look-${item.slot}`,
 label: item.name,
 thumbnail: item.image,
 type: 'item'
 });
 });
 }

 // Step final: Finalizando
 steps.push({
 id: 'finalize',
 label: viewsMode === 'front-back' ? 'Finalizando imagens' : 'Finalizando imagem',
 type: 'finalize'
 });

 return steps;
 }, [product, lookComposition, lookMode, selectedModel, viewsMode, restoredLookItems, restoredProductThumbnail, restoredModelThumbnail]);

 // Timer de 2 minutos para avançar os steps (independente do progresso da API)
 useEffect(() => {
 if (!isGenerating) {
 setGenerationStartTime(null);
 setTimerStep(0);
 return;
 }

 // Se generationStartTime não foi definido, aguardar
 // (será definido por handleGenerate ou pela restauração de pending generation)
 if (!generationStartTime) {
 return;
 }

 const TWO_MINUTES_MS = 2 * 60 * 1000; // 2 minutos

 const interval = setInterval(() => {

 const elapsed = Date.now() - generationStartTime;
 const totalSteps = loadingSteps.length;
 const stepsBeforeFinalize = totalSteps - 1;

 if (elapsed >= TWO_MINUTES_MS) {
 // Após 2 minutos, vai para o último step (finalizando)
 setTimerStep(totalSteps - 1);
 } else {
 // Distribui os steps ao longo de 2 minutos
 const progress = elapsed / TWO_MINUTES_MS;
 const stepIndex = Math.floor(progress * stepsBeforeFinalize);
 setTimerStep(Math.min(stepIndex, stepsBeforeFinalize - 1));
 }
 }, 500); // Atualiza a cada 500ms

 return () => clearInterval(interval);
 }, [isGenerating, generationStartTime, loadingSteps.length]);

 // Obter imagens do produto (prioriza Product Studio otimizadas, mas inclui todas as originais disponíveis)
 const productImages = useMemo(() => {
 const images: { url: string; type: string }[] = [];
 const addedUrls = new Set<string>(); // Evitar duplicatas

 const addImage = (url: string, type: string) => {
 if (url && !addedUrls.has(url)) {
 addedUrls.add(url);
 images.push({ url, type });
 }
 };

 // Primeiro: imagens otimizadas do Product Studio (frente e costas)
 if (product.generatedImages?.productStudio?.length) {
 const lastSession = product.generatedImages.productStudio[product.generatedImages.productStudio.length - 1];
 if (lastSession.images?.length) {
 const frontImg = lastSession.images.find(img => img.angle === 'front');
 const backImg = lastSession.images.find(img => img.angle === 'back');

 if (frontImg?.url) addImage(frontImg.url, 'Frente (Otimizada)');
 if (backImg?.url) addImage(backImg.url, 'Costas (Otimizada)');
 }
 }

 // Segundo: imagens originais que não foram cobertas pelas otimizadas
 if (product.originalImages?.front?.url) addImage(product.originalImages.front.url, 'Frente');
 if (product.originalImages?.back?.url) addImage(product.originalImages.back.url, 'Costas');
 if (product.originalImages?.detail?.url) addImage(product.originalImages.detail.url, 'Detalhe');

 // Fallback legacy
 if (images.length === 0 && product.images) {
 product.images.forEach((img, idx) => {
 const url = img.url || img.base64;
 if (url) addImage(url, `Foto ${idx + 1}`);
 });
 }

 return images;
 }, [product]);

 const [currentImageIndex, setCurrentImageIndex] = useState(0);

 // Step atual é controlado pelo timer de 2 minutos
 // O timer avança os steps gradualmente até o último (finalizando) após 2 min
 const currentGenerationStep = useMemo(() => {
 if (!isGenerating) return 0;
 return timerStep;
 }, [isGenerating, timerStep]);

 // Categorias que NÃO precisam de foto de costas (acessórios exceto cabeça)
 const categoriesWithoutBackRequired = [
 'Tênis', 'Sapatos', 'Sandálias', 'Calçados', 'Botas',
 'Meias', 'Relógios', 'Bolsas', 'Cintos', 'Bijuterias',
 'Óculos', 'Pulseiras', 'Colares', 'Brincos', 'Anéis',
 'Carteiras', 'Mochilas', 'Acessórios'
 ];

 // Verificar se um produto precisa de foto de costas
 const needsBackImage = (productCategory: string | undefined): boolean => {
 if (!productCategory) return true; // Se não tem categoria, assume que precisa
 return !categoriesWithoutBackRequired.some(
 cat => productCategory.toLowerCase().includes(cat.toLowerCase())
 );
 };

 // Verificar quais produtos do look não têm foto de costas
 const productsWithoutBackImage = useMemo(() => {
 const missing: Array<{ name: string; sku: string; id: string }> = [];

 // Verificar produto principal (só se a categoria precisa de costas)
 if (needsBackImage(product.category) && !product.originalImages?.back?.url) {
 missing.push({ name: product.name, sku: product.sku, id: product.id });
 }

 // Verificar produtos do look composition (modo composer)
 if (lookMode === 'composer') {
 Object.entries(lookComposition).forEach(([slot, item]) => {
 if (item.productId) {
 const lookProduct = products.find(p => p.id === item.productId);
 // Só verificar se a categoria precisa de costas
 if (lookProduct && needsBackImage(lookProduct.category) && !lookProduct.originalImages?.back?.url) {
 // Evitar duplicatas
 if (!missing.find(m => m.id === lookProduct.id)) {
 missing.push({ name: lookProduct.name, sku: lookProduct.sku, id: lookProduct.id });
 }
 }
 }
 });
 }

 return missing;
 }, [product, lookComposition, lookMode, products]);

 // Verificar se o modelo selecionado tem imagem de costas
 const modelHasBackImage = useMemo(() => {
 if (!selectedModel) return false;
 return !!(selectedModel.images?.back);
 }, [selectedModel]);

 // Calcular créditos (1 por imagem)
 const calculateCredits = (): number => {
 const baseCredits = 1;
 // Se for frente e costas, dobra os créditos
 const viewsMultiplier = viewsMode === 'front-back' ? 2 : 1;
 // Multiplicar por custo de resolução
 return baseCredits * viewsMultiplier * RESOLUTION_COST[resolution];
 };

 const creditsNeeded = calculateCredits();

 // Handler para mudança de resolução com confirmação 4K
 const handleResolutionChange = (newResolution: Resolution) => {
 if (newResolution === '4k' && !has4KConfirmation()) {
 // Primeira vez selecionando 4K - mostrar modal de confirmação
 setPending4KConfirm(true);
 setShow4KConfirmModal(true);
 return;
 }

 setResolution(newResolution);
 savePreferredResolution(newResolution);
 };

 // Confirmar seleção de 4K
 const handleConfirm4K = () => {
 setResolution('4k');
 savePreferredResolution('4k');
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Cancelar seleção de 4K
 const handleCancel4K = () => {
 setShow4KConfirmModal(false);
 setPending4KConfirm(false);
 };

 // Handler para abrir modal de upgrade de plano
 const handleUpgradeClick = () => {
 if (onOpenPlanModal) {
 onOpenPlanModal();
 }
 };

 // Verificar se pode avançar para próxima fase
 const canProceed = (step: Step): boolean => {
 switch (step) {
 case 'product':
 return productImages.length > 0;
 case 'model':
 return !!selectedModelId || modelTab === 'create';
 case 'look':
 if (lookMode === 'describe') {
 return describedLook.top !== '' || describedLook.bottom !== '' || describedLook.shoes !== '';
 }
 // Modo composer: permite avançar mesmo sem itens complementares
 // Slots vazios serão preenchidos com roupas genéricas pela IA
 return true;
 case 'pose':
 // Pose padrão sempre OK, custom precisa de prompt
 return poseMode === 'default' || customPosePrompt.trim().length > 0;
 case 'background':
 if (backgroundType === 'studio') return true;
 if (backgroundMode === 'prompt') return backgroundPrompt.trim().length > 0;
 if (backgroundMode === 'preset' && selectedPreset === 'solid-color') return true;
 if (backgroundMode === 'saved') return !!selectedPreset;
 return !!customBackground || !!selectedPreset;
 case 'views':
 // Se for só frente, pode avançar
 if (viewsMode === 'front') return true;
 // Se for frente e costas, só pode avançar se todos produtos tiverem foto de costas
 return productsWithoutBackImage.length === 0;
 default:
 return false;
 }
 };

 // Salvar fundo
 const handleSaveBackground = () => {
 if (!newBackgroundName.trim()) return;

 const newBackground: SavedBackground = {
 id: `bg-${Date.now()}`,
 name: newBackgroundName.trim(),
 createdAt: new Date().toISOString(),
 };

 if (backgroundMode === 'preset' && selectedPreset === 'solid-color') {
 newBackground.color = solidColor;
 } else if (backgroundMode === 'prompt') {
 newBackground.prompt = backgroundPrompt;
 } else if (customBackground) {
 newBackground.base64 = customBackground;
 } else if (selectedPreset) {
 const preset = PRESET_BACKGROUNDS.find(b => b.id === selectedPreset);
 newBackground.url = preset?.url;
 }

 const updated = [...savedBackgrounds, newBackground];
 setSavedBackgrounds(updated);
 localStorage.setItem(`vizzu-saved-backgrounds-${userId}`, JSON.stringify(updated));
 setShowSaveBackgroundModal(false);
 setNewBackgroundName('');
 };

 // Deletar fundo salvo
 const handleDeleteSavedBackground = (bgId: string) => {
 const updated = savedBackgrounds.filter(bg => bg.id !== bgId);
 setSavedBackgrounds(updated);
 localStorage.setItem(`vizzu-saved-backgrounds-${userId}`, JSON.stringify(updated));
 if (selectedPreset === bgId) {
 setSelectedPreset(null);
 }
 };

 // Navegação entre fases
 const goToStep = (step: Step) => {
 setCurrentStep(step);
 };

 const nextStep = () => {
 const currentIndex = STEPS.findIndex(s => s.id === currentStep);
 if (currentIndex < STEPS.length - 1) {
 setCurrentStep(STEPS[currentIndex + 1].id);
 }
 };

 const prevStep = () => {
 const currentIndex = STEPS.findIndex(s => s.id === currentStep);
 if (currentIndex > 0) {
 setCurrentStep(STEPS[currentIndex - 1].id);
 }
 };

 // Processar arquivo de fundo (usado por upload e drag & drop)
 const processBackgroundFile = (file: File) => {
 if (!file.type.startsWith('image/')) return;
 const reader = new FileReader();
 reader.onload = (ev) => {
 setCustomBackground(ev.target?.result as string);
 setSelectedPreset(null);
 };
 reader.readAsDataURL(file);
 };

 // Upload de fundo personalizado
 const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 processBackgroundFile(file);
 }
 };

 // Drag & drop para fundo personalizado
 const handleBackgroundDrop = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 const file = e.dataTransfer.files?.[0];
 if (file && file.type.startsWith('image/')) {
 processBackgroundFile(file);
 }
 };

 const handleBackgroundDragOver = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 };

 // Minimizar/Maximizar
 const handleMinimize = () => {
 if (onSetMinimized) onSetMinimized(true);
 };

 const handleMaximize = () => {
 if (onSetMinimized) onSetMinimized(false);
 };

 // Handlers da tela de resultado
 const handleResultSave = () => {
 setShowResult(false);
 setGeneratedImageUrl(null);
 setGeneratedBackImageUrl(null);
 setGenerationId(null);
 onBack(); // Voltar para a página principal do Look Composer
 };

 const handleResultRegenerate = () => {
 setShowResult(false);
 setGeneratedImageUrl(null);
 setGeneratedBackImageUrl(null);
 setGenerationId(null);
 // Voltar para a tela de geração
 };

 const handleResultDelete = () => {
 // Remover a imagem do produto
 if (generationId) {
 const currentGenerated = product.generatedImages || {
 studioReady: [],
 cenarioCriativo: [],
 modeloIA: [],
 productStudio: []
 };

 onUpdateProduct(product.id, {
 generatedImages: {
 ...currentGenerated,
 modeloIA: (currentGenerated.modeloIA || []).filter(img => img.id !== generationId)
 }
 });
 }

 setShowResult(false);
 setGeneratedImageUrl(null);
 setGeneratedBackImageUrl(null);
 setGenerationId(null);
 };

 const handleResultBack = () => {
 setShowResult(false);
 setGeneratedImageUrl(null);
 setGeneratedBackImageUrl(null);
 setGenerationId(null);
 };

 // Criar novo look (reseta configurações mas mantém produto)
 const handleNewLook = () => {
 setShowResult(false);
 setGeneratedImageUrl(null);
 setGeneratedBackImageUrl(null);
 setGenerationId(null);
 // Resetar configurações para criar novo look
 setCurrentStep('model');
 setLookComposition({});
 setDescribedLook({ top: '', bottom: '', shoes: '', accessories: '' });
 setPoseMode('default');
 setCustomPosePrompt('');
 setBackgroundType('studio');
 setBackgroundMode('preset');
 setCustomBackground(null);
 setSelectedPreset(null);
 setBackgroundPrompt('');
 setViewsMode('front');
 };

 // Gerar look
 const handleGenerate = async () => {
 if (isAnyGenerationRunning) {
 showToast('Aguarde a geração atual terminar.', 'info');
 return;
 }

 if (viewsMode === 'front-back' && productsWithoutBackImage.length > 0) {
 const names = productsWithoutBackImage.map(p => p.name).join(', ');
 showToast(
   `Adicione fotos de costas para gerar frente e costas: ${names}`,
   'error'
 );
 return;
 }

 if (onCheckCredits && !onCheckCredits(creditsNeeded, 'lifestyle')) {
 return;
 }

 // Validações
 if (!selectedModel && modelTab !== 'create') {
 showToast('Selecione um modelo para continuar.', 'error');
 return;
 }

 if (!userId) {
 showToast('Usuário não identificado.', 'error');
 return;
 }

 const setGenerating = onSetGenerating || setLocalIsGenerating;
 const setProgress = onSetProgress || setLocalProgress;

 setGenerating(true);
 setProgress(0);
 setPhraseIndex(0);
 setGenerationStartTime(Date.now()); // Iniciar timer de 2 minutos
 setTimerStep(0);

 let keepPendingOnError = false;
 try {
 // Construir prompt do modelo a partir do selectedModel
 const ageRangeDescriptions: Record<string, string> = {
 'child': '3-12 years old child',
 'teen': '13-19 years old teenager',
 'young': '20-25 years old young adult',
 'adult': '25-35 years old adult',
 'mature': '35-50 years old mature adult',
 'senior': '50-60 years old senior',
 'elderly': '60+ years old elderly',
 };
 const modelPromptParts: string[] = [];
 if (selectedModel) {
 if (selectedModel.modelType === 'real') {
   // Modelo real: Gemini infere da foto de referência
   modelPromptParts.push(selectedModel.gender === 'woman' ? 'female model' : 'male model');
 } else {
   if (selectedModel.ageRange) modelPromptParts.push(ageRangeDescriptions[selectedModel.ageRange] || selectedModel.ageRange);
   modelPromptParts.push(selectedModel.gender === 'woman' ? 'female' : 'male');
   if (selectedModel.ethnicity) modelPromptParts.push(selectedModel.ethnicity);
   if (selectedModel.ageRange !== 'child' && selectedModel.bodyType) modelPromptParts.push(selectedModel.bodyType);
 }
 }
 const modelPrompt = modelPromptParts.join(' ') || 'female brazilian average adult';

 // Construir lookItems para modo composer
 let lookItems: Array<{
 slot: string;
 image: string;
 name: string;
 sku?: string;
 productId?: string;
 imageId?: string;
 detailImage?: string;
 }> | undefined;

 if (lookMode === 'composer' && Object.keys(lookComposition).length > 0) {
 lookItems = Object.entries(lookComposition).map(([slot, item]) => {
 // Buscar imagem de detalhe do produto
 const lookProduct = item.productId ? products.find(p => p.id === item.productId) : null;
 const detailUrl = lookProduct?.originalImages?.detail?.url || undefined;
 return {
 slot,
 image: item.image || '',
 name: item.name || '',
 sku: item.sku || '',
 productId: item.productId,
 imageId: item.imageId,
 detailImage: detailUrl,
 };
 });
 }

 // Construir clothingPrompt para modo describe
 let clothingPrompt: string | undefined;
 if (lookMode === 'describe') {
 const parts: string[] = [];
 if (describedLook.top) parts.push(`top: ${describedLook.top}`);
 if (describedLook.bottom) parts.push(`bottom: ${describedLook.bottom}`);
 if (describedLook.shoes) parts.push(`shoes: ${describedLook.shoes}`);
 if (describedLook.accessories) parts.push(`accessories: ${describedLook.accessories}`);
 clothingPrompt = parts.join(', ');
 }

 // Obter imagem principal do produto (frente)
 const mainImage = productImages[0];
 const imageUrl = mainImage?.url || '';
 const imageId = product.originalImages?.front?.id || product.images?.[0]?.id || '';

 // Obter imagem de detalhe do produto principal (logo, estampa, bordado)
 const mainDetailImageUrl = product.originalImages?.detail?.url || undefined;

 // Obter imagem de costas do produto principal (se viewsMode === 'front-back')
 // Se o produto não precisa de costas (acessório), usa a imagem de frente
 const productNeedsBack = needsBackImage(product.category);
 const backImageUrl = product.originalImages?.back?.url ||
 (!productNeedsBack ? imageUrl : ''); // Acessórios usam imagem de frente
 const backImageId = product.originalImages?.back?.id ||
 (!productNeedsBack ? imageId : '');

 // Construir lookItemsBack para modo composer com frente e costas
 let lookItemsBack: Array<{
 slot: string;
 image: string;
 name: string;
 sku?: string;
 productId?: string;
 imageId?: string;
 detailImage?: string;
 }> | undefined;

 if (viewsMode === 'front-back' && lookMode === 'composer' && Object.keys(lookComposition).length > 0) {
 lookItemsBack = Object.entries(lookComposition).map(([slot, item]) => {
 // Buscar o produto do look para pegar a imagem de costas
 const lookProduct = item.productId ? products.find(p => p.id === item.productId) : null;

 // Verificar se este produto precisa de foto de costas
 const itemNeedsBack = needsBackImage(lookProduct?.category);

 // Se não precisa de costas (acessório), usa a imagem de frente
 const frontImage = lookProduct?.originalImages?.front?.url ||
 lookProduct?.images?.[0]?.url ||
 lookProduct?.images?.[0]?.base64 ||
 item.image || '';
 const frontImgId = lookProduct?.originalImages?.front?.id ||
 lookProduct?.images?.[0]?.id || '';

 const backImage = lookProduct?.originalImages?.back?.url ||
 (!itemNeedsBack ? frontImage : ''); // Acessórios usam imagem de frente
 const backImgId = lookProduct?.originalImages?.back?.id ||
 (!itemNeedsBack ? frontImgId : '');

 const detailUrl = lookProduct?.originalImages?.detail?.url || undefined;
 return {
 slot,
 image: backImage,
 name: item.name || '',
 sku: item.sku || '',
 productId: item.productId,
 imageId: backImgId,
 detailImage: detailUrl,
 };
 }).filter(item => item.image); // Só incluir se tiver imagem
 }

 // Construir pose prompt
 let posePromptFinal: string | undefined;
 if (poseMode === 'custom' && customPosePrompt.trim()) {
 posePromptFinal = customPosePrompt.trim();
 }

 // Determinar fundo
 let customBackgroundUrl: string | undefined;
 let customBackgroundBase64: string | undefined;
 let backgroundPromptFinal: string | undefined;
 let solidColorFinal: string | undefined;
 let sceneHintFinal: string | undefined;

 if (backgroundType === 'custom') {
 if (backgroundMode === 'prompt' && backgroundPrompt.trim()) {
 // Fundo por prompt - usar o prompt como sceneHint
 backgroundPromptFinal = backgroundPrompt.trim();
 sceneHintFinal = `scene: ${backgroundPrompt.trim()}, model standing naturally on the ground`;
 } else if (backgroundMode === 'preset' && selectedPreset === 'solid-color') {
 // Cor sólida
 solidColorFinal = solidColor;
 sceneHintFinal = `solid ${solidColor} colored background, professional studio lighting, model standing on matching colored floor`;
 } else if (backgroundMode === 'saved' && selectedPreset) {
 // Fundo salvo
 const savedBg = savedBackgrounds.find(b => b.id === selectedPreset);
 if (savedBg) {
 if (savedBg.color) {
 solidColorFinal = savedBg.color;
 sceneHintFinal = `solid ${savedBg.color} colored background, model standing on floor`;
 } else if (savedBg.prompt) {
 backgroundPromptFinal = savedBg.prompt;
 sceneHintFinal = `scene: ${savedBg.prompt}, model standing naturally on the ground`;
 } else if (savedBg.base64) {
 customBackgroundBase64 = savedBg.base64;
 } else if (savedBg.url) {
 customBackgroundUrl = savedBg.url;
 }
 }
 } else if (customBackground) {
 // Upload base64
 customBackgroundBase64 = customBackground;
 } else if (selectedPreset) {
 // Preset URL - pegar sceneHint do preset
 const preset = PRESET_BACKGROUNDS.find(b => b.id === selectedPreset);
 customBackgroundUrl = preset?.url;
 sceneHintFinal = preset?.sceneHint;
 }
 }

 setProgress(5);

 // Salvar estado para sobreviver ao F5
 const lookItemsForStorage: PendingGenerationLookItem[] = lookItems
 ? lookItems.map(item => ({
 name: item.name || item.slot,
 image: item.image,
 slot: item.slot,
 }))
 : [];
 const mainProductImage = getOptimizedProductImage(product);
 const modelThumb = selectedModel?.images?.front || selectedModel?.referenceImageUrl;

 savePendingGeneration({
 oderId: `gen_${Date.now()}`,
 productId: product.id,
 productName: product.name,
 productThumbnail: mainProductImage,
 startTime: Date.now(),
 viewsMode: viewsMode,
 lookItems: lookItemsForStorage,
 modelThumbnail: modelThumb,
 });

 // ═══════════════════════════════════════════════════════════════
 // GERAÇÃO DE IMAGEM DE FRENTE
 // ═══════════════════════════════════════════════════════════════
 // Determinar range de progresso baseado no modo
 const isFrontBack = viewsMode === 'front-back';
 const frontProgressMax = isFrontBack ? 48 : 95; // Se front-back, frente vai até 48%, senão até 95%

 const resultFront = await generateModeloIA({
 productId: product.id,
 userId: userId,
 imageId: imageId,
 imageUrl: imageUrl,
 detailImageUrl: mainDetailImageUrl,
 modelPrompt: modelPrompt,
 clothingPrompt: clothingPrompt,
 posePrompt: posePromptFinal,
 referenceImage: selectedModel?.images?.front || selectedModel?.referenceImageUrl,
 productCategory: product.category || 'Roupas',
 productDescription: product.description || product.name,
 productAttributes: product.attributes || {}, // Atributos do produto (caimento, comprimento, etc)
 lookItems: lookItems,
 backgroundType: backgroundType,
 customBackgroundUrl: customBackgroundUrl,
 customBackgroundBase64: customBackgroundBase64,
 backgroundPrompt: backgroundPromptFinal,
 solidColor: solidColorFinal,
 sceneHint: sceneHintFinal,
 modelDetails: selectedModel ? (
 selectedModel.modelType === 'real'
 ? 'Use the reference image as the exact person. Preserve face, body shape, and all physical features exactly as shown in the reference photo.'
 : [
 `${selectedModel.hairColor || ''} hair, ${selectedModel.hairStyle || ''}, ${selectedModel.expression || ''} expression`,
 selectedModel.physicalNotes ? `Physical: ${selectedModel.physicalNotes}` : '',
 selectedModel.hairNotes ? `Face & Hair: ${selectedModel.hairNotes}` : '',
 selectedModel.skinNotes ? `Skin: ${selectedModel.skinNotes}` : '',
 ].filter(Boolean).join('. ')
 ) : '',
 viewsMode: 'front', // Sempre 'front' na primeira chamada
 framing: framing, // Enquadramento selecionado pelo usuário
 // Resolução da imagem (2k ou 4k)
 resolution,
 // Callback de progresso para atualizar a barra
 onProgress: (p) => {
 // Mapear progresso 10-95 para 5-frontProgressMax
 const mapped = 5 + ((p - 10) / 85) * (frontProgressMax - 5);
 setProgress(Math.round(mapped));
 },
 });

 if (!resultFront.success || !resultFront.generation?.image_url) {
 throw new Error(resultFront.error || resultFront.message || 'Erro ao gerar imagem de frente');
 }

 let frontImageUrl = resultFront.generation.image_url;
 let frontGenerationId = resultFront.generation.id;
 let backImageUrlResult: string | undefined;

 // ═══════════════════════════════════════════════════════════════
 // GERAÇÃO DE IMAGEM DE COSTAS (se viewsMode === 'front-back')
 // ═══════════════════════════════════════════════════════════════
 if (viewsMode === 'front-back') {
 setProgress(50);
 const setText = onSetLoadingText || setLocalLoadingText;
 setText('Agora gerando a imagem de costas...');

 // Usar imagem de costas do modelo como referência (se existir)
 const modelBackReference = selectedModel?.images?.back || selectedModel?.images?.front || selectedModel?.referenceImageUrl;

 const resultBack = await generateModeloIA({
 productId: product.id,
 userId: userId,
 imageId: backImageId, // Usar imagem de costas do produto principal
 imageUrl: backImageUrl,
 detailImageUrl: mainDetailImageUrl,
 modelPrompt: modelPrompt,
 clothingPrompt: clothingPrompt ? clothingPrompt + ' (back view, from behind)' : undefined,
 posePrompt: posePromptFinal ? posePromptFinal + ', back view, from behind' : undefined,
 referenceImage: modelBackReference, // Usar imagem de COSTAS do modelo
 productCategory: product.category || 'Roupas',
 productDescription: (product.description || product.name) + ' - vista de costas',
 productAttributes: product.attributes || {}, // Atributos do produto (caimento, comprimento, etc)
 lookItems: lookItemsBack, // Usar imagens de costas do look
 backgroundType: backgroundType,
 customBackgroundUrl: customBackgroundUrl,
 customBackgroundBase64: customBackgroundBase64,
 backgroundPrompt: backgroundPromptFinal,
 solidColor: solidColorFinal,
 sceneHint: sceneHintFinal,
 modelDetails: selectedModel ? (
 selectedModel.modelType === 'real'
 ? 'Use the reference image as the exact person. Preserve face, body shape, and all physical features exactly as shown in the reference photo. Back view, from behind.'
 : [
 `${selectedModel.hairColor || ''} hair, ${selectedModel.hairStyle || ''}, ${selectedModel.expression || ''} expression, back view, from behind`,
 selectedModel.physicalNotes ? `Physical: ${selectedModel.physicalNotes}` : '',
 selectedModel.hairNotes ? `Face & Hair: ${selectedModel.hairNotes}` : '',
 selectedModel.skinNotes ? `Skin: ${selectedModel.skinNotes}` : '',
 ].filter(Boolean).join('. ')
 ) : 'back view, from behind',
 viewsMode: 'front', // O workflow trata como 'front' mas usa as imagens de costas
 framing: framing, // Mesmo enquadramento da frente
 // Indicar que é imagem de costas para o n8n fazer UPDATE ao invés de INSERT
 isBackView: true,
 frontGenerationId: frontGenerationId,
 // Resolução da imagem (2k ou 4k)
 resolution,
 // Callback de progresso para atualizar a barra (50% a 95%)
 onProgress: (p) => {
 // Mapear progresso 10-95 para 50-95
 const mapped = 50 + ((p - 10) / 85) * 45;
 setProgress(Math.round(mapped));
 },
 });

 if (resultBack.success && resultBack.generation?.image_url) {
 backImageUrlResult = resultBack.generation.image_url;
 }
 // Se falhar, continua sem a imagem de costas
 }

 setProgress(90);

 // Salvar a imagem gerada no produto (formato GeneratedImageSet)
 const newModeloIAImage: import('../../types').GeneratedImageSet = {
 id: frontGenerationId,
 createdAt: new Date().toISOString(),
 tool: 'lifestyle',
 images: {
 front: frontImageUrl,
 back: backImageUrlResult
 },
 metadata: {
 prompt: lookMode === 'describe' ? clothingPrompt : undefined,
 orientation: 'vertical',
 lookItems: lookItems, // Salvar os itens do look para análises futuras
 viewsMode: viewsMode, // Salvar o modo de ângulos
 modelId: selectedModel?.id,
 modelName: selectedModel?.name,
 modelThumbnail: selectedModel?.images?.front || selectedModel?.referenceImageUrl
 }
 };

 // Persistir imagem gerada na tabela product_images (Supabase)
 const metadata = {
 prompt: lookMode === 'describe' ? clothingPrompt : undefined,
 orientation: 'vertical',
 lookItems: lookItems,
 viewsMode: viewsMode,
 modelId: selectedModel?.id,
 modelName: selectedModel?.name,
 modelThumbnail: selectedModel?.images?.front || selectedModel?.referenceImageUrl,
 backImageUrl: backImageUrlResult || undefined
 };

 if (userId) {
 const { error: insertFrontError } = await supabase
 .from('product_images')
 .insert({
 product_id: product.id,
 user_id: userId,
 type: 'modelo_ia',
 angle: 'front',
 url: frontImageUrl,
 file_name: `look_composer_front_${frontGenerationId}.png`,
 storage_path: `generated/look_composer_front_${frontGenerationId}.png`,
 mime_type: 'image/png',
 is_primary: false,
 generation_id: frontGenerationId,
 metadata: JSON.stringify(metadata)
 });

 if (insertFrontError) {
 console.error('Erro ao salvar imagem front no banco:', insertFrontError);
 }

 if (backImageUrlResult) {
 const { error: insertBackError } = await supabase
 .from('product_images')
 .insert({
 product_id: product.id,
 user_id: userId,
 type: 'modelo_ia',
 angle: 'back',
 url: backImageUrlResult,
 file_name: `look_composer_back_${frontGenerationId}.png`,
 storage_path: `generated/look_composer_back_${frontGenerationId}.png`,
 mime_type: 'image/png',
 is_primary: false,
 generation_id: frontGenerationId,
 metadata: JSON.stringify(metadata)
 });

 if (insertBackError) {
 console.error('Erro ao salvar imagem back no banco:', insertBackError);
 }
 }
 }

 const currentGenerated = product.generatedImages || {
 studioReady: [],
 cenarioCriativo: [],
 modeloIA: [],
 productStudio: []
 };

 onUpdateProduct(product.id, {
 generatedImages: {
 ...currentGenerated,
 modeloIA: [...(currentGenerated.modeloIA || []), newModeloIAImage]
 }
 });

 // Créditos debitados pelo workflow N8N (não debitar no frontend para evitar débito duplo)

 // Log de sucesso
 if (onAddHistoryLog) {
 const viewsLabel = viewsMode === 'front-back' ? ' (frente e costas)' : '';
 onAddHistoryLog(
 'Look Composer',
 `Look gerado para "${product.name}"${viewsLabel}`,
 'success',
 [product],
 'ai',
 creditsNeeded,
 frontImageUrl
 );
 }

 setProgress(100);

 // Limpar estado pendente - geração concluída com sucesso
 clearPendingGeneration();
 if (product) addCompletedProduct('look-composer', product.id);

 // Marcar como notificado para não duplicar toast no startup check
 if (userId && frontGenerationId) {
 const notifiedKey = `vizzu_bg_notified_${userId}`;
 const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
 notified.push(`lc-${frontGenerationId}`);
 localStorage.setItem(notifiedKey, JSON.stringify(notified.slice(-200)));
 }

 // Mostrar tela de resultado
 setGeneratedImageUrl(frontImageUrl);
 setGeneratedBackImageUrl(backImageUrlResult || null);
 setGenerationId(frontGenerationId);

 // Aguardar um pouco e mostrar o resultado
 setTimeout(() => {
 const setGenerating = onSetGenerating || setLocalIsGenerating;
 setGenerating(false);
 setShowResult(true);
 }, 500);

 return; // Não executar o finally ainda

 } catch (error) {
 // Se foi interrupção de rede (F5/fechamento), manter pending key — a geração pode estar rodando no servidor
 const msg = error instanceof Error ? error.message : '';
 const isNetworkAbort = msg.includes('Failed to fetch') || msg.includes('Load failed') || msg.includes('NetworkError') || msg.includes('AbortError');

 if (isNetworkAbort) {
 keepPendingOnError = true;
 console.warn('Geração interrompida por rede — pending mantido para polling');
 } else {
 console.error('Erro ao gerar:', error);
 clearPendingGeneration();
 if (onAddHistoryLog) {
 onAddHistoryLog(
 'Look Composer',
 `Erro ao gerar look para "${product.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
 'error',
 [product],
 'ai',
 0
 );
 }
 showToast(`Erro ao gerar look: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
 }
 } finally {
 const setGenerating = onSetGenerating || setLocalIsGenerating;
 const setProgress = onSetProgress || setLocalProgress;
 setGenerating(false);
 setProgress(0);
 if (!keepPendingOnError) clearPendingGeneration();
 // Limpar estados restaurados (F5)
 setRestoredLookItems([]);
 setRestoredProductThumbnail(null);
 setRestoredModelThumbnail(null);
 setGenerationStartTime(null);
 setTimerStep(0);
 if (onSetMinimized) onSetMinimized(false);
 }
 };

 // Renderizar conteúdo da fase atual
 const renderStepContent = () => {
 switch (currentStep) {
 case 'product':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-shirt text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Peça Principal</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Confirme o produto selecionado</p>
 </div>
 </div>

 {/* Info do produto */}
 <div className={(isDark ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4'}>
 <div className="flex items-center gap-3">
 <div className="flex gap-2 flex-shrink-0">
 {productImages.map((img, idx) => (
 <div
 key={idx}
 className={`w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
 currentImageIndex === idx
 ? (isDark ? 'border-[#FF6B6B]' : 'border-[#FF6B6B]/50')
 : 'border-transparent'
 }`}
 onClick={() => setCurrentImageIndex(idx)}
 title={img.type}
 >
 <OptimizedImage src={img.url} alt={img.type} className="w-full h-full p-1" size="thumb" objectFit="contain" />
 </div>
 ))}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm truncate'}>{product.name}</p>
 {product.originalImages?.back?.url ? (
 <span className="bg-green-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0" title="Frente + Costas">F|B</span>
 ) : (
 <span className="bg-neutral-500/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0" title="Só frente">F</span>
 )}
 </div>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>{product.sku}</p>
 {product.category && (
 <span className={(isDark ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-200 text-gray-600') + ' px-2 py-0.5 rounded text-[10px] mt-1 inline-block'}>{product.category}</span>
 )}
 </div>
 </div>
 </div>

 <div className={(isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200') + ' rounded-xl p-3 border'}>
 <p className={(isDark ? 'text-green-400' : 'text-green-600') + ' text-xs'}>
 <i className="fas fa-check-circle mr-2"></i>
 Produto confirmado! Avance para selecionar o modelo.
 </p>
 </div>
 </div>
 );

 case 'model':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-user text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Modelo IA</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha um modelo salvo ou crie um novo</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex gap-1">
 <button
 onClick={() => setModelTab('generated')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modelTab === 'generated' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 <i className="fas fa-wand-magic-sparkles mr-1"></i>Gerados ({generatedModels.length})
 </button>
 <button
 onClick={() => setModelTab('presets')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modelTab === 'presets' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 <i className="fas fa-users mr-1"></i>Pré-definidos ({presetModels.length})
 </button>
 <button
 onClick={() => setModelTab('create')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modelTab === 'create' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 <i className="fas fa-plus mr-1"></i>Criar Novo
 </button>
 </div>

 {modelTab === 'generated' ? (
 <div className="space-y-3">
 {generatedModels.length > 0 ? (
 <div className="grid grid-cols-3 gap-2">
 {generatedModels.map(model => (
 <div
 key={model.id}
 onClick={() => setSelectedModelId(model.id)}
 className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedModelId === model.id ? 'border-[#FF6B6B] ring-2 ring-[#FF6B6B]/30' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}
 >
 {(model.images?.front || model.referenceImageUrl) ? (
 <OptimizedImage src={model.images?.front || model.referenceImageUrl || ''} alt={model.name} className="w-full aspect-square" size="thumb" />
 ) : (
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full aspect-square flex items-center justify-center'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user text-2xl'}></i>
 </div>
 )}
 <div className={(isDark ? 'bg-black/70' : 'bg-white/90') + ' absolute inset-x-0 bottom-0 p-2'}>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{model.name}</p>
 </div>
 {selectedModelId === model.id && (
 <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B6B]/100 rounded-full flex items-center justify-center">
 <i className="fas fa-check text-white text-[8px]"></i>
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl p-6 text-center'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user-slash text-3xl mb-3'}></i>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm mb-2'}>Nenhum modelo gerado</p>
 <button
 onClick={() => setModelTab('create')}
 className="text-[#FF6B6B] text-xs font-medium hover:underline"
 >
 Criar primeiro modelo
 </button>
 </div>
 )}
 </div>
 ) : modelTab === 'presets' ? (
 <div className="space-y-3">
 <div className="grid grid-cols-3 gap-2">
 {presetModels.map(model => (
 <div
 key={model.id}
 onClick={() => setSelectedModelId(model.id)}
 className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedModelId === model.id ? 'border-[#FF6B6B] ring-2 ring-[#FF6B6B]/30' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}
 >
 {(model.images?.front || model.referenceImageUrl) ? (
 <OptimizedImage src={model.images?.front || model.referenceImageUrl || ''} alt={model.name} className="w-full aspect-square" size="thumb" />
 ) : (
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full aspect-square flex items-center justify-center'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-user text-2xl'}></i>
 </div>
 )}
 <div className={(isDark ? 'bg-black/70' : 'bg-white/90') + ' absolute inset-x-0 bottom-0 p-2'}>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{model.name}</p>
 </div>
 {selectedModelId === model.id && (
 <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B6B]/100 rounded-full flex items-center justify-center">
 <i className="fas fa-check text-white text-[8px]"></i>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 {generatedModels.length >= modelLimit ? (
 // Limite atingido
 <div className={(isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') + ' rounded-xl p-4 border'}>
 <div className="flex items-start gap-3">
 <div className={(isDark ? 'bg-amber-500/20' : 'bg-amber-100') + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' fas fa-exclamation-triangle'}></i>
 </div>
 <div>
 <h4 className={(isDark ? 'text-amber-400' : 'text-amber-700') + ' font-semibold text-sm mb-1'}>Limite de modelos atingido</h4>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs leading-relaxed'}>
 Você já possui {generatedModels.length}/{modelLimit} modelo{modelLimit > 1 ? 's' : ''} criado{modelLimit > 1 ? 's' : ''}.
 Para criar um novo, acesse a área de <strong>Modelos</strong> e exclua um existente.
 </p>
 </div>
 </div>
 </div>
 ) : (
 // Pode criar
 <>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs'}>
 Clique no botão abaixo para criar um novo modelo personalizado com a IA.
 </p>
 <button
 onClick={onOpenCreateModel}
 disabled={!onOpenCreateModel}
 className={'w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white rounded-xl font-medium text-sm transition-opacity ' + (onOpenCreateModel ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed')}
 >
 <i className="fas fa-wand-magic-sparkles mr-2"></i>Criar Novo Modelo
 </button>
 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] text-center'}>
 {generatedModels.length}/{modelLimit} modelos criados
 </p>
 </>
 )}
 </div>
 )}
 </div>
 );

 case 'look':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-layer-group text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Monte o Look</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha suas peças ou descreva genericamente</p>
 </div>
 </div>

 {/* Tabs - Suas Peças primeiro */}
 <div className="flex gap-1">
 <button
 onClick={() => setLookMode('composer')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lookMode === 'composer' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 Suas Peças
 </button>
 <button
 onClick={() => setLookMode('describe')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${lookMode === 'describe' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 Composição Genérica
 </button>
 </div>

 {lookMode === 'composer' ? (
 <div className="space-y-3">
 <StudioLookComposer
 products={products}
 composition={lookComposition}
 onChange={setLookComposition}
 theme={theme}
 lockedSlots={lockedSlots}
 lockedMessage="Peça principal"
 />
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-400') + ' text-[10px] text-center'}>
 <i className="fas fa-info-circle mr-1"></i>
 Slots vazios serão preenchidos com roupas genéricas pela IA
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Parte de cima</label>
 <input
 type="text"
 value={describedLook.top}
 onChange={(e) => setDescribedLook(prev => ({ ...prev, top: e.target.value }))}
 placeholder="Ex: camiseta branca básica"
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Parte de baixo</label>
 <input
 type="text"
 value={describedLook.bottom}
 onChange={(e) => setDescribedLook(prev => ({ ...prev, bottom: e.target.value }))}
 placeholder="Ex: calça jeans skinny azul"
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Calçados</label>
 <input
 type="text"
 value={describedLook.shoes}
 onChange={(e) => setDescribedLook(prev => ({ ...prev, shoes: e.target.value }))}
 placeholder="Ex: tênis branco"
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>Acessórios (opcional)</label>
 <input
 type="text"
 value={describedLook.accessories}
 onChange={(e) => setDescribedLook(prev => ({ ...prev, accessories: e.target.value }))}
 placeholder="Ex: relógio prata, óculos escuros"
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm'}
 />
 </div>
 </div>
 )}
 </div>
 );

 case 'pose':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-person-walking text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Pose do Modelo</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha pose padrão ou descreva a pose desejada</p>
 </div>
 </div>

 {/* Opções de Pose */}
 <div className="space-y-3">
 {/* Pose Padrão */}
 <div
 onClick={() => setPoseMode('default')}
 className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${poseMode === 'default' ? 'border-[#FF6B6B] ' + (isDark ? 'bg-[#FF6B6B]/10' : 'bg-[#FF6B6B]/10') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
 >
 <div className="flex items-center gap-3">
 <div className={(poseMode === 'default' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
 <i className="fas fa-person"></i>
 </div>
 <div className="flex-1">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Pose Padrão</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Pose natural de catálogo, em pé de frente</p>
 </div>
 {poseMode === 'default' && (
 <i className="fas fa-check-circle text-[#FF6B6B]"></i>
 )}
 </div>
 </div>

 {/* Pose Personalizada */}
 <div
 onClick={() => setPoseMode('custom')}
 className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${poseMode === 'custom' ? 'border-[#FF6B6B] ' + (isDark ? 'bg-[#FF6B6B]/10' : 'bg-[#FF6B6B]/10') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
 >
 <div className="flex items-center gap-3">
 <div className={(poseMode === 'custom' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
 <i className="fas fa-pen-fancy"></i>
 </div>
 <div className="flex-1">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Descrever Pose</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escreva um prompt descrevendo a pose desejada</p>
 </div>
 {poseMode === 'custom' && (
 <i className="fas fa-check-circle text-[#FF6B6B]"></i>
 )}
 </div>
 </div>
 </div>

 {/* Campo de prompt customizado */}
 {poseMode === 'custom' && (
 <div className="space-y-3">
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>
 Descreva a pose
 </label>
 <textarea
 value={customPosePrompt}
 onChange={(e) => setCustomPosePrompt(e.target.value)}
 placeholder="Ex: modelo sentada em uma cadeira com as pernas cruzadas, olhando para o lado"
 maxLength={200}
 rows={3}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
 />
 <div className="flex justify-between mt-1">
 <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>
 {customPosePrompt.length}/200 caracteres
 </span>
 </div>
 </div>

 {/* Boas práticas */}
 <div className={(isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') + ' rounded-xl p-3 border'}>
 <div className="flex items-start gap-2">
 <i className={(isDark ? 'text-blue-400' : 'text-blue-600') + ' fas fa-lightbulb text-sm mt-0.5'}></i>
 <div>
 <p className={(isDark ? 'text-blue-400' : 'text-blue-700') + ' font-medium text-xs mb-1'}>Boas práticas</p>
 <ul className={(isDark ? 'text-blue-300/80' : 'text-blue-600') + ' text-[10px] space-y-1'}>
 <li>• Seja objetivo e direto na descrição</li>
 <li>• Evite prompts muito longos ou complexos</li>
 <li>• Descreva uma única pose clara</li>
 <li>• Evite poses muito elaboradas ou impossíveis</li>
 <li>• Use referências simples (sentada, andando, apoiada)</li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );

 case 'background':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-image text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Escolha o Fundo</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Estúdio, preset, upload ou descreva</p>
 </div>
 </div>

 {/* Tabs - Estúdio / Personalizado */}
 <div className="flex gap-1">
 <button
 onClick={() => setBackgroundType('studio')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${backgroundType === 'studio' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 <i className="fas fa-store mr-1"></i>Estúdio
 </button>
 <button
 onClick={() => setBackgroundType('custom')}
 className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${backgroundType === 'custom' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-gray-200 text-gray-600'}`}
 >
 <i className="fas fa-image mr-1"></i>Personalizado
 </button>
 </div>

 {backgroundType === 'studio' ? (
 <div className={(isDark ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-4'}>
 <div className="flex items-center gap-3">
 <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
 <i className="fas fa-camera text-gray-500 text-xl"></i>
 </div>
 <div>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Fundo Estúdio Cinza</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Fundo neutro profissional, ideal para e-commerce e catálogos</p>
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {/* Sub-tabs para modo de fundo personalizado */}
 <div className="flex gap-1">
 <button
 onClick={() => setBackgroundMode('preset')}
 className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${backgroundMode === 'preset' ? (isDark ? 'bg-neutral-700 text-white hc-selected' : 'bg-gray-300 text-gray-900') : isDark ? 'bg-neutral-800/50 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
 >
 <i className="fas fa-images mr-1"></i>Presets
 </button>
 <button
 onClick={() => setBackgroundMode('upload')}
 className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${backgroundMode === 'upload' ? (isDark ? 'bg-neutral-700 text-white hc-selected' : 'bg-gray-300 text-gray-900') : isDark ? 'bg-neutral-800/50 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
 >
 <i className="fas fa-upload mr-1"></i>Upload
 </button>
 <button
 onClick={() => setBackgroundMode('prompt')}
 className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${backgroundMode === 'prompt' ? (isDark ? 'bg-neutral-700 text-white hc-selected' : 'bg-gray-300 text-gray-900') : isDark ? 'bg-neutral-800/50 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
 >
 <i className="fas fa-pen mr-1"></i>Prompt
 </button>
 <button
 onClick={() => setBackgroundMode('saved')}
 className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${backgroundMode === 'saved' ? (isDark ? 'bg-neutral-700 text-white hc-selected' : 'bg-gray-300 text-gray-900') : isDark ? 'bg-neutral-800/50 text-neutral-400' : 'bg-gray-100 text-gray-500'}`}
 >
 <i className="fas fa-bookmark mr-1"></i>Salvos
 </button>
 </div>

 {/* Conteúdo baseado no modo */}
 {backgroundMode === 'preset' && (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-2">
 {PRESET_BACKGROUNDS.map(bg => (
 <div
 key={bg.id}
 onClick={() => { setSelectedPreset(bg.id); setCustomBackground(null); }}
 className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedPreset === bg.id ? 'border-[#FF6B6B] ring-2 ring-[#FF6B6B]/30' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}
 >
 {bg.id === 'solid-color' ? (
 <div
 className="w-full h-20 flex items-center justify-center"
 style={{ backgroundColor: solidColor }}
 >
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-palette text-2xl'} style={{ color: solidColor === '#ffffff' ? '#9ca3af' : '#ffffff' }}></i>
 </div>
 ) : (
 <OptimizedImage src={bg.url} alt={bg.name} className="w-full h-20" size="thumb" />
 )}
 <div className={(isDark ? 'bg-black/70' : 'bg-white/90') + ' absolute inset-x-0 bottom-0 py-1.5 px-2 flex items-center gap-1.5'}>
 <i className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' fas ' + (bg.icon || 'fa-image') + ' text-[10px]'}></i>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium'}>{bg.name}</p>
 </div>
 {selectedPreset === bg.id && (
 <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B6B]/100 rounded-full flex items-center justify-center">
 <i className="fas fa-check text-white text-[8px]"></i>
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Color picker quando Cor Sólida selecionada */}
 {selectedPreset === 'solid-color' && (
 <div className={(isDark ? 'bg-neutral-800/50' : 'bg-gray-50') + ' rounded-xl p-3'}>
 <label className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' block text-[10px] font-medium uppercase tracking-wide mb-2'}>
 Escolha a cor
 </label>
 <div className="flex items-center gap-3">
 <input
 type="color"
 value={solidColor}
 onChange={(e) => setSolidColor(e.target.value)}
 className="w-12 h-10 rounded-lg border-0 cursor-pointer"
 />
 <input
 type="text"
 value={solidColor}
 onChange={(e) => setSolidColor(e.target.value)}
 placeholder="#ffffff"
 className={(isDark ? 'bg-neutral-700 border-neutral-600 text-white' : 'bg-white border-gray-300 text-gray-900') + ' flex-1 px-3 py-2 border rounded-lg text-sm font-mono uppercase'}
 />
 </div>
 {/* Cores rápidas */}
 <div className="flex gap-1.5 mt-2">
 {['#ffffff', '#f3f4f6', '#e5e7eb', '#fce7f3', '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#1f2937', '#000000'].map(color => (
 <button
 key={color}
 onClick={() => setSolidColor(color)}
 className={'w-6 h-6 rounded-full border-2 transition-all ' + (solidColor === color ? 'border-[#FF6B6B] scale-110' : isDark ? 'border-neutral-600' : 'border-gray-300')}
 style={{ backgroundColor: color }}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {backgroundMode === 'upload' && (
 <div className="space-y-3">
 <div
 onClick={() => setShowBackgroundSourcePicker(true)}
 onDragOver={handleBackgroundDragOver}
 onDrop={handleBackgroundDrop}
 className={`block w-full py-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDark ? 'border-neutral-700 hover:border-[#FF6B6B]/50' : 'border-gray-300 hover:border-[#FF6B6B]/50'}`}
 >
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-cloud-upload-alt text-3xl mb-2'}></i>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm font-medium'}>Clique para enviar</p>
 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px] mt-1'}>Imagem de fundo sem pessoas</p>
 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[9px] mt-1 opacity-60'}>ou arraste aqui</p>
 </div>

 {customBackground && (
 <div className="relative rounded-xl overflow-hidden border-2 border-[#FF6B6B]">
 <img src={customBackground} alt="Fundo personalizado" className="w-full h-32 object-cover" />
 <button
 onClick={() => setCustomBackground(null)}
 className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
 >
 <i className="fas fa-times text-sm"></i>
 </button>
 </div>
 )}
 </div>
 )}

 {backgroundMode === 'prompt' && (
 <div className="space-y-3">
 <div>
 <label className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' block text-[10px] font-medium uppercase tracking-wide mb-1'}>
 Descreva o fundo desejado
 </label>
 <textarea
 value={backgroundPrompt}
 onChange={(e) => setBackgroundPrompt(e.target.value)}
 placeholder="Ex: praia tropical com palmeiras ao pôr do sol, areia branca..."
 maxLength={300}
 rows={3}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-3 py-2 border rounded-lg text-sm resize-none'}
 />
 <div className="flex justify-between mt-1">
 <span className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>
 {backgroundPrompt.length}/300 caracteres
 </span>
 </div>
 </div>

 <div className={(isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200') + ' rounded-xl p-3 border'}>
 <div className="flex items-start gap-2">
 <i className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' fas fa-info-circle text-sm mt-0.5'}></i>
 <p className={(isDark ? 'text-amber-300/80' : 'text-amber-700') + ' text-[10px]'}>
 Descreva um cenário simples e claro. A IA irá gerar o fundo baseado na descrição.
 </p>
 </div>
 </div>
 </div>
 )}

 {backgroundMode === 'saved' && (
 <div className="space-y-3">
 {savedBackgrounds.length > 0 ? (
 <div className="grid grid-cols-2 gap-2">
 {savedBackgrounds.map(bg => (
 <div
 key={bg.id}
 onClick={() => { setSelectedPreset(bg.id); setCustomBackground(null); }}
 className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${selectedPreset === bg.id ? 'border-[#FF6B6B] ring-2 ring-[#FF6B6B]/30' : isDark ? 'border-neutral-700 hover:border-neutral-600' : 'border-gray-200 hover:border-gray-300'}`}
 >
 {bg.color ? (
 <div className="w-full h-20" style={{ backgroundColor: bg.color }}></div>
 ) : bg.base64 ? (
 <img src={bg.base64} alt={bg.name} className="w-full h-20 object-cover" />
 ) : bg.url ? (
 <OptimizedImage src={bg.url} alt={bg.name} className="w-full h-20" size="thumb" />
 ) : (
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' w-full h-20 flex items-center justify-center'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-pen text-xl'}></i>
 </div>
 )}
 <div className={(isDark ? 'bg-black/70' : 'bg-white/90') + ' absolute inset-x-0 bottom-0 py-1.5 px-2'}>
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' text-[10px] font-medium truncate'}>{bg.name}</p>
 </div>
 {selectedPreset === bg.id && (
 <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B6B]/100 rounded-full flex items-center justify-center">
 <i className="fas fa-check text-white text-[8px]"></i>
 </div>
 )}
 {/* Botão de deletar */}
 <button
 onClick={(e) => { e.stopPropagation(); handleDeleteSavedBackground(bg.id); }}
 className="absolute top-2 left-2 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
 >
 <i className="fas fa-times text-[8px]"></i>
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl p-6 text-center'}>
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-bookmark text-3xl mb-3'}></i>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-sm mb-1'}>Nenhum fundo salvo</p>
 <p className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' text-[10px]'}>Salve seus fundos favoritos para reutilizar</p>
 </div>
 )}
 </div>
 )}

 {/* Botão Salvar Fundo (aparece quando tem algo selecionado) */}
 {(customBackground || selectedPreset || backgroundPrompt) && backgroundMode !== 'saved' && (
 <button
 onClick={() => setShowSaveBackgroundModal(true)}
 className={(isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200') + ' w-full py-2 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-2'}
 >
 <i className="fas fa-bookmark"></i>
 Salvar este fundo
 </button>
 )}
 </div>
 )}
 </div>
 );

 case 'views':
 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <div className={(isDark ? 'bg-[#FF6B6B]/20' : 'bg-[#FF6B6B]/15') + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-[#FF6B6B]' : 'text-[#FF6B6B]') + ' fas fa-clone text-sm'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Ângulos do Look</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Escolha se quer gerar só frente ou frente e costas</p>
 </div>
 </div>

 <div className="space-y-2">
 {/* Só Frente */}
 <div
 onClick={() => setViewsMode('front')}
 className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${viewsMode === 'front' ? 'border-[#FF6B6B] ' + (isDark ? 'bg-[#FF6B6B]/10' : 'bg-[#FF6B6B]/10') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
 >
 <div className="flex items-center gap-3">
 <div className={(viewsMode === 'front' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
 <i className="fas fa-image"></i>
 </div>
 <div className="flex-1">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Só Frente</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Gera uma imagem frontal do look</p>
 </div>
 {viewsMode === 'front' && (
 <i className="fas fa-check-circle text-[#FF6B6B]"></i>
 )}
 </div>
 </div>

 {/* Frente e Costas */}
 <div
 onClick={() => setViewsMode('front-back')}
 className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${viewsMode === 'front-back' ? 'border-[#FF6B6B] ' + (isDark ? 'bg-[#FF6B6B]/10' : 'bg-[#FF6B6B]/10') : isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-gray-200 bg-gray-50'}`}
 >
 <div className="flex items-center gap-3">
 <div className={(viewsMode === 'front-back' ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-10 h-10 rounded-lg flex items-center justify-center transition-colors'}>
 <i className="fas fa-clone"></i>
 </div>
 <div className="flex-1">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>Frente e Costas</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs'}>Gera duas imagens: vista frontal e traseira</p>
 </div>
 {viewsMode === 'front-back' && (
 <i className="fas fa-check-circle text-[#FF6B6B]"></i>
 )}
 </div>
 </div>
 </div>

 {/* Aviso se o modelo não tem foto de costas */}
 {viewsMode === 'front-back' && !modelHasBackImage && selectedModel && (
 <div className={(isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') + ' rounded-xl p-4 border'}>
 <div className="flex items-start gap-3">
 <div className={(isDark ? 'bg-amber-500/20' : 'bg-amber-100') + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' fas fa-user-slash'}></i>
 </div>
 <div className="flex-1">
 <h4 className={(isDark ? 'text-amber-400' : 'text-amber-700') + ' font-semibold text-sm mb-1'}>
 Modelo sem foto de costas
 </h4>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs leading-relaxed'}>
 O modelo <strong>{selectedModel.name}</strong> não possui imagem de referência de costas.
 A imagem de costas será gerada usando a referência frontal do modelo, o que pode afetar a consistência.
 </p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px] mt-2'}>
 Para melhores resultados, recrie o modelo para gerar a imagem de costas.
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Aviso se produtos não têm foto de costas — com upload inline */}
 {viewsMode === 'front-back' && productsWithoutBackImage.length > 0 && (
 <div className={(isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200') + ' rounded-xl p-4 border'}>
 <input
 type="file"
 ref={backImageInputRef}
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file && pendingUploadProductId) {
 handleUploadBackImage(file, pendingUploadProductId);
 }
 e.target.value = '';
 }}
 />
 <div className="flex items-start gap-3">
 <div className={(isDark ? 'bg-amber-500/20' : 'bg-amber-100') + ' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'}>
 <i className={(isDark ? 'text-amber-400' : 'text-amber-600') + ' fas fa-exclamation-triangle'}></i>
 </div>
 <div className="flex-1">
 <h4 className={(isDark ? 'text-amber-400' : 'text-amber-700') + ' font-semibold text-sm mb-1'}>
 {productsWithoutBackImage.length === 1 ? 'Produto sem foto de costas' : 'Produtos sem foto de costas'}
 </h4>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-600') + ' text-xs leading-relaxed mb-2'}>
 Adicione a foto de costas para gerar a imagem de costas:
 </p>
 <ul className={(isDark ? 'text-neutral-300' : 'text-gray-700') + ' text-xs space-y-2'}>
 {productsWithoutBackImage.map((p) => (
 <li key={p.id} className="flex items-center gap-2">
 {uploadingBackFor === p.id ? (
 <>
 <i className="fas fa-spinner fa-spin text-coral text-[10px]"></i>
 <span className="font-medium text-coral">Enviando...</span>
 </>
 ) : (
 <>
 <i className="fas fa-times-circle text-red-400 text-[10px]"></i>
 <span className="font-medium flex-1">{p.name}</span>
 <button
 onClick={() => {
 setPendingUploadProductId(p.id);
 backImageInputRef.current?.click();
 }}
 className={(isDark ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300' : 'bg-amber-100 hover:bg-amber-200 text-amber-700') + ' text-[10px] font-semibold px-2 py-1 rounded-md transition-colors'}
 >
 <i className="fas fa-upload mr-1"></i>Subir costas
 </button>
 </>
 )}
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 )}

 {/* Sucesso se todos têm foto de costas */}
 {viewsMode === 'front-back' && productsWithoutBackImage.length === 0 && modelHasBackImage && (
 <div className={(isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200') + ' rounded-xl p-3 border'}>
 <p className={(isDark ? 'text-green-400' : 'text-green-600') + ' text-xs'}>
 <i className="fas fa-check-circle mr-2"></i>
 Todos os produtos e o modelo têm foto de costas. Você pode gerar frente e costas!
 </p>
 </div>
 )}

 {/* Sucesso parcial - produtos ok mas modelo sem costas */}
 {viewsMode === 'front-back' && productsWithoutBackImage.length === 0 && !modelHasBackImage && selectedModel && (
 <div className={(isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200') + ' rounded-xl p-3 border'}>
 <p className={(isDark ? 'text-blue-400' : 'text-blue-600') + ' text-xs'}>
 <i className="fas fa-info-circle mr-2"></i>
 Produtos OK. A imagem de costas usará a referência frontal do modelo.
 </p>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════════════════ */}
 {/* SELETOR DE ENQUADRAMENTO */}
 {/* ═══════════════════════════════════════════════════════════════ */}
 <div className="mt-6">
 <div className="flex items-center gap-2 mb-3">
 <div className={(isDark ? 'bg-purple-500/20' : 'bg-purple-100') + ' w-7 h-7 rounded-lg flex items-center justify-center'}>
 <i className={(isDark ? 'text-purple-400' : 'text-purple-500') + ' fas fa-crop-simple text-xs'}></i>
 </div>
 <div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-semibold text-sm'}>Enquadramento</h3>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[10px]'}>Como a câmera enquadra o modelo</p>
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {FRAMING_OPTIONS.filter(opt => framingConfig.options.includes(opt.id)).map((opt) => (
 <div
 key={opt.id}
 onClick={() => setFraming(opt.id)}
 className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${framing === opt.id ? 'border-[#FF6B6B] ' + (isDark ? 'bg-[#FF6B6B]/10' : 'bg-[#FF6B6B]/10') : isDark ? 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
 >
 <div className="flex items-center gap-2">
 <div className={(framing === opt.id ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white' : isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500') + ' w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm'}>
 <i className={`fas ${opt.icon}`}></i>
 </div>
 <div className="flex-1 min-w-0">
 <p className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-xs'}>{opt.label}</p>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-[9px] leading-tight'}>{opt.description}</p>
 </div>
 {framing === opt.id && (
 <i className="fas fa-check-circle text-[#FF6B6B] text-sm flex-shrink-0"></i>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Seletor de Resolução */}
 <div className={(isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border mt-4'}>
 <ResolutionSelector
 resolution={resolution}
 onChange={handleResolutionChange}
 canUse4K={canUse4K}
 onUpgradeClick={handleUpgradeClick}
 theme={theme}
 disabled={isGenerating}
 />
 </div>

 {/* Resumo */}
 <div className={(isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200') + ' rounded-xl p-4 border mt-4'}>
 <h4 className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm mb-3'}>Resumo da Geração</h4>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Produto</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' truncate max-w-[140px]'}>{product.name}</span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Modelo</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>{selectedModel?.name || 'Novo modelo'}</span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Look</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>{lookMode === 'describe' ? 'Descrito' : 'Com suas peças'}</span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Pose</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>{poseMode === 'default' ? 'Padrão' : 'Personalizada'}</span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Fundo</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>
 {backgroundType === 'studio' ? 'Estúdio Cinza' :
 backgroundMode === 'prompt' ? 'Por prompt' :
 selectedPreset === 'solid-color' ? `Cor ${solidColor}` :
 selectedPreset ? (PRESET_BACKGROUNDS.find(b => b.id === selectedPreset)?.name || savedBackgrounds.find(b => b.id === selectedPreset)?.name) :
 'Personalizado'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Ângulos</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>{viewsMode === 'front' ? 'Só Frente' : 'Frente e Costas'}</span>
 </div>
 <div className="flex justify-between">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Resolução</span>
 <span className={(isDark ? 'text-white' : 'text-gray-900')}>{resolution.toUpperCase()}</span>
 </div>
 <div className={'h-px my-2 ' + (isDark ? 'bg-neutral-700' : 'bg-gray-200')}></div>
 <div className="flex justify-between font-medium">
 <span className={(isDark ? 'text-neutral-400' : 'text-gray-500')}>Créditos</span>
 <span className="text-[#FF6B6B]">{creditsNeeded}{resolution === '4k' ? ' (4K)' : ''}</span>
 </div>
 </div>
 </div>
 </div>
 );
 }
 };

 // ═══════════════════════════════════════════════════════════════
 // Se tem resultado para mostrar, renderiza página de resultado
 // ═══════════════════════════════════════════════════════════════
 if (showResult && generatedImageUrl && generationId) {
 return (
 <LookComposerResult
 product={product}
 generatedImageUrl={generatedImageUrl}
 generatedBackImageUrl={generatedBackImageUrl || undefined}
 generationId={generationId}
 lookMode={lookMode}
 lookComposition={lookComposition}
 describedLook={describedLook}
 selectedModel={selectedModel}
 backgroundType={backgroundType}
 creditsUsed={creditsNeeded}
 userCredits={userCredits}
 onSave={handleResultSave}
 onRegenerate={handleResultRegenerate}
 onDelete={handleResultDelete}
 onBack={handleResultBack}
 onNewLook={handleNewLook}
 theme={theme}
 editBalance={editBalance}
 onDeductEditCredits={onDeductEditCredits}
 onImageUpdated={(view, newUrl) => {
  if (view === 'front') setGeneratedImageUrl(newUrl);
  else setGeneratedBackImageUrl(newUrl);
 }}
 />
 );
 }

 return (
 <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? 'bg-black' : 'bg-gray-50')}>
 <div className="max-w-6xl mx-auto">

 {/* HEADER */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-3">
 <button
 onClick={onBack}
 className={(isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 ') + ' w-10 h-10 rounded-xl flex items-center justify-center transition-all'}
 >
 <i className="fas fa-arrow-left"></i>
 </button>
 <div>
 <h1 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-lg font-extrabold'}>Look Composer</h1>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-xs font-serif italic'}>{product.name}</p>
 </div>
 </div>
 <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg ' + (isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-gray-200 ')}>
 <i className="fas fa-coins text-[#FF6B6B] text-xs"></i>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' font-medium text-sm'}>{userCredits}</span>
 </div>
 </div>

 {/* STEPPER */}
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-4 mb-6'}>
 <div className="flex items-center justify-between">
 {STEPS.map((step, idx) => {
 const isActive = currentStep === step.id;
 const isPast = STEPS.findIndex(s => s.id === currentStep) > idx;
 const canClick = isPast || (idx === 0) || canProceed(STEPS[idx - 1].id);

 return (
 <React.Fragment key={step.id}>
 <button
 onClick={() => canClick && goToStep(step.id)}
 disabled={!canClick}
 className={`flex flex-col items-center gap-1.5 transition-all ${canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
 >
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white ' : isPast ? 'bg-green-500 text-white' : isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>
 {isPast ? <i className="fas fa-check"></i> : <i className={`fas ${step.icon}`}></i>}
 </div>
 <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF6B6B]' : isPast ? (isDark ? 'text-green-400' : 'text-green-600') : isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
 {step.label}
 </span>
 </button>
 {idx < STEPS.length - 1 && (
 <div className={`flex-1 h-0.5 mx-2 rounded-full ${isPast ? 'bg-green-500' : isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}></div>
 )}
 </React.Fragment>
 );
 })}
 </div>
 </div>

 {/* LAYOUT 2 COLUNAS */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

 {/* COLUNA ESQUERDA - Imagem/Preview */}
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border overflow-hidden'}>
 <div className={'relative flex items-center justify-center p-4 min-h-[350px] ' + (isDark ? 'bg-neutral-800/50' : 'bg-gray-100')}>
 {/* Mostrar fundo quando estiver no passo de fundo ou geração */}
 {currentStep === 'background' || currentStep === 'views' ? (
 backgroundType === 'studio' ? (
 // Fundo Estúdio Cinza
 <img
 src="/studio-bg-example.jpeg"
 alt="Fundo Estúdio Cinza"
 className="w-full h-full min-h-[300px] object-cover rounded-lg"
 />
 ) : customBackground ? (
 // Fundo personalizado (upload)
 <img
 src={customBackground}
 alt="Fundo personalizado"
 className="w-full h-full min-h-[300px] object-cover rounded-lg"
 />
 ) : selectedPreset ? (
 // Fundo pré-setado
 <img
 src={PRESET_BACKGROUNDS.find(b => b.id === selectedPreset)?.url}
 alt="Fundo selecionado"
 className="w-full h-full min-h-[300px] object-cover rounded-lg"
 />
 ) : (
 // Nenhum fundo selecionado ainda
 <div className="w-full h-full min-h-[300px] rounded-lg border-2 border-dashed border-neutral-600 flex items-center justify-center">
 <div className="text-center">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl mb-2'}></i>
 <p className={(isDark ? 'text-neutral-500' : 'text-gray-500') + ' text-sm'}>Selecione um fundo</p>
 </div>
 </div>
 )
 ) : productImages.length > 0 ? (
 <>
 <OptimizedImage
 src={productImages[currentImageIndex]?.url}
 alt={product.name}
 className="w-full h-full max-h-[400px] rounded-lg"
 size="preview"
 objectFit="contain"
 />
 {productImages.length > 1 && (
 <>
 <button
 onClick={() => setCurrentImageIndex(prev => prev === 0 ? productImages.length - 1 : prev - 1)}
 className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
 >
 <i className="fas fa-chevron-left"></i>
 </button>
 <button
 onClick={() => setCurrentImageIndex(prev => prev === productImages.length - 1 ? 0 : prev + 1)}
 className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
 >
 <i className="fas fa-chevron-right"></i>
 </button>
 </>
 )}
 </>
 ) : (
 <div className="w-full h-64 flex items-center justify-center">
 <i className={(isDark ? 'text-neutral-600' : 'text-gray-400') + ' fas fa-image text-4xl'}></i>
 </div>
 )}
 </div>
 </div>

 {/* COLUNA DIREITA - Conteúdo da fase */}
 <div className="space-y-4">
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 ') + ' rounded-xl border p-5'}>
 {renderStepContent()}
 </div>

 {/* Navegação */}
 <div className="flex gap-3">
 {currentStep !== 'product' && (
 <button
 onClick={prevStep}
 className={(isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-3 rounded-xl font-medium text-sm transition-colors'}
 >
 <i className="fas fa-arrow-left mr-2"></i>Voltar
 </button>
 )}

 {currentStep !== 'views' ? (
 <button
 onClick={nextStep}
 disabled={!canProceed(currentStep)}
 className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all ' + (canProceed(currentStep) ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90' : (isDark ? 'bg-neutral-700' : 'bg-gray-300') + ' text-white cursor-not-allowed opacity-50')}
 >
 Próximo<i className="fas fa-arrow-right ml-2"></i>
 </button>
 ) : (
 <>
 <button
 onClick={handleGenerate}
 disabled={isGenerating || isAnyGenerationRunning}
 className={'flex-1 py-3 rounded-xl font-semibold text-sm transition-all ' + (isGenerating || isAnyGenerationRunning ? 'bg-[#FF6B6B] cursor-wait' : 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] hover:opacity-90 ') + ' text-white'}
 >
 {isGenerating ? (
 <><i className="fas fa-spinner fa-spin mr-2"></i>Gerando{viewsMode === 'front-back' ? ' 2 imagens' : ''}...</>
 ) : isAnyGenerationRunning ? (
 <><i className="fas fa-clock mr-2"></i>Aguardando...</>
 ) : (
 <><i className="fas fa-wand-magic-sparkles mr-2"></i>Gerar {viewsMode === 'front-back' ? '2 Looks' : 'Look'} ({creditsNeeded} {creditsNeeded === 1 ? 'crédito' : 'créditos'})</>
 )}
 </button>
 </>
 )}
 </div>
 </div>
 </div>

 </div>

 {/* MODAL DE LOADING - Com steps e thumbnails */}
 {isGenerating && !isMinimized && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div className={`absolute inset-0 backdrop-blur-2xl ${theme !== 'light' ? 'bg-black/80' : 'bg-white/30'}`}></div>
 <div className="relative z-10 flex flex-col items-center justify-center max-w-lg mx-auto p-6 w-full">
 {/* Motion GIF (padrão Vizzu — Scene-1.gif) */}
 <div className="w-64 h-64 mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
 <img src="/Scene-1.gif" alt="" className="h-full object-cover" style={{ width: '140%', maxWidth: 'none' }} />
 </div>

 {/* Header */}
 <h2 className={`text-xl font-bold font-serif mb-1 text-center ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>
 {viewsMode === 'front-back' ? 'Criando 2 imagens...' : 'Criando seu look...'}
 </h2>
 <p className={`text-xs mb-5 text-center ${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'}`}>
 {viewsMode === 'front-back' && currentProgress >= 48 ? 'Gerando imagem de costas' : 'Vestindo cada peça com IA'}
 </p>

 {/* Steps List - Grid 2 colunas */}
 <div className={`w-full max-w-md rounded-2xl p-4 mb-5 border ${theme !== 'light' ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/80 border-gray-200/60 shadow-sm'}`}>
 <div className="grid grid-cols-2 gap-3">
 {loadingSteps.map((step, index) => {
 const isCompleted = index < currentGenerationStep;
 const isCurrent = index === currentGenerationStep;
 const isPending = index > currentGenerationStep;
 const isLastStep = index === loadingSteps.length - 1;

 // Na última etapa, mostrar frases rotativas
 const displayLabel = (isLastStep && isCurrent)
 ? FINALIZING_PHRASES[finalizingPhraseIndex]
 : step.label;

 return (
 <div
 key={step.id}
 className={`flex items-center gap-2 transition-all duration-300 ${
 isPending ? 'opacity-40' : 'opacity-100'
 }`}
 >
 {/* Status Icon */}
 <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
 isCompleted
 ? 'bg-green-500'
 : isCurrent
 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] animate-pulse'
 : theme !== 'light' ? 'bg-neutral-700' : 'bg-gray-200'
 }`}>
 {isCompleted ? (
 <i className="fas fa-check text-white text-[10px]"></i>
 ) : isCurrent ? (
 <i className="fas fa-spinner fa-spin text-white text-[10px]"></i>
 ) : (
 <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
 )}
 </div>

 {/* Thumbnail */}
 {step.thumbnail ? (
 <div className={`w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all duration-300 ${
 isCompleted
 ? 'border-green-500/50'
 : isCurrent
 ? 'border-[#FF9F43]'
 : theme !== 'light' ? 'border-neutral-700' : 'border-gray-200'
 }`}>
 <OptimizedImage
 src={step.thumbnail}
 alt={step.label}
 className="w-full h-full"
 size="thumb"
 />
 </div>
 ) : (
 <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 ${
 isCompleted
 ? 'border-green-500/50 bg-green-500/10'
 : isCurrent
 ? 'border-[#FF9F43] bg-[#FF9F43]/10'
 : theme !== 'light' ? 'border-neutral-700 bg-neutral-800' : 'border-gray-200 bg-gray-50'
 }`}>
 <i className={`fas ${
 step.type === 'setup' ? 'fa-user' :
 step.type === 'finalize' ? 'fa-wand-magic-sparkles' : 'fa-shirt'
 } ${
 isCompleted ? 'text-green-400' : isCurrent ? 'text-[#FF9F43]' : theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'
 } text-xs`}></i>
 </div>
 )}

 {/* Label */}
 <span className={`text-xs font-medium transition-all duration-300 flex-1 leading-tight ${
 isCompleted
 ? 'text-green-400'
 : isCurrent
 ? theme !== 'light' ? 'text-white' : 'text-gray-900'
 : theme !== 'light' ? 'text-neutral-500' : 'text-gray-400'
 }`}>
 {displayLabel}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Progress Bar */}
 <div className="w-full max-w-md mb-5">
 <div className={`h-2 rounded-full overflow-hidden ${theme !== 'light' ? 'bg-neutral-800' : 'bg-gray-200'}`}>
 <div
 className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] rounded-full transition-all duration-500"
 style={{ width: `${currentProgress}%` }}
 ></div>
 </div>
 <div className="flex justify-between items-center mt-2">
 <span className={`text-xs ${theme !== 'light' ? 'text-neutral-500' : 'text-gray-500'}`}>
 {viewsMode === 'front-back'
 ? currentProgress < 48 ? 'Imagem de frente' : 'Imagem de costas'
 : 'Processando'}
 </span>
 <span className={`text-sm font-bold ${theme !== 'light' ? 'text-white' : 'text-gray-900'}`}>{currentProgress}%</span>
 </div>
 </div>

 {/* Minimize Button */}
 <button
 onClick={handleMinimize}
 className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${theme !== 'light' ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700' : 'bg-white/80 hover:bg-white text-gray-700 border border-gray-200/60 shadow-sm'}`}
 >
 <i className="fas fa-minus"></i>
 <span>Minimizar e continuar navegando</span>
 </button>
 </div>
 </div>
 )}

 {/* BARRA MINIMIZADA - Renderizada no App.tsx para aparecer em todas as páginas */}

 {/* MODAL - Salvar Fundo */}
 {showSaveBackgroundModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-all">
 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSaveBackgroundModal(false)}></div>
 <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' relative z-10 w-full max-w-sm rounded-2xl border p-5 '}>
 <div className="text-center mb-4">
 <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center mx-auto mb-3">
 <i className="fas fa-bookmark text-[#FF6B6B] text-xl"></i>
 </div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-base font-bold font-serif'}>Salvar Fundo</h3>
 <p className={(isDark ? 'text-neutral-400' : 'text-gray-500') + ' text-xs mt-1'}>Dê um nome para este fundo</p>
 </div>

 <div className="mb-4">
 <input
 type="text"
 value={newBackgroundName}
 onChange={(e) => setNewBackgroundName(e.target.value)}
 placeholder="Ex: Meu jardim favorito"
 maxLength={30}
 className={(isDark ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400') + ' w-full px-4 py-3 border rounded-xl text-sm'}
 autoFocus
 />
 </div>

 <div className="flex gap-2">
 <button
 onClick={() => { setShowSaveBackgroundModal(false); setNewBackgroundName(''); }}
 className={(isDark ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + ' flex-1 py-2.5 rounded-xl font-semibold text-sm'}
 >
 Cancelar
 </button>
 <button
 onClick={handleSaveBackground}
 disabled={!newBackgroundName.trim()}
 className={'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ' + (newBackgroundName.trim() ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white hover:opacity-90' : (isDark ? 'bg-neutral-700 text-neutral-500' : 'bg-gray-200 text-gray-400') + ' cursor-not-allowed')}
 >
 <i className="fas fa-save mr-2"></i>Salvar
 </button>
 </div>
 </div>
 </div>
 )}

 {/* BACKGROUND SOURCE PICKER MODAL */}
 {showBackgroundSourcePicker && (
 <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center" onClick={() => setShowBackgroundSourcePicker(false)}>
 <div className={(isDark ? 'bg-neutral-900/95 backdrop-blur-2xl border-neutral-800' : 'bg-white/95 backdrop-blur-2xl border-gray-200') + ' rounded-t-2xl w-full max-w-md p-5 pb-8 border-t'} onClick={(e) => e.stopPropagation()}>
 <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-300') + ' w-10 h-1 rounded-full mx-auto mb-4'}></div>
 <h3 className={(isDark ? 'text-white' : 'text-gray-900') + ' text-sm font-medium text-center mb-4'}>
 Adicionar fundo personalizado
 </h3>
 <div className="grid grid-cols-2 gap-3">
 <label className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-[#FF6B6B]/50' : 'bg-gray-50 border-gray-200 hover:border-[#FF6B6B]/50') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
 <div className={(isDark ? 'bg-neutral-700' : 'bg-[#FF6B6B]/15') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
 <i className="fas fa-images text-[#FF6B6B]"></i>
 </div>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Galeria</span>
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 if (e.target.files?.[0]) {
 processBackgroundFile(e.target.files[0]);
 setShowBackgroundSourcePicker(false);
 }
 }}
 />
 </label>
 <label className={(isDark ? 'bg-neutral-800 border-neutral-700 hover:border-[#FF6B6B]/50' : 'bg-gray-50 border-gray-200 hover:border-[#FF6B6B]/50') + ' border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all'}>
 <div className={(isDark ? 'bg-neutral-700' : 'bg-orange-100') + ' w-12 h-12 rounded-full flex items-center justify-center'}>
 <i className="fas fa-camera text-[#FF9F43]"></i>
 </div>
 <span className={(isDark ? 'text-white' : 'text-gray-900') + ' text-xs font-medium'}>Câmera</span>
 <input
 type="file"
 accept="image/*"
 capture="environment"
 className="hidden"
 onChange={(e) => {
 if (e.target.files?.[0]) {
 processBackgroundFile(e.target.files[0]);
 setShowBackgroundSourcePicker(false);
 }
 }}
 />
 </label>
 </div>
 <button onClick={() => setShowBackgroundSourcePicker(false)} className={(isDark ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-700') + ' w-full mt-4 py-2 text-xs font-medium'}>
 Cancelar
 </button>
 </div>
 </div>
 )}

 {/* Modal de confirmação 4K */}
 <Resolution4KConfirmModal
 isOpen={show4KConfirmModal}
 onConfirm={handleConfirm4K}
 onCancel={handleCancel4K}
 theme={theme}
 />
 </div>
 );
};
