import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export type VisualStudioAction = 'studio' | 'cenario' | 'lifestyle' | 'refine';

export interface LookItem { slot: string; image: string; name: string; }

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

function buildPrompt(req: VisualStudioRequest): string {
  const { action, prompt, productName, productCategory, productDescription, modelPrompt, clothingPrompt, posePrompt, modelReferenceImage, lookItems } = req;
  const product = productName || 'the product';
  
  if (action === 'studio') {
    return `Transform this product image into a professional e-commerce photo. Requirements: Pure white background (#FFFFFF), subtle soft drop shadow, product must remain EXACTLY as it is, professional studio lighting, product centered in frame. Do NOT change the product design, colors, or any details.`;
  }
  
  if (action === 'cenario') {
    return `Create a promotional scene for this product. CRITICAL: The product (${product}) must be the MAIN FOCAL POINT, remain EXACTLY as shown, occupy at least 40% of the image. Scene: ${prompt || 'Modern, clean promotional environment'}`;
  }
  
  if (action === 'refine') {
    return `Modify the current image: ${prompt}. CRITICAL: Do NOT change the main product or the model's face/identity. Only modify what is specifically requested.`;
  }
  
  // lifestyle
  const category = productCategory || 'garment';
  let productDetail = productDescription 
    ? `EXACT PRODUCT DESCRIPTION: "${productDescription}". The model MUST wear a ${category} matching this EXACT description.`
    : `PRODUCT REFERENCE: The model must wear a ${category} VISUALLY IDENTICAL to image #1.`;
  
  let lookSection = '';
  if (lookItems?.length) {
    lookSection = `\n\nADDITIONAL OUTFIT ITEMS:\n${lookItems.map((i, idx) => `- ${i.slot}: "${i.name}" (ref image #${idx + (modelReferenceImage ? 3 : 2)})`).join('\n')}`;
  }
  
  const base = `CRITICAL PRODUCT REPRODUCTION RULES:
You are generating a professional e-commerce photo with a human model.
THE MOST IMPORTANT RULE: The model must wear the EXACT product from image #1.

=== MAIN PRODUCT (IMAGE #1) ===
Product: "${product}" | Type: ${category.toUpperCase()}
${productDetail}

REPRODUCTION REQUIREMENTS:
✓ EXACT same colors, pattern, logo/text, neckline, sleeves, fit, fabric texture
✗ Do NOT change color, remove logos, alter cut, add elements not in original`;

  if (modelReferenceImage) {
    return `${base}

=== MODEL CONSISTENCY (IMAGE #2) ===
Generate the EXACT SAME PERSON from image #2: identical face, skin tone, eye color, hair color.
Model characteristics: ${modelPrompt || 'Match the reference image exactly'}
${lookSection}
=== STYLING ===
Additional clothing: ${clothingPrompt || 'Simple, neutral items'}
Pose: ${posePrompt || 'Natural, confident pose'}
Background: Clean studio (white or light gray)
${prompt ? `\nADDITIONAL: ${prompt}` : ''}`;
  }
  
  return `${base}

=== MODEL DESCRIPTION ===
${modelPrompt || 'Professional model appropriate for fashion e-commerce'}
${lookSection}
=== STYLING ===
Additional clothing: ${clothingPrompt || 'Simple, neutral items'}
Pose: ${posePrompt || 'Natural, confident pose'}
Background: Clean studio (white or light gray)
${prompt ? `\nADDITIONAL: ${prompt}` : ''}`;
}

export async function generateVisualStudioImage(request: VisualStudioRequest): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada');
  
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  
  const addImage = (base64: string) => {
    const clean = base64.replace(/^data:image\/\w+;base64,/, "");
    const mime = base64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
    parts.push({ inlineData: { data: clean, mimeType: mime } });
  };
  
  addImage(request.imageBase64);
  if (request.modelReferenceImage) addImage(request.modelReferenceImage);
  request.lookItems?.forEach(item => addImage(item.image));
  parts.push({ text: buildPrompt(request) });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp-image-generation',
    contents: { parts },
    config: {
      responseModalities: ['Text', 'Image'],
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });

  const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (imgPart?.inlineData) {
    return `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`;
  }
  
  throw new Error("O modelo não retornou uma imagem.");
}
