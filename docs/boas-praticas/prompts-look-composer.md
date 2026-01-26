# Boas Práticas: Prompts do Look Composer

> Documentação técnica para construção de prompts de geração de imagens de moda com IA.

---

## Índice

1. [Custos por Geração](#custos-por-geração)
2. [Estrutura do Prompt](#estrutura-do-prompt)
3. [Componentes Obrigatórios](#componentes-obrigatórios)
4. [Hierarquia de Referências](#hierarquia-de-referências)
5. [Enquadramento Dinâmico](#enquadramento-dinâmico)
6. [Atributos de Produto](#atributos-de-produto)
7. [Configurações de Modelo](#configurações-de-modelo)
8. [Backgrounds](#backgrounds)
9. [Exemplos Completos](#exemplos-completos)
10. [Erros Comuns](#erros-comuns)

---

## Custos por Geração

> **Referência de custo: R$ 6,00 por geração**

### Breakdown de custos (Kie.ai - Nano Banana Pro)

| Item | Custo USD | Custo BRL (≈) |
|------|-----------|---------------|
| 1 geração (2K, thinking_level: low) | ~$0.13 | ~R$ 0,80 |
| **Custo total estimado por geração** | - | **~R$ 6,00** |

### Fatores que afetam o custo:

| Configuração | Impacto no Custo |
|--------------|------------------|
| Resolução 2K vs 4K | 2K = mesmo custo, mais rápido |
| thinking_level: low vs high | low = mesmo custo, 20-30% mais rápido |
| Múltiplas imagens de referência | Sem impacto significativo |
| Tamanho do prompt | Sem impacto significativo |

### Custo por tipo de geração:

| Tipo | Créditos Vizzu | Custo Real |
|------|----------------|------------|
| Imagem simples (1 peça) | 1 crédito | R$ 6,00 |
| Look Composer (múltiplas peças) | 2 créditos | R$ 12,00 |
| Frente + Costas | 2x créditos | R$ 12,00 - R$ 24,00 |

### Otimização de custos:

1. **Usar resolução 2K** - Qualidade suficiente para web/social, mesmo custo
2. **thinking_level: low** - Mais rápido, sem perda de qualidade para prompts bem escritos
3. **Prompts específicos** - Menos retrabalho = menos gerações desperdiçadas
4. **Atributos detalhados** - Evita erros de interpretação (calça vs bermuda)

### Cálculo de margem:

```
Preço cobrado do cliente: X créditos
Custo real por crédito: R$ 6,00
Margem = Preço cobrado - (X × R$ 6,00)
```

---

## Estrutura do Prompt

O prompt é composto por blocos ordenados por importância:

```
[TIPO DE FOTO] + [DESCRIÇÃO DO MODELO] + [POSE] + [BACKGROUND] + [PRODUTO] + [ESPECIFICAÇÕES] + [QUALIDADE]
```

### Exemplo de prompt completo:

```
Professional fashion photo, three-quarter shot.
A female Brazilian fashion model in their mid-20s with an athletic physique,
standing naturally with confident posture,
in a clean professional studio with neutral gray background.
Wearing Camisa Bangu.
GARMENT SPECIFICATIONS: fit: regular, length: standard, type: t-shirt.
The garment must match exactly the reference image - same colors, patterns, fit, texture.
Photorealistic, magazine-quality.
```

---

## Componentes Obrigatórios

### 1. Tipo de Foto (Framing)
Define o enquadramento da imagem.

| Termo | Uso | Quando usar |
|-------|-----|-------------|
| `full body shot` | Corpo inteiro | Look completo (top + bottom + shoes) |
| `three-quarter shot` | 3/4 do corpo | Sem tênis |
| `upper body shot` | Cintura pra cima | Só parte de cima |
| `lower body shot` | Cintura pra baixo | Só calça + tênis |
| `portrait shot` | Rosto/busto | Acessórios (boné, óculos) |

### 2. Descrição do Modelo
Características físicas da modelo.

```javascript
// Estrutura
const modelDescription = `A ${gender} ${ethnicity} fashion model in their ${ageRange} with a ${bodyType} physique`;

// Valores possíveis
gender: 'female' | 'male'
ethnicity: 'Brazilian' | 'Caucasian' | 'Black' | 'Asian' | 'Latin' | 'Mixed'
ageRange: 'young' | 'mid-20s' | 'adult' | 'mature'
bodyType: 'slim' | 'athletic' | 'average' | 'curvy'
```

### 3. Pose
Postura e posição do modelo.

```javascript
// Default
let poseDescription = 'standing naturally, confident posture';

// Customizado
if (posePrompt) poseDescription = posePrompt;
```

**Exemplos de poses:**
- `standing naturally, confident posture` (padrão)
- `walking pose, one foot forward`
- `hands on hips, looking at camera`
- `casual pose, leaning slightly`
- `dynamic pose, movement suggested`

### 4. Background
Cenário de fundo da foto.

```javascript
// Ordem de prioridade
if (sceneHint) background = sceneHint;           // Cenário específico
else if (solidColor) background = `solid ${solidColor} background`;  // Cor sólida
else if (backgroundPrompt) background = backgroundPrompt;  // Prompt customizado
else background = 'clean professional studio with neutral gray background';  // Default
```

**Exemplos:**
- `clean professional studio with neutral gray background`
- `urban street with graffiti walls`
- `beach at sunset`
- `solid #FFFFFF background`
- `minimalist white cyclorama`

### 5. Produto
Nome e descrição do produto principal.

```javascript
// Prioridade de fonte
const productDesc = prepData.productDescription  // Do frontend
  || product.name                                 // Do Supabase
  || prepData.productCategory                     // Categoria
  || 'fashion garment';                          // Fallback
```

### 6. Especificações do Produto
Atributos que ajudam a IA a interpretar corretamente a imagem.

```javascript
// Exemplo
const specs = {
  fit: 'oversized',      // regular, slim, oversized, relaxed
  length: 'long',        // short, standard, long, cropped
  type: 'pants',         // t-shirt, pants, shorts, dress, jacket
  material: 'denim',     // cotton, denim, silk, leather
  style: 'casual'        // casual, formal, streetwear, athletic
};
```

**Por que isso é importante:**
- Imagem pode ser ambígua (calça vs bermuda)
- Especificações servem como "desempate"
- IA usa como contexto para interpretar a referência visual

### 7. Qualidade
Termos que garantem alta qualidade na saída.

```
Photorealistic, magazine-quality.
```

**Outros termos úteis:**
- `high-end fashion photography`
- `professional lighting`
- `sharp focus`
- `8K resolution`

---

## Hierarquia de Referências

A IA recebe múltiplas imagens. A ordem importa:

```javascript
const imageInputs = [
  imageUrl,                    // 1. Produto principal (SEMPRE PRIMEIRO)
  ...lookImageUrls,            // 2. Itens do look (boné, calça, etc.)
  modelReferenceUrl,           // 3. Modelo de referência (consistência)
  customBackgroundUrl          // 4. Fundo customizado (se houver)
];
```

### Peso das referências:

| Posição | Tipo | Peso | Propósito |
|---------|------|------|-----------|
| 1 | Produto principal | Alto | A peça que deve aparecer fielmente |
| 2 | Itens do look | Alto | Composição do outfit |
| 3 | Modelo referência | Médio | Manter consistência facial/corporal |
| 4 | Background | Baixo | Contexto visual do cenário |

---

## Enquadramento Dinâmico

O enquadramento deve ser calculado baseado nos itens presentes no look.

### Lógica de detecção:

```javascript
// Detectar slots preenchidos
const slots = lookItems.map(item => item.slot.toLowerCase());

const hasTop = slots.some(s => ['top', 'camiseta', 'camisa', 'blusa', 'jaqueta'].includes(s));
const hasBottom = slots.some(s => ['bottom', 'calca', 'shorts', 'saia'].includes(s));
const hasShoes = slots.some(s => ['shoes', 'tenis', 'sapato', 'sandalia'].includes(s));
const hasHead = slots.some(s => ['hat', 'bone', 'chapeu', 'glasses', 'oculos'].includes(s));

// Determinar framing
let framing;
if (hasHead && !hasTop && !hasBottom) {
  framing = 'portrait shot, head and shoulders';
} else if (!hasShoes && hasTop && hasBottom) {
  framing = 'three-quarter shot, cut at ankles';
} else if (!hasTop && hasBottom && hasShoes) {
  framing = 'lower body shot from waist down';
} else if (hasTop && !hasBottom && !hasShoes) {
  framing = 'upper body shot from waist up';
} else {
  framing = 'full body shot';
}
```

### Tabela de decisão:

| Top | Bottom | Shoes | Head | Framing |
|-----|--------|-------|------|---------|
| ✓ | ✓ | ✓ | - | Full body |
| ✓ | ✓ | - | - | Three-quarter |
| - | ✓ | ✓ | - | Lower body |
| ✓ | - | - | - | Upper body |
| - | - | - | ✓ | Portrait |

---

## Atributos de Produto

Atributos específicos que ajudam na interpretação correta.

### Atributos comuns por categoria:

**Camisetas/Tops:**
```javascript
{
  fit: 'regular' | 'slim' | 'oversized' | 'cropped',
  neckline: 'crew' | 'v-neck' | 'polo' | 'henley',
  sleeves: 'short' | 'long' | 'sleeveless' | '3/4',
  material: 'cotton' | 'polyester' | 'linen' | 'silk'
}
```

**Calças/Bottoms:**
```javascript
{
  fit: 'skinny' | 'regular' | 'relaxed' | 'wide-leg',
  rise: 'low' | 'mid' | 'high',
  length: 'cropped' | 'ankle' | 'full' | 'long',
  type: 'jeans' | 'chinos' | 'joggers' | 'dress-pants'
}
```

**Vestidos:**
```javascript
{
  length: 'mini' | 'midi' | 'maxi',
  fit: 'bodycon' | 'a-line' | 'shift' | 'wrap',
  neckline: 'round' | 'v-neck' | 'square' | 'halter',
  sleeves: 'sleeveless' | 'short' | 'long' | 'puff'
}
```

### Como incluir no prompt:

```javascript
// Converter atributos para texto
const specsText = Object.entries(productAttributes)
  .filter(([key, value]) => value)
  .map(([key, value]) => `${key}: ${value}`)
  .join(', ');

// Adicionar ao prompt
const prompt = `...Wearing ${productDesc}.
GARMENT SPECIFICATIONS: ${specsText}.
The garment must match exactly the reference image...`;
```

---

## Configurações de Modelo

### Consistência do Modelo

Para manter a mesma modelo em múltiplas gerações:

```javascript
// IMPORTANTE: Enviar URL da imagem de referência do modelo
const imageInputs = [
  productImageUrl,
  ...lookImageUrls,
  modelReferenceUrl  // URL da modelo salva/gerada anteriormente
];
```

**Sem isso:** Cada geração cria uma modelo diferente.
**Com isso:** IA usa a imagem como referência para manter características faciais e corporais.

### Perfil do Modelo

```javascript
const modelProfile = {
  gender: 'woman',        // 'woman' | 'man'
  ethnicity: 'brazilian', // 'caucasian' | 'black' | 'asian' | 'latin' | 'brazilian' | 'mixed'
  bodyType: 'athletic',   // 'slim' | 'athletic' | 'average' | 'curvy'
  ageRange: 'mid-20s'     // 'young' | 'mid-20s' | 'adult' | 'mature'
};
```

---

## Backgrounds

### Tipos disponíveis:

| Tipo | Parâmetro | Exemplo |
|------|-----------|---------|
| Studio | `backgroundType: 'studio'` | Fundo neutro profissional |
| Cor sólida | `solidColor: '#FFFFFF'` | Fundo branco puro |
| Cenário | `sceneHint: 'urban street'` | Cenário específico |
| Prompt | `backgroundPrompt: 'beach at golden hour'` | Gerado por IA |
| Custom | `customBackgroundUrl: 'https://...'` | Imagem enviada |

### Prioridade:

```
1. sceneHint (mais específico)
2. solidColor (cor definida)
3. backgroundPrompt (gerado)
4. customBackgroundUrl (imagem)
5. Default: studio neutro
```

---

## Exemplos Completos

### Exemplo 1: Look completo streetwear

**Inputs:**
- Top: Camiseta oversized preta
- Bottom: Calça cargo bege
- Shoes: Tênis branco
- Modelo: Mulher brasileira, atlética, mid-20s

**Prompt gerado:**
```
Professional fashion photo, full body shot.
A female Brazilian fashion model in their mid-20s with an athletic physique,
standing naturally with confident posture,
in a clean professional studio with neutral gray background.
Wearing Camiseta Oversized Preta.
GARMENT SPECIFICATIONS: fit: oversized, color: black, type: t-shirt.
The garment must match exactly the reference image - same colors, patterns, fit, texture.
Photorealistic, magazine-quality.
```

### Exemplo 2: Acessórios (boné + óculos)

**Inputs:**
- Hat: Boné New Era
- Glasses: Óculos de sol
- Modelo: Homem, mid-20s, atlético

**Prompt gerado:**
```
Professional fashion photo, portrait shot, head and shoulders.
A male Brazilian fashion model in their mid-20s with an athletic physique,
looking at camera with confident expression,
in a clean professional studio with neutral gray background.
Wearing Boné New Era and Óculos de Sol.
Accessories must match exactly the reference images - same colors, logos, shapes.
Photorealistic, magazine-quality.
```

### Exemplo 3: Calça + Tênis (sem top)

**Inputs:**
- Bottom: Calça jeans skinny
- Shoes: Tênis Nike
- Background: Urban street

**Prompt gerado:**
```
Professional fashion photo, lower body shot from waist down.
A female Brazilian fashion model in their mid-20s with an athletic physique,
standing naturally,
in an urban street with graffiti walls.
Wearing Calça Jeans Skinny.
GARMENT SPECIFICATIONS: fit: skinny, length: full, type: jeans.
The garment must match exactly the reference image - same colors, patterns, fit, texture.
Photorealistic, magazine-quality.
```

---

## Erros Comuns

### 1. Não enviar imagem de referência do modelo
**Problema:** Modelo diferente a cada geração.
**Solução:** Incluir `modelReferenceUrl` no array de imagens.

### 2. Usar productCategory ao invés de productDescription
**Problema:** Prompt diz "Wearing Camisetas" ao invés de "Wearing Camisa Bangu".
**Solução:** Priorizar `productDescription` do frontend.

### 3. Não especificar atributos ambíguos
**Problema:** IA gera bermuda quando era calça curta.
**Solução:** Incluir especificações como `length: cropped, type: pants`.

### 4. Enquadramento fixo para todos os looks
**Problema:** Full body shot para look de boné e óculos (corpo vazio).
**Solução:** Calcular enquadramento dinâmico baseado nos slots.

### 5. Ordem errada das imagens de referência
**Problema:** IA dá mais peso ao fundo que ao produto.
**Solução:** Produto principal sempre primeiro no array.

### 6. Prompt genérico demais
**Problema:** "Generate a fashion photo" - resultado imprevisível.
**Solução:** Ser específico em cada componente do prompt.

---

## Checklist de Prompt

Antes de enviar para a API, verificar:

- [ ] Tipo de foto definido (full body, portrait, etc.)
- [ ] Descrição do modelo completa (gênero, etnia, corpo, idade)
- [ ] Pose especificada
- [ ] Background definido
- [ ] Nome do produto correto (não categoria)
- [ ] Atributos de produto incluídos
- [ ] Termos de qualidade presentes
- [ ] Imagem de referência do modelo incluída (se disponível)
- [ ] Ordem das imagens correta (produto primeiro)
- [ ] Enquadramento adequado aos itens do look

---

## Referências

- [Kie.ai API Documentation](https://docs.kie.ai)
- [Nano Banana Pro Speed Optimization](https://www.aifreeapi.com/en/posts/nano-banana-pro-speed-optimization)
- Workflow: `/n8n/kie-nanobanana-pro.json`
- Frontend: `/src/lib/api/studio.ts`

---

*Última atualização: Janeiro 2026*
