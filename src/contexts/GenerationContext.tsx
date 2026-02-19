import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  pollStudioGeneration,
  pollGenerationSimple,
  pollCreativeStillGeneration,
  pollModelGeneration,
} from '../lib/api/studio';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type MinimizedModal = {
 id: string;
 title: string;
 icon: string;
 type: 'createModel' | 'modelDetail' | 'createProduct' | 'productDetail' | 'createClient' | 'clientDetail';
 progress?: number;
};

export type FeatureType = 'product-studio' | 'look-composer' | 'creative-still' | 'provador' | 'models';

export interface BackgroundGeneration {
  id: string;
  feature: FeatureType;
  featureLabel: string;
  productName: string;
  productId?: string;
  generationId?: string;
  table?: 'generations' | 'creative_still_generations' | 'saved_models';
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  startTime: number;
  angles?: string[];
  completedAngles?: number;
  // Per-item URLs (preenchidos pelo polling conforme completam)
  angleStatuses?: Array<{ angle: string; url?: string; status: 'pending' | 'completed' | 'failed' }>;
  completedImageUrl?: string;   // LC/Provador: URL da imagem quando pronta
  variationUrls?: string[];     // CS: URLs das variações conforme completam
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PROVADOR_LOADING_PHRASES = [
 { text: 'Analisando a foto do cliente...', icon: 'fa-camera' },
 { text: 'Identificando medidas e proporções...', icon: 'fa-ruler' },
 { text: 'Preparando as peças selecionadas...', icon: 'fa-shirt' },
 { text: 'Ajustando caimento e modelagem...', icon: 'fa-scissors' },
 { text: 'Combinando cores e texturas...', icon: 'fa-palette' },
 { text: 'Aplicando iluminação natural...', icon: 'fa-sun' },
 { text: 'Refinando detalhes do look...', icon: 'fa-wand-magic-sparkles' },
 { text: 'Criando composição final...', icon: 'fa-layer-group' },
 { text: 'Nossa IA está caprichando...', icon: 'fa-sparkles' },
 { text: 'Quase pronto, aguarde mais um pouco...', icon: 'fa-hourglass-half' },
 { text: 'Finalizando sua imagem...', icon: 'fa-check-circle' },
];

const BG_STORAGE_KEY = 'vizzu-background-generations';
const MAX_CONCURRENT = 5;
const POLL_INTERVAL_MS = 5000;
const HARD_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const GENERATION_CHANNEL = 'vizzu-generation-sync';

// ═══════════════════════════════════════════════════════════════
// localStorage helpers
// ═══════════════════════════════════════════════════════════════

function readBgGenerations(): BackgroundGeneration[] {
  try {
    const raw = localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Limpar entries stale (>30 min em processing ou completed/failed)
    const now = Date.now();
    const clean = parsed.filter((g: BackgroundGeneration) => {
      if (g.status !== 'processing') return false; // remover completed/failed persistidos
      if (now - g.startTime > HARD_TIMEOUT_MS) return false; // remover expirados
      return true;
    });
    if (clean.length !== parsed.length) persistBgGenerations(clean);
    return clean;
  } catch { return []; }
}

function persistBgGenerations(gens: BackgroundGeneration[]) {
  try { localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(gens)); } catch { /* ignore */ }
}

