# Vizzu — Plano de Infraestrutura para Lançamento

> Documento criado em 08/02/2026 — Lançamento previsto: 15/02/2026
> Baseado em análise técnica da infra atual + pesquisa de benchmarks e docs oficiais N8N
> **Última atualização**: 08/02/2026 (noite) — Hostinger KVM 8 escolhido como servidor

---

## 1. Situação Atual vs. Necessidade

### O que temos hoje (Hostinger KVM1)

| Recurso | Valor |
|---|---|
| vCPU | 1 core |
| RAM | 4 GB |
| Storage | 50 GB NVMe |
| N8N Mode | Regular (main process) |
| Workers | 1 (o próprio processo principal) |
| Concurrency | ~10 (threads) |
| Throughput máx | ~16 req/s (limite do modo regular) |

**Problema**: No modo regular do N8N, mesmo se você tivesse 64 cores, o throughput máximo seria ~16 req/s. Isso é uma limitação arquitetural — o N8N em modo regular roda tudo num único processo Node.js.

### O que precisamos (Hostinger KVM 8)

| Recurso | Valor |
|---|---|
| vCPU | 8 cores |
| RAM | 32 GB |
| Storage | 400 GB NVMe |
| Preço | ~$19.99/mês |
| N8N Mode | **Queue Mode** (com Redis + Workers separados) |
| Throughput teórico | 70-160 req/s |
| CPU Steal | Nenhum (KVM com isolamento real) |

### Por que Hostinger KVM 8 e não Contabo?

| Critério | Contabo VPS 30 ($15/mês) | Hostinger KVM 8 ($19.99/mês) |
|---|---|---|
| vCPU | 8 | 8 |
| RAM | 24 GB | **32 GB** (+33%) |
| Storage | 200 GB NVMe | **400 GB NVMe** (+100%) |
| CPU Steal | **3-40%** (relatos reais) | **0%** (KVM isolado) |
| Disk I/O (4k) | 49 MB/s | **Melhor** (NVMe dedicado) |
| Uptime | Variável (relatos de 30 downtimes/6m) | **Estável** |
| Suporte | Lento | **Bom** |
| Preço | $15/mês | $19.99/mês |

**Decisão**: Por $5/mês a mais, temos 32 GB RAM (vs 24), 400 GB storage (vs 200), e zero CPU steal. Para workflows de IA que já dependem de APIs externas lentas (Gemini: 30-120s), a estabilidade do servidor importa mais que o preço absoluto.

### Comparativo KVMs da Hostinger (referência para escalar)

| Plano | vCPU | RAM | Storage | Preço/mês | Nota |
|---|---|---|---|---|---|
| KVM 1 | 1 | 4 GB | 50 GB | $5.49 | **Atual** — insuficiente |
| KVM 2 | 2 | 8 GB | 100 GB | $7.49 | Mínimo para Queue Mode |
| KVM 4 | 4 | 16 GB | 200 GB | $10.49 | 2 workers com margem baixa |
| **KVM 8** | **8** | **32 GB** | **400 GB** | **$19.99** | **Recomendado** — 60% margem |

---

## 2. Explicação: Workers, Threads e Queue Mode

### Analogia simples

Pense no N8N como uma **fábrica**:

- **Modo Regular** (o que temos hoje): É como ter **1 funcionário que faz tudo** — atende o balcão (webhook), processa pedidos (workflow) e entrega resultados. Se 10 clientes chegam ao mesmo tempo, ele tenta alternar entre eles, mas fica sobrecarregado rápido.

- **Queue Mode** (o que precisamos): É como ter uma **fila organizada** + **funcionários especializados**:
  - **Main Process** = o gerente. Recebe os pedidos (webhooks) e coloca numa fila (Redis)
  - **Workers** = os funcionários. Pegam pedidos da fila e executam. Você pode ter quantos quiser
  - **Concurrency por Worker** = quantos pedidos cada funcionário processa ao mesmo tempo

### Como funciona o Queue Mode

```
[Usuário] → [Webhook] → [Main Process] → [Redis Queue] → [Worker 1] → Executa workflow
                                                        → [Worker 2] → Executa workflow
                                                        → [Worker 3] → Executa workflow
```

