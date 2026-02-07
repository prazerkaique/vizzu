# Guia do Copiloto — Vizzu

> Documento de memória para o assistente de desenvolvimento (Claude).
> Contém contexto do projeto, preferências do dono e decisões técnicas.

---

## Sobre o Dono do Projeto

- **Idioma**: Sempre comunicar em **português brasileiro**
- **Perfil técnico**: Não é desenvolvedor, mas tem conhecimento básico de programação e intermediário de Supabase
- **Ambiente de trabalho**: Não roda nada local — deploy via Vercel, edições via assistente, Supabase via Dashboard (SQL Editor)
- **Preferências de comunicação**:
  - Explicar os problemas que estão sendo corrigidos e como foram resolvidos
  - Ser direto mas didático — não assumir conhecimento avançado de código
  - Quando alterar código, explicar o "porquê" e não só o "o quê"
  - Pode usar termos técnicos desde que explique brevemente
- **SQL**: Sabe rodar queries no SQL Editor do Supabase sem problemas
- **N8N**: Usa para orquestração dos webhooks — assistente não tem acesso direto, gera JSONs para importação

---

## Sobre o Vizzu

### O que é
Plataforma SaaS de geração de imagens por IA para e-commerce brasileiro. Lojistas sobem fotos de produtos e a IA gera imagens profissionais para marketing — fundo branco, cenários criativos, modelos vestindo peças, provador virtual, etc.

### Público-alvo
Lojistas e equipes de marketing de e-commerce no Brasil.

### URLs
- **App (atual)**: `https://vizzu.pro`
- **App (futuro)**: `https://app.vizzu.pro` (quando a landing page ocupar vizzu.pro)
- **N8N Editor**: `https://n8neditor.brainia.store`
- **N8N Webhook**: `https://n8nwebhook.brainia.store`
- **Supabase**: `https://dbdqiqehuapcicejnzyd.supabase.co`

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend/BaaS | Supabase (Auth, PostgreSQL + RLS, Storage) |
| Orquestração IA | N8N webhooks → Google Gemini (chave protegida no backend) |
| Pagamentos | Stripe / Mercado Pago via N8N |
| Deploy | Vercel |
| PWA | Service Worker com cache versioning |

### Arquitetura do Frontend
- 53 arquivos TypeScript, ~1.5 MB source
- 7 Contexts: Auth, UI, Products, Clients, History, Generation, Plans
- Code splitting com lazy loading nos componentes pesados
- App.tsx refatorado (de ~8k → ~800 linhas)
- APIs centralizadas em `src/lib/api/` (studio.ts, billing.ts)

---

## Sistema de Créditos

**Regra fundamental**: 1 geração de imagem = 1 crédito. Sempre.

| Ação | Créditos | Motivo |
|---|---|---|
| Qualquer geração de imagem | 1 | 1 imagem = 1 crédito |
| Frente + costas | 2 | São 2 gerações |
| Criação de modelo personalizado | 2 | Gera frente + costas |
| Geração em 4K | 2 | Consome o dobro |

Não existe custo variável por ferramenta. O custo é sempre baseado na quantidade de imagens geradas.

---

## Ferramentas de Geração

| Ferramenta | O que faz |
|---|---|
| Studio Ready | Fundo branco profissional |
| Product Studio v2 | Fotos multi-ângulo (ghost mannequin, flat-lay) |
| Cenário Criativo | Cena temática customizada |
| Modelo IA | Modelo humano vestindo o produto |
| Look Composer | Composição multi-peça com modelo |
| Provador Virtual | Try-on com foto do cliente real |
| Creative Still | Composição estilizada de produto |
| Refine | Ajuste fino em imagem já gerada |

---

## Planos e Preços

> Fonte: `src/hooks/planDefaults.ts` + tabela `plans` no Supabase.
> **Nota**: Verificar com o dono se os valores abaixo estão atualizados.

| Plano | Mensal | Anual/mês | Gerações/mês | Crédito extra | Resolução |
|---|---|---|---|---|---|
| Trial | Grátis | — | 5 (único, não renova) | — | 2K + marca d'água |
| Basic | R$ 127 | R$ 107 | 40 | R$ 3,50 | 2K |
| Pro | R$ 187 | R$ 157 | 100 | R$ 3,00 | 4K |
| Premier | R$ 327 | R$ 267 | 200 | R$ 2,50 | 4K |
| Enterprise | Sob consulta | Sob consulta | 400+ | Custom | 4K |

**Desconto anual**: 20%
**Pacotes de créditos avulsos**: 10, 25, 50, 100 créditos
**Métodos de pagamento**: Pix, Cartão de Crédito, Boleto

---

## Identidade Visual

### Cores Principais

| Cor | Hex | Uso |
|---|---|---|
| Coral (primária) | `#FF6B6B` | CTAs, botões, gradientes, identidade da marca |
| Laranja (secundária) | `#FF9F43` | Gradiente com coral, acentos |
| Roxo (destaque) | `#A855F7` | Badges, tutoriais, plano Enterprise |
| Verde (sucesso) | `#4ADE80` | Indicadores de sucesso |
| Rosa claro | `#FF6B9D` | Variação do gradiente estendido |

### Backgrounds

| Contexto | Cor |
|---|---|
| Light mode (fundo) | `#f7f5f2` (creme quente) |
| Light mode (sidebar) | `#efebe6` |
| Dark mode (fundo) | `#000000` |
| Dark mode (superfícies) | `#1A1A1A` |
| Bordas | `#e5e6ea` |

### Texto

| Contexto | Cor |
|---|---|
| Light mode (principal) | `#373632` (marrom-cinza escuro) |
| Light mode (secundário) | `#373632` com 60% opacidade |
| Dark mode (principal) | `#ffffff` |
| Dark mode (secundário) | `neutral-400` |