/** Progresso simulado baseado no tempo decorrido (ease-out) */
function simulateProgress(startTime: number): number {
  const elapsed = Date.now() - startTime;
  const estimatedTotal = 120000; // 2 min
  const normalized = Math.min(elapsed / estimatedTotal, 1.5);
  const eased = 1 - Math.pow(1 - Math.min(normalized, 1), 2);
  return Math.round(5 + 85 * eased); // 5% → 90%
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT INTERFACE
// ═══════════════════════════════════════════════════════════════

interface GenerationContextType {
 // Product Studio
 isGeneratingProductStudio: boolean;
 setIsGeneratingProductStudio: React.Dispatch<React.SetStateAction<boolean>>;
 productStudioProgress: number;
 setProductStudioProgress: React.Dispatch<React.SetStateAction<number>>;
 productStudioLoadingText: string;
 setProductStudioLoadingText: React.Dispatch<React.SetStateAction<string>>;

 // Look Composer
 isGeneratingLookComposer: boolean;
 setIsGeneratingLookComposer: React.Dispatch<React.SetStateAction<boolean>>;
 lookComposerProgress: number;
 setLookComposerProgress: React.Dispatch<React.SetStateAction<number>>;
 lookComposerLoadingText: string;
 setLookComposerLoadingText: React.Dispatch<React.SetStateAction<string>>;

 // Provador
 isGeneratingProvador: boolean;
 setIsGeneratingProvador: React.Dispatch<React.SetStateAction<boolean>>;
 provadorProgress: number;
 setProvadorProgress: React.Dispatch<React.SetStateAction<number>>;
 provadorLoadingIndex: number;
 setProvadorLoadingIndex: React.Dispatch<React.SetStateAction<number>>;
 provadorLoadingText: string;

 // Creative Still
 isGeneratingCreativeStill: boolean;
 setIsGeneratingCreativeStill: React.Dispatch<React.SetStateAction<boolean>>;
 creativeStillProgress: number;
 setCreativeStillProgress: React.Dispatch<React.SetStateAction<number>>;

 // Models
 isGeneratingModels: boolean;
 setIsGeneratingModels: React.Dispatch<React.SetStateAction<boolean>>;
 modelsProgress: number;
 setModelsProgress: React.Dispatch<React.SetStateAction<number>>;

 // Computed
 isAnyGenerationRunning: boolean;

 // Notificações de geração concluída (lista de pages: 'product-studio', 'provador', etc.)
 completedFeatures: string[];
 addCompletedFeature: (page: string) => void;
 clearCompletedFeature: (page: string) => void;
 clearAllCompletedFeatures: () => void;

 // Notificações por produto (feature → product IDs com geração recém-concluída)
 completedProducts: Record<string, string[]>;
 addCompletedProduct: (page: string, productId: string) => void;
 clearCompletedProduct: (page: string, productId: string) => void;

 // Minimized Modals
 minimizedModals: MinimizedModal[];
 setMinimizedModals: React.Dispatch<React.SetStateAction<MinimizedModal[]>>;
 closeMinimizedModal: (id: string) => void;

 // Background Generations (Queue System)
 backgroundGenerations: BackgroundGeneration[];
 addBackgroundGeneration: (gen: Omit<BackgroundGeneration, 'id' | 'startTime' | 'status'>) => string;
 removeBackgroundGeneration: (id: string) => void;
 updateBackgroundGeneration: (id: string, updates: Partial<BackgroundGeneration>) => void;
 clearCompletedBackgroundGenerations: () => void;
 activeBackgroundIndex: number;
 setActiveBackgroundIndex: React.Dispatch<React.SetStateAction<number>>;

 // Plan awareness
 isPro: boolean;
 setIsPro: React.Dispatch<React.SetStateAction<boolean>>;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function GenerationProvider({ children }: { children: React.ReactNode }) {
 // Geração em outra aba (recebido via BroadcastChannel)
 const [otherTabGenerating, setOtherTabGenerating] = useState(false);

 // Product Studio
 const [isGeneratingProductStudio, setIsGeneratingProductStudio] = useState(false);
 const [productStudioProgress, setProductStudioProgress] = useState(0);
 const [productStudioLoadingText, setProductStudioLoadingText] = useState('');

 // Look Composer
 const [isGeneratingLookComposer, setIsGeneratingLookComposer] = useState(false);
 const [lookComposerProgress, setLookComposerProgress] = useState(0);
 const [lookComposerLoadingText, setLookComposerLoadingText] = useState('');

 // Provador
 const [isGeneratingProvador, setIsGeneratingProvador] = useState(false);
 const [provadorLoadingIndex, setProvadorLoadingIndex] = useState(0);
 const [provadorProgress, setProvadorProgress] = useState(0);

 // Creative Still
 const [isGeneratingCreativeStill, setIsGeneratingCreativeStill] = useState(false);
 const [creativeStillProgress, setCreativeStillProgress] = useState(0);

 // Models
 const [isGeneratingModels, setIsGeneratingModels] = useState(false);
 const [modelsProgress, setModelsProgress] = useState(0);

 // ───── Background Generations (Queue System) ─────
 const [backgroundGenerations, setBackgroundGenerations] = useState<BackgroundGeneration[]>(readBgGenerations);
 const [activeBackgroundIndex, setActiveBackgroundIndex] = useState(0);
 const [isPro, setIsPro] = useState(false);
 const bgRef = useRef<BackgroundGeneration[]>([]);
 bgRef.current = backgroundGenerations;

 const addBackgroundGeneration = useCallback((gen: Omit<BackgroundGeneration, 'id' | 'startTime' | 'status'>): string => {
   const id = crypto.randomUUID();
   const newGen: BackgroundGeneration = {
     ...gen,
     id,
     status: 'processing',
     startTime: Date.now(),
   };
   setBackgroundGenerations(prev => {
     // Remover entries antigas da mesma feature (evita duplicatas)
     const withoutOld = prev.filter(g => g.feature !== gen.feature);
     if (withoutOld.filter(g => g.status === 'processing').length >= MAX_CONCURRENT) {
       console.warn('[BgGen] Limite de gerações simultâneas atingido');
       return prev;
     }
     const next = [...withoutOld, newGen];
     persistBgGenerations(next);
     return next;
   });
   return id;
 }, []);

 const removeBackgroundGeneration = useCallback((id: string) => {
   setBackgroundGenerations(prev => {
     const next = prev.filter(g => g.id !== id);
     persistBgGenerations(next);
     return next;
   });
   // Ajustar index se necessário
   setActiveBackgroundIndex(prev => {
     const remaining = bgRef.current.filter(g => g.id !== id).length;
     return prev >= remaining ? Math.max(0, remaining - 1) : prev;
   });
 }, []);

 const updateBackgroundGeneration = useCallback((id: string, updates: Partial<BackgroundGeneration>) => {
   setBackgroundGenerations(prev => {
     const idx = prev.findIndex(g => g.id === id);
     if (idx === -1) return prev;
     const updated = { ...prev[idx], ...updates };
     const next = [...prev];
     next[idx] = updated;
     persistBgGenerations(next);
     return next;
   });
 }, []);

 const clearCompletedBackgroundGenerations = useCallback(() => {
   setBackgroundGenerations(prev => {
     const next = prev.filter(g => g.status === 'processing');
     persistBgGenerations(next);
     return next;
   });
 }, []);

 // ───── Polling centralizado para background generations ─────
 const hasProcessingBg = backgroundGenerations.some(g => g.status === 'processing');

 useEffect(() => {
   if (!hasProcessingBg) return;

   const poll = async () => {
     const currentGens = bgRef.current.filter(g => g.status === 'processing');

     for (const gen of currentGens) {
       // Hard timeout de 30 min
       if (Date.now() - gen.startTime > HARD_TIMEOUT_MS) {
         updateBackgroundGeneration(gen.id, { status: 'failed', progress: 0 });
         continue;
       }

       // Sem generationId = não conseguimos pollar, só simular progresso
       if (!gen.generationId) {
         updateBackgroundGeneration(gen.id, { progress: simulateProgress(gen.startTime) });
         continue;
       }

       try {
         if (gen.feature === 'product-studio') {
           const psResult = await pollStudioGeneration(gen.generationId);
           const completedCount = psResult.completedAngles?.length || 0;
           const totalAngles = gen.angles?.length || 5;
           const psStatus = psResult.generationStatus === 'completed' ? 'completed'
             : psResult.generationStatus === 'failed' ? 'failed'
             : psResult.generationStatus === 'partial' ? 'completed'
             : 'processing';
           const psProgress = psStatus === 'completed' ? 100
             : psStatus === 'failed' ? 0
             : totalAngles > 0 ? Math.round((completedCount / totalAngles) * 90) + 5
             : simulateProgress(gen.startTime);
           updateBackgroundGeneration(gen.id, {
             status: psStatus as BackgroundGeneration['status'],
             progress: psProgress,
             completedAngles: completedCount,
             angleStatuses: psResult.completedAngles.map(a => ({
               angle: a.angle,
               url: a.url,
               status: (a.status === 'completed' ? 'completed' : 'failed') as 'completed' | 'failed',
             })),
           });
         } else if (gen.feature === 'creative-still') {
           const csResult = await pollCreativeStillGeneration(gen.generationId);
           updateBackgroundGeneration(gen.id, {
             status: csResult.status === 'completed' ? 'completed'
               : csResult.status === 'failed' ? 'failed'
               : 'processing',
             progress: csResult.status === 'completed' ? 100
               : csResult.status === 'failed' ? 0
               : simulateProgress(gen.startTime),
             variationUrls: csResult.variationUrls,
           });
         } else if (gen.feature === 'models') {
           const mdResult = await pollModelGeneration(gen.generationId);
           updateBackgroundGeneration(gen.id, {
             status: mdResult.status === 'completed' ? 'completed'
               : mdResult.status === 'failed' ? 'failed'
               : 'processing',
             progress: mdResult.status === 'completed' ? 100
               : mdResult.status === 'failed' ? 0
               : simulateProgress(gen.startTime),
           });
         } else {
           // Look Composer, Provador → tabela generations
           const result = await pollGenerationSimple(gen.generationId);
           updateBackgroundGeneration(gen.id, {
             status: result.status === 'completed' ? 'completed'
               : result.status === 'failed' ? 'failed'
               : 'processing',
             progress: result.status === 'completed' ? 100
               : result.status === 'failed' ? 0
               : simulateProgress(gen.startTime),
             completedImageUrl: result.imageUrl,
           });
         }
       } catch (err) {
         // Ignorar erros de polling (rede, etc.) — retry no próximo ciclo
         console.warn('[BgGen] Erro no polling de', gen.id, err);
       }
     }
   };

   // Poll imediatamente + intervalo
   poll();
   const interval = setInterval(poll, POLL_INTERVAL_MS);
   return () => clearInterval(interval);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [hasProcessingBg]);

 // Auto-remover gerações concluídas/falhadas após 8s
 useEffect(() => {
   const finishedGens = backgroundGenerations.filter(g => g.status === 'completed' || g.status === 'failed');
   if (finishedGens.length === 0) return;

   const timers = finishedGens.map((gen, i) =>
     setTimeout(() => {
       removeBackgroundGeneration(gen.id);
     }, 2000 + i * 500) // Rápido: Realtime já atualizou a galeria
   );

   return () => timers.forEach(clearTimeout);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [backgroundGenerations.filter(g => g.status !== 'processing').length]);

 // ───── Notificações de geração concluída ─────
 const COMPLETED_FEATURES_KEY = 'vizzu-completed-features';
 const readCompletedFeatures = (): string[] => {
   try { return JSON.parse(localStorage.getItem(COMPLETED_FEATURES_KEY) || '[]'); } catch { return []; }
 };
 const [completedFeatures, setCompletedFeatures] = useState<string[]>(readCompletedFeatures);
 const prevGeneratingRef = useRef({ ps: false, lc: false, pv: false, cs: false, md: false });

 const addCompletedFeature = useCallback((page: string) => {
   setCompletedFeatures(prev => {
     if (prev.includes(page)) return prev;
     const next = [...prev, page];
     try { localStorage.setItem(COMPLETED_FEATURES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
     return next;
   });
 }, []);

 // Detectar quando uma geração finaliza (true → false) e adicionar a page à lista
 useEffect(() => {
   const prev = prevGeneratingRef.current;
   const newFeatures: string[] = [];

   if (prev.ps && !isGeneratingProductStudio) newFeatures.push('product-studio');
   if (prev.lc && !isGeneratingLookComposer) newFeatures.push('look-composer');
   if (prev.pv && !isGeneratingProvador) newFeatures.push('provador');
   if (prev.cs && !isGeneratingCreativeStill) newFeatures.push('creative-still');
   if (prev.md && !isGeneratingModels) newFeatures.push('models');

   if (newFeatures.length > 0) {
     setCompletedFeatures(prev => {
       const merged = [...new Set([...prev, ...newFeatures])];
       try { localStorage.setItem(COMPLETED_FEATURES_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
       return merged;
     });
   }

   prevGeneratingRef.current = {
     ps: isGeneratingProductStudio,
     lc: isGeneratingLookComposer,
     pv: isGeneratingProvador,
     cs: isGeneratingCreativeStill,
     md: isGeneratingModels,
   };
 }, [isGeneratingProductStudio, isGeneratingLookComposer, isGeneratingProvador, isGeneratingCreativeStill, isGeneratingModels]);

 const clearCompletedFeature = useCallback((page: string) => {
   setCompletedFeatures(prev => {
     const next = prev.filter(f => f !== page);
     try { localStorage.setItem(COMPLETED_FEATURES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
     return next;
   });
 }, []);

 // Também detectar conclusão de background generations e limpar estado da feature
 const prevBgStatusRef = useRef<Record<string, string>>({});
 useEffect(() => {
   const prevStatuses = prevBgStatusRef.current;
   for (const gen of backgroundGenerations) {
     const prevStatus = prevStatuses[gen.id];
     if (prevStatus === 'processing' && (gen.status === 'completed' || gen.status === 'failed')) {
       // Limpar estado da feature
       switch (gen.feature) {
         case 'product-studio':
           setIsGeneratingProductStudio(false);
           setProductStudioProgress(gen.status === 'completed' ? 100 : 0);
           break;
         case 'look-composer':
           setIsGeneratingLookComposer(false);
           setLookComposerProgress(gen.status === 'completed' ? 100 : 0);
           break;
         case 'provador':
           setIsGeneratingProvador(false);
           setProvadorProgress(gen.status === 'completed' ? 100 : 0);
           break;
         case 'creative-still':
           setIsGeneratingCreativeStill(false);
           setCreativeStillProgress(gen.status === 'completed' ? 100 : 0);
           break;
         case 'models':
           setIsGeneratingModels(false);
           setModelsProgress(gen.status === 'completed' ? 100 : 0);
           break;
       }
       // Notificação de conclusão
       if (gen.status === 'completed') {
         addCompletedFeature(gen.feature);
         if (gen.productId) {
           addCompletedProduct(gen.feature, gen.productId);
         }
       }
     }
   }
   // Atualizar ref
   const next: Record<string, string> = {};
   for (const gen of backgroundGenerations) {
     next[gen.id] = gen.status;
   }
   prevBgStatusRef.current = next;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [backgroundGenerations]);

 // ───── Notificações por produto ─────
 const COMPLETED_PRODUCTS_KEY = 'vizzu-completed-products';
 const readCompletedProducts = (): Record<string, string[]> => {
   try { return JSON.parse(localStorage.getItem(COMPLETED_PRODUCTS_KEY) || '{}'); } catch { return {}; }
 };
 const [completedProducts, setCompletedProducts] = useState<Record<string, string[]>>(readCompletedProducts);

 const clearAllCompletedFeatures = useCallback(() => {
   setCompletedFeatures([]);
   setCompletedProducts({});
   try { localStorage.setItem(COMPLETED_FEATURES_KEY, '[]'); } catch { /* ignore */ }
   try { localStorage.setItem(COMPLETED_PRODUCTS_KEY, '{}'); } catch { /* ignore */ }
 }, []);
 const addCompletedProduct = useCallback((page: string, productId: string) => {
   setCompletedProducts(prev => {
     const existing = prev[page] || [];
     if (existing.includes(productId)) return prev;
     const next = { ...prev, [page]: [...existing, productId] };
     try { localStorage.setItem(COMPLETED_PRODUCTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
     return next;
   });
 }, []);
 const clearCompletedProduct = useCallback((page: string, productId: string) => {
   setCompletedProducts(prev => {
     const existing = prev[page];
     if (!existing) return prev;
     const filtered = existing.filter(id => id !== productId);
     const next = filtered.length === 0
       ? (({ [page]: _, ...rest }) => rest)(prev)
       : { ...prev, [page]: filtered };
     try { localStorage.setItem(COMPLETED_PRODUCTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
     return next;
   });
 }, []);

 // Minimized Modals
 const [minimizedModals, setMinimizedModals] = useState<MinimizedModal[]>([]);

 const closeMinimizedModal = (modalId: string) => {
   setMinimizedModals(prev => prev.filter(m => m.id !== modalId));
 };

 // Controlar frases e progresso do loading do Provador
 // Tempo médio de geração: ~120 segundos (2 minutos)
 useEffect(() => {
   if (!isGeneratingProvador) {
     setProvadorLoadingIndex(0);
     setProvadorProgress(0);
     return;
   }

   // Atualizar frase a cada ~14 segundos (11 frases em ~150 segundos)
   const phraseInterval = setInterval(() => {
     setProvadorLoadingIndex(prev => (prev + 1) % PROVADOR_LOADING_PHRASES.length);
   }, 13600);

   // Progresso calibrado para ~150 segundos até 100%
   const progressInterval = setInterval(() => {
     setProvadorProgress(prev => {
       if (prev >= 100) return 100;

       let increment: number;
       if (prev < 50) {
         increment = 0.625;
       } else if (prev < 80) {
         increment = 0.25;
       } else {
         increment = 0.20;
       }

       return Math.min(100, prev + increment);
     });
   }, 500);

   return () => {
     clearInterval(phraseInterval);
     clearInterval(progressInterval);
   };
 }, [isGeneratingProvador]);

 const provadorLoadingText = PROVADOR_LOADING_PHRASES[provadorLoadingIndex]?.text || 'Gerando...';

 // ───── Lock de geração (plan-aware) ─────

 const anyFeatureGenerating =
   isGeneratingProductStudio || isGeneratingLookComposer ||
   isGeneratingProvador || isGeneratingCreativeStill || isGeneratingModels;

 const processingBgCount = backgroundGenerations.filter(g => g.status === 'processing').length;

 // Pro+: só bloqueia se overlay ativo ou 5+ gerações simultâneas em background
 // Free/Basic: qualquer geração ativa (overlay ou background) bloqueia
 const localGenerating = isPro
   ? (anyFeatureGenerating || processingBgCount >= MAX_CONCURRENT)
   : (anyFeatureGenerating || processingBgCount > 0);

 // BroadcastChannel: sincronizar estado de geração entre abas
 useEffect(() => {
   if (typeof BroadcastChannel === 'undefined') return; // SSR/fallback

   const channel = new BroadcastChannel(GENERATION_CHANNEL);

   channel.onmessage = (event) => {
     if (event.data?.type === 'generation_started') {
       setOtherTabGenerating(true);
     } else if (event.data?.type === 'generation_completed') {
       setOtherTabGenerating(false);
     }
   };

   return () => channel.close();
 }, []);

 // Broadcast quando estado de geração local muda
 useEffect(() => {
   if (typeof BroadcastChannel === 'undefined') return;

   try {
     const channel = new BroadcastChannel(GENERATION_CHANNEL);
     channel.postMessage({
       type: localGenerating ? 'generation_started' : 'generation_completed',
     });
     channel.close();
   } catch { /* ignore */ }
 }, [localGenerating]);

 const isAnyGenerationRunning = localGenerating || otherTabGenerating;

 return (
   <GenerationContext.Provider value={{
     isGeneratingProductStudio, setIsGeneratingProductStudio,
     productStudioProgress, setProductStudioProgress,
     productStudioLoadingText, setProductStudioLoadingText,
     isGeneratingLookComposer, setIsGeneratingLookComposer,
     lookComposerProgress, setLookComposerProgress,
     lookComposerLoadingText, setLookComposerLoadingText,
     isGeneratingProvador, setIsGeneratingProvador,
     provadorProgress, setProvadorProgress,
     provadorLoadingIndex, setProvadorLoadingIndex,
     provadorLoadingText,
     isGeneratingCreativeStill, setIsGeneratingCreativeStill,
     creativeStillProgress, setCreativeStillProgress,
     isGeneratingModels, setIsGeneratingModels,
     modelsProgress, setModelsProgress,
     isAnyGenerationRunning,
     completedFeatures, addCompletedFeature, clearCompletedFeature, clearAllCompletedFeatures,
     completedProducts, addCompletedProduct, clearCompletedProduct,
     minimizedModals, setMinimizedModals,
     closeMinimizedModal,
     // Background Generations (Queue System)
     backgroundGenerations,
     addBackgroundGeneration,
     removeBackgroundGeneration,
     updateBackgroundGeneration,
     clearCompletedBackgroundGenerations,
     activeBackgroundIndex, setActiveBackgroundIndex,
     isPro, setIsPro,
   }}>
     {children}
   </GenerationContext.Provider>
 );
}

export function useGeneration(): GenerationContextType {
 const context = useContext(GenerationContext);
 if (!context) {
   throw new Error('useGeneration must be used within a GenerationProvider');
 }
 return context;
}
