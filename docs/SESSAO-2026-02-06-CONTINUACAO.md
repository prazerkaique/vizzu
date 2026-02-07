# Sessao 2026-02-06 — Continuacao (atualizado 2026-02-07)

## Status Atual
- **Easypanel + n8n**: ONLINE
- **Servidor Hostinger**: `srv1156073.hstgr.cloud` (IP: 72.61.59.206)
- **Infra n8n**: Easypanel com 5 servicos (editor, postgres, webhook, worker, redis) — modo queue

---

## Problemas Identificados

### Problema 1 — n8n crashando (Out of Memory)
- **Erro**: `Node execution failed` → `InternalTaskRunnerDisconnectAnalyzer.toDisconnectError`
- **Causa**: O Task Runner do n8n (processo que executa Code nodes) nao tinha memoria suficiente para processar imagens base64 pesadas
- **Agravante**: O workflow processava todos os angulos em PARALELO (`Promise.allSettled`), multiplicando o uso de RAM

**Status: PARCIALMENTE RESOLVIDO**
- [x] Adicionado `N8N_RUNNERS_MAX_OLD_SPACE_SIZE=4096` no worker e webhook (4GB heap)
- [x] Adicionado `N8N_RUNNERS_TASK_TIMEOUT=600` no worker e webhook (10min timeout)
- [ ] **PENDENTE**: Importar workflow v9.1 sequencial (`15-product-studio-v91-sequential.json`)
  - Este workflow processa angulos UM POR VEZ (sequencial) em vez de todos ao mesmo tempo
  - Sem importar este workflow, a memoria extra ajuda mas nao resolve 100%

### Problema 2 — Imagem frontal sem relacao com referencia
- **Sintoma**: A foto gerada pelo Gemini nao se parecia com o produto original
- **Causa provavel**: Consequencia do Problema 1 — com pouca memoria, a imagem de referencia pode ser corrompida/truncada durante conversao base64, e o Gemini recebe dados parciais
- **Status**: Testar apos resolver Problema 1 (memoria + workflow sequencial)

### Problema 3 — Tela de resultados parciais
- **Requisito**: Quando a geracao terminar, mesmo com falhas parciais, mostrar as imagens geradas + indicar as falhadas com opcao de "gerar de novo"
- **Status: JA FUNCIONA ~90%**
  - Modal de loading ja mostra cards por angulo (verde=OK, vermelho=falhou)
  - Retry individual ja implementado (ate 2 tentativas, sem custo extra de credito)
  - Botao "Reportar" apos 2 falhas
  - Thumbnails das imagens geradas aparecem em tempo real
  - **Gap**: A tela de galeria final so abre quando TODOS os angulos completam. Resultados parciais ficam visiveis no modal de loading

---

## Problema Original (sessao anterior)
As imagens dos angulos **folded** e **back_detail** vinham **quebradas**.

### Causa Raiz
- `this.helpers.httpRequest` do n8n serializa Buffer como JSON em vez de binario
- Angulos COM referencia → sub-workflow → upload via S3 node → OK
- Angulos SEM referencia → upload inline via httpRequest → QUEBRADO

### Solucao
Rotear esses angulos pelo sub-workflow usando referencias alternativas:

| Angulo | Referencia alternativa |
|--------|----------------------|
| `folded` | `frontDbId` (frontal gerada) |
| `back_detail` | `referenceImages['back']` (costas original) |
| `front_detail` | `referenceImages['front']` (frente original) |

---

## O Que Foi Feito (2026-02-07)

### Workflow v9.1 — Processamento Sequencial
1. Exportado workflow REAL de producao do n8n (30 nos, 26 conexoes)
2. Salvo como `n8n-workflows/production-raw.json` (estrutura base)
3. Extraidos os 5 Code nodes em arquivos separados:
   - `code-nodes/gerar-foto-frontal.js` (16.4K chars) — geracao da foto frontal com Gemini
   - `code-nodes/gerar-path-frontal.js` (1.2K chars) — gera UUID e path no Storage
   - `code-nodes/finalizar-geracao.js` (3.8K chars) — status final + refund de creditos
   - `gerar-angulos-sequencial.js` (19.8K chars) — **FIX: sequencial em vez de paralelo**
   - `Gerar Foto Angulo` — mantido do original (15.9K chars)
