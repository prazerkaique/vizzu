# Plano de Refatoracao — Product Studio v9

> Documento temporario de acompanhamento. Excluir quando tudo estiver concluido.
> Criado em: 2026-02-06

---

## Contexto

O Product Studio gera imagens multi-angulo (frente, costas, detalhe, dobrada) via N8N + Gemini.
Problemas atuais:
- Workflow sequencial demora ~4 min para 4 angulos
- Frontend nao percebe quando termina (502 timeout + polling fragil)
- Nenhum tratamento de falha parcial

Objetivo: reduzir para ~1.5-2 min, mostrar imagens conforme ficam prontas, tratar erros graciosamente.

---

## Fase 1 — N8N: Resposta Assincrona + Paralela

**Objetivo:** Webhook responde imediato, angulos geram em paralelo.

### Tarefas

- [ ] **1.1** Mover resposta do webhook para logo apos "Criar Geracao"
  - Responder com: `{ success: true, generation_id, status: "processing", angles: [...] }`
  - Resto do fluxo continua em background

- [ ] **1.2** Manter geracao da frontal como primeiro passo (obrigatoria)
  - Apos frontal pronta: upload + insert em `product_images` (ja funciona)

- [ ] **1.3** Paralelizar angulos restantes
  - Code node apos frontal: usar `Promise.all` + `this.helpers.httpRequest`
  - Disparar todos os angulos simultaneamente para `/vizzu/studio/angle`
  - Cada chamada cria execucao independente no N8N

- [ ] **1.4** Tratamento de erro por angulo no N8N
  - Se Gemini falhar para 1 angulo, nao travar os outros
  - Registrar falha: inserir em `product_images` com `type: "product_studio_failed"` ou campo similar
  - Alternativa: atualizar `generations.output_urls` com status por angulo:
    ```json
    [
      {"angle": "front", "url": "...", "status": "completed"},
      {"angle": "back", "url": "...", "status": "completed"},
      {"angle": "detail", "status": "failed", "error": "Gemini timeout"}
    ]
    ```

- [ ] **1.5** Creditos: debitar upfront ao criar a geracao
  - Usar RPC `deduct_credits` logo apos "Criar Geracao"
  - Se geracao falhar totalmente (frontal falha): devolver via `add_credits`
  - Se falha parcial: devolver apenas os angulos que falharam
  - Retry de angulo individual = gratuito (ja pagou)

- [ ] **1.6** Atualizar `generations` incrementalmente
  - Apos frontal: update `output_urls` com `[{angle: "front", url: "..."}]`
  - Apos cada angulo: append ao array `output_urls`
  - Apos todos: marcar `status: "completed"`
  - Se algum falhou: marcar `status: "partial"` (novo status)

- [ ] **1.7** Gerar JSON do workflow refatorado
  - Salvar em `n8n-workflows/` (gitignored)

### Decisoes tecnicas
- Angulos SEM referencia tambem vao pelo webhook `/vizzu/studio/angle` (unificar caminho)
- `Promise.all` com `Promise.allSettled` para nao travar se 1 falhar
- Timeout de 180s por angulo no `this.helpers.httpRequest`

### Resultado esperado
- Webhook responde em ~1s (sem 502)
- Frontal pronta em ~45s
- Angulos restantes em ~60s (paralelo)
- Total: ~1.5-2 min (antes: ~4 min)

---

## Fase 2 — Frontend: Polling Incremental

**Objetivo:** Mostrar imagens conforme ficam prontas, card por card.

### Tarefas

- [x] **2.1** Novo fluxo de polling baseado em `generation_id`
  - `pollStudioGeneration()` em studio.ts consulta `generations.output_urls` + `status`
  - Poll a cada 3s (v9) — mais rapido que v8
  - `output_urls` atualizado incrementalmente pelo workflow v9

- [x] **2.2** Estados dos cards de angulo
  - **Pendente** (cinza): ainda nao comecou
  - **Gerando** (animado/pulse): em processamento
  - **Pronto** (verde + thumbnail): imagem gerada com sucesso
  - **Falhou** (vermelho): erro na geracao (botoes retry/report na Fase 3)

- [x] **2.3** Logica de deteccao de problemas no polling
  - Timeout maximo: 5 minutos
  - Detecta `generations.status` = failed/partial/completed
  - Progresso real baseado em angulos completados / total

- [x] **2.4** Persistencia entre refreshes (F5)
  - localStorage salva `generationId`, `angles`, `startTime`
  - useEffect ao montar retoma polling se pending existe
  - Restaura angulos selecionados da geracao pendente

- [x] **2.5** Compatibilidade v8 mantida como fallback
  - v9: resposta imediata com generation_id → polling incremental
  - v8: 502/504 → polling fallback (sem generationId)
  - Polling primario para v9, fallback para v8

