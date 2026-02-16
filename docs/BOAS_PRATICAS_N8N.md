# Boas Praticas N8N + Servidor — Vizzu

> Documento de referencia para configuracao, scaling e otimizacao de workflows N8N em producao.
> Atualizado: 09/02/2026 (noite — workers corrigidos, error handling v11, concurrency=5)

---

## Indice

1. [Arquitetura Atual](#1-arquitetura-atual)
2. [Queue Mode — Como Funciona](#2-queue-mode--como-funciona)
3. [Workers — Configuracao e Scaling](#3-workers--configuracao-e-scaling)
4. [Anatomia do Workflow Product Studio](#4-anatomia-do-workflow-product-studio)
5. [Como Funciona a Distribuicao de Jobs](#5-como-funciona-a-distribuicao-de-jobs)
6. [A Solucao Futura: Sub-Workflows (Fan-Out/Fan-In)](#6-a-solucao-sub-workflows-fan-outfan-in)
7. [Error Handling (Workflow v11)](#7-error-handling-workflow-v11)
8. [Binary Data — Filesystem Mode](#8-binary-data--filesystem-mode)
9. [Variaveis de Ambiente — Referencia Completa](#9-variaveis-de-ambiente--referencia-completa)
10. [Redis — Configuracao e Monitoramento](#10-redis--configuracao-e-monitoramento)
11. [Monitoramento e Alertas](#11-monitoramento-e-alertas)
12. [Capacity Planning](#12-capacity-planning)
13. [Checklist de Lancamento](#13-checklist-de-lancamento)
14. [Roadmap de Otimizacao](#14-roadmap-de-otimizacao)

---

## 1. Arquitetura Atual

### Servidor

| Recurso    | Valor                           |
|------------|---------------------------------|
| Provedor   | Hostinger KVM 4                 |
| CPU        | 4 vCPU (4 threads)              |
| RAM        | 16 GB                           |
| Disco      | 193 GB (20 GB usado, 174 livre) |
| SO         | Ubuntu 24.04 LTS                |
| Custo      | R$94,99/mes                     |

### Containers (pos-limpeza)

| Container       | Funcao                                | RAM idle |
|-----------------|---------------------------------------|----------|
| n8n_editor      | Interface do N8N, triggers, schedules | ~312 MiB |
| n8n_webhook     | Recebe webhooks HTTP                  | ~200 MiB |
| n8n_worker (x4) | Executa workflows da fila             | ~250 MiB cada |
| n8n_postgres    | Banco de dados (execucoes, workflows) | ~150 MiB |
| redis_n8n       | Fila de jobs (message broker)         | ~10 MiB  |
| traefik         | Reverse proxy / SSL                   | ~50 MiB  |
| netdata         | Monitoramento em tempo real           | ~307 MiB |
| **Total**       |                                       | **~2 GiB** |

### URLs

| Servico     | URL                                      |
|-------------|------------------------------------------|
| Editor N8N  | `https://n8neditor.brainia.store/`       |
| Webhooks    | `https://n8nwebhook.brainia.store/`      |
| Netdata     | `http://IP_SERVIDOR:19999`               |
| EasyPanel   | `https://easypanel.brainia.store/`       |

---

## 2. Queue Mode — Como Funciona

### Visao Geral

O Queue Mode separa a **gestao** da **execucao** de workflows:

```
                    ┌─────────────┐
  Webhook HTTP ──►  │   Webhook   │ ──► Redis (fila)
                    │  Container  │
                    └─────────────┘
                          │
                    ┌─────┼─────┐
                    ▼     ▼     ▼
               ┌────┐ ┌────┐ ┌────┐
               │ W1 │ │ W2 │ │ W3 │ ...  Workers
               └──┬─┘ └──┬─┘ └──┬─┘
                  │      │      │
                  ▼      ▼      ▼
               ┌─────────────────────┐
               │     PostgreSQL      │  Resultados
               └─────────────────────┘
```

### Fluxo de um Job

1. **Webhook recebe** o request HTTP
2. **Redis enfileira** o job
3. **Worker disponivel** puxa o job da fila
4. **Worker executa** o workflow inteiro (todos os nos)
5. **Worker salva** o resultado no PostgreSQL
6. **Worker fica disponivel** para o proximo job

### Regra Fundamental

> **Um job = um worker do inicio ao fim.**
> O worker que pega o job executa TODOS os nos do workflow.
> Os outros workers ficam livres para outros jobs.

Isso significa: se 4 usuarios geram imagens ao mesmo tempo, cada worker pega 1 geracao. O 5o usuario espera na fila.

---

## 3. Workers — Configuracao e Scaling

### Quantos Workers Ter?

A regra geral: **1 worker por vCPU** para workflows pesados (imagem/IA).

| Cenario               | Workers | Geracoes simultaneas | RAM total workers |
|-----------------------|---------|---------------------|-------------------|
| Conservador           | 2       | 2                   | ~500 MiB idle     |
| **Recomendado (atual)** | **4** | **4**               | **~1 GiB idle**   |
| Maximo neste servidor | 6       | 6                   | ~1.5 GiB idle     |

### Como Criar Workers no EasyPanel

1. Projeto N8N → **+ Service** → **App**
2. Nome: `n8n_workerN` (onde N = numero sequencial)
3. Imagem: `n8nio/n8n:latest`
4. Variavels de ambiente: copiar do worker existente (ver Secao 8)
5. Unica mudanca: `N8N_LOG_FILE_LOCATION=/home/node/.n8n/logs/n8n-0N.log`
6. **NAO** precisa configurar dominio/porta — worker nao recebe trafego externo
7. Deploy

### Verificar Workers Ativos

```bash
# Via SSH no servidor
docker ps --format "table {{.Names}}\t{{.Status}}" | grep worker

# Ver consumo de cada worker
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}" | grep worker
```

### Comando de Inicializacao (CRITICO)

Cada worker **DEVE** ser iniciado com o comando `n8n worker` no EasyPanel:

1. Abrir o servico do worker no EasyPanel
2. Ir em **Advanced** (Avancado)
3. No campo **Comando**, colocar: `n8n worker`
4. Salvar e Implantar

> **ATENCAO**: Se o campo Comando estiver vazio, o container roda `n8n start` (modo editor).
> Nesse caso ele NAO puxa jobs da fila Redis e aparece nos logs como `Host ID: main-...`.
> O correto e aparecer `Host ID: worker-...` e `Starting n8n worker...`.

### Verificar se Workers Estao Corretos

```bash
# Via SSH no servidor — verificar que todos mostram "Starting n8n worker..."
docker ps --format '{{.Names}}' | grep worker | while read c; do echo "=== $c ==="; docker logs "$c" 2>&1 | tail -3; echo; done
```

Saida esperada para cada worker:
```
n8n worker is now ready
 * Version: 2.6.4
 * Concurrency: 5
```

Se aparecer `Starting main instance` ou `Host ID: main-...`, o comando esta ERRADO.

### Verificar Distribuicao de Jobs

```bash
# Ver quais workers processaram execucoes recentes
docker ps --format '{{.Names}}' | grep worker | while read c; do echo "=== $c ==="; docker logs "$c" 2>&1 | grep "finished execution" | tail -5; echo; done
```

### Concorrencia por Worker

```bash
# Controla quantos jobs rodam EM PARALELO dentro de cada worker
N8N_CONCURRENCY_PRODUCTION_LIMIT=5
```

**Valor atual: 5** (minimo recomendado pelo N8N para estabilidade).
O N8N emite warning se < 5: "THIS CAN LEAD TO AN UNSTABLE ENVIRONMENT".

Com 4 workers x 5 = 20 slots paralelos. Uma geracao de 5 fotos usa ~6 slots (1 principal + 5 angulos).

> **IMPORTANTE**: NAO usar `--concurrency=N` no comando E `N8N_CONCURRENCY_PRODUCTION_LIMIT=N` ao mesmo tempo.
> Podem conflitar. Usar APENAS o env var `N8N_CONCURRENCY_PRODUCTION_LIMIT=5`.

| Tipo de workflow    | Concurrency recomendada |
|--------------------|------------------------|
| Imagem/IA (Gemini) | 5 (minimo N8N)         |
| API leve (CRUD)    | 10 (default)           |
| Misto              | 5                      |

### Quando Escalar

| Sinal                                      | Acao                              |
|--------------------------------------------|-----------------------------------|
| Fila Redis > 5 jobs por > 5 minutos       | Adicionar worker                  |
| RAM total workers > 80%                    | Upgrade servidor ou reduzir concurrency |
| CPU total > 80% sustentado                 | Upgrade servidor (mais vCPU)      |
| Precisa de > 6 geracoes simultaneas        | Upgrade para KVM 8 (8 vCPU, 32 GB) |

---

## 4. Anatomia do Workflow Product Studio

### Visao Geral

O Product Studio (workflow 14) tem **2 fluxos** dentro do mesmo workflow:

```
FLUXO A — Geracao Principal (webhook: /vizzu/studio/generate)
  Webhook → Validar → Debitar Creditos → Responder 200
    → Download Frontal → Gerar Foto Frontal (Gemini)
    → Upload Frontal → Gerar Angulos Paralelo
    → Finalizar Geracao

FLUXO B — Geracao de Angulo (webhook: /vizzu/studio/angle)
  Webhook → Extrair Dados → Download Referencia + Download Frontal
    → Gerar Foto Angulo (Gemini) → Upload → Responder
```

### O que Consome Mais Recursos

| Operacao                          | CPU  | RAM          | Tempo    |
|-----------------------------------|------|--------------|----------|
| **Chamada Gemini** (Code node)   | Alto | 30-50 MiB/img | 5-15s/img |
| Download imagens (httpRequest)    | Baixo | 3-8 MiB/img  | 1-3s     |
| Upload Supabase (S3 node)        | Baixo | 3-8 MiB/img  | 1-2s     |
| Conversao Base64                  | Alto | 2x tamanho img | <1s    |
| Queries Supabase                  | Baixo | <1 MiB       | <1s      |

### Pico de Memoria por Geracao (5 imagens 4K)

```
Frontal:
  Download original (3-8 MiB)
  + Download detalhe (3-8 MiB)
  + Conversao base64 (2x cada)
  + Payload Gemini (todas as imagens em base64)
  + Resposta Gemini (imagem gerada em base64)
  = ~50-100 MiB pico

Cada angulo (no sub-workflow):
  Download referencia (3-8 MiB)
  + Download frontal gerada (3-8 MiB)
  + Download detalhe (3-8 MiB)
  + Conversao base64 (2x cada)
  + Payload Gemini
  + Resposta Gemini
  = ~50-100 MiB pico

Orquestrador (Gerar Angulos Paralelo):
  Mantém em memória: dados de todos os angulos
  + Promise.allSettled aguardando todos
  + Array de resultados crescendo
  = ~200-400 MiB

TOTAL PICO WORKER: ~1-1.3 GiB
```

### Redundancias Identificadas

1. **Download duplo no Fluxo B**: Os nos nativos `Download Imagem Angulo` e `Download Frontal Gerada` baixam as imagens, mas o Code node `Gerar Foto Angulo` **baixa as mesmas imagens de novo** internamente. Cada imagem e baixada 2x.

2. **`studioImageBase64` no JSON output**: A foto frontal gerada existia tanto como binary data quanto como base64 no JSON, dobrando a memória. **Ja corrigido** (removido do JSON).

3. **Dead code**: A funcao `generateAngleWithoutRef()` no node "Gerar Angulos Paralelo" nunca e chamada (~120 linhas de codigo morto).

4. **No "Download Detalhe4"**: Baixa a imagem de detalhe mas nao tem conexao downstream — dead-end. O detalhe e baixado inline dentro do Code node.

---

## 5. Como Funciona a Distribuicao de Jobs

### Arquitetura Atual (v9 + Queue Mode)

O Product Studio v9 ja distribui angulos entre workers usando **webhooks internos**:

```
Geracao de 5 imagens (frontal + 4 angulos):

[Worker 1] ━━ Fluxo Principal ━━━━━━━━━━━━━━━━━━━━━━━━━
            ▲ download  ▲ frontal (Gemini)  ▲ dispara 4 webhooks  ▲ aguarda respostas  ▲ finaliza

[Worker 2] ░░░░░░░░░░░ ━━ angulo1 (Gemini) ━━ ░░░░░░░
[Worker 3] ░░░░░░░░░░░ ━━ angulo2 (Gemini) ━━ ░░░░░░░
[Worker 4] ░░░░░░░░░░░ ━━ angulo3 (Gemini) ━━ ░░░░░░░
[Worker 2] ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ━━ angulo4 ━━
```

**Como funciona:**
1. Worker 1 pega o job principal da fila Redis
2. Gera a foto frontal (Gemini)
3. Dispara webhooks internos para cada angulo (via "Gerar Angulos Paralelo")
4. Cada webhook cria um **novo job** que entra na fila Redis
5. Workers 2, 3, 4 (e o proprio 1, se tiver slot livre) puxam os jobs de angulo
6. Angulos sao processados em **paralelo** por workers diferentes
7. Resultados voltam via Redis pub/sub para o Worker 1
8. Worker 1 finaliza a geracao

**Resultado confirmado** (09/02/2026): Workers 2, 3 e 4 processaram execucoes 2042, 2043, 2044 em paralelo.

### Com 4 Usuarios Simultaneos

```
[Worker 1] ━━━ Usuario 1 principal ━━━ + angulos overflow ━━━
[Worker 2] ━━━ Usuario 2 principal ━━━ + angulos U1/U3 ━━━━
[Worker 3] ━━━ Usuario 3 principal ━━━ + angulos U1/U2 ━━━━
[Worker 4] ━━━ Usuario 4 principal ━━━ + angulos U2/U3 ━━━━
```

Com concurrency=5 por worker, cada um aceita ate 5 jobs simultaneos.
4 workers x 5 = 20 slots. Mais que suficiente para 4 usuarios gerando 5 fotos cada (24 jobs total).

---

## 6. A Solucao: Sub-Workflows (Fan-Out/Fan-In)

### Conceito

Quebrar o workflow em pecas menores que rodam em workers diferentes:

```
                    ┌──────────────────┐
                    │   Orquestrador   │  Worker 1
                    │  (valida, deduz  │
                    │   creditos, etc) │
                    └───────┬──────────┘
                            │
                   Dispara sub-workflows
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Frontal  │  │ Angulo 1 │  │ Angulo 2 │  Workers 1-4
        │ (Gemini) │  │ (Gemini) │  │ (Gemini) │  (quem estiver
        └────┬─────┘  └────┬─────┘  └────┬─────┘   livre)
             │              │              │
             └──────────────┼──────────────┘
                            │
                     Callbacks para
                     orquestrador
                            │
                    ┌───────▼──────────┐
                    │   Finalizar      │  Worker 1
                    │  (status, refund)│
                    └──────────────────┘
```

### Ganhos Esperados

| Metrica          | Monolitico      | Sub-workflows    | Melhoria |
|------------------|-----------------|------------------|----------|
| RAM por worker   | ~1.3 GiB        | ~350 MiB         | **-73%** |
| Tempo 1 geracao  | ~2-3 min        | ~1-1.5 min       | **-50%** |
| Workers usados   | 1               | ate 4            | **+300%** |
| Retry granular   | Tudo ou nada    | Por angulo       | Muito melhor |
| Tolerancia falha | Perde tudo      | Perde so 1 angulo| Muito melhor |

### Padrao Fan-Out/Fan-In no N8N

O N8N oferece o padrao usando **Execute Sub-workflow** + **Wait Node**:

```
1. Orquestrador gera um resumeUrl unico (Wait node)
2. Para cada angulo, dispara sub-workflow com:
   - Dados do angulo (imageId, frontStudioUrl, etc.)
   - O resumeUrl para callback
   - Um ID unico (nome do angulo)
3. Cada sub-workflow:
   - Gera a imagem (Gemini)
   - Faz upload (Supabase)
   - POST para o resumeUrl com resultado
4. Wait node no orquestrador recebe callbacks
5. Quando todos responderam → Finalizar
```

**Templates oficiais para referencia:**
- [Parallel Sub-Workflow Execution with Wait-for-All](https://n8n.io/workflows/2536)
- [Fan-Out/Fan-In Parallel Processing](https://n8n.io/workflows/6247)
- [Async Parallel with Webhooks](https://n8n.io/workflows/8578)

### Quando Implementar

**Lancamento (15/02)**: Manter workflow monolitico. Ja funciona, esta testado, e 4 workers aguentam 4 usuarios simultaneos.

**Pos-lancamento (P1)**: Refatorar para sub-workflows quando:
- Fila comecar a crescer consistentemente
- Mais de 10 clientes ativos
- Necessidade de retry individual por angulo

---

## 7. Error Handling (Workflow v11)

### Como Funciona

Quando um no critico falha no workflow Product Studio:

```
Nos criticos (com onError=continueErrorOutput):
  - Download Imagem
  - Gerar Foto Frontal
  - Gerar Angulos Paralelo
  - Finalizar Geracao

Fluxo de erro:
  No falha → output de erro (index 1)
    → "Marcar Geracao Falhou" (PATCH status=failed no Supabase)
    → "Reembolsar Creditos Erro" (RPC add_credits)
```

### O que Acontece

1. **N8N**: No critico falha → error output → PATCH `generations?id=eq.{id}&status=eq.processing` com `{status: 'failed', error_message: '...'}`
2. **N8N**: Apos marcar failed → chama `rpc/add_credits` para reembolsar creditos automaticamente
3. **Frontend**: Polling a cada 3 segundos detecta `status=failed` → mostra toast de erro
4. **Usuario**: Ve a mensagem de erro em ~3-6 segundos (antes esperava 10 minutos)

### Detalhes Tecnicos

- O PATCH tem filtro `&status=eq.processing` para nao sobrescrever status de geracoes ja completadas
- Os nos de erro tem `onError: "continueRegularOutput"` para nao causar erro em cascata
- O frontend usa `showToast()` para notificar o usuario (commit `8a63a43`)
- Creditos sao calculados com base no numero de angulos: `p_amount: angles.length`

### Limitacoes

- `process.env` NAO funciona nos Code nodes (N8N 2.6.4 Task Runner sandbox)
- Nao e possivel saber qual worker processou cada execucao de dentro do workflow
- A UI do N8N nao mostra qual worker processou — apenas docker logs

---

## 8. Binary Data — Filesystem Mode

### O que e

Quando o N8N processa imagens, elas ficam na memoria (RAM) por padrao. O `filesystem` mode salva os binarios em disco em vez de RAM:

```bash
N8N_DEFAULT_BINARY_DATA_MODE=filesystem
```

**Reducao de RAM: ~50%** para dados que passam ENTRE nos (binary data output de um no para input de outro).

### Limitacao Importante

> A documentacao oficial diz que filesystem mode NAO e suportado em queue mode.
> **POREM, funciona quando todos os containers estao no mesmo servidor** e compartilham o mesmo volume.

Isso e exatamente o caso da Vizzu (EasyPanel, servidor unico).

### O que o Filesystem Mode NAO resolve

Dentro de um **Code node**, quando se faz `this.helpers.httpRequest({ encoding: 'arraybuffer' })`, a imagem vai direto pra RAM do worker. O filesystem mode so atua nos dados que passam **entre** nos.

Ou seja: o pico de RAM dentro do Code node `Gerar Foto Frontal` ou `Gerar Foto Angulo` NAO e reduzido pelo filesystem mode. Isso reforça a importancia dos sub-workflows para isolamento de memoria.

### Limpeza de Dados Binarios

O filesystem mode **NAO limpa automaticamente** os arquivos. Configurar cron:

```bash
# Adicionar ao crontab do servidor (rodar diariamente as 3h)
0 3 * * * find /etc/easypanel/projects/n8n/n8n_worker/.n8n/binaryData -type f -mtime +5 -delete 2>/dev/null
```

Sincronizar com `EXECUTIONS_DATA_MAX_AGE` (atualmente 336 horas = 14 dias).

### Modos Disponiveis

| Modo         | Onde salva  | Quando usar                        |
|-------------|-------------|-------------------------------------|
| `default`   | Memoria     | Apenas desenvolvimento              |
| `filesystem`| Disco local | **Servidor unico (caso Vizzu)**    |
| `s3`        | S3/MinIO    | Multi-servidor (requer Enterprise)  |

---

## 8. Variaveis de Ambiente — Referencia Completa

### Workers (n8n_worker, n8n_worker2, n8n_worker3, n8n_worker4)

```bash
# === Banco de Dados ===
DB_TYPE=postgresdb
DB_POSTGRESDB_DATABASE=$(PROJECT_NAME)
DB_POSTGRESDB_HOST=$(PROJECT_NAME)_n8n_postgres
DB_POSTGRESDB_PASSWORD=<senha>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_USER=postgres

# === Fila Redis ===
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=$(PROJECT_NAME)_redis_n8n
QUEUE_BULL_REDIS_PASSWORD=<senha>
QUEUE_BULL_REDIS_PORT=6379

# === Execucoes ===
EXECUTIONS_DATA_MAX_AGE=336          # Reter execucoes por 14 dias
EXECUTIONS_DATA_PRUNE=true           # Auto-limpar execucoes antigas

# === Identidade (DEVE ser igual em todos) ===
N8N_ENCRYPTION_KEY=<mesma-chave>     # CRITICO: mesma em todos os containers
N8N_EDITOR_BASE_URL=https://n8neditor.brainia.store/
N8N_HOST=n8neditor.brainia.store/
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8nwebhook.brainia.store/

# === Performance ===
N8N_DEFAULT_BINARY_DATA_MODE=filesystem
N8N_RUNNERS_MAX_OLD_SPACE_SIZE=4096  # Heap Node.js: 4 GiB max
N8N_RUNNERS_TASK_TIMEOUT=600         # Timeout de task runners: 10 min

# === Logs ===
N8N_LOG_LEVEL=debug                  # Mudar para 'warn' em producao estavel
N8N_LOG_OUTPUT=file,console
N8N_LOG_FILE_LOCATION=/home/node/.n8n/logs/n8n-0N.log  # N = numero do worker
TZ=America/Sao_Paulo
GENERIC_TIMEZONE=America/Sao_Paulo

# === Funcionalidades ===
NODE_ENV=production
NODE_FUNCTION_ALLOW_EXTERNAL=moment,lodash,moment-with-locales
N8N_DIAGNOSTICS_ENABLED=false
N8N_CORS_ORIGIN=*
N8N_BLOCK_ENV_ACCESS_IN_NODE=false   # Permite acesso a env vars em Code nodes

# === APIs Externas ===
SUPABASE_URL=<url>
SUPABASE_SERVICE_KEY=<key>
STRIPE_SECRET_KEY=<key>
GEMINI_API_KEY=<key>
```

### Variaveis RECOMENDADAS para adicionar

```bash
# === No Editor/Main ===
N8N_DISABLE_PRODUCTION_MAIN_PROCESS=true   # Main NAO executa workflows
OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true  # Testes manuais vao pro worker

# === Nos Workers (JA CONFIGURADO) ===
N8N_CONCURRENCY_PRODUCTION_LIMIT=5         # 5 jobs paralelos (minimo N8N)

# === Em todos (opcional, para monitoramento) ===
N8N_METRICS=true
N8N_METRICS_INCLUDE_QUEUE_METRICS=true
```

---

## 9. Redis — Configuracao e Monitoramento

### Configuracao Recomendada

```bash
maxmemory 256mb
maxmemory-policy noeviction    # CRITICO: nunca descartar jobs
appendonly yes                  # Persistencia em disco
```

> **`noeviction` e OBRIGATORIO.** Se o Redis descartar chaves, jobs serao perdidos silenciosamente.

### Monitorar a Fila

```bash
# Via SSH no servidor — primeiro entrar no container Redis
docker exec -it $(docker ps -qf "name=redis_n8n") redis-cli -a <senha>

# Comandos uteis:
LLEN bull:n8n:wait      # Jobs esperando
LLEN bull:n8n:active    # Jobs em execucao
LLEN bull:n8n:completed # Jobs completados
LLEN bull:n8n:failed    # Jobs falhados
INFO memory             # Uso de memoria do Redis
```

---

## 10. Monitoramento e Alertas

### Netdata (ja instalado)

Acessar: `http://IP_SERVIDOR:19999`

**Metricas importantes:**
- **Top by CPU**: Pico real de CPU por container (usar para capacity planning)
- **Top by RAM**: Memoria total por container
- **Tabela inferior**: Media (enganosa, nao usar para dimensionamento)

### Metricas Prometheus (opcional, recomendado pos-lancamento)

```bash
# Adicionar nos containers editor + workers
N8N_METRICS=true
N8N_METRICS_INCLUDE_QUEUE_METRICS=true
N8N_METRICS_QUEUE_METRICS_INTERVAL=30000  # Coletar a cada 30s
```

Metricas expostas em `:5678/metrics`:

| Metrica                            | Alerta quando           |
|------------------------------------|------------------------|
| `n8n_queue_bull_queue_waiting`     | > 10 por > 5 minutos  |
| `n8n_queue_bull_queue_active`      | Sempre no maximo       |
| `n8n_queue_bull_queue_failed`      | Qualquer aumento       |

### Alertas Criticas

| Condicao                       | Acao                                |
|-------------------------------|-------------------------------------|
| Fila > 10 jobs por > 10 min  | Adicionar worker ou upgrade servidor|
| Worker RAM > 80%              | Investigar leak, considerar restart |
| Worker crash (OOM)            | Reduzir concurrency ou adicionar RAM|
| Taxa de erro > 5%             | Checar logs, possivel issue Gemini  |

---

## 11. Capacity Planning

### Consumo por Feature

| Feature                     | RAM pico/worker | CPU pico | Tempo    |
|----------------------------|-----------------|----------|----------|
| Product Studio 1 img 2K    | ~246 MiB        | ~1.3%    | ~30s     |
| Product Studio 1 img 4K    | ~247 MiB        | ~2.4%    | ~30s     |
| Product Studio 5 img 2K    | ~298 MiB        | ~8.9%    | ~90s     |
| **Product Studio 5 img 4K**| **~1.27 GiB**   | **~53%** | **~150s**|
| Creative Still (pendente)  | A medir         | A medir  | A medir  |

### Cenarios de Capacidade (KVM 4: 4 vCPU, 16 GB RAM)

| Clientes ativos | Geracoes/hora estimadas | Workers necessarios | Funciona? |
|----------------|------------------------|--------------------|-----------|
| 5              | ~15                    | 2                  | Tranquilo |
| 10             | ~30                    | 3                  | Tranquilo |
| **20**         | **~60**                | **4**              | **OK, com fila em picos** |
| 30             | ~90                    | 4 (limite)         | Fila frequente em picos |
| 50+            | ~150+                  | Upgrade servidor   | KVM 8 necessario |

### Upgrade Path

| Estagio        | Servidor    | Workers | Geracoes simultaneas | Custo        |
|---------------|-------------|---------|---------------------|--------------|
| **Atual**     | KVM 4       | 4       | 4                   | R$94,99/mes  |
| Crescimento   | KVM 8       | 6-7     | 6-7                 | ~R$189/mes   |
| Escala        | Dedicado    | 10+     | 10+                 | ~R$400+/mes  |

---

## 12. Checklist de Lancamento

### Servidor (feito)
- [x] Hostinger KVM 4 (4 vCPU, 16 GB RAM)
- [x] Remover Chatwoot e Evolution (~1.6 GiB liberados)
- [x] Limpar imagens Docker nao usadas (~8 GB liberados)
- [x] 4 workers configurados e rodando
- [x] `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` em todos os containers

### Configuracao
- [x] `N8N_CONCURRENCY_PRODUCTION_LIMIT=5` nos 4 workers
- [x] Comando `n8n worker` nos 4 workers (EasyPanel Advanced)
- [x] Workers distribuindo jobs em paralelo (confirmado 09/02)
- [x] Workflow v11 com error handling importado
- [x] Frontend com toast de erro (commit `8a63a43`)
- [ ] Adicionar `N8N_DISABLE_PRODUCTION_MAIN_PROCESS=true` no editor
- [ ] Adicionar `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` no editor
- [ ] Verificar Redis `maxmemory-policy noeviction`
- [ ] Configurar cron de limpeza de binary data (filesystem mode)
- [ ] Testar error handling end-to-end (forcar erro, ver toast no frontend)
- [ ] Mudar `N8N_LOG_LEVEL=debug` para `warn` quando estabilizar

### Workflows (pendente)
- [ ] Kaique reimportar workflow 15 (Creative Still v2)
- [ ] Testar Creative Still simplificado
- [ ] Completar medicoes: Creative Still (4 testes) + Studio Ready (2 testes)

### Monitoramento (pendente)
- [ ] Configurar alerta basico no Netdata (RAM > 80%, CPU > 90%)
- [ ] Adicionar `N8N_METRICS=true` em todos os containers (opcional)

---

## 13. Roadmap de Otimizacao

### P0 — Lancamento (15/02)
Manter workflow monolitico. Focar em estabilidade.
- 4 workers, concurrency 1
- Monitorar fila e consumo na primeira semana

### P1 — Pos-lancamento (marco/2026)

#### P1.1 — Indicador de Carga + Notificacoes
- **Hook `useSystemLoad()`**: Consulta Supabase (count de geracoes com status='processing'). Se >= 3, mostra aviso de alta demanda com tempo estimado.
- **Aplicar em TODAS as features**: Product Studio, Creative Still, Look Composer, Provador, Model Creator, Studio Ready, Cenario Criativo, Refine
- **Notificacao ao concluir**: CTA "Deseja ser notificado quando terminar?" → email via N8N workflow + push notification via PWA Service Worker

#### P1.2 — Error Handling em Todas as Features
Atualmente so o Product Studio (v11) tem error handling. Adicionar em todos:

| Feature | Webhook N8N | Tabela Supabase | Error Handling |
|---------|------------|-----------------|----------------|
| Product Studio | `/vizzu/studio/generate` | `generations` | ✅ v11 feito |
| Creative Still Advanced | `/vizzu/still/generate` | `creative_still_generations` | ❌ Precisa |
| Creative Still Simples | `/vizzu/still/generate-simple` | `creative_still_generations` | ❌ Precisa |
| Look Composer | `/vizzu/modelo-ia-v2` | `generations` | ❌ Precisa |
| Provador | `/vizzu/provador` | Sincrono | ❌ Precisa (try/catch) |
| Model Creator | `/vizzu/generate-model-images` | Sincrono | ❌ Precisa (try/catch) |
| Studio Ready | `/vizzu/studio-ready` | Sincrono | ❌ Precisa (try/catch) |
| Cenario Criativo | `/vizzu/cenario-criativo` | Sincrono | ❌ Precisa (try/catch) |
| Refine | `/vizzu/refine` | Sincrono | ❌ Precisa (try/catch) |

Para cada workflow N8N, adicionar:
1. `onError: "continueErrorOutput"` nos nos criticos
2. No de PATCH `status='failed'` + `error_message` na tabela correspondente
3. No de reembolso automatico via `rpc/add_credits`

#### P1.3 — Dashboard Admin
- Pagina `/admin` no Vizzu com metricas do servidor
- Fontes: N8N API (execucoes), Netdata API (CPU/RAM), Supabase (geracoes/creditos)
- Mostra: execucoes por worker, fila atual, uso de recursos, gerações ativas

#### P1.4 — Sub-workflows
- **Product Studio**: Orquestrador + gerador por angulo (fan-out/fan-in)
- **Creative Still**: Orquestrador + gerador por variacao
- **Look Composer**: Orquestrador + gerador por view (front/back)
- Ganho: -73% RAM por worker, -50% tempo, retry por angulo

#### P1.5 — Controle de Fila
- Fila por usuario: max 2 geracoes simultaneas
- Metricas Prometheus (`N8N_METRICS=true`) + dashboard Grafana

### P2 — Otimizacao (abril/2026)
- **Image Transformations**: Resize + JPEG 85% antes do Gemini (-70% payload)
- **Upload direto**: Frontend → Supabase via signed URL (cadastro sem N8N)
- **Retry individual**: Re-executar so o angulo/variacao que falhou
- **Remover redundancias**: Download duplo no fluxo de angulos, dead code

### P3 — Escala (quando necessario)
- Upgrade para KVM 8 (8 vCPU, 32 GB)
- 6-7 workers
- Push notifications via OneSignal ou Firebase Cloud Messaging
- Avaliar S3 para binary data (se multi-servidor)
- Circuit breaker e rate limiting por usuario

---

## Fontes

### Documentacao Oficial N8N
- [Configuring Queue Mode](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [Scaling Overview](https://docs.n8n.io/hosting/scaling/overview/)
- [Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)
- [Scaling Binary Data](https://docs.n8n.io/hosting/scaling/binary-data/)
- [Sub-workflows](https://docs.n8n.io/flow-logic/subworkflows/)
- [Execute Sub-workflow Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)
- [Prometheus Metrics](https://docs.n8n.io/hosting/configuration/configuration-examples/prometheus/)

### Comunidade e Guias
- [Queue Mode on Same Machine](https://community.n8n.io/t/queue-mode-main-process-worker-processes-on-same-machine/139263)
- [Queue Mode Binary Data](https://community.n8n.io/t/queue-mode-binary-data-mode/59653)
- [Running Sub-workflows in Parallel](https://community.n8n.io/t/running-subworkflows-in-parallel/101992)
- [n8n Scaling & Reliability Guide (Medium)](https://medium.com/@orami98/the-n8n-scaling-reliability-guide)
- [n8n Queue Mode: Process 10,000+ Workflows](https://logicworkflow.com/blog/n8n-queue-mode/)
- [n8n Queue Mode Setup (NextGrowth)](https://nextgrowth.ai/scaling-n8n-queue-mode-docker-compose/)

### Templates N8N
- [Parallel Sub-Workflow with Wait-for-All](https://n8n.io/workflows/2536)
- [Fan-Out/Fan-In Processing](https://n8n.io/workflows/6247)
- [Async Parallel with Webhooks](https://n8n.io/workflows/8578)