4. Script `build-v91.py` monta o JSON final substituindo PLACEHOLDERs
5. **Output**: `15-product-studio-v91-sequential.json` (88KB, 30 nos, zero PLACEHOLDERs)

### Configuracao de Memoria
- `N8N_RUNNERS_MAX_OLD_SPACE_SIZE=4096` — 4GB de heap para o Task Runner
- `N8N_RUNNERS_TASK_TIMEOUT=600` — 10 minutos de timeout (era 5min)
- Adicionado nos servicos **worker** e **webhook** no Easypanel

### Variaveis de Ambiente Atuais (worker)
```
DB_TYPE=postgresdb
EXECUTIONS_MODE=queue
N8N_EDITOR_BASE_URL=https://n8neditor.brainia.store/
WEBHOOK_URL=https://n8nwebhook.brainia.store/
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
N8N_RUNNERS_MAX_OLD_SPACE_SIZE=4096  ← NOVO
N8N_RUNNERS_TASK_TIMEOUT=600          ← NOVO
(+ postgres, redis, keys, etc.)
```

---

## PROXIMO PASSO (2026-02-07)

### 1. Importar workflow v9.1 no n8n
1. No Codespaces, navegar ate `n8n-workflows/`
2. Botao direito em `15-product-studio-v91-sequential.json` → Download
3. No n8n editor (https://n8neditor.brainia.store/), abrir workflow Product Studio
4. Menu ⋮ → Import from File → selecionar o JSON baixado
5. Ativar o workflow

### 2. Testar geracao
- Gerar um produto com 3-4 angulos
- Verificar que NAO trava/crasha
- Verificar que a imagem frontal parece com o produto original
- Verificar angulos `folded` e `back_detail` (se aplicavel)

### 3. Se a imagem frontal continuar ruim
- Reduzir temperatura do Gemini de 0.3 para 0.1 (mais fiel)
- Verificar qualidade da imagem de referencia do produto
- Testar com prompt mais curto

---

## Escalabilidade (pergunta do Kaique)

| Fase | Usuarios | Acao |
|------|----------|------|
| Agora (V1) | 1-15 | Setup atual com 1 worker |
| Crescimento | 15-50 | +1-2 workers no Easypanel + VPS maior |
| Escala | 50-200 | 3-4 workers + VPS dedicado |
| Grande | 200+ | Cloud com auto-scaling |

O setup com Redis + queue mode JA esta preparado para escalar — basta duplicar o servico worker.

---

## Licoes Aprendidas

1. **n8n Task Runner tem limite de memoria separado** — `N8N_RUNNERS_MAX_OLD_SPACE_SIZE` controla o heap do processo que executa Code nodes
2. **Promise.allSettled com imagens = OOM** — cada sub-workflow + main = 5-6x RAM. Usar `for...of` sequencial
3. **Nunca substituir workflow inteiro via JSON gerado** — Code nodes podem ter codigo diferente da producao. Extrair o real, modificar, e remontar
4. **`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`** — env vars ESTAO acessiveis nos Code nodes neste setup (contrario ao que assumiamos antes)
5. **Workflow REAL pode diferir do arquivo local** — sempre exportar do n8n antes de modificar

---

## Arquivos de Referencia

| Arquivo | Descricao |
|---------|-----------|
| `n8n-workflows/15-product-studio-v91-sequential.json` | **WORKFLOW FINAL** — importar no n8n |
| `n8n-workflows/production-raw.json` | Workflow de producao (base com PLACEHOLDERs) |
| `n8n-workflows/gerar-angulos-sequencial.js` | Fix principal: sequencial |
| `n8n-workflows/code-nodes/gerar-foto-frontal.js` | Code node: frontal |
| `n8n-workflows/code-nodes/gerar-path-frontal.js` | Code node: path frontal |
| `n8n-workflows/code-nodes/finalizar-geracao.js` | Code node: finalizacao |
| `n8n-workflows/build-v91.py` | Script que monta o JSON final |
| `docs/SESSAO-2026-02-06-CONTINUACAO.md` | **ESTE DOCUMENTO** |