### Gradiente Principal (Marca Vizzu)
```
bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43]
```
Usado em: botões CTA, barra de progresso, nav ativa, ícone mobile central.

### Tipografia

| Fonte | Tipo | Uso |
|---|---|---|
| **Plus Jakarta Sans** | Sans-serif | Corpo, headings, UI geral (400–800) |
| **Inria Serif** | Serif | Tagline "Estúdio de Bolso", textos decorativos (300–700) |

### Filosofia de Design

- **Minimalista**: Poucas sombras, linhas limpas, whitespace generoso
- **Quente e acessível**: Fundo creme, acentos coral
- **Mobile-first**: PWA otimizado, safe areas, swipe navigation
- **Dark mode completo**: Glassmorphism com backdrop-blur
- **Cantos arredondados**: `rounded-xl` (12px) é o padrão para cards e botões

### Assets da Marca

| Arquivo | Uso |
|---|---|
| `/Logo2Black.png` | Logo light mode |
| `/Logo2White.png` | Logo dark mode |
| `/vizzu-icon-white.png` | Ícone do app |
| `/favicon.svg` | Favicon |
| `/apple-touch-icon.png` | Ícone iOS |

---

## Supabase — Schema Completo

> Dump real do banco em Fevereiro/2026. 19 tabelas + 2 views.

### Tabelas (19)

#### `products`
Catálogo de produtos do usuário.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | NO | — |
| `sku` | text | NO | — |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `category` | text | YES | — |
| `brand` | text | YES | — |
| `color` | text | YES | — |
| `fit` | text | YES | — |
| `collection` | text | YES | — |
| `is_optimized` | boolean | YES | false |
| `optimization_count` | integer | YES | 0 |
| `attributes` | jsonb | YES | '{}' |
| `has_detail_image` | boolean | YES | false |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `product_images`
Imagens vinculadas a produtos (originais + geradas).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `product_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `type` | text | NO | — |
| `storage_path` | text | NO | — |
| `url` | text | YES | — |
| `generation_id` | uuid | YES | — |
| `file_name` | text | YES | — |
| `file_size` | integer | YES | — |
| `mime_type` | text | YES | — |
| `width` | integer | YES | — |
| `height` | integer | YES | — |
| `display_order` | integer | YES | 0 |
| `is_primary` | boolean | YES | false |
| `angle` | text | YES | — |
| `session_id` | text | YES | — |
| `metadata` | jsonb | YES | '{}' |
| `created_at` | timestamptz | YES | now() |

#### `generations`
Registro de todas as gerações de imagem (async com polling).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | NO | — |
| `type` | text | NO | — |
| `product_id` | uuid | YES | — |
| `client_id` | uuid | YES | — |
| `input_image_url` | text | NO | — |
| `output_image_url` | text | YES | — |
| `output_storage_path` | text | YES | — |
| `prompt` | text | YES | — |
| `negative_prompt` | text | YES | — |
| `model_config` | jsonb | YES | '{}' |
| `credits_used` | integer | NO | 1 |
| `status` | text | YES | 'pending' |
| `error_message` | text | YES | — |
| `started_at` | timestamptz | YES | — |
| `completed_at` | timestamptz | YES | — |
| `processing_time_ms` | integer | YES | — |
| `studio_image_url` | text | YES | — |
| `output_urls` | jsonb | YES | — |
| `total_tokens` | integer | YES | 0 |
| `linked_to` | uuid | YES | — |
| `resolution` | varchar | YES | '2k' |
| `created_at` | timestamptz | YES | now() |

#### `saved_models`
Modelos IA salvos pelo usuário (personalizados + pré-definidos).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | — |
| `name` | varchar | NO | — |
| `gender` | varchar | NO | — |
| `ethnicity` | varchar | NO | — |
| `skin_tone` | varchar | NO | — |
| `body_type` | varchar | NO | — |
| `age_range` | varchar | NO | — |
| `height` | varchar | NO | — |
| `hair_color` | varchar | NO | — |
| `hair_style` | varchar | NO | — |
| `eye_color` | varchar | NO | — |
| `expression` | varchar | NO | — |
| `bust_size` | varchar | YES | — |
| `waist_type` | varchar | YES | — |
| `reference_image_url` | text | YES | — |
| `reference_storage_path` | text | YES | — |
| `images` | jsonb | YES | '{}' |
| `status` | varchar | YES | 'draft' |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `clients`
Cadastro de clientes do lojista.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | NO | — |
| `first_name` | text | NO | — |
| `last_name` | text | NO | — |
| `whatsapp` | text | NO | — |
| `email` | text | YES | — |
| `notes` | text | YES | — |
| `status` | text | YES | 'active' |
| `total_orders` | integer | YES | 0 |
| `total_provador_uses` | integer | YES | 0 |
| `last_provador_at` | timestamptz | YES | — |
| `has_provador_ia` | boolean | YES | false |
| `gender` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `last_contact_at` | timestamptz | YES | — |

#### `client_photos`
Fotos reais dos clientes (para provador virtual).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `client_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `type` | text | NO | — |
| `storage_path` | text | NO | — |
| `url` | text | YES | — |
| `file_size` | integer | YES | — |
| `width` | integer | YES | — |
| `height` | integer | YES | — |
| `created_at` | timestamptz | YES | now() |

#### `client_looks`
Looks gerados para clientes (provador virtual).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `client_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `image_url` | text | NO | — |
| `storage_path` | text | YES | — |
| `look_items` | jsonb | NO | '{}' |
| `notes` | text | YES | — |
| `created_at` | timestamptz | YES | now() |

#### `provador_results`
Resultados detalhados do provador virtual, incluindo status de envio por WhatsApp.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `generation_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `client_id` | uuid | NO | — |
| `look_composition` | jsonb | NO | '{}' |
| `photo_type` | text | NO | — |
| `output_url` | text | YES | — |
| `output_storage_path` | text | YES | — |
| `whatsapp_sent` | boolean | YES | false |
| `whatsapp_sent_at` | timestamptz | YES | — |
| `whatsapp_message` | text | YES | — |
| `created_at` | timestamptz | YES | now() |

