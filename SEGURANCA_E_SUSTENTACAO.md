# Segurança e Sustentação — Vizzu

> Documento de referência para resiliência, escalabilidade e proteção da plataforma.
> Inclui diagnóstico da infraestrutura atual, análise comparativa com plataformas de alto volume,
> cálculos de capacidade, e plano de ação detalhado.
>
> Criado em: 04 de Fevereiro de 2026 — Sessão 5

---

## Parte 1 — Como as Grandes Plataformas Funcionam

> Antes de olhar pra dentro, olhar pra fora. Como plataformas que geram milhões de imagens por dia
> estruturam seus sistemas? O que podemos aprender e adaptar à escala do Vizzu?

### Freepik — 3-4 milhões de imagens/dia

A Freepik gera mais de **60 milhões de imagens por mês** (3-4 milhões/dia). Sua arquitetura:

| Camada | Tecnologia |
|---|---|
| **Produto** | Freepik (interface, estilos, UX) |
| **Inferência** | WaveSpeed Engine (compilador ML custom, CUDA kernels otimizados) |
| **GPU** | DataCrunch — Kubernetes com auto-scaling, GPUs NVIDIA B200/H100/A100 |
| **Modelos** | FLUX, Imagen (Google), Ideogram, Seedream 4.0 (ByteDance) |
| **Storage** | Object storage de baixa latência |

**Lição pro Vizzu**: Freepik trata os modelos de IA como **infraestrutura, não como produto**. O produto é a interface e a experiência. A IA por trás é intercambiável. Vizzu já segue essa filosofia (usa Gemini via N8N, pode trocar no futuro).

