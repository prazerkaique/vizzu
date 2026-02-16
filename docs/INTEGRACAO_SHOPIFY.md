# Integração Vizzu × Shopify — Documento Técnico Completo

> **Status:** Em produção — Gateway + Linking + Import funcionando (17/17 produtos com imagens)
> **Data:** 2026-02-14 (atualizado)
> **Autor:** Kaique + Copiloto Claude
> **Versão:** 3.0 (atualizada com implementação real — gateway deployado, import testado end-to-end)

---

## Sumário

1. [Objetivo](#1-objetivo)
2. [Contexto Tecnológico Atual](#2-contexto-tecnológico-atual)
3. [Decisões de Produto](#3-decisões-de-produto)
4. [Estratégia de Distribuição](#4-estratégia-de-distribuição)
5. [Arquitetura Geral](#5-arquitetura-geral)
6. [Gateway Shopify (Thin Backend)](#6-gateway-shopify-thin-backend)
7. [Fluxos Detalhados](#7-fluxos-detalhados)
8. [Novas Tabelas Supabase](#8-novas-tabelas-supabase)
9. [Mapeamento de Dados Shopify → Vizzu](#9-mapeamento-de-dados-shopify--vizzu)
10. [Billing — Cobrança Isolada](#10-billing--cobrança-isolada)
11. [Segurança](#11-segurança)
12. [Riscos e Mitigações](#12-riscos-e-mitigações)
13. [Visão Multi-Plataforma (Futuro)](#13-visão-multi-plataforma-futuro)
14. [Fases de Implementação](#14-fases-de-implementação)
15. [Lições Aprendidas](#15-lições-aprendidas)
16. [Referência — Stack Atual Completa](#16-referência--stack-atual-completa)
17. [Perguntas em Aberto / Resolvidas](#17-perguntas-em-aberto--resolvidas)

---

## 1. Objetivo

Permitir que lojistas com e-commerce Shopify:

1. **Importem** seu catálogo de produtos (todo ou parcial) para o Vizzu
2. **Gerem imagens profissionais** com as ferramentas de IA existentes (Product Studio, Creative Still, Look Composer, Provador)
3. **Exportem** as imagens otimizadas de volta ao Shopify, adicionando ou substituindo imagens existentes

Tudo isso **sem estar no marketplace da Shopify** (zero taxa), usando o billing próprio (Stripe), sem impacto no sistema atual. Futuramente expandir para Magento, VTEX e marketplaces.

---

## 2. Contexto Tecnológico Atual

### 2.1 Stack

| Camada | Tecnologia | Detalhe |
|--------|-----------|---------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite | PWA com Service Worker, deploy Vercel |
| Backend/BaaS | Supabase Pro | Auth, PostgreSQL + RLS, Storage (5 buckets) |
| Orquestração IA | N8N Queue Mode | 4 workers, concurrency 5/worker, Redis |
| IA | Google Gemini (gemini-3-pro-image-preview) | Via N8N Code nodes |
| Pagamentos | Stripe via N8N | Checkout sessions, subscriptions |
| Servidor | Hostinger KVM 4 | 4 vCPU, 16 GB RAM, R$94.99/mês |
| Deploy frontend | Vercel | Domínio: vizzu.pro |

### 2.2 URLs Ativas

| Serviço | URL |
|---------|-----|
| App | `https://vizzu.pro` |
| N8N Editor | `https://n8neditor.brainia.store` |
| N8N Webhook | `https://n8nwebhook.brainia.store` |
| N8N Webhook (chamadas) | `https://n8nwebhook.brainia.store/webhook/...` |
| Supabase | `https://dbdqiqehuapcicejnzyd.supabase.co` |
| **Gateway Shopify** | `https://vizzu-shopify-gateway.vercel.app` |
| **Dev Store (teste)** | `https://vizzu-test-store.myshopify.com` |

### 2.3 Endpoints N8N (25 total — 24 existentes + 1 novo Shopify)

#### Geração (studio.ts — 17 endpoints)

| # | Endpoint | Método | Custo | O que faz |
|---|----------|--------|-------|-----------|
| 1 | `/vizzu/studio-ready` | POST | 1 cr | Fundo branco profissional |
| 2 | `/vizzu/studio/generate` | POST | 1 cr/ângulo | Product Studio multi-ângulo (orquestrador) |
| 3 | `/vizzu/studio/angle` | POST | 0 (retry) | Retry individual de ângulo que falhou |
| 4 | `/vizzu/cenario-criativo` | POST | 1 cr | Cenário temático customizado |
| 5 | `/vizzu/modelo-ia-v2` | POST | 1-2 cr | Modelo IA vestindo produto (describe/composer) |
| 6 | `/vizzu/refine` | POST | 1 cr | Ajuste fino em imagem gerada |
| 7 | `/vizzu/delete-generation` | POST | 0 | Deleta geração do Supabase |
| 8 | `/vizzu/generate-caption` | POST | 0 | Legenda IA para Instagram |
| 9 | `/vizzu/provador` | POST | 1 cr | Provador virtual (try-on com foto real) |
| 10 | `/vizzu/generate-model-images` | POST | 2 cr | Gera frente+costas de modelo salvo |
| 11 | `/vizzu/send-whatsapp` | POST | 0 | Envio WhatsApp via Evolution API |
| 12 | `/vizzu/analyze-product` | POST | 0 | Análise IA de imagem (categoria, cor, fit) |
| 13 | `/vizzu/studio/edit` | POST | 1-2 cr | Edição/correção de imagem PS |
| 14 | `/vizzu/studio/edit/save` | POST | 0 | Salva edição PS no Supabase |
| 15 | `/vizzu/still/edit/save` | POST | 0 | Salva edição CS no Supabase |
| 16 | `/vizzu/still/edit/save-as-new` | POST | 0 | Salva edição CS como nova variação |
| 17 | `/vizzu/look-composer/edit/save` | POST | 0 | Salva edição LC no Supabase |

#### Billing (billing.ts — 7 endpoints)

| # | Endpoint | O que faz |
|---|----------|-----------|
| 1 | `/vizzu/get-user-billing` | Busca subscription + créditos |
| 2 | `/vizzu/create-checkout` | Cria sessão Stripe (créditos ou plano) |
| 3 | `/vizzu/buy-credits` | Adiciona créditos após pagamento |
| 4 | `/vizzu/change-plan` | Upgrade/downgrade de plano |
| 5 | `/vizzu/cancel-subscription` | Cancela assinatura |
| 6 | `/vizzu/get-transactions` | Histórico de transações |
| 7 | `/vizzu/checkout-status` | Verifica status do checkout |

#### Shopify (novo — 1 endpoint)

| # | Endpoint | Método | O que faz |
|---|----------|--------|-----------|
| 1 | `/vizzu/shopify/import` | POST | Importa produtos Shopify → Supabase (Code node) |

> **Pendentes**: `/vizzu/shopify/export-image` (exportação), `/vizzu/shopify/sync` (sincronização)

### 2.4 Schema Supabase (23 tabelas + 2 views)

#### Tabelas principais

| Tabela | Propósito | Linhas estimadas |
|--------|-----------|-----------------|
| `products` | Catálogo de produtos | Variável por loja |
| `product_images` | Imagens originais + geradas (URLs) | ~5-20x produtos |
| `generations` | Log de todas as gerações IA | Histórico ilimitado |
| `saved_models` | Modelos IA/Real salvos pelo usuário | Poucos por loja |
| `clients` | Clientes do lojista (Provador) | Variável |
| `client_photos` | Fotos dos clientes (URLs) | 1-3x clientes |
| `client_looks` | Looks gerados no Provador | Variável |
| `provador_results` | Resultados do Provador IA | Variável |
| `creative_still_templates` | Templates de cena CS | Poucos por loja |
| `creative_still_generations` | Gerações CS | Variável |
| `user_credits` | Saldo de créditos | 1 por usuário |
| `user_subscriptions` | Assinaturas ativas | 1 por usuário |
| `credit_transactions` | Log de compra/uso de créditos | Histórico ilimitado |
| `checkout_sessions` | Sessões Stripe | Temporário |
| `plans` | Definição dos planos (Trial/Basic/Pro/Premier) | 4 fixas |
| `history_logs` | Log de ações do sistema | Histórico |
| `company_settings` | Configurações da empresa (IA de legendas) | 1 por usuário |
| `whatsapp_templates` | Templates de mensagem WhatsApp | Poucos |
| `app_config` | Configurações globais | 1 row |

#### Views

- `user_billing_summary` — resumo billing
- `active_subscriptions` — subscriptions ativas

#### Storage Buckets

| Bucket | Uso |
|--------|-----|
| `products` | Imagens originais dos produtos |
| `client-looks` | Imagens de looks gerados |
| `client-photos` | Fotos dos clientes |
| `model-images` | Imagens de modelos IA |
| `model-references` | Referências de modelos reais |

#### RPC Functions

- `add_credits(p_user_id, p_amount, p_description, p_reference_id)` — atômico
- `deduct_credits(p_user_id, p_amount, p_description, p_generation_id)` — atômico
- `deduct_edit_credits(p_user_id, p_amount, p_description, p_generation_id)` — usa edit_balance

### 2.5 Planos e Preços Atuais (Stripe)

| Plano | Mensal | Anual/mês | Gerações/mês | Crédito extra | Resolução |
|-------|--------|-----------|-------------|--------------|-----------|
| Trial | Grátis | — | 5 (único) | — | 2K + marca d'água |
| Basic | R$127 | R$107 | 40 | R$3,50 | 2K |
| Pro | R$187 | R$157 | 100 | R$3,00 | 4K |
| Premier | R$327 | R$267 | 200 | R$2,50 | 4K |

### 2.6 Tipos TypeScript Relevantes

```typescript
interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  collection?: string;
  brand?: string;
  color?: string;
  fit?: string;
  attributes?: ProductAttributes;
  images: ProductImage[];                  // Legado: array simples
  originalImages?: ProductOriginalImages;  // Multi-ângulo (frente, costas, laterais, detalhes)
  generatedImages?: ProductGeneratedImages;
  hasBackImage?: boolean;
  hasDetailImage?: boolean;
  price?: number;
  priceSale?: number;
  sizes?: string[];
  isForSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductOriginalImages {
  front: ProductImage;        // Obrigatório
  back?: ProductImage;
  'side-left'?: ProductImage;
  'side-right'?: ProductImage;
  top?: ProductImage;
  detail?: ProductImage;
  frontDetail?: ProductImage;
  backDetail?: ProductImage;
  '45-left'?: ProductImage;
  '45-right'?: ProductImage;
  folded?: ProductImage;
}

// 30+ categorias: Camisetas, Blusas, Vestidos, Calças, Shorts, Jaquetas,
// Moletons, Calçados, Bolsas, Acessórios, Bonés, Chapéus, Tênis,
// Sandálias, Botas, Biquínis, Leggings, Bodies, Macacões...
// Cada categoria tem atributos específicos (caimento, comprimento, cintura, etc.)
```

### 2.7 Categorias Vizzu (productConfig.ts)

5 tipos de produto com upload slots específicos:

| Tipo | Ângulos obrigatórios | Ângulos opcionais |
|------|---------------------|-------------------|
| clothing | front | back, side-left, side-right, 45-left, 45-right, top, frontDetail, backDetail, folded |
| footwear | front | back, side-left, side-right, top, detail |
| headwear | front | back, side-left, side-right, top, detail |
| bag | front | back, side-left, side-right, top, detail |
| accessory | front | back, detail |

---

## 3. Decisões de Produto

| # | Decisão | Escolha | Detalhe |
|---|---------|---------|---------|
| 1 | Importação | **Ambos** | Importar tudo OU selecionar produtos específicos |
| 2 | Devolver imagens | **Lojista escolhe** | Na exportação decide: adicionar ao lado, substituir, ou definir como principal |
| 3 | Billing | **Híbrido isolado** | Shopify users = mesmos planos Vizzu via Stripe. Shopify Billing API **NÃO** é usada |
| 4 | Distribuição | **Unlisted Public App** | Sem marketplace, link direto, 0% taxa Shopify |
| 5 | Interface | **Híbrido (iframe)** | App Shopify embarca o Vizzu via iframe no admin |
| 6 | Autenticação | **Conta Vizzu separada** | Lojista cria conta Vizzu + conecta Shopify |
| 7 | Sincronização | **Configurável** | Lojista escolhe sync automático (webhooks) ou manual |

---

## 4. Estratégia de Distribuição

### 4.1 Por que "Unlisted Public App"?

Existem 3 formas de distribuir um app Shopify:

| Tipo | No marketplace? | OAuth padrão? | Taxa Shopify | Qualquer loja instala? |
|------|----------------|---------------|-------------|----------------------|
| **Custom App** | Não | Não (token manual) | 0% | Não (1 loja só) |
| **Unlisted Public App** ✅ | Não (invisível) | Sim | **0%** (billing próprio) | Sim (via link direto) |
| **Listed Public App** | Sim (buscável) | Sim | ~20% se usar Shopify Billing | Sim |

**Unlisted Public App é a escolha ideal porque:**

1. **0% de taxa para a Shopify** — usamos billing próprio (Stripe), não o Shopify Billing API
2. **OAuth padrão** — qualquer loja pode instalar via link direto (ex: `https://apps.shopify.com/vizzu`)
3. **Sem revisão de marketplace** — processo de aprovação mais simples (GDPR + OAuth compliance)
4. **Futuro upgrade fácil** — se quisermos ir ao marketplace depois, é só submeter para listing
5. **API completa** — GraphQL Admin API, webhooks, App Bridge, tudo igual ao listed app

### 4.2 O que é necessário

1. **Shopify Partner Account** (grátis) — dá acesso ao Partner Dashboard e dev stores
2. **App registration** — criar o app no Partner Dashboard, definir scopes e redirect URLs
3. **GDPR compliance** — 3 webhooks obrigatórios (customer data request, customer redact, shop redact)
4. **HTTPS** — obrigatório para todas as URLs (Vercel resolve isso)

### 4.3 Distribuição para lojistas

```
Lojista recebe link: https://vizzu.pro/shopify/install
→ Redireciona para OAuth da Shopify
→ Lojista autoriza acesso ao catálogo
→ Token offline salvo no banco
→ Lojista conecta conta Vizzu (cria ou login)
→ Pronto para importar
```

---

## 5. Arquitetura Geral

### 5.1 Diagrama

```
┌─────────────────────────────────────────────────────────────────┐
│                 SHOPIFY ADMIN (iframe embed)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  App Bridge Container (Polaris shell)                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │     Vizzu React App (iframe embarcado)              │  │  │
│  │  │     - Dashboard de produtos importados              │  │  │
│  │  │     - Product Studio / CS / LC / Provador           │  │  │
│  │  │     - Botão "Enviar para Shopify"                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │ API calls
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│    GATEWAY SHOPIFY (vizzu-shopify-gateway.vercel.app)            │
│                                                                  │
│  ╭─────────────────────────────────────────────────────╮        │
│  │  RESPONSABILIDADES (só o que N8N não consegue):     │        │
│  │                                                     │        │
│  │  1. OAuth 2.0 (install + callback + token storage)  │        │
│  │  2. Session Management (Prisma → Supabase PG)       │        │
│  │  3. GDPR Webhooks (3 obrigatórios)                  │        │
│  │  4. Webhook APP_UNINSTALLED                         │        │
│  │  5. HMAC validation em todos webhooks               │        │
│  │  6. Proxy: GraphQL Admin API da Shopify             │        │
│  │     (import, export, sync — repassa ao N8N)         │        │
│  ╰─────────────────────────────────────────────────────╯        │
│                                                                  │
│  Framework: Shopify CLI template (React Router v7)               │
│  DB: Supabase Postgres via Prisma (session storage)              │
│  Hosting: Vercel (serverless) — domínio separado                 │
│  Env: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SUPABASE_*            │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP (webhook calls)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│               VIZZU EXISTENTE (N8N + Supabase)                   │
│                                                                  │
│  N8N (negócio):                                                  │
│  ├─ /vizzu/shopify/import          → ✅ importa produtos        │
│  ├─ /vizzu/shopify/export-image    → 🔜 exporta pra Shopify    │
│  ├─ /vizzu/shopify/sync            → 🔜 sincroniza catálogo    │
│  └─ (24 endpoints existentes — INALTERADOS)                     │
│                                                                  │
│  Supabase:                                                       │
│  ├─ 19 tabelas existentes (INALTERADAS)                         │
│  ├─ ecommerce_connections (NOVA — genérica)                     │
│  ├─ ecommerce_product_map (NOVA — genérica)                     │
│  ├─ ecommerce_image_exports (NOVA — genérica)                   │
│  └─ ecommerce_sync_log (NOVA — genérica)                        │
│                                                                  │
│  Storage: 5 buckets existentes (INALTERADOS)                     │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Princípios da Arquitetura

1. **Zero impacto no sistema atual** — nenhuma tabela, endpoint ou componente existente é modificado
2. **Gateway mínimo** — só faz o que N8N não pode (OAuth, sessions, HMAC). Lógica de negócio fica no N8N
3. **Tabelas genéricas** — `ecommerce_connections` ao invés de `shopify_connections`. Coluna `platform` distingue (futuro: Magento, VTEX)
4. **Frontend existente reusado** — o iframe embarca o mesmo React app, com flag `source=shopify` para mostrar botão "Enviar para Shopify"
5. **Billing isolado** — clientes Shopify usam Stripe idêntico aos clientes diretos. A Shopify não cobra nada

### 5.3 Por que um Gateway separado e não "forçar" o N8N?

| Requisito | N8N consegue? | Gateway resolve? |
|-----------|--------------|-----------------|
| OAuth 2.0 flow (multi-step com state/nonce) | Parcialmente (frágil) | Sim (template pronto) |
| Session management com cookies | Não | Sim (Prisma adapter) |
| HMAC validation de webhooks | Sim | Sim (mais seguro) |
| Proxy GraphQL com rate limiting | Parcialmente | Sim (nativo) |
| App Bridge session tokens (JWT) | Não | Sim (middleware) |
| GDPR compliance | Parcialmente | Sim (template inclui) |
| Manter N8N focado em lógica de negócio | — | Sim |

**Conclusão**: O gateway é um "adaptador fino" entre a Shopify e o N8N. Ele traduz o protocolo Shopify (OAuth, sessions, App Bridge) para chamadas HTTP simples que o N8N entende. O N8N continua fazendo 100% da lógica de negócio.

---

## 6. Gateway Shopify (Thin Backend)

> **STATUS: DEPLOYADO E FUNCIONANDO** em `https://vizzu-shopify-gateway.vercel.app` (Vercel, região gru1)

### 6.1 Stack do Gateway (implementado)

| Camada | Tecnologia | Detalhe |
|--------|-----------|--------|
| Framework | React Router v7 (template oficial Shopify) | Template pronto com OAuth, GDPR, App Bridge |
| UI (shell) | Polaris Web Components | Obrigatório para apps no Shopify admin |
| Backend | Node.js (React Router server-side) | Serverless no Vercel |
| Database | Supabase Postgres via Prisma | Prisma session storage + tabelas ecommerce_* |
| Session Storage | `@shopify/shopify-app-session-storage-prisma` | Padrão Shopify |
| Hosting | Vercel (`vizzu-shopify-gateway`) | Região gru1 (São Paulo) |
| API Shopify | GraphQL Admin API (versão 2025-01) | REST deprecated para novos apps |
| CLI | Shopify CLI 3.x | Scaffold + dev + deploy |

### 6.2 Estrutura de Arquivos do Gateway (implementado)

```
shopify-gateway/
├── app/
│   ├── lib/
│   │   ├── import.server.ts          # handleBulkOperationFinish() — baixa JSONL, parseia, envia ao N8N
│   │   ├── supabase.server.ts        # supabaseQuery() helper — wrapper REST Supabase
│   │   └── shopify-linking.server.ts # Criptografia HMAC + validação de linking
│   ├── routes/
│   │   ├── app.tsx                   # Layout principal (Polaris shell)
│   │   ├── app._index.tsx            # Dashboard: lista produtos, botão "Importar Tudo"
│   │   ├── app.settings.tsx          # Settings: vínculo Vizzu + linking flow
│   │   ├── webhooks.tsx              # Handler de TODOS os webhooks Shopify
│   │   ├── api.connect-vizzu.tsx     # POST: vincula conta Vizzu (recebe HMAC + JWT)
│   │   ├── api.trigger-import.tsx    # GET: manutenção — registra webhooks + processa bulk ops
│   │   ├── api.debug.tsx             # GET: diagnóstico (REMOVER antes do launch)
│   │   └── api.check-import.tsx      # GET: verifica status da importação (REMOVER)
│   ├── shopify.server.ts             # Configuração do Shopify adapter
│   └── db.server.ts                  # Prisma client
├── prisma/
│   └── schema.prisma                 # Session model (Prisma)
├── shopify.app.toml                  # Config do app Shopify
└── package.json
```

### 6.3 Rotas do Gateway (implementadas)

```
# OAuth (automático pelo template Shopify)
POST /auth/login              → Inicia OAuth com Shopify
GET  /auth/callback            → Recebe token, salva sessão Prisma

# App (páginas dentro do Shopify Admin)
GET  /app                      → Dashboard: lista produtos importados, botão "Importar Tudo"
GET  /app/settings             → Settings: linking com conta Vizzu

# Webhooks (registrados automaticamente + via GraphQL)
POST /webhooks                 → Handler único para todos os webhooks:
                                  - BULK_OPERATIONS_FINISH → handleBulkOperationFinish(shop)
                                  - APP_UNINSTALLED → limpa sessões + marca conexão
                                  - PRODUCTS_CREATE/UPDATE/DELETE → log (sync futuro)
                                  - CUSTOMERS_DATA_REQUEST → GDPR
                                  - CUSTOMERS_REDACT → GDPR
                                  - SHOP_REDACT → GDPR (deleta dados)

# APIs
POST /api/connect-vizzu        → Vincula conta Vizzu (HMAC + Supabase JWT)
GET  /api/trigger-import       → Manutenção: registra webhooks + processa bulk ops
GET  /api/debug                → Diagnóstico (TEMPORÁRIO — remover)
GET  /api/check-import         → Verifica importação (TEMPORÁRIO — remover)
```

### 6.4 Scopes (implementados)

| Scope | Motivo |
|-------|--------|
| `read_products` | Ler catálogo (produtos, variantes, imagens, preços) |
| `write_products` | Associar imagens otimizadas aos produtos |
| `write_files` | Upload de imagens para CDN Shopify (staged uploads) |
| `read_files` | Verificar status de processamento de imagens |

### 6.5 Variáveis de Ambiente do Gateway (Vercel)

```env
SHOPIFY_API_KEY=xxx                    # Client ID do app
SHOPIFY_API_SECRET=xxx                 # Client Secret do app
SHOPIFY_APP_URL=https://vizzu-shopify-gateway.vercel.app
SCOPES=read_products,write_products,write_files,read_files
SUPABASE_URL=https://dbdqiqehuapcicejnzyd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx          # Service role para session storage + queries
N8N_WEBHOOK_URL=https://n8nwebhook.brainia.store/webhook  # ⚠️ INCLUI /webhook no path!
ENCRYPTION_KEY=xxx                     # Para criptografar tokens Shopify (AES-256-GCM)
DATABASE_URL=postgresql://...          # Supabase pooler (porta 6543, região gru1)
```

> **IMPORTANTE**: `N8N_WEBHOOK_URL` DEVE incluir `/webhook` no final. Sem isso, as chamadas ao N8N falham silenciosamente.

> **IMPORTANTE**: O `DATABASE_URL` deve usar o pooler do Supabase (porta 6543) na região correta (gru1), caso contrário dá erro de conexão.

---

## 7. Fluxos Detalhados

### 7.1 Instalação e Conexão

> **STATUS: FUNCIONANDO** — OAuth + Linking testados end-to-end com dev store

#### Fluxo OAuth (automático pelo template Shopify)

```
Lojista acessa o dashboard do Shopify Admin
→ Instala app via link direto (unlisted)
→ Shopify redireciona para OAuth no gateway
→ Gateway recebe callback + code → troca por offline access_token
→ Token salvo via Prisma na sessão (session_id, shop, accessToken, scope)
→ Lojista vê dashboard do app no Shopify Admin
```

#### Fluxo de Linking (Shopify ↔ Vizzu)

```
1. Lojista clica "Vincular conta Vizzu" no app.settings.tsx
2. Gateway cria ecommerce_connections com status='pending', user_id=null
3. Gateway gera URL de linking:
   https://vizzu.pro/#connect-shopify?shop={shop}&connectionId={id}&hmac={hmac}
   (HMAC = SHA-256 do connectionId usando ENCRYPTION_KEY)
4. Lojista abre link → vizzu.pro detecta #connect-shopify
5. Se não logado, redireciona pra login. Se logado:
   - Frontend envia POST /api/connect-vizzu no gateway
   - Body: { connectionId, hmac, supabaseToken (JWT do user) }
6. Gateway valida HMAC + extrai user_id do JWT Supabase
7. PATCH ecommerce_connections: user_id = extracted, status = 'active'
8. Criptografa accessToken (AES-256-GCM) → salva em access_token_encrypted
9. Settings faz polling → detecta user_id preenchido → mostra "Conectado!"
```

**Notas importantes:**
- **Offline token** = não expira, válido até desinstalação
- Token criptografado com AES-256-GCM antes de salvar (via `ENCRYPTION_KEY`)
- Webhooks GDPR registrados via `shopify.app.toml` + programaticamente via GraphQL
- A validação do linking usa HMAC (não simplesmente confia no connectionId)
- O JWT do Supabase é validado pelo gateway para extrair o `user_id` real

#### Bug corrigido: Race condition no Settings loader
O `app.settings.tsx` tinha dois loaders paralelos (Shopify admin loader + conexão Supabase loader). No Vercel serverless, o loader do Shopify **não é autenticado** na primeira chamada, causando redirect para `/auth/login` que cortava a resposta do Supabase loader. Solução: tratar erro do admin como "não autenticado" e retornar dados parciais sem quebrar.

### 7.2 Importação do Catálogo

> **STATUS: FUNCIONANDO** — Testado com 17 produtos da dev store, 100% importados com imagens

#### Modo A: Importar Tudo (Bulk Operation) — IMPLEMENTADO

```
Lojista clica "Importar Tudo" no dashboard do gateway
→ Gateway dispara Bulk Operation na Shopify GraphQL (app._index.tsx loader)

→ Shopify processa assincronamente (pode levar minutos para catálogos grandes)
→ Webhook BULK_OPERATIONS_FINISH notifica o gateway
→ Gateway (import.server.ts):
  1. Query currentBulkOperation → pega URL do JSONL
  2. Download do JSONL (cada linha = 1 JSON)
  3. Parseia e agrupa linhas por produto (variantes/imagens têm __parentId)
  4. Busca ecommerce_connections por store_domain → pega connection_id + user_id
  5. POST para N8N /vizzu/shopify/import com payload normalizado

→ N8N (shopify-import-products.js Code node) para cada produto:
  1. Dedup: checa ecommerce_product_map (skip se já importado)
  2. Mapeia productType → categoria Vizzu (lookup exato + parcial)
  3. Mapeia preços (compareAtPrice → price, price → priceSale)
  4. INSERT na tabela products
  5. Para cada imagem (até 5): INSERT product_images com URL do CDN Shopify
     ⚠️ NÃO faz re-upload para Supabase Storage (ver Lições Aprendidas)
  6. INSERT ecommerce_product_map (shopify_id ↔ vizzu_id)
  7. Grava sync log em ecommerce_sync_log
→ Retorna: { success, products_imported, products_skipped, errors }
```

**Decisão de imagens — CDN Shopify direto:**
- O N8N Task Runner sandbox NÃO suporta upload binário via `this.helpers.httpRequest` (Buffer vira JSON)
- Solução: usa URLs do CDN Shopify diretamente em `product_images.url`
- `storage_path` = `external/shopify/{productId}/{fileName}` (satisfaz NOT NULL constraint)
- `metadata.cdn = 'shopify'` indica que é URL externa
- Implicação: se o lojista desinstalar Shopify, as URLs podem quebrar
- Futuro: implementar re-upload assíncrono via worker separado

#### Modo B: Selecionar Produtos (Resource Picker)

```
Lojista clica "Selecionar Produtos"
→ Resource Picker da Shopify (App Bridge) abre modal nativo
→ Lojista escolhe produtos (checkboxes)
→ Array de product GIDs retornado: ["gid://shopify/Product/123", ...]
→ Gateway busca detalhes via GraphQL (paginado, max 250/request)
→ Mesmo fluxo de importação do Modo A (mas só os selecionados)
```

#### Mapeamento de campos Shopify → Vizzu (implementado)

| Shopify | Vizzu | Transformação |
|---------|-------|--------------|
| `title` | `name` | Direto |
| `descriptionHtml` | `description` | Strip HTML (regex `/<[^>]*>/g`) |
| `productType` | `category` | `mapCategory()` — lookup exato + parcial (67 entradas EN+PT) |
| `vendor` | `brand` | Direto |
| `tags` | `collection` | `.join(', ')` — todas as tags concatenadas |
| `variants[0].compareAtPrice` | `price` | Preço cheio (se compareAt existe) |
| `variants[0].price` | `price_sale` | Preço promocional (se price < compareAt) |
| `variants[0].sku` | `sku` | Direto. Fallback: último segmento do GID Shopify |
| `variants[].title` | `sizes` | Array filtrado (exclui "Default Title") |
| `media[0].image.url` | `product_images[0]` com `is_primary=true`, `angle='front'` | URL CDN Shopify direto |
| `media[1-4].image.url` | `product_images[1-4]` com `angle=null` | URL CDN Shopify direto (até 5 imagens) |
| `status` | `is_for_sale` | "ACTIVE" → true |

### 7.3 Geração de Imagens (Já Existe — Sem Mudanças)

O lojista usa as ferramentas do Vizzu normalmente:
- **Product Studio** — fotos multi-ângulo (ghost mannequin, flat-lay)
- **Creative Still** — composições artísticas com cena
- **Look Composer** — modelo IA/real + cenário + multi-peça
- **Provador Virtual** — try-on com foto do cliente real (WhatsApp)
- **Studio Ready** — fundo branco profissional

**NENHUMA mudança** nos endpoints ou workflows existentes.

### 7.4 Exportação para Shopify — PENDENTE

> **STATUS: NÃO IMPLEMENTADO** — próximo passo após estabilizar importação

```
Lojista vê imagem otimizada no Vizzu
→ Clica "Enviar para Shopify" (novo botão, só aparece se connected)
→ Modal pergunta:
  ┌──────────────────────────────────────┐
  │  Enviar para Shopify                  │
  │                                       │
  │  ○ Adicionar como nova imagem         │
  │  ○ Substituir imagem original         │
  │  ○ Definir como imagem principal      │
  │                                       │
  │         [Cancelar]  [Enviar]          │
  └──────────────────────────────────────┘

→ Frontend chama N8N /vizzu/shopify/export-image
→ N8N executa:

  1. stagedUploadsCreate → recebe URL de upload temporário
     mutation {
       stagedUploadsCreate(input: [{
         filename: "vizzu-optimized-{productId}-{angle}.jpg"
         mimeType: "image/jpeg"
         httpMethod: POST
         resource: PRODUCT_IMAGE
       }]) {
         stagedTargets {
           url
           resourceUrl
           parameters { name value }
         }
       }
     }

  2. Upload multipart da imagem JPEG otimizada para a URL temporária

  3. fileCreate → registra no CDN Shopify
     mutation { fileCreate(files: [{ originalSource: "{resourceUrl}" }]) { ... } }

  4. Poll fileStatus até READY (pode levar 5-30s)

  5. productSet → associa ao produto
     mutation {
       productSet(input: {
         id: "gid://shopify/Product/123"
         media: [{
           originalSource: "{resourceUrl}"
           alt: "Imagem otimizada pelo Vizzu"
           mediaContentType: IMAGE
         }]
       }) {
         product { id }
         userErrors { field message }
       }
     }

  6. Se "substituir": productDeleteMedia da imagem antiga
  7. Se "definir principal": productReorderMedia para posição 0
  8. Salva metafield $app:vizzu com metadata

→ Confirma: "✅ Imagem enviada para Shopify!"
→ Registra na tabela ecommerce_image_exports
```

### 7.5 Sincronização (Webhooks) — PARCIALMENTE IMPLEMENTADO

> **STATUS**: Webhooks `BULK_OPERATIONS_FINISH` e `APP_UNINSTALLED` implementados. PRODUCTS_CREATE/UPDATE/DELETE apenas logam.

Se o lojista ativar sync automático (futuro):

**Webhook `PRODUCTS_CREATE`:**
```
Shopify POST → Gateway valida HMAC → Gateway chama N8N
→ N8N cria produto no Vizzu (mesma lógica da importação unitária)
→ Log no ecommerce_sync_log
```

**Webhook `PRODUCTS_UPDATE`:**
```
Shopify POST → Gateway valida HMAC → Gateway chama N8N
→ N8N compara campos (nome, preço, variantes)
→ Atualiza campos alterados
→ NÃO sobrescreve imagens geradas pelo Vizzu
→ Log no ecommerce_sync_log
```

**Webhook `PRODUCTS_DELETE`:**
```
Shopify POST → Gateway valida HMAC → Gateway chama N8N
→ N8N marca produto como soft-deleted no Vizzu
→ NÃO deleta imagens geradas (podem ser úteis para outros contextos)
→ Log no ecommerce_sync_log
```

**Webhook `APP_UNINSTALLED`:**
```
Shopify POST → Gateway valida HMAC
→ Revoga token (deleta da tabela)
→ Marca conexão como `uninstalled_at = now()`
→ Cancela sync automático
→ NÃO deleta dados do Vizzu (lojista pode querer reconectar)
```

---

## 8. Novas Tabelas Supabase

### Filosofia: Tabelas genéricas com coluna `platform`

Em vez de `shopify_connections`, usamos `ecommerce_connections`. Quando adicionarmos Magento, é só inserir rows com `platform = 'magento'` — sem criar novas tabelas.

### 8.1 `ecommerce_connections`

```sql
CREATE TABLE ecommerce_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,                    -- 'shopify' | 'magento' | 'vtex' (futuro)

  -- Identificação da loja
  store_domain TEXT NOT NULL,                -- "minha-loja.myshopify.com"
  store_name TEXT,                           -- Nome amigável da loja

  -- Autenticação (criptografado)
  access_token_encrypted TEXT NOT NULL,       -- AES-256-GCM
  scopes TEXT NOT NULL,                      -- "read_products,write_products,write_files,read_files"

  -- Configurações
  auto_sync BOOLEAN DEFAULT false,           -- Sync automático via webhooks?
  sync_frequency TEXT DEFAULT 'realtime',    -- 'realtime' | 'hourly' | 'daily' (futuro)

  -- Status
  status TEXT DEFAULT 'active',              -- 'active' | 'uninstalled' | 'error'
  installed_at TIMESTAMPTZ DEFAULT now(),
  uninstalled_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,

  -- Metadata flexível (coisas específicas por plataforma)
  metadata JSONB DEFAULT '{}',               -- Ex: { "shopify_app_id": "xxx", "api_version": "2025-10" }

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(platform, store_domain)
);

-- Índices
CREATE INDEX idx_ecomm_conn_user ON ecommerce_connections(user_id);
CREATE INDEX idx_ecomm_conn_platform ON ecommerce_connections(platform);

-- RLS
ALTER TABLE ecommerce_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own connections" ON ecommerce_connections
  FOR ALL USING (user_id = auth.uid());
```

### 8.2 `ecommerce_product_map`

```sql
CREATE TABLE ecommerce_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

  -- IDs do e-commerce externo
  external_product_id TEXT NOT NULL,          -- "gid://shopify/Product/123" ou ID Magento
  external_variant_id TEXT,                   -- "gid://shopify/ProductVariant/456" (opcional)

  -- ID do Vizzu
  vizzu_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'synced',          -- 'synced' | 'pending' | 'conflict' | 'error'
  sync_direction TEXT DEFAULT 'import',       -- 'import' | 'export' | 'bidirectional'

  -- Hash para detectar mudanças (evita sync desnecessário)
  external_data_hash TEXT,                    -- MD5 dos dados do produto no e-commerce

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(connection_id, external_product_id)
);

-- Índices
CREATE INDEX idx_ecomm_map_connection ON ecommerce_product_map(connection_id);
CREATE INDEX idx_ecomm_map_vizzu ON ecommerce_product_map(vizzu_product_id);
CREATE INDEX idx_ecomm_map_external ON ecommerce_product_map(external_product_id);

-- RLS (via connection)
ALTER TABLE ecommerce_product_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own mappings" ON ecommerce_product_map
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM ecommerce_connections WHERE user_id = auth.uid()
    )
  );
```

### 8.3 `ecommerce_image_exports`

```sql
CREATE TABLE ecommerce_image_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

  -- Origem (Vizzu)
  vizzu_product_id UUID NOT NULL REFERENCES products(id),
  vizzu_image_url TEXT NOT NULL,              -- URL da imagem no Supabase Storage
  vizzu_generation_id UUID,                   -- Referência à geração (se aplicável)
  vizzu_tool TEXT,                            -- 'product-studio' | 'creative-still' | 'look-composer' | etc

  -- Destino (e-commerce)
  external_product_id TEXT NOT NULL,          -- "gid://shopify/Product/123"
  external_media_id TEXT,                     -- "gid://shopify/MediaImage/456" (após upload)

  -- Configuração
  export_type TEXT NOT NULL,                  -- 'add' | 'replace' | 'set_primary'

  -- Status
  status TEXT DEFAULT 'pending',              -- 'pending' | 'uploading' | 'processing' | 'done' | 'failed'
  error_message TEXT,

  exported_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índice
CREATE INDEX idx_ecomm_export_connection ON ecommerce_image_exports(connection_id);
CREATE INDEX idx_ecomm_export_status ON ecommerce_image_exports(status);
```

### 8.4 `ecommerce_sync_log`

```sql
CREATE TABLE ecommerce_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,                   -- 'import_all' | 'import_selected' | 'webhook_create' | 'webhook_update' | 'webhook_delete' | 'export_image' | 'bulk_finish'
  products_affected INTEGER DEFAULT 0,

  status TEXT DEFAULT 'running',              -- 'running' | 'completed' | 'failed' | 'partial'
  details JSONB,                              -- Detalhes adicionais (erros, warnings)

  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índice
CREATE INDEX idx_ecomm_sync_connection ON ecommerce_sync_log(connection_id);
```

---

## 9. Mapeamento de Dados Shopify → Vizzu

### 9.1 Categorias

A Shopify usa `productType` (texto livre) e `category` (taxonomia Shopify padronizada). O Vizzu usa categorias fixas com atributos específicos.

**Estratégia de mapeamento em 3 camadas:**

1. **Lookup exato** — tabela de-para hardcoded
2. **Fuzzy match** — normalização + similaridade
3. **IA fallback** — analisar imagem do produto com Gemini (endpoint existente `/vizzu/analyze-product`)

```
Shopify productType    →  Vizzu Categoria
─────────────────────────────────────────
T-Shirt, Tee           →  Camisetas
Shirt, Button-Down      →  Camisas
Blouse, Top             →  Blusas
Tank Top                →  Regatas
Dress                   →  Vestidos
Pants, Jeans, Trousers  →  Calças
Shorts                  →  Shorts
Skirt                   →  Saias
Jacket, Coat            →  Jaquetas
Blazer                  →  Blazers
Hoodie, Sweatshirt      →  Moletons
Jumpsuit, Romper        →  Macacões
Overalls                →  Jardineiras
Bodysuit                →  Bodies
Bikini, Swimsuit        →  Biquínis
One-Piece Swimsuit      →  Maiôs
Leggings                →  Leggings
Shoes, Sneakers         →  Tênis
Sandals                 →  Sandálias
Boots                   →  Botas
Cap, Hat                →  Bonés
Hat                     →  Chapéus
Headband, Tiara         →  Tiaras
Scarf                   →  Lenços
Bag, Handbag, Purse     →  Bolsas
Belt                    →  Cintos
Watch                   →  Relógios
Sunglasses, Glasses     →  Óculos
Jewelry, Bracelet       →  Bijuterias
Accessories             →  Acessórios
*outros*                →  IA analisa imagem e sugere
```

### 9.2 Imagens

A Shopify retorna imagens na ordem em que o lojista organizou. Não há metadata de ângulo.

**Estratégia:**
- `media[0]` → `originalImages.front` (sempre a primeira)
- `media[1+]` → uploaded como imagens extras, sem ângulo atribuído
- O lojista pode reorganizar manualmente no Vizzu (drag & drop)
- Futuramente: IA pode sugerir ângulos baseado na análise de imagem

### 9.3 Variantes e Preços

```
Shopify variant.price        → product.price
Shopify variant.compareAtPrice → product.priceSale (se definido)
  → Se compareAtPrice existe, significa preço "de" / "por":
    compareAtPrice = preço original (de)
    price = preço com desconto (por)

  Mapeamento:
    product.price = compareAtPrice (preço cheio)
    product.priceSale = price (preço promocional)

  Se compareAtPrice é null:
    product.price = price
    product.priceSale = null
```

---

## 10. Billing — Cobrança Isolada

### 10.1 Regra fundamental

> **Clientes Shopify usam EXATAMENTE os mesmos planos e preços que clientes diretos, via Stripe.**
> A Shopify Billing API NÃO é utilizada. A Shopify cobra 0% porque usamos billing próprio.

### 10.2 Fluxo

```
Lojista instala app Shopify
→ Cria/conecta conta Vizzu
→ Plano Trial (5 gerações grátis, mesma regra)
→ Para gerar mais: assina plano via Stripe
→ Checkout padrão do Vizzu (mesmo endpoint /vizzu/create-checkout)
→ Créditos gerenciados na tabela user_credits (existente)
```

### 10.3 Vantagens

- **0% para Shopify** (Shopify só cobra se usar Shopify Billing API)
- **Uma única base de billing** — não precisa reconciliar dois sistemas
- **Mesma experiência** para clientes diretos e Shopify
- **Preços em BRL** (Shopify Billing forçaria USD)

---

## 11. Segurança

| Aspecto | Implementação |
|---------|---------------|
| Token Shopify | AES-256-GCM, chave dedicada em env var, nunca em logs |
| HMAC Webhooks | `crypto.timingSafeEqual` em TODOS os webhooks |
| OAuth state | Nonce aleatório (CSPRNG) para prevenir CSRF |
| CSP Headers | `frame-ancestors https://*.myshopify.com https://admin.shopify.com` |
| Session Tokens | JWT do App Bridge validado em toda requisição |
| Dados GDPR | 3 webhooks obrigatórios implementados |
| Desinstalação | Revogar token + marcar conexão como uninstalled |
| Rate Limiting | Exponential backoff + retry queue no N8N |
| Input validation | Validar todos os GIDs Shopify (formato `gid://shopify/...`) |
| CORS | Restringir a origens conhecidas (vizzu.pro, *.myshopify.com) |

### 11.1 GDPR Webhooks (Obrigatórios)

```javascript
// customers/data_request — Retorna dados do cliente
// (No nosso caso, não armazenamos dados de clientes Shopify,
//  apenas produtos. Resposta: 200 OK com body vazio)

// customers/redact — Deleta dados do cliente
// (Mesmo caso: não temos dados pessoais de clientes Shopify)

// shop/redact — 48h após desinstalação, deletar TODOS os dados da loja
// → Deletar ecommerce_connections WHERE store_domain = X
// → Deletar ecommerce_product_map via CASCADE
// → NÃO deletar produtos/imagens do Vizzu (pertencem ao user)
```

---

## 12. Riscos e Mitigações

| # | Risco | Prob. | Impacto | Mitigação |
|---|-------|-------|---------|-----------|
| 1 | OAuth implementation bug | Média | Alto | Usar template oficial Shopify (testado) |
| 2 | Catálogo muito grande (>10k produtos) | Média | Médio | Bulk Operations (assíncrono) + processamento em chunks de 50 |
| 3 | Rate limit Shopify (40 requests/s) | Baixa | Médio | Exponential backoff + Shopify cost tracking (GraphQL) |
| 4 | Imagem rejeitada (>20MB ou formato errado) | Baixa | Baixo | Converter para JPEG ≤5MB antes do upload |
| 5 | Token offline revogado manualmente | Baixa | Alto | Detectar 401 → marcar conexão como error → pedir reconexão |
| 6 | Lojista desinstala durante importação | Baixa | Médio | Webhook APP_UNINSTALLED cancela jobs em andamento |
| 7 | Conflito de sync (editou Shopify E Vizzu) | Média | Médio | Flag "conflict" + data_hash para detectar + UI para resolver |
| 8 | Shopify muda API (breaking change) | Baixa | Alto | Versionar API (pin 2025-10), monitorar changelog Shopify |
| 9 | Iframe bloqueado por extensão/browser | Baixa | Alto | App Bridge resolve (token-based, não cookie) |
| 10 | Supabase Storage cheio | Baixa | Alto | Monitorar uso de disco (Plano Pro = 8GB). Alertar a 70% |
| 11 | **ZERO risco ao sistema atual** | — | — | Gateway é projeto separado. Tabelas novas. Endpoints novos. Nenhuma mudança em código existente |

### 12.1 Impacto em usuários sem Shopify

**ZERO.** Usuários que não conectam Shopify:
- Nunca veem interface de Shopify
- Nunca passam pelo gateway
- Continuam usando o Vizzu exatamente igual
- Mesma performance, mesmos endpoints, mesma experiência

O gateway Shopify é um projeto à parte que só é ativado quando o lojista instala o app Shopify.

---

## 13. Visão Multi-Plataforma (Futuro)

### 13.1 Arquitetura Gateway-per-Platform

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Gateway Shopify │   │ Gateway Magento  │   │  Gateway VTEX    │
│  (Node.js)       │   │ (Node.js)        │   │  (Node.js)       │
│  Vercel          │   │ Vercel           │   │  Vercel          │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                       │
         │   ┌──────────────────┤───────────────────────┤
         │   │  Formato padronizado:                    │
         │   │  {                                       │
         │   │    platform: 'shopify' | 'magento' | 'vtex'
         │   │    store_domain: string                  │
         │   │    products: StandardProduct[]            │
         │   │  }                                       │
         ▼   ▼                                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  N8N (Lógica de Negócio)                     │
│                                                              │
│  /vizzu/ecommerce/import          → importa (qualquer plat) │
│  /vizzu/ecommerce/export-image    → exporta (qualquer plat) │
│  /vizzu/ecommerce/sync            → sincroniza              │
│                                                              │
│  ⚡ Platform-agnostic: recebe formato padronizado,           │
│     não sabe se veio do Shopify, Magento ou VTEX            │
└──────────────────────────────────────────────────────────────┘
```

### 13.2 Formato padronizado de produto

```typescript
interface StandardEcommerceProduct {
  // Identificação
  platform: 'shopify' | 'magento' | 'vtex';
  external_id: string;           // GID Shopify, entity_id Magento, skuId VTEX

  // Dados básicos
  name: string;
  description: string;
  sku: string;
  brand: string;
  category_external: string;     // Categoria no e-commerce original
  category_vizzu?: string;       // Mapeamento (se já resolvido)
  tags: string[];

  // Preços
  price: number;
  price_sale?: number;
  currency: string;

  // Imagens (URLs públicas)
  images: Array<{
    url: string;
    alt?: string;
    position: number;
    width?: number;
    height?: number;
  }>;

  // Variantes
  variants: Array<{
    external_id: string;
    title: string;
    sku: string;
    price: number;
    options: Record<string, string>;  // Ex: { "Cor": "Azul", "Tamanho": "M" }
  }>;

  // Status
  is_active: boolean;
}
```

### 13.3 Tabela genérica `ecommerce_connections`

A coluna `platform` permite:
```sql
-- Shopify
INSERT INTO ecommerce_connections (platform, store_domain, ...)
VALUES ('shopify', 'minha-loja.myshopify.com', ...);

-- Magento (futuro)
INSERT INTO ecommerce_connections (platform, store_domain, ...)
VALUES ('magento', 'minha-loja.com.br', ...);

-- VTEX (futuro)
INSERT INTO ecommerce_connections (platform, store_domain, ...)
VALUES ('vtex', 'minha-loja.vtexcommercestable.com.br', ...);
```

### 13.4 Roadmap de plataformas

| Plataforma | Prioridade | Complexidade | Auth |
|-----------|-----------|-------------|------|
| Shopify | 🔴 Agora | Média | OAuth 2.0 |
| Magento 2 | 🟡 Q2 2026 | Alta | Integration Token ou OAuth |
| VTEX | 🟡 Q3 2026 | Média | API Key + Token |
| Mercado Livre | 🟢 Q4 2026 | Média | OAuth 2.0 |
| Amazon | 🟢 2027 | Alta | SP-API (OAuth 2.0) |

---

## 14. Fases de Implementação

### Fase 1 — Fundação do Gateway ✅ COMPLETA

- [x] Criar Shopify Partner Account
- [x] `shopify app init` com template React Router + Prisma
- [x] Configurar Prisma com Supabase Postgres (pooler porta 6543, região gru1)
- [x] OAuth flow completo (install → callback → token offline)
- [x] Session management funcionando (Prisma adapter)
- [x] 3 webhooks GDPR implementados (customers_data_request, customers_redact, shop_redact)
- [x] Webhook APP_UNINSTALLED (limpa sessões + marca conexão como uninstalled)
- [x] Criar tabelas Supabase (4 tabelas: ecommerce_connections, ecommerce_product_map, ecommerce_image_exports, ecommerce_sync_log)
- [x] Deploy no Vercel (`vizzu-shopify-gateway.vercel.app`, região gru1)
- [x] Testar com dev store (`vizzu-test-store.myshopify.com`)

**Entregável**: ✅ App Shopify instalável que autentica e salva token

### Fase 2 — Vinculação + Importação ✅ COMPLETA

- [x] Linking flow (HMAC + JWT Supabase → vincula Shopify ↔ Vizzu user)
- [x] Tela Settings no gateway com botão "Vincular conta Vizzu"
- [x] Página ConnectShopifyPage no Vizzu (`#connect-shopify`)
- [x] Hook useShopifyConnection no Vizzu
- [x] Tab Integrações no SettingsPage do Vizzu
- [x] Bulk Operation (importar tudo) — botão no dashboard do gateway
- [x] Webhook BULK_OPERATIONS_FINISH → baixa JSONL → envia ao N8N
- [x] Endpoint N8N: `/vizzu/shopify/import` (Webhook → Code node → Respond)
  - [x] Mapeamento de categorias (67 entradas EN+PT, lookup exato + parcial)
  - [x] INSERT products + product_images + ecommerce_product_map
  - [x] Dedup por shopify_id (skip se já importado)
  - [x] Sync log em ecommerce_sync_log
- [x] Registro automático de webhooks via GraphQL (BULK_OPERATIONS_FINISH + APP_UNINSTALLED)
- [ ] Resource Picker (selecionar produtos individuais) — **adiado**
- [ ] Tela de progresso + resumo da importação no gateway — **adiado**
- [ ] Webhooks PRODUCTS_CREATE/UPDATE/DELETE com sync real — **adiado**

**Resultado**: 17/17 produtos importados com imagens da dev store Shopify

### Fase 3 — Exportação — PENDENTE

- [ ] Botão "Enviar para Shopify" no frontend Vizzu
  - Só aparece se `ecommerce_connections` existe e está ativa
  - Aparece em: Product Studio, Creative Still, Look Composer, Download Modal
- [ ] Modal de escolha (adicionar/substituir/definir principal)
- [ ] Novo endpoint N8N: `/vizzu/shopify/export-image`
  - stagedUploadsCreate → upload → fileCreate → productSet
  - Polling de status (PROCESSING → READY)
  - Metafield $app:vizzu com metadata
- [ ] Tabela ecommerce_image_exports com log
- [ ] Feedback visual: "Imagem enviada para Shopify!"

**Entregável**: Lojista exporta imagens otimizadas de volta ao Shopify

### Fase 4 — Iframe Embed + Polish — PENDENTE

- [ ] App Bridge setup (session token authentication)
- [ ] Polaris shell (navbar, loading states)
- [ ] Iframe embed do Vizzu React app
  - Detectar `source=shopify` e ajustar UI (esconder sidebar? mostrar botão Shopify?)
- [ ] Sync status dashboard (última sync, conflitos, erros)
- [ ] Error handling robusto (token revogado, rate limits, falhas de rede)
- [ ] Testes end-to-end com dev store

**Entregável**: Lojista usa Vizzu de dentro do Shopify Admin

### Fase 5 — Cleanup + Lançamento — PENDENTE

- [ ] Remover endpoints de diagnóstico (`/api/debug`, `/api/check-import`, `/api/trigger-import`)
- [ ] Automatizar registro de webhooks (hoje é manual via trigger-import)
- [ ] Implementar re-upload assíncrono de imagens (CDN Shopify → Supabase Storage)
- [ ] Teste com loja real (catálogo de verdade)
- [ ] Teste de edge cases (loja com 5000 produtos, imagens pesadas, sync conflitos)
- [ ] Monitoramento (logs no gateway, alertas de erro)
- [ ] Documentação para lojistas (como instalar, como usar)
- [ ] Soft launch com primeiros lojistas (link direto, unlisted)

**Entregável**: App funcional para primeiros lojistas beta

---

## 15. Lições Aprendidas (Bugs e Soluções)

Documentação dos problemas encontrados durante a implementação para referência futura.

### 15.1 React Router v7 — Server-only module em rotas

**Problema**: Exportar funções custom (como `handleBulkOperationFinish`) de um arquivo de rota (`webhooks.tsx`) que importa módulos server-only causa erro de build:
```
Server-only module referenced by client
```
React Router v7 faz code splitting automático: exports não-padrão (`loader`, `action`) de rotas são incluídos no bundle do client.

**Solução**: Mover lógica server-only para `app/lib/*.server.ts`. Arquivos em `lib/` não são sujeitos ao code splitting de rotas.

### 15.2 Vercel — N8N_WEBHOOK_URL sem /webhook

**Problema**: `N8N_WEBHOOK_URL` estava configurado como `https://n8nwebhook.brainia.store` (sem `/webhook`). As chamadas ao N8N retornavam 404 silenciosamente.

**Solução**: A URL correta é `https://n8nwebhook.brainia.store/webhook`. O N8N espera o path `/webhook/` antes do path do workflow.

**Regra**: URLs de webhook N8N SEMPRE seguem o padrão: `{base}/webhook/{path}` (produção) ou `{base}/webhook-test/{path}` (teste).

### 15.3 N8N Code Node — Acesso a dados do webhook

**Problema**: `$input.first().json` nem sempre contém os dados diretamente. Dependendo de como o N8N recebe o POST, os dados podem estar em `.json`, `.json.body` (como objeto), ou `.json.body` (como string).

**Solução**: Fallback logic:
```javascript
const rawInput = $input.first().json;
let inputData;
if (rawInput.products && Array.isArray(rawInput.products)) {
  inputData = rawInput;
} else if (rawInput.body && typeof rawInput.body === 'object') {
  inputData = rawInput.body;
} else if (typeof rawInput.body === 'string') {
  inputData = JSON.parse(rawInput.body);
}
```

### 15.4 N8N Task Runner — Upload binário impossível

**Problema**: `this.helpers.httpRequest` serializa Buffer como JSON `{"type":"Buffer","data":[...]}` em vez de enviar bytes crus. Isso torna impossível fazer upload binário para Supabase Storage diretamente do Code node.

**Solução**: Não fazer re-upload. Usar URLs do CDN Shopify diretamente na `product_images.url`. Setar `storage_path` como path descritivo (`external/shopify/{productId}/{fileName}`) para satisfazer constraint NOT NULL.

**Futuro**: Implementar re-upload via worker separado ou via nós HTTP Request dedicados (fora do Code node).

### 15.5 Supabase — Região do database pooler

**Problema**: O `DATABASE_URL` do Prisma precisa usar o pooler do Supabase (porta 6543) na mesma região do projeto. Usar a conexão direta ou região errada causa timeout.

**Solução**: Usar URL do pooler com `?pgbouncer=true` na query string do `DATABASE_URL`.

### 15.6 Vercel — Parallel loaders e redirect

**Problema**: No `app.settings.tsx`, dois loaders rodavam em paralelo (admin auth + Supabase query). No Vercel serverless, se o admin loader falhava e redirecionava para `/auth/login`, isso cortava a resposta do Supabase loader, causando crash.

**Solução**: Tratar erro do admin loader como "não autenticado" com try/catch, retornando dados parciais em vez de quebrar.

### 15.7 Dedup e import idempotente

**Problema**: Após um import parcial falhar, reimportar resultava em "products_skipped: 17" porque os registros de `ecommerce_product_map` da tentativa anterior já existiam.

**Solução**: Para limpar e reimportar, deletar na ordem: `product_images` → `ecommerce_product_map` → `ecommerce_sync_log` → `products`. Respeitar FKs.

**Melhoria futura**: Adicionar opção "force reimport" que limpa automaticamente dados de imports anteriores.

### 15.8 HTTP 409 — Produtos órfãos

**Problema**: Tentativas de import anteriores criaram produtos com UUIDs diferentes mas mesmo SKU. Ao reimportar, o INSERT em `products` dava 409 (unique constraint violation no SKU).

**Solução**: Identificar e deletar produtos órfãos (que existem na tabela `products` mas não têm correspondência em `ecommerce_product_map`).

---

## 16. Referência — Stack Atual Completa

### 16.1 Estrutura de Diretórios — App Principal (Vizzu)

```
src/
├── components/
│   ├── CreativeStill/          # Editor + @ mentions + composição + resultados
│   ├── LookComposer/           # Composer + editor + resultados
│   ├── Provador/               # Wizard 4 steps + WhatsApp
│   ├── ProductStudio/          # Multi-ângulo + edição inline
│   ├── BulkImport/             # Importação em massa (local only)
│   ├── RegisterAllWizard.tsx   # Wizard multi-produto da IA
│   ├── Layout/                 # AppLayout, Sidebar, TopBar
│   └── shared/
│       ├── DownloadModal.tsx   # Download centralizado (2 etapas, 6 presets, ZIP)
│       └── ProductHubModal.tsx # Hub 360° do produto
├── contexts/
│   ├── AuthContext.tsx
│   ├── UIContext.tsx            # Tema (light/dark/high-contrast)
│   ├── ProductsContext.tsx      # Carregamento de produtos
│   ├── GenerationContext.tsx    # Lock de geração
│   └── ...
├── hooks/
│   ├── useCredits.ts           # Saldo de créditos
│   ├── useShopifyConnection.ts # ✨ NOVO — query ecommerce_connections
│   └── planDefaults.ts         # Definição dos planos
├── lib/
│   ├── api/
│   │   ├── studio.ts           # 17 endpoints N8N (geração)
│   │   ├── billing.ts          # 7 endpoints N8N (billing)
│   │   └── shopify.ts          # ✨ NOVO (futuro) — endpoints de export
│   └── productConfig.ts        # 5 tipos × 30+ categorias × atributos
├── types.ts                    # Todos os tipos
├── services/
│   └── supabaseClient.ts       # Config Supabase
└── pages/
    ├── SettingsPage.tsx         # Configurações + temas + tab Integrações (Shopify)
    ├── ConnectShopifyPage.tsx   # ✨ NOVO — página de linking (#connect-shopify)
    └── ...
```

### 16.2 Estrutura de Diretórios — Gateway Shopify

```
shopify-gateway/
├── app/
│   ├── lib/
│   │   ├── import.server.ts          # handleBulkOperationFinish() — JSONL → N8N
│   │   ├── supabase.server.ts        # supabaseQuery() helper REST
│   │   └── shopify-linking.server.ts # HMAC + validação de linking
│   ├── routes/
│   │   ├── app.tsx                   # Layout Polaris (shell)
│   │   ├── app._index.tsx            # Dashboard: produtos + "Importar Tudo"
│   │   ├── app.settings.tsx          # Settings: linking Vizzu
│   │   ├── webhooks.tsx              # Todos os webhooks (switch por topic)
│   │   ├── api.connect-vizzu.tsx     # POST: linking (HMAC + JWT)
│   │   └── api.trigger-import.tsx    # GET: manutenção (webhooks + process)
│   ├── shopify.server.ts             # Shopify adapter config
│   └── db.server.ts                  # Prisma client
├── prisma/
│   └── schema.prisma                 # Session model
├── n8n-workflows/
│   └── code-nodes/
│       └── shopify-import-products.js # Code node do workflow de import
├── shopify.app.toml                  # Config do app Shopify
└── package.json
```

### 16.3 Estrutura N8N — Workflow de Import

```
Workflow: "Shopify Import Products"
├── Node 1: Webhook (POST /vizzu/shopify/import, responseMode=responseNode)
├── Node 2: Code (shopify-import-products.js — toda a lógica de import)
└── Node 3: Respond to Webhook (retorna JSON com resultado)
```

### 16.4 Variáveis de Ambiente do Frontend

```env
VITE_SUPABASE_URL=https://dbdqiqehuapcicejnzyd.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_N8N_WEBHOOK_URL=https://n8nwebhook.brainia.store
VITE_STRIPE_PUBLISHABLE_KEY=xxx
```

### 16.5 Ferramentas de Geração — Custo em Créditos

| Ferramenta | Créditos | Observação |
|-----------|---------|-----------|
| Studio Ready | 1 | Fundo branco |
| Product Studio (por ângulo) | 1 | Ex: 4 ângulos = 4 créditos |
| Product Studio 4K | 2/ângulo | Dobro |
| Cenário Criativo | 1 | Cena temática |
| Modelo IA (describe) | 1 | Produto único no modelo |
| Modelo IA (composer) | 2 | Look multi-peça |
| Creative Still | 1/variação | Ex: 3 variações = 3 créditos |
| Provador Virtual | 1 | Try-on com foto real |
| Edição (PS/CS/LC) | 1-2 | 1 em 2K, 2 em 4K |
| Modelo Salvo (frente+costas) | 2 | Gera 2 imagens |

---

## 17. Perguntas em Aberto / Resolvidas

### Resolvidas

| # | Pergunta | Resolução |
|---|----------|-----------|
| 1 | **Domínio do gateway** | `vizzu-shopify-gateway.vercel.app` (Vercel auto). Futuro: `shopify.vizzu.pro` |
| 2 | **Multi-loja** | Sim — schema suporta via UNIQUE(platform, store_domain). Não testado ainda |
| 3 | **Conflito de billing** | Mesma conta! Linking detecta user existente e vincula |
| 5 | **Limite de storage** | **Não se aplica no momento** — imagens ficam no CDN Shopify, não no Supabase Storage. Se implementar re-upload, aí sim precisa calcular |

### Em Aberto

| # | Pergunta | Impacto | Sugestão |
|---|----------|---------|---------|
| 4 | **Imagens PNG do Gemini**: Converter pra JPEG antes de exportar ao Shopify? | Performance | Sim — Shopify aceita JPEG (menor, mais rápido) |
| 6 | **Marca d'água no Trial**: Manter ao exportar pro Shopify? | Produto | Sim — incentiva upgrade |
| 7 | **Re-upload de imagens**: Copiar do CDN Shopify para Supabase Storage? | Resiliência | Recomendado — se lojista desinstala Shopify, URLs do CDN podem quebrar. Implementar como job assíncrono |
| 8 | **Webhook registration automático**: Registrar via toml ou GraphQL? | DevX | Hoje manual via `/api/trigger-import`. Shopify CLI deveria registrar via `shopify.app.toml` mas não está funcionando. Investigar |

---

## Próximos Passos Imediatos

1. **Dev**: Implementar exportação (Vizzu → Shopify) — Fase 3
2. **Dev**: Remover endpoints de diagnóstico (`/api/debug`, `/api/check-import`)
3. **Dev**: Automatizar registro de webhooks para novas lojas
4. **Kaique**: Testar import com loja real (catálogo maior)
5. **Dev**: Implementar re-upload assíncrono de imagens (CDN Shopify → Supabase Storage)

---

*Documento atualizado em 2026-02-14. Versão 3.0 — reflete implementação real: gateway deployado, linking e import funcionando end-to-end (17/17 produtos com imagens da dev store).*
