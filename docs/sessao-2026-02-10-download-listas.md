# Sessao 10 Fev 2026 — Download Centralizado + Listas Separadas

## Resumo

Sessao focada em dois grandes blocos:
1. **Sistema de download centralizado** — DownloadModal com fluxo em 2 etapas (selecionar imagens + escolher formato/tamanho)
2. **Listas separadas no Creative Still + Download all no Look Composer**

---

## 1. Sistema de Download Centralizado (DownloadModal)

### Problema
O download de imagens era disperso — cada feature tinha seu proprio botao e logica. O usuario precisava baixar imagem por imagem, sem opcao de escolher formato ou baixar em lote.

### Solucao

Criamos o `DownloadModal` — componente centralizado reutilizado em TODA a plataforma.

**Fluxo em 2 etapas:**
1. **Passo 1**: Selecionar imagens (thumbnails clicaveis com checkbox, imagens nao selecionadas ficam com 60% opacidade)
2. **Passo 2**: Escolher formato/tamanho (6 presets) ou "Baixar Tudo" como ZIP

**6 presets de download:**
| Preset | Resolucao | Formato | Uso |
|--------|-----------|---------|-----|
| Original (Alta) | Nativa | PNG | Edicao, impressao |
| E-commerce | 2048px | WebP | Lojas online |
| Marketplaces | 1200px | JPEG | ML, Shopee, Amazon |
| Redes Sociais | 1080px | JPEG | Instagram, Facebook |
| Web | 800px | WebP | Blogs, emails |
| Miniatura | 400px | WebP | Thumbnails, grids |

**Redimensionamento:** Usa proxy wsrv.nl (ex: `wsrv.nl/?url=...&w=2048&output=webp`)

**ZIP:** JSZip com code-splitting via `dynamic import()` — so carrega quando o usuario clica "Baixar Tudo"

### Dois modos de uso
- **Flat** (`images` prop): Lista simples de imagens — usado nas features individuais
- **Agrupado** (`groups` prop): Imagens agrupadas por feature/contexto — usado no ProductHubModal e no LC "Download all looks"

### Onde o DownloadModal esta presente
- Product Studio Editor (imagens geradas por angulo)
- Product Studio Result
- Creative Still Results
- Look Composer (look individual: frente + costas)
- Look Composer (todos os looks de um produto — modo agrupado)
- Generation History (Visual Studio)
- ImageViewer (visualizador fullscreen)
- ProductHubModal (todas as imagens de todas as features de um produto)

### Arquivos criados/modificados
- `src/components/shared/DownloadModal.tsx` — **NOVO**, componente central (~628 linhas)
- `src/components/shared/DownloadProgressModal.tsx` — **NOVO**, progresso do ZIP
- `src/utils/downloadSizes.ts` — **NOVO**, 6 presets + helpers
- `src/utils/zipDownload.ts` — **NOVO**, geracao de ZIP com JSZip
- `src/utils/downloadHelper.ts` — **NOVO**, smartDownload (fallback fetch→blob→anchor)
- Todos os componentes de resultado e editores foram atualizados para usar DownloadModal

### Commits
- `01bb873` — refactor: download centralizado com modal de selecao em 2 etapas
- `c5fad56` — feat: DownloadModal em todos os locais
- `fd5ea05` — fix: UX do DownloadModal (instrucao + CTA)
- `269b547` — refactor: reescrita completa do DownloadModal com UX guiada

---

## 2. Listas Separadas no Creative Still

### Problema
No Creative Still, todos os produtos apareciam numa lista unica. O usuario nao conseguia distinguir facilmente quais produtos ja tinham stills gerados. No Product Studio, ja existia a separacao em "Pendentes de Otimizacao" e "Produtos Otimizados".

### Solucao

Replicamos o padrao do Product Studio:

**Secao A — "Sem Still Criativo"** (cor ambar, icone clock)
- Produtos que ainda nao tem nenhum still gerado
- Click → abre o editor para criar still
- Hover mostra "Criar still"

