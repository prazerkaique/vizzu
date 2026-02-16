# VIZZU — Analise Comercial Completa de Features

> Documento gerado a partir de varredura completa do codigo-fonte.
> Objetivo: servir de base para pagina de vendas, materiais comerciais e pitch.

---

## RESUMO EXECUTIVO

O Vizzu e um SaaS de geracao de imagens por IA voltado para **e-commerce de moda brasileiro**. Transforma uma unica foto de produto em um catalogo profissional completo — fotos de estudio, looks com modelo IA, composicoes editoriais e provador virtual com envio por WhatsApp.

**5 features principais:**
1. **Vizzu Product Studio** — Fotos profissionais multi-angulo
2. **Vizzu Look Composer** — Looks completos com modelo IA customizavel
3. **Vizzu Still Criativo** — Composicoes editoriais/lifestyle
4. **Vizzu Provador** — Provador virtual + WhatsApp com precos
5. **Gestao Completa** — Produtos, clientes, creditos, download multi-formato

---

## 1. VIZZU PRODUCT STUDIO

### O que faz
Gera **fotos profissionais de estudio em multiplos angulos** a partir de uma unica foto do produto. Sem modelo, sem fotografo, sem estudio fisico.

### Angulos gerados por categoria

| Categoria | Angulos disponiveis |
|-----------|-------------------|
| **Roupas** | Frente, Costas, Detalhe Frente, Detalhe Costas, Dobrada |
| **Calcados** | Frente, Par Traseira, Lateral, Par Superior, Sola |
| **Bones/Chapeus** | Frente, Traseira, Lateral, Vista Superior, Detalhe |
| **Bolsas** | Frente, Traseira, Lateral, Vista Superior, Detalhe, Detalhe Frente |
| **Acessorios/Joias** | Frente, Tras, Lateral Esq., Lateral Dir., Detalhe |

### Estilos de apresentacao (roupas)

- **Ghost Mannequin** — Produto em manequim invisivel (mostra caimento e volume 3D)
- **Flat Lay** — Produto sobre superficie (visao de cima)
  - Acabamento Natural (rugas e textura realistas)
  - Acabamento Prensado (liso, sem rugas)

### Opcoes de estudio

- **Fundo**: Cinza neutro ou Branco limpo
- **Sombra**: Com sombra suave natural ou Sem sombra (fundo 100% limpo)
- **Resolucao**: 2K (padrao) ou 4K (planos Pro+)

### Diferenciais

- Gera ate **6 angulos em uma unica sessao**
- **Polling incremental** — cada angulo aparece na tela conforme fica pronto
- **Retry individual** — se 1 angulo falhar, regenera so ele (sem pagar os outros)
- **Imagem de referencia** — pode enviar foto traseira/lateral real para melhorar resultado
- **Notas do produto** — descrever detalhes estruturais (ziper, logo, botoes) para IA replicar
- **Edicao pos-geracao** — corrigir com prompt de texto ou nova referencia
- **Sobrevive F5** — se recarregar a pagina durante geracao, retoma automaticamente
- **Comparacao antes/depois** — toggle original vs gerado

### Custo
- 1 credito por angulo (2K)
- 2 creditos por angulo (4K)
- Exemplo: 5 angulos em 2K = 5 creditos

---

## 2. VIZZU LOOK COMPOSER

### O que faz
Cria **looks completos com modelo IA** vestindo ate 6 pecas do catalogo. O modelo e totalmente customizavel.

### Customizacao do modelo IA

| Caracteristica | Opcoes |
|---------------|--------|
| Genero | Feminino, Masculino |
| Etnia | Caucasiana, Negra, Asiatica, Latina, Brasileira, Mista |
| Tom de pele | Clara, Media, Morena, Escura |
| Tipo de corpo | Magro, Atletico, Medio, Curvilinea, Plus Size |
| Faixa etaria | Teen, Jovem, Adulto, Maduro, Senior, 60+ |
| Altura | Baixa, Media, Alta |
| Cor do cabelo | Preto, Castanho, Loiro, Ruivo, Grisalho, Branco |
| Tipo de cabelo | Liso, Ondulado, Cacheado, Crespo |
| Comprimento | Careca, Muito curto, Curto, Medio, Longo, Muito longo |
| Cor dos olhos | Castanhos, Pretos, Azuis, Verdes, Mel |
| Expressao | Sorriso natural, Sorriso aberto, Seria, Neutra, Confiante |
| Busto (fem.) | Pequeno, Medio, Grande |
| Cintura (fem.) | Fina, Media, Larga |

