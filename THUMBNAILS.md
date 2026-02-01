# Vizzu — Sistema de Thumbnails & Otimização de Imagens

## Diagnóstico Atual

### Como as imagens são armazenadas
- Imagens de produto ficam no **Supabase Storage** (bucket `products`)
- O banco (`product_images`) guarda a **URL pública**, não base64
- URL típica: `https://dbdqiqehuapcicejnzyd.supabase.co/storage/v1/object/public/products/{userId}/{productId}/{file}.png`
- Compressão já existe no upload: WebP 85%, max 1920px, max 1MB

### O problema
A mesma imagem de ~200KB/1920px é carregada tanto na grade de produtos (quadradinho de ~100px) quanto no zoom em tela cheia. Em uma tela com 20 produtos: **20 × 200KB = ~4MB** só para miniaturas.

### O que falta
- ❌ Nenhum sistema de thumbnails (tamanhos diferentes por contexto)
- ❌ Nenhum `srcset`/`sizes` para imagens responsivas
- ❌ Nenhum placeholder de carregamento (blur-up)
- ❌ Sem transformação de imagem via Supabase

---

## Solução: Supabase Image Transformations

O Supabase tem **transformação de imagens nativa**. Basta trocar o path da URL:

```
ANTES (original):
/storage/v1/object/public/products/file.png

DEPOIS (thumbnail 256px):
/storage/v1/render/image/public/products/file.png?width=256&quality=75
```

O Supabase redimensiona na hora e **cacheia o resultado** (CDN). Não precisa gerar arquivos extras.

### Tamanhos planejados

| Contexto | Largura | Qualidade | Uso |
|---|---|---|---|
| `thumb` | 256px | 75% | Grade de produtos, seleção no wizard |
| `preview` | 512px | 80% | Cards maiores, detalhes parciais |
| `display` | 1024px | 85% | Modal de detalhe, visualização |
| `full` | original | original | Zoom, download |

### Economia estimada

| Contexto | Antes | Depois | Redução |
|---|---|---|---|
| Grade 20 produtos | ~4MB | ~400KB | **90%** |
| Dashboard 4 criações | ~800KB | ~40KB | **95%** |
| Detalhe do produto | ~1.2MB | ~300KB | **75%** |

---

## Passos de Implementação

### Passo 1 — Verificar Supabase Image Transformations ✏️
**Complexidade:** Mínima (verificação manual)

Verificar se o projeto Supabase tem Image Transformations habilitado:
- Dashboard Supabase → Settings → Storage → Image Transformations
- Se não estiver habilitado, ativar (requer plano Pro do Supabase)
- Testar manualmente: abrir uma URL de imagem trocando `object` por `render/image` e adicionando `?width=256`
- Se não funcionar (plano Free), usar fallback client-side (Passo 1B)

**Resultado:** Confirmação se o approach via URL funciona ou se precisa fallback

### Passo 1B — Fallback: Thumbnail Client-side (só se Passo 1 falhar)
**Complexidade:** Média

Se Supabase transforms não estiver disponível:
- Criar função que redimensiona via Canvas no browser
- Cachear thumbnails no IndexedDB (chave = url + size)
- Servir do cache nas próximas visitas

### Passo 2 — Criar utilitário `getImageUrl(url, size)` ✏️
**Complexidade:** Simples
**Arquivo:** `src/utils/imageUrl.ts` (novo)

```typescript
type ImageSize = 'thumb' | 'preview' | 'display' | 'full';

const SIZE_CONFIG: Record<ImageSize, { width: number; quality: number } | null> = {
  thumb:   { width: 256,  quality: 75 },
  preview: { width: 512,  quality: 80 },
  display: { width: 1024, quality: 85 },
  full:    null, // sem transformação, URL original
};

export function getImageUrl(url: string | undefined, size: ImageSize = 'full'): string | undefined {
  if (!url) return undefined;

  // Só funciona com URLs do Supabase Storage
  if (!url.includes('/storage/v1/object/public/')) return url;

  const config = SIZE_CONFIG[size];
  if (!config) return url; // full = original

  // Troca /object/ por /render/image/ e adiciona parâmetros
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  return `${transformedUrl}?width=${config.width}&quality=${config.quality}`;
}
```