1. O webhook chega no **main process** (o N8N "principal")
2. O main process coloca o job numa **fila no Redis** (banco de dados em memória, super rápido)
3. Os **workers** (processos separados) pegam jobs da fila e executam
4. Quando um worker termina, ele pega o próximo job da fila

### Números reais (benchmark oficial do N8N)

| Configuração | Modo Regular | Queue Mode |
|---|---|---|
| Servidor pequeno (2 vCPU, 4GB) | ~16 req/s | ~72 req/s |
| Servidor médio (8 vCPU, 24GB) | ~16 req/s | ~120+ req/s |
| Servidor grande (16 vCPU, 32GB) | ~16 req/s | ~162 req/s |
| Taxa de falha sob carga | 21-38% | 0% |

**Conclusão**: O modo regular NUNCA passa de ~16 req/s e começa a falhar sob carga. Queue mode escala linearmente com hardware.

---

## 3. O Problema dos Workflows Longos

### O que seu amigo apontou (e ele está certo)

O **workflow 15** (Creative Still Simplificado) faz isso dentro de **um único Code node**:

```
Para cada variação (1 a 6):
  1. Baixar todas as imagens do produto (~5-10s)
  2. Chamar o Gemini para gerar imagem (~30-120s)
  3. Fazer upload da imagem gerada (~5-10s)
  4. Atualizar o banco de dados (~1s)
```

**Se o usuário pedir 5 variações**: Uma única execução leva `5 × (10 + 90 + 10 + 1) = ~555 segundos ≈ 9 minutos`

Durante esses **9 minutos**, uma thread do worker fica **100% ocupada** fazendo uma coisa só para um usuário. Se você tem 10 threads no total:
- 1 usuário gerando 5 variações = 10% da capacidade total bloqueada por 9 minutos
- 5 usuários simultâneos = 50% da capacidade bloqueada
- 10 usuários = 100% → ninguém mais consegue usar o sistema

### Os dois problemas que seu amigo identificou

**Problema A — Workflow monopoliza recursos**:
Um workflow que gera N imagens sequencialmente segura o worker por muito tempo. É como se um cliente do restaurante pedisse 6 pratos e o garçom ficasse na cozinha esperando cada prato ficar pronto, sem atender mais ninguém.

**Problema B — Sem controle por usuário**:
Se o mesmo usuário manda gerar 3 vezes seguidas (Creative Still + Product Studio + Studio Ready), são 3 workers ocupados simultaneamente para 1 pessoa. Enquanto isso, outros usuários podem ficar na fila.

---

## 4. Soluções Propostas

### Solução A — Quebrar Workflows Longos (1 imagem por execução)

**Antes** (atual):
```
1 webhook → 1 workflow → gera 5 imagens em loop → 9 minutos bloqueado
```

**Depois** (proposto):
```
1 webhook → cria 5 jobs individuais → cada job gera 1 imagem → 2 min cada
                                    → job 1 → worker A
                                    → job 2 → worker B (em paralelo!)
                                    → job 3 → worker A (quando liberar)
                                    → job 4 → worker C
                                    → job 5 → worker B (quando liberar)
```

**Benefícios**:
- Em vez de 1 worker bloqueado por 9 min, 3 workers processam em ~3 min (paralelo)
- Se uma variação falha, as outras continuam normalmente
- O sistema fica responsivo para outros usuários durante a geração

**Como implementar**:
- Workflow "orquestrador": recebe o webhook, valida créditos, cria 1 sub-job por variação
- Workflow "gerador": gera 1 única imagem (baixar refs → Gemini → upload → atualiza DB)
- O orquestrador chama o gerador N vezes via webhook interno
- Cada chamada vira um job separado na fila do Redis

**Workflows afetados**:
| Workflow | Situação Atual | Proposta |
|---|---|---|
| 15 - Creative Still Simple | Loop 1-6 imagens no mesmo Code node | Quebrar em orquestrador + gerador |
| 14 - Product Studio v9 | Já é parcialmente async (por ângulo) | Verificar se ângulos rodam em paralelo no queue mode |
| 12 - Creative Still Avançado | 2 variações no mesmo workflow | Quebrar se necessário |
| 10 - Generate Model Images | 2 imagens (frente+costas) | Menor prioridade (só 2 imagens) |

### Solução B — Fila por Usuário (Controle de Concorrência)