> Modelos podem ser **salvos e reutilizados** em quantos looks quiser.
> Limite por plano: Basic=3, Pro=10, Premier=20 modelos salvos.

### Composicao do look (6 slots)

| Slot | Exemplos |
|------|----------|
| Cabeca | Bones, chapeus, tiaras, lencos |
| Parte de Cima | Camisetas, blusas, jaquetas, blazers, bodies, moletons |
| Parte de Baixo | Calcas, shorts, saias, leggings |
| Calcados | Tenis, sandalias, botas, sapatos |
| Acessorio 1 | Bolsas, cintos, relogios, oculos |
| Acessorio 2 | Colares, brincos, pulseiras, aneis |

> **Deteccao inteligente**: vestidos/macacoes preenchem top+bottom automaticamente e mostram apenas 1x.

### Opcoes de fundo

- Cor solida customizavel (color picker)
- Estudio fotografico (branco profissional)
- Fundos pre-definidos: Jardim, Sala minimalista, Trilha na montanha, Rua urbana, Estacao de metro
- Upload de foto propria
- Geracao por prompt (descrever cenario)
- Fundos salvos (reutilizaveis)

### Opcoes de pose

- Modo Padrao — pose neutra otimizada
- Modo Custom — prompt livre (ex: "sentada em sofa casual", "em movimento dancando")

### Angulos de geracao

- Frente apenas (1 credito)
- Frente + Costas (2 creditos)
- Enquadramento dinamico por categoria (full-body, upper-half, lower-half, face)

### Diferenciais

- Modelo IA **totalmente personalizavel** com 15+ atributos
- **Representatividade real** — todos os tipos de corpo, etnias e idades
- Modelos salvos para **consistencia visual** entre looks
- Edicao inline pos-geracao com Gemini
- Zoom com hover (desktop)
- Download em multiplos formatos + ZIP
- Integracao com Provador WhatsApp (enviar look com precos)

### Custo
- 1 credito por angulo (2K)
- 2 creditos por angulo (4K)
- Edicao: 1 credito (2K) ou 2 creditos (4K)

---

## 3. VIZZU STILL CRIATIVO

### O que faz
Gera **composicoes estilizadas tipo editorial/lifestyle** — flat lay, fotos de campanha, conteudo para redes sociais. O produto e o hero da cena.

### Sistema de composicao com @ Mentions

O editor tem um sistema de **@ mentions** que permite referenciar elementos no prompt:
- `@frente`, `@costas`, `@detalhe` — angulos do produto
- `@ref1`, `@ref2`, `@ref3`, `@ref4` — ate 4 imagens de referencia visual
- `@produto1`, `@produto2` — outros produtos do catalogo na cena

**Exemplo de prompt:**
> "Produto `@frente` em primeiro plano sobre mesa de madeira rustica. Use inspiracao de `@ref1` para iluminacao quente. Adicione `@produto2` (lenco) ao fundo desfocado. Estilo editorial Vogue."

### Formatos de frame

| Formato | Uso ideal |
|---------|-----------|
| 1:1 | Feed Instagram, catalogo |
| 4:5 | Feed vertical, Reels preview |
| 9:16 | Stories, Reels, TikTok |
| 16:9 | Banner, website, desktop |

### Referências visuais

- Upload de ate **4 imagens de referencia**
- Usadas para inspirar estilo, iluminacao, composicao
- Referenciadas no prompt via `@ref1`, `@ref2`, etc.

### Otimizador de prompt IA

- Botao que envia prompt para Gemini otimizar estrutura
- Resultado: prompt estruturado com secoes (identidade, fotografia, composicao, angulos)
- Melhora drasticamente a qualidade do resultado

### Tipos de composicao possiveis

| Estilo | Descricao | Exemplo |
|--------|-----------|---------|
| Flat Lay | Produto de cima, contexto ao redor | Bolsa com acessorios combinando |
| Lifestyle | Produto em contexto real | Tenis em rua urbana com grafite |
| Minimalista | Produto isolado, fundo limpo | Vestido sobre fundo branco com sombra suave |
| Tematico | Decoracoes + mood | Blusa verao com flores e elementos praia |
| Volumetrico | Multiplas pecas na composicao | 3 camisetas empilhadas com logo visivel |
| Editorial | Estilo revista de moda | Produto em cenario premium com props |

### Diferenciais

- **@ Mentions inteligentes** — composicao rica via prompt
- **Multiplas variacoes** por geracao (1 por angulo selecionado)
- **4 formatos prontos** para cada rede social
- **Referências visuais** para guiar estilo e mood
- **Otimizador IA** para melhorar prompts automaticamente
- Edicao inline pos-geracao
- Prioriza imagens do Product Studio (badge "PS Otimizada")

