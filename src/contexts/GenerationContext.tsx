import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type MinimizedModal = {
 id: string;
 title: string;
 icon: string;
 type: 'createModel' | 'modelDetail' | 'createProduct' | 'productDetail' | 'createClient' | 'clientDetail';
 progress?: number;
};

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

interface GenerationContextType {
 // Product Studio
 isGeneratingProductStudio: boolean;
 setIsGeneratingProductStudio: React.Dispatch<React.SetStateAction<boolean>>;
 productStudioMinimized: boolean;
 setProductStudioMinimized: React.Dispatch<React.SetStateAction<boolean>>;
 productStudioProgress: number;
 setProductStudioProgress: React.Dispatch<React.SetStateAction<number>>;
 productStudioLoadingText: string;
 setProductStudioLoadingText: React.Dispatch<React.SetStateAction<string>>;

 // Look Composer
 isGeneratingLookComposer: boolean;
 setIsGeneratingLookComposer: React.Dispatch<React.SetStateAction<boolean>>;
 lookComposerMinimized: boolean;
 setLookComposerMinimized: React.Dispatch<React.SetStateAction<boolean>>;
 lookComposerProgress: number;
 setLookComposerProgress: React.Dispatch<React.SetStateAction<number>>;
 lookComposerLoadingText: string;
 setLookComposerLoadingText: React.Dispatch<React.SetStateAction<string>>;

 // Provador
 isGeneratingProvador: boolean;
 setIsGeneratingProvador: React.Dispatch<React.SetStateAction<boolean>>;
 provadorMinimized: boolean;
 setProvadorMinimized: React.Dispatch<React.SetStateAction<boolean>>;
 provadorProgress: number;
 setProvadorProgress: React.Dispatch<React.SetStateAction<number>>;
 provadorLoadingIndex: number;
 setProvadorLoadingIndex: React.Dispatch<React.SetStateAction<number>>;
 provadorLoadingText: string;

 // Creative Still
 isGeneratingCreativeStill: boolean;
 setIsGeneratingCreativeStill: React.Dispatch<React.SetStateAction<boolean>>;
 creativeStillMinimized: boolean;
 setCreativeStillMinimized: React.Dispatch<React.SetStateAction<boolean>>;
 creativeStillProgress: number;
 setCreativeStillProgress: React.Dispatch<React.SetStateAction<number>>;

 // Models
 isGeneratingModels: boolean;
 setIsGeneratingModels: React.Dispatch<React.SetStateAction<boolean>>;
 modelsMinimized: boolean;
 setModelsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
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
}

const GenerationContext = createContext<GenerationContextType | null>(null);

// BroadcastChannel para sincronizar estado entre abas (v9 4.2)
const GENERATION_CHANNEL = 'vizzu-generation-sync';

export function GenerationProvider({ children }: { children: React.ReactNode }) {
 // Geração em outra aba (recebido via BroadcastChannel)
 const [otherTabGenerating, setOtherTabGenerating] = useState(false);

 // Product Studio
 const [isGeneratingProductStudio, setIsGeneratingProductStudio] = useState(false);
 const [productStudioMinimized, setProductStudioMinimized] = useState(false);
 const [productStudioProgress, setProductStudioProgress] = useState(0);
 const [productStudioLoadingText, setProductStudioLoadingText] = useState('');

 // Look Composer
 const [isGeneratingLookComposer, setIsGeneratingLookComposer] = useState(false);
 const [lookComposerMinimized, setLookComposerMinimized] = useState(false);
 const [lookComposerProgress, setLookComposerProgress] = useState(0);
 const [lookComposerLoadingText, setLookComposerLoadingText] = useState('');

 // Provador
 const [isGeneratingProvador, setIsGeneratingProvador] = useState(false);
 const [provadorMinimized, setProvadorMinimized] = useState(false);
 const [provadorLoadingIndex, setProvadorLoadingIndex] = useState(0);
 const [provadorProgress, setProvadorProgress] = useState(0);

 // Creative Still
 const [isGeneratingCreativeStill, setIsGeneratingCreativeStill] = useState(false);
 const [creativeStillMinimized, setCreativeStillMinimized] = useState(false);
 const [creativeStillProgress, setCreativeStillProgress] = useState(0);

 // Models
 const [isGeneratingModels, setIsGeneratingModels] = useState(false);
 const [modelsMinimized, setModelsMinimized] = useState(false);
 const [modelsProgress, setModelsProgress] = useState(0);

 // Notificações de geração concluída — persistido em localStorage para sobreviver a refresh/saída
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
 const clearAllCompletedFeatures = useCallback(() => {
   setCompletedFeatures([]);
   try { localStorage.setItem(COMPLETED_FEATURES_KEY, '[]'); } catch { /* ignore */ }
 }, []);

 // Notificações por produto — persistido em localStorage para sobreviver a refresh/saída
 const COMPLETED_PRODUCTS_KEY = 'vizzu-completed-products';
 const readCompletedProducts = (): Record<string, string[]> => {
   try { return JSON.parse(localStorage.getItem(COMPLETED_PRODUCTS_KEY) || '{}'); } catch { return {}; }
 };
 const [completedProducts, setCompletedProducts] = useState<Record<string, string[]>>(readCompletedProducts);
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

   // Atualizar frase a cada 11 segundos (11 frases em ~121 segundos)
   const phraseInterval = setInterval(() => {
     setProvadorLoadingIndex(prev => (prev + 1) % PROVADOR_LOADING_PHRASES.length);
   }, 11000);

   // Progresso calibrado para ~120 segundos até 100%
   // 0-50%: ~32s (50/0.78 * 0.5s)
   // 50-80%: ~48s (30/0.31 * 0.5s)
   // 80-100%: ~40s (20/0.25 * 0.5s)
   const progressInterval = setInterval(() => {
     setProvadorProgress(prev => {
       if (prev >= 100) return 100;

       let increment: number;
       if (prev < 50) {
         increment = 0.78;
       } else if (prev < 80) {
         increment = 0.31;
       } else {
         increment = 0.25;
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
 const localGenerating = isGeneratingProvador || isGeneratingProductStudio || isGeneratingLookComposer || isGeneratingCreativeStill || isGeneratingModels;

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
     productStudioMinimized, setProductStudioMinimized,
     productStudioProgress, setProductStudioProgress,
     productStudioLoadingText, setProductStudioLoadingText,
     isGeneratingLookComposer, setIsGeneratingLookComposer,
     lookComposerMinimized, setLookComposerMinimized,
     lookComposerProgress, setLookComposerProgress,
     lookComposerLoadingText, setLookComposerLoadingText,
     isGeneratingProvador, setIsGeneratingProvador,
     provadorMinimized, setProvadorMinimized,
     provadorProgress, setProvadorProgress,
     provadorLoadingIndex, setProvadorLoadingIndex,
     provadorLoadingText,
     isGeneratingCreativeStill, setIsGeneratingCreativeStill,
     creativeStillMinimized, setCreativeStillMinimized,
     creativeStillProgress, setCreativeStillProgress,
     isGeneratingModels, setIsGeneratingModels,
     modelsMinimized, setModelsMinimized,
     modelsProgress, setModelsProgress,
     isAnyGenerationRunning,
     completedFeatures, addCompletedFeature, clearCompletedFeature, clearAllCompletedFeatures,
     completedProducts, addCompletedProduct, clearCompletedProduct,
     minimizedModals, setMinimizedModals,
     closeMinimizedModal,
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