**Conceito**: Antes de iniciar qualquer geração, verificar se o usuário já tem algo rodando. Se sim, a nova requisição entra numa fila e espera a anterior terminar.

**Como implementar** (3 opções, da mais simples à mais robusta):

#### Opção 1 — Lock no banco de dados (mais simples, recomendada para V1)

```
1. Webhook chega
2. Consultar: SELECT COUNT(*) FROM generations WHERE user_id = X AND status = 'processing'
3. Se > 0: marcar como 'queued' no banco e retornar (frontend faz polling)
4. Se = 0: continuar normalmente

5. Quando uma geração termina:
   - Consultar: SELECT * FROM generations WHERE user_id = X AND status = 'queued' ORDER BY created_at LIMIT 1
   - Se encontrou: disparar webhook para processar a próxima
```

**Prós**: Simples, usa o Supabase que já temos, fácil de monitorar
**Contras**: Pequena latência extra (~100ms) por consulta ao banco

#### Opção 2 — Concorrência limitada por usuário (melhor UX)

Em vez de "1 de cada vez", permitir **2 gerações simultâneas por usuário**:

```
MAX_CONCURRENT_PER_USER = 2

Se usuário tem < 2 gerações 'processing': processar imediatamente
Se usuário tem >= 2: entrar na fila
```

**Isso é melhor porque**: O usuário pode usar Product Studio e Creative Still ao mesmo tempo, mas não pode spammar 10 gerações.

#### Opção 3 — Fila no Redis (mais robusta, para V2+)

Usar o próprio Redis do Queue Mode para gerenciar filas por usuário. Mais complexo mas escala melhor.

**Recomendação**: Opção 2 para o lançamento (15/02). Simples, eficaz, implementável em 1-2 dias.

---

## 5. Estimativa de Capacidade

### Premissas

| Parâmetro | Valor |
|---|---|
| Servidor | Hostinger KVM 8 (8 vCPU, 32GB RAM) |
| N8N Mode | Queue Mode |
| Workers | **4 workers** (32 GB suporta de sobra) |
| Concurrency/worker | 10 (total: 40 slots) |
| Geração média | 90 segundos (Gemini) |
| Workflows rápidos (billing, consultas) | < 2 segundos |
| Margem mínima | 60% acima do necessário |

### Simulação mês a mês (10 → 50 → 100 clientes)

**Cenário de stress**: Pico do dia = 20% dos clientes gerando ao mesmo tempo, cada um pedindo 6 imagens (máximo do Creative Still Simple).

#### Mês 1 — 10 clientes

| Métrica | Valor |
|---|---|
| Pico simultâneo (20%) | 2 usuários |
| Imagens no pico | 2 × 6 = 12 imagens |
| Slots necessários | 12 (se workflow quebrado, 1 por imagem) |
| Config mínima | 2 workers × 5 concurrency = 10 slots |
| **Com margem 60%** | 2 workers × 10 concurrency = **20 slots** |
| Tempo total pico | ~90s (1 leva paralelo) |
| **Veredicto** | Folgado, sem fila |

#### Mês 2 — 50 clientes

| Métrica | Valor |
|---|---|
| Pico simultâneo (20%) | 10 usuários |
| Imagens no pico | 10 × 6 = 60 imagens |
| Com fila por usuário (max 2) | Max 20 imagens simultâneas |
| Config | 2 workers × 10 concurrency = **20 slots** |
| Fila restante | 40 imagens na fila do Redis |
| Tempo total pico | ~4-5 min para processar tudo |
| **Veredicto** | Funciona bem, fila controlada |

#### Mês 3 — 100 clientes

| Métrica | Valor |
|---|---|
| Pico simultâneo (20%) | 20 usuários |
| Imagens no pico | 20 × 6 = 120 imagens |
| Com fila por usuário (max 2) | Max 40 imagens simultâneas |
| Config recomendada | **3 workers × 10 concurrency = 30 slots** |
| Fila restante | ~90 imagens na fila |
| Tempo total pico | ~6-8 min para processar tudo |
| **Veredicto** | Funciona, considerar 4 workers se necessário |

**Conclusão**: Com 2 workers e concurrency 10 (20 slots), cobrimos os meses 1 e 2 com folga. No mês 3, escalar para 3-4 workers com um comando Docker:
```bash
docker compose up -d --scale n8n-worker=3  # ou 4
```

### Consumo estimado por feature (PRELIMINAR)

