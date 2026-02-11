// ═══════════════════════════════════════════════════════════════
// VIZZU - Studio Edit v4: Prompt com fidelidade de cor reforçada
// Upload via S3 node (padrão workflow 18)
// ═══════════════════════════════════════════════════════════════

const data = $input.first().json;

const GEMINI_API_KEY = 'AIzaSyAWcNmKXgYfoU8NZh3-1Mfyz6tCDG0-5Kg';
const SUPABASE_URL = 'https://dbdqiqehuapcicejnzyd.supabase.co';
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

const userId = data.user_id;
const productId = data.product_id;
const generationId = data.generation_id;
const angle = data.angle;
const currentImageUrl = data.current_image_url;
const correctionPrompt = data.correction_prompt;
const referenceBase64 = data.reference_image_base64;
const resolution = (data.resolution || '2K').toUpperCase();
const productName = data.product_name || '';
const productCategory = data.product_category || '';
const studioBackground = data.studio_background || 'gray';
const studioShadow = data.studio_shadow || 'with-shadow';
const productNotes = data.product_notes || '';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🎨 Studio Edit v4: user=${userId}, angle=${angle}, res=${resolution}`);
console.log(`📝 Correction: ${correctionPrompt}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  // ── 1. Download imagem atual ────────────────────────────
  console.log('⬇️ [1/3] Baixando imagem atual...');
  const imgResp = await this.helpers.httpRequest({
    method: 'GET',
    url: currentImageUrl,
    encoding: 'arraybuffer',
    returnFullResponse: true
  });
  const imgBuffer = Buffer.from(imgResp.body);
  const imgBase64 = imgBuffer.toString('base64');
  const imgMimeType = imgResp.headers['content-type'] || 'image/png';
  console.log(`✅ Imagem carregada (${(imgBuffer.length / 1024).toFixed(1)} KB)`);

  // ── 2. Montar prompt (FIDELIDADE PRIMEIRO) ─────────────
  const bgInstruction = studioBackground === 'white' && studioShadow === 'no-shadow'
    ? 'Background: SOLID PURE WHITE (#FFFFFF). No shadows, no gradients.'
    : studioBackground === 'white'
      ? 'Background: white/light gray (#F5F5F5 to #FFFFFF) with subtle shadow.'
      : 'Background: neutral gray (#EDEDED to #F2F2F2) with subtle shadow.';

  const notesBlock = productNotes
    ? `\nPRODUCT NOTES FROM OWNER: ${productNotes}`
    : '';

  // Prompt estruturado: preservação ANTES da edição (Gemini dá mais peso ao início)
  const editPrompt = `PRODUCT IDENTITY PRESERVATION — ABSOLUTE REQUIREMENT:
You are making a SURGICAL, MINIMAL edit to this product photo. The product's visual identity MUST remain PIXEL-IDENTICAL except for the ONE specific change requested below.

PRESERVE EXACTLY AS-IS (DO NOT ALTER):
- EXACT product color — the SAME hue, saturation, and brightness. A green product stays the EXACT same shade of green. A blue stays the EXACT same blue. Zero color drift allowed.
- EXACT fabric texture, material appearance, and surface quality
- EXACT logos, text, embroidery, prints — same font, position, size, and colors
- EXACT stitching, seams, hardware (buttons, zippers, rivets)
- EXACT camera angle, framing, and composition
- EXACT lighting setup, shadows, and reflections on the product
- ${bgInstruction}

Product: ${productName} (${productCategory}), angle: ${angle || 'front'}.${notesBlock}

REQUESTED EDIT — apply ONLY this change, NOTHING else:
"${correctionPrompt}"

CRITICAL RULES:
1. Change ONLY what the user explicitly asked for. Every other pixel stays identical.
2. Do NOT "reinterpret" or "enhance" the product. This is precision editing, not creative generation.
3. If asked to change a logo, text, or detail — change ONLY that element. The product color, shape, and all other details remain untouched.
4. The output must look like the same photo with a minimal, targeted edit — NOT a newly generated image.`;

  // ── 3. Montar parts ────────────────────────────────────
  const parts = [
    { inline_data: { mime_type: imgMimeType, data: imgBase64 } }
  ];

  if (referenceBase64 && referenceBase64 !== 'null' && referenceBase64.length > 100) {
    const cleanRef = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
    parts.push({ inline_data: { mime_type: 'image/png', data: cleanRef } });
    parts.push({ text: 'The second image is a visual reference for the edit. Use it to guide shape, position, or detail — but preserve the original product colors exactly.' });
  }

  parts.push({ text: editPrompt });

  // ── 4. Chamar Gemini (com retry) ───────────────────────
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.2,
      imageConfig: { aspectRatio: '9:16', imageSize: resolution }
    }
  };

  console.log(`🤖 [2/3] Chamando Gemini ${GEMINI_MODEL} (temp=0.2)...`);

  const maxRetries = 3;
  const retryDelays = [0, 8000, 15000];
  let geminiRawResp;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log('⏳ Retry ' + attempt + '/' + (maxRetries - 1) + ' após ' + (retryDelays[attempt] / 1000) + 's...');
      await new Promise(r => setTimeout(r, retryDelays[attempt]));
    }
    geminiRawResp = await this.helpers.httpRequest({
      method: 'POST',
      url: endpoint,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      json: true,
      timeout: 180000,
      returnFullResponse: true,
      ignoreHttpStatusErrors: true
    });
    if (geminiRawResp.statusCode === 200) break;
    if (geminiRawResp.statusCode !== 503 && geminiRawResp.statusCode !== 429) break;
    console.warn('⚠️ Gemini retornou ' + geminiRawResp.statusCode + ' (tentativa ' + (attempt + 1) + '/' + maxRetries + ')');
  }

  if (geminiRawResp.statusCode !== 200) {
    const errBody = typeof geminiRawResp.body === 'string' ? geminiRawResp.body : JSON.stringify(geminiRawResp.body);
    console.error('❌ Gemini erro ' + geminiRawResp.statusCode + ': ' + errBody.substring(0, 2000));
    throw new Error('Gemini API erro (status ' + geminiRawResp.statusCode + '): ' + errBody.substring(0, 500));
  }

  const response = geminiRawResp.body;

  // ── 5. Extrair imagem ──────────────────────────────────
  let outputBase64 = null;
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        outputBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!outputBase64) {
    throw new Error('Gemini não retornou imagem na resposta');
  }
  console.log(`✅ [3/3] Gemini retornou imagem: ${(outputBase64.length / 1024).toFixed(0)} KB base64`);

  // ── 6. Preparar binary data (padrão workflow 18) ───────
  const timestamp = Date.now();
  const storagePath = `${userId}/${productId}/edit_${angle}_${timestamp}.png`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${storagePath}`;

  const binaryData = await this.helpers.prepareBinaryData(
    Buffer.from(outputBase64, 'base64'),
    `edit_${angle}_${timestamp}.png`,
    'image/png'
  );

  console.log(`📦 Imagem preparada para upload: ${storagePath}`);

  return [{
    json: {
      success: true,
      storagePath: storagePath,
      publicUrl: publicUrl
    },
    binary: {
      editedImage: binaryData
    }
  }];

} catch (error) {
  console.error('❌ Studio Edit error:', error.message);
  return [{ json: { success: false, error: error.message || 'Erro ao editar imagem' } }];
}
