# DOCUMENTAÇÃO OTIMIZADA GEMINI 3 PRO IMAGE

## Visão Geral

Esta documentação contém informações técnicas e de custos sobre o modelo **gemini-3-pro-image-preview** utilizado no Vizzu para geração de imagens.

---

## Limites Técnicos

### Context Window (Janela de Contexto)
| Tipo | Limite |
|------|--------|
| Input máximo | 1.000.000 tokens |
| Output máximo | 64.000 tokens |

### Limite de Imagens
| Parâmetro | Valor |
|-----------|-------|
| **Máximo de imagens de referência por requisição** | **14 imagens** |

> **IMPORTANTE:** Este é o limite mais crítico para o Vizzu. Qualquer requisição com mais de 14 imagens de input será rejeitada.

---

## Consumo de Tokens por Imagem

O consumo de tokens varia conforme a resolução configurada:

| Resolução | Tokens por Imagem | Uso Recomendado |
|-----------|-------------------|-----------------|
| Low (280px) | 280 tokens | Imagens simples, thumbnails |
| Medium (560px) | 560 tokens | **Padrão recomendado** |
| High (1120px) | 1.120 tokens | Imagens complexas com detalhes |

### Imagens de Output (Geradas)
| Resolução | Tokens |
|-----------|--------|
| 1K-2K (1024-2048px) | 1.120 tokens |
| 4K (até 4096px) | 2.000 tokens |

---

## Tabela de Preços

### Preços por Milhão de Tokens
| Tipo | Preço (USD) |
|------|-------------|
| Input (texto/imagem) | $2.00 / 1M tokens |
| Output (texto) | $12.00 / 1M tokens |
| Output (imagem gerada) | $120.00 / 1M tokens |

### Preços Simplificados por Imagem
| Item | Custo Aproximado |
|------|------------------|
| Imagem de referência (input) | **$0.001** (~R$ 0,006) |
| Imagem gerada 1K-2K | **$0.13** (~R$ 0,78) |
| Imagem gerada 4K | **$0.24** (~R$ 1,44) |

### Batch API (50% de desconto)
Para workloads que toleram até 24h de processamento:
| Item | Custo |
|------|-------|
| Input | $1.00 / 1M tokens |
| Output imagem | $0.067 - $0.12 por imagem |

---

## Cenários de Uso no Vizzu

### Cenário 1: Look Composer Completo (Máximo)
Composição com todos os slots preenchidos:

| Item | Imagens |
|------|---------|
| Produto principal (frente + costas + detalhe) | 3 |
| 5 produtos adicionais (frente + costas) | 10 |
| Foto do modelo | 1 |
| **Total** | **14** ✅ |

**Custo estimado:**
- Input: 14 × $0.001 = $0.014
- Output 2K: $0.13
- **Total: ~$0.14 (R$ 0,84)**

### Cenário 2: Look Simples
Composição básica:

| Item | Imagens |
|------|---------|
| Produto principal (frente + detalhe) | 2 |
| 2 produtos adicionais (frente) | 2 |
| Foto do modelo | 1 |
| **Total** | **5** ✅ |

**Custo estimado:**
- Input: 5 × $0.001 = $0.005
- Output 2K: $0.13
- **Total: ~$0.135 (R$ 0,81)**

### Cenário 3: Product Studio (Apenas Produto)
Geração de foto de produto isolado:

| Item | Imagens |
|------|---------|
| Produto (frente + detalhe) | 2 |
| **Total** | **2** ✅ |

**Custo estimado:**
- Input: 2 × $0.001 = $0.002
- Output 2K: $0.13
- **Total: ~$0.132 (R$ 0,79)**

---

## Regras de Negócio para o Vizzu

### Limite de Imagens por Funcionalidade

| Funcionalidade | Máx. Produtos | Imagens por Produto | Modelo | Total Máx. |
|----------------|---------------|---------------------|--------|------------|
| Product Studio | 1 | 3 (frente+costas+detalhe) | 0 | 3 |
| Look Composer | 6 | 2-3 | 1 | 14 |
| Provador | 6 | 2-3 | 1 (cliente) | 14 |
| Cenário Criativo | 6 | 2-3 | 1 | 14 |

### Prioridade de Imagens (quando atingir limite)
1. Foto do modelo (obrigatória)
2. Produto principal - frente (obrigatória)
3. Produto principal - detalhe (se houver logo/detalhe importante)
4. Produto principal - costas
5. Produtos adicionais - frente
6. Produtos adicionais - costas
7. Produtos adicionais - detalhe (menor prioridade)

---

## Boas Práticas

### Para Melhor Qualidade de Logos e Detalhes
1. **Sempre envie imagem de detalhe** quando o produto tiver logo ou estampa
2. **Zoom adequado** - A imagem de detalhe deve ter o logo/detalhe ocupando pelo menos 50% do frame
3. **Boa iluminação** - Evite sombras sobre o logo
4. **Fundo neutro** - Facilita a identificação do detalhe pela IA

### Para Otimização de Custos
1. Use resolução **Medium (560 tokens)** para imagens de referência
2. Gere imagens em **2K** quando 4K não for necessário
3. Considere **Batch API** para gerações em massa (50% mais barato)

---

## Troubleshooting

### Erro: "Too many images"
**Causa:** Mais de 14 imagens enviadas na requisição.
**Solução:** Remover imagens de menor prioridade (costas e detalhes de produtos secundários).

### Logo saindo diferente/alucinado
**Causa:** Falta de imagem de detalhe ou imagem de baixa qualidade.
**Solução:**
1. Adicionar imagem de detalhe com zoom no logo
2. Garantir que o logo está nítido e bem iluminado
3. Incluir no prompt: "manter logo exatamente como na imagem de referência"

### Custo acima do esperado
**Causa:** Muitas gerações em 4K ou muitas imagens de input.
**Solução:**
1. Usar 2K quando possível
2. Limitar imagens de detalhe apenas para produtos com logo
3. Considerar Batch API para volumes grandes

---

## Referências

- [Gemini 3 Pro Image - Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Media Resolution Guide](https://ai.google.dev/gemini-api/docs/media-resolution)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)

---

*Última atualização: Janeiro 2026*