> **ATENÇÃO**: Estes valores são **estimativas teóricas** baseadas na análise do código dos workflows. Na próxima sessão, Kaique fará testes reais de geração e fornecerá dados de consumo medidos. Os valores abaixo serão atualizados com os dados reais.

| Feature | Imagens/req | RAM por req (est.) | Tempo médio | Créditos (2K) | Créditos (4K) |
|---|---|---|---|---|---|
| Studio Ready | 1 | ~25 MB | ~30s | 1 | 2 |
| Product Studio (5 ângulos) | 5 | ~50-70 MB | ~3 min | 5 | 10 |
| Creative Still Avançado (2 var.) | 2 | ~50-60 MB | ~2 min | 2 | 4 |
| Creative Still Simples (1-6 var.) | 1-6 | ~40-95 MB | ~1.5-9 min | 1-6 | 2-12 |
| Modelo IA (2 imagens) | 2 | ~40-50 MB | ~2 min | 2 | 4 |
| Refine | 1 | ~30 MB | ~1 min | 1 | 2 |

**RAM estimada por worker** (sem dados reais):
- Worker ocioso: ~200 MB
- Worker com 5 execuções: ~400-700 MB
- Worker com 10 execuções: ~800 MB - 1.2 GB
- **Com 32 GB, sobram ~25 GB livres** — margem enorme

### Workflows rápidos (billing, consultas)

Requests rápidos (<2s) não competem com gerações longas porque terminam rápido e liberam o slot. Com 20 slots, é possível processar centenas por minuto facilmente.

### Escalar se necessário

Se a capacidade não for suficiente:
1. **Mais workers**: `docker compose up -d --scale n8n-worker=4` (dobra a capacidade, zero downtime)
2. **Mais concurrency**: Aumentar para 15-20 por worker (funciona bem para I/O bound — nossos workflows esperam API)
3. **Nota**: Hostinger KVM 8 com 32 GB suporta até 6-8 workers tranquilamente

---

## 6. Servidor Escolhido — Hostinger KVM 8

### Por que Hostinger KVM 8?

- **KVM com isolamento real**: Cada VPS tem recursos dedicados, sem CPU steal
- **32 GB RAM**: Margem de 60%+ sobre o necessário (~7 GB base + crescimento)
- **400 GB NVMe**: Espaço para logs, backups, snapshots
- **8 vCPU**: Suficiente para 2-4 workers N8N + Redis + PostgreSQL
- **$19.99/mês**: Apenas $5 a mais que Contabo, com muito mais confiabilidade
- **Hostinger**: Já usamos o KVM1 atual, então a migração é familiar

### Alternativas descartadas

| Provedor | Plano | Preço | Por que não |
|---|---|---|---|
| Contabo | VPS 30 | $15/mês | CPU Steal 3-40%, downtimes reportados, "noisy neighbor" |
| Hetzner | CPX41 | $22/mês | Apenas 16 GB RAM (insuficiente com margem 60%) |
| Hostinger KVM 4 | 4 vCPU/16GB | $10.49/mês | RAM apertada para 3+ workers |

### Quando escalar para além do KVM 8?

Se o mês 3 (100 clientes) ultrapassar 4 workers com concurrency 10 (40 slots), considerar:
1. **Hostinger dedicado** ou **Hetzner dedicado** (~$50-80/mês, 16+ cores, 64 GB RAM)
2. **Segundo servidor KVM 8** ($40/mês total): workers 3-4 no segundo servidor, main + Redis no primeiro

---

## 7. Arquitetura Proposta (Docker Compose)

### Componentes no servidor

```
┌──────────────────────────────────────────────────┐
│          Hostinger KVM 8 (8 vCPU, 32GB RAM)      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ N8N Main │  │ Worker 1 │  │ Worker 2 │  ...   │
│  │  (UI +   │  │(executa  │  │(executa  │(escala)│
│  │ webhooks)│  │workflows)│  │workflows)│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │             │
│       └──────┬───────┴──────────────┘             │
│              │                                    │
│       ┌──────┴──────┐                             │
│       │    Redis    │  (fila de jobs)              │
│       └─────────────┘                             │
│                                                  │
│       ┌─────────────┐                             │
│       │  PostgreSQL  │  (dados do N8N)             │
│       └─────────────┘                             │
│                                                  │
│  Supabase = banco EXTERNO (não muda)             │
│  Gemini = API EXTERNA (não muda)                 │
└──────────────────────────────────────────────────┘
```

