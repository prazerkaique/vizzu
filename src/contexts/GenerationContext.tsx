import React, { createContext, useContext, useState, useEffect } from 'react';

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

 // Computed
 isAnyGenerationRunning: boolean;

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
 const localGenerating = isGeneratingProvador || isGeneratingProductStudio || isGeneratingLookComposer || isGeneratingCreativeStill;

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
     isAnyGenerationRunning,
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
