# 🎨 VIZZU - AI Visual Studio

> Plataforma SaaS de geração de imagens por IA para e-commerce

![VIZZU](https://img.shields.io/badge/VIZZU-AI%20Visual%20Studio-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-teal?style=flat-square)

---

## ✨ Funcionalidades

### 🏪 Studio Ready (1 crédito)
- Fundo branco profissional (#FFFFFF)
- Sombra suave para profundidade
- Iluminação de estúdio
- Perfeito para marketplaces

### 🎬 Cenário Criativo (2 créditos)
- Ambientação temática personalizada
- Descreva o cenário desejado
- Mantém o produto como foco principal
- Ideal para campanhas promocionais

### 👥 Modelo IA (3 créditos)
- Geração de modelo humano vestindo o produto
- Configurações: gênero, etnia, porte físico, idade
- **Model Consistency**: salve modelos para reutilizar
- **Look Composer**: adicione outros produtos à composição
- **Categoria do Produto**: melhora fidelidade da IA
- **Descrição do Produto**: garante reprodução exata

### 🔄 Refinar (1 crédito)
- Ajuste fino de imagens geradas
- Mantém identidade do modelo
- Modificações pontuais

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Google Cloud (para Gemini API)
- Conta Supabase (para autenticação)

### 1. Clone e instale

```bash
git clone <seu-repo>
cd vizzu
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Gemini AI (Obrigatório)
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui

# Supabase (Obrigatório para Auth)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **Authentication > Providers > Google**
3. Configure o OAuth com Google Cloud Console
4. Adicione `http://localhost:3000` nas URLs permitidas

### 4. Obtenha a Gemini API Key

1. Acesse [Google AI Studio](https://aistudio.google.com/apikey)
2. Crie uma nova API Key
3. Ative a API `gemini-2.0-flash-exp-image-generation`

### 5. Execute

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 📁 Estrutura do Projeto

```
vizzu/
├── src/
│   ├── components/
│   │   └── Studio/
│   │       ├── index.tsx          # Componente principal
│   │       ├── EditorModal.tsx    # Modal de edição
│   │       ├── GenerationHistory.tsx
│   │       └── LookComposer.tsx   # Compositor de looks
│   ├── services/
│   │   ├── geminiService.ts       # Integração Gemini AI
│   │   └── supabaseClient.ts      # Cliente Supabase
│   ├── utils/
│   │   └── imageOptimizer.ts      # Otimização de imagens
│   ├── hooks/
│   │   └── useCredits.ts          # Sistema de créditos
│   ├── types.ts                   # TypeScript types
│   ├── App.tsx                    # Aplicação principal
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Estilos globais
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example
```

---

## 💡 Como Usar

### 1. Login
- Use Google OAuth ou "Testar Gratuitamente" (modo demo)

### 2. Importar Produtos
- Clique em **Importar** no catálogo
- Arraste ou selecione imagens dos seus produtos

### 3. Gerar Imagens
1. Clique em um produto para abrir o estúdio
2. Escolha a ferramenta: Studio, Cenário ou Modelo IA
3. Configure as opções
4. Clique em **Gerar**
5. Salve na galeria ou refine

### 4. Model Consistency
1. Gere uma imagem com "Modelo IA"
2. Se gostar do resultado, clique no ícone **+** (pessoa)
3. Dê um nome e salve
4. Use na aba "Salvos" para manter consistência

### 5. Look Composer
1. Em "Modelo IA", expanda **Composição de Look**
2. Adicione outros produtos aos slots (cabeça, topo, baixo, pés, acessórios)
3. A IA criará o modelo usando todos os itens

---

## 🎯 Dicas para Melhores Resultados

### Descrição do Produto
Seja **específico** na descrição:
- ✅ "Camiseta preta com logo Nike branco no peito, gola redonda, algodão"
- ❌ "Camiseta preta"

### Categoria do Produto
Sempre selecione a categoria correta:
- **Parte de Cima**: Camisetas, blusas, casacos
- **Parte de Baixo**: Calças, shorts, saias
- **Calçado**: Tênis, sapatos, sandálias
- **Corpo Inteiro**: Vestidos, macacões
- **Acessório**: Bolsas, chapéus, relógios

### Imagem de Referência
- Use fotos de produto em **fundo branco**
- Resolução mínima recomendada: **800x800px**
- Evite imagens muito comprimidas

---

## 📊 Sistema de Créditos

| Ferramenta | Créditos |
|------------|----------|
| Studio Ready | 1 |
| Cenário Criativo | 2 |
| Modelo IA | 3 |
| Refinar | 1 |

### Planos

| Plano | Créditos/mês | Preço |
|-------|--------------|-------|
| Free | 10 | Grátis |
| Starter | 100 | R$ 79,90 |
| Growth | 300 | R$ 179,90 |
| Enterprise | 1000 | R$ 399,90 |

---

## 🔧 Build para Produção

```bash
npm run build
```

Os arquivos serão gerados em `dist/`.

### Deploy

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

---

## 📝 Licença

MIT © VIZZU

---

## 🤝 Suporte

- Email: suporte@vizzu.ai
- Docs: https://docs.vizzu.ai

---

**Feito com 💜 para revolucionar o e-commerce brasileiro**