### Uso estimado de RAM

| Componente | RAM estimada | Com 4 workers |
|---|---|---|
| N8N Main | ~512 MB - 1 GB | ~512 MB - 1 GB |
| Worker 1 | ~1 - 2 GB | ~1 - 2 GB |
| Worker 2 | ~1 - 2 GB | ~1 - 2 GB |
| Worker 3-4 | — | ~2 - 4 GB |
| Redis | ~100 - 200 MB | ~200 - 400 MB |
| PostgreSQL | ~500 MB - 1 GB | ~500 MB - 1 GB |
| Sistema operacional | ~500 MB | ~500 MB |
| **Total** | ~4 - 7 GB | ~6 - 11 GB |
| **Margem livre** | **~25 - 28 GB** | **~21 - 26 GB** |

32 GB de RAM é mais que suficiente. Daria para rodar até 6-8 workers se necessário — margem de 60%+ em qualquer cenário dos primeiros 3 meses.

### Docker Compose (exemplo base)

```yaml
version: '3.8'

volumes:
  db_storage:
  n8n_storage:
  redis_storage:

x-shared: &shared
  restart: always
  image: docker.n8n.io/n8nio/n8n
  environment:
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
    - DB_POSTGRESDB_PORT=5432
    - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
    - DB_POSTGRESDB_USER=${POSTGRES_USER}
    - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    - EXECUTIONS_MODE=queue
    - QUEUE_BULL_REDIS_HOST=redis
    - QUEUE_HEALTH_CHECK_ACTIVE=true
    - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
    # Concorrência por worker
    - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    # Lock duration alto para workflows longos (10 min)
    - QUEUE_WORKER_LOCK_DURATION=600000
    - QUEUE_WORKER_LOCK_RENEW_TIME=60000
    - QUEUE_WORKER_STALLED_INTERVAL=120000
    - QUEUE_WORKER_MAX_STALLED_COUNT=0
    # Timeout de execução (15 min máximo)
    - EXECUTIONS_TIMEOUT=900
    - EXECUTIONS_TIMEOUT_MAX=900
    # Graceful shutdown
    - N8N_GRACEFUL_SHUTDOWN_TIMEOUT=300
  volumes:
    - n8n_storage:/home/node/.n8n
  depends_on:
    redis:
      condition: service_healthy
    postgres:
      condition: service_healthy

services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      - POSTGRES_USER
      - POSTGRES_PASSWORD
      - POSTGRES_DB
    volumes:
      - db_storage:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_storage:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10

  n8n:
    <<: *shared
    ports:
      - 5678:5678

  n8n-worker:
    <<: *shared
    command: worker
    depends_on:
      - n8n
    deploy:
      replicas: 4
```

### Variáveis de ambiente importantes explicadas