---

## Fase 3 — Frontend: Retry Individual + Reportar Problema

**Objetivo:** Usuario pode tentar novamente um angulo que falhou, e reportar se persistir.

### Tarefas

- [x] **3.1** Botao "Tentar novamente" por angulo
  - Aparece no card com status "falhou" (apos geracao terminar)
  - `retryStudioAngle()` em studio.ts chama `/vizzu/studio/angle` direto
  - Payload: `{ product_id, user_id, angle, front_studio_url, generation_id, ... }`
  - Mostra spinner so naquele card enquanto retenta
  - Se funcionar: card fica verde, atualiza sessao do produto
  - Se todos os angulos ficam OK apos retry: auto-fecha e mostra resultado
  - Se falhar de novo: incrementa `retryAttempts[angle]` (mostra "Reportar" apos 2x)
  - Custo: gratuito (creditos ja debitados na geracao original)
  - Modal de loading FICA ABERTO quando ha falhas (nao auto-fecha)

- [x] **3.2** Botao "Reportar problema"
  - Aparece apos 2 tentativas sem sucesso no mesmo angulo
  - Usa componente `ReportModal` existente + `submitReport()` de reports.ts
  - Envia para tabela `generation_reports` (ja existia) + notificacao WhatsApp
  - Observation prefixada com `[Angulo: X]` para facilitar analise
  - UX: modal com textarea (min 10 chars), promessa de credito em 24h

- [x] **3.3** Tabela de reports — JA EXISTIA como `generation_reports`
  - Nao foi necessario criar nova tabela

---

## Fase 4 — Frontend: Protecoes

**Objetivo:** Prevenir comportamentos inesperados do usuario.

### Tarefas

- [x] **4.1** Lock instantaneo no botao "Gerar"
  - `isSubmitting` state local, setado no MESMO TICK antes de qualquer async
  - Botao disabled inclui `isSubmitting || isAnyGenerationRunning || isGenerating`

- [x] **4.2** BroadcastChannel para multi-abas
  - Integrado direto no GenerationContext (canal `vizzu-generation-sync`)
  - Broadcast `generation_started` / `generation_completed` quando estado muda
  - `isAnyGenerationRunning` inclui `otherTabGenerating`
  - Fallback seguro se BroadcastChannel nao existe (SSR)

- [x] **4.3** Deteccao de sessao expirada (401) no polling
  - `pollStudioGeneration` detecta JWT expired
  - Tenta `supabase.auth.refreshSession()` automaticamente
  - Se refresh falhar: retorna error_message para UI

- [ ] **4.4** Prevencao de duplicata no retry (movido para Fase 3)

---

## Fase 5 — Fix Categorias (Rapido)

**Objetivo:** Corrigir classificacao de categorias para Ghost Mannequin / Flat Lay.

### Tarefas

- [ ] **5.1** Adicionar categorias faltantes
  - `FOOTWEAR_CATEGORIES`: adicionar `'Sapatos'`, `'Chinelos'`
  - `ACCESSORY_CATEGORIES`: adicionar `'Mochilas'`
  - Arquivo: `src/components/ProductStudio/ProductStudioEditor.tsx` linhas 108-111

---

## Ordem de Execucao

| Ordem | Fase | Dependencia | Estimativa |
|---|---|---|---|
| 1 | Fase 5 (categorias) | Nenhuma | 5 min |
| 2 | Fase 1 (N8N async+paralelo) | Nenhuma | Gerar JSON |
| 3 | Fase 2 (polling incremental) | Fase 1 | Medio |
| 4 | Fase 4 (protecoes) | Pode ser paralelo com Fase 2-3 | Medio |
| 5 | Fase 3 (retry+report) | Fase 2 | Medio |

---

## Decisoes Pendentes

- [ ] **Report:** tabela Supabase vs webhook externo (Slack/Discord)?
- [ ] **Status "partial":** criar novo status na tabela `generations` ou usar "completed" com flag?

---

## Arquivos que serao alterados

| Arquivo | Fases | O que muda |
|---|---|---|
| `src/components/ProductStudio/ProductStudioEditor.tsx` | 2, 3, 4, 5 | Polling, retry, report, categorias, lock |
| `src/lib/api/studio.ts` | 2, 3 | Novo fluxo de polling, funcao retry |
| `src/contexts/GenerationContext.tsx` | 4 | BroadcastChannel |
| `src/lib/broadcastChannel.ts` | 4 | Novo arquivo |
| `n8n-workflows/XX-studio-generate-v9.json` | 1 | Workflow refatorado |
| Supabase SQL | 3 | Tabela `error_reports` (se opcao A) |

---

*Documento paliativo — excluir apos conclusao de todas as fases.*
