# Vizzu — Medições Reais de Consumo por Feature

> Documento criado em 09/02/2026
> Servidor: Hostinger KVM 4 (4 vCPU, 16 GB RAM, 200 GB NVMe)
> Monitoramento: Netdata (por container, tempo real)
> Config N8N: `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`
> Workers ativos: 1 (padrão EasyPanel)

---

## Como ler as métricas do Netdata

O Netdata mostra várias métricas de CPU para cada container. Usamos duas:

| Métrica | O que mostra | Onde fica no dashboard |
|---|---|---|
| **CPU instantâneo** | Leitura em tempo real naquele segundo | Tabela de baixo, linha do worker, coluna "CPU used %" |
| **Top by CPU** | Pico recente na janela de 15 min (% do sistema total, 4 cores = 100%) | Seção "Top by CPU" no topo |

> **Para capacity planning, usar "Top by CPU"** — mostra o pico real durante a geração.
> O "CPU instantâneo" da tabela de baixo pode pegar um momento de idle entre picos.

---

## Baseline (servidor em repouso)

| Componente | RAM |
|---|---|
| N8N Editor | 268 MB |
| N8N Webhook | 220 MB |
| N8N Worker | 249 MB |
| N8N Postgres | 245 MB |
| N8N Redis | 6 MB |
| Chatwoot (4 containers) | 680 MB |
| Evolution API (3 containers) | 236 MB |
| EasyPanel + Traefik | 280 MB |
| Netdata | 286 MB |
| **Total em repouso** | **~2.6 GB de 15 GB** |

> Nota: Chatwoot e Evolution API não são usados pela Vizzu e serão removidos. Isso liberará ~916 MB.

---

## Feature 1 — Product Studio (COMPLETO)

### Teste 1.1 — 1 imagem, 2K

| Métrica | Valor |
|---|---|
| Feature | Product Studio |
| Imagens geradas | 1 |
| Resolução | 2K |
| **RAM pico worker** | **~246 MiB** |
| **CPU instantâneo** | **~1.26%** |
| **CPU Top by CPU** | Worker não apareceu no top (< 0.3%) |
| Network In (pico) | 1.18 Mbit/s |
| Comportamento | Quase imperceptível. RAM e CPU praticamente iguais à baseline |

### Teste 1.2 — 1 imagem, 4K

| Métrica | Valor |
|---|---|
| Feature | Product Studio |
| Imagens geradas | 1 |
| Resolução | 4K |
| **RAM pico worker** | **~247 MiB** |
| **CPU instantâneo** | **~2.37%** |
| **CPU Top by CPU** | Não capturado com janela limpa |
| Network In (pico) | 2.86 Mbit/s |
| Comportamento | RAM igual à baseline. CPU levemente maior que 2K |

### Teste 1.3 — 5 imagens, 2K

| Métrica | Valor |
|---|---|
| Feature | Product Studio |
| Imagens geradas | 5 |
| Resolução | 2K |
| **RAM pico worker** | **~298 MiB** |
| **CPU instantâneo** | **~8.89%** |
| **CPU Top by CPU** | Não capturado (worker não apareceu no top no momento do snapshot) |
| Disk Write (pico) | 460 KiB/s |
| Network In (pico) | 7.02 Mbit/s |
| Network Out (pico) | 2.82 Mbit/s |
| Comportamento | RAM subiu ~49 MiB acima da baseline (249→298). Filesystem mode gravando imagens em disco |

### Teste 1.4 — 5 imagens, 4K

| Métrica | Valor |
|---|---|
| Feature | Product Studio |
| Imagens geradas | 5 |
| Resolução | 4K |
| **RAM pico worker** | **~350 MiB** |
| **CPU instantâneo** | **~13.22%** |
| **CPU Top by CPU** | **~50.68%** (janela limpa, valor confiável) |
| Disk Write (pico) | 129.7 KiB/s |
| Network In (pico) | 16.83 Mbit/s |
| Comportamento | O teste mais pesado do Product Studio. RAM +101 MiB acima da baseline |

---

## Feature 2 — Creative Still Simples

> PENDENTE — testar na próxima sessão

### Teste 2.1 — 1 variação, 2K
### Teste 2.2 — 1 variação, 4K
### Teste 2.3 — 6 variações, 2K
### Teste 2.4 — 6 variações, 4K

---

## Feature 3 — Studio Ready

> PENDENTE — testar na próxima sessão

### Teste 3.1 — 1 imagem, 2K
### Teste 3.2 — 1 imagem, 4K

---