| Variável | Valor | Por quê |
|---|---|---|
| `EXECUTIONS_MODE=queue` | Ativa queue mode | Obrigatório para escalar |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT=5` | 5 execuções simultâneas por worker | Com 2 workers = 10 slots totais |
| `QUEUE_WORKER_LOCK_DURATION=600000` | 10 minutos | **CRITICO**: padrão é 60s. Se workflow demora mais, N8N re-executa (imagens duplicadas + créditos 2x) |
| `QUEUE_WORKER_LOCK_RENEW_TIME=60000` | Renova lock a cada 60s | Evita que o Redis pense que o worker morreu |
| `QUEUE_WORKER_STALLED_INTERVAL=120000` | Checa jobs parados a cada 2 min | Se um worker morrer, o job é redistribuído |
| `QUEUE_WORKER_MAX_STALLED_COUNT=0` | Não re-executa stalled | **CRITICO**: evita re-execução automática de jobs "travados" |
| `EXECUTIONS_TIMEOUT=900` | Timeout de 15 min por execução | Protege contra workflows infinitos |
| `N8N_GRACEFUL_SHUTDOWN_TIMEOUT=300` | 5 min para terminar na hora do restart | Não mata workflows em andamento |

> **ALERTA IMPORTANTE**: O `QUEUE_WORKER_LOCK_DURATION` padrão de 60s é a armadilha #1 de quem migra para queue mode com workflows de IA. Nossos workflows chamam o Gemini e ficam 30-120s esperando. Sem aumentar esse valor, CADA geração seria executada 2x.

---

## 8. Checklist de Migração (antes do dia 15)

### Fase 1 — Servidor novo (dia 9-10)
- [ ] Contratar Hostinger KVM 8 (8 vCPU, 32GB RAM, 400GB NVMe, $19.99/mês)
- [ ] Escolher datacenter: **US East** ou **Europe** (menor latência para Supabase/Gemini)
- [ ] Instalar Docker + Docker Compose
- [ ] Subir stack: PostgreSQL + Redis + N8N (main) + 2 Workers
- [ ] Configurar HTTPS (Caddy ou Nginx + Let's Encrypt)
- [ ] Apontar DNS: `n8nwebhook.brainia.store` → IP novo
- [ ] Apontar DNS: `n8neditor.brainia.store` → IP novo

### Fase 2 — Migrar workflows (dia 10-11)
- [ ] Exportar TODOS os workflows do N8N atual
- [ ] Importar no N8N novo
- [ ] Recriar credenciais (Supabase, Gemini API keys)
- [ ] Testar cada webhook (lista completa abaixo)
- [ ] Ativar todos os workflows

### Fase 3 — Implementar fila por usuário (dia 11-12)
- [ ] Criar coluna/lógica de controle de concorrência
- [ ] Implementar verificação no início dos workflows de geração
- [ ] Testar com 2+ gerações simultâneas do mesmo usuário

### Fase 4 — Quebrar workflow 15 (dia 12-13)
- [ ] Separar orquestrador e gerador (Creative Still Simple)
- [ ] Testar com 1, 3, 5 variações
- [ ] Verificar que polling do frontend continua funcionando

### Fase 5 — Testes finais (dia 13-14)
- [ ] Teste de carga básico: simular 5 usuários gerando ao mesmo tempo
- [ ] Monitorar uso de CPU, RAM, Redis
- [ ] Verificar logs de erro
- [ ] Snapshot do servidor (backup)

---

## 9. Webhooks para Testar na Migração

| # | Endpoint | Tipo | Prioridade |
|---|---|---|---|
| 1 | `/vizzu/studio-ready` | Geração | Alta |
| 2 | `/vizzu/studio/generate` | Geração | Alta |
| 3 | `/vizzu/studio/angle` | Geração | Alta |
| 4 | `/vizzu/cenario-criativo` | Geração | Alta |
| 5 | `/vizzu/modelo-ia-v2` | Geração | Alta |
| 6 | `/vizzu/refine-generation` | Geração | Alta |
| 7 | `/vizzu/still/generate` | Geração | Alta |
| 8 | `/vizzu/still/generate-simple` | Geração | Alta |
| 9 | `/vizzu/get-user-billing` | Billing | Alta |
| 10 | `/vizzu/create-checkout` | Billing | Alta |
| 11 | `/vizzu/buy-credits` | Billing | Média |
| 12 | `/vizzu/change-plan` | Billing | Média |
| 13 | `/vizzu/cancel-subscription` | Billing | Média |
| 14 | `/vizzu/use-credits` | Billing | Alta |
| 15 | `/vizzu/get-transactions` | Billing | Baixa |
| 16 | `/vizzu/checkout-status` | Billing | Baixa |
| 17 | `/vizzu/stripe-webhook` | Billing | Alta |
| 18 | `/vizzu/produto-importar` | Cadastro | Média |
| 19 | `/vizzu/produto-editar` | Cadastro | Média |

---

## 10. Monitoramento Pós-Lançamento

### O que monitorar

| Métrica | Como | Alerta se |
|---|---|---|
| CPU Steal | `top` ou Grafana | > 5% (não deveria ocorrer no KVM) |
| RAM livre | `free -h` | < 4 GB |
| Redis queue size | `redis-cli LLEN bull:*` | > 50 jobs na fila |
| Worker health | N8N health endpoint | Worker não responde |
| Uptime | UptimeRobot/Kuma | Downtime > 30s |
| Geração média | Supabase query | > 5 min por imagem |

### Query útil para monitorar gerações

```sql
-- Gerações ativas agora
SELECT type, status, COUNT(*), AVG(EXTRACT(EPOCH FROM (now() - started_at))) as avg_seconds
FROM generations
WHERE status = 'processing'
GROUP BY type, status;