#### `creative_still_templates`
Templates de cena para Creative Still.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | — |
| `name` | text | NO | — |
| `thumbnail_url` | text | YES | — |
| `mode` | text | NO | 'simple' |
| `aesthetic_preset` | text | YES | — |
| `aesthetic_custom` | text | YES | — |
| `surface_description` | text | NO | '' |
| `elements_description` | text | YES | — |
| `elements_images` | jsonb | YES | '[]' |
| `environment_description` | text | YES | — |
| `mood_season` | text | YES | — |
| `product_presentation` | text | YES | — |
| `product_scale` | text | YES | 'medium' |
| `lighting` | text | NO | 'ai_choose' |
| `camera_type` | text | NO | 'ai_choose' |
| `lens_model` | text | NO | 'ai_choose' |
| `camera_angle` | text | NO | 'ai_choose' |
| `depth_of_field` | integer | NO | 50 |
| `color_tone` | text | NO | 'ai_choose' |
| `color_style` | text | NO | 'ai_choose' |
| `color_grading_temperature` | text | YES | 'neutral' |
| `color_grading_style` | text | YES | 'ai_choose' |
| `color_grading_reference_url` | text | YES | — |
| `composition_reference_url` | text | YES | — |
| `texture_grain` | text | YES | 'clean' |
| `frame_ratio` | text | NO | '4:5' |
| `resolution` | text | YES | '2k' |
| `default_variations` | integer | YES | 2 |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `creative_still_generations`
Gerações feitas a partir de templates Creative Still.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | — |
| `template_id` | uuid | YES | — |
| `product_id` | text | NO | — |
| `additional_products` | jsonb | YES | '[]' |
| `settings_snapshot` | jsonb | YES | '{}' |
| `variation_1_url` | text | YES | — |
| `variation_2_url` | text | YES | — |
| `variation_urls` | jsonb | YES | '[]' |
| `variations_requested` | integer | YES | 2 |
| `selected_variation` | integer | YES | — |
| `reference_image_url` | text | YES | — |
| `resolution` | text | YES | '2k' |
| `credits_used` | integer | NO | 2 |
| `status` | text | NO | 'pending' |
| `error_message` | text | YES | — |
| `is_favorite` | boolean | NO | false |
| `created_at` | timestamptz | YES | now() |
| `completed_at` | timestamptz | YES | — |

#### `user_credits`
Saldo de créditos do usuário.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `user_id` | uuid | NO | — (PK) |
| `balance` | integer | NO | 0 |
| `lifetime_purchased` | integer | NO | 0 |
| `lifetime_used` | integer | NO | 0 |
| `last_renewal_credits` | integer | NO | 0 |
| `updated_at` | timestamptz | YES | now() |

#### `user_subscriptions`
Assinatura ativa do usuário.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | — (UNIQUE) |
| `plan_id` | text | NO | 'free' |
| `status` | text | NO | 'active' |
| `billing_period` | text | NO | 'monthly' |
| `current_period_start` | timestamptz | NO | now() |
| `current_period_end` | timestamptz | NO | now() + 30 days |
| `cancel_at_period_end` | boolean | YES | false |
| `stripe_subscription_id` | text | YES | — |
| `stripe_customer_id` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `credit_transactions`
Histórico de movimentação de créditos.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | NO | — |
| `type` | text | NO | — |
| `amount` | integer | NO | — |
| `balance_after` | integer | NO | — |
| `description` | text | NO | — |
| `generation_id` | uuid | YES | — |
| `stripe_payment_id` | text | YES | — |
| `stripe_invoice_id` | text | YES | — |
| `created_at` | timestamptz | YES | now() |

#### `checkout_sessions`
Sessões de pagamento (Stripe/Mercado Pago).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO | — |
| `type` | text | NO | — |
| `status` | text | NO | 'pending' |
| `amount` | integer | YES | — |
| `plan_id` | text | YES | — |
| `billing_period` | text | YES | — |
| `stripe_session_id` | text | YES | — |
| `expires_at` | timestamptz | NO | now() + 30min |
| `created_at` | timestamptz | YES | now() |

#### `plans`
Definição dos planos disponíveis (público, leitura para todos).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | text | NO | — (PK) |
| `name` | text | NO | — |
| `generation_limit` | integer | NO | 0 |
| `product_limit` | integer | NO | 0 |
| `price_monthly` | numeric | NO | 0 |
| `price_yearly` | numeric | NO | 0 |
| `credit_price` | numeric | NO | 0 |
| `max_resolution` | text | NO | '2k' |
| `has_watermark` | boolean | NO | false |
| `badge` | text | YES | — |
| `badge_color` | text | YES | — |
| `features` | jsonb | NO | '[]' |
| `highlight` | boolean | NO | false |
| `persona` | text | YES | — |
| `cta_label` | text | YES | — |
| `included_features` | jsonb | NO | '[]' |
| `stripe_product_id` | text | YES | — |
| `stripe_price_monthly_id` | text | YES | — |
| `stripe_price_yearly_id` | text | YES | — |
| `sort_order` | integer | NO | 0 |
| `active` | boolean | NO | true |
| `created_at` | timestamptz | NO | now() |
| `updated_at` | timestamptz | NO | now() |

#### `history_logs`
Auditoria de ações do usuário.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | text | NO | — (PK) |
| `user_id` | uuid | NO | — |
| `date` | timestamptz | YES | now() |
| `action` | text | NO | — |
| `details` | text | YES | — |
| `status` | text | YES | 'success' |
| `method` | text | YES | 'manual' |
| `cost` | integer | YES | 0 |
| `items_count` | integer | YES | 0 |
| `created_at` | timestamptz | YES | now() |

