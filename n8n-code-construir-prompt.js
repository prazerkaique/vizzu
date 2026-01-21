const product = $('Buscar Produto Modelo IA').item.json;
const prepData = $('Preparar Dados Modelo IA').item.json;
const processedData = $input.first().json;
const binary = $input.first().binary;
const modelProfile = prepData.modelProfile;
const isComposerMode = processedData.isComposerMode;
const lookImages = processedData.lookImages || [];
const orientation = prepData.orientation || 'vertical';

const genderMap = { woman: 'female', man: 'male' };
const ethnicityMap = { caucasian: 'Caucasian', black: 'Black/African', asian: 'East Asian', latino: 'Latino', middleeastern: 'Middle Eastern', mixed: 'Mixed', brazilian: 'Brazilian/Mixed' };
const bodyTypeMap = { slim: 'slim', athletic: 'athletic', average: 'average', curvy: 'curvy', plussize: 'plus size' };
const ageRangeMap = { young: '18-25', adult: '26-35', mature: '36-50', senior: '50+' };

const gender = genderMap[modelProfile.gender] || 'female';
const ethnicity = ethnicityMap[modelProfile.ethnicity] || 'mixed';
const bodyType = bodyTypeMap[modelProfile.bodyType] || 'average';
const ageRange = ageRangeMap[modelProfile.ageRange] || '26-35';

let imageReferences = '';
let composerInstructions = '';

if (isComposerMode && lookImages.length > 0) {
  const pieces = lookImages.map(function(p, i) { return '- IMAGE ' + (i + 2) + ': ' + p.slot.toUpperCase() + ' - ' + p.name; }).join('\n');
  imageReferences = '\n\nIMAGE REFERENCES:\n- IMAGE 1: Main product (HERO piece)\n' + pieces;
  composerInstructions = '\n\nCOMPOSER MODE:\nYou are receiving ' + (1 + lookImages.length) + ' images. Create a complete outfit using ALL pieces.\nEach piece must maintain its EXACT original appearance.';
}

const formatRatio = orientation === 'horizontal' ? '16:9' : '9:16';

const prompt = 'Professional fashion editorial photography.' + imageReferences + '\n\nMODEL: ' + gender + ', ' + ethnicity + ', ' + bodyType + ' body, ' + ageRange + ' years old.' + composerInstructions + '\n\nRULES:\n- Extract EXACT garments from ALL reference images\n- Preserve colors, patterns, textures exactly\n- Full body shot, ' + formatRatio + ' format\n- Clean studio background\n- Professional lighting\n- 8K quality\n\nOUTPUT: Ultra-realistic fashion photo with model wearing ALL garments.';

const parts = [{ text: prompt }];

if (binary.data) {
  const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
  const base64 = buffer.toString('base64');
  parts.push({ inline_data: { mime_type: binary.data.mimeType || 'image/png', data: base64 } });
}

for (let i = 0; i < lookImages.length; i++) {
  const img = lookImages[i];
  const binaryData = binary[img.binaryKey];
  if (binaryData) {
    try {
      const buffer = await this.helpers.getBinaryDataBuffer(0, img.binaryKey);
      const base64 = buffer.toString('base64');
      parts.push({ inline_data: { mime_type: binaryData.mimeType || 'image/png', data: base64 } });
    } catch (e) {
      console.log('Erro ao obter imagem ' + img.binaryKey);
    }
  }
}

return [{
  json: { prompt: prompt, parts: parts, isComposerMode: isComposerMode, totalImages: processedData.totalImages },
  binary: binary
}];