-- Gerações dos últimos 30 min
SELECT type, status, COUNT(*)
FROM generations
WHERE created_at > now() - interval '30 minutes'
GROUP BY type, status
ORDER BY count DESC;
```

---

## 11. Resumo das Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Servidor | **Hostinger KVM 8** ($19.99/mês) | 32 GB RAM, zero CPU steal, 60%+ margem |
| N8N Mode | Queue Mode (Redis) | 10x mais throughput que modo regular |
| Workers | **4 desde o início** | 32 GB suporta de sobra (~8-11 GB, sobram 21+) |
| Concurrency | 10 por worker (40 total) | ~200 clientes rodando liso |
| Fila por usuário | Sim, max 2 simultâneas | Evita monopolização de recursos |
| Quebrar workflow 15 | Sim | Libera workers mais rápido |
| Banco N8N | PostgreSQL local (Docker) | Separado do Supabase (dados da app) |
| Backup | Snapshots + export workflows | Política de backup do Hostinger |

---

## 12. Próximos Passos — Validação com Dados Reais

> Esta seção serve como ponte para a próxima sessão de trabalho.

### Pendente — Testes práticos de consumo

Os valores de RAM por feature na seção 5 são **estimativas teóricas**. Para validar:

1. **Kaique faz gerações reais** de cada feature (Studio Ready, Product Studio, Creative Still Simple e Avançado, Modelo IA, Refine)
2. **Registrar para cada geração**: tempo total, número de imagens, resolução (2K/4K), se deu erro
3. **No servidor N8N**: monitorar RAM do processo com `docker stats` durante a geração
4. **Enviar os dados** para o copiloto → atualizar esta seção com valores medidos

### Pendente — Implementação

| Item | Prioridade | Depende de |
|---|---|---|
| Contratar Hostinger KVM 8 | P0 | Decisão Kaique |
| Instalar Docker + Queue Mode | P0 | Servidor contratado |
| Migrar workflows | P0 | Stack rodando |
| Fila por usuário (Opção 2) | P1 | Stack rodando |
| Quebrar workflow 15 | P1 | Stack rodando |
| Reimportar workflow 15 v2 (fix de geração) | P0 | Kaique |
| Reimportar workflow 14 v9.1 | P0 | Kaique |
| Testes de carga | P1 | Tudo rodando |

### Resumo para a próxima sessão

- **Servidor**: Hostinger KVM 8, 8 vCPU, 32 GB RAM, 400 GB NVMe, $19.99/mês
- **Arquitetura**: Queue Mode (Redis + Workers), 2-4 workers, concurrency 5-10
- **Capacidade**: 10-20 slots simultâneos → suporta 10-100 clientes com folga
- **Lock Duration**: 600000ms (10 min) — CRÍTICO para evitar re-execução
- **Stalled Count**: 0 — CRÍTICO para evitar duplicação
- **Fila por usuário**: max 2 gerações simultâneas por usuário (Opção 2)
- **Workflow 15**: precisa ser quebrado em orquestrador + gerador individual
- **Consumo real**: pendente — Kaique vai testar e enviar dados

---

## Fontes da Pesquisa

- [N8N Scalability Benchmark (oficial)](https://blog.n8n.io/the-n8n-scalability-benchmark/)
- [N8N Queue Mode Docs](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [N8N Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)
- [N8N Queue Mode Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/queue-mode/)
- [N8N Performance Benchmarking](https://docs.n8n.io/hosting/scaling/performance-benchmarking/)
- [N8N Docker Compose with Worker (oficial)](https://github.com/n8n-io/n8n-hosting/blob/main/docker-compose/withPostgresAndWorker/)
- [N8N Scaling & Reliability Guide](https://medium.com/@orami98/the-n8n-scaling-reliability-guide)
- [Contabo Cloud VPS 30 Benchmark (Jan/2026)](https://www.vpsbenchmarks.com/yabs/contabo-8c-24gb-20260105-d97856)
- [Contabo Review — VPSBenchmarks](https://www.vpsbenchmarks.com/hosters/contabo)
- [N8N Queue Mode Docker Compose examples](https://github.com/samnetic/n8n-docker-compose)

---

*Última atualização: 08 de Fevereiro de 2026*