#### `company_settings`
Configurações da empresa do usuário (tom de voz, legendas, etc).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `user_id` | uuid | NO | — (PK) |
| `name` | text | NO | '' |
| `cnpj` | text | YES | — |
| `instagram` | text | YES | — |
| `target_audience` | text | YES | '' |
| `voice_tone` | text | YES | 'casual' |
| `voice_examples` | text | YES | — |
| `hashtags` | text[] | YES | '{}' |
| `emojis_enabled` | boolean | YES | true |
| `caption_style` | text | YES | 'media' |
| `call_to_action` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `whatsapp_templates`
Templates de mensagens para WhatsApp.

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | uuid | YES | — |
| `name` | text | NO | — |
| `message` | text | NO | — |
| `is_default` | boolean | YES | false |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

#### `app_config`
Configurações globais da aplicação (público).

| Coluna | Tipo | Null | Default |
|---|---|---|---|
| `key` | text | NO | — (PK) |
| `value` | jsonb | NO | — |

### Views (2)

#### `clients_with_photos_view`
Join de `clients` + `client_photos` agregada. Retorna todos os campos de `clients` mais:
- `photos` (jsonb) — Array de fotos agregadas
- `photo_count` (bigint) — Total de fotos

#### `products_with_images_view`
Join de `products` + `product_images` agregada. Retorna todos os campos de `products` mais:
- `images` (jsonb) — Array de imagens agregadas
- `generated_images_count` (bigint) — Total de imagens geradas

### Storage Buckets (5)
- `products` — Imagens de produto
- `client-looks` — Looks gerados
- `client-photos` — Fotos de clientes
- `model-images` — Imagens de modelos gerados
- `model-references` — Referências de modelos

### RLS Policies (Row Level Security)

Todas as tabelas têm RLS ativado. Padrão: `auth.uid() = user_id`.

| Tabela | SELECT | INSERT | UPDATE | DELETE | Observações |
|---|---|---|---|---|---|
| `products` | own | own | own | own | Completo |
| `product_images` | own | own | own | own | Completo |
| `generations` | own | own | own | — | Sem DELETE |
| `saved_models` | own | own | own | own | Completo |
| `clients` | own | own | own | own | Completo |
| `client_photos` | own | own | own | own | Completo |
| `client_looks` | own | own | — | own | Sem UPDATE |
| `provador_results` | own | own | own | — | Sem DELETE |
| `creative_still_templates` | own | own | own | own | Completo |
| `creative_still_generations` | own | own | own | own | Completo |
| `user_credits` | own | — | — | — | Só leitura (backend gerencia) |
| `user_subscriptions` | own | — | — | — | Só leitura (backend gerencia) |
| `credit_transactions` | own | — | — | — | Só leitura |
| `checkout_sessions` | own | — | — | — | Só leitura |
| `history_logs` | own | own | own | own | Completo |
| `company_settings` | own | own | own | — | Sem DELETE |
| `whatsapp_templates` | own + system* | own | own | own | *SELECT inclui templates onde user_id IS NULL (templates do sistema) |
| `plans` | **público** | — | — | — | Leitura aberta para todos |
| `app_config` | **público** | — | — | — | Leitura aberta para todos |

**Nota**: Algumas tabelas têm policies duplicadas (nomes diferentes, mesma regra). Não causa problema funcional mas pode ser limpo.

**Tabelas protegidas (só backend altera)**: `user_credits`, `user_subscriptions`, `credit_transactions`, `checkout_sessions` — o frontend só lê, quem escreve é o N8N/backend.

### Foreign Keys (Reais do Banco)

| Tabela | Coluna | Referencia | Coluna FK |
|---|---|---|---|
| `client_looks` | client_id | `clients` | id |
| `client_photos` | client_id | `clients` | id |
| `provador_results` | client_id | `clients` | id |
| `provador_results` | generation_id | `generations` | id |
| `generations` | product_id | `products` | id |
| `generations` | client_id | `clients` | id |
| `generations` | linked_to | `generations` | id |
| `product_images` | product_id | `products` | id |
| `credit_transactions` | generation_id | `generations` | id |
| `creative_still_generations` | template_id | `creative_still_templates` | id |

**Self-reference**: `generations.linked_to` → `generations.id` (permite vincular gerações relacionadas, ex: refine de uma geração anterior).

### Triggers

| Trigger | Tabela | Evento | Function |
|---|---|---|---|
| `update_clients_updated_at` | clients | UPDATE | `update_updated_at()` |
| `update_products_updated_at` | products | UPDATE | `update_updated_at()` |
| `update_plans_updated_at` | plans | UPDATE | `update_updated_at()` |
| `update_user_credits_updated_at` | user_credits | UPDATE | `update_updated_at()` |
| `update_user_subscriptions_updated_at` | user_subscriptions | UPDATE | `update_updated_at()` |
| `update_whatsapp_templates_updated_at` | whatsapp_templates | UPDATE | `update_updated_at()` |
| `trigger_update_saved_models_updated_at` | saved_models | UPDATE | `update_saved_models_updated_at()` |
| `on_generation_completed` | generations | UPDATE | `mark_product_optimized()` |
| `on_provador_result_created` | provador_results | INSERT | `update_client_provador_stats()` |

### Database Functions