**Fonte**: [How Freepik Scaled FLUX to Millions of Requests/Day](https://verda.com/blog/how-freepik-scaled-flux-media-generation-to-millions-of-requests-per-day)

---

### Leonardo AI — 1 bilhão de imagens geradas, 29M usuários

Leonardo AI (adquirida pela Canva) processa volumes massivos. Arquitetura:

| Camada | Tecnologia |
|---|---|
| **Inferência** | Google Cloud inference clusters + Gcore GPU Cloud (bare metal H100/A100) |
| **Training** | Lambda (NVIDIA GH200) |
| **Fila** | Sistema de **dual-queue** — Priority (pagantes) e Relaxed (espera) |
| **Infra-as-Code** | Terraform, private networking, auto-scaling on-demand |

**Sistema de filas (o que mais importa pro Vizzu)**:
- **Priority Queue**: Usuários pagos entram na fila prioritária. Geração rápida.
- **Relaxed Queue**: Usuários free entram na fila de espera. Tempo de 0 a 30 minutos. Concorrência throttled conforme demanda.
- Isso **protege a infraestrutura** — se há pico, usuários free esperam mais, mas o sistema nunca cai.

**Lição pro Vizzu**: Um sistema de **fila com prioridade** é o que separa plataformas que escalam de plataformas que travam. Mesmo sem GPU própria, o conceito se aplica: limitar concorrência e enfileirar o excedente.

**Fonte**: [Leonardo AI + Google Cloud](https://www.googlecloudpresscorner.com/2025-01-13-Leonardo-AI-Selects-Google-Cloud-to-Scale-AI-Image-Generation-Amid-Booming-User-Growth), [Leonardo AI + Gcore](https://gcore.com/case-studies/leonardo)

---

### Midjourney — Milhões de imagens/dia, ~20M membros Discord

Midjourney é notoriamente secreto sobre sua stack, mas o que é público:

| Camada | Tecnologia |
|---|---|
| **Interface** | Discord bot + Web app (lançado 2024) |
| **Cloud** | Google Cloud (GPUs + TPUs) |
| **Fila** | 3 tiers: **Fast** (GPU dedicada), **Relax** (fila compartilhada, 0-30min), **Turbo** (pool premium, 4x mais rápido) |
| **Equipe** | ~40 pessoas. Auto-financiada. |

**Padrão arquitetural (4 camadas)**:
1. **Interface** → recebe prompts, mostra progresso, entrega resultados
2. **Orquestração** → gerencia filas, distribui jobs entre GPU workers
3. **GPU Compute** → executa modelos de difusão
4. **Entrega** → armazena em object storage, retorna via interface

**Lição pro Vizzu**: Até a Midjourney usa **filas com diferentes prioridades**. O padrão da indústria é: receber o pedido → enfileirar → processar → notificar. Nunca processar diretamente na request.

**Fonte**: [How MidJourney System Design Works](https://www.systemdesignhandbook.com/guides/how-midjourney-system-design/)

---

### Canva — 450 designs/segundo, 220M usuários

Canva não é focada em geração IA, mas processa **50 milhões de uploads por dia** e **1.2 milhão de requests/dia**:

| Camada | Tecnologia |
|---|---|
| **Backend** | Java, microservices no AWS |
| **Banco** | MySQL RDS → migração para DynamoDB |
| **Storage** | S3 com CDN |
| **Escala** | Kubernetes, auto-scaling, queue-based processing |

**Lição pro Vizzu**: A Canva começou como monolito no EC2 e foi migrando gradualmente para microservices conforme a demanda cresceu. Não começaram com Kubernetes no dia 1. A lição é: **escale conforme a demanda, não antes**.

**Fonte**: [Canva — From Zero to 50 Million Uploads/Day](https://www.canva.dev/blog/engineering/from-zero-to-50-million-uploads-per-day-scaling-media-at-canva/)

---

### Padrão Arquitetural da Indústria

Todas as plataformas acima compartilham o mesmo padrão:

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Frontend    │────▶│   API    │────▶│  Queue   │────▶│   Workers    │
│  (React)    │     │ Gateway  │     │ (Redis/  │     │ (processam   │
│             │     │          │     │  SQS/    │     │  gerações)   │
│             │◀────│          │◀────│  BullMQ) │◀────│              │
│  resultado  │     │ webhook/ │     │          │     │  chama IA    │
│             │     │ polling  │     │          │     │  salva img   │
└─────────────┘     └──────────┘     └──────────┘     └──────────────┘
```

**O que o Vizzu faz diferente (e por que funciona pro MVP)**:
- O "API Gateway" é o próprio N8N (recebe webhooks)
- Não há "Queue" explícita — o N8N processa direto
- O "Worker" é o próprio nó HTTP do N8N chamando a Gemini
- Funciona até ~80-120 gerações simultâneas na KVM8

**Quando precisará mudar**: Quando a concorrência ultrapassar o que uma instância N8N gerencia. A migração natural é: N8N → N8N Queue Mode com Redis → Backend próprio (Node.js/Express + BullMQ + Redis).

---

## Parte 2 — Infraestrutura Atual do Vizzu

| Serviço | Onde roda | Spec | Custo |
|---|---|---|---|
| **N8N** | VPS Hostinger KVM1 (EasyPanel/Docker) | 1 vCPU, 4GB RAM, 50GB NVMe | ~$6/mês |
| **Supabase** | Cloud | 8GB DB, 100GB storage, Supavisor | Pro $25/mês |
| **Frontend** | Vercel | CDN global, serverless edge | Free/Pro |
| **Stripe** | Cloud | Gerenciado | — |
| **IA** | Google Gemini | Via API (chamada pelo N8N) | Pay-per-use |
| **N8N DB interna** | SQLite (padrão Docker) | Embutido | — |

### Uso atual da VPS (Fev/2026)

| Métrica | Valor |
|---|---|
| CPU | 11% |
| RAM | 64% (2.56GB de 4GB) |
| Disco | 62% |
| **RAM livre para workflows** | **~1.4GB** |

---

## Parte 3 — Fluxo de Geração e Mapa de Endpoints

### Como funciona uma geração

```
Usuário clica "Gerar"
    ↓
Frontend debita créditos (otimista — UI atualiza na hora, backend confirma depois)
    ↓
Frontend chama N8N via webhook (POST /vizzu/...)
    ↓
N8N recebe → monta prompt → chama Gemini API → ESPERA 30-120 segundos
    ↓
Gemini retorna imagem → N8N salva no Supabase → responde ao frontend
    ↓
Frontend mostra imagem OU faz polling no Supabase até a imagem aparecer
```

Durante a espera pela Gemini (~90% do tempo), cada workflow N8N consome **~30-60MB de RAM** sem fazer nada — está só esperando a resposta.

### 19 Endpoints N8N

#### Geração de Imagem (8)

| Ferramenta | Endpoint | Tipo | Custo | Tempo | Polling? |
|---|---|---|---|---|---|
| Studio Ready | `/vizzu/studio-ready` | Síncrono | 1 cr | ~30s | Não |
| Product Studio v2 | `/vizzu/studio/generate` | Síncrono | 1/ângulo | ~45-90s | Não |
| Cenário Criativo | `/vizzu/cenario-criativo` | Síncrono | 2 cr | ~60-120s | Não |
| Modelo IA | `/vizzu/modelo-ia-v2` | Assíncrono | 1 cr | ~120s | Sim (3s) |
| Look Composer | `/vizzu/modelo-ia-v2` | Assíncrono | 2 cr | ~120s | Sim (3s) |
| Provador Virtual | `/vizzu/provador` | Síncrono | 3 cr | ~45-90s | Não |
| Creative Still | Via Supabase INSERT | Assíncrono | 1-3 cr | ~60-120s | Sim (3s) |
| Refine | `/vizzu/refine` | Síncrono | 1 cr | ~30-60s | Não |

#### Billing (7)

| Endpoint | Função |
|---|---|
| `/vizzu/use-credits` | Debitar créditos (async, fire-and-forget) |
| `/vizzu/get-user-billing` | Consultar assinatura/créditos |
| `/vizzu/create-checkout` | Criar sessão Stripe |
| `/vizzu/buy-credits` | Comprar créditos avulsos |
| `/vizzu/change-plan` | Alterar plano |
| `/vizzu/cancel-subscription` | Cancelar assinatura |
| `/vizzu/get-transactions` | Histórico de créditos |

#### Outros (4)

| Endpoint | Função |
|---|---|
| `/vizzu/checkout-status` | Status do pagamento |
| `/vizzu/generate-model-images` | Gerar imagens de modelo (timeout 240s) |
| `/vizzu/generate-caption` | Gerar legenda IA |
| `/vizzu/analyze-product` | Analisar produto |

### Polling — Números Reais

```
Intervalo fixo:  3 segundos
Timeout máximo:  5 minutos (300 segundos)
Queries/geração: ~40 (Modelo IA) a ~100 (Creative Still)
```

| Cenário | Queries/segundo no Supabase |
|---|---|
| 10 usuários (Modelo IA) | ~3.3 q/s |
| 50 usuários | ~16.7 q/s |
| 100 usuários (Modelo IA) | ~33.3 q/s |
| 100 usuários (tudo junto) | ~66.6 q/s |

Supabase Pro aguenta ~200-500 q/s. Funciona, mas sem margem generosa no pior caso.

---

## Parte 4 — Cálculos de Capacidade

### Consumo de RAM na VPS

| Componente | RAM |
|---|---|
| Linux + EasyPanel + Docker | ~700-900 MB |
| N8N idle | ~200-400 MB |
| **Cada workflow ativo** | **~30-60 MB** |

### KVM1 (atual) — 1 vCPU, 4 GB RAM

| Métrica | Valor |
|---|---|
| RAM livre para workflows | ~1.4 GB |
| Workflows por RAM | ~28 |
| Workflows por CPU (1 core, single-thread) | ~15-20 |
| **Capacidade real** | **15-20 gerações simultâneas** |
| Usuários (1 imagem cada) | **15-20** |
| Usuários (frente + costas) | **8-10** |

### KVM8 — 8 vCPU, 32 GB RAM

| Métrica | Valor |
|---|---|
| RAM livre para workflows | ~29-30 GB |
| Workflows por RAM | ~600 |
| Workflows por CPU (8 cores) | ~80-120 |
| **Capacidade real** | **80-120 gerações simultâneas** |
| Usuários (1 imagem cada) | **80-120** |
| Usuários (frente + costas) | **40-60** |

### KVM8 — Projeção de clientes pagantes

| Perfil de uso | Clientes |
|---|---|
| Conservador (picos concentrados) | ~3.000-4.000 |
| Realista (distribuído, B2B normal) | ~5.000-7.000 |
| Otimista (uso leve) | ~8.000-10.000 |

---

## Parte 5 — Problemas Encontrados

### 5.1 VPS subdimensionada (P0)
- **Impacto**: N8N crashando com 20+ gerações simultâneas
- **Solução**: Upgrade para KVM8

### 5.2 N8N sem configuração de produção (P0)
- **Impacto**: Node.js usando ~1GB de RAM mesmo com 32GB disponíveis. Sem limite de concorrência — aceita workflows infinitos até crashar
- **Solução**: Variáveis de ambiente (seção 7)

### 5.3 N8N usando SQLite (P1)
- **Impacto**: SQLite trava com muitas escritas simultâneas (logs de execução). Pode causar lentidão geral do N8N
- **Solução**: Migrar para PostgreSQL

### 5.4 Sem timeout nas chamadas ao N8N (P1)
- **Onde**: `src/lib/api/studio.ts` — quase todos os `fetch()` sem `AbortController`
- **Impacto**: Se o N8N travar, o frontend fica preso para sempre na tela de "gerando..."
- **O usuário vê**: Barra de progresso rodando eternamente. Precisa fechar e reabrir o app
- **Solução**: AbortController com 60s em todos os fetch

### 5.5 Sem retry nas chamadas (P1)
- **Onde**: `src/lib/api/studio.ts`, `src/lib/api/billing.ts`
- **Impacto**: Uma falha momentânea = erro final visível pro usuário
- **O usuário vê**: "Erro ao gerar imagem" — precisa clicar de novo e perde o crédito
- **Solução**: Retry com exponential backoff + jitter (3 tentativas)

### 5.6 Polling sem backoff (P1)
- **Onde**: `src/lib/api/studio.ts` (polling fixo a cada 3s)
- **Impacto**: Com 100 usuários, ~33-66 queries/segundo no Supabase desnecessariamente
- **O usuário vê**: Nada diretamente, mas o Supabase pode ficar lento pra todos
- **Solução**: Backoff progressivo (3s → 5s → 10s → 15s)

### 5.7 Race condition nos créditos (P2)
- **Onde**: `src/hooks/useCredits.ts`
- **Impacto**: Cliques rápidos em múltiplas ferramentas podem debitar mais do que o saldo
- **Solução**: Lock de geração no frontend + debitar antes de chamar N8N

### 5.8 Sem limite de gerações simultâneas (P2)
- **Onde**: `src/contexts/GenerationContext.tsx`
- **Impacto**: Cada usuário pode disparar 4 gerações paralelas. Múltiplas abas multiplicam isso
- **Solução**: Lock global + BroadcastChannel entre abas

### 5.9 Sem Error Workflow no N8N (P2)
- **Impacto**: Quando um workflow falha, ninguém é notificado. Falhas silenciosas
- **Solução**: Workflow "Mission Control" centralizado

---

## Parte 6 — Boas Práticas da Indústria (Pesquisa)

### 6.1 Fila de Jobs — O Padrão Universal

Toda plataforma de geração de imagem usa alguma forma de fila:

| Plataforma | Tipo de fila | Prioridade |
|---|---|---|
| Freepik | Kubernetes job queue | Por tier de usuário |
| Leonardo AI | Dual-queue (Priority + Relaxed) | Pagante vs. free |
| Midjourney | 3 tiers (Fast, Relax, Turbo) | Por plano + GPU pool |
| Canva | SQS/queue-based processing | Por tipo de operação |

**Padrão recomendado para o Vizzu (quando sair do N8N)**:
1. API recebe request → retorna job ID imediatamente
2. Job entra na fila (Redis + BullMQ)
3. Worker pega o job → chama Gemini → salva resultado
4. Notifica frontend via webhook callback ou Supabase Realtime

**Fonte**: [BullMQ — Complete Guide with Image Processing](https://medium.com/@sanipatel0401/building-scalable-job-queues-with-bullmq-a-complete-guide-with-image-processing-example-88c58b550cb8), [AWS Serverless GenAI Patterns](https://aws.amazon.com/blogs/compute/serverless-generative-ai-architectural-patterns/)

### 6.2 N8N — Configuração de Produção

#### Variáveis de ambiente obrigatórias (EasyPanel)

```env
# --- MEMÓRIA ---
# Permite o Node.js usar até 8GB de RAM (KVM8 tem 32GB)
# Sem isso, Node.js usa ~1GB mesmo com RAM sobrando
NODE_OPTIONS=--max-old-space-size=8192

# --- CONCORRÊNCIA ---
# Limita workflows simultâneos. Excedente entra em fila automática.
# 80 é seguro pra KVM8. Previne crash por excesso.
N8N_CONCURRENCY_PRODUCTION_LIMIT=80

# --- TIMEOUTS ---
# Workflow preso por mais de 5 minutos é cancelado (evita leak de memória)
EXECUTIONS_TIMEOUT=300
EXECUTIONS_TIMEOUT_MAX=600

# --- LIMPEZA ---
# Não guardar dados de execuções que deram certo (economiza disco e RAM)
EXECUTIONS_DATA_SAVE_ON_SUCCESS=none

# Limpar execuções antigas automaticamente (últimos 7 dias)
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168

# --- PAYLOAD ---
# Tamanho máximo de dados que um workflow pode receber (256MB)
# Necessário porque o Provador envia fotos em base64 (~300KB)
N8N_PAYLOAD_SIZE_MAX=268435456

# --- MONITORAMENTO ---
# Ativa endpoint /metrics (Prometheus) pra monitorar no futuro
N8N_METRICS=true

# --- MISC ---
# Desliga aviso de atualização (evita confusão)
N8N_VERSION_NOTIFICATIONS_ENABLED=false
```

**Como aplicar**: EasyPanel > Seleciona o serviço N8N > Environment Variables > Adicionar cada variável > Redeploy.

**Fonte**: [n8n Docs — Execution Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/executions/), [n8n Customizations for Production](https://www.andreffs.com/blog/n8n-customizations-for-production/), [n8n Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)

#### Trocar SQLite por PostgreSQL

O N8N armazena logs de execução numa base de dados interna. Por padrão, usa SQLite. SQLite é single-writer — quando muitos workflows rodam ao mesmo tempo, as escritas bloqueiam umas às outras.

**Opções**:
1. Criar um PostgreSQL no EasyPanel (mesmo servidor, container separado)
2. Usar o PostgreSQL do próprio Supabase (banco separado ou schema dedicado)

**Variáveis para trocar**:
```env
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<host>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=<user>
DB_POSTGRESDB_PASSWORD=<password>
```

**Fonte**: [n8n Performance Optimization](https://www.wednesday.is/writing-articles/n8n-performance-optimization-for-high-volume-workflows)

#### Error Workflow "Mission Control"

Criar um workflow que funciona como central de alarmes:
1. Criar workflow novo no N8N com nó "Error Trigger"
2. Conectar a nós que enviam notificação (email, WhatsApp, Slack)
3. Em **todos** os outros workflows: Settings > Error Workflow > selecionar o "Mission Control"

Quando qualquer workflow falhar, o Mission Control recebe:
- Nome do workflow que falhou
- Mensagem de erro
- Dados de input que causaram a falha
- Timestamp

**Fonte**: [5 n8n Error Handling Techniques](https://www.aifire.co/p/5-n8n-error-handling-techniques-for-a-resilient-automation-workflow)

#### Retry nos nós HTTP do N8N

Dentro do editor N8N, cada nó HTTP Request tem aba "Settings" com:
- **Retry on Fail**: Ativar
- **Max Tries**: 3
- **Wait Between Tries**: 2000ms

Aplicar em todos os nós que chamam Gemini API e Supabase.

**Cuidado**: Não colocar retry no frontend E no N8N ao mesmo tempo para a mesma operação. Isso multiplica tentativas (3 × 3 = 9). Escolher: retry no N8N (para chamadas à Gemini) E retry no frontend (para chamadas ao webhook do N8N). Cada camada retenta a sua parte.

**Fonte**: [Best Practices for Retry Pattern](https://harish-bhattbhatt.medium.com/best-practices-for-retry-pattern-f29d47cd5117)

### 6.3 Frontend — Resiliência

#### Exponential Backoff com Jitter

Quando uma chamada falha, esperar antes de tentar de novo. Cada tentativa espera mais:

```
Tentativa 1: espera 1 segundo
Tentativa 2: espera 2 segundos + variação aleatória
Tentativa 3: espera 4 segundos + variação aleatória
Máximo: 30 segundos
```

A "variação aleatória" (jitter) evita que 100 clientes que falharam ao mesmo tempo tentem retry todos no mesmo instante — o que causaria outra sobrecarga.

**Fonte**: [Exponential Backoff with Jitter](https://medium.com/@titoadeoye/requests-at-scale-exponential-backoff-with-jitter-with-examples-4d0521891923)

#### Circuit Breaker

Se o N8N está fora do ar, não adianta ficar tentando. Após 3-5 falhas consecutivas, o frontend para de tentar por 30 segundos e mostra uma mensagem clara: "Serviço temporariamente indisponível. Tentando reconectar..."

Depois dos 30 segundos, tenta uma vez. Se funcionar, reabre o circuito. Se não, espera mais.

**Fonte**: [Mastering Exponential Backoff in Distributed Systems](https://betterstack.com/community/guides/monitoring/exponential-backoff/)

### 6.4 Supabase — Polling vs Realtime

#### Alternativa ao polling: Supabase Realtime

Em vez de perguntar "já ficou pronto?" a cada 3 segundos, o frontend pode **assinar** mudanças na tabela `generations`. O Supabase avisa quando o status muda. Elimina 100% das queries de polling.

```typescript
// Em vez de polling loop:
supabase
  .channel('generation-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'generations',
    filter: `id=eq.${generationId}`
  }, (payload) => {
    // Imagem pronta! Atualiza UI
  })
  .subscribe();
```

**Limitação**: Supabase Pro tem limite de conexões Realtime simultâneas (verificar no dashboard).

**Fonte**: [Supabase Docs — Realtime Limits](https://supabase.com/docs/guides/realtime/limits), [Supabase Docs — Connection Management](https://supabase.com/docs/guides/database/connection-management)

### 6.5 Quando Migrar do N8N

Baseado na pesquisa, os sinais de que é hora de sair do N8N:

| Sinal | Descrição |
|---|---|
| **Billing complexo** | Lógica de pagamento com retry, idempotência, proration |
| **Concorrência consistente acima de 80%** | N8N enfileirando regularmente |
| **Necessidade de testes automatizados** | N8N não tem framework de testes maduro |
| **Multi-tenant rigoroso** | Isolamento de dados entre clientes com SLA |
| **Controle de versão** | Workflows em JSON resistem a code review e merge |

**Migração recomendada**:
1. **V1 (agora)**: N8N faz tudo — geração, billing, webhooks
2. **V1.5**: Billing migra pra backend próprio (Node.js + Express). N8N continua fazendo geração
3. **V2**: Geração migra pra backend com BullMQ + Redis. N8N só para automações periféricas
4. **V3**: Backend completo. N8N desligado ou só para integrações pontuais

**Fonte**: [n8n as a SaaS Backend: Strategic Guide](https://medium.com/@tuguidragos/n8n-as-a-saas-backend-a-strategic-guide-from-mvp-to-enterprise-scale-be13823f36c1), [n8n vs Code for SaaS](https://pixeljets.com/blog/n8n-vs-code/)

---

## Parte 7 — Plano de Ação

### Legenda

| Prioridade | Significado |
|---|---|
| **P0** | Obrigatório antes do teste dia 10. Sem isso, vai travar |
| **P1** | Muito importante. Previne degradação silenciosa e erros visíveis |
| **P2** | Recomendado. Melhora experiência e proteção |
| **P3** | Monitoramento e visibilidade |

---

### P0-A — Upgrade VPS para KVM8

| | |
|---|---|
| **O que é** | Trocar KVM1 (1 vCPU, 4GB) por KVM8 (8 vCPU, 32GB) na Hostinger |
| **Por que** | KVM1 trava com 20+ gerações. 100 usuários = crash garantido |
| **Sem isso** | A partir do 20º usuário, imagens nunca chegam. Créditos perdidos |
| **Com isso** | 100 usuários geram normalmente, sem lentidão |
| **Quem faz** | Felipe (Hostinger dashboard) |
| **Custo** | ~$20/mês (~R$ 120/mês). Diferença de ~$14/mês |

---

### P0-B — Configurar variáveis de ambiente do N8N

| | |
|---|---|
| **O que é** | Adicionar as variáveis da seção 6.2 no container N8N via EasyPanel |
| **Por que** | Sem elas, Node.js usa só ~1GB de RAM e aceita workflows infinitos |
| **Sem isso** | Mesmo na KVM8, N8N crashando por usar fração da RAM disponível |
| **Com isso** | N8N usa até 8GB, enfileira excedente, limpa execuções antigas |
| **Quem faz** | Felipe (EasyPanel > N8N > Environment Variables > Redeploy) |

---

### P1-A — Timeouts em todas as chamadas ao N8N

| | |
|---|---|
| **O que é** | Limite de 60 segundos para o N8N responder. Se passar, mostra erro |
| **Por que** | Hoje, se N8N travar, o frontend espera infinitamente |
| **Sem isso** | Tela presa na barra de progresso para sempre |
| **Com isso** | "Não foi possível gerar. Tente novamente" em até 60 segundos |
| **Quem faz** | Copiloto (código: `src/lib/api/studio.ts`, `billing.ts`) |

---

### P1-B — Retry com backoff + jitter

| | |
|---|---|
| **O que é** | Se chamada ao N8N falhar, tenta de novo 3x (espera 1s, 2s, 4s + variação) |
| **Por que** | Falhas momentâneas são comuns sob carga. Sem retry = erro visível |
| **Sem isso** | "Erro ao gerar" frequente, usuário precisa clicar de novo |
| **Com isso** | Erros transitórios se resolvem sozinhos. "Simplesmente funciona" |
| **Quem faz** | Copiloto (código: wrapper `fetchWithRetry` em `src/lib/api/`) |
| **Cuidado** | Não aplicar retry no `deductCredits` (evitar débito duplo) |

---

### P1-C — Polling com backoff progressivo

| | |
|---|---|
| **O que é** | Mudar polling de 3s fixo para progressivo (3s → 5s → 10s → 15s) |
| **Por que** | 100 usuários × 3s = 33+ queries/segundo. Com backoff, reduz ~60% |
| **Sem isso** | Supabase sobrecarregado → tudo fica lento |
| **Com isso** | Mesma experiência visual, mas banco respira. Máximo 5-10s extra |
| **Quem faz** | Copiloto (código: `src/lib/api/studio.ts`) |

---

### P1-D — Retry nos nós HTTP do N8N

| | |
|---|---|
| **O que é** | Ativar retry automático nos nós que chamam Gemini e Supabase dentro do N8N |
| **Por que** | Se a Gemini der timeout, o workflow falha sem tentar de novo |
| **Sem isso** | Gerações falham por erros transitórios da API do Google |
| **Com isso** | N8N tenta 3x antes de desistir. Maioria dos erros da Gemini se resolve |
| **Quem faz** | Felipe (N8N editor > cada nó HTTP Request > Settings > Retry on Fail) |

---

### P1-E — Trocar SQLite por PostgreSQL no N8N

| | |
|---|---|
| **O que é** | Mudar o banco interno do N8N de SQLite para PostgreSQL |
| **Por que** | SQLite trava com muitas escritas simultâneas de logs de execução |
| **Sem isso** | N8N fica lento ao salvar/ler execuções com muitos workflows ativos |
| **Com isso** | Escritas paralelas funcionam sem bloqueio |
| **Quem faz** | Felipe (EasyPanel: criar PostgreSQL + configurar variáveis no N8N) |

---

### P2-A — Lock de geração (1 por vez por usuário)

| | |
|---|---|
| **O que é** | Enquanto gera uma imagem, botão de gerar fica desabilitado em todas as ferramentas |
| **Por que** | 100 usuários × 4 gerações cada = 400 workflows em vez de 100 |
| **Sem isso** | Pode gerar 4 ao mesmo tempo, mas todas podem falhar |
| **Com isso** | Uma por vez. Espera ~2 min entre gerações. Mais confiável |
| **Quem faz** | Copiloto (código: `src/contexts/GenerationContext.tsx`) |

---

### P2-B — Proteção contra múltiplas abas

| | |
|---|---|
| **O que é** | Detectar via `BroadcastChannel` que outra aba já está gerando |
| **Por que** | Usuário pode abrir 2+ abas e burlar o lock da P2-A |
| **Quem faz** | Copiloto (código) |

---

### P2-C — Error Workflow "Mission Control"

| | |
|---|---|
| **O que é** | Workflow centralizado no N8N que recebe erros de todos os outros workflows e notifica |
| **Por que** | Hoje, quando um workflow falha, ninguém sabe |
| **Sem isso** | Falhas silenciosas. Créditos debitados, imagens não geradas, sem alerta |
| **Com isso** | Felipe recebe WhatsApp/email quando algo falha, com detalhes do erro |
| **Quem faz** | Copiloto (gera JSON do workflow) + Felipe (importa no N8N e configura) |

---

### P3 — Monitoramento durante o teste

| | |
|---|---|
| **O que é** | Acompanhar CPU e RAM no painel da Hostinger durante o teste dia 10 |
| **O que observar** | CPU > 80% por 2+ min = lento. RAM > 90% = risco de crash |
| **Quem faz** | Felipe (painel Hostinger) |

---

## Parte 8 — Roadmap de Evolução Técnica

### V1 → V1.5 (Primeiros clientes pagantes)

| Item | Prioridade | Impacto |
|---|---|---|
| KVM8 + configuração produção | P0 | Suporta até ~120 gerações simultâneas |
| Timeouts + retry + polling backoff | P1 | Frontend resiliente |
| SQLite → PostgreSQL no N8N | P1 | N8N estável sob carga |
| Error Workflow Mission Control | P2 | Visibilidade de falhas |
| Sentry no frontend | P2 | Monitoramento de erros em produção |
| Lock de geração por usuário | P2 | Proteção contra sobrecarga |

### V1.5 → V2 (Escala — centenas de usuários simultâneos)

| Item | Impacto |
|---|---|
| Supabase Realtime em vez de polling | Elimina 100% das queries de polling |
| N8N Queue Mode + Redis | Escala horizontal, filas de execução |
| Billing migrado pra backend próprio | Transações ACID, sem race conditions |
| Rate limiting server-side | Proteção contra abuso |
| CDN para imagens geradas (Cloudflare/CloudFront) | Entrega rápida, menos carga no storage |
| Fila com prioridade por plano (como Leonardo AI) | Plano Pro gera antes do Basic |

### V2 → V3 (Escala — milhares de usuários)

| Item | Impacto |
|---|---|
| Backend próprio (Node.js/Express + BullMQ + Redis) | Controle total, SLA, testável |
| N8N desligado ou só integrações periféricas | Menos pontos de falha |
| Kubernetes com auto-scaling | Escala elástica baseada em demanda |
| Observabilidade (Prometheus + Grafana) | Dashboards e alertas em tempo real |
| Circuit breaker server-side | Proteção contra cascata de falhas |
| Multi-region (se expansão internacional V3) | Latência baixa globalmente |

---

## Parte 9 — Fontes

### Plataformas de Alto Volume
- [How Freepik Scaled FLUX to Millions of Requests/Day — DataCrunch + WaveSpeed](https://verda.com/blog/how-freepik-scaled-flux-media-generation-to-millions-of-requests-per-day)
- [Leonardo AI + Google Cloud — Scaling AI Image Generation](https://www.googlecloudpresscorner.com/2025-01-13-Leonardo-AI-Selects-Google-Cloud-to-Scale-AI-Image-Generation-Amid-Booming-User-Growth)
- [Leonardo AI + Gcore — GPU Cloud Case Study](https://gcore.com/case-studies/leonardo)
- [How MidJourney System Design Works — Complete Guide](https://www.systemdesignhandbook.com/guides/how-midjourney-system-design/)
- [Canva — From Zero to 50 Million Uploads/Day](https://www.canva.dev/blog/engineering/from-zero-to-50-million-uploads-per-day-scaling-media-at-canva/)

### Filas e Arquitetura de Jobs
- [BullMQ — Complete Guide with Image Processing](https://medium.com/@sanipatel0401/building-scalable-job-queues-with-bullmq-a-complete-guide-with-image-processing-example-88c58b550cb8)
- [BullMQ — Going to Production](https://docs.bullmq.io/guide/going-to-production)
- [Using BullMQ in AI Workflows — Best Practices & Observability](https://upqueue.io/blog/using-bullmq-to-power-ai-workflows-with-observability-in-mind/)
- [AWS — Serverless Generative AI Architectural Patterns](https://aws.amazon.com/blogs/compute/serverless-generative-ai-architectural-patterns/)
- [Azure — Web-Queue-Worker Architecture Style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/web-queue-worker)

### N8N — Scaling e Produção
- [n8n Docs — Scaling Overview](https://docs.n8n.io/hosting/scaling/overview/)
- [n8n Docs — Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)
- [n8n Docs — Execution Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/executions/)
- [n8n Performance Optimization — Wednesday.is](https://www.wednesday.is/writing-articles/n8n-performance-optimization-for-high-volume-workflows)
- [n8n Customizations for Production](https://www.andreffs.com/blog/n8n-customizations-for-production/)
- [Scaling n8n Workflows — n8ncraft](https://n8ncraft.com/blog/scaling-n8n-workflows-is-tough-here-s-what-s-really-getting-in-your-way)
- [n8n as a SaaS Backend — Strategic Guide](https://medium.com/@tuguidragos/n8n-as-a-saas-backend-a-strategic-guide-from-mvp-to-enterprise-scale-be13823f36c1)
- [n8n vs Code for SaaS — Pixeljets](https://pixeljets.com/blog/n8n-vs-code/)
- [Best Practices for Self-Hosted n8n Scaling (Community)](https://community.n8n.io/t/best-practices-for-self-hosted-n8n-deployments-scaling/96313)
- [n8n VPS Requirements — Hostinger](https://www.hostinger.com/tutorials/n8n-vps-requirements)
- [GitHub Issue #16980 — max-old-space-size override](https://github.com/n8n-io/n8n/issues/16980)

### N8N — Error Handling
- [5 n8n Error Handling Techniques — AIFire](https://www.aifire.co/p/5-n8n-error-handling-techniques-for-a-resilient-automation-workflow)

### Supabase
- [Supabase Docs — Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supabase Docs — Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Docs — Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)

### Frontend — Resiliência
- [Exponential Backoff with Jitter — Medium](https://medium.com/@titoadeoye/requests-at-scale-exponential-backoff-with-jitter-with-examples-4d0521891923)
- [Mastering Exponential Backoff — BetterStack](https://betterstack.com/community/guides/monitoring/exponential-backoff/)
- [Best Practices for Retry Pattern — Medium](https://harish-bhattbhatt.medium.com/best-practices-for-retry-pattern-f29d47cd5117)
- [React Error Handling — Exponential Backoff — Medium](https://medium.com/@vnkelkar11/react-error-handling-best-practices-exponential-backoff-for-fetch-requests-9c24d119dcda)

### Hostinger VPS
- [Hostinger KVM8 Specs — VPSBenchmarks](https://www.vpsbenchmarks.com/hosters/hostinger/plans/kvm-8)
- [Hostinger VPS Plans Comparison](https://tefannyyoung.com/hostinger-vps-hosting-plans-explained-key-differences-between-kvm1-kvm2-kvm4-and-kvm8/)

---

## Parte 10 — Implementação no Código (Mapa Cirúrgico)

> Referência para a próxima sessão. Localizações exatas dos arquivos e linhas
> que precisam ser alterados para implementar P1 e P2.

### 10.1 Criar `fetchWithRetry` — Utilitário Central

**Arquivo novo**: `src/lib/api/fetchWithRetry.ts`

Função que envolve `fetch()` com:
- `AbortController` com timeout de 60s
- 3 tentativas com exponential backoff + jitter (1s → 2s → 4s)
- Retenta apenas erros de rede, timeout e 5xx
- NÃO retenta erros 4xx (são erros do cliente)
- NÃO retenta chamadas de `deductCredits` (evitar débito duplo)

### 10.2 Aplicar em `src/lib/api/studio.ts` — 11 chamadas

| Linha | Função | Timeout atual |
|---|---|---|
| 70 | `generateStudioReady()` | Nenhum |
| 160 | `generateProductStudioV2()` | Nenhum |
| 221 | `generateCenario()` | Nenhum |
| 346 | `generateModeloIA()` | Nenhum (tem polling) |
| 550 | `refineImage()` | Nenhum |
| 592 | `deleteGeneration()` | Nenhum |
| 646 | `generateCaption()` | Nenhum |
| 729 | `generateProvador()` | Nenhum |
| 810 | `generateModelImages()` | 240s (já tem) |
| 912 | `analyzeProductImage()` | Nenhum |
| 943 | `sendWhatsAppMessage()` | Nenhum |

**Ação**: Trocar `fetch(url, options)` por `fetchWithRetry(url, options)` em 10 funções (manter a que já tem timeout).

### 10.3 Aplicar em `src/lib/api/billing.ts` — 8 chamadas

| Linha | Função |
|---|---|
| 74 | `getUserBilling()` |
| 121 | `createCheckoutSession()` |
| 170 | `buyCredits()` |
| 214 | `changePlan()` |
| 255 | `cancelSubscription()` |
| 296 | `getCreditTransactions()` |
| 335 | `checkCheckoutStatus()` |
| 377 | `useCredits()` — **SEM retry** (fire-and-forget, evitar débito duplo) |

**Ação**: Trocar `fetch()` por `fetchWithRetry()` em 7 funções. `useCredits()` fica sem retry.

### 10.4 Polling com backoff — `src/lib/api/studio.ts` linhas 424-492

**Configuração atual** (linhas 12-14):
```
POLLING_INTERVAL_MS = 3000       (fixo)
POLLING_TIMEOUT_MS = 300000      (5 min)
ESTIMATED_GENERATION_TIME_MS = 120000
```

**Mudança**: Substituir intervalo fixo por função de backoff:
```
0-30s:   polling a cada 3s  (fase rápida — imagem pode estar pronta)
30-60s:  polling a cada 5s  (transição)
60-120s: polling a cada 8s  (geração típica)
120s+:   polling a cada 15s (espera longa)
```

**Local exato**: Linha 426, trocar `setTimeout(resolve, POLLING_INTERVAL_MS)` por `setTimeout(resolve, getPollingInterval(elapsed))`.

### 10.5 Lock de geração — `src/contexts/GenerationContext.tsx`

**Variável existente** (linha 149):
```typescript
const isAnyGenerationRunning = isGeneratingProvador || isGeneratingProductStudio || isGeneratingLookComposer || isGeneratingCreativeStill;
```

**Mudança**: Já existe a flag. Garantir que **todos** os componentes de geração checam `isAnyGenerationRunning` antes de iniciar. Adicionar `BroadcastChannel` para sincronizar entre abas.

### 10.6 Circuit Breaker — `src/lib/api/fetchWithRetry.ts`

Incluir no mesmo utilitário:
- Contador de falhas consecutivas (compartilhado entre chamadas)
- Após 5 falhas seguidas: bloqueia novas chamadas por 30 segundos
- Retorna erro imediato com mensagem "Serviço temporariamente indisponível"
- Após 30s: tenta uma chamada. Se funcionar, reseta o contador

---

## Parte 11 — Checklist Pré-Lançamento (Dia 10/02/2026)

### Felipe faz (infra):

- [ ] Upgrade VPS para KVM8 na Hostinger
- [ ] Adicionar variáveis de ambiente no N8N (EasyPanel > Redeploy)
- [ ] Ativar retry nos nós HTTP do N8N (editor > cada nó > Settings)
- [ ] Criar PostgreSQL no EasyPanel e apontar N8N para ele
- [ ] Rodar SQL pendente no Supabase (colunas de observação em `saved_models`)
- [ ] Verificar webhook do Stripe no dashboard (ver checklist no GUIA_DO_COPILOTO)
- [ ] Ter painel Hostinger aberto durante o teste para monitorar CPU/RAM

### Copiloto faz (código):

- [ ] Criar `src/lib/api/fetchWithRetry.ts` (timeout + retry + circuit breaker)
- [ ] Aplicar `fetchWithRetry` nas 18 chamadas (10 studio + 7 billing + 1 já tem)
- [ ] Implementar polling com backoff progressivo em `studio.ts`
- [ ] Reforçar lock de geração em `GenerationContext.tsx`
- [ ] Adicionar `BroadcastChannel` para proteção multi-abas
- [ ] Testar build (`npm run build`) para garantir zero erros

### Validação pós-implementação:

- [ ] Abrir o app e gerar 1 imagem com cada ferramenta — funciona?
- [ ] Simular N8N fora do ar — aparece mensagem de erro em até 60s?
- [ ] Gerar imagem em 2 abas ao mesmo tempo — segunda aba bloqueia?
- [ ] Verificar console do navegador — zero erros de timeout ou retry visíveis?

---

*Última atualização: 04 de Fevereiro de 2026 — Sessão 5*