### Custo
- 1 credito por variacao (2K)
- 2 creditos por variacao (4K)
- Exemplo: 3 angulos em 4K = 6 creditos

---

## 4. VIZZU PROVADOR

### O que faz
**Provador virtual** que coloca roupas do catalogo em fotos reais de clientes e envia o resultado por WhatsApp com precos — direto para fechar venda.

### Fluxo do wizard (4 passos)

1. **Selecionar cliente** — cadastrado com foto (frente/costas/rosto)
2. **Escolher foto** — tipo de foto para usar na geracao
3. **Montar look** — selecionar pecas nos 6 slots (mesmo compositor do Look Composer)
4. **Gerar e enviar** — visualizar resultado, customizar mensagem, enviar WhatsApp

### Gestao de clientes

| Campo | Descricao |
|-------|-----------|
| Nome completo | Obrigatorio |
| WhatsApp | Obrigatorio (formatacao automatica) |
| Email | Opcional |
| Genero | Masculino/Feminino |
| Fotos | Frente, Costas, Rosto (suporte HEIC) |
| Status | Ativo, Inativo, VIP |
| Tags | Organizacao livre |
| Notas | Observacoes do vendedor |

### Card de perfil do cliente

- Avatar + nome + WhatsApp + badges de status
- Galeria de todos os looks gerados (cards horizontais com itens + precos)
- Botao WhatsApp por look (reenvia com 1 clique)
- Botao "Ir para Vizzu Provador" (gradiente coral-laranja)

### Mensagem WhatsApp formatada

```
Oi Maria!

Montei esse look especial pra voce:

🧢 Bone Nike — R$ 89,90
👕 Camiseta Branca — R$ 49,90
👖 Calca Jeans — R$ 129,90
👟 Tenis Branco — R$ 199,90
💼 Bolsa Couro — R$ 299,90

Total do look: R$ 769,50
```

### Canais de envio (3 tiers automaticos)

1. **Evolution API** — envio direto nativo (melhor experiencia)
2. **Web Share API** — compartilhar nativo do celular (fallback)
3. **wa.me link** — abre WhatsApp com mensagem pre-preenchida (fallback final)

### Diferenciais

- **Prova virtual em foto REAL do cliente** (nao em modelo generico)
- **WhatsApp integrado** com precos atualizados em tempo real
- **Fotos do Product Studio** enviadas junto com o look
- **Historico de looks por cliente** com reenvio rapido
- **Gerador de mensagem IA** para textos criativos
- **Antes/Depois** — toggle foto original vs look gerado
- Auto-save do look gerado (nao perde se fechar app)

### Custo
- 1 credito (2K) ou 2 creditos (4K)

---

## 5. PLATAFORMA — FEATURES GERAIS

### Sistema de creditos

| Plano | Creditos/mes | Preco | Resolucao max |
|-------|-------------|-------|---------------|
| Gratuito | 5 | R$ 0 | 2K |
| Iniciante | 100 | R$ 49 | 2K |
| Profissional | 500 | R$ 149 | 4K |
| Premier | 2.000 | R$ 299 | 4K |
| Enterprise | Ilimitado | Customizado | 4K |

**Pacotes avulsos de creditos:**
- 50 creditos = R$ 29,90
- 100 creditos = R$ 49,90
- 200 creditos = R$ 89,90
- 500 creditos = R$ 199,90

**Creditos de edicao** — saldo separado para correcoes pos-geracao (nao consome creditos regulares).

### Custo por feature (resumo)

| Feature | 2K | 4K |
|---------|----|----|
| Product Studio (por angulo) | 1 | 2 |
| Look Composer (por angulo) | 1 | 2 |
| Still Criativo (por variacao) | 1 | 2 |
| Provador (por geracao) | 1 | 2 |
| Edicao (por correcao) | 1 | 2 |

### Sistema de download (6 presets)

| Preset | Tamanho | Formato | Uso ideal |
|--------|---------|---------|-----------|
| Original (Alta) | Tamanho original | PNG | Arquivo master |
| E-commerce | 2048px | WebP | Shopify, VTEX, WooCommerce |
| Marketplaces | 1200px | JPEG | Mercado Livre, Amazon, Shopee |
| Redes Sociais | 1080px | JPEG | Instagram, Facebook, Pinterest |
| Web | 800px | WebP | Blog, email, newsletter |
| Miniatura | 400px | WebP | WhatsApp, catalogos |

> **Download em ZIP** automatico com 2+ imagens selecionadas.
> Nomenclatura padronizada: `Produto - Feature - Angulo - Preset.ext`