| Função | Tipo | Retorno | Descrição |
|---|---|---|---|
| `update_updated_at()` | trigger | trigger | Atualiza `updated_at` automaticamente no UPDATE |
| `update_saved_models_updated_at()` | trigger | trigger | Idem, específica para saved_models |
| `create_user_credits()` | trigger | trigger | Cria registro em `user_credits` + `user_subscriptions` quando novo user se cadastra (auth.users INSERT) |
| `handle_new_user()` | trigger | trigger | Handler adicional para novo usuário |
| `mark_product_optimized()` | trigger | trigger | Quando uma geração é concluída, marca o produto como otimizado |
| `update_client_provador_stats()` | trigger | trigger | Quando um resultado do provador é criado, atualiza `total_provador_uses` e `last_provador_at` no cliente |
| `add_credits(user_id, amount)` | function | integer | Adiciona créditos ao saldo do usuário |
| `deduct_credits(user_id, amount)` | function | boolean | Debita créditos do saldo (retorna false se saldo insuficiente) |

### Segurança — Resumo

- **Multi-tenant**: RLS em todas as tabelas via `auth.uid() = user_id`
- **Tabelas públicas**: `plans` e `app_config` (só SELECT)
- **Tabelas protegidas**: `user_credits`, `user_subscriptions`, `credit_transactions`, `checkout_sessions` (frontend só lê)
- **Templates compartilhados**: `whatsapp_templates` permite ver templates do sistema (user_id IS NULL)
- **Storage**: Policies por `user_id` no path dos buckets

---

## N8N — Webhooks

**Base URL**: `https://n8nwebhook.brainia.store`

| Endpoint | Função |
|---|---|
| `/vizzu/studio-ready` | Fundo branco |
| `/vizzu/studio/generate` | Product Studio multi-ângulo |
| `/vizzu/cenario-criativo` | Cena temática |
| `/vizzu/modelo-ia-v2` | Modelo IA (com polling) |
| `/vizzu/refine-generation` | Refinamento |
| `/vizzu/get-user-billing` | Buscar assinatura/créditos |
| `/vizzu/create-checkout` | Criar sessão de pagamento |
| `/vizzu/buy-credits` | Comprar créditos |
| `/vizzu/change-plan` | Alterar plano |
| `/vizzu/cancel-subscription` | Cancelar assinatura |
| `/vizzu/use-credits` | Debitar créditos |
| `/vizzu/get-transactions` | Histórico de créditos |
| `/vizzu/checkout-status` | Status do pagamento |

**WhatsApp**: Integração via Evolution API para enviar imagens.

### N8N — Plano Atual e Limitações

- **Plano**: Community (gratuito)
- **Limitação importante**: A feature **Variables** (Settings > Variables) é exclusiva do plano pago. No plano gratuito, variáveis de ambiente como `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` e `STRIPE_SECRET_KEY` precisam ser configuradas de outra forma — diretamente nos nodes dos workflows ou via variáveis de ambiente do servidor/container.

### N8N — Regras para Criar/Corrigir Workflows

> Aprendizados da sessão de configuração (Fev/2026). Seguir SEMPRE ao criar ou corrigir workflows.

#### 1. NUNCA usar `$env` nos nós
O N8N do projeto tem `N8N_BLOCK_ENV_ACCESS_IN_NODE` ativo (padrão da versão 2.4.4). Mesmo setando `=false`, não funcionou. **Solução**: colocar URLs e chaves diretamente nos nós (hardcoded). Como o Felipe é o único usuário do N8N, não há risco.

**ERRADO:**
```
url: "={{ $env.SUPABASE_URL }}/rest/v1/rpc/deduct_credits"
apikey: "={{ $env.SUPABASE_SERVICE_KEY }}"
```

**CERTO:**
```
url: "=https://dbdqiqehuapcicejnzyd.supabase.co/rest/v1/rpc/deduct_credits"
apikey: "eyJhbGci..."  (chave completa direto)
```

#### 2. Headers obrigatórios para Supabase REST API
Todo nó HTTP Request que chama o Supabase DEVE ter estes 2 headers:
- `apikey`: service_role key completa
- `Authorization`: `Bearer` + service_role key completa

