# Migração de Thumbnails — Supabase Transform para wsrv.nl

> Documento criado em 04/02/2026. Explica a mudança feita para eliminar o uso de Supabase Image Transformations e economizar custos.

---

## O Problema

O Supabase tem uma feature chamada **Image Transformations** que redimensiona imagens na hora (ex: transformar uma foto 4K em thumbnail de 400px). O plano Pro do Supabase inclui apenas **100 imagens/mês** nessa feature.

Nos testes do Vizzu, usamos **311 imagens** em um mês — **3x acima do limite**. Cada 1.000 imagens extras custam $5, e se o Spend Cap estiver ativo, o serviço pode ser bloqueado.

---

## A Solução

Substituímos o Supabase Image Transformations pelo **wsrv.nl** — um serviço gratuito de redimensionamento de imagens que existe desde 2007.

### O que é o wsrv.nl?

- Serviço **100% gratuito**, sem necessidade de conta ou API key
- Roda desde **2007** com **99.993% de uptime**
- Processa **6 milhões de imagens por hora**
- CDN global via **Cloudflare** (300+ datacenters)
- Código aberto no GitHub: https://github.com/weserv/images
- Financiado de forma privada pelos criadores (nunca aceitaram doação ou patrocínio)

### Como funciona?

Você passa a URL de qualquer imagem pública e os parâmetros de resize. O wsrv.nl busca a imagem, redimensiona, cacheia na CDN e entrega.

**Exemplo:**

```
Imagem original (4K, ~10MB):
https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/user123/foto.png

Thumbnail (400px, ~30KB):
https://wsrv.nl/?url=https%3A%2F%2Fdbdqiqehuapcicejnzyd.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fproducts%2Fuser123%2Ffoto.png&w=400&q=75&fit=contain&output=webp
```

---

## O que mudou no código

### Arquivos alterados

| Arquivo | O que mudou |
|---------|------------|
| `src/utils/imageUrl.ts` | URLs de thumbnail apontam para wsrv.nl em vez do Supabase Transform |
| `public/sw.js` | Service Worker cacheia URLs do wsrv.nl (antes só cacheava do Supabase) |

### O que NÃO mudou

| O que | Mudou? |
|-------|--------|
| Workflows N8N | Não |
| Supabase Storage (buckets) | Não |
| Supabase Database (tabelas) | Não |
| URLs salvas no banco | Não |
| Componentes React | Não |
| Fluxo de geração de imagens | Não |

### Mudança técnica (imageUrl.ts)

**Antes** — usava o endpoint de Transform do Supabase:
```
https://{projeto}.supabase.co/storage/v1/render/image/public/{bucket}/{path}?width=400&quality=75
                                        ^^^^^^^^^^^^^^^^^^^^
                                        Supabase redimensiona (conta no limite de 100/mês)
```

**Depois** — usa o wsrv.nl como proxy:
```
https://wsrv.nl/?url={url_original_do_supabase}&w=400&q=75&fit=contain&output=webp
^^^^^^^^^^^^^^^
wsrv.nl redimensiona (grátis, sem limite)
```

---

## Como ficam as URLs

### Imagem original (armazenada no Supabase)
Não muda. Continua sendo:
```
https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/{userId}/{productId}/foto.png
```

### Thumbnails (exibidas no app)
São geradas sob demanda pelo wsrv.nl:

| Tamanho | Largura | Qualidade | Onde é usado no app |
|---------|---------|-----------|-------------------|
| `thumb` | 400px | 75% | Grids, listas de produtos |
| `preview` | 800px | 80% | Previews, seleção |
| `display` | 1280px | 85% | Visualização detalhada |
| `full` | original | — | Download, resultado final |

O formato de saída é **WebP** (mais leve que PNG/JPEG), convertido automaticamente pelo wsrv.nl.

### Imagem em tamanho full
Quando o app precisa da imagem original (download, tela de resultado), busca direto do Supabase — sem passar pelo wsrv.nl.

---

## Fluxo visual

```
┌──────────────────────────────────────────────────────────┐
│                    GERAÇÃO DE IMAGEM                      │
│                                                           │
│  Gemini gera 4K  →  N8N salva no Supabase Storage        │
│                      (isso NÃO mudou)                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   EXIBIÇÃO NO APP                         │
│                                                           │
│  ANTES:                                                   │
│  App → Supabase /render/image/ → thumbnail                │
│         (contava no limite de 100/mês)                    │
│                                                           │
│  AGORA:                                                   │
│  App → wsrv.nl → busca original no Supabase → thumbnail  │
│         (grátis, sem limite)                              │
└──────────────────────────────────────────────────────────┘
```

---

## Velocidade

| Cenário | Tempo |
|---------|-------|
| Primeiro acesso (imagem nunca pedida) | ~200-500ms |
| Acessos seguintes (cacheado na CDN) | ~20-50ms |

O cache do Cloudflare dura 7-31 dias no servidor e o browser é instruído a guardar por 1 ano. Na prática, cada thumbnail é redimensionada uma única vez.

---

## Comparação de custos

| | Supabase Transform | wsrv.nl |
|--|-------------------|---------|
| Incluído no plano | 100 imagens/mês | **Ilimitado** |
| Custo excedente | $5 por 1.000 | **$0** |
| Conta necessária | Sim (Supabase Pro) | **Não** |
| CDN | Básico | Cloudflare (300+ pontos) |
| Formato de saída | Mesmo do original | **WebP** (mais leve) |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| wsrv.nl sair do ar | Baixa (99.993% uptime desde 2007) | Imagens originais continuam no Supabase. Service Worker serve do cache local. Reverter é trocar 1 arquivo. |
| Lentidão temporária | Baixa | Cache agressivo — só o primeiro acesso é mais lento. |
| Mudança de política | Baixa (nunca mudaram em 19 anos) | Código preparado para trocar para Cloudinary, Vercel Image Optimization ou voltar ao Supabase em minutos. |

---

## Para o futuro

Se o Vizzu escalar e precisar de um serviço com SLA, as opções são:

| Serviço | Custo | Vantagem |
|---------|-------|----------|
| **Cloudinary Free** | Grátis (25K transforms/mês) | SLA, dashboard, analytics |
| **Vercel Image Optimization** | $20/mês (5K transforms) | Já usamos Vercel pro deploy |
| **Voltar ao Supabase Transform** | $5/1K extras | Zero dependência externa |

A mudança para qualquer um deles é alterar o mesmo arquivo (`imageUrl.ts`).

---

*Documento gerado em 04/02/2026 durante sessão de otimização do Vizzu.*
