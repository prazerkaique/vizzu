// ═══════════════════════════════════════════════════════════════
// VIZZU - Gemini AI Service
// ═══════════════════════════════════════════════════════════════

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export type VisualStudioAction = 'studio' | 'cenario' | 'lifestyle' | 'refine';

export interface LookItem {
  slot: string;
  image: string;
  name: string;
}

export interface VisualStudioRequest {
  imageBase64: string;
  action: VisualStudioAction;
  prompt?: string;
  productName?: string;
  productCategory?: string;
  productDescription?: string;
  modelReferenceImage?: string;
  modelPrompt?: string;
  clothingPrompt?: string;
  posePrompt?: string;
  lookItems?: LookItem[];
}

function buildVisualStudioPrompt(request: VisualStudioRequest): string {
  const { action, prompt, productName, productCategory, productDescription, modelPrompt, clothingPrompt, posePrompt, modelReferenceImage, lookItems } = request;
  const productRef = productName || 'the product';
  
  switch (action) {
    case 'studio':
      return `Transform this product image into a professional e-commerce photo. 
Requirements:
- Pure white background (#FFFFFF)
- Subtle, soft drop shadow beneath the product for depth
- Product must remain EXACTLY as it is - do not modify, distort, or change the product itself
- Professional studio lighting, evenly lit
- Product centered in frame
- Clean, high-end e-commerce aesthetic
- The product should look like it's floating slightly above the surface
Do NOT change the product design, colors, or any details. Only change the background and lighting.`;

    case 'cenario':
      return `Create a promotional scene for this product.
CRITICAL RULES:
- The product (${productRef}) must be the MAIN FOCAL POINT of the image
- Product must remain EXACTLY as shown - do not modify its design, shape, or colors
- Product should occupy at least 40% of the image
- Background/scene should complement but not overshadow the product
- Professional commercial photography style
- High quality, 4K aesthetic

Scene description: ${prompt || 'Modern, clean promotional environment'}

Remember: The product is the star. Everything else supports it.`;

    case 'lifestyle':
      const categoryRef = productCategory || 'garment';
      
      let productDetailSection = '';
      if (productDescription && productDescription.trim()) {
        productDetailSection = `
EXACT PRODUCT DESCRIPTION (YOU MUST FOLLOW THIS):
"${productDescription.trim()}"

The model MUST wear a ${categoryRef} that matches this EXACT description.
- Same color(s) as described
- Same pattern/print as described
- Same logo/branding as described (if any)
- Same cut/style as described
- Same fabric appearance as described
`;
      } else {
        productDetailSection = `
PRODUCT REFERENCE:
Look at the FIRST image carefully. The model must wear a ${categoryRef} that is 
VISUALLY IDENTICAL to what you see in that image.
- Same colors
- Same patterns/prints
- Same logos/branding
- Same cut and style
`;
      }

      let lookCompositionSection = '';
      if (lookItems && lookItems.length > 0) {
        lookCompositionSection = `

ADDITIONAL OUTFIT ITEMS (SECONDARY - complement the main product):
${lookItems.map((item, idx) => `- ${item.slot}: "${item.name}" (reference image #${idx + (modelReferenceImage ? 3 : 2)})`).join('\n')}

These items should complement the look but the MAIN PRODUCT is the focus.
`;
      }

      const basePrompt = `
###############################################################################
#                    CRITICAL PRODUCT REPRODUCTION RULES                       #
###############################################################################

You are generating a professional e-commerce photo with a human model.

THE MOST IMPORTANT RULE: The model must wear the EXACT product from image #1.

This is NOT about creating "something similar" - you must REPRODUCE the product.

=== MAIN PRODUCT (IMAGE #1) ===
Product Name: "${productRef}"
Product Type: ${categoryRef.toUpperCase()}
${productDetailSection}

###############################################################################
#                         REPRODUCTION REQUIREMENTS                            #
###############################################################################

The ${categoryRef} worn by the model MUST have:
✓ EXACT same primary color(s)
✓ EXACT same secondary color(s) if any
✓ EXACT same pattern (stripes, solid, print, etc.)
✓ EXACT same logo/text/graphic if visible
✓ EXACT same neckline/collar style
✓ EXACT same sleeve length and style
✓ EXACT same overall fit (slim, regular, oversized)
✓ EXACT same fabric texture appearance

DO NOT:
✗ Change the color to something "similar"
✗ Remove or modify any logos/graphics
✗ Change the pattern or print
✗ Alter the cut or style
✗ Add elements that don't exist in the original
✗ Simplify or "clean up" the design

###############################################################################
`;

      if (modelReferenceImage) {
        return `${basePrompt}
=== MODEL CONSISTENCY (IMAGE #2) ===
The second image shows the MODEL to use. Generate the EXACT SAME PERSON:
- Identical face shape and features
- Same skin tone
- Same eye color
- Same hair color (style can adapt to pose)
- Immediately recognizable as the same individual

Model characteristics: ${modelPrompt || 'Match the reference image exactly'}
${lookCompositionSection}
=== STYLING ===
Additional clothing: ${clothingPrompt || 'Simple, neutral items that do not distract from the main product'}

=== POSE & SETTING ===
Pose: ${posePrompt || 'Natural, confident pose showing the product clearly'}
Background: Clean studio (white or light gray)
Lighting: Professional, soft, even lighting

=== FINAL CHECK ===
Before generating, verify:
1. Is the ${categoryRef} an EXACT match to image #1? (colors, pattern, logo, cut)
2. Is the model the same person as image #2?
3. Is the main product clearly visible and prominent?

${prompt ? `\nADDITIONAL NOTES: ${prompt}` : ''}`;
      }
      
      return `${basePrompt}
=== MODEL DESCRIPTION ===
Generate a model with these characteristics:
${modelPrompt || 'Professional model appropriate for fashion e-commerce'}
${lookCompositionSection}
=== STYLING ===
Additional clothing: ${clothingPrompt || 'Simple, neutral items that do not distract from the main product'}

=== POSE & SETTING ===
Pose: ${posePrompt || 'Natural, confident pose showing the product clearly'}
Background: Clean studio (white or light gray)
Lighting: Professional, soft, even lighting

=== FINAL CHECK ===
Before generating, verify:
1. Is the ${categoryRef} an EXACT match to image #1? (colors, pattern, logo, cut)
2. Is the main product clearly visible and prominent?
3. Does the model match the requested description?

${prompt ? `\nADDITIONAL NOTES: ${prompt}` : ''}`;

    case 'refine':
      return `Modify the current image according to these instructions:
${prompt}

CRITICAL RULES:
- Do NOT change the main product (clothing item)
- Keep the model's face and identity EXACTLY the same
- Only modify what is specifically requested
- Maintain the same lighting and background style`;

    default:
      return prompt || '';
  }
}

export async function generateVisualStudioImage(request: VisualStudioRequest): Promise<string> {
  const { imageBase64, modelReferenceImage, lookItems } = request;
  
  const fullPrompt = buildVisualStudioPrompt(request);
  
  console.log('🎨 [VIZZU] Gerando imagem:', { 
    action: request.action, 
    hasModelReference: !!modelReferenceImage,
    lookItemsCount: lookItems?.length || 0,
    category: request.productCategory
  });
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada. Adicione no arquivo .env');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
      responseMimeType: "image/png"
    }
  });

  const parts: any[] = [];
  
  const addImagePart = (base64: string, label: string) => {
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    });
    console.log(`📷 [VIZZU] Imagem adicionada: ${label}`);
  };
  
  addImagePart(imageBase64, `PRODUTO PRINCIPAL: ${request.productName || 'Main Product'}`);
  
  if (modelReferenceImage) {
    addImagePart(modelReferenceImage, 'REFERÊNCIA DO MODELO');
  }
  
  if (lookItems && lookItems.length > 0) {
    for (let i = 0; i < lookItems.length; i++) {
      const item = lookItems[i];
      addImagePart(item.image, `LOOK ITEM ${i + 1}: ${item.slot} - ${item.name}`);
    }
  }
  
  parts.push({ text: fullPrompt });

  console.log(`📦 [VIZZU] Total de imagens: ${parts.length - 1}`);

  try {
    const result = await model.generateContent(parts);
    const response = result.response;
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          console.log('✅ [VIZZU] Imagem gerada com sucesso');
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      const textPart = response.candidates[0].content.parts.find(p => p.text);
      if (textPart && textPart.text) {
        throw new Error(`Modelo recusou: "${textPart.text.substring(0, 100)}..."`);
      }
    }
    
    throw new Error("O modelo não retornou uma imagem.");

  } catch (error) {
    console.error('❌ [VIZZU] Erro:', error);
    throw error;
  }
}