**Valores atuais:**
- **Supabase URL**: `https://dbdqiqehuapcicejnzyd.supabase.co`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZHFpcWVodWFwY2ljZWpuenlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUyMzEyNSwiZXhwIjoyMDg0MDk5MTI1fQ.YXOfEa4rdguHXVbSSYOlMN6oNsmC-qfrGRwh61vRoQM`

#### 3. Funções RPC do Supabase (usar sempre que possível)
Preferir chamadas atômicas via RPC em vez de GET → calcular → PATCH (evita race conditions):
- `POST /rest/v1/rpc/deduct_credits` — debita créditos (retorna `true`/`false`)
- `POST /rest/v1/rpc/add_credits` — adiciona créditos (retorna novo saldo)

#### 4. Tipos válidos em `credit_transactions.type`
Somente estes valores são aceitos (constraint `credit_transactions_type_check`):
- `purchase` — compra de créditos avulsos
- `usage` — uso de crédito (geração de imagem)
- `bonus` — bônus (boas-vindas, indicação, etc.)
- `refund` — estorno
- `plan_reset` — créditos de assinatura nova ou mudança de plano

**NUNCA usar `renewal`** — não existe no constraint e dá erro.

#### 5. Tabelas corretas
- Créditos ficam em `user_credits` (NÃO em `users`)
- Transações ficam em `credit_transactions`
- Não existe tabela `users` no schema public — auth fica em `auth.users`

#### 5. Teste de workflows
- Modo teste: clicar "Test workflow" ANTES de enviar o request
- URL de teste tem `/webhook-test/` no path
- URL de produção (workflow ativo) tem `/webhook/` no path
- Testar nó a nó com "Test step" quando o fluxo completo não funciona
- Ferramenta de teste HTTP recomendada: https://hoppscotch.io

#### 6. Formato do workflow JSON
- Gerar arquivo `.json` completo com nodes + connections
- **SEMPRE salvar o JSON em `n8n-workflows/` (pasta gitignored)** — NUNCA colar JSON de workflow no chat. Os JSONs contêm API keys e secrets.
- O dono importa no N8N via menu > Import from file
- Sempre incluir `webhookId` fixo para manter URL estável
- Sempre incluir nó de `Respond Error` para erros (desconectado no canvas, serve como referência)
- Nomenclatura: `{número}-{nome-do-workflow}.json` (ex: `11-analyze-product.json`)

#### 7. Body de HTTP Request — SEMPRE usar `specifyBody: "json"` com `jsonBody`
- **NUNCA** usar `specifyBody: "string"` com `body` para enviar JSON ao Supabase
- O Supabase interpreta o body como nome de coluna e retorna erro `PGRST204` ("Could not find column")
- Sempre usar `specifyBody: "json"` com `jsonBody` — o N8N faz o parse correto

**ERRADO:**
```json
"specifyBody": "string",
"body": "={{ $json.patch_body }}"
```

**CERTO:**
```json
"specifyBody": "json",
"jsonBody": "={{ $json.patch_body }}"
```

#### 8. Limitações do Code Node
- **`fetch` NÃO existe** no Code node do N8N (erro: `fetch is not defined`). Para chamadas HTTP, SEMPRE usar nós HTTP Request separados.
- **Módulos externos** só funcionam se listados em `NODE_FUNCTION_ALLOW_EXTERNAL` (atualmente: `moment,lodash,moment-with-locales`)
- Para lógica condicional (ex: criar customer só se não existe), usar o Code node para decidir e o HTTP Request para executar. O Code node referencia dados de outros nós via `$('NomeDoNó').first().json`.

---

### N8N — Avaliação de Maturidade e Plano de Evolução

> Pesquisa realizada em Fev/2026 com base em docs oficiais, fóruns, artigos técnicos e CVEs.

#### N8N é amador?

Não, mas tem limites claros. O consenso da comunidade:
- **Excelente para MVP e validação** — onde estamos agora
- **Funciona em produção de baixo/médio volume** — centenas de execuções/dia
- **Fica frágil** com billing complexo (retry, idempotência, proration), multi-tenant rigoroso, ou milhares de execuções simultâneas

#### Riscos conhecidos

1. **Vulnerabilidade crítica (CVSS 10.0)** — CVE-2026-21858 (Jan/2026) permitia takeover completo sem autenticação. ~100k instâncias afetadas. N8N Cloud patcheou, self-hosted dependia de update manual.
2. **Update fatigue** — Atualizações frequentes com breaking changes. Workflows podem parar após update. Comunidade recomenda esperar validação antes de atualizar.
3. **Licenciamento** — Community Edition tecnicamente não permite uso comercial SaaS. Uso com cobrança de assinatura requer licença Enterprise/Embed.

#### N8N vs Backend próprio

| Critério | N8N | Backend próprio |
|---|---|---|
| Velocidade de dev | Horas/dias | Semanas/meses |
| Custo inicial | Baixo | Alto |
| Billing complexo | Frágil | Robusto |
| Observabilidade | Básica | Total |
| Transações ACID | Não tem | Completo |
| Escalabilidade | ~centenas/dia | Milhões/dia |
| Segurança | Depende de patches | Controle total |

#### Plano de migração gradual

| Fase | Backend | Motivo |
|---|---|---|
| **V1 (agora)** | N8N Cloud | Velocidade, já funciona, volume baixo |
| **V1.5 (primeiros clientes pagantes)** | N8N Cloud + monitoramento | Error workflows, uptime checks, alertas |
| **V2 (integração e-commerces)** | Migração gradual | Billing e créditos vão pra backend próprio. Geração de imagens pode continuar no N8N |
| **V3 (widget embeddable)** | Backend próprio | Widget no e-commerce do cliente precisa de SLA, latência baixa e controle total |

#### Redundância — O que fazer em cada fase

**Agora (V1):**
- Error Workflow centralizado — flow "Mission Control" que notifica quando qualquer outro flow falha
- Retry automático nos nodes HTTP (3 tentativas, backoff exponencial)
- Uptime monitoring (Uptime Kuma ou similar) nos webhooks
- Versionamento — exportar JSONs dos flows e guardar no Git

**Escala (V2+):**
- Queue Mode com Redis como broker, workers separados da instância principal
- Multi-main com leader election automático (requer Enterprise)
- PostgreSQL com réplica e failover automático
- Kubernetes com replica sets, health checks, auto-restart

#### Fontes da pesquisa
- [N8N as a SaaS Backend: Strategic Guide](https://medium.com/@tuguidragos/n8n-as-a-saas-backend-a-strategic-guide-from-mvp-to-enterprise-scale-be13823f36c1)
- [Stress Test: N8N vs Make](https://hasanaboulhasan.medium.com/i-stress-tested-n8n-vs-make-as-saas-backends-heres-what-happened-287cbec8554c)
- [N8N vs Code for SaaS](https://pixeljets.com/blog/n8n-vs-code/)
- [CVE-2026-21858 — Critical N8N Vulnerability](https://cyberscoop.com/n8n-critical-vulnerability-massive-risk/)
- [High Availability for N8N](https://lumadock.com/tutorials/n8n-high-availability)
- [N8N Queue Mode Docs](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [N8N Kubernetes at Scale](https://groovetechnology.com/blog/software-development/n8n-kubernetes-deployment-how-to-run-n8n-at-scale-with-high-availability/)
- [What's New with N8N 2.0](https://medium.com/@theashleygross/whats-new-with-n8n-2-0-c59dcba584ed)

---

## Decisões Técnicas Importantes

1. **Gemini API removida do frontend** — Toda geração vai via N8N (segurança)
2. **Planos dinâmicos** — Carregados do Supabase, com fallback em `planDefaults.ts`
3. **Compressão desabilitada no upload** — Preserva qualidade para a IA gerar melhor
4. **Polling com easing** — Progress bar simulada (ease-out quadrático) durante gerações async
5. **Cor da marca**: Migrou de rosa `#E91E8C` para coral `#FF6B6B`
6. **Frontend billing conectado ao N8N** — Todos os botões de compra, upgrade e cancelamento chamam os webhooks reais (não mais toasts de "não implementado")
7. **deductCredits com backend** — Dedução de créditos faz update otimista na UI + chama `/vizzu/use-credits` no N8N em background
8. **`.env.local` obrigatório** — Contém `VITE_N8N_WEBHOOK_URL=https://n8nwebhook.brainia.store/webhook`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Sem ele, billing e geração não funcionam.