### Product Hub 360

Modal centralizado que mostra **todas as imagens geradas** de um produto em um so lugar:
- Aba Product Studio (todos os angulos)
- Aba Look Composer (todos os looks)
- Aba Still Criativo (todas as composicoes)
- Aba Cenario Criativo
- Aba Vendas (preco, tamanhos, status)

De cada aba, pode: visualizar, editar, baixar, deletar.

### Cadastrar Todos (wizard de importacao)

Wizard inteligente para **importar multiplos produtos de uma vez**:
1. IA detecta produtos nas fotos
2. Review: preencher nome, categoria, cor, marca
3. Upload de angulos extras (costas, lateral, detalhe)
4. Importacao em lote com barra de progresso

### Dashboard

- **Ultimas criacoes** — grid com thumbnails das 4 ultimas geracoes (PS, LC, CS, Provador)
- **Stats** — Produtos otimizados, Total geracoes, Creditos disponiveis, Dias ate renovacao
- **Carrossel de 50 dicas** — fotografia, features, marketing (rotacao automatica)
- **Acesso rapido** — botoes para cada feature + historico + plano

### Autenticacao

- Email/senha
- Google OAuth (1 clique)
- Magic Link (OTP por email)
- Recuperacao de senha
- Modo demo (trial anonimo)

### Dark/Light Mode

- Toggle no app
- Persistido em localStorage
- Identidade visual:
  - Coral primario: #FF6B6B
  - Laranja: #FF9F43
  - Gradiente: coral → laranja
  - Fundo dark: #000000
  - Fundo light: #f7f5f2 (creme)

### Mobile-first + PWA

- Design 100% responsivo (mobile, tablet, desktop)
- Funciona como app instalavel (PWA)
- Navegacao por swipe entre paginas
- Modais como bottom sheets no mobile
- Safe area para notch/home bar

---

## 6. NUMEROS E POTENCIAL

### O que 1 foto de produto pode virar

```
1 foto original
  └─ Product Studio: 5-6 angulos profissionais
  └─ Look Composer: looks ilimitados com modelos customizaveis
  └─ Still Criativo: composicoes editoriais em 4 formatos
  └─ Provador: prova virtual em clientes reais + envio WhatsApp
  └─ Download: 6 presets otimizados para cada plataforma
```

### Economia estimada vs metodo tradicional

| Item | Tradicional | Com Vizzu |
|------|-------------|-----------|
| Sessao foto estudio (5 angulos) | R$ 150-500/produto | 5 creditos (~R$ 3) |
| Modelo + fotografo (1 look) | R$ 500-2.000 | 2 creditos (~R$ 1,20) |
| Composicao editorial (1 foto) | R$ 200-800 | 1 credito (~R$ 0,60) |
| Provador virtual + envio WhatsApp | Nao existe | 1 credito (~R$ 0,60) |
| **Total catalogo 1 produto** | **R$ 850-3.300** | **~R$ 5,40** |

### Plataformas de e-commerce atendidas

- Shopify, VTEX, WooCommerce, Loja Integrada
- Mercado Livre, Amazon, Shopee, Magalu
- Instagram Shopping, Facebook Marketplace
- Pinterest, TikTok Shop

### Publico-alvo

- Lojas de moda online (pequenas e medias)
- Marcas D2C (direct-to-consumer)
- Revendedores e dropshippers
- Estilistas e designers independentes
- Agencias de marketing para e-commerce
- Vendedores de marketplace

---

## 7. DIFERENCIAIS COMPETITIVOS

1. **Tudo-em-um** — Product Studio + Look Composer + Still Criativo + Provador em uma unica plataforma
2. **WhatsApp nativo** — unica ferramenta que gera look virtual e envia direto pro cliente com precos
3. **Modelo IA representativo** — 15+ atributos de customizacao (etnias, corpos, idades reais)
4. **Foco no Brasil** — interface em PT-BR, precos em reais, categorias de moda brasileira
5. **Mobile-first** — funciona 100% no celular como app instalavel
6. **Creditos flexiveis** — paga por uso, sem desperdicio, pacotes avulsos
7. **Multi-formato** — 6 presets de download otimizados para cada plataforma
8. **Composicao inteligente** — @ mentions, otimizador IA, referências visuais
9. **Historico completo** — hub 360 do produto com tudo que ja foi gerado
10. **Resiliencia** — geracao sobrevive F5, retry individual de angulos, auto-save

---

*Documento gerado em Fevereiro 2026 a partir de analise do codigo-fonte Vizzu v1.*