## Resumo Comparativo

| Feature | Config | RAM pico | CPU instantâneo | CPU Top (pico) |
|---|---|---|---|---|
| Product Studio | 1 img, 2K | 246 MiB | 1.26% | < 0.3% |
| Product Studio | 1 img, 4K | 247 MiB | 2.37% | — |
| Product Studio | 5 img, 2K | 298 MiB | 8.89% | — |
| Product Studio | 5 img, 4K | 350 MiB | 13.22% | **50.68%** |
| Creative Still Simples | 1 var, 2K | — | — | — |
| Creative Still Simples | 1 var, 4K | — | — | — |
| Creative Still Simples | 6 var, 2K | — | — | — |
| Creative Still Simples | 6 var, 4K | — | — | — |
| Studio Ready | 1 img, 2K | — | — | — |
| Studio Ready | 1 img, 4K | — | — | — |

---

## Conclusões Parciais (Product Studio)

1. **RAM é irrelevante** — mesmo no pior caso (5 img 4K), o worker usa apenas 350 MiB. O `filesystem` mode salva as imagens em disco, não em RAM.
2. **CPU é o gargalo** — o pior caso medido foi 50.68% do sistema total (5 img 4K via Top by CPU).
3. **Resolução importa mais que quantidade** — 4K consome significativamente mais CPU que 2K.
4. **O worker passa a maior parte do tempo idle** esperando resposta do Gemini API (CPU ~0%). Os picos são breves.

## Capacidade Estimada (Product Studio, KVM 4)

Baseado no pior caso medido (5 img 4K = ~50% CPU pico):

| Workers | Pico CPU simultâneo | Gerações/minuto | Status |
|---|---|---|---|
| 1 | ~50% | ~1-2 | Tranquilo |
| 2 | ~100% | ~2-4 | No limite nos picos |
| 3 | ~150% | ~3-5 | CPU throttling nos picos |
| 4 | ~200% | ~4-6 | Lento nos picos, mas funciona |

> Estimativa final será calculada após testes do Creative Still e Studio Ready.

---

## Pendente (próxima sessão)

### Testes de consumo
- [ ] Re-testar Product Studio 1.1, 1.2, 1.3 capturando "Top by CPU" com janela limpa
- [ ] Testar Creative Still Simples (4 variações: 1 var 2K, 1 var 4K, 6 var 2K, 6 var 4K)
- [ ] Testar Studio Ready (2 variações: 1 img 2K, 1 img 4K)
- [ ] Calcular capacidade final com todos os dados

### Limpeza do servidor
- [ ] Remover Chatwoot e Evolution API do servidor (libera ~916 MB)
- [ ] Adicionar `N8N_BINARY_DATA_TTL=1440` nos containers N8N (limpeza automática de binários após 24h)
- [ ] Investigar e limpar imagens/cache acumulados no disco da VPS (filesystem mode salva em disco mas não limpa sozinho)
- [ ] Criar rotina automática de limpeza (cron job) pra apagar caches antigos periodicamente
- [ ] Verificar se o N8N está mantendo execuções antigas com binários — configurar `EXECUTIONS_DATA_MAX_AGE=168` (7 dias)

### Dúvidas do Kaique (responder antes de implementar)
- [ ] **JPEG perde qualidade?** Enviar referências em JPEG 85% pro Gemini piora o resultado final da imagem gerada? Precisa testar lado a lado (mesma imagem em PNG vs JPEG 85% como referência) e comparar o output
- [ ] **Quem faz a conversão PNG→JPEG?** É o N8N no cadastro do produto? Ou só na hora de enviar pro Gemini? E o Gemini retorna a imagem gerada em qual formato (PNG ou JPEG)?

### Otimizações de payload (reduzir CPU ~70%)
- [ ] Mudar URL de download nos workflows N8N pra usar Image Transformations do Supabase: `?width=2048&quality=100` (JPEG 100%, sem perda, -70% payload)
- [ ] Trocar `mimeType` de `image/png` pra `image/jpeg` no payload do Gemini
- [ ] Testar geração lado a lado: referência PNG vs JPEG 100% — comparar qualidade do resultado
- [ ] Re-testar consumo DEPOIS das otimizações pra comparar antes/depois

### Otimizações futuras (P2/P3)
- [ ] Quebrar workflows em sub-workflows por ângulo (isolamento de memória, -40% pico RAM)
- [ ] Upload direto do frontend pro Supabase via signed URL (cadastro de produto sem passar pelo N8N)

---

*Última atualização: 09 de Fevereiro de 2026*