---

## Roadmap

### V1 — MVP SaaS (atual)
Plataforma standalone de geração de imagens por IA. O lojista cadastra produtos manualmente, gera imagens profissionais e baixa/compartilha. Foco em validar o produto, conquistar primeiros clientes pagantes e estabilizar a operação.

**Status**: Em finalização. Todas as ferramentas de geração funcionando, billing integrado, auth completo.

### V2 — Integração com E-commerces
Plugar diretamente nos catálogos das plataformas de e-commerce, eliminando o cadastro manual de produtos.

**Integrações planejadas:**
- **Shopify** — API de produtos + webhooks
- **VTEX** — Catalog API + integração nativa
- **Magento** — REST API de catálogo

**Valor**: O usuário conecta a loja e o catálogo inteiro fica disponível no Vizzu automaticamente. Zero fricção.

### V3 — Catálogo Virtual com Try-On (Embeddable)
Widget embedável no e-commerce do cliente. O consumidor final experimenta roupas virtualmente direto na loja, similar ao conceito da Sizebay mas com try-on por IA.

**Visão**: O Vizzu deixa de ser só uma ferramenta B2B de criação e passa a ser uma **experiência B2B2C** — o lojista usa o Vizzu, e o cliente final do lojista também se beneficia via try-on no site.

**Diferencial competitivo**: Não existe concorrente direto que combine geração de imagens por IA para e-commerce + try-on embeddable numa mesma plataforma.

---

## Programa de Indicação (V1 — pré-V2)

**Modelo**: Quem indica ganha **+5 créditos** quando o indicado se cadastra.

Inspirado no modelo padrão de referral de plataformas de IA. Simples, sem complicação — foco em crescimento orgânico antes da V2.

**TODO**: Definir implementação (link único por usuário, tracking de conversão, regras de elegibilidade).

---

## Ideias Futuras (sem versão definida)

- **API pública**: Abrir os endpoints de geração do Vizzu para terceiros consumirem via API. Permite que agências, devs e outras plataformas integrem geração de imagens IA nos próprios produtos.

---

## Posicionamento

- **Sem concorrente direto conhecido** que faça o que o Vizzu faz da mesma forma
- **Mercado**: E-commerce brasileiro (expansão internacional possível na V3)
- **Modelo de negócio**: SaaS com créditos + assinatura mensal/anual

---

## Billing — Integração Frontend ↔ N8N

### Arquitetura
- **Leitura** de créditos/assinatura: direto do Supabase via `useCredits` hook (rápido, usa anon key + RLS)
- **Escrita** (comprar, cancelar, deduzir): via N8N webhooks em `src/lib/api/billing.ts`
- **9 workflows N8N** testados e funcionando (01-09), JSONs salvos em `n8n-workflows/` (gitignored por conter secrets)

### Fluxo de Compra
1. Usuário clica "Comprar" → `purchaseCredits()` → N8N `/vizzu/create-checkout` → Stripe checkout URL
2. `window.open(checkoutUrl)` abre aba do Stripe
3. **TODO**: Implementar página de retorno pós-checkout (polling de status)

### Fluxo de Dedução (Geração de Imagem)
1. `deductCredits(amount, reason)` → update otimista na UI
2. Em background: chama N8N `/vizzu/use-credits` → `deduct_credits` RPC no Supabase
3. Se backend responder, sincroniza saldo real

### Assinatura RPC do Supabase
```
add_credits(p_user_id uuid, p_amount integer, p_generation_id uuid, p_description text, p_stripe_payment_id text DEFAULT NULL) → integer (novo saldo)
deduct_credits(p_user_id uuid, p_amount integer, p_generation_id uuid, p_description text) → boolean
```

---

## Modelos IA — Fluxo de Criação

### Campos do Formulário
O wizard de criação de modelo tem 4 steps. Os campos de observação livre são:
- **Observações Físicas** (`physicalNotes`) — Step 2 (Corpo & Proporções)
- **Observações Rosto e Cabelo** (`hairNotes`) — Step 3 (Aparência)
- **Observações da Pele** (`skinNotes`) — Step 3 (Aparência)

### Construção do Prompt
O prompt é construído no **frontend** em `ModelsPage.tsx > generateModelPrompt()`:
1. Monta descrição base dos selects (gênero, etnia, corpo, cabelo, olhos, expressão)
2. Appenda as observações como: `Physical: ...`, `Face & Hair: ...`, `Skin: ...`
3. Adiciona configurações fixas de câmera (Canon EOS R5, 85mm, fundo cinza)

### Envio para N8N
- Endpoint: `POST /vizzu/generate-model-images`
- Payload: `{ modelId, userId, modelProfile: {..., physicalNotes, hairNotes, skinNotes}, prompt }`
- **IMPORTANTE**: O N8N deve usar o campo `prompt` do payload (já contém todas as observações). Se o workflow construir o próprio prompt a partir dos campos individuais, as observações serão perdidas.

### Persistência
- Observações NÃO são salvas na tabela `saved_models` (usadas apenas na geração)
- A tabela `saved_models` não tem colunas para notes — se quiser persistir, precisa de migration