**Secao B — "Produtos com Still Criativo"** (cor coral, icone gem)
- Produtos que ja tem stills gerados
- Badge coral com numero de stills
- Click → abre ProductHubModal na aba "Still Criativo" (via nova prop `defaultTab="cs"`)
- Hover mostra "Ver stills" + icone do Hub

Ambas as secoes sao colapsaveis e paginadas (20 em 20).

### ProductHubModal — prop defaultTab
Adicionada prop `defaultTab?: string` ao ProductHubModal. Quando passada, o modal abre na aba especificada (se ela tiver conteudo), em vez de selecionar automaticamente a primeira aba com conteudo.

### Arquivos modificados
- `src/components/shared/ProductHubModal.tsx` — +prop `defaultTab`, ajuste no useEffect
- `src/components/CreativeStill/index.tsx` — Novos states, split useMemo, 2 secoes

---

## 3. Download Todos os Looks (Look Composer)

### Problema
No modal de detalhes de um produto no Look Composer, o download era por look individual. Se o produto tinha 5 looks, o usuario precisava clicar em cada um.

### Solucao

Botao "Download todos os looks (N imagens)" no modal do produto, que aparece quando ha 2+ looks.

Usa o DownloadModal em **modo agrupado** (`groups`), onde cada look vira um grupo com suas imagens (frente + costas se aplicavel).

### Arquivos modificados
- `src/components/LookComposer/index.tsx` — Novo state, handler, botao, DownloadModal agrupado

### Commit
- `a16eb40` — feat: listas separadas no CS + download all no LC

---

## Aprendizados Importantes

### 1. Cache do Service Worker/PWA causa confusao em deploys
O Kaique reportou varias vezes que "nao mudou nada" mesmo apos o deploy na Vercel ficar verde. O problema era o Service Worker cacheando assets antigos. Solucao: limpar caches do SW via console:
```js
caches.keys().then(k=>k.forEach(n=>caches.delete(n)));
navigator.serviceWorker.getRegistrations().then(r=>r.forEach(sw=>sw.unregister()));
```
**Acao futura**: Implementar cache versioning no SW ou usar `skipWaiting()`.

### 2. UX precisa de indicadores claros de progresso
A primeira versao do DownloadModal mostrava as imagens "soltas" sem instrucao. O usuario nao sabia o que fazer. Aprendizado: **sempre incluir**:
- Indicador de passo (ex: "Passo 1 de 2")
- Instrucao textual clara (ex: "Toque nas imagens para selecionar...")
- Feedback visual nas selecoes (ring, opacidade)
- CTA proeminente com contagem (ex: "Escolher formato (3 imagens)")

### 3. Padrao de "duas listas" e reutilizavel
O padrao de separar produtos em duas listas colapsaveis (pendentes vs completos) ja esta em 2 features (PS e CS). Se mais features precisarem, extrair como componente generico `SplitProductList`.

### 4. DownloadModal em modo flat vs agrupado
O mesmo componente suporta dois modos via props mutualmente exclusivas:
- `images` → lista flat (features individuais)
- `groups` → agrupado por contexto (Hub, download all)

Isso evita duplicacao de codigo e mantem UX consistente.

### 5. TypeScript: cuidado com variaveis duplicadas
Erro `TS2451: Cannot redeclare block-scoped variable` — ao adicionar `angleLabels` no ProductStudioEditor, ja existia uma constante com esse nome no mesmo escopo. Sempre verificar com Ctrl+F antes de declarar variaveis.

---

## Estado Atual do Projeto

### Funcionalidades completas nesta sessao
- [x] Download centralizado com DownloadModal (6 presets + ZIP)
- [x] DownloadModal em TODOS os locais da plataforma
- [x] UX guiada com 2 etapas
- [x] Listas separadas no Creative Still
- [x] ProductHubModal com defaultTab
- [x] Download todos os looks no Look Composer

### Proximos passos
- **Kaique**: reimportar workflow 22 (angulo com fixes), configurar Stripe
- **Copiloto**: error handling LC, sistema Reports, fetchWithRetry
- **Testar**: CS end-to-end com @ mentions, composicao, otimizador IA
- **Considerar**: cache versioning no Service Worker para evitar assets stale