### Passo 3 — Atualizar `getProductDisplayImage` para aceitar tamanho ✏️
**Complexidade:** Simples
**Arquivo:** `src/contexts/ProductsContext.tsx`

Adicionar parâmetro `size` opcional:
```typescript
const getProductDisplayImage = (product: Product, size: ImageSize = 'full'): string | undefined => {
  const rawUrl = /* lógica existente que retorna a URL */;
  return getImageUrl(rawUrl, size);
};
```

### Passo 4 — Atualizar grade de produtos (ProductsPage) ✏️
**Complexidade:** Simples
**Arquivo:** `src/pages/ProductsPage.tsx`

Onde hoje está:
```tsx
<img src={getProductDisplayImage(product)} />
```

Mudar para:
```tsx
<img src={getProductDisplayImage(product, 'thumb')} />
```

E no modal de detalhe:
```tsx
<img src={getProductDisplayImage(product, 'display')} />
```

### Passo 5 — Atualizar outros pontos que exibem imagens ✏️
**Complexidade:** Média (vários arquivos)

| Arquivo | Contexto | Tamanho |
|---|---|---|
| `DashboardPage.tsx` | Criações recentes | `thumb` |
| `ProductsPage.tsx` | Grade principal | `thumb` |
| `ProductsPage.tsx` | Modal detalhe | `display` |
| `ProductsPage.tsx` | Zoom/download | `full` |
| `ProductStudio/index.tsx` | Seleção de produto | `thumb` |
| `ProductStudio/ProductStudioResult.tsx` | Resultado gerado | `display` |
| `ProductStudio/ProductStudioResult.tsx` | Download | `full` |
| `LookComposer/index.tsx` | Seleção de peças | `thumb` |
| `Provador/VizzuProvadorWizard.tsx` | Seleção de peças | `thumb` |
| `CreativeStill/index.tsx` | Seleção de produto | `thumb` |

### Passo 6 — Placeholder de carregamento (blur-up) ✏️
**Complexidade:** Média
**Arquivos:** Componente reutilizável + locais de uso

Criar um componente `<OptimizedImage>`:
```tsx
function OptimizedImage({ src, size, alt, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {/* Placeholder blur enquanto carrega */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300
                        dark:from-neutral-800 dark:to-neutral-700 animate-pulse" />
      )}
      <img
        src={getImageUrl(src, size)}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={className + (loaded ? ' opacity-100' : ' opacity-0') + ' transition-opacity duration-300'}
      />
    </div>
  );
}
```

### Passo 7 — Testes e validação ✏️
**Complexidade:** Simples

1. Verificar que a grade de produtos carrega rápido (Network tab: imagens ~10-20KB)
2. Verificar que o detalhe mostra qualidade boa (1024px)
3. Verificar que zoom/download usa original
4. Verificar que não quebrou nada em ProductStudio, Provador, LookComposer
5. Testar com produto sem imagem (fallback funciona)
6. Testar com imagem base64 legada (não quebra, só não otimiza)

---

## Ordem de Execução

| # | Passo | Dependência |
|---|---|---|
| 1 | Verificar Supabase transforms | Nenhuma |
| 2 | Criar `getImageUrl()` | Passo 1 |
| 3 | Atualizar `getProductDisplayImage` | Passo 2 |
| 4 | Atualizar ProductsPage | Passo 3 |
| 5 | Atualizar demais componentes | Passo 3 |
| 6 | Componente OptimizedImage | Passo 2 |
| 7 | Testes | Todos |

---

## Pré-requisito Importante

⚠️ **Supabase Image Transformations** precisa estar habilitado no projeto.
- Disponível no plano **Pro** do Supabase ($25/mês)
- Se o projeto estiver no plano Free, usar o fallback client-side (Passo 1B)
- Para verificar: Supabase Dashboard → Settings → Storage

---

## Notas

- As imagens base64 legadas (campo `base64` em `ProductImage`) não são afetadas — continuam funcionando sem otimização
- O Service Worker existente (`sw.js`) já cacheia imagens; as versões thumb/preview serão cacheadas como URLs separadas
- Não precisa migrar dados nem gerar arquivos — tudo é feito via URL em tempo real
- A compressão no upload (imageCompression.ts) continua funcionando normalmente