---

## Pendências Conhecidas

### Antes de escalar para produção (V1)
- [ ] Verificação final das políticas RLS
- [ ] Monitoramento de erros (Sentry)
- [ ] Rate limiting no backend
- [ ] Sanitização de inputs (XSS)
- [ ] Página de retorno pós-checkout (Stripe success/cancel)

### Melhorias futuras
- [ ] Testes automatizados
- [ ] Analytics (PostHog/Amplitude)
- [ ] Polling → WebSocket (Supabase Realtime)
- [ ] CreditsContext (extrair do hook para context)
- [ ] PWA offline queue
- [ ] Persistir observações de modelo no banco — **PARCIAL**: frontend já salva/lê `physical_notes`, `hair_notes`, `skin_notes` em `saved_models`. Falta rodar SQL no Supabase para criar as colunas (ver abaixo).

### Checklist — Teste do fluxo Stripe (fazer no escritório)

1. **Verificar webhook no Stripe Dashboard**
   - Ir em Developers > Webhooks
   - Deve ter um endpoint apontando para: `https://n8nwebhook.brainia.store/webhook/vizzu/stripe-webhook`
   - Se não tiver, criar com os eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`

2. **Testar checkout pelo app**
   - Abrir o app logado
   - Ir em Configurações > Trocar plano (ou comprar créditos)
   - Completar o checkout no Stripe usando o cartão de teste:
     - Número: `4242 4242 4242 4242`
     - Validade: qualquer data futura (ex: `12/30`)
     - CVC: qualquer 3 dígitos (ex: `123`)
     - Nome/endereço: qualquer coisa

3. **Verificar se funcionou**
   - Após pagar, o Stripe envia webhook pro N8N
   - Checar no Supabase se `user_credits.balance` foi atualizado
   - Checar se `user_subscriptions.plan_id` mudou para o plano comprado
   - No app, dar F5 e verificar se os créditos e plano aparecem corretos

4. **Testar cancelamento**
   - Ir em Configurações > Cancelar assinatura
   - Verificar se o status muda para `canceled` no banco

> **Cartão de teste Stripe**: `4242 4242 4242 4242` | Validade: qualquer futura | CVC: qualquer 3 dígitos

### SQL pendente — Colunas de observação em `saved_models`

```sql
ALTER TABLE saved_models
  ADD COLUMN IF NOT EXISTS physical_notes TEXT,
  ADD COLUMN IF NOT EXISTS hair_notes TEXT,
  ADD COLUMN IF NOT EXISTS skin_notes TEXT;
```

> **IMPORTANTE**: Rodar este SQL no Supabase SQL Editor antes de testar a persistência de observações.

---

## Sessão 4 — 03 de Fevereiro de 2026

### O que foi feito

1. **Animação de conclusão duplicada (Look Composer)** — A animação Lottie no `LookComposerResult` tinha `loop={true}`, fazendo o motion repetir dentro da janela de 2.5s. Corrigido removendo `loop`.

2. **Cores dos produtos não respeitadas (Look Composer)** — Problema de PROMPT no N8N: o Gemini recebe as imagens de referência dos produtos mas não preserva fielmente as cores. A solução é reforçar no prompt do nó "Construir Prompt3" a instrução de fidelidade absoluta de cor às imagens de referência. **Não é problema de dados do frontend** — as imagens de referência já são enviadas corretamente.

3. **Observações do modelo perdidas** — `saveModel()` em `ModelsPage` não incluía `physical_notes`, `hair_notes`, `skin_notes` no INSERT/UPDATE do Supabase. Corrigido. Também adicionada leitura desses campos no `loadSavedModels` (tanto em ModelsPage quanto em App.tsx).

4. **Observações do modelo no Look Composer** — O `modelDetails` enviado ao N8N agora inclui as observações (physicalNotes, hairNotes, skinNotes) do modelo selecionado, permitindo que o prompt use essas informações.

5. **Import DotLottie não usado removido** de `LookComposerEditor.tsx`.

### Decisões técnicas

9. **Fidelidade de cor = problema de prompt** — O campo `product.color` no frontend é apenas para filtros de UI, não para geração. A fidelidade de cor depende do prompt do Gemini enfatizar que cores dos produtos devem ser IDÊNTICAS às imagens de referência.
10. **Observações do modelo no Look Composer** — Concatenadas no campo `modelDetails` que já é enviado ao N8N, sem criar campo novo na API.

### Arquivos alterados

- `src/components/LookComposer/LookComposerResult.tsx` — Removido `loop` do Lottie
- `src/components/LookComposer/LookComposerEditor.tsx` — Observações no modelDetails, import limpo
- `src/pages/ModelsPage.tsx` — Salva/lê observações do modelo
- `src/App.tsx` — Lê observações do modelo no load
- `src/types.ts` — `SavedModel` com `physicalNotes`, `hairNotes`, `skinNotes`

### Ajuste necessário no N8N (Look Composer — workflow `/vizzu/modelo-ia-v2`)

O nó **"Construir Prompt3"** precisa de reforço no prompt para:

1. **Fidelidade de cor às imagens de referência** — Adicionar instrução enfática como:
   ```
   CRITICAL COLOR ACCURACY: Every garment must match EXACTLY the colors shown in its reference image.
   DO NOT alter, shift, or reinterpret any colors. The exact hue, saturation, and brightness must be preserved.
   If a shirt is gray in the reference, it must be the EXACT same shade of gray. If a dress is green, it must be the EXACT same green.
   ```

2. **Usar observações do modelo** — O campo `modelDetails` agora contém observações físicas. Incluir após a descrição do modelo:
   ```
   Additional model details: [modelDetails]
   ```

---

*Última atualização: 03 de Fevereiro de 2026 — Sessão 4*
