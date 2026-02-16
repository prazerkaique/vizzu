# Vizzu — Próximos Passos para Lançamento (15/02/2026)

> Atualizado em: 10/02/2026 (noite)

---

## PRÓXIMO PASSO IMEDIATO: Testar Creative Still Multi-Worker

### O que foi feito hoje (sessão 9)

1. **Workflow N8N reescrito para multi-worker** (padrão Product Studio v11)
   - Workflow 21 agora é **orquestrador**: despacha ângulos via HTTP webhook
   - Workflow 22 é **NOVO**: sub-workflow de 1 ângulo (Gemini + S3 upload)
   - Cada ângulo vira um job Redis → workers 2, 3, 4 processam em paralelo
   - `Promise.allSettled()` no orquestrador + incremental `variation_urls`

2. **Fix FK `credit_transactions`**: `p_generation_id: null` nos RPCs (a FK aponta para `generations`, não `creative_still_generations`)

3. **Fix imagens quebradas**: padrão de download e chamada Gemini agora é idêntico ao PS v11 (produção)

4. **Loading screen padronizada**: GIF Scene-1.gif, backdrop-blur-2xl, gradiente coral→laranja, botão minimizar embaixo, botão cancelar

### Teste end-to-end — checklist

```
[ ] 1. Importar os 2 workflows no N8N (podem estar no mesmo workflow)
      - Webhook principal: /vizzu/still/generate-simple
      - Webhook ângulo: /vizzu/still/angle
      - AMBOS devem estar ATIVOS

[ ] 2. Testar com 1 ângulo (front) + 1 variação
      - Selecionar produto com foto frontal
      - Escrever prompt simples (ex: "foto artística em mesa de madeira")
      - Verificar: créditos debitados? Status muda para processing? Resultado aparece?

[ ] 3. Testar com 3 ângulos (front + back + side-left)
      - Verificar nos docker logs se workers DIFERENTES processaram cada ângulo:
        docker logs n8n-worker-2 --since 5m | grep "STILL ANGULO"
        docker logs n8n-worker-3 --since 5m | grep "STILL ANGULO"
        docker logs n8n-worker-4 --since 5m | grep "STILL ANGULO"
      - Verificar: variation_urls é atualizado incrementalmente?
      - Verificar: frontend mostra imagens conforme vão chegando?

[ ] 4. Testar cenário de falha
      - Se um ângulo falhar: refund parcial? Status completed (não failed)?
      - Se TODOS falharem: refund total? Status failed?

[ ] 5. Testar loading screen
      - GIF aparece? (não mais Lottie)
      - Barra de progresso coral→laranja?
      - Botão "Minimizar e continuar navegando" funciona?
      - Botão "Cancelar geração" funciona?

[ ] 6. Testar referências visuais
      - Arrastar 1-2 imagens de inspiração
      - Verificar se a IA usa como referência no resultado

[ ] 7. Testar WebP vs PNG
      - Output atual do Creative Still é WebP (Gemini retorna WebP por padrão)
      - Product Studio gera PNG
      - Comparar: consumo de RAM/CPU no servidor ao processar WebP vs PNG
      - Comparar: tamanho do arquivo final (WebP geralmente é 30-50% menor)
      - Se WebP for mais leve, considerar migrar PS para WebP também
```

---

## O que já foi feito (resumo completo)

### Infraestrutura & Servidor
- [x] Servidor Hostinger KVM 4 (4 vCPU, 16 GB RAM, R$94.99/mês)
- [x] N8N em Queue Mode (editor + webhook + 4 workers + postgres + redis)
- [x] `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` nos 3 containers
- [x] Netdata instalado para monitoramento
- [x] Chatwoot + Evolution removidos (~1.6 GiB RAM liberados)
- [x] Docker cleanup (8 GB disco liberados)
- [x] 4 workers corrigidos com `n8n worker` + `N8N_CONCURRENCY_PRODUCTION_LIMIT=5`
- [x] `QUEUE_WORKER_LOCK_DURATION=600000`
- [x] Distribuição confirmada em produção

### Product Studio
- [x] v11: geração async + paralela, multi-worker, polling incremental, retry individual
- [x] Ângulos por categoria + folded + vista superior
- [x] Seletor de fundo (cinza/branco) + sombra (com/sem)
- [x] Seletor de enquadramento no Look Composer
- [x] Créditos por resolução: 2K=1/foto, 4K=2/foto
- [x] Upload condicional por categoria (productConfig.ts)
- [x] Error handling v11
- [x] Loading gamificado, cancel button, timeout dinâmico

