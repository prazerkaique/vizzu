// ═══════════════════════════════════════════════════════════════
// CORREÇÕES PARA O App.tsx - Vizzu
// ═══════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// PASSO 1: Alterar o import (linha ~10)
// ════════════════════════════════════════════════════════════════

// DE:
// import { generateStudioReady } from './lib/api/studio';

// PARA:
import { generateStudioReady, generateCenario } from './lib/api/studio';


// ════════════════════════════════════════════════════════════════
// PASSO 2: Substituir a função handleGenerateImage inteira
// (procure por "const handleGenerateImage" no App.tsx, ~linha 160)
// ════════════════════════════════════════════════════════════════

// Função para gerar imagens com IA via n8n
const handleGenerateImage = async (
  product: Product, 
  toolType: 'studio' | 'cenario' | 'lifestyle' | 'provador' | 'refine',
  prompt?: string,
  opts?: any
): Promise<{ image: string | null; generationId: string | null }> => {
  if (!user?.id) {
    throw new Error('Usuário não autenticado');
  }

  // Pegar a imagem selecionada (passada em opts ou primeira por padrão)
  const selectedImage = opts?.selectedImage || product.images[0];
  
  if (!selectedImage?.id) {
    throw new Error('Imagem não encontrada. Certifique-se de que o produto tem imagens.');
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // STUDIO READY - Fundo branco profissional
    // ═══════════════════════════════════════════════════════════
    if (toolType === 'studio') {
      const result = await generateStudioReady({
        productId: product.id,
        userId: user.id,
        imageId: selectedImage.id,
      });

      if (result.success && result.generation) {
        if (result.credits_remaining !== undefined) {
          setCredits(result.credits_remaining);
        }
        loadUserProducts(user.id);
        return {
          image: result.generation.image_url,
          generationId: result.generation.id,
        };
      }
      
      throw new Error(result.message || 'Erro ao gerar imagem');
    }

    // ═══════════════════════════════════════════════════════════
    // CENÁRIO CRIATIVO - Ambiente personalizado
    // ═══════════════════════════════════════════════════════════
    if (toolType === 'cenario') {
      if (!prompt) {
        throw new Error('Prompt do cenário é obrigatório');
      }

      const result = await generateCenario({
        productId: product.id,
        userId: user.id,
        imageId: selectedImage.id,
        prompt: prompt,
      });

      if (result.success && result.generation) {
        if (result.credits_remaining !== undefined) {
          setCredits(result.credits_remaining);
        }
        loadUserProducts(user.id);
        return {
          image: result.generation.image_url,
          generationId: result.generation.id,
        };
      }
      
      throw new Error(result.message || 'Erro ao gerar cenário');
    }

    // ═══════════════════════════════════════════════════════════
    // OUTROS TIPOS (ainda não implementados no n8n)
    // ═══════════════════════════════════════════════════════════
    throw new Error(`Ferramenta "${toolType}" ainda não implementada no backend`);

  } catch (error: any) {
    console.error('Erro na geração:', error);
    throw error;
  }
};
