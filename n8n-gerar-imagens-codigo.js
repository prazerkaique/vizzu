const inputData = $input.first().json;
const { prompts, modelId, userId, isValidUuid, logoUrl } = inputData;

const apiKey = "AIzaSyAjxVPQvFgFqFxmI4_MlHB8jeTAxvuIPNM";
const model = "gemini-2.0-flash-exp-image-generation";
const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

const sleep = function(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); };

var logoBase64 = null;
if (logoUrl) {
  try {
    console.log("Buscando logo:", logoUrl);
    const logoResponse = await this.helpers.httpRequest({
      method: "GET",
      url: logoUrl,
      encoding: "arraybuffer",
      returnFullResponse: true
    });
    logoBase64 = Buffer.from(logoResponse.body).toString("base64");
    console.log("Logo carregado com sucesso");
  } catch (error) {
    console.log("Erro ao carregar logo:", error.message);
  }
}

async function generateImage(prompt, angle, referenceImage, includeLogo) {
  console.log("Gerando " + angle + "...");

  var parts = [];

  if (referenceImage) {
    parts.push({
      inlineData: {
        mimeType: referenceImage.mimeType,
        data: referenceImage.data
      }
    });

    if (angle === "back") {
      parts.push({ text: "This is a photo of a fashion model. Generate the SAME EXACT person from behind (back view). Keep the same body type, skin tone, hair color, hair style, and all physical characteristics. The model should be wearing the same neutral clothing. " + prompt });
    } else if (angle === "face") {
      parts.push({ text: "This is a photo of a fashion model. Generate a close-up headshot portrait of the SAME EXACT person showing face and shoulders. Keep the same face, skin tone, hair color, hair style, eye color, and all facial features exactly the same. Professional portrait photography style. " + prompt });
    }
  } else if (includeLogo && logoBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: logoBase64
      }
    });
    parts.push({ text: "Use this logo image to print on the t-shirt chest area of the model: " + prompt });
  } else {
    parts.push({ text: prompt });
  }

  var payload = {
    contents: [{ role: "user", parts: parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 1.0 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var response = await this.helpers.httpRequest({
        method: "POST",
        url: endpoint,
        headers: { "Content-Type": "application/json" },
        body: payload,
        json: true,
        timeout: 300000,
        ignoreHttpStatusErrors: true
      });

      console.log("Resposta " + angle + " attempt " + attempt + ":", JSON.stringify(response).substring(0, 500));

      if (response.error && response.error.code === 503) {
        if (attempt < 3) await sleep(attempt * 5000);
        continue;
      }
      if (response.error) throw new Error(JSON.stringify(response.error));

      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (var i = 0; i < response.candidates[0].content.parts.length; i++) {
          var part = response.candidates[0].content.parts[i];
          if (part.inlineData && part.inlineData.data) {
            return {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || "image/png"
            };
          }
        }
      }

      console.log("Sem imagem na resposta para " + angle + ", tentativa " + attempt);
      if (attempt < 3) {
        await sleep(attempt * 3000);
      }
    } catch (error) {
      console.log("Erro " + angle + " attempt " + attempt + ":", error.message);
      if (attempt === 3) throw error;
      await sleep(attempt * 5000);
    }
  }

  throw new Error("Sem imagem apos 3 tentativas para " + angle);
}

async function generateImageWithFallback(prompt, angle, referenceImage, includeLogo) {
  try {
    return await generateImage.call(this, prompt, angle, referenceImage, includeLogo);
  } catch (error) {
    console.log("Falha com referencia para " + angle + ", tentando sem referencia...");
    if (referenceImage) {
      return await generateImage.call(this, prompt, angle, null, includeLogo);
    }
    throw error;
  }
}

var images = {};

console.log("=== PASSO 1: Gerando imagem FRONTAL (referencia) ===");
images.front = await generateImageWithFallback.call(this, prompts.front, "front", null, true);
await sleep(2000);

console.log("=== PASSO 2: Gerando imagem COSTAS (baseado na frontal) ===");
images.back = await generateImageWithFallback.call(this, prompts.back, "back", images.front, false);
await sleep(2000);

console.log("=== PASSO 3: Gerando imagem ROSTO (baseado na frontal) ===");
images.face = await generateImageWithFallback.call(this, prompts.face, "face", images.front, false);

return [{
  json: {
    modelId: modelId,
    userId: userId,
    isValidUuid: isValidUuid,
    mimeTypes: {
      front: images.front.mimeType,
      back: images.back.mimeType,
      face: images.face.mimeType
    }
  },
  binary: {
    front: { data: images.front.data, mimeType: images.front.mimeType, fileName: "front.png" },
    back: { data: images.back.data, mimeType: images.back.mimeType, fileName: "back.png" },
    face: { data: images.face.data, mimeType: images.face.mimeType, fileName: "face.png" }
  }
}];