### Creative Still (ATUALIZADO)
- [x] Wizard de 4 passos REMOVIDO → novo fluxo 3 camadas (Listagem → Editor → Resultados)
- [x] Editor com prompt livre + referências visuais (1-4 imagens) + ângulos selecionáveis
- [x] Filtros completos na listagem (categoria, subcategoria, coleção, cor, gênero, ordenação)
- [x] Ícone padronizado (sem gradiente, igual PS)
- [x] **Workflow N8N multi-worker** (orquestrador + sub-workflow por ângulo)
- [x] Loading screen padronizada (padrão PS: GIF, minimizar, cancelar)
- [x] Fix FK credit_transactions (p_generation_id: null)

### Feature: Edição de Imagem
- [x] ImageEditModal genérico (PS, CS, LC)
- [x] "Salvar como Nova" em todos os editores
- [x] Workflow 20 v3 — upload via S3 node
- [x] Migration SQL: `edit_balance` + RPC `deduct_edit_credits`
- [x] Badge "Editado"

### UX
- [x] 5 melhorias UX (enquadramento, voltar ao salvar, peça principal, explorar todos, pendentes primeiro)
- [x] Re-poll tardio (5s) para ângulos atrasados

---

## CONCLUÍDO — Kaique

### Workflows Reimportados no N8N

| Workflow | Status |
|---|---|
| **21+22 — Creative Still Multi-Worker** | Importado |
| **18 — Product Studio v11** | Importado |
| **19 — Look Composer** | Importado |
| **14 — Importar/Editar** | Importado |
| **20 — Studio Edit v3** | Importado |

### SQL Executado no Supabase
- `edit_balance` + RPC `deduct_edit_credits` — Executado

### Configurar Stripe — PENDENTE
Na renovação/upgrade de plano via Stripe webhook:
```
edit_balance = FLOOR(plan_credits * 0.3)
```

---

## PENDENTE — Copiloto

### P0 — Crítico para lançamento

| # | Item | Esforço | Status |
|---|---|---|---|
| 1 | Error handling nos workflows Look Composer (19) | Médio | Feito |
| 2 | Sistema de Reports completo (tabela + webhooks + domínio) | Alto | **Não iniciado** |
| 3 | `fetchWithRetry.ts` (timeout 60s + retry 3x + circuit breaker) | Médio | Feito |

### P1 — Pós-lançamento

| # | Item | Esforço | Status |
|---|---|---|---|
| 4 | Fila por usuário (max 2 simultâneas) | Médio | Pendente |
| 5 | Dashboard Admin com métricas | Alto | **Não iniciado** |
| 6 | Polling com backoff progressivo (3→5→10→15s) | Baixo | Pendente |
| 7 | Métricas Prometheus (`N8N_METRICS=true`) | Baixo | Pendente |
| 8 | Image Transformations Supabase (`?width=2048&quality=85`) | Baixo | Pendente |
| 9 | Resize + JPEG 85% antes de enviar ao Gemini | Médio | Pendente |

---

## Arquitetura Multi-Worker Creative Still

```
Frontend → POST /vizzu/still/generate-simple
              ↓
         Workflow 21 (Worker 1 — orquestrador)
         ├─ Valida créditos
         ├─ Debita créditos (p_generation_id: null)
         ├─ Responde 200 ao frontend
         └─ Gerar Angulos Paralelo:
              ├─ POST /vizzu/still/angle {angle: "front"}   → Execução separada → Worker 2
              ├─ POST /vizzu/still/angle {angle: "back"}    → Execução separada → Worker 3
              └─ POST /vizzu/still/angle {angle: "side"}    → Execução separada → Worker 4
              ↓ Promise.allSettled() — espera todos
         └─ Finalizar Geração (marca completed, refund parcial se necessário)

Workflow 22 (processado por qualquer worker disponível):
  Webhook Angulo → Busca geração do Supabase → Download imagens
  → Gemini (retry 3x) → prepareBinaryData → S3 Upload → Respond 200
```

---

## Configuração do servidor atual

- **Servidor**: Hostinger KVM 4 — 4 vCPU, 16 GB RAM, 200 GB NVMe
- **8 containers**: N8N editor, webhook, 4 workers, postgres, redis + Traefik + Netdata
- **RAM em repouso**: ~2 GiB / 16 GiB
- **Disco usado**: ~20 GB / 174 GB livre
- **Monitoramento**: Netdata na porta 19999
- **Pior caso medido**: Product Studio 5 imagens 4K = 350 MiB RAM, ~50.68% CPU pico
